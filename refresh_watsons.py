"""Import the reviewed Watsons category snapshot without guessing product identities."""
import json, re, shutil
from pathlib import Path

ROOT = Path(__file__).parent
PUBLIC = ROOT / 'public'

def run():
    raw = json.loads((ROOT.parent / 'outputs/01a0c9b6-watsons/products-2026-09-23.json').read_text(encoding='utf-8'))
    catalog = []
    for r in raw:
        prices = [float(n.replace(',', '')) for n in re.findall(r'\$([\d,]+(?:\.\d+)?)', r['price'])]
        assert 1 <= len(prices) <= 2
        catalog.append(dict(id=r['url'].split('/')[-1], brand=r['brand'], name=r['name'],
            price=prices[0], listPrice=prices[1] if len(prices)>1 else None,
            condition='買2件，每件折後價' if '買2件' in r['price'] else '未標示多件條件',
            promo=r['promo'].replace('暫無庫存','').strip(), soldOut='暫無庫存' in r['promo'],
            url=r['url'], checkedAt='2026-09-23', rawPrice=r['price']))
    assert len(catalog) == len({r['id'] for r in catalog}) == 206
    (PUBLIC/'watsons-catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    shutil.copyfile(ROOT.parent/'outputs/01a0c9b6-watsons/屈臣氏隱形眼鏡價格表_2026-09-23.xlsx',PUBLIC/'watsons-prices-2026-09-23.xlsx')
    old=json.loads((PUBLIC/'products.json').read_text(encoding='utf-8'))
    before=json.loads(json.dumps(old))
    byid={r['id']:r for r in catalog}
    # Existing reviewed product identities; exact IDs for the two 10-piece packs.
    # The 50-piece clear daily pack previously pointed to its category page.
    mapping={'largan-clear-daily-10':'BP_326198','largan-clear-daily-50':'BP_326169','largan-color-series-daily-10':'BP_326331'}
    changes=[]
    for p in old:
        if p['source']!='屈臣氏' or p.get('comparisonKey') not in mapping: continue
        q=byid[mapping[p['comparisonKey']]]
        assert '買2件' not in q['condition']
        assert int(re.search(r'(\d+)片裝',q['name'])[1])==p['piecesPerBox']
        changes.append({'before':dict(p),'catalogId':q['id']})
        p.update(product=q['name'],salePrice=q['price'],listPrice=q['listPrice'],url=q['url'],sourceProductId=q['id'],
            checkedAt=q['checkedAt'],boughtBoxes=1,giftBoxes=0,totalPieces=p['piecesPerBox'],unitPrice=q['price']/p['piecesPerBox'],
            note='屈臣氏商品目錄公開售價；未標示多件條件；門市取貨付款',comparisonEligible=not q['soldOut'])
    assert len(changes)==3
    assert [p for p in old if p['source']!='屈臣氏']==[p for p in before if p['source']!='屈臣氏']
    (PUBLIC/'products.json').write_text('[\n'+',\n'.join('  '+json.dumps(p,ensure_ascii=False,separators=(',',':')) for p in old)+'\n]\n',encoding='utf-8')
    audit=ROOT/'audit/watsons-2026-09-23';audit.mkdir(parents=True,exist_ok=True)
    (audit/'updated-comparisons.json').write_text(json.dumps(changes,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    page=(PUBLIC/'index.html').read_text(encoding='utf-8')
    marker='      <div id="source-overview-links" class="source-overview-links"></div>'
    assert page.count(marker)==1
    line='      <p>屈臣氏價格核對：<time datetime="2026-09-23">2026/09/23</time>。<a href="watsons.html">查詢全部 206 項商品價格</a> · <a href="watsons-prices-2026-09-23.xlsx" download>下載屈臣氏 Excel 價格表</a></p>'
    if 'href="watsons.html"' not in page:page=page.replace(marker,marker+'\n'+line)
    else:page=re.sub(r'      <p>屈臣氏價格核對：.*?</p>',line,page)
    (PUBLIC/'index.html').write_text(page,encoding='utf-8')
    detail=PUBLIC/'watsons.html'
    detail.write_text(detail.read_text(encoding='utf-8').replace('2026/09/22','2026/09/23').replace('watsons-prices-2026-09-22.xlsx','watsons-prices-2026-09-23.xlsx'),encoding='utf-8')
    print(f'Published {len(catalog)} catalog entries; refreshed {len(changes)} matched comparisons.')

if __name__=='__main__':run()
