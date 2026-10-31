/* ==================================================================
 *  DATA INSPECTOR: everything in the dataset that is not on the main display (retired, hidden, disputed,
 *  only partly confirmed, waiting for QA, rejected by the agents, possible duplicates), with search, filters,
 *  the reasons, and decisions you can download as data/curation.json or as your own list.
 * ================================================================== */
const INS = {q:'', cats:new Set(['retired', 'disputed', 'unclear', 'pending', 'rejected', 'duplicates', 'hidden']), field:'', agent:'', since:'all', open:null, pending:null, rejected:null, curation:null, decisions:{}, mine:new Set(), limit:150};
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
  possibleDuplicatePairs().forEach(([a, b], k) => rows.push({cat:'duplicates', id:'dup-' + a.id + '-' + b.id, title:`${a.t} / ${b.t}`, field:a.v, ry:a.r, cy:a.p, refs:[], date:'', agent:'', reason:`Compare “${a.t}” (${a.r}–${a.p ?? '?'}) with “${b.t}” (${b.r}–${b.p ?? '?'}).`, pair:[a, b]}));
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
    const shown = all.filter(r => INS.cats.has(r.cat) && (!INS.field || r.field === INS.field) && (!INS.agent || String(r.agent || '').startsWith(INS.agent)) && (!since || !r.date || r.date >= since)
      && (!q || `${r.title} ${r.reason} ${r.fieldName} ${r.agent}`.toLowerCase().includes(q)));
    const count = c => all.filter(r => r.cat === c).length, agents = [...new Set(all.map(r => String(r.agent || '').split(' · ')[0]).filter(Boolean))].sort();
    if (!$('insQ')) $('insCtl').innerHTML = `<div class="cfilt"><input id="insQ" type="search" placeholder="Search titles, reasons, fields" value="${esc(INS.q)}">
      <select id="insField"><option value="">All fields</option>${FKEYS.filter(k => FIELDS[k] && !FIELDS[k].custom).map(k => `<option value="${k}"${INS.field === k ? ' selected' : ''}>${esc(FIELDS[k].name)}</option>`).join('')}</select>
      <select id="insAgent"><option value="">All agents</option>${agents.map(a => `<option${INS.agent === a ? ' selected' : ''}>${esc(a)}</option>`).join('')}</select>
      <select id="insSince">${[['all', 'Any date'], ['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days']].map(([v, n]) => `<option value="${v}"${INS.since === v ? ' selected' : ''}>${n}</option>`).join('')}</select></div>
      <div class="inscats">${Object.entries(INS_CATS).map(([k, [n, , col]]) => `<button data-cat="${k}" class="${INS.cats.has(k) ? 'on' : ''}" style="--c:${col}">${n} <b>${count(k)}</b></button>`).join('')}</div>
      ${location.protocol.indexOf('http') !== 0 ? '<p class="note-s">Offline copy: the queue and the rejected candidates are only available online.</p>' : ''}`;
    $('insCtl').querySelectorAll('[data-cat]').forEach(btn => { const k = btn.dataset.cat; btn.classList.toggle('on', INS.cats.has(k)); btn.querySelector('b').textContent = count(k); });
    $('insList').innerHTML = shown.length ? shown.slice(0, INS.limit).map(r => {
      const [cn, why, col] = INS_CATS[r.cat], open = INS.open === r.id, dec = INS.decisions[r.id];
      return `<div class="insrow${open ? ' open' : ''}" data-row="${esc(r.id)}"><div class="inshead"><span class="inscat" style="--c:${col}">${cn}</span><b>${esc(r.title)}</b><em>${esc(r.fieldName)}${r.ry ? ` · ${r.ry}–${r.cy ?? '?'}` : ''}${r.date ? ' · ' + fmtDate(r.date, 'short') : ''}</em>${INS.mine.has(r.id) ? '<i class="insmine">★</i>' : ''}${dec ? `<i class="insdec">${dec}</i>` : ''}</div>
        <div class="insreason">${esc(r.reason || '')}</div>
        ${open ? `<div class="insbody"><p class="note-s">${why}</p><dl class="csdl">${r.agent ? `<dt>Found by</dt><dd>${esc(r.agent)}</dd>` : ''}${r.status ? `<dt>Status</dt><dd>${esc(r.status)}</dd>` : ''}
          ${r.rec && (r.rec.research_what || (r.rec.research || {}).what) ? `<dt>Research</dt><dd>${esc(r.rec.research_what || r.rec.research.what)}${r.rec.research_origin ? ' <span class="note-s">Origin: ' + esc(r.rec.research_origin) + '</span>' : ''}</dd>` : ''}
          ${r.rec && (r.rec.change_what || (r.rec.change || {}).what) ? `<dt>First use</dt><dd>${esc(r.rec.change_what || r.rec.change.what)}</dd>` : ''}
          ${r.refs.length ? `<dt>Sources</dt><dd>${r.refs.map(u => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\//, '').slice(0, 60))}</a>`).join('<br>')}</dd>` : ''}</dl>
          <div class="insact">${r.pair ? r.pair.map(it => `<button class="mini" data-show="${it.id}">Open “${esc(it.t.slice(0, 30))}”</button> <button class="mini" data-retire="${it.id}" data-dupof="${(r.pair.find(x => x !== it) || {}).id}">Retire this one</button>`).join(' ')
            : `${r.cat === 'retired' || r.cat === 'hidden' ? `<button class="mini" data-restore="${esc(r.id)}">Restore</button>` : ''}${['disputed', 'unclear'].includes(r.cat) ? `<button class="mini" data-retire="${esc(r.id)}">Retire</button> <button class="mini" data-keep="${esc(r.id)}">Keep</button>` : ''}
              ${DB.milestones.some(m => m.id === r.id) ? `<button class="mini" data-show="${esc(r.id)}">Open its story</button>` : ''}`}
            <button class="mini" data-mine="${esc(r.id)}">${INS.mine.has(r.id) ? '★ In my list' : '☆ Add to my list'}</button></div></div>` : ''}</div>`; }).join('') + (shown.length > INS.limit ? `<button class="mini" id="insMore">Show more (${shown.length - INS.limit} hidden)</button>` : '')
      : '<p class="empty">Nothing matches these filters.</p>';
    $('insFoot').innerHTML = `<span class="note-s">${shown.length} of ${all.length} items. Select a row for the details.</span> <button class="mini" id="insMineDl"${INS.mine.size ? '' : ' disabled'}>Download my list (${INS.mine.size})</button>
      <button class="mini" id="insCurDl"${Object.keys(INS.decisions).length ? '' : ' disabled'}>Download curation.json (${Object.keys(INS.decisions).length} decision${Object.keys(INS.decisions).length === 1 ? '' : 's'})</button>`;
  });
}
$('insBody').addEventListener('input', e => { if (e.target.id === 'insQ') { INS.q = e.target.value; clearTimeout(INS.t); INS.t = setTimeout(renderInspector, 200); } });
$('insBody').addEventListener('change', e => { if (e.target.id === 'insField') INS.field = e.target.value; if (e.target.id === 'insAgent') INS.agent = e.target.value; if (e.target.id === 'insSince') INS.since = e.target.value; renderInspector(); });
$('insBody').addEventListener('click', e => {
  const t = e.target, cat = t.closest('[data-cat]');
  if (cat) { const k = cat.dataset.cat; INS.cats.has(k) ? INS.cats.delete(k) : INS.cats.add(k); renderInspector(); return; }
  if (t.id === 'insMore') { INS.limit += 150; renderInspector(); return; }
  const decide = (id, action, extra) => { INS.decisions[id] = action; INS.extra = INS.extra || {}; INS.extra[id] = extra || {}; renderInspector(); toast(`Marked to ${action}. Download curation.json to apply it.`); };
  if (t.dataset.retire) { decide(t.dataset.retire, 'retire', t.dataset.dupof ? {duplicateOf:t.dataset.dupof, reason:'Duplicate of ' + ((items.find(x => x.id == t.dataset.dupof) || {}).t || t.dataset.dupof)} : {}); return; }
  if (t.dataset.restore) { decide(t.dataset.restore, 'restore'); return; }
  if (t.dataset.keep) { decide(t.dataset.keep, 'keep'); return; }
  if (t.dataset.mine) { INS.mine.has(t.dataset.mine) ? INS.mine.delete(t.dataset.mine) : INS.mine.add(t.dataset.mine); renderInspector(); return; }
  if (t.dataset.show) { const it = items.find(x => x.id == t.dataset.show); if (it) { hidden.delete(it.id); openDetail(it); setOpen('details', true); } return; }
  if (t.id === 'insMineDl') { const all = insRows().filter(r => INS.mine.has(r.id)).map(({pair, rec, ...r}) => Object.assign(r, {record:rec || null}));
    saveBlob(new Blob([JSON.stringify({saved:new Date().toISOString(), dataRevision:DB.meta.revision, items:all}, null, 1)], {type:'application/json'}), `my-research-list-${stamp()}.json`); return; }
  if (t.id === 'insCurDl') { const cur = JSON.parse(JSON.stringify(INS.curation || {decisions:[]})); cur.decisions = cur.decisions || [];
    Object.entries(INS.decisions).forEach(([id, action]) => { if (action === 'keep') return; cur.decisions.push(Object.assign({id, action, reason:(INS.extra[id] || {}).reason || (action === 'retire' ? 'Retired after review in the Data inspector.' : 'Restored after review in the Data inspector.'), date:new Date().toISOString().slice(0, 10)}, (INS.extra[id] || {}).duplicateOf ? {duplicateOf:INS.extra[id].duplicateOf} : {})); });
    saveBlob(new Blob([JSON.stringify(cur, null, 1)], {type:'application/json'}), 'curation.json'); toast('Upload curation.json to the data folder in GitHub; the next weekly run applies it.'); return; }
  const row = t.closest('[data-row]'); if (row && !t.closest('a, button')) { INS.open = INS.open === row.dataset.row ? null : row.dataset.row; renderInspector(); }
});
/* ==================================================================
 *  HOW IT WORKS: documentation of the app, its files, workflows and agents. Maintained with each material change.
 * ================================================================== */
const DOCS_UPDATED = 'Version 11.8, 1 November 2026';   // update with every material change
const DOCS = [
 ['overview', 'Overview', `<p>The Shrinking Gap measures how long research takes to become real-world change, and whether AI is shortening the journey. It is run by AI agents with no human in the loop, using public sources only.</p>
  <p><b>The flow:</b> AI agents (GitHub Actions, weekly) research, check and correct <code>data/data.json</code> → safety gates → <code>tools/build.py</code> assembles <code>index.html</code> from <code>src/</code> with the data embedded → GitHub Pages publishes it. Your uploads to <code>src/</code> trigger the same build.</p>`],
 ['files', 'Files and folders', `<table class="doctab"><tr><th>Path</th><th>What it is</th></tr>
  <tr><td><code>index.html</code></td><td>The built app (generated; never edit by hand).</td></tr>
  <tr><td><code>src/index.html</code></td><td>The page template: markup with include markers that the build replaces with the CSS and JavaScript.</td></tr>
  <tr><td><code>src/styles/app.css</code></td><td>All styles.</td></tr>
  <tr><td><code>src/js/NN-*.js</code></td><td>The app's code in numbered sections, assembled in order: data loading (01), state (02), the 3D scene, window manager (07), arrangements (08), Windows menu (09), details (12), reports (21), data changes (22), data quality (27), help (28), cyber lens and readiness (29), tours (31), kiosk and image export (31b), data export (31c), charts (31d), insights and weekly analyses (31e), this inspector and documentation (31f), saved views (32), start-up (36).</td></tr>
  <tr><td><code>src/vendor/</code></td><td>Fonts and libraries (three.js, PptxGenJS loaded on demand, QR code).</td></tr>
  <tr><td><code>data/data.json</code></td><td>The dataset: milestones, fortunes, guidance, change log, funnel and settings history.</td></tr>
  <tr><td><code>data/schema.json</code></td><td>The rules the data must follow (checked by Gate 1).</td></tr>
  <tr><td><code>data/tours.json</code></td><td>Narration templates for the walk-throughs and chart insights (refreshed weekly by the tour agent).</td></tr>
  <tr><td><code>data/pending.json</code></td><td>Candidates waiting for QA.</td></tr>
  <tr><td><code>data/rejected.json</code></td><td>The last 800 rejected candidates and why (for this inspector).</td></tr>
  <tr><td><code>data/curation.json</code></td><td>Your retire and restore decisions, applied by the QA agent.</td></tr>
  <tr><td><code>agents/</code></td><td>The agents (Python) and <code>config.json</code>, which holds every limit and setting.</td></tr>
  <tr><td><code>tools/</code></td><td>build, validate (Gate 1), change_guard (Gate 2), smoke_test (Gate 3), make_voice, digest, run_summary.</td></tr>
  <tr><td><code>.github/workflows/</code></td><td>data-agents.yml (weekly), deep-search.yml (manual and six-monthly), build.yml (on upload), tests.yml (by hand only).</td></tr>
  <tr><td><code>tests/</code></td><td>The test rig: the agents' guardrail tests (offline, simulated answers) and the browser suites. Run only by hand.</td></tr>
  <tr><td><code>audio/</code></td><td>Recorded narration (Azure voice) and its index.</td></tr></table>`],
 ['workflows', 'Workflows', `<p><b>Weekly data agents</b> (Mondays 06:00 UTC, or by hand): remember the starting data → research agent → Gemini research → QA agent (also applies curation) → Gemini second opinion → guidance agent → tour agent → AI levers agent → story agent → Gate 1 (schema and rules) → Gate 2 (nothing deleted, additions within limits) → build → Gate 3 (the app loads) → voice → publish (if the repository moved on, this run's data is laid on top whole; if the data itself changed meanwhile, it stops and keeps its results as an artifact) → weekly digest issue.</p>
  <p><b>Deep search</b> (by hand, and 1 January and 1 July): the deep search agent replaces the weekly research steps; then QA, the second opinion, the gates and publishing as above, with a higher limit for that run only.</p>
  <p><b>Build the app</b> (when <code>src/</code>, <code>tools/build.py</code> or <code>data/tours.json</code> change): build, validate, smoke test, publish the new <code>index.html</code>, retrying against the latest files.</p><p><b>Test suite</b> (by hand only: Actions → Test suite): builds the app from the current source, then runs the agents' guardrail tests and the browser suites. It never publishes and makes no API calls.</p>`],
 ['agents', 'The agents and their rules', `<table class="doctab"><tr><th>Agent</th><th>Does</th><th>Rules</th></tr>
  <tr><td>Research (Claude)</td><td>Recent news (45-day window), a three-year catch-up sweep (field by quarter), and gap-filling (thinnest field-and-decade cells).</td><td>Two independent sources; the facts found on both pages; years in order from 1925 (approximate years accepted and marked); a research origin; no duplicates (titles, or one inside another with close years, across fields). Separate allowances for news, catch-up and gap-filling; 5 reserved for AI for clean energy.</td></tr>
  <tr><td>Gemini research</td><td>Up to 10 a week from Google search, aimed at the UK, Europe, Asia and other languages, and thin cells.</td><td>The same checks; Claude's QA must confirm.</td></tr>
  <tr><td>QA (Claude)</td><td>Confirms candidates independently in batches; audits a rotating batch of existing records; applies curation.json.</td><td>Searches for its own sources; never deletes; disputes rather than removes.</td></tr>
  <tr><td>Gemini second opinion</td><td>Checks Claude's additions (weekly and deep search) against the source pages.</td><td>Essentials only (it happened; both years right to within one). Only a contradiction disputes; thin pages give "unclear".</td></tr>
  <tr><td>Guidance</td><td>New and updated security guidance, CAF and Ofgem first.</td><td>Official sources only.</td></tr>
  <tr><td>Tour</td><td>Rewords the walk-throughs, chart insights and both weekly analyses.</td><td>Figures only through placeholders; every conclusion variant kept; word limits; no doubled words or repeated steps; wording must fit what is on screen; refers to "AI for clean energy".</td></tr>
  <tr><td>AI levers</td><td>Researches what holds each projected technology up and which AI levers apply.</td><td>Fixed lists of levers and phases; quotes verified on the page.</td></tr>
  <tr><td>Story</td><td>Research → first use → impact, most recent first.</td><td>Short fields; quotes verified on the page.</td></tr>
  <tr><td>Deep search</td><td>Worldwide, multi-language sweep of the last 10 and next 10 years; aims for 200+ and 50+ for clean energy.</td><td>The same checks; then QA, the second opinion and the gates.</td></tr></table>`],
 ['rules', 'Where each rule lives', `<p class="note-s">When you want an agent to behave differently, this is where the rule lives. Settings in <code>config.json</code> can be changed directly; changes to code are best made with Claude, then checked with the test suite.</p><table class="doctab"><tr><th>Rule</th><th>Where it lives</th></tr><tr><td>Two independent sources, facts found on both pages</td><td><code>agents/config.json</code> → <code>research.minSources</code>; the page check is <code>check()</code> in <code>agents/research_agent.py</code></td></tr><tr><td>Years: from 1925, in order, approximate years accepted</td><td><code>check()</code> and <code>read_year()</code> in <code>agents/research_agent.py</code>; the start year is <code>meta.startYear</code> in <code>data/data.json</code></td></tr><tr><td>Duplicates</td><td><code>near_duplicate()</code> in <code>agents/research_agent.py</code> (word overlap with two or more key words, and one title inside another with years within five); <code>is_duplicate()</code> in <code>agents/common.py</code></td></tr><tr><td>How many additions a week, and from where</td><td><code>publish.maxAdditionsPerRun</code>, <code>claudeAdditionsPerRun</code>, <code>reservedForVision</code>; <code>research.catchup.perRun</code>, <code>research.backfill.perRun</code>; <code>gemini.researchPerRun</code> (all in <code>config.json</code>)</td></tr><tr><td>Search windows</td><td><code>research.lookbackDays</code> (news), <code>research.catchup.monthsBack</code> (catch-up); gap-filling cells in <code>thin_cells()</code></td></tr><tr><td>QA: what it confirms and how many corrections</td><td><code>agents/qa_agent.py</code>; <code>publish.maxCorrectionsPerRun</code> in <code>config.json</code></td></tr><tr><td>The second opinion: what counts as supported</td><td>The prompt and <code>RULES</code> version in <code>agents/gemini_check.py</code> (raising <code>RULES</code> re-checks earlier verdicts once)</td></tr><tr><td>Narration: placeholders, word limits, banned wording</td><td><code>agents/tour_rules.py</code> (the tour agent cannot change these)</td></tr><tr><td>Gates</td><td><code>tools/validate.py</code> and <code>data/schema.json</code> (Gate 1), <code>tools/change_guard.py</code> (Gate 2), <code>tools/smoke_test.py</code> (Gate 3)</td></tr><tr><td>Deep search: targets and cost bounds</td><td><code>deepSearch</code> in <code>config.json</code> (<code>targetTotal</code>, <code>targetClean</code>, <code>maxCalls</code>, <code>searchesPerCall</code>, <code>maxAdditions</code>); the schedule in <code>.github/workflows/deep-search.yml</code></td></tr><tr><td>Switching the agents off</td><td>The repository variable <code>AGENTS_ENABLED</code>: scheduled runs only happen when it is <code>true</code></td></tr></table>`],
 ['gates', 'Gates and safety', `<p><b>Gate 1</b> checks the schema, the tour rules, that mitigation references link to official publishers, and that no text contains markup. <b>Gate 2</b> checks that nothing was deleted and additions are within the limit. <b>Gate 3</b> loads the built app in a browser and checks it renders. Agents treat everything they read as data, never as instructions; keys stay in GitHub secrets.</p>`],
 ['narration', 'Narration, tours and voice', `<p>Narration lives in <code>data/tours.json</code> as templates. The app fills every figure from live data and chooses each conclusion by rules, so the words can change weekly but the numbers cannot be invented. Recordings are keyed by a fingerprint of the exact sentence and voice; changed sentences are re-recorded by <code>tools/make_voice.py</code>, and the app falls back to the browser voice only if a recording never starts. Pronunciations (DESNZ, CAF, NERC, CIP) are in <code>tours.json</code>.</p>`],
 ['data', 'The data model', `<p>Each milestone has a title, field and sub-field, origin, status (landed or outlook), research (year, what), change (first use: year, what), sources, verification (source-cited, AI-compiled or AI estimate), and optional readiness, GB status, security note, forecast record, AI levers and story. <code>flags</code> mark it disputed, hidden or retired; <code>provenance</code> records who added it, when, whether dates are approximate, and any second opinion.</p>`],
 ['curation', 'Curation and the Data inspector', `<p>The Data inspector lists what is not on the display. Mark items to retire, restore or keep, then download <code>curation.json</code> and upload it to <code>data/</code>; the QA agent applies each decision once on the next run (retiring hides a record, never deletes it). "Add to my list" builds your own research file.</p>`],
 ['settings', 'Current settings (live)', `<div id="docSettings"><p class="note-s">Loading the agents' settings from config.json…</p></div>`],
 ['history', 'Recent changes', `<ul class="doclist"><li><b>11.8</b> Data inspector, this documentation, deep search agent, QA in batches, curation decisions, rejected candidates kept, window layering fix, test rig, schema fix for the “contradicted” verdict, tighter duplicate check.</li>
  <li><b>11.7</b> Recalibrated second opinion; duplicates across fields; per-field news logging.</li><li><b>11.6</b> Data changes grouped per item; possible duplicates.</li>
  <li><b>11.4–11.5</b> Gap-filling, three-year catch-up, research funnel, approximate years, PowerPoint on demand, version label.</li><li><b>11.0–11.3</b> Charts in tours, weekly analyses, stories, AI levers, two-model checks.</li></ul>`]];
