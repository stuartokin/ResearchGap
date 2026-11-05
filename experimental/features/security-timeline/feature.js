/* Security timeline: when security milestones arrived, set beside each field's technology milestones on one time axis.
   One row per field, with the security field on top; bars count milestones in each period (solid: landed, pale: outlook).
   Uses only the extension interface (SGX). Select a bar to compare a period's technology and security milestones. */
const SEC = 'cyber';
const yearOf = it => (typeof it.changeYear === 'number' && isFinite(it.changeYear) ? Math.round(it.changeYear) : null);
const timed = items => items.filter(it => yearOf(it) != null && (it.kind === 'landed' || it.kind === 'outlook'));
const median = xs => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); };
let bin = 5;   // years per bar, set from the width on each draw
const binOf = y => Math.floor(y / bin) * bin;
const period = s => bin === 1 ? String(s) : `${s} to ${s + bin - 1}`;
const rowsOf = items => {
  const list = timed(items), keys = [...new Set(list.map(it => it.field))].filter(k => k !== SEC).sort((a, b) => String(SGX.fieldName(a)).localeCompare(String(SGX.fieldName(b))));
  return [SEC, ...keys].map(k => ({k, name: k === SEC ? 'Security' : SGX.fieldName(k), list: list.filter(it => it.field === k)}));
};
const storyList = (list, esc) => list.length
  ? '<ul class="xst-list">' + list.sort((a, b) => yearOf(a) - yearOf(b) || String(a.title).localeCompare(String(b.title))).map(it => `<li><span class="xst-y">${it.kind === 'outlook' ? '~' : ''}${yearOf(it)}</span><button class="mini" data-xact="story" data-xval="${esc(it.id)}">${esc(it.title)}</button></li>`).join('') + '</ul>'
  : '<p class="note-s">None in your view.</p>';
