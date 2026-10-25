importScripts('core.js', 'mutations.js', 'dictionary-files.js');
const store = SGStore.createStore(chrome.storage.local);
async function enablePage(tab) {
 if (!tab?.id) return {ok:false,error:'Open an ordinary website first.'};
 try {
  const [loaded] = await chrome.scripting.executeScript({target: {tabId: tab.id}, func: () => Boolean(globalThis.SG_DATA?.loaded)});
  if (!loaded.result) await chrome.scripting.executeScript({target: {tabId: tab.id}, files: SG_DICTIONARY_FILES});
  await chrome.scripting.executeScript({target: {tabId: tab.id}, files: ['core.js', 'api.js', 'content.js']});
  await chrome.action.setBadgeText({tabId: tab.id, text: 'ON'});
  await chrome.action.setTitle({tabId: tab.id, title: 'Open Bungeoppang on this page'});
  return {ok:true};
 } catch {
  await chrome.action.setBadgeText({tabId: tab.id, text: '!'});
  await chrome.action.setTitle({tabId: tab.id, title: 'Bungeoppang cannot run here. Try a normal web article.'});
  return {ok:false,error:'Could not activate this page. Reload the webpage and try again. Chrome settings, Web Store pages and PDFs are unsupported.'};
 }
}
const activationLoads=new Map();
async function enable(tab,keyboard=false) {
 if(!tab?.id)return {ok:false,error:'Open an ordinary website first.'};
 if(!activationLoads.has(tab.id))activationLoads.set(tab.id,enablePage(tab).finally(()=>activationLoads.delete(tab.id)));
 const result=await activationLoads.get(tab.id);
 if(result?.ok && keyboard)await chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>globalThis.__softgloss?.openSelection()});
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
 if(message?.type==='autoEnable' && sender.tab && sender.frameId===0) {
  autoEnable(message,sender).then(respond,e=>respond({ok:false,error:e.message}));return true;
 }
 if (message?.type === 'openLibrary') {chrome.runtime.openOptionsPage(); return;}
 if (message?.type === 'pageDisabled') {
  if (sender.tab?.id) chrome.action.setBadgeText({tabId: sender.tab.id, text: ''});
  return;
 }
 const operations = ['setWord', 'saveCard', 'deleteCard', 'restore', 'setHighlights', 'clearLearning','setStudyLevel','importStudyList','clearStudyList'];
 if (!operations.includes(message?.type)) return;
 store.apply(message).then(respond, e => respond({ok: false, error: e.message}));
 return true;
});

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
   await chrome.scripting.registerContentScripts([{id:autoScriptId,js:['bootstrap.js'],matches,runAt:'document_idle',persistAcrossSessions:true}]);
   await Promise.allSettled(tabs.filter(t=>t.id).map(t=>chrome.scripting.executeScript({target:{tabId:t.id},files:['bootstrap.js']})));
  } else {
   await Promise.allSettled(tabs.filter(t=>t.id).map(t=>chrome.scripting.executeScript({target:{tabId:t.id},func:()=>globalThis.__softgloss?.stopAuto?.()})));
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
 const id=sender.tab.id;
 if(!autoLoads.has(id))autoLoads.set(id,enable({id}).finally(()=>autoLoads.delete(id)));
 const result=await autoLoads.get(id);if(!result?.ok)return result;
 await chrome.scripting.executeScript({target:{tabId:id},func:(word,context)=>globalThis.__softgloss?.autoLookup?.(word,context),args:[message.word,message.context]});
 return {ok:true};
}
chrome.runtime.onInstalled.addListener(()=>syncAuto().catch(()=>{}));
chrome.runtime.onStartup.addListener(()=>syncAuto().catch(()=>{}));
chrome.permissions.onRemoved.addListener(()=>chrome.storage.local.set({autoLookup:false}).then(()=>syncAuto()).catch(()=>{}));
