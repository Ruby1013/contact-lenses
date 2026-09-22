"""Publish the complete AIDAI list and explicitly reviewed comparable offers.

Input is a dated scrape of all 32 pages. Promotions without an exact total,
quantity, or known gift identity stay as text and are not guessed into rankings.
Other retailers and unmapped historical AIDAI products are preserved by the UI.
"""
import json, re, shutil
from pathlib import Path
from datetime import datetime, timezone, timedelta

ROOT = Path(__file__).parent
PUBLIC = ROOT / 'public'
# Reviewed identities: product IDs with the same series and pack size.
GROUPS = {
 'acuvue-define-daily-30': '954 2604 2605 2606 2607 2608 2609 2610',
 'acuvue-moist-daily-30': '1681 1682 1683',
 'acuvue-oasys-daily-30': '951',
 'acuvue-oasys-max-daily-30': '1864',
 'acuvue-oasys-max-multifocal-daily-30': '1865 2889',
 'acuvue-oasys-toric-daily-30': '952 1775',
 'acuvue-vita-monthly-6': '961',
 'acuvue-vita-toric-monthly-6': '962',
 'alcon-aquacomfort-daily-30': '964',
 'alcon-aquacomfort-multifocal-daily-30': '2081',
 'alcon-precision1-daily-30': '968 1790',
 'alcon-precision1-toric-daily-30': '1410',
 'alcon-style-daily-30': '963',
 'alcon-total1-daily-30': '969 2010',
 'anley-clear-daily-30': '1459',
 'anley-clear-monthly-2': '1460',
 'anley-enlarge-color-daily-10': '1461 1462 1463',
 'anley-enlarge-color-monthly-2': '1472 1473 1474',
 'anley-small-color-daily-10': '1467 1468',
 'bausch-biotrue-daily-30': '981 1972',
 'bausch-ultra-one-day-30': '984 1718',
 'bausch-lacelle-amusement-daily-10': '2674 2675 2676',
 'bausch-lacelle-amusement-monthly-1': '2688 2689 2690',
 'bausch-lacelle-color-daily-10': '2658 2659 2660',
 'bausch-lacelle-monthly-1': '993 2707 2708 2709 2710 2711 2712 2713',
 'bausch-soflens-daily-30': '979',
 'bausch-soflens-multifocal-6': '989',
 'bausch-ultra-monthly-3': '990',
 'cooper-avaira-monthly-1': '1054',
 'cooper-avaira-monthly-6': '1055',
 'cooper-biofinity-monthly-1': '1056',
 'cooper-biofinity-monthly-6': '1057',
 'cooper-biofinity-toric-monthly-3': '1058',
 'cooper-clariti-daily-30': '1049 1721',
 'cooper-clariti-multifocal-daily-30': '1051',
 'cooper-clariti-toric-daily-30': '1050',
 'cooper-fantasy-color-daily-10': '2542 2543 2544',
 'cooper-myday-daily-30': '1052',
 'cooper-oculclear-daily-30': '1044',
 'cooper-oculclear-vitality-daily-30': '1048 1232',
 'cooper-proclear-multifocal-daily-30': '2704',
 'cooper-proclear-toric-daily-30': '1045',
 'hydron-003-color-daily-10': '1903 2732 2733 2734 2735 2736 2737 2738',
 'hydron-003-daily-30': '1690',
 'hydron-beauty-secret-monthly-1': '1406',
 'hydron-changeable-bluefilter-monthly-1': '2371 2372 2373 2756 2757 2758 2759',
 'hydron-mind-color-daily-10': '1614 2739 2740 2741 2742 2743 2744 2745 2746 2747 2748',
 'hydron-pure-oxygen-color-daily-10': '1499 2727 2728 2729 2730',
 'hydron-pure-oxygen-daily-30': '1500',
 'hydron-stareyes-city-monthly-1': '2121 2122 2764 2765 2767 2768 2769 2770 2771 2772 2476',
 'hydron-stareyes-color-daily-10': '1615 2749 2750 2751 2752 2753 2754',
 'hydron-stareyes-peacock-monthly-1': '1011 1985 1986 2760 2761 2762',
 'hydron-true-daily-30': '1001',
 'hydron-true-monthly-2': '1610',
 'largan-astral-color-daily-10': '2522 2524 2525',
 'largan-capell-clear-daily-30': '2123',
 'largan-capell-color-daily-10': '2124',
 'largan-clear-daily-30': '1072',
 'largan-clear-monthly-2': '2125',
 'largan-color-series-daily-10': '2779 2780 2781',
 'largan-fragrance-color-daily-10': '1676 2782 2783 2785 2786 2788',
 'largan-starlight-color-daily-10': '1078 2773 2774 2775',
 'ticon-55-biweekly-6': '1026',
 'ticon-lace-color-monthly-1': '2791 2792',
 'ticon-premium-oxygen-daily': '1444',
 'ticon-pro-oxygen-daily-30': '2822',
 'ticon-themoment-color-daily-10': '2802 2803 2804 2805 2806 2807 2809 2810',
 'ticon-themoment-color-monthly-1': '2796 2798 2799 2800',
 'ticon-themoment-daily-30': '1021',
 'ticon-themoment-star-crescent-daily-10': '2819 2820 2821',
 'ticon-zhenmei-color-daily-10': '2811 2812 2813 2814 2815 2816',
}

