# Independent Korean accuracy review

The beta gate still needs 100+ independently collected tokens/forms and Korean-language review. The three example inputs are synthetic plumbing examples; they do not satisfy that gate.

1. Collect at least 100 tokens from real reading, with sentence context and a source URL or reference. Obtain permission for any source material that is not redistributable; keep private material out of the public repository. Use the shape in `evaluation/example-cases.json`: unique `id`, `surface`, `context`, `source`.
2. Prepare an analysis snapshot:

```sh
node scripts/review.mjs prepare evaluation/example-cases.json /tmp/softgloss-review.json
```

3. A Korean-language reviewer inspects **every candidate**, including its meaning and grammatical parts in context. Fill in `reviewer`, mark each judgment `correct` or `incorrect`, and set `independent: true` only for genuinely independent reading material. If there are no candidates, set `unknownReviewed: true` after checking the unsupported token. Preserve entry IDs and parts; do not delete inconvenient candidates.
4. Grade the sheet:

```sh
node scripts/review.mjs grade /tmp/softgloss-review.json
```

The report separates unknown cases, pending cases, fully correct supported cases and incorrect candidates. Unknowns never count as correct supported analyses. Candidate precision counts each reviewed candidate; supported-case accuracy requires all returned candidates to be correct. Scores use only completed reviews, and the independent completion flag requires all 100+ cases to be declared independently reviewed. The accuracy-target flag additionally requires at least one reviewed supported case and >=95% correct supported cases. Always inspect unknown rate separately.

Reviewer identities and independence are declarations, not automated verification. A maintainer must check the underlying source/reviewer evidence and sample diversity before accepting a beta gate. Model-authored judgments or dictionary-derived examples cannot substitute for independent review.

Sheets include a fingerprint of the exact analyses. A changed dictionary or engine invalidates stale results and requires a fresh sheet. Output uses exclusive creation to avoid overwriting an existing review. Reports are local; the tool sends nothing over the network. Use a durable private location for actual review sheets.

## Grammar notes
`extension/grammar.js` contains three source-checked, simplified particle notes: topic/contrast, subject and object. They have progressive disclosure in the overlay and source links under CC BY-SA 4.0. These notes are **not independently language-reviewed yet**. The reviewed-grammar release gate remains open. Examples were newly written for SoftGloss; no upstream quotations or media are copied.

## Standard-form particle checks
The lookup engine now checks consonant/vowel variants for 은/는, 이/가, 을/를, 과/와 and 로/으로 (including ㄹ + 로). This is a standard-form candidate filter, not a proof of grammaticality in context or coverage of dialectal/colloquial forms. Exact dictionary entries are still returned even if a particle candidate is rejected.
