'use strict';
function pageCaption(pg){
 const matches=project.pages.filter(p=>p.kind===pg.kind&&p.name===pg.name);
 return matches.length>1?pg.name+' ('+(matches.indexOf(pg)+1)+' of '+matches.length+')':pg.name;
}
function deleteDestination(id){
 const pg=project.pages.find(p=>p.id===id);
 if(!pg)return;
 if(pg.kind==='screen'&&project.pages.filter(p=>p.kind==='screen').length===1){toast('Keep one screen in the project.');return}
 const removed=new Set([id,...pg.nodes.map(n=>n.id)]);
 const hits=a=>removed.has(a.target)||removed.has(a.source)||a.fields?.some(f=>removed.has(f));
 const survivors=project.pages.filter(p=>p!==pg);
 const layers=survivors.flatMap(p=>p.nodes);
 const count=layers.reduce((n,l)=>n+l.actions.filter(hits).length,0);
 modal('Delete '+pg.kind+'?', '<p>Remove <strong>'+esc(pageCaption(pg))+'</strong> and its '+pg.nodes.length+' layers? '+count+' linked actions on other screens or windows will also be removed. Undo restores this edit.</p><div class="dialogActions">'+btn('pages','Cancel')+'<button class="btn" id="confirmPageRemoval">Delete '+pg.kind+'</button></div>');
 $('#confirmPageRemoval').onclick=()=>{
   change(()=>{project.pages=survivors;for(const layer of layers){layer.actions=layer.actions.filter(a=>!hits(a));if(removed.has(layer.picker?.footerButton))delete layer.picker.footerButton}
     if(pageId===id){pageId=survivors.find(p=>p.kind==='screen').id;selected=[];pan=[0,0];zoomFactor=1}
   });pagesDialog();
 };
}
function bindPanels(){
 const panel=$('#inspector'),main=document.querySelector('main'),handle=$('#grip'),lib=$('#library');
 function alignGrip(){
   const r=panel.getBoundingClientRect();
   handle.hidden=r.width===0;handle.style.left=(r.left-5)+'px';handle.style.top=r.top+'px';handle.style.height=r.height+'px';
 }
 function widen(width){
   main.style.setProperty('--panel-size',Math.min(innerWidth-18,Math.max(216,width))+'px');
   panel.classList.add('floatingInspector','shown');alignGrip();
 }
 handle.onpointerdown=e=>{handle.setPointerCapture(e.pointerId);e.preventDefault()};
 handle.onpointermove=e=>{if(handle.hasPointerCapture(e.pointerId))widen(innerWidth-e.clientX)};
 handle.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();widen(panel.offsetWidth+(e.key==='ArrowLeft'?20:-20))}};
 new ResizeObserver(alignGrip).observe(panel);window.addEventListener('resize',alignGrip);
 const small=matchMedia('(max-width:850px)');
 small.addEventListener('change',e=>{if(e.matches&&!main.classList.contains('inspectorClosed'))panel.classList.add('shown');alignGrip()});
 function compact(on){
  main.classList.toggle('iconRail',on);$('#railToggle').setAttribute('aria-pressed',String(on));
  $('#railToggle').textContent=on?'Expand library':'Shrink library';
  if(on){tab='Insert';search='';render();lib.classList.remove('shown')}
 }
 $('#railToggle').onclick=()=>compact(!main.classList.contains('iconRail'));
 document.addEventListener('click',e=>{
   if(e.target.closest('[data-tab],#openLib')&&main.classList.contains('iconRail'))compact(false);
   if(e.target.closest('[data-tab]')&&innerWidth<=850)lib.classList.add('shown');
   if(e.target.closest('#openProps'))main.classList.toggle('inspectorClosed',!panel.classList.contains('shown'));
   if(e.target.closest('#dockPanel')){panel.classList.remove('floatingInspector','wideCode');main.style.removeProperty('--panel-size');syncCodeSize(false);alignGrip()}
 });
 alignGrip();
}
