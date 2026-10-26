// Editable, local lesson workspace. No microphone or generation service is used.
(() => {
 const selected=new Set();let draft=null,expectedRevision=null,dirty=false,busy=false;
 const node=(tag,text,parent)=>{const n=document.createElement(tag);n.textContent=text;parent.append(n);return n;};
 function canReplace(){return !dirty||confirm('Discard unsaved lesson edits? Save or export the draft to keep them.');}
 function note(){ $('lesson-save-state').textContent=dirty?'Unsaved changes — save or export to keep them.':'Saved on this device.'; }
 function edit(d,revision){
  draft=structuredClone(d);expectedRevision=revision;dirty=revision===null;
  $('lesson-empty').hidden=true;$('lesson-form').hidden=false;$('lesson-title').value=draft.title;$('lesson-goal').value=draft.goal;
  $('lesson-delete').hidden=revision===null;$('lesson-items').replaceChildren();
  draft.items.forEach((item,index)=>{
   const field=node('fieldset','',$('lesson-items'));field.className='lesson-item';node('legend',item.card.lemma,field).lang='ko';node('p',item.card.meaning,field);
   for(const [key,label] of [['korean','Korean practice sentence'],['english','English translation']]){
    const id='lesson-'+key+'-'+index,l=node('label',label,field);l.htmlFor=id;
    const input=node('textarea','',field);input.id=id;input.maxLength=2000;input.rows=2;input.value=item[key];if(key==='korean')input.lang='ko';
   }
   if(item.card.source){const a=node('a','Word source · Wiktionary contributors · CC BY-SA 4.0',field);a.href=item.card.source;a.target='_blank';a.rel='noopener noreferrer';}
  });note();$('lesson-title').focus();
 }
 function readDraft(){return SGLessons.validate({...draft,title:$('lesson-title').value.trim(),goal:$('lesson-goal').value,items:draft.items.map((item,index)=>({...item,korean:$('lesson-korean-'+index).value,english:$('lesson-english-'+index).value}))});}
 function renderLessons(){
  if(!state)return;
  for(const id of selected)if(!Object.hasOwn(state.reviewCards,id))selected.delete(id);
  const query=$('lesson-filter').value.trim();const cards=Object.values(state.reviewCards).filter(c=>c.lemma.includes(query));
  const picker=$('lesson-picker');picker.replaceChildren();
  for(const c of cards.slice(0,100)){
   const label=node('label','',picker);label.className='lesson-word';const input=document.createElement('input');input.type='checkbox';input.value=c.id;input.checked=selected.has(c.id);input.setAttribute('aria-label','Select '+c.lemma);label.append(input);
   const text=node('span',c.lemma,label);text.lang='ko';node('small',c.meaning,text).lang='en';
   input.onchange=()=>{if(input.checked&&selected.size>=20){input.checked=false;$('message').textContent='Choose at most 20 words per lesson.';return;}if(input.checked)selected.add(c.id);else selected.delete(c.id);selectionNote();};
  }
  if(!cards.length)node('p',Object.keys(state.reviewCards).length?'No matching review words.':'Add words to reviews from Dictionary or the reading panel first.',picker);
  if(cards.length>100)node('p','Showing 100 words. Filter to find others.',picker);
  selectionNote();const list=$('lesson-list');list.replaceChildren();
  const drafts=Object.values(state.lessonDrafts);if(!drafts.length)node('p','No saved lesson drafts yet.',list);
  for(const d of drafts){const row=node('div','',list);row.className='lesson-draft-row';const open=node('button',d.title,row);open.type='button';open.onclick=()=>{if(!busy&&canReplace())edit(d,d.revision);};node('p',d.items.length+' practice words',row);}
 }
 function selectionNote(){$('lesson-selection').textContent=selected.size+' / 20 words selected';$('lesson-create').disabled=!selected.size||busy;}
 $('lesson-filter').oninput=renderLessons;
 $('lesson-create').onclick=()=>{
  if(busy||!canReplace())return;
  try{
   const cards=[...selected].map(id=>state.reviewCards[id]).filter(Boolean),next=SGLessons.fromCards(cards);
   for(const item of next.items){
    const entry=SG.lookup(item.card.lemma).find(e=>e.id===item.card.entryId),example=entry&&SG.examplesFor(entry)[0];
    const learning=globalThis.SG_LEARNING_EXAMPLES?.[item.card.lemma];
    // Never attach an unrelated translation to a saved page sentence.
    if(!item.korean&&example){item.korean=example.korean;item.english=example.english;}
    else if(!item.korean&&learning?.[2]===item.card.entryId){item.korean=learning[0];item.english=learning[1];}
   }
   edit(next,null);
  }catch(e){$('message').textContent=e.message;}
 };
 $('lesson-form').addEventListener('input',()=>{dirty=true;note();});
 $('lesson-form').onsubmit=async event=>{
  event.preventDefault();if(busy)return;busy=true;selectionNote();
  try{
   const next=readDraft();const result=await SGWrite({type:'saveLesson',draft:next,expectedRevision});
   draft=next;expectedRevision=result.revision;draft.revision=result.revision;dirty=false;note();$('lesson-delete').hidden=false;
   await render();$('message').textContent='Lesson saved on this device.';
  }catch(e){$('message').textContent='Could not save lesson: '+e.message;}
  finally{busy=false;selectionNote();}
 };
 $('lesson-export').onclick=()=>{try{download('malnaru-lesson.json',SGLessons.exportFile(readDraft()),'application/json');$('message').textContent='Lesson exported. Local edits still need saving on this device.';}catch(e){$('message').textContent=e.message;}};
 $('lesson-import').onchange=async event=>{
  try{
   const file=event.target.files[0];if(!file)return;if(file.size>500000)throw Error('Lesson files must be under 500 KB.');
   const imported=SGLessons.importFile(JSON.parse(await file.text()));if(canReplace()){edit(imported,null);$('message').textContent='Imported as a new draft. Check the text and save to keep it.';}
  }catch(e){$('message').textContent='Could not import lesson: '+e.message;}
  finally{event.target.value='';}
 };
 $('lesson-delete').onclick=async()=>{
  if(busy||!draft||expectedRevision===null||!confirm('Delete this saved lesson and its unsaved edits? Review cards stay in your deck.'))return;
  busy=true;
  try{await SGWrite({type:'deleteLesson',id:draft.id,expectedRevision});draft=null;dirty=false;expectedRevision=null;$('lesson-form').hidden=true;$('lesson-empty').hidden=false;await render();$('message').textContent='Lesson deleted.';}
  catch(e){$('message').textContent=e.message;}finally{busy=false;}
 };
 // Preserve visible edits across navigation/storage updates; warn before page loss.
 window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
 globalThis.resetLessonEditor=()=>{draft=null;expectedRevision=null;dirty=false;selected.clear();$('lesson-form').hidden=true;$('lesson-empty').hidden=false;renderLessons();};
 globalThis.renderLessons=renderLessons;if(state)renderLessons();
})();
