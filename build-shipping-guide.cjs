const fs = require('node:fs');
const path = require('node:path');
const data = require('./shipping-guide.json');
const esc = s => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cards = data.map((site, i) => `
          <article class="shipping-card">
            <div class="shipping-card-heading"><span class="shipping-number">${String(i + 1).padStart(2,'0')}</span><h3>${esc(site.name)}</h3></div>
            <p class="shipping-time">${esc(site.time)}</p>
            <dl><div><dt>運費</dt><dd${site.fee === '待確認' ? ' class="shipping-pending"' : ''}>${esc(site.fee)}</dd></div><div><dt>免運條件</dt><dd>${esc(site.free)}</dd></div><div><dt>取貨方式</dt><dd>${esc(site.method)}</dd></div></dl>
            <details class="shipping-detail"><summary>查看條件與官方來源</summary><p>${esc(site.note)}</p><div class="shipping-sources">${site.sources.map(([label,url]) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`).join('')}</div></details>
          </article>`).join('');
const section = `<!-- shipping-guide:start -->
    <section id="shipping-guide" class="shipping-guide" aria-labelledby="shipping-guide-title">
      <div class="shipping-intro"><div><p class="eyebrow">BEFORE YOU ORDER</p><h2 id="shipping-guide-title">下單前，先把運費與時間算進去。</h2><p>12 個網站的配送資訊，一次看清楚。</p></div><a class="shipping-skip" href="#products">直接開始比價 ↓</a></div>
      <details class="shipping-all" open>
        <summary><span>12 站配送速查 <small>運費 · 免運門檻 · 出貨／到貨 · 取貨方式</small></span><span class="shipping-toggle" aria-hidden="true"></span></summary>
        <div class="shipping-content"><p class="shipping-explainer">「寄出／出貨」後仍需配送時間；「到貨」才是預計收到商品。工作天通常不含例假日，缺貨及特殊度數可能延後。</p>
          <div class="shipping-grid">${cards}
          </div>
          <p class="shipping-footnote">資料查閱：<time datetime="2026-09-22">2026/09/22</time> · 金額為新台幣，以台灣配送為主。未確認資訊已註記；各站活動、配送資格與最終費用以官方及結帳頁為準。運費尚未計入商品每片比價。</p>
        </div>
      </details>
    </section>
    <!-- shipping-guide:end -->`;
const file = path.join(__dirname, 'public/index.html');
let html = fs.readFileSync(file,'utf8');
const motivation = html.match(/<p class="motivation">[\s\S]*?<\/p>/)[0];
// Keep the introduction and guide together inside the comparison section,
// which app.js places immediately after the brand picker.
html = html.replace(/<!-- shipping-guide:start -->[\s\S]*?<!-- shipping-guide:end -->/, '').replace(motivation, '');
html = html.replace('<p id="source-pool"', () => `${motivation}\n    ${section}\n      <p id="source-pool"`);
fs.writeFileSync(file, html.replace(/^[\t ]+$/gm, ''));
