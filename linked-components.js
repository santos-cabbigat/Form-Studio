'use strict';

const sharedKeys=['name','text','labelParts','glyph','style','extraCSS','src','html','rows','choices','variant','inputType','requirement','emptyMessage','initialState','picker'];
function sharedProperties(n){
  const data={};
  for(const key of sharedKeys)if(n[key]!==undefined)data[key]=n[key];
  if(data.picker){data.picker={...data.picker};delete data.picker.footerButton}
  return JSON.stringify(data);
}
function linkedBeforeEdit(){
  return new Map(page().nodes.filter(n=>n.sharedComponent).map(n=>[n.id,sharedProperties(n)]));
}
function updateLinked(before){
  if(!before.size)return;
  const changed=project.pages.flatMap(pg=>pg.nodes).filter(n=>before.has(n.id)&&n.sharedComponent&&before.get(n.id)!==sharedProperties(n));
  for(const n of changed){
    const encoded=sharedProperties(n);if(before.get(n.id)===encoded)continue;
    const updated=JSON.parse(encoded),previous=JSON.parse(before.get(n.id));
    for(const other of project.pages.flatMap(p=>p.nodes)){
      if(other===n||other.sharedComponent!==n.sharedComponent)continue;
      for(const key of sharedKeys){
        if(JSON.stringify(updated[key])===JSON.stringify(previous[key]))continue;
        if(key==='picker'){const footer=other.picker?.footerButton;other.picker={...(updated.picker||{})};if(footer)other.picker.footerButton=footer}
        else if(updated[key]===undefined)delete other[key];else other[key]=clone(updated[key]);
      }
    }
  }
}
function linkedPart(){
  if(!selected.length)return '';
  const linked=selectedLayers().some(n=>n.sharedComponent);
  return '<div class="part"><h3>Shared component</h3>'+btn('link-copy','Place linked copy','group','btn full')+(linked?btn('unlink-component','Detach this copy','','chip'):'')+'</div>';
}
function placeLinked(){
  const source=selectedLayers();
  modal('Place linked copy',triggerSelect('linkTarget','Destination screen or window',treePageOptions().filter(([id])=>id!==pageId))+
    '<p>Changes to the content and appearance update every linked copy. Each screen keeps its own position and triggers.</p><div class="dialogActions">'+btn('dismiss','Cancel')+btn('place-linked','Place copy','','btn primary')+'</div>');
  $('[data-cmd=place-linked]').onclick=()=>{
    const dest=project.pages.find(p=>p.id===$('#linkTarget').value);
    if(!dest){toast('Choose another screen or window.');return}
    const ids=new Map(source.map(n=>[n.id,uid()])),groups=new Map();
    change(()=>{for(const n of source){
      n.sharedComponent||=uid();const copy=clone(n);copy.id=ids.get(n.id);
      if(n.group){if(!groups.has(n.group))groups.set(n.group,uid());copy.group=groups.get(n.group)}
      if(copy.picker?.footerButton)copy.picker.footerButton=ids.get(copy.picker.footerButton)||'';
      for(const a of copy.actions){if(ids.has(a.target))a.target=ids.get(a.target);if(ids.has(a.source))a.source=ids.get(a.source);if(a.fields)a.fields=a.fields.map(id=>ids.get(id)||id)}
      dest.nodes.push(copy);
    }});
    choosePage(dest.id);selectIds([...ids.values()]);toast('Linked copy placed');
  };
}
