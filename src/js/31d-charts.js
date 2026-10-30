/* ==================================================================
 *  CHARTS: eight interactive views that make the data readable. They follow the filters,
 *  and selecting a milestone opens its story and moves the 3D camera to its arc.
 * ================================================================== */
const CHART_TABS = [['gaps', 'Gap explorer'], ['heat', 'Heatmap'], ['ai', 'AI vs the rest'], ['pipe', 'Clean energy pipeline'], ['drift', 'Forecast drift'], ['sec', 'Security lag'], ['fort', 'Race to a fortune'], ['whatif', 'What if?']];
const CH = {tab:'gaps', sel:null, rows:[], head:[], gapSort:'gap', zoom:null, heatBy:'p', aiLog:true, whatif:30, whatifAI:false, fortYear:null, fortTimer:0, note:''};
const CHC = {bg:'#0B1724', grid:'#1d3346', txt:'#C9D7E6', mut:'#8FA6B8', amber:'#F7C04A', teal:'#4CD3C2', coral:'#FF6B6B', green:'#7FD6A0', gold:'#FFD166', violet:'#A891FF'};
const chPool = () => items.filter(it => !it.removed && !it.aud && shownFully(it));
const chEsc = s => esc(String(s == null ? '' : s));
const chFind = id => items.find(it => it.id == id);
function chScale(d0, d1, r0, r1){ const f = v => r0 + (v - d0) / ((d1 - d0) || 1) * (r1 - r0); f.inv = p => d0 + (p - r0) / ((r1 - r0) || 1) * (d1 - d0); return f; }
function chAxisX(x, y0, y1, a, b, step){ let s = ''; for (let v = Math.ceil(a / step) * step; v <= b; v += step) s += `<line x1="${x(v)}" x2="${x(v)}" y1="${y0}" y2="${y1}" stroke="${CHC.grid}"/><text x="${x(v)}" y="${y0 - 6}" fill="${CHC.mut}" font-size="11" text-anchor="middle">${v}</text>`; return s; }
function chartSelect(it){ if (!it) return; CH.sel = it.id; openDetail(it); setOpen('details', true); renderCharts(); }
function chartList(title, list){
  $('chartList').innerHTML = list.length ? `<b>${chEsc(title)}</b> <span class="note-s">(${list.length}; select one to see its story)</span><div class="clrows">` + list.slice(0, 60).map(it => `<button data-id="${it.id}"><i style="background:${itemHex(it)}"></i>${chEsc(it.t)} <em>${it.r}${it.p ? ' → ' + (it.kind === 'proj' ? '~' : '') + it.p : ''}</em></button>`).join('') + '</div>' : '';
}
/* ---------- the window ---------- */
function renderCharts(){
  if (!layout.charts || !layout.charts.open) return;
  const box = $('chartSvg'), W = Math.max(320, box.clientWidth - 4);
  $('chartTabs').innerHTML = CHART_TABS.map(([k, n]) => `<button data-t="${k}" class="${CH.tab === k ? 'on' : ''}">${n}</button>`).join('');
  $('chartList').innerHTML = ''; CH.note = ''; CH.rows = []; CH.head = [];
  const svg = ({gaps:chGaps, heat:chHeat, ai:chAI, pipe:chPipe, drift:chDrift, sec:chSec, fort:chFort, whatif:chWhatIf}[CH.tab] || chGaps)(W);
  box.innerHTML = svg; $('chartNote').textContent = CH.note;
}
let chartTimer = 0; function scheduleCharts(){ clearTimeout(chartTimer); chartTimer = setTimeout(renderCharts, 120); }

