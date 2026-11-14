'use strict';

let referencePick = null;

function referenceContext() {
  return [pageId, device, ...selected].join('|');
}
function endReferencePick() {
  if (!referencePick) return;
  referencePick = null;
  const stage = $('#stage');
  stage.classList.remove('pickingReference');
  $('#referenceNotice')?.remove();
  $('#referenceArea')?.remove();
  stage.removeEventListener('pointerdown', referenceDown, true);
  stage.removeEventListener('pointermove', referenceMove, true);
  stage.removeEventListener('pointerup', referenceUp, true);
  stage.removeEventListener('pointercancel', cancelReference, true);
  document.removeEventListener('keydown', referenceKey, true);
}
function cancelReference() {
  const pending = referencePick;
  endReferencePick();
  if (pending && referenceContext()===pending.context) arrangeDialog(pending.previous);
}
function referenceKey(event) {
  if (event.key==='Escape') {
    event.preventDefault(); event.stopImmediatePropagation(); cancelReference();
  }
}
function referencePoint(event) {
  const r = $('#sheet').getBoundingClientRect();
  return [event.clientX-r.left,event.clientY-r.top].map((value,i)=>
    Math.round(Math.max(0,Math.min(value,i?r.height:r.width))/scale));
}
function areaBox(a,b) {
  return [Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.abs(a[0]-b[0]),Math.abs(a[1]-b[1])];
}
function drawReferenceArea(point) {
  const box=areaBox(referencePick.first,point);
  let area=$('#referenceArea');
  if (!area) {
    area=document.createElement('div');area.id='referenceArea';$('#sheet').append(area);
  }
  position(area,[box[0],box[1],Math.max(3/scale,box[2]),Math.max(3/scale,box[3])]);
}
function hitReferences(event) {
  const found = new Set(), selectedIDs=new Set(selected);
  const nodes = [];
  for(const el of document.elementsFromPoint(event.clientX,event.clientY)) {
    const wrap=el.closest('.nodeWrap');
    if (!wrap || found.has(wrap.dataset.id) || selectedIDs.has(wrap.dataset.id)) continue;
    found.add(wrap.dataset.id);
    const n=page().nodes.find(n=>n.id===wrap.dataset.id);
    if(n) nodes.push(n);
  }
  return nodes;
}
function startReferencePick(kind,previous=null,quick=false) {
  if (!selected.length) return;
  endReferencePick();
  dismiss();closeSide();
  const stage=$('#stage');
  referencePick={kind,previous,quick,context:referenceContext(),first:null,pointer:null,hasFirstTap:false,overlaps:[]};
  const notice=document.createElement('div');
  notice.id='referenceNotice';
  notice.innerHTML='<span role="status"></span><div class="referenceOptions"></div><button type="button">Cancel</button>';
  notice.querySelector('span').textContent = kind==='area'?'Tap two opposite corners, or drag around the area.':
    quick?'Tap the shape to center in.':'Tap the object whose bounds you want to use.';
  notice.lastElementChild.onclick=cancelReference;
  stage.append(notice);stage.classList.add('pickingReference');
  stage.addEventListener('pointerdown',referenceDown,true);
  stage.addEventListener('pointermove',referenceMove,true);
  stage.addEventListener('pointerup',referenceUp,true);
  stage.addEventListener('pointercancel',cancelReference,true);
  document.addEventListener('keydown',referenceKey,true);
}
function acceptReference(ref) {
  const pending=referencePick;
  if (!pending || pending.context!==referenceContext()) {endReferencePick();return}
  const box=referenceBox(ref);
  if(!box){cancelReference();return}
  endReferencePick();
  if(pending.quick) {
    const items=arrangeItems();
    const whole={members:items.flatMap(i=>i.members),box:enclosingBox(items.map(i=>i.box))};
    const {delta}=arrangeOffsets([whole],0,'center',box)[0];
    if(delta)change(()=>whole.members.forEach(m=>moveArrangedMember(m,0,delta)));
    toast('Centered horizontally in '+ref.label);
  } else arrangeDialog(ref);
}
function referenceBox(ref) {
  if(!ref)return null;
  if(ref.kind==='area')return ref.box;
  const node=page().nodes.find(n=>n.id===ref.id);
  return node ? boxFor(node,device,project,page()) : null;
}
function finishPickAt(event) {
  if(referencePick.kind==='element') {
    const nodes=hitReferences(event);
    if(nodes.length===1)acceptReference({kind:'element',id:nodes[0].id,label:nodes[0].name});
    else {
      const notice=$('#referenceNotice');
      notice.querySelector('span').textContent=nodes.length?'Choose the reference layer at that point.':'Tap another object, or choose Mark an area.';
      const choices=notice.querySelector('.referenceOptions');choices.replaceChildren();
      for(const n of nodes){const b=document.createElement('button');b.textContent=n.name;b.onclick=()=>acceptReference({kind:'element',id:n.id,label:n.name});choices.append(b)}
      if(!nodes.length){const b=document.createElement('button');b.textContent='Mark an area';b.onclick=()=>startReferencePick('area',referencePick.previous,referencePick.quick);choices.append(b)}
    }
  } else {
    const box=areaBox(referencePick.first,referencePoint(event));
    if(box[2]>=2 && box[3]>=2)acceptReference({kind:'area',box,label:'marked area'});
    else $('#referenceNotice span').textContent='Tap the diagonally opposite corner.';
  }
}
function referenceDown(event) {
  if(event.target.closest('#referenceNotice')){event.stopPropagation();return}
  event.preventDefault();event.stopImmediatePropagation();
  if(event.button!==0 || !$('#sheet').contains(event.target) || referencePick.pointer!==null)return;
  referencePick.pointer=event.pointerId;
  if(referencePick.kind==='area'&&!referencePick.first)referencePick.first=referencePoint(event);
  $('#stage').setPointerCapture(event.pointerId);
}
function referenceMove(event) {
  if(event.target.closest('#referenceNotice'))return;
  event.stopImmediatePropagation();
  if(referencePick.kind==='area'&&referencePick.first)drawReferenceArea(referencePoint(event));
}
function referenceUp(event) {
  if(event.target.closest('#referenceNotice')){event.stopPropagation();return}
  event.preventDefault();event.stopImmediatePropagation();
  if(referencePick.pointer!==event.pointerId)return;
  referencePick.pointer=null;
  if(referencePick.kind==='area'&&!referencePick.hasFirstTap){
    const box=areaBox(referencePick.first,referencePoint(event));
    if(Math.max(box[2],box[3])*scale<6){referencePick.hasFirstTap=true;drawReferenceArea(referencePick.first);$('#referenceNotice span').textContent='Tap the diagonally opposite corner.';return}
  }
  finishPickAt(event);
}
