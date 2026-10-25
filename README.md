# SoftGloss
Free, offline Korean reading companion. **Offline dictionary alpha — broader coverage; Korean-language validation and learner testing still pending.** No AI, server, login, API key or runtime dependencies.

## Try it
1. Extract the project ZIP.
2. Open `chrome://extensions`, enable Developer mode, choose Load unpacked and select `extension/`.
3. In this project directory, run `python3 -m http.server 8765 --bind 127.0.0.1`.
4. Visit http://127.0.0.1:8765/demo.html and click the SoftGloss toolbar icon.
5. Hover `먹었어요` or `학교에서`. Select a word as an alternative. Use the status buttons or Save sentence.
6. Press Alt+Shift+K for keyboard lookup, or search Korean/English directly in the panel or My library. Configure the shortcut at `chrome://extensions/shortcuts`.
7. Use My library to filter vocabulary, export sentences for Anki, back up, restore, or delete learning data.
8. Turn highlighting off without disabling lookup, or choose Disable on this page. The toolbar re-enables it. Dynamic page text refreshes automatically within the documented scan limits.

For Anki, import the TSV and map its four fields to Word, Meaning, Sentence, Source in your preferred note type. This is file export, not live Anki sync. A real Anki import is not yet verified.

Use a regular HTML page. Internal browser pages, Web Store pages and extension pages cannot be injected into. Navigating reloads the page; enable again. For file:// pages Chrome requires Allow access to file URLs; using the localhost demo avoids that step.

## Development
Node 22+: `npm test` and `npm run check`. No npm install needed. See [project scope and live checklist](docs/PROJECT.md), [validation](docs/VALIDATION.md), [data sources](docs/DATA.md), and [privacy](PRIVACY.md).

## Project tracking
[Scope and checklist](docs/PROJECT.md) defines the release gates. [GitHub issues](https://github.com/dsuyu1/softgloss/issues) track browser verification, dictionary data, morphology and UX hardening. Changes go through pull requests with automated checks. Passing Actions runs produce an unpacked-extension ZIP for testing; this is not a Chrome Web Store release.

## Browser regression tests
CI installs test-only Playwright 1.56.1 and Chromium, then runs `node browser-tests/smoke.mjs`. These dependencies are not packaged in the extension. For local browser tests: `npm install --no-save --package-lock=false playwright@1.56.1`, `npx playwright install chromium`, then run the script. Manual hover, real keyboard shortcut delivery, 200% zoom and Anki import still need human verification.

The browser harness uses a temporary extension copy with localhost-only test permission; the packaged extension retains activeTab-only access. Real toolbar permission grants still need manual verification. Run `node scripts/benchmark.mjs` for starter-pack lookup timing (not a browser performance benchmark).

## Dictionary coverage
29,777 imported Korean headwords, 40,510 senses and 72,869 listed conjugated spellings from English Wiktionary via Kaikki. The popup preserves alternative meanings and source labels, with explicitly supplied hanja spellings. Listed conjugations include irregulars; unsupported forms still return an empty result. See [data and licensing](docs/DATA.md) and [morphology limits](docs/MORPHOLOGY.md).

The adapted dictionary is CC BY-SA 4.0; credit and license are included in the extension and retained in dictionary-derived saved cards/exports. Rebuild offline using `python3 scripts/import-dictionary.py data/source-snapshot.jsonl.gz`. A checksum mismatch fails instead of silently importing a changed source.
