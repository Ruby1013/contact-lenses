const money = new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 });
let products = [];
let targetBrands = [];
let commonProducts = [];
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
    button.innerHTML = `<span>${brand.name}</span><small>查看價格</small>`;
    button.addEventListener('click', () => selectBrand(brand.name));
    grid.append(button);
  });
}

function selectBrand(name) {
  selectedBrand = name;
  if (name) window.history.replaceState(null, '', `#${encodeURIComponent(name)}`);
  else window.history.replaceState(null, '', window.location.pathname);
  renderBrandGrid(); render();
  if (name) $('comparison').scrollIntoView({ behavior: 'smooth', block: 'start' });
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

function renderSharedProducts() {
  const visible = commonProducts.filter(item => !selectedBrand || item.brand === selectedBrand);
  $('shared-title').textContent = selectedBrand ? `${selectedBrand}・三站共同販售品項` : '三站共同販售品項';
  $('shared-description').textContent = visible.length
    ? `目前確認 ${visible.length} 項：鏡后、睛美與 BBLens 的公開商品目錄皆有列出。`
    : selectedBrand
      ? `${selectedBrand} 目前未出現在三站共同清單；BBLens 的公開總覽未列出此品牌商品。`
      : '僅列出鏡后、睛美與 BBLens 的公開商品目錄都出現的同系列、同規格品項。';
  const root = $('shared-list'); root.innerHTML = '';
  visible.forEach(item => {
    const card = $('shared-template').content.cloneNode(true);
    card.querySelector('h3').textContent = item.product;
    card.querySelector('p').textContent = item.spec;
    root.append(card);
  });
}

function render() {
  const query = $('search').value.trim().toLowerCase();
  const source = $('source').value;
  const field = $('sort').value;
  const filtered = products.filter(p => (!source || p.source === source) &&
    (!query || [p.brand, p.product, p.source].join(' ').toLowerCase().includes(query)) &&
    targetBrand(p) && (!selectedBrand || targetBrand(p)?.name === selectedBrand))
    .sort((a, b) => field === 'checkedAt' ? b[field].localeCompare(a[field]) : (a[field] ?? Infinity) - (b[field] ?? Infinity));
  const groups = groupForRanking(filtered);
  renderSharedProducts();
  const title = selectedBrand ? `${selectedBrand} 各品項前三低價` : '九大品牌各品項前三低價';
  $('comparison-title').textContent = title;
  $('comparison-kicker').textContent = selectedBrand ? `${selectedBrand.toUpperCase()} · PRICE COMPARISON` : 'PRICE COMPARISON';
  $('comparison-description').textContent = selectedBrand
    ? `每個品項只比較同系列、同片數與相同促銷門檻的資料；依每片成本列出前三低價。`
    : '點選上方品牌後，查看每個可對齊品項在各個來源網站的前三低價。';
  $('summary').textContent = `已整理 ${groups.length} 個可比較品項、${filtered.length} 筆公開價格資料${selectedBrand ? `（${selectedBrand}）` : '（九大品牌）'}`;
  const root = $('products'); root.innerHTML = '';
  $('empty-state').hidden = groups.length !== 0;
  groups.forEach(group => {
    const section = $('ranking-template').content.cloneNode(true);
    section.querySelector('.comparison-name').textContent = '同規格比價';
    section.querySelector('h3').textContent = group.name;
    section.querySelector('.coverage').textContent = group.products.length >= 3
      ? `已收錄 ${group.products.length} 家・顯示前三名`
      : `目前僅收錄 ${group.products.length} 家`;
    const rankings = section.querySelector('.rankings');
    group.products.slice(0, 3).forEach((product, index) => appendProductCard(rankings, product, index + 1));
    root.append(section);
  });
}

Promise.all([fetch('products.json').then(response => response.json()), fetch('target_brands.json').then(response => response.json()), fetch('common-products.json').then(response => response.json())]).then(([data, brands, common]) => {
  products = data; targetBrands = brands; commonProducts = common;
  const requested = decodeURIComponent(window.location.hash.slice(1));
  if (targetBrands.some(brand => brand.name === requested)) selectedBrand = requested;
  [...new Set(products.map(p => p.source))].sort().forEach(name => $('source').add(new Option(name, name)));
  $('clear-brand').addEventListener('click', () => selectBrand(null));
  renderBrandGrid();
  render();
});
['search', 'source', 'sort'].forEach(id => $(id).addEventListener(id === 'search' ? 'input' : 'change', render));