SGX.registerChart({
  id: 'timeline',
  name: 'Security timeline',
  note: 'When security milestones arrived, beside each field\'s technology milestones. Solid: landed. Pale: outlook. Select a bar to compare.',
  render: ({width, fontSize, items, esc}) => {
    const fs = fontSize, rows = rowsOf(items), all = rows.flatMap(r => r.list);
    let h = `<div class="xst" style="font-size:${fs}px">`
      + '<p class="xst-key"><span class="xst-sw xst-sec"></span>Security milestones <span class="xst-sw xst-tech"></span>Technology milestones <span class="xst-sw xst-pale"></span>Outlook (AI estimate)</p>';
    if (!all.length) return h + '<p class="note-s">No dated milestones in your view. Try widening the filters.</p></div>';
    const narrow = width < 640, longest = Math.max(...rows.map(r => String(r.name).length));
    const left = Math.round(Math.min(fs * .58 * longest, width * (narrow ? .34 : .24)) + fs), right = Math.round(fs * 1.2), plotW = Math.max(120, width - left - right - 8);
    const ys = all.map(yearOf), y0raw = Math.min(...ys), y1raw = Math.max(...ys);
    bin = [1, 2, 5, 10].find(b => plotW / ((y1raw - y0raw) / b + 1) >= 16) || 10;
    const y0 = binOf(y0raw), y1 = binOf(y1raw) + bin, span = Math.max(bin, y1 - y0), px = plotW / span, bw = Math.max(2, px * bin - 1.5);
    const rowH = Math.round(fs * 2.6), barMax = rowH - 8, top = Math.round(fs * .4), axisH = Math.round(fs * 2), H = top + rows.length * rowH + axisH;
    const counts = rows.map(r => { const m = {}; r.list.forEach(it => { const s = binOf(yearOf(it)); m[s] = m[s] || {l: 0, o: 0}; m[s][it.kind === 'outlook' ? 'o' : 'l']++; }); return m; });
    const max = Math.max(1, ...counts.flatMap(m => Object.values(m).map(c => c.l + c.o)));
    let svg = `<svg width="${width - 8}" height="${H}" viewBox="0 0 ${width - 8} ${H}" style="font-size:${fs}px" role="img" aria-label="Timeline of security milestones beside technology milestones, by field">`;
    const step = [10, 20, 25, 50].find(s => (s / span) * plotW >= fs * 3.4) || 50;
    for (let t = Math.ceil(y0 / step) * step; t <= y1; t += step) {
      const x = left + (t - y0) * px;
      svg += `<line x1="${x}" y1="${top}" x2="${x}" y2="${top + rows.length * rowH}" stroke="var(--line)" stroke-width="1"></line><text x="${x}" y="${H - fs * .5}" text-anchor="middle" fill="var(--muted)" font-size="${fs * .85}">${t}</text>`;
    }
    rows.forEach((r, i) => {
      const y = top + i * rowH, base = y + rowH - 4, sec = r.k === SEC, cls = sec ? 'xst-sec' : 'xst-tech';
      svg += `<g data-xact="field" data-xval="${esc(r.k)}" class="xst-lab" aria-label="${esc(r.name)}:${r.list.length} dated milestones. Select for a summary."><text x="${left - 8}" y="${y + rowH * .62}" text-anchor="end" fill="var(--text)" font-weight="${sec ? 700 : 400}">${esc(r.name)}</text></g>`
        + `<line x1="${left}" y1="${base}" x2="${left + plotW}" y2="${base}" stroke="var(--line)" stroke-width="1"></line>`;
      Object.entries(counts[i]).forEach(([s, c]) => {
        const x = left + (+s - y0) * px, tot = Math.max(3, barMax * Math.sqrt((c.l + c.o) / max)), hl = tot * c.l / (c.l + c.o), ho = tot - hl;
        svg += `<g data-xact="bin" data-xval="${esc(r.k)}|${s}" class="xst-bin ${cls}" aria-label="${esc(r.name)},${period(+s)}: ${c.l} landed, ${c.o} outlook">`
          + `<title>${esc(r.name)}, ${period(+s)}: ${c.l} landed${c.o ? ', ' + c.o + ' outlook' : ''}</title>`
          + `<rect x="${x}" y="${y + 2}" width="${bw}" height="${rowH - 4}" fill="transparent"></rect>`
          + (c.l ? `<rect class="xst-solid" x="${x}" y="${base - hl}" width="${bw}" height="${Math.max(1.5, hl)}" rx="1"></rect>` : '')
          + (c.o ? `<rect class="xst-out" x="${x}" y="${base - hl - ho}" width="${bw}" height="${Math.max(1.5, ho)}" rx="1"></rect>` : '')
          + '</g>';
      });
    });
    svg += '</svg>';
    svg += '<div class="xst-fields" role="group" aria-label="Summary for a field">' + rows.map(r => `<button class="mini" data-xact="field" data-xval="${esc(r.k)}">${esc(r.name)}</button>`).join('') + '</div>';
    return h + svg + `<p class="xst-foot">Each bar counts milestones in ${bin === 1 ? 'one year' : 'a ' + bin + '-year period'}; heights use a square-root scale so single milestones show. Security milestones are not matched to a technology here; the Security lag chart matches them by category.</p></div>`;
  },
  onAction: (action, value, api) => {
    if (action === 'story') { api.openStory(value); return; }
    const rows = rowsOf(api.items()), sec = rows[0];
    if (action === 'field') {
      const r = rows.find(x => x.k === value); if (!r) return;
      const landed = r.list.filter(it => it.kind === 'landed').map(yearOf), out = r.list.filter(it => it.kind === 'outlook').length;
      const sl = sec.list.filter(it => it.kind === 'landed').map(yearOf);
      api.panel(r.name, `<p><b>Landed:</b> ${landed.length}${landed.length ? `, first in ${Math.min(...landed)}, half by ${median(landed)}` : ''}</p>`
        + `<p><b>Outlook:</b> ${out}</p>`
        + (r.k !== SEC && sl.length ? `<p><b>Security milestones landed:</b> ${sl.length}, first in ${Math.min(...sl)}, half by ${median(sl)}</p>` : '')
        + '<p class="note-s">Select a bar to list the milestones in that period.</p>');
      return;
    }
    if (action !== 'bin') return;
    const [k, s] = String(value).split('|'), start = +s, r = rows.find(x => x.k === k); if (!r || !isFinite(start)) return;
    const inBin = list => list.filter(it => binOf(yearOf(it)) === start);
    const mine = inBin(r.list), secs = k === SEC ? [] : inBin(sec.list);
    api.panel(`${r.name}, ${period(start)}`, `<h4 class="xst-h">${api.esc(r.name)}: ${mine.length}</h4>` + storyList(mine, api.esc)
      + (k === SEC ? '' : `<h4 class="xst-h">Security, same period: ${secs.length}</h4>` + storyList(secs, api.esc)
        + '<p class="note-s">Security milestones here are from any category, not only this field\'s.</p>')
      + '<p class="note-s">~ marks an outlook year: an AI estimate, not a forecast.</p>');
  },
  insight: {
    say: 'In this data, half of the {sec} landed security milestones came in {secMid} or later, against {techMid} for the {tech} landed technology milestones in your view, so far.',
    facts: api => {
      const rows = rowsOf(api.items()), landed = list => list.filter(it => it.kind === 'landed').map(yearOf);
      const s = landed(rows[0].list), t = rows.slice(1).flatMap(r => landed(r.list));
      return {sec: s.length, secMid: median(s) ?? 'no year', tech: t.length, techMid: median(t) ?? 'no year'};
    }
  }
});
