import os from 'node:os';
import {performance} from 'node:perf_hooks';
import '../extension/dictionary-files.js';
for (const file of SG_DICTIONARY_FILES) await import('../extension/' + file);
import '../extension/core.js';
const inputs = ['책', '학교에서', '먹었어요', '한국어를', '지원하지않는단어', '도와요'];
for (let i = 0; i < 10000; i++) SG.lookup(inputs[i % inputs.length]);
const samples = [];
for (let i = 0; i < 10000; i++) {const start = performance.now(); SG.lookup(inputs[i % inputs.length]); samples.push(performance.now() - start);}
samples.sort((a,b) => a-b);
console.log(JSON.stringify({runtime: process.version, platform: `${os.platform()} ${os.arch()}`, cpu: os.cpus()[0]?.model, dictionaryEntries: SG_DATA.entries.length, samples: samples.length, p50Milliseconds: samples[5000], p95Milliseconds: samples[9500], maximumMilliseconds: samples.at(-1), caveat: 'Warm Node lookup microbenchmark using the bundled dictionary. Does not measure browser DOM scans, UI responsiveness or browser page responsiveness.'}, null, 2));
