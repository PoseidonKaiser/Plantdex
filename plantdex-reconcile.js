(function(){
const SB_URL='https://twemhhiyywhogaxvlnwz.supabase.co';
const SB_KEY='sb_publishable_gQz5LPJE-4XZHaGvUNbggA_7EkMRVOn';
const LOCAL_KEY='plantCollectionTracker_profiles_v8';
let busy=false,lastRun=0;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
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
      if(row.photo_path)target.photoPath=row.photo_path;
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