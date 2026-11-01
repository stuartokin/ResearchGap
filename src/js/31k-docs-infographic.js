/* ==================================================================
 *  HOW IT WORKS: AT A GLANCE. Four interactive diagrams (the system, the weekly run, the agents and their rules, your
 *  files and decisions). Select any box for its explanation; limits are read live from agents/config.json, and the
 *  candidate journey uses the last 30 days of the research funnel. Kept in step with the documentation.
 * ================================================================== */
const DV = {tab:'system', sel:'research', cfg:null};
const DV_TABS = [['system', 'The system'], ['run', 'The weekly run'], ['agents', 'Agents and their rules'], ['files', 'Your files and decisions']];
const c = (path, dflt) => { let v = DV.cfg; for (const k of path.split('.')) v = v && v[k]; return v == null ? dflt : v; };
const DV_NODES = {
  web:{t:'Public sources', k:'source', d:'News, journals, company and university pages, official publications. Everything the agents read is treated as data, never as instructions.'},
  google:{t:'Google Search (via Gemini)', k:'source', d:'Gemini searches with Google, which reaches different sources, including other languages, from Claude’s own search.'},
  research:{t:'Research agent (Claude)', k:'agent', where:'agents/research_agent.py', d:() => `Recent news over the last ${c('research.lookbackDays', 45)} days; a catch-up sweep of the last three years (${c('research.catchup.sweepsPerRun', 6)} field-and-quarter slots a week); and gap-filling in the thinnest field-and-decade cells (${c('research.backfill.cellsPerRun', 5)} a week). Up to ${c('publish.claudeAdditionsPerRun', 15)} from news, ${c('research.catchup.perRun', 5)} from catch-up and ${c('research.backfill.perRun', 5)} from gap-filling; ${c('publish.reservedForVision', 5)} reserved for AI for clean energy. Monthly, new fortunes too.`,
    rules:['Two independent sources', 'The key facts found on both pages', 'Years in order, from 1925 (approximate years accepted and marked)', 'An identifiable research origin', 'Not a duplicate, across fields']},
  gemini:{t:'Gemini research', k:'agent', where:'agents/gemini_research.py', d:() => `Up to ${c('gemini.researchPerRun', 10)} a week, aimed at the UK, Europe, Asia and other languages, and at thin cells. Model: ${c('gemini.model', 'a Flash model')} (the newest Flash model if that one is retired).`, rules:['The same checks as Claude’s finds', 'Claude’s QA must confirm every one']},
  deep:{t:'Deep search', k:'agent', where:'agents/deep_search.py', d:() => `By hand, and on 1 January and 1 July: a worldwide, multi-language sweep of the last 10 and next 10 years, aiming for ${c('deepSearch.targetTotal', 200)}+ milestones and ${c('deepSearch.targetClean', 50)}+ for AI in clean energy, within ${c('deepSearch.maxCalls', 100)} searches.`, rules:['The same checks', 'Then QA, the second opinion and the gates', 'Stops early once both targets are met']},
  qa:{t:'QA agent (Claude)', k:'check', where:'agents/qa_agent.py', d:'Confirms each candidate independently, in batches, finding its own sources. Audits a rotating batch of existing records. Applies the owner’s decisions from the system file, each once.', rules:['Never deletes: doubtful records are disputed', 'Corrections within the weekly limit']},
  second:{t:'Gemini second opinion', k:'check', where:'agents/gemini_check.py', d:() => `Reads the parts of each source page about the milestone and checks only the essentials: that it happened, and that both years are right to within one. Up to ${c('gemini.checksPerRun', 20)} a week.`, rules:['Only a contradiction disputes', 'Thin pages give “unclear”, recorded but not disputed']},
  guidance:{t:'Guidance agent', k:'enrich', where:'agents/guidance_agent.py', d:'Finds new and updated security guidance, the CAF and Ofgem first.', rules:['Official sources only']},
  tour:{t:'Tour agent', k:'enrich', where:'agents/tour_agent.py; rules in agents/tour_rules.py', d:'Rewords the walk-throughs, chart insights and both weekly analyses; writes the weekly analyses fresh each week.', rules:['Figures only through placeholders', 'Every conclusion variant kept', 'Word limits; no doubled words or repeated steps', 'Wording must fit what is on screen', 'Says Views, panels, the AI Energy Vision Radar and AI for clean energy']},
  levers:{t:'AI levers agent', k:'enrich', where:'agents/levers_agent.py', d:() => `Researches what holds each projected technology up and which AI levers apply: ${c('levers.perRun', 8)} a week, refreshed every ${c('levers.refreshDays', 90)} days.`, rules:['Fixed lists of levers and phases', 'Quotes verified on the page']},
  story:{t:'Story agent', k:'enrich', where:'agents/story_agent.py', d:() => `Research → first use → impact, most recent first: ${c('stories.perRun', 10)} a week.`, rules:['Short fields', 'Quotes verified on the page']},
  gate1:{t:'Gate 1: the rules', k:'gate', where:'tools/validate.py, data/schema.json', d:'The schema, the tour rules, official links for mitigations, and no markup in any text. If it fails, nothing is published.'},
  gate2:{t:'Gate 2: nothing deleted', k:'gate', where:'tools/change_guard.py', d:() => `Nothing deleted, and additions within the limit (${c('publish.maxAdditionsPerRun', 35)} a week; higher for a deep search). If it fails, nothing is published.`},
  gate3:{t:'Gate 3: the app works', k:'gate', where:'tools/smoke_test.py', d:'Loads the built app in a browser and checks it renders the new data. If it fails, nothing is published.'},
  data:{t:'The data', k:'store', where:'data/', d:'data.json (milestones, fortunes, guidance, change log), tours.json (narration), curation.json (the system file), pending.json and rejected.json, and the recorded narration in audio/.'},
  pages:{t:'GitHub Pages', k:'store', where:'.github/workflows/build.yml', d:'The built page, index.html, assembled from src/ with the data embedded, published for anyone to open.'},
  app:{t:'The app', k:'app', d:'The 3D model, panels, charts, walk-throughs, questions, the Data inspector and these documents. It keeps nothing in the browser unless you turn on autosave.'},
  myfile:{t:'My file (yours)', k:'you', d:'Your views, settings, review marks, notes, My list, pins and kiosk options. Saved and opened from Views; works on any device.'},
  system:{t:'System file (admin)', k:'you', where:'data/curation.json', d:'Your decisions for everyone: reviewed, clear a dispute, not a duplicate, retire or restore. Upload it to data/; the QA agent applies each decision once on the next weekly run.'}
};
const DV_COLS = [['Public sources', ['web', 'google']], ['Find', ['research', 'gemini', 'deep']], ['Check', ['qa', 'second']], ['Enrich', ['guidance', 'tour', 'levers', 'story']], ['Safety gates', ['gate1', 'gate2', 'gate3']], ['Publish', ['data', 'pages']], ['Use', ['app', 'myfile', 'system']]];
const DV_RUN = [
  ['setup', 'Remember the starting data', 'A fingerprint of the data, so publishing never overwrites someone else’s change.'],
  ['agent', 'Deeper audit', 'First Monday of the month: a wider audit of existing records, and fortunes research.', 'monthly'],
  ['agent', 'Research agent', 'News, catch-up and gap-filling, through the source checks.', '', 'research'],
  ['agent', 'Gemini research', 'Up to 10 more candidates from Google search.', 'never blocks', 'gemini'],
  ['check', 'QA agent', 'Confirms candidates, audits records, applies your decisions.', '', 'qa'],
  ['check', 'Gemini second opinion', 'Checks Claude’s additions; only a contradiction disputes.', 'never blocks', 'second'],
  ['agent', 'Guidance agent', 'New and updated security guidance.', '', 'guidance'],
  ['agent', 'Tour agent', 'Narration within fixed rules; both weekly analyses.', '', 'tour'],
  ['agent', 'AI levers agent', 'What would speed each projected technology.', 'never blocks', 'levers'],
  ['agent', 'Story agent', 'Research, first use and impact.', 'never blocks', 'story'],
  ['gate', 'Gate 1: the rules', 'Schema, tour rules, links, no markup.', 'stops publishing', 'gate1'],
  ['gate', 'Gate 2: nothing deleted', 'No deletions; additions within the limit.', 'stops publishing', 'gate2'],
  ['build', 'Build', 'Assembles index.html with the data embedded.'],
  ['gate', 'Gate 3: the app works', 'Loads and renders in a browser.', 'stops publishing', 'gate3'],
  ['build', 'Voice', 'Records changed narration.', 'never blocks'],
  ['publish', 'Publish', 'Commits the new data; if the data changed meanwhile, keeps the results as an artifact instead.'],
  ['report', 'Weekly digest', 'A GitHub issue, which also emails you; monthly, the AI for clean energy digest.']];
