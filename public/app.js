const money = new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 });
let products = [];
let targetBrands = [];
let selectedBrand = null;
const $ = (id) => document.getElementById(id);

function targetBrand(product) {
  const haystack = `${product.brand} ${product.product}`.toLowerCase();
  return targetBrands.find(brand => brand.aliases.some(alias => haystack.includes(alias.toLowerCase())));
}

function renderBrandGrid() {
  const grid = $('brand-grid'); grid.innerHTML = '';
  targetBrands.forEach(brand => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = `brand-button${selectedBrand === brand.name ? ' active' : ''}`;
    const count = new Set(products.filter(product => targetBrand(product)?.name === brand.name).map(comparisonKey)).size;
    button.innerHTML = `<span>${brand.name}</span><small>${count ? `已收錄 ${count} 款基本品項` : '熱門基本款比價'}</small>`;
    button.addEventListener('click', () => selectBrand(brand.name));
    grid.append(button);
  });
}

function selectBrand(name) {
  selectedBrand = name;
  window.history.replaceState(null, '', `#${encodeURIComponent(name)}`);
  renderBrandGrid(); render();
  $('comparison').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function comparisonKey(product) {
  return product.comparisonKey || `${targetBrand(product)?.name || product.brand}|${product.product}`;
}

function comparisonName(product) {
  return product.comparisonName || product.product;
}

function groupForRanking(records) {
  const groups = new Map();
  records.forEach(product => {
    const key = comparisonKey(product);
    if (!groups.has(key)) groups.set(key, { key, name: comparisonName(product), products: [] });
    groups.get(key).products.push(product);
  });
  return [...groups.values()]
    .map(group => ({ ...group, products: group.products.sort((a, b) => (a.unitPrice ?? Infinity) - (b.unitPrice ?? Infinity)) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));
}

function appendProductCard(root, product, rank) {
  const card = $('card-template').content.cloneNode(true);
  card.querySelector('.rank').textContent = `第 ${rank} 低價`;
  card.querySelector('.source').textContent = product.source;
  card.querySelector('h2').textContent = product.product;
  card.querySelector('.offer').textContent = `${product.piecesPerBox || '?'} 片／盒・買 ${product.boughtBoxes} 盒${product.giftBoxes ? `・送 ${product.giftBoxes} 盒` : ''}${product.note ? `・${product.note}` : ''}`;
  card.querySelector('.prices strong').textContent = money.format(product.salePrice);
  card.querySelector('.prices span').textContent = product.listPrice ? `原價 ${money.format(product.listPrice)}` : '';
  card.querySelector('.unit').textContent = product.unitPrice ? `每片約 ${money.format(product.unitPrice)}` : '缺少片數，無法換算';
  card.querySelector('.checked').textContent = `更新：${new Date(product.checkedAt).toLocaleDateString('zh-TW')}`;
  const link = card.querySelector('a'); link.href = product.url;
  root.append(card);
}

function render() {
  $('comparison').hidden = !selectedBrand;
  $('landing-message').hidden = Boolean(selectedBrand);
  if (!selectedBrand) return;
  const query = $('search').value.trim().toLowerCase();
  const source = $('source').value;
  const field = $('sort').value;
  const filtered = products.filter(p => (!source || p.source === source) &&
    (!query || [p.brand, p.product, p.source].join(' ').toLowerCase().includes(query)) &&
    targetBrand(p) && (!selectedBrand || targetBrand(p)?.name === selectedBrand))
    .sort((a, b) => field === 'checkedAt' ? b[field].localeCompare(a[field]) : (a[field] ?? Infinity) - (b[field] ?? Infinity));
  const groups = groupForRanking(filtered);
  const title = `${selectedBrand} 熱門基本款・最便宜前三名`;
  $('comparison-title').textContent = title;
  $('comparison-kicker').textContent = `${selectedBrand.toUpperCase()} · PRICE COMPARISON`;
  $('comparison-description').textContent = '每個品項依同系列、同規格與相同促銷門檻比價；排名以每片成本計算，點「查看商品」可回原官網確認。';
  $('summary').textContent = `已整理 ${groups.length} 款基本品項、${filtered.length} 筆公開價格資料${selectedBrand ? `（${selectedBrand}）` : ''}`;
  const root = $('products'); root.innerHTML = '';
  $('empty-state').hidden = groups.length !== 0;
  groups.forEach(group => {
    const section = $('ranking-template').content.cloneNode(true);
    section.querySelector('.comparison-name').textContent = '同規格・每片成本排序';
    section.querySelector('h3').textContent = group.name;
    section.querySelector('.coverage').textContent = group.products.length >= 3
      ? `三個官網・顯示前三名`
      : `目前僅收錄 ${group.products.length} 家`;
    const rankings = section.querySelector('.rankings');
    group.products.slice(0, 3).forEach((product, index) => appendProductCard(rankings, product, index + 1));
    root.append(section);
  });
}

Promise.all([fetch('products.json').then(response => response.json()), fetch('target_brands.json').then(response => response.json())]).then(([data, brands]) => {
  products = data; targetBrands = brands;
  const requested = decodeURIComponent(window.location.hash.slice(1));
  if (targetBrands.some(brand => brand.name === requested)) selectedBrand = requested;
  [...new Set(products.map(p => p.source))].sort().forEach(name => $('source').add(new Option(name, name)));
  renderBrandGrid();
  render();
});
['search', 'source', 'sort'].forEach(id => $(id).addEventListener(id === 'search' ? 'input' : 'change', render));
