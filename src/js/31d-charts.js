/* ==================================================================
 *  CHARTS: eight interactive views that make the data readable. Text scales with the window (A− A+),
 *  charts fill the window and zoom to what is shown, a filter bar narrows each chart, and a side panel
 *  keeps the detail of what you select. Selecting a milestone also opens its story and moves the 3D view.
 * ================================================================== */
const CHART_TABS = [['gaps', 'Gap explorer'], ['heat', 'Heatmap'], ['ai', 'AI vs the rest'], ['pipe', 'Clean energy pipeline'], ['drift', 'Forecast drift'], ['sec', 'Security lag'], ['fort', 'Race to a fortune'], ['whatif', 'What if?']];
const CH = {tab:'gaps', sel:null, rows:[], head:[], note:'', q:'', field:'', origin:'', zoom:{}, zoom2:{}, panel:null, gapSort:'gap', gapColour:'field', heatBy:'p', aiLog:true, aiMode:'zoom', aiLabels:'auto', secSort:'arrival', fortYear:null, fortTimer:0, wiScen:'mid', wiOff:{}, lastW:0, lastFs:0};
const CHC = {bg:'#0B1724', grid:'#1d3346', txt:'#D5E2EF', mut:'#8FA6B8', amber:'#F7C04A', teal:'#4CD3C2', coral:'#FF6B6B', green:'#7FD6A0', gold:'#FFD166', violet:'#A891FF', blue:'#5FD8FF'};
const chEsc = s => esc(String(s == null ? '' : s));
const chFind = id => items.find(it => it.id == id);
const chFs = () => parseFloat(getComputedStyle($('chartBody')).fontSize) || 13;
const chClip = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s;
function chScale(d0, d1, r0, r1){ const f = v => r0 + (v - d0) / ((d1 - d0) || 1) * (r1 - r0); f.inv = p => d0 + (p - r0) / ((r1 - r0) || 1) * (d1 - d0); return f; }
function chNiceStep(span, px, fs){ const target = Math.max(1, span / Math.max(2, px / (fs * 4.5))); return [1, 2, 5, 10, 20, 25, 50, 100].find(s => s >= target) || 100; }
function chMatch(it){
  if (CH.field && it.v !== CH.field) return false;
  if (CH.origin && it.s !== CH.origin) return false;
  if (CH.q) { const q = CH.q.toLowerCase(); if (!(`${it.t} ${it.co || ''} ${it.sub || ''} ${(it.tags || []).join(' ')}`.toLowerCase().includes(q))) return false; }
  return true;
}
const chPool = () => items.filter(it => !it.removed && !it.aud && shownFully(it) && chMatch(it));
function chartSelect(it){ if (!it) return; CH.sel = it.id; openDetail(it); setOpen('details', true); renderCharts(); }
/* ---------- the side panel: keeps what you clicked, even when you open a milestone's story ---------- */
function chPanel(title, html){ CH.panel = {tab:CH.tab, title, html}; drawPanel(); }
function drawPanel(){
  const side = $('chartSide'), p = CH.panel && CH.panel.tab === CH.tab ? CH.panel : null;
  $('chartMain').classList.toggle('hasside', !!p);
  side.innerHTML = p ? `<div class="cshead"><b>${chEsc(p.title)}</b><button class="mini" id="chSideX" aria-label="Close panel">✕</button></div>${p.html}` : '';
}
function chItemsHtml(list, fmt){
  if (!list.length) return '<p class="note-s">Nothing here with the current filters.</p>';
  const max = Math.max(1, ...list.map(it => it.lag || 0));
  return '<div class="csitems">' + list.map(it => `<button data-id="${it.id}" class="${CH.sel === it.id ? 'on' : ''}"><span class="cst"><i style="background:${itemHex(it)}"></i>${chEsc(it.t)}</span><span class="csb"><em style="width:${Math.max(3, (it.lag || 0) / max * 100)}%;background:${itemHex(it)}"></em></span><span class="csy">${fmt ? fmt(it) : `${it.r} → ${it.kind === 'proj' ? '~' : ''}${it.p} · ${it.lag} yr${it.lag === 1 ? '' : 's'}`}</span></button>`).join('') + '</div>';
}
/* ---------- the window ---------- */
function chFilterBar(extra, opts){
  const o = opts || {}, fields = FKEYS.filter(k => FIELDS[k] && !FIELDS[k].custom);
  const zoomed = CH.zoom[CH.tab] || CH.zoom2[CH.tab];
  return `<div class="cfilt"><input id="chQ" type="search" placeholder="${o.searchLabel || 'Search titles'}" value="${chEsc(CH.q)}">
    <select id="chField" aria-label="Field"><option value="">All fields</option>${fields.map(k => `<option value="${k}"${CH.field === k ? ' selected' : ''}>${chEsc(fieldName(k))}</option>`).join('')}</select>
    <select id="chOrigin" aria-label="Origin"><option value="">${o.originAll || 'All origins'}</option>${(o.origins || [['academic', 'University'], ['industry', 'Industry'], ['government', 'Government']]).map(([k, n]) => `<option value="${k}"${CH.origin === k ? ' selected' : ''}>${n}</option>`).join('')}</select>
    ${extra || ''}${zoomed ? '<button class="mini on" id="chZoomReset">Reset zoom</button>' : ''}</div>`;
}
function renderCharts(){
  if (!layout.charts || !layout.charts.open) return;
  const box = $('chartSvg'), fs = chFs();
  $('chartTabs').innerHTML = CHART_TABS.map(([k, n]) => `<button data-t="${k}" class="${CH.tab === k ? 'on' : ''}" role="tab" aria-selected="${CH.tab === k}">${n}</button>`).join('');
  drawPanel();
  const W = Math.max(300, box.clientWidth - 6), H = Math.max(260, box.clientHeight - 6);
  CH.note = ''; CH.rows = []; CH.head = [];
  const fn = {gaps:chGaps, heat:chHeat, ai:chAI, pipe:chPipe, drift:chDrift, sec:chSec, fort:chFort, whatif:chWhatIf}[CH.tab] || chGaps;
  box.innerHTML = fn(W, H, fs); $('chartNote').textContent = CH.note;
  const q = $('chQ'); if (q && CH.qFocus) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
}
let chartTimer = 0; function scheduleCharts(){ clearTimeout(chartTimer); chartTimer = setTimeout(renderCharts, 120); }

