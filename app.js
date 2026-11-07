'use strict';
const $ = id => document.getElementById(id);
const labels = {card: '卡面', art: '官图存档', merch: '周边系列'};
const attr = {happy: 'Happy', cool: 'Cool', pure: 'Pure', powerful: 'Powerful'};
const size = 24;
let data = [], filtered = [], category = 'all', page = 1, selected = null, imageIndex = 0, toastTimer, opener;
let favorites = new Set();
try { favorites = new Set(JSON.parse(localStorage.getItem('kokoro-favorites') || '[]')); } catch {}
const esc = s => String(s ?? '').replace(/[&<>"']/g, x => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[x]));
function say(text) {
  $('toast').textContent = text; $('toast').hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 2200);
}
function toggleFavorite(id) {
  favorites.has(id) ? favorites.delete(id) : favorites.add(id);
  try { localStorage.setItem('kokoro-favorites', JSON.stringify([...favorites])); } catch { say('当前浏览器无法保存收藏。'); }
  if (category === 'favorite') query(); else render();
  if (selected) updateFavorite();
}
function updateFavorite() {
  $('detail-favorite').textContent = favorites.has(selected.id) ? '♥ 已收藏' : '♡ 收藏';
  $('detail-favorite').setAttribute('aria-pressed', String(favorites.has(selected.id)));
}
function query() {
  const term = $('search').value.trim().toLowerCase(), year = $('year').value, scope = $('scope').value;
  filtered = data.filter(x =>
    (category === 'all' || (category === 'favorite' ? favorites.has(x.id) : x.category === category)) &&
    (!term || [x.title, x.original, x.aliases, x.id, x.source].join(' ').toLowerCase().includes(term)) &&
    (!year || (year === 'unknown' ? !x.year : String(x.year) === year)) && (!scope || scope === x.scope));
  const sort = $('sort').value;
  filtered.sort((a,b) => sort === 'title' ? a.title.localeCompare(b.title,'zh-CN') :
    sort === 'new' ? String(b.year || '0000').localeCompare(String(a.year || '0000')) :
    sort === 'old' ? String(a.year || '9999').localeCompare(String(b.year || '9999')) :
    ({card:0,merch:1,art:2}[a.category] - {card:0,merch:1,art:2}[b.category]) || String(b.order).localeCompare(String(a.order), undefined, {numeric:true}));
  page = 1; render();
}
function render() {
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  page = Math.max(1, Math.min(page, pages));
  $('results').textContent = `${filtered.length} 个条目`;
  $('grid').innerHTML = filtered.slice((page-1)*size, page*size).map(x => `
    <article class="item ${esc(x.category)}">
      <button class="favorite-button ${favorites.has(x.id)?'saved':''}" data-favorite="${esc(x.id)}" aria-label="${favorites.has(x.id)?'取消收藏':'收藏'} ${esc(x.title)}" aria-pressed="${favorites.has(x.id)}">${favorites.has(x.id)?'♥':'♡'}</button>
      <button class="image-button" data-open="${esc(x.id)}" aria-label="查看 ${esc(x.title)}">
        <img src="${esc(x.image)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" alt="${esc(x.title)}">
        <span class="image-failed">预览不可用 ↗</span>
        ${x.images.length>1?`<span class="image-count" aria-label="${x.images.length} 张图片"><span aria-hidden="true">▧</span> ${x.images.length}</span>`:''}
      </button>
      <h3><button data-open="${esc(x.id)}">${esc(x.title)}</button></h3>
      <div class="item-meta"><span class="badge">${labels[x.category]}</span><span>${[x.year, x.rarity ? x.rarity+'★' : '', x.scope==='group' ? '合绘' : ''].filter(Boolean).map(esc).join(' · ')}</span></div>
    </article>`).join('');
  document.querySelectorAll('.image-button img').forEach(img => {
    const failed = () => img.parentElement.classList.add('failed');
    img.addEventListener('error', failed);
    if (img.complete && !img.naturalWidth) failed();
  });
  $('empty').hidden = filtered.length > 0;
  $('empty').querySelector('h3').textContent = category==='favorite' && !favorites.size ? '还没有收藏' : '没有找到相关条目';
  $('prev').disabled = page <= 1; $('next').disabled = page >= pages;
  $('page-info').textContent = `${page} / ${pages}`;
  document.querySelector('.pagination').hidden = filtered.length <= size;
  document.querySelectorAll('[data-category]').forEach(b => {
    b.classList.toggle('active', b.dataset.category === category);
    b.setAttribute('aria-pressed', String(b.dataset.category === category));
  });
}
function showImage() {
  const item = selected.images[imageIndex];
  $('detail-error').hidden = true; $('detail-image').style.visibility = '';
  $('detail-image').src = item.url; $('detail-image').alt = selected.title + ' · ' + item.label;
  $('image-caption').textContent = item.label;
  $('image-count').textContent = `${imageIndex+1} / ${selected.images.length}`;
  $('image-prev').disabled = imageIndex === 0; $('image-next').disabled = imageIndex >= selected.images.length-1;
  document.querySelector('.variant-row').hidden = selected.images.length < 2;
}
function open(id) {
  selected = data.find(x => x.id === id); if (!selected) return;
  opener = document.activeElement;
  imageIndex = selected.category === 'card' && selected.images.length > 1 ? 1 : 0;
  $('detail-category').textContent = labels[selected.category] + (selected.scope==='group'?' · 合绘':'');
  $('detail-title').textContent = selected.title;
  $('detail-original').textContent = selected.original !== selected.title ? selected.original || '' : '';
  $('detail-original').hidden = !$('detail-original').textContent;
  $('detail-meta').innerHTML = `<p>${esc(selected.source)} · ${({community:'社区资料',official:'官方 / 授权品牌',retailer:'零售商档案'}[selected.sourceKind]||'来源资料')}</p>${selected.rarity?`<p>#${esc(selected.id.replace('card-',''))} · ${selected.rarity}★ · ${attr[selected.attribute]||''}</p>`:''}<p>${esc(selected.date||selected.year||'日期未知')}${selected.dateLabel?' · '+esc(selected.dateLabel):''}</p>`;
  $('detail-notes').textContent = selected.notes || '';
  $('detail-extra').hidden = !selected.notes; $('detail-extra').open = false;
  $('source-link').href = selected.sourceUrl;
  $('product-list').innerHTML = selected.products.length ? `<details><summary>系列商品 · ${selected.products.length}</summary>${selected.products.map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.title)} ↗</a>`).join('')}</details>` : '';
  showImage(); updateFavorite();
  $('viewer').showModal(); document.body.style.overflow = 'hidden';
}
function close() { $('viewer').close(); }
document.querySelectorAll('[data-category]').forEach(b => b.addEventListener('click', () => { category=b.dataset.category; query(); }));
['search','year','scope','sort'].forEach(id => $(id).addEventListener(id==='search'?'input':'change',query));
$('grid').addEventListener('click', e => {
  const f=e.target.closest('[data-favorite]'), o=e.target.closest('[data-open]');
  if (f) {
    const id=f.dataset.favorite; toggleFavorite(id);
    document.querySelector(`[data-favorite="${CSS.escape(id)}"]`)?.focus({preventScroll:true});
  } else if (o) open(o.dataset.open);
});
$('prev').onclick = () => { page--; render(); $('gallery').scrollIntoView(); };
$('next').onclick = () => { page++; render(); $('gallery').scrollIntoView(); };
$('reset').onclick = () => { category='all'; ['search','year','scope'].forEach(id=>$(id).value=''); $('sort').value='default'; query(); };
$('close').onclick = close;
$('viewer').addEventListener('close', () => {
  document.body.style.overflow='';
  if (opener?.isConnected) opener.focus({preventScroll:true});
  else if (selected) document.querySelector(`[data-open="${CSS.escape(selected.id)}"]`)?.focus({preventScroll:true});
});
$('viewer').addEventListener('click', e => {
  if (e.target === $('viewer')) {
    const r=$('viewer').getBoundingClientRect();
    if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom) close();
  }
});
$('image-prev').onclick = () => { if(imageIndex>0) { imageIndex--; showImage(); } };
$('image-next').onclick = () => { if(imageIndex<selected.images.length-1) { imageIndex++; showImage(); } };
$('viewer').addEventListener('keydown', e => {
  if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
  if(e.key==='ArrowLeft') { e.preventDefault(); $('image-prev').click(); }
  if(e.key==='ArrowRight') { e.preventDefault(); $('image-next').click(); }
});
$('detail-favorite').onclick = () => toggleFavorite(selected.id);
$('detail-image').onerror = () => { $('detail-error').hidden=false; $('detail-image').style.visibility='hidden'; };
$('detail-image').onload = () => { $('detail-error').hidden=true; $('detail-image').style.visibility=''; };
$('export').onclick = () => {
  const quote = s => '"'+String(s??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"';
  const rows=[['ID','名称','分类','年份','来源','来源网址','日期说明'],...filtered.map(x=>[x.id,x.title,labels[x.category],x.year,x.source,x.sourceUrl,x.dateLabel])];
  const url=URL.createObjectURL(new Blob(['\ufeff'+rows.map(r=>r.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8;'}));
  const a=document.createElement('a'); a.href=url; a.download='弦卷心图鉴索引-2026-11-06.csv'; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000); say(`已导出 ${filtered.length} 条索引`);
};
Promise.all([
  fetch('data/catalog.json').then(r=>{if(!r.ok)throw Error();return r.json();}),
  fetch('data/summary.json').then(r=>{if(!r.ok)throw Error();return r.json();})
]).then(([items,s])=>{
  data=items;
  $('coverage').textContent=`${s.cards} 张卡片 · ${s.archive} 条官图存档 · ${s.merchProducts} 件商品（${s.merchGroups} 个系列）。`;
  const years=[...new Set(data.map(x=>x.year).filter(Boolean))].sort().reverse();
  $('year').innerHTML='<option value="">全部年份</option>'+years.map(y=>`<option value="${esc(y)}">${esc(y)}</option>`).join('')+'<option value="unknown">年份未知</option>';
  const hero=data.find(x=>x.id==='card-809') || data.find(x=>x.category==='card'&&x.images.length>1);
  if(hero) { $('hero-back').src=hero.images[0].url; $('hero-front').src=(hero.images[1]||hero.images[0]).url; }
  query();
}).catch(()=>{ $('results').textContent='图鉴加载失败，请刷新重试。'; });

