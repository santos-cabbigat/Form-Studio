'use strict';
(async function ownerEntrance(){
 const owner='cabbigatsantos07@gmail.com';
 const screen=document.getElementById('ownerEntrance'), form=screen.querySelector('form'),message=screen.querySelector('[role=status]');
 const submit=form.querySelector('[type=submit]'),create=form.querySelector('[data-create]');
 const verifierKey='formstudio.owner.offline.v1';
 async function proof(password,salt){
   const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
   const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new Uint8Array(salt),iterations:600000,hash:'SHA-256'},key,256);
   return Array.from(new Uint8Array(bits)).join('.');
 }
 async function enter(password){
   if(!navigator.onLine && password){
     const saved=JSON.parse(localStorage.getItem(verifierKey)||'null');
     if(!saved || await proof(password,saved.salt)!==saved.proof)throw Error('Offline unlock requires the password previously verified on this device.');
     keepSession(null);
   }else{
   const s=await session(),user=await api('/auth/v1/user','GET',null,s.access_token);
   if(user.email?.toLowerCase()!==owner||!user.email_confirmed_at){keepSession(null);throw Error('Use the verified owner account to enter Form Studio.')}
   if(password){const salt=Array.from(crypto.getRandomValues(new Uint8Array(16)));const value=await proof(password,salt);try{localStorage.setItem(verifierKey,JSON.stringify({salt,proof:value}))}catch{}}
   }
   for(const tag of document.querySelectorAll('script[data-editor-src]')){
     await new Promise((resolve,reject)=>{const el=document.createElement('script');el.onload=resolve;el.onerror=()=>reject(Error('An editor file could not load. Reload to try again.'));el.src=tag.dataset.editorSrc;document.head.append(el)});
   }
   document.body.classList.remove('locked');screen.remove();
 }
 function busy(on){submit.disabled=create.disabled=on}
 async function login(register){
   if(register && !form.elements.password.value){
     const bytes=crypto.getRandomValues(new Uint8Array(24));
     form.elements.password.value=Array.from(bytes,b=>'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'[b%57]).join('');
     form.elements.password.type='text';
     message.textContent='Save this generated password privately. Press Set up first password again to register it. Existing accounts keep their current password.';
     return;
   }
   if(!form.reportValidity())return;
   const email=form.elements.email.value.trim().toLowerCase(),password=form.elements.password.value;
   if(email!==owner){message.textContent='Use the owner email address.';return}
   busy(true);
   try{
    if(!register&&!navigator.onLine){await enter(password);return}
    const s=await api(register?'/auth/v1/signup':'/auth/v1/token?grant_type=password','POST',{email,password});form.elements.password.value='';
    if(!s.access_token){message.textContent='Check your email for confirmation, then return and sign in. If you already have an account, use its existing password.';return}
    keepSession(s);await enter(password);
   }catch(e){message.textContent=e.message}finally{busy(false)}
 }
 form.onsubmit=e=>{e.preventDefault();return login(false)};create.onclick=()=>login(true);
 if(studioSession){busy(true);try{await enter()}catch(e){message.textContent=e.message}finally{busy(false)}}
})();
