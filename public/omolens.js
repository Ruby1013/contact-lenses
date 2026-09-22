let catalog=[];
const el=id=>document.getElementById(id);
function selectCatalog(data,query,sort,availability='all'){
  const text=query.trim().toLocaleLowerCase();
  const rows=data.filter(p=>(!text||`${p.name} ${p.promo}`.toLocaleLowerCase().includes(text))&&(availability==='all'||p.soldOut===(availability==='soldout')));
  if(sort!=='default')rows.sort((a,b)=>(a.price-b.price)*(sort==='asc'?1:-1));
  return rows;
}
function renderCatalog(){
  const rows=selectCatalog(catalog,el('query').value,el('sort').value,el('availability').value);
  el('count').textContent=`顯示 ${rows.length} / ${catalog.length} 個品項`;
  const fragment=document.createDocumentFragment();
  for(const p of rows){
    const tr=document.createElement('tr');
    for(const [i,value] of [p.name,p.price.toLocaleString('zh-TW'),p.promo||'—',p.soldOut?'售完':'未標示售完'].entries()){
      const td=document.createElement('td');td.textContent=value;if(i===1)td.className='money';if(i===3&&p.soldOut)td.className='sold-out';tr.append(td);
    }
    const td=document.createElement('td'),a=document.createElement('a');a.href=p.url;a.textContent='查看商品';a.target='_blank';a.rel='noopener noreferrer';td.append(a);tr.append(td);fragment.append(tr);
  }
  el('catalog').replaceChildren(fragment);
}
fetch('omolens-catalog.json').then(r=>{if(!r.ok)throw Error(`HTTP ${r.status}`);return r.json();}).then(data=>{
  catalog=data;renderCatalog();for(const id of ['query','sort','availability'])el(id).addEventListener('input',renderCatalog);
}).catch(()=>{el('count').textContent='商品資料暫時無法載入，請重新整理或下載 Excel 價格表。';});
