'use strict';
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const key='formstudio.workspace.v1',tabs=['Insert','Triggers','Layers','Palette','Theme'];
let project=intro(),storageOK=true, loadNote='';
try{const saved=localStorage.getItem(key);if(saved){const q=JSON.parse(saved);if(q.format==='form-studio'&&q.pages?.length)project=q;else loadNote='Saved project could not be loaded.'}}catch{storageOK=false;loadNote='Device storage is unavailable. Export a project copy.'}
let pageId=project.pages[0].id,device='laptop',tab='Insert',mode='design',selected=[project.pages[0].nodes.at(-1)?.id].filter(Boolean),zoomFactor=1,pan=[0,0],panMode=false,scale=1,search='',past=[],future=[],gesture=null,toastTimer,codeDirty=false,multi=false;
const page=()=>project.pages.find(v=>v.id===pageId)||project.pages[0];
const sel=()=>page().nodes.find(n=>n.id===selected.at(-1));
const btn=(cmd,label,ic='',cl='btn')=>'<button class="'+cl+'" data-cmd="'+cmd+'">'+(ic?icon(ic,15):'')+esc(label)+'</button>';
const options=(items,value)=>items.map(t=>{const [v,l]=Array.isArray(t)?t:[t,t];return '<option value="'+esc(v)+'" '+(v===value?'selected':'')+'>'+esc(l)+'</option>'}).join('');
const field=(label,html)=>'<label class="field">'+esc(label)+html+'</label>';
const prop=(k,v,type='text')=>'<input data-prop="'+k+'" type="'+type+'" value="'+esc(v)+'">';
const names={click:'Click / tap',enter:'Press Enter',open:'Open window',close:'Close window',go:'Go to screen',expand:'Show / expand',collapse:'Hide / collapse',toggle:'Toggle visibility'};
const actName=a=>names[a.event]+' → '+names[a.action];
function toast(msg){$('#toast').textContent=msg;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2500)}
function write(){try{localStorage.setItem(key,JSON.stringify(project));storageOK=true}catch{storageOK=false;toast('Storage full or unavailable. Export a project copy.')}$('#saveStatus').textContent=storageOK?'Saved on this device':'Unsaved · export a project copy'}
function remember(s=JSON.stringify(project)){past.push(s);if(past.length>24)past.shift();future=[]}
function change(fn,msg){remember();fn();clean();write();render();if(msg)toast(msg)}
function clean(){if(!project.pages.some(p=>p.id===pageId))pageId=project.pages[0].id;selected=selected.filter(id=>page().nodes.some(n=>n.id===id))}
function history(back){const from=back?past:future,to=back?future:past;if(!from.length)return;to.push(JSON.stringify(project));project=JSON.parse(from.pop());clean();write();render()}
function dismiss(){ $('#overlay').replaceChildren() }
function modal(title,body,wide=false){$('#overlay').innerHTML='<div class="dialogBg"><section class="dialog '+(wide?'wide':'')+'" role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><header class="dialogHead"><h2>'+esc(title)+'</h2>'+btn('dismiss','', 'close','')+'</header>'+body+'</section></div>';let first=$('.dialog input,.dialog select,.dialog textarea');if(first)first.focus()}
function closeSide(){for(const s of ['.library','.inspector'])$(s).classList.remove('shown')}
function choosePage(id){pageId=id;selected=[];multi=false;zoomFactor=1;pan=[0,0];dismiss();render()}
function selectIds(ids){selected=[...new Set(ids)];codeDirty=false;drawBoard();drawProps();if(['Layers','Triggers'].includes(tab))drawLibrary()}
function render(){clean();$('#projectName').textContent=project.name;
 $('#tabs').innerHTML=tabs.map(t=>'<button data-tab="'+t+'" class="'+(tab===t?'active':'')+'">'+icon(t.toLowerCase())+t+'</button>').join('');
 $('#pageBtn').innerHTML=icon(page().kind==='window'?'window':'page',15)+esc(page().name)+icon('down',13);
 $('#devices').innerHTML=Object.keys(devices).map(d=>'<button title="'+cap(d)+' layout" aria-label="'+cap(d)+' layout" class="'+(d===device?'active':'')+'" data-device="'+d+'">'+icon(d,15)+'<span>'+cap(d)+'</span></button>').join('');
 $('button[data-cmd=undo]').innerHTML=icon('undo',15);$('button[data-cmd=undo]').disabled=!past.length;
 $('button[data-cmd=redo]').innerHTML=icon('redo',15);$('button[data-cmd=redo]').disabled=!future.length;
 $('button[data-cmd=preview]').innerHTML=icon('preview',14)+'Preview';$('button[data-cmd=export]').innerHTML=icon('export',14)+'Export';
 $('#selectTool').innerHTML=icon('select',15);$('#panTool').innerHTML=icon('pan',16);$('#selectTool').classList.toggle('on',!panMode);$('#panTool').classList.toggle('on',panMode);$('#sizeBtn').innerHTML=icon('ruler',13)+project.widths[device]+' px '+icon('down',11);
 drawLibrary();drawBoard();drawProps();$('#multiTool').classList.toggle('on',multi);$('#multiTool').setAttribute('aria-pressed',String(multi))
}
function drawBoard(){
 const s=$('#sheet'),pg=page(),[w,h]=bounds(pg,device,project);s.innerHTML='';s.style.width=w+'px';s.style.height=h+'px';s.style.background=project.theme.background;s.style.fontFamily=project.theme.font;s.style.setProperty('--accent',project.theme.accent);
 for(const n of pg.nodes){if(n.hide?.[device])continue;const b=boxFor(n,device,project,pg),wrap=document.createElement('div');wrap.className='nodeWrap'+(selected.includes(n.id)?' selected':'');wrap.dataset.id=n.id;
 position(wrap,b);wrap.append(makeEl(n,b,true));for(const dir of ['tl','tr','bl','br']){const handle=document.createElement('i');handle.className='handle '+dir;handle.dataset.handle=dir;wrap.append(handle)}s.append(wrap)}
 $('#boardLabel').innerHTML=icon(pg.kind==='window'?'window':'page',13)+esc(pg.name);$('#boardSize').textContent=w+' × '+h;fitBoard()
}
function position(el,b){Object.assign(el.style,{left:b[0]+'px',top:b[1]+'px',width:b[2]+'px',height:b[3]+'px'})}
function fitBoard(){const [w,h]=bounds(page(),device,project),stage=$('#stage'),m=stage.clientWidth<480?22:54;scale=Math.max(.1,Math.min((stage.clientWidth-m)/w,(stage.clientHeight-114)/h,1.35)*zoomFactor);$('#sheet').style.transform='scale('+scale+')';const wrap=$('#sheetWrap');wrap.style.width=w*scale+'px';wrap.style.height=h*scale+'px';wrap.style.transform='translate(calc(-50% + '+pan[0]+'px),calc(-50% + '+pan[1]+'px))';$('#zoom').textContent=Math.round(scale*100)+'%'}
function preset(cmd,title,ic,color=''){return '<button data-cmd="'+cmd+'" class="preset"><span class="presetIcon '+color+'">'+icon(ic,16)+'</span><span>'+esc(title)+'</span>'+icon('right',13)+'</button>'}
function section(title,body){return '<section class="libSection"><h3 class="sectionTitle">'+esc(title)+'</h3>'+body+'</section>'}
function drawLibrary(){
 let pane='';
 if(tab==='Insert'){
 const match=t=>t.toLowerCase().includes(search.toLowerCase());
 pane='<div class="libTop"><h2>Component library</h2><label class="search">'+icon('search',14)+'<input id="search" placeholder="Find a component" aria-label="Find a component" value="'+esc(search)+'"><kbd>/</kbd></label></div>';
 const cards=types.filter(match);pane+=section('Elements',cards.length?'<div class="cardGrid">'+cards.map(t=>'<button class="component" data-insert="'+t+'" draggable="true">'+icon(categoryIcon(t),19)+'<span>'+t+'</span></button>').join('')+'</div>':'<span class="hint">No matching elements.</span>');
 pane+=section('Screen templates',[['signin','Sign-in screen','page',''],['ledger','Account ledger','table','mint'],['blank','Blank screen','insert','sand']].filter(a=>match(a[1])).map(a=>preset(...a)).join(''));
 pane+=section('My templates',templateRows(search)+btn('new-template','Add template','plus','addTemplate'));
 }else if(tab==='Layers'){
 pane='<div class="panel"><h2>Layers</h2>'+field('Screen or window','<select id="pageSelect">'+options(project.pages.map(p=>[p.id,p.name]),pageId)+'</select>')+
 '<div class="row">'+btn('pages','Manage screens','page','btn smallBtn')+'</div><h3 class="mt">Elements</h3>'+btn('multi',multi?'Finish selecting ('+selected.length+')':'Select multiple','group','btn smallBtn')+
 [...page().nodes].reverse().map(n=>'<button data-layer="'+n.id+'" class="layer '+(selected.includes(n.id)?'active':'')+'">'+icon(categoryIcon(n.type),15)+esc(n.name)+(n.group?' '+icon('group',12):'')+'</button>').join('')+'<div class="row">'+btn('group','Group','','btn smallBtn')+btn('ungroup','Ungroup','','btn smallBtn')+'</div><div class="row">'+btn('forward','Bring forward','','btn smallBtn')+btn('back','Send back','','btn smallBtn')+'</div>'+btn('delete','Delete selection','','btn smallBtn')+'</div>'
 }else if(tab==='Triggers'){
 const n=sel();pane='<div class="panel"><h2>Triggers</h2>'+(n?'<h3>'+esc(n.name)+'</h3>'+n.actions.map((a,i)=>'<div class="row"><button class="actLine" data-editaction="'+i+'">'+icon('triggers',14)+esc(actName(a))+'</button><button title="Remove trigger" data-rmaction="'+i+'">×</button></div>').join('')+btn('add-action','Add trigger','plus','btn full'):'<p>Select an element to attach a trigger.</p>')+'<h3 class="mt">My trigger templates</h3>'+templateRows('',true)+btn('new-trigger','New trigger template','plus','addTemplate')+'</div>'
 }else if(tab==='Palette'){
 pane='<div class="panel"><h2>Color palette</h2><p>Apply a swatch to the selected element’s fill.</p><div class="swatches">'+project.palette.map(c=>'<button class="swatch" data-swatch="'+esc(c)+'" style="background:'+esc(c)+'" title="Apply '+esc(c)+'"></button>').join('')+'</div>'+field('Add a custom color','<input type="color" id="newColor" value="#a28bc2">')+btn('add-color','Save color','plus','btn')+'<h3 class="mt">Palette presets</h3>'+['Studio violet','Coastal green','Warm clay'].map((v,i)=>'<button class="variant" data-palette="'+i+'">'+v+icon('right',13)+'</button>').join('')+'</div>'
 }else{
 pane='<div class="panel"><h2>Theme</h2>'+field('Project font','<select data-theme="font">'+options(families,project.theme.font)+'</select>')+themeColor('Accent','accent')+themeColor('Canvas background','background')+'<p>Theme settings apply across the project. Buttons using the accent color update together.</p></div>'
 }
 $('#library').innerHTML=pane
}
function themeColor(l,k){return field(l,'<input type="color" data-theme="'+k+'" value="'+esc(project.theme[k])+'">')}
function templateRows(q,onlyTrigger=false){return project.templates.filter(t=>(!onlyTrigger||t.kind==='trigger')&&t.name.toLowerCase().includes(q.toLowerCase())).map(t=>'<div class="templateRow">'+preset('use-'+t.id,t.name,t.kind==='trigger'?'triggers':t.kind==='window'?'window':t.kind==='block'?'group':'code')+'<button data-edittemplate="'+t.id+'" title="Manage template" aria-label="Manage '+esc(t.name)+'">⋯</button></div>').join('')}
function drawProps(){
 const n=sel(),head='<div class="insHead"><h2>Inspector</h2>'+icon('sliders',16)+'</div><div style="padding:0 15px 13px"><div class="seg"><button data-mode="design" class="'+(mode==='design'?'active':'')+'">'+icon('sliders',13)+'Design</button><button data-mode="code" class="'+(mode==='code'?'active':'')+'">'+icon('code',13)+'Code</button></div></div>';let body='';
 if(mode==='code'){body=codePanel()}
 else if(!n){body='<div class="part"><h3>'+esc(page().name)+'</h3><p class="hint">Open Code to copy this entire '+page().kind+', or select a layer.</p>'+btn('page-settings','Screen settings','page')+'</div>'}
 else if(selected.length>1){body=groupPanel()}
 else{
 const b=boxFor(n,device,project,page());
 body='<div class="part"><div class="typeLine"><span class="typeIcon">'+icon(categoryIcon(n.type),17)+'</span><div><strong>'+esc(n.type)+'</strong><small>Selected element</small></div></div>'+field('Layer name',prop('name',n.name))+(['Button','Text','Input'].includes(n.type)?field(n.type==='Input'?'Placeholder':'Label',prop('text',n.text)):'')+(n.type==='Table'?field('Rows · separate cells with |','<textarea data-prop="rows">'+esc(n.rows)+'</textarea>'):'')+(n.type==='Image'?btn('replace-image','Replace image','image','btn smallBtn'):'')+'</div>';
 body+='<div class="part"><h3>Position & size</h3><div class="grid2">'+['X','Y','W','H'].map((k,i)=>'<label class="dim">'+k+'<input type="number" aria-label="'+k+'" data-box="'+i+'" value="'+b[i]+'"></label>').join('')+'</div></div>';
 body+='<div class="part"><h3>Appearance</h3>'+colorControl('Fill','fill',n.style.fill)+colorControl('Text','color',n.style.color)+'<label class="propRow">Corner radius<span class="dim" style="width:102px"><input type="number" min="0" data-style="radius" value="'+n.style.radius+'">px</span></label><label class="propRow">Font size<span class="dim" style="width:102px"><input type="number" min="1" data-style="fontSize" value="'+n.style.fontSize+'">px</span></label></div>';
 body+='<div class="part"><h3>Interactions</h3>'+(n.actions.length?n.actions.map((a,i)=>'<button class="actLine" data-editaction="'+i+'">'+icon('triggers',14)+actName(a)+'</button>').join(''):btn('add-action','Add trigger','triggers','btn smallBtn'))+'</div><div class="part">'+btn('save-selected','Save as template','library','btn full')+'</div>'
 }
 $('#inspector').innerHTML=head+body;const code=$('#elementCode');if(code){code.setSelectionRange(0,code.value.length);code.scrollTop=0}
}
function colorControl(label,k,v){const actual=v==='var(--accent)'?project.theme.accent:/^#[a-f\d]{6}$/i.test(v)?v:'#ffffff';return '<label class="colorRow">'+label+'<span class="colorBox"><input type="color" data-style="'+k+'" value="'+actual+'">'+esc(v==='var(--accent)'?actual.toUpperCase():v)+'</span></label>'}
function sourceFor(n){
 const b=boxFor(n,device,project,page()), selector='#'+n.id, rules=Object.entries(cssProps(n,b)).map(([k,v])=>'  '+k+': '+v+';').join('\n');
 let html=n.type==='Custom'?'<!-- Embedded component -->\n'+n.html:markup(n).replace(/^<(\w+)/,'<$1 id="'+n.id+'"');
 const actions='<script type="application/json" data-triggers>\n'+JSON.stringify(n.actions,null,2).replace(/</g,'\\u003c')+'\n</script>';
 return '<style data-layout>\n'+selector+' {\n'+rules+'\n}\n</style>\n'+html+'\n'+actions
}
function declarations(css){const sheet=new CSSStyleSheet();sheet.replaceSync(css);return [...sheet.cssRules]}
function normalizeColor(v){if(!v)return null;if(v==='transparent'||v==='var(--accent)')return v;if(!CSS.supports('color',v))return null;const c=document.createElement('canvas').getContext('2d');c.fillStyle=v;return c.fillStyle}
function readStyles(n,st,box){
 const coords=['left','top','width','height'];const represent=(val,key)=>{if(!/^-?[\d.]+(?:px)?$/i.test(val))throw Error(key+' needs a pixel value for visual editing.');return Math.round(parseFloat(val))};
 for(const k of st){const val=st.getPropertyValue(k).trim(),i=coords.indexOf(k);
 if(i>=0){box[i]=represent(val,k);continue}
 if(k==='background-color'||k==='color'){n.style[k==='color'?'color':'fill']=normalizeColor(val)||val;continue}
 if(k==='border-radius'||k==='font-size'){if(k==='border-radius'&&val==='50%'){n.style.radius=999;continue}n.style[k==='border-radius'?'radius':'fontSize']=Math.max(0,represent(val,k));continue}
 if(k==='font-weight'){n.style.weight=val;continue}if(k==='text-align'){n.style.align=val;continue}
 if(k==='border'){n.style.border=val;continue}
 if(k==='background'&&normalizeColor(val)){n.style.fill=normalizeColor(val);continue}
 if(['position','inset','z-index','pointer-events','display','transform'].includes(k)||/url\s*\(|!important/i.test(val))throw Error('Use an embedded HTML template to preserve '+k+'.');
 n.extraCSS??={};n.extraCSS[k]=val
 }
 // The CSSOM expands a border shorthand into its longhands.
 if(st.borderRadius){const r=st.borderRadius;if(/^([0-9.]+)px$/.test(r)||r==='0px'||r==='50%'){n.style.radius=r==='50%'?999:parseFloat(r);for(const k of Object.keys(n.extraCSS||{}))if(/^border-(?:top|bottom)-(?:left|right)-radius$/.test(k))delete n.extraCSS[k]}}
 if(st.border){n.style.border=st.border;for(const k of Object.keys(n.extraCSS||{}))if(/^border-(?:top|left|bottom|right)-(?:width|style|color)$/.test(k))delete n.extraCSS[k]}
}
function parseElement(n,code){
 const draft=clone(n),b=boxFor(n,device,project,page()),doc=new DOMParser().parseFromString(code,'text/html');
 const actionBlock=doc.querySelector('script[data-triggers]');if(actionBlock){const a=JSON.parse(actionBlock.textContent);if(!Array.isArray(a)||a.some(v=>!['click','enter'].includes(v.event)||!['open','close','go','expand','collapse','toggle'].includes(v.action)||(v.action!=='close'&&!targetChoices(v.action).some(t=>t[0]===v.target))))throw Error('Use a supported event, action, and target in the trigger list.');draft.actions=a;actionBlock.remove()}else draft.actions=[];
 const layout=doc.querySelector('style[data-layout]');draft.extraCSS={};
 if(layout){const rules=declarations(layout.textContent);if(rules.length!==1||!rules[0].style)throw Error('Keep one layout rule for the selected element.');readStyles(draft,rules[0].style,b);layout.remove()}
 if(n.type==='Custom'){draft.html=code.replace(/<style\b[^>]*\bdata-layout\b[^>]*>[\s\S]*?<\/style>/i,'').replace(/<script\b[^>]*\bdata-triggers\b[^>]*>[\s\S]*?<\/script>/i,'').replace('<!-- Embedded component -->','').trim();if(!draft.html)throw Error('Enter component markup.')}
 else{
 if(doc.querySelector('script,iframe,object,embed,link'))throw Error('Use My templates → Embedded HTML for a self-contained widget.');
 const el=doc.body.firstElementChild,tags={Text:'DIV',Button:'BUTTON',Input:'INPUT',Table:'DIV',Image:'IMG',Module:'DIV',Shape:'DIV'};
 if(!el||el.tagName!==tags[n.type]||doc.body.children.length!==1)throw Error('Keep the '+tags[n.type].toLowerCase()+' root, or import this as an embedded template.');
 for(const style of doc.querySelectorAll('style'))for(const r of declarations(style.textContent)){if(!r.style||!el.matches(r.selectorText))throw Error('Embedded HTML supports multi-element styles.');readStyles(draft,r.style,b)}
 readStyles(draft,el.style,b);
 if(['Button','Text'].includes(n.type)){if(el.children.length)throw Error('Embedded HTML preserves nested markup.');draft.text=el.textContent}
 if(n.type==='Input'){draft.text=el.placeholder;draft.inputType=el.type;draft.name=el.getAttribute('aria-label')||n.name}
 if(n.type==='Image'){if(!/^data:image\/(png|jpeg|webp|gif);base64,/i.test(el.getAttribute('src')||''))throw Error('Use an embedded PNG, JPEG, GIF, or WebP image.');draft.src=el.getAttribute('src')}
 if(n.type==='Table')draft.rows=[...el.querySelectorAll('tr')].map(r=>[...r.cells].map(c=>c.textContent).join(' | ')).join('\n')
 }
 setBox(draft,b,device,project,page());return draft
}
function insertNode(n,at){
 const pg=page(),[w,h]=bounds(pg,device,project),b=boxFor(n,device,project,pg);b[2]=Math.min(b[2],w-12);b[0]=Math.max(0,Math.min(w-b[2],at?.[0]??Math.round((w-b[2])/2)));b[1]=Math.max(0,Math.min(h-b[3],at?.[1]??Math.round((h-b[3])/2)));setBox(n,b,device,project,pg);
 change(()=>{pg.nodes.push(n);selected=[n.id]});dismiss();closeSide()
}
function addScreen(type){
 let p=type==='signin'?intro().pages[0]:makePage(type==='ledger'?'Account ledger':'Untitled screen');
 if(type==='ledger'){p.nodes=[node('Text','Account ledger',[36,40,380,46]),node('Button','Find account',[690,40,225,46]),createItem('Table','Ledger')];Object.assign(p.nodes[0].style,{fontSize:32,weight:700});p.nodes[2].boxes.laptop=[36,124,879,284]}
 change(()=>{if(type==='signin'){const w=intro().pages[1];p.nodes.at(-1).actions[0].target=w.id;project.pages.push(w)}project.pages.push(p);pageId=p.id;selected=[];pan=[0,0];zoomFactor=1});closeSide();dismiss();if(type==='blank')pageSettings()
}
function variantDialog(type,at){
 modal('Insert '+type.toLowerCase(),('<p class="hint">Choose a starting design or add one of your own.</p>')+variants[type].map((v,i)=>'<button class="variant" data-variant="'+i+'"><span>'+icon(categoryIcon(type))+v+'</span>'+icon('plus',15)+'</button>').join('')+project.templates.filter(t=>t.kind==='element'&&t.node.type===type||t.kind==='block'&&type==='Module'||t.kind==='window'&&type==='Window'||t.kind==='element'&&t.category===type).map(t=>preset('use-'+t.id,t.name,'library')).join('')+btn('type-template','Add a template','plus','addTemplate'));
 $('[data-cmd=type-template]').onclick=()=>templateDialog(null,type==='Button'?'button':'embed',type);
 $$('.dialog [data-variant]').forEach(el=>el.onclick=()=>{const ver=variants[type][+el.dataset.variant];
 if(type==='Window'){let w=makePage(ver,'window',ver==='Wide dialog'?640:440);if(ver!=='Blank window'){w.nodes=[node('Text','Window title',[24,38,330,40]),node('Button','Close',[24,157,145,44],{actions:[{event:'click',action:'close',target:''}]})];w.nodes[0].style.fontSize=27}change(()=>{project.pages.push(w);pageId=w.id;selected=[]});dismiss();closeSide();pageSettings();return}
 const n=createItem(type,ver);if(type==='Image'&&ver==='Upload image')pickImage(src=>{n.src=src;insertNode(n,at)});else insertNode(n,at)
 })
}
function pickImage(cb){const inp=document.createElement('input');inp.type='file';inp.accept='image/png,image/jpeg,image/webp,image/gif';inp.onchange=()=>{const f=inp.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{if(!/^data:image\/(png|jpeg|webp|gif);base64,/i.test(r.result)){toast('Choose a PNG, JPEG, GIF, or WebP image.');return}cb(r.result)};r.readAsDataURL(f)};inp.click()}
function pagesDialog(){modal('Screens & windows',project.pages.map(p=>'<button class="variant" data-page="'+p.id+'"><span>'+icon(p.kind==='window'?'window':'page')+esc(p.name)+'</span>'+icon(p.id===pageId?'check':'right',14)+'</button>').join('')+'<div class="dialogActions">'+btn('save-screen-template','Save template','library')+btn('page-settings','Edit current')+btn('blank','New screen','plus','btn primary')+'</div>')}
function pageSettings(){const p=page();modal(p.kind==='window'?'Window settings':'Screen settings',field('Name','<input id="pgName" value="'+esc(p.name)+'">')+(p.kind==='window'?'<div class="row">'+field('Width (px)','<input id="pgWidth" type="number" min="120" max="2000" value="'+p.width+'">')+field('Height (px)','<input id="pgHeight" type="number" min="100" max="2400" value="'+p.height+'">')+'</div>':'')+'<div class="dialogActions">'+btn('dismiss','Cancel')+btn('save-page','Save','','btn primary')+'</div>')}
function triggerForm(old={},templateMode=false){
 const ev=old.event||'click',ac=old.action||'open';return field('When','<select id="ev">'+options([['click',names.click],['enter',names.enter]],ev)+'</select>')+field('Action','<select id="ac">'+options(['open','close','go','expand','collapse','toggle'].map(k=>[k,names[k]]),ac)+'</select>')+'<div id="targetArea"></div>'
}
function targetChoices(action){if(action==='open'||action==='go')return project.pages.filter(p=>p.kind===(action==='open'?'window':'screen')).map(p=>[p.id,p.name]);return page().nodes.map(n=>[n.id,n.name])}
function wireTargets(old={}){const f=()=>{const ac=$('#ac').value,t=targetChoices(ac);$('#targetArea').innerHTML=ac==='close'?'':field('Target','<select id="target">'+options(t,old.target)+'</select>')+(ac==='open'?btn('quick-window','Create a window','plus','btn smallBtn'):'')+(t.length||ac==='close'?'':'<p class="hint">Add a target before applying.</p>')};$('#ac').onchange=f;f()}
function readTrigger(){const event=$('#ev').value,action=$('#ac').value,target=$('#target')?.value||'';if(action!=='close'&&!target)throw Error('Choose a target first.');return {event,action,target}}
function actionDialog(index=null,sample=null){
 const n=sel();if(!n){toast('Select an element for this trigger.');return}
 const old=sample||n.actions[index]||{};modal('Element trigger',field('Element','<input readonly value="'+esc(n.name)+'">')+triggerForm(old)+'<div id="actionError" class="error"></div><div class="dialogActions">'+btn('store-action','Save as template')+btn('commit-action','Apply trigger','check','btn primary')+'</div>');wireTargets(old);
 $('[data-cmd=commit-action]').onclick=()=>{try{const a=readTrigger();change(()=>{if(index===null)n.actions.push(a);else n.actions[index]=a});dismiss();toast('Trigger applied')}catch(e){$('#actionError').textContent=e.message}};
 $('[data-cmd=store-action]').onclick=()=>{try{triggerTemplate(readTrigger())}catch(e){$('#actionError').textContent=e.message}}
}
function quickWindow(){const win=makePage('New window','window');win.nodes=[node('Text','Window title',[20,30,320,44]),node('Button','Close',[20,140,150,42],{actions:[{event:'click',action:'close',target:''}]})];change(()=>project.pages.push(win));wireTargets({target:win.id});toast('Window added. Edit its size in Screens & windows.')}
function triggerTemplate(action=null,existing=null){
 const a=action||existing?.action||{event:'click',action:'open',target:''};modal('Save trigger template',field('Template name','<input id="tplName" value="'+esc(existing?.name||names[a.action])+'">')+field('Trigger code (JSON)','<textarea rows="7" id="trCode">'+esc(JSON.stringify(a,null,2))+'</textarea>')+'<p class="hint">Use click or enter. Actions include open, close, go, expand, collapse, and toggle. Choose the target again when inserting.</p><div class="error" id="tplError"></div><div class="dialogActions">'+btn('commit-trigger-template','Save template','','btn primary')+'</div>');
 $('[data-cmd=commit-trigger-template]').onclick=()=>{try{let v=JSON.parse($('#trCode').value);if(!['click','enter'].includes(v.event)||!['open','close','go','expand','collapse','toggle'].includes(v.action))throw Error('Use one of the supported events and actions.');saveTemplate({id:existing?.id||uid(),kind:'trigger',name:requiredName(),action:{event:v.event,action:v.action,target:String(v.target||'')}})}catch(e){$('#tplError').textContent=e.message}}
}
function requiredName(){let t=$('#tplName').value.trim();if(!t)throw Error('Give the template a name.');return t}
function saveTemplate(t){change(()=>{const i=project.templates.findIndex(v=>v.id===t.id);if(i<0)project.templates.push(t);else project.templates[i]=t},'Template saved');dismiss()}
function saveBlock(whole){
 const pg=page(),nodes=whole?pg.nodes:pg.nodes.filter(n=>selected.includes(n.id));
 modal(whole?'Save '+pg.kind+' template':'Save group template',field('Template name','<input id="tplName" value="'+esc(whole?pg.name:'Grouped elements')+'">')+'<div class="dialogActions">'+btn('commit-block','Save template','','btn primary')+'</div>');
 $('[data-cmd=commit-block]').onclick=()=>{const name=$('#tplName').value.trim();if(!name){toast('Give the template a name.');return}saveTemplate({id:uid(),kind:whole?pg.kind:'block',name,layout:{...clone(pg),nodes:clone(nodes)}})}
}
function saveSelected(existing=null){
 if(!existing&&selected.length>1){saveBlock(false);return}
 if(!sel()&&!existing){toast('Select an element first.');return}
 modal('Save component template',field('Template name','<input id="tplName" value="'+esc(existing?.name||sel()?.name)+'">')+'<p class="hint">Includes the element’s design, device layouts, and triggers. Each inserted copy can be edited separately.</p><div id="tplError" class="error"></div><div class="dialogActions">'+btn('commit-selected','Save template','','btn primary')+'</div>');
 $('[data-cmd=commit-selected]').onclick=()=>{try{saveTemplate({id:existing?.id||uid(),kind:'element',name:requiredName(),node:clone(existing?.node||sel())})}catch(e){$('#tplError').textContent=e.message}}
}
function templateDialog(existing=null,initialKind=null,category=null){
 const h=existing?.node?.html||'<style>\n  .action {\n    background: #7545d6;\n    color: white;\n    border: 0;\n    border-radius: 18px;\n    padding: 12px 24px;\n  }\n</style>\n<button class="action">Continue</button>';
 modal(existing?'Edit template':'Add to My templates',field('Template name','<input id="tplName" placeholder="e.g. Rounded action button" value="'+esc(existing?.name||'')+'">')+field('Template type','<select id="tplKind">'+options([['button','Editable button'],['embed','Embedded HTML'],['trigger','Trigger']],existing?'embed':initialKind||'button')+'</select>')+field('Library category','<select id="tplCategory">'+options(types,existing?.category||category||'Button')+'</select>')+field('Paste HTML and CSS','<textarea rows="10" id="tplCode" spellcheck="false">'+esc(h)+'</textarea>')+'<p class="hint" id="tplHint">Editable buttons support a single button with CSS. Embedded HTML keeps complex markup and inline scripts in a separate frame.</p><div id="tplError" class="error"></div><div class="dialogActions">'+btn('commit-paste','Save template','check','btn primary')+'</div>',true);
 $('#tplKind').onchange=()=>{if($('#tplKind').value==='trigger')triggerTemplate()};
 $('[data-cmd=commit-paste]').onclick=()=>{try{const name=requiredName(),category=$('#tplCategory').value,code=$('#tplCode').value.trim();if(!code)throw Error('Paste some code first.');let n;
 if($('#tplKind').value==='button'){const doc=new DOMParser().parseFromString(code,'text/html');const el=doc.querySelector('button');if(!el||el.children.length||doc.querySelector('script,link,iframe')||el.getAttributeNames().some(k=>/^on/i.test(k)))throw Error('Choose Embedded HTML for a multi-element or scripted template.');
 n=createItem('Button','Solid');n.text=el.textContent||name;let b=n.boxes.laptop;
 for(const css of doc.querySelectorAll('style'))for(const r of declarations(css.textContent)){if(!r.style||!el.matches(r.selectorText))throw Error('Choose Embedded HTML for CSS states, media queries, or nested elements.');readStyles(n,r.style,b)}readStyles(n,el.style,b)
 }else{n=node('Custom',name,[20,20,240,96],{html:code})}
 if(category==='Window')n.boxes.laptop=[0,0,460,310];n.name=name;saveTemplate({id:existing?.id||uid(),kind:category==='Window'?'window':'element',category,name,node:n})}catch(e){$('#tplError').textContent=e.message}}
}
function useTemplate(t){if(!t)return;if(t.kind==='trigger'){actionDialog(null,t.action);return}
 if(t.kind==='window'&&t.node){const w=makePage(t.name,'window',t.node.boxes.laptop[2]);w.height=t.node.boxes.laptop[3];const content=clone(t.node);content.id=uid();content.boxes.laptop[0]=0;content.boxes.laptop[1]=0;w.nodes=[content];change(()=>{project.pages.push(w);pageId=w.id;selected=[content.id]});dismiss();closeSide();return}if(t.layout){
 const layout=clone(t.layout),maps=new Map(layout.nodes.map(n=>[n.id,uid()])),groups=new Map();
 const newPageId=uid(),groupId=uid();for(const n of layout.nodes){n.id=maps.get(n.id);for(const a of n.actions){if(maps.has(a.target))a.target=maps.get(a.target);else if(a.target===layout.id)a.target=newPageId}if(t.kind==='block')n.group=groupId;else if(n.group){if(!groups.has(n.group))groups.set(n.group,uid());n.group=groups.get(n.group)}}
 change(()=>{if(t.kind==='block'){for(const n of layout.nodes){for(const b of Object.values(n.boxes)){b[0]+=12;b[1]+=12}page().nodes.push(n)}selected=layout.nodes.map(n=>n.id)}else{layout.id=newPageId;layout.name=t.name;project.pages.push(layout);pageId=layout.id;selected=[]}});dismiss();closeSide();return}
 const n=clone(t.node);n.id=uid();delete n.group;n.name=t.name;insertNode(n)}
function manageTemplate(t){
 modal(t.name,'<div class="dialogActions">'+btn('rename-template','Rename')+(t.layout?'':btn('edit-template',t.kind==='trigger'||t.node?.type==='Custom'?'Edit code':'View code'))+btn('remove-template','Delete')+'</div>');
 $('[data-cmd=rename-template]').onclick=()=>{modal('Rename template',field('Name','<input id="tplName" value="'+esc(t.name)+'">')+'<div class="dialogActions">'+btn('rename-ok','Save','','btn primary')+'</div>');$('[data-cmd=rename-ok]').onclick=()=>{let v=$('#tplName').value.trim();if(v){change(()=>t.name=v);dismiss()}}};
 if(!t.layout)$('[data-cmd=edit-template]').onclick=()=>{if(t.kind==='trigger')triggerTemplate(null,t);else if(t.node.type==='Custom')templateDialog(t);else modal(t.name,field('Component code','<textarea readonly rows="14">'+esc(sourceFor(t.node))+'</textarea>')+'<p class="hint">Insert a copy, edit its code, and save it as a new template.</p>')};
 $('[data-cmd=remove-template]').onclick=()=>{change(()=>project.templates=project.templates.filter(v=>v.id!==t.id));dismiss()}
}
function preview(d=device){
 closeSide();$('#overlay').innerHTML='<section class="previewBg" role="dialog" aria-label="Interactive preview"><div class="previewBar"><strong>'+icon('preview',15)+' Preview · '+esc(page().name)+'</strong><select id="previewDevice" aria-label="Preview device">'+options(Object.keys(devices).map(k=>[k,cap(k)+' · '+project.widths[k]+' px']),d)+'</select>'+btn('dismiss','Back to editor','close','btn smallBtn')+'</div><iframe title="Interactive design preview" sandbox="allow-scripts allow-modals"></iframe></section>';
 const frame=$('.previewBg iframe');frame.style.width=project.widths[d]+'px';frame.srcdoc=buildHTML(project,pageId,d);$('#previewDevice').onchange=e=>preview(e.target.value)
}
function download(body,path,type){const url=URL.createObjectURL(new Blob([body],{type})),a=document.createElement('a');a.href=url;a.download=path;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000)}
function exportDialog(){
 modal('Export project',preset('html','Working website · HTML','code')+'<p class="hint">Opens offline in a browser. Includes screens, window sizes, images, device layouts, theme, and supported triggers.</p>'+preset('json','Editable project · JSON','layers','mint')+'<p class="hint">Includes all designs, groups, triggers, and My templates. Import this file to continue on another device.</p><hr style="border:0;border-top:1px solid var(--line)">'+btn('import','Import project file','page','btn full'))
}
function validateImport(p){
 if(p?.format!=='form-studio'||p.version!==1||!Array.isArray(p.pages)||!p.pages.some(a=>a.kind==='screen')||!Array.isArray(p.templates)||!Array.isArray(p.palette)||!p.theme||!p.name)throw Error('Choose a Form Studio project JSON file.');
 const hex=c=>/^#[a-f0-9]{6}$/i.test(c), id=x=>typeof x==='string'&&/^[a-z][a-z0-9_-]*$/i.test(x);
 if(!p.palette.every(hex)||!hex(p.theme.accent)||!hex(p.theme.background)||!families.includes(p.theme.font)||Object.keys(devices).some(d=>!sizes[d].includes(p.widths?.[d])))throw Error('Project theme or device settings are invalid.');
 const checkNode=n=>{if(!n||!id(n.id)||!['Button','Text','Input','Image','Module','Shape','Table','Custom'].includes(n.type)||typeof n.name!=='string'||!n.style||!n.boxes?.laptop||!Array.isArray(n.actions)||Object.values(n.boxes).some(b=>!Array.isArray(b)||b.length!==4||b.some(v=>!Number.isFinite(v)))||n.style.radius<0||!Number.isFinite(n.style.radius)||!Number.isFinite(n.style.fontSize))throw Error('A component in the project is invalid.');
 if(n.type==='Image'&&!/^data:image\/(png|jpeg|webp|gif);base64,/i.test(n.src||''))throw Error('This project has an unsupported image source.');
 if(n.type==='Custom'&&typeof n.html!=='string')throw Error('A custom component is invalid.');if(n.type==='Table'&&typeof n.rows!=='string')throw Error('A table is invalid.');
 if(n.actions.some(a=>!['enter','click'].includes(a.event)||!['open','close','go','expand','collapse','toggle'].includes(a.action)))throw Error('An interaction is invalid.')};
 for(const pg of p.pages){if(!id(pg.id)||typeof pg.name!=='string'||!Array.isArray(pg.nodes)||!['screen','window'].includes(pg.kind))throw Error('A screen definition is invalid.');if(pg.kind==='window'&&(!Number.isFinite(pg.width)||!Number.isFinite(pg.height)))throw Error('Window dimensions are invalid.');pg.nodes.forEach(checkNode)}
 p.templates.forEach(t=>{if(!id(t.id)||typeof t.name!=='string'||!['trigger','element','block','window','screen'].includes(t.kind))throw Error('A template is invalid.');if(t.node)checkNode(t.node);else if(t.layout){if(!Array.isArray(t.layout.nodes))throw Error('A template layout is invalid.');t.layout.nodes.forEach(checkNode)}else if(!t.action)throw Error('Missing trigger code.')});return p
}
function importFile(){const inp=document.createElement('input');inp.type='file';inp.accept='.json,application/json';inp.onchange=async()=>{try{const q=validateImport(JSON.parse(await inp.files[0].text()));modal('Open project?', '<p>Open <strong>'+esc(q.name)+'</strong> on this device? You can undo this change to return to the current project.</p><div class="dialogActions">'+btn('dismiss','Cancel')+btn('commit-import','Open project','','btn primary')+'</div>');$('[data-cmd=commit-import]').onclick=()=>{change(()=>{project=q;pageId=q.pages[0].id;selected=[]});dismiss()}}catch(e){toast(e.message)}};inp.click()}
function moveLayer(up){const n=sel();if(!n)return;const list=page().nodes,i=list.indexOf(n),j=i+(up?1:-1);if(j<0||j>=list.length)return;change(()=>[list[i],list[j]]=[list[j],list[i]])}
function groupNodes(){if(selected.length<2){toast('Select two or more layers first.');return}let id=uid();multi=false;change(()=>page().nodes.filter(n=>selected.includes(n.id)).forEach(n=>{n.group=id;n.groupName='Layer group'}),'Elements grouped')}
function removeSelection(){if(!selected.length)return;const ids=new Set(selected);change(()=>{page().nodes=page().nodes.filter(n=>!ids.has(n.id));for(const pg of project.pages)for(const n of pg.nodes)n.actions=n.actions.filter(a=>!ids.has(a.target));selected=[]})}
function command(c){
 if(c.startsWith('use-'))return useTemplate(project.templates.find(t=>t.id===c.slice(4)));
 const n=sel();
 switch(c){
 case 'undo':history(true);break;case 'redo':history(false);break;
 case 'preview':preview();break;case 'export':exportDialog();break;case 'dismiss':dismiss();break;
 case 'apply-code':applySelection();break;case 'copy-chat':copyForChat();break;case 'select-code':selectCode();break;case 'cloud':cloudDialog();break;case 'save-selected':saveSelected();break;case 'pages':pagesDialog();break;case 'page-settings':pageSettings();break;
 case 'signin':case 'blank':case 'ledger':addScreen(c);break;
 case 'save-page':{const v=$('#pgName').value.trim();const w=+($('#pgWidth')?.value||460),h=+($('#pgHeight')?.value||310);if(!v||w<120||w>2000||h<100||h>2400){toast('Enter a name and valid dimensions.');break}change(()=>{page().name=v;if(page().kind==='window'){page().width=w;page().height=h}});dismiss();break}
 case 'replace-image':if(n)pickImage(src=>change(()=>n.src=src));break;
 case 'save-screen-template':saveBlock(true);break;case 'new-template':templateDialog();break;case 'add-action':actionDialog();break;case 'quick-window':quickWindow();break;case 'new-trigger':triggerTemplate();break;
 case 'multi':multi=!multi;if(multi)selectIds([]);render();break;case 'group':groupNodes();break;
 case 'ungroup':{const groups=new Set(page().nodes.filter(n=>selected.includes(n.id)).map(n=>n.group).filter(Boolean));change(()=>page().nodes.filter(n=>groups.has(n.group)).forEach(n=>delete n.group));break}
 case 'forward':moveLayer(true);break;case 'back':moveLayer(false);break;case 'delete':removeSelection();break;
 case 'add-color':{const color=$('#newColor').value.toUpperCase();if(!project.palette.includes(color))change(()=>project.palette.push(color),'Color saved');break}
 case 'html':case 'json':{const base=project.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'studio-project';if(c==='html')download(buildHTML(project,page().kind==='screen'?pageId:project.pages.find(p=>p.kind==='screen').id),base+'.html','text/html');else download(JSON.stringify(project,null,2),base+'.studio.json','application/json');toast('Export downloaded');break}
 case 'import':importFile();break
 }
}
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b){if(e.target.classList.contains('dialogBg'))dismiss();return}
 if(b.dataset.cmd)command(b.dataset.cmd);
 if(b.dataset.tab){tab=b.dataset.tab;render();if(innerWidth<=620||innerWidth<=850&&tab!=='Insert'){closeSide();$('#library').classList.add('shown')}}
 if(b.dataset.mode){mode=b.dataset.mode;drawProps();if(mode==='code')selectCode()}
 if(b.dataset.device){device=b.dataset.device;zoomFactor=1;pan=[0,0];render()}
 if(b.dataset.page)choosePage(b.dataset.page);
 if(b.dataset.insert)variantDialog(b.dataset.insert);
 if(b.dataset.layer){const n=page().nodes.find(v=>v.id===b.dataset.layer);toggleLayers(n,multi||e.shiftKey||e.ctrlKey||e.metaKey);if(mode==='code')selectCode()}
 if(b.dataset.editaction!==undefined)actionDialog(+b.dataset.editaction);
 if(b.dataset.rmaction!==undefined&&sel())change(()=>sel().actions.splice(+b.dataset.rmaction,1));
 if(b.dataset.edittemplate)manageTemplate(project.templates.find(t=>t.id===b.dataset.edittemplate));
 if(b.dataset.swatch){if(sel())change(()=>sel().style.fill=b.dataset.swatch);else toast('Select an element to apply this color.')}
 if(b.dataset.palette){const presets=[defaultColors,['#207C72','#123D41','#B9E4D7','#E9F4EF','#FFFFFF'],['#BB664A','#63382F','#F1CEAA','#F7EDDF','#FFFFFF']];change(()=>project.palette=[...presets[+b.dataset.palette]],'Palette changed')}
});
document.addEventListener('change',e=>{
 const t=e.target,n=sel(),pg=page();
 if(t.id==='groupName'){const name=t.value.trim()||'Layer group';change(()=>selectedLayers().forEach(n=>n.groupName=name));return}
 if(t.id==='pageSelect'){choosePage(t.value);return}
 if(t.dataset.theme){change(()=>project.theme[t.dataset.theme]=t.value);return}
 if(!n)return;
 if(t.dataset.prop)change(()=>n[t.dataset.prop]=t.value);
 if(t.dataset.box!==undefined){let b=boxFor(n,device,project,pg);if(!t.value.trim()||!Number.isFinite(+t.value))return;b[+t.dataset.box]=+t.value;change(()=>setBox(n,b,device,project,pg))}
 if(t.dataset.style){const k=t.dataset.style;change(()=>n.style[k]=['radius','fontSize'].includes(k)?Math.max(k==='radius'?0:1,+t.value):t.value)}
});
document.addEventListener('input',e=>{if(e.target.id==='search'){search=e.target.value;drawLibrary();const inp=$('#search');inp.focus();inp.setSelectionRange(search.length,search.length)}});
$('#pageBtn').onclick=pagesDialog;
$('#projectName').onclick=()=>{modal('Rename project',field('Project name','<input id="projName" value="'+esc(project.name)+'">')+'<div class="dialogActions">'+btn('rename-project','Save','','btn primary')+'</div>');$('[data-cmd=rename-project]').onclick=()=>{const v=$('#projName').value.trim();if(v){change(()=>project.name=v);dismiss()}}};
$('#sizeBtn').onclick=()=>{modal('Device size',field(cap(device)+' width','<select id="newSize">'+options(sizes[device].map(v=>[String(v),v+' px']),String(project.widths[device]))+'</select>')+'<div class="dialogActions">'+btn('apply-size','Apply','','btn primary')+'</div>');$('[data-cmd=apply-size]').onclick=()=>{const w=+$('#newSize').value;change(()=>project.widths[device]=w);dismiss()}};
$('#selectTool').onclick=()=>{panMode=false;render()};$('#panTool').onclick=()=>{panMode=true;render()};$('#less').onclick=()=>{zoomFactor=Math.max(.4,zoomFactor/1.2);fitBoard()};$('#more').onclick=()=>{zoomFactor=Math.min(4,zoomFactor*1.2);fitBoard()};$('#zoom').onclick=()=>{zoomFactor=1;pan=[0,0];fitBoard()};
$('#openLib').onclick=()=>{$('#inspector').classList.remove('shown');$('#library').classList.toggle('shown')};$('#openProps').onclick=()=>{$('#library').classList.remove('shown');$('#inspector').classList.toggle('shown')};
const stage=$('#stage');
stage.addEventListener('pointerdown',e=>{
 if(e.button!==0||e.target.closest('.floatTools'))return;closeSide();const wrap=e.target.closest('.nodeWrap');if(!wrap&&!panMode){selectIds([]);return}
 e.preventDefault();stage.setPointerCapture(e.pointerId);
 if(panMode){gesture={pan:[...pan],x:e.clientX,y:e.clientY};return}
 const n=page().nodes.find(v=>v.id===wrap.dataset.id),handle=e.target.dataset.handle;
 if(e.shiftKey||e.ctrlKey||e.metaKey||multi){toggleLayers(n,true);return}
 if(!selected.includes(n.id))selectIds(n.group?page().nodes.filter(v=>v.group===n.group).map(v=>v.id):[n.id]);
 const items=page().nodes.filter(v=>selected.includes(v.id)).map(v=>({n:v,box:boxFor(v,device,project,page())}));
 if(!items.length)return;
 gesture={x:e.clientX,y:e.clientY,items,handle,initial:JSON.stringify(project),before:[Math.min(...items.map(i=>i.box[0])),Math.min(...items.map(i=>i.box[1])),Math.max(...items.map(i=>i.box[0]+i.box[2])),Math.max(...items.map(i=>i.box[1]+i.box[3]))]};
});
stage.addEventListener('pointermove',e=>{if(!gesture)return;const g=gesture,dx=e.clientX-g.x,dy=e.clientY-g.y;if(g.pan){pan=[g.pan[0]+dx,g.pan[1]+dy];fitBoard();return}if(Math.abs(dx)+Math.abs(dy)<3&&!g.moved)return;g.moved=true;
 const x=Math.round(dx/scale),y=Math.round(dy/scale),[l,t,r,b]=g.before;let L=l,T=t,R=r,B=b;
 if(g.handle){if(g.handle.endsWith('l'))L=Math.min(r-12,l+x);else R=Math.max(l+12,r+x);if(g.handle.startsWith('t'))T=Math.min(b-12,t+y);else B=Math.max(t+12,b+y)}
 for(const i of g.items){let [a,c,w,h]=i.box;let v=g.handle?[L+(a-l)*(R-L)/(r-l),T+(c-t)*(B-T)/(b-t),w*(R-L)/(r-l),h*(B-T)/(b-t)]:[a+x,c+y,w,h];setBox(i.n,v,device,project,page());const el=$('.nodeWrap[data-id="'+i.n.id+'"]');if(el)position(el,boxFor(i.n,device,project,page()))}
});
function finishGesture(cancel=false){if(gesture?.moved){const initial=gesture.initial;if(cancel){project=JSON.parse(initial)}else{remember(initial);write()}render()}gesture=null}
stage.addEventListener('pointerup',()=>finishGesture());stage.addEventListener('pointercancel',()=>finishGesture(true));
document.addEventListener('dragstart',e=>{const b=e.target.closest('[data-insert]');if(b)e.dataTransfer.setData('text/plain','formstudio:'+b.dataset.insert)});
stage.addEventListener('dragover',e=>e.preventDefault());stage.addEventListener('drop',e=>{e.preventDefault();const t=e.dataTransfer.getData('text/plain').replace('formstudio:','');if(types.includes(t)){const r=$('#sheet').getBoundingClientRect();variantDialog(t,[(e.clientX-r.left)/scale,(e.clientY-r.top)/scale])}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){dismiss();closeSide();return}if(e.target.closest('textarea,input,select,[contenteditable],.dialog')||$('#overlay').children.length)return;
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();history(!e.shiftKey)}
 else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();removeSelection()}
 else if(e.key==='/'){e.preventDefault();tab='Insert';render();if(innerWidth<=620)$('#library').classList.add('shown');$('#search').focus()}
 else if(selected.length&&['ArrowRight','ArrowLeft','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const step=e.shiftKey?10:1;change(()=>{for(const n of page().nodes.filter(n=>selected.includes(n.id))){const b=boxFor(n,device,project,page());b[e.key==='ArrowRight'||e.key==='ArrowLeft'?0:1]+=(['ArrowLeft','ArrowUp'].includes(e.key)?-step:step);setBox(n,b,device,project,page())}})}
});
new ResizeObserver(fitBoard).observe(stage);
const styleNode=document.createElement('style');styleNode.textContent=nativeCSS;document.head.append(styleNode);
if(innerWidth<=620)device='phone';render();if(loadNote){$('#saveStatus').textContent=loadNote;toast(loadNote)}