# Activity totals read from each product detail page, which can differ from
# the list-price arithmetic. Values are (paid boxes, same-product gift boxes, total).
DETAIL_TOTALS = {
 '1001': (3,0,999), '1021': (4,0,1340), '1044': (4,0,1340),
 '1045': (5,1,4300), '1048': (4,0,1600), '1050': (7,1,6751),
 '1051': (2,0,2120), '1052': (2,0,1660), '1054': (3,0,333),
 '1055': (2,0,1438), '1056': (4,0,449), '1057': (3,0,2450),
 '1058': (2,0,1400), '1072': (12,0,3300), '1078': (6,0,1260),
 '1232': (8,0,3099), '1410': (5,1,5400), '1459': (7,1,2450),
 '1461': (5,1,1000), '1462': (5,1,1000), '1463': (5,1,1000),
 '1467': (5,1,1250), '1468': (5,1,1250), '1500': (2,0,999),
 '1690': (2,0,675), '1718': (2,0,1840), '1721': (5,1,3099),
 '1775': (4,0,5100), '1864': (2,0,2400), '1865': (2,0,3400),
 '1972': (4,0,2080), '2010': (4,0,3676), '2081': (2,0,2200),
 '2123': (6,1,2100), '2124': (6,0,1469), '2125': (10,2,1490),
 '2704': (2,0,2800), '952': (4,0,5100), '963': (4,0,1540),
 '964': (4,0,1580), '968': (2,0,1250), '969': (2,0,2099),
 '979': (2,0,910), '981': (2,0,1150), '984': (8,0,6520),
 '990': (3,0,1450),
}
CONFLICTS = {
 '951': '列表標籤2盒1850，詳頁活動2盒2160；組合價衝突，暫不納入量販排行。',
 '2889': '列表4盒折900，詳頁活動標示4盒36700；組合價衝突，暫不納入量販排行。',
}

def promotion_offer(q):
    """Return (paid boxes, gift boxes, total price), only for explicit offers."""
    t=q['promotion'].translate(str.maketrans({'一':'1','兩':'2','二':'2','三':'3','四':'4','五':'5','六':'6','七':'7','八':'8','九':'9','十':'10'}))
    t=re.sub(r'\s+','',t); price=q['price']
    if q['id'] in CONFLICTS:return None
    if q['id'] in DETAIL_TOTALS:return DETAIL_TOTALS[q['id']]
    avg=re.search(r'(\d+)盒平均\$?(\d+)',t)
    if avg:
        n,p=map(int,avg.groups());return n,0,n*p
    total=re.search(r'(\d+)盒(?:組)?\$?(\d{3,})(?:元)?',t)
    if total:
        n,p=map(int,total.groups());return n,0,p
    # Gift/half-price/discount labels alone do not establish the pricing base.
    return None

