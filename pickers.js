'use strict';

function pickerKind(n) {
  if(n.type!=='Input')return '';
  return ['date','month','account','dropdown','year'].includes(n.inputType)?n.inputType:'';
}
function createPicker(kind) {
  const n=createItem('Input','Text');
  const titles={date:'Date',month:'Month',year:'Year',dropdown:'Dropdown',account:'Account'};
  const title=titles[kind];
  Object.assign(n,{inputType:kind,variant:title+' picker',name:title+' picker',text:'Choose '+(kind==='account'?'an account':kind==='dropdown'?'an option':'a '+kind)});
  if(kind==='account')n.choices='Cash | 1000\nBank | 1010\nSales | 4000';
  if(kind==='dropdown')n.choices='Option A | A\nOption B | B';
  return n;
}
function pickerFormatOptions(kind){
  if(kind==='date')return ['DD MMM YYYY','DD/MM/YYYY','MM/DD/YYYY','YYYY-MM-DD'];
  if(kind==='month')return ['MMMM YYYY','MMM YYYY','MM/YYYY','YYYY-MM','MMMM'];
  return ['YYYY'];
}
function pickerLabel(n,value){
  if(!value)return n.text||'Choose';
  const kind=pickerKind(n);
  if(['account','dropdown'].includes(kind))return dropdownChoices(n).find(o=>o.value===value)?.label||value;
  const [y,m='01',d='01']=value.split('-');
  const dt=new Date(Number(y),Number(m)-1,Number(d),12);
  if(!Number.isFinite(dt.getTime()))return value;
  const format=n.picker?.format||pickerFormatOptions(kind)[0];
  return format.replace(/YYYY|MMMM|MMM|MM|DD/g,part=>({YYYY:y,MMMM:dt.toLocaleString('en',{month:'long'}),MMM:dt.toLocaleString('en',{month:'short'}),MM:m,DD:d})[part]);
}
function pickerOptionsEditor(n){
  const rows=dropdownChoices(n);
  return '<fieldset class="choiceEditor"><legend>Dropdown choices</legend>'+rows.map((o,i)=>'<div class="choiceRow"><label>Display label<input data-choice-label="'+i+'" value="'+esc(o.label)+'"></label><label>Stored value<input data-choice-value="'+i+'" value="'+esc(o.value)+'"></label><button data-choice-remove="'+i+'" aria-label="Remove option '+(i+1)+'">×</button></div>').join('')+btn('add-choice','Add option','plus','chip')+'</fieldset>';
}
function pickerInspector(n){
  const kind=pickerKind(n),s=n.picker||{},list=['dropdown','account'].includes(kind);
  const numeric=(key,label,defaultValue,min,max)=>field(label,'<input type="number" data-picker-setting="'+key+'" value="'+(s[key]||defaultValue)+'" min="'+min+'" max="'+max+'">');
  return '<div class="pickerSettings"><h3>Picker popup</h3>'+
    (list?'':field('Display format','<select data-picker-setting="format">'+options(pickerFormatOptions(kind),s.format||pickerFormatOptions(kind)[0])+'</select>'))+
    '<div class="row">'+field('Accent','<input type="color" data-picker-setting="accent" value="'+esc(s.accent||project.theme.accent)+'">')+field('Background','<input type="color" data-picker-setting="background" value="'+esc(s.background||'#ffffff')+'">')+field('Text color','<input type="color" data-picker-setting="ink" value="'+esc(s.ink||'#302b38')+'">')+'</div>'+
    numeric('width','Popup width (px)',328,230,680)+numeric('fontSize','Popup font size (px)',15,10,26)+field('Extra button inside popup','<select data-picker-setting="footerButton">'+options([['','None'],...page().nodes.filter(n=>n.type==='Button').map(n=>[n.id,n.name])],s.footerButton||'')+'</select>')+'</div>';
}
function pickerSettingValid(s,kind){
  return !s||(typeof s==='object'&&(!s.footerButton||/^[a-z][a-z0-9_-]*$/i.test(s.footerButton))&&(!s.format||pickerFormatOptions(kind).includes(s.format))&&['accent','background','ink'].every(k=>!s[k]||/^#[0-9a-f]{6}$/i.test(s[k]))&&[['width',230,680],['fontSize',10,26]].every(([k,min,max])=>s[k]===undefined||(Number.isFinite(s[k])&&s[k]>=min&&s[k]<=max)));
}
function pickerMarkup(n) {
  const settings=esc(JSON.stringify(n.picker||{})),choices=esc(n.choices||'');
  return '<button type="button" aria-haspopup="dialog" aria-label="'+esc(n.name)+'" data-picker-kind="'+esc(pickerKind(n))+'" data-picker-settings="'+settings+'" data-choices="'+choices+'" data-required="'+(n.requirement==='required')+'"><span>'+esc(n.text)+'</span><span aria-hidden="true">▾</span></button>';
}
const pickerCSS=`
.object[data-picker-kind]{display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;padding:0 12px}.object[data-picker-kind] span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pickerDialog{box-sizing:border-box;position:fixed;inset:auto;z-index:20;margin:0;max-width:calc(100vw - 16px);max-height:calc(100dvh - 16px);overflow:auto;padding:14px;border:1px solid #bcb6c7;border-radius:12px;color:var(--picker-ink);background:var(--picker-bg);font-family:inherit;box-shadow:0 8px 36px #251d3340}.pickerDialog::backdrop{background:transparent}.pickerDialog header,.pickerDialog footer{display:flex;align-items:center;flex-wrap:wrap;gap:6px;justify-content:space-between}.pickerDialog button{font:inherit;color:inherit;background:transparent;border:0;border-radius:5px;cursor:pointer;min-height:34px}.pickerDialog button:hover,.pickerDialog button:focus-visible{outline:2px solid var(--picker-accent);outline-offset:-2px}.pickerDialog button[aria-pressed=true]{background:var(--picker-accent);color:var(--picker-on-accent)}.pickerDialog .pkGrid{display:grid;gap:2px;text-align:center;margin:10px 0}.pickerDialog .pkGrid small{font-size:.78em;align-self:center}.pickerDialog input{width:100%;font:inherit;background:var(--picker-bg);color:inherit;border:1px solid #bcb6c7;border-radius:5px;padding:7px;margin:8px 0}.pickerDialog .pkList{max-height:44vh;overflow:auto}.pickerDialog .pkList button{display:block;text-align:left;width:100%;padding:5px 8px}.pickerDialog footer{border-top:1px solid #aaa6;padding-top:5px;margin-top:7px}
`;
// Each running preview owns its popup and its values. Pickers use local calendar dates.
function pickerController(getValue,setValue,accent,extraButton) {
  let dialog=null,anchor=null,model=null,cursor=null,view='';
  const pad=n=>String(n).padStart(2,'0');
  const iso=(d,kind)=>String(d.getFullYear()).padStart(4,'0')+(kind==='year'?'':'-'+pad(d.getMonth()+1))+(kind==='date'?'-'+pad(d.getDate()):'');
  const fromValue=v=>{if(!v)return new Date();const [y,m=1,d=1]=v.split('-').map(Number);return new Date(y,m-1,d,12)};
  function close(){if(dialog){const el=dialog;dialog=null;el.close();el.remove()}}
  function choose(value){const n=model,el=anchor;close();setValue(n,el,value,true)}
  function button(text,label,fn,pressed){
    const b=document.createElement('button');b.type='button';b.textContent=text;b.setAttribute('aria-label',label||text);b.onclick=fn;if(pressed!==undefined)b.setAttribute('aria-pressed',String(pressed));return b;
  }
  function position(){if(!dialog)return;const r=anchor.getBoundingClientRect(),b=dialog.getBoundingClientRect();dialog.style.left=Math.max(8,Math.min(r.left,innerWidth-b.width-8))+'px';dialog.style.top=Math.max(8,Math.min(r.bottom+b.height+8<innerHeight?r.bottom+4:r.top-b.height-4,innerHeight-b.height-8))+'px'}
  function render(){
    const kind=pickerKind(model),now=new Date(),v=getValue(model,anchor),year=cursor.getFullYear(),month=cursor.getMonth();
    const header=document.createElement('header'),body=document.createElement('div'),footer=document.createElement('footer');
    dialog.replaceChildren(header,body,footer);
    if(kind==='account'||kind==='dropdown'){
      const title=document.createElement('strong');title.textContent=model.name;header.append(title,button('×','Close picker',close));
      const find=document.createElement('input');find.type='search';find.placeholder='Search options';find.setAttribute('aria-label','Search options');
      const list=document.createElement('div');list.className='pkList';body.append(find,list);
      function filter(){const q=find.value.trim().toLowerCase(),items=dropdownChoices(model).filter(o=>(o.label+' '+o.value).toLowerCase().includes(q));
        list.replaceChildren(...items.map(o=>button(o.label,null,()=>choose(o.value),o.value===v)));if(!items.length)list.textContent='No matching options.'}
      find.oninput=filter;filter();find.focus();
    }else{
      const decade=year-year%12,offset=view==='days'?1:view==='months'?12:144;
      function move(step){cursor=new Date(year,month+step*offset,1,12);render()}
      const title=view==='days'?cursor.toLocaleString('en',{month:'long',year:'numeric'}):view==='months'?String(year):decade+' – '+(decade+11);
      header.append(button('‹','Previous '+(view==='days'?'month':view==='months'?'year':'years'),()=>move(-1)),button(title,title,()=>{if(view==='days')view='months';else if(view==='months')view='years';render()}),button('›','Next '+(view==='days'?'month':view==='months'?'year':'years'),()=>move(1)));
      body.className='pkGrid';body.style.gridTemplateColumns='repeat('+(view==='days'?7:3)+',1fr)';
      if(view==='days'){
        for(const s of ['Su','Mo','Tu','We','Th','Fr','Sa']){const el=document.createElement('small');el.textContent=s;body.append(el)}
        for(let i=0;i<new Date(year,month,1).getDay();i++)body.append(document.createElement('i'));
        for(let i=1;i<=new Date(year,month+1,0).getDate();i++){const day=iso(new Date(year,month,i,12),'date');body.append(button(String(i),day,()=>choose(day),day===v))}
      }else if(view==='months'){
        for(let i=0;i<12;i++){const d=new Date(year,i,1,12),name=d.toLocaleString('en',{month:'long'});body.append(button(name.slice(0,3),name+' '+year,()=>{if(kind==='month')choose(iso(d,kind));else{cursor=d;view='days';render()}},iso(d,'month')===v.slice(0,7)))}
      }else{
        for(let i=decade;i<decade+12;i++)body.append(button(String(i),null,()=>{cursor=new Date(i,month,1,12);if(kind==='year')choose(iso(cursor,kind));else{view='months';render()}},String(i)===v.slice(0,4)));
      }
      footer.append(button(kind==='date'?'Today':kind==='month'?'This month':'This year',null,()=>choose(iso(now,kind))));
    }
    const extra=extraButton(model,anchor);if(extra)footer.append(button(extra.label,null,()=>{close();extra.run()}));
    footer.append(button('Clear',null,()=>choose('')),button('Done',null,close));position();
  }
  function open(n,el){
    close();model=n;anchor=el;const kind=pickerKind(n);view=kind==='month'?'months':kind==='year'?'years':'days';cursor=fromValue(['date','month','year'].includes(kind)?getValue(n,el):'');
    const box=dialog=document.createElement('dialog'),s=n.picker||{},color=s.accent||accent;box.className='pickerDialog';box.setAttribute('aria-label',n.name+' options');box.style.width=(s.width||328)+'px';box.style.fontSize=(s.fontSize||15)+'px';
    box.style.setProperty('--picker-accent',color);box.style.setProperty('--picker-ink',s.ink||'#302b38');box.style.setProperty('--picker-bg',s.background||'#ffffff');
    const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));box.style.setProperty('--picker-on-accent',(.299*rgb[0]+.587*rgb[1]+.114*rgb[2])>155?'#212126':'#ffffff');
    box.addEventListener('cancel',e=>{e.preventDefault();close()});box.addEventListener('click',e=>{if(e.target===box){const b=box.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)close()}});
    (el.closest('dialog')||document.body).append(box);box.showModal();render();if(!box.contains(document.activeElement))box.querySelector('input,button')?.focus();
  }
  function run(n,el,operation){
    if(operation==='open')return open(n,el);
    if(operation==='clear')return setValue(n,el,'');
    const kind=pickerKind(n),today=new Date(),d=fromValue(getValue(n,el));
    if(operation==='today')return setValue(n,el,iso(today,kind));
    const delta=operation==='next'?1:-1;
    if(kind==='year')d.setFullYear(d.getFullYear()+delta);
    else{const day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+delta);d.setDate(Math.min(day,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()))}
    setValue(n,el,iso(d,kind));
  }
  return {open,close,run};
}
function editPickerChoice(index,what,value=''){
  const n=sel(),choices=dropdownChoices(n);
  if(what==='add'){let i=choices.length+1;while(choices.some(o=>o.value==='Option '+i))i++;choices.push({label:'Option '+i,value:'Option '+i})}
  else if(what==='remove')choices.splice(index,1);
  else{
    value=value.trim();if(!value||/[|\r\n]/.test(value)||(what==='value'&&choices.some((o,i)=>i!==index&&o.value===value))){toast('Use a nonempty label and a unique value without a vertical bar.');drawProps();return}
    choices[index][what]=value;
  }
  change(()=>n.choices=choices.map(o=>o.label+' | '+o.value).join('\n'));
}
function pickerDemoScreen(){
  const pg=makePage('Choose month'),picker=createPicker('month');
  picker.picker={format:'MMMM YYYY',accent:'#09796f',background:'#f1faf6',ink:'#183b33',width:360,fontSize:16};
  const label=node('Text','Reporting month',[50,52,480,44]);label.boxes.phone=[20,28,350,44];label.style.fontSize=27;
  picker.boxes.laptop=[50,115,270,48];picker.boxes.phone=[20,96,235,47];pg.nodes=[label,picker];
  const side=node('Button','Next month',[333,115,142,48],{actions:[{event:'click',action:'pickerAction',target:picker.id,operation:'next'}]});
  side.boxes.phone=[262,96,112,47];pg.nodes.push(side);picker.picker.footerButton=side.id;
  const clear=node('Button','Clear month',[50,185,147,44],{actions:[{event:'click',action:'clearFields',target:'',fields:[picker.id]}]});
  clear.boxes.phone=[20,165,147,44];pg.nodes.push(clear);return pg;
}

function acceptsPickerValue(n,value){
  if(!value)return true;
  const kind=pickerKind(n);
  if(kind==='account'||kind==='dropdown'||n.inputType==='select')return dropdownChoices(n).some(o=>o.value===value);
  if(kind==='year')return /^\d{4}$/.test(value);
  if(kind==='month')return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
  if(kind==='date'){if(!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value))return false;const [y,m,d]=value.split('-').map(Number);return new Date(y,m-1,d,12).getDate()===d}
  return true;
}
