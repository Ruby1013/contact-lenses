const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, 'public', name), 'utf8');
const context = vm.createContext({Intl});
vm.runInContext(read('app.js').split('Promise.all([')[0], context);
context.data = JSON.parse(read('products.json'));
const modes = vm.runInContext('cooperRankingModes(data.filter(p => p.comparisonKey === "cooper-myday-daily-30"))', context);
assert.deepEqual(Array.from(modes, m => m.products.length), [6, 3]);
assert.equal(modes[0].products[0].source, '鏡后 Lenses Queen');
assert.equal(modes[1].products[0].source, 'OMO Lens');
context.offers = [
  {source:'A', comparisonKey:'x', boughtBoxes:1, giftBoxes:1, salePrice:600, totalPieces:60},
  {source:'A', comparisonKey:'x', boughtBoxes:4, salePrice:1100, totalPieces:120},
  {source:'B', comparisonKey:'x', boughtBoxes:1, salePrice:290, totalPieces:30},
];
const split = vm.runInContext('cooperRankingModes(offers)', context);
context.bulkOffers = [
  {source:'A', comparisonKey:'bulk', boughtBoxes:2, salePrice:300, totalPieces:60},
  {source:'A', comparisonKey:'bulk', boughtBoxes:5, giftBoxes:1, salePrice:1650, totalPieces:180},
  {source:'A', comparisonKey:'bulk', boughtBoxes:6, salePrice:1800, totalPieces:180},
  {source:'B', comparisonKey:'bulk', boughtBoxes:3, salePrice:600, totalPieces:90},
];
const largest = vm.runInContext('cooperRankingModes(bulkOffers)[1].products', context);
assert.equal(largest.length, 2);
assert.equal(largest.find(p => p.source === 'A').totalPieces, 180);
assert.equal(largest.find(p => p.source === 'A').salePrice, 1650);
assert.equal(largest[0].source, 'B'); // Select largest per shop, then rank shops by price.
assert.equal(split[0].products.length, 2);
assert.equal(split[0].products[0].source, 'B');
assert.equal(split[0].products[1].boughtBoxes, 1); // Buy-one gifts remain single-box
assert.equal(split[1].products.length, 1);
assert.equal(split[1].products[0].boughtBoxes, 4);
assert.equal(vm.runInContext('cooperRankingModes([offers[0]])[1].products.length', context), 0);
context.tieOffers = [
  {source:'Higher exact cost but lower checkout', comparisonKey:'tie', boughtBoxes:1, salePrice:310, totalPieces:30},
  {source:'Lower exact cost but higher checkout', comparisonKey:'tie', boughtBoxes:1, salePrice:600, totalPieces:60},
];
const tied = vm.runInContext('cooperRankingModes(tieOffers)', context);
assert.equal(tied[0].products[0].source, 'Higher exact cost but lower checkout');
assert.match(vm.runInContext("formatUnitPrice({ unitPrice: 9.99 })", context), /9$/);
console.log('PASS: Cooper single/bulk rankings use truncated integer per-piece prices.');

const singles = vm.runInContext('cooperRankingModes(data.filter(p => p.comparisonKey === "cooper-oculclear-daily-30"))[0].products', context);
const bulk = vm.runInContext('cooperRankingModes(data.filter(p => p.comparisonKey === "cooper-oculclear-daily-30"))[1].products', context);
const moreFine = bulk.find(p => p.source === 'MoreFine');
assert.equal(moreFine.boughtBoxes, 5);
assert.equal(moreFine.giftBoxes, 1);
assert.equal(moreFine.totalPieces, 180);
assert.equal(moreFine.salePrice, 1650);
assert.equal(bulk.filter(p => p.source === 'MoreFine').length, 1);
assert.deepEqual(Array.from(singles.slice(0, 3), p => p.source), ['鏡后 Lenses Queen', 'OMO Lens', 'MoreFine']);
assert.equal(singles.find(p => p.source === 'OMO Lens').salePrice, 310);
assert.equal(singles.find(p => p.source === 'MoreFine').salePrice, 330);
const findOffer = (source, key, boxes) => context.data.find(p => p.source === source && p.comparisonKey === key && p.boughtBoxes === boxes);
assert.equal(findOffer('睛美', 'cooper-oculclear-daily-30', 7).totalPieces, 240);
assert.equal(findOffer('睛美', 'cooper-proclear-toric-daily-30', 6).totalPieces, 180);
assert.equal(findOffer('睛美', 'cooper-clariti-multifocal-daily-30', 5).salePrice, 7100);
assert.equal(findOffer('愛戴', 'cooper-biofinity-monthly-6', 3).salePrice, 2450);
assert.equal(findOffer('愛戴', 'cooper-oculclear-vitality-daily-30', 4).salePrice, 1600);
for (const p of context.data.filter(p => p.brand === '酷柏')) {
  assert.equal(p.unitPrice, p.salePrice / p.totalPieces);
  assert.ok(p.totalPieces >= p.piecesPerBox * p.boughtBoxes);
}
