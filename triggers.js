'use strict';

const triggerLabels={click:'Click / tap',enter:'Press Enter',change:'Value changed',open:'Open window',close:'Close window',go:'Go to screen',expand:'Show / expand',collapse:'Hide / collapse',toggle:'Toggle visibility',saveRow:'Save to sample table',saveValue:'Save a preview value',copyValue:'Set another field',passwordDemo:'Simulate password update',clearFields:'Clear chosen fields',message:'Show a message',loadValue:'Read a preview value',pickerAction:'Control a picker',customDemo:'Custom action (simulation)'};
const saveTypes=['saveRow','saveValue','copyValue','passwordDemo'];
function triggerOK(a){
  if(!a||!['click','enter','change'].includes(a.event)||!Object.hasOwn(triggerLabels,a.action)||['click','enter','change'].includes(a.action))return false;
  const id=s=>typeof s==='string'&&/^[a-z][a-z0-9_-]*$/i.test(s);
  const string=s=>typeof s==='string'&&s.trim().length>0;
  if(a.action==='saveRow')return id(a.target)&&Array.isArray(a.fields)&&a.fields.every(f=>f===''||id(f))&&typeof a.message==='string'&&(!a.columns||Array.isArray(a.columns)&&a.columns.length===a.fields.length&&a.columns.every(string));
  if(a.action==='clearFields')return Array.isArray(a.fields)&&a.fields.length>0&&a.fields.every(id);
  if(a.action==='saveValue'||a.action==='loadValue')return id(a.target)&&string(a.key);
  if(a.action==='copyValue')return id(a.target)&&id(a.source);
  if(a.action==='pickerAction')return id(a.target)&&['open','today','next','previous','clear'].includes(a.operation);
  if(a.action==='passwordDemo')return id(a.target)&&typeof a.message==='string';
  if(a.action==='message'||a.action==='customDemo')return string(a.message);
  return a.action==='close'||id(a.target);
}
function columnKeys(table){
  const counts=new Map();
  return (tableLines(table)[0]||['Column 1']).map(name=>{
    const n=(counts.get(name)||0)+1;counts.set(name,n);return JSON.stringify([name,n]);
  });
}
function mappedFields(a,table){
  if(!a.columns)return a.fields;
  const keys=columnKeys(table),linked=new Map(a.columns.map((key,i)=>[key,a.fields[i]]));
  if(a.columns.some((key,i)=>a.fields[i]&&!keys.includes(key)))return null;
  return keys.map(key=>linked.get(key)||'');
}
// Capture the old column order before a legacy table is changed by Inspector or code.
function preserveColumnLinks(p){
  const tables=new Map(p.pages.flatMap(pg=>pg.nodes.filter(n=>n.type==='Table').map(n=>[n.id,n])));
  for(const pg of p.pages)for(const n of pg.nodes)for(const a of n.actions){
    if(a.action==='saveRow'&&!a.columns&&tables.has(a.target)){
      const keys=columnKeys(tables.get(a.target));if(keys.length===a.fields.length)a.columns=keys;
    }
  }
}
function inputsOnPage(includePassword=false){return page().nodes.filter(n=>n.type==='Input'&&(includePassword||n.inputType!=='password'))}
function pickerOperations(n){
  const kind=pickerKind(n||{}),time=['date','month','year'].includes(kind),period=kind==='year'?'year':'month';
  return [['open','Open picker'],...(time?[['today',kind==='date'?'Set today':kind==='month'?'Set this month':'Set this year'],['previous','Previous '+period],['next','Next '+period]]:[]),['clear','Clear selection']];
}
function targetChoices(action) {
  if(action==='saveRow')return tablesInProject().map(({pg,n})=>[n.id,pg.name+' / '+n.name]);
  if(action==='open'||action==='go')return project.pages.filter(p=>p.kind===(action==='open'?'window':'screen')).map(p=>[p.id,p.name]);
  if(action==='copyValue'||action==='loadValue')return project.pages.flatMap(pg=>pg.nodes.filter(n=>n.type==='Input'&&n.inputType!=='password').map(n=>[n.id,pg.name+' / '+n.name]));
  if(action==='pickerAction')return inputsOnPage().filter(n=>pickerKind(n)).map(n=>[n.id,n.name]);
  if(action==='passwordDemo')return inputsOnPage(true).filter(n=>n.inputType==='password').map(n=>[n.id,n.name]);
  if(action==='saveValue')return inputsOnPage().map(n=>[n.id,n.name]);
  return page().nodes.map(n=>[n.id,n.name]);
}
function describeTrigger(a){
  const target=targetChoices(a.action).find(([id])=>id===a.target)?.[1]||'Choose a target';
  if(a.action==='clearFields')return 'Clear '+a.fields.map(id=>page().nodes.find(n=>n.id===id)?.name||'missing field').join(', ');
  if(a.action==='saveValue')return 'Save '+target+' as “'+a.key+'” for this run';
  if(a.action==='loadValue')return 'Read “'+a.key+'” into '+target;
  if(a.action==='message'||a.action==='customDemo')return triggerLabels[a.action]+' · '+a.message;
  if(a.action==='pickerAction'){const n=page().nodes.find(n=>n.id===a.target);return (pickerOperations(n).find(o=>o[0]===a.operation)?.[1]||'Control picker')+' · '+target}
  return triggerLabels[a.action]+(a.action==='close'?'':' · '+target);
}
function triggerSelect(id,title,choices,value,placeholder='Choose…'){
  return field(title,'<select id="'+id+'">'+options([['',placeholder],...choices],value||'')+'</select>');
}
function triggerForm(old={}){
  const events=[['click',triggerLabels.click],['enter',triggerLabels.enter]];
  if(sel()?.type==='Input'||old.event==='change')events.push(['change',triggerLabels.change]);
  const menu=[['save','Save…'],['clearFields','Clear…'],['pickerAction','Control a picker…'],['message','Show a message'],['loadValue','Read a preview value'],['customDemo','Custom action (simulation)'],...['open','close','go','expand','collapse','toggle'].map(k=>[k,triggerLabels[k]])];
  return field('When','<select id="ev">'+options(events,old.event||'click')+'</select>')+
    triggerSelect('ac','What should happen?',menu,saveTypes.includes(old.action)?'save':old.action,'Choose an action')+'<div id="targetArea"></div>';
}
function wireTargets(old={}){
  const area=$('#targetArea'),ac=$('#ac');
  const msg=(label,fallback)=>field(label,'<input id="triggerMessage" value="'+esc(old.message??fallback)+'">');
  function detail(action,el){
    const current=old.action===action?old:{};
    const targets=targetChoices(action);
    const target=(label)=>triggerSelect('target',label,targets,current.target);
    const key=()=>field('Name of preview value','<input id="previewKey" placeholder="e.g. Preferred account" value="'+esc(current.key||'')+'">');
    const hint=text=>'<p class="hint">'+esc(text)+'</p>';
    if(!action||action==='close'){el.innerHTML='';return}
    if(action==='message'||action==='customDemo'){el.innerHTML=msg(action==='message'?'Message to show':'Describe the simulated result',action==='message'?'Saved.':'')+(action==='customDemo'?hint('Preview shows this result when the trigger runs.'):'');return}
    if(action==='clearFields'){
      el.innerHTML='<fieldset class="triggerFields"><legend>Which fields should clear?</legend>'+inputsOnPage(true).map(n=>'<label><input type="checkbox" data-clear-field="'+n.id+'" '+(current.fields?.includes(n.id)?'checked':'')+'>'+esc(n.name)+'</label>').join('')+'</fieldset>';
      if(!inputsOnPage(true).length)el.innerHTML+=hint('Insert an input or a picker on this screen first.');return;
    }
    if(action==='saveValue'||action==='loadValue')el.innerHTML=target(action==='saveValue'?'Value from':'Put the value in')+key()+hint('This named value lasts for the current preview or exported app session.');
    else if(action==='copyValue')el.innerHTML=triggerSelect('source','Value from',inputsOnPage().map(n=>[n.id,n.name]),current.source)+target('Destination field');
    else if(action==='passwordDemo')el.innerHTML=target('Sample password field')+msg('Preview success message','Password update simulated.')+hint('Use a dummy password. Preview discards it after the simulation. A real password change needs an authentication service.');
    else if(action==='pickerAction'){
      el.innerHTML=target('Which picker?')+'<div id="pickOperation"></div>';
      const op=()=>{const id=$('#target').value;$('#pickOperation').innerHTML=id?triggerSelect('operation','Picker action',pickerOperations(page().nodes.find(n=>n.id===id)),current.operation):''};$('#target').onchange=op;op();
    }else{
      el.innerHTML=target(action==='saveRow'?'Destination table':'Target')+(action==='open'?btn('quick-window','Create a window','plus','btn smallBtn'):'');
      if(action==='saveRow'){el.insertAdjacentHTML('beforeend','<div id="saveFields"></div>');$('#target').onchange=()=>saveRowSettings(current);saveRowSettings(current)}
    }
    if(!targets.length)el.insertAdjacentHTML('beforeend',hint(action==='passwordDemo'?'Insert a password input to try this.':action==='pickerAction'?'Insert a Picker on this screen first.':'Add a matching destination or field first.'));
  }
  function draw(){
    if(ac.value!=='save'){detail(ac.value,area);return}
    area.innerHTML=triggerSelect('saveKind','Where should the save go?',[
      ['saveRow','A sample table'],['saveValue','A named preview value'],['copyValue','Another field on a screen'],['passwordDemo','Account password (simulation)']
    ],saveTypes.includes(old.action)?old.action:'','Choose a destination')+'<div id="saveDestination"></div>';
    const kind=$('#saveKind'),dest=$('#saveDestination');kind.onchange=()=>{detail(kind.value,dest);if(kind.value){dest.insertAdjacentHTML('beforeend','<details class="mt"><summary>Preview response messages</summary>'+[['saving','While saving','Saving…'],['failed','Save failed','Save failed. Try again.'],['offline','Offline','Offline. Your entry is still here.']].map(([k,label,fallback])=>field(label,'<input data-feedback="'+k+'" value="'+esc(old.feedback?.[k]||fallback)+'">')).join('')+'</details>')}};kind.onchange();
  }
  ac.onchange=draw;draw();
}
function readTrigger(){
  const val=id=>$(id)?.value?.trim()||'';
  const event=val('#ev'),action=val('#ac')==='save'?val('#saveKind'):val('#ac'),target=val('#target');
  if(!action)throw Error(val('#ac')==='save'?'Choose where this Save should go.':'Choose what should happen.');
  let a={event,action,target};
  if(action==='saveRow'){if(!target)throw Error('Choose the destination table.');a=readSaveRow(a)}
  if(action==='clearFields')a.fields=$$('[data-clear-field]:checked').map(e=>e.dataset.clearField);
  if(action==='saveValue'||action==='loadValue')a.key=val('#previewKey');
  if(action==='copyValue'){a.source=val('#source');if(target&&a.source===target)throw Error('Choose a different destination field.')}
  if(action==='pickerAction')a.operation=val('#operation');
  if(['message','customDemo','passwordDemo'].includes(action))a.message=val('#triggerMessage');
  if(saveTypes.includes(action))a.feedback=Object.fromEntries($$('[data-feedback]').map(el=>[el.dataset.feedback,el.value.trim()]));
  if(!triggerOK(a))throw Error(action==='clearFields'?'Select the fields to clear.':'Complete the action and its destination.');
  return a;
}
