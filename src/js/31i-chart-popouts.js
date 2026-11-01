/* ==================================================================
 *  CHART WINDOWS: any number of full chart windows, each a complete copy of Charts (tabs, filters, zoom, tooltips,
 *  side panel, insight, save) with its own chart, local filters and zoom, following the main filters. A milestone
 *  selected in a linked window is highlighted in every linked window; 🔗 unlinks one. Closing a chart window removes it.
 *  They are saved with your views and My file. (Replaces the pop-outs, which were only pictures of a chart.)
 * ================================================================== */
const CHART_TEMPLATE = '<div class="wbody" id="chartBody"><div class="ctabs" id="chartTabs" role="tablist"></div><div class="cctl" id="chartCtl"></div><div class="cmain" id="chartMain"><div class="csvg" id="chartSvg"></div><div class="ccallout" id="chartCallout" role="dialog" aria-label="Chart insight"></div><aside class="cside" id="chartSide" aria-live="polite"></aside></div><div class="clist" id="chartList"></div><div class="cfoot"><button class="mini" id="chartPng">Save image</button> <button class="mini" id="chartCsv">CSV</button> <span id="chartNote" class="note-s"></span></div></div>';
const CH_INIT = JSON.parse(JSON.stringify(CH));
const CH_COPY_KEYS = ['tab', 'q', 'field', 'origin', 'dvOnly', 'zoom', 'zoom2', 'gapSort', 'gapColour', 'heatBy', 'aiLog', 'aiMode', 'aiLabels', 'secSort', 'wiScen', 'wiOff', 'linked'];
let chartWinSeq = 0;
const insightGroup = () => (WIN_GROUPS.find(g => g[0] === 'insight') || [0, 0, []])[2];
function chartWindowRect(){ const W = innerWidth, H = innerHeight, n = Object.keys(CHI.roots).length % 6; return {x:Math.round(W * .1) + 32 * n, y:84 + 32 * n, w:Math.min(1000, Math.round(W * .6)), h:Math.min(720, Math.round(H * .7)), fs:1}; }
function chartStateOf(k){ const st = k === CHI.cur ? CH : (CHI.states[k] || {}); const o = {}; CH_COPY_KEYS.forEach(x => { if (st[x] !== undefined) o[x] = st[x]; }); return JSON.parse(JSON.stringify(o)); }
function createChartWindow(state, rect, id){
  const k = id || 'chartw' + (++chartWinSeq); if (id) chartWinSeq = Math.max(chartWinSeq, +String(id).replace('chartw', '') || 0);
  if (CHI.roots[k]) return k;
  const name = 'Charts ' + (Object.keys(CHI.roots).length + 2), sec = document.createElement('section');
  sec.className = 'win'; sec.id = 'w-' + k; sec.dataset.title = name; sec.innerHTML = CHART_TEMPLATE.replace(/id="([^"]+)"/g, `id="$1~${k}"`);
  $('w-charts').after(sec);
  CHI.roots[k] = sec; CHI.states[k] = Object.assign(JSON.parse(JSON.stringify(CH_INIT)), {panel:null, sel:null, box:null, fortYear:null, fortTimer:0, insightOn:view.autoInsight !== false, linked:true, _tabsHtml:''}, JSON.parse(JSON.stringify(state || {})));
  WIN_IDS.push(k); WIN_NAMES[k] = name; insightGroup().push(k);
  layout[k] = Object.assign({open:false, sw:innerWidth, sh:innerHeight}, chartWindowRect(), rect || {}, {open:false});
  initWin(k); bindChartWindow(k); observeChartSize(k);
  if (!rect || rect.open !== false) { setOpen(k, true); raise(k); }
  setTimeout(() => withChart(k, renderCharts), 60); if (typeof buildWinMenu === 'function') buildWinMenu();
  return k;
}
function destroyChartWindow(k){
  if (!CHI.roots[k]) return; if (CHI.cur === k) useChart('main');
  const st = CHI.states[k] || {}; clearInterval(st.fortTimer);
  [WIN_IDS, insightGroup()].forEach(list => { const i = list.indexOf(k); if (i >= 0) list.splice(i, 1); });
  if (winRO) winRO.unobserve(CHI.roots[k]);
  CHI.roots[k].remove(); delete CHI.roots[k]; delete CHI.states[k]; delete WIN_NAMES[k]; delete layout[k]; delete wins[k];
  if (typeof buildWinMenu === 'function') buildWinMenu();
}
function destroyAllChartWindows(){ Object.keys(CHI.roots).forEach(destroyChartWindow); }
/* one selection, highlighted in every linked window (Details is shared by all) */
function linkSelection(id, from){
  ['main', ...Object.keys(CHI.roots)].forEach(k => { if (k === from) return; const st = k === CHI.cur ? CH : CHI.states[k]; if (!st || st.linked === false) return;
    st.sel = id; const L = layout[chartWinId(k)]; if (L && L.open) setTimeout(() => withChart(k, renderCharts), 0); });
}
onChartBody('click', e => {
  if (e.target.id === 'chNewWin') { createChartWindow(chartStateOf(CHI.cur)); toast('A new chart window, with all its controls. Close it to remove it.'); }
  else if (e.target.id === 'chLink') { CH.linked = CH.linked === false; renderCharts(); toast(CH.linked ? 'Linked: this window highlights the milestone selected in other linked windows.' : 'Unlinked: this window keeps its own highlighted milestone.'); }
});
/* the Compare view: two chart windows side by side, with the AI Energy Vision Radar */
function applyCompare(){
  destroyAllChartWindows(); applyPreset('charts');
  const W = innerWidth, H = innerHeight, tb = wins.toolbar.getBoundingClientRect(), top = Math.round((layout.toolbar.open ? tb.bottom : 0) + 10), h = Math.round(H - top - 46);
  Object.assign(layout.charts, {x:8, y:top, w:Math.round(W * .37), h, sw:W, sh:H}); placeWin('charts'); setOpen('details', false);
  Object.assign(CH, {tab:'heat', panel:null}); renderCharts();
  createChartWindow({tab:'pipe'}, {x:Math.round(W * .37) + 14, y:top, w:Math.round(W * .37), h, fs:1});
  setOpen('radar', true); Object.assign(layout.radar, {x:Math.round(W * .74) + 20, y:top, w:Math.round(W * .26) - 28, h, sw:W, sh:H}); placeWin('radar'); raise('radar');
  view.preset = 'compare';
}
