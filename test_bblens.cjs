const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=name=>JSON.parse(fs.readFileSync(path.join(__dirname,name),'utf8'));
const catalog=read('public/bblens-catalog.json'),products=read('public/products.json'),check=read('public/bblens-price-check.json');
const isBB=p=>p.url.includes('bblens.tw');
assert.equal(catalog.length,235);assert.equal(new Set(catalog.map(p=>p.url)).size,235);
assert.equal(check.priceChanges.length,0);assert.equal(check.added.length,1);
const offers=products.filter(isBB),base=offers.filter(p=>!p.offerType);
assert.equal(base.length,121);assert.equal(offers.length,157);
for(const p of offers){const q=catalog.find(q=>q.url===p.url);assert.ok(q);assert.equal(p.totalPieces,p.piecesPerBox*(p.boughtBoxes+p.giftBoxes));assert.equal(p.unitPrice,p.salePrice/p.totalPieces);assert.equal(p.checkedAt,check.checkedAt);assert.match(p.checkedAt,/^2026-09-23/);if(!p.offerType)assert.equal(p.salePrice,q.price);}
const item=(id,promo=false)=>offers.find(p=>p.sourceProductId===String(id)&&Boolean(p.offerType)===promo);
assert.equal(item(70).salePrice,900);assert.equal(item(70).totalPieces,6);assert.equal(item(70,true),undefined);
assert.equal(item(71).salePrice,2400);assert.equal(item(71).totalPieces,18);assert.equal(item(71).boughtBoxes,3);
assert.equal(item(85).salePrice,240);assert.equal(item(86).salePrice,920);assert.equal(item(86).boughtBoxes,4);
assert.equal(item(159,true).salePrice,1850);assert.equal(item(159,true).totalPieces,60);
assert.equal(item(57,true).salePrice,2400);assert.equal(item(57,true).totalPieces,60);
assert.equal(item(151),undefined);assert.equal(item(153),undefined);assert.equal(item(93).comparisonEligible,false);
const context={fetch:()=>new Promise(()=>{})};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'public/bblens.js'),'utf8'),context);
assert.equal(context.selectCatalog(catalog,'不存在的商品','default').length,0);
assert.equal(context.selectCatalog(catalog,'歐舒適二週拋','asc').length,2);
assert.equal(context.selectCatalog(catalog,'','asc')[0].price,15);
assert.equal(context.selectCatalog(catalog,'','desc')[0].price,8100);
for(const page of ['index.html','bblens.html']){const html=fs.readFileSync(path.join(__dirname,'public',page),'utf8');assert.ok(html.includes('2026/09/23'));assert.ok(html.includes('bblens-prices-2026-09-23.xlsx'));assert.ok(!html.includes('bblens-prices-2026-09-22.xlsx'));}
console.log('PASS: 235 catalog entries, 157 offers, verified September 23 dates, current promotions, package quantities, brand isolation, search and sorting.');
