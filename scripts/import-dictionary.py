#!/usr/bin/env python3
"""Build the pinned offline pack. Never downloads data or changes the source lock."""
import argparse, gzip, hashlib, json, pathlib, re

def digest(data): return hashlib.sha256(data).hexdigest()
def encode(value): return json.dumps(value, ensure_ascii=False, separators=(',', ':'))
POS = {'noun':'noun','verb':'verb','adj':'adjective','adv':'adverb','pron':'pronoun','num':'numeral','det':'determiner','counter':'counter','intj':'interjection','conj':'conjunction'}
HANGUL = re.compile(r'[가-힣]{1,80}\Z')

def convert(record):
    word, pos = record.get('word',''), record.get('pos')
    if record.get('lang_code') != 'ko' or not HANGUL.fullmatch(word) or pos not in POS: return None
    senses = []
    for sense in record.get('senses', []):
        glosses = [g for g in sense.get('glosses', []) if isinstance(g,str) and g.strip()]
        # Exclude cross-references and empty senses; never copy quotations/examples/media.
        if not glosses or sense.get('form_of') or sense.get('alt_of') or 'no-gloss' in sense.get('tags', []): continue
        sid = sense.get('id') or 'derived-' + digest(encode([word,pos,glosses]).encode())[:24]
        senses.append([sid, glosses, sorted(set(sense.get('tags', [])))])
    if not senses: return None
    forms = set()
    if pos in ('verb','adj'):
        for form in record.get('forms', []):
            text, tags = form.get('form',''), set(form.get('tags', []))
            # A deliberately bounded set, using only upstream attested table rows.
            if form.get('source') != 'conjugation' or not HANGUL.fullmatch(text) or text == word: continue
            if 'indicative' not in tags or not tags.intersection({'past','non-past'}): continue
            if not tags.issubset({'formal','informal','indicative','past','non-past','polite'}): continue
            forms.add((text, tuple(sorted(tags))))
    # Stable source sense ID, not array position or a new random ID on each build.
    eid = 'wikt:' + senses[0][0]
    hanja = sorted({f['form'] for f in record.get('forms',[]) if 'hanja' in f.get('tags',[]) and isinstance(f.get('form'), str) and re.fullmatch(r'[\u3400-\u9fff]+',f['form'])})
    return [eid, word, POS[pos], senses, [[s,list(t)] for s,t in sorted(forms)], hanja]

def build(source, output, lock_path, snapshot=None):
    lock = json.loads(pathlib.Path(lock_path).read_text())
    source_path = pathlib.Path(source)
    if str(source).endswith('.parts.json'):
        parts = json.loads(source_path.read_text())['chunks']
        chunks = []
        for part in parts:
            chunk = (source_path.parent / part['path']).read_bytes()
            if len(chunk) != part['bytes'] or digest(chunk) != part['sha256']: raise ValueError('Snapshot chunk checksum mismatch.')
            chunks.append(chunk)
        raw = b''.join(chunks)
    else: raw = source_path.read_bytes()
    if digest(raw) not in {lock['sha256'], lock.get('snapshotSha256')}: raise ValueError('Source checksum differs from data/source-lock.json; review and pin an update first.')
    if str(source).endswith(('.gz','.parts.json')): raw = gzip.decompress(raw)
    entries = {}
    for line in raw.splitlines():
        record = convert(json.loads(line))
        if record:
            if record[0] in entries and entries[record[0]] != record: raise ValueError('Conflicting source ID: ' + record[0])
            entries[record[0]] = record
    rows = sorted(entries.values(), key=lambda r:(r[1],r[2],r[0]))
    if snapshot:
        projected=[]
        reverse={v:k for k,v in POS.items()}
        for _,word,pos,senses,forms,hanja in rows:
            projected.append({'word':word,'lang_code':'ko','pos':reverse[pos],
                'senses':[{'id':sid,'glosses':glosses,'tags':tags} for sid,glosses,tags in senses],
                'forms':[{'form':surface,'tags':tags,'source':'conjugation'} for surface,tags in forms] + [{'form':h,'tags':['hanja']} for h in hanja]})
        compressed=gzip.compress(('\n'.join(encode(r) for r in projected)+'\n').encode(),mtime=0)
        pathlib.Path(snapshot).write_bytes(compressed)
        lock['snapshotSha256']=digest(compressed)
        lock['snapshotPath']=str(snapshot)
        pathlib.Path(lock_path).write_text(json.dumps(lock,ensure_ascii=False,indent=2)+'\n')
    # Shards keep individual generated files reviewable and transferable.
    output = pathlib.Path(output); output.mkdir(parents=True,exist_ok=True)
    files = []
    for number, start in enumerate(range(0,len(rows),1000)):
        filename = f'dictionary-{number:02}.js'
        text = '// Derived from English Wiktionary via Kaikki. CC BY-SA 4.0; see THIRD_PARTY_NOTICES.html.\n'
        text += 'globalThis.SG_PACK_ROWS = (globalThis.SG_PACK_ROWS || []).concat(' + encode(rows[start:start+1000]) + ');\n'
        (output/filename).write_text(text)
        files.append({'path':filename,'sha256':digest(text.encode()),'bytes':len(text.encode())})
    for old in output.glob('dictionary-*.js'):
        if old.name not in {f['path'] for f in files}: old.unlink()
    report = {'schema':1,'sourceSha256':lock['sha256'],'entries':len(rows),'lemmas':len({r[1] for r in rows}),'senses':sum(len(r[3]) for r in rows),'formLinks':sum(len(r[4]) for r in rows),'formSurfaces':len({f[0] for r in rows for f in r[4]}),'files':files}
    (output/'dictionary-manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    return report

if __name__ == '__main__':
    parser=argparse.ArgumentParser(); parser.add_argument('source'); parser.add_argument('--output',default='extension/dictionary'); parser.add_argument('--lock',default='data/source-lock.json'); parser.add_argument('--write-snapshot')
    args=parser.parse_args(); report=build(args.source,args.output,args.lock,args.write_snapshot)
    print(json.dumps({k:v for k,v in report.items() if k!='files'},ensure_ascii=False))
