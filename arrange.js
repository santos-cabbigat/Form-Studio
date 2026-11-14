'use strict';

function enclosingBox(boxes) {
  const x = Math.min(...boxes.map(b => b[0]));
  const y = Math.min(...boxes.map(b => b[1]));
  return [x, y, Math.max(...boxes.map(b => b[0] + b[2])) - x,
                Math.max(...boxes.map(b => b[1] + b[3])) - y];
}

function arrangeItems() {
  const groups = new Map();
  for (const node of page().nodes) {
    if (!selected.includes(node.id)) continue;
    const id = node.group || node.id;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push({node, box: boxFor(node, device, project, page())});
  }
  return Array.from(groups.values(), members => ({
    members, box: enclosingBox(members.map(m => m.box))
  }));
}

function arrangeOffsets(items, axis, action, reference, gap) {
  const size = axis + 2;
  if (action === 'equal' || action === 'gap') {
    const ordered = [...items].sort((a,b) => a.box[axis] - b.box[axis]);
    if (ordered.length < (action === 'equal' ? 3 : 2)) return [];
    if (action === 'equal') {
      const last = ordered.at(-1).box;
      const span = last[axis] + last[size] - ordered[0].box[axis];
      gap = (span - ordered.reduce((sum, item) => sum + item.box[size], 0)) / (ordered.length - 1);
      if (gap < 0) throw Error('These items overlap. Enter a gap in pixels to spread them out.');
    }
    let next = ordered[0].box[axis];
    return ordered.map(item => {
      const delta = Math.round(next) - item.box[axis];
      next += item.box[size] + gap;
      return {item, delta};
    });
  }
  const fraction = {start:0, center:0.5, end:1}[action];
  return items.map(item => ({
    item,
    delta: Math.round(reference[axis] + (reference[size] - item.box[size]) * fraction) - item.box[axis]
  }));
}

function moveArrangedMember(member, axis, delta) {
  const {node, box} = member;
  const pg = page();
  // Keep normalized horizontal coordinates fractional so any preset width can express an exact pixel.
  const baseWidth = pg.kind === 'window' ? Math.min(pg.width, devices[device][0] - 24) : devices[device][0];
  const actualWidth = pg.kind === 'window' ? Math.min(pg.width, project.widths[device] - 24) : project.widths[device];
  const ratio = baseWidth / actualWidth;
  const layout = node.boxes[device] || [box[0]*ratio, box[1], box[2]*ratio, box[3]];
  layout[axis] = (box[axis] + delta) * (axis === 0 ? ratio : 1);
  node.boxes[device] = layout;
}

