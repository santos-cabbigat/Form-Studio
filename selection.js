'use strict';
const codeDrafts=new Map(),codeDraftBases=new Map();
const draftPrefix='formstudio.codeDraft.';
const draftVersions=new Map(),dirtyDrafts=new Set(),draftErrors=new Map();
let draftTimer;
let panelSource='',codeApplyGeneration=0;
function draftKey(){return JSON.stringify([activeFileId,pageId,device,...[...selected].sort()])}
function readDraft(key){
 const record=JSON.parse(localStorage.getItem(draftPrefix+key));
 if(record&&(typeof record.base!=='string'||typeof record.text!=='string'||typeof record.version!=='string'))throw Error('Unreadable code draft.');
 return record;
}
function restoreDraft(key){
 if(dirtyDrafts.has(key))return;
 try{
   const record=readDraft(key);
   if(record){
     codeDraftBases.set(key,record.base);codeDrafts.set(key,record.text);draftVersions.set(key,record.version);
   }else{codeDrafts.delete(key);codeDraftBases.delete(key);draftVersions.delete(key)}
 }catch{}
}
function dropCodeDraft(key=draftKey()){
 if(codeDrafts.has(key)||draftVersions.has(key)){
   try{if(readDraft(key)?.version===draftVersions.get(key))localStorage.removeItem(draftPrefix+key)}catch{}
 }
 dirtyDrafts.delete(key);draftErrors.delete(key);draftVersions.delete(key);codeDrafts.delete(key);codeDraftBases.delete(key);
}
function draftNote(key){
 return draftErrors.get(key)||(dirtyDrafts.has(key)?'Saving code draft on this device…':'Draft saved on this device. Apply code to include these edits in the project and its cloud copy.');
}
function saveCodeDrafts(){
 clearTimeout(draftTimer);
 for(const key of dirtyDrafts){
   try{
     if(readDraft(key)?.version!==draftVersions.get(key))throw Error('Another tab changed this draft. Copy your text before closing or discarding it.');
     const version=crypto.randomUUID();
     localStorage.setItem(draftPrefix+key,JSON.stringify({base:codeDraftBases.get(key),text:codeDrafts.get(key),version}));
     draftVersions.set(key,version);dirtyDrafts.delete(key);draftErrors.delete(key);
   }catch(e){draftErrors.set(key,e.name==='QuotaExceededError'?'Device storage is full. Copy this code before closing.':e.message||'Draft could not be saved. Copy this code before closing.')}
 }
 const message=$('#draftState .hint');if(message)message.textContent=draftNote(draftKey());
}
function updateCodeDraft(value){
 codeApplyGeneration++;
 const key=draftKey();
 if(value===panelSource)dropCodeDraft();
 else{
   if(!codeDrafts.has(key))codeDraftBases.set(key,panelSource);
   codeDrafts.set(key,value);dirtyDrafts.add(key);
   clearTimeout(draftTimer);draftTimer=setTimeout(saveCodeDrafts,300);
 }
 const feedback=$('#codeError');if(feedback)feedback.replaceChildren();
 const apply=$('[data-cmd=apply-code]');if(apply)apply.disabled=false;
 $('#draftState').hidden=!codeDrafts.has(key);$('#draftState .hint').textContent=draftNote(key);
}
window.addEventListener('pagehide',()=>{if(dirtyDrafts.size)saveCodeDrafts()});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&dirtyDrafts.size)saveCodeDrafts()});
window.addEventListener('beforeunload',event=>{
 if(dirtyDrafts.size)saveCodeDrafts();
 if(dirtyDrafts.size||!storageOK){event.preventDefault();event.returnValue=''}
});
function selectedLayers(){
 const pg=page();
 if(!selected.length)return pg.nodes;
 const ids=new Set(selected);return pg.nodes.filter(n=>ids.has(n.id));
}
function selectionKind(){
 if(!selected.length)return page().kind;
 if(selected.length===1)return 'element';
 const nodes=selectedLayers();
 return nodes[0].group && nodes.every(n=>n.group===nodes[0].group)?'group':'selection';
}
function groupTitle(nodes){return nodes[0]?.groupName||'Layer group'}
function selectionTitle(){
 const kind=selectionKind();
 if(kind==='element')return sel().name;
 if(kind==='group')return groupTitle(selectedLayers());
 return kind==='selection'?'Selected layers':page().name
}
function selectionSource(){
 const nodes=selectedLayers(),kind=selectionKind(),pg=page();
 if(kind==='element')return sourceFor(sel());
 const root=kind==='window'?'dialog':'section';
 const id=kind==='group'?nodes[0].group:pg.id;
 const size=kind==='window'?' data-width="'+pg.width+'" data-height="'+pg.height+'"':'';
 const parts=nodes.map(n=>'<template data-layer="'+esc(n.id)+'" data-name="'+esc(n.name)+'">\n'+sourceFor(n)+'\n</template>');
 return '<'+root+' data-studio="'+kind+'" data-id="'+esc(id)+'" data-name="'+esc(selectionTitle())+'"'+size+'>\n'+parts.join('\n\n')+'\n</'+root+'>'
}
function selectCode(){
 const area=$('#elementCode');if(!area)return;
 area.focus({preventScroll:true});area.select();area.scrollTop=0
}
function codePanel(){
 const kind=selectionKind(),count=selectedLayers().length;
 const key=draftKey();restoreDraft(key);
 panelSource=selectionSource();
 return '<section class="part codePart"><h3>'+esc(selectionTitle())+'</h3><p class="hint">'+esc(cap(kind))+' · '+count+' '+(count===1?'layer':'layers')+' · '+esc(cap(device))+'</p>'+
 btn('copy-chat','Copy for ChatGPT','code','btn primary full')+
 '<p class="hint">Edit HTML or CSS, then choose Apply code. A plain HTML block adds new layers after your selection. In screen code, paste between layer templates to insert there.</p>'+
 '<button type="button" data-cmd="expand-code" class="chip" aria-pressed="false">Expand code</button>'+
 '<textarea class="codeArea" id="elementCode" aria-label="Highlighted selection code" spellcheck="false">'+esc(codeDrafts.get(key)??panelSource)+'</textarea><div id="draftState" '+(codeDrafts.has(key)?'':'hidden')+'><p class="hint">'+esc(draftNote(key))+'</p>'+btn('discard-code','Discard draft','','chip')+'</div><div id="codeError" role="alert" class="error"></div>'+
 '<div class="row mt">'+btn('apply-code','Apply code','check','btn')+btn('select-code','Select all','','chip')+'</div></section>'
}
async function copyForChat(){
 const area=$('#elementCode');if(!area)return;selectCode();
 const note=selected.length===1?sel().devNote:!selected.length?page().devNote:'';
 const text='Please edit this Form Studio '+selectionKind()+' ('+selectionTitle()+') for the '+device+' layout. Return the complete replacement block. Preserve the layer IDs, data attributes, template wrappers and trigger connections unless I ask to change them.'+(note?'\nMy developer note: '+note:'')+'\n\n'+area.value;
 try{await navigator.clipboard.writeText(text);toast('Copied for ChatGPT')}catch{try{if(!document.execCommand('copy'))throw Error();toast('Selected code copied')}catch{toast('Code is selected. Use your device’s Copy command.')}} 
}
async function applySelection(){
 const area=$('#elementCode'),button=$('[data-cmd=apply-code]'),status=$('#codeError');
 const draft=area.value,key=draftKey(),pg=page(),originalProject=project;
 const base=panelSource,revision=deviceRevision,generation=++codeApplyGeneration;
 const active=()=>generation===codeApplyGeneration&&area.isConnected&&pg===page()&&originalProject===project&&deviceRevision===revision&&draftKey()===key&&area.value===draft;
 function showError(error){
   if(!active())return;
   status.textContent=error.message;button.disabled=false;
 }
 try{
   if(codeDraftBases.has(key)&&codeDraftBases.get(key)!==base)throw Error('This selection changed on the canvas while you had a code draft. Copy your draft, discard it, then edit the updated code.');
   const raw=pastedDesignSource(draft,''),nodes=selectedLayers(),kind=selectionKind();
   const plan=inlinePlan(raw,nodes,kind,pg);
   const commit=()=>{
     if(!active())return;
     const added=plan.insertions.reduce((sum,c)=>sum+c.nodes.length,0);
     change(()=>{
       for(const [n,updated] of plan.updates)Object.assign(n,updated);
       if(plan.name){
         if(kind==='group')for(const n of nodes)n.groupName=plan.name;
         else if(!selected.length)pg.name=plan.name;
       }
       if(plan.width!==null){pg.width=plan.width;pg.height=plan.height}
       placeCodeInsertions(plan,pg,kind,nodes);
       if(kind==='group'&&added)selected=pg.nodes.filter(n=>n.group===nodes[0].group).map(n=>n.id);
       else if(kind==='element'&&added)selected=[plan.insertions[0].nodes[0].id];
     },added?'Added '+countText(added)+' from code':'Code applied');
     if(storageOK){
       dropCodeDraft(key);
       if(key===draftKey()&&$('#elementCode')){
         $('#elementCode').value=panelSource;$('#draftState').hidden=true;
       }
     }
   };
   if(!plan.insertions.length){commit();return}
   button.disabled=true;status.textContent='Checking pasted HTML for laptop, tablet and phone…';
   const warnings=await measureCodeInsertions(plan,pg,active);
   if(!active())return;
   if(!warnings.length){commit();return}
   const count=plan.insertions.reduce((sum,c)=>sum+c.nodes.length,0);
   status.innerHTML='<strong>'+esc(countText(count))+' ready to add</strong><ul>'+warnings.map(w=>'<li>'+esc(w)+'</li>').join('')+'</ul><button type="button" class="btn" data-inline-accept>Add supported layers</button>';
   button.disabled=false;status.querySelector('button').onclick=commit;
 }catch(error){showError(error)}
}
function countText(n){return n+' '+(n===1?'layer':'layers')}
function groupPanel(){
 const grouped=selectionKind()==='group',nodes=selectedLayers();
 return '<div class="part"><h3>'+esc(selectionTitle())+'</h3><p>'+countText(nodes.length)+'</p>'+
 (grouped?field('Group name','<input id="groupName" value="'+esc(groupTitle(nodes))+'">'):'')+
 '<ul>'+nodes.map(n=>'<li>'+esc(n.name)+'</li>').join('')+'</ul>'+
 (grouped?btn('ungroup','Ungroup','group','btn full'):btn('group','Group layers','group','btn primary full'))+
 '<div class="mt">'+btn('save-selected','Save as template','library','btn full')+'</div></div>'
}
function toggleLayers(n,add){
 const ids=n.group?page().nodes.filter(v=>v.group===n.group).map(v=>v.id):[n.id];
 if(!add){selectIds(ids);return}
 selectIds(ids.every(id=>selected.includes(id))?selected.filter(id=>!ids.includes(id)):[...selected,...ids])
}

