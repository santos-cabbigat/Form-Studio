'use strict';

const filePrefix = 'formstudio.project.';
const lastFileKey = 'formstudio.lastProject';
const legacyFileId = '00000000-0000-4000-8000-000000000001';
let activeFileId = legacyFileId, deviceRevision = null;
const isFileId = id => typeof id === 'string' && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id);

function deviceRecord(id) {
  if (!isFileId(id)) return null;
  return JSON.parse(localStorage.getItem(filePrefix + id));
}
function rememberFile(id) {
  try { sessionStorage.setItem(lastFileKey,id) } catch {}
  try { localStorage.setItem(lastFileKey,id) } catch {}
}
function deviceFiles() {
  return Object.keys(localStorage).filter(key => key.startsWith(filePrefix)).flatMap(key => {
    try {
      const row = deviceRecord(key.slice(filePrefix.length));
      return row?.document?.pages?.length && isFileId(row.id) && filePrefix+row.id===key ? [row] : [];
    } catch { return []; }
  }).sort((a,b) => b.modified - a.modified);
}
let lastWrite=null;
function saveDevice(document,id,expected){
  const key=filePrefix+id,stored=localStorage.getItem(key),raw=JSON.stringify(document);
  let revision=null,identical=false;
  if(lastWrite?.id===id&&lastWrite.stored===stored){
    revision=lastWrite.revision;identical=raw===lastWrite.raw;
    if(identical)return {id,revision,modified:lastWrite.modified,document};
  }else if(stored){
    const prior=JSON.parse(stored);revision=prior.revision;
    if(JSON.stringify(prior.document)===raw)return prior;
  }
  if(revision!==expected)throw Error('This project changed in another tab. Download your edits or save them as a new project.');
  const row={id,revision:crypto.randomUUID(),modified:Date.now()};
  const encoded=JSON.stringify(row).slice(0,-1)+',"document":'+raw+'}';
  localStorage.setItem(key,encoded);lastWrite={...row,stored:encoded,raw};
  return {...row,document};
}
function restoreDevice() {
  let tabId;
  try { tabId=sessionStorage.getItem(lastFileKey); } catch {}
  let row;
  const candidates=new Set([tabId,localStorage.getItem(lastFileKey),...Object.keys(localStorage).filter(k=>k.startsWith(filePrefix)).map(k=>k.slice(filePrefix.length))]);
  for(const id of candidates){
    try{const candidate=deviceRecord(id);if(!candidate||!isFileId(candidate.id)||candidate.id!==id)continue;validateImport(candidate.document);row=candidate;break}
    catch{loadNote='A saved project could not be read. Its device copy has been kept.'}
  }
  if (!row) {
    const old = localStorage.getItem('formstudio.workspace.v1');
    row = saveDevice(old ? validateImport(JSON.parse(old)) : intro(), old ? legacyFileId : crypto.randomUUID(), null);
  }
  activeFileId=row.id; deviceRevision=row.revision; rememberFile(row.id);
  return row.document;
}
function openRecord(row) {
  validateImport(row.document);
  endReferencePick(); closeSide(); dismiss();
  activeFileId=row.id; deviceRevision=row.revision; rememberFile(row.id);
  project=row.document; pageId=project.pages[0].id; selected=[]; past=[]; future=[];
  multi=false; gesture=null; mode='design'; panMode=false; zoomFactor=1; pan=[0,0];
  storageOK=true; $('#saveStatus').textContent='Saved on this device'; render();if(studioSession)queueCloud();
}
function saveNewDocument(doc) {
  const row=saveDevice(doc,crypto.randomUUID(),null);
  openRecord(row); toast('Project saved on this device');
}
function newProject(copy=false) {
  modal(copy?'Save a project copy':'New project','<form id="fileForm">'+field('Project name','<input id="fileTitle" required maxlength="160" value="'+esc(copy?project.name+' copy':'')+'">')+'<div class="dialogActions">'+btn('files','Cancel')+'<button class="btn primary" type="submit">'+(copy?'Save copy':'Create project')+'</button></div></form>');
  $('#fileForm [data-cmd=files]').type='button';
  $('#fileForm').onsubmit=e=>{e.preventDefault();const name=$('#fileTitle').value.trim();if(!name)return;
    try{if(!copy&&!write())return;let doc=copy?clone(project):intro();if(!copy)doc.pages=[makePage('Screen 1')];doc.name=name;saveNewDocument(doc)}catch(err){toast(err.message)}
  };
}
function filesDialog() {
  let rows=[], message='';
  try { rows=deviceFiles(); } catch { message='Device storage unavailable. Download a backup.'; }
  const list=rows.map(row=>'<button class="fileRow" data-open-file="'+row.id+'"><span>'+esc(row.document.name)+'</span><small>'+(row.id===activeFileId?'Current project':'Open')+'</small></button>').join('');
  modal('Files','<div class="fileActions">'+btn('new-file','New project','plus','btn primary')+btn('import','Import JSON','page')+btn('import-html','Import editable HTML','code')+btn('merge-design','Add another project','layers')+btn('project-code','Project code','code')+btn('find-project','Find in project','search')+'</div><h3>On this device</h3><p>Applied changes save automatically in this browser, including offline. Reopen the same project in this browser on this device. Clearing site data removes its local projects and code drafts.</p>'+esc(message)+'<div class="fileList">'+list+'</div><div class="fileActions">'+btn('rename-file','Rename current')+btn('copy-file','Save a copy')+btn('json','Download project JSON')+'</div><h3>My cloud projects</h3><p>While online, sign in and save a project to your personal Supabase to open it on another device. Apply code drafts before saving them to the cloud.</p>'+btn('cloud',studioSession?'Open cloud projects':'Sign in to cloud','library')+'<p id="cloudNote" role="status"></p>');
  for (const el of $$('.dialog [data-open-file]')) el.onclick=()=>{try {
    if (el.dataset.openFile===activeFileId) {dismiss();return}
    if (!write()) return;
    const row=deviceRecord(el.dataset.openFile);if(!row)throw Error('Project is unavailable in this browser.');openRecord(row);
  }catch(err){toast(err.message)}};
}
