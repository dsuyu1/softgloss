chrome.action.onClicked.addListener(async tab => {
 if (!tab.id) return;
 try {
  await chrome.scripting.executeScript({target:{tabId:tab.id},files:['data.js','core.js','content.js']});
  await chrome.action.setBadgeText({tabId:tab.id,text:'ON'});
 } catch {
  await chrome.action.setBadgeText({tabId:tab.id,text:'!'});
  await chrome.action.setTitle({tabId:tab.id,title:'SoftGloss cannot run here. Try a normal web article.'});
 }
});
chrome.runtime.onMessage.addListener((message,sender)=>{
 if(message?.type==='openLibrary' && sender.id===chrome.runtime.id) chrome.runtime.openOptionsPage();
});
