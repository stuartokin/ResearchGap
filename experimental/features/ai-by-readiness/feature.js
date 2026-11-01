/* AI by readiness: how many clean energy technologies at each stage of readiness are AI-driven.
   Uses only the extension interface (SGX). Select a bar to list its AI-driven technologies; select one for its story. */
const STAGES = [['research', 'Research'], ['pilot', 'Pilot'], ['commercial', 'First commercial use'], ['scale', 'At scale']];
const clean = items => items.filter(it => it.cleanEnergyArea);
const counts = items => STAGES.map(([k, name]) => { const all = clean(items).filter(it => it.stage === k); return {k, name, all:all.length, ai:all.filter(it => it.aiDriven).length}; });
SGX.registerChart({
  id: 'readiness',
  name: 'AI by readiness',
  note: 'Clean energy technologies at each stage of readiness, and how many are AI-driven. Select a bar to list them.',
  render: ({width, fontSize, items, esc}) => {
    const rows = counts(items), max = Math.max(1, ...rows.map(r => r.all)), fs = fontSize, rowH = Math.round(fs * 3.2), left = Math.round(fs * 11), barW = Math.max(120, width - left - fs * 8);
    const h = rows.length * rowH + fs * 4;
    let svg = `<svg width="${width}" height="${h}" viewBox="0 0 ${width} ${h}" role="img" aria-label="AI-driven clean energy technologies by readiness" style="font-size:${fs}px">`;
    rows.forEach((r, i) => {
      const y = fs * 1.5 + i * rowH, wAll = Math.round(barW * r.all / max), wAi = Math.round(barW * r.ai / max);
      svg += `<g data-xact="stage" data-xval="${r.k}" style="cursor:pointer"><text x="${left - 10}" y="${y + rowH * .45}" text-anchor="end" fill="var(--text)">${esc(r.name)}</text>`
        + `<rect x="${left}" y="${y}" width="${Math.max(2, wAll)}" height="${rowH * .6}" rx="4" fill="rgba(255,255,255,.12)"></rect>`
        + `<rect x="${left}" y="${y}" width="${Math.max(r.ai ? 2 : 0, wAi)}" height="${rowH * .6}" rx="4" fill="#B794F6"></rect>`
        + `<text x="${left + Math.max(wAll, 2) + 8}" y="${y + rowH * .45}" fill="var(--muted)">${r.ai} of ${r.all} AI-driven</text></g>`;
    });
    return svg + `<text x="${left}" y="${h - fs * .6}" fill="var(--faint)">Purple: AI-driven. Grey: the rest.</text></svg>`;
  },
  onAction: (action, value, api) => {
    if (action === 'story') { api.openStory(value); return; }
    if (action !== 'stage') return;
    const stage = STAGES.find(s => s[0] === value), list = clean(api.items()).filter(it => it.stage === value && it.aiDriven);
    api.panel(`AI-driven, ${stage ? stage[1] : value}: ${list.length}`, list.length
      ? list.map(it => `<button class="mini xstory" data-xact="story" data-xval="${api.esc(it.id)}">${api.esc(it.title)}</button>`).join(' ')
      : '<p class="note-s">None at this stage.</p>');
  },
  insight: {
    say: '{aiScale} of the {scale} clean energy technologies at scale are AI-driven, against {aiResearch} of the {research} still in research.',
    facts: api => { const r = counts(api.items()), g = k => r.find(x => x.k === k) || {all:0, ai:0}; return {aiScale:g('scale').ai, scale:g('scale').all, aiResearch:g('research').ai, research:g('research').all}; }
  }
});
