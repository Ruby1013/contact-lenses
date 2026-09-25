"""Build supplemental listings from the reviewed complete Queen workbook snapshot."""
import json, pathlib, collections
root = pathlib.Path(__file__).parent
scope = json.loads((root/'queen-product-scope.json').read_text(encoding='utf-8'))
catalog = {p['productId']: p for p in scope['catalog']}
shops = {'AIDAI':'愛戴','afternoon':'Afternun Lab','LeMu萊沐':"Le'Mu Lens",'OMOLENS':'OMO Lens','模範眼鏡':'MoreFine','鏡后':'鏡后 Lenses Queen'}
offers = []
for mode, data in scope['modes'].items():
 for q in data['quotes']:
  p = catalog[q[0]]
  offers.append(dict(source=shops.get(q[2],q[2]),brand=p['brand'],product=q[7],salePrice=q[4],piecesPerBox=p['pieces'],boughtBoxes=q[5],giftBoxes=0,totalPieces=(p['pieces'] or 0)*q[5],unitPrice=q[4]/q[5],url=p['url'] if q[2]=='鏡后' else q[9],checkedAt='2026-09-23' if q[2]=='鏡后' else '2026-09-22',comparisonKey='queen-'+p['productId'],comparisonName=p['name'],rankingBasis='box',purchaseMode=mode,receivedBoxes=q[5],priceRank=q[3],modeStatuses=p['statuses'],unitLabel='件' if p['brand']=='氧視加' else '盒',note='；'.join(str(x) for x in [q[8],p['note'] if q[2]=='鏡后' else '', '同系列花色及限制請見原品名；未另扣會員／結帳折扣及運費'] if x)))
brands = collections.defaultdict(set)
for p in catalog.values(): brands[p['brand']].add(p['productId'])
payload = dict(version='20260925-queen-complete-1',sourceDates=['2026-09-22','2026-09-23'],minimumBrandItems=3,catalog=list(catalog.values()),offers=offers,brands=[dict(name=b,aliases=[b],supplemental=True,itemCount=len(ids)) for b,ids in sorted(brands.items())])
(root/'public/brand-rankings.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'{len(catalog)} products; {len(offers)} quotes')
