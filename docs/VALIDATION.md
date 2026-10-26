# Validation record — October 24, 2026

## Passed locally
- Six Node tests: listed past-tense lookup, dictionary-backed particle candidates, unknown fallback, honest vocabulary-coverage denominator, Anki TSV escaping, backup validation.
- Static checks: Manifest V3 and permission boundary, referenced entry files exist, JavaScript syntax, no network-call API or innerHTML rendering sinks in extension source.

## Not yet verified
No browser automation runtime or Chrome executable was found in this workspace. No real extension installation, UI smoke test, visual inspection, browser restart, actual Anki import or network-panel inspection was performed. GitHub Actions passed on foundation commit 4d19795b86a3477173b7c4482e5387ae364ef6e5: https://github.com/dsuyu1/softgloss/actions/runs/40162442136. This confirms tests, static checks and ZIP packaging, not browser UI verification. Do not treat source implementation checks as end-to-end verification.

## Manual smoke script
1. Load unpacked extension; check service-worker errors.
2. Open served demo and enable; panel appears once, including after repeated toolbar clicks.
3. Hover 학교에서 and 먹었어요; confirm dictionary lemma and parts; hover unsupported sample; confirm honest empty state.
4. Select a Korean token; use keyboard to navigate popup actions; Escape closes; toolbar reopens.
5. Mark 읽다 known; 읽어요 should color green; verify original links/text remain functional.
6. Save twice; library should contain one card; delete it.
7. Save several cards, export JSON, change state, restore; compare words/cards; reject malformed backup without altering stored state.
8. Import TSV into Anki with HTML enabled; four fields align; special characters display as text.
9. Restart browser and inspect persistence. Use a second tab to verify concurrent writes preserve both changes.
10. Check DevTools network: no extension-origin outgoing requests during lookup/save/export.
11. Test narrow viewport, 200% zoom, long page and restricted-page error badge.

Browser findings must be recorded here before checking the corresponding PROJECT.md gates.

## 0.3.0 validation — reading UX
- Fourteen local Node tests pass: the six original checks plus search, original Unicode offsets, concurrent vocabulary writes, concurrent/deduplicated cards, failed-write recovery, restore ordering, invalid-operation isolation and deletion preserving preferences.
- Static checks pass. Runtime remains network-free and dependency-free; activeTab/scripting/storage permissions unchanged.
- Added Playwright CI smoke tests using a real unpacked extension and persistent Chromium profile. Test-only shadow-root capture is injected by the harness, not shipped. The harness copies the extension to a temporary directory and grants that copy localhost-only host access because automation cannot supply the toolbar gesture that grants activeTab. This does not verify the real activeTab permission flow. Tests cover search/focus, real storage messaging, dynamic highlights, disabling/re-enabling, two-tab duplicate saves, TSV download, JSON restore/rejection, narrow library layout and profile restart.
- The runtime browser download returned invalid ZIPs. Installing the pinned Playwright version succeeded through its fallback CDN, but Chromium launch failed because this workspace forbids its process-singleton socket (`socket() failed: Operation not permitted`). No browser test assertions ran. Local end-to-end validation is not claimed. CI is pending GitHub publication approval.
- Still manual: pointer hover, OS shortcut delivery, editable-page interaction, screen-reader behavior, 200% zoom, actual Anki import and interactive network-panel inspection.

### Starter lookup timing (not the browser release gate)
`node scripts/benchmark.mjs`: Node v24.22.1, Linux x64, AMD EPYC 9V74; 52 entries, 10,000 warm samples. Observed p95 0.000601 ms and maximum 0.196 ms. This small-pack Node microbenchmark does not establish browser responsiveness, long-page latency, or production-pack performance; that checklist item remains open.

