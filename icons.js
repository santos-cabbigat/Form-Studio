const paths={
 eye:'<path d="M2 12s3.7-7 10-7 10 7 10 7-3.7 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
 eyeOff:'<path d="m3 3 18 18M9.5 5.3A12 12 0 0 1 12 5c6.3 0 10 7 10 7a18 18 0 0 1-3.3 4.2M6.3 6.8A19 19 0 0 0 2 12s3.7 7 10 7c1.6 0 3.1-.4 4.4-1M10 10a3 3 0 0 0 4 4"/>',
 home:'<path d="m3 10 9-7 9 7v10H15v-7H9v7H3Z"/>',
 person:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2c0-7 16-7 16 0v2"/>',
 mail:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
 lock:'<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
 menu:'<path d="M3 5h18M3 12h18M3 19h18"/>',
 edit:'<path d="m14 5 5 5M4 20l5-1L21 7l-5-5L4 14Z"/>',
 trash:'<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
 save:'<path d="M3 3h14l4 4v14H3Zm4 0v7h9V3M7 21v-7h10v7"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
 back:'<path d="m10 5-7 7 7 7M3 12h18"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-9v1"/>',
 bell:'<path d="M4 17h16l-2-3V9a6 6 0 0 0-12 0v5Zm5 3a3 3 0 0 0 6 0"/>',
 icon:'<path d="m12 3 2.8 5.6 6.2.9-4.5 4.4 1 6.1-5.5-2.9L6.5 20l1-6.1L3 9.5l6.2-.9Z"/>',
 picker:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v5m10-5v5M3 11h18m-13 4h3"/>',
 insert:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8m-4-4h8"/>',
 triggers:'<path d="m13 2-9 12h7l-1 8 10-13h-7z"/>',
 layers:'<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
 palette:'<path d="M21 12a9 9 0 1 0-9 9h1a2 2 0 0 0 1.3-3.5c-.7-.6-.9-2.5.7-2.5h2a4 4 0 0 0 4-3Z"/><circle cx="7.5" cy="10" r=".7"/><circle cx="11" cy="6.8" r=".7"/><circle cx="15" cy="7.5" r=".7"/>',
 theme:'<path d="M3 19 9 4l6 15M5 14h8m2-4h7m-3.5 0v9"/>',
 button:'<rect x="2" y="6" width="20" height="12" rx="4"/><path d="M8 12h8"/>',text:'<path d="M3 7V4h18v3M12 4v16m-4 0h8"/>',
 input:'<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M7 9v6m-1-6h2m-2 6h2m4-3h5"/>',
 image:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.4"/><path d="m3 17 5-5 4 4 4-6 5 8"/>',
 module:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18m-12 0v12"/>',
 window:'<rect x="2" y="4" width="20" height="16" rx="3"/><path d="M2 9h20m-16-2h.2m2.8 0h.2"/>',
 table:'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 10h20M2 15h20M9 4v16"/>',
 shape:'<path d="m8 3 6 3.5v7L8 17l-6-3.5v-7Z"/><circle cx="16" cy="16" r="5.5"/>',
 laptop:'<rect x="4" y="4" width="16" height="12" rx="2"/><path d="m4 17-2 3h20l-2-3"/>',tablet:'<rect x="4" y="2.5" width="16" height="19" rx="2.6"/><path d="M10 18h4"/>',phone:'<rect x="6.5" y="2" width="11" height="20" rx="2.4"/><path d="M10 18.5h4"/>',
 undo:'<path d="m8 4-5 5 5 5M4 9h9a6 6 0 0 1 0 12"/>',redo:'<path d="m16 4 5 5-5 5m4-5h-9a6 6 0 0 0 0 12"/>',
 preview:'<path d="m7 4 13 8-13 8Z"/>',export:'<path d="M12 15V3m-5 5 5-5 5 5M4 14v6h16v-6"/>',
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',down:'<path d="m6 9 6 6 6-6"/>',
 right:'<path d="m9 5 7 7-7 7"/>',plus:'<path d="M12 4v16M4 12h16"/>',check:'<path d="m4 12 5 5L20 6"/>',
 code:'<path d="m7 7-5 5 5 5m10-10 5 5-5 5M14 4l-4 16"/>',select:'<path d="m5 2 14 12-7 1-3 7Z"/>',
 pan:'<path d="M8 12V6a1.5 1.5 0 0 1 3 0v5-7a1.5 1.5 0 0 1 3 0v7-5a1.5 1.5 0 0 1 3 0v6-3a1.5 1.5 0 0 1 3 0v7a6 6 0 0 1-11 4l-5-7c-1-2 1-3 2-2l2 2Z"/>',
 page:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 8h16"/>',stack:'<rect x="4" y="7" width="13" height="13" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v11"/>',
 sliders:'<path d="M3 6h18M3 12h18M3 18h18"/><rect x="6" y="4" width="3" height="4" rx="1"/><rect x="14" y="10" width="3" height="4" rx="1"/><rect x="8" y="16" width="3" height="4" rx="1"/>',
 group:'<rect x="2" y="2" width="20" height="20" rx="2" stroke-dasharray="3 3"/><path d="M6 6h8v8H6zm4 8v4h8v-8h-4"/>',
 close:'<path d="m5 5 14 14m0-14L5 19"/>',library:'<path d="M3 4h5v16H3zm7 1h4v15h-4zm6 1 4-1 3 14-4 1Z"/>',
 ruler:'<path d="M3 6h18v12H3zm4 0v5m4-5v3m4-3v5"/>',custom:'<path d="m8 7-6 5 6 5m8-10 6 5-6 5"/>'
};
function icon(name,size=17){return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.module)+'</svg>'}

