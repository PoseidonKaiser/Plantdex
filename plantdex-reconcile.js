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
function applyDarkTheme(){
  if(document.getElementById('plantdexDarkTheme'))return;
  document.documentElement.style.colorScheme='dark';
  const style=document.createElement('style');
  style.id='plantdexDarkTheme';
  style.textContent=`
    :root{
      --bg:#0b120e!important;
      --card:#141d17!important;
      --ink:#e8f2eb!important;
      --muted:#9bada1!important;
      --line:#2b3a31!important;
      --green:#81c99a!important;
      --green2:#1d3527!important;
      --accent:#76b98c!important;
      --warn:#3c2e18!important;
      --danger:#ff9898!important;
      --shadow:0 16px 38px rgba(0,0,0,.34)!important;
    }
    html{background:#0b120e!important;color-scheme:dark}
    body{
      color:var(--ink)!important;
      background:
        radial-gradient(circle at 5% 0%,rgba(52,101,70,.22) 0,transparent 28%),
        radial-gradient(circle at 95% 0%,rgba(38,77,53,.17) 0,transparent 27%),
        var(--bg)!important;
    }
    .panel,.stat,.profile-shell,.profile-card{background:#141d17!important;border-color:var(--line)!important}
    .panel{background:rgba(20,29,23,.96)!important}
    .stat,.profile-shell,.panel{box-shadow:var(--shadow)!important}
    .table-wrap{border-color:var(--line)!important;background:#101713!important}
    table{background:#101713!important;color:var(--ink)!important}
    th{background:#18221b!important;color:#a9b9af!important;border-color:var(--line)!important}
    td{background:#101713!important;border-color:var(--line)!important}
    tr:hover td{background:#18221b!important}
    input,select,textarea{
      background:#0f1712!important;
      color:var(--ink)!important;
      border-color:#34453a!important;
    }
    input::placeholder,textarea::placeholder{color:#718279!important}
    select option{background:#101713;color:var(--ink)}
    input:focus,select:focus,textarea:focus{border-color:var(--accent)!important;box-shadow:0 0 0 3px rgba(118,185,140,.16)!important}
    label{color:#b8c6bd!important}
    .secondary,.file-label{
      background:#18221b!important;
      color:#a4ddb6!important;
      border-color:#34453a!important;
    }
    .secondary:hover,.file-label:hover{background:#1e2b22!important}
    .primary{background:#78be90!important;color:#09120c!important}
    .primary:hover{background:#8bcea0!important}
    .danger{background:#351d20!important;color:#ffaaaa!important}
    .favorite-btn{background:#302718!important;color:#f0cf82!important}
    .badge{background:#1d3527!important;color:#9bd9ae!important}
    .badge.warn{background:#3c2e18!important;color:#f1c572!important}
    .health-Thriving{background:#173824!important;color:#9ce0b1!important}
    .health-Good{background:#24331e!important;color:#b7d799!important}
    .health-Watch{background:#3c2e18!important;color:#f1c572!important}
    .health-Rehab{background:#3b2023!important;color:#ffaaaa!important}
    .empty{background:#101713!important;color:var(--muted)!important}
    .details,.sub,.note,.timeline-date,.timeline-note,.gallery-date,.profile-sub{color:var(--muted)!important}
    .nickname{color:#91d3a6!important}
    .plant-photo{background:#111a14!important;border-color:var(--line)!important}
    .photo-placeholder,.profile-hero-placeholder{background:#101713!important;border-color:#3a4b40!important}
    .photo-preview img,.profile-hero,.gallery-item img{border-color:var(--line)!important}
    dialog{background:#141d17!important;color:var(--ink)!important;box-shadow:0 28px 90px rgba(0,0,0,.62)!important}
    dialog::backdrop{background:rgba(3,8,5,.78)!important}
    .modal{background:#141d17!important}
    .modal p{color:var(--muted)!important}
    .profile-header{
      background:linear-gradient(135deg,#17231b,#101813)!important;
      border-color:var(--line)!important;
    }
    .profile-card{background:#111914!important}
    .timeline-item{background:#101713!important;border-color:var(--line)!important}
    .cloudbar{
      background:#111b15!important;
      border-color:#2e4034!important;
      box-shadow:0 10px 28px rgba(0,0,0,.18);
    }
    .cloudstatus{color:#a6b7ac!important}
    .cloud-forgot{color:#91d3a6!important}
    .gallery-remove{background:rgba(20,29,23,.92)!important;color:#ffaaaa!important;border:1px solid #38483e!important}
    .photo-carousel-overlay{background:rgba(3,7,5,.96)!important}
    .photo-carousel-close,.photo-carousel-arrow{background:rgba(20,29,23,.82)!important;color:#eef7f0!important;border:1px solid rgba(255,255,255,.12)!important}
    #nfcProfileCard{padding:0!important;overflow:hidden}
    #nfcProfileCard .nfc-collapse-toggle{width:100%;display:flex;align-items:center;justify-content:space-between;gap:14px;background:transparent!important;color:var(--ink)!important;border:0!important;padding:18px;text-align:left;border-radius:0!important}
    #nfcProfileCard .nfc-collapse-toggle:hover{transform:none!important;background:#162019!important}
    #nfcProfileCard .nfc-collapse-title{display:flex;align-items:center;gap:8px;font-weight:800;font-size:1.05rem}
    #nfcProfileCard .nfc-collapse-chevron{font-size:1.15rem;color:var(--muted);transition:transform .2s ease}
    #nfcProfileCard.nfc-open .nfc-collapse-chevron{transform:rotate(180deg)}
    #nfcProfileCard .nfc-collapse-body{display:none;padding:0 18px 18px}
    #nfcProfileCard.nfc-open .nfc-collapse-body{display:block}
    ::-webkit-scrollbar{width:11px;height:11px}
    ::-webkit-scrollbar-track{background:#0d1510}
    ::-webkit-scrollbar-thumb{background:#34463a;border-radius:999px;border:2px solid #0d1510}
    ::-webkit-scrollbar-thumb:hover{background:#445a4a}
  `;
  document.head.appendChild(style);
}
function makeNfcCollapsible(){
  const card=document.getElementById('nfcProfileCard');
  if(!card)return;
  if(card.querySelector('.nfc-collapse-toggle'))return;
  const original=card.innerHTML;
  card.classList.remove('nfc-open');
  card.innerHTML=`<button class="nfc-collapse-toggle" type="button" aria-expanded="false"><span class="nfc-collapse-title">🏷️ NFC / QR Profile</span><span class="nfc-collapse-chevron">⌄</span></button><div class="nfc-collapse-body">${original.replace(/^\s*<h3>🏷️ NFC \/ QR Profile<\/h3>/,'')}</div>`;
  const toggle=card.querySelector('.nfc-collapse-toggle');
  toggle.addEventListener('click',()=>{
    const open=card.classList.toggle('nfc-open');
    toggle.setAttribute('aria-expanded',String(open));
  });
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
    if(typeof activeProfileId!=='undefined'&&activeProfileId&&typeof renderProfile==='function'){
      renderProfile();
      requestAnimationFrame(makeNfcCollapsible);
    }
  }catch(e){console.warn('Plantdex profile refresh skipped',e);}
}
async function reconcile(force=false){
  hidePriceColumn();
  applyDarkTheme();
  makeNfcCollapsible();
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
    applyDarkTheme();
    refreshOpenProfile();
    requestAnimationFrame(()=>{render();hidePriceColumn();applyDarkTheme();refreshOpenProfile();makeNfcCollapsible();});
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
  applyDarkTheme();
  const observer=new MutationObserver(()=>makeNfcCollapsible());
  observer.observe(document.body,{childList:true,subtree:true});
  for(let i=0;i<100&&!getAccessToken();i++)await sleep(100);
  await sleep(250);
  await reconcile(true);
  makeNfcCollapsible();
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