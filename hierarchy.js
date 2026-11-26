'use strict';

// Paths are derived from stable IDs. Moving or renaming a branch leaves trigger targets intact.
function projectTree(p){
 const items=[...(p.categories||[]),...p.pages];
 const byId=new Map(items.map(item=>[item.id,item])),children=new Map(),paths=new Map(),names=new Map();
 for(const item of items){
   const parent=item.parentId||'';
   if(!children.has(parent))children.set(parent,[]);
   children.get(parent).push(item);
   const nameKey=JSON.stringify([parent,item.name]);
   if(!names.has(nameKey))names.set(nameKey,[]);
   names.get(nameKey).push(item);
   const path=[item];
   for(let entry=item;entry.parentId;){
     entry=byId.get(entry.parentId);
     if(!entry||path.includes(entry))throw Error('A category or screen has a missing or circular parent.');
     path.unshift(entry);
     if(path.length>6)throw Error('Use at most five levels of grouping.');
   }
   if(path.length>5&&item.kind==='category')throw Error('Use at most five levels of grouping.');
   paths.set(item.id,path);
 }
 function walk(parent){return (children.get(parent)||[]).flatMap(item=>[item,...walk(item.id)])}
 const ordered=walk('');
 function displayName(item){
   const same=names.get(JSON.stringify([item.parentId||'',item.name]));
   return same.length===1?item.name:item.name+' ('+(same.indexOf(item)+1)+' of '+same.length+')';
 }
 const caption=item=>paths.get(item.id).map(displayName).join(' › ');
 return {byId,children,paths,ordered,displayName,caption};
}
function parentChoices(item){
 const tree=projectTree(project);
 const branch=tree.ordered.filter(x=>tree.paths.get(x.id).includes(item));
 const depth=tree.paths.get(item.id)?.length||1;
 let height=item.kind==='category'?1:0;
 for(const child of branch)height=Math.max(height,tree.paths.get(child.id).length-depth+(child.kind==='category'?1:0));
 return [['','Project root'],...tree.ordered.filter(x=>{
   const path=tree.paths.get(x.id);
   return !path.includes(item)&&path.length+height<=5;
 }).map(x=>[x.id,tree.caption(x)+' · '+cap(x.kind)])];
}
function locationField(item,initial=item.parentId||'',id='destinationParent'){
 const choices=parentChoices(item);
 return field('Place under','<select id="'+id+'">'+options(choices,choices.some(([key])=>key===initial)?initial:'')+'</select>');
}
function setParent(item,id){if(id)item.parentId=id;else delete item.parentId}
function promoteChildren(item){
 for(const child of [...(project.categories||[]),...project.pages]){
   if(child.parentId===item.id)setParent(child,item.parentId);
 }
}
function treePageOptions(kind){
 const tree=projectTree(project);
 return tree.ordered.filter(item=>kind?item.kind===kind:item.kind!=='category').map(item=>[item.id,tree.caption(item)]);
}
function createDestinations(pg,companions=[],selection=[]){
 destinationDialog(pg,()=>{
   for(const companion of companions)setParent(companion,pg.parentId);
   project.pages.push(pg,...companions);pageId=pg.id;selected=selection;pan=[0,0];zoomFactor=1;
 },()=>{closeSide();dismiss()});
}
function pageSettings(){destinationDialog(page())}
function destinationDialog(item,onCreate=null,onDone=pagesDialog,initial=item.parentId||''){
 const category=item.kind==='category',isWindow=item.kind==='window',existing=!onCreate;
 const title=(existing?'Edit ':'New ')+item.kind;
 const viewport=deviceViewport(project,device);
 const dimensions=isWindow?'<label><input type="checkbox" id="pgDeviceSize" '+(item.deviceSized?'checked':'')+'> Use device size</label><div class="row">'+field('Width (px)','<input id="pgWidth" type="number" min="120" max="2000" value="'+item.width+'">')+
   field('Height (px)','<input id="pgHeight" type="number" min="100" max="2400" value="'+item.height+'">')+'</div>':'';
 const manage=existing?'<div class="treeManage">'+btn('branch-code','View grouped code','code','chip')+
   (parentChoices({kind:'category'}).some(([key])=>key===item.id)?btn('sub-category','Add subcategory','plus','chip'):'')+
   btn('delete-destination','Delete '+item.kind,'','chip')+'</div>':'';
 modal(title,field('Name','<input id="pgName" value="'+esc(item.name)+'" placeholder="'+cap(item.kind)+' name">')+
   locationField(item,initial)+dimensions+manage+'<p id="destinationError" class="error" role="alert"></p><div class="dialogActions">'+btn('dismiss','Cancel')+btn('save-page',existing?'Save':'Create '+item.kind,'check','btn primary')+'</div>');
 if(isWindow){
   const useDevice=$('#pgDeviceSize'),width=$('#pgWidth'),height=$('#pgHeight');
   const sync=()=>{
     width.disabled=height.disabled=useDevice.checked;
     width.value=useDevice.checked?viewport[0]:item.deviceSized?viewport[0]:item.width;
     height.value=useDevice.checked?viewport[1]:item.deviceSized?viewport[1]:item.height;
   };
   useDevice.onchange=sync;sync();
 }
 $('.dialog [data-cmd=save-page]').onclick=()=>{
   const name=$('#pgName').value.trim(),parent=$('#destinationParent').value;
   if(!name){$('#destinationError').textContent='Enter a name.';return}
   const w=$('#pgWidth')?.valueAsNumber,h=$('#pgHeight')?.valueAsNumber;
   if(isWindow&&!$('#pgDeviceSize').checked&&(!Number.isFinite(w)||w<120||w>2000||!Number.isFinite(h)||h<100||h>2400)){
     $('#destinationError').textContent='Enter a width of 120–2000 px and a height of 100–2400 px.';return;
   }
   change(()=>{item.name=name;setParent(item,parent);if(isWindow){item.deviceSized=$('#pgDeviceSize').checked;if(!item.deviceSized){item.width=w;item.height=h}}if(onCreate)onCreate()});
   onDone();
 };
 if(!existing)return;
 $('.dialog [data-cmd=branch-code]').onclick=()=>codeBrowser(item.id,true);
 const sub=$('.dialog [data-cmd=sub-category]');if(sub)sub.onclick=()=>newCategory(item.id);
 $('.dialog [data-cmd=delete-destination]').onclick=()=>{
   if(!category){deleteDestination(item.id);return}
   modal('Delete category?', '<p>Remove <strong>'+esc(item.name)+'</strong>? Its contents move up one level.</p><div class="dialogActions">'+btn('pages','Cancel')+'<button class="btn" id="removeCategory">Delete category</button></div>');
   $('#removeCategory').onclick=()=>{
     change(()=>{promoteChildren(item);project.categories=project.categories.filter(c=>c.id!==item.id)});pagesDialog();
   };
 };
}
function newCategory(parent=''){
 const item={id:uid(),kind:'category',name:''};
 destinationDialog(item,()=>{(project.categories??=[]).push(item)},()=>pagesDialog(item.id),parent);
}
const expandedTrees=new Map();
function pagesDialog(reveal=''){
 if(typeof reveal!=='string')reveal='';
 const tree=projectTree(project);
 if(!expandedTrees.has(activeFileId))expandedTrees.set(activeFileId,new Set());
 const expanded=expandedTrees.get(activeFileId);
 for(const item of tree.paths.get(reveal||pageId)||[]){if(item.id!==(reveal||pageId))expanded.add(item.id)}
 modal('Screens & windows','<div class="treeTools">'+btn('new-category','New category','plus')+btn('blank','New screen','page')+
   btn('new-window','New window','window')+'</div>'+field('Find in this tree','<input id="treeSearch" type="search" placeholder="Screen, window, category or trigger">')+
   '<div class="destinationTree" id="destinationTree"></div><div class="dialogActions">'+btn('find-project','Find in project','search')+
   btn('save-screen-template','Save template','library')+btn('page-settings','Edit current')+'</div>',true);
 const list=$('#destinationTree'),input=$('#treeSearch');
 function draw(){
   const term=input.value.trim().toLowerCase();
   function row(item,depth,showAll){
     const match=!term||showAll||item.name.toLowerCase().includes(term);
     const open=Boolean(term)||expanded.has(item.id);
     const children=tree.children.get(item.id)||[];
     const triggers=(item.nodes||[]).filter(n=>n.actions.length);
     let inside='';
     if(open){
       inside=children.map(child=>row(child,depth+1,match)).join('');
       for(const n of triggers){
         if(!match&&![n.name,...n.actions.map(a=>triggerLabels[a.action]+' '+(tree.byId.get(a.target)?.name||a.message||''))].some(x=>x.toLowerCase().includes(term)))continue;
         inside+='<button class="treeTrigger" style="--depth:'+(depth+1)+'" data-trigger-page="'+item.id+'" data-trigger-layer="'+n.id+'">'+icon('triggers',14)+esc(n.name)+' · '+n.actions.length+' '+(n.actions.length===1?'trigger':'triggers')+'</button>';
       }
     }
     if(!match&&!inside)return '';
     const canOpen=children.length||triggers.length||item.kind==='category';
     const category=item.kind==='category';
     return '<div class="treeRow" style="--depth:'+depth+'">'+(canOpen?'<button class="treeChevron" aria-expanded="'+open+'" aria-label="'+(open?'Collapse ':'Expand ')+esc(item.name)+'" data-fold="'+item.id+'">'+icon(open?'down':'right',14)+'</button>':'<span class="treeSpacer"></span>')+
       '<button type="button" class="treeName" '+(category?'data-fold':'data-page')+'="'+item.id+'"'+(item.id===pageId?' aria-current="page"':'')+'>'+icon(category?'library':item.kind==='window'?'window':'page',16)+'<span>'+esc(tree.displayName(item))+'</span></button>'+
       '<button class="treeEdit" data-organize="'+item.id+'" aria-label="Organize '+esc(item.name)+'" title="Rename, move or view code">•••</button></div>'+inside;
   }
   list.innerHTML=(tree.children.get('')||[]).map(item=>row(item,0,false)).join('')||'<p class="hint">No matching items.</p>';
 }
 list.onclick=e=>{
   const b=e.target.closest('button');if(!b)return;
   if(b.dataset.fold){const id=b.dataset.fold;if(expanded.has(id))expanded.delete(id);else expanded.add(id);draw()}
   if(b.dataset.organize)destinationDialog(tree.byId.get(b.dataset.organize));
   if(b.dataset.triggerLayer){
     tab='Triggers';choosePage(b.dataset.triggerPage);selectIds([b.dataset.triggerLayer]);if(innerWidth<=850)$('#library').classList.add('shown');
   }
 };
 $('.dialog [data-cmd=new-category]').onclick=()=>newCategory();
 $('.dialog [data-cmd=new-window]').onclick=()=>createDestinations(makePage('New window','window'));
 input.oninput=draw;draw();
}
