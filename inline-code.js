'use strict';

// Parse in a template so pasted markup remains inert until Studio measures supported elements.
function codeFragment(html){
  const template=document.createElement('template');
  template.innerHTML=html;
  return template.content;
}
function codeEntries(container){
  return Array.from(container.childNodes).filter(n=>n.nodeType===1||(n.nodeType===3&&n.textContent.trim()));
}
function entryHTML(n){return n.nodeType===1?n.outerHTML:esc(n.textContent)}
function canonicalStoredCode(n){
  const fragment=codeFragment(sourceFor(n)),holder=document.createElement('template');
  holder.content.append(fragment);
  return holder.innerHTML.trim();
}
function inlinePlan(raw,nodes,kind,pg){
  const plan={updates:new Map(),insertions:[],styles:[],name:null,width:null,height:null};
  const layerIds=new Set(nodes.map(n=>n.id));
  const container=codeFragment(raw),entries=codeEntries(container);
  const add=(entries,before,after)=>{
    if(!entries.length)return;
    plan.insertions.push({html:entries.map(entryHTML).join('\n'),before,after});
  };
  const noteStyle=e=>e.nodeType===1&&e.matches('style:not([data-layout])');
  const isTrigger=e=>e.nodeType===1&&e.matches('script[data-triggers]');
  const isLayout=e=>e.nodeType===1&&e.matches('style[data-layout]');
  function edit(n,html,name){
    const changed=html.trim()!==canonicalStoredCode(n);
    if(!changed&&(!name||name===n.name))return;
    const model=changed?parseElement(n,html):{...n};
    if(name)model.name=name;
    plan.updates.set(n,model);
  }
  function editAndInsert(list,n,source,templateName){
    // Custom components intentionally own arbitrary nested HTML and can have multiple roots.
    if(n.type==='Custom'){edit(n,source,templateName);return}
    if(list.filter(isTrigger).length>1||list.filter(isLayout).length>1)throw Error('Keep one layout block and one trigger block per existing layer.');
    const own=list.filter(e=>e.nodeType===1&&e.id===n.id);
    if(own.length!==1)throw Error('Keep the selected layer’s original HTML id. To add a separate block, paste plain HTML or place it beside the existing element.');
    const root=own[0],other=list.filter(e=>e!==root&&!isLayout(e)&&!isTrigger(e)&&!noteStyle(e));
    if(!other.length){edit(n,source,templateName);return}
    const preceding=new Set(list.slice(0,list.indexOf(root)));
    plan.styles.push(...list.filter(noteStyle).map(entryHTML));
    const extras=other.filter(e=>e.nodeType===1&&e.matches('[data-studio],template[data-layer]'));
    if(extras.length)throw Error('A pasted block contains another Studio wrapper. Paste the HTML for its contents.');
    const oldMarkup=list.filter(e=>e===root||isLayout(e)||isTrigger(e)).map(entryHTML).join('\n');
    // Keep the original model untouched if only siblings were added. Formatting between
    // the original style, element and triggers may have changed during the paste.
    const original=codeEntries(codeFragment(sourceFor(n))).map(entryHTML).join('\n');
    if(oldMarkup!==original||templateName&&templateName!==n.name){
      if(oldMarkup===original)plan.updates.set(n,{...n,name:templateName});
      else edit(n,oldMarkup,templateName);
    }
    add(other.filter(e=>preceding.has(e)),n.id,null);
    add(other.filter(e=>!preceding.has(e)),null,n.id);
  }
  const wrapper=entries.find(e=>e.nodeType===1&&e.hasAttribute('data-studio'));
  const marker=entries.some(e=>isLayout(e)||isTrigger(e)||e.nodeType===1&&e.matches('template[data-layer]'));
  if(kind==='element'&&!wrapper&&(marker||entries.some(e=>e.nodeType===1&&e.id===nodes[0].id))){
    editAndInsert(entries,nodes[0],raw,null);return plan;
  }
  if(!wrapper){
    if(entries.length&&entries.every(noteStyle)){
      if(kind!=='element'||nodes[0].type==='Custom')throw Error('Put this stylesheet beside its HTML or in a selected layer’s style block.');
      const n=nodes[0],model=clone(n),box=boxFor(n,device,project,pg);
      const el=codeEntries(codeFragment(sourceFor(n))).find(e=>e.nodeType===1&&e.id===n.id);
      for(const style of entries){
        const rules=declarations(style.textContent);
        if(!rules.length)throw Error('Enter a CSS rule for this layer.');
        for(const r of rules){
          if(!r.style||!el.matches(r.selectorText))throw Error('Use a CSS selector that matches this layer, or paste the rest of the HTML with the stylesheet.');
          readStyles(model,r.style,box);
        }
      }
      setBox(model,box,device,project,pg);plan.updates.set(n,model);return plan;
    }
    if(marker)throw Error('Keep the outer Studio wrapper when editing its layers, or paste plain HTML to add a new section.');
    if(!/<[a-z][\s\S]*>/i.test(raw))throw Error('Enter HTML to add layers, or edit the CSS inside the selected layer’s style block.');
    plan.insertions.push({html:raw,before:null,after:selected.length?nodes.at(-1).id:null});
    return plan;
  }
  if(kind==='element'||wrapper.dataset.studio!==kind||wrapper.dataset.id!==(kind==='group'?nodes[0].group:pg.id)||entries.filter(e=>e.nodeType===1&&e.hasAttribute('data-studio')).length!==1)throw Error('Keep the original Studio wrapper for this selection.');
  const members=codeEntries(wrapper),ordered=[];
  // Markers describe existing layers. Raw siblings on either side become new layers.
  const index=entries.indexOf(wrapper),leading=entries.slice(0,index),trailing=entries.slice(index+1);
  let pending=[],previous=null;
  for(const item of [...leading,...members,...trailing]){
    if(noteStyle(item)){plan.styles.push(entryHTML(item));continue}
    if(item.nodeType!==1||item.tagName!=='TEMPLATE'){pending.push(item);continue}
    const id=item.dataset.layer;
    if(!id||!layerIds.has(id)||id!==nodes[ordered.length]?.id)throw Error('Keep each original layer template once, in its current order. Paste new HTML between templates.');
    const n=nodes[ordered.length];
    add(pending,n.id,previous);pending=[];previous=n.id;ordered.push(n);
    // Compare after normalizing HTML serialization; do not round-trip unchanged layers.
    const name=item.dataset.name?.trim()||n.name;
    if(item.innerHTML.trim()===canonicalStoredCode(n)){
      if(name!==n.name)plan.updates.set(n,{...n,name});
    }else editAndInsert(codeEntries(item.content),n,item.innerHTML,name);
  }
  if(ordered.length!==nodes.length)throw Error('Keep a template for each original layer. Use Delete selection on the canvas to remove a layer.');
  add(pending,null,previous);
  if(plan.styles.length&&!plan.insertions.length)throw Error('Put this CSS in a layer’s style block, or paste the HTML that the stylesheet should style.');
  plan.name=wrapper.dataset.name?.trim()||selectionTitle();
  if(kind==='window'){
    const w=Number(wrapper.dataset.width),h=Number(wrapper.dataset.height);
    if(!Number.isFinite(w)||!Number.isFinite(h)||w<120||w>2000||h<100||h>2400)throw Error('Enter a window width of 120–2000 and height of 100–2400 pixels.');
    plan.width=w;plan.height=h;
  }
  return plan;
}

