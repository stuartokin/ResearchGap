/* ==================================================================
 *  TIME-LINKED WINDOWS
 * ================================================================== */
function rollingGap(yr){
  const set = items.filter(it => shownFully(it) && it.kind === 'hist' && it.p <= yr && it.p > yr - 10);
  if (!set.length) return null;
  return {m:Math.round(median(set.map(it => it.lag))), n:set.length};
}
let gapSeries = [];
function computeGapSeries(){ gapSeries = []; for (let y = 1930; y <= NOW; y++) { const g = rollingGap(y); gapSeries.push({y, m:g ? g.m : null}); } }
function setupCanvas(cv){
  if (!cv) return null;
  const w = cv.clientWidth, h = cv.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (!w || !h) return null;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
  return {g, w, h, fs:parseFloat(getComputedStyle(cv).fontSize) || 14};
}
function axes(S, x0, x1, ymax, step){
  const {g, w, h, fs} = S, L = fs * 2.1, Rr = 8, T = 8, B = fs * 1.5;
  const X = y => L + (y - x0) / (x1 - x0) * (w - L - Rr), Y = v => T + (1 - v / ymax) * (h - T - B);
  g.font = `${fs * .78}px "Instrument Sans", system-ui, sans-serif`; g.fillStyle = '#5D7486'; g.strokeStyle = 'rgba(160,195,220,.12)'; g.lineWidth = 1;
  for (let v = 0; v <= ymax; v += step) { g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(w - Rr, Y(v)); g.stroke(); g.fillText(v, 2, Y(v) + fs * .28); }
  for (let y = 1940; y <= 2020; y += 20) g.fillText(y, X(y) - fs, h - 3);
  g.fillStyle = 'rgba(233,242,255,.05)'; g.fillRect(X(NOW), T, X(x1) - X(NOW), h - T - B);
  return {X, Y, L, T, B};
}
function drawGap(c){
  const S = setupCanvas($('gapCanvas')); if (!S) return;
  const {g} = S, sc = scenario();
  const top = Math.max(20, Math.ceil((Math.max(0, sc ? sc.base : 0, ...gapSeries.map(p => p.m || 0)) + 2) / 10) * 10);
  const {X, Y, T, B} = axes(S, 1930, YEND, top, 10);
  const path = (cond, stroke, width) => {
    g.beginPath(); let on = false;
    gapSeries.forEach(p => { if (p.m == null || !cond(p)) { on = false; return; } const px = X(p.y), py = Y(p.m); if (!on) { g.moveTo(px, py); on = true; } else g.lineTo(px, py); });
    g.strokeStyle = stroke; g.lineWidth = width; g.stroke();
  };
  if (!(state.playing && view.gapBuild !== false)) path(() => true, 'rgba(233,242,255,.14)', 1.5);
  path(p => p.y <= c, '#E9F2FF', 2.2);
  const end = Math.min(c, YEND);
  if (sc && end > NOW) {
    g.beginPath();
    for (let y = NOW; y <= end + 1e-6; y += .25) g.lineTo(X(y), Y(scenAt(sc, y).hi));
    for (let y = end; y >= NOW - 1e-6; y -= .25) g.lineTo(X(y), Y(scenAt(sc, y).lo));
    g.closePath(); g.fillStyle = 'rgba(76,211,194,.25)'; g.fill();
    g.beginPath(); for (let y = NOW; y <= end + 1e-6; y += .25) { const v = scenAt(sc, y); g.lineTo(X(y), Y((v.lo + v.hi) / 2)); }
    g.strokeStyle = '#4CD3C2'; g.lineWidth = 2.2; g.stroke();
    g.beginPath(); g.moveTo(X(NOW), Y(sc.base)); g.lineTo(X(end), Y(sc.base));
    g.setLineDash([4, 4]); g.strokeStyle = 'rgba(233,242,255,.75)'; g.lineWidth = 1.6; g.stroke(); g.setLineDash([]);
  }
  if (state.playing) { const cx = X(end); g.strokeStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(cx, T); g.lineTo(cx, S.h - B); g.stroke(); }
  const yr = Math.floor(end), pt = gapSeries.find(p => p.y === yr);
  if (yr > NOW && sc) { const v = scenAt(sc, yr); $('gapNow').textContent = `${yr} scenario: about ${fmtY(sc.base)} years at the recent pace; ${fmtR(v.lo, v.hi)} with AI and digital twins.`; }
  else $('gapNow').textContent = pt && pt.m != null ? `${yr}: arcs landing in the previous ten years took a median of ${pt.m} years.` : `${yr}: no arcs landing in the previous ten years for this selection.`;
}
function renderContext(yr){
  const era = CTX_ERAS.filter(e => e[0] <= yr).pop();
  $('ctxEra').textContent = era ? era[1] : '';
  $('ctxYear').textContent = state.playing ? `Events up to ${yr}` : 'Latest events and the years ahead';
  const list = EVENTS.filter(e => e.y <= yr).slice(-9).reverse();
  $('ctxList').innerHTML = list.map((e, i) => `<div class="trow ${i === 0 && state.playing && yr - e.y < 3 ? 'fresh' : ''} ${e.c === 'future' ? 'fut' : ''}"><b>${e.y}</b><i class="cat cat-${e.c}"></i><span>${e.t}</span></div>`).join('');
}
function renderLanding(yr){
  const pool = items.filter(shownFully);
  const landed = pool.filter(it => it.kind !== 'flight' && (it.kind === 'hist' || yr > NOW) && it.p <= yr && it.p > yr - 8).sort((a, b) => b.p - a.p || a.lag - b.lag).slice(0, 12);
  const started = pool.filter(it => it.r <= yr && it.r > yr - 8).sort((a, b) => b.r - a.r).slice(0, 12);
  const row = (y, it, extra) => `<div class="trow" data-id="${it.id}"><b>${y}</b><i class="cat" style="background:${itemHex(it)}"></i><span>${chgTag(it)}${esc(it.t)}<em>${extra}</em></span></div>`;
  $('landList').innerHTML = landed.length ? landed.map(it => row(it.p, it, `${lagTxt(it.lag)}${it.kind === 'proj' ? ', expected' : ''}`)).join('') : '<p class="empty">Nothing in this selection reached change in these years.</p>';
  $('startList').innerHTML = started.length ? started.map(it => row(it.r, it, it.kind === 'flight' ? 'still in the lab' : it.p <= yr ? `landed after ${lagTxt(it.lag)}` : 'in progress')).join('') : '<p class="empty">No research in this selection began in these years.</p>';
}
function renderFortunes(yr){
  if (yr === undefined) yr = state.playing ? Math.floor(Math.min(state.cursor, YEND)) : YEND;
  $('fortHi').setAttribute('aria-pressed', !!view.fortHi); $('fortOnly').setAttribute('aria-pressed', !!view.fortOnly);
  let pool = FORTUNES.filter(x => F.fields.has(x.v));
  const allPool = pool;
  if (view.fortOnly) pool = pool.filter(x => x.ac);
  const sorters = {year:(a, b) => b.f - a.f || (b.joke ? 1 : 0) - (a.joke ? 1 : 0), worth:(a, b) => (b.nw || -1) - (a.nw || -1) || b.f - a.f, speed:(a, b) => ((a.w <= yr ? a.w - a.f : 99) - (b.w <= yr ? b.w - b.f : 99)) || (b.joke ? 1 : 0) - (a.joke ? 1 : 0) || b.f - a.f};
  document.querySelectorAll('#fortSortSeg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === (view.fortSort || 'year')));
  const shown = pool.filter(x => x.f <= yr).sort(sorters[view.fortSort] || sorters.year);
  const chartList = pool.filter(x => x.f <= yr).sort(sorters.year);
  const S = setupCanvas($('fortCanvas'));
  if (S) {
    const {g, fs} = S, {X, Y} = axes(S, 1930, YEND, 25, 5);
    chartList.slice().reverse().forEach(x => {
      const done = x.w <= yr, yv = done ? x.w - x.f : Math.min(yr - x.f, 25), col = FIELDS[x.v].hex;
      g.beginPath(); g.arc(X(x.f), Y(yv), fs * .34, 0, Math.PI * 2);
      if (done) { g.fillStyle = col; g.fill(); } else { g.strokeStyle = col; g.lineWidth = 1.5; g.stroke(); }
      if (view.fortHi && x.ac) { g.beginPath(); g.arc(X(x.f), Y(yv), fs * .62, 0, Math.PI * 2); g.strokeStyle = '#FFD166'; g.lineWidth = x.prize ? 2.4 : 1.4; g.stroke(); }
      if (x.joke) { g.font = `${fs * 1.5}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('⭐', X(x.f), Y(yv) - fs * .9); g.textAlign = 'start'; g.textBaseline = 'alphabetic'; }
    });
  }
  const med = a => a.length ? Math.round(median(a)) : null, gotAllInc = pool.filter(x => x.w <= yr), got = gotAllInc.filter(x => !x.joke);
  const eraDefs = [['before 1970', 0, 1970], ['1970–99', 1970, 2000], ['2000–14', 2000, 2015], ['2015 onwards', 2015, 3000]];
  const parts = eraDefs.map(([lab, a, b]) => { const m = med(got.filter(x => x.f >= a && x.f < b).map(x => x.w - x.f)); return m == null ? null : `${lagTxt(m)} for companies founded ${lab}`; }).filter(Boolean);
  const fastest = gotAllInc.slice().sort((a, b) => (a.w - a.f) - (b.w - b.f) || (b.joke ? 1 : 0) - (a.joke ? 1 : 0) || b.f - a.f)[0];
  const richest = gotAllInc.filter(x => x.joke).sort((a, b) => b.nw - a.nw)[0];
  $('fortStat').textContent = !pool.length ? 'No examples for the selected fields.' : parts.length ? `Median time to a fortune: ${parts.join('; ')}.` + (fastest ? ` Fastest so far: ${fastest.joke ? fastest.n + ', ' : ''}${fastest.co}, ${lagTxt(fastest.w - fastest.f)}.` : '') + (richest ? ` Richest person ever: ${richest.n}, ${fmtMoney(richest.nw, '$')}.` : '') : 'No founders in this selection had reached a fortune by this year.';
  // research banner
  const gotAll = allPool.filter(x => x.w <= yr && !x.joke), res = gotAll.filter(x => x.ac), recent = res.filter(x => x.f >= 2015);
  $('fortBanner').innerHTML = res.length ? `<b>${res.length} of ${gotAll.length}</b> fortunes here began in a university or research lab, typically in <b>${lagTxt(Math.round(median(res.map(x => x.w - x.f))))}</b>` + (recent.length ? `; since 2015, in <b>${lagTxt(Math.round(median(recent.map(x => x.w - x.f))))}</b>` : '') + `. <span>Researchers in this room: this could be your time.</span>` : '';
  const badge = x => (x.ac === 'uni' ? '<span class="fb uni" title="Founded out of university research">🎓 University</span>' : x.ac === 'lab' ? '<span class="fb lab" title="Founders known for research">🔬 Research</span>' : '') + (x.prize ? `<span class="fb prize" title="${x.prize}">🏅 ${x.prize}</span>` : '');
  $('fortList').innerHTML = shown.map(x => `<div class="trow ${x.joke ? 'jokerow' : view.fortHi && x.ac ? 'resrow' : ''}"><b>${x.f}</b><i class="cat" style="background:${FIELDS[x.v].hex}"></i><span><strong>${x.n}</strong>, ${x.co}<em>${x.w <= yr ? `${lagTxt(x.w - x.f)}: ${(x.how.charAt(0).toLowerCase() + x.how.slice(1))}, ${x.w}` : 'building'}</em>${x.nw ? `<span class="nw" title="${x.nwWho}: ${x.nwBasis}. Approximate, in 2026 money; £ at $1 = £${FX_GBP}.">≈ ${fmtMoney(x.nw, '$')} | ${fmtMoney(x.nw * FX_GBP, '£')} <small>${x.nwWho}</small></span>` : ''}${view.fortHi ? badge(x) : ''}</span></div>`).join('');
}
$('fortHi').onclick = () => { view.fortHi = !view.fortHi; renderFortunes(); };
$('fortSortSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; view.fortSort = b.dataset.v; renderFortunes(); });
$('fortOnly').onclick = () => { view.fortOnly = !view.fortOnly; renderFortunes(); };
const visOpen = new Set();
function renderVision(yr){
  if (yr === undefined) yr = state.playing ? Math.floor(Math.min(state.cursor, YEND)) : YEND;
  const pool = items.filter(it => it.dv), single = Object.values(F.dv).filter(Boolean).length === 1;
  $('visList').innerHTML = Object.keys(VISION).map(k => {
    const set = pool.filter(it => it.dv === k).sort((a, b) => (a.p || a.tg) - (b.p || b.tg));
    const landed = set.filter(it => it.kind === 'hist' && it.p <= yr), ahead = set.filter(it => !(it.kind === 'hist' && it.p <= yr));
    const on = F.vision && F.dv[k] && single;
    const areaChg = CHANGES.filter(c => c.it && c.it.dv === k);

    return `<div class="vrow ${on ? 'on' : ''}" data-dv="${k}"><div class="vhead" role="button" tabindex="0" title="Show only this area in the model"><span class="vn">${VISION[k]}</span><span class="vc">${landed.length} already helping, ${ahead.length} still to land</span></div>
      <details class="vdet" data-k="${k}" ${visOpen.has(k) ? 'open' : ''}><summary>Already helping (${landed.length})</summary>${landed.length ? landed.slice().reverse().map(it => `<div class="trow" data-id="${it.id}"><b>${it.p}</b><i class="cat" style="background:${itemHex(it)}"></i><span>${chgTag(it)}${esc(it.t)}<em>${it.pw}</em></span></div>`).join('') : '<p class="empty">Nothing yet at this point in time.</p>'}</details>
      <details class="vdet" data-k="${k}:ahead" ${visOpen.has(k + ':ahead') ? 'open' : ''}><summary>Still to land (${ahead.length})</summary>${ahead.length ? ahead.map(it => `<div class="trow" data-id="${it.id}"><b>${it.kind === 'flight' ? 'Later' : '~' + it.p}</b><i class="cat" style="background:${itemHex(it)}"></i><span>${chgTag(it)}${esc(it.t)}<em>${it.pw}</em></span></div>`).join('') : '<p class="empty">Nothing still to land in this area.</p>'}</details>${areaChg.length ? `<details class="vdet vchg" data-k="${k}:chg" ${visOpen.has(k + ':chg') ? 'open' : ''}><summary>Data changes (${areaChg.length})</summary>${areaChg.map(c => `<div class="trow trow3" data-id="${c.it.id}"><b>${c.date.slice(8, 10)}/${c.date.slice(5, 7)}</b><i class="cat" style="background:${itemHex(c.it)}"></i><span>${esc(c.it.t)}<em><span class="chgb ${CHG_TYPES[c.type].cls}">${CHG_TYPES[c.type].label}</span> ${esc(c.text)}</em></span></div>`).join('')}</details>` : ''}</div>`;
  }).join('');
}
$('visList').addEventListener('toggle', e => { const d = e.target; if (!d.classList || !d.classList.contains('vdet')) return; d.open ? visOpen.add(d.dataset.k) : visOpen.delete(d.dataset.k); }, true);
$('visList').addEventListener('click', e => {
  const tr = e.target.closest('.vdet .trow[data-id], .vt span[data-id]');
  if (tr) { const it = items[+tr.dataset.id]; hidden.delete(it.id); openDetail(it); return; }
  if (e.target.closest('.vdet')) return;
  const head = e.target.closest('.vhead'); if (!head) return;
  const k = head.parentElement.dataset.dv, single = Object.values(F.dv).filter(Boolean).length === 1;
  if (F.vision && single && F.dv[k]) { F.vision = false; F.dv = {opt:true,asset:true,demand:true,rd:true,gov:true}; }
  else { F.vision = true; F.dv = {opt:false,asset:false,demand:false,rd:false,gov:false}; F.dv[k] = true; F.fields = new Set(FKEYS); }
  refresh();
});
$('visExpand').onclick = () => { const keys = Object.keys(VISION).flatMap(k => [k, k + ':ahead', k + ':chg']); const all = keys.some(k => !visOpen.has(k)); keys.forEach(k => all ? visOpen.add(k) : visOpen.delete(k)); $('visExpand').textContent = all ? 'Collapse all' : 'Expand all'; renderVision(); };
$('visAll').onclick = () => { F.vision = true; F.dv = {opt:true,asset:true,demand:true,rd:true,gov:true}; F.fields = new Set(FKEYS); refresh(); };
$('visOff').onclick = () => { F.vision = false; F.dv = {opt:true,asset:true,demand:true,rd:true,gov:true}; refresh(); };
['landList','startList'].forEach(id => $(id).addEventListener('click', e => { const r = e.target.closest('.trow'); if (r && r.dataset.id) openDetail(items[+r.dataset.id]); }));
let twKey = '';
function updateTimeWindows(force){
  const c = state.playing ? state.cursor : Y1, yr = Math.floor(Math.min(c, YEND));
  const key = (state.playing ? Math.floor(c * 4) : 'end');
  if (!force && key === twKey) return;
  twKey = key;
  if (layout.context.open) renderContext(yr);
  if (layout.landing.open) renderLanding(yr);
  if (layout.gapchart.open) drawGap(c);
  if (layout.fortunes.open) renderFortunes(yr);
  if (layout.vision.open) renderVision(yr);
  if (layout.outlook.open && (force || !state.playing)) renderOutlook();
}
if (window.ResizeObserver) { const cro = new ResizeObserver(() => { twKey = ''; }); ['gapCanvas','fortCanvas'].forEach(id => cro.observe($(id))); }

