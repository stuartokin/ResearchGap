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
  else { applyPreset('charts'); Object.assign(CH, CH_DEFAULTS, {tab:s.tab, dvOnly:!!s.dvOnly, panel:null, fortYear:null}, s.secSort ? {secSort:s.secSort} : {});
    const d = Object.assign({}, layout.details);   // an extra panel takes the Details panel's place; Details returns when a milestone is selected
    (s.open || []).forEach(p => { setOpen(p, true); Object.assign(layout[p], {x:d.x, y:d.y, w:d.w, h:d.h, sw:d.sw, sh:d.sh}); placeWin(p); raise(p); });
    if ((s.open || []).length) setOpen('details', false); }
  view.myView = null; view.question = id; refresh(); setOpen('questions', false);   // the question steps aside; reopen it from Views
  setTimeout(() => {
    if (!s.panels) { renderCharts(); raise('charts'); }
    if (Q.list) { const [title, L] = Q.list(); chPanel(`${title}: ${L.length}`, L.length ? chItemsHtml(L, fmtStage) : '<p class="note-s">None at the moment.</p>'); renderCharts(); }
    else if (Q.focus) chartFocus(s.tab);
    if (s.play) playFortunes();
    renderQuestions(); toast(Q.see);
  }, 500);
}
function renderQuestions(){
  $('qBody').innerHTML = `<p class="note-s">The questions this tool answers best. Each sets up the panels, filters and chart for you, with the answers listed beside the chart; select any of them for its story. Change anything afterwards, or save it as one of My views. This list steps aside while you look: reopen it from Views, “Start with a question”.</p>
    <ol class="qlist">${QUESTIONS.map(Q => `<li class="${view.question === Q.id ? 'cur' : ''}"><b>${esc(Q.q)}</b><span>${esc(Q.see)}</span><div><button class="mini qgo" data-q="${Q.id}">Show me</button>${Q.tour ? ` <button class="mini qtour" data-tour="${Q.tour}">Play the weekly analysis</button>` : ''}</div></li>`).join('')}</ol>`;
}
$('qBody').addEventListener('click', e => { const b = e.target.closest('.qgo'); if (b) { askQuestion(b.dataset.q); return; } const t = e.target.closest('.qtour'); if (t) { tour.returnTo = JSON.parse(JSON.stringify(snapshot('before-tour'))); startTour(t.dataset.tour); } });
renderQuestions();
$('wQuestions').onclick = () => { if (!aiAcked) return; closeWelcome(true); setTimeout(() => { setOpen('questions', true); raise('questions'); }, 900); };