/* 1. Gap explorer: one bar per milestone, research → first product → mainstream use */
function chGaps(W){
  const pool = chPool().filter(it => it.kind === 'hist' || it.kind === 'proj');
  const sorts = {gap:(a, b) => b.lag - a.lag, research:(a, b) => a.r - b.r, field:(a, b) => a.v.localeCompare(b.v) || a.r - b.r, recent:(a, b) => b.p - a.p};
  pool.sort(sorts[CH.gapSort] || sorts.gap);
  const [a, b] = CH.zoom || [1920, NOW + 12], L = Math.min(230, W * .34), x = chScale(a, b, L + 8, W - 12), rh = 15, H = pool.length * rh + 40;
  $('chartCtl').innerHTML = `Sort: <select id="chGapSort">${[['gap', 'Longest gap'], ['research', 'Research year'], ['recent', 'Most recent'], ['field', 'Field']].map(([k, n]) => `<option value="${k}"${CH.gapSort === k ? ' selected' : ''}>${n}</option>`).join('')}</select>
    Years: ${[['all', 'All'], ['1920-1970', '1920–1970'], ['1970-2000', '1970–2000'], ['2000-' + (NOW + 12), 'Since 2000']].map(([k, n]) => `<button class="mini" data-zoom="${k}">${n}</button>`).join(' ')} <span class="note-s">Drag across the chart to zoom; double-click to reset.</span>`;
  let s = `<svg class="chsvg" id="chGapSvg" width="${W}" height="${H}" data-x0="${a}" data-x1="${b}" data-l="${L + 8}" data-r="${W - 12}">` + chAxisX(x, 26, H, a, b, b - a > 60 ? 10 : 5);
  pool.forEach((it, i) => {
    const y = 34 + i * rh, c = itemHex(it), sel = CH.sel === it.id, x1 = x(Math.max(a, it.r)), x2 = x(Math.min(b, it.p)), ad = it.adopt && it.adopt <= NOW + 12 ? x(Math.min(b, it.adopt)) : null;
    if (it.p < a || it.r > b) return;
    s += `<g class="chrow" data-id="${it.id}" data-tip="${chEsc(`${it.t}: research ${it.r}, ${it.kind === 'proj' ? 'expected ~' : 'first product '}${it.p}${it.adopt ? ', mainstream ' + it.adopt : ''} (${it.lag} years)`)}">
      <rect x="0" y="${y - 6}" width="${W}" height="${rh}" fill="${sel ? 'rgba(247,192,74,.14)' : 'transparent'}"/>
      <text x="${L}" y="${y + 4}" fill="${sel ? CHC.amber : CHC.txt}" font-size="11" text-anchor="end">${chEsc(it.t.length > 34 ? it.t.slice(0, 33) + '…' : it.t)}</text>
      ${ad ? `<line x1="${x2}" x2="${ad}" y1="${y}" y2="${y}" stroke="${c}" stroke-opacity=".35" stroke-width="3"/>` : ''}
      <line x1="${x1}" x2="${x2}" y1="${y}" y2="${y}" stroke="${c}" stroke-width="5" stroke-linecap="round"${it.kind === 'proj' ? ' stroke-dasharray="4 3"' : ''}/>
      <circle cx="${x1}" cy="${y}" r="3" fill="#5FD8FF"/></g>`;
  });
  CH.head = ['Title', 'Field', 'Research', 'First product', 'Gap', 'Mainstream']; CH.rows = pool.map(it => [it.t, fieldName(it.v), it.r, it.p, it.lag, it.adopt || '']);
  CH.note = `${pool.length} milestones. Blue dot: research began; solid bar: to first product (dashed: expected); faint bar: to mainstream use.`;
  return s + '</svg>';
}
/* 2. Heatmap: fields by decade, coloured by the median gap */
function chHeat(W){
  const pool = chPool().filter(it => it.kind === 'hist' && !it.co), by = CH.heatBy, decs = []; for (let d = 1920; d <= Math.floor(NOW / 10) * 10; d += 10) decs.push(d);
  const fk = FKEYS.filter(k => FIELDS[k] && !FIELDS[k].custom && pool.some(it => it.v === k));
  $('chartCtl').innerHTML = `Decade by: <button class="mini${by === 'p' ? ' on' : ''}" data-heat="p">year it landed</button> <button class="mini${by === 'r' ? ' on' : ''}" data-heat="r">year research began</button>`;
  const L = Math.min(170, W * .3), cw = (W - L - 10) / decs.length, ch = 30, H = fk.length * ch + 50;
  const col = v => { const t = Math.max(0, Math.min(1, v / 20)); const lerp = (p, q) => Math.round(p + (q - p) * t); return `rgb(${lerp(76, 255)},${lerp(211, 107)},${lerp(194, 107)})`; };
  let s = `<svg class="chsvg" width="${W}" height="${H}">` + decs.map((d, j) => `<text x="${L + j * cw + cw / 2}" y="18" fill="${CHC.mut}" font-size="11" text-anchor="middle">${d}s</text>`).join('');
  CH.head = ['Field', 'Decade', 'Median gap', 'Milestones']; CH.rows = [];
  fk.forEach((k, i) => {
    const y = 28 + i * ch; s += `<text x="${L - 8}" y="${y + ch / 2 + 4}" fill="${CHC.txt}" font-size="12" text-anchor="end">${chEsc(fieldName(k))}</text>`;
    decs.forEach((d, j) => {
      const cell = pool.filter(it => it.v === k && it[by] >= d && it[by] < d + 10); if (!cell.length) return;
      const m = median(cell.map(it => it.lag)); CH.rows.push([fieldName(k), d + 's', Math.round(m * 10) / 10, cell.length]);
      s += `<g class="chcell" data-cell="${k}|${d}" data-tip="${chEsc(`${fieldName(k)}, ${d}s: median ${Math.round(m * 10) / 10} years from ${cell.length} milestone${cell.length > 1 ? 's' : ''}`)}">
        <rect x="${L + j * cw + 1}" y="${y + 1}" width="${cw - 2}" height="${ch - 2}" rx="4" fill="${col(m)}" fill-opacity="${cell.length < 5 ? .35 : .95}"/>
        <text x="${L + j * cw + cw / 2}" y="${y + ch / 2 + 4}" fill="#04131C" font-size="11" font-weight="700" text-anchor="middle">${m < 10 ? Math.round(m * 10) / 10 : Math.round(m)}</text></g>`;
    });
  });
  CH.note = 'Median years from research to first product. Teal is fast, coral is slow; faded cells rest on fewer than 5 milestones. Select a cell for its milestones.';
  return s + '</svg>';
}
/* 3. AI against the rest: every milestone, research year against gap */
function chAI(W){
  const pool = chPool().filter(it => it.kind === 'hist' && !it.co && !POLICY_ARCS.has(it.t)), H = Math.max(320, Math.min(520, W * .62));
  $('chartCtl').innerHTML = `<label class="toggle inl">Log scale <input type="checkbox" id="chAiLog"${CH.aiLog ? ' checked' : ''}></label> <span class="note-s">Drag a box to select milestones.</span>`;
  const maxG = Math.max(10, ...pool.map(it => it.lag)), fy = v => CH.aiLog ? Math.log10(v + 1) : v;
  const x = chScale(1920, NOW, 46, W - 14), y = chScale(0, fy(maxG), H - 30, 16);
  let s = `<svg class="chsvg" id="chAiSvg" width="${W}" height="${H}">` + chAxisX(x, H - 12, 16, 1920, NOW, 10).replace(/y="4"/g, '');
  [0, 1, 2, 5, 10, 20, 40, 60].filter(v => v <= maxG).forEach(v => { s += `<line x1="46" x2="${W - 14}" y1="${y(fy(v))}" y2="${y(fy(v))}" stroke="${CHC.grid}"/><text x="40" y="${y(fy(v)) + 4}" fill="${CHC.mut}" font-size="11" text-anchor="end">${v}</text>`; });
  const trend = list => { const pts = []; for (let d = 1920; d <= NOW; d += 10) { const g = list.filter(it => it.r >= d && it.r < d + 10); if (g.length >= 3) pts.push([x(d + 5), y(fy(median(g.map(it => it.lag))))]); } return pts.length > 1 ? 'M' + pts.map(p => p.join(',')).join('L') : ''; };
  const ai = pool.filter(isAIDriven), rest = pool.filter(it => !isAIDriven(it));
  pool.forEach(it => { const A = isAIDriven(it), sel = CH.sel === it.id || (CH.box || []).includes(it.id);
    s += `<circle class="chdot" data-id="${it.id}" data-tip="${chEsc(`${it.t}: ${it.r} → ${it.p}, ${it.lag} years${A ? ' (AI-driven)' : ''}`)}" cx="${x(it.r)}" cy="${y(fy(it.lag))}" r="${sel ? 6 : A ? 4.5 : 3.5}" fill="${A ? CHC.teal : CHC.mut}" fill-opacity="${A ? .95 : .45}" stroke="${sel ? CHC.amber : 'none'}" stroke-width="2"/>`; });
  s += `<path d="${trend(rest)}" fill="none" stroke="${CHC.mut}" stroke-width="2.5"/><path d="${trend(ai)}" fill="none" stroke="${CHC.teal}" stroke-width="3"/>`;
  pool.slice().sort((p, q) => q.lag - p.lag).slice(0, 5).forEach(it => { s += `<text x="${x(it.r) + 7}" y="${y(fy(it.lag)) + 4}" fill="${CHC.txt}" font-size="10">${chEsc(it.t.slice(0, 28))}</text>`; });
  const m10 = l => { const v = l.filter(it => it.r >= 2010).map(it => it.lag); return v.length ? Math.round(median(v) * 10) / 10 : '–'; };
  s += `<g font-size="12"><circle cx="60" cy="24" r="5" fill="${CHC.teal}"/><text x="70" y="28" fill="${CHC.txt}">AI-driven (${ai.length}): median since 2010, ${m10(ai)} years</text><circle cx="60" cy="44" r="5" fill="${CHC.mut}"/><text x="70" y="48" fill="${CHC.txt}">Everything else (${rest.length}): ${m10(rest)} years</text></g>`;
  CH.head = ['Title', 'Field', 'Research', 'First product', 'Gap', 'AI-driven']; CH.rows = pool.map(it => [it.t, fieldName(it.v), it.r, it.p, it.lag, isAIDriven(it) ? 'yes' : 'no']);
  CH.note = 'Each dot is a landed milestone (company products and policy excluded); lines are the median gap by decade of research.';
  if (CH.box && CH.box.length) chartList('Selected', CH.box.map(chFind).filter(Boolean));
  return s + `<rect id="chBox" fill="rgba(247,192,74,.12)" stroke="${CHC.amber}" stroke-dasharray="4 3" display="none"/></svg>`;
}
/* 4. Clean energy pipeline: area → readiness → GB status */
function chPipe(W){
  const pool = chPool().filter(it => it.dv), H = 380, cols = [16, W / 2 - 60, W - 150], nw = 12;
  $('chartCtl').innerHTML = '<span class="note-s">Technologies linked to the five areas of AI for clean energy (following DESNZ’s AI energy vision). Select a flow to list them.</span>';
  const ST = [['research', 'Research', '#8FA6B8'], ['pilot', 'Pilot', '#F2D38A'], ['commercial', 'First commercial use', '#5FD8FF'], ['scale', 'At scale', '#7FD6A0']];
  const gbOf = it => it.gb === 'deployed' ? 'deployed' : it.gb === 'trial' ? 'trial' : 'other', GB = [['deployed', 'Deployed in GB', '#7FD6A0'], ['trial', 'Trial in GB', '#F2D38A'], ['other', 'Planned or not yet', '#8FA6B8']];
  const A = Object.keys(VISION).map(k => [k, VISION[k], '#F7C04A']), tot = Math.max(1, pool.length), sc = (H - 40 - 4 * 10) / tot;
  const place = (nodes, key) => { let yy = 20; return nodes.map(([k, n, c]) => { const list = pool.filter(it => key(it) === k), h = Math.max(2, list.length * sc), o = {k, n, c, y:yy, h, list, used:0, usedR:0}; yy += h + 10; return o; }); };
  const nA = place(A, it => it.dv), nS = place(ST, it => it.stage || 'research'), nG = place(GB, gbOf);
  let s = `<svg class="chsvg" width="${W}" height="${H}">`;
  const band = (from, to, list, x0, x1, c, label) => { if (!list.length) return; const h = list.length * sc, y0 = from.y + from.usedR, y1 = to.y + to.used; from.usedR += h; to.used += h;
    const mx = (x0 + x1) / 2; s += `<path class="chflow" data-flow="${chEsc(label)}" data-ids="${list.map(it => it.id).join(',')}" data-tip="${chEsc(label + ': ' + list.length)}" d="M${x0},${y0} C${mx},${y0} ${mx},${y1} ${x1},${y1} L${x1},${y1 + h} C${mx},${y1 + h} ${mx},${y0 + h} ${x0},${y0 + h} Z" fill="${c}" fill-opacity=".28"/>`; };
  nA.forEach(a => nS.forEach(st => band(a, st, a.list.filter(it => (it.stage || 'research') === st.k), cols[0] + nw, cols[1], st.c, `${a.n} → ${st.n}`)));
  nS.forEach(st => nG.forEach(g => band(st, g, st.list.filter(it => gbOf(it) === g.k), cols[1] + nw, cols[2], g.c, `${st.n} → ${g.n}`)));
  [[nA, cols[0], 'start'], [nS, cols[1], 'start'], [nG, cols[2], 'start']].forEach(([ns, cx]) => ns.forEach(n => { s += `<rect x="${cx}" y="${n.y}" width="${nw}" height="${n.h}" rx="3" fill="${n.c}"/><text x="${cx + nw + 6}" y="${n.y + Math.min(n.h, 26) / 2 + 4}" fill="${CHC.txt}" font-size="11">${chEsc(n.n.length > 30 ? n.n.slice(0, 29) + '…' : n.n)} (${n.list.length})</text>`; }));
  CH.head = ['Title', 'Area', 'Readiness', 'GB status']; CH.rows = pool.map(it => [it.t, VISION[it.dv], it.stage || '', it.gb || '']);
  CH.note = `${pool.length} technologies. Readiness and GB status are AI estimates.`;
  return s + '</svg>';
}
/* 5. Forecast drift: each forecast's revision trail */
function chDrift(W){
  const pool = chPool().filter(it => it.fc && it.fc.estimatedYear != null).sort((a, b) => (a.fc.actualYear || a.fc.estimatedYear) - (b.fc.actualYear || b.fc.estimatedYear));
  $('chartCtl').innerHTML = '<span class="note-s">Every forecast is recorded when made. Each re-estimate adds a step to its trail, so slips show up over time.</span>';
  const yrs = pool.flatMap(it => [it.fc.estimatedYear, it.fc.actualYear, ...(it.fc.revisions || []).map(r => r.year ?? r.to ?? r.estimatedYear)]).filter(v => v != null);
  const a = Math.min(NOW, ...yrs) - 1, b = Math.max(NOW + 5, ...yrs) + 1, L = Math.min(230, W * .36), x = chScale(a, b, L + 8, W - 14), rh = 16, H = pool.length * rh + 44;
  let s = `<svg class="chsvg" width="${W}" height="${H}">` + chAxisX(x, 26, H, a, b, 2) + `<line x1="${x(NOW)}" x2="${x(NOW)}" y1="26" y2="${H}" stroke="${CHC.amber}" stroke-dasharray="3 3"/>`;
  let revised = 0, slipped = 0;
  pool.forEach((it, i) => {
    const y = 36 + i * rh, revs = (it.fc.revisions || []).map(r => r.year ?? r.to ?? r.estimatedYear).filter(v => v != null), first = revs.length ? (it.fc.revisions[0].from ?? revs[0]) : it.fc.estimatedYear, now = it.fc.actualYear ?? it.fc.estimatedYear;
    if (revs.length) revised++; if (now > first) slipped++;
    const pts = [first, ...revs].filter((v, k, arr) => k === 0 || v !== arr[k - 1]), c = now > first ? CHC.coral : now < first ? CHC.green : CHC.amber;
    s += `<g class="chrow" data-id="${it.id}" data-tip="${chEsc(`${it.t}: first estimate ${first}, now ${it.fc.actualYear ? 'landed ' + it.fc.actualYear : '~' + now}${revs.length ? `, revised ${revs.length} time${revs.length > 1 ? 's' : ''}` : ''}`)}">
      <rect x="0" y="${y - 7}" width="${W}" height="${rh}" fill="${CH.sel === it.id ? 'rgba(247,192,74,.14)' : 'transparent'}"/>
      <text x="${L}" y="${y + 4}" fill="${CHC.txt}" font-size="11" text-anchor="end">${chEsc(it.t.length > 34 ? it.t.slice(0, 33) + '…' : it.t)}</text>
      ${pts.length > 1 ? `<polyline points="${pts.map(v => x(v) + ',' + y).join(' ')}" fill="none" stroke="${c}" stroke-width="2"/>` : ''}
      ${pts.slice(0, -1).map(v => `<circle cx="${x(v)}" cy="${y}" r="3" fill="none" stroke="${CHC.mut}"/>`).join('')}
      <circle cx="${x(now)}" cy="${y}" r="5" fill="${it.fc.actualYear ? CHC.green : c}"/></g>`;
  });
  CH.head = ['Title', 'First estimate', 'Current estimate', 'Landed', 'Revisions']; CH.rows = pool.map(it => [it.t, (it.fc.revisions && it.fc.revisions[0] && it.fc.revisions[0].from) || it.fc.estimatedYear, it.fc.estimatedYear, it.fc.actualYear || '', (it.fc.revisions || []).length]);
  CH.note = `${pool.length} forecasts; ${revised} revised so far, ${slipped} slipped later. Trails grow as the agents re-estimate each week.`;
  return s + '</svg>';
}
/* 6. Security lag: arrival against the first security response */
function chSec(W){
  const pool = chPool().filter(it => it.kind === 'hist' && it.attack).map(it => ({it, r:secResponse(it)})).filter(x => x.r).sort((p, q) => p.it.p - q.it.p);
  $('chartCtl').innerHTML = '<span class="note-s">Each technology that expands the attack surface, from arrival to the first security response in its category. Red: still open.</span>';
  const a = Math.min(...pool.map(x => x.it.p), 1960) - 2, b = NOW + 2, L = Math.min(230, W * .36), x = chScale(a, b, L + 8, W - 14), rh = 16, H = pool.length * rh + 44;
  let s = `<svg class="chsvg" width="${W}" height="${H}">` + chAxisX(x, 26, H, a, b, 5);
  pool.forEach(({it, r}, i) => {
    const y = 36 + i * rh, open = !r.resp, end = open ? NOW : r.resp.p, c = open ? CHC.coral : r.expected ? CHC.amber : CHC.green;
    s += `<g class="chrow" data-id="${it.id}" data-tip="${chEsc(open ? `${it.t} (${it.p}): no security response yet` : `${it.t} (${it.p}) → ${r.resp.t} (${r.resp.p}), ${r.lag} years${r.expected ? ', expected' : ''}`)}">
      <rect x="0" y="${y - 7}" width="${W}" height="${rh}" fill="${CH.sel === it.id ? 'rgba(247,192,74,.14)' : 'transparent'}"/>
      <text x="${L}" y="${y + 4}" fill="${CHC.txt}" font-size="11" text-anchor="end">${chEsc(it.t.length > 34 ? it.t.slice(0, 33) + '…' : it.t)}</text>
      <line x1="${x(it.p)}" x2="${x(end)}" y1="${y}" y2="${y}" stroke="${c}" stroke-width="3"${open || r.expected ? ' stroke-dasharray="4 3"' : ''}/>
      <circle cx="${x(it.p)}" cy="${y}" r="4" fill="${itemHex(it)}"/><circle cx="${x(end)}" cy="${y}" r="4.5" fill="${open ? 'none' : c}" stroke="${c}" stroke-width="2"/></g>`;
  });
  const done = pool.filter(p => p.r.resp && !p.r.expected);
  CH.head = ['Technology', 'Arrived', 'First response', 'Response year', 'Years']; CH.rows = pool.map(({it, r}) => [it.t, it.p, r.resp ? r.resp.t : '(none yet)', r.resp ? r.resp.p : '', r.resp ? r.lag : '']);
  CH.note = `${pool.length} technologies; median wait ${done.length ? Math.round(median(done.map(p => p.r.lag)) * 10) / 10 : '–'} years; ${pool.filter(p => !p.r.resp).length} still open. AI research, not security advice.`;
  return s + '</svg>';
}
/* 7. Race to a fortune: founding year against years to a fortune, sized by net worth */
function chFort(W){
  const all = FORTUNES.filter(x => x.f && x.w), yr = CH.fortYear ?? NOW, fs = all.filter(p => p.w <= yr), H = Math.max(320, Math.min(500, W * .6));
  $('chartCtl').innerHTML = `<button class="mini" id="chFortPlay">${CH.fortTimer ? 'Pause' : 'Play through time'}</button> <b style="color:${CHC.gold}">${yr}</b> <span class="note-s">Gold rings: founders whose research began in a university or lab.</span>`;
  const x = chScale(1890, NOW + 2, 44, W - 16), maxY = Math.max(20, ...all.map(p => p.w - p.f)), y = chScale(0, maxY, H - 28, 16), rad = p => 4 + Math.sqrt(Math.max(0, p.nw || 0)) * 1.6;
  let s = `<svg class="chsvg" width="${W}" height="${H}">` + chAxisX(x, H - 10, 16, 1890, NOW, 10);
  [0, 5, 10, 20, 30, 40, 60].filter(v => v <= maxY).forEach(v => { s += `<line x1="44" x2="${W - 16}" y1="${y(v)}" y2="${y(v)}" stroke="${CHC.grid}"/><text x="38" y="${y(v) + 4}" fill="${CHC.mut}" font-size="11" text-anchor="end">${v}</text>`; });
  fs.slice().sort((p, q) => (q.nw || 0) - (p.nw || 0)).forEach(p => { s += `<circle cx="${x(p.f)}" cy="${y(p.w - p.f)}" r="${rad(p)}" fill="${FIELDS[p.v] ? FIELDS[p.v].hex || CHC.violet : CHC.violet}" fill-opacity=".55" stroke="${p.ac ? CHC.gold : 'rgba(255,255,255,.35)'}" stroke-width="${p.ac ? 2.5 : 1}" data-tip="${chEsc(`${p.co}${p.n ? ' (' + p.n + ')' : ''}: founded ${p.f}, fortune ${p.w} (${p.w - p.f} years)${p.nw ? `, about $${p.nw}bn` : ''}`)}"/>`; });
  fs.filter(p => p.nw).sort((p, q) => q.nw - p.nw).slice(0, 6).forEach(p => { s += `<text x="${x(p.f) + rad(p) + 3}" y="${y(p.w - p.f) + 4}" fill="${CHC.txt}" font-size="10">${chEsc(p.co.slice(0, 26))}</text>`; });
  CH.head = ['Company', 'Founders', 'Founded', 'Fortune year', 'Years', 'Net worth ($bn)', 'Research origin']; CH.rows = all.map(p => [p.co, p.n || '', p.f, p.w, p.w - p.f, p.nw || '', p.ac || '']);
  CH.note = `${fs.length} fortunes by ${yr}; vertical axis is years from founding to fortune.`;
  return s + '</svg>';
}
/* 8. What if? A scenario: AI cuts the remaining time to arrival for projected technologies */
function chWhatIf(W){
  const pct = CH.whatif, pool = chPool().filter(it => it.kind === 'proj' && (!CH.whatifAI || isAIDriven(it))).sort((a, b) => a.p - b.p);
  $('chartCtl').innerHTML = `AI cuts the remaining time by <b id="chWiV" style="color:${CHC.teal}">${pct}%</b> <input type="range" id="chWi" min="0" max="80" step="5" value="${pct}" style="width:160px;vertical-align:middle"> <label class="toggle inl">AI-assisted work only <input type="checkbox" id="chWiAI"${CH.whatifAI ? ' checked' : ''}></label> <b style="color:${CHC.amber}">Scenario, not a forecast.</b>`;
  const shift = it => it.p <= NOW ? it.p : Math.round((NOW + (it.p - NOW) * (1 - pct / 100)) * 10) / 10;
  const a = NOW, b = Math.max(NOW + 6, ...pool.map(it => it.p)) + 1, L = Math.min(230, W * .36), x = chScale(a, b, L + 8, W - 14), rh = 16, H = pool.length * rh + 74;
  const by = y => [pool.filter(it => it.p <= y).length, pool.filter(it => shift(it) <= y).length];
  const [b30, s30] = by(2030), [b35, s35] = by(2035);
  let s = `<svg class="chsvg" width="${W}" height="${H}"><text x="12" y="20" fill="${CHC.txt}" font-size="13">By 2030: <tspan fill="${CHC.mut}">${b30} expected now</tspan> → <tspan fill="${CHC.teal}" font-weight="700">${s30} in this scenario</tspan>.  By 2035: ${b35} → <tspan fill="${CHC.teal}" font-weight="700">${s35}</tspan>.</text>` + chAxisX(x, 54, H, a, b, 2);
  pool.forEach((it, i) => { const y = 64 + i * rh, n = shift(it);
    s += `<g class="chrow" data-id="${it.id}" data-tip="${chEsc(`${it.t}: expected ~${it.p}; in this scenario ~${Math.round(n)}`)}"><rect x="0" y="${y - 7}" width="${W}" height="${rh}" fill="${CH.sel === it.id ? 'rgba(247,192,74,.14)' : 'transparent'}"/>
      <text x="${L}" y="${y + 4}" fill="${CHC.txt}" font-size="11" text-anchor="end">${chEsc(it.t.length > 34 ? it.t.slice(0, 33) + '…' : it.t)}</text>
      <line x1="${x(n)}" x2="${x(it.p)}" y1="${y}" y2="${y}" stroke="${CHC.teal}" stroke-opacity=".5" stroke-width="2"/><circle cx="${x(it.p)}" cy="${y}" r="4" fill="none" stroke="${CHC.mut}" stroke-width="1.5"/><circle cx="${x(n)}" cy="${y}" r="4.5" fill="${CHC.teal}"/></g>`; });
  CH.head = ['Title', 'Expected', `Scenario (${pct}% faster)`]; CH.rows = pool.map(it => [it.t, it.p, Math.round(shift(it))]);
  CH.note = `${pool.length} projected technologies. Hollow dot: today's AI estimate; filled: the scenario. An illustration only.`;
  return s + '</svg>';
}
/* ---------- interaction ---------- */
const chTip = $('chartTip');
$('chartBody').addEventListener('mousemove', e => { const t = e.target.closest('[data-tip]'); if (!t) { chTip.classList.remove('on'); return; } chTip.textContent = t.dataset.tip; chTip.classList.add('on'); chTip.style.left = Math.min(innerWidth - 300, e.clientX + 14) + 'px'; chTip.style.top = (e.clientY + 14) + 'px'; });
$('chartBody').addEventListener('mouseleave', () => chTip.classList.remove('on'));
$('chartBody').addEventListener('click', e => {
  const tab = e.target.closest('[data-t]'); if (tab) { CH.tab = tab.dataset.t; CH.box = null; clearInterval(CH.fortTimer); CH.fortTimer = 0; renderCharts(); return; }
  const z = e.target.closest('[data-zoom]'); if (z) { CH.zoom = z.dataset.zoom === 'all' ? null : z.dataset.zoom.split('-').map(Number); renderCharts(); return; }
  const hb = e.target.closest('[data-heat]'); if (hb) { CH.heatBy = hb.dataset.heat; renderCharts(); return; }
  const cell = e.target.closest('[data-cell]'); if (cell) { const [k, d] = cell.dataset.cell.split('|'); chartList(`${fieldName(k)}, ${d}s`, chPool().filter(it => it.kind === 'hist' && !it.co && it.v === k && it[CH.heatBy] >= +d && it[CH.heatBy] < +d + 10)); return; }
  const fl = e.target.closest('[data-flow]'); if (fl) { chartList(fl.dataset.flow, fl.dataset.ids.split(',').map(chFind).filter(Boolean)); return; }
  if (e.target.id === 'chFortPlay') { if (CH.fortTimer) { clearInterval(CH.fortTimer); CH.fortTimer = 0; renderCharts(); return; } CH.fortYear = 1890; CH.fortTimer = setInterval(() => { CH.fortYear += 2; if (CH.fortYear >= NOW) { CH.fortYear = NOW; clearInterval(CH.fortTimer); CH.fortTimer = 0; } renderCharts(); }, 160); return; }
  const r = e.target.closest('[data-id]'); if (r) chartSelect(chFind(r.dataset.id));
});
$('chartBody').addEventListener('change', e => {
  if (e.target.id === 'chGapSort') { CH.gapSort = e.target.value; renderCharts(); }
  if (e.target.id === 'chAiLog') { CH.aiLog = e.target.checked; renderCharts(); }
  if (e.target.id === 'chWiAI') { CH.whatifAI = e.target.checked; renderCharts(); }
});
$('chartBody').addEventListener('input', e => { if (e.target.id === 'chWi') { CH.whatif = +e.target.value; clearTimeout(chartTimer); chartTimer = setTimeout(renderCharts, 60); } });
/* drag to zoom (gap explorer) or to box-select (AI against the rest) */
let chDrag = null;
$('chartSvg').addEventListener('pointerdown', e => { const svg = e.target.closest('#chGapSvg, #chAiSvg'); if (!svg || e.button) return; const b = svg.getBoundingClientRect(); chDrag = {svg, b, x0:e.clientX - b.left, y0:e.clientY - b.top}; });
addEventListener('pointermove', e => { if (!chDrag || chDrag.svg.id !== 'chAiSvg') return; const r = chDrag.svg.querySelector('#chBox'), x1 = e.clientX - chDrag.b.left, y1 = e.clientY - chDrag.b.top;
  r.setAttribute('display', ''); r.setAttribute('x', Math.min(chDrag.x0, x1)); r.setAttribute('y', Math.min(chDrag.y0, y1)); r.setAttribute('width', Math.abs(x1 - chDrag.x0)); r.setAttribute('height', Math.abs(y1 - chDrag.y0)); });
