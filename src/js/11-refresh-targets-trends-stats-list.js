/* ==================================================================
 *  REFRESH: targets, trends, stats, list
 * ================================================================== */
function refresh(){
  computeLaneLayout(); ensureSubLanes(); computeLaneLayout();
  items.forEach(it => {
    it.match = matches(it);
    it.target = (hidden.has(it.id) || it.removed) ? 0 : it.match ? 1 : (F.ghosts && !(view.compactLanes && laneHidden(it)) ? .06 : 0);
  });
  if (selected && selected.target < 1) closeDetail();
  applyLanes(false);
  syncFilterUI(); buildTrends(); renderStats(); renderMilestones();
  if (typeof yearShown !== 'undefined') yearShown = -1;
  if (typeof computeGapSeries === 'function') { computeGapSeries(); renderVision(); updateTimeWindows(true); }
}

function fieldPhrase(){
  if (F.fields.size === 1) { const n = FIELDS[[...F.fields][0]].name; return 'In ' + (n === 'Artificial intelligence' ? 'AI' : n.charAt(0).toLowerCase() + n.slice(1)); }
  if (F.fields.size === FKEYS.length) return 'Across all fields';
  return 'Across the selected fields';
}
/* renderStats is defined with the statistics windows further down */

const mlist = $('mlist');
function renderMilestones(){
  const list = items.filter(matches).sort((a, b) => a.r - b.r || a.lag - b.lag);
  mlist.innerHTML = list.length ? list.map(it => {
    const yrs = it.kind === 'hist' ? `${it.r}–${it.p}` : it.kind === 'proj' ? `${it.r}–~${it.p}` : `${it.r}–`;
    return `<div class="mrow ${hidden.has(it.id) ? 'off' : ''}"><input type="checkbox" data-h="${it.id}" ${hidden.has(it.id) ? '' : 'checked'} aria-label="Show ${esc(it.t)}"><i style="background:${itemHex(it)}"></i><button data-s="${it.id}">${esc(it.t)}</button><span>${yrs}</span></div>`;
  }).join('') : '<p class="empty">No milestones match the current filters.</p>';
}
mlist.addEventListener('change', e => { const id = +e.target.dataset.h; if (isNaN(id)) return; e.target.checked ? hidden.delete(id) : hidden.add(id); refresh(); });
mlist.addEventListener('click', e => { const id = e.target.dataset.s; if (id == null) return; const it = items[+id]; if (hidden.has(it.id)) { hidden.delete(it.id); refresh(); } openDetail(it); });
$('showAllM').onclick = () => { hidden.clear(); refresh(); };
$('hideAllM').onclick = () => { items.filter(matches).forEach(it => hidden.add(it.id)); refresh(); };

