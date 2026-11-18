/* AI by readiness: clean energy technologies at each stage of readiness, and how many are AI-driven.
   Two views: "By stage" (one bar per stage) and "By area" (a grid of AI for clean energy areas by stage).
   Uses only the extension interface (SGX). Select a bar or a cell to list its technologies; select one for its story. */
const STAGES = [['research', 'Research', 'Research'], ['pilot', 'Pilot', 'Pilot'], ['commercial', 'First commercial use', 'First use'], ['scale', 'At scale', 'At scale']];
const AREAS = [['opt', 'System optimisation and operation'], ['asset', 'Asset planning, operation and maintenance'],
  ['demand', 'End-use efficiency and demand'], ['rd', 'Energy innovation and R&D'], ['gov', 'Security, assurance and governance']];
let view = 'stage';
const clean = items => items.filter(it => it.cleanEnergyArea);
const areaName = k => (AREAS.find(a => a[0] === k) || [k, String(k)])[1];
const stageName = k => (STAGES.find(s => s[0] === k) || [k, String(k)])[1];
const tally = list => ({all: list.length, ai: list.filter(it => it.aiDriven).length});
const counts = items => STAGES.map(([k, name]) => Object.assign({k, name}, tally(clean(items).filter(it => it.stage === k))));
const areaKeys = items => { const seen = new Set(clean(items).map(it => it.cleanEnergyArea)); return AREAS.map(a => a[0]).filter(k => seen.has(k)).concat([...seen].filter(k => !AREAS.some(a => a[0] === k)).sort()); };
const pct = (a, b) => b ? Math.round(100 * a / b) : 0;
/* the area with the most technologies in use (first commercial use or at scale); ties go to the first in the app's order */
const leader = items => {
  let best = null;
  areaKeys(items).forEach(k => { const n = clean(items).filter(it => it.cleanEnergyArea === k && (it.stage === 'commercial' || it.stage === 'scale')).length; if (!best || n > best.n) best = {k, n}; });
  return best && best.n ? best : null;
};
function stageView(items, esc){
  const rows = counts(items), max = Math.max(1, ...rows.map(r => r.all));
  return '<div class="xar-bars">' + rows.map(r =>
    `<button class="xar-brow" data-xact="stage" data-xval="${r.k}" aria-label="${esc(r.name)}: ${r.ai} of ${r.all} AI-driven. List them.">`
    + `<span class="xar-lab">${esc(r.name)}</span>`
    + `<span class="xar-track" aria-hidden="true"><span class="xar-all" style="width:${100 * r.all / max}%"><i style="width:${pct(r.ai, r.all)}%"></i></span></span>`
    + `<span class="xar-val"><b>${r.ai}</b> of ${r.all} AI-driven${r.all ? ` <span class="xar-pc">(${pct(r.ai, r.all)}%)</span>` : ''}</span></button>`).join('') + '</div>'
    + '<p class="note-s xar-key"><span class="xar-k"><span class="xar-sw xar-sw-ai"></span>AI-driven</span><span class="xar-k"><span class="xar-sw xar-sw-all"></span>the rest</span><span>Bar length: how many technologies are at that stage.</span></p>';
}
function areaView(items, esc){
  const keys = areaKeys(items), list = clean(items);
  const cells = keys.map(a => STAGES.map(([s]) => tally(list.filter(it => it.cleanEnergyArea === a && it.stage === s))));
  const max = Math.max(1, ...cells.flat().map(c => c.all));
  let h = '<div class="xar-wrap"><table class="xar-grid"><caption class="note-s">Each cell: AI-driven of all clean energy technologies in that area at that stage. Darker: more technologies.</caption>'
    + '<thead><tr><th scope="col">Area</th>' + STAGES.map(s => `<th scope="col" title="${esc(s[1])}">${esc(s[2])}</th>`).join('') + '<th scope="col">All</th></tr></thead><tbody>';
  keys.forEach((a, i) => {
    const row = tally(list.filter(it => it.cleanEnergyArea === a));
    h += `<tr><th scope="row">${esc(areaName(a))}</th>` + cells[i].map((c, j) => c.all
      ? `<td><button class="xar-cell" style="--a:${(.12 + .6 * c.all / max).toFixed(2)}" data-xact="cell" data-xval="${esc(a)}|${STAGES[j][0]}" aria-label="${esc(areaName(a))}, ${esc(STAGES[j][1])}: ${c.ai} of ${c.all} AI-driven. List them."><b>${c.ai}</b><span>/${c.all}</span></button></td>`
      : '<td><span class="xar-empty" aria-label="none">·</span></td>').join('')
      + `<td><button class="xar-cell xar-tot" data-xact="cell" data-xval="${esc(a)}|all" aria-label="${esc(areaName(a))}, every stage: ${row.ai} of ${row.all} AI-driven. List them."><b>${row.ai}</b><span>/${row.all}</span></button></td></tr>`;
  });
  const col = STAGES.map(([s]) => tally(list.filter(it => it.stage === s))), all = tally(list);
  h += '</tbody><tfoot><tr><th scope="row">All areas</th>' + col.map((c, j) => `<td><button class="xar-cell xar-tot" data-xact="cell" data-xval="all|${STAGES[j][0]}" aria-label="All areas, ${esc(STAGES[j][1])}: ${c.ai} of ${c.all} AI-driven. List them."><b>${c.ai}</b><span>/${c.all}</span></button></td>`).join('')
    + `<td><span class="xar-cell xar-tot xar-static"><b>${all.ai}</b><span>/${all.all}</span></span></td></tr></tfoot></table></div>`;
  return h + '<p class="note-s xar-key">Bold: AI-driven. After the slash: all clean energy technologies. Areas are the AI for clean energy areas the data assigns.</p>';
}
SGX.registerChart({
  id: 'readiness',
  name: 'AI by readiness',
  note: 'Clean energy technologies at each stage of readiness, and how many are AI-driven, overall or by AI for clean energy area. Select a bar or a cell to list them.',
  render: ({fontSize, items, esc}) => {
    const n = clean(items).length;
    let h = `<div class="xar" style="font-size:${fontSize}px"><div class="xar-top" role="group" aria-label="How to group the technologies">`
      + `<button class="mini" data-xact="view" data-xval="stage" aria-pressed="${view === 'stage'}">By stage</button>`
      + `<button class="mini" data-xact="view" data-xval="area" aria-pressed="${view === 'area'}">By area</button>`
      + `<span class="xar-sum">${n} clean energy technologies in your view</span></div>`;
    if (!n) return h + '<p class="note-s">None in your view. Try widening the filters.</p></div>';
    return h + (view === 'area' ? areaView(items, esc) : stageView(items, esc)) + '</div>';
  },
  onAction: (action, value, api) => {
    if (action === 'story') { api.openStory(value); return; }
    if (action === 'view') {
      view = value === 'area' ? 'area' : 'stage';
      api.panel(view === 'area' ? 'By area' : 'By stage', `<p class="note-s">${view === 'area' ? 'Each AI for clean energy area, by stage of readiness. Select a cell to list its technologies.' : 'Each stage of readiness. Select a bar to list its technologies.'}</p>`);
      return;
    }
    if (action !== 'cell' && action !== 'stage') return;
    const [a, s] = action === 'stage' ? ['all', String(value)] : String(value).split('|');
    const list = clean(api.items()).filter(it => (a === 'all' || it.cleanEnergyArea === a) && (s === 'all' || it.stage === s))
      .sort((x, y) => (y.aiDriven - x.aiDriven) || String(x.title).localeCompare(String(y.title)));
    const t = tally(list), btn = it => `<button class="mini xstory${it.aiDriven ? ' xstory-ai' : ''}" data-xact="story" data-xval="${api.esc(it.id)}">${it.aiDriven ? '<span class="xar-dot" aria-hidden="true"></span>' : ''}${api.esc(it.title)}</button>`;
    const ai = list.filter(it => it.aiDriven), rest = list.filter(it => !it.aiDriven);
    const title = (a === 'all' ? 'All areas' : areaName(a)) + ', ' + (s === 'all' ? 'every stage' : stageName(s));
    api.panel(title, list.length
      ? `<p class="xar-ptot"><b>${t.ai}</b> of ${t.all} AI-driven.</p>`
        + (ai.length ? `<p class="note-s">AI-driven</p><div>${ai.map(btn).join(' ')}</div>` : '')
        + (rest.length ? `<p class="note-s">Not AI-driven</p><div>${rest.map(btn).join(' ')}</div>` : '')
        + '<p class="note-s">Readiness and area are AI-compiled from public sources and may be wrong.</p>'
      : '<p class="note-s">None in your view.</p>');
  },
  insight: {
    say: '{aiScale} of the {scale} clean energy technologies at scale are AI-driven, against {aiResearch} of the {research} still in research. In this data, the {leadArea} area has the most in use so far: {leadN} at first commercial use or at scale.',
    facts: api => {
      const its = api.items(), r = counts(its), g = k => r.find(x => x.k === k) || {all: 0, ai: 0}, lead = leader(its);
      return {aiScale: g('scale').ai, scale: g('scale').all, aiResearch: g('research').ai, research: g('research').all,
        leadArea: lead ? areaName(lead.k) : 'no', leadN: lead ? lead.n : 0};
    }
  }
});
