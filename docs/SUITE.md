# Malnaru connected learning — proposed scope

Status: product proposal, not shipped functionality or a committed price. Malnaru Read remains the local-first reader. A connected practice app (working name: Malnaru Speak) turns explicitly selected vocabulary and sentences into speaking practice and editable lessons.

## First useful loop
1. Select cards, sentences, or a deck in Read; optionally add a topic, interest and target curriculum level.
2. Preview the material that will be sent to the lesson service and explicitly generate a lesson.
3. Review/edit a structured lesson: Korean and English examples, target vocabulary/grammar, listen-and-repeat prompts, a short guided dialogue and a comprehension check.
4. Speak Along: listen, read the sentence, record a turn, replay and inspect a transcript. Offer typed responses and microphone-free study. Label transcript comparisons accurately; speech recognition confidence alone is not pronunciation assessment.
5. Complete a bounded, turn-based guided conversation. Show corrections and an end-of-lesson recap, with learner approval before adding new reader cards.
6. Sync approved lesson material and completion events back to Read. Speaking completion does not silently grade FSRS cards or change their schedules.

Start with short recorded turns; simultaneous shadowing and full-duplex live conversation are later work. Korean linguistic review and measured speech-feedback quality are launch gates.

## Lesson generation service
Use a versioned backend lesson-generation instruction package (a skill) plus structured output validation. Inputs include selected stable card IDs, learner goals, optional interests and an allowed curriculum range. Treat imported page text as untrusted lesson material. Validate schema, required bilingual fields, referenced vocabulary, duration limits and storage bounds. Record model/instruction versions and distinguish generated content from dictionary examples. Generated content needs a correction/report flow and learner-editable drafts; it is not automatically authoritative.

## Sync and account boundary
Reader dictionaries, highlights, local vocabulary/reviews and export continue to work without an account. Connected lessons require opt-in accounts and selected-content upload. Do not upload browsing history or full pages by default. Shared records need stable IDs, schema versions, revision checks, deletion tombstones and idempotent events. Keep review scheduling single-writer until a tested multi-device conflict policy exists. Surface pending/conflicted changes. Provide export and deletion; define recording retention before accepting microphone data.

## Suggestions before an algorithm
Begin with transparent, selectable suggestions: recently saved words, difficult review cards, chosen interests, and a target level. Show why each suggestion appears and let learners change it. Rank with simple inspectable rules first. Measure lesson starts/completions, accepted corrections and voluntary return; optimize learning usefulness rather than browsing or microphone engagement. Add learned personalization only with sufficient evidence and an explicit data policy.

## Premium hypothesis
Free reader: offline lookup/highlights, official curriculum lists, saved vocabulary/sentences, local spaced repetition and backup/Anki export.

Paid connected app: generated lesson packs, guided conversation, speech processing and cross-device lesson sync. Potential Reader Plus features: advanced study reports, richer lesson integration and shared study collections. Validate demand before committing these to a paywall; preserve existing local learning data and export.

Proposed trial: seven days with a clearly stated included lesson allowance and speaking-minute allowance; the trial ends when time or either allowance is exhausted. No automatic paid overage. After the trial, a subscription includes a fixed allowance; optional top-ups require an explicit purchase. Show estimated use before generation and a remaining-allowance meter. Use plain lesson/minute units in the UI and track provider costs internally. Failed jobs release reserved allowance; retries are idempotent and cannot double-charge. Final allowance, price, conversion policy and gross-margin targets remain undecided until real session costs and pilot demand are measured.

## Delivery order
- Resolve existing Reader beta gates (independent Korean coverage, native content/audio review and learner pilots).
- Build a local lesson draft/schema and export/import bridge using selected cards; no billing or microphone required.
- Prototype the account/sync contract and turn-based speaking flow, then test Korean feedback quality.
- Add backend generation, server-enforced quotas, reservation/refund accounting and an auditable usage ledger.
- Pilot the paid connected app with bounded trial allowances; test payment/webhook failure handling before launch.
- Add interest ranking, live conversation and further Reader premium features after pilot evidence.

External reference: audio provider charges vary by model and modality; consult current pricing during cost experiments: https://developers.openai.com/api/docs/pricing . No API provider, infrastructure purchase, subscription price or payment provider is selected by this proposal.
