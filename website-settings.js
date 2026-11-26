'use strict';
const STUDIO_RELEASE='drag-guides3';

function activateStudioUpdate(worker){
 const sw=navigator.serviceWorker;
 return new Promise((resolve,reject)=>{
   const listeners=new AbortController();
   const timer=setTimeout(()=>finish(Error('The update is taking longer than expected. Try again.')),20000);
   function finish(error){
     clearTimeout(timer);listeners.abort();
     if(error)reject(error);else resolve();
   }
   function inspect(){
     if(sw.controller===worker)finish();
     else if(worker.state==='redundant')finish(Error('A newer update is available. Check again.'));
   }
   sw.addEventListener('controllerchange',inspect,{signal:listeners.signal});
   worker.addEventListener('statechange',inspect,{signal:listeners.signal});
   try{worker.postMessage({type:'form-studio:apply-update'});inspect()}
   catch{finish(Error('Could not apply the update. Try again.'))}
 });
}

function bindStudioUpdates(dialog){
 const button=dialog.querySelector('#checkUpdate'),status=dialog.querySelector('#updateResult');
 const sw=navigator.serviceWorker;
 if(!sw){button.disabled=true;status.textContent='This browser does not support editor updates.';return}
 const lifetime=new AbortController(),listeners={signal:lifetime.signal};
 const scope=new URL('./',location.href).href;
 let registration,installing,checking=false,applying=false,checked=false,error='';
 const changed=()=>Boolean(studioDocumentWorker&&sw.controller&&sw.controller!==studioDocumentWorker);
 function render(){
   const available=Boolean(registration?.waiting||changed());
   const downloading=Boolean(registration?.installing);
   button.classList.toggle('primary',available);
   button.disabled=applying||(!available&&(checking||downloading||!navigator.onLine));
   button.textContent=applying?'Updating…':available?'Update now':downloading?'Downloading…':checking?'Checking…':'Check for updates';
   status.textContent=error||(applying?'Applying the update…':available?'A new version is ready.':
     downloading?(registration.active?'Downloading the new version…':'Preparing offline access…'):
     !navigator.onLine?'Connect to check for updates.':checking?'Checking for a new version…':checked?'Form Studio is up to date.':'');
 }
 function watchInstall(){
   const worker=registration?.installing;
   if(worker&&worker!==installing){
     installing=worker;error='';
     worker.addEventListener('statechange',()=>{
       if(worker===installing&&worker.state==='redundant'&&!registration.waiting&&!changed()){
         error='The download did not finish. Check for updates to try again.';
       }
       render();
     },listeners);
   }
   render();
 }
 function watch(reg){
   if(reg?.scope!==scope||lifetime.signal.aborted)return;
   if(registration!==reg){
     registration=reg;reg.addEventListener('updatefound',watchInstall,listeners);
   }
   watchInstall();
 }
 function savedForUpdate(){
   if(dirtyDrafts.size)saveCodeDrafts();
   if(storageOK&&!dirtyDrafts.size)return true;
   error='Save your project or code draft before updating.';render();return false;
 }
 sw.addEventListener('controllerchange',render,listeners);
 for(const event of ['online','offline'])window.addEventListener(event,render,listeners);
 dialog.addEventListener('close',()=>lifetime.abort(),{once:true});
 button.onclick=async()=>{
   error='';
   const waiting=registration?.waiting;
   if(waiting||changed()){
     if(!savedForUpdate())return;
     applying=true;render();
     try{
       if(waiting)await activateStudioUpdate(waiting);
       if(savedForUpdate())location.reload();
     }catch(err){error=err.message}
     finally{applying=false;render()}
     return;
   }
   checking=true;render();
   try{
     const reg=await sw.register(new URL('sw.js',scope),{scope,updateViaCache:'none'});
     watch(reg);
     if(!reg.installing&&!reg.waiting)await reg.update();
     checked=true;
   }catch{error='Could not check for updates. Check your connection and try again.'}
   finally{checking=false;watchInstall()}
 };
 render();
 sw.getRegistration(scope).then(watch).catch(()=>{});
}

function deviceSettingsMarkup(){
 return '<section id="deviceSizeSettings"><h3>Device canvas sizes</h3><p>Use the same device size across this project’s screens and previews. Longer content scrolls. Popup windows appear inside the same device frame.</p><form id="deviceSizeForm"><div class="deviceSizeGrid"><b>Device</b><b>Width (px)</b><b>Height (px)</b>'+Object.keys(devices).map(d=>'<label for="deviceWidth-'+d+'">'+esc(cap(d))+'</label><select id="deviceWidth-'+d+'" data-device-width="'+d+'" aria-label="'+cap(d)+' width">'+options(sizes[d].map(v=>[String(v),String(v)]),String(project.widths[d]))+'</select><input type="number" data-device-height="'+d+'" aria-label="'+cap(d)+' height" required min="240" max="4000" step="1" value="'+deviceViewport(project,d)[1]+'">').join('')+'</div><div class="row"><button class="btn" type="button" id="resetDeviceSizes">Reset to defaults</button><button class="btn primary" type="submit">Apply sizes</button></div><p id="deviceSizeResult" role="status"></p></form></section>';
}

