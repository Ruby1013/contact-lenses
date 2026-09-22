const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const catalog=JSON.parse(fs.readFileSync('public/omolens-catalog.json','utf8'));
const offers=JSON.parse(fs.readFileSync('public/products.json','utf8')).filter(p=>p.source==='OMO Lens');
assert.equal(catalog.length,349);assert.equal(new Set(catalog.map(p=>p.id)).size,349);
assert.equal(catalog.filter(p=>p.soldOut).length,12);
for(const p of offers){
 const c=catalog.find(c=>c.id===p.sourceProductId);assert.ok(c);assert.equal(p.url,c.url);
 const total=p.productType==='solution'?p.totalVolumeMl:p.totalPieces;
 assert.equal(p.unitPrice,p.salePrice/total);
 if(p.boughtBoxes===1){assert.equal(p.salePrice,c.price);assert.equal(p.giftBoxes,0);}
 if(c.soldOut)assert.equal(p.comparisonEligible,false);
}
const offer=(key,boxes)=>offers.find(p=>p.comparisonKey===key&&p.boughtBoxes===boxes);
assert.equal(offer('miacare-moxy-daily-20',4).salePrice,2080);
assert.equal(offer('miacare-moxy-daily-20',4).totalPieces,100);
assert.equal(offer('cooper-clariti-daily-30',6).totalPieces,180); // Random gifts excluded.
assert.equal(offer('cooper-myday-daily-30',4).totalPieces,140);
assert.equal(offer('alcon-total1-daily-30',12).salePrice,10860);
assert.equal(offer('ticon-themoment-star-crescent-daily-10',4).salePrice,940);
assert.equal(offer('acuvue-moist-daily-30',1).salePrice,650);
assert.equal(offer('acuvue-moist-daily-30',8).salePrice,4240);
assert.equal(offer('miacare-qing-solution-360ml',1).totalVolumeMl,360);
assert.equal(offer('miacare-qing-solution-360ml',4).totalVolumeMl,1440);
const context={fetch:()=>new Promise(()=>{})};vm.createContext(context);vm.runInContext(fs.readFileSync('public/omolens.js','utf8'),context);
assert.equal(context.selectCatalog(catalog,'','default','soldout').length,12);
assert.equal(context.selectCatalog(catalog,'','asc')[0].price,35);
assert.equal(context.selectCatalog(catalog,'','desc')[0].price,7280);
assert.ok(context.selectCatalog(catalog,'超涵水透明日拋30','default').length>0);
assert.equal(context.selectCatalog(catalog,'不存在的商品','default').length,0);
console.log('PASS: complete catalog, single/bulk prices, gifts, liquid volume, sold-out labels, search and sorting.');
