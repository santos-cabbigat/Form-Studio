'use strict';

function tableLines(n) {
  return (n.rows || 'Column 1').split(/\r?\n/).filter(s=>s.trim()).map(line=>line.split('|').map(cell=>cell.trim()));
}
function dropdownChoices(n) {
  return (n.choices || '').split(/\r?\n/).filter(s=>s.trim()).map(line=>{
    const [label,...value]=line.split('|');
    return {label:label.trim(), value:(value.join('|')||label).trim()};
  });
}
function tableMarkup(n,rows) {
  const headers=tableLines(n)[0] || ['Column 1'];
  const body=rows.length?rows.map(row=>'<tr>'+headers.map((_,i)=>'<td>'+esc(row[i]??'')+'</td>').join('')+'</tr>').join(''):
    '<tr data-empty><td colspan="'+headers.length+'">'+esc(n.emptyMessage??'No entries yet.')+'</td></tr>';
  return '<table><thead><tr>'+headers.map(col=>'<th>'+esc(col)+'</th>').join('')+'</tr></thead><tbody>'+body+'</tbody></table>';
}
function seedRows(n){return n.initialState==='empty'?[]:tableLines(n).slice(1)}
function dataInspector(n) {
  if(n.type==='Input')return field('Required','<select data-prop="requirement">'+options([['optional','Optional'],['required','Required']],n.requirement||'optional')+'</select>')+
    (n.inputType==='select'?field('Dropdown choices · label | value','<textarea data-prop="choices">'+esc(n.choices||'')+'</textarea>'):'');
  if(n.type!=='Table')return '';
  return field('Columns on first line · sample rows below','<textarea rows="5" data-prop="rows">'+esc(n.rows)+'</textarea>')+
    field('Start preview with','<select data-prop="initialState">'+options([['sample','Sample rows'],['empty','Empty table']],n.initialState||'sample')+'</select>')+
    field('Empty table message',prop('emptyMessage',n.emptyMessage??'No entries yet.'));
}
function sampleEntryScreen() {
  const pg=makePage('Sample entry');
  function add(n,desktop,phone){n.boxes.laptop=desktop;n.boxes.phone=phone;pg.nodes.push(n);return n}
  const heading=add(node('Text','Record an entry'),[36,32,580,48],[20,18,350,44]);heading.style.fontSize=30;heading.style.weight=700;
  add(node('Text','Account'),[36,106,300,28],[20,79,345,28]);
  const account=add(createItem('Input','Dropdown'),[36,139,365,48],[20,110,350,47]);
  Object.assign(account,{name:'Account',text:'Choose an account',choices:'Cash\nBank\nSales',requirement:'required'});
  add(node('Text','Amount'),[430,106,330,28],[20,173,345,28]);
  const amount=add(createItem('Input','Number'),[430,139,340,48],[20,203,350,47]);
  Object.assign(amount,{name:'Amount',text:'Enter an amount',requirement:'required'});
  const save=add(createItem('Button','Solid'),[36,210,146,45],[20,268,140,44]);save.name='Save entry';save.text='Save entry';
  const table=add(createItem('Table','Simple'),[36,305,735,245],[20,348,350,242]);
  Object.assign(table,{name:'Entries',rows:'Account | Amount\nCash | 25000\nBank | 40000',initialState:'empty',emptyMessage:'No entries yet. Save your first entry above.'});
  save.actions=[{event:'click',action:'saveRow',target:table.id,fields:[account.id,amount.id],message:'Entry saved.'}];
  return pg;
}
function tablesInProject() {
  return project.pages.flatMap(pg=>pg.nodes.filter(n=>n.type==='Table').map(n=>({pg,n})));
}
function saveRowSettings(action={}) {
  const id=$('#target')?.value,entry=tablesInProject().find(t=>t.n.id===id),area=$('#saveFields');
  if(!area||!entry)return;
  const inputs=page().nodes.filter(n=>n.type==='Input'&&n.inputType!=='password');
  const normalized=v=>String(v||'').trim().toLowerCase();
  area.innerHTML=(tableLines(entry.n)[0]||['Column 1']).map((col,i)=>{
    const match=inputs.find(n=>normalized(n.name)===normalized(col)) || inputs[i];
    const selected=action.target===id&&action.fields?action.fields[i]:match?.id;
    return field('Column · '+col,'<select data-bind-col>'+options([['','Leave blank'],...inputs.map(n=>[n.id,n.name])],selected||'')+'</select>');
  }).join('')+field('Notification after save','<input id="saveMessage" value="'+esc(action.message??'Entry saved.')+'">')+'<p class="hint">Mapped required fields must be filled before a row is added. Preview rows reset when you reopen Preview.</p>';
}
function readSaveRow(a) {
  const fields=$$('[data-bind-col]').map(el=>el.value);
  if(!fields.some(Boolean))throw Error('Connect at least one input to a table column.');
  return {...a,fields,message:$('#saveMessage').value.trim()};
}
