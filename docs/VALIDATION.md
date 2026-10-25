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
