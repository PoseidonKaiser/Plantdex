(function(){
  const isDesktop=()=>window.matchMedia&&window.matchMedia('(min-width: 801px)').matches;

  function applyBranding(){
    document.title="Kaiser's Plant Collection";
    const h1=document.querySelector('h1');
    if(h1&&/My Plant Collection/i.test(h1.textContent||''))h1.textContent="🌿 Kaiser's Plant Collection";
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyBranding,{once:true});
  else applyBranding();
  const brandObserver=new MutationObserver(applyBranding);
  brandObserver.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>brandObserver.disconnect(),10000);

  if(!isDesktop()||typeof window.fetch!=='function')return;
  const nativeFetch=window.fetch.bind(window);
  const TARGET='/rest/v1/plantdex_plants?select=local_id,data,photo_path&order=created_at.asc';

  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    const headers=new Headers((init&&init.headers)||(input instanceof Request?input.headers:undefined));
    const alreadyPaged=headers.has('Range')||/\boffset=|\blimit=/.test(url);
    if(!url.includes(TARGET)||alreadyPaged)return nativeFetch(input,init);

    const all=[];
    const pageSize=50;
    let status=200,statusText='OK',responseHeaders=null;
    for(let from=0;;from+=pageSize){
      const pageHeaders=new Headers(headers);
      pageHeaders.set('Range',`${from}-${from+pageSize-1}`);
      pageHeaders.set('Range-Unit','items');
      const r=await nativeFetch(url,Object.assign({},init||{},{headers:pageHeaders,cache:'no-store'}));
      if(!r.ok)return r;
      status=r.status;statusText=r.statusText;responseHeaders=new Headers(r.headers);
      const page=await r.json();
      if(!Array.isArray(page))return new Response(JSON.stringify(page),{status,statusText,headers:responseHeaders});
      all.push(...page);
      if(page.length<pageSize)break;
    }
    if(responseHeaders){responseHeaders.set('content-type','application/json');responseHeaders.delete('content-range');}
    return new Response(JSON.stringify(all),{status:200,statusText:'OK',headers:responseHeaders||{'content-type':'application/json'}});
  };
})();