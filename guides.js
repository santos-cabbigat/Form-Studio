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
  const targets = [{box:[0,0,...canvas], canvas:true,name:pg.name}];
  const grouped = new Map();
  for (const node of pg.nodes) {
    if (chosen.has(node.id) || node.hide?.[device]) continue;
    const box = boxFor(node,device,project,pg);
    targets.push({box,name:node.name});
    if (node.group) {
      if (!grouped.has(node.group)) grouped.set(node.group,[]);
      grouped.get(node.group).push(box);
    }
  }
  for (const boxes of grouped.values()) if (boxes.length>1) targets.push({box:enclosingBox(boxes),name:'Group'});
  return targets;
}

// All bounds are in canvas pixels. A small screen-pixel tolerance keeps snapping usable at any zoom.
function matchGuide(axis, rect, handle, targets, tolerance) {
  const start=rect[axis], size=rect[axis+2], end=start+size;
  const low = handle && (axis===0 ? handle.endsWith('l') : handle.startsWith('t'));
  const resizeEdge = low ? start : end;
  const center=start+size/2, first=(handle?resizeEdge:start)-tolerance, last=(handle?resizeEdge:end)+tolerance;
  const other=1-axis, crossStart=rect[other], crossEnd=crossStart+rect[other+2];
  let best=null,previous=null,next=null;
  const crossGap=target=>Math.max(0,target.box[other]-crossEnd,crossStart-target.box[other]-target.box[other+2]);
  function consider(delta,target,line,from,to,equalSize=false,pair=null){
    const gap=Math.abs(delta);
    if(gap>tolerance||(handle&&size+(low?-delta:delta)<12))return;
    // At similar distances prefer matching edges and centres on nearby objects.
    const rank=pair?0:equalSize?3:from==='center'&&to==='center'?0:from===to?0.4:
      from!=='center'&&to!=='center'?0.6:1.5;
    const score=gap/tolerance+rank*.14+Math.min(crossGap(target)/Math.max(tolerance,1),60)*.002+(target.canvas ? .18 : 0);
    if(!best||score<best.score)best={axis,delta,target,line,from,to,equalSize,pair,score};
  }
  function checkLine(line,target,to){
    if(line<first||line>last)return;
    if(handle){consider(line-resizeEdge,target,line,low?'start':'end',to);return}
    consider(line-center,target,line,'center',to);
    consider(line-start,target,line,'start',to);
    consider(line-end,target,line,'end',to);
  }
  for(const target of targets){
    const b=target.box,s=b[axis],length=b[axis+2];
    if(s<=last&&s+length>=first){
      checkLine(s+length/2,target,'center');checkLine(s,target,'start');checkLine(s+length,target,'end');
    }
    if(handle&&!target.canvas){
      const delta=(length-size)*(low?-1:1);
      consider(delta,target,resizeEdge+delta,null,null,true);
    }else if(!handle&&!target.canvas&&b[other]<crossEnd&&b[other]+b[other+2]>crossStart){
      if(s+length<=start&&(!previous||s+length>previous.box[axis]+previous.box[axis+2]))previous=target;
      if(s>=end&&(!next||s<next.box[axis]))next=target;
    }
  }
  if(previous&&next){
    const a=previous.box[axis]+previous.box[axis+2],b=next.box[axis],span=(b-a-size)/2;
    if(span>0)consider(a+span-start,previous,a+span,'gap','gap',false,{a,b,span,next});
  }
  return best;
}

