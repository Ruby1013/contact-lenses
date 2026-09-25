const money = new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 });
let products = [];
let targetBrands = [];
let sourceSites = [];
let selectedBrand = null;
let supplementalBrands = [];
let minimumBrandItems = 3;
const $ = (id) => document.getElementById(id);

function targetBrand(product) {
  if (product.rankingBasis === 'box') return supplementalBrands.find(brand => brand.name === product.brand);
  const haystack = `${product.brand} ${product.product}`.toLowerCase();
  return targetBrands.find(brand => brand.aliases.some(alias => haystack.includes(alias.toLowerCase())));
}

function brandChoices() {
  const visible = supplementalBrands.filter(b => b.itemCount >= minimumBrandItems);
  const other = supplementalBrands.filter(b => b.itemCount < minimumBrandItems);
  return { visible, other };
}

function matchesBrand(product, selected) {
  if (!selected) return Boolean(targetBrand(product));
  if (selected === '其他') return product.rankingBasis === 'box' && brandChoices().other.some(b => b.name === product.brand);
  return targetBrand(product)?.name === selected;
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
  const extra = $('additional-brand-grid'); extra.innerHTML = '';
  $('additional-brands').hidden = Boolean(selectedBrand);
  const { visible, other } = brandChoices();
  [...visible, ...(other.length ? [{name:'其他', itemCount:other.reduce((sum,b)=>sum+b.itemCount,0)}] : [])].forEach(brand => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'brand-button';
    const title = document.createElement('span'); title.textContent = brand.name;
    const count = document.createElement('small'); count.textContent = brand.name === '其他' ? `${other.length} 個品牌・${brand.itemCount} 款可比價` : `${brand.itemCount} 款可比價品項`;
    button.append(title,count);button.addEventListener('click',()=>selectBrand(brand.name));extra.append(button);
  });
  const filters = $('other-brand-filters'); filters.innerHTML = ''; filters.hidden = selectedBrand !== '其他';
  if (selectedBrand === '其他') other.forEach(brand=>{
    const button=document.createElement('button');button.type='button';button.className='other-brand-button';
    button.textContent=`${brand.name} (${brand.itemCount})`;button.addEventListener('click',()=>selectBrand(brand.name));filters.append(button);
  });
  const note=$('selected-brand-note');
  if(selectedBrand === '其他') note.textContent='收錄少於 3 款可比價品項的品牌。可直接選擇下方品牌。';
  else if(supplementalBrands.some(b=>b.name===selectedBrand)) note.textContent='單販、量販分開排名，以每盒均價比較。資料日期：2026/09/22–09/23。';
}

