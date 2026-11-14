'use strict';
const personalApi='https://uyyihuvjbrbsombzzvqw.supabase.co';
const studioPublicKey='sb_publishable_VwYzs5ihi9tR_r1wcfCo-w_mboqCHV_';
let studioSession=null, cloudBusy=false;
const sessionKey='formstudio.personal.session';
function restoreSession(){try{const s=JSON.parse(sessionStorage.getItem(sessionKey));if(s?.user?.id&&s.refresh_token)studioSession=s}catch{}}
function keepSession(s){studioSession=s;try{if(s)sessionStorage.setItem(sessionKey,JSON.stringify(s));else sessionStorage.removeItem(sessionKey)}catch{}}
async function api(path,method='GET',body=null,token=null,prefer=null){
 const headers={apikey:studioPublicKey,'Content-Type':'application/json'};
 if(token)headers.Authorization='Bearer '+token;if(prefer)headers.Prefer=prefer;
 const res=await fetch(personalApi+path,{method,headers,body:body===null?undefined:JSON.stringify(body),cache:'no-store',referrerPolicy:'no-referrer'});
 const text=await res.text();let data;try{data=text?JSON.parse(text):null}catch{throw Error('Supabase returned an unreadable response.')}
 if(!res.ok){if(res.status===409)throw Error('A newer cloud copy exists. Open it first. Your device edits will be kept as a separate copy.');throw Error(data?.msg||data?.message||data?.error_description||'Supabase request failed ('+res.status+').')}
 return data
}
async function session(){
 if(!studioSession)throw Error('Sign in to your Personal Ledger Supabase account first.');
 if((studioSession.expires_at||0)*1000<Date.now()+45000){const next=await api('/auth/v1/token?grant_type=refresh_token','POST',{refresh_token:studioSession.refresh_token});keepSession(next)}return studioSession
}
const projectsApi='/rest/v1/form_studio_projects';
function cloudBase(owner,id){
 const key='formstudio.cloud.base.'+owner+'.'+id;
 return JSON.parse(localStorage.getItem(key)) || {revision:id===legacyFileId?localStorage.getItem('formstudio.cloud.revision.'+owner):null};
}
function markCloud(owner,id,revision,deviceRevision){
 localStorage.setItem('formstudio.cloud.base.'+owner+'.'+id,JSON.stringify({revision,deviceRevision}));
}
function cloudDialog() {
 if (cloudBusy) return;
 if (!studioSession) { accountDialog();return; }
 const email=studioSession.user.email;
 modal('My cloud projects','<p>Signed in as <strong>'+esc(email)+'</strong></p><div class="fileActions">'+btn('cloud-save','Save current project to cloud','','btn primary')+btn('files','Files')+'</div><label><input id="cloudAuto" type="checkbox" '+(autoEnabled(studioSession.user.id,activeFileId)?'checked':'')+'> Automatically save edits after the first cloud save</label><div id="cloudList" class="fileList"></div><p id="cloudNote" role="status">Loading projects…</p>'+btn('sign-out','Sign out','','chip'));
 $('#cloudAuto').onchange=e=>{localStorage.setItem(autoKey(studioSession.user.id,activeFileId),e.target.checked?'no':'yes');if(e.target.checked)queueCloud()};
 $('[data-cmd=cloud-save]').onclick=()=>cloudTask(saveCloud);
 $('[data-cmd=sign-out]').onclick=()=>cloudTask(async()=>{try{await api('/auth/v1/logout?scope=local','POST',null,studioSession.access_token)}finally{keepSession(null);filesDialog()}});
 const list=$('#cloudList'), note=$('#cloudNote');
 (async()=>{
   const s=await session(), rows=[];let batch;
   do {batch=await api(projectsApi+'?owner_id=eq.'+s.user.id+'&select=project_id,title&order=title,project_id&limit=100&offset='+rows.length,'GET',null,s.access_token);rows.push(...batch)} while(batch.length===100);
   if(!list.isConnected)return;
   list.innerHTML=rows.filter(r=>isFileId(r.project_id)).map(r=>'<button class="fileRow" data-cloud-id="'+r.project_id+'"><span>'+esc(r.title)+'</span><small>Open</small></button>').join('');
   note.textContent=rows.length?'':'No cloud projects yet. Save the current project to see it here.';
   list.onclick=e=>{const id=e.target.closest('[data-cloud-id]')?.dataset.cloudId;if(id)cloudTask(()=>openCloud(id))};
 })().catch(e=>{note.textContent=e.message});
}
function accountDialog(){
 modal('Form Studio account','<p>Use your Personal Ledger app login if you already have one, or create an account with your email.</p><form id="cloudLogin">'+field('Email','<input type="email" id="cloudEmail" required autocomplete="username">')+field('Password','<input type="password" id="cloudPass" required autocomplete="current-password">')+'<div class="fileActions"><button class="btn primary" type="submit">Sign in</button><button class="btn" type="button" id="cloudRegister">Create account</button></div></form><p id="cloudNote" role="status"></p>'+btn('files','Back to files'));
 const form=$('#cloudLogin');
 function authenticate(register){
   if(!form.reportValidity())return;
   const email=$('#cloudEmail').value.trim(),password=$('#cloudPass').value;
   cloudTask(async()=>{
     const account=await api(register?'/auth/v1/signup':'/auth/v1/token?grant_type=password','POST',{email,password});
     if(!account.access_token){$('#cloudNote').textContent='Check your email for confirmation, then return here and sign in.';return}
     keepSession(account);return 'Signed in';
   });
 }
 form.onsubmit=e=>{e.preventDefault();authenticate(false)};$('#cloudRegister').onclick=()=>authenticate(true);
}
async function cloudTask(fn){
 if(cloudBusy)return;cloudBusy=true;
 const controls=$$('.dialog button,.dialog input');controls.forEach(el=>el.disabled=true);
 try{const msg=await fn();if(msg){cloudBusy=false;cloudDialog();toast(msg);queueCloud()}}catch(e){if($('#cloudNote'))$('#cloudNote').textContent=e.message;else toast(e.message)}finally{cloudBusy=false;controls.forEach(el=>el.disabled=false)}
}
async function saveCloud(){
 if(!write())throw Error('Save or download your device changes first.');
 if(autoSending)throw Error('A cloud save is in progress. Try again in a moment.');
 await uploadProject(deviceRecord(activeFileId),await session());return 'Project saved to your personal cloud';
}
async function uploadProject(row,s){
 const owner=s.user.id;
 const base=cloudBase(owner,row.id),revision=crypto.randomUUID();
 if(base.deviceRevision===row.revision)return;
 const body={revision,document:row.document};
 if(base.revision){
   const filter='?owner_id=eq.'+owner+'&project_id=eq.'+row.id+'&revision=eq.'+base.revision+'&select=revision';
   const updated=await api(projectsApi+filter,'PATCH',body,s.access_token,'return=representation');
   if(!updated.length)throw Error('The cloud project changed. Open its latest version below. Your local edits will be kept as a separate project.');
 }else{
   await api(projectsApi,'POST',{...body,owner_id:owner,project_id:row.id},s.access_token,'return=minimal');
 }
 markCloud(owner,row.id,revision,row.revision);return 'Project saved to your personal cloud';
}
async function openCloud(id){
 if(!isFileId(id)||!write())return;
 const s=await session(),owner=s.user.id;
 const rows=await api(projectsApi+'?owner_id=eq.'+owner+'&project_id=eq.'+id+'&select=revision,document','GET',null,s.access_token);
 if(!rows.length)throw Error('This cloud project is unavailable.');
 const remote=rows[0],doc=validateImport(remote.document),local=deviceRecord(id);
 if(local&&JSON.stringify(local.document)!==JSON.stringify(doc)&&cloudBase(owner,id).deviceRevision!==local.revision){
   const backup=clone(local.document);backup.name+=' (device copy)';saveDevice(backup,crypto.randomUUID(),null);
 }
 const next=saveDevice(doc,id,local?.revision||null);markCloud(owner,id,remote.revision,next.revision);
 openRecord(next);toast('Opened from your personal cloud');
}
restoreSession();

