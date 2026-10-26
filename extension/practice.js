// Practice completion is self-reported; it never rates review cards.
(() => {
 let lesson=null,index=0,revealed=false,finishing=false,session=0,recordedBlob=null,playController=null,gradeController=null,listening=false;
 const panel=$('lesson-practice'),layout=document.querySelector('.lesson-layout');
 const audio=$('practice-replay');
 const recorder=SGRecorder.create({onState:({phase,url,blob})=>{if(phase==='idle'){gradeController?.abort();$('practice-grade-result').textContent='';$('practice-cloud-consent').checked=false;}recordedBlob=blob;if(lesson)$('practice-next').textContent=phase==='ready'?'Done':index===lesson.items.length-1?'Done without recording':'Done · next sentence';$('practice-grade').disabled=phase!=='ready';
  audio.pause();audio.removeAttribute('src');audio.hidden=phase!=='ready';if(url)audio.src=url;
  $('practice-record').disabled=listening||!lesson?.items[index]?.korean.trim()||['requesting','recording','stopping'].includes(phase);
  $('practice-stop').disabled=!['requesting','recording'].includes(phase);
  $('practice-discard').disabled=phase==='idle';
  $('practice-record-status').textContent=({idle:'Recording is optional. Clips stay here unless you choose cloud grading.',requesting:'Waiting for microphone permission… Cancel with Stop.',recording:'Recording… stops after 60 seconds.',stopping:'Preparing replay…',ready:'Ready to replay. Moving on discards this clip.',empty:'No usable audio. Try recording again.',denied:'Microphone access was denied. You can keep studying without recording.',unsupported:'Recording is unavailable in this browser. You can keep studying.',error:'Could not record. Check your microphone and try again.'})[phase];
 }});
 function stopModel(){playController?.abort();playController=null;speechSynthesis.cancel();$('practice-model').pause();$('practice-model').removeAttribute('src');$('practice-model').load();listening=false;}
 function resetAudio(){gradeController?.abort();$('practice-grade-result').textContent='';$('practice-cloud-consent').checked=false;recorder.discard();audio.load();}
 function close(){stopModel();session++;finishing=false;resetAudio();lesson=null;panel.hidden=true;layout.hidden=false;}
 function show(){
  resetAudio();revealed=false;const item=lesson.items[index];
  $('practice-title').textContent=lesson.title;$('practice-progress').textContent='Word '+(index+1)+' of '+lesson.items.length;
  $('practice-word').textContent=item.card.lemma;$('practice-sentence').textContent=item.korean.trim()||'No practice sentence yet. You can add one in the lesson editor.';
  $('practice-answer').hidden=true;$('practice-meaning').textContent=item.card.meaning;$('practice-translation').textContent=item.english.trim()||'No English translation saved.';
  $('practice-source').replaceChildren();if(item.card.source){const a=document.createElement('a');a.textContent='Dictionary source · Wiktionary contributors · CC BY-SA 4.0';a.href=item.card.source;a.target='_blank';a.rel='noopener noreferrer';$('practice-source').append(a);}

  $('practice-reveal').hidden=false;$('practice-next').disabled=true;$('practice-next').textContent=index===lesson.items.length-1?'Done without recording':'Done · next sentence';
  $('practice-done').hidden=true;$('practice-study').hidden=false;$('practice-word').focus();playSentence();
 }
 globalThis.startLessonPractice=d=>{close();lesson=SGLessons.validate(d);layout.hidden=true;panel.hidden=false;show();panel.scrollIntoView({block:'start'});};
 globalThis.closeLessonPractice=close;
 $('practice-close').onclick=()=>{close();$('lessons-heading').focus();};
 $('practice-reveal').onclick=()=>{revealed=true;$('practice-answer').hidden=false;$('practice-reveal').hidden=true;};
 $('practice-next').onclick=async()=>{
  if(!lesson||listening||finishing)return;
  if(index<lesson.items.length-1){index++;show();return;}
  const token=session;finishing=true;$('practice-next').disabled=true;resetAudio();
  try{await SGWrite({type:'completeLesson',id:lesson.id,expectedRevision:lesson.revision});if(token!==session)return;$('practice-study').hidden=true;$('practice-done').hidden=false;$('practice-done').focus();await render();}
  catch(e){if(token!==session)return;$('message').textContent='Could not complete lesson: '+e.message;$('practice-next').disabled=false;}
  finally{if(token===session)finishing=false;}
 };
 $('practice-record').onclick=()=>{if(!listening)recorder.start();};
 $('practice-stop').onclick=()=>{recorder.stop();};
 // Stop also cancels a pending permission request without reviving it later.
 $('practice-stop').addEventListener('click',()=>{if($('practice-record-status').textContent.startsWith('Waiting'))resetAudio();});
 $('practice-discard').onclick=resetAudio;
 window.addEventListener('hashchange',()=>{if(!location.hash.endsWith('lessons'))close();});
 window.addEventListener('pagehide',close);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){stopModel();resetAudio();$('practice-next').disabled=false;}});

 async function playSentence(){
  if(!lesson)return;stopModel();resetAudio();const token=session,text=lesson.items[index].korean.trim();
  listening=true;$('practice-record').disabled=true;$('practice-next').disabled=true;$('practice-play-status').textContent='Listening to the sentence…';
  const controller=new AbortController();playController=controller;
  try{
   if(!text)throw Error('Add a Korean sentence in the editor to hear it.');
   const voice=speechSynthesis.getVoices().find(v=>v.localService&&/^ko(?:-|$)/i.test(v.lang));
   if(voice){await new Promise((resolve,reject)=>{const u=new SpeechSynthesisUtterance(text);u.voice=voice;u.lang='ko-KR';u.onend=resolve;u.onerror=()=>reject(Error('Sentence playback stopped.'));controller.signal.addEventListener('abort',()=>{speechSynthesis.cancel();reject(Error('Cancelled.'));},{once:true});speechSynthesis.speak(u);});}
   else{
    const blob=await SGSpeechService.synthesize(text,controller.signal);if(controller.signal.aborted)return;
    const url=URL.createObjectURL(blob),model=$('practice-model');
    try{model.src=url;await new Promise((resolve,reject)=>{model.onended=resolve;model.onerror=()=>reject(Error('Could not play sentence audio.'));controller.signal.addEventListener('abort',()=>reject(Error('Cancelled.')),{once:true});model.play().catch(reject);});}finally{model.removeAttribute('src');URL.revokeObjectURL(url);}
   }
   if(token===session&&!controller.signal.aborted)$('practice-play-status').textContent='Your turn. Record yourself or choose Done.';
  }catch(e){if(token===session&&!controller.signal.aborted)$('practice-play-status').textContent=e.message+' You can replay or continue without audio.';}
  finally{if(token===session&&!controller.signal.aborted){listening=false;$('practice-record').disabled=!text;$('practice-next').disabled=false;}}
 }
 $('practice-play').onclick=playSentence;
 $('practice-grade').onclick=async()=>{
  if(!lesson||!recordedBlob)return;
  if(!$('practice-cloud-consent').checked){$('practice-grade-result').textContent='Choose the upload checkbox before requesting cloud grading.';return;}
  const token=session,blob=recordedBlob,text=lesson.items[index].korean;const controller=new AbortController();gradeController?.abort();gradeController=controller;$('practice-grade').disabled=true;$('practice-grade-result').textContent='Assessing pronunciation…';
  try{const grade=await SGSpeechService.assess(text,blob,controller.signal);if(token!==session||controller.signal.aborted)return;for(const key of ['pronunciation','accuracy','fluency','completeness'])if(typeof grade[key]!=='number'||grade[key]<0||grade[key]>100)throw Error('Invalid assessment result.');$('practice-grade-result').textContent='Azure Speech feedback (0–100): pronunciation '+grade.pronunciation+', accuracy '+grade.accuracy+', fluency '+grade.fluency+', completeness '+grade.completeness+'. Automated feedback is approximate; this is not a TOPIK grade.';}
  catch(e){if(token===session&&!controller.signal.aborted)$('practice-grade-result').textContent='No grade: '+e.message;}
  finally{if(token===session&&!controller.signal.aborted)$('practice-grade').disabled=!recordedBlob;}
 };
 const original=globalThis.startLessonPractice;globalThis.startLessonPractice=d=>{index=0;original(d);};
})();
