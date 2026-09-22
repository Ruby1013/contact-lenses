const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'public',f),'utf8');
const rows=JSON.parse(read('bausch-catalog.json'));
const offers=JSON.parse(read('products.json')).filter(p=>new URL(p.url).hostname==='www.bauschonline.com.tw');
assert.equal(rows.length,37);assert.equal(offers.length,37);assert.equal(new Set(rows.map(p=>p.url)).size,37);
for(const r of rows){const p=offers.find(p=>p.url===r.url);assert.equal(p.salePrice,r.price);assert.equal(p.totalPieces,r.pieces);assert.equal(p.unitPrice,r.price/r.pieces);assert.equal(p.boughtBoxes,1);assert.equal(p.giftBoxes,0);}
const context={fetch:()=>new Promise(()=>{})};vm.createContext(context);vm.runInContext(read('bausch.js'),context);
assert.equal(context.selectCatalog(rows,'','日拋','default').length,18);
assert.equal(context.selectCatalog(rows,'','月拋','default').length,19);
assert.equal(context.selectCatalog(rows,'日暮棕','','default').length,1);
assert.equal(context.selectCatalog(rows,'不存在的花色','','default').length,0);
assert.equal(context.selectCatalog(rows,'','','asc')[0].price,130);
assert.equal(context.selectCatalog(rows,'','','desc')[0].price,350);
assert.ok(read('index.html').includes('href="bausch.html"'));
assert.ok(fs.existsSync(path.join(__dirname,'public/bausch-prices-2026-09-22.xlsx')));
console.log('PASS: 37 official prices, package calculations, search, type filters, sorting and download.');
