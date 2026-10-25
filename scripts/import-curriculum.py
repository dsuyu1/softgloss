"""Rebuild the official NIKL curriculum extract using only Python's standard library."""
import pathlib,json,gzip,hashlib,re,collections
root=pathlib.Path(__file__).resolve().parent.parent
lock=json.loads((root/'data/curriculum-lock.json').read_text())
raw=(root/'data/curriculum-source.json.gz').read_bytes()
assert hashlib.sha256(raw).hexdigest()==lock['snapshotSha256'], 'Curriculum snapshot checksum mismatch'
data=json.loads(gzip.decompress(raw));assert len(data['vocabulary'])==lock['vocabularyRows'];assert len(data['grammar'])==lock['grammarRows']
words={};excluded=[]
for row_id,grade,word,pos in data['vocabulary']:
 level=int(grade[0])
 for variant in word.split('/'):
  variant=re.sub(r'\d+','',variant).strip()
  if not re.fullmatch('[가-힣]{1,80}',variant):excluded.append([row_id,variant]);continue
  words[variant]=min(words.get(variant,7),level)
folder=root/'extension/study';folder.mkdir(exist_ok=True)
files=[]
def write(name,value):
 content=value+'\n';(folder/name).write_text(content);files.append({'path':name,'sha256':hashlib.sha256(content.encode()).hexdigest()})
items=sorted(words.items())
for i in range(0,len(items),2000):
 head='globalThis.SG_STUDY_DEFAULTS = {};\n' if i==0 else ''
 write(f'vocabulary-{i//2000:02}.js',head+'Object.assign(globalThis.SG_STUDY_DEFAULTS,'+json.dumps(dict(items[i:i+2000]),ensure_ascii=False,separators=(',',':'))+');')
grammar=[{'id':r[0],'level':int(r[1][0]),'category':r[2],'form':r[3],'related':r[4] or '', 'meaning':r[5] or ''} for r in data['grammar']]
write('grammar.js','globalThis.SG_STUDY_GRAMMAR = '+json.dumps(grammar,ensure_ascii=False,separators=(',',':'))+';')
manifest={'source':lock['page'],'license':lock['license'],'vocabularyRows':len(data['vocabulary']),'lemmas':len(words),'grammarRows':len(grammar),'excluded':excluded,'levels':dict(sorted(collections.Counter(words.values()).items())),'files':files}
(folder/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in manifest.items() if k not in ['files','excluded']}))