function selectBrand(name) {
  selectedBrand = name;
  if (name) document.querySelector('#shipping-guide .shipping-all').open = false;
  renderBrandGrid();
  $('verified-ranking').hidden = true;
  $('lq-winners').hidden = true;
  render();
  $(name && name !== '其他' ? 'comparison' : 'brand-picker').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function comparisonKey(product) {
  return product.comparisonKey || `${targetBrand(product)?.name || product.brand}|${product.product}`;
}

function comparisonName(product) {
  return product.comparisonName || product.product;
}

function isSolution(product) {
  return product.productType === 'solution' || Number.isFinite(product.totalVolumeMl) ||
    (Number.isFinite(product.volumeMl) && product.volumeMl > 0);
}

function normalizeProduct(product) {
  if (product.rankingBasis === 'box') return {...product, unitPrice:product.salePrice/product.receivedBoxes};
  if (!isSolution(product)) return { ...product,
    unitPrice: Number.isFinite(product.salePrice) && product.totalPieces > 0
      ? product.salePrice / product.totalPieces : null };
  const totalVolumeMl = product.totalVolumeMl ??
    product.volumeMl * ((product.boughtBoxes ?? 1) + (product.giftBoxes ?? 0));
  return { ...product, totalVolumeMl,
    unitPrice: Number.isFinite(totalVolumeMl) && totalVolumeMl > 0 && Number.isFinite(product.salePrice)
      ? product.salePrice / totalVolumeMl : null };
}

function metricLabel(product) {
  if (product.rankingBasis === 'box') return '每盒';
  return isSolution(product) ? '每毫升' : '每片';
}

function groupMetricLabel(group) {
  return metricLabel(group.products[0]);
}

function sourceCount(group) {
  return new Set(group.products.map(product => product.source)).size;
}

function formatUnitPrice(product) {
  if (product.rankingBasis === 'box') return `NT$${product.unitPrice.toFixed(2)}`;
  return isSolution(product)
    ? `NT$${product.unitPrice.toFixed(2)}`
    : money.format(Math.floor(product.unitPrice));
}

function spreadsheetRankingModes(records) {
  const compare=(a,b)=>(a.salePrice/a.receivedBoxes-b.salePrice/b.receivedBoxes)||(a.salePrice-b.salePrice);
  return ['單販','量販'].map(kind=>{
    const rows=groupForRanking(records.filter(p=>p.purchaseMode===kind),compare)[0]?.products||[];
    return {name:kind==='單販'?'單販比價':'量販比價',products:rows.map(p=>({...p,priceRank:1+rows.filter(other=>Math.round(other.unitPrice*1e6)<Math.round(p.unitPrice*1e6)).length}))};
  });
}

function appendSpreadsheetRankings(root, group, records) {
  const section=document.createElement('section');section.className='ranking-group spreadsheet-group';
  const title=document.createElement('h3');title.textContent=group.name;section.append(title);
  spreadsheetRankingModes(records.filter(p=>comparisonKey(p)===group.key)).filter(mode=>mode.products.length>=2).forEach(mode=>{
    const block=document.createElement('section');block.className='purchase-ranking';
    const heading=document.createElement('div');heading.className='ranking-heading';
    const label=document.createElement('h4');label.textContent=mode.name;
    const coverage=document.createElement('p');coverage.className='coverage';
    coverage.textContent=mode.products.length>=2?`${mode.products.length} 家・每盒均價由低到高`:'不足 2 家，暫不排名';
    heading.append(label,coverage);block.append(heading);
    const cards=document.createElement('div');cards.className='rankings';block.append(cards);
    if(mode.products.length>=2) appendRankings(cards,mode.products,heading,true);
    else {const p=document.createElement('p');p.className='pending-source';p.textContent='目前沒有足夠的同規格跨店報價。';cards.append(p);}
    section.append(block);
  });root.append(section);
}

function rankingComparator(a, b) {
  if (isSolution(a) || isSolution(b)) {
    const price = p => Number.isFinite(p.unitPrice) && p.unitPrice > 0 ? p.unitPrice : Infinity;
    return (price(a) - price(b)) || ((a.salePrice ?? Infinity) - (b.salePrice ?? Infinity));
  }
  const truncatedUnitDifference = Math.floor(a.unitPrice ?? Infinity) - Math.floor(b.unitPrice ?? Infinity);
  if (truncatedUnitDifference) return truncatedUnitDifference;

  const checkoutDifference = (a.salePrice ?? Infinity) - (b.salePrice ?? Infinity);
  if (checkoutDifference) return checkoutDifference;

  return 0;
}

function groupForRanking(records, comparator = rankingComparator) {
  const groups = new Map();
  records.forEach(product => {
    if (product.comparisonEligible === false) return;
    const key = comparisonKey(product);
    if (!groups.has(key)) groups.set(key, { key, name: comparisonName(product), products: [] });
    groups.get(key).products.push(product);
  });
  return [...groups.values()]
    .map(group => {
      const sorted = group.products.sort(comparator);
      const sources = new Set();
      return { ...group, products: sorted.filter(product => {
        if (sources.has(product.source)) return false;
        sources.add(product.source);
        return true;
      }) };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));
}

function cooperRankingModes(records) {
  const exactCost = p => Number.isFinite(p.salePrice) && p.totalPieces > 0
    ? p.salePrice / p.totalPieces : Infinity;
  const bestOffer = (a, b) => (exactCost(a) - exactCost(b)) || (a.salePrice - b.salePrice);
  const quantity = p => Number.isFinite(p.totalPieces) && p.totalPieces > 0 ? p.totalPieces : 0;
  const largestOffer = (a, b) => (quantity(b) - quantity(a)) || bestOffer(a, b);
  const truncatedCost = p => Number.isFinite(p.salePrice) && p.totalPieces > 0
    ? Math.floor(p.salePrice / p.totalPieces) : Infinity;
  const compare = (a, b) => (truncatedCost(a) - truncatedCost(b)) || (a.salePrice - b.salePrice);
  return [
    { name: '單盒比價', accepts: p => p.boughtBoxes === 1, choose: bestOffer },
    { name: '量販比價', accepts: p => p.boughtBoxes > 1, choose: largestOffer }
  ].map(mode => ({ name: mode.name,
    // Bulk uses each shop's largest recorded bundle, including same-product gifts.
    products: (groupForRanking(records.filter(mode.accepts), mode.choose)[0]?.products || []).sort(compare) }));
}

function appendCooperRankings(root, group, records) {
  const section = document.createElement('section');
  section.className = 'ranking-group cooper-group';
  const title = document.createElement('h3');
  title.textContent = group.name;
  section.append(title);
  // Split the raw offers before choosing each shop's cheapest offer.
  cooperRankingModes(records.filter(p => comparisonKey(p) === group.key)).forEach(mode => {
    const block = document.createElement('section');
    block.className = 'purchase-ranking';
    const heading = document.createElement('div');
    heading.className = 'ranking-heading';
    const label = document.createElement('h4');
    label.textContent = mode.name;
    const coverage = document.createElement('p');
    coverage.className = 'coverage';
    const count = mode.products.length;
    coverage.textContent = count ? `已收錄 ${count} 家・顯示前 ${Math.min(count, 3)} 名` : '尚無已收錄方案';
    heading.append(label, coverage);
    const cards = document.createElement('div');
    cards.className = 'rankings';
    block.append(heading, cards);
    if (count) {
      appendRankings(cards, mode.products.map(p => ({ ...p, unitPrice: Math.floor(p.salePrice / p.totalPieces) })), heading);
    } else {
      const empty = document.createElement('p');
      empty.className = 'pending-source';
      empty.textContent = '目前尚未收錄此類方案，並不代表商家沒有販售。';
      cards.append(empty);
    }
    section.append(block);
  });
  root.append(section);
}

function appendProductCard(root, product, rank, rankLabel, precise = false) {
  const card = $('card-template').content.cloneNode(true);
  card.querySelector('.rank').textContent = rankLabel || `第 ${product.priceRank || rank} 低價`;
  card.querySelector('.source').textContent = product.source;
  card.querySelector('h2').textContent = product.product;
  card.querySelector('.offer').textContent = isSolution(product)
    ? `${product.volumeMl ? `${product.volumeMl} ML／瓶・` : ''}總容量 ${product.totalVolumeMl || '?'} ML${product.note ? `・${product.note}` : ''}`
    : `${product.piecesPerBox || '?'} 片／盒・買 ${product.boughtBoxes} 盒${product.giftBoxes ? `・送 ${product.giftBoxes} 盒` : ''}${product.note ? `・${product.note}` : ''}`;
  if(product.rankingBasis==='box') card.querySelector('.offer').textContent=`${product.piecesPerBox} 片／盒・到貨 ${product.receivedBoxes} 盒（含已計入贈盒）・${product.note}`;
  card.querySelector('.prices strong').textContent = money.format(product.salePrice);
  card.querySelector('.prices span').textContent = product.listPrice ? `原價 ${money.format(product.listPrice)}` : '';
  card.querySelector('.unit').textContent = product.unitPrice ? `${metricLabel(product)}約 ${precise ? `NT$${product.unitPrice.toFixed(2)}` : formatUnitPrice(product)}` : isSolution(product) ? '缺少容量，無法換算' : '缺少片數，無法換算';
  card.querySelector('.checked').textContent = `更新：${new Date(product.checkedAt).toLocaleDateString('zh-TW')}`;
  const link = card.querySelector('a'); link.href = product.url;
  root.append(card);
}

function renderSourceOverview() {
  const hasSourceData = (site) => products.some(product => product.source === site.name ||
    (site.name === '鏡后' && product.source === '鏡后 Lenses Queen'));
  const activeCount = sourceSites.filter(hasSourceData).length;
  $('source-overview-summary').textContent = `追蹤 ${sourceSites.length} 個網站；其中 ${activeCount} 站已有公開價格資料。`;
  const root = $('source-overview-links');
  root.innerHTML = '';
  sourceSites.forEach(site => {
    const link = document.createElement('a');
    const active = hasSourceData(site);
    link.className = `source-site${active ? ' active' : ''}`;
    link.href = site.url;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.innerHTML = `<strong>${site.name}</strong><span>${active ? '已列入比價' : '價格核對中'}</span>`;
    root.append(link);
  });
}

function appendRankings(root, products, heading, precise = false) {
  products.slice(0, 3).forEach((product, index) => appendProductCard(root, product, index + 1, null, precise));
  const remaining = products.slice(3, 10);
  if (!remaining.length) return;
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'more-rankings-button';
  toggle.textContent = '查看第 4～10 名';
  const extra = document.createElement('div');
  extra.className = 'rankings extra-rankings';
  extra.hidden = true;
  remaining.forEach((product, index) => appendProductCard(extra, product, index + 4, null, precise));
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
  const groups = groupForRanking(products).filter(group => sourceCount(group) >= 3);
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
    const siteCount = sourceCount(group);
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
    .filter(group => sourceCount(group) >= 3);
  $('lq-summary').textContent = `已完成 ${winners.length} 款品項的三站以上比價，以下直接顯示每款最便宜前三名。`;
  const root = $('lq-products'); root.innerHTML = '';
  winners.forEach(group => {
    const section = $('ranking-template').content.cloneNode(true);
    section.querySelector('.comparison-name').textContent = `同規格・${groupMetricLabel(group)}成本排序`;
    section.querySelector('h3').textContent = group.name;
    section.querySelector('.coverage').textContent = `已比對 ${sourceCount(group)} 個官網・顯示前三名`;
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
    matchesBrand(p, selectedBrand))
    .sort((a, b) => field === 'checkedAt' ? b[field].localeCompare(a[field]) : (a[field] ?? Infinity) - (b[field] ?? Infinity));
  const groups = groupForRanking(filtered)
    .filter(group => group.products[0]?.rankingBasis==='box' ? spreadsheetRankingModes(filtered.filter(p=>comparisonKey(p)===group.key)).some(m=>m.products.length>=2) : sourceCount(group) >= 3)
    .sort((a, b) => {
    const sourceDifference = new Set(b.products.map(product => product.source)).size - new Set(a.products.map(product => product.source)).size;
    return sourceDifference || a.name.localeCompare(b.name, 'zh-Hant');
    });
  const title = selectedBrand ? `${selectedBrand} 全部已比價品項・最便宜前三名` : '熱門基本款・同規格每片成本排序';
  $('comparison-title').textContent = title;
  $('comparison-kicker').textContent = selectedBrand ? `${selectedBrand.toUpperCase()} · PRICE COMPARISON` : 'PRICE COMPARISON';
  $('comparison-description').textContent = selectedBrand
    ? '只顯示至少 3 個來源都有同規格品項的比價，依每片成本排序；點「查看商品」可回原官網確認。'
    : '只保留至少 3 個來源都有同規格品項的比價，依每片成本排序。';
  $('summary').textContent = selectedBrand
    ? `已收錄 ${groups.length} 款符合三站比價的 ${selectedBrand} 品項。`
    : `已整理 ${groups.length} 款符合三站比價的基本品項、${filtered.length} 筆公開價格資料`;
  if(filtered.some(p=>p.rankingBasis==='box')) {
    $('comparison-description').textContent='單販與量販分開比較。新增品牌依同系列、週期及包裝規格，以每盒均價排序；花色與購買限制請見原品名。';
    $('summary').textContent=`${selectedBrand || '全部品牌'}：${groups.length} 款可比價品項。新增品牌每個子榜至少收錄 2 家；原有品牌沿用既有比價規則。`;
  }
  const root = $('products'); root.innerHTML = '';
  $('empty-state').hidden = groups.length !== 0;
  groups.forEach(group => {
    if(group.products[0]?.rankingBasis==='box') {appendSpreadsheetRankings(root,group,filtered);return;}
    if (!isSolution(group.products[0])) {
      appendCooperRankings(root, group, filtered);
      return;
    }
    const section = $('ranking-template').content.cloneNode(true);
    section.querySelector('.comparison-name').textContent = `同規格・${groupMetricLabel(group)}成本排序`;
    section.querySelector('h3').textContent = group.name;
    const siteCount = sourceCount(group);
    section.querySelector('.coverage').textContent = `已比對 ${siteCount} 個官網・顯示前三名`;
    const rankings = section.querySelector('.rankings');
    appendRankings(rankings, group.products, section.querySelector('.ranking-heading'));
    root.append(section);
  });
}

function applyAidaiUpdate(data, update) {
  const keys = new Set(update.replacedComparisonKeys);
  return data.filter(p => !(p.source === '愛戴' && keys.has(p.comparisonKey))).concat(update.offers);
}

Promise.all([
  fetch('products.json?v=funnyeyes-20260923').then(response => response.json()),
  fetch('target_brands.json').then(response => response.json()),
  fetch('source-sites.json').then(response => response.json()),
  fetch('aidai-offers.json').then(response => { if (!response.ok) throw new Error('愛戴資料載入失敗'); return response.json(); }),
  fetch('brand-rankings.json?v=20260925-queen-scope-1').then(response=>{if(!response.ok)throw new Error('新增品牌資料載入失敗');return response.json();})
]).then(([data, brands, sites, aidai, additional]) => {
  supplementalBrands=additional.brands;minimumBrandItems=additional.minimumBrandItems;
  products = applyAidaiUpdate(data, aidai).concat(additional.offers).map(normalizeProduct); targetBrands = brands; sourceSites = sites;
  $('brand-picker').after($('comparison'));
  $('comparison').querySelector('.comparison-heading').hidden = true;
  [...new Set(products.map(p => p.source))].sort().forEach(name => $('source').add(new Option(name, name)));
  const sourcePoolHtml = `比價來源池（${sourceSites.length} 站）：${sourceSites.map(site => `<a href="${site.url}" target="_blank" rel="noreferrer">${site.name}</a>`).join('、')}。`;
  $('source-pool').innerHTML = sourcePoolHtml;
  $('source-pool-home').innerHTML = sourcePoolHtml;
  $('clear-brand').addEventListener('click', () => selectBrand(null));
  renderSourceOverview();
  renderBrandGrid();
  renderVerifiedRankings();
  renderLensesQueenWinners();
  render();
});
['search', 'source', 'sort'].forEach(id => $(id).addEventListener(id === 'search' ? 'input' : 'change', render));
