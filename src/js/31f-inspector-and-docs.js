/* ==================================================================
 *  DATA INSPECTOR: everything in the dataset that is not on the main display (retired, hidden, disputed,
 *  only partly confirmed, waiting for QA, rejected by the agents, possible duplicates), with search, filters,
 *  the reasons, and decisions you can download as data/curation.json or as your own list.
 * ================================================================== */
const INS = {q:'', cats:new Set(['retired', 'disputed', 'unclear', 'pending', 'rejected', 'duplicates', 'hidden']), field:'', agent:'', since:'all', open:null, pending:null, rejected:null, curation:null, decisions:{}, mine:new Set(), reviewed:{}, showReviewed:false, limit:150};
const INS_CATS = {
  retired:['Retired', 'You (or a curation decision) retired it: hidden from the display, never deleted.', '#8FA6B8'],
  hidden:['Hidden', 'Hidden from the display by a flag in the data, without a retirement reason.', '#8FA6B8'],
  disputed:['Disputed', 'Published, but a check raised doubt: the QA agent disputed it, or Gemini\u2019s second opinion found a contradiction.', '#FF6B6B'],
  unclear:['Partly confirmed', 'Passed Claude\u2019s checks, but Gemini\u2019s second opinion could not confirm it (the sources were too thin to judge, or Gemini was unavailable).', '#F2D38A'],
  pending:['Waiting for QA', 'Found and passed the source checks; waiting for Claude\u2019s QA agent to confirm it on the next run.', '#5FD8FF'],
  rejected:['Rejected', 'An agent proposed it, but it failed a rule (shown in the reason). Kept so you can research it.', '#A891FF'],
  duplicates:['Possible duplicate', 'Two records with very similar titles and close dates. Compare them, and retire one if they are the same milestone.', '#F7C04A']};