/* ---------- a shared row chart: one row per item, with a year axis that zooms ---------- */
function chRowChart(W, H, fs, rows, o){
  const lf = fs * .92, maxLab = Math.max(10, ...rows.map(r => r.label.length));
  const L = Math.min(W * .34, maxLab * lf * .52 + 14), endW = o.endW || 0;
  const top = (o.top || 0) + fs * 2.1, avail = H - top - 6, n = Math.max(1, rows.length);
  const rh = Math.max(fs * 1.45, Math.min(fs * 2.6, avail / n)), totalH = Math.max(H, top + n * rh + 8);
  const vals = rows.flatMap(r => r.span).filter(v => v != null && isFinite(v));
  let [a, b] = CH.zoom[CH.tab] || [Math.floor(Math.min(...vals) - 1), Math.ceil(Math.max(...vals) + 1)];
  if (!isFinite(a) || !isFinite(b)) { a = 1920; b = NOW + 10; }
  const x = chScale(a, b, L + 10, W - 12 - endW), step = chNiceStep(b - a, W - L - endW, fs);
  let s = `<svg class="chsvg chzoomx" width="${W}" height="${totalH}" data-x0="${a}" data-x1="${b}" data-l="${L + 10}" data-r="${W - 12 - endW}" font-size="${lf}">`;
  for (let v = Math.ceil(a / step) * step; v <= b; v += step) s += `<line x1="${x(v)}" x2="${x(v)}" y1="${top - 4}" y2="${totalH}" stroke="${CHC.grid}"/><text x="${x(v)}" y="${top - fs * .7}" fill="${CHC.mut}" text-anchor="middle">${v}</text>`;
  const below = Math.min(totalH - 4, top + n * rh + fs * 1.1);
  (o.markers || []).forEach(m => { if (m.x < a || m.x > b) return; s += `<line x1="${x(m.x)}" x2="${x(m.x)}" y1="${top - 4}" y2="${top + n * rh}" stroke="${m.color}" stroke-dasharray="4 4" stroke-opacity=".8"/>${m.label ? `<text x="${x(m.x)}" y="${below}" fill="${m.color}" font-size="${fs * .8}" text-anchor="middle">${chEsc(m.label)}</text>` : ''}`; });
  rows.forEach((r, i) => {
    const y = top + i * rh + rh / 2, sel = CH.sel === r.id, th = Math.max(3, Math.min(rh * .42, fs * .75));
    s += `<g class="chrow" data-id="${r.id}" data-tip="${chEsc(r.tip)}"><rect x="0" y="${y - rh / 2}" width="${W}" height="${rh}" fill="${sel ? 'rgba(247,192,74,.16)' : i % 2 ? 'rgba(255,255,255,.018)' : 'transparent'}"/>
      <text x="${L}" y="${y + lf * .35}" fill="${sel ? CHC.amber : CHC.txt}" text-anchor="end">${chEsc(chClip(r.label, Math.floor((L - 10) / (lf * .5))))}</text>`;
    (r.bars || []).forEach(bb => { const x1 = x(Math.max(a, bb.a)), x2 = x(Math.min(b, bb.b)); if (x2 < x1 || bb.b < a || bb.a > b) return;
      s += `<line x1="${x1}" x2="${x2}" y1="${y}" y2="${y}" stroke="${bb.color}" stroke-width="${th * (bb.thin ? .45 : 1)}" stroke-linecap="round" stroke-opacity="${bb.opacity ?? 1}"${bb.dash ? ` stroke-dasharray="${th * 1.2} ${th}"` : ''}/>`; });
    (r.dots || []).forEach(d => { if (d.x < a || d.x > b) return; s += `<circle cx="${x(d.x)}" cy="${y}" r="${(d.r || .5) * th + 1.5}" fill="${d.hollow ? CHC.bg : d.color}" stroke="${d.color}" stroke-width="${d.hollow ? 2 : 0}"/>`; });
    if (r.end) s += `<text x="${o.endAtRight ? W - endW - 4 + 8 : x(Math.min(b, r.endX ?? b)) + th + 4}" y="${y + lf * .35}" fill="${r.endColor || CHC.mut}" font-size="${fs * .82}">${chEsc(r.end)}</text>`;
    s += '</g>';
  });
  return s + '</svg>';
}

