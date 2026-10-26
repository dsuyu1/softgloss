// One temporary local recording. Permission is requested only by Start recording.
(() => {
 function create({media=navigator.mediaDevices,Recorder=globalThis.MediaRecorder,urls=URL,onState=()=>{},limit=60000}={}){
  let generation=0,stream=null,recorder=null,url='',timer=null,phase='idle',blob=null;
  function emit(value){phase=value;onState({phase,url,blob});}
  function tracks(){stream?.getTracks().forEach(t=>t.stop());stream=null;}
  function discard(){generation++;clearTimeout(timer);timer=null;if(recorder&&recorder.state!=='inactive')recorder.stop();recorder=null;tracks();if(url)urls.revokeObjectURL(url);url='';blob=null;emit('idle');}
  function stop(){if(recorder?.state==='recording'){emit('stopping');recorder.stop();tracks();clearTimeout(timer);}}
  async function start(){
   if(phase==='requesting'||phase==='recording'||phase==='stopping')return;
   discard();const token=generation;emit('requesting');
   try{
    if(!media?.getUserMedia||!Recorder)throw Error('unsupported');
    const acquired=await media.getUserMedia({audio:true,video:false});
    if(token!==generation){acquired.getTracks().forEach(t=>t.stop());return;}
    stream=acquired;const current=new Recorder(stream);recorder=current;let chunks=[],size=0,tooLarge=false;
    current.ondataavailable=e=>{if(token!==generation)return;if(e.data.size){size+=e.data.size;if(size>5000000){tooLarge=true;chunks=[];stop();}else if(!tooLarge)chunks.push(e.data);}};
    current.onstop=()=>{if(token!==generation)return;clearTimeout(timer);tracks();recorder=null;if(tooLarge||!size){emit('empty');return;}blob=new Blob(chunks,{type:current.mimeType||'audio/webm'});url=urls.createObjectURL(blob);emit('ready');};
    current.onerror=()=>{if(token===generation){discard();emit('error');}};
    current.start(250);emit('recording');timer=setTimeout(stop,limit);
   }catch(e){if(token!==generation)return;discard();emit(e.name==='NotAllowedError'?'denied':e.message==='unsupported'?'unsupported':'error');}
  }
  return {start,stop,discard};
 }
 globalThis.SGRecorder={create};
})();
