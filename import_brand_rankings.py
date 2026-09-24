"""Import reviewed September 22–23 workbook quotes without replacing existing prices."""
import json,hashlib,pathlib,collections,sys
root=pathlib.Path(__file__).parent
data=json.loads(pathlib.Path(sys.argv[1] if len(sys.argv)>1 else root.parent/'prepared.json').read_text(encoding='utf-8'))
records={r['id']:r for r in data['records']}
shops={'AIDAI':'愛戴','afternoon':'Afternun Lab','LeMu萊沐':"Le'Mu Lens",'OMOLENS':'OMO Lens','模範眼鏡':'MoreFine','鏡后':'鏡后 Lenses Queen'}
offers=[]
for o in data['offers']:
 r=records[o['r']]
 if o['issue'] or not r['pieces'] or not r['url'].startswith('https://'):continue
 offers.append(dict(source=shops.get(o['shop'],o['shop']),brand=r['brand'],product=r['name'],salePrice=o['total'],piecesPerBox=r['pieces'],boughtBoxes=o['qty'],giftBoxes=0,totalPieces=r['pieces']*o['qty'],unitPrice=o['total']/o['qty'],url=r['url'],checkedAt='2026-09-23' if r['shop']=='鏡后' else '2026-09-22',comparisonKey='sheet-'+hashlib.sha256(o['group'].encode()).hexdigest()[:16],comparisonName=o['group'],rankingBasis='box',purchaseMode=o['kind'],receivedBoxes=o['qty'],note='；'.join(x for x in [o['condition'],r['note'],'同系列花色可能不同，詳見原品名；未另扣會員／結帳折扣及運費'] if x),sourceRecord=f"{r['file']}／{r['sheet']}!第{r['row']}列"))
coverage=collections.defaultdict(set)
for o in offers:coverage[(o['comparisonKey'],o['purchaseMode'])].add(o['source'])
keys={key for (key,mode),shops in coverage.items() if len(shops)>=2}
offers=[o for o in offers if o['comparisonKey'] in keys]
brands=collections.defaultdict(set)
for o in offers:brands[o['brand']].add(o['comparisonKey'])
payload={'version':'20260924-brands-1','sourceDates':['2026-09-22','2026-09-23'],'minimumBrandItems':3,'offers':offers,'brands':[{'name':b,'aliases':[b],'supplemental':True,'itemCount':len(keys)} for b,keys in sorted(brands.items())]}
(root/'public/brand-rankings.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'offers':len(offers),'groups':len(keys),'brands':{b:len(k) for b,k in brands.items()}},ensure_ascii=False))
