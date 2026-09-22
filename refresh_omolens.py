"""Publish the verified OMOLENS catalog and refresh existing comparison identities."""
import json,re,copy,shutil,urllib.parse
from pathlib import Path
from datetime import datetime,timezone,timedelta
ROOT=Path(__file__).parent
def run():
 raw=json.loads((ROOT.parent/'catalog.json').read_text(encoding='utf8'))
 old=json.loads((ROOT/'public/products.json').read_text(encoding='utf8'))
 byslug={urllib.parse.unquote(p['url'].split('/')[-1]):p for p in raw}
 mapping={
 'acuvue-define-daily-10':'acuvue-color-1','acuvue-define-daily-30':'acuvue-color-2',
 'acuvue-moist-daily-30':'acuvue-1','acuvue-moist-toric-daily-30':'acuvue-2','acuvue-moist-multifocal-daily-30':'acuvue-3',
 'acuvue-oasys-daily-30':'acuvue-4','acuvue-oasys-toric-daily-30':'acuvue-5','acuvue-vita-monthly-6':'acuvue-6','acuvue-vita-toric-monthly-6':'acuvue-7',
 'acuvue-standard-biweekly-6':'acuvue-8','acuvue-oasys-biweekly-6':'acuvue-9','acuvue-oasys-toric-biweekly-6':'acuvue-10',
 'acuvue-oasys-max-daily-30':'安視優歐舒適極潤高透氧矽水膠每日拋30片裝','acuvue-oasys-max-multifocal-daily-30':'安視優歐舒適極潤多焦點高透氧矽水膠每日拋30片裝',
 'alcon-airoptix-monthly-3':'alcon-air-3','alcon-airoptix-toric-monthly-3':'alcon-air-2','alcon-airoptix-multifocal-monthly-3':'alcon-air-1',
 'alcon-aquacomfort-daily-30':'alcon-3','alcon-aquacomfort-multifocal-daily-30':'alcon-multifocal-1','alcon-precision1-daily-30':'alcon-1',
 'alcon-precision1-toric-daily-30':'愛爾康-alcon-水感散光日拋30p','alcon-style-daily-30':'alcon-dailies-1-day','alcon-total1-daily-30':'alcon-total1-1','alcon-total1-multifocal-daily-30':'alcon-total1',
 'bausch-soflens-59-biweekly-6':'bausch-lomb-7','bausch-ultra-toric-monthly-3':'bausch-lomb-3',
 'hydron-003-color-daily-10':'海昌-hydron-零零三-薄-透氧彩色日拋隱形眼鏡','hydron-003-daily-30':'海昌-零零三薄透氧日拋30片裝',
 'hydron-beauty-secret-monthly-1':'hydron-5','hydron-changeable-bluefilter-monthly-1':'hydron-color-6','hydron-true-monthly-2':'hrdron-2',
 'largan-astral-color-daily-10':'星歐彩色日拋-星空系列','largan-capell-color-daily-10':'largan-color-c','largan-clear-daily-30':'largan-new-1-day','largan-clear-monthly-2':'largan-1',
 'largan-color-series-daily-10':'largan-color-1','largan-fantasy-color-daily-2':'星歐-largan-奇幻系列日拋-2片裝','largan-fragrance-color-daily-10':'largan-color-4','largan-fragrance-color-monthly-1':'largan-color-6','largan-starlight-color-daily-10':'largan-color-3',
 'miacare-clarox-daily-20':'miacare-4','miacare-comfort-daily-30':'miacare-3','miacare-happiness-color-daily-10':'miacare-color-4','miacare-heartbeat-color-daily-10':'miacare-color-3','miacare-moxy-daily-20':'miacare-2','miacare-moxy-monthly-2':'miacare-1','miacare-qing-solution-360ml':'miacare-solution','miacare-zhanmei-xingsu-daily-10':'miacare-color-6',
 'ticon-color-daily-10':'帝康-放大片日拋10片裝','ticon-themoment-color-monthly-1':'帝康-光漾瞬間彩色月拋1片裝','ticon-themoment-daily-30':'ticon-4','ticon-themoment-star-crescent-daily-10':'帝康-光漾瞬間彩色日拋恆星系列10片裝','ticon-zhenmei-color-daily-10':'ticon-color-3'}
 stamp=datetime.fromtimestamp((ROOT.parent/'omolens_sources/page8.html').stat().st_mtime,timezone(timedelta(hours=8))).isoformat(timespec='seconds')
 catalog=[]
 for q in raw:
  promo=q['text'].split(q['name'])[0].replace('售完','').strip()
  catalog.append(dict(id=q['id'],name=q['name'],price=int(q['prices'][0][3:].replace(',','')),promo=promo,soldOut='售完' in q['text'],url=q['url'],checkedAt=stamp))
 catalogbyid={q['id']:q for q in catalog}
 identities={}
 for p in old:
  if 'omolens.com' in p['url']:identities.setdefault(p['comparisonKey'],p)
 offers=[]; matched=[]
 for key,p in identities.items():
  slug=mapping.get(key,urllib.parse.unquote(p['url'].split('/')[-1])); q=byslug.get(slug)
  assert q,(key,slug)
  c=catalogbyid[q['id']]; promo=c['promo']; pack=re.search(r'(\d+)片裝',q['name'])
  pieces=int(pack[1]) if pack else p.get('piecesPerBox')
  assert not pack or pieces==p['piecesPerBox'],(key,pieces,p.get('piecesPerBox'))
  n={k:copy.deepcopy(p[k]) for k in ['source','brand','comparisonKey','comparisonName']}
  n.update(product=q['name'],salePrice=c['price'],boughtBoxes=1,giftBoxes=0,giftPieces=0,url=q['url'],sourceProductId=q['id'],checkedAt=stamp,note='公開單盒／單瓶標價；'+promo)
  if p.get('productType')=='solution':
   n.update(productType='solution',volumeMl=p['volumeMl'],totalVolumeMl=p['volumeMl'],unitPrice=c['price']/p['volumeMl'])
  else:n.update(piecesPerBox=pieces,totalPieces=pieces,unitPrice=c['price']/pieces)
  if c['soldOut']:n['comparisonEligible']=False
  offers.append(n)
  plans=[(int(m[1]),int(m[2].replace(',','')),0) for m in re.finditer(r'(\d+)(?:盒|瓶)(?:只要)?\$?([\d,]{3,})',promo)]
  gift=re.search(r'(\d+)盒(?:送|贈)(\d+)(?:盒|\()',promo)
  if gift:plans.append((int(gift[1]),c['price']*int(gift[1]),int(gift[2])))
  # The four-box price explicitly builds on the two-box offer.
  if '/4盒再折100' in promo and plans and plans[0][0]==2:plans.append((4,plans[0][1]*2-100,0))
  for bought,price,gifts in plans:
   o=copy.deepcopy(n);o.update(product=q['name']+f'（{bought}盒／瓶方案）',salePrice=price,boughtBoxes=bought,giftBoxes=gifts,note='公開活動：'+promo+'；未確認同款的加贈片數與隨機贈片不計入')
   if n.get('productType')=='solution':o.update(totalVolumeMl=n['volumeMl']*(bought+gifts),unitPrice=price/(n['volumeMl']*(bought+gifts)))
   else:
    # Previously reviewed MyDay offer confirms twenty same-product gift lenses.
    giftpieces=20 if key=='cooper-myday-daily-30' and '加贈20片' in promo else 0
    total=pieces*(bought+gifts)+giftpieces;o.update(totalPieces=total,giftPieces=giftpieces,unitPrice=price/total)
   offers.append(o)
  matched.append({'comparisonKey':key,'id':q['id'],'name':q['name'],'promo':promo,'plans':plans})
 output=[p for p in old if 'omolens.com' not in p['url']]+offers
 audit=ROOT/'audit/omolens-2026-09-22';audit.mkdir(parents=True,exist_ok=True)
 (audit/'before.json').write_text(json.dumps([p for p in old if 'omolens.com' in p['url']],ensure_ascii=False,indent=2),encoding='utf8')
 (audit/'mappings.json').write_text(json.dumps(matched,ensure_ascii=False,indent=2),encoding='utf8')
 assert [p for p in output if 'omolens.com' not in p['url']]==[p for p in old if 'omolens.com' not in p['url']]
 (ROOT/'public/products.json').write_text('[\n'+',\n'.join('  '+json.dumps(p,ensure_ascii=False,separators=(',',':')) for p in output)+'\n]\n',encoding='utf8')
 (ROOT/'public/omolens-catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2),encoding='utf8')
 shutil.copyfile(ROOT.parent/'outputs/omolens-20260922/OMOLENS商品價格表.xlsx',ROOT/'public/omolens-prices-2026-09-22.xlsx')
 print(json.dumps({'catalog':len(catalog),'identities':len(identities),'offers':len(offers)}))
if __name__=='__main__':run()
