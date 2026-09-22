"""Publish the verified 2026-09-22 FunnyEyes catalog and reviewed comparison offers."""
import json,re,copy,shutil,urllib.parse
from pathlib import Path
ROOT=Path(__file__).parent
def run():
 catalog=json.loads((ROOT.parent/'products.json').read_text(encoding='utf-8'))
 assert len(catalog)==646 and len({p['id'] for p in catalog})==646
 byid={p['id']:p for p in catalog}
 path=ROOT/'public/products.json'; old=json.loads(path.read_text(encoding='utf-8'))
 mappings={
 'bausch-biotrue-daily-30':'407','bausch-ultra-one-day-30':'1092',
 'alcon-total1-daily-30':'270','alcon-aquacomfort-daily-30':'892',
 'acuvue-oasys-biweekly-6':'105','acuvue-standard-biweekly-6':'106',
 'anley-love-color-daily-10':'875','anley-clear-daily-30':'666',
 'acuvue-moist-toric-daily-30':'93','acuvue-oasys-toric-daily-30':'1150',
 'acuvue-moist-multifocal-daily-30':'1036','acuvue-oasys-max-multifocal-daily-30':'1613',
 'acuvue-define-daily-30':'637','acuvue-define-daily-10':'1044',
 'miacare-moxy-daily-20':'1023','miacare-comfort-daily-30':'326'}
 def base(q): return q['name'].split('】')[0]+'】'
 reviewed={}; offers={}
 def offer(p,q):
  name=q['name']; pack=re.search(r'【(\d+)片裝】',name); assert pack,name
  tail=name[pack.end():]; main=re.split(r'再加|加送|加贈',tail)[0]
  buy=re.match(r'(\d+)(?:盒|送)',main); gift=re.search(r'送(\d+)盒',main)
  bought=int(buy[1]) if buy else 1; gifts=int(gift[1]) if gift else 0
  extra=10 if q['id']=='1709' else 0 # Previously detail-verified same-product 5-piece packs.
  pieces=int(pack[1]); total=pieces*(bought+gifts)+extra
  n=copy.deepcopy(p)
  n.update(source='睛美',product=name,salePrice=q['price'],piecesPerBox=pieces,boughtBoxes=bought,giftBoxes=gifts,giftPieces=extra,totalPieces=total,unitPrice=q['price']/total,url=q['url'],sourceProductId=q['id'],checkedAt='2026-09-22',note='網站公開整組售價；隨機或未確認同品項贈片不納入換算。')
  if extra:n['note']='買5盒送1盒，另贈同款5片裝2盒，共190片。'
  n.pop('listPrice',None)
  if q['original'] is not None:n['listPrice']=q['original']
  return n
 for p in old:
  if 'funny-eyes.com' not in p['url']:continue
  key=p['comparisonKey']; ids=urllib.parse.parse_qs(urllib.parse.urlparse(p['url']).query)
  pid=ids.get('product_id',[None])[0]
  if pid is None:
   if key=='acuvue-moist-daily-30':pid='90' if p['boughtBoxes']==2 else '352'
   elif key=='acuvue-oasys-daily-30':pid='86' if p['boughtBoxes']==2 else '847'
   else:pid=mappings[key]
  q=byid[pid]; assert int(re.search(r'【(\d+)片裝】',q['name'])[1])==p['piecesPerBox']
  offers[pid]=offer(p,q);reviewed[base(q)]=p
 for q in catalog:
  if q['id'] not in offers and base(q) in reviewed:offers[q['id']]=offer(reviewed[base(q)],q)
 # Existing reviewed group explicitly covers both Define 10-piece series.
 offers['1670']=offer(offers['1044'],byid['1670'])
 result=[p for p in old if 'funny-eyes.com' not in p['url']]+list(offers.values())
 assert [p for p in result if 'funny-eyes.com' not in p['url']]==[p for p in old if 'funny-eyes.com' not in p['url']]
 path.write_text('[\n'+',\n'.join('  '+json.dumps(p,ensure_ascii=False,separators=(',',':')) for p in result)+'\n]\n',encoding='utf-8')
 (ROOT/'public/funnyeyes-catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
 shutil.copyfile(ROOT.parent/'outputs/funny-eyes-20260922/睛美網站商品價格表_2026-09-22.xlsx',ROOT/'public/funnyeyes-prices-2026-09-22.xlsx')
 html=(ROOT/'public/shiningeyes.html').read_text(encoding='utf-8').replace('shiningeyes','funnyeyes').replace('漾美','睛美').replace('540','646').replace('2026/09/22 核對','2026/09/22 官網公開列表核對')
 (ROOT/'public/funnyeyes.html').write_text(html,encoding='utf-8')
 js=(ROOT/'public/shiningeyes.js').read_text(encoding='utf-8').replace('shiningeyes-catalog.json','funnyeyes-catalog.json').replace('p.detail_price','p.price').replace('a.detail_price','a.price').replace('b.detail_price','b.price').replace('p.detail_original','p.original')
 js=js.replace('catalog=data;','data=data.map(p=>({...p,categories:p.categories.map(c=>c.name)}));catalog=data;')
 (ROOT/'public/funnyeyes.js').write_text(js,encoding='utf-8')
 index=ROOT/'public/index.html'; text=index.read_text(encoding='utf-8'); needle='      <div id="source-overview-links" class="source-overview-links"></div>'
 if 'href="funnyeyes.html"' not in text:
  assert text.count(needle)==1
  text=text.replace(needle,needle+'\n      <p>睛美價格核對：<time datetime="2026-09-22">2026/09/22</time>。<a href="funnyeyes.html">查詢完整 646 項商品價格</a> · <a href="funnyeyes-prices-2026-09-22.xlsx" download>下載睛美 Excel 價格表</a></p>')
 index.write_text(text,encoding='utf-8')
 print('Catalog:',len(catalog),'Comparison offers:',len(offers))
if __name__=='__main__':run()
