/* ==================================================================
 *  START WITH A QUESTION: the questions the tool answers well, each with a ready view and a list of the answers.
 * ================================================================== */
const fmtStage = it => `${it.stage || ''}${it.p ? ' · ' + (it.kind === 'proj' ? '~' : '') + it.p : ''}${it.gb ? ' · GB: ' + ({deployed:'in use', trial:'trial', planned:'planned'}[it.gb] || it.gb) : ''}`;
const live = () => items.filter(it => !it.removed && !it.aud);
const QUESTIONS = [
  {id:'clean-ai', q:'What new technology is coming to help clean energy, and which of it is AI-driven?', see:'The clean energy pipeline and the AI Energy Vision Radar, with the AI-driven clean energy technologies listed.',
    set:{tab:'pipe', dvOnly:true, vision:true, open:['radar']}, list:() => ['AI-driven clean energy technologies', live().filter(it => it.dv && isAIDriven(it)).sort((a, b) => (a.p || 0) - (b.p || 0))]},
  {id:'clean-next', q:'Which clean energy technologies are expected in the next five years, and are they used in Great Britain yet?', see:'Forecast drift for clean energy, with the next five years listed and their GB status.',
    set:{tab:'drift', dvOnly:true, vision:true}, list:() => [`Expected by ${NOW + 5}`, live().filter(it => it.dv && it.kind === 'proj' && it.p <= NOW + 5).sort((a, b) => a.p - b.p)]},
  {id:'ai-faster', q:'Is AI shortening the time from research to real-world use?', see:'AI against the rest, milestone by milestone, beside Key findings.',
    set:{tab:'ai', open:['findings']}, list:() => ['AI-driven milestones since 2010', LIST_PH.aiCount()]},
  {id:'fields', q:'Which fields move fastest and slowest, and is that changing?', see:'The heatmap of years to first product, field by decade, with the fastest field’s recent milestones.',
    set:{tab:'heat'}, focus:true},
  {id:'security', q:'Where are the security gaps as new technology arrives?', see:'The security lag with open gaps first, beside the Cyber lens.',
    set:{tab:'sec', secSort:'open', open:['cyber']}, list:() => ['No security response yet', LIST_PH.secOpen()]},
  {id:'whatif', q:'How much sooner could practical AI bring the pipeline forward?', see:'What if?, with each technology’s levers and the reasoning behind them.',
    set:{tab:'whatif'}, focus:true},
  {id:'slips', q:'Which forecasts are slipping, and by how much?', see:'Forecast drift, with the forecasts the agents have revised.',
    set:{tab:'drift'}, list:() => ['Forecasts revised', LIST_PH.driftRevised()]},
  {id:'fortune', q:'How quickly does research become a fortune, and who does it?', see:'The race to a fortune playing through time, beside Time to a fortune.',
    set:{tab:'fort', open:['fortunes'], play:true}},
  {id:'changed', q:'What has changed this week?', see:'Data changes and the AI Energy Vision Radar’s new arrivals. The weekly analysis tour tells the story.',
    set:{panels:['changes', 'radar']}, tour:'week'}
];
function askQuestion(id){
  const Q = QUESTIONS.find(x => x.id === id); if (!Q) return; const s = Q.set;
  closeDrops(); Object.assign(F, DEFAULT_FILTERS()); F.fields = new Set(FKEYS.filter(k => FIELDS[k] && !FIELDS[k].custom)); if (s.vision) F.vision = true;
  if (s.panels) { applyPreset('explore'); s.panels.forEach(p => { setOpen(p, true); raise(p); }); }
  else { applyPreset('charts'); Object.assign(CH, CH_DEFAULTS, {tab:s.tab, dvOnly:!!s.dvOnly, panel:null, fortYear:null, insightOn:false}, s.secSort ? {secSort:s.secSort} : {});
    const d = Object.assign({}, layout.details);   // an extra panel takes the Details panel's place; Details returns when a milestone is selected
    (s.open || []).forEach(p => { setOpen(p, true); Object.assign(layout[p], {x:d.x, y:d.y, w:d.w, h:d.h, sw:d.sw, sh:d.sh}); placeWin(p); raise(p); });
    if ((s.open || []).length) setOpen('details', false); }
  view.myView = null; view.question = id; refresh(); setOpen('questions', false);   // the question steps aside; reopen it from Views
  setTimeout(() => {
    if (!s.panels) { CH.insightOn = false; if (typeof showInsight === 'function') showInsight(false); renderCharts(); raise('charts'); }   // the question's insight speaks for it
    if (Q.list) { const [title, L] = Q.list(); chPanel(`${title}: ${L.length}`, L.length ? chItemsHtml(L, fmtStage) : '<p class="note-s">None at the moment.</p>'); renderCharts(); }
    else if (Q.focus) chartFocus(s.tab);
    if (s.play) playFortunes();
    renderQuestions(); if (view.autoInsight !== false) showQInsight(id); else { hideQInsight(); toast(Q.see); }
  }, 500);
}
function renderQuestions(){
  $('qBody').innerHTML = `<p class="note-s">The questions this tool answers best. Each sets up the panels, filters and chart for you, with the answers listed beside the chart; select any of them for its story. Change anything afterwards, or save it as one of My views. This list steps aside while you look: reopen it from Views, “Start with a question”.</p>
    <ol class="qlist">${QUESTIONS.map(Q => `<li class="${view.question === Q.id ? 'cur' : ''}"><b>${esc(Q.q)}</b><span>${esc(Q.see)}</span><div><button class="mini qgo" data-q="${Q.id}">Show me</button>${Q.tour ? ` <button class="mini qtour" data-tour="${Q.tour}">Play the weekly analysis</button>` : ''}</div></li>`).join('')}</ol>`;
}
$('qBody').addEventListener('click', e => { const b = e.target.closest('.qgo'); if (b) { askQuestion(b.dataset.q); return; } const t = e.target.closest('.qtour'); if (t) { tour.returnTo = JSON.parse(JSON.stringify(snapshot('before-tour'))); startTour(t.dataset.tour); } });
renderQuestions();
$('wQuestions').onclick = () => { if (!aiAcked) return; closeWelcome(true); setTimeout(() => { setOpen('questions', true); raise('questions'); }, 900); };

