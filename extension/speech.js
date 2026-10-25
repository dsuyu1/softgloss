// Pronunciation: packaged machine-generated clips (Supertonic 3, OpenRAIL-M) for curriculum lemmas.
// Clips are base64 Ogg Opus in hashed shards; decoding through Web Audio avoids page media CSP. No network.
(() => {
 const SHARDS = 64, loaded = new Set();
 let context, playing;
 // FNV-1a over UTF-16 code units; scripts/generate-audio.py uses the same layout.
 function shard(lemma) {
  let h = 0x811c9dc5;
  for (let i = 0; i < lemma.length; i++) h = Math.imul(h ^ lemma.charCodeAt(i), 0x01000193) >>> 0;
  return 'audio/audio-' + String(h % SHARDS).padStart(2, '0') + '.js';
 }
 // load(file) injects one shard into this world; resolves once SG_AUDIO holds its clips.
 async function play(lemma, load) {
  const file = shard(lemma);
  if (!loaded.has(file)) {await load(file); loaded.add(file);}
  const clip = globalThis.SG_AUDIO?.[lemma];
  if (!clip) return false;
  context ??= new AudioContext();
  await context.resume();
  const bytes = Uint8Array.from(atob(clip), c => c.charCodeAt(0));
  const buffer = await context.decodeAudioData(bytes.buffer);
  playing?.stop();
  playing = context.createBufferSource(); playing.buffer = buffer; playing.connect(context.destination); playing.start();
  return true;
 }
 // Packaged clip first, then an installed offline Korean voice through the service worker.
 async function listen(lemma, load) {
  if (await play(lemma, load)) return 'Machine-generated voice · Supertonic 3';
  const response = await chrome.runtime.sendMessage({type: 'speak', text: lemma});
  if (!response?.ok) throw Error(response?.error || 'Could not play audio.');
  return 'Device voice · ' + response.voice;
 }
 globalThis.SGSpeech = {shard, play, listen};
})();