function guidedBounds(before, dx, dy, handle, targets, tolerance) {
  let [l,t,r,b]=before;
  const left=handle?.includes('l'), right=handle?.includes('r');
  const top=handle?.includes('t'), bottom=handle?.includes('b');
  if(handle) {
    if(left) l=Math.min(r-12,l+dx); else if(right) r=Math.max(l+12,r+dx);
    if(top) t=Math.min(b-12,t+dy); else if(bottom) b=Math.max(t+12,b+dy);
  } else {l+=dx;r+=dx;t+=dy;b+=dy;}
  const raw=[l,t,r-l,b-t];
  const matches=[0,1].map(axis=>{
    const active=axis===0?(left||right):(top||bottom);
    return !handle||active?matchGuide(axis,raw,handle,targets,tolerance):null;
  });
  const x=matches[0]?.delta||0,y=matches[1]?.delta||0;
  if(!handle||left) l+=x;
  if(!handle||right) r+=x;
  if(!handle||top) t+=y;
  if(!handle||bottom) b+=y;
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
  const sizes=[],labels=[];
  const edgeNames=[{start:'Left',end:'Right',center:'Center'},{start:'Top',end:'Bottom',center:'Middle'}];
  function dot(x,y){
    const el=document.createElement('i');el.className='alignmentDot';
    el.style.left=x+'px';el.style.top=y+'px';overlay.append(el);
  }
  for(let axis=0;axis<2;axis++) {
    const m=matches[axis],other=1-axis;
    if(m?.pair){
      const {a,b,span}=m.pair,cross=rect[other]+rect[other+2]/2;
      line(axis===1,cross,a,rect[axis],true);line(axis===1,cross,rect[axis]+rect[axis+2],b,true);
      labels.push('Equal gaps · '+Number(span.toFixed(1))+' px');
    }else if(m && !m.equalSize) {
      line(axis===0,m.line, Math.min(rect[other],m.target.box[other])-6/zoom,
        Math.max(rect[other]+rect[other+2],m.target.box[other]+m.target.box[other+2])+6/zoom);
      if(m.from==='center'&&m.to==='center'){
        labels.push((axis===0?'Centers aligned':'Middles aligned')+' · '+m.target.name);
        const point=r=>[r[0]+r[2]/2,r[1]+r[3]/2];dot(...point(rect));dot(...point(m.target.box));
      }else{
        const names=edgeNames[axis];
        const relation=m.from===m.to?names[m.from]+' edges aligned':names[m.from]+' to '+names[m.to].toLowerCase();
        labels.push(relation+' · '+m.target.name);
      }
    }
    if(!handle||!(axis===0?/[lr]/:/[tb]/).test(handle)) continue;
    const size=rect[axis+2];
    // An aligned edge and an equal dimension can both match on the same axis.
    let same=m?.equalSize?m.target:null;
    if(!same){
      let distance=Infinity;
      for(const target of targets){
        if(target.canvas||target.box[axis+2]!==size)continue;
        const gap=Math.abs(target.box[other]-rect[other]);
        if(gap<distance){same=target;distance=gap;if(gap===0)break}
      }
    }
    if(same){
      sizes.push((axis===0?'Width':'Height')+' = '+size+' px');
      for(const box of [rect,same.box])line(axis===1,box[other]+box[other+2]+3/zoom,box[axis],box[axis]+size,true);
    }
  }
  for(const target of new Set(matches.filter(m=>m&&!m.equalSize&&!m.pair&&!m.target.canvas).map(m=>m.target))){
    const box=target.box;
    const x=[rect[0],rect[0]+rect[2]].find(x=>[box[0],box[0]+box[2]].some(v=>Math.abs(x-v)<.51));
    const y=[rect[1],rect[1]+rect[3]].find(y=>[box[1],box[1]+box[3]].some(v=>Math.abs(y-v)<.51));
    if(x!==undefined&&y!==undefined){dot(x,y);labels.unshift('Corners meet · '+target.name);break}
  }
  if(labels.length){
    const badge=document.createElement('span');badge.className='alignBadge';
    badge.textContent=labels[0].startsWith('Corners meet')?labels[0]:labels.join('  /  ');
    badge.style.left=Math.max(0,Math.min(rect[0],targets[0].box[2]-185/zoom))+'px';
    badge.style.top=(rect[1]>24/zoom?rect[1]-23/zoom:rect[1]+rect[3]+5/zoom)+'px';overlay.append(badge);
  }
  if(handle) {
    const label=document.createElement('span');label.className='snapSize';
    label.textContent=sizes.length?sizes.join(' · '):rect[2]+' × '+rect[3]+' px';
    label.style.left=rect[0]+'px';label.style.top=(rect[1]+rect[3]+6/zoom)+'px';overlay.append(label);
  }
  if(overlay.childElementCount)$('#sheet').append(overlay);
}

function windowGaps(rect, frame) {
  const [x,y,w,h]=rect;
  return {top:y-frame[1], bottom:frame[1]+frame[3]-y-h,
          left:x-frame[0], right:frame[0]+frame[2]-x-w};
}

// These labels only read the final box. They never enter the snapping calculation.
function drawGapLabels(rect, frame) {
  const sheet=$('#sheet');
  let overlay=sheet.querySelector('.gapOverlay');
  if(!overlay) {
    overlay=document.createElement('div');overlay.className='gapOverlay';
    overlay.setAttribute('aria-hidden','true');
    for(const edge of ['top','right','bottom','left']){
      const tag=document.createElement('span');tag.dataset.edge=edge;overlay.append(tag);
    }
    sheet.append(overlay);
  }
  const zoom=Math.max(scale,.1), [x,y,w,h]=rect;
  const gaps=windowGaps(rect,frame);
  const between=(a,b)=>(a+b)/2;
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const centerX=x+w/2, centerY=y+h/2;
  const positions={
    top:[centerX,between(frame[1],y)],
    right:[between(frame[0]+frame[2],x+w),centerY],
    bottom:[centerX,between(frame[1]+frame[3],y+h)],
    left:[between(frame[0],x),centerY]
  };
  overlay.style.setProperty('--gap-zoom',1/zoom);
  for(const tag of overlay.children) {
    const edge=tag.dataset.edge, mm=Math.round(gaps[edge]*25.4/96*10)/10;
    tag.textContent=cap(edge)+' '+mm+' mm';
    tag.style.left=clamp(positions[edge][0],frame[0]+38/zoom,frame[0]+frame[2]-38/zoom)+'px';
    tag.style.top=clamp(positions[edge][1],frame[1]+9/zoom,frame[1]+frame[3]-9/zoom)+'px';
  }
}
