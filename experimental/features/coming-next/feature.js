/* Coming next: the outlook milestones, grouped by the year they are expected to become real-world change, soonest
   first, with AI for clean energy marked. The years are AI estimates from the data, not forecasts.
   Uses only the extension interface (SGX). Select a milestone for its expected gap from research; the story opens from there. */
const HORIZON = 10;
const NOW = new Date().getFullYear();
let cleanOnly = false;
const yearOf = it => (typeof it.changeYear === 'number' && isFinite(it.changeYear) ? Math.round(it.changeYear) : null);
const resOf = it => (typeof it.researchYear === 'number' && isFinite(it.researchYear) ? Math.round(it.researchYear) : null);
const gapOf = it => (resOf(it) != null && yearOf(it) != null ? yearOf(it) - resOf(it) : null);
const median = xs => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); };
const outlook = items => items.filter(it => it.kind === 'outlook' && yearOf(it) != null);
const isClean = it => !!it.cleanEnergyArea;
const byTitle = (a, b) => (isClean(b) - isClean(a)) || String(a.title).localeCompare(String(b.title));
const groups = (items, clean) => {
  const list = outlook(items).filter(it => !clean || isClean(it)), end = NOW + HORIZON, out = [];
  const passed = list.filter(it => yearOf(it) < NOW);
  if (passed.length) out.push({k: 'passed', name: 'Estimate passed', sub: 'expected before this year, not yet landed', list: passed});
  for (let y = NOW; y <= end; y++) { const l = list.filter(it => yearOf(it) === y); if (l.length) out.push({k: String(y), name: String(y), sub: y === NOW ? 'this year' : '', list: l}); }
  const later = list.filter(it => yearOf(it) > end);
  if (later.length) out.push({k: 'later', name: `After ${end}`, sub: '', list: later});
  out.forEach(g => g.list.sort(byTitle));
  return out;
};
const chip = (it, esc) => {
  const g = gapOf(it), tip = `${it.title}. ${it.fieldName}. Expected ${yearOf(it)}${g != null ? `, ${g} years after research began` : ''}${isClean(it) ? '. AI for clean energy' : ''}${it.aiDriven ? ', AI-driven' : ''}.`;
  return `<button class="mini xcn-chip${isClean(it) ? ' xcn-ce' : ''}" data-xact="item" data-xval="${esc(it.id)}" title="${esc(tip)}" aria-label="${esc(tip)}">${isClean(it) ? '<span class="xcn-dot" aria-hidden="true"></span>' : ''}${esc(it.title)}</button>`;
};
SGX.registerChart({
  id: 'outlook',
  name: 'Coming next',
  note: 'Outlook milestones by the year they are expected to become real-world change, soonest first. The years are AI estimates. Select one for its expected gap.',
  render: ({fontSize, items, esc}) => {
    const rows = groups(items, cleanOnly), total = rows.reduce((n, r) => n + r.list.length, 0), max = Math.max(1, ...rows.map(r => r.list.length));
    const ce = rows.reduce((n, r) => n + r.list.filter(isClean).length, 0);
    let h = `<div class="xcn" style="font-size:${fontSize}px">`
      + '<div class="xcn-top" role="group" aria-label="Which outlook milestones to show">'
      + `<button class="mini" data-xact="mode" data-xval="all" aria-pressed="${!cleanOnly}">All fields</button>`
      + `<button class="mini" data-xact="mode" data-xval="clean" aria-pressed="${cleanOnly}">AI for clean energy</button>`
      + `<span class="xcn-sum">${total} outlook milestones in your view${cleanOnly ? '' : `, ${ce} in AI for clean energy`}</span></div>`
      + '<p class="xcn-key"><span class="xcn-dot" aria-hidden="true"></span>AI for clean energy. Years are AI estimates, not forecasts.</p>';
    if (!total) return h + '<p class="note-s">No outlook milestones in your view. Try widening the filters.</p></div>';
    rows.forEach(r => {
      const c = r.list.filter(isClean).length;
      h += `<section class="xcn-row${r.k === 'passed' ? ' xcn-passed' : ''}" aria-label="${esc(r.name)}: ${r.list.length} milestones">`
        + `<div class="xcn-head"><span class="xcn-name">${esc(r.name)}</span>${r.sub ? `<span class="xcn-sub">${esc(r.sub)}</span>` : ''}`
        + `<span class="xcn-n">${r.list.length}${!cleanOnly && c ? ` <span class="xcn-c">(${c} clean energy)</span>` : ''}</span>`
        + `<span class="xcn-bar" aria-hidden="true"><i style="width:${Math.round(100 * r.list.length / max)}%"></i></span></div>`
        + '<div class="xcn-chips">' + r.list.map(it => chip(it, esc)).join('') + '</div></section>';
    });
    return h + '<p class="note-s xcn-foot">Only outlook milestones are shown: the ones the data expects to become real-world change, with an AI-estimated year. Milestones still in the lab have no expected year and are left out.</p></div>';
  },
  onAction: (action, value, api) => {
    if (action === 'story') { api.openStory(value); return; }
    if (action === 'mode') {
      cleanOnly = value === 'clean';
      api.panel(cleanOnly ? 'AI for clean energy' : 'All fields', `<p class="note-s">Showing ${cleanOnly ? 'only the AI for clean energy' : 'all the'} outlook milestones your filters show.</p>`);
      return;
    }
    if (action !== 'item') return;
    const all = api.items(), it = all.find(x => x.id === value);
    if (!it) return;
    const g = gapOf(it), landed = all.filter(x => x.kind === 'landed' && x.field === it.field && gapOf(x) != null && gapOf(x) >= 0);
    const recent = landed.filter(x => yearOf(x) >= NOW - HORIZON), base = recent.length ? recent : landed, mg = median(base.map(gapOf));
    api.panel(it.title, `<p><b>Field:</b> ${api.esc(it.fieldName)}</p>`
      + (resOf(it) != null ? `<p><b>Research began:</b> ${resOf(it)}</p>` : '')
      + `<p><b>Expected to become real-world change:</b> ${yearOf(it)} (AI estimate)</p>`
      + (g != null ? `<p><b>Expected gap:</b> ${g} years from research</p>` : '')
      + (mg != null ? `<p class="note-s">For comparison, the median gap of the ${base.length} landed ${api.esc(it.fieldName)} milestones ${recent.length ? `that landed since ${NOW - HORIZON}` : 'in your view'} is ${mg} years.</p>` : '')
      + `<p><b>AI for clean energy:</b> ${isClean(it) ? 'yes' : 'no'}. <b>AI-driven:</b> ${it.aiDriven ? 'yes' : 'no'}.</p>`
      + `<button class="mini" data-xact="story" data-xval="${api.esc(it.id)}">Open the story</button>`);
  },
  insight: {
    say: 'In this data, {cnSoon} outlook milestones are expected to become real-world change by {cnEnd}, {cnClean} of them in AI for clean energy. Their median expected gap from research is {cnGapOut} years, against {cnGapLanded} for milestones that landed since {cnSince}.',
    facts: api => {
      const all = api.items(), end = NOW + HORIZON, since = NOW - HORIZON, soon = outlook(all).filter(it => yearOf(it) <= end);
      const landed = all.filter(it => it.kind === 'landed' && yearOf(it) != null && yearOf(it) >= since && gapOf(it) != null && gapOf(it) >= 0);
      const go = median(soon.map(gapOf).filter(x => x != null && x >= 0)), gl = median(landed.map(gapOf));
      return {cnSoon: soon.length, cnEnd: end, cnClean: soon.filter(isClean).length, cnGapOut: go == null ? 'unknown' : go, cnGapLanded: gl == null ? 'unknown' : gl, cnSince: since};
    }
  }
});