const uiIcons={eye:'Eye',eyeOff:'Eye off',search:'Search',home:'Home',person:'User',lock:'Lock',mail:'Email',picker:'Calendar',sliders:'Settings',menu:'Menu',plus:'Add',close:'Close',check:'Check',edit:'Edit',trash:'Delete',save:'Save',download:'Download',export:'Upload',back:'Back',right:'Chevron right',down:'Chevron down',info:'Information',bell:'Notification',icon:'Star'};

function insertIconDialog(at){
 const passwords=inputsOnPage(true).filter(n=>n.inputType==='password');
 const initialTarget=passwords.find(n=>n.id===sel()?.id)?.id||(passwords.length===1?passwords[0].id:'');
 const initialSearch=Object.values(uiIcons).some(label=>label.toLowerCase().includes(search.toLowerCase()))?search:'';
 modal('Insert icon',field('Find an icon','<input id="findIcon" type="search" placeholder="Eye, search, calendar…" value="'+esc(initialSearch)+'">')+
   '<div id="iconGrid" class="iconGrid" aria-label="UI icons"></div><div id="iconLink">'+field('Password field','<select id="iconPassword">'+options([['','Icon only'],...passwords.map(n=>[n.id,n.name])],initialTarget)+'</select>')+
   '<p class="hint">'+(passwords.length?'Choose a field to show and hide its password.':'Insert a password input to link the eye to a field.')+'</p></div>'+
   '<div class="dialogActions">'+btn('dismiss','Cancel')+'<button type="button" class="btn primary" id="addIcon">Insert icon</button></div>');
 const grid=$('#iconGrid'),input=$('#findIcon'),add=$('#addIcon');
 let glyph='eye';
 function draw(){
   const query=input.value.trim().toLowerCase();
   const matches=Object.entries(uiIcons).filter(([key,label])=>(key+' '+label).toLowerCase().includes(query));
   if(!matches.some(([key])=>key===glyph))glyph=matches[0]?.[0]||'';
   grid.innerHTML=matches.map(([key,label])=>'<button type="button" data-glyph="'+key+'" aria-pressed="'+(key===glyph)+'">'+icon(key,22)+'<span>'+esc(label)+'</span></button>').join('')||'<span class="hint">No matching icons.</span>';
   $('#iconLink').hidden=glyph!=='eye';add.disabled=!glyph;
 }
 grid.onclick=e=>{const button=e.target.closest('[data-glyph]');if(button){glyph=button.dataset.glyph;draw();grid.querySelector('[aria-pressed=true]').focus()}};
 input.oninput=draw;draw();
 add.onclick=()=>{
   const n=node('Icon',uiIcons[glyph],[0,0,32,32],{glyph});
   const password=glyph==='eye'&&passwords.find(p=>p.id===$('#iconPassword').value);
   if(password)n.actions.push({event:'click',action:'togglePassword',target:password.id});
   for(const layout of Object.keys(devices)){
     let position;
     if(password){
       const [x,y,w,h]=boxFor(password,layout,project,page()),size=Math.max(8,Math.min(32,h-6,w-6));
       position=[x+w-size-4,y+(h-size)/2,size,size];
     }else{
       const [w,h]=bounds(page(),layout,project);
       position=[(w-32)/2,(h-32)/2,32,32];
     }
     setBox(n,position,layout,project,page());
   }
   if(!at)at=boxFor(n,device,project,page()).slice(0,2);
   insertNode(n,at);
 };
}
