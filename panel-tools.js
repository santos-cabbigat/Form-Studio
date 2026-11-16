'use strict';
function deleteDestination(id){
 const pg=project.pages.find(p=>p.id===id);
 if(!pg)return;
 if(pg.kind==='screen'&&project.pages.filter(p=>p.kind==='screen').length===1){toast('Keep one screen in the project.');return}
 const removed=new Set([id,...pg.nodes.map(n=>n.id)]);
 const hits=a=>removed.has(a.target)||removed.has(a.source)||a.fields?.some(f=>removed.has(f));
 const survivors=project.pages.filter(p=>p!==pg);
 const layers=survivors.flatMap(p=>p.nodes);
 const count=layers.reduce((n,l)=>n+l.actions.filter(hits).length,0);
 modal('Delete '+pg.kind+'?', '<p>Remove <strong>'+esc(projectTree(project).caption(pg))+'</strong> and its '+pg.nodes.length+' layers? '+count+' linked actions on other screens or windows will also be removed. Any items grouped under it move up one level. Undo restores this edit.</p><div class="dialogActions">'+btn('pages','Cancel')+'<button class="btn" id="confirmPageRemoval">Delete '+pg.kind+'</button></div>');
 $('#confirmPageRemoval').onclick=()=>{
   change(()=>{promoteChildren(pg);project.pages=survivors;for(const layer of layers){layer.actions=layer.actions.filter(a=>!hits(a));if(removed.has(layer.picker?.footerButton))delete layer.picker.footerButton}
     if(pageId===id){pageId=survivors.find(p=>p.kind==='screen').id;selected=[];pan=[0,0];zoomFactor=1}
   });pagesDialog();
 };
}
function bindPanels(){
 const panel=$('#inspector'),main=document.querySelector('main'),handle=$('#grip'),lib=$('#library');
 const stacked=matchMedia('(max-width:620px)');
 function alignGrip(){
   const r=panel.getBoundingClientRect(),open=r.width>0&&r.height>0,vertical=!stacked.matches;
   handle.hidden=!open;
   const toggle=$('#inspectorToggle');
   toggle.textContent=open?'Hide inspector':'Show inspector';
   toggle.setAttribute('aria-expanded',String(open));
   handle.setAttribute('aria-orientation',vertical?'vertical':'horizontal');
   handle.setAttribute('aria-valuenow',String(Math.round(vertical?r.width:r.height)));
   Object.assign(handle.style,{left:r.left+'px',top:r.top+'px',
     width:vertical?'12px':r.width+'px',height:vertical?r.height+'px':'12px'});
 }
 function resizePanel(size){
   const property=stacked.matches?'--custom-height':'--custom-width';
   main.style.setProperty(property,Math.max(0,size)+'px');
   panel.classList.add('resizedInspector');
   if(panel.classList.contains('wideCode'))syncCodeSize(false);
   alignGrip();
 }
 let drag=null;
 handle.onpointerdown=e=>{
   if(e.button!==0||drag)return;
   const horizontal=stacked.matches,r=panel.getBoundingClientRect();
   drag={id:e.pointerId,horizontal,start:horizontal?e.clientY:e.clientX,size:horizontal?r.height:r.width};
   handle.setPointerCapture(e.pointerId);e.preventDefault();
 };
 handle.onpointermove=e=>{
   if(drag?.id===e.pointerId)resizePanel(drag.size+drag.start-(drag.horizontal?e.clientY:e.clientX));
 };
 handle.onlostpointercapture=()=>{drag=null};
 handle.onkeydown=e=>{
   const keys=stacked.matches?['ArrowUp','ArrowDown']:['ArrowLeft','ArrowRight'];
   if(!keys.includes(e.key))return;
   e.preventDefault();resizePanel((stacked.matches?panel.offsetHeight:panel.offsetWidth)+(e.key===keys[0]?20:-20));
 };
 const observer=new ResizeObserver(alignGrip);observer.observe(panel);observer.observe(main);
 window.addEventListener('resize',alignGrip);
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
   if(e.target.closest('#dockPanel')){panel.classList.remove('resizedInspector','wideCode');main.style.removeProperty('--custom-width');main.style.removeProperty('--custom-height');syncCodeSize(false);alignGrip()}
 });
 $('#inspectorToggle').onclick=()=>{
   const open=panel.getBoundingClientRect().width===0;
   main.classList.toggle('inspectorClosed',!open);panel.classList.toggle('shown',open);
   if(open)lib.classList.remove('shown');alignGrip();
 };
 alignGrip();
}
