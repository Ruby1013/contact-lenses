let catalog=[];
const el=id=>document.getElementById(id);
function selectCatalog(data,query='',brand='',order='default'){
 const term=query.trim().toLocaleLowerCase();
 const rows=data.filter(p=>(!brand||p.brand===brand)&&(!term||`${p.brand} ${p.name} ${p.promotion}`.toLocaleLowerCase().includes(term)));
 if(order!=='default')rows.sort((a,b)=>(a.price-b.price)*(order==='asc'?1:-1));
 return rows;
}
function renderCatalog(){
 const rows=selectCatalog(catalog,el('query').value,el('brand').value,el('sort').value);
 el('count').textContent=`顯示 ${rows.length} / ${catalog.length} 個品項`;
 const fragment=document.createDocumentFragment();
 for(const p of rows){
  const tr=document.createElement('tr');
  for(const [i,value] of [p.brand,p.name,p.price.toLocaleString('zh-TW'),p.original===null?'—':p.original.toLocaleString('zh-TW'),p.promotion||'—'].entries()){
   const td=document.createElement('td');td.textContent=value;if(i===2||i===3)td.className='money';tr.append(td);
  }
  const td=document.createElement('td'),a=document.createElement('a');a.href=p.url;a.textContent='查看商品';a.target='_blank';a.rel='noopener noreferrer';td.append(a);tr.append(td);fragment.append(tr);
 }
 el('catalog').replaceChildren(fragment);
}
fetch('lemulens-catalog.json').then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json();}).then(data=>{
 catalog=data;
 for(const name of [...new Set(data.map(p=>p.brand))].sort((a,b)=>a.localeCompare(b,'zh-Hant'))){const option=document.createElement('option');option.value=name;option.textContent=name;el('brand').append(option);}
 renderCatalog();for(const id of ['query','brand','sort'])el(id).addEventListener('input',renderCatalog);
}).catch(()=>{el('count').textContent='商品資料暫時無法載入，請重新整理或下載 Excel 價格表。';});
