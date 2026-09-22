const assert=require('node:assert/strict');
const fs=require('node:fs');
const catalog=JSON.parse(fs.readFileSync('public/funnyeyes-catalog.json','utf8'));
const offers=JSON.parse(fs.readFileSync('public/products.json','utf8')).filter(p=>p.source==='睛美');
assert.equal(catalog.length,646);assert.equal(new Set(catalog.map(p=>p.id)).size,646);
assert.equal(offers.length,58);assert.equal(new Set(offers.map(p=>p.sourceProductId)).size,58);
for(const p of offers){const q=catalog.find(q=>q.id===p.sourceProductId);assert.ok(q);assert.equal(p.salePrice,q.price);assert.equal(p.product,q.name);assert.equal(p.piecesPerBox*(p.boughtBoxes+p.giftBoxes)+p.giftPieces,p.totalPieces);assert.equal(p.unitPrice,p.salePrice/p.totalPieces);}
const find=id=>offers.find(p=>p.sourceProductId===id);
assert.equal(find('352').totalPieces,240);assert.equal(find('847').totalPieces,210);assert.equal(find('362').totalPieces,240);assert.equal(find('1709').totalPieces,190);
assert.equal(find('700').salePrice,1950);assert.equal(find('830').salePrice,210);
assert.equal(find('104').boughtBoxes,2);assert.equal(find('105').boughtBoxes,5);
console.log('PASS: 646 catalog records; 58 reviewed offers; gift exclusions, quantities, and corrected prices.');
