'use strict';

const htmlSourceMaxBytes=2*1024*1024;
function pastedDesignSource(input,css){
  const value=input.trim();
  if(!value)throw Error('Paste some HTML or choose an HTML file.');
  let html=value,styles=css.trim();
  if(value.startsWith('```')){
    const blocks=[...value.matchAll(/^```([^\n]*)\n([\s\S]*?)^```[ \t]*\r?$/gm)];
    const htmlParts=[],cssParts=[];
    for(const [,lang,code] of blocks){
      const type=lang.trim().toLowerCase();
      if(type==='css')cssParts.push(code);
      else if(['','html','htm','xml'].includes(type))htmlParts.push(code);
      else throw Error('Paste the rendered HTML and CSS for this screen. JavaScript and framework source need to be rendered first.');
    }
    if(!htmlParts.length)throw Error('Include an HTML block with the elements you want to edit.');
    html=htmlParts.join('\n');styles=[...cssParts,styles].join('\n').trim();
  }
  if(styles){
    if(/^\s*<style\b/i.test(styles))throw Error('Use plain CSS in Additional CSS, or include the style tag in your HTML.');
    html+='\n<style>'+styles.replace(/<\/style/gi,'<\\/style')+'</style>';
  }
  return html;
}

// Geometry is per device. A source path ties measurements to the same editable layer.
function partsAcrossLayouts(samples,pg,append){
  const layers=new Map(),warnings=new Set(),backgrounds={},offsets={};
  for(const [layout,result] of samples){
    const current=pg.nodes.filter(n=>!n.hide?.[layout]);
    let bottom=0;
    if(append&&pg.kind==='screen'){
      for(const n of current){const b=boxFor(n,layout,project,pg);bottom=Math.max(bottom,b[1]+b[3])}
    }
    offsets[layout]=bottom?bottom+16:0;
    for(const warning of result.warnings)warnings.add(warning);
    if(!append&&result.background&&result.background!=='transparent'&&result.background!=='rgba(0, 0, 0, 0)')backgrounds[layout]=result.background;
    result.nodes.forEach((n,i)=>{
      const key=result.keys[i];let part=layers.get(key);
      if(!part){part={node:n,boxes:{},appearance:JSON.stringify([n.style,n.extraCSS])};layers.set(key,part)}
      else if(part.appearance!==JSON.stringify([n.style,n.extraCSS]))warnings.add('Some styles change at different widths. Studio shares a layer’s appearance across devices and keeps its size and position separately.');
      part.boxes[layout]=n.boxes.laptop.slice();
    });
  }
  const nodes=[];
  for(const part of layers.values()){
    const n={...part.node,boxes:{},hide:{}};
    const first=Object.keys(part.boxes)[0],fallback=part.boxes[first],multiplier=project.widths.laptop/project.widths[first];
    if(!part.boxes.laptop)setBox(n,[fallback[0]*multiplier,fallback[1],fallback[2]*multiplier,fallback[3]],'laptop',project,pg);
    for(const d of Object.keys(devices)){
      const b=part.boxes[d];
      if(!b){n.hide[d]=true;continue}
      setBox(n,[b[0],b[1]+offsets[d],b[2],b[3]],d,project,pg);
    }
    if(!Object.keys(n.hide).length)delete n.hide;
    nodes.push(n);
  }
  return {nodes,warnings:[...warnings],backgrounds};
}

