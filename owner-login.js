'use strict';
(async function ownerEntrance(){
 const owner='cabbigatsantos07@gmail.com';
 const screen=document.getElementById('ownerEntrance'),form=screen.querySelector('form'),fields=form.elements;
 const message=screen.querySelector('[role=status]'),submit=form.querySelector('[type=submit]');
 const verifierKey='formstudio.owner.offline.v2';
 const codeLabel=document.getElementById('accessCodeLabel'),repeat=document.getElementById('repeatLabel');
 const modeButtons=[...form.querySelectorAll('[data-auth]')];
 let mode='login',loading=false;
 if(navigator.onLine && 'serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(()=>{});
 localStorage.removeItem('formstudio.owner.offline.v1');
 if(localStorage.getItem('formstudio.rememberEmail')==='yes')fields.email.value=owner;
 function choose(next){
   mode=next;const create=next!=='login';const setup=next==='setup';
   fields.code.value=fields.password.value=fields.confirm.value='';message.textContent='';
   codeLabel.hidden=repeat.hidden=!create;fields.code.required=fields.confirm.required=create;
   codeLabel.firstChild.textContent=setup?'One-time setup code':'Private recovery code';
   document.getElementById('pwdLabel').textContent=create?'New Studio password':'Studio password';
   fields.password.autocomplete=create?'new-password':'current-password';fields.password.minLength=create?12:1;
   submit.textContent=create?(setup?'Create Studio password':'Reset Studio password'):'Sign in';
   document.getElementById('authHint').textContent=create?'Enter the private code and choose a Studio password with at least 12 characters.':'Use your Form Studio password. First visit? Choose Set up Studio password.';
   for(const b of modeButtons)b.hidden=b.dataset.auth===next;
 }
 for(const b of modeButtons)b.onclick=()=>choose(b.dataset.auth);
 async function proof(password,salt){
   const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
   const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new Uint8Array(salt),iterations:600000,hash:'SHA-256'},key,256);
   return Array.from(new Uint8Array(bits)).join('.');
 }
 async function remember(password){
   if(localStorage.getItem('formstudio.allowOfflineUnlock')==='no')return;
   const salt=Array.from(crypto.getRandomValues(new Uint8Array(16)));
   try{localStorage.setItem(verifierKey,JSON.stringify({salt,proof:await proof(password,salt)}))}catch{}
 }
 async function openEditor(){
   if(loading)return;
   loading=true;
   try{
     for(const tag of document.querySelectorAll('script[data-editor-src]')){
       if(tag.dataset.loaded)continue;
       await new Promise((resolve,reject)=>{const el=document.createElement('script');el.onload=resolve;el.onerror=()=>reject(Error('A Studio file could not load. Reconnect and try again.'));el.src=tag.dataset.editorSrc;document.head.append(el)});
       tag.dataset.loaded='yes';
     }
     document.body.classList.remove('locked');screen.remove();
   }finally{loading=false}
 }
 function busy(value){submit.disabled=value;for(const b of modeButtons)b.disabled=value}
 form.onsubmit=async e=>{
   e.preventDefault();if(!form.reportValidity()||submit.disabled)return;
   if(fields.email.value.trim().toLowerCase()!==owner){message.textContent='Enter the Studio owner email.';return}
   const password=fields.password.value,create=mode!=='login';
   if(create && password!==fields.confirm.value){message.textContent='Enter the same new password twice.';return}
   busy(true);message.textContent='Checking…';
   try{
     if(!navigator.onLine){
       if(create)throw Error('Connect to the internet to set up or recover your password.');
       const saved=JSON.parse(localStorage.getItem(verifierKey)||'null');
       if(localStorage.getItem('formstudio.allowOfflineUnlock')==='no'||!saved||await proof(password,saved.salt)!==saved.proof)
         throw Error('Offline unlock needs the Studio password previously verified in this browser.');
       keepSession(null);await openEditor();return;
     }
     const result=await studioRequest(mode,{email:owner,password,...(create?{code:fields.code.value.trim()}: {})});
     const {recovery_code,...sessionData}=result;
     if(!sessionData.access_token||sessionData.user?.email!==owner)throw Error('Sign-in did not return your Studio account.');
     await remember(password);fields.password.value=fields.confirm.value=fields.code.value='';
     if(recovery_code){
       for(const child of form.children)child.hidden=true;
       const receipt=document.getElementById('recoveryReceipt');receipt.hidden=false;
       receipt.querySelector('output').textContent=recovery_code;
       document.getElementById('finishAccess').onclick=async()=>{
         keepSession(sessionData);
         try{await openEditor()}catch(err){message.hidden=false;message.textContent=err.message}
       };
     }else{keepSession(sessionData);await openEditor()}
   }catch(err){message.textContent=err.message}finally{busy(false)}
 };
 if(studioSession&&navigator.onLine){
   busy(true);try{const s=await session();const user=await studioRequest('verify',{},s.access_token);
     if(user.email!==owner)throw Error('Use the Studio owner account.');await openEditor()
   }catch(err){message.textContent=err.message}finally{busy(false)}
 }
})();
