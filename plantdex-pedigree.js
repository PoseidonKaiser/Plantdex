(function(){
const METHODS=['Top cutting','Mid cutting','Node','Division','Corm','Pup / offset','Leaf cutting','Stem cutting','Seed','Tissue culture','Other'];
const STATUSES=['Rooting','Established','Transferred','Gifted','Sold','Failed'];
let installed=false;

function e(v=''){return typeof esc==='function'?esc(v):String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
function today(){return new Date().toISOString().slice(0,10);}
function byId(id){return (typeof plants!=='undefined'?plants:[]).find(p=>String(p.id)===String(id));}
function childrenOf(id){return (typeof plants!=='undefined'?plants:[]).filter(p=>String(p.parentPlantId||'')===String(id));}
function generationOf(p,seen=new Set()){
  if(!p)return 0;
  if(Number.isFinite(Number(p.generation))&&p.generation!=='')return Number(p.generation);
  if(!p.parentPlantId||seen.has(String(p.id)))return 0;
  seen.add(String(p.id));
  return generationOf(byId(p.parentPlantId),seen)+1;
}
function displayId(p){
  if(p?.propagationId)return p.propagationId;
  if(typeof plantDisplayId==='function')return plantDisplayId(p);
  return String(p?.id||'plant').slice(0,10).toUpperCase();
}
function nextPropagationId(parent){
  const base=displayId(parent);
  const used=childrenOf(parent.id).map(c=>String(c.propagationId||''));
  let n=1, candidate='';
  do{candidate=base+'-P'+String(n++).padStart(2,'0');}while(used.includes(candidate));
  return candidate;
}

function ensureStyle(){
  if(document.getElementById('plantdexPedigreeStyle'))return;
  const s=document.createElement('style');s.id='plantdexPedigreeStyle';s.textContent=`
    .pedigree-fields{grid-column:1/-1;border:1px solid var(--line);border-radius:14px;padding:14px;margin-top:4px}
    .pedigree-fields h4{margin:0 0 12px;font-size:1rem}
    .pedigree-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    .pedigree-grid label{display:grid;gap:6px}
    .pedigree-card .pedigree-summary{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
    .pedigree-link{border:1px solid var(--line);background:transparent;color:inherit;border-radius:10px;padding:8px 10px;cursor:pointer;text-align:left}
    .pedigree-link:hover{transform:none}
    .pedigree-family{display:grid;gap:8px;margin-top:10px}
    .pedigree-muted{color:var(--muted);font-size:.9rem}
    @media(max-width:650px){.pedigree-grid{grid-template-columns:1fr}}
  `;document.head.appendChild(s);
}

function ensureFields(){
  if(document.getElementById('pedigreeFields'))return;
  const form=document.querySelector('dialog form'); if(!form)return;
  const box=document.createElement('div');box.id='pedigreeFields';box.className='pedigree-fields';
  box.innerHTML=`<h4>🌱 Pedigree / Propagation</h4><div class="pedigree-grid">
    <label><span>Parent Plant</span><select id="parentPlantId"><option value="">Original / unknown parent</option></select></label>
    <label><span>Generation</span><input id="generation" type="number" min="0" readonly></label>
    <label><span>Propagation ID</span><input id="propagationId" type="text" placeholder="Auto-generated for offspring"></label>
    <label><span>Propagation Date</span><input id="propagationDate" type="date"></label>
    <label><span>Method</span><select id="propagationMethod"><option value="">—</option>${METHODS.map(x=>`<option>${e(x)}</option>`).join('')}</select></label>
    <label><span>Status</span><select id="propagationStatus"><option value="">—</option>${STATUSES.map(x=>`<option>${e(x)}</option>`).join('')}</select></label>
    <label style="grid-column:1/-1"><span>Origin Position / Notes</span><input id="originPosition" type="text" placeholder="Top cutting, corm #2, basal pup…"></label>
  </div>`;
  const actions=form.querySelector('.actions');
  if(actions)form.insertBefore(box,actions);else form.appendChild(box);
  document.getElementById('parentPlantId').addEventListener('change',()=>{
    const parent=byId(document.getElementById('parentPlantId').value);
    document.getElementById('generation').value=parent?generationOf(parent)+1:0;
    if(parent&&!document.getElementById('propagationId').value)document.getElementById('propagationId').value=nextPropagationId(parent);
    if(parent&&!document.getElementById('plantId').value)document.getElementById('plantId').value=uid();
  });
}

function refreshParentOptions(currentId){
  const sel=document.getElementById('parentPlantId');if(!sel)return;
  const current=sel.value;
  sel.innerHTML='<option value="">Original / unknown parent</option>'+(typeof plants==='undefined'?'':plants.filter(p=>String(p.id)!==String(currentId||'')).map(p=>`<option value="${e(p.id)}">${e(p.nickname||p.type||'Unnamed')} · ${e(displayId(p))}</option>`).join(''));
  sel.value=current;
}
function fillFields(p){
  ensureFields();refreshParentOptions(p?.id);
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v??'';};
  set('parentPlantId',p?.parentPlantId||'');
  set('generation',p?generationOf(p):0);
  set('propagationId',p?.propagationId||'');
  set('propagationDate',p?.propagationDate||'');
  set('propagationMethod',p?.propagationMethod||'');
  set('propagationStatus',p?.propagationStatus||'');
  set('originPosition',p?.originPosition||'');
}
function pedigreeSnapshot(){
  const val=id=>document.getElementById(id)?.value||'';
  return {parentPlantId:val('parentPlantId'),generation:Number(val('generation')||0),propagationId:val('propagationId').trim(),propagationDate:val('propagationDate'),propagationMethod:val('propagationMethod'),propagationStatus:val('propagationStatus'),originPosition:val('originPosition').trim()};
}
function persistPedigree(id,data,attempt=0){
  const p=byId(id);
  if(!p){if(attempt<30)setTimeout(()=>persistPedigree(id,data,attempt+1),150);return;}
  Object.assign(p,data);
  if(!p.parentPlantId){p.generation=0; if(!p.propagationDate&&!p.propagationMethod&&!p.propagationStatus&&!p.originPosition&&!p.propagationId){delete p.parentPlantId;delete p.generation;}}
  if(typeof savePlants==='function')savePlants();
  if(typeof render==='function')render();
  if(typeof activeProfileId!=='undefined'&&activeProfileId===id&&typeof renderProfile==='function')renderProfile();
}

function hookForm(){
  const form=document.querySelector('dialog form');if(!form||form.dataset.pedigreeHooked)return;
  form.dataset.pedigreeHooked='1';
  form.addEventListener('submit',()=>{
    const id=document.getElementById('plantId')?.value||'';
    const data=pedigreeSnapshot();
    if(id)setTimeout(()=>persistPedigree(id,data),0);
  });
  document.getElementById('addBtn')?.addEventListener('click',()=>setTimeout(()=>fillFields(null),0));
  const baseEdit=window.editPlant;
  if(typeof baseEdit==='function')window.editPlant=id=>{baseEdit(id);setTimeout(()=>fillFields(byId(id)),0);};
}

window.propagatePlant=id=>{
  const parent=byId(id);if(!parent)return;
  const childId=uid();
  const draft={id:childId,type:parent.type||'',genus:parent.genus||'',cultivar:parent.cultivar||'',subgenre:parent.subgenre||'',rarity:parent.rarity||'',quantity:1,source:'Propagation',health:'Good',parentPlantId:parent.id,generation:generationOf(parent)+1,propagationId:nextPropagationId(parent),propagationDate:today(),propagationMethod:'',propagationStatus:'Rooting',originPosition:''};
  if(typeof openForm==='function')openForm(draft);
  fillFields(draft);
  document.getElementById('dialogTitle').textContent='Propagate '+(parent.nickname||parent.type||'Plant');
};

function ancestorTrail(p){
  const out=[];let cur=p,guard=0;
  while(cur?.parentPlantId&&guard++<12){const parent=byId(cur.parentPlantId);if(!parent)break;out.unshift(parent);cur=parent;}
  return out;
}
function renderPedigreeCard(){
  const p=typeof profilePlant==='function'?profilePlant():null;if(!p)return;
  const grid=document.querySelector('.profile-grid');if(!grid)return;
  let card=document.getElementById('pedigreeProfileCard');if(!card){card=document.createElement('div');card.id='pedigreeProfileCard';card.className='profile-card pedigree-card';grid.prepend(card);}
  const parent=byId(p.parentPlantId);const children=childrenOf(p.id);const ancestors=ancestorTrail(p);const gen=generationOf(p);
  card.innerHTML=`<h3>🌿 Pedigree / Lineage</h3>
    <div class="pedigree-summary"><span class="badge">G${gen}</span><span class="badge">${e(p.propagationId||displayId(p))}</span>${p.propagationMethod?`<span class="badge">${e(p.propagationMethod)}</span>`:''}${p.propagationStatus?`<span class="badge">${e(p.propagationStatus)}</span>`:''}</div>
    ${ancestors.length?`<div class="pedigree-muted">Lineage: ${ancestors.map(a=>e(a.nickname||a.type||displayId(a))).join(' → ')} → <strong>${e(p.nickname||p.type||displayId(p))}</strong></div>`:`<div class="pedigree-muted">${parent?'Known propagated plant':'Original / acquired plant (G0)'}</div>`}
    <div class="pedigree-family">
      <div><strong>Parent</strong></div>${parent?`<button class="pedigree-link" type="button" onclick="viewProfile('${e(parent.id)}')">${e(parent.nickname||parent.type||'Parent')} · ${e(displayId(parent))}</button>`:'<div class="pedigree-muted">No known parent in PlantDex</div>'}
      <div style="margin-top:6px"><strong>Propagation</strong></div><div class="pedigree-muted">${p.propagationDate?(typeof fmtDate==='function'?fmtDate(p.propagationDate):p.propagationDate):'—'}${p.originPosition?' · '+e(p.originPosition):''}</div>
      <div style="margin-top:6px"><strong>Offspring (${children.length})</strong></div>${children.length?children.map(c=>`<button class="pedigree-link" type="button" onclick="viewProfile('${e(c.id)}')">${e(c.nickname||c.type||'Offspring')} · G${generationOf(c)} · ${e(displayId(c))}</button>`).join(''):'<div class="pedigree-muted">No propagated offspring recorded yet.</div>'}
    </div>`;
  const actions=document.querySelector('#profileHeader .profile-actions');
  if(actions&&!actions.querySelector('.pedigree-propagate')){const b=document.createElement('button');b.type='button';b.className='secondary pedigree-propagate';b.textContent='🌱 Propagate';b.onclick=()=>propagatePlant(p.id);actions.appendChild(b);}
}

function hookProfile(){
  const base=window.viewProfile;if(typeof base==='function'&&!base._pedigree){const wrapped=id=>{base(id);setTimeout(renderPedigreeCard,0);};wrapped._pedigree=true;window.viewProfile=wrapped;}
  const rr=window.renderProfile||((typeof renderProfile==='function')?renderProfile:null);
  if(typeof rr==='function'&&!rr._pedigree){const wrapped=()=>{rr();setTimeout(renderPedigreeCard,0);};wrapped._pedigree=true;window.renderProfile=wrapped;}
}
function install(){if(installed)return;ensureStyle();ensureFields();hookForm();hookProfile();installed=true;setTimeout(()=>{if(typeof activeProfileId!=='undefined'&&activeProfileId)renderPedigreeCard();},100);}
let tries=0;const timer=setInterval(()=>{tries++;if(document.querySelector('dialog form')&&typeof plants!=='undefined'){clearInterval(timer);install();}else if(tries>100)clearInterval(timer);},100);
})();
