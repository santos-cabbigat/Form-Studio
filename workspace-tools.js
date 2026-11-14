'use strict';

function findInProject(){
  modal('Find in project',field('Screen, window or layer','<input id="findProject" type="search" placeholder="e.g. Ledger, Save or month picker">')+'<div id="findResults" class="fileList"></div><p class="hint" id="findCount" role="status"></p>');
  const input=$('#findProject'),list=$('#findResults');
  const entries=[];
  for(const pg of project.pages){
    entries.push({pg,title:pg.name,kind:cap(pg.kind)});
    for(const n of pg.nodes)entries.push({pg,n,title:n.name,kind:n.variant||n.type});
  }
  function show(){
    const term=input.value.trim().toLowerCase();let count=0;const visible=[];
    for(const row of entries){
      if(!term&&row.n)continue;
      if(term&&![row.title,row.kind,row.n?.text,row.pg.name].some(v=>v?.toLowerCase().includes(term)))continue;
      if(++count<=60)visible.push(row);
    }
    list.innerHTML=visible.map((r,i)=>'<button class="fileRow" data-jump="'+i+'"><span>'+esc(r.title)+'</span><small>'+esc(r.n?r.pg.name+' · '+r.kind:r.kind)+'</small></button>').join('');
    $('#findCount').textContent=count>60?'Showing 60 of '+count+' matches. Type more to narrow the list.':count?count+' '+(count===1?'match':'matches'):'No matches.';
    list.onclick=e=>{const b=e.target.closest('[data-jump]');if(!b)return;const r=visible[Number(b.dataset.jump)];choosePage(r.pg.id);if(r.n)toggleLayers(r.n,false);if(innerWidth<=850&&r.n)$('#inspector').classList.add('shown')};
  }
  input.oninput=show;input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();list.querySelector('button')?.click()}};show();input.focus();
}
function layerCommands(){
  const layers=selectedLayers(),hasSelection=selected.length>0;
  if(!hasSelection)return '';
  return '<div class="layerCommands">'+btn('duplicate-layers','Duplicate','layers','btn smallBtn')+
    btn('lock-layers',layers.every(n=>n.locked)?'Unlock on canvas':'Lock on canvas','','btn smallBtn')+
    btn('hide-layers',layers.every(n=>n.hide?.[device])?'Show on '+device:'Hide on '+device,'','btn smallBtn')+'</div>';
}
function layerAction(action){
  if(!selected.length)return;
  const layers=selectedLayers();
  if(action==='lock-layers'){
    const lock=!layers.every(n=>n.locked);
    change(()=>{for(const n of layers)n.locked=lock},lock?'Locked on canvas':'Unlocked on canvas');return;
  }
  if(action==='hide-layers'){
    const hide=!layers.every(n=>n.hide?.[device]);
    change(()=>{for(const n of layers)n.hide={...n.hide,[device]:hide}},(hide?'Hidden':'Visible')+' on '+device);return;
  }
  const ids=new Map(layers.map(n=>[n.id,uid()])),groups=new Map();
  const copies=layers.map(n=>{
    const c=clone(n);c.id=ids.get(n.id);c.name=n.name+' copy';delete c.locked;
    if(c.group){if(!groups.has(c.group))groups.set(c.group,uid());c.group=groups.get(c.group)}
    if(c.picker?.footerButton)c.picker.footerButton=ids.get(c.picker.footerButton)||c.picker.footerButton;
    for(const a of c.actions){if(ids.has(a.target))a.target=ids.get(a.target);if(ids.has(a.source))a.source=ids.get(a.source);if(a.fields)a.fields=a.fields.map(id=>ids.get(id)||id)}
    for(const b of Object.values(c.boxes)){b[0]+=12;b[1]+=12}
    return c;
  });
  change(()=>{page().nodes.push(...copies);selected=copies.map(n=>n.id)},'Selection duplicated');
}
function notesPanel(){
  if(selected.length>1)return '';
  const target=selected.length?sel():page();
  return '<div class="part"><h3>Developer note</h3>'+field('What should this '+(selected.length?'layer':page().kind)+' do later?','<textarea data-dev-note rows="3" placeholder="e.g. Calculate the total after discount">'+esc(target.devNote||'')+'</textarea>')+'</div>';
}

function mergeDesign(destination,source){
  const incoming=clone(validateImport(source));
  const used=new Set(),layoutIDs=new Map(),groupIDs=new Map(),sharedIDs=new Map();
  const collect=n=>[n.id,n.group,n.sharedComponent,n.picker?.footerButton,...n.actions.flatMap(a=>[a.target,a.source,...(a.fields||[])])].filter(Boolean).forEach(id=>used.add(id));
  for(const p of [destination,incoming]){
    for(const pg of p.pages){used.add(pg.id);pg.nodes.forEach(collect)}
    for(const t of p.templates){used.add(t.id);if(t.node)collect(t.node);if(t.layout){used.add(t.layout.id);t.layout.nodes.forEach(collect)}}
  }
  function fresh(){let id;do{id=uid()}while(used.has(id));used.add(id);return id}
  function mapped(map,id){if(!id)return id;if(!map.has(id))map.set(id,fresh());return map.get(id)}
  const link=id=>mapped(layoutIDs,id);
  function action(a){
    if(a.target)a.target=link(a.target);
    if(a.source)a.source=link(a.source);
    if(a.fields)a.fields=a.fields.map(link);
  }
  function layer(n){
    n.id=link(n.id);
    if(n.group)n.group=mapped(groupIDs,n.group);
    if(n.sharedComponent)n.sharedComponent=mapped(sharedIDs,n.sharedComponent);
    if(n.picker?.footerButton)n.picker.footerButton=link(n.picker.footerButton);
    n.actions.forEach(action);
  }
  function pageLayout(pg){pg.id=link(pg.id);pg.nodes.forEach(layer)}
  incoming.pages.forEach(pageLayout);
  for(const t of incoming.templates){
    t.id=fresh();if(t.layout)pageLayout(t.layout);
    if(t.node)layer(t.node);if(t.action)action(t.action);
  }
  destination.pages.push(...incoming.pages);destination.templates.push(...incoming.templates);
  for(const color of incoming.palette)if(!destination.palette.includes(color))destination.palette.push(color);
  return incoming.pages.find(pg=>pg.kind==='screen').id;
}
function mergeDialog(){
  modal('Add another project',field('Choose an editable project JSON','<input id="mergeFile" type="file" accept=".json,application/json">')+
    '<p class="hint">Adds its screens, windows, templates and palette colors to this project. Imported screens use this project’s theme and device widths. Undo removes the whole import.</p><p id="mergeStatus" role="status"></p><div class="dialogActions">'+btn('files','Cancel')+btn('commit-merge','Add to this project','','btn primary')+'</div>');
  const file=$('#mergeFile'),status=$('#mergeStatus'),apply=$('[data-cmd=commit-merge]');let incoming=null,reading=0;
  apply.disabled=true;
  file.onchange=async()=>{
    const current=++reading,f=file.files[0];incoming=null;apply.disabled=true;status.textContent='';
    if(!f)return;
    try{
      const source=validateImport(JSON.parse(await f.text()));if(current!==reading||!file.isConnected)return;
      incoming=source;status.textContent=source.name+' · '+source.pages.length+' screens and windows · '+source.templates.length+' templates';apply.disabled=false;
    }catch(e){if(current===reading)status.textContent=e.message}
  };
  apply.onclick=()=>{
    if(!incoming)return;
    if(!write())return;
    let start;change(()=>{start=mergeDesign(project,incoming)});choosePage(start);toast('Project added');
  };
}
