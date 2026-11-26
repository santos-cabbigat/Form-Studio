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
 assert.deepEqual(plain(run('enclosedLayerIds(boxes,[0,0],[65,40])')),['one','two']);
 assert.deepEqual(plain(run('enclosedLayerIds(boxes,[65,40],[0,0])')),['one','two']);
 assert.deepEqual(plain(run("enclosedLayerIds(boxes,[0,0],[35,35],['two'])")),['two','one']);
});
test('new dependency and release identity are included in both entry pages',()=>{
 for(const file of ['index.html','account.html']){const html=fs.readFileSync(path.join(root,file),'utf8');assert.match(html,/theme-studio\.js\?v=theme-roles1/);assert.match(html,/studio\.js\?v=theme-roles1/)}
 assert.match(fs.readFileSync(path.join(root,'sw.js'),'utf8'),/SHELL_VERSION = 'theme-roles1'/);
 assert.match(fs.readFileSync(path.join(root,'website-settings.js'),'utf8'),/STUDIO_RELEASE='theme-roles1'/);
});

test('offline installer caches the new theme editor and every referenced file',()=>{
 const worker=vm.createContext({URL,self:{registration:{scope:'https://example.test/Form-Studio/'},addEventListener(){}}});
 vm.runInContext(fs.readFileSync(path.join(root,'sw.js'),'utf8'),worker);
 worker.html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const assets=plain(vm.runInContext('shellAssets(html)',worker));
 assert.ok(assets.some(url=>url.endsWith('/theme-studio.js?v=theme-roles1')));
 for(const url of assets)assert.ok(fs.existsSync(path.join(root,new URL(url).pathname.replace('/Form-Studio/',''))),url);
});
