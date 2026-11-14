'use strict';
const personalApi='https://uyyihuvjbrbsombzzvqw.supabase.co';
const studioPublicKey='sb_publishable_VwYzs5ihi9tR_r1wcfCo-w_mboqCHV_';
let studioSession=null, cloudBusy=false;
const sessionKey='formstudio.owner.session.v2';
function restoreSession(){
 try{sessionStorage.removeItem('formstudio.personal.session');const s=JSON.parse(sessionStorage.getItem(sessionKey));if(s?.user?.id && s.access_token && s.expires_at*1000>Date.now())studioSession=s}catch{}
}
function keepSession(s){
 studioSession=s;
 try{if(s)sessionStorage.setItem(sessionKey,JSON.stringify(s));else sessionStorage.removeItem(sessionKey)}catch{}
}
async function studioRequest(op,args={},token=null){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
 let res,data;
 try{
   res=await fetch(personalApi+'/rest/v1/rpc/form_studio_access',{method:'POST',
     headers:{apikey:studioPublicKey,'Content-Type':'application/json'},credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',
     signal:controller.signal,body:JSON.stringify({op,args:token?{...args,token}:args})});
   data=await res.json();
 }catch{throw Object.assign(Error('Could not reach Form Studio. Check your connection and try again.'),{retryable:true})}
 finally{clearTimeout(timer)}
 if(!res.ok||data?.error){
   const status=data?.status||res.status;
   if(status===401 && token && token===studioSession?.access_token)keepSession(null);
   throw Object.assign(Error(data?.error||'Studio service returned '+status+'.'),{status,retryable:status>=500||status===429});
 }
 return data;
}
async function session(){
 if(!studioSession||studioSession.expires_at*1000<=Date.now()){keepSession(null);throw Error('Sign in to Form Studio again to use cloud storage.')}
 return studioSession;
}
function cloudBase(owner,id){
 const key='formstudio.cloud.base.'+owner+'.'+id;
 return JSON.parse(localStorage.getItem(key)) || {revision:id===legacyFileId?localStorage.getItem('formstudio.cloud.revision.'+owner):null};
}
function saveCloudBase(owner,id,base){localStorage.setItem('formstudio.cloud.base.'+owner+'.'+id,JSON.stringify(base))}
function markCloud(owner,id,revision,deviceRevision){saveCloudBase(owner,id,{revision,deviceRevision})}
const conflictMessage='The cloud project changed. Open its latest version below. Your local edits will be kept as a separate project.';
function refreshCloudStatus(owner=studioSession?.user.id,id=activeFileId){
 if(!owner||id!==activeFileId||!storageOK||studioSession?.user.id!==owner)return;
 const base=cloudBase(owner,id),status=$('#saveStatus');
 if(!base.revision&&!base.requested&&!base.attempt)return;
 if(base.conflict)status.textContent='Saved on device · cloud conflict';
 else if(base.deviceRevision===deviceRevision)status.textContent='Saved on this device and in cloud';
 else if(base.manualRevision&&!base.snapshot&&base.manualRevision!==deviceRevision)status.textContent='Saved on device · save new version to cloud';
 else if(base.snapshot&&base.snapshot.revision!==deviceRevision)status.textContent='Saved on device · earlier version queued for cloud';
 else if(!base.requested&&!autoEnabled(owner,id))status.textContent='Saved on device · manual cloud save';
 else status.textContent=navigator.onLine?'Saved on device · cloud pending':'Saved on device · cloud pending until online';
}
function cloudDialog() {
 if (cloudBusy) return;
 if (!studioSession) { accountDialog();return; }
 const email=studioSession.user.email;
 modal('My cloud projects','<p>Signed in as <strong>'+esc(email)+'</strong></p><div class="fileActions">'+btn('cloud-save','Save current project to cloud','','btn primary')+btn('files','Files')+'</div><label><input id="cloudAuto" type="checkbox" '+(autoEnabled(studioSession.user.id,activeFileId)?'checked':'')+'> Automatically save edits after the first cloud save</label><div id="cloudList" class="fileList"></div><p id="cloudNote" role="status">Loading projects…</p>'+btn('sign-out','Sign out','','chip'));
 $('#cloudAuto').onchange=e=>{
   const owner=studioSession.user.id,key=autoKey(owner,activeFileId);
   if(e.target.checked)localStorage.removeItem(key);
   else{
     const base=cloudBase(owner,activeFileId);
     if(base.requested&&!base.snapshot){const row=deviceRecord(activeFileId);saveCloudBase(owner,activeFileId,{...base,snapshot:{revision:row.revision,document:row.document}})}
     localStorage.setItem(key,'yes');
   }
   queueCloud();
 };
 $('[data-cmd=cloud-save]').onclick=()=>cloudTask(saveCloud);
 $('[data-cmd=sign-out]').onclick=siteLogout;
 const list=$('#cloudList'), note=$('#cloudNote');
 if(!navigator.onLine){note.textContent='Offline. You can keep editing on this device or queue a cloud save for when you reconnect.';return}
 (async()=>{
   const s=await session(), rows=[];let batch;
   do {batch=await studioRequest('projects',{offset:rows.length},s.access_token);rows.push(...batch)} while(batch.length===100);
   if(!list.isConnected)return;
   list.innerHTML=rows.filter(r=>isFileId(r.project_id)).map(r=>'<button class="fileRow" data-cloud-id="'+r.project_id+'"><span>'+esc(r.title)+'</span><small>Open</small></button>').join('');
   note.textContent=rows.length?'':'No cloud projects yet. Save the current project to see it here.';
   list.onclick=e=>{const id=e.target.closest('[data-cloud-id]')?.dataset.cloudId;if(id)cloudTask(()=>openCloud(id))};
 })().catch(e=>{note.textContent=e.message});
}
function accountDialog(){
 modal('Cloud sign-in','<p>Sign in online from the Form Studio entrance to access cloud projects.</p><a href="./">Form Studio sign-in</a>');
}
async function cloudTask(fn){
 if(cloudBusy)return;cloudBusy=true;
 const controls=$$('.dialog button,.dialog input');controls.forEach(el=>el.disabled=true);
 try{const msg=await fn();if(msg){cloudBusy=false;cloudDialog();toast(msg);resumeCloudSaves()}}catch(e){if($('#cloudNote'))$('#cloudNote').textContent=e.message;else toast(e.message)}finally{cloudBusy=false;controls.forEach(el=>el.disabled=false)}
}
async function saveCloud(){
 if(!write())throw Error('Save or download your device changes first.');
 const id=activeFileId,owner=studioSession?.user.id,row=deviceRecord(id);
 if(!owner)throw Error('Sign in to Form Studio to save to your cloud.');
 await uploadFinished;
 return withUploadLock(owner,id,async()=>{
   if(studioSession?.user.id!==owner)throw Error('The signed-in account changed. Try again.');
   const base=cloudBase(owner,id);
   if(base.deviceRevision===row.revision&&!base.attempt&&!base.conflict){
     if(base.requested)markCloud(owner,id,base.revision,row.revision);
     refreshCloudStatus(owner,id);return 'This version is already saved to your personal cloud';
   }
   const snapshot=autoEnabled(owner,id)?null:{revision:row.revision,document:row.document};
   const request={...base,conflict:false,requested:true,manualRevision:snapshot?.revision||null,snapshot};
   try{saveCloudBase(owner,id,request)}
   catch(e){
     if(e.name!=='QuotaExceededError'||!snapshot)throw e;
     if(!navigator.onLine)throw Error('Your device copy is saved. Browser storage is full. Connect, then use Save current project to cloud, or export a backup from Files.');
     // A manual save can still be sent immediately if local storage cannot fit a second full copy.
     saveCloudBase(owner,id,{...request,snapshot:null});
   }
   refreshCloudStatus(owner,id);
   if(!navigator.onLine)return 'Saved on this device. Your cloud save is queued.';
   try{
     await transferProject(row,await session());refreshCloudStatus(owner,id);return 'Project saved to your personal cloud';
   }catch(e){
     refreshCloudStatus(owner,id);
     if(e.retryable){queueCloud(2500,id);return 'Saved on this device. Cloud save pending.'}
     throw e;
   }
 });
}
function withUploadLock(owner,id,fn){
 if(typeof navigator!=='undefined'&&navigator.locks?.request)
   return navigator.locks.request('formstudio.upload.'+owner+'.'+id,fn);
 return fn();
}
function uploadProject(row,s){return withUploadLock(s.user.id,row.id,()=>transferProject(row,s))}
async function transferProject(row,s){
 const owner=s.user.id,id=row.id;
 if(studioSession?.user.id!==owner)throw Error('The signed-in account changed. Try again.');
 let base=cloudBase(owner,id);
 function conflict(){
   saveCloudBase(owner,id,{...cloudBase(owner,id),conflict:true});
   throw Error(conflictMessage);
 }
 // An interrupted request can have reached Postgres before the browser received its reply.
 // The device revision identifies that exact snapshot across retries and browser restarts.
 if(base.attempt){
   const found=await studioRequest('revision',{id},s.access_token);
   const revision=found[0]?.revision||null;
   if(revision===base.attempt){
     base={...base,revision,deviceRevision:revision,attempt:null};saveCloudBase(owner,id,base);
   }else if(revision!==(base.revision||null))conflict();
 }
 // An explicit save in manual mode refers to exactly the revision chosen, even if other edits arrive before reconnect.
 row=base.snapshot||(base.manualRevision===row.revision?row:deviceRecord(id)||row);
 if(base.manualRevision&&row.revision!==base.manualRevision)throw Error('A newer device edit replaced the queued version. Save current project to cloud to choose the new version.');
 if(studioSession?.user.id!==owner)throw Error('The signed-in account changed. Try again.');
 if(base.deviceRevision===row.revision){if(base.requested||base.attempt)markCloud(owner,id,base.revision,row.revision);return}
 const revision=row.revision,body={revision,document:row.document};
 saveCloudBase(owner,id,{...base,attempt:revision});
 try{await studioRequest('save',{id,...body,expected:base.revision||null},s.access_token)}
 catch(e){if(e.status===409)conflict();throw e}
 markCloud(owner,id,revision,row.revision);return 'Project saved to your personal cloud';
}
async function openCloud(id){
 if(!isFileId(id)||!write())return;
 const originFile=activeFileId,dialog=$('.dialog');await uploadFinished;
 const s=await session(),owner=s.user.id;
 const rows=await studioRequest('project',{id},s.access_token);
 if(studioSession?.user.id!==owner||activeFileId!==originFile||!dialog?.isConnected)return;
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
let autoSending=false,uploadFinished=Promise.resolve();
const autoKey=(owner,id)=>'formstudio.cloud.manual.'+owner+'.'+id;
function autoEnabled(owner,id){return localStorage.getItem(autoKey(owner,id))!=='yes'}
function queueCloud(delay=1300,id=activeFileId,retries=0) {
  if(!studioSession||!storageOK)return;
  const owner=studioSession.user.id,base=cloudBase(owner,id);
  refreshCloudStatus(owner,id);
  if(base.conflict||(!base.requested&&(!base.revision||!autoEnabled(owner,id)))||!navigator.onLine)return;
  const local=deviceRecord(id);if(!local||(!base.requested&&base.deviceRevision===local.revision))return;
  async function send(){
    if(studioSession?.user.id!==owner||!navigator.onLine)return;
    const current=cloudBase(owner,id);
    if(current.conflict||!current.requested&&!autoEnabled(owner,id))return;
    if(autoSending||cloudBusy){queueCloud(1200,id,retries);return}
    autoSending=true;let finishUpload;uploadFinished=new Promise(done=>{finishUpload=done});
    try{
      const row=deviceRecord(id);if(!row)return;
      await uploadProject(row,await session());refreshCloudStatus(owner,id);
      if(studioSession?.user.id===owner&&autoEnabled(owner,id)&&deviceRecord(id)?.revision!==cloudBase(owner,id).deviceRevision)queueCloud(1300,id);
    }catch(e){
      if(studioSession?.user.id===owner){
        refreshCloudStatus(owner,id);
        if(e.retryable&&navigator.onLine&&retries<5)queueCloud(2500*2**retries,id,retries+1);
        if(activeFileId===id&&!retries&&navigator.onLine)toast(e.message);
      }
    }finally{autoSending=false;finishUpload()}
  }
  const k=owner+'.'+id;clearTimeout(pendingCloudTimers.get(k));
  pendingCloudTimers.set(k,setTimeout(()=>{pendingCloudTimers.delete(k);send()},delay));
}
const pendingCloudTimers=new Map();
function resumeCloudSaves(){
 if(!studioSession||!storageOK)return;
 refreshCloudStatus(studioSession.user.id,activeFileId);
 if(!navigator.onLine)return;
 const prefix='formstudio.cloud.base.'+studioSession.user.id+'.';
 const ids=new Set([activeFileId,...Object.keys(localStorage).filter(k=>k.startsWith(prefix)).map(k=>k.slice(prefix.length))]);
 for(const id of ids)if(isFileId(id))queueCloud(1300,id);
}
window.addEventListener('online',()=>{if(document.getElementById('stage')&&!document.body.classList.contains('locked'))resumeCloudSaves()});
window.addEventListener('offline',()=>{if(document.getElementById('stage')&&studioSession&&!document.body.classList.contains('locked'))refreshCloudStatus(studioSession.user.id,activeFileId)});

async function siteLogout(){
 const token=studioSession?.access_token;
 keepSession(null);
 if(token && navigator.onLine)await studioRequest('logout',{},token).catch(()=>{});
 location.reload();
}
