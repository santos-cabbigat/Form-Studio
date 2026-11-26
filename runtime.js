const nativeCSS=`
*{box-sizing:border-box}.object{position:absolute;margin:0;line-height:1.25;font-family:inherit;overflow:hidden}.object[data-type=Icon]{display:grid;place-items:center;padding:0}.object[data-type=Icon]>svg{display:block;width:100%;height:100%}button.object[data-type=Icon]{cursor:pointer}.object[data-type=Button]{cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0 8px}.object[data-type=Text]{white-space:pre-wrap;display:flex;align-items:center;line-height:1.18;letter-spacing:-.025em}.object[data-type=Input]{padding:0 14px}input.object::placeholder{color:inherit;opacity:.7}.object[data-type=Image]{object-fit:cover;display:block}.object[data-type=Table]{padding:0}.object table{width:100%;border-collapse:collapse;font-size:inherit;color:inherit}.object th,.object td{padding:7px 10px;border-bottom:1px solid var(--table-line,#dedbe6);text-align:left}.object th{background:var(--table-tint,#f3effa);color:var(--table-heading,inherit)}.object[data-type=Custom]{border:0}.object[data-type=Button]:focus-visible,.object[tabindex]:focus-visible{outline:3px solid #8763dd}
`;
function cssProps(n,b){let s=n.style;return {left:b[0]+'px',top:b[1]+'px',width:b[2]+'px',height:b[3]+'px','background-color':s.fill,color:s.color,'border-radius':s.radius+'px','font-size':s.fontSize+'px','font-weight':String(s.weight),border:s.border,'text-align':s.align,...n.extraCSS}}
function labelHTML(parts){
 if(!Array.isArray(parts))throw Error('A formatted label needs text and inline elements.');
 return parts.map(part=>{
   if(typeof part==='string')return esc(part);
   if(!part||!['strong','b','em','i','span','u','s','small','sub','sup','mark','br'].includes(part.tag))throw Error('Use inline text formatting inside this label.');
   if(part.tag==='br')return '<br>';
   const css=Object.entries(part.style||{}).map(([key,value])=>{
     if(!['color','background-color','font-weight','font-style','font-family','font-size','text-decoration-line','text-decoration-color','text-decoration-style','letter-spacing'].includes(key)||typeof value!=='string'||/[;<>{}\\]/.test(value)||!CSS.supports(key,value))throw Error('Unsupported inline text style: '+key);
     return key+': '+value;
   }).join('; ');
   return '<'+part.tag+(css?' style="'+esc(css)+'"':'')+'>'+labelHTML(part.children)+'</'+part.tag+'>';
 }).join('');
}
function markup(n,source=false,rows){
 const type=n.type,formatted=n.labelParts&&['Button','Text'].includes(type),content=formatted?labelHTML(n.labelParts):esc(n.text);
 const label=formatted&&!source?'<span>'+content+'</span>':content;
 if(type==='Icon'){
   const interactive=n.actions.length>0,tag=interactive?'button':'span';
   return '<'+tag+(interactive?' type="button"':' role="img"')+' aria-label="'+esc(n.name)+'" data-studio-icon="'+esc(n.glyph)+'">'+icon(n.glyph,24)+'</'+tag+'>';
 }
 if(type==='Button')return '<button type="button">'+label+'</button>';
 if(pickerKind(n))return pickerMarkup(n);
 if(type==='Input'){
   const attrs=' aria-label="'+esc(n.name)+'"'+(n.requirement==='required'?' required':'');
   if(n.inputType==='select')return '<select'+attrs+'><option value="">'+label+'</option>'+dropdownChoices(n).map(o=>'<option value="'+esc(o.value)+'">'+esc(o.label)+'</option>').join('')+'</select>';
   return '<input'+attrs+' type="'+(['email','password','number','text'].includes(n.inputType)?n.inputType:'text')+'"'+(n.inputType==='number'?' step="any"':'')+' placeholder="'+label+'" autocomplete="off">';
 }
 if(type==='Image')return '<img alt="'+esc(n.name)+'" src="'+esc(n.src||'')+'">';
 if(type==='Table')return '<div data-start="'+esc(n.initialState||'sample')+'" data-empty="'+esc(n.emptyMessage??'No entries yet.')+'">'+tableMarkup(n,rows??(source?tableLines(n).slice(1):seedRows(n)))+'</div>';
 if(type==='Custom')return '<iframe title="'+esc(n.name)+'" sandbox=""></iframe>';
 return '<div>'+(type==='Text'?label:'')+'</div>'
}
function customDoc(n){
 const policy="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; base-uri 'none'; form-action 'none'";
 return '<!doctype html><meta http-equiv="Content-Security-Policy" content="'+policy+'"><style>*{box-sizing:border-box}body{margin:0;font:16px Arial,sans-serif}body>:first-child{max-width:100%}</style>'+n.html
}
function makeEl(n,b,edit=false,rows){
 const holder=document.createElement('template');holder.innerHTML=markup(n,false,rows);const el=holder.content.firstElementChild;
 el.className='object';el.dataset.id=n.id;el.dataset.type=n.type;for(const [k,v] of Object.entries(cssProps(n,b)))el.style.setProperty(k,v);
 if(n.type==='Custom'){if(!edit)el.setAttribute('sandbox','allow-scripts');el.srcdoc=customDoc(n)}
 if(n.type==='Text'||n.type==='Button')el.style.justifyContent={left:'flex-start',center:'center',right:'flex-end'}[n.style.align];
 if(edit){el.tabIndex=-1;if(el.tagName==='INPUT')el.readOnly=true}
 return el
}
function runtime(p,mode,start,forcedDevice,response='success',interactivePreview=false){
 const root=document.getElementById('app'),surface=document.createElement('main'),modal=document.createElement('dialog');
 root.classList.toggle('interactivePreview',interactivePreview);
 const close=document.createElement('button'); close.textContent='Close';close.className='exit';close.setAttribute('aria-label','Close window');
 const inner=document.createElement('div');modal.append(close,inner);root.append(surface,modal);close.onclick=()=>{cancelRuns();closeWindow()};
 let current=p.pages.find(q=>q.id===start)||p.pages[0],shown=null,resize,lastDevice;
 if(current.kind==='window'){shown=current;current=p.pages.find(q=>q.kind==='screen')||current}
 const records=new Map(), tables=new Map(), values=new Map(),hidden=new Set();
 const screens=p.pages.filter(pg=>pg.kind==='screen');
 for(const pg of p.pages)for(const n of pg.nodes)if(n.type==='Table'){
   tables.set(n.id,n);records.set(n.id,mode==='empty'?[]:mode==='sample'?tableLines(n).slice(1):seedRows(n));
 }
 const nav=document.createElement('nav');nav.className='screenTabs';nav.setAttribute('aria-label','Project screens');
 if(screens.length>1&&interactivePreview!=='canvas'){root.prepend(nav);for(const pg of screens){
   const b=document.createElement('button');b.type='button';b.textContent=pg.name;b.dataset.page=pg.id;
   b.onclick=()=>{cancelRuns();closeWindow();current=pg;draw()};nav.append(b);
 }}
 const notice=document.createElement('div');notice.className='entryNotice';notice.setAttribute('role','status');root.append(notice);let timer,noticeOwner;
 function notify(message,hold=false,owner=null){clearTimeout(timer);noticeOwner=owner;for(const anim of notice.getAnimations())anim.cancel();const parent=modal.open?modal:root;if(notice.parentNode!==parent)parent.append(notice);notice.textContent=message;if(!hold)timer=setTimeout(()=>notice.textContent='',4500)}
 const previewValues=new Map(), lastSubmit=new WeakMap();
 const nodes=new Map(p.pages.flatMap(pg=>pg.nodes.map(n=>[n.id,n])));
 const element=(id,container=root)=>container.querySelector('[data-id="'+CSS.escape(id)+'"]');
 const valueOf=(n,el)=>pickerKind(n)?(values.get(n.id)||''):(el?.value??values.get(n.id)??'');
 function put(n,el,value){
   if(!n)return;
   if(n.inputType!=='password')values.set(n.id,value);
   if(!el)return;
   if(pickerKind(n)){el.firstElementChild.textContent=pickerLabel(n,value);el.setAttribute('aria-label',n.name+(value?' · '+pickerLabel(n,value):''))}
   else el.value=value;
 }
 function readField(id,board,password=false){
   const n=nodes.get(id),el=element(id,board);
   if(!n||n.type!=='Input'||!el||(!password&&n.inputType==='password')){notify('A linked field is unavailable. Edit this trigger to reconnect it.');return null}
   const value=valueOf(n,el);
   if((el.checkValidity&&!el.checkValidity())||((n.requirement==='required'||password)&&!value.trim())){el.reportValidity?.();el.focus();notify('Check '+n.name+'.');return null}
   return {n,el,value};
 }
 const pickers=pickerController(valueOf,(n,el,value,userChoice)=>{
   const old=valueOf(n,el);put(n,el,value);
   if(userChoice&&old!==value)act(n,'change',el.closest('.board'));
 },p.theme.accent,(n,anchor)=>{
   const id=n.picker?.footerButton,board=anchor.closest('.board'),button=nodes.get(id);
   if(!button||button.type!=='Button'||!element(id,board))return null;
   return {label:button.text||button.name,run:()=>act(button,'click',board)};
 });
 function saveRow(a,board){
   const table=tables.get(a.target);
   if(!table){notify('Choose a destination table in the trigger.');return false}
   const fields=mappedFields(a,table);
   if(!fields){notify('A linked table column changed. Reconnect the Save trigger.');return false}
   const cells=[];
   for(const id of fields){
     if(!id){cells.push('');continue}
     const field=readField(id,board);if(!field)return false;cells.push(field.value);
   }
   const time=Date.now(),signature=JSON.stringify(cells),previous=lastSubmit.get(a);
   if(previous&&previous.signature===signature&&time-previous.time<650)return false;
   lastSubmit.set(a,{signature,time});records.get(a.target).push(cells);
   for(const el of root.querySelectorAll('[data-type="Table"]'))if(el.dataset.id===a.target)el.innerHTML=tableMarkup(table,records.get(a.target));
   if(a.message)notify(a.message);return true;
 }
 function applyDataAction(a,board,activeLayerId,activeEvent){
   const n=nodes.get(a.target);
   if(a.action==='togglePassword'){
     const input=element(a.target,board);
     if(n?.type!=='Input'||n.inputType!=='password'||!input){notify('Choose a password field on this screen.');return false}
     const reveal=input.type==='password';input.type=reveal?'text':'password';
     for(const control of board.querySelectorAll('[data-password-toggle]')){
       if(control.dataset.passwordToggle!==a.target)continue;
       control.setAttribute('aria-pressed',String(reveal));
       control.setAttribute('aria-label',(reveal?'Hide password':'Show password')+' · '+n.name);
       if(['eye','eyeOff'].includes(control.dataset.studioIcon))control.innerHTML=icon(reveal?'eyeOff':'eye',24);
     }
     return true;
   }
   if(a.action==='saveRow')return saveRow(a,board);
   if(a.action==='developer'){
     document.dispatchEvent(new CustomEvent('formstudio:action',{detail:{name:a.key,screenId:board.dataset.pageId,layerId:activeLayerId,event:activeEvent}}));return true;
   }
   if(a.action==='clearFields'){
     const targets=a.fields.map(id=>[nodes.get(id),element(id,board)]);
     if(targets.some(([n,el])=>n?.type!=='Input'||!el)){notify('Reconnect the missing field before clearing.');return false}
     for(const [n,el] of targets)put(n,el,'');return true;
   }
   if(a.action==='pickerAction'){
     const el=element(a.target,board);if(!n||!pickerKind(n)||!el){notify('Choose a picker on this screen.');return false}
     pickers.run(n,el,a.operation);return true;
   }
   if(a.action==='loadValue'||a.action==='copyValue'){
     if(n?.type!=='Input'||n.inputType==='password'){notify('Choose a destination field.');return false}
     let value;
     if(a.action==='loadValue'){
       if(!previewValues.has(a.key)){notify('No preview value named “'+a.key+'” has been saved yet.');return false}
       value=previewValues.get(a.key);
     }else{const src=readField(a.source,board);if(!src)return false;value=src.value}
     if(!acceptsPickerValue(n,value)){notify('This value does not match '+n.name+'.');return false}
     put(n,element(a.target),value);return true;
   }
   if(a.action==='saveValue'||a.action==='passwordDemo'){
     const password=a.action==='passwordDemo',field=readField(a.target,board,password);if(!field)return false;
     if(password){if(field.n.inputType!=='password'){notify('Choose a sample password field.');return false}put(field.n,field.el,'');notify(a.message||'Password update simulated.')}
     else previewValues.set(a.key,field.value);
   }
   return true;
 }
 function device(){return forcedDevice||(window.innerWidth<600?'phone':window.innerWidth<1040?'tablet':'laptop')}
 function paint(page,target,available){
 const d=device(),[w,h]=bounds(page,d,p);const zoom=Math.min(1,available/w);
 const board=document.createElement('section');board.className='board';board.dataset.pageId=page.id;board.style.cssText='width:'+w+'px;height:'+h+'px;zoom:'+zoom+';';board.style.backgroundColor=page.backgrounds?.[d]||p.theme.background;
 const outer=document.createElement('div');outer.className='sized';outer.style.width=w*zoom+'px';outer.style.height=h*zoom+'px';outer.append(board);target.replaceChildren(outer);
 page.nodes.filter(n=>!n.hide?.[d]).forEach(n=>{
 let el=makeEl(n,boxFor(n,d,p,page),false,records.get(n.id));board.append(el);if(hidden.has(n.id))el.style.visibility='hidden';
 if(pickerKind(n)){
   put(n,el,values.get(n.id)||'');
   el.addEventListener('click',()=>pickers.open(n,el));
 }else if(n.type==='Input'){
   if(n.inputType!=='password'){if(values.has(n.id))el.value=values.get(n.id);el.addEventListener('input',()=>values.set(n.id,el.value))}
   el.addEventListener('change',()=>{if(n.inputType!=='password')values.set(n.id,el.value);act(n,'change',board)});
 }
 if(n.type==='Custom'&&n.actions?.length){const b=boxFor(n,d,p,page),hit=document.createElement('button');hit.className='hit';hit.dataset.hitFor=n.id;if(hidden.has(n.id))hit.style.visibility='hidden';hit.setAttribute('aria-label',n.name);Object.assign(hit.style,{left:b[0]+'px',top:b[1]+'px',width:b[2]+'px',height:b[3]+'px'});board.append(hit);el=hit}
 const toggle=n.actions?.find(a=>a.action==='togglePassword');
 if(toggle){
   el.dataset.passwordToggle=toggle.target;el.setAttribute('aria-pressed','false');
   el.setAttribute('aria-label','Show password · '+(nodes.get(toggle.target)?.name||'Password'));
   if(['eye','eyeOff'].includes(n.glyph))el.innerHTML=icon('eye',24);
   el.addEventListener('mousedown',e=>{if(document.activeElement===element(toggle.target,board))e.preventDefault()});
 }
 if(n.actions?.length){if(el.tabIndex<0)el.tabIndex=0;
 el.addEventListener('click',()=>act(n,'click',board));el.addEventListener('keydown',e=>{if(e.key==='Enter'&&n.actions.some(a=>a.event==='enter')){e.preventDefault();act(n,'enter',board)}})}
 });
 for(const control of board.querySelectorAll('[data-studio-icon][data-password-toggle]')){
   const input=element(control.dataset.passwordToggle,board);
   if(!input)continue;
   const ix=input.offsetLeft,iy=input.offsetTop,right=ix+input.offsetWidth,cy=control.offsetTop+control.offsetHeight/2;
   if(cy>=iy&&cy<=iy+input.offsetHeight&&control.offsetLeft>=ix+input.offsetWidth/2&&control.offsetLeft<right&&control.offsetLeft+control.offsetWidth<=right+1){
     input.style.paddingRight=Math.max(parseFloat(getComputedStyle(input).paddingRight)||0,right-control.offsetLeft+3)+'px';
   }
 }
 }
 // Keep timed actions tied to their interaction. Manual navigation or dismissal
 // cancels the old flow. Navigation performed by a step continues its own flow.
 const runs=new Map();
 function cancelRuns(except){
   for(const run of runs.values())if(run!==except)run.abort();
 }
 function waitFor(ms,signal){
   return new Promise(resolve=>{
     const id=setTimeout(finish,ms);
     function finish(){clearTimeout(id);signal.removeEventListener('abort',finish);resolve()}
     signal.addEventListener('abort',finish,{once:true});
   });
 }
 async function fadeOut(el,ms,signal){
   if(!ms||matchMedia('(prefers-reduced-motion: reduce)').matches||!el.animate)return true;
   const animation=el.animate([{opacity:1},{opacity:0}],{duration:ms,easing:'ease-in',fill:'forwards'});
   const cancel=()=>animation.cancel();
   signal.addEventListener('abort',cancel,{once:true});
   try{await animation.finished;return !signal.aborted}
   catch{return false}
   finally{signal.removeEventListener('abort',cancel);animation.cancel()}
 }
 async function act(n,event,board){
   const actions=n.actions.filter(a=>a.event===event);
   if(!actions.length)return;
   const key=n.id+'/'+event,run=new AbortController(),signal=run.signal;
   runs.get(key)?.abort();runs.set(key,run);
   const origin=board.dataset.pageId;
   try{
     for(const [index,a] of actions.entries()){
       if(signal.aborted)return;
       if(a.delayMs){await waitFor(a.delayMs,signal);if(signal.aborted)return}
       // A responsive repaint can replace the originating board during a wait.
       if(!board.isConnected)board=root.querySelector('.board[data-page-id="'+CSS.escape(origin)+'"]')||board;
       if(['saveRow','saveValue','copyValue','passwordDemo'].includes(a.action)&&response!=='success'){
         const feedback={saving:'Saving…',failed:'Save failed. Try again.',offline:'Offline. Your entry is still here.'};
         notify(a.feedback?.[response]||feedback[response],response==='saving');return;
       }
       if(!applyDataAction(a,board,n.id,event))return;
       const page=p.pages.find(q=>q.id===a.target);
       switch(a.action){
         case 'message':case 'customDemo':{
           const hold=actions.slice(index+1).some(next=>next.action==='fadeMessage');
           notify(a.message,hold,hold?run:null);break;
         }
         case 'fadeMessage':
           if(notice.textContent){
             if(!await fadeOut(notice,a.durationMs??350,signal)||signal.aborted)return;
             notify('');
           }
           break;
         case 'fadeClose':
           if(!modal.open){notify('Open a window before fading it out.');return}
           cancelRuns(run);
           if(!await fadeOut(modal,a.durationMs??350,signal)||signal.aborted)return;
           closeWindow();break;
         case 'open':
           if(page?.kind!=='window'){notify('Choose a window for this trigger.');return}
           cancelRuns(run);shown=page;show();break;
         case 'close':cancelRuns(run);closeWindow();break;
         case 'go':
           if(page?.kind!=='screen'){notify('Choose a screen for this trigger.');return}
           cancelRuns(run);closeWindow();current=page;draw();break;
         case 'expand':case 'collapse':case 'toggle':{
           const target=nodes.get(a.target),targetEl=element(a.target,board);
           if(!target||!targetEl){notify('Reconnect the layer for this trigger.');return}
           const hide=a.action==='collapse'||(a.action==='toggle'&&!hidden.has(a.target));
           for(const el of board.querySelectorAll('[data-id],[data-hit-for]')){
             const id=el.dataset.id||el.dataset.hitFor;
             if(id!==target.id&&(!target.group||nodes.get(id)?.group!==target.group))continue;
             if(hide)hidden.add(id);else hidden.delete(id);
             el.style.visibility=hide?'hidden':'visible';
           }
           break;
         }
       }
     }
   }finally{
     if(runs.get(key)===run)runs.delete(key);
     if(noticeOwner===run)notify('');
   }
 }
 function reportLocation(){
   if(interactivePreview&&parent!==window)parent.postMessage({type:'form-studio-location',page:(shown||current).id,layout:device(),navHeight:shown?.deviceSized?0:nav.offsetHeight},'*');
 }
 function closeWindow(){shown=null;pickers.close();if(modal.open)modal.close();reportLocation()}
 function show(){
   if(!shown)return;
   modal.classList.toggle('deviceSized',!!shown.deviceSized);
   if(!modal.open)modal.showModal();
   paint(shown,inner,document.documentElement.clientWidth);reportLocation();
 }
 function draw(){lastDevice=device();pickers.close();for(const b of nav.children)b.setAttribute('aria-current',b.dataset.page===current.id?'page':'false');root.style.setProperty('--accent',p.theme.accent);root.style.fontFamily=p.theme.font;
  for(const [property,value] of Object.entries({'--table-tint':p.theme.tint,'--surface':p.theme.surface,'--ink':p.theme.ink,'--line':p.theme.line,'--tab-radius':Number.isFinite(p.theme.tabRadius)?p.theme.tabRadius+'px':'','--canvas':p.theme.background})){
    if(value)root.style.setProperty(property,value);
  }
  paint(current,surface,document.documentElement.clientWidth);if(shown)show();else reportLocation()}
 modal.addEventListener('close',()=>{if(!modal.open){shown=null;reportLocation()}});
 modal.addEventListener('cancel',()=>{cancelRuns();shown=null;pickers.close();reportLocation()});
 function fitExisting(container,available){
   const outer=container.firstElementChild,board=outer?.firstElementChild;
   if(!board)return;
   const width=parseFloat(board.style.width),height=parseFloat(board.style.height),zoom=Math.min(1,available/width);
   board.style.zoom=zoom;outer.style.width=width*zoom+'px';outer.style.height=height*zoom+'px';
 }
 window.addEventListener('resize',()=>{clearTimeout(resize);resize=setTimeout(()=>{
   if(lastDevice!==device()){draw();return}
   fitExisting(surface,document.documentElement.clientWidth);
   if(shown)fitExisting(inner,document.documentElement.clientWidth);pickers.position();
 },90)});
 if(interactivePreview)window.addEventListener('message',event=>{
   const config=event.data;
   if(event.source!==parent||config?.type!=='form-studio-preview')return;
   if(!Object.hasOwn(devices,config.device)||!['design','sample','empty'].includes(config.dataState)||!['success','saving','failed','offline'].includes(config.response))return;
   const newLayout=config.device!==forcedDevice;
   forcedDevice=config.device;
   if(response!==config.response){cancelRuns();response=config.response;clearTimeout(timer);notice.textContent=''}
   if(mode!==config.dataState){
     mode=config.dataState;
     for(const [id,table] of tables){
       const rows=mode==='empty'?[]:mode==='sample'?tableLines(table).slice(1):seedRows(table);
       records.set(id,rows);for(const el of root.querySelectorAll('[data-type="Table"]'))if(el.dataset.id===id)el.innerHTML=tableMarkup(table,rows);
     }
   }
   if(newLayout)draw();
   parent.postMessage({type:'form-studio-ready',sequence:config.sequence},'*');
 });
 draw()
}
function runtimeCode(){
 const funcs=[icon,esc,cap,editableCanvasWidth,boxFor,deviceViewport,bounds,cssProps,tableLines,dropdownChoices,tableMarkup,seedRows,columnKeys,mappedFields,pickerKind,pickerFormatOptions,pickerLabel,pickerMarkup,acceptsPickerValue,pickerController,labelHTML,markup,customDoc,makeEl,runtime];
 return 'const paths='+JSON.stringify(paths)+';\nconst devices='+JSON.stringify(devices)+';\n'+funcs.map(f=>'const '+f.name+' = '+f.toString()+';').join('\n');
}
function runtimeHead(p){
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(p.name)+'</title><style>'+nativeCSS+pickerCSS+'body{margin:0;background:#f5f4f8}main{min-height:100vh;display:grid;justify-content:center;align-content:start}.interactivePreview main{min-height:0}.sized{position:relative}.board{position:absolute;transform-origin:top left;overflow:hidden}.exit{position:absolute;right:4px;top:4px;z-index:2;border:0;border-radius:50%;background:#f2eff6;color:#332c42;width:auto;padding:0 9px;height:28px;font-size:13px;cursor:pointer}dialog{padding:0;border:0;border-radius:13px;box-shadow:0 18px 72px #1f123655;max-width:100%;max-height:100%}html:has(dialog[open].deviceSized){overflow:hidden}dialog.deviceSized{border-radius:0}dialog::backdrop{background:#21183366}.hit{position:absolute;background:transparent;border:0;cursor:pointer}.screenTabs{display:flex;gap:5px;padding:8px;overflow:auto;background:var(--surface,white);border-bottom:1px solid var(--line,#ddd)}.screenTabs button{white-space:nowrap;font:inherit;padding:6px 12px;border:0;background:transparent;color:var(--ink,inherit);border-radius:var(--tab-radius,5px)}.screenTabs [aria-current=page]{color:var(--accent);background:var(--table-tint,#f1edf8)}.entryNotice:not(:empty){position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:#252132;color:white;border-radius:7px;padding:10px 16px;z-index:20}.object[data-type=Table]{overflow:auto}.object tr[data-empty] td{color:var(--ink,#716b78);text-align:center;padding:16px 5px}</style></head><body><div id="app"></div>';
}
function buildHTML(p,start,device,dataState,response,interactivePreview=false){
 const safe=o=>JSON.stringify(o).replace(/</g,'\\u003c');
 const liveProject={...p,templates:[]};
 return runtimeHead(p)+'<script>'+runtimeCode()+'\nruntime('+safe(liveProject)+','+safe(dataState||'design')+','+safe(start||p.pages[0].id)+','+safe(device||null)+','+safe(response||'success')+','+safe(interactivePreview)+');<\/script></body></html>';
}
