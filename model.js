const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=o=>JSON.parse(JSON.stringify(o));
const uid=()=> 'n'+Math.random().toString(36).slice(2,11);
const types=['Button','Text','Input','Picker','Icon','Image','Module','Window','Table','Shape'];
const devices={laptop:[960,600],tablet:[768,760],phone:[390,760]};
const sizes={laptop:[960,1280,1440],tablet:[768,820,1024],phone:[360,390,430]};
const cap=x=>x[0].toUpperCase()+x.slice(1);
const categoryIcon=t=>({Heading:'text',Custom:'code'}[t]||t.toLowerCase());
const families=['Arial, sans-serif','Georgia, serif','Verdana, sans-serif','monospace'];
const defaultColors=['#7545D6','#442881','#EAE1FF','#22202A','#FFFFFF'];
const variants={Picker:['Date','Month','Year','Dropdown','Account'],Button:['Solid','Outline','Pill'],Text:['Heading','Paragraph','Caption'],Input:['Text','Dropdown','Number','Email','Password'],Image:['Artwork','Upload image'],Module:['Card','Panel','Outline'],Window:['Dialog','Wide dialog','Blank window'],Table:['Ledger','Simple'],Shape:['Rectangle','Circle','Oval']};
function makePage(name,kind='screen',width){return {id:uid(),name,kind,width:width??460,height:kind==='window'?310:null,nodes:[],...(kind==='window'&&width===undefined?{deviceSized:true}:{})}}
function node(type,text,box,props={}) {
 const small={Button:[170,44],Text:[200,34],Input:[230,48],Image:[180,150],Module:[220,145],Table:[280,145],Shape:[110,90],Custom:[200,80]};
 const [w,h]=small[type]||[170,44];
 return {id:uid(),type,name:text||type,text:text||type,boxes:{laptop:box||[32,32,w,h]},style:{fill:type==='Button'?'var(--accent)':type==='Module'?'#F2EDF9':type==='Shape'?'#BE9DEB':'transparent',color:type==='Button'?'#FFFFFF':'#282430',radius:['Button','Input','Module','Shape'].includes(type)?8:0,fontSize:type==='Text'?18:15,weight:type==='Button'?600:400,border:type==='Input'?'1px solid #D9D6DF':'0px solid transparent',align:type==='Button'?'center':'left'},actions:[],...props}
}
function deviceViewport(project,device){
 return [project.widths[device],project.viewportHeights?.[device]??devices[device][1]];
}
function validViewportHeights(heights){
 return !!heights&&typeof heights==='object'&&!Array.isArray(heights)&&Object.keys(devices).every(d=>Number.isInteger(heights[d])&&heights[d]>=240&&heights[d]<=4000)&&Object.keys(heights).every(d=>Object.hasOwn(devices,d));
}
function editableCanvasWidth(page,deviceWidth){
 return page?.kind==='window'&&!page.deviceSized?Math.min(page.width,deviceWidth):deviceWidth;
}
function bounds(page,device,project){
 if(page.kind==='window')return [editableCanvasWidth(page,project.widths[device]),page.deviceSized?deviceViewport(project,device)[1]:page.height];
 return [project.widths[device],Math.max(deviceViewport(project,device)[1],...page.nodes.map(n=>{const b=boxFor(n,device,project,page);return n.hide?.[device]?0:b[1]+b[3]}))];
}
function boxFor(n,device,p,page){
 const box=n.boxes[device]||n.boxes.laptop;
 const base=n.boxes[device]?device:'laptop';
 const src=editableCanvasWidth(page,devices[base][0]);
 const dest=editableCanvasWidth(page,p.widths[device]);
 const scale=dest/src;
 return [Math.round(box[0]*scale),box[1],Math.max(8,Math.round(box[2]*scale)),box[3]]
}
function setBox(n,b,d,p,page){
 const base=editableCanvasWidth(page,devices[d][0]), actual=editableCanvasWidth(page,p.widths[d]);
 n.boxes[d]=[Math.round(b[0])*base/actual,Math.round(b[1]),Math.max(8,Math.round(b[2]))*base/actual,Math.max(8,Math.round(b[3]))];
}
function createItem(type,variant){
 let n=node(type,{Button:'Continue',Text:variant==='Heading'?'New heading':'Your text here',Input:variant,Image:'Image',Table:'Ledger table',Shape:variant,Module:variant,Custom:'Custom component'}[type]);
 n.variant=variant;
 if(type==='Button'&&variant==='Outline'){Object.assign(n.style,{fill:'transparent',color:'var(--accent)',border:'1px solid var(--accent)'})}
 if(type==='Button'&&variant==='Pill')n.style.radius=99;
 if(type==='Text')Object.assign(n.style,{fontSize:variant==='Heading'?30:variant==='Caption'?12:16,weight:variant==='Heading'?700:400});
 if(type==='Input'){n.inputType=variant==='Dropdown'?'select':variant.toLowerCase();if(variant==='Dropdown')n.choices='Option A\nOption B\nOption C';n.text=variant==='Email'?'you@example.com':variant==='Password'?'Enter password':variant==='Dropdown'?'Choose an option':variant==='Number'?'Enter a number':'Type here';n.style.fill='#FFFFFF'}
 if(type==='Shape'){
   n.style.radius=variant==='Rectangle'?0:999;
   if(variant==='Rectangle')n.colorRoles={border:'keep'};
   if(variant==='Circle')n.boxes.laptop[3]=n.boxes.laptop[2];
 }
 if(type==='Image')n.src=studioArt;
 if(type==='Table'){n.rows=variant==='Ledger'?'Account | Debit | Credit\nCash | 200 | —\nSales | — | 200':'Item | Value\nFirst item | 100\nSecond item | 200';n.style.fill='#FFFFFF'}
 return n
}
function intro(){
 const p={format:'form-studio',version:1,name:'Workspace UI',widths:{laptop:960,tablet:768,phone:390},viewportHeights:{laptop:600,tablet:760,phone:760},theme:{accent:defaultColors[0],font:families[0],background:'#FFFFFF'},palette:[...defaultColors],templates:[],pages:[]};
 const a=makePage('Sign in'), win=makePage('Welcome window','window',460);p.pages=[a,win];
 function add(type,text,box,phone,style={},extra={}){
 const n=node(type,text,box,extra);Object.assign(n.style,style);n.boxes.phone=phone;n.boxes.tablet=[Math.round(box[0]*.8),box[1]+65,Math.round(box[2]*.8),box[3]];a.nodes.push(n);return n
 }
 const art=add('Image','Violet form',[18,18,400,564],[16,16,358,195],{radius:12},{src:studioArt});
 const brand=add('Text','◈  Oon Jai',[42,45,285,28],[32,32,230,27],{fontSize:21,weight:700,color:'#352249'});
 add('Text','Accounting workspace',[42,525,340,34],[32,166,320,30],{fontSize:23,weight:600,color:'#352249'});
 add('Text','Welcome back',[476,100,420,51],[28,250,342,49],{fontSize:39,weight:600});
 add('Text','Sign in to your workspace.',[478,159,420,30],[28,308,342,30],{fontSize:18,color:'#77727F'});
 add('Text','Email address',[478,228,398,25],[28,365,334,24],{fontSize:16,weight:600});
 add('Input','you@example.com',[478,262,416,50],[28,399,334,49],{fill:'#FFFFFF',radius:7},{inputType:'email',name:'Email field'});
 add('Text','Password',[478,344,380,25],[28,475,334,24],{fontSize:16,weight:600});
 add('Input','Enter your password',[478,378,416,50],[28,509,334,49],{fill:'#FFFFFF',radius:7},{inputType:'password',name:'Password field'});
 const b=add('Button','Sign in',[478,465,416,52],[28,596,334,50],{radius:8,fontSize:17},{variant:'Solid',actions:[{event:'click',action:'open',target:win.id}]});
 win.nodes.push(node('Text','Welcome back',[26,37,350,48],{style:{...node('Text').style,fontSize:30,weight:700}}),node('Text','Your preview interaction is working.',[26,105,370,65]),node('Button','Close',[26,203,180,46],{actions:[{event:'click',action:'close',target:''}]}));
 return p
}
