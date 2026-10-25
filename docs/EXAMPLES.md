# Bilingual dictionary examples (0.12.0)

Source: the exact Korean Wiktionary/Kaikki JSONL pinned in data/source-lock.json (same source SHA). Imported as CC BY-SA 4.0 adapted dictionary content, with entry URLs crediting contributor histories. Selected fields are sense ID, Korean example text and English translation. Include only type=example, no ref, nonempty bilingual text, Korean sentence-terminal punctuation, Korean <=500 and English <=600 characters, and at most two distinct pairs per sense. Quotations and non-sentence fragments are omitted. Independent translation/language review is pending.

Coverage: 3,704 pairs across 3,276 retained senses, reaching 2,814 of 33,796 runtime entries. Remaining entries do not get invented examples. Existing 20 original learning examples remain separate and tied to their specific entry IDs.

Rebuild offline: python3 scripts/import-examples.py. Selected-field snapshot hash and original source hash are pinned in data/examples-lock.json; generated shard hashes are checked. Initial selection intersected source sense IDs with the runtime dictionary and omitted other languages/non-imported entries. The snapshot retains those exact selected pairs for reproducibility.

The screenshot showed the SoftGloss header and older single-blue legend, confirming an older panel/build. New headers show the loaded extension version; activation rejects older existing panels with reload guidance. All six grade swatches are visible even if a page happens to contain words from only one grade.
