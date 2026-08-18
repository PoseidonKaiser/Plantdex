(function(){
const SB_URL='https://twemhhiyywhogaxvlnwz.supabase.co';
const SB_KEY='sb_publishable_gQz5LPJE-4XZHaGvUNbggA_7EkMRVOn';
const LOCAL_KEY='plantCollectionTracker_profiles_v8';
let busy=false,lastRun=0;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function signedPhoto(client,path){
  if(!path)return '';
  const {data,error}=await client.storage.from('plantdex-photos').createSignedUrl(path,604800);
  return error?'':data.signedUrl;
}
async function hydrateGalleryNode(client,node,paths){
  if(typeof paths==='string'&&paths)return await signedPhoto(client,paths);
  if(Array.isArray(node)){
    const out=[];
    for(let i=0;i<node.length;i++)out.push(await hydrateGalleryNode(client,node[i],Array.isArray(paths)?paths[i]:null));
    return out;
  }
  if(node&&typeof node==='object'){
    const out={};
    for(const [k,v] of Object.entries(node))out[k]=await hydrateGalleryNode(client,v,paths&&typeof paths==='object'?paths[k]:null);
    return out;
  }
  return node;
}
async function reconcile(){
  if(busy||Date.now()-lastRun<800)return;
  if(!window.supabase||typeof plants==='undefined'||typeof render!=='function')return;
  busy=true;
  try{
    const client=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
    const {data:{session}}=await client.auth.getSession();
    if(!session?.user)return;
    const {data,error}=await client.from('plantdex_plants').select('local_id,data,photo_path').order('created_at');
    if(error)throw error;
    const existingById=new Map(plants.map(p=>[String(p.id),p]));
    const next=[];
    for(const row of data||[]){
      const id=String(row.local_id);
      const target=existingById.get(id)||{};
      Object.keys(target).forEach(k=>delete target[k]);
      Object.assign(target,row.data||{},{id});
      target.photoPath=row.photo_path||target.photoPath||'';
      target.photo=target.photoPath?await signedPhoto(client,target.photoPath):'';
      target.gallery=await hydrateGalleryNode(client,Array.isArray(target.gallery)?target.gallery:[],target.galleryCloudPaths||[]);
      next.push(target);
    }
    plants.splice(0,plants.length,...next);
    localStorage.setItem(LOCAL_KEY,JSON.stringify(plants));
    render();
    requestAnimationFrame(()=>render());
    lastRun=Date.now();
  }catch(e){console.warn('Plantdex reconciliation skipped',e);}
  finally{busy=false;}
}
async function start(){
  for(let i=0;i<80&&!window.supabase;i++)await sleep(100);
  await sleep(400);
  reconcile();
  const status=document.getElementById('cloudStatus');
  if(status){
    new MutationObserver(()=>{if(/Synced/.test(status.textContent||''))setTimeout(reconcile,100);}).observe(status,{childList:true,characterData:true,subtree:true});
  }
  window.addEventListener('focus',()=>setTimeout(reconcile,100));
}
start();
})();