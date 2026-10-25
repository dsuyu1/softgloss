# Morphology decision — 0.4.0

Use **dictionary-listed conjugations plus dictionary-backed particle candidates** for this increment. Import table rows with specific source-entry links; preserve multiple results instead of ranking one as certain. This expands irregular handling without implementing untested spelling-reversal rules.

This is a bounded lookup engine. It does not segment arbitrary sentences, resolve ambiguity from context, infer unsupported honorific stacks, or translate full sentences. Imported table labels are shown as source labels, not as a complete instructional grammar lesson. Independently reviewed grammar cards remain in scope.

## Alternatives and evidence
- Reverse-suffix rules: tiny footprint, but exceptions and homonymous stems can produce incorrect analyses. Keep only the original limited noun/pronoun particle candidates until a separately reviewed test corpus justifies expansion.
- [Kiwi upstream](https://github.com/bab2min/Kiwi): a full Korean morphological analyzer with Apache-2.0 code. No Kiwi code, model or browser build is bundled. Native quality, browser startup/memory, model rights and WASM integration were not benchmarked here; this is a candidate, not a rejected product.
- [MeCab-Ko builds](https://github.com/Pusnow/mecab-ko-msvc): native analyzer tooling. No executable or dictionary is imported. A browser/model/license audit is still needed before choosing it.

## Measurements and acceptance
`node scripts/benchmark.mjs` loads the shipped pack and measures warm lookup, separately from browser performance. A local run on Node v24.22.1, Linux x64, AMD EPYC 9V74 measured p95 0.0175 ms over 10,000 samples; full pack startup and DOM scans are excluded. Browser CI records user agent, runtime entry count and warm lookup p95, with a 100 ms regression ceiling. These do not establish long-page UI responsiveness on a learner's laptop.

Next evaluation: collect 100+ tokens/forms independently from actual reading; obtain Korean-language review of accepted analyses, report unknowns and false candidates separately, and compare listed lookup against a production parser in the same browser environment. Do not count source-derived regression fixtures as independent accuracy evidence.

## 0.7.0: pilot-driven coverage expansion

The first Naver screenshots exposed an import boundary: only indicative past/non-past rows had been retained. The supplemental pack includes source-listed interrogatives, connectives, nominalizations and noun-modifying forms. It adds 227,945 distinct listed spellings, of which 188,285 were absent from the original table pack, across 4,650 source entries. This is 255,759 entry/form-label relationships compacted into 638 reversible transformations (~1.44 MB packaged data).

Each transformation stores the exact source entry IDs allowed to use it. Runtime reverses a Hangul NFD suffix, locates the dictionary entry and checks that whitelist; it does not apply a spelling guess to every verb. Regular/irregular homonyms keep separate source entries. Sorted numeric whitelist arrays avoid materializing another 200,000+ full-form index. Regression checks exercise both ends of every transformation's whitelist. These are source-consistency checks, not independent Korean accuracy validation.

Two bounded composition candidates are added: -(으)면서 is backed by the entry's attested -(으)면 form; -는지 is backed by its attested present noun-modifying -는 form. Nominalizations may take one recognized particle. Sources for the additional grammatical interpretations: [-(으)면서](https://en.wiktionary.org/wiki/-%EC%9C%BC%EB%A9%B4%EC%84%9C), [-는](https://en.wiktionary.org/wiki/-%EB%8A%94), [-기](https://en.wiktionary.org/wiki/-%EA%B8%B0). These are possible analyses, not context resolution.

When a word has no direct or listed analysis, a bounded fallback can show a unique two-noun split such as 인기 + 글, or a dictionary noun plus a source-attested form of 하다/되다 such as 반영 + 되다. Results show component definitions with their own source links. They do not assert that concatenating the English meanings translates the whole expression. Vocabulary status and saving operate on each displayed component; compound coverage is not comprehension.

The root dictionary still lacks some full headwords: 청원인 remains unsupported in this increment. Wider headword coverage, better compound disambiguation, stacked endings and a production parser remain open.
