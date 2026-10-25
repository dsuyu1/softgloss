#!/usr/bin/env python3
"""Compact source-attested forms into reversible, entry-whitelisted transformations."""
import argparse,gzip,hashlib,json,pathlib,unicodedata

def encode(x):return json.dumps(x,ensure_ascii=False,separators=(',',':'))
def sha(x):return hashlib.sha256(x).hexdigest()

def extract(path):
 import importlib.util
 spec=importlib.util.spec_from_file_location('dictionary_import',pathlib.Path(__file__).with_name('import-dictionary.py'))
 dictionary=importlib.util.module_from_spec(spec);spec.loader.exec_module(dictionary)
 lock=json.loads(pathlib.Path('data/source-lock.json').read_text());raw=pathlib.Path(path).read_bytes()
 if sha(raw)!=lock['sha256']:raise ValueError('Original dictionary checksum mismatch.')
 groups={};ids=set();surfaces=set();existing=set()
 allowed={'interrogative','causative','contrastive','conjunctive','conditional','motive-form','noun-from-verb','determiner'}
 for line in raw.splitlines():
  record=json.loads(line);entry=dictionary.convert(record)
  if not entry or entry[2] not in ('verb','adjective') or not entry[1].endswith('다'):continue
  existing.update(f[0] for f in entry[4])
  eid=entry[0];stem=unicodedata.normalize('NFD',entry[1][:-1])
  for form in record.get('forms',[]):
   tags=set(form.get('tags',[]));surface=form.get('form','')
   if form.get('source')!='conjugation' or not dictionary.HANGUL.fullmatch(surface) or not tags.intersection(allowed) or any(t.startswith('error-') for t in tags):continue
   surfaces.add(surface)
   target=unicodedata.normalize('NFD',surface);common=0
   while common<min(len(stem),len(target)) and stem[common]==target[common]:common+=1
   source_tail,target_tail=stem[common:],target[common:]
   # Preserve source labels, without turning them into a context-sensitive interpretation.
   key=(source_tail,target_tail,tuple(sorted(tags)))
   groups.setdefault(key,set()).add(eid);ids.add(eid)
 ids=sorted(ids);positions={eid:i for i,eid in enumerate(ids)}
 rows=[[a,b,list(tags),sorted(positions[eid] for eid in entries)] for (a,b,tags),entries in sorted(groups.items())]
 return {'sourceSha256':lock['sha256'],'entryIds':ids,'rules':rows,'formSurfaces':len(surfaces),'newSurfaceCount':len(surfaces-existing)}

def emit(data,out):
 directory=pathlib.Path(out);directory.mkdir(parents=True,exist_ok=True)
 header='// Source-attested Wiktionary conjugation transforms. CC BY-SA 4.0; see THIRD_PARTY_NOTICES.html.\n'
 prefix='globalThis.SG_MORPHOLOGY = '+encode({'sourceSha256':data['sourceSha256'],'entryIds':data['entryIds'],'rules':[]})+';\n'
 files=[];batch=[];size=len(prefix.encode())
 def flush():
  nonlocal batch,size,prefix
  name=f'morphology-{len(files):02}.js'
  text=header+prefix+'globalThis.SG_MORPHOLOGY.rules = globalThis.SG_MORPHOLOGY.rules.concat('+encode(batch)+');\n'
  (directory/name).write_text(text);files.append({'path':name,'bytes':len(text.encode()),'sha256':sha(text.encode())});batch=[];size=0;prefix=''
 for rule in data['rules']:
  n=len(encode(rule).encode())
  if batch and size+n>350000:flush()
  batch.append(rule);size+=n
 if batch:flush()
 for old in directory.glob('morphology-*.js'):
  if old.name not in {f['path'] for f in files}:old.unlink()
 return {'formSurfaces':data['formSurfaces'],'newSurfaceCount':data['newSurfaceCount'],'entries':len(data['entryIds']),'transforms':len(data['rules']),'links':sum(len(r[3]) for r in data['rules']),'bytes':sum(f['bytes'] for f in files),'files':files}

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('source');parser.add_argument('--from-original',action='store_true');parser.add_argument('--output',default='extension/morphology');args=parser.parse_args()
 if args.from_original:
  data=extract(args.source);raw=gzip.compress(encode(data).encode(),mtime=0);pathlib.Path('data/morphology-source.json.gz').write_bytes(raw)
  pathlib.Path('data/morphology-lock.json').write_text(json.dumps({'snapshotSha256':sha(raw),'originalSha256':data['sourceSha256'],'license':'CC-BY-SA-4.0'},indent=2)+'\n')
 else:
  raw=pathlib.Path(args.source).read_bytes();lock=json.loads(pathlib.Path('data/morphology-lock.json').read_text())
  if sha(raw)!=lock['snapshotSha256']:raise ValueError('Morphology snapshot checksum mismatch.')
  data=json.loads(gzip.decompress(raw))
 report=emit(data,args.output);pathlib.Path('data/morphology-manifest.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k!='files'}))
