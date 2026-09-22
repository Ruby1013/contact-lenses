const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, 'public', name), 'utf8');
const catalog = JSON.parse(read('aidai-catalog.json'));
const update = JSON.parse(read('aidai-offers.json'));
const original = JSON.parse(read('products.json'));
assert.equal(catalog.length, 628);
assert.equal(new Set(catalog.map(p => p.id)).size, 628);
assert.equal(new Set(catalog.map(p => p.brand)).size, 47);
assert.equal(update.replacedComparisonKeys.length, 71);
for (const p of update.offers) {
  const q = catalog.find(q => q.id === p.sourceProductId);
  assert.ok(q); assert.equal(p.url, q.url); assert.equal(p.product, q.name);
  assert.ok(p.salePrice > 0); assert.equal(p.unitPrice, p.salePrice / p.totalPieces);
  assert.equal(p.totalPieces, p.piecesPerBox * (p.boughtBoxes + p.giftBoxes));
  assert.match(p.checkedAt, /^2026-09-22/);
  if (p.boughtBoxes === 1) assert.equal(p.salePrice, p.sourceProductId === '1406' ? 130 : q.price);
}
const offer = (id, bought) => update.offers.find(p => p.sourceProductId === id && p.boughtBoxes === bought);
// Regression cases: changed promotions, paid/gift counts, and average box prices.
assert.equal(offer('1690', 2).salePrice, 675);
assert.equal(offer('990', 3).salePrice, 1450);
assert.equal(offer('1057', 3).salePrice, 2450);
assert.equal(offer('1721', 5).salePrice, 3099);
assert.equal(offer('1721', 5).totalPieces, 180);
assert.equal(offer('1050', 7).salePrice, 6751);
assert.equal(offer('1050', 7).totalPieces, 240);
assert.equal(offer('1681', 8).totalPieces, 240); // Different-series gift excluded.
assert.equal(offer('1790', 8).salePrice, 4792);
assert.equal(offer('1615', 1).comparisonEligible, false);
assert.equal(offer('962', 2), undefined); // Do not carry forward expired two-box offer.
assert.equal(offer('951', 2), undefined); // Conflicting list/detail activity totals.
assert.equal(offer('2889', 4), undefined); // Apparent typo is not silently corrected.
assert.equal(offer('1410', 5).salePrice, 5400);
assert.equal(offer('1459', 7).salePrice, 2450);
const context = vm.createContext({ Intl });
vm.runInContext(read('app.js').split('Promise.all([')[0], context);
context.original = original; context.update = update;
const result = vm.runInContext('applyAidaiUpdate(original, update)', context);
assert.deepEqual(Array.from(result.filter(p => p.source !== '愛戴')), original.filter(p => p.source !== '愛戴'));
assert.equal(result.filter(p => p.source === '愛戴' && p.comparisonKey === 'cooper-clariti-toric-daily-30').length, 2);
context.records = result;
const modes = vm.runInContext('cooperRankingModes(records.filter(p => p.comparisonKey === "cooper-clariti-daily-30"))', context);
assert.ok(modes[0].products.some(p => p.source === '愛戴' && p.boughtBoxes === 1));
assert.ok(modes[1].products.some(p => p.source === '愛戴' && p.boughtBoxes === 5 && p.totalPieces === 180));
vm.runInContext(read('aidai.js').split("fetch('aidai-catalog.json')")[0], context);
context.catalogData = catalog;
assert.equal(vm.runInContext('filterCatalog(catalogData, "不存在的商品xyz", "", "asc").length', context), 0);
const filtered = vm.runInContext('filterCatalog(catalogData, "珂朗清", "酷柏CooperVision", "asc")', context);
assert.ok(filtered.length >= 4);
assert.ok(filtered.every((p, i) => !i || filtered[i - 1].price <= p.price));
assert.equal(catalog[0].id, '2766'); // Sorting must not mutate source order.
console.log('PASS: 628 products, reviewed offer arithmetic, stale-offer replacement, retailer preservation, search and sort.');
