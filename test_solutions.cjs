const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, 'public', name), 'utf8');
let fields;
const context = vm.createContext({ Intl, document: { getElementById: () => ({content: {
  cloneNode() {
    fields = {};
    return {querySelector(selector) { return fields[selector] ??= {}; }};
  }
}})}});
vm.runInContext(read('app.js').split('Promise.all([')[0], context);
context.data = JSON.parse(read('products.json'));
vm.runInContext('products = data.map(normalizeProduct)', context);
const solutions = vm.runInContext('products.filter(isSolution)', context);
assert.equal(solutions.length, 19);
for (const p of solutions) {
  assert.ok(p.totalVolumeMl > 0);
  assert.equal(p.unitPrice, p.salePrice / p.totalVolumeMl);
}
const group = vm.runInContext('groupForRanking(products).find(g => g.key === "miacare-qing-solution-360ml")', context);
assert.deepEqual(Array.from(group.products, p => p.source), ['OMO Lens', '屈臣氏', '鏡后 Lenses Queen']);
assert.equal(group.products[0].volumeMl, 360);
assert.equal(group.products[0].totalVolumeMl, 1440);
for (const [i, expected] of ['NT$0.35', 'NT$0.50', 'NT$0.54'].entries()) {
  context.p = group.products[i];
  vm.runInContext('appendProductCard({append() {}}, p, 1)', context);
  assert.equal(fields['.unit'].textContent, `每毫升約 ${expected}`);
  assert.match(fields['.offer'].textContent, /360 ML／瓶/);
  assert.doesNotMatch(fields['.offer'].textContent, /片／盒|1440 ML／瓶/);
}
assert.equal(vm.runInContext('normalizeProduct({volumeMl: 300, boughtBoxes: 6, salePrice: 1150, unitPrice: 0}).unitPrice', context), 1150 / 1800);
assert.equal(vm.runInContext('normalizeProduct({productType: "solution", salePrice: 195}).unitPrice', context), null);
assert.ok(vm.runInContext('rankingComparator({productType: "solution", unitPrice: null, salePrice: 10}, {productType: "solution", unitPrice: 0.5, salePrice: 179})', context) > 0);
const drops = solutions.find(p => p.comparisonKey.includes('drops'));
assert.equal(drops.totalVolumeMl, 15);
assert.equal(drops.unitPrice, 16);
console.log('PASS: 19 solution records, decimal ranking, bundle totals, rendered unit labels, missing capacity and drops.');
