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
