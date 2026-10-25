# SoftGloss project scope and delivery checklist

Owner: Damian Villarreal. Scope baseline: October 24, 2026.
Product name: Malnaru Read (말나루), in the Malnaru suite; formerly Bungeoppang / SoftGloss. Status: offline dictionary alpha, not a public release.

## Product commitment
A free, useful Korean immersion companion without AI. Target learners know roughly 500+ words and want to read real content with less lookup friction. Long-term destination: dictionary, morphology, grammar, subtitles, sentence mining, vocabulary tracking, reader, recommendations and mobile. Build our own implementation; do not copy a competitor's code or content.

Core lookup, local vocabulary tracking and sentence saving should remain usable without an account. Cloud services are optional additions. Do not promise every future hosted feature is free forever.

## How we track work
Check a box only when its stated deliverable is implemented and supporting evidence is recorded. “Implemented” is distinct from browser-verified or release-ready. Keep unverified gates open. Every increment updates this file and docs/VALIDATION.md. Once the repository exists, mirror milestone groups into GitHub issues and link their evidence here. Do not broaden the current release until its acceptance gates pass or a deliberate scope revision is recorded.

## M0 — scope and foundation
- [x] Recover and inspect original prototype. It contains two canned examples and optional remote AI; retain as reference, not the new runtime.
- [x] Define account-free, offline first-release boundary and later milestones.
- [x] Verify authenticated GitHub identity and Cloudflare account access.
- [x] Create dependency-free Manifest V3 source scaffold, core tests and CI definition.
- [x] Dedicated repository created and initialized: https://github.com/dsuyu1/softgloss
- [x] Import source through [foundation PR #5](https://github.com/dsuyu1/softgloss/pull/5).
- [x] Remote Node tests, static checks and alpha packaging passed: [Actions run](https://github.com/dsuyu1/softgloss/actions/runs/40162442136).

## M1a — starter alpha (current increment)
- [x] Manual mode enables lookup on the current page with activeTab, scripting and storage permissions. Version 0.6.0 adds user-requested optional automatic website access.
- [x] Implement dictionary-backed word lookup, explicitly listed conjugations and limited particle candidates.
- [x] Render unknown-word fallback without invented translation.
- [x] Implement Unknown / Seen / Known state keyed by lemma and local page colors.
- [x] Implement local sentence cards, duplicate prevention and deletion.
- [x] Implement JSON backup/restore with schema validation and replacement confirmation.
- [x] Implement Anki-compatible TSV export with escaped HTML.
- [x] Add original starter glosses and record that they are not a production dictionary.
- [x] Add demo page and unpacked-install instructions.
- [x] Automated core and static safety checks pass locally.
- [ ] Verify extension installation, injection, hover, selection and library opening in Chrome.
- [ ] Verify persistence after browser restart; backup round trip and actual Anki import.
- [ ] Verify keyboard access, focus behavior, narrow screens and zoom.
- [ ] Verify no outgoing requests in browser network logs.

## M1b — useful reading beta (next implementation milestone)
- [x] Audit candidate dictionary licenses using upstream policy; record version, source, attribution, redistribution and commercial-use obligations before bundling. See docs/DATA.md and the pinned source lock.
- [x] Build reproducible offline dictionary import with stable source IDs and Korean headwords / English senses; preserve multiple entries. Offline snapshot and CI rebuild gate added in 0.4.0.
- [ ] Evaluate morphological analyzers against explicit forms/rules; measure browser footprint, ambiguity and lookup coverage before choosing.
- [x] Support irregular conjugations beyond starter forms; preserve multiple senses/analyses. Uses upstream listed forms and source-entry links; independent accuracy review remains open.
- [ ] Add reviewed grammar entries and source attribution.
- [x] Display source-labeled hanja spellings after the dictionary source review; retain attribution.
- [ ] Add licensed idiom and frequency coverage; never fabricate missing fields.
- [x] Add manual dictionary search and keyboard lookup so hover is not required. Implemented in 0.3.0; browser evidence tracked separately.
- [x] Add disable/enable controls, highlighting preferences and dynamic-page support. Implemented in 0.3.0; browser evidence tracked separately.
- [x] Serialize vocabulary/card writes to avoid multi-tab lost updates. Implemented in 0.3.0; browser evidence tracked separately.
- [x] Make unknown/seen/known distinguishable without relying on color alone. Implemented in 0.3.0; browser evidence tracked separately.
- [ ] Benchmark lookup latency and long-page responsiveness; target p95 under 100 ms after dictionary initialization on a documented reference machine.
- [ ] Evaluate at least 100 independently checked tokens/forms; publish unsupported and incorrect cases. Target >=95% correct supported analyses; do not count unknowns as correct.
- [ ] Pilot with Damian and 3–5 learners; log friction and prioritize fixes before expansion.

## M1 release gates
- [ ] All M1a manual tests and M1b tasks above resolved or explicitly moved out with rationale.
- [x] No AI runtime, no API keys, no telemetry, no lookup service dependency. Static checks and Chromium network observations pass.
- [ ] Full dictionary license/attribution, privacy notice, install/help and data deletion instructions reviewed.
- [ ] Supported ordinary web pages work without breaking links, selection or editing.
- [x] Unsupported surfaces documented: internal/store pages, frames without website permission, canvas text, PDFs and DRM content.
- [ ] All required checks pass, review complete, versioned release ZIP produced.

## Later milestones — not promised in the current release
M2: text/Markdown reader; EPUB with safe rendering; YouTube available subtitle tracks, dual display, word lookup and sentence capture. Each has separate acceptance tests. Missing subtitle translations are not generated.

M3: optional account sync and data deletion; conflict resolution; authenticated Cloudflare Worker API and D1 metadata, R2 only for justified object storage; Netflix/Viki feasibility and maintenance testing. No cloud resources provisioned in this increment.

M4: licensed, maintainable content catalog and recommendations using vocabulary coverage; iOS integration and shared dictionary/library format. Community features and opt-in leaderboards only after a demonstrated need. Android later.

## Architecture and costs
Current: isolated extension content script → local dictionary/rules; writes → service-worker queue → chrome.storage.local. No backend or lookup network calls; the MIT-licensed FSRS scheduler is bundled locally. Shadow DOM separates popup styles; CSS Custom Highlights avoids wrapping page text. Core is independent of Chrome APIs for future reuse.

Cloudflare later: static documentation/download hosting first if useful, then optional sync. Do not provision accounts/database/object storage for functionality already handled locally. No deployment, DNS, billing changes or paid resources in this increment. Track hosting/storage/egress costs before offering sync without limits.

## Decisions and limits
The 0.4.0 pack has 29,777 imported headwords and listed conjugations, with multiple senses and source hanja spellings. Its accuracy and learner usefulness have not passed beta gates. No monolingual dictionary, production parser, frequency ranks, subtitles, reader, sync or mobile implementation yet. Grammar analysis is a candidate, not proof of sentence meaning. Vocabulary coverage is not comprehension. Dynamic highlighting rescans in chunks, bounded to 10,000 text nodes and 500,000 characters (10,000 per node). All vocabulary/card mutations are serialized through the service worker. Status names and pressed states supplement page colors. Browser and assistive-technology verification remain separate gates.

## Next concrete work
1. Verify iframe article behavior on Naver Café and other learner sites; permitted-frame regression coverage is in 0.13.0.
2. Independently review real reading tokens (61 new Café probes are prepared; reach at least 100 reviewed tokens). Separate unknowns from incorrect candidates.
3. Review original grammar explanations and bilingual examples; expand sourced coverage.
4. Complete manual Chrome permissions, keyboard/zoom/accessibility, learner-hardware memory and actual Anki import checks.
5. Pilot reading and the new FSRS review flow with Damian and 3–5 learners, then reassess beta readiness before reader/subtitle expansion.

## GitHub work tracking
- [Chrome verification #1](https://github.com/dsuyu1/softgloss/issues/1)
- [Dictionary/data pipeline #2](https://github.com/dsuyu1/softgloss/issues/2)
- [Morphology/accuracy #3](https://github.com/dsuyu1/softgloss/issues/3)
- [UX hardening and beta gates #4](https://github.com/dsuyu1/softgloss/issues/4)

## 0.3.0 reading-UX increment
- [x] Korean/English manual search in the overlay and library; Alt+Shift+K entry point.
- [x] Filterable vocabulary list, explicit status labels and selected-button states.
- [x] Page disable/re-enable, shared highlighting preference, bounded dynamic rescans.
- [x] Single-writer queue for status, cards, restore and deletion; failed writes do not block later operations.
- [x] Confirmed delete-all control and consistent save errors.
- [x] Correct DOM offsets after decomposed Unicode characters; reuse dictionary indexes.
- [x] Regression tests for concurrent writes, failure recovery, restore ordering and search.
- [x] Add CI browser smoke suite with restart and backup round-trip checks.
- [x] Confirm 0.3.0 browser suite passes: PR #6 / Actions run 40163385599. Manual hover, actual shortcut routing, zoom, Anki import and assistive-technology checks remain open.

## 0.4.0 offline dictionary increment
- [x] Audit Wiktionary/Kaikki, NIKL and Kengdic upstream terms; select CC BY-SA 4.0 dictionary fields.
- [x] Pin original input and compressed selected-source snapshot; reproduce output without network access.
- [x] Bundle 33,784 source entries / 29,777 headwords / 40,510 senses / 72,869 conjugated spellings.
- [x] Preserve source IDs, multiple meanings, usage labels and source-specific form links.
- [x] Show hanja spellings only when explicitly labeled in the source.
- [x] Package credits/license and preserve dictionary attribution in cards, backups and Anki exports.
- [x] Keep vocabulary/backups compatible with existing lemma-based data.
- [x] Add integrity, irregular-form, ambiguity and attribution regression coverage.
- [x] Verify full-pack browser CI: [Actions run 40165006893](https://github.com/dsuyu1/softgloss/actions/runs/40165006893). Merge tracked in PR #7.

## 0.5.0 grammar and accuracy-review increment
- [x] Add offline review preparation/grading with analysis fingerprints, reviewer declarations and separate unknown/incorrect/pending metrics.
- [x] Add three source-checked particle notes with expandable hints, original examples and source attribution. Independent Korean review remains open.
- [x] Reject incompatible standard particle allomorphs; handle ㄹ + 로.
- [x] Reset partial dictionary-load buffers on retry.
- [ ] Complete 100+ independent reading reviews and validate the declared reviewer evidence.
- [ ] Independently review teaching notes; the reviewed-grammar beta gate is still open.

## 0.5.1 browser/performance increment
- [x] Fix hidden focus blocking hover after closing keyboard lookup.
- [x] Reject hover outside the actual Korean token's text rectangles.
- [x] Yield highlight scans between nodes after an elapsed-time budget.
- [x] Add pointer, blank-space, selection and editable-input browser regressions.
- [x] Add reproducible CI performance artifact for startup, renderer heap and a 2,000-paragraph dynamic page.
- [x] Record passing CI reference measurements: Actions 40207430126; details in docs/PERFORMANCE.md.
- [ ] Profile on learner hardware and assess memory across multiple enabled tabs.

## 0.6.0 website activation fix
- [x] Explain toolbar activation and remove the impression that a demo server is required.
- [x] Add a toolbar panel with Enable on this page, version, errors and library access.
- [x] Add optional automatic HTTP/HTTPS lookup with a user-initiated Chrome permission request.
- [x] Register a lightweight listener; load the dictionary only on Korean hover/selection.
- [x] Handle opt-out and permission revocation; retain manual mode.
- [x] Verify new-page automatic activation, visible Korean result, opt-out and concurrent manual activation in Chromium CI: Actions 40209433993.
- [ ] Verify Chrome's interactive website-access permission dialog and actual toolbar activeTab grant manually.

## 0.7.0 pilot conjugation increment
- [x] Inspect Naver screenshots; separate omitted endings from missing headwords/compounds.
- [x] Import 255,759 additional source entry/form-tag links as 638 whitelisted transformations, including 188,285 previously absent spellings.
- [x] Preserve source-specific homonym distinctions and per-entry attribution.
- [x] Add bounded -면서 / -는지 and nominalization + particle candidates.
- [x] Add labeled two-noun and noun + 하다/되다 component fallbacks.
- [x] Record screenshot-derived probes without claiming independent reviewer approval.
- [x] Verify expanded pack, pilot examples, activation and long-page benchmark in Chromium CI: Actions 40211604984.
- [ ] Broaden full headword coverage (청원인 is a tracked remaining miss); independently review new analyses.

## 0.8.0 phrase and reading-panel increment
- [x] Inspect six second-round Naver screenshots: purpose modifier, run-on comment, missing nouns, plural + possessive and negation.
- [x] Add original short fallback glosses for 명품, 성역 and 끌어모으다.
- [x] Add bounded plural/particle, -지, -(으)려는 and informal copula analyses; explicitly label possible spacing recovery for 무슨 + noun/copula.
- [x] Accept up to eight Korean words in manual, keyboard and permission-gated automatic selection.
- [x] Explain supported adjacent negation, ability and intention constructions; retain component definitions and unresolved tokens.
- [x] Refresh the panel and toolbar popup with compact navigation, neutral surfaces and coral actions, inspired by the supplied Figma reference.
- [x] Label grammar/part-of-speech colors, merge duplicate analyses per source entry and collapse secondary meanings/settings.
- [x] Verify phrase selection, context saving, automatic activation and existing regressions in Chromium CI; inspect desktop/narrow-panel/popup screenshots (Actions 40213872396).
- [ ] Independently review Korean-language accuracy and usability with learners; expand genuine headword coverage beyond these pilot misses.

## 0.9.0 — explicit scope addition: TOPIK study mode
- [x] User-requested cumulative level 1–6 selector, offline graded-list import/removal, strong word and softer sentence highlights.
- [x] Resolve dictionary forms for level matching; retain list labels without claiming official exam classifications. No third-party graded list is bundled.
- [x] Highlight ambiguous supported results neutrally, prefer exact dictionary entries, fix 응답자의 and 편하려고 screenshot cases.
- [x] Preserve preference updates through the worker queue; keep imports atomic and bounded.
- [x] Audit and bundle official NIKL curriculum grades under KOGL Type 1 (0.10.0); distinguish them from an exam syllabus.
- [ ] Complete independent Korean review, learner-hardware/zoom/accessibility and Anki checks before reader/subtitle expansion.

## 0.10.0 official defaults and grammar scanning
- [x] Import official NIKL vocabulary/grammar appendix with source hashes, attribution, deterministic offline rebuild and shard integrity checks.
- [x] Bundle 9,719 normalized vocabulary lemmas and 336 source grammar records.
- [x] Match supported grammar particles/endings/expressions in scanning; expose source grades and possible matches in lookup.
- [x] Make custom lists additive; removing custom lists retains defaults.
- [ ] Independently review grammar detection and 100+ real tokens; complete manual accessibility/zoom and Anki checks.
Next implementation: improve supported grammar/inflection coverage against the imported catalog and add review evidence. Reader/subtitle work remains after the beta gates.

## 0.11.0 — Bungeoppang reading update
- [x] User-selected Bungeoppang / 붕어빵 branding, preserving internal IDs and local data.
- [x] Six grade colors, grammar underlines that preserve grade backgrounds, nested-link hover fallback without click interception.
- [x] Bounded sentence component view with possible POS/particle/form/tense labels and unknowns.
- [x] Twenty original bilingual learning examples, explicitly distinct from dictionary quotations.
- [ ] Independently review examples and syntactic accuracy; expand licensed example coverage beyond the original starter bank.

## 0.12.0 — expanded source examples and visible build status
- [x] Import 3,704 bilingual dictionary example pairs, linked by sense ID and credited under the existing dictionary license; preserve original learning examples separately.
- [x] Label missing examples; document coverage of 2,814 dictionary entries without claiming full coverage.
- [x] Show loaded version and six color swatches, reject stale panels with reload guidance.
- [ ] Expand licensed example coverage and independently review translations and sense alignment.


## 0.13.0 — embedded reading and offline spaced repetition
- [x] Scan accessible Korean child frames, relay hover/selection into the main panel, preserve frame source URLs and disable frame scanners with the parent.
- [x] Register automatic bootstrap in permitted frames; refresh accessible frames after iframe load events.
- [x] Bundle pinned MIT-licensed ts-fsrs 5.4.2, default parameters and 90% target retention; no remote runtime dependency or Anki code copied.
- [x] Add entry-specific review saving, due queue, answer reveal, four ratings/intervals, suspend/resume/removal and serialized stale-answer protection.
- [x] Include reviews in Anki content export, JSON v2 schedule/history backup, restore and delete-all; retain v1 compatibility.
- [x] Add seven original clothing/color/price entries and bilingual examples, bounded conversational endings and comparison/alternative particles from the screenshot.
- [x] Chromium CI verifies frame link/selection/highlights, delayed and denied-origin frames, review UI, backup/restore and restart persistence; desktop/narrow screenshots inspected (Actions 40237573990).
- [x] Prepare 61 screenshot-derived review probes: 44 supported candidates, 17 unknown, zero independently reviewed. This does not satisfy the 100-token accuracy gate.
- [ ] Verify actual Naver Café article with the learner; independently review new Korean analyses/examples and remaining unknowns.
- [ ] Complete manual accessibility/zoom, learner hardware profiling and real Anki import; parameter optimization, deck collections and live Anki sync remain future scope.


## 0.14.0 — Malnaru suite branding and fourth pilot coverage
- [x] User selected Malnaru / 말나루; rename this extension Malnaru Read across panel, toolbar, library, manifest, credits and current help. Preserve data/IDs.
- [x] Default neutral marks for ungraded dictionary matches during study mode, explicit no-grade lookup labels and a strict-list toggle; do not invent curriculum grades or include higher-grade words.
- [x] Source-gated polite -지요 questions, nominal copula backgrounds, proper-name particles and unique joined labels with three/four nouns.
- [x] Paint joined nouns at their individual grades; do not grade a whole compound from its easiest component.
- [x] Original 층간소음 and four team-name entries with original bilingual examples. Names checked against the official KBO club directory.
- [x] Chromium screenshot/range and existing frame/FSRS regressions pass; desktop/narrow/toolbar screenshots inspected (Actions 40239976738).
- [ ] Independently review the new analyses/examples. Image lettering/OCR, arbitrary unknown names and general spacing repair remain outside the supported parser.

## 0.15.0 — explicit scope addition: pronunciation audio
User-requested on 2026-10-25. Free and offline for the public; paid per-request TTS such as ElevenLabs was ruled out on cost and privacy. See docs/AUDIO.md.
- [x] Compare open-weight Korean TTS licenses and fit; select Supertonic 3 (OpenRAIL-M) for offline pre-generation, not in-browser inference.
- [x] Add a resumable generator pinned through SDK 1.3.1 to the model revision, voice, seed, steps and codec; reject SDK/revision overrides. Record per-clip ASR screen results; exclude gross failures and list flagged clips.
- [x] Package curriculum clips as hashed shards loaded on demand; Listen in the panel and library; disclose machine-generated speech.
- [x] Fall back to installed non-remote `chrome.tts` voices only; no network code, cloud voices or web-accessible resources.
- [x] Add integrity checks, shard/codec tests and actual-click Chromium panel/library playback under normal autoplay policy. Combined 60-test/static/browser CI passes: Actions 40242136544.
- [ ] Native-speaker review of flagged clips and a random sample; real-device fallback-voice checks on Windows, macOS and ChromeOS.


## 0.16.0 — review pilot usability and keyboard hardening
Next executable work within the reading-beta scope: make the FSRS review flow practical for daily learner testing. Independent Korean review, 100-token grading, native audio review, real browser permissions/zoom/assistive technology and actual Anki import remain separate human gates; this increment does not unlock reader/subtitle scope.
- [x] Add Start review, scoped Space/1–4/P/U controls, audio after reveal and focus restoration across rating/undo.
- [x] Add single-action persisted undo, serialized stale-action protection and monotonic card revisions; clear undo on restore/delete/suspend and omit it from backups.
- [x] Refresh idle due queues without taking focus; distinguish a suspended deck from an empty one.
- [x] Test schedule/history recovery, stale cross-tab undo, double undo and failed-write retry locally.
- [ ] Verify the combined keyboard/audio/undo/idle-refresh flow and narrow/reflow layouts in Chromium CI.
- [ ] Complete screen-reader/real-zoom checks and learner pilots, then collect independent language/audio judgments.