## 0.4.0 dictionary increment
- Twenty Node tests pass, including pinned shard hashes, unique entry IDs, source/sense integrity, imported vocabulary/hanja, multiple meanings for 배, 20 familiar irregular/contraction forms, homonym-specific form links and attribution round trips. These fixtures are regression checks, not independent linguistic validation.
- Importing the original input and rebuilding from the committed compressed field snapshot produce byte-identical shards and manifest. CI repeats the offline rebuild and rejects generated-file drift.
- Full-pack Node warm lookup: 33,785 runtime entries, 10,000 samples, p95 0.0175 ms (Node v24.22.1 / Linux x64 / AMD EPYC 9V74). Not a browser/long-page result.
- Full-pack browser smoke tests passed in Actions run 40164714739: expanded vocabulary, ambiguous senses, listed irregulars, attribution persistence, restart, dynamic highlighting and no outgoing HTTP requests. Chromium 141 / Linux x64; initial timing used individual calls and hit browser timer resolution, so no precise p95 is claimed from that run.
- The rebuild gate caught a truncated binary snapshot during GitHub transfer. The snapshot is now split into small chunks with per-chunk and combined checksums. All other published file blobs matched the local commit; no checksum was relaxed. The corrected published Git tree matches the local tree exactly.
- Manual Chrome permission flow, pointer hover, assistive technology, 200% zoom, actual Anki import, 100 independently reviewed tokens and learner pilots remain open.

