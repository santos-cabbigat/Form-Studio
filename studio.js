'use strict';
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const tabs=['Insert','Triggers','Layers','Palette','Theme'];
let project,storageOK=true,loadNote='';
try{project=restoreDevice()}catch(e){project=intro();activeFileId=crypto.randomUUID();deviceRevision=null;storageOK=false;loadNote='Device project could not be opened. '+e.message}
let pageId=project.pages[0].id,device='laptop',tab='Insert',mode='design',selected=[project.pages[0].nodes.at(-1)?.id].filter(Boolean),zoomFactor=1,pan=[0,0],panMode=false,scale=1,search='',past=[],future=[],gesture=null,toastTimer,multi=false;
const page=()=>project.pages.find(v=>v.id===pageId)||project.pages[0];
const sel=()=>page().nodes.find(n=>n.id===selected.at(-1));
const btn=(cmd,label,ic='',cl='btn')=>'<button class="'+cl+'" data-cmd="'+cmd+'">'+(ic?icon(ic,15):'')+esc(label)+'</button>';
const options=(items,value)=>items.map(t=>{const [v,l]=Array.isArray(t)?t:[t,t];return '<option value="'+esc(v)+'" '+(v===value?'selected':'')+'>'+esc(l)+'</option>'}).join('');
const field=(label,html)=>'<label class="field">'+esc(label)+html+'</label>';
const prop=(k,v,type='text')=>'<input data-prop="'+k+'" type="'+type+'" value="'+esc(v)+'">';
const names=triggerLabels;
function toast(msg){$('#toast').textContent=msg;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2500)}
function write(){try{const row=saveDevice(project,activeFileId,deviceRevision);deviceRevision=row.revision;storageOK=true}catch(e){storageOK=false;toast(e.name==='QuotaExceededError'?'Device storage full. Download a project copy.':e.message)}$('#saveStatus').textContent=storageOK?'Saved on this device':'Unsaved · download a copy';if(storageOK)try{queueCloud()}catch{}return storageOK}
function remember(s=JSON.stringify(project)){past.push(s);if(past.length>24)past.shift();future=[]}
function change(fn,msg){remember();preserveColumnLinks(project);const before=linkedBeforeEdit();fn();updateLinked(before);clean();const saved=write();render();if(msg&&saved)toast(msg)}
function clean(){if(!project.pages.some(p=>p.id===pageId))pageId=project.pages[0].id;selected=selected.filter(id=>page().nodes.some(n=>n.id===id))}
function stepHistory(back){const from=back?past:future,to=back?future:past;if(!from.length)return;to.push(JSON.stringify(project));project=JSON.parse(from.pop());clean();write();render()}
function dismiss(){previewObserver.disconnect();$('#overlay').replaceChildren()}
function modal(title,body,wide=false){$('#overlay').innerHTML='<div class="dialogBg"><section class="dialog '+(wide?'wide':'')+'" role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><header class="dialogHead"><h2>'+esc(title)+'</h2>'+btn('dismiss','Close','close','btn smallBtn')+'</header>'+body+'</section></div>';let first=$('.dialog input,.dialog select,.dialog textarea');if(first&&!first.readOnly&&first.tagName!=='TEXTAREA')first.focus()}
function closeSide(){for(const s of ['.library','.inspector'])$(s).classList.remove('shown')}
function choosePage(id){endReferencePick();closeSide();panMode=false;pageId=id;selected=[];multi=false;zoomFactor=1;pan=[0,0];dismiss();render()}
function selectIds(ids){
 endReferencePick();const old=selected;selected=[...new Set(ids)];
 for(const id of new Set([...old,...selected]))markCanvasLayer(id,selected.includes(id));
 if(selected.length===1&&boardViewport.classList.contains('longScreen')){
   const entry=canvasLayers.get(selected[0]);
   if(entry){
     const layer=entry.wrap.getBoundingClientRect(),view=boardViewport.getBoundingClientRect();
     if(layer.bottom<view.top||layer.top>view.bottom)boardViewport.scrollTop+=layer.top-view.top-42;
   }
 }
 drawProps();
 if(tab==='Layers'){
   lastLayerListing='';
   for(const el of $$('#library [data-layer].active'))el.classList.remove('active');
   for(const id of selected)$('#library [data-layer="'+CSS.escape(id)+'"]')?.classList.add('active');
   const tools=$('#layerCommands');if(tools)tools.innerHTML=layerCommands();
   const on=$('#library [data-cmd=multi]');if(on&&multi)on.textContent='Finish selecting ('+selected.length+')';
 }else if(tab==='Triggers')drawLibrary();
}
function render(){clean();if(referencePick&&referencePick.context!==referenceContext())endReferencePick();$('#projectName').textContent=project.name;
 $('#tabs').innerHTML=tabs.map(t=>'<button data-tab="'+t+'" class="'+(tab===t?'active':'')+'">'+icon(t.toLowerCase())+t+'</button>').join('');
 $('#pageBtn').innerHTML=icon(page().kind==='window'?'window':'page',15)+esc(page().name)+icon('down',13);
 $('#devices').innerHTML=Object.keys(devices).map(d=>'<button title="'+cap(d)+' layout" aria-label="'+cap(d)+' layout" class="'+(d===device?'active':'')+'" data-device="'+d+'">'+icon(d,15)+'<span>'+cap(d)+'</span></button>').join('');
 $('button[data-cmd=undo]').innerHTML=icon('undo',15)+'<span>Undo</span>';$('button[data-cmd=undo]').disabled=!past.length;
 $('button[data-cmd=redo]').innerHTML=icon('redo',15)+'Redo';$('button[data-cmd=redo]').disabled=!future.length;
 $('button[data-cmd=preview]').innerHTML=icon('preview',14)+'Preview';$('button[data-cmd=export]').innerHTML=icon('export',14)+'Export';
 $('#selectTool').innerHTML=icon('select',15)+'Select';$('#panTool').innerHTML=icon('pan',16)+'Pan';stage.classList.toggle('boxSelecting',multi&&!panMode);$('#selectTool').classList.toggle('on',!panMode&&!multi);$('#panTool').classList.toggle('on',panMode);$('#sizeBtn').innerHTML=icon('ruler',13)+project.widths[device]+' px '+icon('down',11);
 drawLibrary();drawBoard();drawProps();syncGuideButton();$('#multiTool').classList.toggle('on',multi);$('#multiTool').setAttribute('aria-pressed',String(multi))
}
const canvasLayers=new Map();
let latestBoard=null;
function markCanvasLayer(id,on){
 const entry=canvasLayers.get(id);if(!entry)return;
 const wrap=entry.wrap;if(wrap.classList.contains('selected')===on)return;
 wrap.classList.toggle('selected',on);
 if(on){for(const dir of ['tl','t','tr','r','br','b','bl','l']){const h=document.createElement('i');h.className='handle '+dir;h.dataset.handle=dir;wrap.append(h)}}
 else for(const h of wrap.querySelectorAll('.handle'))h.remove();
}
function drawBoard(){
 const s=$('#sheet'),pg=page(),[w,h]=bounds(pg,device,project);
 if(latestBoard!==pg){s.replaceChildren();canvasLayers.clear();latestBoard=pg}
 s.style.width=w+'px';s.style.height=h+'px';s.style.backgroundColor=pg.backgrounds?.[device]||project.theme.background;s.style.fontFamily=project.theme.font;s.style.setProperty('--accent',project.theme.accent);s.style.setProperty('--table-tint',project.theme.tint||'#f3effa');
 const visible=new Set(),chosen=new Set(selected);
 let next=s.firstElementChild;
 for(const n of pg.nodes){
   if(n.hide?.[device])continue;
   const b=boxFor(n,device,project,pg),signature=JSON.stringify([n.type,n.name,n.text,n.labelParts,n.glyph,n.style,n.extraCSS,n.inputType,n.requirement,n.initialState,n.emptyMessage,n.picker]);
   let entry=canvasLayers.get(n.id);
   if(!entry){const wrap=document.createElement('div');wrap.className='nodeWrap';wrap.dataset.id=n.id;entry={wrap};canvasLayers.set(n.id,entry)}
   const wrap=entry.wrap;
   if(entry.signature!==signature||entry.src!==n.src||entry.html!==n.html||entry.rows!==n.rows||entry.choices!==n.choices){
     const el=makeEl(n,b,true);
     if(wrap.firstElementChild)wrap.firstElementChild.replaceWith(el);else wrap.prepend(el);
     Object.assign(entry,{signature,src:n.src,html:n.html,rows:n.rows,choices:n.choices});
   }
   if(!entry.box||b.some((v,i)=>v!==entry.box[i])){position(wrap,b);entry.box=b}
   wrap.classList.toggle('canvasLocked',!!n.locked);markCanvasLayer(n.id,chosen.has(n.id));visible.add(n.id);
   if(wrap!==next)s.insertBefore(wrap,next);
   next=wrap.nextElementSibling;
 }
 for(const [id,entry] of canvasLayers)if(!visible.has(id)){entry.wrap.remove();canvasLayers.delete(id)}
 $('#boardLabel').innerHTML=icon(pg.kind==='window'?'window':'page',13)+esc(pg.name);$('#boardSize').textContent=w+' × '+h;fitBoard()
}
function position(el,b){Object.assign(el.style,{left:b[0]+'px',top:b[1]+'px',width:b[2]+'px',height:b[3]+'px'})}
let boardContext='';
function fitBoard(){
 const sheet=$('#sheet'),wrap=$('#sheetWrap'),w=parseFloat(sheet.style.width),h=parseFloat(sheet.style.height);
 if(!w||!h)return;
 const previousScale=scale,previousScroll=boardViewport.scrollTop;
 const margin=stage.clientWidth<480?22:54,viewHeight=Math.max(1,stage.clientHeight-114);
 const long=page().kind==='screen'&&h>devices[device][1]&&Math.min((stage.clientWidth-margin)/w,1.35)*h>viewHeight*1.5;
 boardViewport.classList.toggle('longScreen',long);
 const widthFit=Math.min((boardViewport.clientWidth-margin)/w,1.35);
 scale=Math.max(.1,(long?widthFit:Math.min(widthFit,viewHeight/h))*zoomFactor);
 sheet.style.setProperty('--inverse-scale',1/scale);
 sheet.style.transform='scale('+scale+')';wrap.style.width=w*scale+'px';wrap.style.height=h*scale+'px';
 wrap.style.transform='translate(calc(-50% + '+pan[0]+'px),'+(long?'0px':'calc(-50% + '+pan[1]+'px)')+')';
 const context=pageId+'/'+device+'/'+long;
 if(context!==boardContext){boardViewport.scrollTop=0;boardContext=context}
 else if(long&&scale!==previousScale)boardViewport.scrollTop=previousScroll*scale/previousScale;
 $('#zoom').textContent='Fit '+Math.round(scale*100)+'%';
}
function preset(cmd,title,ic,color=''){return '<button data-cmd="'+cmd+'" class="preset"><span class="presetIcon '+color+'">'+icon(ic,16)+'</span><span>'+esc(title)+'</span>'+icon('right',13)+'</button>'}
function section(title,body){return '<section class="libSection"><h3 class="sectionTitle">'+esc(title)+'</h3>'+body+'</section>'}
let lastLayerListing='';
function drawLibrary(){
 if(tab==='Layers'){
   const state=JSON.stringify([pageId,device,multi,selected,treePageOptions(),page().nodes.map(n=>[n.id,n.type,n.name,n.group,n.locked,n.hide?.[device]])]);
   if(state===lastLayerListing)return;
   lastLayerListing=state;
 }else lastLayerListing='';
 let pane='';
 if(tab==='Insert'){
 const match=t=>t.toLowerCase().includes(search.toLowerCase());
 pane='<div class="libTop"><h2>Component library</h2><label class="search">'+icon('search',14)+'<input id="search" placeholder="Find a component" aria-label="Find a component" value="'+esc(search)+'"><kbd>/</kbd></label></div>';
 const cards=types.filter(t=>match(t)||(t==='Icon'&&Object.values(uiIcons).some(match)));pane+=section('Elements',cards.length?'<div class="cardGrid">'+cards.map(t=>'<button class="component" data-insert="'+t+'" draggable="true" aria-label="'+t+'" title="'+t+'">'+icon(categoryIcon(t),19)+'<span>'+t+'</span></button>').join('')+'</div>':'<span class="hint">No matching elements.</span>');
 if(match('Import editable HTML and CSS'))pane+=preset('import-html','Import editable HTML','code');
 pane+=section('Screen templates',[['signin','Sign-in screen','page',''],['ledger','Account ledger','table','mint'],['sample-entry','Sample entry form','input','mint'],['linked-entry','Entry & ledger tabs','table','mint'],['picker-demo','Picker with buttons','picker','mint'],['blank','Blank screen','insert','sand']].filter(a=>match(a[1])).map(a=>preset(...a)).join(''));
 pane+=section('My templates',templateRows(search)+btn('new-template','Add template','plus','addTemplate'));
 }else if(tab==='Layers'){
 pane='<div class="panel"><h2>Layers</h2>'+field('Screen or window','<select id="pageSelect">'+options(treePageOptions(),pageId)+'</select>')+
 '<div class="row">'+btn('pages','Manage screens','page','btn smallBtn')+btn('find-project','Find in project','search','btn smallBtn')+'</div><div id="layerCommands">'+layerCommands()+'</div><h3 class="mt">Elements</h3>'+btn('multi',multi?'Finish selecting ('+selected.length+')':'Select multiple','group','btn smallBtn')+
 [...page().nodes].reverse().map(n=>'<button data-layer="'+n.id+'" class="layer '+(selected.includes(n.id)?'active':'')+'">'+icon(categoryIcon(n.type),15)+esc(n.name)+(n.locked?' · Locked':'')+(n.hide?.[device]?' · Hidden':'')+(n.group?' '+icon('group',12):'')+'</button>').join('')+'<div class="row">'+btn('group','Group','','btn smallBtn')+btn('ungroup','Ungroup','','btn smallBtn')+'</div><div class="row">'+btn('forward','Bring forward','','btn smallBtn')+btn('back','Send back','','btn smallBtn')+'</div>'+btn('delete','Delete selection','','btn smallBtn')+'</div>'
 }else if(tab==='Triggers'){
 const n=sel();pane='<div class="panel"><h2>Triggers</h2>'+(n?'<h3>'+esc(n.name)+'</h3>'+triggerList(n,true):'<p>Select an element to attach a trigger.</p>')+'<h3 class="mt">My trigger templates</h3>'+templateRows('',true)+btn('new-trigger','New trigger template','plus','addTemplate')+'</div>'
 }else if(tab==='Palette'){
 pane=palettePanel()
 }else{
 pane='<div class="panel"><h2>Theme</h2>'+themePicker()+'</div>'
 }
 $('#library').innerHTML=pane
}
function themeColor(l,k){return field(l,'<input type="color" data-theme="'+k+'" value="'+esc(project.theme[k])+'">')+colorPickButton(k,l)}
function templateRows(q,onlyTrigger=false){return project.templates.filter(t=>(!onlyTrigger||t.kind==='trigger')&&t.name.toLowerCase().includes(q.toLowerCase())).map(t=>'<div class="templateRow">'+preset('use-'+t.id,t.name,t.kind==='trigger'?'triggers':t.kind==='window'?'window':t.kind==='block'?'group':'code')+'<button data-edittemplate="'+t.id+'" title="Manage template" aria-label="Manage '+esc(t.name)+'">Manage</button></div>').join('')}
function syncCodeSize(expanded){
 const panel=$('#inspector'),control=panel.querySelector('[data-cmd=expand-code]');
 panel.classList.toggle('wideCode',Boolean(control&&expanded));
 if(control){control.textContent=expanded?'Reduce code panel':'Expand code';control.setAttribute('aria-pressed',String(Boolean(expanded)))}
}
function drawProps(){
 const n=sel(),head='<div class="insHead"><h2>Inspector</h2><button id="dockPanel" title="Restore default inspector size">Reset size</button>'+icon('sliders',16)+'</div><div style="padding:0 15px 13px"><div class="seg"><button data-mode="design" class="'+(mode==='design'?'active':'')+'">'+icon('sliders',13)+'Design</button><button data-mode="code" class="'+(mode==='code'?'active':'')+'">'+icon('code',13)+'Code</button></div></div>';let body='';
 if(mode==='code'){body=codePanel()}
 else if(!n){body='<div class="part"><h3>'+esc(page().name)+'</h3><p class="hint">Open Code to copy this entire '+page().kind+', or select a layer.</p>'+btn('page-settings','Screen settings','page')+'</div>'}
 else if(selected.length>1){body=groupPanel()}
 else{
 const b=boxFor(n,device,project,page());
 body='<div class="part"><div class="typeLine"><span class="typeIcon">'+icon(categoryIcon(n.type),17)+'</span><div><strong>'+esc(n.type)+'</strong><small>Selected element</small></div></div>'+field('Layer name',prop('name',n.name))+(['Button','Text','Input'].includes(n.type)?field(n.type==='Input'?'Placeholder':'Label',prop('text',n.text)):'')+(n.type==='Icon'?field('Icon','<select id="glyphChoice">'+options(Object.entries(uiIcons),n.glyph)+'</select>'):'')+dataInspector(n)+(n.type==='Image'?btn('replace-image','Replace image','image','btn smallBtn'):'')+'</div>';
 body+='<div class="part"><h3>Position & size</h3><div class="grid2">'+['X','Y','W','H'].map((k,i)=>'<label class="dim">'+k+'<input type="number" aria-label="'+k+'" data-box="'+i+'" value="'+b[i]+'"></label>').join('')+'</div></div>';
 body+='<div class="part"><h3>Appearance</h3>'+colorControl('Fill','fill',n.style.fill)+colorControl(n.type==='Icon'?'Icon color':'Text','color',n.style.color)+'<label class="propRow">Corner radius<span class="dim" style="width:102px"><input type="number" min="0" data-style="radius" value="'+n.style.radius+'">px</span></label><label class="propRow">Font size<span class="dim" style="width:102px"><input type="number" min="1" data-style="fontSize" value="'+n.style.fontSize+'">px</span></label></div>';
 body+='<div class="part"><h3>Interactions</h3>'+triggerList(n)+'</div><div class="part">'+btn('save-selected','Save as template','library','btn full')+'</div>'
 }
 if(mode==='design'&&n)body+=linkedPart();
 if(mode==='design')body+=notesPanel();
 if(mode==='design'&&n)body='<div class="arrangeEntry">'+btn('arrange','Arrange','sliders','btn full')+'</div>'+body;
 $('#inspector').innerHTML=head+body;syncCodeSize($('#inspector').classList.contains('wideCode'));$('#arrangeTool').disabled=!selected.length;const code=$('#elementCode');if(code){code.scrollTop=0}
}
function colorControl(label,k,v){const actual=v==='var(--accent)'?project.theme.accent:/^#[a-f\d]{6}$/i.test(v)?v:'#ffffff';return '<div class="colorRow"><span>'+label+'</span><label class="colorBox"><input type="color" aria-label="'+label+'" data-style="'+k+'" value="'+actual+'">'+esc(v==='var(--accent)'?actual.toUpperCase():v)+'</label>'+colorPickButton(k,label)+'</div>'}
function sourceFor(n){
 const b=boxFor(n,device,project,page()), selector='#'+n.id, rules=Object.entries(cssProps(n,b)).map(([k,v])=>'  '+k+': '+v+';').join('\n');
 let html=n.type==='Custom'?'<!-- Embedded component -->\n'+n.html:markup(n,true).replace(/^<(\w+)/,'<$1 id="'+n.id+'"');
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
function readLabelParts(el){
 const parts=[];
 for(const child of el.childNodes){
   if(child.nodeType===3){parts.push(child.data);continue}
   if(child.nodeType!==1)continue;
   const tag=child.localName;
   if(child.namespaceURI!=='http://www.w3.org/1999/xhtml'||child.getAttributeNames().some(k=>k!=='style'))throw Error('Use inline text tags and style attributes inside a label.');
   const item={tag,children:readLabelParts(child)};
   if(child.style?.length)item.style=Object.fromEntries(Array.from(child.style,k=>[k,child.style.getPropertyValue(k)]));
   parts.push(item);
 }
 return parts;
}
function parseElement(n,code){
 const draft=clone(n),b=boxFor(n,device,project,page()),doc=new DOMParser().parseFromString(code,'text/html');
 const actionBlock=doc.querySelector('script[data-triggers]');if(actionBlock){const a=JSON.parse(actionBlock.textContent);if(!Array.isArray(a)||a.some(v=>!triggerOK(v)))throw Error('Use a supported event, action, and target in the trigger list.');draft.actions=a;actionBlock.remove()}
 const layout=doc.querySelector('style[data-layout]');draft.extraCSS={};
 if(layout){const rules=declarations(layout.textContent);if(rules.length!==1||!rules[0].style)throw Error('Keep one layout rule for the selected element.');readStyles(draft,rules[0].style,b);layout.remove()}
 if(n.type==='Custom'){draft.html=code.replace(/<style\b[^>]*\bdata-layout\b[^>]*>[\s\S]*?<\/style>/i,'').replace(/<script\b[^>]*\bdata-triggers\b[^>]*>[\s\S]*?<\/script>/i,'').replace('<!-- Embedded component -->','').trim();if(!draft.html)throw Error('Enter component markup.')}
 else{
 if(doc.querySelector('script,iframe,object,embed,link'))throw Error('Use My templates → Embedded HTML for a self-contained widget.');
 const styles=[...doc.querySelectorAll('style')];for(const style of styles)style.remove();
 const el=doc.body.firstElementChild,tags={Icon:n.actions.length?'BUTTON':'SPAN',Text:'DIV',Button:'BUTTON',Input:pickerKind(n)?'BUTTON':n.inputType==='select'?'SELECT':'INPUT',Table:'DIV',Image:'IMG',Module:'DIV',Shape:'DIV'};
 if(!el||(n.type==='Icon'?!['BUTTON','SPAN'].includes(el.tagName):el.tagName!==tags[n.type])||doc.body.children.length!==1)throw Error('Keep the '+tags[n.type].toLowerCase()+' root, or import this as an embedded template.');
 for(const style of styles)for(const r of declarations(style.textContent)){if(!r.style||!el.matches(r.selectorText))throw Error('Use a rule that matches the selected layer.');readStyles(draft,r.style,b)}
 readStyles(draft,el.style,b);
 if(n.type==='Icon'){
   const key=el.dataset.studioIcon;
   if(!Object.hasOwn(uiIcons,key))throw Error('Choose a library name for data-studio-icon.');
   const shape=el.querySelector('svg');
   if(![key,n.glyph].some(g=>shape?.innerHTML===new DOMParser().parseFromString(icon(g,24),'text/html').querySelector('svg').innerHTML))throw Error('Set data-studio-icon to change the library icon. Use an embedded component for custom SVG paths.');
   draft.glyph=key;draft.name=el.getAttribute('aria-label')||n.name;
 }
 if(['Button','Text'].includes(n.type)){
   draft.text=el.textContent;
   if(el.children.length){draft.labelParts=readLabelParts(el);labelHTML(draft.labelParts)}
   else draft.labelParts=null;
 }
 if(pickerKind(n)){if(el.dataset.pickerKind!==n.inputType)throw Error('Keep the original picker kind.');const settings=JSON.parse(el.dataset.pickerSettings||'{}');if(!pickerSettingValid(settings,n.inputType))throw Error('Check the picker display settings.');draft.picker=settings;draft.name=el.getAttribute('aria-label')||n.name;draft.text=el.querySelector('span')?.textContent||'';draft.choices=el.dataset.choices||'';draft.requirement=el.dataset.required==='true'?'required':'optional'}
 else if(n.type==='Input'){draft.name=el.getAttribute('aria-label')||n.name;draft.requirement=el.required?'required':'optional';if(el.tagName==='SELECT'){const opts=[...el.options];draft.text=opts.find(o=>!o.value)?.textContent||'';draft.choices=opts.filter(o=>o.value).map(o=>o.textContent+' | '+o.value).join('\n')}else{draft.text=el.placeholder;draft.inputType=el.type}}
 if(n.type==='Image'){if(!/^data:image\/(png|jpeg|webp|gif);base64,/i.test(el.getAttribute('src')||''))throw Error('Use an embedded PNG, JPEG, GIF, or WebP image.');draft.src=el.getAttribute('src')}
 if(n.type==='Table'){draft.rows=[...el.querySelectorAll('tr:not([data-empty])')].map(r=>[...r.cells].map(c=>c.textContent).join(' | ')).join('\n');draft.initialState=el.dataset.start||'sample';draft.emptyMessage=el.dataset.empty??n.emptyMessage}
 }
 setBox(draft,b,device,project,page());return draft
}
function insertNode(n,at){
 const preset=project.theme.definition||projectPresets.find(t=>t.name===project.theme.preset);if(preset)styleLayerForTheme(n,preset);
 const pg=page(),[w,h]=bounds(pg,device,project),b=boxFor(n,device,project,pg);b[2]=Math.min(b[2],w-12);b[0]=Math.max(0,Math.min(w-b[2],at?.[0]??Math.round((w-b[2])/2)));b[1]=Math.max(0,Math.min(h-b[3],at?.[1]??Math.round((h-b[3])/2)));setBox(n,b,device,project,pg);
 change(()=>{pg.nodes.push(n);selected=[n.id]});dismiss();closeSide()
}
function addScreen(type){
 let p=type==='picker-demo'?pickerDemoScreen():['sample-entry','linked-entry'].includes(type)?sampleEntryScreen():type==='signin'?intro().pages[0]:makePage(type==='ledger'?'Account ledger':'Untitled screen');
 if(type==='ledger'){p.nodes=[node('Text','Account ledger',[36,40,380,46]),node('Button','Find account',[690,40,225,46]),createItem('Table','Ledger')];Object.assign(p.nodes[0].style,{fontSize:32,weight:700});p.nodes[2].boxes.laptop=[36,124,879,284]}
 const preset=project.theme.definition||projectPresets.find(t=>t.name===project.theme.preset);if(preset)for(const n of p.nodes)styleLayerForTheme(n,preset);
 const companions=[];
 if(type==='linked-entry'){
   const ledger=makePage('Ledger');p.name='Entry';const table=p.nodes.pop();
   table.boxes.laptop=[36,104,800,420];table.boxes.phone=[20,80,350,490];
   const title=node('Text','Ledger',[36,28,640,53]);title.style.fontSize=32;title.boxes.phone=[20,18,350,44];
   if(preset)styleLayerForTheme(title,preset);ledger.nodes=[title,table];companions.push(ledger);
 }else if(type==='signin'){
   const win=intro().pages[1];if(preset)for(const n of win.nodes)styleLayerForTheme(n,preset);
   p.nodes.at(-1).actions[0].target=win.id;companions.push(win);
 }
 createDestinations(p,companions);
}
function variantDialog(type,at){
 if(type==='Icon'){insertIconDialog(at);return}
 modal('Insert '+type.toLowerCase(),('<p class="hint">Choose a starting design or add one of your own.</p>')+variants[type].map((v,i)=>'<button class="variant" data-variant="'+i+'"><span>'+icon(categoryIcon(type))+v+'</span>'+icon('plus',15)+'</button>').join('')+project.templates.filter(t=>t.kind==='element'&&(pickerKind(t.node)?'Picker':t.node.type)===type||t.kind==='block'&&type==='Module'||t.kind==='window'&&type==='Window'||t.kind==='element'&&t.category===type).map(t=>preset('use-'+t.id,t.name,'library')).join('')+btn('type-template','Add a template','plus','addTemplate'));
 $('[data-cmd=type-template]').onclick=()=>templateDialog(null,type==='Button'?'button':'embed',type);
 $$('.dialog [data-variant]').forEach(el=>el.onclick=()=>{const ver=variants[type][+el.dataset.variant];
 if(type==='Window'){let w=makePage(ver,'window',ver==='Wide dialog'?640:440);if(ver!=='Blank window'){w.nodes=[node('Text','Window title',[24,38,330,40]),node('Button','Close',[24,157,145,44],{actions:[{event:'click',action:'close',target:''}]})];w.nodes[0].style.fontSize=27}const preset=project.theme.definition||projectPresets.find(t=>t.name===project.theme.preset);if(preset)for(const n of w.nodes)styleLayerForTheme(n,preset);createDestinations(w);return}
 const n=type==='Picker'?createPicker(ver.toLowerCase()):createItem(type,ver);if(type==='Image'&&ver==='Upload image')pickImage(src=>{n.src=src;insertNode(n,at)});else insertNode(n,at)
 })
}
function pickImage(cb){const inp=document.createElement('input');inp.type='file';inp.accept='image/png,image/jpeg,image/webp,image/gif';inp.onchange=()=>{const f=inp.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{if(!/^data:image\/(png|jpeg|webp|gif);base64,/i.test(r.result)){toast('Choose a PNG, JPEG, GIF, or WebP image.');return}cb(r.result)};r.readAsDataURL(f)};inp.click()}
function actionDialog(index=null,sample=null){
 const n=sel();if(!n){toast('Select an element for this trigger.');return}
 const old=sample||n.actions[index]||{};modal('Element trigger',field('Element','<input readonly value="'+esc(n.name)+'">')+triggerForm(old)+'<div id="actionError" class="error"></div><div class="dialogActions">'+(index===null?'':'<button class="btn" id="deleteThisTrigger">Delete trigger</button>')+btn('store-action','Save as template')+btn('commit-action','Apply trigger','check','btn primary')+'</div>');wireTargets(old);if(index!==null)$('#deleteThisTrigger').onclick=()=>{change(()=>n.actions.splice(index,1));dismiss()};
 $('[data-cmd=commit-action]').onclick=()=>{try{const a=readTrigger();change(()=>{if(index===null)n.actions.push(a);else n.actions[index]=a});dismiss();toast('Trigger applied')}catch(e){$('#actionError').textContent=e.message}};
 $('[data-cmd=store-action]').onclick=()=>{try{triggerTemplate(readTrigger())}catch(e){$('#actionError').textContent=e.message}}
}
function triggerTemplate(action=null,existing=null){
 const a=action||existing?.action||{event:'click',action:'open',target:''};modal('Save trigger template',field('Template name','<input id="tplName" value="'+esc(existing?.name||names[a.action])+'">')+field('Trigger code (JSON)','<textarea rows="7" id="trCode">'+esc(JSON.stringify(a,null,2))+'</textarea>')+'<p class="hint">Set the event and action for this template. You can choose different destinations when inserting it.</p><div class="error" id="tplError"></div><div class="dialogActions">'+btn('commit-trigger-template','Save template','','btn primary')+'</div>');
 $('[data-cmd=commit-trigger-template]').onclick=()=>{try{let v=JSON.parse($('#trCode').value);if(!triggerOK(v)&&!(v.action==='open'&&v.target===''&&v.event==='click'))throw Error('Use one of the supported events and actions.');saveTemplate({id:existing?.id||uid(),kind:'trigger',name:requiredName(),action:{...v,event:v.event,action:v.action,target:String(v.target||'')}})}catch(e){$('#tplError').textContent=e.message}}
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
 if(!existing){
   const convert=document.createElement('button');convert.className='chip';convert.textContent='Import as separate layers';convert.type='button';
   $('#tplHint').after(convert);convert.onclick=()=>importHTMLDialog($('#tplCode').value,$('#tplName').value);
 }
 $('#tplKind').onchange=()=>{if($('#tplKind').value==='trigger')triggerTemplate()};
 $('[data-cmd=commit-paste]').onclick=()=>{try{const name=requiredName(),category=$('#tplCategory').value,code=$('#tplCode').value.trim();if(!code)throw Error('Paste some code first.');let n;
 if($('#tplKind').value==='button'){const doc=new DOMParser().parseFromString(code,'text/html');const el=doc.querySelector('button');if(!el||el.children.length||doc.querySelector('script,link,iframe')||el.getAttributeNames().some(k=>/^on/i.test(k)))throw Error('Choose Embedded HTML for a multi-element or scripted template.');
 n=createItem('Button','Solid');n.text=el.textContent||name;let b=n.boxes.laptop;
 for(const css of doc.querySelectorAll('style'))for(const r of declarations(css.textContent)){if(!r.style||!el.matches(r.selectorText))throw Error('Choose Embedded HTML for CSS states, media queries, or nested elements.');readStyles(n,r.style,b)}readStyles(n,el.style,b)
 }else{n=node('Custom',name,[20,20,240,96],{html:code})}
 if(category==='Window')n.boxes.laptop=[0,0,460,310];n.name=name;saveTemplate({id:existing?.id||uid(),kind:category==='Window'?'window':'element',category,name,node:n})}catch(e){$('#tplError').textContent=e.message}}
}
function useTemplate(t){if(!t)return;if(t.kind==='trigger'){actionDialog(null,t.action);return}
 if(t.kind==='window'&&t.node){const w=makePage(t.name,'window',t.node.boxes.laptop[2]);w.height=t.node.boxes.laptop[3];const content=clone(t.node);content.id=uid();content.boxes.laptop[0]=0;content.boxes.laptop[1]=0;w.nodes=[content];const preset=project.theme.definition||projectPresets.find(t=>t.name===project.theme.preset);if(preset)for(const n of w.nodes)styleLayerForTheme(n,preset);createDestinations(w,[],[content.id]);return}if(t.layout){
 const layout=clone(t.layout),maps=new Map(layout.nodes.map(n=>[n.id,uid()])),groups=new Map();
 const newPageId=uid(),groupId=uid();for(const n of layout.nodes){n.id=maps.get(n.id);delete n.sharedComponent;if(n.picker?.footerButton)n.picker.footerButton=maps.get(n.picker.footerButton)||n.picker.footerButton;for(const a of n.actions){if(maps.has(a.source))a.source=maps.get(a.source);if(a.fields)a.fields=a.fields.map(id=>maps.get(id)||id);if(maps.has(a.target))a.target=maps.get(a.target);else if(a.target===layout.id)a.target=newPageId}if(t.kind==='block')n.group=groupId;else if(n.group){if(!groups.has(n.group))groups.set(n.group,uid());n.group=groups.get(n.group)}}
 if(t.kind!=='block'){layout.id=newPageId;layout.name=t.name;delete layout.parentId;createDestinations(layout);return}
 change(()=>{for(const n of layout.nodes){for(const b of Object.values(n.boxes)){b[0]+=12;b[1]+=12}page().nodes.push(n)}selected=layout.nodes.map(n=>n.id)});dismiss();closeSide();return}

 const n=clone(t.node);n.id=uid();delete n.sharedComponent;delete n.group;n.name=t.name;insertNode(n)}
function manageTemplate(t){
 modal(t.name,'<div class="dialogActions">'+btn('rename-template','Rename')+(t.layout?'':btn('edit-template',t.kind==='trigger'||t.node?.type==='Custom'?'Edit code':'View code'))+btn('remove-template','Delete')+'</div>');
 $('[data-cmd=rename-template]').onclick=()=>{modal('Rename template',field('Name','<input id="tplName" value="'+esc(t.name)+'">')+'<div class="dialogActions">'+btn('rename-ok','Save','','btn primary')+'</div>');$('[data-cmd=rename-ok]').onclick=()=>{let v=$('#tplName').value.trim();if(v){change(()=>t.name=v);dismiss()}}};
 if(!t.layout)$('[data-cmd=edit-template]').onclick=()=>{if(t.kind==='trigger')triggerTemplate(null,t);else if(t.node.type==='Custom')templateDialog(t);else modal(t.name,field('Component code','<textarea readonly rows="14">'+esc(sourceFor(t.node))+'</textarea>')+'<p class="hint">Insert a copy, edit its code, and save it as a new template.</p>')};
 $('[data-cmd=remove-template]').onclick=()=>{change(()=>project.templates=project.templates.filter(v=>v.id!==t.id));dismiss()}
}
function fitPreviewFrame(){
 const frame=$('.previewBg iframe');if(!frame)return;
 const stage=frame.closest('.previewStage'),box=frame.parentElement,layout=$('#previewDevice').value;
 const width=project.widths[layout],height=devices[layout][1]+Number(frame.dataset.navHeight||0);
 const scale=Math.min(1,Math.max(1,stage.clientWidth-24)/width,Math.max(1,stage.clientHeight-24)/height);
 Object.assign(box.style,{width:width*scale+'px',height:height*scale+'px'});
 Object.assign(frame.style,{width:width+'px',height:height+'px',transform:'scale('+scale+')'});
}
const previewObserver=new ResizeObserver(fitPreviewFrame);
window.addEventListener('message',event=>{
 const frame=$('.previewBg iframe');
 if(!frame||event.source!==frame.contentWindow)return;
 if(event.data?.type==='form-studio-ready'){
   if(event.data.sequence===Number(frame.dataset.sequence)){frame.inert=false;frame.removeAttribute('aria-busy')}
   return;
 }
 if(event.data?.type!=='form-studio-location')return;
 const current=project.pages.find(pg=>pg.id===event.data.page);
 if(current)$('#previewPageName').textContent=current.name;
 const navHeight=event.data.navHeight;
 if(Number.isFinite(navHeight)&&navHeight>=0&&navHeight<=160&&event.data.layout===$('#previewDevice').value){
   frame.dataset.navHeight=String(navHeight);fitPreviewFrame();
 }
});
function preview(d=device,dataState='design',response='success'){
 closeSide();$('#overlay').innerHTML='<section class="previewBg" role="dialog" aria-label="Interactive preview"><div class="previewBar"><strong>'+icon('preview',15)+' Preview · <span id="previewPageName">'+esc(page().name)+'</span></strong><select id="previewDevice" aria-label="Preview device">'+options(Object.keys(devices).map(k=>[k,cap(k)+' · '+project.widths[k]+' × '+devices[k][1]]),d)+'</select>'+(tablesInProject().length?'<select id="previewState" aria-label="Preview data">'+options([['design','As designed'],['empty','Empty tables'],['sample','Sample rows']],dataState)+'</select>':'')+(project.pages.some(pg=>pg.nodes.some(n=>n.actions.some(a=>saveTypes.includes(a.action))))?'<select id="previewResponse" aria-label="Save response">'+options([['success','Successful save'],['saving','Saving'],['failed','Save failed'],['offline','Offline']],response)+'</select>':'')+btn('dismiss','Back to editor','close','btn smallBtn')+'</div><div class="previewStage"><div class="previewFrameSize"><iframe title="Interactive design preview" sandbox="allow-scripts allow-modals"></iframe></div></div></section>';
 const frame=$('.previewBg iframe');
 function updatePreview(){
   const layout=$('#previewDevice').value;
   fitPreviewFrame();
   const sequence=Number(frame.dataset.sequence||0)+1;frame.dataset.sequence=sequence;
   frame.inert=true;frame.setAttribute('aria-busy','true');
   frame.contentWindow.postMessage({type:'form-studio-preview',sequence,device:layout,dataState:$('#previewState')?.value||'design',response:$('#previewResponse')?.value||'success'},'*');
 }
 previewObserver.disconnect();previewObserver.observe(frame.closest('.previewStage'));fitPreviewFrame();frame.onload=()=>{if(frame.isConnected)updatePreview()};
 frame.srcdoc=buildHTML(project,pageId,d,dataState,response,true);
 for(const control of $$('.previewBar select'))control.onchange=updatePreview;
}
function download(body,path,type){const url=URL.createObjectURL(new Blob([body],{type})),a=document.createElement('a');a.href=url;a.download=path;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000)}
function exportDialog(){
 modal('Export project',preset('html','Working website · HTML','code')+'<p class="hint">Open this one file in a browser, even offline. Resize the browser window to see the laptop, tablet and phone layouts.</p>'+preset('source-zip','Project source · ZIP','code')+'<p class="hint">Extract the whole ZIP, then double-click <strong>index.html</strong> to see your website offline. Keep the files together. Includes your editable project, screen and component code, and developer notes.</p>'+preset('json','Editable project · JSON','layers','mint')+'<p class="hint">Includes all designs, groups, triggers, and My templates. Import this file to continue on another device.</p><hr style="border:0;border-top:1px solid var(--line)">'+btn('import','Import project file','page','btn full'))
}
function validateImport(p){
 if(p?.format!=='form-studio'||p.version!==1||!Array.isArray(p.pages)||!p.pages.some(a=>a.kind==='screen')||!Array.isArray(p.templates)||!Array.isArray(p.palette)||!p.theme||typeof p.name!=='string'||!p.name.trim())throw Error('Choose a Form Studio project JSON file.');
 const hex=c=>/^#[a-f0-9]{6}$/i.test(c), id=x=>typeof x==='string'&&/^[a-z][a-z0-9_-]*$/i.test(x);
 const validPaint=color=>typeof color==='string'&&(/^(?:#[a-f0-9]{3,8}|transparent)$/i.test(color)||/^rgba?\([\d.,% /+-]+\)$/i.test(color));
 if(p.pages.some(pg=>pg?.backgrounds&&(typeof pg.backgrounds!=='object'||Object.entries(pg.backgrounds).some(([d,color])=>!Object.hasOwn(devices,d)||!validPaint(color)))))throw Error('A screen background is invalid.');
 if(p.pages.some(pg=>!pg||pg.devNote!==undefined&&typeof pg.devNote!=='string'))throw Error('Screen notes must be text.');
 if(!p.palette.every(hex)||!hex(p.theme.accent)||!hex(p.theme.background)||!families.includes(p.theme.font)||Object.keys(devices).some(d=>!sizes[d].includes(p.widths?.[d])))throw Error('Project theme or device settings are invalid.');
 if(p.theme.definition&&!validTheme(p.theme.definition))throw Error('Theme settings are invalid.');
 if(p.paletteRoles!==undefined&&!validPaletteRoles(p.paletteRoles))throw Error('Palette color roles are invalid.');
 if(p.customThemes!==undefined&&(!Array.isArray(p.customThemes)||p.customThemes.some(t=>!id(t?.id)||!validTheme(t))))throw Error('A saved theme is invalid.');
 if(p.customPalettes!==undefined&&(!Array.isArray(p.customPalettes)||p.customPalettes.some(a=>!id(a?.id)||typeof a.name!=='string'||!a.name.trim()||a.name.length>100||!Array.isArray(a.colors)||!a.colors.length||a.colors.length>32||!a.colors.every(hex)||a.roles!==undefined&&!validPaletteRoles(a.roles))))throw Error('A saved palette is invalid.');
 const checkNode=n=>{if(!n||!id(n.id)||!['Button','Text','Input','Image','Module','Shape','Table','Custom','Icon'].includes(n.type)||typeof n.name!=='string'||!n.style||!n.boxes?.laptop||!Array.isArray(n.actions)||Object.values(n.boxes).some(b=>!Array.isArray(b)||b.length!==4||b.some(v=>!Number.isFinite(v)))||n.style.radius<0||!Number.isFinite(n.style.radius)||!Number.isFinite(n.style.fontSize))throw Error('A component in the project is invalid.');
 if(n.colorRoles!==undefined&&!validColorRoles(n.colorRoles))throw Error('A layer color assignment is invalid.');
 if(n.devNote!==undefined&&typeof n.devNote!=='string'||n.locked!==undefined&&typeof n.locked!=='boolean')throw Error('A layer note or lock setting is invalid.');
 if(n.type==='Icon'&&!Object.hasOwn(uiIcons,n.glyph))throw Error('Choose a supported UI icon.');
 if(n.labelParts!=null)labelHTML(n.labelParts);
 if(n.group!==undefined&&!id(n.group))throw Error('A group ID is invalid.');
 if(n.type==='Input'&&n.choices!==undefined&&typeof n.choices!=='string')throw Error('Dropdown choices must be text.');if(n.actions.some(a=>a.action==='saveRow'&&(!Array.isArray(a.fields)||a.fields.some(k=>k!==''&&!id(k))||typeof a.message!=='string')))throw Error('A save trigger has invalid fields.');if(n.type==='Image'&&!/^data:image\/(png|jpeg|webp|gif);base64,/i.test(n.src||''))throw Error('This project has an unsupported image source.');
 if(n.type==='Custom'&&typeof n.html!=='string')throw Error('A custom component is invalid.');if(n.type==='Table'&&(typeof n.rows!=='string'||!n.rows.split(/\r?\n/).some(line=>line.trim())))throw Error('A table is invalid.');
 if(!pickerSettingValid(n.picker,pickerKind(n))||n.actions.some(a=>!triggerOK(a)))throw Error('An interaction is invalid.')};
 const seen=new Set();function unique(key){if(seen.has(key))throw Error('Two screens or layers share an ID. Each needs a unique ID.');seen.add(key)}
 for(const pg of p.pages){if(!pg||!id(pg.id)||typeof pg.name!=='string'||!Array.isArray(pg.nodes)||!['screen','window'].includes(pg.kind))throw Error('A screen definition is invalid.');if(pg.kind==='window'&&(!Number.isFinite(pg.width)||!Number.isFinite(pg.height)))throw Error('Window dimensions are invalid.');unique(pg.id);for(const n of pg.nodes){checkNode(n);unique(n.id)}}
 if(p.categories!==undefined&&!Array.isArray(p.categories))throw Error('Invalid category list.');
 for(const category of p.categories||[]){
   if(!category||category.kind!=='category'||!id(category.id)||typeof category.name!=='string'||!category.name.trim())throw Error('A category is invalid.');
   unique(category.id);
 }
 projectTree(p);
 p.templates.forEach(t=>{if(!id(t.id)||typeof t.name!=='string'||!['trigger','element','block','window','screen'].includes(t.kind))throw Error('A template is invalid.');if(t.kind==='element'||t.kind==='window'&&t.node){checkNode(t.node)}else if(t.kind!=='trigger'){if(!Array.isArray(t.layout?.nodes))throw Error('A template layout is invalid.');t.layout.nodes.forEach(checkNode)}else if(!triggerOK(t.action)&&!(t.action?.action==='open'&&t.action.target===''&&t.action.event==='click'))throw Error('Invalid trigger template.')});return p
}
function importFile(){const inp=document.createElement('input');inp.type='file';inp.accept='.json,application/json';inp.onchange=async()=>{if(!inp.files[0])return;try{const q=validateImport(JSON.parse(await inp.files[0].text()));if(write())saveNewDocument(q)}catch(e){toast(e.message)}};inp.click()}
function moveLayer(up){const n=sel();if(!n)return;const list=page().nodes,i=list.indexOf(n),j=i+(up?1:-1);if(j<0||j>=list.length)return;change(()=>[list[i],list[j]]=[list[j],list[i]])}
function groupNodes(){if(selected.length<2){toast('Select two or more layers first.');return}let id=uid();multi=false;change(()=>page().nodes.filter(n=>selected.includes(n.id)).forEach(n=>{n.group=id;n.groupName='Layer group'}),'Elements grouped')}
function removeSelection(){if(!selected.length)return;const ids=new Set(selected);change(()=>{page().nodes=page().nodes.filter(n=>!ids.has(n.id));selected=[]})}
function command(c){
 if(c==='apply-preset'){if($('#presetChoice'))useProjectTheme($('#presetChoice').value);return}
 if(c.startsWith('use-'))return useTemplate(project.templates.find(t=>t.id===c.slice(4)));
 const n=sel();
 switch(c){
 case 'theme-studio':openProjectThemes();break;case 'create-theme':openProjectThemes(true);break;case 'create-palette':openPaletteEditor();break;case 'edit-palette':openPaletteEditor({name:'My palette',colors:[...project.palette],roles:project.paletteRoles||{}});break;case 'palette-theme':previewPaletteTheme();break;
 case 'website-settings':openStudioSettings();break;
 case 'site-logout':siteLogout();break;
 case 'expand-code':{const panel=$('#inspector');if(innerWidth<=850){$('#library').classList.remove('shown');panel.classList.add('shown')}syncCodeSize(!panel.classList.contains('wideCode'));break}
 case 'merge-design':mergeDialog();break;case 'find-project':findInProject();break;case 'duplicate-layers':case 'lock-layers':case 'hide-layers':layerAction(c);break;
 case 'guides':toggleSmartGuides();break;case 'arrange':arrangeDialog();break;case 'undo':stepHistory(true);break;case 'redo':stepHistory(false);break;
 case 'preview':preview();break;case 'export':exportDialog();break;case 'dismiss':dismiss();break;
 case 'discard-code':dropCodeDraft();drawProps();break;case 'apply-code':applySelection();break;case 'copy-chat':copyForChat();break;case 'select-code':selectCode();break;case 'project-code':codeBrowser();break;case 'source-zip':downloadSources();break;case 'files':filesDialog();break;case 'new-file':newProject();break;case 'copy-file':newProject(true);break;case 'rename-file':$('#projectName').click();break;case 'cloud':cloudDialog();break;case 'save-selected':saveSelected();break;case 'pages':pagesDialog();break;case 'page-settings':pageSettings();break;
 case 'link-copy':placeLinked();break;case 'unlink-component':change(()=>selectedLayers().forEach(n=>delete n.sharedComponent),'Copy detached');break;case 'add-choice':editPickerChoice(-1,'add');break;case 'picker-demo':case 'linked-entry':case 'sample-entry':case 'signin':case 'blank':case 'ledger':addScreen(c);break;
 case 'replace-image':if(n)pickImage(src=>change(()=>n.src=src));break;
 case 'save-screen-template':saveBlock(true);break;case 'new-template':templateDialog();break;case 'add-action':actionDialog();break;case 'new-trigger':triggerTemplate();break;
 case 'multi':multi=!multi;panMode=false;render();break;case 'group':groupNodes();break;
 case 'ungroup':{const groups=new Set(page().nodes.filter(n=>selected.includes(n.id)).map(n=>n.group).filter(Boolean));change(()=>page().nodes.filter(n=>groups.has(n.group)).forEach(n=>delete n.group));break}
 case 'forward':moveLayer(true);break;case 'back':moveLayer(false);break;case 'delete':removeSelection();break;
 case 'add-color':{const color=$('#newColor').value.toUpperCase();if(!project.palette.includes(color))change(()=>project.palette.push(color),'Color saved');break}
 case 'html':case 'json':{const base=project.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'studio-project';if(c==='html')download(buildHTML(project,exportScreen(project,pageId).id),base+'.html','text/html');else download(JSON.stringify(project,null,2),base+'.studio.json','application/json');toast('Export downloaded');break}
 case 'import-html':importHTMLDialog();break;case 'import':importFile();break
 }
}
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b){if(e.target.classList.contains('dialogBg'))dismiss();return}
 if(b.dataset.cmd)command(b.dataset.cmd);
 if(b.dataset.choiceRemove!==undefined&&sel())editPickerChoice(+b.dataset.choiceRemove,'remove');
 if(b.dataset.sample)pickDesignColor(b.dataset.sample);
 if(b.dataset.tab){tab=b.dataset.tab;render();if(innerWidth<=620||innerWidth<=850&&tab!=='Insert'){closeSide();$('#library').classList.add('shown')}}
 if(b.dataset.mode){mode=b.dataset.mode;drawProps()}
 if(b.dataset.device){device=b.dataset.device;zoomFactor=1;pan=[0,0];render()}
 if(b.dataset.deletePage)deleteDestination(b.dataset.deletePage);
 if(b.dataset.page)choosePage(b.dataset.page);
 if(b.dataset.insert)variantDialog(b.dataset.insert);
 if(b.dataset.layer){const n=page().nodes.find(v=>v.id===b.dataset.layer);toggleLayers(n,multi||e.shiftKey||e.ctrlKey||e.metaKey)}
 if(b.dataset.editaction!==undefined)actionDialog(+b.dataset.editaction);
 if(b.dataset.shiftAction!==undefined&&sel())moveTrigger(sel(),+b.dataset.shiftAction,+b.dataset.direction);
 if(b.dataset.rmaction!==undefined&&sel())change(()=>sel().actions.splice(+b.dataset.rmaction,1));
 if(b.dataset.edittemplate)manageTemplate(project.templates.find(t=>t.id===b.dataset.edittemplate));
 if(b.dataset.swatch)applyPaletteSwatch(b.dataset.swatch);
 if(b.dataset.roleColor)previewPaletteTheme(b.dataset.roleColor);
 if(b.dataset.palette!==undefined)change(()=>{const p=palettePresets[+b.dataset.palette];project.palette=[...p.colors];if(p.roles)project.paletteRoles=clone(p.roles);else delete project.paletteRoles},'Palette changed');
 if(b.dataset.usePalette){const p=project.customPalettes?.find(p=>p.id===b.dataset.usePalette);if(p)change(()=>{project.palette=[...p.colors];project.paletteRoles=clone(p.roles||{})},'Palette selected')}
 if(b.dataset.editPalette){const p=project.customPalettes?.find(p=>p.id===b.dataset.editPalette);if(p)openPaletteEditor(p)}
 if(b.dataset.openTheme){const t=project.customThemes?.find(t=>t.id===b.dataset.openTheme);if(t)openProjectThemes(t)}
});
document.addEventListener('change',e=>{
 const t=e.target,n=sel(),pg=page();
 if(t.hasAttribute('data-dev-note')){const dest=selected.length?n:pg;if(dest)change(()=>dest.devNote=t.value.trim());return}
 if(t.id==='groupName'){const name=t.value.trim()||'Layer group';change(()=>selectedLayers().forEach(n=>n.groupName=name));return}
 if(t.id==='pageSelect'){choosePage(t.value);return}
 if(t.dataset.theme){change(()=>project.theme[t.dataset.theme]=t.value);return}
 if(!n)return;
 if(t.dataset.pickerSetting){const k=t.dataset.pickerSetting;if(!t.checkValidity()||(!t.value&&k!=='footerButton'))return;change(()=>{n.picker={...n.picker,[k]:t.type==='number'?Number(t.value):t.value}});return}
 if(t.dataset.choiceLabel!==undefined||t.dataset.choiceValue!==undefined){editPickerChoice(Number(t.dataset.choiceLabel??t.dataset.choiceValue),t.dataset.choiceLabel!==undefined?'label':'value',t.value);return}
 if(t.id==='glyphChoice'&&n.type==='Icon'&&Object.hasOwn(uiIcons,t.value))change(()=>n.glyph=t.value);
 if(t.dataset.prop)change(()=>{n[t.dataset.prop]=t.value;if(t.dataset.prop==='text'&&n.labelParts)delete n.labelParts});
 if(t.dataset.box!==undefined){let b=boxFor(n,device,project,pg);if(!t.value.trim()||!Number.isFinite(+t.value))return;b[+t.dataset.box]=+t.value;change(()=>setBox(n,b,device,project,pg))}
 if(t.dataset.style){const k=t.dataset.style;change(()=>n.style[k]=['radius','fontSize'].includes(k)?Math.max(k==='radius'?0:1,+t.value):t.value)}
});
document.addEventListener('input',e=>{if(e.target.id==='elementCode'){updateCodeDraft(e.target.value);return}if(e.target.id==='search'){search=e.target.value;drawLibrary();const inp=$('#search');inp.focus();inp.setSelectionRange(search.length,search.length)}});
$('#pageBtn').onclick=pagesDialog;
$('#projectName').onclick=()=>{modal('Rename project',field('Project name','<input id="projName" value="'+esc(project.name)+'">')+'<div class="dialogActions">'+btn('rename-project','Save','','btn primary')+'</div>');$('[data-cmd=rename-project]').onclick=()=>{const v=$('#projName').value.trim();if(v){change(()=>project.name=v);dismiss()}}};
$('#sizeBtn').onclick=()=>{modal('Device size',field(cap(device)+' width','<select id="newSize">'+options(sizes[device].map(v=>[String(v),v+' px']),String(project.widths[device]))+'</select>')+'<div class="dialogActions">'+btn('apply-size','Apply','','btn primary')+'</div>');$('[data-cmd=apply-size]').onclick=()=>{const w=+$('#newSize').value;change(()=>project.widths[device]=w);dismiss()}};
$('#selectTool').onclick=()=>{panMode=false;multi=false;render()};$('#panTool').onclick=()=>{panMode=true;multi=false;render()};$('#less').onclick=()=>{zoomFactor=Math.max(.4,zoomFactor/1.2);fitBoard()};$('#more').onclick=()=>{zoomFactor=Math.min(4,zoomFactor*1.2);fitBoard()};$('#zoom').onclick=()=>{zoomFactor=1;pan=[0,0];fitBoard();boardViewport.scrollTop=0};
$('#openLib').onclick=()=>{const open=tab!=='Insert'||!$('#library').classList.contains('shown');tab='Insert';search='';render();closeSide();$('#library').classList.toggle('shown',open)};$('#openProps').onclick=()=>{$('#library').classList.remove('shown');$('#inspector').classList.toggle('shown')};
const stage=$('#stage');
// Only the drawing surface scrolls. The canvas controls stay within reach on long forms.
const boardViewport=document.createElement('div');boardViewport.id='boardViewport';
stage.insertBefore(boardViewport,$('#sheetWrap'));boardViewport.append($('#sheetWrap'));
stage.addEventListener('pointerdown',e=>{
 if(e.button!==0||gesture||e.target.closest('.floatTools,#referenceNotice'))return;$('#library').classList.remove('shown');const wrap=e.target.closest('.nodeWrap');
 e.preventDefault();stage.setPointerCapture(e.pointerId);
 if(panMode){gesture={pan:[...pan],scrollTop:boardViewport.scrollTop,x:e.clientX,y:e.clientY};return}
 if(!wrap||multi&&!e.target.dataset.handle){startBoxSelection(e,wrap?.dataset.id);return}
 const n=page().nodes.find(v=>v.id===wrap.dataset.id),handle=e.target.dataset.handle;
 if(n.locked)return;
 if(!handle&&(e.shiftKey||e.ctrlKey||e.metaKey||multi)){toggleLayers(n,true);return}
 if(!selected.includes(n.id))selectIds(n.group?page().nodes.filter(v=>v.group===n.group).map(v=>v.id):[n.id]);
 if(selectedLayers().some(v=>v.locked))return;
 const items=page().nodes.filter(v=>selected.includes(v.id)).map(v=>({n:v,box:boxFor(v,device,project,page())}));
 if(!items.length)return;
 gesture={x:e.clientX,y:e.clientY,items,handle,targets:null,initial:null,before:[Math.min(...items.map(i=>i.box[0])),Math.min(...items.map(i=>i.box[1])),Math.max(...items.map(i=>i.box[0]+i.box[2])),Math.max(...items.map(i=>i.box[1]+i.box[3]))]};
});
stage.addEventListener('pointermove',e=>{if(!gesture)return;const g=gesture;if(g.marquee){updateBoxSelection(e);return}const dx=e.clientX-g.x,dy=e.clientY-g.y;if(g.pan){const long=boardViewport.classList.contains('longScreen');pan=[g.pan[0]+dx,long?0:g.pan[1]+dy];if(long)boardViewport.scrollTop=g.scrollTop-dy;fitBoard();return}if(Math.abs(dx)+Math.abs(dy)<3&&!g.moved)return;if(!g.moved){g.initial=JSON.stringify(project);g.targets=guideTargets(page(),new Set(selected));g.moved=true}
 const [l,t,r,b]=g.before;
 const assist=smartGuides&&!e.altKey;
 const {edges:[L,T,R,B],matches}=guidedBounds(g.before,Math.round(dx/scale),Math.round(dy/scale),g.handle,assist?g.targets:[],5/scale);
 const actual=[];
 for(const i of g.items){
   const [a,c,w,h]=i.box;
   const next=g.handle?[L+(a-l)*(R-L)/(r-l),T+(c-t)*(B-T)/(b-t),w*(R-L)/(r-l),h*(B-T)/(b-t)]:[a+L-l,c+T-t,w,h];
   setBox(i.n,next,device,project,page());const box=boxFor(i.n,device,project,page());actual.push(box);
   const el=canvasLayers.get(i.n.id)?.wrap;if(el)position(el,box);
 }
 const rect=enclosingBox(actual);
 if(assist)drawGuides(rect,matches,g.handle,g.targets);else clearGuides();
 drawGapLabels(rect,g.targets[0].box);
});
function finishGesture(cancel=false){if(gesture?.marquee){finishBoxSelection(cancel);return}if(gesture?.pan){if(cancel){pan=gesture.pan;boardViewport.scrollTop=gesture.scrollTop;fitBoard()}gesture=null;return}clearGuides();$('#sheet .gapOverlay')?.remove();if(gesture?.moved){const initial=gesture.initial;if(cancel){project=JSON.parse(initial)}else{remember(initial);write()}render()}gesture=null}
stage.addEventListener('pointerup',()=>finishGesture());stage.addEventListener('pointercancel',()=>finishGesture(true));stage.addEventListener('lostpointercapture',()=>finishGesture(true));
document.addEventListener('dragstart',e=>{const b=e.target.closest('[data-insert]');if(b)e.dataTransfer.setData('text/plain','formstudio:'+b.dataset.insert)});
stage.addEventListener('dragover',e=>e.preventDefault());stage.addEventListener('drop',e=>{e.preventDefault();const t=e.dataTransfer.getData('text/plain').replace('formstudio:','');if(types.includes(t)){const r=$('#sheet').getBoundingClientRect();variantDialog(t,[(e.clientX-r.left)/scale,(e.clientY-r.top)/scale])}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){finishGesture(true);dismiss();closeSide();return}if(e.target.closest('textarea,input,select,[contenteditable],.dialog')||$('#overlay').children.length)return;
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();findInProject()}
 else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='d'&&selected.length){e.preventDefault();layerAction('duplicate-layers')}
 else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();stepHistory(!e.shiftKey)}
 else if(e.key.toLowerCase()==='a'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&selected.length){e.preventDefault();arrangeDialog()}
 else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();if(!selectedLayers().some(n=>n.locked))removeSelection()}
 else if(e.key==='/'){e.preventDefault();tab='Insert';render();if(innerWidth<=620)$('#library').classList.add('shown');$('#search').focus()}
 else if(selected.length&&['ArrowRight','ArrowLeft','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();if(selectedLayers().some(n=>n.locked))return;const step=e.shiftKey?10:1;change(()=>{for(const n of page().nodes.filter(n=>selected.includes(n.id))){const b=boxFor(n,device,project,page());b[e.key==='ArrowRight'||e.key==='ArrowLeft'?0:1]+=(['ArrowLeft','ArrowUp'].includes(e.key)?-step:step);setBox(n,b,device,project,page())}})}
});
new ResizeObserver(fitBoard).observe(stage);
const styleNode=document.createElement('style');styleNode.textContent=nativeCSS;document.head.append(styleNode);
if(innerWidth<=620)device='phone';render();if(loadNote){$('#saveStatus').textContent=loadNote;toast(loadNote)}

if(studioSession&&storageOK)try{resumeCloudSaves()}catch{}

bindPanels();
