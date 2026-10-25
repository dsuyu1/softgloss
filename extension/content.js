(async () => {
 if(globalThis.__softgloss){globalThis.__softgloss.show();return;}
 const {SG}=globalThis;
 const host=document.createElement('div'); host.id='softgloss-root'; document.documentElement.append(host);
 const root=host.attachShadow({mode:'closed'});
 const style=document.createElement('style');style.textContent=`:host{all:initial}section{position:fixed;z-index:2147483647;right:20px;top:20px;width:min(360px,calc(100vw - 40px));max-height:80vh;overflow:auto;box-sizing:border-box;background:#faf8f3;color:#253e34;border:1px solid #bfcfc2;border-radius:18px;padding:20px;box-shadow:0 8px 30px #0002;font:15px/1.6 system-ui}h2{font-size:22px;margin:6px 0}p{margin:8px 0}button{cursor:pointer;border:1px solid #bfcfc2;border-radius:9px;background:#e7eee5;color:#253e34;padding:7px 11px;margin:4px 5px 4px 0;font:inherit}button:focus-visible{outline:3px solid #6e8874}small{display:block;color:#5c6d62}hr{border:0;border-top:1px solid #d9dfd6}#notice{min-height:1.5em}a{color:#355f48}`;
 root.append(style); const panel=document.createElement('section');panel.setAttribute('aria-label','SoftGloss Korean dictionary');root.append(panel);
 let state=await chrome.storage.local.get({words:{},cards:[]}), current='', sentence='', results=[];
 function el(tag,text,parent=panel){const e=document.createElement(tag);e.textContent=text;parent.append(e);return e;}
 function button(label,fn,parent=panel){const e=el('button',label,parent);e.type='button';e.addEventListener('click',fn);return e;}
 function render(){
  panel.replaceChildren();el('small','SOFTGLOSS · OFFLINE ALPHA');button('Close',()=>panel.hidden=true);
  button('My library',()=>chrome.runtime.sendMessage({type:'openLibrary'}));
  el('h2',current||'A little help reading Korean.');
  el('small','Starter dictionary · limited coverage · no AI');
  if(!current)el('p','Hover a Korean word or select text to look it up. Enable again with the toolbar button after navigating.');
  else if(!results.length)el('p','No supported entry yet. This is a small starter pack, not a full Korean parser.');
  for(const r of results){
   el('hr','');el('h2',r.lemma);el('p',r.meaning);el('small',r.pos+' · '+r.kind);
   r.parts.forEach(p=>el('p',p));el('small','Status: '+(state.words[r.lemma]||'unknown'));
   for(const status of ['unknown','seen','known'])button(status,async()=>{
    const latest=await chrome.storage.local.get({words:{}});latest.words[r.lemma]=status;
    await chrome.storage.local.set({words:latest.words});state.words=latest.words;paint();render();
   });
   button('Save sentence',async()=>{
    const latest=await chrome.storage.local.get({cards:[]});
    const card={lemma:r.lemma,meaning:r.meaning,sentence:sentence.slice(0,2000),url:location.origin+location.pathname};
    if(!latest.cards.some(c=>c.lemma===card.lemma&&c.sentence===card.sentence))latest.cards.push(card);
    try{await chrome.storage.local.set({cards:latest.cards});root.getElementById('notice').textContent='Saved to your library.';}catch{root.getElementById('notice').textContent='Could not save. Export your library and free up storage.';}
   });
  }
  el('p','').id='notice';el('small','Nothing leaves this browser. Saved cards include the page address without query parameters.');
 }
 function display(word,context){if(word===current&&!panel.hidden)return;current=word;sentence=context;results=SG.lookup(word);panel.hidden=false;render();}
 let timer;
 document.addEventListener('pointermove',event=>{
  clearTimeout(timer);if(event.composedPath().includes(host))return;
  timer=setTimeout(()=>{
   const p=document.caretRangeFromPoint?.(event.clientX,event.clientY);if(!p||p.startContainer.nodeType!==Node.TEXT_NODE)return;
   const node=p.startContainer;if(node.parentElement?.closest('input,textarea,[contenteditable],script,style'))return;
   const text=node.textContent, offset=p.startOffset;
   const token=SG.tokens(text).find(t=>t.index<=offset&&offset<t.index+t.word.length);
   if(token)display(token.word,text.trim());
  },280);
 });
 document.addEventListener('mouseup',event=>{
  if(event.composedPath().includes(host))return;
  const selection=getSelection();if(selection?.anchorNode?.parentElement?.closest('input,textarea,[contenteditable]'))return;
  const text=selection?.toString().trim();if(text&&text.length<=80&&SG.tokens(text).length===1)display(text,selection.anchorNode?.parentElement?.textContent||text);
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape')panel.hidden=true;});
 function paint(){
  if(!globalThis.CSS?.highlights||!globalThis.Highlight)return;
  const sets={unknown:new Highlight(),seen:new Highlight(),known:new Highlight()};
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n,count=0;
  while((n=walker.nextNode())&&count++<10000){
   if(n.parentElement?.closest('script,style,input,textarea,[contenteditable]'))continue;
   for(const t of SG.tokens(n.textContent)){
    const a=SG.lookup(t.word);if(a.length!==1)continue;const status=state.words[a[0].lemma]||'unknown';
    const range=new Range();range.setStart(n,t.index);range.setEnd(n,t.index+t.word.length);sets[status].add(range);
   }
  }
  for(const [k,v]of Object.entries(sets))CSS.highlights.set('softgloss-'+k,v);
 }
 const colorStyle=document.createElement('style');colorStyle.textContent='::highlight(softgloss-unknown){text-decoration:underline;background-color:#f5e2d5}::highlight(softgloss-seen){background-color:#eee8b8}::highlight(softgloss-known){background-color:#d8eadb}';document.head.append(colorStyle);
 chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.words){state.words=changes.words.newValue||{};paint();}});
 globalThis.__softgloss={show(){panel.hidden=false;render();paint();}};render();paint();
})();
