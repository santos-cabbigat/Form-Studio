'use strict';

const themeColorRoles={canvas:'Page background',surface:'Panels & input backgrounds',action:'Button background',onAction:'Button text',accent:'Icons & accent details',heading:'Headings',ink:'Body text & field text',line:'Borders',tint:'Table headers & decorative shapes'};
const themeRoleHelp={canvas:'Background of every screen and window.',surface:'Cards, panels, input fields, and table bodies.',action:'Filled buttons; also outlines on secondary buttons.',onAction:'Text inside filled buttons.',accent:'Icons and layers you assign to Accent.',heading:'Large text headings and table header text.',ink:'Paragraphs, labels, input values, and table body text.',line:'Panel, input, and table borders.',tint:'Table header backgrounds and decorative shapes.'};
const palettePresets=[{name:'Studio violet',colors:defaultColors},{name:'Coastal green',colors:['#207C72','#123D41','#B9E4D7','#E9F4EF','#FFFFFF']},{name:'Warm clay',colors:['#BB664A','#63382F','#F1CEAA','#F7EDDF','#FFFFFF']}];
const isHexColor=v=>typeof v==='string'&&/^#[a-f0-9]{6}$/i.test(v);
const layerRoleProperties=['fill','color','border','headerFill','headerText'];
function validColorRoles(roles){return !!roles&&typeof roles==='object'&&!Array.isArray(roles)&&Object.entries(roles).every(([key,value])=>layerRoleProperties.includes(key)&&[...Object.keys(themeColorRoles),'keep'].includes(value))}
function validPaletteRoles(roles){return !!roles&&typeof roles==='object'&&!Array.isArray(roles)&&Object.entries(roles).every(([key,value])=>Object.hasOwn(themeColorRoles,key)&&isHexColor(value))}
function validTheme(t){
 return !!t&&typeof t.name==='string'&&!!t.name.trim()&&t.name.length<=100&&t.colors&&
 ['canvas','surface','action','accent','ink','line','tint'].every(k=>isHexColor(t.colors[k]))&&
 ['heading','onAction'].every(k=>t.colors[k]===undefined||isHexColor(t.colors[k]))&&
 ['flat','rail','raised','double'].includes(t.design)&&['serif','sans'].includes(t.font)&&
 (!t.fontFamily||families.includes(t.fontFamily))&&(!t.headingFont||families.includes(t.headingFont))&&
 Object.entries({height:[24,80],radius:[0,100],panel:[0,100],body:[8,48]}).every(([k,[min,max]])=>Number.isFinite(t[k])&&t[k]>=min&&t[k]<=max);
}
function completeTheme(t){
 const copy=clone(t);copy.colors.heading||=copy.colors.ink;copy.colors.onAction||=copy.night?'#101820':'#FFFFFF';
 copy.fontFamily||=copy.font==='serif'?'Georgia, serif':'Arial, sans-serif';copy.headingFont||=copy.fontFamily;return copy;
}
function currentTheme(){
 const preset=project.theme.definition||projectPresets.find(t=>t.name===project.theme.preset)||projectPresets[0];
 const t=completeTheme(preset);t.colors.action=project.theme.accent;t.colors.canvas=project.theme.background;t.fontFamily=project.theme.font;
 if(!project.theme.preset)t.name='Current project';return t;
}
function defaultLayerRoles(n){
 if(['Image','Custom'].includes(n.type))return {};
 if(n.type==='Text')return {color:n.style.fontSize>=20?'heading':'ink'};
 if(n.type==='Icon')return {color:'accent'};
 if(n.type==='Button')return {fill:n.variant==='Outline'?'keep':'action',color:n.variant==='Outline'?'action':'onAction',border:'action'};
 const roles={fill:n.type==='Shape'?'tint':'surface',color:'ink',border:'line'};
 if(n.type==='Table')Object.assign(roles,{headerFill:'tint',headerText:'heading'});return roles;
}
function layerColorRoles(n){return {...defaultLayerRoles(n),...n.colorRoles}}
function themeRoleColor(t,role){return t.colors[role]||(role==='heading'?t.colors.ink:role==='onAction'?(t.night?'#101820':'#FFFFFF'):null)}
function applyLayerTheme(n,t){
 if(['Image','Custom'].includes(n.type))return;
 const roles=layerColorRoles(n),s=n.style;
 const value=property=>roles[property]==='keep'?null:themeRoleColor(t,roles[property]);
 if(value('fill'))s.fill=roles.fill==='action'?'var(--accent)':value('fill');
 if(value('color'))s.color=value('color');
 if(value('border'))s.border=(t.design==='double'?'3px double ':'1px solid ')+value('border');
 n.extraCSS={...n.extraCSS,'font-family':n.type==='Text'&&roles.color==='heading'?t.headingFont||t.fontFamily:t.fontFamily};
 if(n.type==='Table')Object.assign(n.extraCSS,{'--table-tint':value('headerFill')||n.extraCSS['--table-tint']||t.colors.tint,'--table-heading':value('headerText')||n.extraCSS['--table-heading']||t.colors.ink,'--table-line':value('border')||n.extraCSS['--table-line']||t.colors.line});
 if(!['Text','Icon','Shape'].includes(n.type)){s.fontSize=t.body;s.radius=n.type==='Module'?t.panel:n.variant==='Pill'?99:t.radius}
 if(n.type==='Button')Object.assign(n.extraCSS,{'box-shadow':t.design==='raised'&&n.variant!=='Outline'?'0 3px 0 '+t.colors.line:'none','border-left':t.design==='rail'?'5px solid '+t.colors.accent:s.border});
 if(pickerKind(n))n.picker={...n.picker,accent:t.colors.action,background:s.fill,ink:s.color,fontSize:t.body};
}
function applyThemeToProject(p,theme,assignments=new Map()){
 const t=completeTheme(theme),c=t.colors;
 p.theme={...p.theme,preset:t.name,definition:clone(t),accent:c.action,background:c.canvas,surface:c.surface,ink:c.ink,tint:c.tint,line:c.line,tabRadius:t.tabs==='pills'?30:t.radius,font:t.fontFamily};
 p.palette=[...new Set(Object.values(c).map(v=>v.toUpperCase()))];p.paletteRoles=clone(c);
 for(const pg of p.pages){delete pg.backgrounds;for(const n of pg.nodes){if(assignments.has(n.id))n.colorRoles=clone(assignments.get(n.id));applyLayerTheme(n,t)}}
}
function colorEditor(role,label,value){
 return '<label class="themeColorField"><span>'+esc(label)+'</span><input type="color" aria-label="'+esc(label)+' color" data-color-picker="'+esc(role)+'" value="'+esc(value)+'"><input aria-label="'+esc(label)+' hex" data-color-hex="'+esc(role)+'" value="'+esc(value.toUpperCase())+'" maxlength="7" required spellcheck="false" pattern="#[A-Fa-f0-9]{6}"></label>';
}
function palettePanel(){
 const saved=(project.customPalettes||[]).map(p=>'<div class="savedDesign"><button data-use-palette="'+esc(p.id)+'"><span class="miniSwatches">'+p.colors.slice(0,8).map(c=>'<i style="background:'+esc(c)+'"></i>').join('')+'</span>'+esc(p.name)+'</button><button data-edit-palette="'+esc(p.id)+'" aria-label="Edit '+esc(p.name)+'">Edit</button></div>').join('');
 const roleRows=Object.entries(project.paletteRoles||{}).map(([role,c])=>'<button class="paletteRoleSwatch" data-role-color="'+esc(role)+'" title="Preview '+esc(themeColorRoles[role])+' on your form"><i style="background:'+esc(c)+'"></i><span>'+esc(themeColorRoles[role])+'<small>'+esc(c)+'</small></span></button>').join('');
 return '<div class="panel"><h2>Color palette</h2>'+field('Apply a color to','<select id="swatchTarget">'+options([['fill','Selected layers · background / fill'],['color','Selected layers · text / icon'],['border','Selected layers · border'],['canvas','Current screen · background']],'fill')+'</select>')+'<p>Named colors preview their role on your form. Free swatches use the target above.</p>'+roleRows+'<div class="swatches">'+project.palette.map(c=>'<button class="swatch" data-swatch="'+esc(c)+'" style="background:'+esc(c)+'" aria-label="Apply '+esc(c)+'"></button>').join('')+'</div>'+btn('create-palette','Create palette','plus','btn full')+btn('edit-palette','Edit & label current colors','','btn full mt')+btn('palette-theme','Preview these roles as a theme','preview','btn full mt')+field('Add a custom color','<input type="color" id="newColor" value="#a28bc2">')+colorPickButton('palette','palette color')+btn('add-color','Add color','plus','btn')+'<h3 class="mt">My palettes</h3>'+(saved||'<p class="hint">Save a named palette to reuse it here.</p>')+'<h3 class="mt">Palette presets</h3>'+palettePresets.map((p,i)=>'<button class="variant" data-palette="'+i+'">'+esc(p.name)+'</button>').join('')+'</div>';
}
function applyPaletteSwatch(color){
 const target=$('#swatchTarget')?.value||'fill';
 if(target==='canvas'){change(()=>{page().backgrounds={...page().backgrounds,[device]:color}},'Screen background changed');return}
 const nodes=page().nodes.filter(n=>selected.includes(n.id)&&!n.locked);
 if(!nodes.length){toast('Select an unlocked layer first, or choose Current screen background.');return}
 change(()=>nodes.forEach(n=>{if(target==='border')n.style.border='1px solid '+color;else n.style[target]=color}),'Color applied to '+(target==='fill'?'selected backgrounds':target==='color'?'selected text':'selected borders'));
}
function openProjectThemes(initial=null,highlightRole=null){
 let draft=completeTheme(initial&&typeof initial==='object'?initial:currentTheme()),savedId=draft.id||null,choice=initial?'custom':'current',highlight=highlightRole;
 if(initial===true){draft.name='My custom theme';delete draft.id;savedId=null;choice='custom'}
 const assignments=new Map();let mappingDirty=false;
 modal('Themes & live preview','<p class="hint">Choose a theme or edit a labeled color. The preview uses your current form. Nothing changes until Apply Theme.</p><div class="themeStudio"><div class="themeSettings"><div class="row"><button class="btn smallBtn" id="newTheme">Create theme</button><button class="btn smallBtn" id="copyTheme">Duplicate</button></div><label class="field compactThemePicker">Choose theme<select id="compactThemeChoice"></select></label><div id="themeChoices" class="themeChoices" aria-label="Choose a theme"></div><h3>Theme colors and their uses</h3>'+field('Theme name','<input id="themeName" maxlength="100" required>')+'<div id="themeColors"></div><details class="themeAssignments"><summary>Assign roles to existing layers</summary><p class="hint">Choose what each existing layer uses. Keep current color protects that part from the theme.</p>'+field('Layer on this screen','<select id="roleLayer">'+options(page().nodes.filter(n=>!['Image','Custom'].includes(n.type)).map(n=>[n.id,n.name]),sel()?.id)+'</select>')+'<div id="roleControls"></div><p class="hint">Images and embedded HTML keep their original colors.</p></details>'+field('Body font','<select id="themeFont">'+options(families,draft.fontFamily)+'</select>')+field('Heading font','<select id="themeHeadingFont">'+options(families,draft.headingFont)+'</select>')+'<div class="grid2">'+[['radius','Button corners',0,100],['panel','Panel corners',0,100],['body','Control text size',8,48]].map(([k,l,min,max])=>field(l+' (px)','<input type="number" required data-theme-size="'+k+'" min="'+min+'" max="'+max+'">')).join('')+'</div>'+field('Button style','<select id="themeDesign">'+options([['flat','Flat fill'],['raised','Raised edge'],['rail','Accent stripe'],['double','Double outline']],draft.design)+'</select>')+'<div class="row"><button class="btn" id="saveTheme">Save theme</button><button class="btn smallBtn" id="deleteTheme" hidden>Delete saved theme</button><button class="btn smallBtn" id="themePalette">Save colors as palette</button></div><p id="themeSaveStatus" class="hint" role="status"></p></div><div class="themePreviewPane"><div class="previewToolbar"><strong id="themePreviewTitle">Preview only</strong><label>Layout <select id="themeLayout" aria-label="Theme preview layout">'+options(Object.keys(devices).map(d=>[d,cap(d)]),device)+'</select></label><button class="chip" id="clearRolePreview">Show all colors</button></div><p class="hint" id="rolePreviewNote">Choose “Show uses” beside a color to highlight the affected layers.</p><div class="themePreviewScroll"><iframe id="themePreview" title="Theme preview on your form" sandbox="allow-scripts allow-modals"></iframe></div><p id="themeError" class="error" role="alert"></p></div></div><div class="dialogActions themeActions">'+btn('dismiss','Cancel')+'<button class="btn primary" id="applyTheme">Apply Theme</button></div>',true);
 $('.dialog').classList.add('themeBrowser');
 const allChoices=()=>[{key:'current',theme:currentTheme()},...projectPresets.map((t,i)=>({key:'preset-'+i,theme:t})),...(project.customThemes||[]).map(t=>({key:t.id,theme:t}))];
 function choices(){
  $('#themeChoices').innerHTML=allChoices().map(({key,theme:t})=>'<button class="themeChoice" data-theme-choice="'+esc(key)+'" aria-pressed="'+(choice===key)+'"><span class="miniSwatches">'+['action','accent','tint','canvas'].map(k=>'<i style="background:'+esc(t.colors[k])+'"></i>').join('')+'</span><span>'+esc(key==='current'?'Current project':t.name)+'</span></button>').join('');
  $('#compactThemeChoice').innerHTML=options([...(choice==='custom'?[[choice,'Custom preview']]:[]),...allChoices().map(({key,theme:t})=>[key,key==='current'?'Current project':t.name])],choice);
  $('#deleteTheme').hidden=!(project.customThemes||[]).some(t=>t.id===savedId);
 }
 const modelNode=n=>assignments.has(n.id)?{...n,colorRoles:assignments.get(n.id)}:n;
 const usedBy=role=>project.pages.flatMap(p=>p.nodes).filter(n=>Object.values(layerColorRoles(modelNode(n))).includes(role));
 function usage(){for(const b of $$('[data-show-role]'))b.textContent=b.dataset.showRole==='canvas'?'Show backgrounds':'Show uses · '+usedBy(b.dataset.showRole).length}
 function preview(){
  const invalid=$$('.themeSettings input').some(i=>!i.checkValidity())||!validTheme(draft);
  for(const id of ['applyTheme','saveTheme','themePalette'])$('#'+id).disabled=invalid;
  $('#themeError').textContent=invalid?'Enter a theme name, #RRGGBB colors, and sizes within the limits.':'';if(invalid)return;
  const sample=clone(project);if(choice!=='current'||mappingDirty)applyThemeToProject(sample,draft,assignments);
  const d=$('#themeLayout').value,frame=$('#themePreview');frame.style.width=sample.widths[d]+'px';
  let css='body{overflow-x:hidden}';
  if(highlight==='canvas')css+='.board{box-shadow:inset 0 0 0 4px #e14da1}';
  else if(highlight){const ids=usedBy(highlight).map(n=>n.id);if(ids.length)css+=ids.map(id=>'[data-id="'+id+'"]:not(.board)').join(',')+'{outline:3px solid #e14da1!important;outline-offset:-3px}'}
  frame.srcdoc=buildHTML(sample,pageId,d).replace('</style>',css+'</style>');
  $('#themePreviewTitle').textContent='Preview only · '+draft.name;
  $('#rolePreviewNote').textContent=highlight?themeColorRoles[highlight]+': '+themeRoleHelp[highlight]+' Pink outlines mark uses on this screen.':'Choose “Show uses” beside a color to highlight the affected layers.';
 }
 function layerControls(){
  const n=page().nodes.find(n=>n.id===$('#roleLayer').value);if(!n){$('#roleControls').innerHTML='';return}
  const defaults=defaultLayerRoles(n),overrides=assignments.get(n.id)||n.colorRoles||{};
  $('#roleControls').innerHTML=Object.keys(defaults).map(prop=>field(({fill:'Background / fill',color:'Text / icon',border:'Border',headerFill:'Table header background',headerText:'Table header text'})[prop],'<select data-layer-role="'+prop+'">'+options([['auto','Automatic · '+(themeColorRoles[defaults[prop]]||'keep current')],['keep','Keep current color'],...Object.entries(themeColorRoles).filter(([k])=>k!=='canvas').map(([k,l])=>[k,l])],overrides[prop]||'auto')+'</select>')).join('');
 }
 function fill(){
  $('#themeName').value=draft.name;$('#themeName').setCustomValidity('');
  $('#themeColors').innerHTML=Object.entries(themeColorRoles).map(([k,l])=>'<div class="themeRoleEditor">'+colorEditor(k,l,draft.colors[k])+'<small>'+esc(themeRoleHelp[k])+'</small><button class="chip" data-show-role="'+k+'"></button></div>').join('');
  $('#themeFont').value=draft.fontFamily;$('#themeHeadingFont').value=draft.headingFont;$('#themeDesign').value=draft.design;$$('[data-theme-size]').forEach(i=>i.value=draft[i.dataset.themeSize]);$('#themeSaveStatus').textContent='';choices();usage();layerControls();preview();
 }
 $('#compactThemeChoice').onchange=e=>{const item=allChoices().find(t=>t.key===e.target.value);if(!item)return;choice=item.key;draft=completeTheme(item.theme);savedId=draft.id||null;fill()};
 $('#themeChoices').onclick=e=>{const b=e.target.closest('[data-theme-choice]');if(!b)return;choice=b.dataset.themeChoice;draft=completeTheme(allChoices().find(t=>t.key===choice).theme);savedId=draft.id||null;fill()};
 function customize(){choice='custom';$('#themeSaveStatus').textContent='Preview only · unsaved changes';choices();usage();preview()}
 $('.themeSettings').addEventListener('input',e=>{
  const t=e.target;
  if(t.dataset.colorPicker){const k=t.dataset.colorPicker;draft.colors[k]=t.value;$('[data-color-hex="'+k+'"]').value=t.value.toUpperCase()}
  else if(t.dataset.colorHex){const k=t.dataset.colorHex;if(isHexColor(t.value)){draft.colors[k]=t.value;$('[data-color-picker="'+k+'"]').value=t.value}}
  else if(t.dataset.themeSize){if(t.checkValidity())draft[t.dataset.themeSize]=+t.value}
  else if(t.id==='themeName'){draft.name=t.value.trim();t.setCustomValidity(draft.name?'':'Enter a theme name.')}
  else if(t.id==='themeFont')draft.fontFamily=t.value;
  else if(t.id==='themeHeadingFont'){draft.headingFont=t.value;draft.font=t.value==='Georgia, serif'?'serif':'sans'}
  else if(t.id==='themeDesign')draft.design=t.value;
  else return;customize();
 });
 $('#themeColors').onclick=e=>{const b=e.target.closest('[data-show-role]');if(b){highlight=b.dataset.showRole;preview()}};
 $('#roleLayer').onchange=layerControls;
 $('#roleControls').onchange=e=>{const prop=e.target.dataset.layerRole;if(!prop)return;const n=page().nodes.find(n=>n.id===$('#roleLayer').value),roles={...(assignments.get(n.id)||n.colorRoles)};if(e.target.value==='auto')delete roles[prop];else roles[prop]=e.target.value;assignments.set(n.id,roles);mappingDirty=true;customize()};
 $('#clearRolePreview').onclick=()=>{highlight=null;preview()};$('#themeLayout').onchange=preview;
 $('#newTheme').onclick=()=>{draft=currentTheme();draft.name='My custom theme';delete draft.id;savedId=null;choice='custom';fill();$('#themeName').focus();$('#themeName').select()};
 $('#copyTheme').onclick=()=>{draft.name=(draft.name+' copy').slice(0,100);delete draft.id;savedId=null;choice='custom';fill();$('#themeName').focus()};
 $('#saveTheme').onclick=()=>{if(!validTheme(draft))return;savedId||=uid();draft.id=savedId;choice=savedId;change(()=>{project.customThemes||=[];const i=project.customThemes.findIndex(t=>t.id===savedId);if(i<0)project.customThemes.push(clone(draft));else project.customThemes[i]=clone(draft)});choices();$('#themeSaveStatus').textContent=storageOK?'Theme saved. Apply Theme when ready. Layer assignments apply with the theme.':'Unsaved · download a project copy.'};
 $('#deleteTheme').onclick=()=>{change(()=>project.customThemes=project.customThemes.filter(t=>t.id!==savedId));savedId=null;delete draft.id;choice='custom';choices();$('#themeSaveStatus').textContent='Saved theme removed.'};
 $('#themePalette').onclick=()=>{const name=(draft.name+' colors').slice(0,100),roles=clone(draft.colors),colors=[...new Set(Object.values(roles).map(c=>c.toUpperCase()))];change(()=>{project.customPalettes||=[];const p=project.customPalettes.find(p=>p.name===name);if(p)Object.assign(p,{colors,roles});else project.customPalettes.push({id:uid(),name,colors,roles})});$('#themeSaveStatus').textContent=storageOK?'Named colors saved in My palettes.':'Unsaved · download a project copy.'};
 $('#applyTheme').onclick=()=>{if(!validTheme(draft))return;if(choice==='current'&&!mappingDirty){dismiss();return}change(()=>applyThemeToProject(project,draft,assignments),'Applied '+draft.name);dismiss()};
 fill();
}
function previewPaletteTheme(role=null){const t=currentTheme();Object.assign(t.colors,project.paletteRoles||{});t.name='My palette theme';delete t.id;openProjectThemes(t,role)}
function openPaletteEditor(existing){
 const source=existing||{name:'My palette',colors:[...project.palette],roles:project.paletteRoles||{}};
 const draft={id:source.id,name:source.name,entries:[...Object.entries(source.roles||{}).map(([role,color])=>({role,color})),...source.colors.filter(c=>!Object.values(source.roles||{}).some(v=>v.toUpperCase()===c.toUpperCase())).map(color=>({role:'',color}))]};
 if(!draft.entries.length)draft.entries.push({role:'',color:project.theme.accent});
 modal(existing?.id?'Edit color palette':'Create color palette',field('Palette name','<input id="paletteName" maxlength="100" value="'+esc(draft.name)+'">')+'<p class="hint">Give each color a purpose, or keep it as a free swatch. Preview the palette as a theme to see the roles on your form.</p><div id="paletteColors"></div><button class="btn smallBtn" id="paletteAdd">Add color</button><p id="paletteError" class="error" role="alert"></p><div class="dialogActions">'+btn('dismiss','Cancel')+(draft.id?'<button class="btn" id="deletePalette">Delete palette</button>':'')+'<button class="btn" id="savePalette">Save palette</button><button class="btn primary" id="usePalette">Save & use palette</button></div>');
 function valid(){const roles=draft.entries.map(e=>e.role).filter(Boolean),ok=$$('#paletteColors input').every(i=>i.checkValidity())&&!!$('#paletteName').value.trim()&&new Set(roles).size===roles.length;$('#savePalette').disabled=!ok;$('#usePalette').disabled=!ok;$('#paletteError').textContent=ok?'':'Enter a name and valid #RRGGBB colors. Assign each purpose to one color.';return ok}
 function rows(){
  $('#paletteColors').innerHTML=draft.entries.map((e,i)=>'<div class="paletteRoleEdit">'+colorEditor(String(i),'Color '+(i+1),e.color)+field('Used for','<select data-palette-role="'+i+'">'+options([['','Free swatch · choose target when using'],...Object.entries(themeColorRoles)],e.role)+'</select>')+'<button class="chip" data-remove-color="'+i+'" '+(draft.entries.length===1?'disabled':'')+'>Remove color '+(i+1)+'</button></div>').join('');$('#paletteAdd').disabled=draft.entries.length>=32;valid();
 }
 $('#paletteName').oninput=valid;
 $('#paletteColors').oninput=e=>{const t=e.target,k=t.dataset.colorPicker??t.dataset.colorHex;if(k!==undefined&&isHexColor(t.value)){draft.entries[+k].color=t.value.toUpperCase();$('#paletteColors [data-'+(t.dataset.colorPicker!==undefined?'color-hex':'color-picker')+'="'+k+'"]').value=t.value}valid()};
 $('#paletteColors').onchange=e=>{if(e.target.dataset.paletteRole!==undefined){draft.entries[+e.target.dataset.paletteRole].role=e.target.value;valid()}};
 $('#paletteColors').onclick=e=>{const b=e.target.closest('[data-remove-color]');if(b&&draft.entries.length>1){draft.entries.splice(+b.dataset.removeColor,1);rows()}};
 $('#paletteAdd').onclick=()=>{if(draft.entries.length<32){draft.entries.push({role:'',color:'#FFFFFF'});rows()}};
 function save(use){if(!valid())return;const palette={id:draft.id||uid(),name:$('#paletteName').value.trim(),colors:[...new Set(draft.entries.map(e=>e.color))],roles:Object.fromEntries(draft.entries.filter(e=>e.role).map(e=>[e.role,e.color]))};change(()=>{project.customPalettes||=[];const i=project.customPalettes.findIndex(p=>p.id===palette.id);if(i<0)project.customPalettes.push(palette);else project.customPalettes[i]=palette;if(use){project.palette=[...palette.colors];project.paletteRoles=clone(palette.roles)}},use?'Palette saved and selected':'Palette saved');dismiss()}
 $('#savePalette').onclick=()=>save(false);$('#usePalette').onclick=()=>save(true);if(draft.id)$('#deletePalette').onclick=()=>{change(()=>project.customPalettes=project.customPalettes.filter(p=>p.id!==draft.id),'Palette deleted');dismiss()};rows();
}
