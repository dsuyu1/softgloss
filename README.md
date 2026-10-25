# Bungeoppang
Free, offline Korean reading companion. **Offline dictionary alpha — broader coverage; Korean-language validation and learner testing still pending.** No AI, server, login, API key or runtime dependencies.

## Try it on websites
1. Download/extract the latest source, or update your checkout. Existing unpacked installs do not update themselves from GitHub.
2. Open `chrome://extensions`, click **Reload** on Bungeoppang, and check that it shows version **0.12.0**. If starting fresh, enable Developer mode and Load unpacked → select `extension/`.
3. **Refresh the webpage** after reloading/updating the extension. A browser restart is not required.
4. Open a normal webpage containing Korean text. Pin Bungeoppang from Chrome's Extensions menu, click its toolbar icon, then **Enable on this page**. The dictionary panel should appear.
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

## Expanded endings (0.12.0)
The pilot-driven update adds 188,285 source-listed spellings beyond the initial table pack, including noun-modifying forms, connectives, questions and nominalizations. Try `중단하는`, `드러내기`, `있는`, `다루면서` and `있는지`. `인기글` can show a possible `인기 + 글` breakdown; `반영된` can show `반영 + 되다`. Component definitions are not whole-word translations. Genuine headword gaps and context ambiguity remain; see [morphology limits](docs/MORPHOLOGY.md).

### Phrase breakdowns (0.12.0)
Select up to 8 Korean words, or type a short Korean phrase in the reading panel. Supported negation, ability/possibility and intention patterns get a construction hint above their dictionary components. Other phrases show individual entries and missing words, without claiming a whole-phrase translation. Each **Save sentence** button saves its word with the selected phrase or surrounding text.

The refreshed panel uses labeled colors: blue nouns, purple predicates, amber grammar and teal constructions. Page highlights track vocabulary separately: gray unknown, amber seen and green known. Reading settings holds the highlight toggle and page-disable control.

### TOPIK preparation / official curriculum study mode (0.12.0)
Open **Reading settings** and choose a grade: the bundled official NIKL curriculum provides 9,719 normalized vocabulary lemmas and a catalog of 336 graded grammar entries. No import is required. Vocabulary is blue; possible supported grammar is amber; sentence context is softer blue. Select a grade to include it and all lower grades. Grammar recognition uses supported morphology and expression patterns, not every possible inflection of every catalog entry. Grades are NIKL curriculum grades, not an asserted exhaustive TOPIK exam syllabus.

Custom CSV/TSV lists (`Korean,level`, 1–6) add to the defaults and previous imports. Lower grades win on duplicate words. **Remove custom lists** leaves bundled data available. All scanning works offline. Keep custom CSVs: vocabulary/card backups still do not include them.

Default material: National Institute of Korean Language, 2017 International Standard Curriculum for Korean Language Education, grade appendix revised 2020-11-17. [Official source](https://www.korean.go.kr/front/reportData/reportDataView.do?mn_id=45&report_seq=932), KOGL Type 1; full attribution and transformation notes in packaged credits and `docs/CURRICULUM.md`.

### Bungeoppang reading update (0.12.0)
Bungeoppang (붕어빵), previously SoftGloss, preserves existing local vocabulary/settings and the repository/package identifiers. Each study grade has a separate labeled color; grammar uses an underline. Hovered link text has a nested-text fallback and normal navigation is preserved.

Use **Break down sentence** after looking up page text for possible word classes, particle functions and source-listed tense/form labels. This is an analysis aid with alternatives, not a guaranteed syntactic parse. Bounds: 2,000 characters / 80 Korean tokens.

Twenty headwords have original bilingual learning examples, labeled separately from dictionary quotations. Example coverage is limited and a sample may illustrate just one homonym sense.

### Version and expanded examples (0.12.0)
The panel header now shows its loaded version, and Reading settings shows all six grade-color swatches. If the screenshot still says SoftGloss or “Strong blue”, it is an older page/build. Update the unpacked extension files, reload it at chrome://extensions, check version 0.12.0, then reload the webpage. Activation detects already-running older panels and asks for a page reload.

The pinned dictionary now supplies 3,704 bilingual sentence pairs across 3,276 senses, reaching 2,814 of 33,796 dictionary entries (before original learning examples). Examples show their associated sense and source attribution. The corpus does not supply suitable bilingual examples for every entry; missing examples are labeled, not generated.
