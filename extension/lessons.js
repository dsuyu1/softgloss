// Local lesson interchange. Drafts never change review schedules.
(() => {
 const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(v);
 const text=(v,max,required=false)=>typeof v==='string'&&v.length<=max&&(!required||!!v.trim());
 function validate(d){
  if(!d||!uuid(d.id)||!uuid(d.revision)||!text(d.title,120,true)||!text(d.goal,1000)||!Array.isArray(d.items)||!d.items.length||d.items.length>20)throw Error('Invalid lesson: use a title and 1–20 words.');
  const seen=new Set();const items=d.items.map(i=>{
   if(!i||!text(i.korean,2000)||!text(i.english,2000))throw Error('Invalid lesson practice text.');
   const card=SGSRS.validateCard(i.card);if(seen.has(card.id))throw Error('Duplicate lesson word.');seen.add(card.id);
   return {card,korean:i.korean,english:i.english};
  });
  if(d.completedAt!==undefined&&(typeof d.completedAt!=='string'||!Number.isFinite(Date.parse(d.completedAt))||new Date(d.completedAt).toISOString()!==d.completedAt))throw Error('Invalid completion date.');
  return {id:d.id,revision:d.revision,title:d.title,goal:d.goal,items,...(d.completedAt?{completedAt:d.completedAt}:{})};
 }
 function validateCollection(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>50)throw Error('Invalid lesson collection (maximum 50 drafts).');
  const drafts={};for(const [id,d] of Object.entries(value)){const draft=validate(d);if(id!==draft.id)throw Error('Invalid lesson ID.');drafts[id]=draft;}return drafts;
 }
 function fromCards(cards,title='My practice lesson'){
  return validate({id:crypto.randomUUID(),revision:crypto.randomUUID(),title,goal:'',items:cards.map(c=>({card:SGSRS.validateCard(c),korean:c.sentence||'',english:''}))});
 }
 function exportFile(draft){const content=validate(draft);delete content.completedAt;return JSON.stringify({format:'malnaru-lesson',version:1,draft:content},null,2);}
 function importFile(value){
  if(!value||value.format!=='malnaru-lesson'||value.version!==1)throw Error('Unsupported lesson file.');
  const draft=validate(value.draft);delete draft.completedAt;return {...draft,id:crypto.randomUUID(),revision:crypto.randomUUID()};
 }
 globalThis.SGLessons={validate,validateCollection,fromCards,exportFile,importFile};
})();
