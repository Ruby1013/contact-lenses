let catalog = [];
const el = id => document.getElementById(id);

function filterCatalog(data, query, brand, order) {
  const search = query.trim().toLocaleLowerCase();
  const rows = data.filter(p => (!search || `${p.brand} ${p.name} ${p.promotion}`.toLocaleLowerCase().includes(search)) && (!brand || p.brand === brand));
  if (order !== 'default') rows.sort((a, b) => (a.price - b.price) * (order === 'asc' ? 1 : -1));
  return rows;
}

function renderCatalog() {
  const rows = filterCatalog(catalog, el('query').value, el('brand').value, el('sort').value);
  el('count').textContent = `顯示 ${rows.length} / ${catalog.length} 個品項`;
  const fragment = document.createDocumentFragment();
  for (const p of rows) {
    const tr = document.createElement('tr');
    const values = [p.brand, p.name, p.price.toLocaleString('zh-TW'), p.original === null ? '—' : p.original.toLocaleString('zh-TW'), p.promotion || '—'];
    values.forEach((value, index) => {
      const td = document.createElement('td'); td.textContent = value;
      if (index === 2 || index === 3) td.className = 'money';
      tr.append(td);
    });
    const td = document.createElement('td'); const link = document.createElement('a');
    link.href = p.url; link.textContent = '查看商品'; link.target = '_blank'; link.rel = 'noopener noreferrer';
    td.append(link); tr.append(td); fragment.append(tr);
  }
  el('catalog').replaceChildren(fragment);
}

fetch('aidai-catalog.json').then(response => {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}).then(data => {
  catalog = data;
  for (const name of [...new Set(data.map(p => p.brand))].sort((a, b) => a.localeCompare(b, 'zh-Hant'))) {
    const option = document.createElement('option'); option.value = name; option.textContent = name; el('brand').append(option);
  }
  renderCatalog();
  for (const id of ['query', 'brand', 'sort']) el(id).addEventListener('input', renderCatalog);
}).catch(() => { el('count').textContent = '商品資料暫時無法載入，請重新整理或下載 Excel 價格表。'; });
