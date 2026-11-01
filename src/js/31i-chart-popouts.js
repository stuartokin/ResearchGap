/* ==================================================================
 *  CHART POP-OUTS: up to three charts in their own movable, resizable panels. Each follows your filters, redraws when
 *  resized, and opens a milestone's story when a row is selected. Which chart each shows is kept in your views.
 * ================================================================== */
const POPS = [1, 2, 3];
const popsOf = () => (view.chartPops = view.chartPops || {});   // created when needed: resetting to the defaults clears it
function renderPop(n){
  const id = 'chartpop' + n, box = $('chpop' + n); if (!layout[id] || !layout[id].open || !box) return;
  const tab = popsOf()[n] || 'heat', sel = wins[id].querySelector('.chpopsel');
  if (sel.options.length !== CHART_TABS.length) sel.innerHTML = CHART_TABS.map(([k, nm]) => `<option value="${k}">${nm}</option>`).join('');
  sel.value = tab;
  const name = (CHART_TABS.find(x => x[0] === tab) || [])[1] || 'Chart', h2 = wins[id].querySelector('.wh h2'); if (h2) h2.textContent = name;
  const W = Math.max(260, box.clientWidth - 4), H = Math.max(180, box.clientHeight - 4), fs = Math.round(13 * (layout[id].fs || 1));
  let svg = ''; try { svg = chartSvgString(tab, W, H, fs); } catch (e) { svg = ''; }
  box.innerHTML = svg || '<p class="note-s">This chart has nothing to show for the current filters.</p>';
  box.dataset.sig = popSig() + '|' + W + 'x' + H + '|' + fs + '|' + tab;
}
function popSig(){ return [F.fields && [...F.fields].join(), F.q, view.dateFmt, items.length, DB.meta.revision, JSON.stringify([...(F.sources || [])]), selected ? selected.id : ''].join('|'); }
function popOut(tab){
  const n = POPS.find(k => !layout['chartpop' + k].open) || POPS[0];
  popsOf()[n] = tab || CH.tab; setOpen('chartpop' + n, true); raise('chartpop' + n); setTimeout(() => renderPop(n), 60);
  toast('Opened in its own panel. Up to three charts can be popped out.');
}
$('chartBody').addEventListener('click', e => { if (e.target.id === 'chPopOut') popOut(CH.tab); });
POPS.forEach(n => {
  const w = wins['chartpop' + n];
  w.querySelector('.chpopsel').onchange = e => { popsOf()[n] = e.target.value; renderPop(n); };
  w.querySelector('.chpopback').onclick = () => { CH.tab = popsOf()[n] || 'heat'; setOpen('charts', true); raise('charts'); renderCharts(); };
  w.querySelector('.chpopsvg').addEventListener('click', e => { const r = e.target.closest('[data-id]'); if (!r) return; const it = items.find(x => String(x.id) === r.dataset.id); if (it) { openDetail(it); setOpen('details', true); raise('details'); } });
  if (window.ResizeObserver) new ResizeObserver(() => { clearTimeout(w._rt); w._rt = setTimeout(() => renderPop(n), 120); }).observe(w.querySelector('.chpopsvg'));
});
/* redraw when the filters, the data or the text size change */
setInterval(() => POPS.forEach(n => { const id = 'chartpop' + n; if (!layout[id] || !layout[id].open) return; const b = $('chpop' + n), fs = Math.round(13 * (layout[id].fs || 1));
  if (!b.dataset.sig || !b.dataset.sig.startsWith(popSig() + '|') || !b.dataset.sig.includes('|' + fs + '|')) renderPop(n); }), 1200);
