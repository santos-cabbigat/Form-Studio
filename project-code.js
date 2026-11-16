'use strict';

function codeSlug(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48)||'item';
}
// A page controls its layer order. Groups and individual components can live in their own files.
function sourcePath(dir,n){
  const title=n.group?(n.groupName||'Group'):n.name;
  return dir+'/components/'+codeSlug(title)+'-'+(n.group||n.id)+'.js';
}
function screenDirectory(tree,pg){
  return 'screens/'+tree.paths.get(pg.id).map(item=>codeSlug(item.name)+'-'+item.id).join('/');
}
function exportScreen(p,start){
  return p.pages.find(pg=>pg.id===start&&pg.kind==='screen')||p.pages.find(pg=>pg.kind==='screen');
}
function handoffText(p,start){
  const text=['# '+p.name,'','Extract this entire ZIP to a folder, then double-click index.html. The website opens offline in your browser. Keep index.html with the accompanying files and folders. Resize the browser window to see the laptop, tablet and phone layouts. Large screens load a bundled preview. Open source.html when editing individual screen or component scripts so the browser loads your changed files directly. Both entry points load your logic.js. To continue designing, use Files → Import JSON in Form Studio and select design.studio.json. That file includes your templates and device layouts.','','## Connect your logic','','Keep your own code in logic.js. The exported index loads it on startup. Save a copy of your edited logic.js before replacing a previous export, then carry it into the new folder. Form Studio imports visual project JSON; edits made directly in the exported JavaScript stay in your source files.','','An explicitly configured Developer action emits formstudio:action. Its detail contains name, screenId, layerId and event. Connect computation, authentication or a real save in your own code. Built-in sample rows and preview values last for one run.','','Starting screen: '+exportScreen(p,start).name,''];
  const tree=projectTree(p),byId=new Map();
  for(const pg of p.pages){byId.set(pg.id,pg.name);for(const n of pg.nodes)byId.set(n.id,pg.name+' / '+n.name)}
  const ref=id=>byId.get(id)||('unresolved '+id);
  for(const pg of p.pages){
    const dir=screenDirectory(tree,pg);
    text.push('## '+tree.caption(pg)+' ('+pg.kind+')','Screen file: '+dir+'/screen.js');
    if(pg.devNote)text.push('Developer note: '+pg.devNote);
    for(const n of pg.nodes){
      if(!n.devNote&&!n.actions.length)continue;
      text.push('','### '+n.name+' ['+n.id+']','Component file: '+sourcePath(dir,n));
      if(n.devNote)text.push('Developer note: '+n.devNote);
      for(const a of n.actions){
        const details=[a.delayMs?'wait '+a.delayMs/1000+' s':'',a.durationMs!==undefined?'fade '+a.durationMs/1000+' s':'',a.key,a.source?'from '+ref(a.source):'',a.target?'to '+ref(a.target):'',a.fields?.length?'fields '+a.fields.map(id=>id?ref(id):'(empty)').join(', '):'',a.operation,a.message].filter(Boolean);
        text.push('- '+a.event+' → '+a.action+(details.length?' · '+details.join(' · '):''));
      }
    }
    text.push('');
  }
  return text.join('\n');
}
function starterLogic(){
  return "// Add your application logic here. This file loads before the first screen.\n"+
    "// In Form Studio, attach a Developer action and give it a name, e.g. calculate-total.\n"+
    "document.addEventListener('formstudio:action', event => {\n"+
    "  const {name, screenId, layerId} = event.detail;\n"+
    "  // Connect your named action to a function here.\n"+
    "});\n";
}
function projectSources(p,start,includeHandoff=true) {
  const encode=value=>JSON.stringify(value,null,2);
  const files=new Map(), tags=[],screenFiles=new Map(),tree=projectTree(p);
  function script(path,body){files.set(path,body+'\n');tags.push('<script src="./'+path+'"></script>')}
  script('shared/runtime.js',runtimeCode());
  const {pages,templates,...settings}=p;
  script('project.js','const studioProject = '+encode({...settings,pages:[]})+';\nconst studioLayers = new Map();');
  for(const pg of pages){
    const dir=screenDirectory(tree,pg);
    const bundles=new Map();
    for(const n of pg.nodes){const id=n.group||n.id;if(!bundles.has(id))bundles.set(id,[]);bundles.get(id).push(n)}
    const calls=[],bundle=[];
    for(const nodes of bundles.values()){
      const path=sourcePath(dir,nodes[0]);
      const body='for (const layer of '+encode(nodes)+') studioLayers.set(layer.id, layer);';
      files.set(path,body+'\n');calls.push(path);bundle.push(body);
    }
    const {nodes,...props}=pg;
    const screenPath=dir+'/screen.js',screenBody='studioProject.pages.push({\n  ...'+encode(props)+',\n  nodes: '+encode(nodes.map(n=>n.id))+'.map(id => studioLayers.get(id))\n});';
    files.set(screenPath,screenBody+'\n');calls.push(screenPath);bundle.push(screenBody);
    if(includeHandoff&&calls.length>40){
      const bundled=dir+'/preview.js';files.set(bundled,bundle.join('\n')+'\n');
      screenFiles.set(pg.id,{calls,preview:[bundled]});
    }else screenFiles.set(pg.id,{calls,preview:calls});
  }
  const authorTags=[...tags],runTags=[...tags];
  const tag=path=>'<script src="./'+path+'"></script>';
  for(const screen of screenFiles.values()){authorTags.push(...screen.calls.map(tag));runTags.push(...screen.preview.map(tag))}
  tags.length=0;
  script('logic.js',starterLogic());
  if(includeHandoff){
    files.set('design.studio.json',encode(p));
    files.set('HANDOFF.md',handoffText(p,start));
  }
  script('start.js','runtime(studioProject, "design", '+encode(exportScreen(p,start).id)+', null);');
  const head=runtimeHead(p),tail='\n</body></html>';
  files.set('index.html',head+[...runTags,...tags].join('\n')+tail);
  if(includeHandoff)files.set('source.html',head+[...authorTags,...tags].join('\n')+tail);
  return files;
}
// ZIP method 0 keeps the source readable and allows offline exports without loading a library.
function sourceZip(files) {
  const encoder=new TextEncoder(),chunks=[],directory=[];
  let position=0,directoryBytes=0;
  function header(bytes,signature){const data=new Uint8Array(bytes),view=new DataView(data.buffer);view.setUint32(0,signature,true);return {data,u16:(i,v)=>view.setUint16(i,v,true),u32:(i,v)=>view.setUint32(i,v,true)}}
  function crc(bytes){let sum=-1;for(const byte of bytes){sum^=byte;for(let bit=0;bit<8;bit++)sum=(sum>>>1)^((sum&1)?0xedb88320:0)}return (sum^-1)>>>0}
  for(const [path,source] of files){
    const name=encoder.encode(path),body=encoder.encode(source),check=crc(body);
    const local=header(30,0x04034b50);local.u16(4,20);local.u16(6,0x800);local.u16(12,33);local.u32(14,check);local.u32(18,body.length);local.u32(22,body.length);local.u16(26,name.length);
    const item=header(46,0x02014b50);item.u16(4,20);item.u16(6,20);item.u16(8,0x800);item.u16(14,33);item.u32(16,check);item.u32(20,body.length);item.u32(24,body.length);item.u16(28,name.length);item.u32(42,position);
    chunks.push(local.data,name,body);directory.push(item.data,name);directoryBytes+=46+name.length;position+=30+name.length+body.length;
  }
  const end=header(22,0x06054b50);end.u16(8,files.size);end.u16(10,files.size);end.u32(12,directoryBytes);end.u32(16,position);
  return new Blob([...chunks,...directory,end.data],{type:'application/zip'});
}
let sourceExportRunning=false;
async function downloadSources(){
  if(sourceExportRunning){toast('Preparing your source ZIP');return}
  const model=project,start=pageId,filename=codeSlug(model.name)+'-source.zip';sourceExportRunning=true;
  let worker,url;
  try{
    let zip;
    if(window.Worker&&model.pages.reduce((sum,pg)=>sum+pg.nodes.length,0)>=150){
      toast('Preparing your source ZIP');
      const defs=[projectTree,screenDirectory,codeSlug,sourcePath,exportScreen,starterLogic,handoffText,esc,runtimeHead,projectSources,sourceZip].map(fn=>'const '+fn.name+' = '+fn.toString()+';');
      defs.push('const nativeCSS='+JSON.stringify(nativeCSS)+';','const pickerCSS='+JSON.stringify(pickerCSS)+';','const runtimeCode=()=>'+JSON.stringify(runtimeCode())+';');
      defs.push('onmessage=e=>{try{postMessage(sourceZip(projectSources(e.data.model,e.data.start)))}catch(err){postMessage({error:err.message})}};');
      url=URL.createObjectURL(new Blob([defs.join('\n')],{type:'text/javascript'}));
      worker=new Worker(url);
      zip=await new Promise((resolve,reject)=>{worker.onmessage=e=>e.data?.error?reject(Error(e.data.error)):resolve(e.data);worker.onerror=e=>reject(Error(e.message||'Could not prepare ZIP.'));worker.postMessage({model,start})});
    }else zip=sourceZip(projectSources(model,start));
    download(zip,filename,'application/zip');toast('Project source downloaded');
  }catch(e){toast('Source export failed. '+e.message)}finally{worker?.terminate();if(url)URL.revokeObjectURL(url);sourceExportRunning=false}
}
function codeBrowser(initial=pageId,grouped=false){
  const tree=projectTree(project),item=tree.byId.get(initial)||page();
  const files=projectSources(project,pageId,false),fileOwners=new Map();
  const branch=tree.ordered.filter(q=>q.kind!=='category'&&tree.paths.get(q.id).includes(item));
  for(const pg of branch){
    const dir=screenDirectory(tree,pg);
    for(const n of pg.nodes)fileOwners.set(sourcePath(dir,n),pg);
    fileOwners.set(dir+'/screen.js',pg);
  }
  const codePage=tree.ordered.map(q=>[q.id,tree.caption(q)+(q.kind==='category'?' (category)':'')]);
  const labels=[['@group','Grouped code · '+branch.length+' '+(branch.length===1?'screen or window':'screens and windows')]];
  for(const [path,pg] of fileOwners){
    const file=path.slice(screenDirectory(tree,pg).length+1);
    labels.push([path,(branch.length>1?tree.caption(pg)+' / ':'')+(file==='screen.js'?'Screen code':file)]);
  }
  for(const path of ['project.js','shared/runtime.js','logic.js','start.js','index.html'])labels.push([path,path]);
  const selected=grouped||item.kind==='category'?'@group':screenDirectory(tree,item)+'/screen.js';
  modal('Project code',field('Category, screen or window','<select id="codePage">'+options(codePage,item.id)+'</select>')+
    field('Code file','<select id="codePath">'+options(labels,selected)+'</select>')+field('Selected code','<textarea readonly id="projectSource" rows="9" spellcheck="false"></textarea>')+
    '<p class="hint">Grouped code includes the screens, windows, layers and triggers in this branch.</p><div class="fileActions">'+
    btn('copy-branch','Copy code','code')+btn('download-branch','Download grouped code','export')+btn('open-code-layer','Edit selected code')+
    btn('add-code-block','Add code block')+btn('source-zip','Download source ZIP','export','btn primary')+'</div>',true);
  const area=$('#projectSource'),file=$('#codePath'),edit=$('[data-cmd=open-code-layer]');
  const save=$('[data-cmd=download-branch]'),add=$('[data-cmd=add-code-block]');
  function display(){
    const combined=file.value==='@group';
    area.value=combined?[...fileOwners.keys()].map(path=>'// '+path+'\n'+files.get(path)).join('\n'):files.get(file.value);
    area.scrollTop=0;edit.disabled=!fileOwners.has(file.value);add.disabled=item.kind==='category';
    save.hidden=!combined;save.disabled=!branch.length;
    $('[data-cmd=copy-branch]').disabled=!area.value;
  }
  file.onchange=display;$('#codePage').onchange=e=>codeBrowser(e.target.value);
  $('[data-cmd=copy-branch]').onclick=async()=>{
    try{await navigator.clipboard.writeText(area.value);toast('Code copied')}
    catch{area.select();toast('Code selected. Use Copy to copy it.')}
  };
  save.onclick=()=>download(area.value,codeSlug(item.name)+'-group.js','text/javascript');
  edit.onclick=()=>{
    const path=file.value,pg=fileOwners.get(path);if(!pg)return;
    choosePage(pg.id);const dir=screenDirectory(tree,pg);
    selectIds(pg.nodes.filter(n=>sourcePath(dir,n)===path).map(n=>n.id));mode='code';drawProps();if(innerWidth<=850)$('#inspector').classList.add('shown');
  };
  $('[data-cmd=add-code-block]').onclick=()=>{
    choosePage(item.id);modal('Add code block',field('Block name','<input id="blockName" placeholder="e.g. Sidebar">')+field('HTML and CSS','<textarea id="blockHTML" rows="8" spellcheck="false">&lt;aside&gt;Sidebar&lt;/aside&gt;</textarea>')+'<div class="dialogActions">'+btn('commit-code-block','Insert block','','btn primary')+'</div>');
    $('[data-cmd=commit-code-block]').onclick=()=>{const name=$('#blockName').value.trim(),html=$('#blockHTML').value.trim();if(!name||!html){toast('Enter a block name and code.');return}insertNode(node('Custom',name,[20,20,220,100],{html}));};
  };
  display();
}
