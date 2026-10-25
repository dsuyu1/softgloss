import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const m=JSON.parse(fs.readFileSync('extension/manifest.json'));
if(m.manifest_version!==3||m.host_permissions||m.content_scripts)throw Error('Unexpected permissions');
for(const f of fs.readdirSync('extension').filter(f=>f.endsWith('.js'))){execFileSync(process.execPath,['--check','extension/'+f]);const s=fs.readFileSync('extension/'+f,'utf8');if(/\bfetch\s*\(|XMLHttpRequest|WebSocket|innerHTML/.test(s))throw Error('Unexpected network or HTML sink: '+f);}
for(const f of [m.background.service_worker,m.options_page])if(!fs.existsSync('extension/'+f))throw Error('Missing '+f);
console.log('Manifest, JavaScript syntax, network-free source and safe rendering checks passed.');
