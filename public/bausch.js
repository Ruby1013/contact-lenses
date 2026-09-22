let catalog=[];
const el=id=>document.getElementById(id);
function selectCatalog(data,query,kind,sort){
  const text=query.trim().toLocaleLowerCase();
  const rows=data.filter(p=>(!kind||p.kind===kind)&&(!text||`${p.name} ${p.color}`.toLocaleLowerCase().includes(text)));
  if(sort!=='default')rows.sort((a,b)=>(a.price-b.price)*(sort==='asc'?1:-1));
  return rows;
}
function renderCatalog(){
  const rows=selectCatalog(catalog,el('query').value,el('kind').value,el('sort').value);
  el('count').textContent=`顯示 ${rows.length} / ${catalog.length} 個品項`;
  const fragment=document.createDocumentFragment();
  for(const p of rows){
    const tr=document.createElement('tr');
    const values=[p.name,p.kind,p.color,p.pieces,p.price.toLocaleString('zh-TW'),(p.price/p.pieces).toFixed(2)];
    for(const [i,value] of values.entries()){const td=document.createElement('td');td.textContent=value;if(i>=3)td.className='money';tr.append(td);}
    const td=document.createElement('td'),a=document.createElement('a');a.href=p.url;a.textContent='查看商品';a.target='_blank';a.rel='noopener noreferrer';td.append(a);tr.append(td);fragment.append(tr);
  }
  el('catalog').replaceChildren(fragment);
}
fetch('bausch-catalog.json').then(r=>{if(!r.ok)throw Error(`HTTP ${r.status}`);return r.json();}).then(data=>{
  catalog=data;renderCatalog();for(const id of ['query','kind','sort'])el(id).addEventListener('input',renderCatalog);
}).catch(()=>{el('count').textContent='商品資料暫時無法載入，請重新整理或下載 Excel 價格表。';});
