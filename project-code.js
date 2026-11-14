'use strict';

function codeSlug(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48)||'item';
}
// A page controls its layer order. Groups and individual components can live in their own files.
function projectSources(p) {
  const encode=value=>JSON.stringify(value,null,2);
  const files=new Map(), tags=[];
  function script(path,body){files.set(path,body+'\n');tags.push('<script src="./'+path+'"></script>')}
  script('shared/runtime.js',runtimeCode());
  const {pages,templates,...settings}=p;
  script('project.js','const studioProject = '+encode({...settings,pages:[]})+';\nconst studioLayers = new Map();');
  for(const pg of pages){
    const dir='screens/'+codeSlug(pg.name)+'-'+pg.id;
    const bundles=new Map();
    for(const n of pg.nodes){const id=n.group||n.id;if(!bundles.has(id))bundles.set(id,[]);bundles.get(id).push(n)}
    for(const [id,nodes] of bundles){
      const title=nodes[0].group?(nodes[0].groupName||'Group'):nodes[0].name;
      const path=dir+'/components/'+codeSlug(title)+'-'+codeSlug(id)+'.js';
      script(path,'for (const layer of '+encode(nodes)+') studioLayers.set(layer.id, layer);');
    }
    const {nodes,...props}=pg;
    script(dir+'/screen.js','studioProject.pages.push({\n  ...'+encode(props)+',\n  nodes: '+encode(nodes.map(n=>n.id))+'.map(id => studioLayers.get(id))\n});');
  }
  script('start.js','runtime(studioProject, "design", '+encode(pages.find(pg=>pg.kind==='screen').id)+', null);');
  files.set('index.html',runtimeHead(p)+tags.join('\n')+'\n</body></html>');
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
function downloadSources(){
  const zip=sourceZip(projectSources(project));download(zip,codeSlug(project.name)+'-source.zip','application/zip');toast('Project source downloaded');
}
function codeBrowser(initial=pageId){
  const pg=project.pages.find(q=>q.id===initial)||page();
  const files=projectSources(project),prefix='screens/'+codeSlug(pg.name)+'-'+pg.id+'/';
  const fileList=[prefix+'screen.js',...[...files.keys()].filter(path=>path.startsWith(prefix+'components/')),'project.js','shared/runtime.js','start.js','index.html'];
  modal('Project code',field('Screen or window','<select id="codePage">'+options(project.pages.map(q=>[q.id,q.name]),pg.id)+'</select>')+field('Code file','<select id="codePath">'+options(fileList.map(path=>[path,path===prefix+'screen.js'?'Screen code':path.replace(prefix,'')]),fileList[0])+'</select>')+field('Selected file','<textarea readonly id="projectSource" rows="9" spellcheck="false"></textarea>')+'<p>Screen and component files connect automatically through the project. Select a layer in the editor to change its code.</p><div class="fileActions">'+btn('open-code-layer','Edit selected code')+btn('add-code-block','Add code block')+btn('source-zip','Download source ZIP','export','btn primary')+'</div>',true);
  const area=$('#projectSource'),file=$('#codePath'),edit=$('[data-cmd=open-code-layer]');
  function display(){area.value=files.get(file.value);area.select();area.scrollTop=0;edit.disabled=!file.value.startsWith(prefix);}
  file.onchange=display;$('#codePage').onchange=e=>codeBrowser(e.target.value);
  edit.onclick=()=>{
    const path=file.value;choosePage(pg.id);const nodes=pg.nodes.filter(n=>path.endsWith('-'+codeSlug(n.group||n.id)+'.js'));selectIds(nodes.map(n=>n.id));mode='code';drawProps();if(innerWidth<=850)$('#inspector').classList.add('shown');selectCode();
  };
  $('[data-cmd=add-code-block]').onclick=()=>{
    choosePage(pg.id);modal('Add code block',field('Block name','<input id="blockName" placeholder="e.g. Sidebar">')+field('HTML and CSS','<textarea id="blockHTML" rows="8" spellcheck="false">&lt;aside&gt;Sidebar&lt;/aside&gt;</textarea>')+'<div class="dialogActions">'+btn('commit-code-block','Insert block','','btn primary')+'</div>');
    $('[data-cmd=commit-code-block]').onclick=()=>{const name=$('#blockName').value.trim(),html=$('#blockHTML').value.trim();if(!name||!html){toast('Enter a block name and code.');return}insertNode(node('Custom',name,[20,20,220,100],{html}));};
  };
  display();
}
