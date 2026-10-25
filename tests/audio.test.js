import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
await import('../extension/speech.js');for(let i=0;i<5;i++)await import(`../extension/study/vocabulary-0${i}.js`);
const manifest=JSON.parse(fs.readFileSync('extension/audio/manifest.json'));
for(const file of manifest.files)await import('../extension/audio/'+file.path);
test('every packaged clip is a curriculum lemma stored in the shard the runtime will load',()=>{
 const lemmas=Object.keys(SG_AUDIO);assert.equal(lemmas.length,manifest.clips);assert.equal(manifest.clips+manifest.excluded.length,manifest.lemmas);
 assert.equal(manifest.lemmas,Object.keys(SG_STUDY_DEFAULTS).length);
 for(const file of manifest.files){const own=fs.readFileSync('extension/audio/'+file.path,'utf8').match(/"([가-힣]+)":/g)||[];assert.equal(own.length,file.clips);for(const key of own)assert.equal(SGSpeech.shard(key.slice(1,-2)),'audio/'+file.path);}
 for(const lemma of lemmas)assert.ok(SG_STUDY_DEFAULTS[lemma],lemma);
});
test('clips decode as Ogg Opus and stay small',()=>{
 for(const [lemma,clip] of Object.entries(SG_AUDIO)){const bytes=Buffer.from(clip,'base64');assert.equal(bytes.subarray(0,4).toString(),'OggS',lemma);assert.ok(bytes.includes('OpusHead'),lemma);assert.ok(bytes.length<20000,lemma);}
 assert.ok(SG_AUDIO['학교']&&SG_AUDIO['책'],'smoke-test words need clips');
});
test('shard hashing is stable across releases',()=>{
 assert.equal(SGSpeech.shard('가다'),SGSpeech.shard('가다'));assert.match(SGSpeech.shard('학교'),/^audio\/audio-\d{2}\.js$/);
 const used=new Set(Object.keys(SG_STUDY_DEFAULTS).map(SGSpeech.shard));assert.equal(used.size,manifest.shards);
});
