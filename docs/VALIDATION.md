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
9. Restart browser and inspect persistence. Use a second tab to identify potential write races (known alpha limitation).
10. Check DevTools network: no extension-origin outgoing requests during lookup/save/export.
11. Test narrow viewport, 200% zoom, long page and restricted-page error badge.

Browser findings must be recorded here before checking the corresponding PROJECT.md gates.
