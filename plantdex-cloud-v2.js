(function(){
const SB_URL='https://twemhhiyywhogaxvlnwz.supabase.co';
const SB_KEY='sb_publishable_gQz5LPJE-4XZHaGvUNbggA_7EkMRVOn';
const LOCAL_KEY='plantCollectionTracker_profiles_v8';
let sb=null,cloudUser=null,ready=false,syncing=false,syncTimer=null,recoveryMode=false;
const originalSavePlants=window.savePlants||function(){localStorage.setItem(LOCAL_KEY,JSON.stringify(plants));};
window.plantdexDirty=false;

function status(msg){const el=document.getElementById('cloudStatus');if(el)el.textContent=msg;}
function show(id,on){const el=document.getElementById(id);if(el)el.style.display=on?'':'none';}
function authUi(signedIn){
  if(recoveryMode){show('cloudEmail',false);show('cloudPassword',true);show('cloudSignIn',false);show('cloudSignUp',false);show('cloudForgot',false);show('cloudLogout',false);show('cloudSetPassword',true);status('Choose a new password.');return;}
  show('cloudEmail',!signedIn);show('cloudPassword',!signedIn);show('cloudSignIn',!signedIn);show('cloudSignUp',!signedIn);show('cloudForgot',!signedIn);show('cloudLogout',signedIn);show('cloudSetPassword',false);
}
function loadSdk(){return new Promise((resolve,reject)=>{if(window.supabase)return resolve();const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.1/dist/umd/supabase.min.js';s.onload=resolve;s.onerror=()=>reject(new Error('Supabase library could not load'));document.head.appendChild(s);});}
function safe(v){return String(v??'').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,80)||'item';}
function dataUrlToBlob(dataUrl){const [meta,b64]=dataUrl.split(',');const mime=(meta.match(/data:(.*?);/)||[])[1]||'image/jpeg';const bytes=atob(b64);const a=new Uint8Array(bytes.length);for(let i=0;i<bytes.length;i++)a[i]=bytes.charCodeAt(i);return new Blob([a],{type:mime});}
async function signed(path){if(!path)return '';const {data,error}=await sb.storage.from('plantdex-photos').createSignedUrl(path,604800);return error?'':data.signedUrl;}
async function uploadDataUrl(dataUrl,stem){const blob=dataUrlToBlob(dataUrl);const ext=(blob.type.split('/')[1]||'jpg').replace('jpeg','jpg');const path=stem+'.'+ext;const {error}=await sb.storage.from('plantdex-photos').upload(path,blob,{upsert:true,contentType:blob.type});if(error)throw error;return path;}
async function prepareGalleryNode(node,oldPaths,stem){
  if(typeof node==='string'){
    if(node.startsWith('data:image/')){const path=await uploadDataUrl(node,stem);return {clean:'',paths:path};}
    if(typeof oldPaths==='string'&&oldPaths)return {clean:'',paths:oldPaths};
    return {clean:node,paths:null};
  }
  if(Array.isArray(node)){const clean=[],paths=[];for(let i=0;i<node.length;i++){const r=await prepareGalleryNode(node[i],Array.isArray(oldPaths)?oldPaths[i]:null,stem+'/'+i);clean.push(r.clean);paths.push(r.paths);}return {clean,paths};}
  if(node&&typeof node==='object'){const clean={},paths={};for(const [k,v] of Object.entries(node)){const r=await prepareGalleryNode(v,oldPaths&&typeof oldPaths==='object'?oldPaths[k]:null,stem+'/'+safe(k));clean[k]=r.clean;paths[k]=r.paths;}return {clean,paths};}
  return {clean:node,paths:null};
}
async function hydrateNode(node,paths){
  if(typeof paths==='string'&&paths)return signed(paths);
  if(Array.isArray(node)){const out=[];for(let i=0;i<node.length;i++)out.push(await hydrateNode(node[i],Array.isArray(paths)?paths[i]:null));return out;}
  if(node&&typeof node==='object'){const out={};for(const [k,v] of Object.entries(node))out[k]=await hydrateNode(v,paths&&typeof paths==='object'?paths[k]:null);return out;}
  return node;
}
async function hydrateRow(row){const p=Object.assign({},row.data||{},{id:String(row.local_id)});p.photoPath=row.photo_path||p.photoPath||'';p.photo=p.photoPath?await signed(p.photoPath):'';p.gallery=await hydrateNode(Array.isArray(p.gallery)?p.gallery:[],p.galleryCloudPaths||[]);return p;}
async function fetchAllRows(){
  const all=[];const pageSize=50;
  for(let from=0;;from+=pageSize){
    const {data,error}=await sb.from('plantdex_plants').select('local_id,data,photo_path').order('created_at').range(from,from+pageSize-1);
    if(error)throw error;
    const page=Array.isArray(data)?data:[];all.push(...page);
    if(page.length<pageSize)break;
  }
  return all;
}
async function pullCloud(){
  if(!cloudUser||window.plantdexDirty)return;
  ready=false;status('☁️ Loading cloud library…');
  const data=await fetchAllRows();
  if(!data.length){ready=true;status('☁️ Synced');return;}
  const next=[];
  for(let i=0;i<data.length;i++){next.push(await hydrateRow(data[i]));status('☁️ Loading '+(i+1)+' / '+data.length+'…');}
  plants.splice(0,plants.length,...next);originalSavePlants();if(typeof render==='function')render();ready=true;window.plantdexDirty=false;status('☁️ Synced • '+plants.length+' plants');
}
async function syncNow(){
  if(!ready||!cloudUser||syncing)return;
  syncing=true;status('☁️ Saving changes…');
  try{
    for(const p of plants){
      let photoPath=p.photoPath||'';
      if(p.removePhotoCloud){if(photoPath){const {error}=await sb.storage.from('plantdex-photos').remove([photoPath]);if(error)throw error;}photoPath='';p.photo='';delete p.removePhotoCloud;}
      if(typeof p.photo==='string'&&p.photo.startsWith('data:')){photoPath=await uploadDataUrl(p.photo,cloudUser.id+'/'+safe(p.id)+'/main');p.photo=await signed(photoPath);}
      const g=await prepareGalleryNode(Array.isArray(p.gallery)?p.gallery:[],p.galleryCloudPaths||[],cloudUser.id+'/'+safe(p.id)+'/timeline');
      const clean=Object.assign({},p,{photo:'',photoPath:photoPath||'',gallery:g.clean,galleryCloudPaths:g.paths});delete clean.removePhotoCloud;
      const {error}=await sb.from('plantdex_plants').upsert({user_id:cloudUser.id,local_id:String(p.id),data:clean,photo_path:photoPath||null},{onConflict:'user_id,local_id'});if(error)throw error;
      p.photoPath=photoPath||'';p.galleryCloudPaths=g.paths;p.gallery=await hydrateNode(g.clean,g.paths);
    }
    originalSavePlants();window.plantdexDirty=false;if(typeof render==='function')render();status('☁️ Synced • '+plants.length+' plants');
  }catch(e){console.error('PlantDex sync failed',e);window.plantdexDirty=true;status('⚠️ Save failed — change kept on this device');}
  finally{syncing=false;}
}
function queueSync(){if(!ready||!cloudUser)return;clearTimeout(syncTimer);syncTimer=setTimeout(syncNow,250);}
window.savePlants=function(){originalSavePlants();window.plantdexDirty=true;status(cloudUser?'☁️ Saved locally • syncing…':'Saved on this device');queueSync();};
window.plantdexCloudSync=queueSync;

async function refreshAuth(){const {data:{session}}=await sb.auth.getSession();cloudUser=session?.user||null;authUi(!!cloudUser);if(recoveryMode)return;if(cloudUser){if(window.plantdexDirty){queueSync();return;}await pullCloud();}else{ready=false;status('Local mode — sign in to sync');}}
async function signIn(){const email=document.getElementById('cloudEmail').value.trim(),password=document.getElementById('cloudPassword').value;if(!email||!password)return alert('Enter your email and password.');status('Signing in…');const {error}=await sb.auth.signInWithPassword({email,password});if(error){status('Sign-in failed');alert(error.message);}}
async function signUp(){const email=document.getElementById('cloudEmail').value.trim(),password=document.getElementById('cloudPassword').value;if(!email||password.length<6)return alert('Enter your email and a password of at least 6 characters.');status('Creating account…');const {error}=await sb.auth.signUp({email,password,options:{emailRedirectTo:'https://poseidonkaiser.github.io/Plantdex/'}});if(error){status('Could not create account');alert(error.message);}}
async function forgot(){const email=document.getElementById('cloudEmail').value.trim();if(!email)return alert('Enter your email first.');const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:'https://poseidonkaiser.github.io/Plantdex/'});status(error?'Could not send reset email':'Password reset email sent.');if(error)alert(error.message);}
async function setNewPassword(){const password=document.getElementById('cloudPassword').value;if(password.length<6)return alert('Use a password of at least 6 characters.');status('Saving new password…');const {error}=await sb.auth.updateUser({password});if(error){status('Could not update password');alert(error.message);return;}recoveryMode=false;await refreshAuth();}
async function start(){
  try{
    await loadSdk();sb=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    document.getElementById('cloudSignIn').onclick=signIn;document.getElementById('cloudSignUp').onclick=signUp;document.getElementById('cloudForgot').onclick=forgot;document.getElementById('cloudSetPassword').onclick=setNewPassword;document.getElementById('cloudLogout').onclick=async()=>{await sb.auth.signOut();location.reload();};
    sb.auth.onAuthStateChange((event)=>{if(event==='PASSWORD_RECOVERY'){recoveryMode=true;authUi(true);}else setTimeout(refreshAuth,0);});
    await refreshAuth();
  }catch(e){console.error(e);status('⚠️ Cloud sync could not load');}
}
start();
})();