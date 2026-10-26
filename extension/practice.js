// Practice completion is self-reported; it never rates review cards.
(() => {
 let lesson=null,index=0,revealed=false,finishing=false,session=0;
 const panel=$('lesson-practice'),layout=document.querySelector('.lesson-layout');
 const audio=$('practice-replay');
 const recorder=SGRecorder.create({onState:({phase,url})=>{
  audio.pause();audio.removeAttribute('src');audio.hidden=phase!=='ready';if(url)audio.src=url;
  $('practice-record').disabled=['requesting','recording','stopping'].includes(phase);
  $('practice-stop').disabled=!['requesting','recording'].includes(phase);
  $('practice-discard').disabled=phase==='idle';
  $('practice-record-status').textContent=({idle:'Recording is optional. Clips are temporary and stay on this device.',requesting:'Waiting for microphone permission… Cancel with Stop.',recording:'Recording… stops after 60 seconds.',stopping:'Preparing replay…',ready:'Ready to replay. Moving on discards this clip.',empty:'No usable audio. Try recording again.',denied:'Microphone access was denied. You can keep studying without recording.',unsupported:'Recording is unavailable in this browser. You can keep studying.',error:'Could not record. Check your microphone and try again.'})[phase];
 }});
 function resetAudio(){recorder.discard();audio.load();}
 function close(){session++;finishing=false;resetAudio();lesson=null;panel.hidden=true;layout.hidden=false;}
 function show(){
  resetAudio();revealed=false;const item=lesson.items[index];
  $('practice-title').textContent=lesson.title;$('practice-progress').textContent='Word '+(index+1)+' of '+lesson.items.length;
  $('practice-word').textContent=item.card.lemma;$('practice-sentence').textContent=item.korean.trim()||'No practice sentence yet. You can add one in the lesson editor.';
  $('practice-answer').hidden=true;$('practice-meaning').textContent=item.card.meaning;$('practice-translation').textContent=item.english.trim()||'No English translation saved.';
  $('practice-source').replaceChildren();if(item.card.source){const a=document.createElement('a');a.textContent='Dictionary source · Wiktionary contributors · CC BY-SA 4.0';a.href=item.card.source;a.target='_blank';a.rel='noopener noreferrer';$('practice-source').append(a);}
  const listen=$('practice-listen'),wordAudio=listenButton(item.card.lemma);wordAudio.textContent='Listen to word · synthetic';listen.replaceChildren(wordAudio);
  $('practice-reveal').hidden=false;$('practice-next').disabled=true;$('practice-next').textContent=index===lesson.items.length-1?'Complete lesson':'Next word';
  $('practice-done').hidden=true;$('practice-study').hidden=false;$('practice-word').focus();
 }
 globalThis.startLessonPractice=d=>{close();lesson=SGLessons.validate(d);layout.hidden=true;panel.hidden=false;show();panel.scrollIntoView({block:'start'});};
 globalThis.closeLessonPractice=close;
 $('practice-close').onclick=()=>{close();$('lessons-heading').focus();};
 $('practice-reveal').onclick=()=>{revealed=true;$('practice-answer').hidden=false;$('practice-reveal').hidden=true;$('practice-next').disabled=false;$('practice-next').focus();};
 $('practice-next').onclick=async()=>{
  if(!lesson||!revealed||finishing)return;
  if(index<lesson.items.length-1){index++;show();return;}
  const token=session;finishing=true;$('practice-next').disabled=true;resetAudio();
  try{await SGWrite({type:'completeLesson',id:lesson.id,expectedRevision:lesson.revision});if(token!==session)return;$('practice-study').hidden=true;$('practice-done').hidden=false;$('practice-done').focus();await render();}
  catch(e){if(token!==session)return;$('message').textContent='Could not complete lesson: '+e.message;$('practice-next').disabled=false;}
  finally{if(token===session)finishing=false;}
 };
 $('practice-record').onclick=()=>recorder.start();
 $('practice-stop').onclick=()=>{recorder.stop();};
 // Stop also cancels a pending permission request without reviving it later.
 $('practice-stop').addEventListener('click',()=>{if($('practice-record-status').textContent.startsWith('Waiting'))resetAudio();});
 $('practice-discard').onclick=resetAudio;
 window.addEventListener('hashchange',()=>{if(!location.hash.endsWith('lessons'))close();});
 window.addEventListener('pagehide',close);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)resetAudio();});
 const original=globalThis.startLessonPractice;globalThis.startLessonPractice=d=>{index=0;original(d);};
})();
