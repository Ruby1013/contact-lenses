"""Import the reviewed MoreFine discount-page snapshot, preserving other retailers."""
import json, re, copy
from pathlib import Path
ROOT = Path(__file__).resolve().parent
CAT = json.loads((ROOT/'public/morefine-catalog.json').read_text(encoding='utf8'))
CURRENT = json.loads((ROOT/'public/products.json').read_text(encoding='utf8'))
AUDIT = ROOT/'audit/morefine-2026-09-22'
AUDIT.mkdir(parents=True, exist_ok=True)
snapshot = AUDIT/'before.json'
if not snapshot.exists():
    snapshot.write_text(json.dumps([p for p in CURRENT if p['source']=='MoreFine'],ensure_ascii=False,indent=2),encoding='utf8')
OLD = json.loads(snapshot.read_text(encoding='utf8'))
# Explicit reviewed series mappings. Color/curve variants retain their own product URLs.
groups = {
 'miacare-zhanmei-monthly-1':[0,1], 'largan-fragrance-color-daily-10':[2,3,4,76,77,78],
 'alcon-total1-daily-30':[19], 'acuvue-oasys-daily-30':[20,21],
 'bausch-ultra-one-day-30':[22], 'cooper-myday-daily-30':[23],
 'cooper-clariti-daily-30':[24], 'acuvue-moist-daily-30':[25,26],
 'bausch-biotrue-daily-30':[27], 'cooper-clariti-toric-daily-30':[28],
 'miacare-moxy-daily-20':[29], 'cooper-oculclear-vitality-daily-30':[30],
 'cooper-oculclear-daily-30':[31], 'miacare-moxy-monthly-2':[32],
 'miacare-zhanmei-xingsu-daily-10':[36,37,38],
 'miacare-heartbeat-color-daily-10':[39,40,41], 'miacare-happiness-color-daily-10':[42,43],
 'hydron-003-color-daily-10':list(range(44,51)), 'miacare-candy-monthly-1':[51,52],
 'hydron-stareyes-city-monthly-1':[53,54], 'hydron-stareyes-peacock-monthly-1':[55,56],
 'largan-starlight-color-daily-10':[79,80,81], 'hydron-mind-color-daily-10':[82,83,84,85],
 'bausch-lacelle-amusement-daily-10':list(range(89,95)),
 'acuvue-oasys-max-daily-30':[95], 'hydron-pure-oxygen-daily-30':[96],
 'alcon-precision1-daily-30':[98], 'bausch-soflens-daily-30':[99],
 'hydron-003-daily-30':[101], 'alcon-aquacomfort-daily-30':[102],
 'cooper-proclear-daily-30':[103], 'hydron-true-daily-30':[107],
 'largan-clear-daily-30':[109], 'acuvue-oasys-toric-daily-30':[112],
 'acuvue-moist-toric-daily-30':[113], 'bausch-biotrue-toric-daily-30':[114],
 'alcon-precision1-toric-daily-30':[115], 'alcon-airoptix-toric-monthly-3':[116],
 'seed-kyo-sakura-toric-daily-32':[117], 'cooper-biofinity-toric-monthly-3':[118],
}
offers=[]
for key,ids in groups.items():
    template=next(p for p in CURRENT if p.get('comparisonKey')==key)
    for idx in ids:
        q=CAT[idx];pieces=int(re.search(r'(\d+)片裝',q['name'])[1])
        assert pieces==template['piecesPerBox'],(key,pieces,template['piecesPerBox'])
        p={k:copy.deepcopy(template[k]) for k in ('brand','comparisonKey','comparisonName')}
        p.update(source='MoreFine',product=q['name'],salePrice=q['prices'][0],
                 listPrice=q['prices'][1] if len(q['prices'])>1 else None,
                 piecesPerBox=pieces,boughtBoxes=1,giftBoxes=0,giftPieces=0,totalPieces=pieces,
                 unitPrice=q['prices'][0]/pieces,url=q['url'],checkedAt=q['checkedAt'],
                 sourceProductId=str(idx),note='優惠頁公開單盒價。活動區：'+'；'.join(q['sections']))
        offers.append(p)
        promo=q['offer'];count=0;gifts=0;gift_pieces=0;amount=0
        m=re.fullmatch(r'滿(\d+)(?:送|贈)(\d+)',promo)
        if m:count=int(m[1]);gifts=int(m[2]);amount=p['salePrice']*count
        m=re.fullmatch(r'滿?(\d+)盒贈(\d+)片',promo)
        if m:count=int(m[1]);gift_pieces=int(m[2]);amount=p['salePrice']*count
        m=re.fullmatch(r'滿?(\d+)盒折\$?(\d+)',promo)
        if m:count=int(m[1]);amount=p['salePrice']*count-int(m[2])
        m=re.fullmatch(r'(\d+)盒\$(\d+)',promo)
        if m:count=int(m[1]);amount=int(m[2])
        if count:
            # A full box of gifted pieces can retain the site's conventional giftBoxes field.
            gifts+=gift_pieces//pieces;gift_pieces%=pieces
            total=pieces*(count+gifts)+gift_pieces
            bulk=copy.deepcopy(p)
            bulk.update(product=q['name']+'（'+promo+'）',salePrice=amount,
                        listPrice=p['listPrice']*count if p['listPrice'] is not None else None,
                        boughtBoxes=count,giftBoxes=gifts,giftPieces=gift_pieces,totalPieces=total,
                        unitPrice=amount/total,offerType='promotion',note=promo+'；未疊加滿額折扣、贈點或其他活動。')
            offers.append(bulk)
# Retain independently checked lower-volume Cooper offers not described by this page.
retained=[p for p in OLD if p.get('comparisonKey') in groups and p.get('brand')=='酷柏'
          and p.get('boughtBoxes')==2 and p['comparisonKey']!='cooper-oculclear-vitality-daily-30'
          and p.get('checkedAt','').startswith('2026-09-22')]
output=[p for p in CURRENT if not(p['source']=='MoreFine' and p.get('comparisonKey') in groups)]+retained+offers
(ROOT/'public/products.json').write_text('[\n'+',\n'.join('  '+json.dumps(p,ensure_ascii=False,separators=(',',':')) for p in output)+'\n]\n',encoding='utf8')
report={'catalogItems':len(CAT),'pricedItems':sum(bool(p['prices']) for p in CAT),
        'matchedCatalogItems':sum(map(len,groups.values())),'comparisonSeries':len(groups),
        'newOffers':len(offers),'retainedVerifiedOffers':len(retained),'replacedComparisonKeys':list(groups)}
(AUDIT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(report,ensure_ascii=False))
