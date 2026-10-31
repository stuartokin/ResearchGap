/* ==================================================================
 *  SHAREABLE LINKS (the current filters and key display settings in the web address)
 * ================================================================== */
function linkState(){
  const p = new URLSearchParams(), off = o => Object.keys(o).filter(k => !o[k]);
  if (F.fields.size !== FKEYS.filter(k => !FIELDS[k].custom).length) p.set('f', [...F.fields].filter(k => FIELDS[k] && !FIELDS[k].custom).join(','));
  [['s', F.src], ['k', F.kinds], ['c', F.conf], ['t', F.cats], ['g', F.regions], ['v', F.ver]].forEach(([k, o]) => { const x = off(o); if (x.length) p.set(k + 'x', x.join(',')); });
  const tg = Object.keys(F.tags).filter(k => F.tags[k]); if (tg.length) p.set('tags', tg.join(','));
  const so = Object.keys(F.subOff || {}).filter(k => F.subOff[k]); if (so.length) p.set('subx', so.join(',')); if (view.subLanes === false) p.set('subl', '0');
  if (view.statsRows && view.statsRows !== 'src') p.set('rows', view.statsRows);
  if (F.from !== Y0) p.set('from', F.from); if (F.to !== YEND) p.set('to', F.to); if (F.q) p.set('q', F.q);
  if (F.majorOnly) p.set('major', '1'); if (F.vision) p.set('desnz', '1'); if (F.uniOnly) p.set('uni', '1');
  if (view.playFrom) p.set('pf', view.playFrom); if (view.playTo) p.set('pt', view.playTo);
  if (view.lanes !== 'v') p.set('lanes', view.lanes); if (view.colour !== 'v') p.set('col', view.colour);
  if (view.gapMetric && view.gapMetric !== 'first') p.set('m', view.gapMetric);
  if (view.palette === 'cb') p.set('pal', 'cb');
  if (selected && selected.uid) p.set('sel', selected.uid);
  return location.origin + location.pathname + (p.toString() ? '#' + p.toString() : '');
}
function applyLinkState(hash){
  const p = new URLSearchParams(hash.replace(/^#/, '')); if (![...p.keys()].length) return false;
  const list = k => (p.get(k) || '').split(',').filter(Boolean);
  if (p.has('f')) F.fields = new Set(list('f').filter(k => FIELDS[k]));
  [['s', 'src'], ['k', 'kinds'], ['c', 'conf'], ['t', 'cats'], ['g', 'regions'], ['v', 'ver']].forEach(([k, name]) => { list(k + 'x').forEach(x => { if (x in F[name]) F[name][x] = false; }); });
  list('tags').forEach(t => { if (t in TAGS) F.tags[t] = true; });
  F.subOff = {}; list('subx').forEach(k => { F.subOff[k] = true; }); if (p.get('subl') === '0') view.subLanes = false; if (p.has('rows')) view.statsRows = p.get('rows');
  if (p.has('from')) F.from = +p.get('from'); if (p.has('to')) F.to = +p.get('to'); if (p.has('q')) F.q = p.get('q');
  F.majorOnly = p.get('major') === '1'; F.vision = p.get('desnz') === '1'; F.uniOnly = p.get('uni') === '1';
  if (p.has('pf')) view.playFrom = +p.get('pf'); if (p.has('pt')) view.playTo = +p.get('pt');
  if (p.has('lanes')) view.lanes = p.get('lanes'); if (p.has('col')) view.colour = p.get('col'); if (p.has('m')) view.gapMetric = p.get('m');
  if (p.get('pal') === 'cb') view.palette = 'cb';
  syncDisplayUI(); syncPlayRangeUI(); if (view.palette === 'cb') applyPalette(); $('q').value = F.q; refresh();
  const sel = p.get('sel'); if (sel) { const it = items.find(x => x.uid === sel); if (it) openDetail(it); }
  return true;
}
let toastTimer = 0;
function toast(msg){ const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 2600); }
function copyLink(){
  const url = linkState();
  const done = () => toast('Link to this view copied. Paste it anywhere to share.');
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(url).then(done, () => prompt('Copy this link:', url));
  else prompt('Copy this link:', url);
}
$('copyLinkBtn').onclick = copyLink;

window.__pal = 'standard';
function renderStats(limitYear){
  const live = state.playing && view.statsLive !== false;
  const yr = live ? (limitYear != null ? limitYear : Math.floor(Math.min(state.cursor, YEND))) : 9999;
  const M = METRICS[view.gapMetric] || METRICS.first, byLand = view.statsBy !== 'began';
  const key = it => byLand ? M.landKey(it) : it.r;
  const surv = !byLand && view.gapMetric === 'first' && view.survival !== false;
  const cols = [['Pre-1970', 0, 1970], ['1970–99', 1970, 2000], ['2000–19', 2000, 2020], [byLand ? `2020–${String(NOW).slice(2)}` : '2020+', 2020, 3000]];
  const base = items.filter(it => shownFully(it) && !it.aud);
  const pool = base.filter(it => M.value(it) != null && key(it) <= yr);
  const running = surv ? base.filter(it => (it.kind === 'proj' || it.kind === 'flight') && it.r <= Math.min(yr, NOW)) : [];
  const smallN = view.markSmall !== false ? (view.smallN || 5) : 0;
  const cell = (set, run) => {
    const vals = set.map(M.value), n = vals.length;
    if (!n && !(run && run.length)) return '<td class="none">–</td>';
    let main;
    if (surv && run && run.length) { const km = kmMedian(vals, run.map(it => Math.max(.5, Math.min(yr, NOW) - it.r))); main = !km ? '–' : km.m != null ? Math.round(km.m) : `>${Math.round(km.gt)}`; }
    else main = n ? Math.round(median(vals)) : '–';
    const rng = view.statsRange !== false && n >= 4 ? `, ${Math.round(quantile(vals, .25))}–${Math.round(quantile(vals, .75))}` : '';
    const small = n < smallN;
    return `<td class="${small ? 'small' : ''}" title="${n} milestones${run && run.length ? `, ${run.length} still in progress` : ''}${small ? '. Small sample: treat with caution' : ''}">${main}<small>${n}${surv && run && run.length ? '+' + run.length : ''}${rng}</small></td>`;
  };
  const sf = singleField();
  const rowsBy = view.statsRows === 'field' ? (sf && FIELDS[sf] && FIELDS[sf].subs.length
      ? FIELDS[sf].subs.filter(x => !(F.subOff && F.subOff[x.id]) && base.some(it => it.sub === x.id)).map(x => [x.id, x.name, SUBCOL[x.id] ? '#' + SUBCOL[x.id].getHexString() : FIELDS[sf].hex, it => it.sub === x.id])
      : FKEYS.filter(k => F.fields.has(k) && FIELDS[k]).map(k => [k, FIELDS[k].name, FIELDS[k].hex, it => it.v === k]))
    : view.statsRows === 'region' ? Object.keys(REGIONS).filter(k => F.regions[k] !== false && base.some(it => it.region === k)).map(k => [k, REGIONS[k], '#8FA6B8', it => it.region === k])
    : Object.keys(SRC).filter(k => F.src[k]).map(k => [k, SRC[k].name, SRC[k].hex, it => it.s === k]);
  const inCol = (c, test) => [pool.filter(it => test(it) && key(it) >= c[1] && key(it) < c[2]), surv ? running.filter(it => test(it) && it.r >= c[1] && it.r < c[2]) : null];
  let html = '<tr><th></th>' + cols.map(c => `<th>${c[0]}</th>`).join('') + '</tr>';
  rowsBy.forEach(([k, name, hex, test]) => { html += `<tr><td><i style="background:${hex}"></i>${name}</td>` + cols.map(c => cell(...inCol(c, test))).join('') + '</tr>'; });
  html += '<tr class="all"><td>All</td>' + cols.map(c => cell(...inCol(c, () => true))).join('') + '</tr>';
  $('stats').innerHTML = html;
  document.querySelectorAll('#statsBySeg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === (byLand ? 'landed' : 'began')));
  document.querySelectorAll('#statsRowsSeg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === (view.statsRows || 'src')));
  $('statsMetricS').value = view.gapMetric || 'first'; $('statsLiveT').checked = view.statsLive !== false;
  $('statsRangeT').checked = view.statsRange !== false; $('statsSmallT').checked = view.markSmall !== false; $('statsSurvT').checked = view.survival !== false;
  $('statsSurvT').closest('label').classList.toggle('dim', !(view.statsBy === 'began' && (view.gapMetric || 'first') === 'first'));
  const notes = [byLand ? `Grouped by the year each milestone ${view.gapMetric === 'first' ? 'reached its first product or use' : 'reached mainstream adoption'}.` : 'Grouped by the year research began.'];
  notes.push('Big number: median years. Small: number of milestones' + (view.statsRange !== false ? ', then the typical range (middle half)' : '') + '.');
  if (surv) notes.push('Research still in progress is counted as "at least this long so far", so recent columns are not biased towards quick successes. “>” means more than half are still in progress.');
  else if (!byLand && view.gapMetric === 'first') notes.push('Recent research only counts once it has landed, so the last column is biased towards short gaps. Switch on the correction below to account for this.');
  if (view.gapMetric !== 'first') notes.push(`Adoption years are AI estimates for ${base.filter(it => it.adopt).length} milestones so far; the data agents add more each week.`);
  if (smallN) notes.push(`Greyed cells rest on fewer than ${smallN} milestones.`);
  notes.push('Only ideas that succeeded are in the data, which flatters every era equally.');
  $('statsNote').textContent = notes.join(' ');
  $('statsHead').textContent = `${M.label}: median years${live ? `, up to ${yr}` : ''}`;
  const g = (a, b) => pool.filter(it => key(it) >= a && key(it) < b).map(M.value);
  const parts = [[g(0, 1970), 'before 1970'], [g(2000, 2020), 'in 2000–19'], [g(2020, 3000), 'since 2020']].filter(x => x[0].length).map(x => `${Math.round(median(x[0]))} years ${x[1]}`);
  $('insight').textContent = !pool.length ? (live ? 'Nothing in this selection has landed yet.' : 'No milestones match the current filters for this measure.') : `${fieldPhrase()}, ${M.label.toLowerCase()}: ${parts.join(', ')}.`;
  const n = items.filter(shownFully).length;
  $('count').textContent = live ? `${pool.length} counted so far of ${n} milestones in this selection.` : `${n} of ${items.filter(i => !i.removed).length} milestones shown` + (hidden.size ? `, ${hidden.size} hidden individually` : '') + '.';
  if (layout.findings && layout.findings.open) renderFindings();
  if (layout.radar && layout.radar.open) renderRadar();
  if (layout.cyber && layout.cyber.open) renderCyber();
  if (layout.table && layout.table.open) renderTable();
}
/* ---------- Key findings ---------- */
function renderFindings(){
  const h = headline(), f = v => v == null ? '–' : fmtY(v), sn = view.smallN || 5;
  const card = (big, label, n) => `<div class="kfc${n != null && n < sn ? ' small' : ''}"><b>${big}</b><span>${label}</span></div>`;
  let html = '<div class="kf">' +
    card(`${f(h.pre)} → ${f(h.rec)} yrs`, 'Median gap from research to first product, for milestones landing before 1970 and since 2000') +
    card(`${f(h.ai)} vs ${f(h.oth)} yrs`, 'AI-driven work against everything else, for research since 2010') +
    card(h.adm != null ? `+${f(h.adm)} yrs` : '–', `From first product to mainstream adoption (${h.adn} estimates so far)`, h.adn) +
    card(`${f(h.uk)} vs ${f(h.row)} yrs`, `Research that began in the UK (${h.ukn}) against the rest of the world`, h.ukn) + '</div>';
  const rows = FKEYS.filter(k => F.fields.has(k) && FIELDS[k] && !FIELDS[k].custom).map(k => {
    const v = h.pool.filter(it => it.v === k && it.p >= 2000).map(it => it.lag); return {k, n:v.length, m:v.length ? median(v) : null};
  }).filter(r => r.m != null).sort((a, b) => a.m - b.m);
  const mx = Math.max(1, ...rows.map(r => r.m));
  html += '<h3>Median years to first product since 2000, by field</h3><div class="kbars">' + rows.map(r => `<div class="kbar${r.n < sn ? ' small' : ''}" title="${r.n} milestones"><span>${FIELDS[r.k].name}</span><i style="width:${Math.max(4, r.m / mx * 100)}%;background:${FIELDS[r.k].hex}"></i><b>${f(r.m)}</b></div>`).join('') + '</div>';
  html += `<p class="note-s">Follows your filters. ${view.markSmall !== false ? `Faded items rest on fewer than ${sn} milestones. ` : ''}AI-maintained data; may contain errors.</p>`;
  $('findBody').innerHTML = html;
}
/* ---------- Data quality ---------- */
function renderQuality(){
  const ms = items.filter(it => !it.aud && !it.removed), tot = ms.length, pct = n => tot ? Math.round(n / tot * 100) : 0;
  const by = k => ms.filter(it => it.ver === k).length;
  const bar = (label, n, total, col) => `<div class="kbar"><span>${label}</span><i style="width:${Math.max(2, n / Math.max(1, total) * 100)}%;background:${col}"></i><b>${n} (${Math.round(n / Math.max(1, total) * 100)}%)</b></div>`;
  let html = `<h3>Verification of ${tot} milestones</h3><div class="kbars">` + bar('Source-cited', by('source-cited'), tot, '#7FD6A0') + bar('AI-compiled', by('ai-compiled'), tot, '#8FA6B8') + bar('AI estimate', by('ai-estimate'), tot, '#F2D38A') + '</div>';
  const landed = ms.filter(it => it.kind === 'hist');
  html += `<h3>Coverage</h3><div class="kbars">` + bar('Adoption year known', landed.filter(it => it.adopt).length, landed.length, '#5FD8FF') + bar('Region known', ms.filter(it => it.region && it.region !== 'unknown').length, tot, '#A891FF') + bar('Topic tags', ms.filter(it => it.tags && it.tags.length).length, tot, '#4CD3C2') + '</div>';
  html += '<h3>By field</h3><table class="qtab"><tr><th>Field</th><th>Milestones</th><th>Source-cited</th><th>Adoption known</th></tr>' + FKEYS.filter(k => FIELDS[k] && !FIELDS[k].custom).map(k => {
    const f = ms.filter(it => it.v === k), l = f.filter(it => it.kind === 'hist');
    return `<tr><td><i style="background:${FIELDS[k].hex}"></i>${FIELDS[k].name}</td><td>${f.length}</td><td>${Math.round(f.filter(it => it.ver === 'source-cited').length / Math.max(1, f.length) * 100)}%</td><td>${Math.round(l.filter(it => it.adopt).length / Math.max(1, l.length) * 100)}%</td></tr>`;
  }).join('') + '</table>';
  html += forecastHtml();
  const fw = FORTUNES.filter(x => x.nw), dates = fw.map(x => x.nwAsOf).filter(Boolean).sort();
  html += `<h3>Time to a fortune (${FORTUNES.length} founders)</h3><div class="kbars">` + bar('Net worth source-cited', FORTUNES.filter(x => x.fver === 'source-cited').length, FORTUNES.length, '#7FD6A0') + bar('Checked by the agents', FORTUNES.filter(x => x.checked).length, FORTUNES.length, '#5FD8FF') + '</div>' +
    `<p class="note-s">${dates.length ? `Net worths dated ${dates[0]} to ${dates[dates.length - 1]}. ` : ''}The agents refresh founders monthly, with the deep audit on the first Monday.</p>`;
  const runs = (DB.meta.changelog || []).filter(e => e.stats);
  if (runs.length) {
    const vals = runs.map(e => e.stats.sourceCited / Math.max(1, e.stats.milestones) * 100), mn = Math.min(...vals) - 2, mx = Math.max(...vals) + 2;
    const pts = vals.map((v, i) => `${(i / Math.max(1, vals.length - 1)) * 300},${60 - (v - mn) / Math.max(1, mx - mn) * 56}`).join(' ');
    html += `<h3>Source-cited share over time</h3><svg viewBox="-4 -4 308 68" class="spark" role="img" aria-label="Source-cited share by agent run"><polyline points="${pts}" fill="none" stroke="#7FD6A0" stroke-width="2"/></svg><p class="note-s">${Math.round(vals[0])}% at the first recorded run, ${Math.round(vals[vals.length - 1])}% now.</p>`;
  } else html += '<h3>Source-cited share over time</h3><p class="note-s">Recorded from the next agent run onwards.</p>';
  const use = (DB.meta.changelog || []).filter(e => e.usage);
  html += '<h3>Agent runs</h3>' + (use.length ? '<table class="qtab"><tr><th>Run</th><th>Calls</th><th>Searches</th><th>Tokens</th><th>Est. cost</th></tr>' + use.slice(-8).reverse().map(e => `<tr><td>${e.date}${e.time ? ' ' + e.time : ''}</td><td>${e.usage.calls}</td><td>${e.usage.searches}</td><td>${Math.round((e.usage.inputTokens + e.usage.outputTokens) / 1000)}k</td><td>${e.usage.costUsd != null ? '$' + e.usage.costUsd.toFixed(2) : '–'}</td></tr>`).join('') + '</table><p class="note-s">Estimates from token counts; the Claude Console shows the exact charge.</p>' : '<p class="note-s">Usage is recorded from the next agent run onwards.</p>');
  const so = DB.meta.secondOpinion || [], soTot = (kind, k) => so.filter(e => e.kind === kind).reduce((a, e) => a + (e[k] || 0), 0);
  if (so.length) {   // two models: each checks the other's finds
    const gQ = soTot('gemini-research', 'queued'), gA = DB.milestones.filter(m => (m.provenance || {}).addedBy === 'gemini-research').length;
    const cS = soTot('gemini-check', 'supported'), cD = soTot('gemini-check', 'not_supported') + soTot('gemini-check', 'unclear'), cAll = cS + cD;
    html += `<h3>Two-model checks</h3><p class="note-s">Claude and Google Gemini check each other: Gemini's finds are confirmed by Claude, and Claude's are given a second opinion by Gemini. Anything they disagree on is marked disputed.</p>
      <div class="kbars"><div><b>${gA}</b> of ${gQ} Gemini finds confirmed by Claude</div><div><b>${cS}</b> of ${cAll} Claude finds supported by Gemini${cAll ? ` (${Math.round(cS / cAll * 100)}% agreement)` : ''}</div><div><b>${cD}</b> disputed after a second opinion</div></div>`;
  }
{ const STOPW = new Set(['the', 'and', 'for', 'with', 'first', 'new', 'of', 'in', 'to', 'a', 'an', 'at', 'scale', 'commercial', 'service', 'launch', 'launched', 'ai', 'by', 'on', 'as', 'uk', 'gb']);
    const words = t => new Set((t.toLowerCase().replace(/-/g, ' ').match(/[a-z0-9]+/g) || []).filter(w => !STOPW.has(w) && w.length > 2));
    const live = items.filter(it => !it.removed && !it.aud), pairs = [], yr = it => it.p ?? it.r;
    for (let i = 0; i < live.length; i++) { const a = words(live[i].t); if (a.size < 2) continue;
      for (let j = i + 1; j < live.length; j++) { const b = words(live[j].t); if (b.size < 2 || live[i].v !== live[j].v || Math.abs(yr(live[i]) - yr(live[j])) > 3) continue;
        let n = 0; a.forEach(w => { if (b.has(w)) n++; }); if (n / Math.min(a.size, b.size) >= .8) pairs.push([live[i], live[j]]); } }
    if (pairs.length) html += `<h3>Possible duplicates to review</h3><p class="note-s">Pairs with very similar titles, in the same field and within three years of each other. They may be genuinely different; nothing is merged or removed automatically. Select either to compare.</p>
      <div class="dups">${pairs.slice(0, 20).map(([a, b]) => `<div class="trow"><span><a href="#" data-dup="${a.id}">${esc(a.t)}</a> (${yr(a)}) <em>and</em> <a href="#" data-dup="${b.id}">${esc(b.t)}</a> (${yr(b)})</span></div>`).join('')}</div>`; }
  const fun = DB.meta.researchFunnel || [];
  if (fun.length) {   // where finds are found, and where they are lost
    const since = new Date(new Date(DATA_AS_OF + 'T12:00:00Z') - 30 * 864e5).toISOString().slice(0, 10), last = fun.filter(e => e.date >= since);
    const sum = (agent, k) => last.filter(e => e.agent === agent).reduce((a, e) => a + (e[k] || 0), 0);
    const why = (agent, mode) => { const r = {}; last.filter(e => e.agent === agent).forEach(e => Object.entries(e[mode + '_rejected'] || {}).forEach(([k, v]) => { r[k] = (r[k] || 0) + v; })); return Object.entries(r).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${v} ${({duplicate:'already in the data', sources:'sources could not confirm', years:'years outside the rules', origin:'no clear research origin', other:'other'})[k] || k}`).join(', ') || 'none'; };
    const row = (label, agent, mode) => `<tr><td>${label}</td><td>${sum(agent, mode + '_proposed')}</td><td>${sum(agent, mode + '_queued')}</td><td class="note-s">${why(agent, mode)}</td></tr>`;
    html += `<h3>Research funnel (last 30 days)</h3><p class="note-s">What the agents proposed, what passed the source checks, and why the rest were rejected. Claude's QA then confirms: ${sum('qa', 'confirmed_claude')} from Claude and ${sum('qa', 'confirmed_gemini')} from Gemini.</p>
      ${(() => { const sw = DB.meta.catchupSwept || {}, cut = new Date(new Date(DATA_AS_OF + 'T12:00:00Z') - 183 * 864e5).toISOString().slice(0, 10), n = Object.values(sw).filter(d => d >= cut).length;
        return `<p class="note-s">Catch-up coverage: <b>${n}</b> of ${DB.fields.length * 12} field-and-quarter slots from the last three years searched in the past six months.</p>`; })()}
      <table class="cstab"><tr><th>Search</th><th>Proposed</th><th>Passed checks</th><th>Rejected because</th></tr>${row('Claude: recent news (45 days)', 'claude', 'recent')}${row('Claude: catching up (last three years)', 'claude', 'catchup')}${row('Claude: filling gaps in the past', 'claude', 'backfill')}${row('Gemini', 'gemini', 'recent')}</table>`;
  }
    $('qualBody').innerHTML = html;
  $('qualBody').querySelectorAll('[data-dup]').forEach(el => el.onclick = e => { e.preventDefault(); const it = items.find(x => x.id == el.dataset.dup); if (it) { hidden.delete(it.id); openDetail(it); setOpen('details', true); } });
}
/* ---------- Table of milestones ---------- */
let tabSort = {k:'r', dir:1};
const TAB_COLS = [['t', 'Milestone'], ['v', 'Field'], ['sub', 'Sub-field'], ['s', 'Origin'], ['region', 'Region'], ['r', 'Research'], ['p', 'Change'], ['adopt', 'Adoption'], ['lag', 'Gap'], ['ver', 'Verification']];
function tabVal(it, k){ if (k === 'sub') { const x = FIELDS[it.v] && FIELDS[it.v].subs.find(y => y.id === it.sub); return x ? x.name : ''; } return k === 'v' ? (FIELDS[it.v] ? FIELDS[it.v].name : it.v) : k === 's' ? SRC[it.s].name : k === 'region' ? (REGIONS[it.region] || '') : k === 'p' ? (it.kind === 'flight' ? it.tg : it.p) : k === 'ver' ? (VERS[it.ver] || '') : it[k]; }
function renderTable(){
  const q = ($('tabQ').value || '').trim().toLowerCase();
  const list = items.filter(it => shownFully(it) && (!q || (it.t + ' ' + (it.co || '')).toLowerCase().includes(q))).sort((a, b) => {
    const x = tabVal(a, tabSort.k), y = tabVal(b, tabSort.k);
    if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1;
    return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y))) * tabSort.dir;
  });
  $('tabHead').innerHTML = '<tr>' + TAB_COLS.map(([k, n]) => `<th scope="col" tabindex="0" data-k="${k}" aria-sort="${tabSort.k === k ? (tabSort.dir > 0 ? 'ascending' : 'descending') : 'none'}">${n}${tabSort.k === k ? (tabSort.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('') + '</tr>';
  $('tabBody').innerHTML = list.map(it => `<tr tabindex="0" data-id="${it.id}"${selected === it ? ' class="sel"' : ''}><td><i style="background:${itemHex(it)}"></i>${esc(it.t)}</td><td>${tabVal(it, 'v')}</td><td>${tabVal(it, 'sub')}</td><td>${tabVal(it, 's')}</td><td>${tabVal(it, 'region')}</td><td>${it.r}</td><td>${it.kind === 'flight' ? 'later' : it.p}${it.kind === 'proj' ? ' (exp.)' : ''}</td><td>${it.adopt ? it.adopt + (it.adopt > NOW ? ' (exp.)' : '') : ''}</td><td>${Math.round(it.lag)}</td><td>${tabVal(it, 'ver')}</td></tr>`).join('');
  $('tabCount').textContent = `${list.length} milestones. Click a heading to sort; click or press Enter on a row to open its details.`;
}
$('tabHead').addEventListener('click', e => { const th = e.target.closest('th'); if (!th) return; const k = th.dataset.k; tabSort = {k, dir:tabSort.k === k ? -tabSort.dir : 1}; renderTable(); });
$('tabHead').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } e.stopPropagation(); });
$('tabBody').addEventListener('click', e => { const tr = e.target.closest('tr[data-id]'); if (tr) openDetail(items[+tr.dataset.id]); });
$('tabBody').addEventListener('keydown', e => {
  const tr = e.target.closest('tr[data-id]'); if (!tr) return;
  if (e.key === 'Enter') { e.preventDefault(); openDetail(items[+tr.dataset.id]); }
  if (e.key === 'ArrowDown' && tr.nextElementSibling) { e.preventDefault(); tr.nextElementSibling.focus(); }
  if (e.key === 'ArrowUp' && tr.previousElementSibling) { e.preventDefault(); tr.previousElementSibling.focus(); }
  e.stopPropagation();
});
$('tabQ').addEventListener('input', renderTable); $('tabQ').addEventListener('keydown', e => e.stopPropagation());
/* Summary controls */
$('statsMetricS').addEventListener('change', e => { view.gapMetric = e.target.value; renderStats(); });
$('statsRowsSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; view.statsRows = b.dataset.v; renderStats(); });
$('statsRangeT').addEventListener('change', e => { view.statsRange = e.target.checked; renderStats(); });
$('statsSmallT').addEventListener('change', e => { view.markSmall = e.target.checked; renderStats(); });
$('statsSurvT').addEventListener('change', e => { view.survival = e.target.checked; renderStats(); });

chipGroup($('regionChips'), () => F.regions, REGIONS);
chipGroup($('verChips'), () => F.ver, VERS);
chipGroup($('tagChips'), () => F.tags, TAGS);