async function measureCodeInsertions(plan,pg,active){
  const warnings=new Set(),style=plan.styles.join('\n');
  for(const chunk of plan.insertions){
    const samples=new Map();
    for(const d of Object.keys(devices)){
      if(!active())return;
      const width=pg.kind==='window'?Math.min(pg.width,project.widths[d]-24):project.widths[d];
      samples.set(d,await inspectHTMLDesign(style+'\n'+chunk.html,width));
    }
    if(!active())return;
    const parts=partsAcrossLayouts(samples,pg,false);
    if(!parts.nodes.length)throw Error('This block contains no editable layers. Use rendered HTML and its CSS.');
    for(const warning of parts.warnings)warnings.add(warning);
    chunk.nodes=parts.nodes;
  }
  return [...warnings];
}

function placeCodeInsertions(plan,pg,kind,members){
  if(!plan.insertions.length)return;
  const original=pg.nodes,indices=new Map(original.map((n,i)=>[n.id,i])),buckets=new Map();
  const boxes=new Map(),adjusted=new Set(),group=kind==='group'?members[0].group:null;
  // Capture all three positions before changing any. A legacy layer may derive its
  // phone or tablet coordinates from laptop, which could otherwise shift it twice.
  function layouts(n){
    if(!boxes.has(n))boxes.set(n,Object.fromEntries(Object.keys(devices).map(d=>[d,boxFor(n,d,project,pg)])));
    return boxes.get(n);
  }
  function contains(outer,inner){
    return outer[0]<=inner[0]&&outer[1]<=inner[1]&&outer[0]+outer[2]>=inner[0]+inner[2]&&outer[1]+outer[3]>=inner[1]+inner[3];
  }
  function sameColumn(a,b){
    const overlap=Math.min(a[0]+a[2],b[0]+b[2])-Math.max(a[0],b[0]);
    return overlap>=Math.min(a[2],b[2])*.6;
  }
  function size(boxes){
    const left=Math.min(...boxes.map(b=>b[0])),top=Math.min(...boxes.map(b=>b[1]));
    return [left,top,Math.max(...boxes.map(b=>b[0]+b[2]))-left,Math.max(...boxes.map(b=>b[1]+b[3]))-top];
  }
  for(const chunk of plan.insertions){
    const at=chunk.before?indices.get(chunk.before):chunk.after?indices.get(chunk.after)+1:original.length;
    const siblings=buckets.get(at)||[];buckets.set(at,siblings);
    for(const d of Object.keys(devices)){
      const visible=chunk.nodes.filter(n=>!n.hide?.[d]);if(!visible.length)continue;
      const source=size(visible.map(n=>layouts(n)[d]));
      let before=null,after=null;
      for(let i=at;i<original.length;i++){if(!original[i].hide?.[d]){after=layouts(original[i])[d];break}}
      if(chunk.after||chunk.before){
        for(let i=at-1;i>=0;i--){
          const n=original[i];if(n.hide?.[d])continue;
          const candidate=layouts(n)[d];
          if(after&&['Module','Shape','Image'].includes(n.type)&&contains(candidate,after))continue;
          before=candidate;break;
        }
      }
      const anchor=before||after,canvasWidth=pg.kind==='window'?Math.min(pg.width,project.widths[d]-24):project.widths[d];
      const dx=anchor?Math.max(0,Math.min(anchor[0],canvasWidth-source[2]))-source[0]:0;
      const earlier=siblings.filter(n=>!n.hide?.[d]);
      let y=source[1];
      if(earlier.length)y=Math.max(...earlier.map(n=>{const b=layouts(n)[d];return b[1]+b[3]}))+12;
      else if(before)y=before[1]+before[3]+12;
      else if(after)y=after[1];
      else if(original.length){
        for(const n of original)if(!n.hide?.[d]){const b=layouts(n)[d];y=Math.max(y,b[1]+b[3]+12)}
      }
      if(pg.kind==='window')y=Math.max(0,Math.min(y,pg.height-source[3]));
      for(const n of visible){const b=layouts(n)[d];b[0]+=dx;b[1]+=y-source[1];adjusted.add(n)}
      // Only shift a run of vertically stacked screen layers in the insertion column.
      // Overlapping artwork, other columns and dialog/group compositions keep their positions.
      const stacked=pg.kind==='screen'&&kind!=='group'&&after&&(!before||
        (sameColumn(before,after)&&after[1]>=before[1]+before[3]-1));
      if(stacked){
        const origin=after.slice(),shift=Math.max(0,y+source[3]+12-origin[1]);
        if(shift)for(let i=at;i<original.length;i++){
          const n=original[i];if(n.hide?.[d])continue;
          const box=layouts(n)[d];
          if(!n.locked&&box[1]>=origin[1]&&sameColumn(origin,box)){
            box[1]+=shift;adjusted.add(n);
          }
        }
      }
    }
    if(group)for(const n of chunk.nodes){n.group=group;n.groupName=plan.name||groupTitle(members)}
    siblings.push(...chunk.nodes);
  }
  for(const n of adjusted){
    for(const d of Object.keys(devices))if(!n.hide?.[d])setBox(n,layouts(n)[d],d,project,pg);
  }
  const next=[];
  original.forEach((n,i)=>{if(buckets.has(i))next.push(...buckets.get(i));next.push(n)});
  if(buckets.has(original.length))next.push(...buckets.get(original.length));
  pg.nodes=next;
}
