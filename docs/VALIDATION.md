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
