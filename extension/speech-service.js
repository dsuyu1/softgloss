// Opt-in pilot service. Provider credentials never enter the extension.
(() => {
 function endpoint(value){const u=new URL(value);if(u.pathname!=='/'||u.search||u.hash||u.username||u.password||!(u.protocol==='https:'||(u.protocol==='http:'&&u.hostname==='127.0.0.1')))throw Error('Use an HTTPS origin, or http://127.0.0.1:port for the local pilot.');return u.origin;}
 async function config(){const c=(await chrome.storage.session.get('speechService')).speechService;if(!c)throw Error('Connect the speech service in Settings first.');return {...c,url:endpoint(c.url)};}
 async function request(path,body,signal){const c=await config();const response=await fetch(c.url+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+c.token},body:JSON.stringify(body),signal,credentials:'omit',redirect:'error'});if(!response.ok){let error;try{error=(await response.json()).error;}catch{}throw Error(typeof error==='string'?error.slice(0,200):'Speech service unavailable.');}return response;}
 async function wav(blob){
  const context=new AudioContext();let decoded;try{decoded=await context.decodeAudioData(await blob.arrayBuffer());}finally{await context.close();}
  if(decoded.duration<0.1||decoded.duration>60)throw Error('Record between 0.1 and 60 seconds.');
  const offline=new OfflineAudioContext(1,Math.ceil(decoded.duration*16000),16000),source=offline.createBufferSource();source.buffer=decoded;source.connect(offline.destination);source.start();const mono=(await offline.startRendering()).getChannelData(0);
  const data=new ArrayBuffer(44+mono.length*2),view=new DataView(data);const str=(offset,s)=>{for(let i=0;i<s.length;i++)view.setUint8(offset+i,s.charCodeAt(i));};str(0,'RIFF');view.setUint32(4,data.byteLength-8,true);str(8,'WAVEfmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,16000,true);view.setUint32(28,32000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,mono.length*2,true);for(let i=0;i<mono.length;i++)view.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,mono[i]))*(mono[i]<0?32768:32767)),true);
  let binary='';for(const byte of new Uint8Array(data))binary+=String.fromCharCode(byte);return btoa(binary);
 }
 async function synthesize(text,signal){return (await request('/synthesize',{text},signal)).blob();}
 async function assess(text,blob,signal){const audio=await wav(blob);if(signal.aborted)throw Error('Cancelled.');return (await request('/assess',{text,audio},signal)).json();}
 globalThis.SGSpeechService={endpoint,synthesize,assess};
 const form=document.getElementById('speech-settings');
 form.onsubmit=async e=>{e.preventDefault();try{const url=endpoint(document.getElementById('speech-origin').value),token=document.getElementById('speech-token').value;if(token.length<32)throw Error('Use the pilot access token (at least 32 characters).');const granted=await chrome.permissions.request({origins:[url+'/*']});if(!granted)throw Error('Speech website access was not granted.');await chrome.storage.session.set({speechService:{url,token}});document.getElementById('speech-token').value='';document.getElementById('message').textContent='Speech service connected for this browser session.';}catch(e){document.getElementById('message').textContent=e.message;}};
 document.getElementById('speech-disconnect').onclick=async()=>{globalThis.closeLessonPractice?.();await chrome.storage.session.remove('speechService');document.getElementById('message').textContent='Speech service disconnected.';};
})();