function renderDocs(){
  if (!layout.docs || !layout.docs.open) return;
  const q = (INS.docQ || '').toLowerCase(), list = DOCS.filter(([, t, h]) => !q || (t + ' ' + h.replace(/<[^>]+>/g, ' ')).toLowerCase().includes(q));
  if (!$('docQ')) $('docBody').innerHTML = `<div class="cfilt"><input id="docQ" type="search" placeholder="Search the documentation"><span class="note-s">Maintained with each material change · ${DOCS_UPDATED}</span></div><div id="docContent"></div>`;
  $('docContent').innerHTML = `<nav class="doctoc">${list.map(([id, t]) => `<a href="#" data-doc="${id}">${t}</a>`).join('')}</nav>${list.map(([id, t, h]) => `<details class="docsec" id="doc-${id}" ${q || id === 'overview' ? 'open' : ''}><summary>${t}</summary>${h}</details>`).join('') || '<p class="empty">Nothing matches.</p>'}`;
  const box = $('docSettings'); if (box && location.protocol.indexOf('http') === 0) fetch('agents/config.json', {cache:'no-cache'}).then(r => r.ok ? r.json() : null).then(c => {
    if (!c) { box.innerHTML = '<p class="note-s">Could not load config.json.</p>'; return; }
    const rows = []; const walk = (o, p) => Object.entries(o).forEach(([k, v]) => { if (k.startsWith('_')) return; if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, p + k + '.'); else rows.push([p + k, Array.isArray(v) ? v.join(', ') : String(v)]); });
    walk(c, ''); box.innerHTML = `<table class="doctab"><tr><th>Setting</th><th>Value</th></tr>${rows.map(([k, v]) => `<tr><td><code>${esc(k)}</code></td><td>${esc(v)}</td></tr>`).join('')}</table>`;
  }).catch(() => {});
}
$('docBody').addEventListener('input', e => { if (e.target.id === 'docQ') { INS.docQ = e.target.value; clearTimeout(INS.dt); INS.dt = setTimeout(renderDocs, 250); } });
$('docBody').addEventListener('click', e => { const a = e.target.closest('[data-doc]'); if (!a) return; e.preventDefault(); const d = $('doc-' + a.dataset.doc); if (d) { d.open = true; d.scrollIntoView({block:'start'}); } });
$('helpDocsBtn').onclick = () => { $('about').classList.remove('on'); setOpen('docs', true); };

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