/* 1. Gap explorer */
function chGaps(W, H, fs){
  const pool = chPool().filter(it => it.kind === 'hist' || it.kind === 'proj');
  const sorts = {gap:(p, q) => q.lag - p.lag, research:(p, q) => p.r - q.r, recent:(p, q) => q.p - p.p, field:(p, q) => p.v.localeCompare(q.v) || p.r - q.r};
  pool.sort(sorts[CH.gapSort] || sorts.gap);
  const colour = it => CH.gapColour === 'ai' ? (isAIDriven(it) ? CHC.teal : CHC.mut) : CH.gapColour === 'origin' ? ({academic:CHC.amber, industry:CHC.teal, government:CHC.violet}[it.s] || CHC.mut) : itemHex(it);
  const seg = (id, cur, opts) => `<span class="cseg" data-seg="${id}">${opts.map(([k, n]) => `<button data-v="${k}" class="${cur === k ? 'on' : ''}">${n}</button>`).join('')}</span>`;
  $('chartCtl').innerHTML = chFilterBar(`<label class="cl">Sort ${seg('gapSort', CH.gapSort, [['gap', 'Longest gap'], ['research', 'Research year'], ['recent', 'Most recent'], ['field', 'Field']])}</label>
    <label class="cl">Colour ${seg('gapColour', CH.gapColour, [['field', 'Field'], ['origin', 'Origin'], ['ai', 'AI-driven']])}</label>`);
  const rows = pool.map(it => { const c = colour(it), ad = it.adopt && it.adopt > it.p ? it.adopt : null;
    return {id:it.id, label:it.t, span:[it.r, ad || it.p], tip:`${it.t}: research ${it.r}, ${it.kind === 'proj' ? 'expected ~' : 'first product '}${it.p}${ad ? ', mainstream ' + ad : ''} (${it.lag} years)`,
      bars:[{a:it.r, b:it.p, color:c, dash:it.kind === 'proj'}].concat(ad ? [{a:it.p, b:ad, color:c, opacity:.35, thin:true}] : []), dots:[{x:it.r, color:CHC.blue, r:.55}],
      end:pool.length <= 60 ? `${it.lag} yrs` : '', endX:ad || it.p}; });
  CH.head = ['Title', 'Field', 'Origin', 'Research', 'First product', 'Gap', 'Mainstream']; CH.rows = pool.map(it => [it.t, fieldName(it.v), it.s, it.r, it.p, it.lag, it.adopt || '']);
  CH.note = `${pool.length} milestones. Blue dot: research began; solid bar: to first product (dashed: expected); faint bar: on to mainstream use. Drag across the chart to zoom into years; double-click to reset.`;
  return chRowChart(W, H, fs, rows, {endW:pool.length <= 60 ? fs * 3.5 : 0});
}
/* 2. Heatmap */
function chHeat(W, H, fs){
  const pool = chPool().filter(it => it.kind === 'hist' && !it.co), by = CH.heatBy, decs = []; for (let d = 1920; d <= Math.floor(NOW / 10) * 10; d += 10) decs.push(d);
  const fk = FKEYS.filter(k => FIELDS[k] && !FIELDS[k].custom && pool.some(it => it.v === k));
  $('chartCtl').innerHTML = chFilterBar(`<label class="cl">Decade by <span class="cseg" data-seg="heatBy"><button data-v="p" class="${by === 'p' ? 'on' : ''}">year it landed</button><button data-v="r" class="${by === 'r' ? 'on' : ''}">year research began</button></span></label>`);
  const L = Math.min(W * .24, Math.max(...fk.map(k => fieldName(k).length), 10) * fs * .52 + 14), cols = decs.length + 1, cw = (W - L - 8) / cols;
  const rowsN = fk.length + 1, ch = Math.max(fs * 2, Math.min(fs * 3.6, (H - fs * 3) / rowsN)), top = fs * 2.2;
  const col = v => { const t = Math.max(0, Math.min(1, v / 20)), l = (p, q) => Math.round(p + (q - p) * t); return `rgb(${l(76, 255)},${l(211, 107)},${l(194, 107)})`; };
  let s = `<svg class="chsvg" width="${W}" height="${Math.max(H, top + rowsN * ch + 8)}" font-size="${fs * .92}">` + decs.map((d, j) => `<text x="${L + j * cw + cw / 2}" y="${top - fs * .6}" fill="${CHC.mut}" text-anchor="middle">${d}s</text>`).join('') + `<text x="${L + decs.length * cw + cw / 2}" y="${top - fs * .6}" fill="${CHC.amber}" text-anchor="middle">All</text>`;
  const cell = (k, d, x, y, list, label) => { if (!list.length) return '';
    const m = median(list.map(it => it.lag)), sel = CH.panel && CH.panel.key === `${k}|${d}`; CH.rows.push([label, d === 'all' ? 'All' : d + 's', Math.round(m * 10) / 10, list.length]);
    return `<g class="chcell" data-cell="${k}|${d}" data-tip="${chEsc(`${label}, ${d === 'all' ? 'all decades' : d + 's'}: median ${Math.round(m * 10) / 10} years from ${list.length} milestone${list.length > 1 ? 's' : ''}`)}">
      <rect x="${x + 1.5}" y="${y + 1.5}" width="${cw - 3}" height="${ch - 3}" rx="5" fill="${col(m)}" fill-opacity="${list.length < 5 ? .38 : .95}" stroke="${sel ? '#fff' : 'none'}" stroke-width="2"/>
      <text x="${x + cw / 2}" y="${y + ch / 2 + fs * .15}" fill="#04131C" font-weight="700" text-anchor="middle" font-size="${fs}">${m < 10 ? Math.round(m * 10) / 10 : Math.round(m)}</text>
      ${ch > fs * 2.6 ? `<text x="${x + cw / 2}" y="${y + ch / 2 + fs * 1.05}" fill="#04131C" fill-opacity=".7" text-anchor="middle" font-size="${fs * .7}">${list.length}</text>` : ''}</g>`; };
  CH.head = ['Field', 'Decade', 'Median gap', 'Milestones'];
  [...fk, 'all'].forEach((k, i) => {
    const y = top + i * ch, lab = k === 'all' ? 'All fields' : fieldName(k), inF = it => k === 'all' || it.v === k;
    s += `<text x="${L - 8}" y="${y + ch / 2 + fs * .35}" fill="${k === 'all' ? CHC.amber : CHC.txt}" text-anchor="end">${chEsc(lab)}</text>`;
    decs.forEach((d, j) => { s += cell(k, d, L + j * cw, y, pool.filter(it => inF(it) && it[by] >= d && it[by] < d + 10), lab); });
    s += cell(k, 'all', L + decs.length * cw, y, pool.filter(inF), lab);
  });
  CH.note = 'Median years from research to first product (number below: milestones). Teal is fast, coral is slow; faded cells rest on fewer than 5. Select a cell for its milestones.';
  return s + '</svg>';
}
function heatPanel(key){
  const [k, d] = key.split('|'), by = CH.heatBy, list = chPool().filter(it => it.kind === 'hist' && !it.co && (k === 'all' || it.v === k) && (d === 'all' || (it[by] >= +d && it[by] < +d + 10))).sort((p, q) => p.lag - q.lag);
  const m = list.length ? median(list.map(it => it.lag)) : null;
  chPanel(`${k === 'all' ? 'All fields' : fieldName(k)}, ${d === 'all' ? 'all decades' : d + 's'}`, `<p class="csstat"><b>${m == null ? '–' : Math.round(m * 10) / 10}</b> years median, from ${list.length} milestone${list.length === 1 ? '' : 's'} (${by === 'p' ? 'by year landed' : 'by year research began'}). Fastest first.</p>` + chItemsHtml(list));
  CH.panel.key = key; renderCharts();
}
/* 3. AI against the rest */
function chAI(W, H, fs){
  const pool = chPool().filter(it => it.kind === 'hist' && !it.co && !POLICY_ARCS.has(it.t));
  $('chartCtl').innerHTML = chFilterBar(`<label class="toggle inl">Log scale <input type="checkbox" id="chAiLog"${CH.aiLog ? ' checked' : ''}></label>
    <label class="cl">Drag to <span class="cseg" data-seg="aiMode"><button data-v="zoom" class="${CH.aiMode === 'zoom' ? 'on' : ''}">zoom</button><button data-v="select" class="${CH.aiMode === 'select' ? 'on' : ''}">select</button></span></label>
    <label class="cl">Labels <span class="cseg" data-seg="aiLabels"><button data-v="auto" class="${CH.aiLabels === 'auto' ? 'on' : ''}">auto</button><button data-v="all" class="${CH.aiLabels === 'all' ? 'on' : ''}">all</button><button data-v="none" class="${CH.aiLabels === 'none' ? 'on' : ''}">none</button></span></label>`);
  const fy = v => CH.aiLog ? Math.log10(v + 1) : v, z = CH.zoom2.ai, maxG = Math.max(10, ...pool.map(it => it.lag));
  const xr = z ? z.x : [1920, NOW], yr = z ? z.y : [0, fy(maxG)], pad = fs * 3.2;
  const x = chScale(xr[0], xr[1], pad, W - 14), y = chScale(yr[0], yr[1], H - fs * 2.6, fs * 4.2);
  const vis = pool.filter(it => it.r >= xr[0] && it.r <= xr[1] && fy(it.lag) >= yr[0] && fy(it.lag) <= yr[1]);
  let s = `<svg class="chsvg chzoom2" id="chAiSvg" width="${W}" height="${H}" font-size="${fs * .85}" data-x0="${xr[0]}" data-x1="${xr[1]}" data-y0="${yr[0]}" data-y1="${yr[1]}" data-l="${pad}" data-r="${W - 14}" data-t="${fs * 4.2}" data-b="${H - fs * 2.6}">`;
  const st = chNiceStep(xr[1] - xr[0], W, fs); for (let v = Math.ceil(xr[0] / st) * st; v <= xr[1]; v += st) s += `<line x1="${x(v)}" x2="${x(v)}" y1="${fs * 4}" y2="${H - fs * 2.4}" stroke="${CHC.grid}"/><text x="${x(v)}" y="${H - fs}" fill="${CHC.mut}" text-anchor="middle">${v}</text>`;
  [0, 1, 2, 3, 5, 10, 15, 20, 30, 40, 60].filter(v => fy(v) >= yr[0] && fy(v) <= yr[1]).forEach(v => { s += `<line x1="${pad}" x2="${W - 14}" y1="${y(fy(v))}" y2="${y(fy(v))}" stroke="${CHC.grid}"/><text x="${pad - 6}" y="${y(fy(v)) + fs * .3}" fill="${CHC.mut}" text-anchor="end">${v}</text>`; });
  s += `<text x="${W - 14}" y="${fs * 1.4}" fill="${CHC.mut}" font-size="${fs * .8}" text-anchor="end">Vertical: years from research to first product</text><text x="${W - 14}" y="${H - fs * .1}" fill="${CHC.mut}" font-size="${fs * .8}" text-anchor="end">Year research began</text>`;
  const ai = pool.filter(isAIDriven), rest = pool.filter(it => !isAIDriven(it));
  const trend = list => { const pts = []; for (let d = 1920; d <= NOW; d += 10) { const g = list.filter(it => it.r >= d && it.r < d + 10); if (g.length >= 3) pts.push([x(Math.min(Math.max(d + 5, xr[0]), xr[1])), y(Math.min(Math.max(fy(median(g.map(it => it.lag))), yr[0]), yr[1]))]); } return pts.length > 1 ? 'M' + pts.map(p => p.join(',')).join('L') : ''; };
  s += `<path d="${trend(rest)}" fill="none" stroke="${CHC.mut}" stroke-width="2.5" stroke-opacity=".8"/><path d="${trend(ai)}" fill="none" stroke="${CHC.teal}" stroke-width="3"/>`;
  const boxSel = CH.box || [], rd = fs * .32;
  vis.forEach(it => { const A = isAIDriven(it), sel = CH.sel === it.id || boxSel.includes(it.id);
    s += `<circle class="chdot" data-id="${it.id}" data-tip="${chEsc(`${it.t}: ${it.r} → ${it.p}, ${it.lag} years${A ? ' (AI-driven)' : ''}`)}" cx="${x(it.r)}" cy="${y(fy(it.lag))}" r="${sel ? rd * 1.8 : A ? rd * 1.3 : rd}" fill="${A ? CHC.teal : CHC.mut}" fill-opacity="${A ? .95 : .5}" stroke="${sel ? CHC.amber : 'none'}" stroke-width="2"/>`; });
  const lab = CH.aiLabels === 'none' ? [] : CH.aiLabels === 'all' || vis.length <= 40 ? vis : vis.slice().sort((p, q) => q.lag - p.lag).slice(0, 6).concat(vis.filter(isAIDriven).sort((p, q) => p.lag - q.lag).slice(0, 6), vis.filter(it => it.id === CH.sel || boxSel.includes(it.id)));
  const used = []; [...new Set(lab)].forEach(it => { const lx = x(it.r) + rd * 2 + 2, ly = y(fy(it.lag)) + fs * .3; if (used.some(([ux, uy]) => Math.abs(ux - lx) < fs * 6 && Math.abs(uy - ly) < fs * .9)) return; used.push([lx, ly]);
    s += `<text x="${lx}" y="${ly}" fill="${isAIDriven(it) ? CHC.teal : CHC.txt}" font-size="${fs * .78}" pointer-events="none">${chEsc(chClip(it.t, 30))}</text>`; });
  const m10 = l => { const v = l.filter(it => it.r >= 2010).map(it => it.lag); return v.length ? Math.round(median(v) * 10) / 10 : '–'; };
  s += `<g font-size="${fs * .9}"><circle cx="${pad + 10}" cy="${fs * 1.1}" r="${fs * .35}" fill="${CHC.teal}"/><text x="${pad + 22}" y="${fs * 1.4}" fill="${CHC.txt}">AI-driven (${ai.length}): median since 2010, ${m10(ai)} years</text>
    <circle cx="${pad + 10}" cy="${fs * 2.5}" r="${fs * .35}" fill="${CHC.mut}"/><text x="${pad + 22}" y="${fs * 2.8}" fill="${CHC.txt}">Everything else (${rest.length}): ${m10(rest)} years</text></g>`;
  CH.head = ['Title', 'Field', 'Research', 'First product', 'Gap', 'AI-driven']; CH.rows = vis.map(it => [it.t, fieldName(it.v), it.r, it.p, it.lag, isAIDriven(it) ? 'yes' : 'no']);
  CH.note = `${vis.length} of ${pool.length} landed milestones shown (company products and policy excluded); lines are the median gap by decade of research. Drag a box to ${CH.aiMode === 'zoom' ? 'zoom in' : 'select'}; double-click to reset.`;
  return s + `<rect id="chBox" fill="rgba(247,192,74,.12)" stroke="${CHC.amber}" stroke-dasharray="4 3" display="none"/></svg>`;
}
/* 4. Clean energy pipeline */
function chPipe(W, H, fs){
  const pool = chPool().filter(it => it.dv);
  $('chartCtl').innerHTML = chFilterBar('<span class="note-s">Areas of AI for clean energy (following DESNZ’s AI energy vision). Select a bar or a flow to list its technologies.</span>');
  const ST = [['research', 'Research', '#8FA6B8'], ['pilot', 'Pilot', '#F2D38A'], ['commercial', 'First commercial use', '#5FD8FF'], ['scale', 'At scale', '#7FD6A0']];
  const gbOf = it => it.gb === 'deployed' ? 'deployed' : it.gb === 'trial' ? 'trial' : 'other', GB = [['deployed', 'Deployed in GB', '#7FD6A0'], ['trial', 'Trial in GB', '#F2D38A'], ['other', 'Planned or not yet', '#8FA6B8']];
  const A = Object.keys(VISION).map(k => [k, VISION[k], '#F7C04A']), nw = fs * 1.1, gap = fs * .9;
  const labW = Math.min(W * .26, fs * 13), cols = [labW, W / 2 - nw / 2, W - labW - nw];
  const tot = Math.max(1, pool.length), top = fs * 1.6, sc = (H - top - fs - gap * 4) / tot;
  const place = (nodes, key) => { let yy = top; return nodes.map(([k, n, c]) => { const list = pool.filter(it => key(it) === k), h = Math.max(fs * .4, list.length * sc), o = {k, n, c, y:yy, h, list, used:0, usedR:0}; yy += h + gap; return o; }); };
  const nA = place(A, it => it.dv), nS = place(ST, it => it.stage || 'research'), nG = place(GB, gbOf);
  let s = `<svg class="chsvg" width="${W}" height="${H}" font-size="${fs * .88}">` + [['Area', cols[0]], ['Readiness', cols[1]], ['GB status', cols[2]]].map(([t, cx]) => `<text x="${cx + nw / 2}" y="${fs}" fill="${CHC.mut}" text-anchor="middle" font-size="${fs * .8}">${t.toUpperCase()}</text>`).join('');
  const band = (from, to, list, x0, x1, c, label) => { if (!list.length) return; const h = list.length * sc, y0 = from.y + from.usedR, y1 = to.y + to.used; from.usedR += h; to.used += h; const mx = (x0 + x1) / 2;
    s += `<path class="chflow" data-flow="${chEsc(label)}" data-ids="${list.map(it => it.id).join(',')}" data-tip="${chEsc(label + ': ' + list.length)}" d="M${x0},${y0} C${mx},${y0} ${mx},${y1} ${x1},${y1} L${x1},${y1 + h} C${mx},${y1 + h} ${mx},${y0 + h} ${x0},${y0 + h} Z" fill="${c}" fill-opacity=".3"/>`; };
  nA.forEach(a => nS.forEach(st => band(a, st, a.list.filter(it => (it.stage || 'research') === st.k), cols[0] + nw, cols[1], st.c, `${a.n} → ${st.n}`)));
  nS.forEach(st => nG.forEach(g => band(st, g, st.list.filter(it => gbOf(it) === g.k), cols[1] + nw, cols[2], g.c, `${st.n} → ${g.n}`)));
  const wrap = (t, n) => { const w = t.split(' '), out = ['']; w.forEach(x => { if ((out[out.length - 1] + ' ' + x).trim().length > n) out.push(x); else out[out.length - 1] = (out[out.length - 1] + ' ' + x).trim(); }); return out; };
  [[nA, cols[0], 'end'], [nS, cols[1], 'mid'], [nG, cols[2], 'start']].forEach(([ns, cx, side]) => ns.forEach(n => {
    s += `<rect class="chflow" data-flow="${chEsc(n.n)}" data-ids="${n.list.map(it => it.id).join(',')}" data-tip="${chEsc(n.n + ': ' + n.list.length)}" x="${cx}" y="${n.y}" width="${nw}" height="${n.h}" rx="3" fill="${n.c}"/>`;
    const lines = wrap(`${n.n} (${n.list.length})`, side === 'mid' ? 26 : Math.floor((labW - 8) / (fs * .5))), lx = side === 'end' ? cx - 6 : cx + nw + 6, anchor = side === 'end' ? 'end' : 'start';
    lines.forEach((ln, k) => { s += `<text x="${lx}" y="${n.y + Math.min(n.h / 2, fs) + k * fs * 1.05 + fs * .3}" fill="${CHC.txt}" text-anchor="${anchor}" pointer-events="none" ${side === 'mid' ? 'paint-order="stroke" stroke="#0B1724" stroke-width="3"' : ''}>${chEsc(ln)}</text>`; });
  }));
  CH.head = ['Title', 'Area', 'Readiness', 'GB status']; CH.rows = pool.map(it => [it.t, VISION[it.dv], it.stage || '', it.gb || '']);
  CH.note = `${pool.length} technologies. Readiness and GB status are AI estimates.`;
  return s + '</svg>';
}
/* 5. Forecast drift */
function chDrift(W, H, fs){
  const pool = chPool().filter(it => it.fc && it.fc.estimatedYear != null).sort((p, q) => (p.fc.actualYear || p.fc.estimatedYear) - (q.fc.actualYear || q.fc.estimatedYear) || p.t.localeCompare(q.t));
  $('chartCtl').innerHTML = chFilterBar('');
  const revOf = it => (it.fc.revisions || []).map(r => r.year ?? r.to ?? r.estimatedYear).filter(v => v != null);
  const counts = {}; pool.forEach(it => { const y = it.fc.actualYear ?? it.fc.estimatedYear; counts[y] = (counts[y] || 0) + 1; });
  const ys = Object.keys(counts).map(Number).sort((a, b) => a - b), histH = fs * 5;
  let hist = '';
  if (ys.length) { const bw = Math.min(fs * 4, (W - 40) / ys.length - 6), mx = Math.max(...Object.values(counts));
    hist = `<svg width="${W}" height="${histH + fs * 1.8}" font-size="${fs * .8}"><text x="4" y="${fs}" fill="${CHC.mut}">Expected arrivals by year</text>` + ys.map((y, i) => { const h = counts[y] / mx * (histH - fs * 1.6), x0 = 40 + i * (bw + 6);
      return `<rect x="${x0}" y="${histH - h + fs * .3}" width="${bw}" height="${h}" rx="3" fill="${y <= NOW ? CHC.green : CHC.amber}" fill-opacity=".8"><title>${y}: ${counts[y]}</title></rect><text x="${x0 + bw / 2}" y="${histH - h - fs * .1}" fill="${CHC.txt}" text-anchor="middle">${counts[y]}</text><text x="${x0 + bw / 2}" y="${histH + fs * 1.4}" fill="${CHC.mut}" text-anchor="middle">${y}</text>`; }).join('') + '</svg>'; }
  let revised = 0, slipped = 0;
  const rows = pool.map(it => { const revs = revOf(it), first = revs.length ? (it.fc.revisions[0].from ?? revs[0]) : it.fc.estimatedYear, now = it.fc.actualYear ?? it.fc.estimatedYear;
    if (revs.length) revised++; if (now > first) slipped++; const c = now > first ? CHC.coral : now < first ? CHC.green : itemHex(it);
    return {id:it.id, label:it.t, span:[first, now, NOW], tip:`${it.t}: first estimate ${first}, now ${it.fc.actualYear ? 'landed ' + it.fc.actualYear : '~' + now}${revs.length ? `, revised ${revs.length} time${revs.length > 1 ? 's' : ''}` : ''}${it.fc.estimatedOn ? ` (estimate recorded ${it.fc.estimatedOn})` : ''}`,
      bars:first !== now ? [{a:Math.min(first, now), b:Math.max(first, now), color:c}] : [], dots:[...(first !== now ? [{x:first, color:CHC.mut, hollow:true, r:.5}] : []), {x:now, color:it.fc.actualYear ? CHC.green : c, r:.7}],
      end:`${it.stage || ''}`, endX:now}; });
  CH.head = ['Title', 'First estimate', 'Current estimate', 'Landed', 'Revisions']; CH.rows = pool.map(it => [it.t, (it.fc.revisions && it.fc.revisions[0] && it.fc.revisions[0].from) || it.fc.estimatedYear, it.fc.estimatedYear, it.fc.actualYear || '', (it.fc.revisions || []).length]);
  CH.note = `${pool.length} forecasts; ${revised} revised so far, ${slipped} slipped later. The agents record every re-estimate, so trails (hollow dot to filled) grow week by week: red means it slipped later, green earlier.`;
  return hist + chRowChart(W, Math.max(200, H - histH - fs * 2), fs, rows, {markers:[{x:NOW, label:'Today', color:CHC.amber}], endW:fs * 5});
}
/* 6. Security lag */
function chSec(W, H, fs){
  const all = chPool().filter(it => it.kind === 'hist' && it.attack).map(it => ({it, r:secResponse(it)})).filter(x => x.r);
  const sorts = {arrival:(p, q) => p.it.p - q.it.p, wait:(p, q) => (q.r.resp ? q.r.lag : NOW - q.it.p) - (p.r.resp ? p.r.lag : NOW - p.it.p), response:(p, q) => ((p.r.resp || {}).p || 9999) - ((q.r.resp || {}).p || 9999) || p.it.p - q.it.p};
  all.sort(sorts[CH.secSort] || sorts.arrival);
  $('chartCtl').innerHTML = chFilterBar(`<label class="cl">Sort <span class="cseg" data-seg="secSort"><button data-v="arrival" class="${CH.secSort === 'arrival' ? 'on' : ''}">Arrival</button><button data-v="wait" class="${CH.secSort === 'wait' ? 'on' : ''}">Longest wait</button><button data-v="response" class="${CH.secSort === 'response' ? 'on' : ''}">By response</button></span></label>`)
    + `<div class="clegend"><span><i style="background:${CHC.green}"></i>Response within 3 years</span><span><i style="background:${CHC.amber}"></i>4 to 8 years</span><span><i style="background:${CHC.coral}"></i>Over 8 years</span><span><i class="dash"></i>Response expected (forecast)</span><span><i class="ring"></i>No response yet</span></div>`;
  const lagCol = l => l <= 3 ? CHC.green : l <= 8 ? CHC.amber : CHC.coral;
  const respYears = {}; all.forEach(({r}) => { if (r.resp) respYears[r.resp.p] = respYears[r.resp.p] || r.resp.t; });
  const markers = Object.keys(respYears).map(y => ({x:+y, label:'', color:'rgba(127,214,160,.35)'}));
  const rows = all.map(({it, r}) => { const open = !r.resp, end = open ? NOW : r.resp.p, lag = open ? NOW - it.p : r.lag, c = open ? CHC.coral : lagCol(lag);
    return {id:it.id, label:it.t, span:[it.p, end], tip:open ? `${it.t} arrived ${it.p}; no security response in its category yet (${lag} years so far)` : `${it.t} arrived ${it.p}. First security response in its category: ${r.resp.t} (${r.resp.p})${r.expected ? ', expected' : ''}: a wait of ${r.lag} years.`,
      bars:[{a:it.p, b:end, color:c, dash:open || r.expected}], dots:[{x:it.p, color:itemHex(it), r:.6}, {x:end, color:c, hollow:open, r:.6}],
      end:open ? `${lag}+ yrs, none yet` : `${r.lag} yrs → ${chClip(r.resp.t, 28)}`, endColor:c, endX:end}; });
  const done = all.filter(p => p.r.resp && !p.r.expected);
  CH.head = ['Technology', 'Arrived', 'First response', 'Response year', 'Wait (years)', 'Expected']; CH.rows = all.map(({it, r}) => [it.t, it.p, r.resp ? r.resp.t : '(none yet)', r.resp ? r.resp.p : '', r.resp ? r.lag : '', r.expected ? 'yes' : '']);
  CH.note = `Each row: a technology that expands the attack surface, from when it arrived to the first security response built for its category. ${all.length} technologies; median wait ${done.length ? Math.round(median(done.map(p => p.r.lag)) * 10) / 10 : '–'} years; ${all.filter(p => !p.r.resp).length} still open. AI research, not security advice.`;
  return chRowChart(W, H - fs * 1.5, fs, rows, {markers, endW:fs * 17, top:fs * .4});
}
/* 7. Race to a fortune */
function fortPool(){
  const q = CH.q.toLowerCase();
  return FORTUNES.filter(p => p.f && p.w && (!F.fields || F.fields.has(p.v)) && (!CH.field || p.v === CH.field) && (!CH.origin || (CH.origin === 'research' ? !!p.ac : !p.ac)) && (!q || `${p.co} ${p.n || ''} ${p.how || ''}`.toLowerCase().includes(q)));
}
function chFort(W, H, fs){
  const all = fortPool(), yr = CH.fortYear ?? NOW, fs2 = all.filter(p => p.w <= yr), z = CH.zoom2.fort;
  $('chartCtl').innerHTML = chFilterBar(`<button class="mini" id="chFortPlay">${CH.fortTimer ? 'Pause' : '▶ Play through time'}</button> <b style="color:${CHC.gold}">${yr}</b>`, {searchLabel:'Search companies or founders', originAll:'All founders', origins:[['research', 'Research founders (university or lab)'], ['other', 'Other founders']]});
  const maxY = Math.max(20, ...all.map(p => p.w - p.f)), xr = z ? z.x : [Math.floor((Math.min(NOW - 10, ...all.map(p => p.f)) - 3) / 5) * 5, NOW + 2], yrg = z ? z.y : [0, maxY + 2], pad = fs * 3.2;
  const x = chScale(xr[0], xr[1], pad, W - 14), y = chScale(yrg[0], yrg[1], H - fs * 2.6, fs * 1.2), rad = p => fs * .35 + Math.sqrt(Math.max(0, p.nw || 0)) * fs * .16;
  let s = `<svg class="chsvg chzoom2" id="chFortSvg" width="${W}" height="${H}" font-size="${fs * .85}" data-x0="${xr[0]}" data-x1="${xr[1]}" data-y0="${yrg[0]}" data-y1="${yrg[1]}" data-l="${pad}" data-r="${W - 14}" data-t="${fs * 1.2}" data-b="${H - fs * 2.6}">`;
  const st = chNiceStep(xr[1] - xr[0], W, fs); for (let v = Math.ceil(xr[0] / st) * st; v <= xr[1]; v += st) s += `<line x1="${x(v)}" x2="${x(v)}" y1="${fs}" y2="${H - fs * 2.4}" stroke="${CHC.grid}"/><text x="${x(v)}" y="${H - fs}" fill="${CHC.mut}" text-anchor="middle">${v}</text>`;
  const ys = chNiceStep(yrg[1] - yrg[0], H, fs); for (let v = Math.ceil(yrg[0] / ys) * ys; v <= yrg[1]; v += ys) s += `<line x1="${pad}" x2="${W - 14}" y1="${y(v)}" y2="${y(v)}" stroke="${CHC.grid}"/><text x="${pad - 6}" y="${y(v) + fs * .3}" fill="${CHC.mut}" text-anchor="end">${v}</text>`;
  s += `<text x="${pad + 4}" y="${fs * .9}" fill="${CHC.mut}" font-size="${fs * .8}">Years from founding to fortune (bubble size: net worth; gold ring: research founder)</text><text x="${W - 14}" y="${H - fs * .1}" fill="${CHC.mut}" font-size="${fs * .8}" text-anchor="end">Year founded</text>`;
  const vis = fs2.filter(p => p.f >= xr[0] && p.f <= xr[1] && p.w - p.f >= yrg[0] && p.w - p.f <= yrg[1]).sort((p, q) => (q.nw || 0) - (p.nw || 0));
  vis.forEach(p => { const sel = CH.selF === p.fid; s += `<circle class="chbub" data-fid="${p.fid}" cx="${x(p.f)}" cy="${y(p.w - p.f)}" r="${rad(p)}" fill="${FIELDS[p.v] ? itemHex({v:p.v}) : CHC.violet}" fill-opacity=".55" stroke="${sel ? '#fff' : p.ac ? CHC.gold : 'rgba(255,255,255,.35)'}" stroke-width="${sel ? 3 : p.ac ? 2.5 : 1}" data-tip="${chEsc(`${p.co}: founded ${p.f}, fortune ${p.w} (${p.w - p.f} years)${p.nw ? `, about $${p.nw}bn` : ''}`)}"/>`; });
  const labs = vis.length <= 30 ? vis : vis.filter(p => p.nw).slice(0, 10), used = [];
  labs.forEach(p => { const lx = x(p.f) + rad(p) + 3, ly = y(p.w - p.f) + fs * .3; if (used.some(([ux, uy]) => Math.abs(ux - lx) < fs * 5 && Math.abs(uy - ly) < fs * .9)) return; used.push([lx, ly]); s += `<text x="${lx}" y="${ly}" fill="${CHC.txt}" font-size="${fs * .8}" pointer-events="none">${chEsc(chClip(p.co, 24))}</text>`; });
  CH.head = ['Company', 'Founders', 'Field', 'Founded', 'Fortune year', 'Years', 'Net worth ($bn)', 'Research origin', 'How']; CH.rows = all.map(p => [p.co, p.n || '', fieldName(p.v), p.f, p.w, p.w - p.f, p.nw || '', p.ac || '', p.how || '']);
  CH.note = `${vis.length} of ${all.length} fortunes shown, by ${yr}. Select a bubble for the story; drag a box to zoom, double-click to reset. Follows the field filters.`;
  return s + '<rect id="chBox" fill="rgba(247,192,74,.12)" stroke="#F7C04A" stroke-dasharray="4 3" display="none"/></svg>';
}
function fortPanel(fid){
  const p = FORTUNES.find(f => f.fid === fid); if (!p) return; CH.selF = fid;
  chPanel(p.co, `<p class="csstat"><b>${p.w - p.f}</b> years from founding (${p.f}) to fortune (${p.w})</p>
    <dl class="csdl"><dt>Founders</dt><dd>${chEsc(p.n || '–')}</dd><dt>Field</dt><dd>${chEsc(fieldName(p.v))}</dd><dt>How</dt><dd>${chEsc(p.how || '–')}</dd>
    <dt>Net worth</dt><dd>${p.nw ? `About $${p.nw}bn${p.nwWho ? ' (' + chEsc(p.nwWho) + ')' : ''}${p.nwBasis ? `<br><span class="note-s">${chEsc(p.nwBasis)}</span>` : ''}` : 'Not recorded'}</dd>
    <dt>Research origin</dt><dd>${p.ac === 'uni' ? 'Began in a university' : p.ac === 'lab' ? 'Began in a research lab' : 'Not from a university or lab'}</dd>${p.prize ? `<dt>Prize</dt><dd>${chEsc(p.prize)}</dd>` : ''}<dt>Confidence</dt><dd>${chEsc(p.c || '–')}</dd></dl>`);
  renderCharts();
}
/* 8. What if? Practical AI levers, applied to each projected technology by what it is and where it stands */
const AI_LEVERS = [
  {k:'discovery', n:'AI-accelerated discovery and design', phase:'rd', r:[.15, .3, .5], test:it => ['materials', 'life', 'quantum', 'hw'].includes(it.v) || ['storage', 'semiconductors', 'hydrogen', 'solar', 'medicine', 'genetics'].some(t => (it.tags || []).includes(t)) || ['energy-mat', 'ai-bio', 'polymers', 'chips', 'fab', 'science'].includes(it.sub),
   what:'Searching candidate materials, molecules and chip designs in software before the lab.', basis:'For example, AI-predicted crystal structures and protein structures have shortened candidate searches from years to months.'},
  {k:'simulation', n:'Simulation and digital twins', phase:'demo', r:[.1, .25, .4], test:it => ['energy', 'space', 'robotics', 'hw', 'comms'].includes(it.v) || ['grid', 'wind', 'nuclear', 'robots', 'space'].some(t => (it.tags || []).includes(t)),
   what:'Testing designs, control systems and network changes on digital twins, so fewer physical trials are needed.', basis:'Physical demonstrations remain necessary; twins reduce how many and how long.'},
  {k:'software', n:'AI-assisted software and automation', phase:'build', r:[.2, .35, .55], test:it => ['sw', 'ai', 'cyber', 'comms'].includes(it.v) || ['ai-models', 'cryptography', 'networks'].some(t => (it.tags || []).includes(t)),
   what:'Writing, testing and migrating software with AI coding assistants and agents.', basis:'Most effective where the product is largely software; integration and assurance still take time.'},
  {k:'approvals', n:'Faster evidence for approvals and consents', phase:'approvals', r:[.05, .15, .3], test:it => ['regulation', 'nuclear', 'medicine', 'grid'].some(t => (it.tags || []).includes(t)) || ['energy', 'life'].includes(it.v),
   what:'Drafting and checking safety cases, consent documents and technical evidence, and triaging consultation responses.', basis:'Decisions stay with people and regulators; AI shortens preparation and review, not the statutory steps.'},
  {k:'deploy', n:'Planning, connection and operations', phase:'deploy', r:[.05, .15, .25], test:it => it.v === 'energy' || !!it.dv || ['grid', 'storage', 'wind', 'solar', 'heat'].some(t => (it.tags || []).includes(t)),
   what:'Speeding grid connection studies, network planning, site selection and predictive maintenance during roll-out.', basis:'Supply chains, construction and grid capacity remain physical limits.'}
];
const AI_PHASES = {research:{rd:.45, demo:.25, build:.0, approvals:.15, deploy:.15}, pilot:{rd:.1, demo:.35, build:.0, approvals:.25, deploy:.3}, commercial:{rd:0, demo:.1, build:0, approvals:.3, deploy:.6}, scale:{rd:0, demo:.05, build:0, approvals:.25, deploy:.7}};
const PHASE_NAMES = {rd:'Research and development', demo:'Demonstration and testing', build:'Building the product', approvals:'Approvals and consents', deploy:'Deployment and roll-out'};
function aiPlan(it){
  const base = Object.assign({}, AI_PHASES[it.stage] || AI_PHASES.research), sw = ['sw', 'ai', 'cyber'].includes(it.v) || (it.tags || []).includes('ai-models');
  if (sw) { base.build = base.rd + base.demo * .6; base.rd = 0; base.demo *= .4; }   // software: mostly building, not lab research
  if (['nuclear', 'medicine'].some(t => (it.tags || []).includes(t))) base.approvals *= 2;   // approval-heavy technologies
  const tot = Object.values(base).reduce((a, b) => a + b, 0) || 1; Object.keys(base).forEach(k => { base[k] /= tot; });
  const si = {low:0, mid:1, high:2}[CH.wiScen] ?? 1, remaining = Math.max(0, it.p - NOW);
  const phases = Object.keys(base).filter(k => base[k] > 0).map(k => {
    const lev = AI_LEVERS.filter(l => !CH.wiOff[l.k] && (l.phase === k || (k === 'build' && l.k === 'software')) && l.test(it)).sort((a, b) => b.r[si] - a.r[si])[0];
    const cut = lev ? lev.r[si] : 0; return {k, share:base[k], lever:lev, cut, saved:remaining * base[k] * cut};
  });
  const saved = phases.reduce((a, p) => a + p.saved, 0);
  return {remaining, saved, year:remaining ? Math.round((it.p - saved) * 10) / 10 : it.p, phases, levers:[...new Set(phases.filter(p => p.lever).map(p => p.lever))]};
}
function chWhatIf(W, H, fs){
  const pool = chPool().filter(it => it.kind === 'proj' && it.p > NOW).sort((a, b) => a.p - b.p || a.t.localeCompare(b.t));
  const scen = [['low', 'Conservative'], ['mid', 'Central'], ['high', 'Ambitious']];
  $('chartCtl').innerHTML = chFilterBar(`<label class="cl">Scenario <span class="cseg" data-seg="wiScen">${scen.map(([k, n]) => `<button data-v="${k}" class="${CH.wiScen === k ? 'on' : ''}">${n}</button>`).join('')}</span></label>`)
    + `<div class="clevers">${AI_LEVERS.map(l => `<label class="toggle inl" title="${chEsc(l.what)}">${l.n} <input type="checkbox" data-lever="${l.k}"${CH.wiOff[l.k] ? '' : ' checked'}></label>`).join('')} <b style="color:${CHC.amber}">Illustrative scenario, not a forecast.</b></div>`;
  const plans = new Map(pool.map(it => [it.id, aiPlan(it)]));
  const by = y => [pool.filter(it => it.p <= y).length, pool.filter(it => plans.get(it.id).year <= y).length];
  const [b30, s30] = by(2030), [b35, s35] = by(2035), totalSaved = pool.reduce((a, it) => a + plans.get(it.id).saved, 0);
  const head = `<div class="cwisum"><span>By 2030: <b>${b30}</b> expected now → <b class="t">${s30}</b> with AI levers</span><span>By 2035: <b>${b35}</b> → <b class="t">${s35}</b></span><span>Average time saved: <b class="t">${pool.length ? Math.round(totalSaved / pool.length * 10) / 10 : 0} years</b></span><span class="note-s">Select a row to see which levers apply, and how.</span></div>`;
  const levColour = {discovery:CHC.violet, simulation:CHC.blue, software:CHC.teal, approvals:CHC.gold, deploy:CHC.green};
  const rows = pool.map(it => { const pl = plans.get(it.id), c = pl.levers.length ? levColour[pl.levers[0].k] : CHC.mut;
    return {id:it.id, label:it.t, span:[pl.year, it.p, NOW], tip:`${it.t}: expected ~${it.p}; with AI levers ~${Math.round(pl.year)} (saves ${Math.round(pl.saved * 10) / 10} years). Levers: ${pl.levers.map(l => l.n).join(', ') || 'none apply'}`,
      bars:[{a:pl.year, b:it.p, color:c, opacity:.55}], dots:[{x:it.p, color:CHC.mut, hollow:true, r:.55}, {x:pl.year, color:c, r:.7}],
      end:pl.saved >= .05 ? `−${Math.round(pl.saved * 10) / 10} yrs · ${pl.levers.map(l => l.n.split(' ')[0]).join(', ')}` : 'no lever applies', endColor:c, endX:it.p}; });
  CH.head = ['Title', 'Expected', 'With AI levers', 'Years saved', 'Levers']; CH.rows = pool.map(it => { const pl = plans.get(it.id); return [it.t, it.p, Math.round(pl.year), Math.round(pl.saved * 10) / 10, pl.levers.map(l => l.n).join('; ')]; });
  CH.note = `${pool.length} projected technologies. Hollow dot: today's AI estimate; filled: with the selected AI levers (colour shows the main lever). Assumptions are illustrative: lever savings apply only to the phase each lever helps.`;
  return `<div class="cwihead">${head}</div>` + chRowChart(W, H - fs * 2.6, fs, rows, {markers:[{x:2030, label:'2030', color:CHC.amber}], endW:fs * 17});
}
function wiPanel(it){
  const pl = aiPlan(it), si = {low:'conservative', mid:'central', high:'ambitious'}[CH.wiScen];
  chPanel(it.t, `<p class="csstat">Expected <b>~${it.p}</b>; with AI levers (${si}) <b class="t">~${Math.round(pl.year)}</b>, saving about <b class="t">${Math.round(pl.saved * 10) / 10} years</b> of the ${pl.remaining} remaining.</p>
    <table class="cstab"><tr><th>Phase</th><th>Share of the time left</th><th>AI lever</th><th>Saved</th></tr>${pl.phases.map(p => `<tr><td>${PHASE_NAMES[p.k]}</td><td>${Math.round(p.share * 100)}%</td><td>${p.lever ? `${chEsc(p.lever.n)} (−${Math.round(p.cut * 100)}%)` : '<span class="note-s">none</span>'}</td><td>${p.saved >= .05 ? Math.round(p.saved * 10) / 10 + ' yrs' : '–'}</td></tr>`).join('')}</table>
    ${pl.levers.map(l => `<div class="cslever"><b>${chEsc(l.n)}</b><p>${chEsc(l.what)}</p><p class="note-s">${chEsc(l.basis)}</p></div>`).join('') || '<p class="note-s">None of the levers apply to this technology as described.</p>'}
    <p class="note-s">How this works: the time left is split into phases according to the technology's readiness (${chEsc(it.stage || 'research')}), and each lever shortens only the phase it helps, by an assumed range. These are illustrative assumptions, not researched estimates for this project.</p>`);
  CH.sel = it.id; renderCharts();
}
/* ---------- interaction ---------- */
const chTip = $('chartTip');
$('chartBody').addEventListener('mousemove', e => { const t = e.target.closest('[data-tip]'); if (!t) { chTip.classList.remove('on'); return; } chTip.textContent = t.dataset.tip; chTip.classList.add('on'); chTip.style.left = Math.min(innerWidth - 320, e.clientX + 14) + 'px'; chTip.style.top = (e.clientY + 14) + 'px'; });
$('chartBody').addEventListener('mouseleave', () => chTip.classList.remove('on'));
$('chartBody').addEventListener('click', e => {
  const tab = e.target.closest('#chartTabs [data-t]'); if (tab) { CH.tab = tab.dataset.t; CH.box = null; clearInterval(CH.fortTimer); CH.fortTimer = 0; renderCharts(); return; }
  if (e.target.id === 'chSideX') { CH.panel = null; CH.selF = null; renderCharts(); return; }
  if (e.target.id === 'chZoomReset') { delete CH.zoom[CH.tab]; delete CH.zoom2[CH.tab]; renderCharts(); return; }
  const sb = e.target.closest('[data-seg] button'); if (sb) { CH[sb.parentElement.dataset.seg] = sb.dataset.v; CH.box = null; renderCharts(); return; }
  const cell = e.target.closest('[data-cell]'); if (cell) { heatPanel(cell.dataset.cell); return; }
  const fl = e.target.closest('[data-flow]'); if (fl) { const list = fl.dataset.ids ? fl.dataset.ids.split(',').map(chFind).filter(Boolean) : []; chPanel(fl.dataset.flow, `<p class="csstat"><b>${list.length}</b> technolog${list.length === 1 ? 'y' : 'ies'}</p>` + chItemsHtml(list, it => `${it.stage || ''}${it.p ? ' · ~' + it.p : ''}`)); renderCharts(); return; }
  const bub = e.target.closest('[data-fid]'); if (bub) { fortPanel(bub.dataset.fid); return; }
  if (e.target.id === 'chFortPlay') { if (CH.fortTimer) { clearInterval(CH.fortTimer); CH.fortTimer = 0; renderCharts(); return; } CH.fortYear = 1890; CH.fortTimer = setInterval(() => { CH.fortYear += 2; if (CH.fortYear >= NOW) { CH.fortYear = NOW; clearInterval(CH.fortTimer); CH.fortTimer = 0; } renderCharts(); }, 160); return; }
  const r = e.target.closest('[data-id]'); if (r) { const it = chFind(r.dataset.id); if (CH.tab === 'whatif' && r.closest('svg')) { wiPanel(it); openDetail(it); return; } chartSelect(it); }
});
$('chartBody').addEventListener('change', e => {
  if (e.target.id === 'chField') { CH.field = e.target.value; delete CH.zoom[CH.tab]; renderCharts(); }
  if (e.target.id === 'chOrigin') { CH.origin = e.target.value; delete CH.zoom[CH.tab]; renderCharts(); }
  if (e.target.id === 'chAiLog') { CH.aiLog = e.target.checked; delete CH.zoom2.ai; renderCharts(); }
  if (e.target.dataset.lever) { CH.wiOff[e.target.dataset.lever] = !e.target.checked; renderCharts(); }
});
$('chartBody').addEventListener('input', e => { if (e.target.id === 'chQ') { CH.q = e.target.value; CH.qFocus = true; delete CH.zoom[CH.tab]; clearTimeout(chartTimer); chartTimer = setTimeout(() => { renderCharts(); CH.qFocus = false; }, 250); } });
$('w-charts').addEventListener('click', e => { if (e.target.closest('.wh')) setTimeout(renderCharts, 60); });   // A− and A+ change the text size: redraw to match
/* drag: zoom years (row charts), zoom a box (scatter, fortunes) or select (scatter) */
let chDrag = null;
$('chartSvg').addEventListener('pointerdown', e => { const svg = e.target.closest('.chzoomx, .chzoom2'); if (!svg || e.button) return; const b = svg.getBoundingClientRect(); chDrag = {svg, b, x0:e.clientX - b.left, y0:e.clientY - b.top}; });
addEventListener('pointermove', e => { if (!chDrag) return; const r = chDrag.svg.querySelector('#chBox'); if (!r) return; const x1 = e.clientX - chDrag.b.left, y1 = e.clientY - chDrag.b.top;
  r.setAttribute('display', ''); r.setAttribute('x', Math.min(chDrag.x0, x1)); r.setAttribute('y', Math.min(chDrag.y0, y1)); r.setAttribute('width', Math.abs(x1 - chDrag.x0)); r.setAttribute('height', Math.abs(y1 - chDrag.y0)); });