function arrangeDialog(ref=null) {
  const items = arrangeItems();
  if (!items.length) { toast('Select an element or group to arrange.'); return; }
  const directions = (axis, choices) => '<div class="arrangeRow">' + choices.map(([action,label]) =>
    '<button class="btn" data-arrange="'+action+'" data-axis="'+axis+'">'+label+'</button>'
  ).join('') + '</div>';
  const activeText = selectedLayers().filter(n => ['Text','Input','Button'].includes(n.type));
  const scopes = [];
  if(items.length>1)scopes.push(['selection','Selected items']);
  scopes.push(['canvas',items.length>1?'Canvas · move selection together':'Canvas']);
  if(ref)scopes.push(['reference',ref.label]);
  scopes.push(['pick','Pick a reference object…'],['mark','Mark an area…']);
  const scope=field('Align to','<select id="arrangeScope">'+options(scopes,ref?'reference':scopes[0][0])+'</select>')+
    '<div class="referenceQuick">'+btn('center-on-object','Center on a shape…','','btn')+btn('center-in-area','Center in an area…','','btn')+'</div>';
  modal('Arrange', '<p class="arrangeSummary">'+countText(selected.length)+' · '+items.length+' movable '+(items.length === 1 ? 'item' : 'items')+' · '+cap(device)+'</p>'+ scope +
    '<fieldset><legend>Horizontal alignment</legend>'+directions(0,[['start','Left'],['center','Center'],['end','Right']])+'</fieldset>'+
    '<fieldset><legend>Vertical alignment</legend>'+directions(1,[['start','Top'],['center','Middle'],['end','Bottom']])+'</fieldset>'+
    (items.length < 2 ? '' :
      '<fieldset><legend>Spacing between items</legend>'+field('Direction','<select id="gapAxis"><option value="0">Horizontal</option><option value="1">Vertical</option></select>')+
      (items.length >= 3 ? btn('even-gap','Distribute evenly','','btn full') : '')+
      '<form id="gapForm"><label>Exact gap (px)<input id="arrangeGap" type="number" min="0" step="1" value="16" required></label><button class="btn" type="submit">Apply gap</button></form></fieldset>')+
    (activeText.length ? '<fieldset><legend>Text inside selected items</legend>'+directions('text',[['left','Left'],['center','Center'],['right','Right']])+'</fieldset>' : '')+
    '<div class="hint" role="status" id="arrangeStatus"></div><div class="dialogActions">'+btn('arrange-undo','Undo','undo')+btn('dismiss','Done','','btn primary')+'</div>');
  const dlg = $('.dialog');
  dlg.classList.add('arrangeDialog');
  const undo = dlg.querySelector('[data-cmd=arrange-undo]');
  undo.disabled = !past.length;
  const status = $('#arrangeStatus');
  function apply(axis, action, gap) {
    try {
      if (axis === 'text') {
        const targets = activeText.filter(n => n.style.align !== action);
        if (!targets.length) { status.textContent='Text already aligned.'; return; }
        change(() => targets.forEach(n => n.style.align = action));
      } else {
        const current = arrangeItems();
        const extent = enclosingBox(current.map(t => t.box));
        const scopeValue=$('#arrangeScope').value;
        const canvas=scopeValue==='canvas'||scopeValue==='reference';
        const alignTogether = canvas && !['equal','gap'].includes(action);
        const targets = alignTogether ? [{members:current.flatMap(t => t.members), box:extent}] : current;
        const reference = !alignTogether ? extent : scopeValue==='reference' ? referenceBox(ref) : [0,0,...bounds(page(),device,project)];
        if(!reference)throw Error('Choose a reference object or area.');
        const moves = arrangeOffsets(targets,axis,action,reference,gap).filter(m => m.delta !== 0);
        if (!moves.length) { status.textContent='Items already in position.'; return; }
        change(() => moves.forEach(({item,delta}) => item.members.forEach(m => moveArrangedMember(m,axis,delta))));
      }
      undo.disabled = !past.length;
      status.textContent = action === 'gap' ? 'Applied '+gap+' px between items.' : action === 'equal' ? 'Gaps distributed evenly.' : 'Alignment applied.';
    } catch (e) { status.textContent=e.message; }
  }
  for (const button of dlg.querySelectorAll('[data-arrange]')) {
    button.onclick = () => apply(button.dataset.axis==='text'?'text':Number(button.dataset.axis),button.dataset.arrange);
  }
  $('#arrangeScope').onchange=e=>{
    if(e.target.value==='pick')startReferencePick('element',ref);
    if(e.target.value==='mark')startReferencePick('area',ref);
  };
  dlg.querySelector('[data-cmd=center-on-object]').onclick=()=>startReferencePick('element',ref,true);
  dlg.querySelector('[data-cmd=center-in-area]').onclick=()=>startReferencePick('area',ref,true);
  const even = dlg.querySelector('[data-cmd=even-gap]');
  if(even) even.onclick=()=>apply(Number($('#gapAxis').value),'equal');
  const form = $('#gapForm');
  if(form)form.onsubmit=e=>{e.preventDefault();const input=$('#arrangeGap');if(input.reportValidity())apply(Number($('#gapAxis').value),'gap',input.valueAsNumber)};
  undo.onclick=()=>{history(true);dismiss();if(selected.length)arrangeDialog(ref&&referenceBox(ref)?ref:null)};
}
