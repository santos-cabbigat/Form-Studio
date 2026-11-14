const nativeCSS=`
*{box-sizing:border-box}.object{position:absolute;margin:0;line-height:1.25;font-family:inherit;overflow:hidden}.object[data-type=Button]{cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0 8px}.object[data-type=Text]{white-space:pre-wrap;display:flex;align-items:center;line-height:1.18;letter-spacing:-.025em}.object[data-type=Input]{padding:0 14px}.object[data-type=Image]{object-fit:cover;display:block}.object[data-type=Table]{padding:0}.object table{width:100%;border-collapse:collapse;font-size:inherit;color:inherit}.object th,.object td{padding:7px 10px;border-bottom:1px solid #dedbe6;text-align:left}.object th{background:#f3effa}.object[data-type=Custom]{border:0}.object[data-type=Button]:focus-visible,.object[tabindex]:focus-visible{outline:3px solid #8763dd}
`;
function cssProps(n,b){let s=n.style;return {left:b[0]+'px',top:b[1]+'px',width:b[2]+'px',height:b[3]+'px','background-color':s.fill,color:s.color,'border-radius':s.radius+'px','font-size':s.fontSize+'px','font-weight':String(s.weight),border:s.border,'text-align':s.align,...n.extraCSS}}
function markup(n,source=false){
 const type=n.type,label=esc(n.text);
 if(type==='Button')return '<button type="button">'+label+'</button>';
 if(type==='Input'){
   const attrs=' aria-label="'+esc(n.name)+'"'+(n.requirement==='required'?' required':'');
   if(n.inputType==='select')return '<select'+attrs+'><option value="">'+label+'</option>'+dropdownChoices(n).map(o=>'<option value="'+esc(o.value)+'">'+esc(o.label)+'</option>').join('')+'</select>';
   return '<input'+attrs+' type="'+(['email','password','number','text'].includes(n.inputType)?n.inputType:'text')+'"'+(n.inputType==='number'?' step="any"':'')+' placeholder="'+label+'" autocomplete="off">';
 }
 if(type==='Image')return '<img alt="'+esc(n.name)+'" src="'+esc(n.src||'')+'">';
 if(type==='Table')return '<div data-start="'+esc(n.initialState||'sample')+'" data-empty="'+esc(n.emptyMessage??'No entries yet.')+'">'+tableMarkup(n,source?tableLines(n).slice(1):seedRows(n))+'</div>';
 if(type==='Custom')return '<iframe title="'+esc(n.name)+'" sandbox=""></iframe>';
 return '<div>'+(type==='Text'?label:'')+'</div>'
}
function customDoc(n){
 const policy="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; base-uri 'none'; form-action 'none'";
 return '<!doctype html><meta http-equiv="Content-Security-Policy" content="'+policy+'"><style>*{box-sizing:border-box}body{margin:0;font:16px Arial,sans-serif}body>:first-child{max-width:100%}</style>'+n.html
}
function makeEl(n,b,edit=false){
 const holder=document.createElement('template');holder.innerHTML=markup(n);const el=holder.content.firstElementChild;
 el.className='object';el.dataset.id=n.id;el.dataset.type=n.type;for(const [k,v] of Object.entries(cssProps(n,b)))el.style.setProperty(k,v);
 if(n.type==='Custom'){if(!edit)el.setAttribute('sandbox','allow-scripts');el.srcdoc=customDoc(n)}
 if(n.type==='Text'||n.type==='Button')el.style.justifyContent={left:'flex-start',center:'center',right:'flex-end'}[n.style.align];
 if(edit){el.tabIndex=-1;if(el.tagName==='INPUT')el.readOnly=true}
 return el
}
function runtime(p,mode,start,forcedDevice){
 const root=document.getElementById('app'),surface=document.createElement('main'),modal=document.createElement('dialog');
 const close=document.createElement('button'); close.textContent='×';close.className='exit';close.setAttribute('aria-label','Close window');
 const inner=document.createElement('div');modal.append(close,inner);root.append(surface,modal);close.onclick=()=>modal.close();
 let current=p.pages.find(q=>q.id===start)||p.pages[0],shown=null,resize;
 if(current.kind==='window'){shown=current;current=p.pages.find(q=>q.kind==='screen')||current}
 const records=new Map(), tables=new Map(), values=new Map();
 const screens=p.pages.filter(pg=>pg.kind==='screen');
 for(const pg of p.pages)for(const n of pg.nodes)if(n.type==='Table'){
   tables.set(n.id,n);records.set(n.id,mode==='empty'?[]:mode==='sample'?tableLines(n).slice(1):seedRows(n));
 }
 const nav=document.createElement('nav');nav.className='screenTabs';nav.setAttribute('aria-label','Project screens');
 if(screens.length>1){root.prepend(nav);for(const pg of screens){
   const b=document.createElement('button');b.type='button';b.textContent=pg.name;b.dataset.page=pg.id;
   b.onclick=()=>{if(modal.open)modal.close();current=pg;draw()};nav.append(b);
 }}
 const notice=document.createElement('div');notice.className='entryNotice';notice.setAttribute('role','status');root.append(notice);let timer;
 function notify(message){clearTimeout(timer);const parent=modal.open?modal:root;if(notice.parentNode!==parent)parent.append(notice);notice.textContent=message;timer=setTimeout(()=>notice.textContent='',4500)}
 function saveRow(a,board){
   const table=tables.get(a.target);if(!table||!Array.isArray(a.fields)){notify('Choose a destination table in the trigger.');return false}
   const cells=[];
   for(const id of a.fields){
     if(!id){cells.push('');continue}
     const field=board.querySelector('[data-id="'+CSS.escape(id)+'"]');
     if(!field||!['INPUT','SELECT'].includes(field.tagName)||field.type==='password'){notify('A linked field is unavailable. Check the Save trigger.');return false}
     if(!field.checkValidity()||(field.required&&!field.value.trim())){field.reportValidity();field.focus();notify('Check '+field.getAttribute('aria-label')+'.');return false}
     cells.push(field.value);
   }
   records.get(a.target).push(cells);
   for(const el of root.querySelectorAll('[data-type="Table"]'))if(el.dataset.id===a.target)el.innerHTML=tableMarkup(table,records.get(a.target));
   if(a.message)notify(a.message);return true;
 }
 function device(){return forcedDevice||(window.innerWidth<600?'phone':window.innerWidth<1040?'tablet':'laptop')}
 function paint(page,target,available){
 const d=device(),[w,h]=bounds(page,d,p);const zoom=Math.min(1,available/w);
 const board=document.createElement('section');board.className='board';board.style.cssText='width:'+w+'px;height:'+h+'px;transform:scale('+zoom+');';board.style.background=p.theme.background;
 const outer=document.createElement('div');outer.className='sized';outer.style.width=w*zoom+'px';outer.style.height=h*zoom+'px';outer.append(board);target.replaceChildren(outer);
 page.nodes.filter(n=>!n.hide?.[d]).forEach(n=>{
 let el=makeEl(n,boxFor(n,d,p,page));board.append(el);
 if(n.type==='Table')el.innerHTML=tableMarkup(n,records.get(n.id));
 if(n.type==='Input'){if(values.has(n.id))el.value=values.get(n.id);el.addEventListener('input',()=>values.set(n.id,el.value));el.addEventListener('change',()=>values.set(n.id,el.value))}
 if(n.type==='Custom'&&n.actions?.length){const b=boxFor(n,d,p,page),hit=document.createElement('button');hit.className='hit';hit.setAttribute('aria-label',n.name);Object.assign(hit.style,{left:b[0]+'px',top:b[1]+'px',width:b[2]+'px',height:b[3]+'px'});board.append(hit);el=hit}
 if(n.actions?.length){if(el.tabIndex<0)el.tabIndex=0;
 el.addEventListener('click',()=>act(n,'click',board));el.addEventListener('keydown',e=>{if(e.key==='Enter'&&n.actions.some(a=>a.event==='enter')){e.preventDefault();act(n,'enter',board)}})}
 });
 }
 function act(n,event,board){
 for(const a of n.actions.filter(a=>a.event===event)){
 if(a.action==='saveRow'&&!saveRow(a,board))return;
 const page=p.pages.find(q=>q.id===a.target);
 if(a.action==='open'&&page?.kind==='window'){shown=page;show()}
 if(a.action==='close'&&modal.open)modal.close();
 if(a.action==='go'&&page?.kind==='screen'){if(modal.open)modal.close();current=page;draw()}
 if(['expand','collapse','toggle'].includes(a.action)){const t=board.querySelector('[data-id="'+CSS.escape(a.target)+'"]');if(t){const hide=a.action==='collapse'||(a.action==='toggle'&&t.style.visibility!=='hidden');t.style.visibility=hide?'hidden':'visible';const model=p.pages.flatMap(pg=>pg.nodes).find(v=>v.id===a.target);if(model?.group){for(const peer of board.querySelectorAll('[data-id]')){if(p.pages.flatMap(pg=>pg.nodes).some(v=>v.id===peer.dataset.id&&v.group===model.group))peer.style.visibility=t.style.visibility}}}}
 }
 }
 function show(){if(!shown)return;paint(shown,inner,Math.max(100,innerWidth-46));if(!modal.open)modal.showModal()}
 function draw(){for(const b of nav.children)b.setAttribute('aria-current',b.dataset.page===current.id?'page':'false');root.style.setProperty('--accent',p.theme.accent);root.style.fontFamily=p.theme.font;paint(current,surface,document.documentElement.clientWidth);if(shown)show()}
 modal.addEventListener('close',()=>shown=null);window.addEventListener('resize',()=>{clearTimeout(resize);resize=setTimeout(draw,90)});draw()
}
function runtimeCode(){
 const funcs=[esc,cap,boxFor,bounds,cssProps,tableLines,dropdownChoices,tableMarkup,seedRows,markup,customDoc,makeEl,runtime];
 return 'const devices='+JSON.stringify(devices)+';\n'+funcs.map(f=>'const '+f.name+' = '+f.toString()+';').join('\n');
}
function runtimeHead(p){
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(p.name)+'</title><style>'+nativeCSS+'body{margin:0;background:#f5f4f8}main{min-height:100vh;display:grid;justify-content:center;align-content:start}.sized{position:relative}.board{position:absolute;transform-origin:top left;overflow:hidden}.exit{position:absolute;right:4px;top:4px;z-index:2;border:0;border-radius:50%;background:#f2eff6;color:#332c42;width:28px;height:28px;font-size:20px;cursor:pointer}dialog{padding:0;border:0;border-radius:13px;box-shadow:0 18px 72px #1f123655;max-width:98vw;max-height:95vh}dialog::backdrop{background:#21183366}.hit{position:absolute;background:transparent;border:0;cursor:pointer}.screenTabs{display:flex;gap:5px;padding:8px;overflow:auto;background:white;border-bottom:1px solid #ddd}.screenTabs button{white-space:nowrap;font:inherit;padding:6px 12px;border:0;background:transparent;border-radius:5px}.screenTabs [aria-current=page]{color:var(--accent);background:#f1edf8}.entryNotice:not(:empty){position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:#252132;color:white;border-radius:7px;padding:10px 16px;z-index:20}.object[data-type=Table]{overflow:auto}.object tr[data-empty] td{color:#716b78;text-align:center;padding:16px 5px}</style></head><body><div id="app"></div>';
}
function buildHTML(p,start,device,dataState){
 const safe=o=>JSON.stringify(o).replace(/</g,'\\u003c');
 const liveProject={...p,templates:[]};
 return runtimeHead(p)+'<script>'+runtimeCode()+'\nruntime('+safe(liveProject)+','+safe(dataState||'design')+','+safe(start||p.pages[0].id)+','+safe(device||null)+');<\/script></body></html>';
}
