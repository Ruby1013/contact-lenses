const money = new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 });
let products = [];
let targetBrands = [];
let sourceSites = [];
let selectedBrand = null;
const $ = (id) => document.getElementById(id);

function targetBrand(product) {
  const haystack = `${product.brand} ${product.product}`.toLowerCase();
  return targetBrands.find(brand => brand.aliases.some(alias => haystack.includes(alias.toLowerCase())));
}

function renderBrandGrid() {
  const grid = $('brand-grid'); grid.innerHTML = '';
  grid.hidden = Boolean(selectedBrand);
  $('brand-picker').classList.toggle('brand-selected', Boolean(selectedBrand));
  $('brand-picker-title').textContent = selectedBrand ? `已選擇：${selectedBrand}` : '選擇你要比價的品牌';
  $('selected-brand-note').hidden = !selectedBrand;
  $('selected-brand-note').textContent = selectedBrand ? '正在顯示這個品牌所有已完成比價的品項。' : '';
  $('clear-brand').textContent = selectedBrand ? '重新選擇品牌' : '全部排行榜';
  $('clear-brand').hidden = !selectedBrand;
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
  renderBrandGrid();
  $('verified-ranking').hidden = Boolean(selectedBrand);
  $('lq-winners').hidden = Boolean(selectedBrand);
  render();
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
    .map(group => {
      const sorted = group.products.sort((a, b) => (a.unitPrice ?? Infinity) - (b.unitPrice ?? Infinity));
      const sources = new Set();
      return { ...group, products: sorted.filter(product => {
        if (sources.has(product.source)) return false;
        sources.add(product.source);
        return true;
      }) };
    })
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

function appendRankings(root, products, heading) {
  products.slice(0, 3).forEach((product, index) => appendProductCard(root, product, index + 1));
  const remaining = products.slice(3, 10);
  if (!remaining.length) return;
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'more-rankings-button';
  toggle.textContent = '查看第 4～10 名';
  const extra = document.createElement('div');
  extra.className = 'rankings extra-rankings';
  extra.hidden = true;
  remaining.forEach((product, index) => appendProductCard(extra, product, index + 4));
  toggle.addEventListener('click', () => {
    extra.hidden = !extra.hidden;
    toggle.textContent = extra.hidden ? '查看第 4～10 名' : '收起其他名次';
  });
  heading.append(toggle);
  root.after(extra);
}

function renderVerifiedRankings() {
  const representativeKeys = {
    '酷柏': 'cooper-oculclear-daily-30',
    '博士倫': 'bausch-biotrue-daily-30',
    '安儷': 'anley-love-color-daily-10',
    '海昌': 'hydron-mind-color-daily-10',
    '嬌生安視優': 'acuvue-moist-daily-30',
    '美若康': 'miacare-zhanmei-xingsu-daily-10',
    '愛爾康': 'alcon-total1-daily-30',
    '帝康': 'ticon-aspheric-clear-daily-20',
    '星歐': 'largan-clear-daily-30'
  };
  const groups = groupForRanking(products);
  $('verified-summary').textContent = '同規格・每片成本排序';
  const root = $('verified-products'); root.innerHTML = '';
  targetBrands.forEach(brand => {
    const group = groups.find(item => item.key === representativeKeys[brand.name]);
    const section = $('ranking-template').content.cloneNode(true);
    section.querySelector('.comparison-name').textContent = `${brand.name}・同規格每片成本排序`;
    if (!group) {
      section.querySelector('h3').textContent = `${brand.name} 代表基本款`;
      section.querySelector('.coverage').textContent = '品項資料核對中';
      section.querySelector('.rankings').innerHTML = '<p class="pending-source">這個品牌的代表基本款正在逐站核對公開售價，確認規格一致後才會列入前三名。</p>';
      root.append(section);
      return;
    }
    const siteCount = new Set(group.products.map(product => product.source)).size;
    section.querySelector('h3').textContent = group.name;
    section.querySelector('.coverage').textContent = siteCount >= 3
      ? `已比對 ${siteCount} 個官網・顯示前三名`
      : `目前已比對 ${siteCount} 個官網・持續補價`;
    const rankings = section.querySelector('.rankings');
    appendRankings(rankings, group.products, section.querySelector('.ranking-heading'));
    root.append(section);
  });
}

function renderLensesQueenWinners() {
  const winners = groupForRanking(products)
    .filter(group => new Set(group.products.map(product => product.source)).size >= 3);
  $('lq-summary').textContent = `已完成 ${winners.length} 款品項的三站以上比價，以下直接顯示每款最便宜前三名。`;
  const root = $('lq-products'); root.innerHTML = '';
  winners.forEach(group => {
    const section = $('ranking-template').content.cloneNode(true);
    section.querySelector('.comparison-name').textContent = '同規格・每片成本排序';
    section.querySelector('h3').textContent = group.name;
    section.querySelector('.coverage').textContent = `已比對 ${new Set(group.products.map(product => product.source)).size} 個官網・顯示前三名`;
    const rankings = section.querySelector('.rankings');
    appendRankings(rankings, group.products, section.querySelector('.ranking-heading'));
    root.append(section);
  });
}

function render() {
  $('comparison').hidden = false;
  const query = $('search').value.trim().toLowerCase();
  const source = $('source').value;
  const field = $('sort').value;
  const filtered = products.filter(p => (!source || p.source === source) &&
    (!query || [p.brand, p.product, p.source].join(' ').toLowerCase().includes(query)) &&
    targetBrand(p) && (!selectedBrand || targetBrand(p)?.name === selectedBrand))
    .sort((a, b) => field === 'checkedAt' ? b[field].localeCompare(a[field]) : (a[field] ?? Infinity) - (b[field] ?? Infinity));
  const groups = groupForRanking(filtered).sort((a, b) => {
    const sourceDifference = new Set(b.products.map(product => product.source)).size - new Set(a.products.map(product => product.source)).size;
    return sourceDifference || a.name.localeCompare(b.name, 'zh-Hant');
  });
  const title = selectedBrand ? `${selectedBrand} 全部已比價品項・最便宜前三名` : '熱門基本款・同規格每片成本排序';
  $('comparison-title').textContent = title;
  $('comparison-kicker').textContent = selectedBrand ? `${selectedBrand.toUpperCase()} · PRICE COMPARISON` : 'PRICE COMPARISON';
  $('comparison-description').textContent = selectedBrand
    ? '顯示此品牌所有已收錄品項，依同系列同規格的每片成本排序；點「查看商品」可回原官網確認。'
    : '先從九宮格選品牌可縮小結果；下方則保留所有已收錄熱門基本款的同規格價格排序。';
  $('summary').textContent = selectedBrand
    ? `已收錄 ${groups.length} 款 ${selectedBrand} 品項。`
    : `已整理 ${groups.length} 款基本品項、${filtered.length} 筆公開價格資料`;
  const root = $('products'); root.innerHTML = '';
  $('empty-state').hidden = groups.length !== 0;
  groups.forEach(group => {
    const section = $('ranking-template').content.cloneNode(true);
    section.querySelector('.comparison-name').textContent = '同規格・每片成本排序';
    section.querySelector('h3').textContent = group.name;
    const siteCount = new Set(group.products.map(product => product.source)).size;
    section.querySelector('.coverage').textContent = siteCount >= 3
      ? `已比對 ${siteCount} 個官網・顯示前三名`
      : `已比對 ${siteCount} 個官網`;
    const rankings = section.querySelector('.rankings');
    appendRankings(rankings, group.products, section.querySelector('.ranking-heading'));
    root.append(section);
  });
}

Promise.all([
  fetch('products.json').then(response => response.json()),
  fetch('target_brands.json').then(response => response.json()),
  fetch('source-sites.json').then(response => response.json())
]).then(([data, brands, sites]) => {
  products = data; targetBrands = brands; sourceSites = sites;
  [...new Set(products.map(p => p.source))].sort().forEach(name => $('source').add(new Option(name, name)));
  $('source-pool').innerHTML = `比價來源池（${sourceSites.length} 站）：${sourceSites.map(site => `<a href="${site.url}" target="_blank" rel="noreferrer">${site.name}</a>`).join('、')}。排行榜只會納入該品項實際有販售且規格可對齊的網站。`;
  $('clear-brand').addEventListener('click', () => selectBrand(null));
  renderBrandGrid();
  renderVerifiedRankings();
  renderLensesQueenWinners();
  render();
});
['search', 'source', 'sort'].forEach(id => $(id).addEventListener(id === 'search' ? 'input' : 'change', render));