addEventListener('pointerup', e => {
  if (!chDrag) return; const d = chDrag, ds = d.svg.dataset; chDrag = null; const x1 = e.clientX - d.b.left, y1 = e.clientY - d.b.top; if (Math.abs(x1 - d.x0) < 12) { const r = d.svg.querySelector('#chBox'); if (r) r.setAttribute('display', 'none'); return; }
  const sx = chScale(+ds.x0, +ds.x1, +ds.l, +ds.r), xs = [sx.inv(Math.min(d.x0, x1)), sx.inv(Math.max(d.x0, x1))];
  if (d.svg.classList.contains('chzoomx')) { if (xs[1] - xs[0] >= 2) { CH.zoom[CH.tab] = [Math.floor(xs[0]), Math.ceil(xs[1])]; renderCharts(); } return; }
  const sy = chScale(+ds.y0, +ds.y1, +ds.b, +ds.t), ys = [sy.inv(Math.max(d.y0, y1)), sy.inv(Math.min(d.y0, y1))];
  if (CH.tab === 'ai' && CH.aiMode === 'select') {
    CH.box = [...d.svg.querySelectorAll('.chdot')].filter(c => { const cx = +c.getAttribute('cx'), cy = +c.getAttribute('cy'); return cx >= Math.min(d.x0, x1) && cx <= Math.max(d.x0, x1) && cy >= Math.min(d.y0, y1) && cy <= Math.max(d.y0, y1); }).map(c => c.dataset.id);
    const list = CH.box.map(chFind).filter(Boolean).sort((p, q) => p.lag - q.lag); chPanel(`Selected: ${list.length}`, chItemsHtml(list)); renderCharts(); return;
  }
  if (Math.abs(y1 - d.y0) >= 12) { CH.zoom2[CH.tab] = {x:xs, y:ys}; renderCharts(); }
});
$('chartSvg').addEventListener('dblclick', () => { delete CH.zoom[CH.tab]; delete CH.zoom2[CH.tab]; CH.box = null; renderCharts(); });
/* ---------- exports ---------- */
$('chartCsv').onclick = () => {
  const cell = v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  saveBlob(new Blob(['\ufeff' + [CH.head].concat(CH.rows).map(r => r.map(cell).join(',')).join('\r\n')], {type:'text/csv;charset=utf-8'}), `shrinking-gap-${CH.tab}-${stamp()}.csv`);
};
$('chartPng').onclick = () => {
  const svgs = [...$('chartSvg').querySelectorAll('svg')]; if (!svgs.length) return;
  const svg = svgs[svgs.length - 1], w = +svg.getAttribute('width'), h = +svg.getAttribute('height'), title = (CHART_TABS.find(t => t[0] === CH.tab) || [])[1], pad = 70;
  let xml = new XMLSerializer().serializeToString(svg);
  if (!/^<svg[^>]*xmlns=/.test(xml)) xml = xml.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  xml = xml.replace('<svg', '<svg font-family="Arial, sans-serif"');
  const img = new Image(); img.onerror = () => toast('Could not create the chart image.');
  img.onload = () => {
    const c = document.createElement('canvas'), k = 2; c.width = w * k; c.height = (h + pad + 40) * k; const x = c.getContext('2d'); x.scale(k, k);
    x.fillStyle = CHC.bg; x.fillRect(0, 0, w, h + pad + 40); x.fillStyle = '#E9F2FF'; x.font = '22px Georgia, serif'; x.fillText(`The Shrinking Gap: ${title}`, 12, 32);
    x.fillStyle = CHC.mut; x.font = '12px Arial'; x.fillText(selectionText() + (CH.field ? ' · ' + fieldName(CH.field) : '') + (CH.q ? ` · “${CH.q}”` : ''), 12, 52); x.drawImage(img, 0, pad);
    x.fillText(`Stuart Okin, personal project. Data revision ${DB.meta.revision}; AI-maintained data from public sources only, no human review; may contain errors.`, 12, h + pad + 26);
    c.toBlob(b => saveBlob(b, `shrinking-gap-${CH.tab}-${stamp()}.png`), 'image/png');
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
};
/* keep the charts current: redraw when the width or text size changes, and when the filters change (refresh calls scheduleCharts) */
if (window.ResizeObserver) new ResizeObserver(() => { const w = $('chartSvg').clientWidth, f = chFs(); if (w && (w !== CH.lastW || f !== CH.lastFs)) { CH.lastW = w; CH.lastFs = f; scheduleCharts(); } }).observe($('chartBody'));