def run():
    source=ROOT.parent/'price_work/products.json'
    catalog=json.loads(source.read_text(encoding='utf-8'))
    byid={q['id']:q for q in catalog}
    existing=json.loads((PUBLIC/'products.json').read_text(encoding='utf-8'))
    identities={p['comparisonKey']:p for p in existing if p.get('comparisonKey')}
    stamp=datetime.fromtimestamp(source.stat().st_mtime,timezone(timedelta(hours=8))).isoformat(timespec='seconds')
    detail_source=ROOT.parent/'price_work/aidai_details/offers.json'
    detail_evidence={p['id']:p['offers'] for p in json.loads(detail_source.read_text(encoding='utf-8'))}
    offers=[]
    for key,ids in GROUPS.items():
        assert key in identities,key
        identity=identities[key]
        for pid in ids.split():
            q=byid[pid]
            pack=re.search(r'(\d+)片',q['name']);assert pack,q
            pieces=int(pack.group(1));assert pieces==identity['piecesPerBox'],(key,pieces,identity['piecesPerBox'])
            base=dict(source='愛戴',brand=identity['brand'],product=q['name'],comparisonKey=key,comparisonName=identity['comparisonName'],salePrice=q['price'],listPrice=q['original'],piecesPerBox=pieces,boughtBoxes=1,giftBoxes=0,giftPieces=0,totalPieces=pieces,unitPrice=q['price']/pieces,url=q['url'],sourceProductId=pid,checkedAt=stamp,note='分類列表標示售價；'+q['promotion'])
            if 'VIP' in q['promotion'] or '會員' in q['promotion']:
                base.update(comparisonEligible=False,note='會員限定標示價格，暫不納入一般公開價格排行；'+q['promotion'])
            if pid == '1406':
                base.update(salePrice=130,unitPrice=130/pieces,note='詳頁明列單盒活動價130；'+'；'.join(detail_evidence[pid]))
            offers.append(base)
            if pid in CONFLICTS:base['note']+='；'+CONFLICTS[pid]
            deal=promotion_offer(q)
            if deal and base.get('comparisonEligible') is not False:
                bought,gifts,total=deal
                count=pieces*(bought+gifts)
                evidence='；'.join(detail_evidence[pid]) if pid in DETAIL_TOTALS else q['promotion']
                bulk=dict(base,boughtBoxes=bought,giftBoxes=gifts,totalPieces=count,salePrice=total,unitPrice=total/count,note='公開活動總價；'+evidence+'；未計入未明示同款的額外贈片')
                bulk.pop('listPrice',None)
                offers.append(bulk)
    payload={'checkedAt':stamp,'replacedComparisonKeys':list(GROUPS),'offers':offers}
    (PUBLIC/'aidai-offers.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (PUBLIC/'aidai-catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
    audit=ROOT/'audit/aidai-2026-09-22';audit.mkdir(parents=True,exist_ok=True)
    (audit/'activity-evidence.json').write_text(json.dumps({'checkedAt':stamp,'details':detail_evidence,'conflicts':CONFLICTS},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    shutil.copyfile(ROOT.parent/'outputs/01a0c98c-e008-7721-96e6-b1e00b3a4671/AIDAI_隱形眼鏡價格表_2026-09-22.xlsx',PUBLIC/'aidai-prices-2026-09-22.xlsx')
    print(f'{len(catalog)} catalog products, {len(GROUPS)} reviewed groups, {len(offers)} offers')

if __name__=='__main__':run()
