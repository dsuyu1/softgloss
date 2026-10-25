// Data adaptation: CC BY-SA 4.0, English Wiktionary and Kaikki contributors.
(() => {
 const starter = globalThis.SG_DATA;
 const rows = globalThis.SG_PACK_ROWS || [];
 const entries = rows.map(([id, lemma, pos, senses, forms, hanja]) => ({
  id, lemma, pos, senses: senses.map(([id, glosses, tags]) => ({id, glosses, tags})),
  meaning: senses[0][1].join('; '), listedForms: forms, hanja,
  source: 'https://en.wiktionary.org/wiki/' + encodeURIComponent(lemma) + '#Korean',
  license: 'CC-BY-SA-4.0'
 }));
 const imported = new Set(entries.map(e => e.lemma));
 // Retain original fallback entries only when the licensed pack lacks the lemma.
 for (const entry of starter.entries) if (!imported.has(entry.lemma)) entries.push({...entry, id: 'softgloss:' + entry.lemma});
 globalThis.SG_DATA = {entries, forms: starter.forms, loaded: true};
 delete globalThis.SG_PACK_ROWS;
})();
