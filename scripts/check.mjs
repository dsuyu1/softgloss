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

const morphology=JSON.parse(fs.readFileSync('data/morphology-manifest.json'));
for(const file of morphology.files){const p='extension/morphology/'+file.path;const bytes=fs.readFileSync(p);if(crypto.createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw Error('Morphology checksum mismatch');execFileSync(process.execPath,['--check',p]);}
console.log('Extended morphology integrity and syntax checks passed.');

const study=JSON.parse(fs.readFileSync('extension/study/manifest.json'));for(const file of study.files){const p='extension/study/'+file.path;const bytes=fs.readFileSync(p);if(crypto.createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw Error('Curriculum checksum mismatch');execFileSync(process.execPath,['--check',p]);}
console.log('Official curriculum integrity and syntax checks passed.');

const examples=JSON.parse(fs.readFileSync('extension/examples/manifest.json'));for(const f of examples.files){const p='extension/examples/'+f.path;if(crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')!==f.sha256)throw Error('Example checksum mismatch');execFileSync(process.execPath,['--check',p]);}

const scheduler=JSON.parse(fs.readFileSync('data/scheduler-lock.json'));
if(crypto.createHash('sha256').update(fs.readFileSync(scheduler.file)).digest('hex')!==scheduler.sha256)throw Error('Scheduler checksum mismatch');
execFileSync(process.execPath,['--check',scheduler.file]);
if(!fs.existsSync('extension/licenses/ts-fsrs-MIT.txt'))throw Error('Missing scheduler license');
const schedulerSource=fs.readFileSync(scheduler.file,'utf8');if(/\beval\s*\(|new Function|\bfetch\s*\(|XMLHttpRequest|WebSocket/.test(schedulerSource))throw Error('Unexpected scheduler runtime code');
console.log('Pinned offline FSRS scheduler integrity and license checks passed.');

if(!m.permissions.includes('tts'))throw Error('Missing tts permission');
const audio=JSON.parse(fs.readFileSync('extension/audio/manifest.json'));for(const file of audio.files){const p='extension/audio/'+file.path;const bytes=fs.readFileSync(p);if(crypto.createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw Error('Audio checksum mismatch: '+p);execFileSync(process.execPath,['--check',p]);}
console.log('Pronunciation audio integrity and syntax checks passed.');

const audioLicense=JSON.parse(fs.readFileSync('data/audio-license-lock.json'));if(crypto.createHash('sha256').update(fs.readFileSync(audioLicense.file)).digest('hex')!==audioLicense.sha256)throw Error('Audio license checksum mismatch');
