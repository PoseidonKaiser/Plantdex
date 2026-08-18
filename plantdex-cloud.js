(function(){
const SB_URL='https://twemhhiyywhogaxvlnwz.supabase.co';
const SB_KEY='sb_publishable_gQz5LPJE-4XZHaGvUNbggA_7EkMRVOn';
let sb=null,cloudUser=null,syncTimer=null,syncing=false,recoveryMode=false;
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
async function signedPhoto(path){if(!path)return '';const {data,error}=await sb.storage.from('plantdex-photos').createSignedUrl(path,604800);return error?'':data.signedUrl;}
async function uploadPhoto(p){if(!p.photo||!p.photo.startsWith('data:'))return p.photoPath||'';const blob=dataUrlToBlob(p.photo);const ext=(blob.type.split('/')[1]||'jpg').replace('jpeg','jpg');const safe=String(p.id||Date.now()).replace(/[^a-zA-Z0-9_-]/g,'_');const path=cloudUser.id+'/'+safe+'/main.'+ext;const {error}=await sb.storage.from('plantdex-photos').upload(path,blob,{upsert:true,contentType:blob.type});if(error)throw error;p.photoPath=path;p.photo=await signedPhoto(path);return path;}
async function syncNow(){if(!cloudUser||syncing)return;syncing=true;status('☁️ Syncing…');try{for(const p of plants){const path=await uploadPhoto(p);const clean=Object.assign({},p,{photo:'',photoPath:path||p.photoPath||''});const {error}=await sb.from('plantdex_plants').upsert({user_id:cloudUser.id,local_id:String(p.id),data:clean,photo_path:path||null},{onConflict:'user_id,local_id'});if(error)throw error;}originalSavePlants();status('☁️ Synced');}catch(e){console.error(e);status('⚠️ Sync issue — local copy kept');}finally{syncing=false;}}
window.savePlants=function(){originalSavePlants();if(cloudUser){clearTimeout(syncTimer);syncTimer=setTimeout(syncNow,500);}};
async function loadCloud(){status('☁️ Loading…');const {data,error}=await sb.from('plantdex_plants').select('local_id,data,photo_path').order('created_at');if(error)throw error;if(data.length){plants=await Promise.all(data.map(async row=>{const p=Object.assign({},row.data||{},{id:row.local_id});p.photoPath=row.photo_path||p.photoPath||'';p.photo=await signedPhoto(p.photoPath);return p;}));originalSavePlants();render();status('☁️ Synced');}else{status('☁️ Migrating local collection…');await syncNow();}}
async function refreshAuth(){const {data:{session}}=await sb.auth.getSession();cloudUser=session?.user||null;setAuthUi(!!cloudUser);if(recoveryMode)return;if(cloudUser){await loadCloud();}else status('Local mode — sign in to sync');}
async function signIn(){const email=document.getElementById('cloudEmail').value.trim();const password=document.getElementById('cloudPassword').value;if(!email||!password)return alert('Enter your email and password.');status('Signing in…');const {error}=await sb.auth.signInWithPassword({email,password});if(error){status('Sign-in failed');alert(error.message);}}
async function signUp(){const email=document.getElementById('cloudEmail').value.trim();const password=document.getElementById('cloudPassword').value;if(!email||password.length<6)return alert('Enter your email and a password of at least 6 characters.');status('Creating account…');const {data,error}=await sb.auth.signUp({email,password,options:{emailRedirectTo:'https://poseidonkaiser.github.io/Plantdex/'}});if(error){status('Could not create account');alert(error.message);return;}if(data.session){status('Account created — syncing…');await refreshAuth();}else status('Account created. Check your email once to confirm it, then sign in.');}
async function forgotPassword(){const email=document.getElementById('cloudEmail').value.trim();if(!email)return alert('Enter your email first.');status('Sending reset email…');const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:'https://poseidonkaiser.github.io/Plantdex/'});if(error){status('Could not send reset email');alert(error.message);}else status('Password reset email sent. Open it once the email rate limit clears.');}
async function setNewPassword(){const password=document.getElementById('cloudPassword').value;if(password.length<6)return alert('Use a password of at least 6 characters.');status('Saving new password…');const {error}=await sb.auth.updateUser({password});if(error){status('Could not update password');alert(error.message);return;}recoveryMode=false;status('Password updated — syncing…');await refreshAuth();}
async function start(){try{await loadSdk();sb=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});document.getElementById('cloudSignIn').onclick=signIn;document.getElementById('cloudSignUp').onclick=signUp;document.getElementById('cloudForgot').onclick=forgotPassword;document.getElementById('cloudSetPassword').onclick=setNewPassword;document.getElementById('cloudLogout').onclick=async()=>{await sb.auth.signOut();location.reload();};sb.auth.onAuthStateChange((event)=>{if(event==='PASSWORD_RECOVERY'){recoveryMode=true;setAuthUi(true);}else setTimeout(refreshAuth,0);});await refreshAuth();}catch(e){console.error(e);status('⚠️ Cloud sync could not load');}}
start();
})();