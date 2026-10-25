# SoftGloss
Free, offline Korean reading companion. **Offline dictionary alpha — broader coverage; Korean-language validation and learner testing still pending.** No AI, server, login, API key or runtime dependencies.

## Try it on websites
1. Download/extract the latest source, or update your checkout. Existing unpacked installs do not update themselves from GitHub.
2. Open `chrome://extensions`, click **Reload** on SoftGloss, and check that it shows version **0.9.0**. If starting fresh, enable Developer mode and Load unpacked → select `extension/`.
3. **Refresh the webpage** after reloading/updating the extension. A browser restart is not required.
4. Open a normal webpage containing Korean text. Pin SoftGloss from Chrome's Extensions menu, click its toolbar icon, then **Enable on this page**. The dictionary panel should appear.
5. Hover a Korean word or select **one Korean word**. Multiword sentence selection, images and video subtitles are not supported lookup surfaces yet.
6. For automatic lookup on websites, switch on **Automatically look up Korean on websites** in the toolbar panel and grant Chrome's website-access prompt. The small listener is installed on permitted HTTP/HTTPS pages, including new pages; the full dictionary waits for Korean interaction. Turn it off in the same panel to disable automatic lookup.
7. Alt+Shift+K opens keyboard lookup; My library manages saves, vocabulary, backups and Anki export.

**The local server is only for the included demo.** Other websites do not need it. To run the demo: `python3 -m http.server 8765 --bind 127.0.0.1`, then visit http://127.0.0.1:8765/demo.html and enable the page.

For Anki, import the TSV and map its four fields to Word, Meaning, Sentence, Source in your preferred note type. This is file export, not live Anki sync. A real Anki import is not yet verified.

Use a regular HTML page. Internal browser pages, Web Store pages and extension pages cannot be injected into. In manual mode, enable again after navigation. Automatic mode handles newly loaded permitted websites. For file:// pages Chrome requires Allow access to file URLs; using the localhost demo avoids that step.

## Development
Node 22+: `npm test` and `npm run check`. No npm install needed. See [project scope and live checklist](docs/PROJECT.md), [validation](docs/VALIDATION.md), [data sources](docs/DATA.md), and [privacy](PRIVACY.md).

## Project tracking
[Scope and checklist](docs/PROJECT.md) defines the release gates. [GitHub issues](https://github.com/dsuyu1/softgloss/issues) track browser verification, dictionary data, morphology and UX hardening. Changes go through pull requests with automated checks. Passing Actions runs produce an unpacked-extension ZIP for testing; this is not a Chrome Web Store release.

## Browser regression tests
CI installs test-only Playwright 1.56.1 and Chromium, then runs `node browser-tests/smoke.mjs`. These dependencies are not packaged in the extension. For local browser tests: `npm install --no-save --package-lock=false playwright@1.56.1`, `npx playwright install chromium`, then run the script. Manual hover, real keyboard shortcut delivery, 200% zoom and Anki import still need human verification.

The browser harness uses a temporary extension copy with localhost-only test permission; the packaged extension uses activeTab for manual mode and optional website access for automatic mode. Real toolbar permission grants still need manual verification. Run `node scripts/benchmark.mjs` for starter-pack lookup timing (not a browser performance benchmark).

## Dictionary coverage
29,777 imported Korean headwords, 40,510 senses and 72,869 listed conjugated spellings from English Wiktionary via Kaikki. The popup preserves alternative meanings and source labels, with explicitly supplied hanja spellings. Listed conjugations include irregulars; unsupported forms still return an empty result. See [data and licensing](docs/DATA.md) and [morphology limits](docs/MORPHOLOGY.md).

The adapted dictionary is CC BY-SA 4.0; credit and license are included in the extension and retained in dictionary-derived saved cards/exports. Rebuild offline using `python3 scripts/import-dictionary.py data/source-snapshot.parts.json`. A checksum mismatch fails instead of silently importing a changed source.

## Grammar hints and language review
Particle results can show expandable notes for topic/contrast, subject and object markers. These simplified notes have source links; independent Korean review is pending. See [accuracy-review workflow](docs/ACCURACY_REVIEW.md) for collecting and grading real reading samples offline.

## Expanded endings (0.9.0)
The pilot-driven update adds 188,285 source-listed spellings beyond the initial table pack, including noun-modifying forms, connectives, questions and nominalizations. Try `중단하는`, `드러내기`, `있는`, `다루면서` and `있는지`. `인기글` can show a possible `인기 + 글` breakdown; `반영된` can show `반영 + 되다`. Component definitions are not whole-word translations. Genuine headword gaps and context ambiguity remain; see [morphology limits](docs/MORPHOLOGY.md).

### Phrase breakdowns (0.9.0)
Select up to 8 Korean words, or type a short Korean phrase in the reading panel. Supported negation, ability/possibility and intention patterns get a construction hint above their dictionary components. Other phrases show individual entries and missing words, without claiming a whole-phrase translation. Each **Save sentence** button saves its word with the selected phrase or surrounding text.

The refreshed panel uses labeled colors: blue nouns, purple predicates, amber grammar and teal constructions. Page highlights track vocabulary separately: gray unknown, amber seen and green known. Reading settings holds the highlight toggle and page-disable control.

### TOPIK study mode (0.9.0)
Open **Reading settings**, import a graded CSV/TSV with columns `Korean,level`, then select Level 1–6. Words at that level and below receive strong blue highlights; their sentence context is softer blue, including sentences split across inline elements. Inflected forms use dictionary lemmas. Ungraded words stay unmarked in study mode. Turn the target off to return to vocabulary-status highlights. The highlight checkbox controls both modes.

No exam levels are guessed or bundled. Import your own graded list, or use the external study-list download linked in settings (follow its terms). Labels are the imported list’s study levels, not an official TOPIK vocabulary classification. Lists stay on the device and can be removed separately; learning backups currently cover vocabulary/cards, so keep your source CSV for reinstalling.
