'use strict';
(async function websiteSettings(){
 const el=id=>document.getElementById(id);
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
 el('stored').textContent=String(Object.keys(localStorage).filter(k=>/^formstudio\.project\.[\da-f-]{36}$/i.test(k)).length);
 el('signOutAccount').onclick=siteLogout;
 el('checkCloud').onclick=async e=>{
   const button=e.currentTarget;button.disabled=true;
   try{const s=await session();const result=await studioRequest('projects',{},s.access_token);if(!Array.isArray(result))throw Error('Unexpected response');el('cloudResult').textContent='Connected. Your account can read its cloud project list.'}
   catch(err){el('cloudResult').textContent=err.message}finally{button.disabled=false}
 };
 async function inspectInstall(){
   if(!('serviceWorker' in navigator)){el('install').textContent='Offline app storage unavailable in this browser.';return}
   const reg=await navigator.serviceWorker.getRegistration(new URL('./',location.href));
   el('install').textContent=reg?.active?'Offline app installed in this browser.':'Offline app has not finished installing.';
 }
 el('checkUpdate').onclick=async e=>{
   const button=e.currentTarget;button.disabled=true;
   try{if(!navigator.onLine)throw Error('Connect to the internet to check for updates.');
    const reg=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});await reg.update();
    el('updateResult').textContent=reg.installing||reg.waiting?'Update found. Reopen Form Studio after installation.':'Update check completed.';
    await inspectInstall();
   }catch(err){el('updateResult').textContent=err.message}finally{button.disabled=false}
 };
 try{await inspectInstall()}catch{el('install').textContent='Offline installation status unavailable.'}
})();
