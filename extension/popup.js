const $ = id => document.getElementById(id);
const origins = ['http://*/*', 'https://*/*'];
$('version').textContent = 'Version ' + chrome.runtime.getManifest().version;
chrome.storage.local.get({autoLookup:false}).then(s => {$('automatic').checked=s.autoLookup;});
$('enable').onclick = async () => {
 $('enable').disabled=true; $('message').textContent='Loading the offline dictionary…';
 try {
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  const result=await chrome.runtime.sendMessage({type:'enableCurrent',tabId:tab?.id});
  if(!result?.ok)throw Error(result?.error || 'Could not activate this page.');
  $('message').textContent='Enabled. Return to the page and hover or select Korean text.';
 } catch(e) {$('message').textContent=e.message;}
 finally {$('enable').disabled=false;}
};
$('automatic').onchange=async () => {
 const enabled=$('automatic').checked; $('automatic').disabled=true;
 try {
  // Request immediately in the click/change gesture, before any async storage work.
  if(enabled && !await chrome.permissions.request({origins}))throw Error('Website access was not granted. You can still enable one page at a time.');
  await chrome.storage.local.set({autoLookup:enabled});
  const result=await chrome.runtime.sendMessage({type:'syncAuto'});
  if(!result?.ok)throw Error(result?.error || 'Could not update automatic lookup.');
  if(!enabled)await chrome.permissions.remove({origins});
  $('message').textContent=enabled?'Automatic lookup is on. Hover or select Korean text on a website.':'Automatic lookup is off. You can still enable this page manually.';
 } catch(e) {await chrome.storage.local.set({autoLookup:false});$('automatic').checked=false;await chrome.runtime.sendMessage({type:'syncAuto'}).catch(()=>{});$('message').textContent=e.message;}
 finally {$('automatic').disabled=false;}
};
$('library').onclick=()=>chrome.runtime.openOptionsPage();
