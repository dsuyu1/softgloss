import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import crypto from 'node:crypto';
const m=JSON.parse(fs.readFileSync('extension/manifest.json'));
if(m.manifest_version!==3||m.host_permissions||m.content_scripts)throw Error('Unexpected permissions');
for(const f of fs.readdirSync('extension').filter(f=>f.endsWith('.js'))){execFileSync(process.execPath,['--check','extension/'+f]);const s=fs.readFileSync('extension/'+f,'utf8');if(/\bfetch\s*\(|XMLHttpRequest|WebSocket|innerHTML/.test(s))throw Error('Unexpected network or HTML sink: '+f);}
for(const f of [m.background.service_worker,m.options_page,m.action.default_popup])if(!fs.existsSync('extension/'+f))throw Error('Missing '+f);
console.log('Manifest, JavaScript syntax, network-free source and safe rendering checks passed.');

const pack=JSON.parse(fs.readFileSync('extension/dictionary/dictionary-manifest.json'));
for(const file of pack.files){
 const path='extension/dictionary/'+file.path, content=fs.readFileSync(path);
 if(crypto.createHash('sha256').update(content).digest('hex')!==file.sha256)throw Error('Dictionary checksum mismatch: '+path);
 execFileSync(process.execPath,['--check',path]);
}
const html=fs.readFileSync('extension/library.html','utf8');
for(const match of html.matchAll(/<script src="([^"]+)"/g))if(!fs.existsSync('extension/'+match[1]))throw Error('Missing library script');
if(!fs.existsSync('extension/licenses/CC-BY-SA-4.0.txt')||!fs.existsSync('extension/THIRD_PARTY_NOTICES.html'))throw Error('Missing attribution');
console.log('Dictionary shard integrity, syntax and packaged attribution checks passed.');

if(JSON.stringify(m.optional_host_permissions)!==JSON.stringify(["http://*/*","https://*/*"]))throw Error("Unexpected optional host access");
