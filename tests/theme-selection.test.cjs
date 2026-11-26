const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const context=vm.createContext({pickerKind:n=>n.type==='Input'&&n.picker,window:{addEventListener(){}},document:{addEventListener(){}},Map,Set});
for(const f of ['art.js','model.js','themes.js','theme-studio.js','selection.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),context);
const run=source=>vm.runInContext(source,context);
const plain=value=>JSON.parse(JSON.stringify(value));
test('all light and dark themes remain valid',()=>assert.equal(run('projectPresets.every(validTheme)'),true));
test('color roles style the right properties without changing layout or triggers',()=>{
 const result=plain(run(`(()=>{const p=intro(),before=JSON.stringify(p.pages.map(pg=>pg.nodes.map(n=>[n.id,n.boxes,n.actions]))),t=completeTheme(projectPresets[0]);t.colors.heading='#123456';t.colors.onAction='#EEEEEE';const heading=p.pages[0].nodes.find(n=>n.text==='Welcome back'),button=p.pages[0].nodes.find(n=>n.type==='Button');applyThemeToProject(p,t);return {before,after:JSON.stringify(p.pages.map(pg=>pg.nodes.map(n=>[n.id,n.boxes,n.actions]))),heading:heading.style.color,button:button.style.color,bg:p.theme.background}})()`));
 assert.equal(result.before,result.after);assert.equal(result.heading,'#123456');assert.equal(result.button,'#EEEEEE');assert.equal(result.bg,'#f7f4e9');
});
test('layer assignments support a different role or keeping an existing color',()=>{
 const result=plain(run(`(()=>{const p=intro(),n=p.pages[0].nodes.find(n=>n.type==='Input'),old=n.style.fill,t=completeTheme(projectPresets[1]);applyThemeToProject(p,t,new Map([[n.id,{fill:'keep',color:'heading'}]]));return {fill:n.style.fill,old,color:n.style.color,heading:t.colors.heading,roles:n.colorRoles}})()`));
 assert.equal(result.fill,result.old);assert.equal(result.color,result.heading);assert.deepEqual(result.roles,{fill:'keep',color:'heading'});
});
test('preview clones and saved theme definitions do not share mutable state',()=>{
 assert.equal(run(`(()=>{const p=intro(),original=JSON.stringify(p),t=completeTheme(projectPresets[2]),draft=clone(p);applyThemeToProject(draft,t);t.colors.action='#000000';return JSON.stringify(p)===original&&draft.theme.definition.colors.action!=='#000000'})()`),true);
});
test('invalid role definitions and invalid saved designs are rejected',()=>{
 assert.equal(run("validColorRoles({fill:'canvas',color:'keep'})"),true);
 assert.equal(run("validColorRoles({bad:'ink'})||validColorRoles({fill:'url(x)'})||validPaletteRoles({canvas:'red'})||validTheme({...projectPresets[0],fontFamily:'bad'})"),false);
});
test('box selection handles both drag directions, partial overlap, and additive selection',()=>{
 const boxes=[{id:'one',box:[10,10,20,20]},{id:'two',box:[40,10,20,20]},{id:'partial',box:[55,25,30,30]}];context.boxes=boxes;
 assert.deepEqual(plain(run('touchedLayerIds(boxes,[0,0],[65,40])')),['one','two','partial']);
 assert.deepEqual(plain(run('touchedLayerIds(boxes,[65,40],[0,0])')),['one','two','partial']);
 assert.deepEqual(plain(run("touchedLayerIds(boxes,[0,0],[35,35],['two'])")),['two','one']);
});
test('new dependency and release identity are included in both entry pages',()=>{
 for(const file of ['index.html','account.html']){const html=fs.readFileSync(path.join(root,file),'utf8');assert.match(html,/theme-studio\.js\?v=drag-guides3/);assert.match(html,/"studio\.js\?v=canvas-edges4/)}
 assert.match(fs.readFileSync(path.join(root,'sw.js'),'utf8'),/SHELL_VERSION = 'canvas-edges4'/);
 assert.match(fs.readFileSync(path.join(root,'website-settings.js'),'utf8'),/STUDIO_RELEASE='canvas-edges4'/);
});

test('offline installer caches the new theme editor and every referenced file',()=>{
 const worker=vm.createContext({URL,self:{registration:{scope:'https://example.test/Form-Studio/'},addEventListener(){}}});
 vm.runInContext(fs.readFileSync(path.join(root,'sw.js'),'utf8'),worker);
 worker.html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const assets=plain(vm.runInContext('shellAssets(html)',worker));
 assert.ok(assets.some(url=>url.endsWith('/theme-studio.js?v=drag-guides3')));
 for(const url of assets)assert.ok(fs.existsSync(path.join(root,new URL(url).pathname.replace('/Form-Studio/',''))),url);
});

test('the four supplied palettes retain every exact color and order',()=>{
 const expected=[['#0A0F14','#0F3D3E','#2E6F73','#7FB3B8','#EADCC8','#C6601F'],['#0B132B','#1C2541','#3A506B','#5BC0DE','#F4D6B0','#D97706'],['#08141A','#092830','#0E6B74','#68A2BD','#1B3D4F'],['#F2E9D8','#59718A','#2F6F6D','#E07A47','#D4A72C','#8FA68F']];
 const themes=plain(run('customPaletteThemes'));
 assert.equal(themes.length,4);
 themes.forEach((theme,i)=>assert.deepEqual(theme.palette.slice(0,expected[i].length),expected[i]));
 for(const name of themes.map(t=>t.name))assert.equal(run(`projectPresets.some(t=>t.name===${JSON.stringify(name)})&&palettePresets.some(t=>t.name===${JSON.stringify(name)}&&validPaletteRoles(t.roles))`),true);
 assert.equal(themes[2].colors.action,'#F4B544');
});
test('supplied themes preserve optional swatches after applying and have readable primary buttons',()=>{
 const result=plain(run('customPaletteThemes.map(t=>{const p=intro();applyThemeToProject(p,t);return {palette:t.palette,saved:p.palette,action:t.colors.action,onAction:t.colors.onAction,ink:t.colors.ink,surface:t.colors.surface}})'));
 function luminance(hex){const values=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return values.reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0)}
 function ratio(a,b){const values=[luminance(a),luminance(b)].sort((a,b)=>b-a);return (values[0]+.05)/(values[1]+.05)}
 for(const t of result){assert.deepEqual(t.saved.slice(0,t.palette.length),t.palette);assert.ok(ratio(t.action,t.onAction)>=4.5);assert.ok(ratio(t.ink,t.surface)>=4.5)}
});

test('multi-select includes partial overlaps, edge touches and a containing layer',()=>{
 context.touchBoxes=[{id:'panel',box:[0,0,300,300]},{id:'partial',box:[80,80,120,60]},{id:'edge',box:[220,140,40,40]},{id:'outside',box:[400,400,40,40]}];
 assert.deepEqual(plain(run('touchedLayerIds(touchBoxes,[195,135],[220,150])')),['panel','partial','edge']);
 assert.deepEqual(plain(run('touchedLayerIds(touchBoxes,[220,150],[195,135])')),['panel','partial','edge']);
 assert.deepEqual(plain(run('touchedLayerIds(touchBoxes,[100,100],[110,110])')),['panel','partial']);
});
