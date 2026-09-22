const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, 'public', name), 'utf8');
const context = vm.createContext({Intl});
vm.runInContext(read('app.js').split('Promise.all([')[0], context);
context.data = JSON.parse(read('products.json'));
const modes = vm.runInContext('cooperRankingModes(data.filter(p => p.comparisonKey === "cooper-myday-daily-30"))', context);
assert.deepEqual(Array.from(modes, m => m.products.length), [3, 1]);
assert.equal(modes[0].products[0].source, '鏡后 Lenses Queen');
assert.equal(modes[1].products[0].source, 'OMO Lens');
context.offers = [
  {source:'A', comparisonKey:'x', boughtBoxes:1, giftBoxes:1, salePrice:600, totalPieces:60},
  {source:'A', comparisonKey:'x', boughtBoxes:4, salePrice:1100, totalPieces:120},
  {source:'B', comparisonKey:'x', boughtBoxes:1, salePrice:290, totalPieces:30},
];
const split = vm.runInContext('cooperRankingModes(offers)', context);
assert.equal(split[0].products.length, 2);
assert.equal(split[0].products[0].source, 'B');
assert.equal(split[0].products[1].boughtBoxes, 1); // Buy-one gifts remain single-box
assert.equal(split[1].products.length, 1);
assert.equal(split[1].products[0].boughtBoxes, 4);
assert.equal(vm.runInContext('cooperRankingModes([offers[0]])[1].products.length', context), 0);
console.log('PASS: Cooper single/bulk rankings, same-shop offers, gifts, precise costs and empty groups.');
