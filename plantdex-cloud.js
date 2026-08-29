(function(){
  if(document.readyState==='loading'){
    document.write('<scr'+'ipt src="plantdex-cloud-v2.js?v=20260828-mobile-savefix1"></scr'+'ipt><scr'+'ipt src="plantdex-pedigree.js?v=20260828-pedigree1"></scr'+'ipt>');
  }else{
    const cloud=document.createElement('script');
    cloud.src='plantdex-cloud-v2.js?v=20260828-mobile-savefix1';
    cloud.onload=()=>{
      const pedigree=document.createElement('script');
      pedigree.src='plantdex-pedigree.js?v=20260828-pedigree1';
      document.head.appendChild(pedigree);
    };
    document.head.appendChild(cloud);
  }
})();