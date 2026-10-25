"""Pre-generate offline pronunciation audio for the bundled NIKL curriculum lemmas.

Maintainer-only: needs network once to fetch the pinned Supertonic 3 and Whisper weights, plus ffmpeg.
The extension never downloads or runs a model; it plays the packaged Ogg Opus clips.

  python -m venv .venv && .venv/bin/pip install supertonic==1.3.1 faster-whisper==1.2.1 scipy
  .venv/bin/python scripts/generate-audio.py --work /tmp/softgloss-audio [--workers 4]

Re-running reuses finished clips in --work, so an interrupted run resumes.
"""
import argparse,base64,collections,hashlib,json,os,pathlib,re,subprocess,sys,unicodedata
root=pathlib.Path(__file__).resolve().parent.parent
VOICE,SPEED,STEPS,SEEDS,BITRATE='F1',0.9,8,3,'24k'
MODEL_REVISION='724fb5abbf5502583fb520898d45929e62f02c0b'
ASR_MODEL='small'
ACCEPT,REJECT=0.25,0.5  # jamo error rate after the ASR round trip
SHARDS,BATCH=64,12

def lemmas():
 words={}
 for path in sorted((root/'extension/study').glob('vocabulary-*.js')):
  words.update(json.loads(re.search(r'SG_STUDY_DEFAULTS,(\{.*\})\);',path.read_text(encoding='utf-8')).group(1)))
 return sorted(words)

def shard(lemma):
 # Must match SGSpeech.shard in extension/speech.js (FNV-1a over UTF-16 code units).
 data,h=lemma.encode('utf-16-le'),0x811c9dc5
 for i in range(0,len(data),2):h=((h^int.from_bytes(data[i:i+2],'little'))*0x01000193)&0xffffffff
 return h%SHARDS

def sino(n):
 # Whisper writes Sino-Korean numerals as digits (칠십 → 70); spell them back before comparing.
 digits,out='영일이삼사오육칠팔구',''
 if n==0:return '영'
 for value,unit in [(10**8,'억'),(10**4,'만'),(1000,'천'),(100,'백'),(10,'십'),(1,'')]:
  q,n=divmod(n,value)
  if q:out+=(sino(q) if value>=10**4 else '' if q==1 and unit else digits[q])+unit
 return out

def jamo(text):
 # Treat merged modern vowels as equal; Whisper spells what it hears.
 return unicodedata.normalize('NFD',''.join(re.findall('[가-힣]',re.sub(r'\d+',lambda m:sino(int(m.group())),text)))).translate({0x1166:0x1162,0x1168:0x1164})

def error_rate(ref,hyp):
 a,b=jamo(ref),jamo(hyp);row=list(range(len(b)+1))
 for i,x in enumerate(a,1):
  prev,row[0]=row[0],i
  for j,y in enumerate(b,1):prev,row[j]=row[j],min(row[j]+1,row[j-1]+1,prev+(x!=y))
 return row[-1]/max(len(a),1)

def trim(wav,sr,threshold=10**(-45/20),margin=0.03):
 import numpy as np
 frame=int(sr*0.01);loud=[i for i in range(0,len(wav),frame) if np.sqrt(np.mean(wav[i:i+frame]**2))>threshold]
 if not loud:return wav[:0]
 pad=int(sr*margin);return wav[max(loud[0]-pad,0):min(loud[-1]+frame+pad,len(wav))]

def encode(wav,sr):
 cmd=['ffmpeg','-loglevel','error','-f','f32le','-ar',str(sr),'-ac','1','-i','pipe:0','-c:a','libopus','-b:a',BITRATE,'-application','voip',
      '-map_metadata','-1','-fflags','+bitexact','-flags:a','+bitexact','-f','ogg','pipe:1']
 return subprocess.run(cmd,input=wav.astype('<f4').tobytes(),capture_output=True,check=True).stdout

worker={}
def init(threads):
 from importlib.metadata import version
 from supertonic.config import get_model_revision
 if version('supertonic')!='1.3.1' or get_model_revision('supertonic-3')!=MODEL_REVISION:raise RuntimeError('Use supertonic 1.3.1 and the pinned model revision; remove revision overrides.')
 from supertonic import TTS
 from faster_whisper import WhisperModel
 worker['tts']=TTS(model='supertonic-3',intra_op_num_threads=threads,inter_op_num_threads=1)
 worker['style']=worker['tts'].get_voice_style(voice_name=VOICE)
 worker['asr']=WhisperModel(ASR_MODEL,device='cpu',compute_type='int8',cpu_threads=threads)

def transcribe(clips,sr,gap=0.8):
 # Whisper pads every input to 30 s, so check a batch of clips per window and split by word timestamps.
 import numpy as np,scipy.signal
 silence,parts,spans,t=np.zeros(int(sr*gap),np.float32),[],[],gap
 for wav in clips:parts+=[silence,wav];spans.append((t,t+len(wav)/sr));t+=len(wav)/sr+gap
 audio=scipy.signal.resample_poly(np.concatenate(parts+[silence]),16000,sr).astype(np.float32)
 segments,_=worker['asr'].transcribe(audio,language='ko',beam_size=5,word_timestamps=True,condition_on_previous_text=False,vad_filter=False)
 heard=['']*len(clips)
 for word in (w for s in segments for w in s.words or []):
  middle=(word.start+word.end)/2;nearest=min(range(len(spans)),key=lambda i:0 if spans[i][0]<=middle<=spans[i][1] else min(abs(middle-spans[i][0]),abs(middle-spans[i][1])))
  heard[nearest]+=word.word.strip()
 return heard