function importHTMLDialog(initial='',initialName=''){
  modal('Import editable HTML',
    '<p>Paste a screen or a small section. Buttons, text, fields and tables become editable layers. You can connect their actions in Triggers.</p>'+
    field('HTML and CSS','<textarea id="importHTML" spellcheck="false" rows="7" placeholder="Paste your HTML here">'+esc(initial)+'</textarea>')+
    '<div class="fileActions">'+field('Open an HTML file','<input id="htmlFile" type="file" accept=".html,.htm,text/html">')+btn('sample-html','Try a sample','','chip')+'</div>'+
    '<details><summary>Additional CSS</summary>'+field('CSS from a separate stylesheet','<textarea id="importCSS" rows="3" spellcheck="false"></textarea>')+'</details>'+
    field('Add layers to','<select id="htmlDestination"><option value="new">New screen</option><option value="current">Current '+esc(page().kind)+' · '+esc(page().name)+'</option></select>')+
    field('New screen name','<input id="importName" maxlength="160" value="'+esc(initialName)+'" placeholder="Imported design">')+
    '<p class="hint" id="htmlPlacement"></p><div id="htmlImportStatus" role="status" aria-live="polite"></div>'+
    '<div class="dialogActions">'+btn('inspect-html','Check layers','layers')+btn('commit-html','Add layers','plus','btn primary')+'</div>',true);
  const input=$('#importHTML'),css=$('#importCSS'),name=$('#importName'),dest=$('#htmlDestination'),status=$('#htmlImportStatus'),file=$('#htmlFile');
  const check=$('[data-cmd=inspect-html]'),add=$('[data-cmd=commit-html]');
  let ticket=0,prepared=null;
  function reset(){
    ticket++;prepared=null;status.replaceChildren();check.disabled=false;add.disabled=true;
    name.closest('label').hidden=dest.value==='current';
    $('#htmlPlacement').textContent=dest.value==='current'&&page().nodes.length?
      (page().kind==='window'?'Places the layers inside this window.':'Places the section below the existing layers on this screen.'):'Checks the laptop, tablet and phone layouts before adding any layers.';
  }
  input.oninput=css.oninput=dest.onchange=reset;
  file.onchange=async()=>{
    const picked=file.files[0];if(!picked)return;
    reset();const current=ticket;check.disabled=true;
    try{
      if(picked.size>htmlSourceMaxBytes)throw Error('This file is over 2 MB. Choose one screen or section at a time.');
      const text=await picked.text();if(current!==ticket||!input.isConnected)return;
      input.value=text;if(!name.value.trim())name.value=picked.name.replace(/\.html?$/i,'');reset();
    }catch(e){if(current===ticket){check.disabled=false;status.textContent=e.message||'Could not read this HTML file.'}}
  };
  $('[data-cmd=sample-html]').onclick=()=>{
    input.value='<style>\n  .entry { max-width: 640px; margin: 24px auto; padding: 20px; background: #f2f0fa; font: 16px Arial; border-radius: 12px; }\n  .line { display: flex; gap: 12px; align-items: center; }\n  input, button { padding: 10px; border-radius: 6px; }\n  button { border: 0; color: white; background: #604095; }\n  @media (max-width: 600px) { .line { flex-direction: column; align-items: flex-start; } }\n</style>\n<section class="entry">\n  <h2>Record an expense</h2>\n  <div class="line"><label for="amount">Amount</label><input id="amount" type="number" placeholder="0.00"><button>Save expense</button></div>\n</section>';
    css.value='';name.value='Expense entry';reset();
  };
  check.onclick=async()=>{
    reset();const current=ticket;
    const active=()=>current===ticket&&input.isConnected;
    try{
      const source=pastedDesignSource(input.value,css.value);
      check.disabled=true;const append=dest.value==='current',pg=append?page():makePage('Imported design'),samples=new Map();
      for(const d of Object.keys(devices)){
        if(!active())return;
        status.textContent='Checking '+d+' layout…';
        const w=pg.kind==='window'?Math.min(pg.width,project.widths[d]-24):project.widths[d];
        samples.set(d,await inspectHTMLDesign(source,w));
      }
      if(!active())return;
      const {nodes,warnings,backgrounds}=partsAcrossLayouts(samples,pg,append);
      if(!nodes.length)throw Error('No editable layers were found. Paste the rendered HTML with its CSS. For a Form Studio export, open design.studio.json in Files.');
      const counts=new Map();for(const n of nodes)counts.set(n.type,(counts.get(n.type)||0)+1);
      const title=samples.get('laptop').title;
      if(!append&&!name.value.trim()&&title)name.value=title.slice(0,160);
      const total=nodes.length;status.innerHTML='<strong>'+total+' editable '+(total===1?'layer':'layers')+'</strong><p class="hint">'+[...counts].map(([t,count])=>count+' '+esc(t.toLowerCase())+(count===1?'':'s')).join(' · ')+'</p>'+
        (warnings.length?'<ul class="importNotes">'+warnings.map(w=>'<li>'+esc(w)+'</li>').join('')+'</ul>':'');
      prepared={pg,nodes,append,backgrounds};add.disabled=false;
    }catch(e){if(active())status.textContent=e.message}
    finally{if(active())check.disabled=false}
  };
  add.onclick=()=>{
    if(!prepared)return;
    const {pg,nodes,append,backgrounds}=prepared;prepared=null;add.disabled=true;
    if(!append){pg.name=name.value.trim()||'Imported design';if(Object.keys(backgrounds).length)pg.backgrounds=backgrounds}
    const active=nodes.filter(n=>!n.hide?.[device]);
    const focus=active.find(n=>n.type==='Button')||active.find(n=>n.type!=='Shape'&&n.type!=='Module')||active[0];
    endReferencePick();closeSide();dismiss();
    change(()=>{if(!append)project.pages.push(pg);pg.nodes.push(...nodes);pageId=pg.id;selected=focus?[focus.id]:[];mode='design';multi=false;panMode=false;zoomFactor=1;pan=[0,0]},'Added '+nodes.length+' editable '+(nodes.length===1?'layer':'layers'));
  };
  reset();
}
