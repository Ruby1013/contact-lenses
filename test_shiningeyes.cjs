const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=n=>JSON.parse(fs.readFileSync(path.join(__dirname,'public',n),'utf8'));
const catalog=read('shiningeyes-catalog.json');const offers=read('products.json').filter(p=>p.source==='漾美');
assert.equal(catalog.length,540);assert.equal(new Set(catalog.map(p=>p.id)).size,540);
assert.equal(offers.length,71);assert.equal(new Set(offers.map(p=>p.sourceProductId)).size,71);
for(const p of offers){const q=catalog.find(q=>q.id===p.sourceProductId);assert.ok(q);assert.equal(p.salePrice,q.detail_price);assert.equal(p.product,q.name);assert.match(p.checkedAt,/^2026-09-23/);assert.equal(p.unitPrice,p.salePrice/(p.productType==='solution'?p.totalVolumeMl:p.totalPieces));}
const find=id=>offers.find(p=>p.sourceProductId===id);
assert.equal(find('362').totalPieces,240);assert.equal(find('626').totalPieces,240);assert.equal(find('1313').totalPieces,240);assert.equal(find('477').totalPieces,240);
assert.equal(find('281').totalVolumeMl,1800);assert.equal(find('279').totalVolumeMl,300);
assert.equal(find('1231').comparisonEligible,false);
assert.equal(find('879').boughtBoxes,2);
console.log('PASS: all 540 catalog prices, 71 unique reviewed offers, random gifts excluded, and liquid volumes.');
