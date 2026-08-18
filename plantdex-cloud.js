(function(){
const SB_URL='https://twemhhiyywhogaxvlnwz.supabase.co';
const SB_KEY='sb_publishable_gQz5LPJE-4XZHaGvUNbggA_7EkMRVOn';
const LOCAL_KEY='plantCollectionTracker_profiles_v8';
let sb=null,cloudUser=null,syncTimer=null,syncing=false,recoveryMode=false,photoWatch=null,localWatch=null,lastLocalJson='';
const cloudPhotoPaths=new Map();
const originalSavePlants=window.savePlants;

function status(msg){const el=document.getElementById('cloudStatus');if(el)el.textContent=msg;}
function show(id,visible){const el=document.getElementById(id);if(el)el.style.display=visible?'':'none';}
function setAuthUi(signedIn){
  if(recoveryMode){
    show('cloudEmail',false); show('cloudPassword',true); show('cloudSignIn',false); show('cloudSignUp',false); show('cloudForgot',false); show('cloudLogout',false); show('cloudSetPassword',true);
    status('Choose a new password.');
    return;
  }
  show('cloudEmail',!signedIn); show('cloudPassword',!signedIn); show('cloudSignIn',!signedIn); show('cloudSignUp',!signedIn); show('cloudForgot',!signedIn); show('cloudLogout',signedIn); show('cloudSetPassword',false);
}
function loadSdk(){return new Promise((resolve,reject)=>{
  if(window.supabase)return resolve();
  const s=document.createElement('script');
  s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.1/dist/umd/supabase.min.js';
  s.onload=resolve; s.onerror=()=>reject(new Error('Supabase library could not load')); document.head.appendChild(s);
});}
function dataUrlToBlob(dataUrl){const parts=dataUrl.split(',');const meta=parts[0],b64=parts[1];const mime=(meta.match(/data:(.*?);/)||[])[1]||'image/jpeg';const bytes=atob(b64);const arr=new Uint8Array(bytes.length);for(let i=0;i<bytes.length;i++)arr[i]=bytes.charCodeAt(i);return new Blob([arr],{type:mime});}
function safeSegment(v){return String(v==null?'':v).replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,80)||'item';}
async function signedPhoto(path){if(!path)return '';const {data,error}=await sb.storage.from('plantdex-photos').createSignedUrl(path,604800);return error?'':data.signedUrl;}
async function uploadBlobAt(dataUrl,pathStem){const blob=dataUrlToBlob(dataUrl);const ext=(blob.type.split('/')[1]||'jpg').replace('jpeg','jpg');const path=pathStem+'.'+ext;const {error}=await sb.storage.from('plantdex-photos').upload(path,blob,{upsert:true,contentType:blob.type});if(error)throw error;return path;}
async function uploadPhoto(p){
  const knownPath=p.photoPath||cloudPhotoPaths.get(String(p.id))||'';
  if(p.removePhotoCloud){
    if(knownPath){const {error}=await sb.storage.from('plantdex-photos').remove([knownPath]);if(error)console.warn('Could not remove old profile photo',error);}
    cloudPhotoPaths.delete(String(p.id));p.photoPath='';p.photo='';delete p.removePhotoCloud;return '';
  }
  if(!p.photo||!p.photo.startsWith('data:')){if(knownPath)p.photoPath=knownPath;return knownPath;}
  const path=await uploadBlobAt(p.photo,cloudUser.id+'/'+safeSegment(p.id||Date.now())+'/main');
  cloudPhotoPaths.set(String(p.id),path);p.photoPath=path;p.photo=await signedPhoto(path);return path;
}

/* Photo Timeline / gallery images live in Storage while date/note metadata stays in JSONB. */
async function prepareGalleryNode(node,oldPaths,stem){
  if(typeof node==='string'){
    if(node.startsWith('data:image/')){const path=await uploadBlobAt(node,stem);return {clean:'',paths:path};}
    if(typeof oldPaths==='string'&&oldPaths){return {clean:'',paths:oldPaths};}
    return {clean:node,paths:null};
  }
  if(Array.isArray(node)){
    const clean=[],paths=[];
    for(let i=0;i<node.length;i++){
      const r=await prepareGalleryNode(node[i],Array.isArray(oldPaths)?oldPaths[i]:null,stem+'/'+i);
      clean.push(r.clean);paths.push(r.paths);
    }
    return {clean,paths};
  }
  if(node&&typeof node==='object'){
    const clean={},paths={};
    for(const [k,v] of Object.entries(node)){
      const r=await prepareGalleryNode(v,oldPaths&&typeof oldPaths==='object'?oldPaths[k]:null,stem+'/'+safeSegment(k));
      clean[k]=r.clean;paths[k]=r.paths;
    }
    return {clean,paths};
  }
  return {clean:node,paths:null};
}
async function prepareGallery(p){
  const gallery=Array.isArray(p.gallery)?p.gallery:[];
  return prepareGalleryNode(gallery,p.galleryCloudPaths||[],cloudUser.id+'/'+safeSegment(p.id||Date.now())+'/timeline');
}
async function hydrateGalleryNode(node,paths){
  if(typeof paths==='string'&&paths)return await signedPhoto(paths);
  if(Array.isArray(node)){
    const out=[];for(let i=0;i<node.length;i++)out.push(await hydrateGalleryNode(node[i],Array.isArray(paths)?paths[i]:null));return out;
  }
  if(node&&typeof node==='object'){
    const out={};for(const [k,v] of Object.entries(node))out[k]=await hydrateGalleryNode(v,paths&&typeof paths==='object'?paths[k]:null);return out;
  }
  return node;
}
async function hydrateGallery(p){p.gallery=await hydrateGalleryNode(Array.isArray(p.gallery)?p.gallery:[],p.galleryCloudPaths||[]);return p;}

function localSnapshot(){try{return JSON.parse(localStorage.getItem(LOCAL_KEY)||'[]');}catch(e){return [];}}
function rememberLocal(){lastLocalJson=localStorage.getItem(LOCAL_KEY)||'';}
async function syncLocalPhotos(){
  if(!cloudUser||syncing)return;
  const locals=localSnapshot().filter(p=>p&&p.id&&typeof p.photo==='string'&&p.photo.startsWith('data:'));
  if(!locals.length)return;
  syncing=true;
  try{
    for(const local of locals){
      const path=await uploadBlobAt(local.photo,cloudUser.id+'/'+safeSegment(local.id)+'/main');
      const {data:rows,error:readError}=await sb.from('plantdex_plants').select('data').eq('local_id',String(local.id)).limit(1);
      if(readError)throw readError;
      const existing=(rows&&rows[0]&&rows[0].data)||{};
      const updated=Object.assign({},existing,{photo:'',photoPath:path});
      const {error:updateError}=await sb.from('plantdex_plants').update({photo_path:path,data:updated}).eq('local_id',String(local.id));
      if(updateError)throw updateError;
      cloudPhotoPaths.set(String(local.id),path);
      const inMemory=plants.find(p=>String(p.id)===String(local.id));
      if(inMemory){inMemory.photoPath=path;inMemory.photo=await signedPhoto(path);}
    }
    if(locals.length){originalSavePlants();rememberLocal();status('☁️ Photos synced'); if(typeof render==='function')render();}
  }catch(e){console.error('Plantdex photo sync failed',e);status('⚠️ Photo sync issue — local photo kept');}
  finally{syncing=false;}
}
async function syncNow(){
  if(!cloudUser||syncing)return;
  syncing=true;status('☁️ Syncing…');
  try{
    for(const p of plants){
      const path=await uploadPhoto(p);
      const galleryResult=await prepareGallery(p);
      const clean=Object.assign({},p,{photo:'',photoPath:path||'',gallery:galleryResult.clean,galleryCloudPaths:galleryResult.paths});
      delete clean.removePhotoCloud;
      const {error}=await sb.from('plantdex_plants').upsert({user_id:cloudUser.id,local_id:String(p.id),data:clean,photo_path:path||null},{onConflict:'user_id,local_id'});
      if(error)throw error;
      if(path)cloudPhotoPaths.set(String(p.id),path);else cloudPhotoPaths.delete(String(p.id));
      p.photoPath=path||'';
      p.galleryCloudPaths=galleryResult.paths;
      p.gallery=await hydrateGalleryNode(galleryResult.clean,galleryResult.paths);
    }
    originalSavePlants();rememberLocal();if(typeof render==='function')render();status('☁️ Synced');
  }catch(e){console.error('Plantdex sync failed',e);status('⚠️ Sync issue — local copy kept');}
  finally{syncing=false;}
}
function queueSync(){if(!cloudUser)return;clearTimeout(syncTimer);syncTimer=setTimeout(async()=>{await syncLocalPhotos();await syncNow();},350);}
window.savePlants=function(){originalSavePlants();rememberLocal();queueSync();};
window.plantdexCloudSync=queueSync;

async function loadCloud(){
  status('☁️ Loading…');
  await syncLocalPhotos();
  const {data,error}=await sb.from('plantdex_plants').select('local_id,data,photo_path').order('created_at');
  if(error)throw error;
  if(data.length){
    plants=await Promise.all(data.map(async row=>{
      let p=Object.assign({},row.data||{},{id:row.local_id});
      p.photoPath=row.photo_path||p.photoPath||'';
      if(p.photoPath)cloudPhotoPaths.set(String(row.local_id),p.photoPath);
      p.photo=await signedPhoto(p.photoPath);
      p=await hydrateGallery(p);
      return p;
    }));
    originalSavePlants();rememberLocal();render();status('☁️ Synced');
  }else{status('☁️ Migrating local collection…');await syncNow();}
}
function startPhotoWatch(){
  if(photoWatch)clearInterval(photoWatch);
  photoWatch=setInterval(()=>{if(cloudUser&&!syncing)syncLocalPhotos();},4000);
}
function startLocalWatch(){
  if(localWatch)clearInterval(localWatch);
  rememberLocal();
  localWatch=setInterval(()=>{
    if(!cloudUser||syncing)return;
    const current=localStorage.getItem(LOCAL_KEY)||'';
    if(current!==lastLocalJson){lastLocalJson=current;queueSync();}
  },1200);
}
async function refreshAuth(){const {data:{session}}=await sb.auth.getSession();cloudUser=session?.user||null;setAuthUi(!!cloudUser);if(recoveryMode)return;if(cloudUser){startPhotoWatch();await loadCloud();startLocalWatch();}else status('Local mode — sign in to sync');}
async function signIn(){const email=document.getElementById('cloudEmail').value.trim();const password=document.getElementById('cloudPassword').value;if(!email||!password)return alert('Enter your email and password.');status('Signing in…');const {error}=await sb.auth.signInWithPassword({email,password});if(error){status('Sign-in failed');alert(error.message);}}
async function signUp(){const email=document.getElementById('cloudEmail').value.trim();const password=document.getElementById('cloudPassword').value;if(!email||password.length<6)return alert('Enter your email and a password of at least 6 characters.');status('Creating account…');const {data,error}=await sb.auth.signUp({email,password,options:{emailRedirectTo:'https://poseidonkaiser.github.io/Plantdex/'}});if(error){status('Could not create account');alert(error.message);return;}if(data.session){status('Account created — syncing…');await refreshAuth();}else status('Account created. Check your email once to confirm it, then sign in.');}
async function forgotPassword(){const email=document.getElementById('cloudEmail').value.trim();if(!email)return alert('Enter your email first.');status('Sending reset email…');const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:'https://poseidonkaiser.github.io/Plantdex/'});if(error){status('Could not send reset email');alert(error.message);}else status('Password reset email sent. Open it once the email rate limit clears.');}
async function setNewPassword(){const password=document.getElementById('cloudPassword').value;if(password.length<6)return alert('Use a password of at least 6 characters.');status('Saving new password…');const {error}=await sb.auth.updateUser({password});if(error){status('Could not update password');alert(error.message);return;}recoveryMode=false;status('Password updated — syncing…');await refreshAuth();}
async function start(){try{await loadSdk();sb=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});document.getElementById('cloudSignIn').onclick=signIn;document.getElementById('cloudSignUp').onclick=signUp;document.getElementById('cloudForgot').onclick=forgotPassword;document.getElementById('cloudSetPassword').onclick=setNewPassword;document.getElementById('cloudLogout').onclick=async()=>{await sb.auth.signOut();location.reload();};sb.auth.onAuthStateChange((event)=>{if(event==='PASSWORD_RECOVERY'){recoveryMode=true;setAuthUi(true);}else setTimeout(refreshAuth,0);});await refreshAuth();}catch(e){console.error(e);status('⚠️ Cloud sync could not load');}}
start();
})();