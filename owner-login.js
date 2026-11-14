'use strict';
(async function ownerEntrance(){
 const owner='cabbigatsantos07@gmail.com';
 const screen=document.getElementById('ownerEntrance'), form=screen.querySelector('form'),message=screen.querySelector('[role=status]');
 const submit=form.querySelector('[type=submit]');
 const verifierKey='formstudio.owner.offline.v1';
 if(localStorage.getItem('formstudio.rememberEmail')==='yes')form.elements.email.value=owner;
 async function proof(password,salt){
   const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
   const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new Uint8Array(salt),iterations:600000,hash:'SHA-256'},key,256);
   return Array.from(new Uint8Array(bits)).join('.');
 }
 async function enter(password){
   if(!navigator.onLine && password){
     if(localStorage.getItem('formstudio.allowOfflineUnlock')==='no')throw Error('Offline unlock is disabled in Website settings.');
     const saved=JSON.parse(localStorage.getItem(verifierKey)||'null');
     if(!saved || await proof(password,saved.salt)!==saved.proof)throw Error('Offline unlock requires the password previously verified on this device.');
     keepSession(null);
   }else{
   const s=await session(),user=await api('/auth/v1/user','GET',null,s.access_token);
   if(user.email?.toLowerCase()!==owner||!user.email_confirmed_at){keepSession(null);throw Error('Use the verified owner account to enter Form Studio.')}
   if(password && localStorage.getItem('formstudio.allowOfflineUnlock')!=='no'){const salt=Array.from(crypto.getRandomValues(new Uint8Array(16)));const value=await proof(password,salt);try{localStorage.setItem(verifierKey,JSON.stringify({salt,proof:value}))}catch{}}
   }
   for(const tag of document.querySelectorAll('script[data-editor-src]')){
     await new Promise((resolve,reject)=>{const el=document.createElement('script');el.onload=resolve;el.onerror=()=>reject(Error('An editor file could not load. Reload to try again.'));el.src=tag.dataset.editorSrc;document.head.append(el)});
   }
   document.body.classList.remove('locked');screen.remove();
 }
 function busy(on){submit.disabled=on}
 async function login(){
   if(!form.reportValidity())return;
   const email=form.elements.email.value.trim().toLowerCase(),password=form.elements.password.value;
   if(email!==owner){message.textContent='Use the owner email address.';return}
   busy(true);
   try{
    if(!navigator.onLine){await enter(password);return}
    const s=await api('/auth/v1/token?grant_type=password','POST',{email,password});form.elements.password.value='';
    if(!s.access_token){message.textContent='Sign-in did not return a session.';return}
    keepSession(s);await enter(password);
   }catch(e){message.textContent=e.message}finally{busy(false)}
 }
 form.onsubmit=e=>{e.preventDefault();return login()};
 if(studioSession){busy(true);try{await enter()}catch(e){message.textContent=e.message}finally{busy(false)}}
})();
