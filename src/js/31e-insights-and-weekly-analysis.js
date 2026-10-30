/* ==================================================================
 *  CHART INSIGHTS, THE WEEKLY ANALYSIS TOUR, CHARTS IN TOURS, KIOSK AND REPORTS, AND DATE FORMATS.
 *  The words come from data/tours.json (refreshed weekly by the tour agent within fixed rules);
 *  every figure is filled in from the live data here.
 * ================================================================== */
/* ---------- dates: UK by default, US as an option ---------- */
function fmtDate(iso, kind){
  if (!iso) return ''; const s = String(iso), d = new Date(s.length <= 10 ? s + 'T12:00:00Z' : s); if (isNaN(d)) return s;
  const loc = view.dateFmt === 'us' ? 'en-US' : 'en-GB';
  if (kind === 'short') return d.toLocaleDateString(loc, {day:'2-digit', month:'2-digit'});
  if (kind === 'time') return d.toLocaleString(loc, {day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'});
  return d.toLocaleDateString(loc, {day:'numeric', month:'long', year:'numeric'});
}
$('dateFmtS').value = view.dateFmt || 'uk';
$('dateFmtS').onchange = e => { view.dateFmt = e.target.value; refresh(); try { renderChanges(); renderRadar(); renderCyber(); } catch (err) {} if (selected) openDetail(selected); showDisc && $('disc').classList.contains('on') && showDisc(); };
/* ---------- live facts behind the chart insights, over all the data ---------- */
let chartFacts = function(){
  const live = items.filter(it => !it.removed && !it.aud), hist = live.filter(it => it.kind === 'hist' && !it.co), r1 = v => v == null ? '' : String(Math.round(v * 10) / 10), W = v => v == null ? '' : yrs(Math.round(v));
  const f = {};
  const longest = hist.slice().sort((a, b) => b.lag - a.lag)[0], quick = hist.filter(it => it.p >= 2015).sort((a, b) => a.lag - b.lag || b.major - a.major)[0];
  Object.assign(f, {nGap:String(hist.length), longestTitle:longest ? longest.t : '', longestYears:longest ? String(longest.lag) : '', quickRecentTitle:quick ? quick.t : '', quickRecentYears:quick ? (quick.lag < 1 ? 'under a year' : quick.lag === 1 ? 'a year' : `${quick.lag} years`) : ''});
  const fm = (k, lo, hi, by) => { const v = hist.filter(it => it.v === k && it[by || 'p'] >= lo && it[by || 'p'] < hi).map(it => it.lag); return v.length >= 4 ? median(v) : null; };
  const fk = FKEYS.filter(k => FIELDS[k] && !FIELDS[k].custom), since = fk.map(k => [k, fm(k, 2010, 3000)]).filter(x => x[1] != null).sort((a, b) => a[1] - b[1]);
  const imp = fk.map(k => [k, fm(k, 1990, 2000), fm(k, 2010, 2020)]).filter(x => x[1] != null && x[2] != null).sort((a, b) => (b[1] - b[2]) - (a[1] - a[2]))[0];
  Object.assign(f, {fastField:since[0] ? fieldName(since[0][0]) : '', fastFieldYears:since[0] ? r1(since[0][1]) : '', slowField:since.length ? fieldName(since[since.length - 1][0]) : '', slowFieldYears:since.length ? r1(since[since.length - 1][1]) : '',
    improvedField:imp ? fieldName(imp[0]) : '', improvedFrom:imp ? r1(imp[1]) : '', improvedTo:imp ? r1(imp[2]) : '', improvedCase:imp && imp[1] - imp[2] >= 1 ? 'yes' : 'no'});
  const like = hist.filter(it => !POLICY_ARCS.has(it.t) && it.r >= 2010), aiM = like.filter(isAIDriven).map(it => it.lag), reM = like.filter(it => !isAIDriven(it)).map(it => it.lag);
  const am = aiM.length >= 3 ? median(aiM) : null, rm = reM.length ? median(reM) : null;
  Object.assign(f, {aiMed:r1(am), restMed:r1(rm), aiCount:String(aiM.length), aiCase:am == null || rm == null ? 'unclear' : am <= rm - 1 ? 'faster' : am >= rm + 1 ? 'slower' : 'similar'});
  const pv = live.filter(it => it.dv), st = k => pv.filter(it => (it.stage || 'research') === k).length;
  Object.assign(f, {pipeTotal:String(pv.length), pipeResearch:String(st('research')), pipePilot:String(st('pilot')), pipeCommercial:String(st('commercial')), pipeScale:String(st('scale')), pipeGB:String(pv.filter(it => it.gb === 'deployed').length), pipeCase:st('research') + st('pilot') > st('commercial') + st('scale') ? 'early' : 'late'});
  const fc = live.filter(it => it.fc && it.fc.estimatedYear != null), cnt = {}; fc.forEach(it => { const y = it.fc.actualYear ?? it.fc.estimatedYear; cnt[y] = (cnt[y] || 0) + 1; });
  const peak = Object.entries(cnt).sort((a, b) => b[1] - a[1] || a[0] - b[0])[0], revised = fc.filter(it => (it.fc.revisions || []).length), slipped = revised.filter(it => it.fc.estimatedYear > ((it.fc.revisions[0] || {}).from ?? it.fc.estimatedYear));
  Object.assign(f, {driftCount:String(fc.length), driftPeakYear:peak ? peak[0] : '', driftPeakCount:peak ? String(peak[1]) : '', driftRevised:String(revised.length), driftSlipped:String(slipped.length), driftCase:revised.length ? 'some' : 'none'});
  const sec = live.filter(it => it.kind === 'hist' && it.attack).map(it => ({it, r:secResponse(it)})).filter(x => x.r), done = sec.filter(x => x.r.resp && !x.r.expected), longW = done.slice().sort((a, b) => b.r.lag - a.r.lag)[0], open = sec.filter(x => !x.r.resp);
  Object.assign(f, {secCount:String(sec.length), secMedian:done.length ? r1(median(done.map(x => x.r.lag))) : '', secLongestTitle:longW ? longW.it.t : '', secLongestYears:longW ? String(longW.r.lag) : '', secOpen:String(open.length), secCase:open.length ? 'open' : 'closed'});
  const ff = fortuneFacts();
  Object.assign(f, {fortCount:ff.nFortunes, fortResearch:ff.nResearch, fortFastest:ff.fastestCo, fortFastestTime:ff.fastestTime, fortPre:ff.preYears, fortRecent:ff.recentYears, fortCase:ff.speedCase});
  const proj = live.filter(it => it.kind === 'proj' && it.p > NOW), keep = CH.wiScen; CH.wiScen = 'mid';
  const plans = proj.map(it => [it, aiPlan(it)]); CH.wiScen = keep;
  const levCount = {}; plans.forEach(([, pl]) => pl.levers.forEach(l => { levCount[l.n] = (levCount[l.n] || 0) + pl.saved; }));
  Object.assign(f, {wiAvg:proj.length ? r1(plans.reduce((a, [, pl]) => a + pl.saved, 0) / proj.length) : '', wi2030Now:String(proj.filter(it => it.p <= 2030).length), wi2030AI:String(plans.filter(([, pl]) => pl.year <= 2030).length),
    wiTopLever:(Object.entries(levCount).sort((a, b) => b[1] - a[1])[0] || [''])[0].toLowerCase(), wiResearched:String(proj.filter(it => it.aiL).length)});
  return f;
};
function weekFacts(){
  const wk = (tourText.tours.week || {}), recent = CHANGES.filter(c => c.it && daysAgo(c.date) <= 7);
  const added = recent.filter(c => c.type === 'added'), titles = [...new Set(added.map(c => c.it.t))];
  return {updatedAt:fmtDate(wk.updated || tourText.updated || DATA_AS_OF, (wk.updated || '').length > 10 ? 'time' : 'long'), newCount:String(titles.length), newTitles:titles.slice(0, 3).join(', '), newCase:titles.length ? 'some' : 'none', changedCount:String(recent.filter(c => c.type !== 'added').length)};
}
/* ---------- the insight callout on each chart: subtitles, and speech if you want it ---------- */
let chartInsight = function(tab){ const t = ((tourText.tours.charts || TOUR_TEXT.tours.charts || {}).steps || {})[tab]; return t ? renderSay(t.say, chartFacts()).replace(/\s+/g, ' ').trim() : ''; }
let insightAudio = null;
function speakInsight(text){
  stopInsight(); const file = tourAudio.voice && tourAudio.files[textKey(text, tourAudio.voice)];
  if (file) { insightAudio = new Audio('audio/' + file); insightAudio.play().catch(() => browserSpeak(text)); return; }
  browserSpeak(text);
};
function browserSpeak(text){ if (!('speechSynthesis' in window)) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(speechText(text)); if (tourVoice) { u.voice = tourVoice; u.lang = tourVoice.lang; } else u.lang = 'en-GB'; u.rate = .98; speechSynthesis.speak(u); }
function stopInsight(){ if (insightAudio) { insightAudio.pause(); insightAudio = null; } if ('speechSynthesis' in window) speechSynthesis.cancel(); }
let showInsight = function(on){
  const box = $('chartCallout'); if (!on) { box.classList.remove('on'); stopInsight(); return; }
  const text = chartInsight(CH.tab), upd = (tourText.tours.charts || {}).updated || tourText.updated;
  box.innerHTML = `<div class="cohead"><b>★ Insight: ${chEsc((CHART_TABS.find(t => t[0] === CH.tab) || [])[1])}</b><button class="mini" id="coX" aria-label="Close insight">✕</button></div><p class="cotext">${chEsc(text)}</p>
    <div class="cofoot"><button class="mini" id="coSpeak">🔊 Speak</button><span class="note-s">AI-generated narrative, refreshed weekly by the agents${upd ? ` (updated ${fmtDate(upd)})` : ''}. No human review.</span></div>`;
  box.classList.add('on'); CH.insightOn = true;
};
$('chartBody').addEventListener('click', e => {
  if (e.target.id === 'chInsight') { if ($('chartCallout').classList.contains('on')) { showInsight(false); CH.insightOn = false; } else showInsight(true); }
  else if (e.target.id === 'coX') { showInsight(false); CH.insightOn = false; }
  else if (e.target.id === 'coSpeak') { const p = $('chartCallout').querySelector('.cotext'); if (p) speakInsight(p.textContent); }
});
/* ---------- charts inside the walk-throughs ---------- */
function tourChart(tab, extra){ return () => { tourHighlight(null); Object.assign(CH, {tab, q:'', field:'', origin:'', zoom:{}, zoom2:{}, panel:null, box:null, fortYear:null}); clearInterval(CH.fortTimer); CH.fortTimer = 0; tourFilters(); refresh(); setTimeout(() => { renderCharts(); if (extra) extra(); }, 250); }; }
const chartStep = (id, tab, extra) => ({id, show:['charts'], act:tourChart(tab, extra)});
const playFortunes = () => { CH.fortYear = 1890; CH.fortTimer = setInterval(() => { CH.fortYear += 3; if (CH.fortYear >= NOW) { CH.fortYear = NOW; clearInterval(CH.fortTimer); CH.fortTimer = 0; } renderCharts(); }, 160); };
const insertAfter = (tourId, afterId, step) => { const st = TOURS[tourId].steps, i = st.findIndex(s => s.id === afterId); st.splice(i < 0 ? st.length : i + 1, 0, step); };
insertAfter('gap', 'trend', chartStep('heatchart', 'heat')); insertAfter('gap', 'outlook', chartStep('aichart', 'ai'));
insertAfter('horizon', 'next', chartStep('pipechart', 'pipe'));
insertAfter('secure', 'lens', chartStep('secchart', 'sec'));
insertAfter('fortune', 'speed', chartStep('fortchart', 'fort', playFortunes));
insertAfter('how', 'arrange', chartStep('whatifchart', 'whatif'));
['gap', 'horizon', 'secure', 'fortune', 'how'].forEach(id => { const base = TOURS[id].facts; TOURS[id].facts = () => Object.assign({}, chartFacts(), base()); });
/* ---------- the weekly analysis tour: steps written by the tour agent each week ---------- */
const WEEK_VIEWS = {main:[], findings:['findings'], radar:['radar'], cyber:['cyber'], fortunes:['fortunes']};
TOURS.week = {title:"This week's analysis", facts:() => Object.assign({}, gapFacts(), chartFacts(), weekFacts()),
  get steps(){ const st = ((tourText.tours.week || TOUR_TEXT.tours.week || {}).steps) || {};
    return Object.keys(st).map(id => { const v = st[id].view || 'main';
      if (CHART_TABS.some(t => t[0] === v)) return chartStep(id, v, v === 'fort' ? playFortunes : null);
      return {id, show:WEEK_VIEWS[v] || [], act:() => { tourHighlight(null); tourFilters(); view.lanes = 'v'; view.colour = 'v'; syncDisplayUI(); refresh(); if (v === 'main') { resetView(); setAutoRotate(true); tourTimeline(2000, 1.2); } }}; }); }};
TOUR_LIST.push({id:'week', title:"This week's analysis", blurb:"The best of this week's findings, with the charts that show them.", ready:true});
/* ---------- kiosk: charts scenes ---------- */
KIOSK_SCRIPT.splice(6, 0, {scene:'charts', tab:'heat', seconds:30, note:'Charts: where the gap moved, by field and decade'});
KIOSK_SCRIPT.push({scene:'charts', tab:'fort', seconds:30, note:'Charts: the race to a fortune', play:true});
/* ---------- chart images for the PowerPoint report ---------- */
function chartSvgString(tab, W, H, fs){
  const keep = {tab:CH.tab, q:CH.q, field:CH.field, origin:CH.origin, zoom:CH.zoom, zoom2:CH.zoom2, box:CH.box, sel:CH.sel, selF:CH.selF, fortYear:CH.fortYear, panel:CH.panel};
  Object.assign(CH, {tab, q:'', field:'', origin:'', zoom:{}, zoom2:{}, box:null, sel:null, selF:null, fortYear:null, panel:null});
  const ctl = $('chartCtl').innerHTML; let out = '';
  try { out = ({gaps:chGaps, heat:chHeat, ai:chAI, pipe:chPipe, drift:chDrift, sec:chSec, fort:chFort, whatif:chWhatIf}[tab])(W, H, fs); }
  finally { $('chartCtl').innerHTML = ctl; Object.assign(CH, keep); }
  const i = out.lastIndexOf('<svg'); return i >= 0 ? out.slice(i, out.lastIndexOf('</svg>') + 6) : '';
}
function chartImage(tab, W, H, fs){
  return new Promise(res => {
    let xml = chartSvgString(tab, W, H, fs || 16); if (!xml) return res(null);
    if (!/^<svg[^>]*xmlns=/.test(xml)) xml = xml.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    xml = xml.replace('<svg', '<svg font-family="Arial, sans-serif"');
    const img = new Image(); img.onerror = () => res(null);
    img.onload = () => { const c = document.createElement('canvas'), k = 1.5, w = img.width || W, h = img.height || H; c.width = w * k; c.height = h * k; const x = c.getContext('2d'); x.scale(k, k); x.fillStyle = CHC.bg; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0); res({data:c.toDataURL('image/png'), w, h}); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
  });
}
/* the chart insights are recorded with the AI voice each week, like the tours */
const tourTextsBeforeCharts = window.__tourTexts;
window.__tourTexts = () => tourTextsBeforeCharts().concat(CHART_TABS.map(([k]) => ({tour:'charts', step:k, text:chartInsight(k)})).filter(t => t.text));
/* ---------- chart settings: defaults, and saving them (with scroll positions) in view files ---------- */
const CH_KEYS = ['tab', 'q', 'field', 'origin', 'dvOnly', 'zoom', 'zoom2', 'gapSort', 'gapColour', 'heatBy', 'aiLog', 'aiMode', 'aiLabels', 'secSort', 'wiScen', 'wiOff', 'insightOn'];
function chartState(){ const o = {}; CH_KEYS.forEach(k => { o[k] = CH[k]; }); return JSON.parse(JSON.stringify(o)); }
const CH_DEFAULTS = Object.assign(chartState(), {dvOnly:false, insightOn:false});
function applyChartState(o){ Object.assign(CH, JSON.parse(JSON.stringify(o || {})), {panel:null, box:null, sel:null, selF:null, fortYear:null}); clearInterval(CH.fortTimer); CH.fortTimer = 0; if (!CH.insightOn && $('chartCallout')) showInsight(false); if (layout.charts && layout.charts.open) renderCharts(); }
function resetCharts(){ applyChartState(CH_DEFAULTS); }
function scrollState(){ const o = {}; WIN_IDS.forEach(id => { const els = [...wins[id].querySelectorAll('.wbody, .csvg, .cside, .clrows, .csitems')]; const v = els.map(e => [Math.round(e.scrollTop), Math.round(e.scrollLeft)]); if (v.some(p => p[0] || p[1])) o[id] = v; }); return o; }
function applyScroll(o){ Object.entries(o || {}).forEach(([id, v]) => { if (!wins[id]) return; const els = [...wins[id].querySelectorAll('.wbody, .csvg, .cside, .clrows, .csitems')]; v.forEach((p, k) => { if (els[k]) { els[k].scrollTop = p[0]; els[k].scrollLeft = p[1]; } }); }); }
/* ---------- stories: research → first use → impact, researched weekly by the story agent ---------- */
const trimDot = s => String(s || '').trim().replace(/[.\s]+$/, '');
function storySentence(it){ const s = it && it.story; if (!s) return ''; return `${it.t} started as ${trimDot(s.research)}. It was first used ${trimDot(s.deploy)}. Since then, ${trimDot(s.impact)}.`; }
function storyFacts(){
  const live = items.filter(it => !it.removed && !it.aud && it.story), pick = (list, key) => { const it = list[0]; return {[key]:it ? storySentence(it) : '', [key + 'Case']:it ? 'yes' : 'no', [key + 'Title']:it ? it.t : ''}; };
  const fast = (chartFactsCache || {}).fastField, recentAdded = new Set(CHANGES.filter(c => c.it && c.type === 'added' && daysAgo(c.date) <= 7).map(c => c.it.id));
  return Object.assign({},
    pick(live.filter(it => it.kind === 'hist' && it.p >= 2015).sort((a, b) => a.lag - b.lag), 'quickStory'),
    pick(live.filter(it => it.kind === 'hist' && it.p >= 2010 && fast && fieldName(it.v) === fast).sort((a, b) => a.lag - b.lag), 'fastStory'),
    pick(live.filter(it => it.kind === 'hist' && it.r >= 2010 && isAIDriven(it)).sort((a, b) => a.lag - b.lag), 'aiStory'),
    pick(live.filter(it => it.dv).sort((a, b) => (b.gb === 'deployed') - (a.gb === 'deployed') || b.p - a.p), 'pipeStory'),
    pick(live.filter(it => it.attack && it.kind === 'hist').sort((a, b) => b.p - a.p), 'secStory'),
    pick(live.filter(it => recentAdded.has(it.id)), 'newStory'),
    pick(live.filter(it => it.dv && recentAdded.has(it.id)).concat(live.filter(it => it.dv)), 'cleanStory'));
}
let chartFactsCache = null;
const chartFactsBase = chartFacts;
chartFacts = function(){ chartFactsCache = chartFactsBase(); return Object.assign(chartFactsCache, storyFacts()); };
/* ---------- numbers in an insight open the list behind them ---------- */
const LIST_PH = {
  pipeTotal:() => items.filter(it => !it.removed && it.dv), pipeResearch:() => items.filter(it => !it.removed && it.dv && (it.stage || 'research') === 'research'),
  pipePilot:() => items.filter(it => !it.removed && it.dv && it.stage === 'pilot'), pipeCommercial:() => items.filter(it => !it.removed && it.dv && it.stage === 'commercial'),
  pipeScale:() => items.filter(it => !it.removed && it.dv && it.stage === 'scale'), pipeGB:() => items.filter(it => !it.removed && it.dv && it.gb === 'deployed'),
  secOpen:() => items.filter(it => !it.removed && it.kind === 'hist' && it.attack && (secResponse(it) || {}).resp === null),
  aiCount:() => items.filter(it => !it.removed && !it.aud && !it.co && it.kind === 'hist' && it.r >= 2010 && !POLICY_ARCS.has(it.t) && isAIDriven(it)),
  driftCount:() => items.filter(it => !it.removed && it.fc && it.fc.estimatedYear != null), driftRevised:() => items.filter(it => !it.removed && it.fc && (it.fc.revisions || []).length),
  driftPeakCount:() => { const y = +chartFacts().driftPeakYear; return items.filter(it => !it.removed && it.fc && (it.fc.actualYear ?? it.fc.estimatedYear) === y); },
  newCount:() => [...new Set(CHANGES.filter(c => c.it && c.type === 'added' && daysAgo(c.date) <= 7).map(c => c.it))], cleanNewCount:() => [...new Set(CHANGES.filter(c => c.it && c.it.dv && c.type === 'added' && daysAgo(c.date) <= 7).map(c => c.it))]
};
function renderSayHtml(tpl, f){
  const g = Object.assign({}, f); Object.keys(LIST_PH).forEach(k => { if (g[k] != null && g[k] !== '') g[k] = `\u0001${k}\u0002`; });
  return esc(tidyText(renderSay(tpl, g))).replace(/\u0001(\w+)\u0002/g, (m, k) => `<button class="colink" data-list="${k}" title="Show these">${esc(f[k])}</button>`);
}
const LIST_TITLES = {pipeTotal:'Clean energy technologies', pipeResearch:'In research', pipePilot:'Piloting', pipeCommercial:'In first commercial use', pipeScale:'At scale', pipeGB:'Deployed in Great Britain', secOpen:'No security response yet',
  aiCount:'AI-driven milestones since 2010', driftCount:'Forecasts being tracked', driftRevised:'Forecasts revised', driftPeakCount:'Expected in the busiest year', newCount:'Added this week', cleanNewCount:'Clean energy additions this week'};
$('chartBody').addEventListener('click', e => { const b = e.target.closest('.colink'); if (!b) return; const list = (LIST_PH[b.dataset.list] || (() => []))(); chPanel(`${LIST_TITLES[b.dataset.list] || 'Items'}: ${list.length}`, chItemsHtml(list, it => `${it.stage || ''}${it.p ? ' · ' + (it.kind === 'proj' ? '~' : '') + it.p : ''}`)); renderCharts(); });
showInsight = function(on){
  const box = $('chartCallout'); if (!on) { box.classList.remove('on'); stopInsight(); return; }
  const t = ((tourText.tours.charts || TOUR_TEXT.tours.charts || {}).steps || {})[CH.tab], upd = (tourText.tours.charts || {}).updated || tourText.updated;
  const html = t ? renderSayHtml(t.say, chartFacts()) : '';
  box.innerHTML = `<div class="cohead"><b>★ Insight: ${chEsc((CHART_TABS.find(x => x[0] === CH.tab) || [])[1])}</b><button class="mini" id="coX" aria-label="Close insight">✕</button></div><p class="cotext">${html}</p>
    <div class="cofoot"><button class="mini" id="coSpeak">🔊 Speak</button><span class="note-s">Select a number to see the items behind it. AI-generated narrative, refreshed weekly by the agents${upd ? ` (updated ${fmtDate(upd)})` : ''}. No human review.</span></div>`;
  box.classList.add('on'); CH.insightOn = true;
};
chartInsight = tab => { const t = ((tourText.tours.charts || TOUR_TEXT.tours.charts || {}).steps || {})[tab]; return t ? tidyText(renderSay(t.say, chartFacts())) : ''; };
/* ---------- better pictures behind two steps: charts instead of a list or the model ---------- */
function chartStepWith(id, tab, opts, extra){ return {id, show:['charts'], act:() => { tourHighlight(null); clearInterval(CH.fortTimer); CH.fortTimer = 0; Object.assign(CH, CH_DEFAULTS, {tab, panel:null, box:null, fortYear:null}, opts || {}); tourFilters(); refresh(); setTimeout(() => { renderCharts(); if (extra) extra(); }, 250); }}; }
const replaceStep = (tourId, id, step) => { const st = TOURS[tourId].steps, i = st.findIndex(s => s.id === id); if (i >= 0) st[i] = step; };
replaceStep('horizon', 'changes', chartStepWith('changes', 'drift', {dvOnly:true}));
replaceStep('secure', 'gaps', chartStepWith('gaps', 'sec', {secSort:'open'}));
/* ---------- a weekly analysis for AI in clean energy ---------- */
function cleanWeekFacts(){
  const wk = tourText.tours.cleanweek || {}, recent = CHANGES.filter(c => c.it && c.it.dv && daysAgo(c.date) <= 7), added = [...new Set(recent.filter(c => c.type === 'added').map(c => c.it.t))];
  return {cleanUpdatedAt:fmtDate(wk.updated || DATA_AS_OF, (wk.updated || '').length > 10 ? 'time' : 'long'), cleanNewCount:String(added.length), cleanNewTitles:added.slice(0, 3).join(', '), cleanCase:added.length ? 'some' : 'none', cleanChangedCount:String(recent.filter(c => c.type !== 'added').length)};
}
function similarity(a, b){ const w = s => new Set(String(s).toLowerCase().match(/[a-z]{4,}/g) || []); const A = w(a), B = w(b); if (!A.size || !B.size) return 0; let n = 0; A.forEach(x => { if (B.has(x)) n++; }); return n / Math.min(A.size, B.size); }
function analysisSteps(tourId, opts){
  const cache = analysisSteps.cache || (analysisSteps.cache = {});   // built once per tour, not on every read
  if (cache[tourId] && Date.now() - cache[tourId].t < 30000) return cache[tourId].steps;
  const st = ((tourText.tours[tourId] || TOUR_TEXT.tours[tourId] || {}).steps) || {}, f = TOURS[tourId].facts(), seen = [];
  const steps = Object.keys(st).filter(id => {   // skip any step that would only repeat an earlier one
    const text = tidyText(renderSay(st[id].say, f)); if (seen.some(t => similarity(t, text) > .6)) return false; seen.push(text); return true;
  }).map(id => { const v = st[id].view || 'main';
    if (CHART_TABS.some(t => t[0] === v)) return chartStepWith(id, v, opts.dvOnly ? {dvOnly:true} : {}, v === 'fort' ? playFortunes : null);
    return {id, show:WEEK_VIEWS[v] || [], act:() => { tourHighlight(null); tourFilters(); if (opts.dvOnly && v === 'main') F.vision = true; view.lanes = 'v'; view.colour = 'v'; syncDisplayUI(); refresh(); if (v === 'main') { resetView(); setAutoRotate(true); tourTimeline(opts.dvOnly ? 1980 : 2000, 1.2); } }}; });;
  cache[tourId] = {t:Date.now(), steps}; return steps
}
Object.defineProperty(TOURS.week, 'steps', {get(){ return analysisSteps('week', {}); }, configurable:true});
TOURS.cleanweek = {title:'AI for clean energy analysis', facts:() => Object.assign({}, chartFacts(), weekFacts(), cleanWeekFacts()), get steps(){ return analysisSteps('cleanweek', {dvOnly:true}); }};
/* ---------- how the charts work: a demonstration of every control ---------- */
const hl = sel => setTimeout(() => tourHighlight(sel), 700);
TOURS.charthow = {title:'How the charts work', facts:() => chartFacts(), steps:[
  chartStepWith('open', 'gaps', {}, () => hl('#chartTabs')),
  chartStepWith('gapsort', 'gaps', {gapSort:'research'}, () => { hl('#chartCtl [data-seg="gapSort"]'); setTimeout(() => { CH.zoom.gaps = [2000, NOW + 10]; renderCharts(); hl('#chartSvg svg'); }, 3500); }),
  chartStepWith('filter', 'gaps', {field:'energy'}, () => hl('#chField')),
  chartStepWith('heat', 'heat', {}, () => setTimeout(() => { heatPanel('energy|2010'); hl('#chartSide'); }, 600)),
  chartStepWith('ai', 'ai', {zoom2:{ai:{x:[2005, NOW], y:[0, Math.log10(16)]}}, aiLabels:'all'}, () => hl('#chartCtl [data-seg="aiMode"]')),
  chartStepWith('pipe', 'pipe', {}, () => setTimeout(() => { const f = document.querySelector('#chartSvg rect.chflow'); if (f) f.dispatchEvent(new MouseEvent('click', {bubbles:true})); hl('#chartSide'); }, 700)),
  chartStepWith('drift', 'drift', {}, () => setTimeout(() => { const b = document.querySelector('#chartSvg .chdyear'); if (b) b.dispatchEvent(new MouseEvent('click', {bubbles:true})); hl('#chartSide'); }, 700)),
  chartStepWith('sec', 'sec', {secSort:'open'}, () => hl('#chartCtl [data-seg="secSort"]')),
  chartStepWith('fort', 'fort', {}, () => { playFortunes(); hl('#chFortPlay'); }),
  chartStepWith('whatif', 'whatif', {wiScen:'high'}, () => { hl('#chartCtl [data-seg="wiScen"]'); setTimeout(() => { const r = document.querySelector('#chartSvg svg:last-of-type .chrow'); if (r) r.dispatchEvent(new MouseEvent('click', {bubbles:true})); }, 2500); }),
  chartStepWith('insight', 'heat', {}, () => { hl('#chInsight'); setTimeout(() => showInsight(true), 1500); })
]};
/* ---------- the walk-throughs, in a sensible order ---------- */
TOUR_LIST.push({id:'cleanweek', title:'AI for clean energy analysis', blurb:"This week's findings for AI in the clean energy system, with the charts behind them.", ready:true},
               {id:'charthow', title:'How the charts work', blurb:'Sorting, filtering, zooming and the insight callouts, chart by chart.', ready:true});
const TOUR_ORDER = ['gap', 'week', 'cleanweek', 'horizon', 'secure', 'fortune', 'charthow', 'how'];
TOUR_LIST.sort((a, b) => TOUR_ORDER.indexOf(a.id) - TOUR_ORDER.indexOf(b.id));
function tourUpdatedLabel(id){ return id === 'week' ? weekFacts().updatedAt : id === 'cleanweek' ? cleanWeekFacts().cleanUpdatedAt : ''; }