// Upload project edits after the project's first cloud save. No background polling.
let autoSending=false;
const autoKey=(owner,id)=>'formstudio.cloud.manual.'+owner+'.'+id;
function autoEnabled(owner,id){return localStorage.getItem(autoKey(owner,id))!=='yes'}
function queueCloud(delay=1300) {
  if(!studioSession||!storageOK)return;
  const owner=studioSession.user.id,id=activeFileId,base=cloudBase(owner,id);
  if(!base.revision||base.deviceRevision===deviceRevision||!autoEnabled(owner,id))return;
  async function send(){
    if(!studioSession||studioSession.user.id!==owner||!autoEnabled(owner,id))return;
    if(autoSending||cloudBusy){setTimeout(send,1200);return}
    autoSending=true;
    try{
      const row=deviceRecord(id);if(!row||cloudBase(owner,id).deviceRevision===row.revision)return;
      await uploadProject(row,await session());
      if(activeFileId===id)$('#saveStatus').textContent='Saved on this device and in cloud';
    }catch(e){
      if(activeFileId===id)$('#saveStatus').textContent='Saved on device · cloud pending';
      if(navigator.onLine&&activeFileId===id)toast(e.message);
    }finally{autoSending=false}
  }
  // A separate timer per project preserves a pending upload when switching files.
  const k=owner+'.'+id;clearTimeout(pendingCloudTimers.get(k));
  pendingCloudTimers.set(k,setTimeout(()=>{pendingCloudTimers.delete(k);send()},delay));
}
const pendingCloudTimers=new Map();
window.addEventListener('online',()=>queueCloud());