function insLoad(){
  if (INS.loaded || location.protocol.indexOf('http') !== 0) { INS.loaded = true; return Promise.resolve(); }
  const get = f => fetch('data/' + f, {cache:'no-cache'}).then(r => r.ok ? r.json() : null).catch(() => null);
  return Promise.all([get('pending.json'), get('rejected.json'), get('curation.json')]).then(([p, r, c]) => { INS.pending = p || []; INS.rejected = r || []; INS.curation = c || {decisions:[]}; INS.loaded = true; });
}
function insRows(){
  const rows = [], fieldOf = k => (FIELDS[k] || {}).name || k || '';
  DB.milestones.forEach(m => {
    const f = m.flags || {}, p = m.provenance || {}, so = p.secondOpinion || {};
    const base = {id:m.id, title:m.title, field:m.field, status:m.status, ry:m.research.year, cy:m.change.year, refs:(m.refs || []).map(r => r.url), date:f.retired ? f.retired.date : p.lastChecked || p.added, agent:p.addedBy, rec:m};
    if (f.retired) rows.push(Object.assign({cat:'retired', reason:f.retired.reason + (f.retired.duplicateOf ? ` (duplicate of ${f.retired.duplicateOf})` : '')}, base));
    else if (f.hidden) rows.push(Object.assign({cat:'hidden', reason:'Hidden in the data.'}, base));
    if (f.retired || f.hidden) return;   // retirement takes precedence: listed once
    if (f.disputed) rows.push(Object.assign({cat:'disputed', reason:p.qaNote || 'Disputed by the QA agent.'}, base));
    if (!f.disputed && (so.verdict === 'unclear' || so.verdict === 'unavailable')) rows.push(Object.assign({cat:'unclear', reason:`Second opinion (Gemini): ${so.verdict}. ${so.reason || ''}`}, base));
  });
  (INS.pending || []).forEach(c => rows.push({cat:'pending', id:c.id, title:c.title, field:c.field, status:c.status, ry:(c.research || {}).year, cy:(c.change || {}).year, refs:(c.refs || []).map(r => r.url),
    date:c.proposed, agent:c.foundBy || 'research-agent', reason:c.attempts ? `Waiting for QA (tried ${c.attempts} time${c.attempts > 1 ? 's' : ''}).` : 'Waiting for QA.', rec:c}));
  (INS.rejected || []).forEach((c, k) => rows.push({cat:'rejected', id:'rej-' + k, title:c.title, field:c.field, status:c.status, ry:c.research_year, cy:c.change_year, refs:c.sources || [], date:c.date, agent:c.agent + (c.mode ? ' · ' + c.mode : ''),
    reason:c.reason, rec:c}));
  const distinctPairs = new Set((DB.meta.notDuplicates || []).map(x => [x.a, x.b].sort().join('|')));
  possibleDuplicatePairs().filter(([a, b]) => !distinctPairs.has([a.uid || a.id, b.uid || b.id].sort().join('|'))).forEach(([a, b], k) => rows.push({cat:'duplicates', id:'dup-' + a.id + '-' + b.id, title:`${a.t} / ${b.t}`, field:a.v, ry:a.r, cy:a.p, refs:[], date:'', agent:'', reason:`Compare “${a.t}” (${a.r}–${a.p ?? '?'}) with “${b.t}” (${b.r}–${b.p ?? '?'}).`, pair:[a, b]}));
  rows.forEach(r => { r.fieldName = fieldOf(r.field); });
  return rows;
}
function possibleDuplicatePairs(){
  if (INS.pairs && INS.pairsFor === items.length) return INS.pairs;   // worked out once, not on every keystroke
  INS.pairsFor = items.length; return (INS.pairs = findDuplicatePairs());
}
function findDuplicatePairs(){
  const STOPW = new Set(['the', 'and', 'for', 'with', 'first', 'new', 'of', 'in', 'to', 'a', 'an', 'at', 'scale', 'commercial', 'service', 'launch', 'launched', 'ai', 'by', 'on', 'as', 'uk', 'gb']);
  const GENERIC = new Set('network networks system systems computing computer computers data energy power digital technology technologies service services platform platforms model models device devices storage control grid grids smart'.split(' '));
  const words = t => new Set((t.replace(/-/g, ' ').match(/[A-Za-z0-9]+/g) || []).filter(w => !STOPW.has(w.toLowerCase()) && (w.length > 2 || /^[A-Z0-9]{2}$/.test(w))).map(w => w.toLowerCase()));
  const live = items.filter(it => !it.removed && !it.aud), pairs = [], yrs = it => [it.r, it.p].filter(v => v != null);
  for (let i = 0; i < live.length; i++) { const a = words(live[i].t); if (!a.size) continue;
    for (let j = i + 1; j < live.length; j++) { const b = words(live[j].t); if (!b.size) continue;
      const near = Math.min(...yrs(live[i]).flatMap(x => yrs(live[j]).map(y => Math.abs(x - y)))), distinct = x => [...x].some(w => !GENERIC.has(w));
      const sub = ([...a].every(w => b.has(w)) && distinct(a)) || ([...b].every(w => a.has(w)) && distinct(b));
      let n = 0; a.forEach(w => { if (b.has(w)) n++; });
      if ((live[i].v === live[j].v && a.size >= 2 && b.size >= 2 && near <= 3 && n / Math.min(a.size, b.size) >= .8) || (sub && near <= 5)) pairs.push([live[i], live[j]]); } }
  return pairs;
}
function renderInspector(){
  if (!layout.inspect || !layout.inspect.open) return;
  insLoad().then(() => {
    const all = INS.rows && INS.rowsFor === DB.meta.revision + ':' + items.length ? INS.rows : (INS.rowsFor = DB.meta.revision + ':' + items.length, INS.rows = insRows()), since = INS.since === 'all' ? '' : new Date(new Date(DATA_AS_OF + 'T12:00:00Z') - (+INS.since) * 864e5).toISOString().slice(0, 10), q = INS.q.toLowerCase();
    all.forEach(r => { r.rv = reviewState(r); });
    const nReviewed = all.filter(r => r.rv && !r.rv.lapsed).length;
    const shown = all.filter(r => (INS.showReviewed || !r.rv || r.rv.lapsed) && INS.cats.has(r.cat) && (!INS.field || r.field === INS.field) && (!INS.agent || String(r.agent || '').startsWith(INS.agent)) && (!since || !r.date || r.date >= since)
      && (!q || `${r.title} ${r.reason} ${r.fieldName} ${r.agent}`.toLowerCase().includes(q)));
    const count = c => all.filter(r => r.cat === c).length, agents = [...new Set(all.map(r => String(r.agent || '').split(' · ')[0]).filter(Boolean))].sort();
    if (!$('insQ')) $('insCtl').innerHTML = `<div class="cfilt"><input id="insQ" type="search" placeholder="Search titles, reasons, fields" value="${esc(INS.q)}">
      <select id="insField"><option value="">All fields</option>${FKEYS.filter(k => FIELDS[k] && !FIELDS[k].custom).map(k => `<option value="${k}"${INS.field === k ? ' selected' : ''}>${esc(FIELDS[k].name)}</option>`).join('')}</select>
      <select id="insAgent"><option value="">All agents</option>${agents.map(a => `<option${INS.agent === a ? ' selected' : ''}>${esc(a)}</option>`).join('')}</select>
      <select id="insSince">${[['all', 'Any date'], ['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days']].map(([v, n]) => `<option value="${v}"${INS.since === v ? ' selected' : ''}>${n}</option>`).join('')}</select></div>
      <div class="inscats"><button data-showrev="1" class="insshowrev${INS.showReviewed ? ' on' : ''}" title="Reviewed items are hidden until something about them changes">Show reviewed <b>${nReviewed}</b></button>${Object.entries(INS_CATS).map(([k, [n, , col]]) => `<button data-cat="${k}" class="${INS.cats.has(k) ? 'on' : ''}" style="--c:${col}">${n} <b>${count(k)}</b></button>`).join('')}</div>
      ${location.protocol.indexOf('http') !== 0 ? '<p class="note-s">Offline copy: the queue and the rejected candidates are only available online.</p>' : ''}`;
    const sr = $('insCtl').querySelector('[data-showrev]'); if (sr) { sr.classList.toggle('on', INS.showReviewed); sr.querySelector('b').textContent = nReviewed; }
    $('insCtl').querySelectorAll('[data-cat]').forEach(btn => { const k = btn.dataset.cat; btn.classList.toggle('on', INS.cats.has(k)); btn.querySelector('b').textContent = count(k); });
    $('insList').innerHTML = shown.length ? shown.slice(0, INS.limit).map(r => {
      const [cn, why, col] = INS_CATS[r.cat], open = INS.open === r.id, dec = INS.decisions[r.id];
      return `<div class="insrow${open ? ' open' : ''}${r.rv && !r.rv.lapsed ? ' reviewed' : ''}" data-row="${esc(r.id)}"><div class="inshead"><span class="inscat" style="--c:${col}">${cn}</span>${r.rv ? (r.rv.lapsed ? '<span class="insrv lapsed" title="Something changed after it was reviewed, so it needs looking at again">Review lapsed: changed since</span>' : `<span class="insrv" title="${esc(r.rv.note || '')}">✓ Reviewed${r.rv.by === 'owner' ? ' by the owner' : ''}</span>`) : ''}<b>${esc(r.title)}</b><em>${esc(r.fieldName)}${r.ry ? ` · ${r.ry}–${r.cy ?? '?'}` : ''}${r.date ? ' · ' + fmtDate(r.date, 'short') : ''}</em>${INS.mine.has(r.id) ? '<i class="insmine">★</i>' : ''}${dec ? `<i class="insdec">${dec}</i>` : ''}</div>
        <div class="insreason">${esc(r.reason || '')}</div>
        ${open ? `<div class="insbody"><p class="note-s">${why}</p><dl class="csdl">${r.agent ? `<dt>Found by</dt><dd>${esc(r.agent)}</dd>` : ''}${r.status ? `<dt>Status</dt><dd>${esc(r.status)}</dd>` : ''}
          ${r.rec && (r.rec.research_what || (r.rec.research || {}).what) ? `<dt>Research</dt><dd>${esc(r.rec.research_what || r.rec.research.what)}${r.rec.research_origin ? ' <span class="note-s">Origin: ' + esc(r.rec.research_origin) + '</span>' : ''}</dd>` : ''}
          ${r.rec && (r.rec.change_what || (r.rec.change || {}).what) ? `<dt>First use</dt><dd>${esc(r.rec.change_what || r.rec.change.what)}</dd>` : ''}
          ${r.refs.length ? `<dt>Sources</dt><dd>${r.refs.map(u => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\//, '').slice(0, 60))}</a>`).join('<br>')}</dd>` : ''}</dl>
          <div class="insact">${insActions(r)}</div>` : ''}</div>`; }).join('') + (shown.length > INS.limit ? `<button class="mini" id="insMore">Show more (${shown.length - INS.limit} hidden)</button>` : '')
      : '<p class="empty">Nothing matches these filters.</p>';
    $('insFoot').innerHTML = `<span class="note-s">${shown.length} of ${all.length} items. Select a row for the details.</span> <button class="mini" id="insMineDl"${INS.mine.size ? '' : ' disabled'}>Download my list (${INS.mine.size})</button>
      ${view.admin ? `<button class="mini" id="insCurDl"${Object.keys(INS.decisions).length ? '' : ' disabled'}>Download system file for GitHub (${Object.keys(INS.decisions).length} decision${Object.keys(INS.decisions).length === 1 ? '' : 's'})</button>` : ''}`;
  });
}
$('insBody').addEventListener('input', e => { if (e.target.id === 'insQ') { INS.q = e.target.value; clearTimeout(INS.t); INS.t = setTimeout(renderInspector, 200); } });
$('insBody').addEventListener('change', e => { if (e.target.id === 'insField') INS.field = e.target.value; if (e.target.id === 'insAgent') INS.agent = e.target.value; if (e.target.id === 'insSince') INS.since = e.target.value; renderInspector(); });
$('insBody').addEventListener('click', e => {
  const t = e.target, cat = t.closest('[data-cat]');
  if (t.closest('[data-showrev]')) { INS.showReviewed = !INS.showReviewed; renderInspector(); return; }
  if (t.dataset.review) { const r = insRows().find(x => x.id === t.dataset.review); if (!r) return; const note = (prompt('Mark as reviewed. A note for yourself (optional):', '') ?? null); if (note === null) return;
    INS.reviewed[r.id] = {at:new Date().toISOString(), note:note.trim().slice(0, 300), sig:rowSig(r)}; markDirty(); renderInspector(); toast('Marked as reviewed. It stays hidden until something about it changes.'); return; }
  if (t.dataset.unreview) { delete INS.reviewed[t.dataset.unreview]; markDirty(); renderInspector(); return; }
  if (t.dataset.adm) { const r = insRows().find(x => x.id === t.dataset.id); if (!r) return; const act = t.dataset.adm; const note = (prompt({reviewed:'Reviewed for everyone. A note that will be published (optional):', 'clear-dispute':'Clear the dispute for everyone. Why are you satisfied with it?', 'not-duplicate':'Not a duplicate. How do they differ (optional)?'}[act] || 'A note (optional):', '') ?? null); if (note === null) return;
    INS.decisions[r.id] = act; INS.extra = INS.extra || {}; INS.extra[r.id] = Object.assign({note:note.trim().slice(0, 300), sig:rowSig(r), reason:note.trim().slice(0, 300) || undefined}, r.pair ? {a:r.pair[0].uid, b:r.pair[1].uid} : {}); markDirty(); renderInspector(); toast('Added to the system file. Download it for GitHub when you are ready.'); return; }
  if (cat) { const k = cat.dataset.cat; INS.cats.has(k) ? INS.cats.delete(k) : INS.cats.add(k); renderInspector(); return; }
  if (t.id === 'insMore') { INS.limit += 150; renderInspector(); return; }
  const decide = (id, action, extra) => { INS.decisions[id] = action; INS.extra = INS.extra || {}; INS.extra[id] = extra || {}; markDirty(); renderInspector(); toast(`Marked to ${action}. Download curation.json to apply it.`); };
  if (t.dataset.retire) { decide(t.dataset.retire, 'retire', t.dataset.dupof ? {duplicateOf:t.dataset.dupof, reason:'Duplicate of ' + ((items.find(x => x.uid === t.dataset.dupof) || {}).t || t.dataset.dupof)} : {}); return; }
  if (t.dataset.restore) { decide(t.dataset.restore, 'restore'); return; }
  if (t.dataset.keep) { decide(t.dataset.keep, 'keep'); return; }
  if (t.dataset.mine) { INS.mine.has(t.dataset.mine) ? INS.mine.delete(t.dataset.mine) : INS.mine.add(t.dataset.mine); markDirty(); renderInspector(); return; }
  if (t.dataset.show) { const it = items.find(x => x.id == t.dataset.show); if (it) { hidden.delete(it.id); openDetail(it); setOpen('details', true); } return; }
  if (t.id === 'insMineDl') { const all = insRows().filter(r => INS.mine.has(r.id)).map(({pair, rec, ...r}) => Object.assign(r, {record:rec || null}));
    saveBlob(new Blob([JSON.stringify({saved:new Date().toISOString(), dataRevision:DB.meta.revision, items:all}, null, 1)], {type:'application/json'}), `my-research-list-${stamp()}.json`); return; }
  if (t.id === 'insCurDl') { const cur = JSON.parse(JSON.stringify(INS.curation || {decisions:[]})); cur.decisions = cur.decisions || [];
    Object.entries(INS.decisions).forEach(([id, action]) => { if (action === 'keep') return; const x = INS.extra[id] || {};
      if (action === 'not-duplicate') { cur.decisions.push({id:x.a, other:x.b, action, note:x.note || '', date:new Date().toISOString().slice(0, 10)}); return; }
      if (action === 'reviewed' || action === 'clear-dispute') { cur.decisions.push({id, action, note:x.note || '', sig:x.sig, date:new Date().toISOString().slice(0, 10)}); return; }
      cur.decisions.push(Object.assign({id, action, reason:(INS.extra[id] || {}).reason || (action === 'retire' ? 'Retired after review in the Data inspector.' : 'Restored after review in the Data inspector.'), date:new Date().toISOString().slice(0, 10)}, (INS.extra[id] || {}).duplicateOf ? {duplicateOf:INS.extra[id].duplicateOf} : {})); });
    saveBlob(new Blob([JSON.stringify(cur, null, 1)], {type:'application/json'}), 'curation.json'); toast('Upload curation.json to the data folder in GitHub; the next weekly run applies it.'); return; }
  const row = t.closest('[data-row]'); if (row && !t.closest('a, button')) { INS.open = INS.open === row.dataset.row ? null : row.dataset.row; renderInspector(); }
});
/* ==================================================================
 *  HOW IT WORKS: documentation of the app, its files, workflows and agents. Maintained with each material change.
 * ================================================================== */
const DOCS_UPDATED = 'Version 12.5, 1 November 2026';   // update with every material change
const DOCS = [
 ['overview', 'Overview', `<p>The Shrinking Gap measures how long research takes to become real-world change, and whether AI is shortening the journey. It is maintained by AI agents using public sources only; the owner can review and curate through the Data inspector and the system file, but nothing needs a person each week.</p>
  <p><b>The flow:</b> AI agents (GitHub Actions, weekly) research, check and correct <code>data/data.json</code> → safety gates → <code>tools/build.py</code> assembles <code>index.html</code> from <code>src/</code> with the data embedded → GitHub Pages publishes it. Your uploads to <code>src/</code> trigger the same build.</p>`],
 ['files', 'Files and folders', `<table class="doctab"><tr><th>Path</th><th>What it is</th></tr>
  <tr><td><code>index.html</code></td><td>The built app (generated; never edit by hand).</td></tr>
  <tr><td><code>src/index.html</code></td><td>The page template: markup with include markers that the build replaces with the CSS and JavaScript.</td></tr>
  <tr><td><code>src/styles/app.css</code></td><td>All styles.</td></tr>
  <tr><td><code>src/js/NN-*.js</code></td><td>The app's code in numbered sections, assembled in order: data loading (01), state (02), the 3D scene, panel manager (07), ready-made views (08), the Views menu (09), details (12), reports (21), data changes (22), data quality (27), help (28), cyber lens and readiness (29), tours (31), kiosk and image export (31b), data export (31c), charts (31d), insights and weekly analyses (31e), this inspector and documentation (31f), the toolbar, Present and Share menus, chips and pins (31g), My file and My views (31h), chart windows (31i), Start with a question (31j), the at-a-glance infographics (31k), saved views (32), start-up (36).</td></tr>
  <tr><td><code>src/vendor/</code></td><td>Fonts and libraries (three.js, PptxGenJS loaded on demand, QR code).</td></tr>
  <tr><td><code>data/data.json</code></td><td>The dataset: milestones, fortunes, guidance, change log, funnel and settings history.</td></tr>
  <tr><td><code>data/schema.json</code></td><td>The rules the data must follow (checked by Gate 1).</td></tr>
  <tr><td><code>data/tours.json</code></td><td>Narration templates for the walk-throughs and chart insights (refreshed weekly by the tour agent).</td></tr>
  <tr><td><code>data/pending.json</code></td><td>Candidates waiting for QA.</td></tr>
  <tr><td><code>data/rejected.json</code></td><td>The last 800 rejected candidates and why (for this inspector).</td></tr>
  <tr><td><code>data/curation.json</code></td><td>The system file: your decisions for everyone (retire, restore, reviewed, clear a dispute, not a duplicate), applied by the QA agent.</td></tr>
  <tr><td><code>agents/</code></td><td>The agents (Python) and <code>config.json</code>, which holds every limit and setting.</td></tr>
  <tr><td><code>tools/</code></td><td>build, validate (Gate 1), change_guard (Gate 2), smoke_test (Gate 3), make_voice, digest, run_summary.</td></tr>
  <tr><td><code>.github/workflows/</code></td><td>data-agents.yml (weekly), deep-search.yml (manual and six-monthly), build.yml (on upload), tests.yml (by hand only).</td></tr>
  <tr><td><code>tests/</code></td><td>The test rig: the agents' guardrail tests (offline, simulated answers) and the browser suites. Run only by hand.</td></tr>
  <tr><td><code>audio/</code></td><td>Recorded narration (Azure voice) and its index.</td></tr></table>`],
 ['workflows', 'Workflows', `<p><b>Weekly data agents</b> (Mondays 06:00 UTC, or by hand): remember the starting data → on the first Monday of the month, a deeper audit (also fortunes research) → research agent → Gemini research → QA agent (also applies curation) → Gemini second opinion → guidance agent → tour agent → AI levers agent → story agent → Gate 1 (schema and rules) → Gate 2 (nothing deleted, additions within limits) → build → Gate 3 (the app loads) → voice → publish (if the repository moved on, this run's data is laid on top whole; if the data itself changed meanwhile, it stops and keeps its results as an artifact) → weekly digest issue (and, monthly, the AI for clean energy digest).</p>
  <p><b>Deep search</b> (by hand, and 1 January and 1 July): the deep search agent replaces the weekly research steps; then QA, the second opinion, the gates and publishing as above, with a higher limit for that run only.</p>
  <p><b>Build the app</b> (when <code>src/</code>, <code>tools/build.py</code> or <code>data/tours.json</code> change): build, validate, smoke test, publish the new <code>index.html</code>, retrying against the latest files.</p><p><b>Test suite</b> (by hand only: Actions → Test suite): builds the app from the current source, then runs the agents' guardrail tests and the browser suites. It never publishes and makes no API calls.</p>`],
 ['agents', 'The agents and their rules', `<table class="doctab"><tr><th>Agent</th><th>Does</th><th>Rules</th></tr>
  <tr><td>Research (Claude)</td><td>Recent news (45-day window), a three-year catch-up sweep (field by quarter), and gap-filling (thinnest field-and-decade cells).</td><td>Two independent sources; the facts found on both pages; years in order from 1925 (approximate years accepted and marked); a research origin; no duplicates (titles, or one inside another with close years, across fields). Separate allowances for news, catch-up and gap-filling; 5 reserved for AI for clean energy. Monthly, it also researches new fortunes (founders who made a fortune from research).</td></tr>
  <tr><td>Gemini research</td><td>Up to 10 a week from Google search, aimed at the UK, Europe, Asia and other languages, and thin cells.</td><td>The same checks; Claude's QA must confirm.</td></tr>
  <tr><td>QA (Claude)</td><td>Confirms candidates independently in batches; audits a rotating batch of existing records; applies the owner's decisions in curation.json (retire, restore, reviewed, clear a dispute, not a duplicate), each once. Replaces broken source links when it finds a page whose quoted evidence is confirmed (up to 10 a week), and reclassifies in-lab records whose target falls inside the horizon as outlooks.</td><td>Searches for its own sources; never deletes; disputes rather than removes.</td></tr>
  <tr><td>Gemini second opinion</td><td>Checks Claude's additions (weekly and deep search) against the source pages.</td><td>Essentials only (it happened; both years right to within one). Only a contradiction disputes; thin pages give "unclear".</td></tr>
  <tr><td>Guidance</td><td>New and updated security guidance, CAF and Ofgem first.</td><td>Official sources only.</td></tr>
  <tr><td>Tour</td><td>Rewords the walk-throughs, chart insights and both weekly analyses.</td><td>Figures only through placeholders; every conclusion variant kept; word limits; no doubled words or repeated steps; wording must fit what is on screen; refers to "AI for clean energy".</td></tr>
  <tr><td>AI levers</td><td>Researches what holds each projected technology up and which AI levers apply.</td><td>Fixed lists of levers and phases; quotes verified on the page.</td></tr>
  <tr><td>Story</td><td>Research → first use → impact, most recent first.</td><td>Short fields; quotes verified on the page.</td></tr>
  <tr><td>Deep search</td><td>Worldwide, multi-language sweep of the last 10 and next 10 years; aims for 200+ and 50+ for clean energy.</td><td>The same checks; then QA, the second opinion and the gates.</td></tr></table>`],
 ['rules', 'Where each rule lives', `<p class="note-s">When you want an agent to behave differently, this is where the rule lives. Settings in <code>config.json</code> can be changed directly; changes to code are best made with Claude, then checked with the test suite.</p><table class="doctab"><tr><th>Rule</th><th>Where it lives</th></tr><tr><td>Two independent sources, facts found on both pages</td><td><code>agents/config.json</code> → <code>research.minSources</code>; the page check is <code>check()</code> in <code>agents/research_agent.py</code></td></tr><tr><td>Years: from 1925, in order, approximate years accepted</td><td><code>check()</code> and <code>read_year()</code> in <code>agents/research_agent.py</code>; the start year is <code>meta.startYear</code> in <code>data/data.json</code></td></tr><tr><td>Duplicates</td><td><code>near_duplicate()</code> in <code>agents/research_agent.py</code> (word overlap with two or more key words, and one title inside another with years within five); <code>is_duplicate()</code> in <code>agents/common.py</code></td></tr><tr><td>How many additions a week, and from where</td><td><code>publish.maxAdditionsPerRun</code>, <code>claudeAdditionsPerRun</code>, <code>reservedForVision</code>; <code>research.catchup.perRun</code>, <code>research.backfill.perRun</code>; <code>gemini.researchPerRun</code> (all in <code>config.json</code>)</td></tr><tr><td>Search windows</td><td><code>research.lookbackDays</code> (news), <code>research.catchup.monthsBack</code> (catch-up); gap-filling cells in <code>thin_cells()</code></td></tr><tr><td>QA: what it confirms and how many corrections</td><td><code>agents/qa_agent.py</code>; <code>publish.maxCorrectionsPerRun</code> in <code>config.json</code></td></tr><tr><td>The second opinion: what counts as supported</td><td>The prompt and <code>RULES</code> version in <code>agents/gemini_check.py</code> (raising <code>RULES</code> re-checks earlier verdicts once)</td></tr><tr><td>Narration: placeholders, word limits, banned wording</td><td><code>agents/tour_rules.py</code> (the tour agent cannot change these)</td></tr><tr><td>Gates</td><td><code>tools/validate.py</code> and <code>data/schema.json</code> (Gate 1), <code>tools/change_guard.py</code> (Gate 2), <code>tools/smoke_test.py</code> (Gate 3)</td></tr><tr><td>Deep search: targets and cost bounds</td><td><code>deepSearch</code> in <code>config.json</code> (<code>targetTotal</code>, <code>targetClean</code>, <code>maxCalls</code>, <code>searchesPerCall</code>, <code>maxAdditions</code>); the schedule in <code>.github/workflows/deep-search.yml</code></td></tr><tr><td>The owner’s decisions (system file)</td><td><code>apply_curation()</code> in <code>agents/common.py</code>; the decisions themselves in <code>data/curation.json</code></td></tr><tr><td>Switching the agents off</td><td>The repository variable <code>AGENTS_ENABLED</code>: scheduled runs only happen when it is <code>true</code></td></tr></table>`],
 ['gates', 'Gates and safety', `<p><b>Gate 1</b> checks the schema, the tour rules, that mitigation references link to official publishers, and that no text contains markup. <b>Gate 2</b> checks that nothing was deleted and additions are within the limit. <b>Gate 3</b> loads the built app in a browser and checks it renders. Agents treat everything they read as data, never as instructions; keys stay in GitHub secrets.</p>`],
 ['narration', 'Narration, tours and voice', `<p>Narration lives in <code>data/tours.json</code> as templates: the walk-throughs, the chart insights, the question insights and both weekly analyses. The app fills every figure from live data and chooses each conclusion by rules, so the words can change weekly but the numbers cannot be invented. Recordings are keyed by a fingerprint of the exact sentence and voice; changed sentences are re-recorded by <code>tools/make_voice.py</code>, and the app falls back to the browser voice only if a recording never starts. In the walk-throughs, chart steps open a side panel on what the narration is discussing. A walk-through started from the welcome screen returns there; one started inside the app returns to where you were. Pronunciations (DESNZ, CAF, NERC, CIP, and row said as “roe”) are in <code>tours.json</code>.</p>`],
 ['data', 'The data model', `<p>Each milestone has a title, field and sub-field, origin, status (landed or outlook), research (year, what), change (first use: year, what), sources, verification (source-cited, AI-compiled or AI estimate), and optional readiness, GB status, security note, forecast record, AI levers and story. <code>flags</code> mark it disputed, hidden or retired; <code>provenance</code> records who added it, when, whether dates are approximate, and any second opinion. <code>flags.reviewed</code> records the owner’s review, with a fingerprint so it lapses if the record changes. For the whole dataset, <code>meta</code> keeps the change log, the research funnel, the catch-up record, the decisions applied, and pairs judged not to be duplicates.</p>`],
 ['curation', 'Views, My file, reviews and the system file', `<p><b>Start with a question</b> (welcome screen, or Views): questions the tool answers well, each setting up the panels, filters and chart with the answers listed, and its own insight, written weekly by the agents, with numbers you can select and a Speak button. <b>Open insights automatically</b> (Display, on by default) opens chart and question insights by themselves; a closed one stays closed until you move on. After acknowledging, the welcome screen signposts the three ways in: Learn (the tours), Start here (questions) and Jump right in (the tool). <b>⧉ New window</b> on any chart opens a full chart window: all the tabs, filters, zoom, tooltips, side panel and insight, with its own chart, as many as you like; closing one removes it. A milestone selected in any chart window opens in the one Details panel and is highlighted in every linked chart window; <b>🔗 Linked</b> switches a window to keep its own highlight. Chart windows are saved with My views and My file, and <b>Compare</b> (a ready-made view) sets out two side by side with the AI Energy Vision Radar. <b>Help</b> is a panel like the others; its “How it works” button opens this documentation, and “At a glance” the infographics.</p>
  <p><b>The toolbar:</b> Tours, Play the century, Views, Present, Share and Help. Chips appear while music, rotation, full screen or the ticker is on; 📌 in Present pins any item.</p>
  <p><b>My file</b> (Views → Save my file / Open my file) holds your views, settings, review marks, notes, My list, pins and kiosk options. The app keeps nothing in the browser unless Autosave is on (Display): then it keeps a connected file updated (Chrome or Edge on a computer) or a copy in this browser, written at once when the page closes. The sign beside Views shows anything unsaved.</p>
  <p><b>My views</b> are named arrangements with their own panels, positions, chart tab, filters and display settings. ☆ opens one at start; ⤓ exports one to share; old saved view files join My views when opened.</p>
  <p><b>Reviews:</b> “Mark as reviewed” in the Data inspector hides an item from your list, saved in My file. Each review keeps a fingerprint of the record (title, years, status, dispute, second opinion, QA note); if the agents change any of these, the review lapses and the item returns.</p>
  <p><b>Admin tools</b> (Display): decisions for everyone (reviewed, clear the dispute, not a duplicate, retire, restore) build the system file, <code>curation.json</code>. Upload it to <code>data/</code>; the QA agent applies each decision once, records it in Data changes, and the app shows it to everyone. Published reviews lapse the same way; “not a duplicate” pairs are never flagged again.</p>`],
 ['settings', 'Current settings (live)', `<div id="docSettings"><p class="note-s">Loading the agents' settings from config.json…</p></div>`],
 ['history', 'Recent changes', `<ul class="doclist"><li><b>12.5</b> Chart windows replace the pop-outs: any number of full chart windows, each with every control, linked selection with a 🔗 switch per window, saved with your views; a Compare ready-made view; the window manager handles panels created and removed after start-up.</li>
  <li><b>12.4</b> Speak becomes Stop while speaking, and Present has “Mute speech” for insights and walk-throughs together; QA replaces broken source links (only with a verified quote) and reclassifies in-lab records whose target falls inside the horizon; the AI levers and story agents ask once for a shorter answer rather than reject it; Gemini’s field names are understood; a release tag can no longer fail a run.</li>
  <li><b>12.3</b> Question insights (written weekly, read or spoken, with numbers you can select); insights open automatically, a setting in Display; the welcome screen’s signposts: Learn, Start here, Jump right in.</li>
  <li><b>12.2</b> Fixed: Pop out (and Insight) after “Run the tool”; chart controls are rebuilt only when they change, so clicks land while the century plays; a real-clicks test suite.</li>
  <li><b>12.1</b> Present and Share menus restyled; Help as a panel; the AI Energy Vision Radar; tours return to where they started, show chart details and keep panels hidden until placed; “row” pronounced; chart pop-outs; Start with a question; these documents reviewed; the at-a-glance infographics.</li>
  <li><b>12.0</b> The toolbar becomes Tours, Play the century, Views, Present, Share and Help, with status chips and pins; the Windows menu becomes Views and windows become panels; My file, with a save sign and autosave; My views, each with its own filters; reviews that lapse when a record changes; admin tools, and the system file’s new decisions (reviewed, clear a dispute, not a duplicate).</li>
  <li><b>11.8</b> Data inspector, this documentation, deep search agent, QA in batches, curation decisions, rejected candidates kept, window layering fix, test rig, schema fix for the “contradicted” verdict, tighter duplicate check.</li>
  <li><b>11.7</b> Recalibrated second opinion; duplicates across fields; per-field news logging.</li><li><b>11.6</b> Data changes grouped per item; possible duplicates.</li>
  <li><b>11.4–11.5</b> Gap-filling, three-year catch-up, research funnel, approximate years, PowerPoint on demand, version label.</li><li><b>11.0–11.3</b> Charts in tours, weekly analyses, stories, AI levers, two-model checks.</li></ul>`]];
function renderDocs(){
  if (!layout.docs || !layout.docs.open) return;
  const q = (INS.docQ || '').toLowerCase(), list = DOCS.filter(([, t, h]) => !q || (t + ' ' + h.replace(/<[^>]+>/g, ' ')).toLowerCase().includes(q));
  if (!$('docQ')) $('docBody').innerHTML = `<div class="cfilt"><input id="docQ" type="search" placeholder="Search the documentation"><button class="mini dvopen">📊 At a glance</button> <span class="note-s">Maintained with each material change · ${DOCS_UPDATED}</span></div><div id="docContent"></div>`;
  $('docContent').innerHTML = `<nav class="doctoc">${list.map(([id, t]) => `<a href="#" data-doc="${id}">${t}</a>`).join('')}</nav>${list.map(([id, t, h]) => `<details class="docsec" id="doc-${id}" ${q || id === 'overview' ? 'open' : ''}><summary>${t}</summary>${h}</details>`).join('') || '<p class="empty">Nothing matches.</p>'}`;
  const box = $('docSettings'); if (box && location.protocol.indexOf('http') === 0) fetch('agents/config.json', {cache:'no-cache'}).then(r => r.ok ? r.json() : null).then(c => {
    if (!c) { box.innerHTML = '<p class="note-s">Could not load config.json.</p>'; return; }
    const rows = []; const walk = (o, p) => Object.entries(o).forEach(([k, v]) => { if (k.startsWith('_')) return; if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, p + k + '.'); else rows.push([p + k, Array.isArray(v) ? v.join(', ') : String(v)]); });
    walk(c, ''); box.innerHTML = `<table class="doctab"><tr><th>Setting</th><th>Value</th></tr>${rows.map(([k, v]) => `<tr><td><code>${esc(k)}</code></td><td>${esc(v)}</td></tr>`).join('')}</table>`;
  }).catch(() => {});
}
$('docBody').addEventListener('input', e => { if (e.target.id === 'docQ') { INS.docQ = e.target.value; clearTimeout(INS.dt); INS.dt = setTimeout(renderDocs, 250); } });
$('docBody').addEventListener('click', e => { const a = e.target.closest('[data-doc]'); if (!a) return; e.preventDefault(); const d = $('doc-' + a.dataset.doc); if (d) { d.open = true; d.scrollIntoView({block:'start'}); } });
$('helpDocsBtn').onclick = () => { setOpen('docs', true); raise('docs'); };   // opens in front of Help

/* The inspector and documentation keep their footers clear of the player bar: when one opens and would reach into the
   bar's area, it moves up, and is shortened only if moving is not enough (never below 300 pixels). */
function clearOfPlayer(id){
  if (!layout[id] || !layout[id].open || !layout.player || !layout.player.open || wins[id].classList.contains('max')) return;
  const p = wins.player.getBoundingClientRect(), r = layout[id], limit = p.top - 8;
  if (p.width <= 0 || r.y + r.h <= limit) return;
  const tb = wins.toolbar.getBoundingClientRect(), top = layout.toolbar.open ? tb.bottom + 8 : 8;
  r.y = Math.max(top, Math.round(limit - r.h));                         // move it up first
  if (r.y + r.h > limit) r.h = Math.max(300, Math.round(limit - r.y));   // then shorten it if it still reaches the bar
  placeWin(id); raise(id);
}

/* ---------- reviews: personal (in My file) and published (applied by the agents from the system file) ----------
   Each review remembers a fingerprint of what mattered when it was made; if that changes, the review lapses. */
function hashStr(t){ let h = 5381; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
function rowSig(r){
  if (r.cat === 'duplicates' && r.pair) return hashStr(JSON.stringify(r.pair.map(it => [it.t, it.r, it.p])));
  if (r.cat === 'rejected') return hashStr(JSON.stringify([r.reason, r.date, r.title]));
  if (r.cat === 'pending') return hashStr(JSON.stringify([r.title, r.reason]));
  const m = r.rec || {}, f = m.flags || {}, p = m.provenance || {};
  return hashStr(JSON.stringify([m.title, (m.research || {}).year, (m.change || {}).year, m.status, !!f.disputed, !!f.hidden, (p.secondOpinion || {}).verdict || '', p.qaNote || '']));
}
function reviewState(r){
  const sig = rowSig(r), mine = INS.reviewed[r.id], pub = r.cat !== 'duplicates' && r.rec && r.rec.flags && r.rec.flags.reviewed;
  if (pub && pub.sig === sig) return {by:'owner', at:pub.date, note:pub.note || ''};
  if (mine) return mine.sig === sig ? {by:'you', at:mine.at, note:mine.note} : {lapsed:true, by:'you', at:mine.at};
  if (pub) return {lapsed:true, by:'owner', at:pub.date};
  return null;
}
function insActions(r){
  const isRec = DB.milestones.some(m => m.id === r.id), rv = r.rv, mine = INS.reviewed[r.id], adm = view.admin, b = (attrs, label, tip) => `<button class="mini" ${attrs}${tip ? ` title="${tip}"` : ''}>${label}</button>`;
  let h = '';
  if (r.pair) h += r.pair.map(it => b(`data-show="${it.id}"`, `Open “${esc(it.t.slice(0, 30))}”`)).join(' ') + ' ';
  else if (isRec) h += b(`data-show="${esc(r.id)}"`, 'Open its story') + ' ';
  h += mine ? b(`data-unreview="${esc(r.id)}"`, mine.sig === rowSig(r) ? 'Undo my review' : 'Clear my lapsed review') : b(`data-review="${esc(r.id)}"`, '✓ Mark as reviewed', 'Hidden from your list until something about it changes; saved in your file');
  h += ' ' + b(`data-mine="${esc(r.id)}"`, INS.mine.has(r.id) ? '★ In my list' : '☆ Add to my list');
  if (adm) {
    const pend = INS.decisions[r.id] ? ` <span class="insadmpend">In the system file: ${esc(INS.decisions[r.id])}</span>` : '';
    h += '<div class="insadm"><span class="insadmh">Admin, for everyone:</span> ';
    if (r.pair) h += b(`data-adm="not-duplicate" data-id="${esc(r.id)}"`, 'Not a duplicate') + ' ' + r.pair.map(it => b(`data-retire="${it.uid}" data-dupof="${(r.pair.find(x => x !== it) || {}).uid}"`, `Retire “${esc(it.t.slice(0, 24))}”`)).join(' ');
    else if (isRec) {
      h += b(`data-adm="reviewed" data-id="${esc(r.id)}"`, 'Reviewed', 'Published to everyone; the record is not changed');
      if (r.cat === 'disputed') h += ' ' + b(`data-adm="clear-dispute" data-id="${esc(r.id)}"`, 'Clear the dispute', 'You have checked it and accept the record as it stands');
      h += ' ' + (r.cat === 'retired' || r.cat === 'hidden' ? b(`data-restore="${esc(r.id)}"`, 'Restore') : b(`data-retire="${esc(r.id)}"`, 'Retire'));
    } else h += '<span class="note-s">Not yet in the data, so there is nothing to decide for everyone.</span>';
    h += pend + '</div>';
  }
  if (rv && !rv.lapsed) h += `<p class="note-s">Reviewed${rv.by === 'owner' ? ' by the owner' : ' by you'}${rv.at ? ' on ' + fmtDate(String(rv.at).slice(0, 10)) : ''}${rv.note ? ': ' + esc(rv.note) : '.'}</p>`;
  if (rv && rv.lapsed) h += `<p class="note-s">The ${rv.by === 'owner' ? 'owner’s' : ''} review${rv.at ? ' of ' + fmtDate(String(rv.at).slice(0, 10)) : ''} lapsed: the record has changed since.</p>`;
  return h;
}
