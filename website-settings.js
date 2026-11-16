'use strict';

function openStudioSettings(){
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
   <section><h3>Updates</h3><div class="settingRow"><strong>Studio editor</strong><button class="btn" id="checkUpdate">Check for updates</button></div><p id="updateResult" role="status"></p></section>
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
 el('checkUpdate').onclick=async e=>{
   const button=e.currentTarget;button.disabled=true;
   try{if(!navigator.onLine)throw Error('Connect to the internet to check for updates.');
    const reg=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});await reg.update();
    el('updateResult').textContent=reg.installing||reg.waiting?'Update found. Reopen Form Studio after installation.':'Update check completed.';
    await inspectInstall();
   }catch(err){el('updateResult').textContent=err.message}finally{button.disabled=false}
 };
 dialog.showModal();
 inspectInstall().catch(()=>{el('install').textContent='Offline installation status unavailable.'});
}