addEventListener('pointerup', e => {
  if (!chDrag) return; const d = chDrag; chDrag = null; const x1 = e.clientX - d.b.left, y1 = e.clientY - d.b.top; if (Math.abs(x1 - d.x0) < 12) return;
  if (d.svg.id === 'chGapSvg') { const s = chScale(+d.svg.dataset.x0, +d.svg.dataset.x1, +d.svg.dataset.l, +d.svg.dataset.r); const v = [s.inv(Math.min(d.x0, x1)), s.inv(Math.max(d.x0, x1))].map(Math.round); if (v[1] - v[0] >= 4) { CH.zoom = v; renderCharts(); } return; }
  const lo = [Math.min(d.x0, x1), Math.min(d.y0, y1)], hi = [Math.max(d.x0, x1), Math.max(d.y0, y1)];
  CH.box = [...d.svg.querySelectorAll('.chdot')].filter(c => { const cx = +c.getAttribute('cx'), cy = +c.getAttribute('cy'); return cx >= lo[0] && cx <= hi[0] && cy >= lo[1] && cy <= hi[1]; }).map(c => c.dataset.id);
  renderCharts();
});
$('chartSvg').addEventListener('dblclick', () => { if (CH.tab === 'gaps') { CH.zoom = null; renderCharts(); } else if (CH.tab === 'ai') { CH.box = null; renderCharts(); } });
/* ---------- exports ---------- */
$('chartCsv').onclick = () => {
  const cell = v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  saveBlob(new Blob(['\ufeff' + [CH.head].concat(CH.rows).map(r => r.map(cell).join(',')).join('\r\n')], {type:'text/csv;charset=utf-8'}), `shrinking-gap-${CH.tab}-${stamp()}.csv`);
};
$('chartPng').onclick = () => {
  const svg = $('chartSvg').querySelector('svg'); if (!svg) return;
  const w = +svg.getAttribute('width'), h = +svg.getAttribute('height'), title = (CHART_TABS.find(t => t[0] === CH.tab) || [])[1], pad = 70;
  let xml = new XMLSerializer().serializeToString(svg);
  if (!/^<svg[^>]*xmlns=/.test(xml)) xml = xml.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');   // add the namespace only if missing
  xml = xml.replace('<svg', '<svg font-family="Arial, sans-serif"');
  const img = new Image();
  img.onerror = () => toast('Could not create the chart image.');
  img.onload = () => {
    const c = document.createElement('canvas'), k = 2; c.width = w * k; c.height = (h + pad + 40) * k; const x = c.getContext('2d'); x.scale(k, k);
    x.fillStyle = CHC.bg; x.fillRect(0, 0, w, h + pad + 40); x.fillStyle = '#E9F2FF'; x.font = '22px Georgia, serif'; x.fillText(`The Shrinking Gap: ${title}`, 12, 32);
    x.fillStyle = CHC.mut; x.font = '12px Arial'; x.fillText(selectionText(), 12, 52); x.drawImage(img, 0, pad);
    x.fillText(`Stuart Okin, personal project. Data revision ${DB.meta.revision}; AI-maintained data from public sources only, no human review; may contain errors.`, 12, h + pad + 26);
    c.toBlob(b => saveBlob(b, `shrinking-gap-${CH.tab}-${stamp()}.png`), 'image/png');
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
};
/* keep the charts current: when the window opens or resizes, and when the filters change */
if (window.ResizeObserver) new ResizeObserver(() => { const w = $('chartSvg').clientWidth; if (w && w !== CH.lastW) { CH.lastW = w; scheduleCharts(); } }).observe($('chartSvg'));   // redraw only when the width changes, so an open list stays
