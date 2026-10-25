importScripts('core.js', 'mutations.js');
const store = SGStore.createStore(chrome.storage.local);
async function enable(tab, keyboard = false) {
 if (!tab?.id) return;
 try {
  await chrome.scripting.executeScript({target: {tabId: tab.id}, files: ['data.js', 'core.js', 'api.js', 'content.js']});
  if (keyboard) await chrome.scripting.executeScript({target: {tabId: tab.id}, func: () => globalThis.__softgloss?.openSelection()});
  await chrome.action.setBadgeText({tabId: tab.id, text: 'ON'});
  await chrome.action.setTitle({tabId: tab.id, title: 'Open SoftGloss on this page'});
 } catch {
  await chrome.action.setBadgeText({tabId: tab.id, text: '!'});
  await chrome.action.setTitle({tabId: tab.id, title: 'SoftGloss cannot run here. Try a normal web article.'});
 }
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
 if (message?.type === 'openLibrary') {chrome.runtime.openOptionsPage(); return;}
 if (message?.type === 'pageDisabled') {
  if (sender.tab?.id) chrome.action.setBadgeText({tabId: sender.tab.id, text: ''});
  return;
 }
 const operations = ['setWord', 'saveCard', 'deleteCard', 'restore', 'setHighlights', 'clearLearning'];
 if (!operations.includes(message?.type)) return;
 store.apply(message).then(respond, e => respond({ok: false, error: e.message}));
 return true;
});
