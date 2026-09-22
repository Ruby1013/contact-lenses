const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=name=>JSON.parse(fs.readFileSync(path.join(__dirname,name),'utf8'));
const catalog=read('public/morefine-catalog.json'),products=read('public/products.json');
const report=read('audit/morefine-2026-09-22/report.json');
assert.equal(catalog.length,119);assert.equal(new Set(catalog.map(p=>p.url)).size,119);
assert.equal(catalog.filter(p=>p.prices.length).length,116);
const offers=products.filter(p=>p.source==='MoreFine'&&p.sourceProductId!==undefined);
assert.equal(offers.length,129);
for(const p of offers){
  const q=catalog[+p.sourceProductId];assert.equal(p.url,q.url);
  assert.equal(p.totalPieces,p.piecesPerBox*(p.boughtBoxes+p.giftBoxes)+p.giftPieces);
  assert.equal(p.unitPrice,p.salePrice/p.totalPieces);
  if(!p.offerType){assert.equal(p.salePrice,q.prices[0]);assert.equal(p.boughtBoxes,1);}
}
const item=(id,promo=false)=>offers.find(p=>p.sourceProductId===String(id)&&Boolean(p.offerType)===promo);
assert.equal(item(31,true).salePrice,1650);assert.equal(item(31,true).totalPieces,180);
assert.equal(item(30,true).salePrice,760);assert.equal(item(30,true).totalPieces,70);
assert.equal(item(24,true).salePrice,2400);assert.equal(item(24,true).totalPieces,150);
assert.equal(item(25,true).salePrice,2200);assert.equal(item(25,true).totalPieces,120);
assert.equal(item(82,true).salePrice,999);assert.equal(item(82,true).totalPieces,40);
assert.equal(item(102,true).salePrice,800);assert.equal(item(102,true).totalPieces,60);
const old=read('audit/morefine-2026-09-22/before.json');
assert.deepEqual(products.filter(p=>p.source==='MoreFine'&&!report.replacedComparisonKeys.includes(p.comparisonKey)),old.filter(p=>!report.replacedComparisonKeys.includes(p.comparisonKey)));
const context={fetch:()=>new Promise(()=>{})};vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'public/morefine.js'),'utf8'),context);
assert.equal(context.selectCatalog(catalog,'找不到的品名','default').length,0);
assert.equal(context.selectCatalog(catalog,'暖暖','default').length,2);
for(const sort of ['asc','desc'])assert.equal(context.selectCatalog(catalog,'',sort).slice(-3).filter(p=>!p.prices.length).length,3);
assert.equal(context.selectCatalog(catalog,'','asc')[0].prices[0],100);
assert.equal(context.selectCatalog(catalog,'','desc')[0].prices[0],1450);
console.log('PASS: MoreFine catalog, explicit missing prices, single/bulk offers, gift pieces, discounts, untouched series, search and sorting.');
