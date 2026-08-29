(function(){
  const scripts=[
    'plantdex-runtime-guard.js?v=20260828-unified1',
    'plantdex-cloud-v2.js?v=20260828-mobile-savefix1',
    'plantdex-pedigree.js?v=20260828-pedigree1'
  ];
  if(document.readyState==='loading'){
    document.write(scripts.map(src=>'<scr'+'ipt src="'+src+'"></scr'+'ipt>').join(''));
  }else{
    const load=i=>{
      if(i>=scripts.length)return;
      const s=document.createElement('script');
      s.src=scripts[i];
      s.onload=()=>load(i+1);
      document.head.appendChild(s);
    };
    load(0);
  }
})();