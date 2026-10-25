// Tiny, permission-gated listener. Full dictionary code loads only on Korean interaction.
(() => {
 if(globalThis.__softglossBootstrap)return;
 globalThis.__softglossBootstrap=true;
 const skip='input,textarea,select,[contenteditable],[role=textbox],script,style';
 let pending=false,timer;
 async function activate(word,context) {
  if(pending || globalThis.__softgloss || !(word.length<=300 && /^[가-힣\s.,!?…“”"'‘’]+$/u.test(word) && (word.match(/[가-힣]+/gu)||[]).length<=8 && (word.match(/[가-힣]+/gu)||[]).every(w=>w.length<=80)))return;
  pending=true;
  try {await chrome.runtime.sendMessage({type:'autoEnable',word,context:context.slice(0,2000)});} catch {} finally {pending=false;}
 }
 document.addEventListener('pointermove',event=>{
  clearTimeout(timer);if(globalThis.__softgloss)return;
  timer=setTimeout(()=>{
   const point=document.caretRangeFromPoint?.(event.clientX,event.clientY);
   if(!point || point.startContainer.nodeType!==Node.TEXT_NODE)return;
   const node=point.startContainer;if(node.parentElement?.closest(skip))return;
   for(const match of node.textContent.matchAll(/[가-힣]+/gu)) {
    if(point.startOffset<match.index || point.startOffset>=match.index+match[0].length)continue;
    const range=new Range();range.setStart(node,match.index);range.setEnd(node,match.index+match[0].length);
    if([...range.getClientRects()].some(r=>event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom))activate(match[0],node.textContent.trim());
    break;
   }
  },280);
 });
 document.addEventListener('mouseup',()=>{
  if(globalThis.__softgloss)return;
  const s=getSelection();if(s?.anchorNode?.parentElement?.closest(skip)||s?.focusNode?.parentElement?.closest(skip))return;
  const word=s?.toString().trim();if(word)activate(word,s.anchorNode?.parentElement?.textContent||word);
 });
})();
