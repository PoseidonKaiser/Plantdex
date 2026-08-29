(function(){
  const originalFetch=window.fetch.bind(window);
  const PAGE_SIZE=50;
  function isPlantRead(input,init){
    const method=String((init&&init.method)||'GET').toUpperCase();
    if(method!=='GET')return false;
    const url=typeof input==='string'?input:(input&&input.url)||'';
    return url.includes('/rest/v1/plantdex_plants?')&&!/[?&](?:limit|offset)=/.test(url);
  }
  async function pagedFetch(input,init){
    const rawUrl=typeof input==='string'?input:input.url;
    const all=[];
    let firstHeaders=null;
    for(let offset=0;;offset+=PAGE_SIZE){
      const u=new URL(rawUrl,location.href);
      u.searchParams.set('limit',String(PAGE_SIZE));
      u.searchParams.set('offset',String(offset));
      const pageResponse=await originalFetch(u.toString(),init);
      if(!pageResponse.ok)return pageResponse;
      if(!firstHeaders)firstHeaders=new Headers(pageResponse.headers);
      const page=await pageResponse.json();
      if(!Array.isArray(page)){
        return new Response(JSON.stringify(page),{status:pageResponse.status,statusText:pageResponse.statusText,headers:firstHeaders});
      }
      all.push(...page);
      if(page.length<PAGE_SIZE)break;
    }
    const headers=firstHeaders||new Headers();
    headers.set('content-type','application/json');
    return new Response(JSON.stringify(all),{status:200,headers});
  }
  window.fetch=function(input,init){
    return isPlantRead(input,init)?pagedFetch(input,init):originalFetch(input,init);
  };
})();
