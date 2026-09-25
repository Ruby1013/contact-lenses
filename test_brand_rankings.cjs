const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const extra=JSON.parse(fs.readFileSync('public/brand-rankings.json','utf8'));
const scope=JSON.parse(fs.readFileSync('queen-product-scope.json','utf8'));
const ctx=vm.createContext({Intl});
vm.runInContext(fs.readFileSync('public/app.js','utf8').split('Promise.all([')[0],ctx);
ctx.extra=extra;ctx.base=JSON.parse(fs.readFileSync('public/target_brands.json','utf8'));
vm.runInContext('supplementalBrands=extra.brands;targetBrands=base;products=extra.offers.map(normalizeProduct)',ctx);
assert.equal(extra.catalog.length,54);
assert.equal(new Set(extra.offers.map(p=>p.comparisonKey)).size,54);
for(const [mode,count] of [['單販',53],['量販',10]]) {
 const own=extra.offers.filter(p=>p.purchaseMode===mode&&p.source==='鏡后 Lenses Queen');
 assert.equal(own.length,count);
 for(const q of scope.modes[mode].quotes){
  const row=extra.offers.find(p=>p.comparisonKey==='queen-'+q[0]&&p.purchaseMode===mode&&p.product===q[7]&&p.salePrice===q[4]);
  assert(row);assert.equal(row.receivedBoxes,q[5]);assert.equal(row.priceRank,q[3]);
 }
}
for(const item of extra.catalog){
 ctx.key='queen-'+item.productId;
 const modes=vm.runInContext('spreadsheetRankingModes(products.filter(p=>p.comparisonKey===key))',ctx);
 assert.equal(modes.length,2);
 assert(modes.some(m=>m.products.some(p=>p.source==='鏡后 Lenses Queen')));
 for(const m of modes){
  assert.equal(m.products.length,new Set(m.products.map(p=>p.source)).size);
  for(let i=1;i<m.products.length;i++)assert(m.products[i].unitPrice>=m.products[i-1].unitPrice);
 }
}
assert(extra.offers.some(p=>p.source==='鏡后 Lenses Queen'&&p.priceRank>3));
assert(extra.offers.some(p=>p.priceRank===null));
assert.equal(vm.runInContext('targetBrand({brand:"酷柏",product:"寶晴"}).name',ctx),'酷柏');
assert.equal(vm.runInContext('groupForRanking(products).length',ctx),54);
for(const p of extra.offers){assert(p.salePrice>0);assert(p.receivedBoxes>0);assert(/^https:\/\//.test(p.url));}
console.log('PASS: all 54 source products, 53 single and 10 bulk offers, original workbook prices/ranks, Queen outside top 3, singleton listings and legacy brands.');