/* ---------- question insights: like the chart insights, written by the agents, figures from the live data ---------- */
function questionFacts(){
  const L = live(), clean = L.filter(it => it.dv), ai = clean.filter(isAIDriven), next = clean.filter(it => it.kind === 'proj' && it.p <= NOW + 5), area = {};
  ai.forEach(it => { area[it.dv] = (area[it.dv] || 0) + 1; }); const top = Object.entries(area).sort((a, b) => b[1] - a[1])[0];
  const gbn = next.filter(it => it.gb === 'deployed' || it.gb === 'trial').length;
  return Object.assign({}, chartFacts(), weekFacts(), {cleanAiCount:String(ai.length), cleanAiGB:String(ai.filter(it => it.gb === 'deployed').length), cleanAiResearch:String(ai.filter(it => (it.stage || 'research') === 'research').length),
    cleanAiTopArea:top ? VISION[top[0]] || top[0] : 'No area', cleanNext5:String(next.length), cleanNext5GB:String(gbn), cleanNextCase:gbn ? 'some' : 'none', next5Year:String(NOW + 5)});
}
Object.assign(LIST_PH, {
  cleanAiCount:() => live().filter(it => it.dv && isAIDriven(it)), cleanAiGB:() => live().filter(it => it.dv && isAIDriven(it) && it.gb === 'deployed'),
  cleanAiResearch:() => live().filter(it => it.dv && isAIDriven(it) && (it.stage || 'research') === 'research'),
  cleanNext5:() => live().filter(it => it.dv && it.kind === 'proj' && it.p <= NOW + 5), cleanNext5GB:() => live().filter(it => it.dv && it.kind === 'proj' && it.p <= NOW + 5 && (it.gb === 'deployed' || it.gb === 'trial'))});
Object.assign(LIST_TITLES, {cleanAiCount:'AI-driven clean energy technologies', cleanAiGB:'AI-driven, used in Great Britain', cleanAiResearch:'AI-driven, still in research', cleanNext5:'Expected in the next five years', cleanNext5GB:'In use or on trial in Great Britain'});
const qTemplate = id => (((tourText.tours.questions || TOUR_TEXT.tours.questions || {}).steps) || {})[id];
function questionInsight(id){ const t = qTemplate(id); return t ? tidyText(renderSay(t.say, questionFacts())) : ''; }
function showQInsight(id){
  const Q = QUESTIONS.find(x => x.id === id), t = qTemplate(id); if (!Q || !t) return;
  $('qInsight').innerHTML = `<div class="qihead"><b>★ ${esc(Q.q)}</b><button class="mini" id="qiX" aria-label="Close this insight">✕</button></div><p class="qitext">${renderSayHtml(t.say, questionFacts())}</p>
    <div class="qifoot"><button class="mini" id="qiSpeak">🔊 Speak</button><span class="note-s">${esc(Q.see)} Select a number to see what is behind it. AI-generated narrative, refreshed weekly by the agents; no human review.</span></div>`;
  $('qInsight').dataset.q = id; $('qInsight').classList.add('on');
}
function hideQInsight(){ $('qInsight').classList.remove('on'); stopInsight(); }
$('qInsight').addEventListener('click', e => {
  if (e.target.id === 'qiX') { hideQInsight(); return; }
  if (e.target.id === 'qiSpeak') { speakInsight(questionInsight($('qInsight').dataset.q)); return; }
  const b = e.target.closest('.colink'); if (!b) return; const L = (LIST_PH[b.dataset.list] || (() => []))();
  if (!layout.charts.open) { setOpen('charts', true); raise('charts'); }
  chPanel(`${LIST_TITLES[b.dataset.list] || 'Items'}: ${L.length}`, chItemsHtml(L, fmtStage)); renderCharts();
});
$('autoInsS').value = view.autoInsight === false ? 'off' : 'on';
$('autoInsS').onchange = e => { view.autoInsight = e.target.value === 'on'; if (!view.autoInsight) { hideQInsight(); if (typeof showInsight === 'function') showInsight(false); CH.insightOn = false; } else { CH.insightOn = true; if (layout.charts.open) renderCharts(); } };
/* recorded with the AI voice each week, like the tours and chart insights */
const tourTextsBeforeQuestions = window.__tourTexts;
window.__tourTexts = () => tourTextsBeforeQuestions().concat(QUESTIONS.map(Q => ({tour:'questions', step:Q.id, text:questionInsight(Q.id)})).filter(x => x.text));
/* ---------- the welcome screen's signposts: Learn, Start here, Jump right in ---------- */
(() => { let k = 0, n = 0; const signs = () => [...document.querySelectorAll('#welcome .wrib')];
  const tick = () => { const s = signs(); if (!$('welcome').classList.contains('on') || $('welcome').classList.contains('needack')) { s.forEach(x => x.classList.remove('lit')); return; }
    s.forEach((x, i) => x.classList.toggle('lit', i === k % s.length)); k++; if (++n > s.length * 3) { clearInterval(timer); s.forEach(x => x.classList.add('lit')); } };   /* three rounds, then all stay lit */
  const timer = setInterval(tick, 1800); })();
