# Pronunciation audio (0.15.0)

Dictionary cards and the library have a **Listen** button. Bundled NIKL curriculum lemmas play a packaged, machine-generated clip. Other words use an offline Korean voice installed on the device, when one exists. No model runs in the browser and nothing is downloaded or uploaded at runtime.

## Model choice
Reviewed October 25, 2026 for a free, public, offline extension:

| Option | Korean | Terms | Fit |
|---|---|---|---|
| [Supertonic 3](https://huggingface.co/Supertone/supertonic-3) (Supertone) | Yes, 1 of 31 languages | Weights BigScience OpenRAIL-M; sample code MIT; commercial use allowed with use restrictions | **Selected** for offline pre-generation. ~99M parameters, CPU-only, plain Hangul input (no phonemizer). Its ~400 MB of ONNX weights are too large to ship or run in a lookup panel. |
| ElevenLabs | Yes | Paid API, per-character billing, network calls | Rejected: per-learner cost and outgoing lookup text. |
| Chrome `chrome.tts` / OS voices | Depends on device | Platform voices | Kept as the fallback. Only voices explicitly marked non-remote are eligible; cloud and unspecified voices are skipped so text stays on the device. |
| [MMS-TTS Korean](https://huggingface.co/Xenova/mms-tts-kor) | Yes | CC BY-NC 4.0 | Rejected: non-commercial. |
| [Piper KSS Korean](https://huggingface.co/neurlang/piper-onnx-kss-korean) | Yes | CC BY-NC-SA 4.0, needs a separate phonemizer | Rejected: non-commercial. |
| Kokoro-82M | No official Korean voice | Apache 2.0 | Rejected: no Korean. |
| Chatterbox Multilingual | Yes | MIT | Rejected for now: far larger, voice-cloning oriented. |

## What is bundled
`scripts/generate-audio.py` synthesizes each of the 9,719 curriculum lemmas with Supertonic 3 at a pinned Hugging Face revision (`724fb5ab…`, through `supertonic` SDK 1.3.1). It uses preset voice F1 at speed 0.9 with 8 steps, seeds the noise per lemma, trims silence and encodes 24 kbps mono Ogg Opus. Clips are stored as base64 in 64 hashed JavaScript shards (`extension/audio/`). The panel asks the service worker to inject only the one shard it needs, then decodes it with Web Audio. Decoding the bytes directly avoids page media CSP rules and exposes no web-accessible extension resources.

The exact parameters, counts, total duration, file hashes and every excluded/flagged word are in `extension/audio/manifest.json`. `npm run check` verifies the hashes; `tests/audio.test.js` checks shard placement, the Ogg Opus headers and curriculum membership.

## Automatic quality screen (not a human review)
Nobody on the project has listened to every clip yet. To catch gross failures (skipped, repeated or garbled syllables), each clip is transcribed with faster-whisper `small` (int8). Twelve clips share one 30-second window, and word timestamps split the transcript. The script compares Hangul jamo and treats ㅐ/ㅔ as equal. A clip scoring above 0.25 is resynthesized with up to two more seeds and the best attempt is kept. Clips still above 0.5 are **excluded**, so those words fall back to the device voice. Clips between 0.25 and 0.5 are kept but **flagged** for human listening.

Whisper writes what it hears, so correct pronunciations can still score as errors (for example 가뜩이나 → 가뜨기나, 가계 → 가게). Single-syllable words are the least reliable. A low score is a screen, not proof of correct pronunciation. Native-speaker review of the flagged list, and a sample of the rest, remains open.

## Terms and disclosure
Supertone claims no rights in generated output. The clips are not the model, and no weights are redistributed. The OpenRAIL-M use restrictions still apply to how Malnaru Read uses the output. The relevant one requires machine-generated content to be disclosed, so the panel and library label playback "Machine-generated voice · Supertonic 3". The packaged credits page repeats this. Do not use these clips to imitate a real person.

## Regenerating
Maintainers only; this needs network access once to fetch the model and the Whisper weights, plus ffmpeg:

```sh
python -m venv .venv && .venv/bin/pip install supertonic==1.3.1 faster-whisper==1.2.1 scipy
.venv/bin/python scripts/generate-audio.py --work /tmp/softgloss-audio --workers 4
npm test && npm run check
```

An interrupted run resumes from `--work`. `--pack-only` rebuilds the shards from finished clips. ONNX Runtime and Opus output can vary by CPU and ffmpeg build, so CI verifies the committed hashes and does not regenerate the audio. On a 16-thread Windows desktop, a full run took about 80 minutes.

## Limits
- Only curriculum lemmas (dictionary forms) have packaged clips. Listen reads the dictionary lemma even when a conjugated surface was looked up. Other lemmas use the device voice, or show a message when none is installed. Windows needs the Korean speech pack; macOS and ChromeOS usually include a Korean voice.
- Homographs share one clip. Vowel length and context-dependent sound changes are not modeled.
- One preset voice. Adding a male voice would double the audio size (currently 24 MB for 9,709 clips, 92 minutes of audio).

Integration review verified that SDK 1.3.1 pins supertonic-3 to the manifest revision by default. The generator now rejects a different SDK/model-revision override. The full upstream model license is packaged with credits; clips are visibly labeled synthetic before playback.
