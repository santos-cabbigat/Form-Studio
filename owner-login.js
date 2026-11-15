'use strict';
(async function ownerEntrance(){
 const owner='cabbigatsantos07@gmail.com';
 const screen=document.getElementById('ownerEntrance'),form=screen.querySelector('form'),fields=form.elements;
 const message=screen.querySelector('[role=status]'),submit=form.querySelector('[type=submit]');
 const verifierKey='formstudio.owner.offline.v2';
 const codeLabel=document.getElementById('accessCodeLabel'),repeat=document.getElementById('repeatLabel');
 const modeButtons=[...form.querySelectorAll('[data-auth]')];
 let mode='login',loading=false,setupTicket='';
 if(navigator.onLine && 'serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(()=>{});
 localStorage.removeItem('formstudio.owner.offline.v1');
 if(localStorage.getItem('formstudio.rememberEmail')==='yes')fields.email.value=owner;
 const eyeButtons=[...form.querySelectorAll('[data-eye]')];
 function setVisible(button,visible){
   const field=fields[button.dataset.eye];
   field.type=visible?'text':'password';
   button.setAttribute('aria-pressed',String(visible));
   button.setAttribute('aria-label',visible?'Hide password':'Show password');
 }
 for(const button of eyeButtons){
   button.onmousedown=e=>e.preventDefault();
   button.onclick=()=>setVisible(button,fields[button.dataset.eye].type==='password');
 }
 function choose(next){
   mode=next;const create=next!=='login';const setup=next==='setup';
   fields.code.value=fields.password.value=fields.confirm.value='';message.textContent='';
   const recovery=next==='recover';
   codeLabel.hidden=!recovery;
   fields.code.required=recovery;
   repeat.hidden=!create;
   fields.confirm.required=create;
   document.getElementById('ownerEmailLabel').hidden=setup;
   if(setup)fields.email.value=owner;
   if(!setup)setupTicket='';
   document.getElementById('pwdLabel').textContent=create?'New Studio password':'Studio password';
   fields.password.autocomplete=create?'new-password':'current-password';fields.password.minLength=create?8:1;
   submit.textContent=create?(setup?'Create Studio password':'Reset Studio password'):'Sign in';
   document.getElementById('accessModes').hidden=true;
   for(const button of eyeButtons)setVisible(button,false);
   document.getElementById('authHint').hidden=!create;
   form.querySelector('h1').textContent=create?(setup?'Set up Studio password':'Recover Studio password'):'Oon Jai Form Studio';
   for(const b of modeButtons)b.hidden=b.dataset.auth!=='login'||!create;
 }
 function route(){
   const fragment=location.hash.slice(1);
   const ticket=/^setup=([a-zA-Z0-9_-]{24,128})$/.exec(fragment);
   if(ticket){
     setupTicket=ticket[1];
     window.history.replaceState(window.history.state,'',location.pathname+location.search+'#setup');
   }
   if((ticket||fragment==='setup') && setupTicket){
     choose('setup');
   }else if(fragment==='setup'){
     choose('login');
     message.textContent='For first-time setup, open your private Studio setup link.';
   }else{
     choose(fragment==='recover'?'recover':'login');
   }
 }
 for(const b of modeButtons)b.onclick=()=>{
   window.history.replaceState(window.history.state,'',location.pathname+location.search+(b.dataset.auth==='login'?'':'#'+b.dataset.auth));
   route();
   (mode==='setup'?fields.password:mode==='recover'&&fields.email.value?fields.code:fields.email).focus();
 };
 route();
 window.addEventListener('hashchange',()=>{if(screen.isConnected&&!loading&&!submit.disabled&&document.getElementById('recoveryReceipt').hidden)route()});
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
   busy(true);for(const button of eyeButtons)setVisible(button,false);message.textContent='Checking…';
   try{
     if(!navigator.onLine){
       if(create)throw Error('Connect to the internet to set up or recover your password.');
       const saved=JSON.parse(localStorage.getItem(verifierKey)||'null');
       if(localStorage.getItem('formstudio.allowOfflineUnlock')==='no'||!saved||await proof(password,saved.salt)!==saved.proof)
         throw Error('Offline unlock needs the Studio password previously verified in this browser.');
       keepSession(null);await openEditor();return;
     }
     const result=await studioRequest(mode,{email:owner,password,...(create?{code:mode==='setup'?setupTicket:fields.code.value.trim()}: {})});
     const {recovery_code,...sessionData}=result;
     if(!sessionData.access_token||sessionData.user?.email!==owner)throw Error('Sign-in did not return your Studio account.');
     setupTicket='';
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
   }catch(err){
     message.textContent=mode==='setup' && /credentials|codes also expire/i.test(err.message)
       ?'This setup link is invalid or has expired. Request a new private Studio setup link.':err.message;
     if(mode==='login' && navigator.onLine && /set up studio password first|check your credentials/i.test(err.message)){
       const action=/set up studio password first/i.test(err.message)?'setup':'recover';
       if(action==='setup'){
         message.textContent='Open your private Studio setup link to choose your first password.';
         return;
       }
       document.getElementById('accessModes').hidden=false;
       for(const b of modeButtons)b.hidden=b.dataset.auth!==action;
     }
   }finally{busy(false)}
 };
 if(studioSession&&navigator.onLine){
   busy(true);try{const s=await session();const user=await studioRequest('verify',{},s.access_token);
     if(user.email!==owner)throw Error('Use the Studio owner account.');await openEditor()
   }catch(err){message.textContent=err.message}finally{busy(false)}
 }
})();
