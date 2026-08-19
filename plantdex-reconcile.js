(function(){
const SB_URL='https://twemhhiyywhogaxvlnwz.supabase.co';
const SB_KEY='sb_publishable_gQz5LPJE-4XZHaGvUNbggA_7EkMRVOn';
const LOCAL_KEY='plantCollectionTracker_profiles_v8';
const AUTH_KEY='sb-twemhhiyywhogaxvlnwz-auth-token';
let busy=false,lastRun=0,focusTimer=null;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function editorOpen(){return !!document.querySelector('dialog[open]');}
function hidePriceColumn(){
  if(document.getElementById('plantdexHidePrice'))return;
  const style=document.createElement('style');
  style.id='plantdexHidePrice';
  style.textContent='.table-wrap table th:nth-child(11),.table-wrap table td:nth-child(11){display:none!important;}';
  document.head.appendChild(style);
}
function getAccessToken(){
  try{
    const raw=localStorage.getItem(AUTH_KEY);
    if(!raw)return '';
    const parsed=JSON.parse(raw);
    return parsed?.access_token||parsed?.currentSession?.access_token||'';
  }catch(e){return '';}
}
function authHeaders(token,extra={}){
  return Object.assign({'apikey':SB_KEY,'Authorization':'Bearer '+token},extra);
}
async function fetchCloudRows(token){
  const url=SB_URL+'/rest/v1/plantdex_plants?select=local_id,data,photo_path&order=created_at.asc';
  const r=await fetch(url,{headers:authHeaders(token),cache:'no-store'});
  if(!r.ok)throw new Error('Plantdex cloud read failed: '+r.status);
  return r.json();
}
async function signedPhoto(token,path){
  if(!path)return '';
  const encoded=String(path).split('/').map(encodeURIComponent).join('/');
  const url=SB_URL+'/storage/v1/object/sign/plantdex-photos/'+encoded;
  const r=await fetch(url,{method:'POST',headers:authHeaders(token,{'Content-Type':'application/json'}),body:JSON.stringify({expiresIn:604800}),cache:'no-store'});
  if(!r.ok){console.warn('Plantdex photo URL failed',path,r.status);return '';}
  const data=await r.json();
  const signed=data.signedURL||data.signedUrl||'';
  if(!signed)return '';
  const full=signed.startsWith('http')?signed:SB_URL+'/storage/v1'+signed;
  return full+(full.includes('?')?'&':'?')+'pd='+Date.now();
}
async function hydrateGalleryNode(token,node,paths){
  if(typeof paths==='string'&&paths)return await signedPhoto(token,paths);
  if(Array.isArray(node)){
    const out=[];
    for(let i=0;i<node.length;i++)out.push(await hydrateGalleryNode(token,node[i],Array.isArray(paths)?paths[i]:null));
    return out;
  }
  if(node&&typeof node==='object'){
    const out={};
    for(const [k,v] of Object.entries(node))out[k]=await hydrateGalleryNode(token,v,paths&&typeof paths==='object'?paths[k]:null);
    return out;
  }
  return node;
}
function refreshOpenProfile(){
  try{
    if(typeof activeProfileId!=='undefined'&&activeProfileId&&typeof renderProfile==='function')renderProfile();
  }catch(e){console.warn('Plantdex profile refresh skipped',e);}
}
async function reconcile(force=false){
  hidePriceColumn();
  if(editorOpen()||busy||(!force&&Date.now()-lastRun<800))return;
  if(typeof plants==='undefined'||typeof render!=='function')return;
  const token=getAccessToken();
  if(!token)return;
  busy=true;
  try{
    const rows=await fetchCloudRows(token);
    if(!Array.isArray(rows)||!rows.length)return;
    const next=[];
    for(const row of rows){
      const id=String(row.local_id);
      const p=Object.assign({},row.data||{},{id});
      p.photoPath=row.photo_path||p.photoPath||'';
      p.photo=p.photoPath?await signedPhoto(token,p.photoPath):'';
      p.gallery=await hydrateGalleryNode(token,Array.isArray(p.gallery)?p.gallery:[],p.galleryCloudPaths||[]);
      next.push(p);
    }
    plants.splice(0,plants.length,...next);
    localStorage.setItem(LOCAL_KEY,JSON.stringify(plants));
    render();
    hidePriceColumn();
    refreshOpenProfile();
    requestAnimationFrame(()=>{render();hidePriceColumn();refreshOpenProfile();});
    lastRun=Date.now();
    const status=document.getElementById('cloudStatus');
    if(status)status.textContent='☁️ Synced';
  }catch(e){console.warn('Plantdex reconciliation skipped',e);}
  finally{busy=false;}
}
function scheduleForceReconcile(delay=150){
  clearTimeout(focusTimer);
  focusTimer=setTimeout(()=>{if(!editorOpen())reconcile(true);},delay);
}
async function start(){
  hidePriceColumn();
  for(let i=0;i<100&&!getAccessToken();i++)await sleep(100);
  await sleep(250);
  await reconcile(true);
  const status=document.getElementById('cloudStatus');
  if(status){
    new MutationObserver(()=>{if(/Synced/.test(status.textContent||''))scheduleForceReconcile(150);}).observe(status,{childList:true,characterData:true,subtree:true});
  }
  window.addEventListener('focus',()=>scheduleForceReconcile(150));
  window.addEventListener('pageshow',()=>scheduleForceReconcile(100));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduleForceReconcile(100);});
}
window.plantdexReconcile=()=>reconcile(true);
start();
})();