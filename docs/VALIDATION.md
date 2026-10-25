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