function dvFunnel(){
  const since = new Date(new Date(DATA_AS_OF + 'T12:00:00Z') - 30 * 864e5).toISOString().slice(0, 10), f = (DB.meta.researchFunnel || []).filter(e => e.date >= since);
  const sum = (pred, k) => f.filter(pred).reduce((a, e) => a + Object.keys(e).filter(x => x.endsWith(k)).reduce((b, x) => b + (+e[x] || 0), 0), 0);
  const proposed = sum(e => e.agent !== 'qa', '_proposed'), passed = sum(e => e.agent !== 'qa', '_queued'), confirmed = f.filter(e => e.agent === 'qa').reduce((a, e) => a + (e.confirmed_claude || 0) + (e.confirmed_gemini || 0), 0);
  const so = (DB.meta.secondOpinion || []).filter(e => e.date >= since && e.kind === 'gemini-check'), disputed = so.reduce((a, e) => a + (e.not_supported || 0), 0);
  const steps = [['Proposed by the agents', proposed], ['Passed the source checks', passed], ['Confirmed by QA', confirmed], ['Published undisputed', Math.max(0, confirmed - disputed)]], max = Math.max(1, ...steps.map(s => s[1]));
  if (!steps.some(x => x[1])) return '<div class="dvfun"><h4>A candidate’s journey, last 30 days</h4><p class="note-s">No research has been recorded in the last 30 days of this data yet. After the next weekly run, this shows how many candidates were proposed, passed the source checks, were confirmed by QA and were published undisputed.</p></div>';
  return `<div class="dvfun"><h4>A candidate’s journey, last 30 days</h4>${steps.map(([n, v], i) => `<div class="dvfrow"><span>${n}</span><i style="width:${Math.max(2, v / max * 100)}%;opacity:${1 - i * .15}"></i><b>${v}</b></div>`).join('')}<p class="note-s">From the research funnel recorded by the agents. Rejections and their reasons are in the Data inspector.</p></div>`;
}
function dvDetail(id){
  const n = DV_NODES[id]; if (!n) return '<p class="note-s">Select any box for its explanation.</p>';
  const d = typeof n.d === 'function' ? n.d() : n.d;
  return `<h4><span class="dvk dvk-${n.k}"></span>${esc(n.t)}</h4><p>${esc(d)}</p>${n.rules ? `<p class="dvsub">Rules</p><ul>${n.rules.map(r => `<li>${esc(r)}</li>`).join('')}</ul>` : ''}${n.where ? `<p class="dvsub">Where it lives</p><p><code>${esc(n.where)}</code></p>` : ''}`;
}
function renderDocViz(){
  if (!layout.docviz || !layout.docviz.open) return;
  if (!DV.cfg && location.protocol.indexOf('http') === 0) fetch('agents/config.json', {cache:'no-cache'}).then(r => r.ok ? r.json() : null).then(cf => { if (cf) { DV.cfg = cf; renderDocViz(); } }).catch(() => {});
  let main = '';
  if (DV.tab === 'system') main = `<div class="dvmap">${DV_COLS.map(([h, ids], i) => `<div class="dvcol"><h5>${h}</h5>${ids.map(id => `<button class="dvn dvk-${DV_NODES[id].k}${DV.sel === id ? ' on' : ''}" data-n="${id}">${esc(DV_NODES[id].t)}</button>`).join('')}</div>${i < DV_COLS.length - 1 ? '<div class="dvarrow" aria-hidden="true">→</div>' : ''}`).join('')}</div>
    <p class="note-s">The system file feeds your decisions back to the QA agent on the next weekly run. Select any box.</p>`;
  else if (DV.tab === 'run') main = `<ol class="dvrun">${DV_RUN.map(([k, t, d, flag, node]) => `<li class="dvstep dvk-${k}${node && DV.sel === node ? ' on' : ''}" ${node ? `data-n="${node}"` : ''}><span class="dvdot"></span><b>${esc(t)}</b>${flag ? ` <em class="dvflag">${esc(flag)}</em>` : ''}<span>${esc(d)}</span></li>`).join('')}</ol>
    <p class="note-s">Mondays at 06:00 UTC, or by hand. A deep search (1 January, 1 July, or by hand) runs the same checks and gates with its own search step.</p>`;
  else if (DV.tab === 'agents') main = `<div class="dvcards">${['research', 'gemini', 'deep', 'qa', 'second', 'guidance', 'tour', 'levers', 'story'].map(id => `<button class="dvcard dvk-${DV_NODES[id].k}${DV.sel === id ? ' on' : ''}" data-n="${id}"><b>${esc(DV_NODES[id].t)}</b><span>${(DV_NODES[id].rules || []).length} rule${(DV_NODES[id].rules || []).length === 1 ? '' : 's'}</span></button>`).join('')}</div>${dvFunnel()}`;
  else main = `<div class="dvfiles"><div class="dvlane"><h5>Personal</h5><button class="dvn dvk-you${DV.sel === 'myfile' ? ' on' : ''}" data-n="myfile">My file</button><div class="dvarrow">⇄</div><button class="dvn dvk-app${DV.sel === 'app' ? ' on' : ''}" data-n="app">The app on any device</button></div>
    <div class="dvlane"><h5>For everyone (admin)</h5><button class="dvn dvk-you${DV.sel === 'system' ? ' on' : ''}" data-n="system">System file</button><div class="dvarrow">→</div><button class="dvn dvk-store${DV.sel === 'data' ? ' on' : ''}" data-n="data">Upload to data/</button><div class="dvarrow">→</div><button class="dvn dvk-check${DV.sel === 'qa' ? ' on' : ''}" data-n="qa">QA applies it</button><div class="dvarrow">→</div><button class="dvn dvk-app${DV.sel === 'app' ? ' on' : ''}" data-n="app">Everyone sees it</button></div>
    <p class="note-s">A review lapses if the record changes afterwards, for you and for everyone, so nothing stays marked as checked once it is different.</p></div>`;
  $('dvBody').innerHTML = `<div class="dvtabs" role="tablist">${DV_TABS.map(([k, n]) => `<button data-t="${k}" class="${DV.tab === k ? 'on' : ''}" role="tab" aria-selected="${DV.tab === k}">${n}</button>`).join('')}</div>
    <div class="dvwrap"><div class="dvmain">${main}</div><aside class="dvside">${dvDetail(DV.sel)}</aside></div>
    <p class="dvkey"><span class="dvk dvk-source"></span>source <span class="dvk dvk-agent"></span>agent <span class="dvk dvk-check"></span>check <span class="dvk dvk-enrich"></span>enrichment <span class="dvk dvk-gate"></span>gate <span class="dvk dvk-store"></span>data and publishing <span class="dvk dvk-app"></span>the app <span class="dvk dvk-you"></span>you</p>`;
}
$('dvBody').addEventListener('click', e => { const t = e.target.closest('[data-t]'); if (t) { DV.tab = t.dataset.t; renderDocViz(); return; } const n = e.target.closest('[data-n]'); if (n) { DV.sel = n.dataset.n; renderDocViz(); } });
function openDocViz(tab){ if (tab) DV.tab = tab; setOpen('docviz', true); raise('docviz'); setTimeout(renderDocViz, 30); }
$('helpVizBtn').onclick = () => openDocViz('system');
document.addEventListener('click', e => { if (e.target.closest('.dvopen')) openDocViz('system'); });   // the button in the documentation
