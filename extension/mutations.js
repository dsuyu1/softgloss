// Every learning-data write is serialized by the extension service worker.
(() => {
 const statuses = ['unknown', 'seen', 'known'];
 function createStore(storage) {
  let pending = Promise.resolve();
  function apply(message) {
   const job = pending.then(async () => {
    const state = await storage.get({words: {}, cards: [], preferences: {highlights: true}});
    switch (message.type) {
     case 'setWord':
      if (!/^[가-힣]{1,80}$/u.test(message.lemma) || !statuses.includes(message.status)) throw Error('Invalid vocabulary.');
      state.words[message.lemma] = message.status;
      await storage.set({words: state.words}); break;
     case 'saveCard': {
      const [card] = SG.validateBackup({version: 1, words: {}, cards: [message.card]}).cards;
      if (!card.sentence.trim() || card.sentence.length > 2000) throw Error('Select a sentence first (up to 2,000 characters).');
      if (!state.cards.some(c => c.lemma === card.lemma && c.sentence === card.sentence)) {
       if (state.cards.length >= 10000) throw Error('Library is full. Export and remove some sentences.');
       state.cards.push(card);
      }
      await storage.set({cards: state.cards}); break;
     }
     case 'deleteCard':
      state.cards = state.cards.filter(c => !(c.lemma === message.card?.lemma && c.sentence === message.card?.sentence && c.url === message.card?.url));
      await storage.set({cards: state.cards}); break;
     case 'restore': {
      const backup = SG.validateBackup(message.backup);
      await storage.set({words: backup.words, cards: backup.cards}); break;
     }
     case 'setHighlights':
      if (typeof message.enabled !== 'boolean') throw Error('Invalid preference.');
      await storage.set({preferences: {...state.preferences,highlights: message.enabled}}); break;
     case 'setStudyLevel':
      if(!Number.isInteger(message.level)||message.level<0||message.level>6)throw Error('Invalid study level.');
      await storage.set({preferences:{...state.preferences,studyLevel:message.level}});break;
     case 'importStudyList': {
      const studyLevels=SG.parseStudyCSV(message.csv);
      await storage.set({studyLevels,studySource:String(message.name||'Imported list').slice(0,120)});break;
     }
     case 'clearStudyList': await storage.set({studyLevels:{},studySource:''});break;
     case 'clearLearning': await storage.set({words: {}, cards: []}); break;
     default: throw Error('Unsupported operation.');
    }
    return {ok: true};
   });
   pending = job.catch(() => {});
   return job;
  }
  return {apply};
 }
 globalThis.SGStore = {createStore};
})();
