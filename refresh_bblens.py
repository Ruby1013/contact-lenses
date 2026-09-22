"""Import BBLens list prices and explicitly reviewed product families."""
import copy, json, re, shutil, urllib.parse
from pathlib import Path
from datetime import datetime, timezone, timedelta
ROOT=Path(__file__).parent
CAT=json.loads((ROOT.parent/'bblens_data.json').read_text(encoding='utf8'))
CURRENT=json.loads((ROOT/'public/products.json').read_text(encoding='utf8'))
SNAPSHOT=ROOT/'audit/bblens-2026-09-22/before.json'
OLD=json.loads(SNAPSHOT.read_text(encoding='utf8')) if SNAPSHOT.exists() else CURRENT
def path(u): return urllib.parse.unquote(urllib.parse.urlparse(u).path).lower()
byurl={path(p['url']):i for i,p in enumerate(CAT)}
# Reviewed replacements for old category-page URLs and renamed product URLs.
explicit={3:8,8:10,12:36,15:37,18:53,21:49,26:85,29:84,181:177,185:174,188:120,190:128,192:118,196:134,197:182,198:183,199:136,200:135,324:16,328:18,333:21,365:90,587:83,588:89,589:92,590:93}
def family(idx):
    name=CAT[idx]['name']
    bounds=[(5,'BBLens'),(35,'博士倫'),(48,'愛爾康'),(77,'嬌生'),(80,'恩莉芙'),(82,'MIZMI'),(94,'帝康'),(115,'酷柏'),(134,'實瞳'),(136,'睿視能'),(150,'海昌'),(153,'加美'),(162,'美若康'),(168,'星歐'),(173,'昆凌'),(181,'睛靈'),(184,'安儷'),(186,'亨泰光學'),(190,'LENSME'),(198,'永暘'),(200,'蜜緹'),(202,'媞蜜多'),(204,'純粹美'),(207,'目荻'),(213,'艾薇卡'),(215,'永暘'),(216,'海昌'),(218,'帝康'),(227,'雷朋'),(231,'陽明生醫'),(233,'周邊商品')]
    brand=next(brand for last,brand in bounds if idx<=last)
    name=re.sub(r'\d+片裝','',name)
    return brand+':'+re.sub(r'\((LOW|MID|MED|HIGH|\d+\.\d+)\)','',name).strip()
templates={}; old_count=0
for i,p in enumerate(OLD):
    if 'bblens.tw' not in p['url']: continue
    old_count+=1
    idx=explicit.get(i,byurl.get(path(p['url'])))
    assert idx is not None,(i,p['product'])
    templates[family(idx)]=p
# Additional well-identified series already compared across other retailers.
extra={6:'bausch-soflens-daily-30',20:'bausch-ultra-monthly-3',95:'cooper-oculclear-daily-30',98:'cooper-oculclear-vitality-daily-30',100:'cooper-clariti-daily-30',102:'cooper-myday-daily-30',103:'cooper-proclear-toric-daily-30',105:'cooper-clariti-toric-daily-30',107:'cooper-clariti-multifocal-daily-30'}
for idx,key in extra.items():
    templates[family(idx)]=next(p for p in OLD if p.get('comparisonKey')==key)
nums={'一':1,'二':2,'兩':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9}
def number(s): return int(s) if s.isdigit() else nums[s]
offers=[]
for idx,q in enumerate(CAT):
    template=templates.get(family(idx))
    if not template: continue
    pieces=int(re.search(r'(\d+)片裝',q['name'])[1])
    base=template['piecesPerBox']; assert pieces%base==0,(q['name'],base)
    boxes=pieces//base
    stamp=datetime.fromtimestamp((ROOT.parent/'bblens_sources'/f"page_{q['page']}.html").stat().st_mtime,timezone(timedelta(hours=8))).isoformat(timespec='seconds')
    n={k:copy.deepcopy(template[k]) for k in ('brand','comparisonKey','comparisonName')}
    n.update(source='BBLens',product=q['name'],salePrice=q['price'],listPrice=q['original'],piecesPerBox=base,boughtBoxes=boxes,giftBoxes=0,giftPieces=0,totalPieces=pieces,unitPrice=q['price']/pieces,url=q['url'],checkedAt=stamp,sourceProductId=str(idx),note='商品列表公開售價；結帳折扣未計入。'+ '；'.join(filter(None,[q['promo'],q['price_note'],q['note']])))
    if idx==93:
        n.update(comparisonEligible=False,note=n['note']+'；商品頁未標示蕾絲系列，暫不列入該系列跨店排行榜。')
    offers.append(n)
    promo=q['price_note']; count=None; gifts=0; amount=None
    m=re.fullmatch(r'買([一二兩三四五六七八九\d]+)送([一二兩三四五六七八九\d]+)',promo)
    if m:count=number(m[1]);gifts=number(m[2]);amount=q['price']*count
    m=re.fullmatch(r'([一二兩三四五六七八九\d]+)盒折(\d+)元',promo)
    if m:count=number(m[1]);amount=q['price']*count-int(m[2])
    m=re.fullmatch(r'(?:任選)?([一二兩三四五六七八九\d]+)(?:盒|組|件)(\d+)元',promo)
    if m:count=number(m[1]);amount=int(m[2])
    m=re.fullmatch(r'第二(?:盒|件)(半價|[\d]+折)',promo)
    if m:count=2;amount=round(q['price']*(1+(0.5 if m[1]=='半價' else int(m[1][:-1])/10)),2)
    if count:
        bulk=copy.deepcopy(n);total=pieces*(count+gifts)
        bulk.update(product=q['name']+'（'+promo+'）',salePrice=amount,listPrice=q['original']*count,boughtBoxes=boxes*count,giftBoxes=boxes*gifts,totalPieces=total,unitPrice=amount/total,offerType='promotion')
        offers.append(bulk)
output=[p for p in CURRENT if 'bblens.tw' not in p['url']]+offers
audit=ROOT/'audit/bblens-2026-09-22';audit.mkdir(parents=True,exist_ok=True)
if not SNAPSHOT.exists(): SNAPSHOT.write_text(json.dumps(OLD,ensure_ascii=False),encoding='utf8')
(audit/'report.json').write_text(json.dumps({'previousOffers':old_count,'currentOffers':len(offers),'matchedCatalogItems':len({p['sourceProductId'] for p in offers}),'catalogItems':len(CAT)},ensure_ascii=False,indent=2),encoding='utf8')
(ROOT/'public/products.json').write_text('[\n'+',\n'.join('  '+json.dumps(p,ensure_ascii=False,separators=(',',':')) for p in output)+'\n]\n',encoding='utf8')
(ROOT/'public/bblens-catalog.json').write_text(json.dumps(CAT,ensure_ascii=False,indent=2),encoding='utf8')
shutil.copyfile(ROOT.parent/'outputs/01a0c98a-92ce-7970-b8b1-aecedf678248/BBLens商品價格表.xlsx',ROOT/'public/bblens-prices-2026-09-22.xlsx')
print((audit/'report.json').read_text(encoding='utf8'))
