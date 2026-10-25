# SoftGloss
Free, offline Korean reading companion. **Foundation alpha — small starter pack, not a full dictionary or a Kimchi Reader replacement yet.** No AI, server, login, API key or build dependencies.

## Try it
1. Extract the project ZIP.
2. Open `chrome://extensions`, enable Developer mode, choose Load unpacked and select `extension/`.
3. In this project directory, run `python3 -m http.server 8765 --bind 127.0.0.1`.
4. Visit http://127.0.0.1:8765/demo.html and click the SoftGloss toolbar icon.
5. Hover `먹었어요` or `학교에서`. Select a word as an alternative. Use the status buttons or Save sentence.
6. Click My library to export sentences for Anki, back up, restore or delete cards.

For Anki, import the TSV and map its four fields to Word, Meaning, Sentence, Source in your preferred note type. This is file export, not live Anki sync. A real Anki import is not yet verified.

Use a regular HTML page. Internal browser pages, Web Store pages and extension pages cannot be injected into. Navigating reloads the page; enable again. For file:// pages Chrome requires Allow access to file URLs; using the localhost demo avoids that step.

## Development
Node 22+: `npm test` and `npm run check`. No npm install needed. See [project scope and live checklist](docs/PROJECT.md), [validation](docs/VALIDATION.md), [data sources](docs/DATA.md), and [privacy](PRIVACY.md).

## Project tracking
[Scope and checklist](docs/PROJECT.md) defines the release gates. [GitHub issues](https://github.com/dsuyu1/softgloss/issues) track browser verification, dictionary data, morphology and UX hardening. Changes go through pull requests with automated checks. Passing Actions runs produce an unpacked-extension ZIP for testing; this is not a Chrome Web Store release.
