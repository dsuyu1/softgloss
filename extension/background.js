importScripts('vendor/ts-fsrs-5.4.2.js', 'srs.js', 'lessons.js', 'core.js', 'mutations.js', 'dictionary-files.js');
const store = SGStore.createStore(chrome.storage.local);
// Probe only permitted frames. The main frame owns the panel; child frames relay lookups.
async function loadFrame(tabId, frameId, quiet=false) {
 const target={tabId,frameIds:[frameId]};
 const [probe]=await chrome.scripting.executeScript({target,func:()=>({version:globalThis.__softgloss?.version,loaded:!!globalThis.SG_DATA?.loaded})});
 if(probe.result.version&&probe.result.version!==chrome.runtime.getManifest().version)throw Error('Reload the webpage to load Malnaru Read '+chrome.runtime.getManifest().version+'.');
 if(!probe.result.loaded)await chrome.scripting.executeScript({target,files:SG_DICTIONARY_FILES});
 await chrome.scripting.executeScript({target,files:['core.js','api.js','speech.js','content.js']});
 if(quiet)await chrome.scripting.executeScript({target,func:()=>globalThis.__softgloss?.hide()});
}
const frameLoads=new Map();
function enableFrame(tabId,frameId,quiet=false){
 const key=tabId+':'+frameId;
 if(!frameLoads.has(key))frameLoads.set(key,loadFrame(tabId,frameId,quiet).finally(()=>frameLoads.delete(key)));
 return frameLoads.get(key);
}
async function enablePage(tab) {
 if (!tab?.id) return {ok:false,error:'Open an ordinary website first.'};
 try {
  await enableFrame(tab.id,0);
  await refreshFrames(tab.id).catch(()=>{});
  await chrome.action.setBadgeText({tabId:tab.id,text:'ON'});
  return {ok:true};
 } catch(error) {
  await chrome.action.setBadgeText({tabId:tab.id,text:'!'});
  return {ok:false,error:error.message.includes('Reload the webpage')?error.message:'Could not activate this page. Reload the webpage and try again. Chrome settings, Web Store pages and PDFs are unsupported.'};
 }
}
async function refreshFrames(tabId) {
 const frames=await chrome.scripting.executeScript({target:{tabId,allFrames:true},func:()=>({korean:/[가-힣]/u.test((document.body?.textContent||'').slice(0,500000))})});
 // Load serially to avoid large simultaneous dictionary allocations.
 for(const frame of frames.filter(f=>f.frameId!==0&&f.result?.korean)) {
  await enableFrame(tabId,frame.frameId,true).catch(()=>{}); // An inaccessible child never blocks the parent.
 }
}
const activationLoads=new Map();
async function enable(tab,keyboard=false) {
 if(!tab?.id)return {ok:false,error:'Open an ordinary website first.'};
 if(!activationLoads.has(tab.id))activationLoads.set(tab.id,enablePage(tab).finally(()=>activationLoads.delete(tab.id)));
 const result=await activationLoads.get(tab.id);
 if(result?.ok&&keyboard)await chrome.scripting.executeScript({target:{tabId:tab.id,allFrames:true},func:()=>{if(window===top||getSelection()?.toString().trim())globalThis.__softgloss?.openSelection();}});
 return result;
}
chrome.action.onClicked.addListener(tab => enable(tab));
chrome.commands.onCommand.addListener(async command => {
 if (command === 'lookup') {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  await enable(tab, true);
 }
});
chrome.runtime.onMessage.addListener((message, sender, respond) => {
 if (sender.id !== chrome.runtime.id) return;
 if(message?.type==='enableCurrent' && sender.url?.startsWith(chrome.runtime.getURL(''))) {
  enable({id:message.tabId}).then(respond,e=>respond({ok:false,error:e.message}));return true;
 }
 if(message?.type==='syncAuto' && sender.url?.startsWith(chrome.runtime.getURL(''))) {
  syncAuto().then(()=>respond({ok:true}),e=>respond({ok:false,error:e.message}));return true;
 }
 if(message?.type==='autoEnable' && sender.tab) {
  autoEnable(message,sender).then(respond,e=>respond({ok:false,error:e.message}));return true;
 }
 if(message?.type==='refreshFrames'&&sender.tab&&sender.frameId===0){
  chrome.scripting.executeScript({target:{tabId:sender.tab.id},func:()=>globalThis.__softgloss?.isEnabled()}).then(async ([r])=>{if(r.result)await refreshFrames(sender.tab.id);}).catch(()=>{});return;
 }
 if(message?.type==='frameLookup'&&sender.tab&&sender.frameId!==0){
  if(typeof message.word!=='string'||!SG.selectionWords(message.word).length||typeof message.context!=='string'||message.context.length>2000)return;
  chrome.scripting.executeScript({target:{tabId:sender.tab.id},func:(word,context,url)=>globalThis.__softgloss?.fromFrame(word,context,url),args:[message.word,message.context,(sender.url||'').split(/[?#]/)[0]]}).catch(()=>{});return;
 }
 if(message?.type==='loadAudio' && sender.tab?.id && /^audio\/audio-\d{2}\.js$/.test(message.file)) {
  chrome.scripting.executeScript({target:{tabId:sender.tab.id,frameIds:[sender.frameId]},files:[message.file]}).then(()=>respond({ok:true}),e=>respond({ok:false,error:e.message}));return true;
 }
 if(message?.type==='speak') {speak(message.text).then(respond,e=>respond({ok:false,error:e.message}));return true;}
 if (message?.type === 'openLibrary') {chrome.runtime.openOptionsPage(); return;}
 if (message?.type === 'pageDisabled') {
  if(sender.tab?.id){chrome.action.setBadgeText({tabId:sender.tab.id,text:''});if(sender.frameId===0)chrome.scripting.executeScript({target:{tabId:sender.tab.id,allFrames:true},func:()=>{if(window!==top)globalThis.__softgloss?.disable();}}).catch(()=>{});}
  return;
 }
 const operations = ['setWord', 'saveCard', 'deleteCard', 'restore', 'setHighlights', 'setUngradedHighlights', 'clearLearning','setStudyLevel','importStudyList','clearStudyList','addReview','rateReview','undoReview','suspendReview','removeReview','saveLesson','deleteLesson'];
 if (!operations.includes(message?.type)) return;
 store.apply(message).then(respond, e => respond({ok: false, error: e.message}));
 return true;
});

// Fallback for words without a packaged clip. Remote (cloud) voices are skipped so lookup text never leaves the device.
async function speak(text) {
 if(typeof text!=='string'||!/^[가-힣]{1,80}$/u.test(text))return {ok:false,error:'Only a single Korean word can be read aloud.'};
 const voice=(await chrome.tts.getVoices()).find(v=>v.lang?.toLowerCase().startsWith('ko')&&v.remote===false);
 if(!voice)return {ok:false,error:'No recording for this word, and no offline Korean voice is installed on this device.'};
 await chrome.tts.speak(text,{voiceName:voice.voiceName,lang:voice.lang,...(voice.extensionId?{extensionId:voice.extensionId}:{}),rate:0.9});
 return {ok:true,voice:voice.voiceName};
}

const autoScriptId='softgloss-auto';
let autoQueue=Promise.resolve();
function syncAuto() {
 const operation=autoQueue.then(async()=>{
  const {autoLookup}=await chrome.storage.local.get({autoLookup:false});
  const permissions=await chrome.permissions.getAll();
  const matches=(permissions.origins||[]).filter(o=>/^https?:\/\//.test(o));
  const registered=await chrome.scripting.getRegisteredContentScripts({ids:[autoScriptId]});
  if(registered.length)await chrome.scripting.unregisterContentScripts({ids:[autoScriptId]});
  const tabs=await chrome.tabs.query({url:['http://*/*','https://*/*']});
  if(autoLookup && matches.length) {
   await chrome.scripting.registerContentScripts([{id:autoScriptId,js:['bootstrap.js'],matches,runAt:'document_idle',persistAcrossSessions:true,allFrames:true}]);
   await Promise.allSettled(tabs.filter(t=>t.id).map(t=>chrome.scripting.executeScript({target:{tabId:t.id,allFrames:true},files:['bootstrap.js']})));
  } else {
   await Promise.allSettled(tabs.filter(t=>t.id).map(t=>chrome.scripting.executeScript({target:{tabId:t.id,allFrames:true},func:()=>globalThis.__softgloss?.stopAuto?.()})));
  }
 });
 autoQueue=operation.catch(()=>{});return operation;
}
const autoLoads=new Map();
async function autoEnable(message,sender) {
 const {autoLookup}=await chrome.storage.local.get({autoLookup:false});
 const url=new URL(sender.url || sender.tab.url);
 if(!autoLookup || !['http:','https:'].includes(url.protocol) || !await chrome.permissions.contains({origins:[url.origin+'/*']}))return {ok:false};
 if(typeof message.word!=='string'||!SG.selectionWords(message.word).length||typeof message.context!=='string'||message.context.length>2000)return {ok:false};
 const [pageState]=await chrome.scripting.executeScript({target:{tabId:sender.tab.id},func:()=>Boolean(globalThis.__softgloss&&!globalThis.__softgloss.isEnabled())});
 if(pageState.result)return {ok:false};
 const id=sender.tab.id,frameId=sender.frameId||0,key=id+':'+frameId;
 if(!autoLoads.has(key))autoLoads.set(key,(async()=>{const result=await enable({id});if(!result.ok)throw Error(result.error);if(frameId)await enableFrame(id,frameId,true);await chrome.scripting.executeScript({target:{tabId:id,allFrames:true},func:()=>globalThis.__softgloss?.markAutomatic()});})().finally(()=>autoLoads.delete(key)));
 await autoLoads.get(key);
 await chrome.scripting.executeScript({target:{tabId:id,frameIds:[frameId]},func:(word,context)=>globalThis.__softgloss?.autoLookup?.(word,context),args:[message.word,message.context]});
 return {ok:true};
}
chrome.runtime.onInstalled.addListener(()=>syncAuto().catch(()=>{}));
chrome.runtime.onStartup.addListener(()=>syncAuto().catch(()=>{}));
chrome.permissions.onRemoved.addListener(()=>chrome.storage.local.set({autoLookup:false}).then(()=>syncAuto()).catch(()=>{}));
