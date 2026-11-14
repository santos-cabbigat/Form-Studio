'use strict';
const personalApi='https://uyyihuvjbrbsombzzvqw.supabase.co';
const studioPublicKey='sb_publishable_VwYzs5ihi9tR_r1wcfCo-w_mboqCHV_';
let studioSession=null, cloudBusy=false;
const revisionKey=id=>'formstudio.cloud.revision.'+id;
const sessionKey='formstudio.personal.session';
function restoreSession(){try{const s=JSON.parse(sessionStorage.getItem(sessionKey));if(s?.user?.id&&s.refresh_token)studioSession=s}catch{}}
function keepSession(s){studioSession=s;try{if(s)sessionStorage.setItem(sessionKey,JSON.stringify(s));else sessionStorage.removeItem(sessionKey)}catch{}}
function revision(id,value){
 try{if(value!==undefined)localStorage.setItem(revisionKey(id),value);return localStorage.getItem(revisionKey(id))}catch{return null}
}
async function api(path,method='GET',body=null,token=null,prefer=null){
 const headers={apikey:studioPublicKey,'Content-Type':'application/json'};
 if(token)headers.Authorization='Bearer '+token;if(prefer)headers.Prefer=prefer;
 const res=await fetch(personalApi+path,{method,headers,body:body===null?undefined:JSON.stringify(body),cache:'no-store',referrerPolicy:'no-referrer'});
 const text=await res.text();let data;try{data=text?JSON.parse(text):null}catch{throw Error('Supabase returned an unreadable response.')}
 if(!res.ok){if(res.status===409)throw Error('A cloud workspace already exists. Load its latest version before saving.');throw Error(data?.msg||data?.message||data?.error_description||'Supabase request failed ('+res.status+').')}
 return data
}
async function session(){
 if(!studioSession)throw Error('Sign in to your Personal Ledger Supabase account first.');
 if((studioSession.expires_at||0)*1000<Date.now()+45000){const next=await api('/auth/v1/token?grant_type=refresh_token','POST',{refresh_token:studioSession.refresh_token});keepSession(next)}return studioSession
}
function cloudDialog(){
 if(cloudBusy)return;const s=studioSession;
 const form=s?'<p>Signed in as <strong>'+esc(s.user.email||'workspace owner')+'</strong>.</p><div class="dialogActions">'+btn('cloud-pull','Load cloud copy')+btn('cloud-push','Save to cloud','','btn primary')+'</div><div class="mt">'+btn('cloud-logout','Sign out','','chip')+'</div>':
 '<form id="cloudLogin">'+field('Personal Ledger email','<input id="cloudEmail" type="email" required autocomplete="username">')+field('Password','<input id="cloudPass" type="password" required autocomplete="current-password">')+'<button class="btn primary" type="submit">Sign in to Supabase</button></form>';
 modal('Cloud workspace','<p>Use your existing Personal Ledger app login. Saving to the cloud includes every screen, group, and template in this workspace. Edits also save on this device.</p>'+form+'<p id="cloudNote" class="error" role="status"></p>');
 if(!s){$('#cloudLogin').onsubmit=e=>{e.preventDefault();const email=$('#cloudEmail').value.trim(),password=$('#cloudPass').value;$('#cloudPass').value='';cloudTask(async()=>{const a=await api('/auth/v1/token?grant_type=password','POST',{email,password});keepSession(a);return 'Signed in'})}}
 else{
 $('[data-cmd=cloud-push]').onclick=()=>cloudTask(saveCloud);
 $('[data-cmd=cloud-pull]').onclick=()=>cloudTask(loadCloud);
 $('[data-cmd=cloud-logout]').onclick=()=>cloudTask(async()=>{const s=studioSession;try{await api('/auth/v1/logout?scope=local','POST',null,s.access_token)}finally{keepSession(null)}return 'Signed out'})
 }
}
async function cloudTask(fn){
 if(cloudBusy)return;cloudBusy=true;const controls=$$('.dialog button,.dialog input');controls.forEach(el=>el.disabled=true);
 try{const message=await fn();if(message){cloudBusy=false;cloudDialog();toast(message)}}catch(e){if($('#cloudNote'))$('#cloudNote').textContent=e.message;else toast(e.message)}finally{cloudBusy=false;controls.forEach(el=>el.disabled=false)}
}
async function saveCloud(){
 const s=await session(),id=s.user.id,base=revision(id),next=crypto.randomUUID(),path='/rest/v1/form_studio_workspaces';
 const body={revision:next,document:clone(project)};
 if(!base){body.owner_id=id;await api(path,'POST',body,s.access_token,'return=minimal')}
 else{const rows=await api(path+'?owner_id=eq.'+encodeURIComponent(id)+'&revision=eq.'+encodeURIComponent(base)+'&select=revision','PATCH',body,s.access_token,'return=representation');if(rows.length!==1)throw Error('The cloud copy changed on another device. Export your local copy, then load the latest cloud version.')}
 revision(id,next);return 'Workspace saved to your personal Supabase'
}
async function loadCloud(){
 const s=await session(),id=s.user.id;const rows=await api('/rest/v1/form_studio_workspaces?owner_id=eq.'+encodeURIComponent(id)+'&select=revision,document','GET',null,s.access_token);
 if(!rows.length)throw Error('No cloud copy exists yet. Choose Save to cloud on the device holding your design.');
 const record=rows[0],q=validateImport(record.document);
 modal('Load cloud workspace?', '<p>Replace the design on this device with <strong>'+esc(q.name)+'</strong>? Undo restores your current local design.</p><div class="dialogActions">'+btn('dismiss','Cancel')+btn('confirm-cloud-load','Load cloud copy','','btn primary')+'</div>');
 $('[data-cmd=confirm-cloud-load]').onclick=()=>{change(()=>{project=q;pageId=q.pages[0].id;selected=[];multi=false});revision(id,record.revision);dismiss();toast('Cloud workspace loaded')};return ''
}
restoreSession();
