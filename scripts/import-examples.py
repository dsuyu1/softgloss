import pathlib,json,gzip,hashlib
root=pathlib.Path(__file__).resolve().parent.parent
lock=json.loads((root/'data/examples-lock.json').read_text());assert lock['sourceSha256']==json.loads((root/'data/source-lock.json').read_text())['sha256'];raw=(root/'data/examples-source.json.gz').read_bytes();assert hashlib.sha256(raw).hexdigest()==lock['snapshotSha256']
rows=json.loads(gzip.decompress(raw));folder=root/'extension/examples';folder.mkdir(exist_ok=True);files=[]
for i in range(0,len(rows),300):
 name=f'examples-{i//300:02}.js';text=('globalThis.SG_DICTIONARY_EXAMPLES = {};\n' if i==0 else '')+'Object.assign(globalThis.SG_DICTIONARY_EXAMPLES,'+json.dumps(dict(rows[i:i+300]),ensure_ascii=False,separators=(',',':'))+');\n';(folder/name).write_text(text);files.append({'path':name,'sha256':hashlib.sha256(text.encode()).hexdigest()})
(folder/'manifest.json').write_text(json.dumps({'license':lock['license'],'sourceSenses':len(rows),'pairs':sum(len(r[1]) for r in rows),'files':files},indent=2)+'\n')
print(len(files))
