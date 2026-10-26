// Every learning-data write is serialized by the extension service worker.
(() => {
 const statuses = ['unknown', 'seen', 'known'];
 function createStore(storage) {
  let pending = Promise.resolve();
  function apply(message) {
   const job = pending.then(async () => {
    const state = await storage.get({words: {}, cards: [], preferences: {highlights: true}, reviewCards:{},reviewUndo:null});
    if(['saveLesson','deleteLesson'].includes(message.type))state.lessonDrafts=(await storage.get({lessonDrafts:{}})).lessonDrafts;
    switch (message.type) {
     case 'saveLesson': {
      const draft=SGLessons.validate(message.draft),existing=Object.hasOwn(state.lessonDrafts,draft.id)?state.lessonDrafts[draft.id]:null;
      if(existing?message.expectedRevision!==existing.revision:message.expectedRevision!==null)throw Error('This lesson changed or was deleted. Reopen it before saving.');
      if(!existing&&Object.keys(state.lessonDrafts).length>=50)throw Error('Lesson library is full (50 drafts). Export and remove a draft first.');
      state.lessonDrafts[draft.id]={...draft,revision:crypto.randomUUID()};await storage.set({lessonDrafts:state.lessonDrafts});return {ok:true,revision:state.lessonDrafts[draft.id].revision};
     }
     case 'deleteLesson': {
      const existing=Object.hasOwn(state.lessonDrafts,message.id)?state.lessonDrafts[message.id]:null;
      if(!existing||existing.revision!==message.expectedRevision)throw Error('This lesson changed. Reopen it before deleting.');
      delete state.lessonDrafts[message.id];await storage.set({lessonDrafts:state.lessonDrafts});break;
     }
     case 'addReview': {
      const card=SGSRS.create(message.card);
      if(!state.reviewCards[card.id]){
       if(Object.keys(state.reviewCards).length>=10000)throw Error('Review deck is full. Export and remove cards first.');
       state.reviewCards[card.id]=card;await storage.set({reviewCards:state.reviewCards});
      }
      break;
     }
     case 'rateReview': {
      const card=Object.hasOwn(state.reviewCards,message.id)?state.reviewCards[message.id]:null;if(!card)throw Error('Review card no longer exists.');
      state.reviewCards[message.id]=SGSRS.rate(card,message.rating,message.revision);
      await storage.set({reviewCards:state.reviewCards,reviewUndo:{id:card.id,revision:state.reviewCards[card.id].revision,before:card}});break;
     }
     case 'undoReview': {
      const undo=state.reviewUndo,card=undo&&Object.hasOwn(state.reviewCards,undo.id)?state.reviewCards[undo.id]:null;
      if(!undo||!card||message.id!==undo.id||message.revision!==undo.revision||card.revision!==undo.revision)throw Error('The last rating changed. Refresh the review queue.');
      state.reviewCards[undo.id]={...undo.before,revision:card.revision+1};
      await storage.set({reviewCards:state.reviewCards,reviewUndo:null});break;
     }
     case 'suspendReview': {
      const card=Object.hasOwn(state.reviewCards,message.id)?state.reviewCards[message.id]:null;if(!card||typeof message.suspended!=='boolean')throw Error('Invalid review card.');
      card.suspended=message.suspended;card.revision++;await storage.set({reviewCards:state.reviewCards,...(state.reviewUndo?.id===message.id?{reviewUndo:null}:{})});break;
     }
     case 'removeReview':
      delete state.reviewCards[message.id];await storage.set({reviewCards:state.reviewCards,...(state.reviewUndo?.id===message.id?{reviewUndo:null}:{})});break;
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
      await storage.set({words: backup.words, cards: backup.cards,reviewCards:backup.reviewCards||{},reviewUndo:null,lessonDrafts:Object.fromEntries(Object.entries(backup.lessonDrafts||{}).map(([id,d])=>[id,{...d,revision:crypto.randomUUID()}]))}); break;
     }
     case 'setHighlights':
      if (typeof message.enabled !== 'boolean') throw Error('Invalid preference.');
      await storage.set({preferences: {...state.preferences,highlights: message.enabled}}); break;
     case 'setUngradedHighlights':
      if(typeof message.enabled!=='boolean')throw Error('Invalid preference.');
      await storage.set({preferences:{...state.preferences,ungradedHighlights:message.enabled}});break;
     case 'setStudyLevel':
      if(!Number.isInteger(message.level)||message.level<0||message.level>6)throw Error('Invalid study level.');
      await storage.set({preferences:{...state.preferences,studyLevel:message.level}});break;
     case 'importStudyList': {
      const imported=SG.parseStudyCSV(message.csv);
      const {studyLevels:existing={}}=await storage.get({studyLevels:{}});const studyLevels={...existing};for(const [word,level] of Object.entries(imported))studyLevels[word]=Math.min(studyLevels[word]||7,level);
      await storage.set({studyLevels,studySource:String(message.name||'Imported list').slice(0,120)});break;
     }
     case 'clearStudyList': await storage.set({studyLevels:{},studySource:''});break;
     case 'clearLearning': await storage.set({words: {}, cards: [],reviewCards:{},reviewUndo:null,lessonDrafts:{}}); break;
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
