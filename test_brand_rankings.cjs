const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=n=>JSON.parse(fs.readFileSync(`public/${n}`,'utf8'));
const extra=read('brand-rankings.json');
const ctx=vm.createContext({Intl});
vm.runInContext(fs.readFileSync('public/app.js','utf8').split('Promise.all([')[0],ctx);
ctx.extra=extra;ctx.base=read('target_brands.json');
vm.runInContext('supplementalBrands=extra.brands; targetBrands=base; products=extra.offers.map(normalizeProduct)',ctx);
const choices=vm.runInContext('brandChoices()',ctx);
assert(choices.visible.every(b=>b.itemCount>=3));assert(choices.other.every(b=>b.itemCount<3));
assert.equal(choices.visible.length+choices.other.length,extra.brands.length);
assert(vm.runInContext('products.filter(p=>matchesBrand(p,"其他")).length>0',ctx));
assert(vm.runInContext('products.filter(p=>matchesBrand(p,"永暘")).every(p=>p.brand==="永暘")',ctx));
assert(vm.runInContext('products.filter(p=>matchesBrand(p,"其他")).every(p=>!matchesBrand(p,"永暘"))',ctx));
for(const p of extra.offers){assert(p.salePrice>0);assert(p.receivedBoxes>0);assert(p.piecesPerBox>0);assert(/^https:\/\//.test(p.url));assert(['2026-09-22','2026-09-23'].includes(p.checkedAt));assert.equal(p.totalPieces,p.receivedBoxes*p.piecesPerBox);}
const modes=vm.runInContext('spreadsheetRankingModes(products.filter(p=>p.comparisonName==="實瞳 京櫻 透明 日拋 32片/盒"))',ctx);
assert.equal(modes.length,2);assert(modes[0].products.length>=2);assert(modes[1].products.length>=2);
for(const m of modes){assert.equal(m.products.length,new Set(m.products.map(p=>p.source)).size);for(let i=1;i<m.products.length;i++)assert(m.products[i].unitPrice>=m.products[i-1].unitPrice);}
ctx.ties=[{source:'A',comparisonKey:'x',purchaseMode:'單販',salePrice:300,receivedBoxes:1,unitPrice:300},{source:'B',comparisonKey:'x',purchaseMode:'單販',salePrice:300,receivedBoxes:1,unitPrice:300}];
assert.deepEqual(Array.from(vm.runInContext('spreadsheetRankingModes(ties)[0].products',ctx),p=>p.priceRank),[1,1]);
assert.equal(vm.runInContext('targetBrand({brand:"酷柏", product:"寶晴"}).name',ctx),'酷柏');
console.log(`PASS: ${extra.offers.length} imported quotes, ${choices.visible.length} brand tiles, ${choices.other.length} brands under Other; modes, prices, ties, dates and legacy brands verified.`);
