"""Read-only evidence capture for the Cooper price audit (no product writes)."""
import concurrent.futures
import hashlib
import json
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import quote, urljoin
from collector import get_page

ROOT = Path(__file__).parent
OUT = ROOT / 'audit' / 'cooper-2026-09-22'

class PageText(HTMLParser):
    def __init__(self):
        super().__init__(); self.parts=[]; self.links=[]; self.skip=0
    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'): self.skip += 1
        if tag in ('div','p','br','li','h1','h2','h3','tr'): self.parts.append('\n')
        if tag == 'a':
            href = dict(attrs).get('href')
            if href: self.links.append(href)
    def handle_endtag(self, tag):
        if tag in ('script','style'): self.skip=max(0,self.skip-1)
    def handle_data(self, data):
        if not self.skip and data.strip(): self.parts.append(data.strip()+' ')

def fetch(url):
    ident=hashlib.sha256(url.encode()).hexdigest()[:12]
    result={'url':url,'id':ident,'fetchedAt':datetime.now().astimezone().isoformat()}
    try:
        page=get_page(quote(url,safe=':/?=&%+-'))
        parser=PageText(); parser.feed(page)
        (OUT/(ident+'.html')).write_text(page,encoding='utf-8')
        (OUT/(ident+'.txt')).write_text('\n'.join(line.strip() for line in ''.join(parser.parts).splitlines() if line.strip()),encoding='utf-8')
        result['links']=list(dict.fromkeys(urljoin(url,href) for href in parser.links))
        result['status']='fetched'
    except Exception as exc: result.update(status='failed',error=str(exc))
    return result

if __name__ == '__main__':
    import sys
    OUT.mkdir(parents=True,exist_ok=True)
    products=json.loads((ROOT/'public/products.json').read_text(encoding='utf-8'))
    urls=list(dict.fromkeys(p['url'] for p in products if p['brand']=='酷柏'))
    if len(sys.argv)>1: urls=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: results=list(pool.map(fetch,urls))
    (OUT/('index-extra.json' if len(sys.argv)>1 else 'index.json')).write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
    for r in results: print(r['id'],r['status'],r['url'],r.get('error',''))
