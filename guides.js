'use strict';
let smartGuides = true;
try { smartGuides = localStorage.getItem('formstudio.smartGuides') !== 'off'; } catch {}

function syncGuideButton() {
  const control = $('#guideTool');
  control.setAttribute('aria-pressed', String(smartGuides));
  control.classList.toggle('on', smartGuides);
}
function toggleSmartGuides() {
  smartGuides = !smartGuides;
  try { localStorage.setItem('formstudio.smartGuides', smartGuides ? 'on' : 'off'); } catch {}
  syncGuideButton();
  clearGuides();
}
function clearGuides() { $('#sheet .snapOverlay')?.remove(); }

function guideTargets(pg, chosen) {
  const canvas = bounds(pg,device,project);
  const targets = [{box:[0,0,...canvas], canvas:true}];
  const grouped = new Map();
  for (const node of pg.nodes) {
    if (chosen.has(node.id) || node.hide?.[device]) continue;
    const box = boxFor(node,device,project,pg);
    targets.push({box});
    if (node.group) {
      if (!grouped.has(node.group)) grouped.set(node.group,[]);
      grouped.get(node.group).push(box);
    }
  }
  for (const boxes of grouped.values()) if (boxes.length>1) targets.push({box:enclosingBox(boxes)});
  return targets;
}

// All bounds are in canvas pixels. A small screen-pixel tolerance keeps snapping usable at any zoom.
function matchGuide(axis, rect, handle, targets, tolerance) {
  const start=rect[axis], size=rect[axis+2], end=start+size;
  const low = handle && (axis===0 ? handle.endsWith('l') : handle.startsWith('t'));
  const resizeEdge = low ? start : end;
  const moving = handle ? [resizeEdge] : [start,end,start+size/2];
  let best = null;
  function consider(delta, target, line, equalSize) {
    if (Math.abs(delta)>tolerance || (handle && size+(low?-delta:delta)<12)) return;
    const other = 1-axis;
    const distance = Math.max(0, target.box[other]-rect[other]-rect[other+2], rect[other]-target.box[other]-target.box[other+2]);
    // Prefer a closer snap first; overlapping or nearby targets break ties.
    const score = Math.abs(delta) + Math.min(distance,10000)*0.00001 + (equalSize ? 0.000001 : 0);
    if (!best || score<best.score) best={axis,delta,target,line,equalSize,score};
  }
  for(const target of targets) {
    const b=target.box, s=b[axis], length=b[axis+2];
    for(const line of [s,s+length,s+length/2]) {
      for(const anchor of moving) consider(line-anchor,target,line,false);
    }
    if(handle && !target.canvas) {
      const delta = (length-size)*(low?-1:1);
      consider(delta,target,resizeEdge+delta,true);
    }
  }
  return best;
}

function guidedBounds(before, dx, dy, handle, targets, tolerance) {
  let [l,t,r,b]=before;
  const left=handle?.endsWith('l'), top=handle?.startsWith('t');
  if(handle) {
    if(left) l=Math.min(r-12,l+dx); else r=Math.max(l+12,r+dx);
    if(top) t=Math.min(b-12,t+dy); else b=Math.max(t+12,b+dy);
  } else {l+=dx;r+=dx;t+=dy;b+=dy;}
  const raw=[l,t,r-l,b-t];
  const matches=[0,1].map(axis=>matchGuide(axis,raw,handle,targets,tolerance));
  const x=matches[0]?.delta||0,y=matches[1]?.delta||0;
  if(!handle||left) l+=x;
  if(!handle||!left) r+=x;
  if(!handle||top) t+=y;
  if(!handle||!top) b+=y;
  return {edges:[l,t,r,b].map(Math.round),matches};
}

function drawGuides(rect, matches, handle, targets) {
  clearGuides();
  const overlay=document.createElement('div');
  overlay.className='snapOverlay';overlay.setAttribute('aria-hidden','true');
  const zoom=Math.max(scale,0.1);
  overlay.style.setProperty('--guide-stroke',(1.5/zoom)+'px');
  overlay.style.setProperty('--guide-font',(11/zoom)+'px');
  function line(vertical, fixed, low, high, sizeMark=false) {
    const el=document.createElement('i');
    el.className='snapLine '+(vertical?'vertical':'horizontal')+(sizeMark?' dimension':'');
    el.style.left=(vertical?fixed:low)+'px';el.style.top=(vertical?low:fixed)+'px';
    el.style[vertical?'height':'width']=Math.max(1,high-low)+'px';
    overlay.append(el);
  }
  const sizes=[];
  for(let axis=0;axis<2;axis++) {
    const m=matches[axis],other=1-axis;
    if(m && !m.equalSize) {
      line(axis===0,m.line, Math.min(rect[other],m.target.box[other])-6/zoom,
        Math.max(rect[other]+rect[other+2],m.target.box[other]+m.target.box[other+2])+6/zoom);
    }
    if(!handle) continue;
    const size=rect[axis+2];
    // An aligned edge and an equal dimension can both match on the same axis.
    const same=m?.equalSize?m.target:targets.filter(v=>!v.canvas&&v.box[axis+2]===size)
      .sort((a,b)=>Math.abs(a.box[other]-rect[other])-Math.abs(b.box[other]-rect[other]))[0];
    if(same){
      sizes.push((axis===0?'Width':'Height')+' = '+size+' px');
      for(const box of [rect,same.box])line(axis===1,box[other]+box[other+2]+3/zoom,box[axis],box[axis]+size,true);
    }
  }
  if(handle) {
    const label=document.createElement('span');label.className='snapSize';
    label.textContent=sizes.length?sizes.join(' · '):rect[2]+' × '+rect[3]+' px';
    label.style.left=rect[0]+'px';label.style.top=(rect[1]+rect[3]+6/zoom)+'px';overlay.append(label);
  }
  if(overlay.childElementCount)$('#sheet').append(overlay);
}
