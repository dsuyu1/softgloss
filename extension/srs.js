// Offline FSRS adapter. Persist plain JSON; the worker owns all schedule changes.
(() => {
 const scheduler=FSRS.fsrs({request_retention:0.9,maximum_interval:36500,enable_fuzz:false,enable_short_term:true,learning_steps:['1m','10m'],relearning_steps:['10m']});
 const text=(v,n)=>typeof v==='string'&&v.length<=n;
 const iso=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
 const plain=value=>JSON.parse(JSON.stringify(value));
 function validateCard(c){
  if(!c||!text(c.id,200)||!/^(?:wikt:en-|softgloss:)/u.test(c.id)||!text(c.entryId,200)||c.entryId!==c.id||!text(c.lemma,80)||!(/^[가-힣]+$/u.test(c.lemma))||!text(c.meaning,5000)||!c.meaning.trim()||!text(c.sentence,2000)||!text(c.url,5000))throw Error('Invalid review card.');
  if(c.url&&!/^https?:\/\//.test(c.url))throw Error('Invalid review page URL.');
  if(c.source!==undefined&&(!text(c.source,1000)||!/^https:\/\/en\.wiktionary\.org\/wiki\//.test(c.source)||c.license!=='CC-BY-SA-4.0'))throw Error('Invalid review attribution.');
  return Object.fromEntries(['id','entryId','lemma','meaning','sentence','url','source','license'].filter(k=>c[k]!==undefined).map(k=>[k,c[k]]));
 }
 function validateDeck(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>10000)throw Error('Invalid review deck.');
  const deck={};
  for(const [id,r] of Object.entries(value)){
   const card=validateCard(r);if(id!==card.id||!Number.isSafeInteger(r.revision)||r.revision<0||typeof r.suspended!=='boolean'||!Array.isArray(r.history)||r.history.length>1000)throw Error('Invalid review history.');
   const s=r.schedule;
   if(!s||!iso(s.due)||(s.last_review!==undefined&&!iso(s.last_review))||![0,1,2,3].includes(s.state))throw Error('Invalid review schedule.');
   for(const k of ['stability','difficulty','elapsed_days','scheduled_days','learning_steps','reps','lapses'])if(!Number.isFinite(s[k])||s[k]<0||s[k]>1e9)throw Error('Invalid review schedule.');
   for(const k of ['learning_steps','reps','lapses'])if(!Number.isSafeInteger(s[k]))throw Error('Invalid review schedule.');
   if(s.difficulty>10||s.stability>36500||(s.state!==0&&!s.last_review)||(s.state===0&&s.reps!==0))throw Error('Invalid review schedule.');
   const history=r.history.map(h=>{if(!h||!iso(h.at)||![1,2,3,4].includes(h.rating))throw Error('Invalid review history.');return {at:h.at,rating:h.rating};});
   const schedule=Object.fromEntries(['due','last_review','state','stability','difficulty','elapsed_days','scheduled_days','learning_steps','reps','lapses'].filter(k=>s[k]!==undefined).map(k=>[k,s[k]]));
   deck[id]={...card,revision:r.revision,suspended:r.suspended,schedule,history};
  }
  return deck;
 }
 function create(card,now=new Date()) {return {...validateCard(card),schedule:plain(FSRS.createEmptyCard(now)),revision:0,suspended:false,history:[]};}
 function preview(card,now=new Date()){return scheduler.repeat(card.schedule,now);}
 function rate(card,rating,revision,now=new Date()){
  if(card.revision!==revision)throw Error('This card changed in another tab. Refresh the review queue.');
  if(![1,2,3,4].includes(rating))throw Error('Invalid review rating.');
  if(card.suspended||Date.parse(card.schedule.due)>now.getTime())throw Error('This card is not due yet.');
  if(card.schedule.last_review&&Date.parse(card.schedule.last_review)>now.getTime())throw Error('Check your device clock before reviewing.');
  const next=preview(card,now)[rating];
  return {...card,schedule:plain(next.card),revision:card.revision+1,history:[...card.history,{at:now.toISOString(),rating}].slice(-1000)};
 }
 function due(deck,now=Date.now()){return Object.values(deck).filter(c=>!c.suspended&&Date.parse(c.schedule.due)<=now).sort((a,b)=>(a.schedule.state===0)-(b.schedule.state===0)||Date.parse(a.schedule.due)-Date.parse(b.schedule.due)||a.id.localeCompare(b.id));}
 function interval(date,now=Date.now()){const minutes=Math.max(1,Math.round((new Date(date).getTime()-now)/60000));return minutes<60?minutes+' min':minutes<1440?Math.round(minutes/60)+' hr':Math.round(minutes/1440)+' days';}
 globalThis.SGSRS={create,preview,rate,due,interval,validateCard,validateDeck};
})();
