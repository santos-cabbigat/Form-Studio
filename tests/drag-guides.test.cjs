const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const context=vm.createContext({});
for(const name of ['art.js','model.js','arrange.js','guides.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),context);
const plain=value=>JSON.parse(JSON.stringify(value));
const run=source=>plain(vm.runInContext(source,context));
const frame={box:[0,0,960,600],canvas:true,name:'Screen 1'};
context.targets=[frame];

test('dragging near both page centers snaps to the center and reports both axes',()=>{
 const result=run('guidedBounds([80,80,200,140],338,188,null,targets,5)');
 assert.deepEqual(result.edges,[420,270,540,330]);
 context.rect=[420,270,120,60];
 assert.deepEqual(run('pageCenterAlignment(rect,targets[0].box)'),{horizontal:true,vertical:true,x:480,y:300});
 assert.match(run('describeAlignment(guidedBounds([80,80,200,140],338,188,null,targets,5).matches[0])'),/Centered horizontally on page/);
 assert.match(run('describeAlignment(guidedBounds([80,80,200,140],338,188,null,targets,5).matches[1])'),/Centered vertically on page/);
});
test('horizontal and vertical page center indications are independent',()=>{
 assert.deepEqual(run('pageCenterAlignment([420,80,120,60],targets[0].box)'),{horizontal:true,vertical:false,x:480,y:300});
 assert.deepEqual(run('pageCenterAlignment([80,270,120,60],targets[0].box)'),{horizontal:false,vertical:true,x:480,y:300});
 assert.deepEqual(run('pageCenterAlignment([421,80,120,60],targets[0].box)'),{horizontal:false,vertical:false,x:480,y:300});
});
test('nearby alignment remains available alongside a page-center guide',()=>{
 context.neighborTargets=[frame,{box:[640,180,180,60],name:'Reference A'},{box:[640,360,180,100],name:'Reference B'}];
 const result=run('guidedBounds([80,80,200,140],558,188,null,neighborTargets,5)');
 assert.deepEqual(result.edges,[640,270,760,330]);
 assert.match(run('describeAlignment(guidedBounds([80,80,200,140],558,188,null,neighborTargets,5).matches[0])'),/Left edges aligned · Reference/);
 const center=run('pageCenterAlignment([640,270,120,60],targets[0].box)');
 assert.equal(center.horizontal,false);assert.equal(center.vertical,true);
});
test('Alt-style bypass preserves the manual position',()=>{
 assert.deepEqual(run('guidedBounds([80,80,200,140],338,188,null,[],5).edges'),[418,268,538,328]);
});
test('page centers support offset frames and odd-sized selections',()=>{
 assert.deepEqual(run('pageCenterAlignment([431,292,99,55],[1,19,960,600])'),{horizontal:true,vertical:true,x:481,y:319});
});
test('existing left right top bottom measurements remain correct',()=>{
 assert.deepEqual(run('windowGaps([20,40,120,60],[0,0,960,600])'),{top:40,bottom:500,left:20,right:820});
});
test('legacy projects get stable device defaults and explicit settings apply to every screen',()=>{
 const result=run(`(()=>{const p=intro();delete p.viewportHeights;const short=makePage('Short'),long=makePage('Long');long.nodes=[node('Text','Long text',[20,1400,200,40])];return {short:deviceViewport(p,'laptop'),long:deviceViewport(p,'laptop'),contentHeight:bounds(long,'laptop',p)[1],tablet:deviceViewport(p,'tablet'),phone:deviceViewport(p,'phone'),valid:validViewportHeights({laptop:800,tablet:1000,phone:900})}})()`);
 assert.deepEqual(result.short,[960,600]);assert.deepEqual(result.short,result.long);assert.equal(result.contentHeight,1440);assert.deepEqual(result.tablet,[768,760]);assert.deepEqual(result.phone,[390,760]);assert.equal(result.valid,true);
 assert.equal(run('validViewportHeights({laptop:0,tablet:760,phone:760})'),false);
 assert.deepEqual(run("deviceViewport({widths:{laptop:1280},viewportHeights:{laptop:800}},'laptop')"),[1280,800]);
});

test('canvas edges win over nearby layers at every corner, including a slight overshoot',()=>{
 context.edgeTargets=[frame,{box:[7,7,947,587],name:'Inset panel'}];
 for(const [dx,dy,expected] of [[-73,-73,[0,0,120,60]],[753,-88,[840,0,960,60]],[-88,466,[0,540,120,600]],[765,466,[840,540,960,600]]]){
   const result=run('guidedBounds([80,80,200,140],'+dx+','+dy+',null,edgeTargets,5)');
   assert.deepEqual(result.edges,expected);
   assert.ok(result.matches.every(m=>m.canvasEdge));
 }
 assert.deepEqual(run("guidedBounds([0,0,800,500],152,96,'br',edgeTargets,5).edges"),[0,0,960,600]);
});
test('device-sized and custom windows share exact editable bounds with layer coordinates',()=>{
 const result=run(`(()=>{const p=intro(),win=makePage('Window','window'),custom=makePage('Dialog','window',460),shape=createItem('Shape','Rectangle');
 const sizes=Object.keys(devices).map(d=>{const [w,h]=bounds(win,d,p);setBox(shape,[0,0,w,h],d,p,win);return boxFor(shape,d,p,win)});
 p.widths.laptop=1280;p.viewportHeights.laptop=800;
 return {sizes,updated:bounds(win,'laptop',p),custom:bounds(custom,'laptop',p),phone:bounds(custom,'phone',p),radius:shape.style.radius}})()`);
 assert.deepEqual(result,{sizes:[[0,0,960,600],[0,0,768,760],[0,0,390,760]],updated:[1280,800],custom:[460,310],phone:[390,310],radius:0});
});

test('neighboring edges and corners meet across gaps and slight overlaps',()=>{
 context.adjacent=[frame,{box:[240,120,100,80],name:'Neighbor'}];
 for(const [left,top,x,y] of [[346,127,340,120],[334,115,340,120],[174,196,180,200],[346,207,340,200],[343,135,340,135]]){
   const edges=run('guidedBounds([0,0,60,50],'+left+','+top+',null,adjacent,5).edges');
   assert.deepEqual(edges,[x,y,x+60,y+50]);
 }
});
test('shared horizontal coordinates stay joined when a device scales two adjacent rectangles',()=>{
 const result=run(`(()=>{const p=intro(),pg=makePage('Test'),a=node('Shape','Left',[1,10,52,80]),b=node('Shape','Right',[53,10,83,80]);
 return Object.keys(devices).map(d=>{const [x,,w]=boxFor(a,d,p,pg);return boxFor(b,d,p,pg)[0]-(x+w)})})()`);
 assert.deepEqual(result,[0,0,0]);
});
