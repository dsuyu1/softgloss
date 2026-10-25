(() => {
 globalThis.SGWrite = async message => {
  const response = await chrome.runtime.sendMessage(message);
  if (!response?.ok) throw Error(response?.error || 'Could not save. Reload the page and try again.');
  return response;
 };
})();