function bindDeviceSettings(dialog){
 const form=dialog.querySelector('#deviceSizeForm'),note=dialog.querySelector('#deviceSizeResult');
 dialog.querySelector('#resetDeviceSizes').onclick=()=>{
  for(const input of form.querySelectorAll('[data-device-width]'))input.value=devices[input.dataset.deviceWidth][0];
  for(const input of form.querySelectorAll('[data-device-height]'))input.value=devices[input.dataset.deviceHeight][1];
  note.textContent='Default sizes loaded. Choose Apply sizes to save.';
 };
 form.onsubmit=e=>{
  e.preventDefault();if(!form.reportValidity())return;
  const widths=Object.fromEntries([...form.querySelectorAll('[data-device-width]')].map(input=>[input.dataset.deviceWidth,Number(input.value)]));
  const heights=Object.fromEntries([...form.querySelectorAll('[data-device-height]')].map(input=>[input.dataset.deviceHeight,Number(input.value)]));
  if(!validViewportHeights(heights))return;
  change(()=>{project.widths=widths;project.viewportHeights=heights},'Device sizes saved');
  note.textContent=storageOK?'Device sizes saved for every screen in this project.':'The sizes could not be saved. Download a project copy.';
 };
}

function openStudioSettings(section=''){
 if(document.getElementById('studioSettings'))return;
 const dialog=document.createElement('dialog');
 dialog.id='studioSettings';
 dialog.setAttribute('aria-labelledby','settingsTitle');
 dialog.innerHTML=`
  <header class="settingsHeader">
   <div><span>Form Studio</span><h2 id="settingsTitle">Settings</h2></div>
   <form method="dialog"><button class="btn smallBtn" autofocus>Close</button></form>
  </header>
  <div class="settingsBody">
   <section><h3>Account</h3><div class="settingRow"><div><strong>Studio owner</strong><p id="identity"></p></div><button class="btn" id="signOutAccount">Sign out</button></div></section>
   <section><h3>Sign-in preferences</h3>
    <label class="settingRow"><span><strong>Remember my email</strong><small>Fill in the email on this browser’s sign-in page.</small></span><input type="checkbox" id="rememberEmail" role="switch"></label>
    <label class="settingRow"><span><strong>Allow offline unlock</strong><small>Use your Studio password on this device while offline.</small></span><input type="checkbox" id="allowOffline" role="switch"></label><p id="offlineHint" role="status"></p>
   </section>
   <section><h3>Storage and connection</h3>
    <div class="settingRow"><div><strong>Projects on this device</strong><p id="install"></p></div><b id="stored"></b></div>
    <div class="settingRow"><div><strong>Cloud connection</strong><p id="network"></p></div><button class="btn" id="checkCloud">Check connection</button></div><p id="cloudResult" role="status"></p>
   </section>
   ${deviceSettingsMarkup()}
   <section><h3>Updates</h3><div class="settingRow"><div><strong>Studio editor</strong><p>Release: ${STUDIO_RELEASE}</p></div><button class="btn" id="checkUpdate">Check for updates</button></div><p id="updateResult" role="status"></p></section>
  </div>`;
 document.body.append(dialog);
 const el=id=>dialog.querySelector('#'+id);
 const enabledKey='formstudio.allowOfflineUnlock', verifier='formstudio.owner.offline.v2';
 const remember='formstudio.rememberEmail';
 el('identity').textContent=studioSession?.user.email||'Unlocked offline on this device';
 el('rememberEmail').checked=localStorage.getItem(remember)==='yes';
 el('allowOffline').checked=localStorage.getItem(enabledKey)!=='no';
 el('rememberEmail').onchange=e=>localStorage.setItem(remember,e.target.checked?'yes':'no');
 el('allowOffline').onchange=e=>{
   localStorage.setItem(enabledKey,e.target.checked?'yes':'no');
   if(!e.target.checked)localStorage.removeItem(verifier);
   el('offlineHint').textContent=e.target.checked?'Sign in online with your password to prepare offline unlock.':'Offline password unlock is disabled on this browser.';
 };
 const net=()=>{el('network').textContent=navigator.onLine?'Online':'Offline'};
 net();window.addEventListener('online',net);window.addEventListener('offline',net);
 dialog.addEventListener('keydown',event=>event.stopPropagation());
 dialog.addEventListener('close',()=>{
   window.removeEventListener('online',net);window.removeEventListener('offline',net);
   if(location.hash==='#settings')window.history.replaceState(window.history.state,'',location.pathname+location.search);
   dialog.remove();
 });
 el('stored').textContent=String(Object.keys(localStorage).filter(k=>/^formstudio\.project\.[\da-f-]{36}$/i.test(k)).length);
 el('signOutAccount').onclick=siteLogout;
 el('checkCloud').onclick=async e=>{
   const button=e.currentTarget;button.disabled=true;
   try{const s=await session();const result=await studioRequest('projects',{},s.access_token);if(!Array.isArray(result))throw Error('Unexpected response');el('cloudResult').textContent='Connected to your cloud projects.'}
   catch(err){el('cloudResult').textContent=err.message}finally{button.disabled=false}
 };
 async function inspectInstall(){
   if(!('serviceWorker' in navigator)){el('install').textContent='Offline app storage unavailable in this browser.';return}
   const reg=await navigator.serviceWorker.getRegistration(new URL('./',location.href));
   el('install').textContent=reg?.active?'Offline editor installed.':'Offline editor installation is pending.';
 }
 bindStudioUpdates(dialog);
 bindDeviceSettings(dialog);
 dialog.showModal();
 if(section==='devices')dialog.querySelector('#deviceSizeSettings').scrollIntoView({block:'center'});
 inspectInstall().catch(()=>{el('install').textContent='Offline installation status unavailable.'});
}
