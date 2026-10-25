# Offline dictionary sources and reproducible import

## Selected source — 0.4.0
The bundled Korean–English pack adapts **English Wiktionary**, extracted by **Tatu Ylonen and Wiktextract contributors at Kaikki.org**. The exact download, dump/extraction dates, source hash, snapshot hash and transformation notice are pinned in [data/source-lock.json](../data/source-lock.json). The adapted data is distributed under **CC BY-SA 4.0**.

Upstream policies checked on October 24, 2026:
- [Kaikki Korean download and extraction metadata](https://kaikki.org/dictionary/Korean/index.html).
- [Kaikki data licensing](https://kaikki.org/dictionary/index.html#copyright-and-license) and [Wiktionary copyrights](https://en.wiktionary.org/wiki/Wiktionary:Copyrights).
- [Wikimedia Terms of Use, section 7](https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use#7._Licensing_of_Content): reusers can choose CC BY-SA; page URLs provide attribution through their contributor histories.
- [CC BY-SA 4.0 legal text](https://creativecommons.org/licenses/by-sa/4.0/legalcode.txt), also shipped in `extension/licenses/CC-BY-SA-4.0.txt`.

Redistribution, adaptation and commercial use are permitted under those terms. Keep contributor/source credit, the license and modification notice, and distribute adapted dictionary data under the same license. The packaged credits page and per-entry Wiktionary URLs provide that information. Saved dictionary definitions retain source/license in JSON and Anki TSV. The original program's code license remains undecided; the dictionary grant does not license the program.

No examples, quotations, audio, images or other media are imported. These can have separate rights. The source is the downloadable postprocessed Korean extract, whose upstream endpoint is marked deprecated; future upstream migrations require a new review. Its origin is not represented as a raw English-Wiktionary dump.

## Coverage and exact changes
The imported pack has **33,784 source entries, 29,777 distinct Hangul headwords, 40,510 senses and 72,869 distinct conjugated spellings** (78,857 entry/form links). In 0.9.0 there are eleven original fallback entries, for 33,795 runtime entries. These are coverage counts, not verified accuracy or word-frequency rankings.

The importer selects modern Hangul spellings and ten supported parts of speech, retains English glosses, source sense IDs and usage labels, and excludes empty/cross-reference-only senses. It retains explicitly labeled hanja spellings, not inferred hanja origins. Multiple source entries and senses stay separate. A form links to its specific source entry, so regular and irregular homonyms do not borrow each other's conjugations.

Only listed indicative past/non-past forms with supported style/politeness labels are included. Other constructions can be unsupported. The dictionary does not determine which meaning or sentence force is intended. Initial original glosses remain only when the imported pack lacks the headword. Vocabulary states stay keyed by lemma to preserve existing user data; sense-specific learning is future work.

## Rebuild without network access
Run from the repository root:

```sh
python3 scripts/import-dictionary.py data/source-snapshot.parts.json
npm test
npm run check
```

The 1.8 MB compressed source snapshot retains only the selected fields and is licensed as adapted dictionary data under CC BY-SA 4.0. It is split into small binary chunks for reliable transfer; each chunk and the combined compressed-file hash are checked before reading. The importer deterministically regenerates 34 packaged JavaScript shards and a manifest containing hashes and counts. CI rebuilds and rejects a diff. Nothing is downloaded at extension runtime.

To audit the original input, download the URL in `source-lock.json` and verify its SHA-256 before rebuilding. That endpoint changes over time: the checked-in snapshot ensures offline reproduction even after the original endpoint changes. To update, review the new snapshot and rights first, deliberately update the source lock, rebuild, compare changes and run all checks. Never silently accept a checksum mismatch.

## Other candidates reviewed
| Source | Upstream terms / finding | Decision |
|---|---|---|
| [NIKL Korean Basic Dictionary](https://krdict.korean.go.kr/kor/kboardPolicy/copyRightTermsInfo) | Default text policy is CC BY-SA 2.0 Korea; attribution/share-alike; multimedia has individual terms. | No NIKL data or media bundled; separately scope authenticated API/export and field review. |
| [Kengdic](https://github.com/garfieldnate/kengdic#license) | Upstream offers MPL 2.0 or LGPL 2.0-or-later and warns that data needs cleaning. | Not imported; avoid a second dataset with different obligations and missing morphology metadata. |

## Language validation still required
The regression suite checks dictionary integrity, 20 familiar conjugations, ambiguity and source-to-form associations. It is not the independently reviewed 100-token accuracy evaluation or learner pilot required by the beta scope. Upstream/extraction mistakes, incomplete senses and unsupported endings remain possible.

## Supplemental conjugation tables (0.7.0)
`scripts/import-morphology.py` selects additional conjugation rows from the **same original input hash** recorded above. It excludes metadata and error-tagged rows, preserves source entry IDs and source tags, then losslessly groups shared Hangul NFD stem-to-surface transformations with entry whitelists. This is another adaptation of the same CC BY-SA 4.0 text/table data, covered by the packaged credits and per-entry URLs. No new media, examples or dictionary provider is imported.

The selected relation snapshot is `data/morphology-source.json.gz`; its checksum is in `data/morphology-lock.json`. Rebuild with `python3 scripts/import-morphology.py data/morphology-source.json.gz`. File hashes and coverage counts are in `data/morphology-manifest.json`. CI rebuilds both packs without network access. The additional form count is 188,285 over the original **source-listed** spellings; headword count remains unchanged.

## 0.8.0 pilot fallback entries
Added short original glosses for 명품 (luxury goods / outstanding product), 성역 (sacred ground / protected subject) and 끌어모으다 (gather / attract), plus two explicitly listed purpose forms of 끌어모으다. These are deliberately limited editorial fallbacks, labeled as original starter glosses in the panel; they are not attributed to the Wiktionary pack or advertised as exhaustive entries. The import remains byte-identical. [Collins publisher entry](https://www.collinsdictionary.com/ko/dictionary/korean-english/끌어-모으다) and [NIKL language-service usage](https://x.com/urimal365/status/370786640983117824) were consulted for 끌어모으다; gloss text is original. All three remain subject to independent review.
