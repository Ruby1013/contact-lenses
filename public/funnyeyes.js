let catalog=[];
const el=id=>document.getElementById(id);
function renderCatalog(){
 const query=el('query').value.trim().toLocaleLowerCase(); const category=el('category').value;
 const rows=catalog.filter(p=>(!query||`${p.name} ${p.categories.join(' ')}`.toLocaleLowerCase().includes(query))&&(!category||p.categories.includes(category)));
 const order=el('sort').value;if(order!=='default')rows.sort((a,b)=>(a.price-b.price)*(order==='asc'?1:-1));
 el('count').textContent=`顯示 ${rows.length} / ${catalog.length} 個品項`;
 const fragment=document.createDocumentFragment();
 for(const p of rows){const tr=document.createElement('tr');for(const [i,value] of [p.categories.filter(c=>!['特價商品','特價商品區'].includes(c)).join('、'),p.name,p.price.toLocaleString('zh-TW'),p.original===null?'—':p.original.toLocaleString('zh-TW')].entries()){const td=document.createElement('td');td.textContent=value;if(i>1)td.className='money';tr.append(td);}const td=document.createElement('td');const a=document.createElement('a');a.href=p.url;a.textContent='查看商品';a.target='_blank';a.rel='noopener noreferrer';td.append(a);tr.append(td);fragment.append(tr);}el('catalog').replaceChildren(fragment);
}
fetch('funnyeyes-catalog.json').then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json();}).then(data=>{data=data.map(p=>({...p,categories:p.categories.map(c=>c.name)}));catalog=data;for(const name of [...new Set(data.flatMap(p=>p.categories))].sort()){const option=document.createElement('option');option.value=name;option.textContent=name;el('category').append(option);}renderCatalog();for(const id of ['query','category','sort'])el(id).addEventListener('input',renderCatalog);}).catch(()=>{el('count').textContent='商品資料暫時無法載入，請重新整理或下載 Excel 價格表。';});
