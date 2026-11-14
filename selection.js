'use strict';
const codeDrafts=new Map();
let panelSource='';
function draftKey(){return JSON.stringify([activeFileId,pageId,device,...[...selected].sort()])}
function dropCodeDraft(){codeDrafts.delete(draftKey())}
function updateCodeDraft(value){
 const key=draftKey();
 if(value===panelSource)codeDrafts.delete(key);else codeDrafts.set(key,value);
 $('#draftState').hidden=!codeDrafts.has(key);
}
window.addEventListener('beforeunload',event=>{if(codeDrafts.size){event.preventDefault();event.returnValue=''}});
function selectedLayers(){
 const pg=page();
 return selected.length ? pg.nodes.filter(n=>selected.includes(n.id)) : pg.nodes;
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
 panelSource=selectionSource();
 return '<section class="part codePart"><h3>'+esc(selectionTitle())+'</h3><p class="hint">'+esc(cap(kind))+' · '+count+' '+(count===1?'layer':'layers')+' · '+esc(cap(device))+'</p>'+
 btn('copy-chat','Copy for ChatGPT','code','btn primary full')+
 '<p class="hint">Paste into ChatGPT and describe your change. Bring the returned block back here and choose Apply code.</p>'+
 '<textarea class="codeArea" id="elementCode" aria-label="Highlighted selection code" spellcheck="false">'+esc(codeDrafts.get(draftKey())??panelSource)+'</textarea><div id="draftState" '+(codeDrafts.has(draftKey())?'':'hidden')+'><p class="hint">Unapplied code draft for this layout. Apply before closing the editor.</p>'+btn('discard-code','Discard draft','','chip')+'</div><div id="codeError" role="alert" class="error"></div>'+
 '<div class="row mt">'+btn('apply-code','Apply code','check','btn')+btn('select-code','Select all','','chip')+'</div></section>'
}
async function copyForChat(){
 const area=$('#elementCode');if(!area)return;selectCode();
 const text='Please edit this Form Studio '+selectionKind()+' ('+selectionTitle()+') for the '+device+' layout. Return the complete replacement block. Preserve the layer IDs, data attributes, template wrappers and trigger connections unless I ask to change them.\n\n'+area.value;
 try{await navigator.clipboard.writeText(text);toast('Copied for ChatGPT')}catch{try{if(!document.execCommand('copy'))throw Error();toast('Selected code copied')}catch{toast('Code is selected. Use your device’s Copy command.')}} 
}
function applySelection(){
 const raw=$('#elementCode').value.trim().replace(/^`{3}(?:html|xml)?\s*\n([\s\S]*?)\n`{3}$/i,'$1');
 try{
  const nodes=selectedLayers(),kind=selectionKind(),pg=page();
  if(kind==='element'){const model=parseElement(sel(),raw);dropCodeDraft();change(()=>Object.assign(sel(),model),'Code applied');return}
  const doc=new DOMParser().parseFromString(raw,'text/html'),root=doc.body.firstElementChild;
  if(!root||root.dataset.studio!==kind||root.dataset.id!==(kind==='group'?nodes[0].group:pg.id)||doc.body.children.length!==1)throw Error('Keep the outer '+kind+' wrapper and its original ID.');
  const children=[...root.children];if(children.length!==nodes.length)throw Error('Keep one template for every selected layer. Add or remove layers on the canvas.');
  const mapped=new Map();for(const child of children){const n=nodes.find(n=>n.id===child.dataset.layer);if(child.tagName!=='TEMPLATE'||!n||mapped.has(n.id))throw Error('A layer is missing or has a duplicate or changed ID.');const model=parseElement(n,child.innerHTML);model.name=child.dataset.name?.trim()||n.name;mapped.set(n.id,model)}
  const name=root.dataset.name?.trim()||selectionTitle();let width,height;
  if(kind==='window'){width=Number(root.dataset.width);height=Number(root.dataset.height);if(!Number.isFinite(width)||!Number.isFinite(height)||width<120||width>2000||height<100||height>2400)throw Error('Enter a window width of 120–2000 and height of 100–2400 pixels.')}
  dropCodeDraft();change(()=>{nodes.forEach(n=>{Object.assign(n,mapped.get(n.id));if(kind==='group')n.groupName=name});if(!selected.length)pg.name=name;if(kind==='window'){pg.width=width;pg.height=height}},'Code applied to '+countText(nodes.length))
 }catch(e){$('#codeError').textContent=e.message}
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