### Full-pack CI result
[Actions run 40165006893](https://github.com/dsuyu1/softgloss/actions/runs/40165006893) passed both jobs: deterministic offline rebuild, 20 Node tests, syntax/integrity/safety checks, ZIP packaging and full-pack Chromium smoke tests. The browser suite exercises search, alternate senses, listed irregulars, source attribution, dynamic highlighting, disabling/re-enabling, multi-tab saves, backup round trips, narrow library layout, restart persistence and absence of outgoing HTTP requests. This is still distinct from manual activeTab/hover/assistive-technology/Anki checks and independent Korean-language validation.

## 0.5.0 validation
Added regression checks for standard particle variants, the ㄹ + 로 exception, grammar attachment, pending/unknown score handling and stale or deleted review candidates. Browser CI checks the new expandable grammar hints. Independent linguistic evaluation and reviewed grammar remain uncompleted; synthetic examples do not satisfy them.

## 0.5.1 browser/performance validation
25 existing Node tests and static checks pass locally. Added real pointer-coordinate checks, blank-space hover rejection, selection/mouseup lookup, editable-input exclusion and close/focus regression tests in Chromium. Added first-activation, renderer heap, rescan and frame-gap/long-task measurements; see docs/PERFORMANCE.md for exact scope and limitations. CI outcome pending. No local Chromium assertions are claimed because the workspace's browser socket restriction remains.

CI reference [40207430126](https://github.com/dsuyu1/softgloss/actions/runs/40207430126) passes both jobs, including the added hover/focus/blank-space/selection/editable-input checks, 2,000-paragraph workload, all 25 Node tests, offline rebuild, static checks and ZIP packaging. Chromium serialized empty focus as null; the test now checks an explicit boolean. Timing/heap evidence and its limitations are recorded in docs/PERFORMANCE.md. Real-device, manual permissions, assistive technology, actual zoom, Anki import and independent Korean review remain open.

## 0.6.0 website activation
The toolbar now opens an explicit activation panel, and optional automatic mode uses declared optional host permissions plus a registered lightweight listener. Added browser cases for lazy activation on a new permitted page, no automatic injection after opt-out, toolbar-panel content and manual activation messaging. Test-copy localhost grants substitute for the interactive Chrome permission dialog; that dialog, restricted-page handling and manual activeTab grants still need human validation. All existing regression coverage is retained. [Actions 40209433993](https://github.com/dsuyu1/softgloss/actions/runs/40209433993) passes both jobs, including visible automatic results on a new permitted page, opt-out of an existing automatic panel, no new auto-injection after opt-out, popup content and concurrent manual activation without duplicate panels. The test inspects the closed shadow panel through a test-only hook; the host itself has no visible dimensions.

## 0.7.0 pilot findings
The clicked screenshot example 인기글 is a noun compound; screenshot-derived news probes include 다루면서, 중단하는, 드러내기, 있는 and 반영된. Before this change these lacked a supported lookup (반영되다 is also absent as a full headword). The supplemental tables and labeled component fallbacks address those cases. 청원인은 remains a recorded genuine gap. These probes are user-material-derived regression inputs, not completed independent linguistic reviews.

30 local tests pass, including checksums, source round trips at both ends of every transformation whitelist, screenshot probes, regular/irregular homonyms, compound labels and unsupported fallbacks. Offline morphology rebuild is deterministic. Node warm lookup p95 measured 0.0166 ms for 10,000 samples on Linux x64 / AMD EPYC 9V74 / Node 24.22.1; this excludes startup and DOM work. Browser CI adds the pilot examples to the existing interaction and long-page suite. [Actions 40211604984](https://github.com/dsuyu1/softgloss/actions/runs/40211604984) passes both jobs: 30 Node tests, both offline data rebuilds, integrity/static checks, packaging, the new lookup probes, optional activation and existing interaction/performance regressions.

## 0.8.0 second-round pilot
36 local Node tests pass, including the six-screen findings, plural/copula allomorph rejection, source-gated purpose modifiers, phrase construction detection, punctuation boundaries, unresolved components and shared selection limits. Static, attribution and data-integrity checks pass. The Chromium suite adds multiword automatic activation, actual page phrase selection, word and construction regressions, and desktop/narrow-panel/popup screenshots. [Actions 40213872396](https://github.com/dsuyu1/softgloss/actions/runs/40213872396) passed both jobs, including phrase saving across inline spans, automatic multiword activation, existing persistence tests and no external HTTP requests. Desktop, 360px panel and popup screenshots were downloaded and visually inspected.

Construction hints explain a matched substring, not a full translation. This release supports -지 않다/못하다, -(으)ㄹ 수 있다/없다 and -(으)려고 하다 when their components resolve. Full Korean parsing, arbitrary spacing repair, idiom translation and independent linguistic validation are not claimed. Local Chromium remains unavailable because of the workspace socket restriction; browser assertions are run in CI.

In that Chromium 141 / Linux x64 / Node 22.23.3 run, cold injection was 449 ms, the 2,000-paragraph rescan was 307 ms and frame-gap p95 was 16.7 ms (108 sampled frames; no observed long tasks in the measured rescan window). These are synthetic CI results, not real-device or independent language validation.

## 0.8.1 screenshot coverage
38 Node tests and static/integrity checks pass locally. New probes cover the third-round screenshots, every token of the selected six-word question, stacked particles and invalid ending/base combinations. Earlier screenshot probes remain passing. See PILOT-COVERAGE.md for scope and limitations. Chromium CI adds targeted reading-panel checks; independent Korean review remains open.

## 0.9.0 study mode
Adds Node checks for CSV/TSV parsing, malformed/empty/oversized-level inputs, cumulative thresholds, inflected matches, exact-match preference, ambiguous highlights and atomic preference/list mutations. Chromium tests exercise file-input import, target selection, word/context ranges, switching off and list removal alongside existing long-page/persistence checks. Sentence context uses paragraph/list/heading/table blocks bounded to 200 text nodes and 10,000 characters; unusually large blocks may have word highlights without sentence context. Context segmentation is punctuation/newline based, not a linguistic sentence parser.

No graded dataset is redistributed or estimated. Settings link to https://everykoreans.com/topik-vocabulary-list/ for optional user-directed downloads; its publisher describes curriculum-based grades and personal/classroom sharing terms. Import is local and makes no runtime request. Source CSV is kept separately from learning backups.

## 0.10.0 official curriculum defaults
43 Node tests pass locally, including default matching without imports, source grammar expression/particle/conditional recognition, rejection of a modifier false positive in 읽으면, and additive imports/removal preserving defaults. Static checks cover study shards. CI rebuilds the official extract offline and adds bundled vocabulary/grammar browser assertions to the prior study-mode suite. Recognition is candidate analysis, not independent accuracy validation; not every form of the 336 catalog entries is recognized. See CURRICULUM.md for exact source and omissions.

## 0.11.0 reading analysis
Adds regression checks for sentence object/past labels, retained 부르다 verb/adjective ambiguity, unknown/oversized context and level metadata. Chromium cases cover nested-link hover, native hash navigation, six distinct highlight colors, sentence breakdown and example rendering. Existing browser checks and offline data rebuilds remain. These are implementation regressions, not independent language review. Screenshot 기자협회보 is treated as a missing publication-name entry; existing screenshot links already show highlights, so not all misses were link-handling failures. Original examples are authored locally, not copied from an external dictionary.

## 0.12.0 examples and loaded build
46 Node tests include bilingual source text, sense membership, attribution and example coverage. Offline CI rebuilds the selected example snapshot and checks shard hashes. Chromium checks version visibility and dictionary-example rendering alongside the earlier six-color, link and persistence cases. Screenshot review identified an older SoftGloss panel, not proof of a failed rename in current code.


## 0.13.0 — frames and FSRS
52 Node tests pass locally, including learning/relearning transitions, future-card exclusion, duplicate enrollment, multi-tab stale answers, storage failure recovery, malformed schedule rejection, attributed schedule/history backup round-trip and legacy restore. Static checks pin the unmodified scheduler bundle SHA-256 and require its MIT notice. Conversational ending regressions remain source-gated; seven new original entries/examples are not independently language-reviewed.

Chromium regressions now exercise same-origin embedded article highlights, native frame link navigation, frame selection routed to one main panel, review capture with the article URL and whole-page disable. Review UI checks reveal-before-rating, next due intervals, deduplication, JSON v2 restore and browser-restart persistence. [Actions 40237573990](https://github.com/dsuyu1/softgloss/actions/runs/40237573990) passes both jobs, including the delayed frame and denied-origin cases, review scheduling/restore/restart, all earlier interaction checks and network observations. Desktop review and narrow-panel screenshots were downloaded and inspected. No manual Naver verification or real Anki import is claimed.

The 61-token Café fixture is manually transcribed from the provided screenshot and keeps context/source labels. Current lookup returns candidates for 44 tokens and no result for 17, with zero reviewed judgments. To prepare a fresh independent review: `node scripts/review.mjs prepare evaluation/naver-cafe-cases.json cafe-sheet.json`, then grade with the existing review workflow. Coverage is not accuracy, and this sample alone is smaller than the 100-token release gate.

The same CI run measured 325 ms first activation, 314 ms rescan for the synthetic 2,000-paragraph fixture, and 16.8 ms frame-gap p95 with no observed long tasks. Whole-renderer heap after the main reading flow was about 74 MB without forced GC. These are hosted-runner observations for the main-frame workload, not a per-tab memory guarantee or a multi-frame memory profile. The initial browser run failed because the new test tried to use search results after a deliberate library reload; reissuing the search corrected that test setup.


## 0.14.0 — fourth screenshots and suite name
The screenshots show the current build, ordinary dictionary entries without curriculum grades (어떻게), an unsupported polite honorific question (해결하시는지요), a three-noun label (단체관람안내), and a missing proper name plus particle (기아타이거즈의). Several large banners appear to contain image lettering; no OCR support is claimed. Add regressions for the actual lookup cases, ungraded classification, per-component grades, strict-list preference and preserved settings. The old synthetic unknown probe 가짜교육표제 is now a possible three-noun chain, so the unknown-word assertion uses an unsupported Hangul string instead.

55 local Node tests and static checks pass; Chromium adds neutral/strict-list ranges, level filtering, individual joined-noun ranges, new-name/version rendering and the screenshot lookup cases. [Actions 40239976738](https://github.com/dsuyu1/softgloss/actions/runs/40239976738) passes both jobs, including the screenshot-range, strict-list, target cutoff, component grading, iframe, FSRS and network checks. Desktop gap, narrow panel and toolbar screenshots were downloaded and visually inspected. Independent language review remains open.

## 0.15.0 pronunciation audio
9,709 of 9,719 curriculum lemmas have packaged Supertonic 3 clips (24 MB, 5,531 s). The automatic Whisper screen excluded 10 clips, which fall back to the device voice, and flagged 146 for listening; both lists are in extension/audio/manifest.json. Packing from the cached clips is byte-identical across runs. Locally, in an LF-normalized copy, 55 Node tests, all static/integrity checks and the Chromium smoke suite pass on Windows 11 / Ryzen 7 5800H / Chromium 141, including panel and library Listen playback with no external requests. Headless Chromium has no Korean voice, so only the no-voice fallback message was exercised. Native-speaker listening review and real-device fallback voices remain open.


## 0.15.0 integration review
Merge the audio branch with current Malnaru branding, fourth-pilot highlighting and FSRS data compatibility. 60 Node tests and static checks pass locally, including audio membership/codec headers/checksums and new offline-voice selection tests. Remote or unspecified voices are excluded and the selected engine ID is retained when available. The SDK 1.3.1 model revision matches the audio manifest; regeneration now rejects a differing SDK or revision override. The full model license is packaged and hashed, synthetic speech is disclosed on the button, and no model weights are added.

Chromium now uses an actual pointer click for panel playback without bypassing autoplay policy; library playback also uses a real click. [Actions 40242136544](https://github.com/dsuyu1/softgloss/actions/runs/40242136544) passes both jobs for this combined revision, including 60 Node tests, all offline data/integrity checks and packaging, actual-click panel/library audio playback under normal autoplay policy, and existing frame, highlight, review, backup/restart and no-external-request regressions. Native-speaker review and real Windows/macOS/ChromeOS offline-voice checks remain open.


## 0.16.0 — daily review hardening
64 local Node tests and static/integrity checks pass. New tests cover complete schedule/history recovery, monotonic revisions after undo, rejection of outdated or repeated undo across tabs, undo invalidation after restore/remove/suspend/reset, and storage failure/retry without lost state. No scheduler defaults or backup schemas change.

Chromium adds real keyboard reveal/audio/rating/undo, exclusion of shortcuts while typing, focus checks after rating/undo, and a short synthetic future-due wake-up that must leave search focused. Layout checks use 360px width and a 640×360 CSS viewport corresponding to the available layout space of a 1280×720 viewport at 200% zoom; this is a reflow proxy, not verification of Chrome’s actual zoom controls or assistive technology. [Actions 40244266506](https://github.com/dsuyu1/softgloss/actions/runs/40244266506) passes both jobs, including keyboard/audio/undo/focus, idle due refresh and all earlier regressions. Desktop and narrow review screenshots were inspected. Scroll spacing keeps the focused review area below the sticky status message.


## 0.17.0 — library/reference adaptation
64 core tests and static checks pass locally. The visual scope is the library and review interface. The supplied screenshots show collection grids, compact navigation, centered prompt/revealed cards and clean form/list surfaces. The implementation reuses existing controls, storage and FSRS behavior with CSS tokens based on Malnaru's existing palette. No reference image is used as a product asset; system fonts and text branding remain local.

Chromium tests now navigate the explicit views while retaining prior keyboard/audio/undo, idle due refresh, Anki/backup, frame/highlight and restart coverage. New assertions cover one visible view, current navigation state, live collection counts, Back navigation and refresh/deep-link restoration. Desktop overview, all five mobile views, and front/revealed review screenshots are captured. CI run 40246344206 passed both check and browser jobs; screenshots were inspected for layout and clipping. The initial browser run exposed a test-only frame probe that dereferenced an omitted result from an inaccessible child frame; the probe now filters omitted results while retaining permitted-frame and denied-origin assertions. A final CSS adjustment keeps the mobile Start review label on one line. Actual browser zoom and assistive technology remain manual gates.


## 0.18.0 — semantic review ratings and lesson drafts
70 Node tests and static/integrity checks pass locally. New tests exercise versioned lesson validation, source/length/duplicate limits, fresh import identities, concurrent-save/delete rejection, failed-write recovery, collection capacity, unchanged review schedules, v3 backup restore with fresh editor revisions, legacy v1/v2 restore and full deletion.

Browser regressions now cover four distinct rating backgrounds with computed text contrast of at least 4.5:1, creating/editing/saving/reopening a bilingual draft, lesson file export/import, invalid import preserving data, deleting an imported copy, backup/clear/restore, restart persistence and mobile editor overflow. Local Chromium could not launch because the pinned browser executable is absent; no local browser assertions are claimed. Actions run 40260932204 passed both check and browser jobs. Desktop/mobile review and mobile lesson-editor screenshots were inspected: colors are distinct, text is readable, fields and actions fit without horizontal overflow. A final adjustment disables editor/import controls during pending saves/deletes to prevent edits being mistaken for saved content; desktop editor evidence is also captured. Supplied exported CSS/SVG sheets were inspected as reference material; no full sheet or embedded raster asset is shipped.

## 0.19.0 — practice and local recording
75 Node tests and static/integrity checks pass. Recorder tests use injected media objects to exercise late permission approval after cancellation, denied permission, track cleanup, blob revocation and delayed events after discard. Completion tests verify stale-revision rejection, backup preservation, exclusion from portable lesson files, reset on edit and isolation from review cards.

Chromium tests use test-only fake media-device/permission flags to record and play an actual MediaRecorder blob, reveal a bilingual prompt, complete the lesson, verify cleanup, and capture desktop/mobile practice. Actions 40262973595 passed check and browser jobs; desktop/mobile practice screenshots were inspected for legibility, control layout and overflow. Final polish spaces the word-audio action from Reveal and explicitly labels it as word audio. These automated flags do not validate Chrome's real microphone permission prompt or learner hardware. No new manifest permissions or network calls are added. API lifecycle references: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia and https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/stop .