function enclosedLayerIds(boxes,start,end,add=[],epsilon=0){
 const l=Math.min(start[0],end[0]),r=Math.max(start[0],end[0]),t=Math.min(start[1],end[1]),b=Math.max(start[1],end[1]);
 return [...new Set([...add,...boxes.filter(({box:[x,y,w,h]})=>x>=l-epsilon&&y>=t-epsilon&&x+w<=r+epsilon&&y+h<=b+epsilon).map(item=>item.id)])];
}
function startBoxSelection(event,hit){
 const marquee=document.createElement('div');marquee.className='selectionMarquee';marquee.hidden=true;stage.append(marquee);
 gesture={marquee,x:event.clientX,y:event.clientY,original:[...selected],hit,add:event.shiftKey||event.ctrlKey||event.metaKey,
   boxes:page().nodes.filter(n=>!n.locked&&!n.hide?.[device]).map(n=>({id:n.id,box:boxFor(n,device,project,page())}))};
}
function updateBoxSelection(event){
 const g=gesture,dx=event.clientX-g.x,dy=event.clientY-g.y;if(Math.abs(dx)+Math.abs(dy)<4&&!g.moved)return;g.moved=true;
 const r=stage.getBoundingClientRect(),s=$('#sheet').getBoundingClientRect();g.marquee.hidden=false;
 Object.assign(g.marquee.style,{left:Math.min(g.x,event.clientX)-r.left+'px',top:Math.min(g.y,event.clientY)-r.top+'px',width:Math.abs(dx)+'px',height:Math.abs(dy)+'px'});
 const ids=enclosedLayerIds(g.boxes,[(g.x-s.left)/scale,(g.y-s.top)/scale],[(event.clientX-s.left)/scale,(event.clientY-s.top)/scale],g.add?g.original:[],.5/scale),next=new Set(ids),previous=new Set(selected);
 for(const id of previous)if(!next.has(id))markCanvasLayer(id,false);
 for(const id of next)if(!previous.has(id))markCanvasLayer(id,true);selected=ids;
}
function finishBoxSelection(cancel=false){
 const g=gesture;gesture=null;g.marquee.remove();
 if(cancel){selectIds(g.original);return}
 if(!g.moved){const n=page().nodes.find(n=>n.id===g.hit);if(n&&!n.locked){selected=g.original;toggleLayers(n,true)}else selectIds(g.add?g.original:[]);return}
 selectIds(selected);
}