def synthesize(jobs):
 import numpy as np
 tts,best,pending=worker['tts'],{},list(jobs)
 for attempt in range(SEEDS):
  clips=[]
  for lemma,_ in pending:
   np.random.seed((int(hashlib.sha256(lemma.encode()).hexdigest()[:8],16)+attempt)%2**32)
   wav,_=tts.synthesize(lemma,voice_style=worker['style'],lang='ko',speed=SPEED,total_steps=STEPS)
   clips.append(trim(wav.squeeze().astype(np.float32),tts.sample_rate))
  for (lemma,_),wav,heard in zip(pending,clips,transcribe(clips,tts.sample_rate)):
   rate=error_rate(lemma,heard) if len(wav) else 1
   if lemma not in best or rate<best[lemma]['errorRate']:best[lemma]={'lemma':lemma,'seed':attempt,'heard':heard,'errorRate':round(rate,3),'seconds':round(len(wav)/tts.sample_rate,3),'wav':wav}
  pending=[j for j in pending if best[j[0]]['errorRate']>ACCEPT]
  if not pending:break
 for lemma,out in jobs:
  clip=best[lemma];wav=clip.pop('wav');clip['ogg']=base64.b64encode(encode(wav,tts.sample_rate)).decode() if len(wav) else ''
  out.write_text(json.dumps(clip,ensure_ascii=False),encoding='utf-8')
 return len(jobs)

def pack(work,words):
 clips=[json.loads((work/(hashlib.sha1(w.encode()).hexdigest()+'.json')).read_text(encoding='utf-8')) for w in words]
 for c in clips:c['errorRate']=round(error_rate(c['lemma'],c['heard']),3) if c['ogg'] else 1  # rescore with the current screen
 kept=[c for c in clips if c['ogg'] and c['errorRate']<=REJECT]
 folder=root/'extension/audio';folder.mkdir(exist_ok=True)
 for old in folder.glob('audio-*.js'):old.unlink()
 groups=collections.defaultdict(dict)
 for c in kept:groups[shard(c['lemma'])][c['lemma']]=c['ogg']
 files=[]
 for i in range(SHARDS):
  name=f'audio-{i:02}.js';content='Object.assign(globalThis.SG_AUDIO ??= {},'+json.dumps(dict(sorted(groups[i].items())),ensure_ascii=False,separators=(',',':'))+');\n'
  (folder/name).write_text(content,encoding='utf-8',newline='\n');files.append({'path':name,'sha256':hashlib.sha256(content.encode()).hexdigest(),'clips':len(groups[i])})
 manifest={'model':'Supertone/supertonic-3','modelRevision':MODEL_REVISION,'modelLicense':'BigScience OpenRAIL-M',
  'sdk':'supertonic 1.3.1','voice':VOICE,'speed':SPEED,'steps':STEPS,'codec':'Ogg Opus '+BITRATE+' mono','asrCheck':'faster-whisper '+ASR_MODEL+' int8, '+str(BATCH)+' clips per window; jamo error rate, ㅐ/ㅔ merged, digits read as Sino-Korean',
  'acceptErrorRate':ACCEPT,'rejectErrorRate':REJECT,'lemmas':len(words),'clips':len(kept),'shards':SHARDS,'seconds':round(sum(c['seconds'] for c in kept),1),
  'flagged':[[c['lemma'],c['heard'],c['errorRate']] for c in kept if c['errorRate']>ACCEPT],
  'excluded':[[c['lemma'],c['heard'],c['errorRate']] for c in clips if c not in kept],'files':files}
 (folder/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=1)+'\n',encoding='utf-8',newline='\n')
 print(json.dumps({k:v for k,v in manifest.items() if k not in ['files','flagged','excluded']}|{'flagged':len(manifest['flagged']),'excluded':len(manifest['excluded'])},ensure_ascii=False))

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--work',required=True,type=pathlib.Path);parser.add_argument('--workers',type=int,default=4);parser.add_argument('--limit',type=int)
 parser.add_argument('--pack-only',action='store_true');args=parser.parse_args()
 words=lemmas()[:args.limit];args.work.mkdir(parents=True,exist_ok=True)
 jobs=[(w,args.work/(hashlib.sha1(w.encode()).hexdigest()+'.json')) for w in words]
 todo=[j for j in jobs if not j[1].exists()]
 if todo and not args.pack_only:
  import multiprocessing
  threads=max(1,(os.cpu_count() or 4)//args.workers)
  batches,done=[todo[i:i+BATCH] for i in range(0,len(todo),BATCH)],0
  with multiprocessing.Pool(args.workers,init,(threads,)) as pool:
   for n in pool.imap_unordered(synthesize,batches):
    done+=n;print(f'{done}/{len(todo)}',file=sys.stderr,flush=True)
 pack(args.work,words)
