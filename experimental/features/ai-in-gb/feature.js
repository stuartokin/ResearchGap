/* AI in Great Britain: which AI-driven clean energy technologies are closest to use in Great Britain.
   Groups clean energy technologies by their Great Britain status (in use, trials, planned, not yet, not known).
   Uses only the extension interface (SGX). Select a technology for its details; the story opens from there. */
const GB = [
  ['deployed', 'In use in Great Britain', '#4CD3C2'],
  ['trial', 'In trials', '#7FD6A0'],
  ['planned', 'Planned', '#F2D38A'],
  ['not-yet', 'Not yet', '#FF8A7A'],
  ['unknown', 'Not known', '#8FA6B8']
];
const STAGE = {research: 'research', pilot: 'pilot', commercial: 'first commercial use', scale: 'at scale'};
let aiOnly = true;
const gbOf = it => { const s = it.gb && typeof it.gb === 'object' ? it.gb.status : it.gb; return GB.some(g => g[0] === s) ? s : 'unknown'; };
const pick = (items, ai) => items.filter(it => it.cleanEnergyArea && (!ai || it.aiDriven));
const groups = (items, ai) => {
  const list = pick(items, ai);
  return GB.map(([k, name, col]) => ({k, name, col, list: list.filter(it => gbOf(it) === k).sort((a, b) => String(a.title).localeCompare(String(b.title)))}));
};
SGX.registerChart({
  id: 'gb',
  name: 'AI in Great Britain',
  note: 'Clean energy technologies grouped by how close they are to use in Great Britain, closest first. Select one for its details.',
  render: ({fontSize, items, esc}) => {
    const rows = groups(items, aiOnly), total = rows.reduce((n, r) => n + r.list.length, 0), max = Math.max(1, ...rows.map(r => r.list.length));
    const what = aiOnly ? 'AI-driven clean energy technologies' : 'clean energy technologies';
    let h = `<div class="xgb" style="font-size:${fontSize}px">`
      + `<div class="xgb-top" role="group" aria-label="Which technologies to show">`
      + `<button class="mini" data-xact="mode" data-xval="ai" aria-pressed="${aiOnly}">AI-driven only</button>`
      + `<button class="mini" data-xact="mode" data-xval="all" aria-pressed="${!aiOnly}">All clean energy</button>`
      + `<span class="xgb-sum">${total} ${what} in your view</span></div>`;
    if (!total) return h + '<p class="note-s">None in your view. Try widening the filters.</p></div>';
    rows.forEach(r => {
      h += `<section class="xgb-row" style="--gc:${r.col}" aria-label="${esc(r.name)}: ${r.list.length}">`
        + `<div class="xgb-head"><span class="xgb-name">${esc(r.name)}</span><span class="xgb-n">${r.list.length}</span>`
        + `<span class="xgb-bar" aria-hidden="true"><i style="width:${Math.round(100 * r.list.length / max)}%"></i></span></div>`
        + (r.list.length
          ? '<div class="xgb-chips">' + r.list.map(it => `<button class="mini xgb-chip" data-xact="tech" data-xval="${esc(it.id)}" title="${esc(it.title)}${it.stage && STAGE[it.stage] ? ', ' + STAGE[it.stage] : ''}">${esc(it.title)}</button>`).join('') + '</div>'
          : '<p class="note-s xgb-none">None in your view.</p>')
        + '</section>';
    });
    return h + '<p class="note-s xgb-foot">Great Britain status is an AI estimate from public sources and may be out of date.</p></div>';
  },
  onAction: (action, value, api) => {
    if (action === 'story') { api.openStory(value); return; }
    if (action === 'mode') {
      aiOnly = value === 'ai';
      api.panel(aiOnly ? 'AI-driven only' : 'All clean energy', `<p class="note-s">Showing ${aiOnly ? 'only the AI-driven' : 'all the'} clean energy technologies your filters show.</p>`);
      return;
    }
    if (action !== 'tech') return;
    const it = api.items().find(x => x.id === value);
    if (!it) return;
    const g = GB.find(x => x[0] === gbOf(it));
    api.panel(it.title, `<p><b>Great Britain:</b> ${api.esc(g[1])}</p>`
      + (it.stage && STAGE[it.stage] ? `<p><b>Readiness worldwide:</b> ${api.esc(STAGE[it.stage])}</p>` : '')
      + `<p><b>AI-driven:</b> ${it.aiDriven ? 'yes' : 'no'}</p>`
      + '<p class="note-s">The story gives the note on Great Britain and the sources.</p>'
      + `<button class="mini" data-xact="story" data-xval="${api.esc(it.id)}">Open the story</button>`);
  },
  insight: {
    say: 'In this data, {inUse} of the {total} AI-driven clean energy technologies are in use in Great Britain so far, {trial} are in trials and {planned} are planned.',
    facts: api => { const r = groups(api.items(), true), n = k => r.find(x => x.k === k).list.length; return {inUse: n('deployed'), total: r.reduce((s, x) => s + x.list.length, 0), trial: n('trial'), planned: n('planned')}; }
  }
});
