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
const TAG = {research: 'research', pilot: 'pilot', commercial: 'commercial', scale: 'at scale'};
const RANK = {scale: 0, commercial: 1, pilot: 2, research: 3};
const rankOf = it => (it.stage in RANK ? RANK[it.stage] : 4);
const byReady = (a, b) => rankOf(a) - rankOf(b) || String(a.title).localeCompare(String(b.title));
/* closest next: not yet in use in Great Britain but in trials or planned there, and already in commercial use or at scale worldwide */
const isNext = it => (gbOf(it) === 'trial' || gbOf(it) === 'planned') && rankOf(it) <= 1;
let aiOnly = true;
const gbOf = it => { const s = it.gb && typeof it.gb === 'object' ? it.gb.status : it.gb; return GB.some(g => g[0] === s) ? s : 'unknown'; };
const pick = (items, ai) => items.filter(it => it.cleanEnergyArea && (!ai || it.aiDriven));
const groups = (items, ai) => {
  const list = pick(items, ai);
  return GB.map(([k, name, col]) => ({k, name, col, list: list.filter(it => gbOf(it) === k).sort(byReady)}));
};
const chip = (it, esc) => {
  const st = TAG[it.stage] || 'stage not known';
  return `<button class="mini xgb-chip" data-xact="tech" data-xval="${esc(it.id)}" title="${esc(it.title)}, ${esc(STAGE[it.stage] || st)} worldwide">`
    + `${esc(it.title)} <span class="xgb-st xgb-st-${esc(it.stage || 'none')}">${esc(st)}</span></button>`;
};
SGX.registerChart({
  id: 'gb',
  name: 'AI in Great Britain',
  note: 'Clean energy technologies grouped by how close they are to use in Great Britain, closest first, and within each group by readiness worldwide. Select one for its details.',
  render: ({fontSize, items, esc}) => {
    const rows = groups(items, aiOnly), total = rows.reduce((n, r) => n + r.list.length, 0), max = Math.max(1, ...rows.map(r => r.list.length));
    const what = aiOnly ? 'AI-driven clean energy technologies' : 'clean energy technologies';
    let h = `<div class="xgb" style="font-size:${fontSize}px">`
      + `<div class="xgb-top" role="group" aria-label="Which technologies to show">`
      + `<button class="mini" data-xact="mode" data-xval="ai" aria-pressed="${aiOnly}">AI-driven only</button>`
      + `<button class="mini" data-xact="mode" data-xval="all" aria-pressed="${!aiOnly}">All clean energy</button>`
      + `<span class="xgb-sum">${total} ${what} in your view</span></div>`;
    if (!total) return h + '<p class="note-s">None in your view. Try widening the filters.</p></div>';
    const next = pick(items, aiOnly).filter(isNext).sort(byReady);
    if (next.length) h += `<section class="xgb-next" aria-label="Closest next: ${next.length}">`
      + `<div class="xgb-head"><span class="xgb-name">Closest next</span><span class="xgb-n">${next.length}</span>`
      + '<button class="mini xgb-why" data-xact="why" data-xval="next" aria-label="What closest next means">?</button></div>'
      + '<p class="note-s xgb-sub">In trials or planned in Great Britain, and already in commercial use or at scale somewhere.</p>'
      + '<div class="xgb-chips">' + next.map(it => chip(it, esc)).join('') + '</div></section>';
    rows.forEach(r => {
      h += `<section class="xgb-row" style="--gc:${r.col}" aria-label="${esc(r.name)}: ${r.list.length}">`
        + `<div class="xgb-head"><span class="xgb-name">${esc(r.name)}</span><span class="xgb-n">${r.list.length}</span>`
        + `<span class="xgb-bar" aria-hidden="true"><i style="width:${Math.round(100 * r.list.length / max)}%"></i></span></div>`
        + (r.list.length
          ? '<div class="xgb-chips">' + r.list.map(it => chip(it, esc)).join('') + '</div>'
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
    if (action === 'why') {
      api.panel('Closest next', '<p>These technologies are in trials or planned in Great Britain, and their readiness worldwide is already first commercial use or at scale. They have shown they can work in use somewhere, so they may be among the next to be used here.</p>'
        + '<p class="note-s">This is a reading of two AI estimates, not a forecast. Within each group, the technologies furthest along worldwide come first.</p>');
      return;
    }
    if (action !== 'tech') return;
    const it = api.items().find(x => x.id === value);
    if (!it) return;
    const g = GB.find(x => x[0] === gbOf(it));
    api.panel(it.title, `<p><b>Great Britain:</b> ${api.esc(g[1])}</p>`
      + (it.stage && STAGE[it.stage] ? `<p><b>Readiness worldwide:</b> ${api.esc(STAGE[it.stage])}</p>` : '')
      + `<p><b>AI-driven:</b> ${it.aiDriven ? 'yes' : 'no'}</p>`
      + (isNext(it) ? '<p>One of the <b>closest next</b>: not yet in use in Great Britain, but already in use somewhere.</p>' : '')
      + '<p class="note-s">The story gives the note on Great Britain and the sources.</p>'
      + `<button class="mini" data-xact="story" data-xval="${api.esc(it.id)}">Open the story</button>`);
  },
  insight: {
    say: 'In this data, {inUse} of the {total} AI-driven clean energy technologies are in use in Great Britain so far, {trial} are in trials and {planned} are planned. {next} of those in trials or planned are already in commercial use or at scale somewhere.',
    facts: api => { const r = groups(api.items(), true), n = k => r.find(x => x.k === k).list.length; return {inUse: n('deployed'), total: r.reduce((s, x) => s + x.list.length, 0), trial: n('trial'), planned: n('planned'), next: pick(api.items(), true).filter(isNext).length}; }
  }
});
