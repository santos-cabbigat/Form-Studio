'use strict';
let loadColorRenderer;
function colorPickButton(target,label) {
  return '<button type="button" class="colorPick" data-sample="'+target+'" title="Pick '+esc(label)+' from the design" aria-label="Pick '+esc(label)+' from the design">⌖ Pick</button>';
}
function rendererForColorPick() {
  if(window.html2canvas)return Promise.resolve(window.html2canvas);
  if(!loadColorRenderer)loadColorRenderer=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src='vendor/html2canvas.min.js';
    script.onload=()=>resolve(window.html2canvas);
    script.onerror=()=>{loadColorRenderer=null;reject(Error('Unable to open the color sampler. Try again.'))};
    document.head.append(script);
  });
  return loadColorRenderer;
}
function pickDesignColor(target){
  const n=sel(),currentPage=pageId;
  modal('Pick a color','<p class="hint">Tap a color in this snapshot of your design.</p><div id="colorSnapshot" role="status">Preparing canvas…</div><div class="dialogActions">'+
    (typeof window.EyeDropper==='function'?btn('sample-screen','Pick anywhere on screen','','btn'):'')+btn('dismiss','Cancel','','btn')+'</div>',true);
  const host=$('#colorSnapshot');
  function apply(hex){
    if(currentPage!==pageId||!host.isConnected)return;
    hex=hex.toUpperCase();
    if(target==='palette'){dismiss();if($('#newColor'))$('#newColor').value=hex;toast(hex+' selected');return}
    if(target==='accent'||target==='background')change(()=>project.theme[target]=hex);
    else if(n&&page().nodes.includes(n))change(()=>n.style[target]=hex);
    dismiss();toast('Applied '+hex);
  }
  const screen=$('[data-cmd=sample-screen]');
  if(screen)screen.onclick=async()=>{try{apply((await new EyeDropper().open()).sRGBHex)}catch(e){if(e.name!=='AbortError')toast('Tap a color in the design instead.')}};
  (async()=>{
    const raster=await rendererForColorPick();if(!host.isConnected)return;
    const sheet=$('#sheet'),w=sheet.offsetWidth,h=sheet.offsetHeight;
    const canvas=await raster(sheet,{width:w,height:h,scale:Math.min(1,2048/Math.max(w,h)),logging:false,
      backgroundColor:project.theme.background,
      ignoreElements:el=>el.matches?.('.handle,.snapOverlay,.gapOverlay,#referenceArea'),
      onclone:doc=>{const s=doc.querySelector('#sheet');s.style.transform='none';s.style.boxShadow='none';s.querySelectorAll('.selected').forEach(el=>el.classList.remove('selected'))}
    });
    if(!host.isConnected)return;
    canvas.setAttribute('aria-label','Design color sampler');host.replaceChildren(canvas);
    canvas.onclick=e=>{
      const rect=canvas.getBoundingClientRect(),x=Math.min(canvas.width-1,Math.max(0,Math.floor((e.clientX-rect.left)*canvas.width/rect.width))),
        y=Math.min(canvas.height-1,Math.max(0,Math.floor((e.clientY-rect.top)*canvas.height/rect.height)));
      const [r,g,b]=canvas.getContext('2d').getImageData(x,y,1,1).data;
      apply('#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join(''));
    };
  })().catch(()=>{if(host.isConnected)host.textContent='Could not render this design for sampling. Use the color input or screen picker.'});
}
