const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=n=>JSON.parse(fs.readFileSync(path.join(__dirname,n),'utf8'));
const catalog=read('public/lemulens-catalog.json'),data=read('public/products.json'),before=read('audit/lemulens-2026-09-22/before.json');
assert.equal(catalog.length,504);assert.equal(new Set(catalog.map(p=>p.id)).size,504);
assert.deepEqual(data.filter(p=>p.source!=="Le'Mu Lens"),before.filter(p=>p.source!=="Le'Mu Lens"));
const offers=data.filter(p=>p.source==="Le'Mu Lens"&&p.comparisonEligible!==false);
assert.equal(offers.length,53);
for(const p of offers){
 const c=catalog.find(c=>c.id===p.sourceProductId);assert.ok(c);assert.equal(c.url,p.url);assert.ok(!c.name.includes('暢飲大包組'));assert.match(p.checkedAt,/^2026-09-22/);
 if(p.boughtBoxes===1)assert.equal(p.salePrice,c.price);
 else assert.ok(c.promo.replace('七盒','7盒').match(new RegExp(`${p.boughtBoxes}盒\\$?${p.salePrice}`)));
 if(p.productType==='solution'){assert.equal(p.totalVolumeMl,p.volumeMl);assert.equal(p.unitPrice,p.salePrice/p.totalVolumeMl);}
 else {assert.equal(p.totalPieces,p.piecesPerBox*p.boughtBoxes);assert.equal(p.unitPrice,p.salePrice/p.totalPieces);}
}
const bulk=offers.find(p=>p.comparisonKey==='acuvue-oasys-daily-30'&&p.boughtBoxes===2);assert.equal(bulk.salePrice,1850);assert.equal(bulk.totalPieces,60);
assert.equal(offers.find(p=>p.comparisonKey==='hydron-mind-color-daily-10'&&p.boughtBoxes===8).salePrice,1688);
assert.equal(offers.find(p=>p.comparisonKey==='largan-capell-clear-daily-30'&&p.boughtBoxes===7).salePrice,2099);
assert.equal(data.filter(p=>p.source==="Le'Mu Lens"&&p.comparisonEligible===false).length,3);
const ctx={fetch:()=>new Promise(()=>{})};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'public/lemulens.js'),'utf8'),ctx);
assert.equal(ctx.selectCatalog(catalog,'不存在的商品').length,0);
assert.equal(ctx.selectCatalog(catalog,'','酷柏').length,14);
assert.equal(ctx.selectCatalog(catalog,'暢飲大包組').length,6);
for(const order of ['asc','desc']){const rows=ctx.selectCatalog(catalog,'','',order);for(let i=1;i<rows.length;i++)assert.ok(order==='asc'?rows[i].price>=rows[i-1].price:rows[i].price<=rows[i-1].price);}
assert.ok(fs.readFileSync(path.join(__dirname,'public/lemulens-prices-2026-09-22.xlsx')).subarray(0,2).equals(Buffer.from('PK')));
assert.ok(fs.readFileSync(path.join(__dirname,'public/index.html'),'utf8').includes('href="lemulens.html"'));
console.log('PASS: 504 catalog items, 45 verified comparison groups, 8 bulk offers, safe exclusions, unchanged other retailers, search/filter/sort, Excel and homepage link.');
