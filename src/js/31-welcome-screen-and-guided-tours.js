/* ==================================================================
 *  WELCOME SCREEN AND GUIDED TOURS
 *  Tours drive the real app. Narration is written as functions of live facts, so both the figures and the
 *  conclusions (shrunk or grown, faster or slower, yes or not yet) follow the data each time a tour runs.
 * ================================================================== */
const TOUR_LIST = [
  {id:'gap', title:'Is AI shrinking the gap from research to change?', blurb:'The core question, the evidence and the outlook.', ready:true},
  {id:'horizon', title:'What AI-assisted products are on the horizon for the energy system?', blurb:'Horizon scanning for AI in the clean energy system.', ready:false},
  {id:'secure', title:'Securing the future energy system', blurb:'Attack surfaces, security responses and mitigations.', ready:false},
  {id:'fortune', title:'From lab to fortune', blurb:'How research turns into companies and wealth.', ready:false},
  {id:'how', title:'How this AI model works', blurb:'The agents, their guardrails and the data quality.', ready:false}
];
/* ---------- live facts for the gap tour ---------- */
function gapFacts(){
  const med = a => a.length ? median(a) : null, r1 = v => v == null ? null : Math.round(v * 10) / 10, rd = v => v == null ? null : Math.round(v);
  // the same definitions as the windows shown while each step speaks:
  // Key findings (landed technology arcs, company products excluded) and Can AI shrink the gap? (also excluding policy arcs)
  const pool = items.filter(it => it.kind === 'hist' && !it.removed && !it.aud && !it.co);
  const like = it => !POLICY_ARCS.has(it.t) && !it.aud && !it.removed;
  const f = {n:items.filter(it => !it.removed && !it.aud).length};
  f.pre = rd(med(pool.filter(it => it.p < 1970).map(it => it.lag))); f.recent = rd(med(pool.filter(it => it.p >= 2000).map(it => it.lag)));
  const s10 = items.filter(it => it.kind === 'hist' && !it.co && it.r >= 2010 && like(it)); f.ai = r1(med(s10.filter(isAIDriven).map(it => it.lag))); f.oth = r1(med(s10.filter(it => !isAIDriven(it)).map(it => it.lag)));
  f.nAI = s10.filter(isAIDriven).length; f.adopt = rd(med(pool.filter(it => it.adopt && it.adopt <= NOW).map(it => it.adopt - it.p)));
  const running = items.filter(it => !it.removed && !it.aud && !it.co && (it.kind === 'proj' || it.kind === 'flight') && it.r >= 2010).map(it => Math.max(.5, NOW - it.r));
  f.km = kmMedian(pool.filter(it => it.r >= 2010).map(it => it.lag), running); f.nRunning = running.length;
  const fm = FKEYS.filter(k => FIELDS[k] && !FIELDS[k].custom).map(k => { const v = pool.filter(it => it.v === k && it.p >= 2000).map(it => it.lag); return {k, n:v.length, m:v.length ? median(v) : null}; }).filter(x => x.n >= 5 && x.m != null).sort((a, b) => a.m - b.m);
  f.fastest = fm[0] || null; f.aiRank = fm.findIndex(x => x.k === 'ai') + 1; f.nFields = fm.length;
  const out = items.filter(it => it.kind === 'proj' && it.r >= 2015 && like(it)); f.aiOut = rd(med(out.filter(isAIDriven).map(it => it.lag))); f.convOut = rd(med(out.filter(it => !isAIDriven(it)).map(it => it.lag)));
  // conclusions
  f.trend = f.pre == null || f.recent == null ? 'unclear' : f.pre - f.recent >= 2 ? 'shrunk' : f.recent - f.pre >= 2 ? 'grown' : 'flat';
  f.aiCmp = f.ai == null || f.oth == null || f.nAI < 5 ? 'unclear' : f.oth - f.ai >= 1 ? 'faster' : f.ai - f.oth >= 1 ? 'slower' : 'similar';
  f.outCmp = f.aiOut == null || f.convOut == null ? 'unclear' : f.convOut - f.aiOut >= 1 ? 'faster' : f.aiOut - f.convOut >= 1 ? 'slower' : 'similar';
  f.corr = !f.km ? 'unclear' : f.km.m != null ? (f.pre != null && f.km.m < f.pre - 1 ? 'holds' : 'weakens') : 'tooEarly';
  f.score = (f.trend === 'shrunk') + (f.aiCmp === 'faster') + (f.outCmp === 'faster') + (f.corr === 'holds');
  // display-ready values for the narration templates in data/tours.json
  const ex = tourExample(), W = v => yrs(v);
  Object.assign(f, {nText:String(f.n), preT:W(f.pre), recentT:W(f.recent), adoptT:W(f.adopt), hasAdopt:f.adopt != null ? 'yes' : 'no', kmYears:f.km && f.km.m != null ? W(Math.round(f.km.m)) : '',
    exFound:ex ? 'yes' : 'no', exTitle:ex ? ex.t : '', exWhere:ex ? (ex.co ? 'at ' + ex.co : ({academic:'at a university', industry:'in industry', government:'in a government lab'}[ex.s] || '')) : '',
    exR:ex ? String(ex.r) : '', exP:ex ? String(ex.p) : '', exAdopt:ex && ex.adopt ? String(ex.adopt) : '', exHasAdopt:ex && ex.adopt && ex.adopt <= NOW ? 'yes' : 'no',
    fastestIsAI:!f.fastest ? 'none' : f.fastest.k === 'ai' ? 'ai' : 'other', fastestName:f.fastest ? FIELDS[f.fastest.k].name.toLowerCase() : '', fastestYears:f.fastest ? W(Math.round(f.fastest.m)) : '',
    aiRankWord:['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh'][f.aiRank] || '', nFieldsT:String(f.nFields),
    aiT:W(f.ai), othT:W(f.oth), aiOutT:W(f.aiOut), convOutT:W(f.convOut), scoreT:String(f.score)});
  return f;
}
/* ---------- narration templates (data/tours.json) ---------- */
const TOUR_TEXT = (() => { try { return JSON.parse(document.getElementById('embedded-tours').textContent.replace('/*TOURS-START*/', '').replace('/*TOURS-END*/', '').trim()); } catch (e) { return {tours:{}}; } })();
let tourText = TOUR_TEXT, tourAudio = {voice:'', files:{}};
if (location.protocol.indexOf('http') === 0) {
  fetch('data/tours.json', {cache:'no-cache'}).then(r => r.ok ? r.json() : null).then(t => { if (t && t.tours && (t.version || 0) >= (TOUR_TEXT.version || 0)) tourText = t; }).catch(() => {});
  fetch('audio/manifest.json', {cache:'no-cache'}).then(r => r.ok ? r.json() : null).then(m => { if (m && m.files) tourAudio = m; }).catch(() => {});
}
const PH = {n:'nText', pre:'preT', recent:'recentT', adopt:'adoptT', ai:'aiT', oth:'othT', aiOut:'aiOutT', convOut:'convOutT', nFields:'nFieldsT', score:'scoreT'};
function renderSay(tpl, f){
  if (tpl == null) return '';
  if (typeof tpl === 'string') return tpl.replace(/\{(\w+)\}/g, (m, k) => { const v = f[PH[k] || k]; return v == null ? '' : String(v); });
  if (Array.isArray(tpl)) return tpl.map(t => renderSay(t, f)).join('');
  if (tpl.by) { const v = String(f[PH[tpl.by] || tpl.by]); return renderSay(tpl.cases[v] != null ? tpl.cases[v] : tpl.cases.default, f); }
  return '';
}
function stepText(tourId, st, f){ const t = (tourText.tours[tourId] || {}).steps || {}, fb = (TOUR_TEXT.tours[tourId] || {}).steps || {}; return tidyText(renderSay((t[st.id] || fb[st.id] || {}).say, f)); }
function tidyText(s){ return String(s).replace(/\s+/g, ' ').replace(/\b(\w+)\s+\1\b/gi, '$1').replace(/\s+([.,;:])/g, '$1').replace(/\.\s*\./g, '.').trim(); }   // no doubled words or stray spaces
/* every sentence the tours will speak with today's data: used by the weekly voice step to record them */
window.__tourTexts = () => Object.keys(TOURS).flatMap(id => { const f = TOURS[id].facts(); return TOURS[id].steps.map(st => ({tour:id, step:st.id, text:stepText(id, st, f)})); });
/* FNV-1a hash of the exact sentence and voice, matched by tools/make_voice.py */
function textKey(text, voice){ const b = new TextEncoder().encode(text.replace(/\s+/g, ' ').trim() + '|' + voice); let h = 0x811c9dc5; for (const x of b) { h ^= x; h = Math.imul(h, 0x01000193) >>> 0; } return ('0000000' + h.toString(16)).slice(-8); }
function yrs(v){ return v == null ? 'an unknown number of' : (v === 1 ? 'one' : String(v).replace(/\.0$/, '')); }
const TOURS = {
  gap: {title:'Is AI shrinking the gap from research to change?', facts:gapFacts, steps:[   // about 145 words: one minute of narration
    {id:'intro', show:[], act:() => { tourFilters(); view.lanes = 's'; view.colour = 's'; view.labelScope = 'major'; view.adoption = true; syncDisplayUI(); refresh(); resetView(); setAutoRotate(true); tourTimeline(null); }},
    {id:'example', show:['details'], pick:() => { const it = tourExample(); return it && it.labelEl && it.labelEl.offsetParent ? it.labelEl : null; },
     act:() => { const it = tourExample(); if (it) { hidden.delete(it.id); openDetail(it); } }},
    {id:'century', show:['player'], pick:() => $('playBtn'), act:() => { setOpen('details', false); tourTimeline(Y0, 3); }},
    {id:'trend', show:['findings'], act:() => { view.lanes = 'v'; view.colour = 'v'; syncDisplayUI(); refresh(); tourTimeline(2000, 1.2); }},
    {id:'corrected', show:['summary'], act:() => { view.statsBy = 'began'; view.survival = true; view.gapMetric = 'first'; renderStats(); tourTimeline(2010, .9); }},
    {id:'gapchart', show:['gapchart'], act:() => { tourTimeline(null); twKey = ''; updateTimeWindows(true); }},
    {id:'fields', show:['filters'], act:() => { F.fields = new Set(['ai']); view.subLanes = true; view.panels = view.panels || {}; view.panels.filters = {fields:true}; refresh(); syncPanels(); tourTimeline(2000, 1.2);
        setTimeout(() => { tourHighlight('#fieldList .frow[data-f="ai"], #w-filters .subbox'); const r = document.querySelector('#fieldList .frow[data-f="ai"]'); if (r) r.scrollIntoView({block:'center'}); }, 120); }},
    {id:'outlook', show:['outlook'], act:() => { tourHighlight(null); tourFilters(); refresh(); tourTimeline(2010, .9); }},
    {id:'answer', show:['findings'], act:() => tourTimeline(null)}
  ]}
};
/* ---------- tours 2 to 5: live facts and steps (words in data/tours.json) ---------- */
const med2 = a => a.length ? median(a) : null, num = v => v == null ? '' : String(Math.round(v));
const daysAgo = d => (new Date(DATA_AS_OF + 'T12:00:00Z') - new Date(d + 'T12:00:00Z')) / 864e5;
const desnzFields = () => new Set(FKEYS.filter(k => items.some(it => it.v === k && it.dv && !it.removed)));
function horizonFacts(){
  const its = items.filter(it => !it.removed && it.dv), cnt = st => String(its.filter(it => it.stage === st).length);
  const recent = CHANGES.filter(c => c.it && c.it.dv && c.type === 'added' && daysAgo(c.date) <= 90);
  const next = its.filter(it => it.kind === 'proj' && it.p <= NOW + 5).sort((a, b) => a.p - b.p);
  const byArea = {}; next.forEach(it => { byArea[it.dv] = (byArea[it.dv] || 0) + 1; });
  const busy = Object.keys(byArea).sort((a, b) => byArea[b] - byArea[a])[0];
  return {nResearch:cnt('research'), nPilot:cnt('pilot'), nCommercial:cnt('commercial'), nScale:cnt('scale'), nGB:String(its.filter(it => it.gb === 'deployed').length),
    newCase:recent.length ? 'some' : 'none', newCount:String(recent.length), newTitle:recent[0] ? recent[0].it.t : '',
    nextCase:next.length ? 'some' : 'none', nextCount:String(next.length), nextTitle:next[0] ? next[0].t : '', nextYear:next[0] ? String(next[0].p) : '', busiestArea:busy ? VISION[busy] : '',
    horizonCase:next.length >= 8 ? 'busy' : next.length >= 3 ? 'steady' : 'quiet'};
}
function secExample(){ return items.find(it => it.uid === 'smart-meters-at-scale' && !it.removed) || items.find(it => !it.removed && it.attack && it.v === 'energy' && it.secG && it.kind === 'hist') || null; }
function secureFacts(){
  const withSec = items.filter(it => !it.removed && it.sec != null && !it.aud), techs = items.filter(it => !it.removed && it.attack && it.kind === 'hist');
  const withR = techs.map(it => ({it, r:secResponse(it)})).filter(x => x.r), landed = withR.filter(x => x.r.resp && !x.r.expected);
  const lag = med2(landed.map(x => x.r.lag)), early = med2(landed.filter(x => x.it.p < 2000).map(x => x.r.lag)), late = med2(landed.filter(x => x.it.p >= 2000).map(x => x.r.lag));
  const gaps = withR.filter(x => !x.r.resp && x.it.p >= 2010 && x.it.p <= NOW - 3).sort((a, b) => b.it.p - a.it.p);
  const gu = (DB.guidanceUpdates || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
  return {attackPct:num(withSec.filter(it => it.attack).length / Math.max(1, withSec.length) * 100), lag:num(lag),
    lagCase:lag == null ? 'unclear' : lag >= 5 ? 'slow' : lag >= 2 ? 'moderate' : 'fast',
    gapCase:gaps.length ? 'some' : 'none', gapCount:String(gaps.length), gapTitle:gaps[0] ? gaps[0].it.t : '',
    guideCase:gu ? 'some' : 'none', guideTitle:gu ? gu.title : '',
    trendCase:early == null || late == null ? 'unclear' : late <= early - 2 ? 'improving' : late >= early + 2 ? 'worsening' : 'flat'};
}
function fortuneFacts(){
  const fs = FORTUNES.filter(x => x.w && x.f), d = x => x.w - x.f, pre = med2(fs.filter(x => x.f < 1970).map(d)), rec = med2(fs.filter(x => x.f >= 2015).map(d));
  const fast = fs.slice().sort((a, b) => d(a) - d(b) || b.w - a.w)[0], h = headline();
  return {nFortunes:String(fs.length), nResearch:String(fs.filter(x => x.ac).length), preYears:num(pre), recentYears:num(rec),
    speedCase:pre == null || rec == null ? 'unclear' : rec <= pre - 2 ? 'faster' : rec >= pre + 2 ? 'slower' : 'similar',
    fastestCo:fast ? fast.co : '', fastestTime:fast ? (d(fast) < 1 ? 'under a year' : d(fast) === 1 ? 'one year' : `${d(fast)} years`) : '',
    ukYears:num(h.uk), rowYears:num(h.row), ukCase:h.uk == null || h.row == null || h.ukn < 5 ? 'unclear' : h.uk <= h.row - 1 ? 'faster' : h.uk >= h.row + 1 ? 'slower' : 'similar',
    nUni:String(items.filter(it => it.uni && !it.removed).length)};
}
function howFacts(){
  const ms = items.filter(it => !it.removed && !it.aud), fc = items.filter(it => it.fc && it.fc.actualYear != null);
  return {nMilestones:String(ms.length), pctSourceCited:num(ms.filter(it => it.ver === 'source-cited').length / Math.max(1, ms.length) * 100), fcCase:fc.length ? 'scored' : 'none', fcResolved:String(fc.length)};
}
const panelOpen = (win, sec) => { view.panels = view.panels || {}; view.panels[win] = {[sec]:true}; syncPanels(); };
const scrollToText = (sel, rx) => setTimeout(() => { const el = [...document.querySelectorAll(sel)].find(e => rx.test(e.textContent)); if (el) { el.scrollIntoView({block:'start'}); tourHighlight(null); el.classList.add('tourhl'); } }, 350);
Object.assign(TOURS, {
  horizon:{title:'What AI-assisted products are on the horizon for the energy system?', facts:horizonFacts, steps:[
    {id:'intro', show:['vision'], act:() => { tourFilters(); F.fields = desnzFields(); F.vision = true; view.lanes = 'v'; view.colour = 'v'; syncDisplayUI(); refresh(); resetView(); tourTimeline(1980, .8); }},
    {id:'radar', show:['radar'], act:() => { view.radarSince = '90'; renderRadar(); setTimeout(() => tourHighlight('#radarBody .rpipe'), 300); }},
    {id:'new', show:['radar'], act:() => setTimeout(() => tourHighlight('#radarReviewed, #radarBody .rsub > b:first-child'), 200)},
    {id:'next', show:['radar'], act:() => scrollToText('#radarBody .rsub > b', /next five years/i)},
    {id:'changes', show:['changes'], act:() => { tourHighlight(null); view.chgScope = 'desnz'; syncChgUI(); applyChangeFlags(); renderChanges(); }},
    {id:'slide', show:['report'], act:() => setTimeout(() => { tourHighlight('#repDesnz'); const b = $('repDesnz'); if (b) b.scrollIntoView({block:'center'}); }, 300)},
    {id:'answer', show:['radar'], act:() => { tourHighlight(null); tourTimeline(null); }}
  ]},
  secure:{title:'Securing the future energy system', facts:secureFacts, steps:[
    {id:'intro', show:['filters'], act:() => { tourFilters(); F.attackOnly = true; view.lanes = 'v'; view.colour = 'v'; syncDisplayUI(); refresh(); panelOpen('filters', 'cyber'); tourTimeline(1990, 1.2);
      setTimeout(() => { tourHighlight(null); const l = $('attackT') && $('attackT').closest('label'); if (l) { l.classList.add('tourhl'); l.scrollIntoView({block:'center'}); } }, 300); }},
    {id:'lens', show:['cyber'], act:() => { tourHighlight(null); renderCyber(); setTimeout(() => tourHighlight('#cyberBody .kf'), 300); }},
    {id:'gaps', show:['cyber'], act:() => scrollToText('#cyberBody h3', /Open gaps/)},
    {id:'example', show:['details'], pick:() => { const it = secExample(); return it && it.labelEl && it.labelEl.offsetParent ? it.labelEl : null; },
     act:() => { tourHighlight(null); F.attackOnly = false; refresh(); const it = secExample(); if (it) { hidden.delete(it.id); openDetail(it); }
       setTimeout(() => { const m = document.querySelector('#detailBody .mitig'); if (m) { m.open = true; m.classList.add('tourhl'); m.scrollIntoView({block:'start'}); } }, 3200); }},
    {id:'guidance', show:['cyber'], act:() => { tourHighlight(null); renderCyber(); scrollToText('#cyberBody h3', /Latest guidance/); }},
    {id:'caution', show:['cyber'], act:() => setTimeout(() => { tourHighlight(null); const w = document.querySelector('#cyberBody .aiwarn'); if (w) { w.classList.add('tourhl'); w.scrollIntoView({block:'center'}); } }, 300)},
    {id:'answer', show:['cyber'], act:() => { tourHighlight(null); setTimeout(() => tourHighlight('#cyberBody .kf'), 200); tourTimeline(null); }}
  ]},
  fortune:{title:'From lab to fortune', facts:fortuneFacts, steps:[
    {id:'intro', show:['fortunes'], act:() => { tourFilters(); view.fortSort = 'year'; refresh(); renderFortunes(); tourTimeline(1950, 1.5); }},
    {id:'research', show:['fortunes'], act:() => setTimeout(() => tourHighlight('#fortBanner'), 200)},
    {id:'speed', show:['fortunes'], act:() => setTimeout(() => tourHighlight('#fortStat'), 200)},
    {id:'fastest', show:['fortunes'], act:() => { view.fortSort = 'speed'; renderFortunes(); setTimeout(() => tourHighlight('#fortSortSeg button[data-v="speed"]'), 200); }},
    {id:'uk', show:['filters'], act:() => { tourHighlight(null); view.fortSort = 'year'; Object.keys(F.regions).forEach(k => { F.regions[k] = k === 'uk'; }); refresh(); panelOpen('filters', 'origin');
      setTimeout(() => tourHighlight('#regionChips .chipbtn[data-k="uk"]'), 300); }},
    {id:'uni', show:['filters'], act:() => { tourFilters(); F.uniOnly = true; refresh(); panelOpen('filters', 'origin'); setTimeout(() => { tourHighlight(null); const l = $('uniOnlyT') && $('uniOnlyT').closest('label'); if (l) l.classList.add('tourhl'); }, 300); }},
    {id:'table', show:['table'], act:() => { tourHighlight(null); tourFilters(); refresh(); tabSort = {k:'lag', dir:1}; renderTable(); setTimeout(() => tourHighlight('#tabHead th[data-k="lag"]'), 300); }},
    {id:'answer', show:['fortunes'], act:() => { tourHighlight(null); renderFortunes(); tourTimeline(null); }}
  ]},
  how:{title:'How this AI model works', facts:howFacts, steps:[
    {id:'intro', show:[], act:() => { tourFilters(); view.lanes = 'v'; view.colour = 'v'; syncDisplayUI(); refresh(); resetView(); setAutoRotate(true); tourTimeline(null); }},
    {id:'research', show:['changes'], act:() => { view.chgScope = 'all'; syncChgUI(); renderChanges(); tourTimeline(2015, 1); }},
    {id:'qa', show:['changes'], act:() => setTimeout(() => { tourHighlight(null); const r = document.querySelector('#w-changes .chgrow'); if (r) r.classList.add('tourhl'); }, 300)},
    {id:'more', show:['cyber'], act:() => { tourHighlight(null); renderCyber(); scrollToText('#cyberBody h3', /Latest guidance/); }},
    {id:'quality', show:['quality'], act:() => { tourHighlight(null); renderQuality(); setTimeout(() => tourHighlight('#qualBody .kbars:first-of-type'), 300); }},
    {id:'labels', show:['filters'], act:() => { tourHighlight(null); panelOpen('filters', 'trust'); setTimeout(() => tourHighlight('#verChips'), 300); }},
    {id:'arrange', show:[], act:() => { tourHighlight(null); setTimeout(() => { if (!tour.on) return; positionWinMenu(); winMenu.classList.add('open'); tourHighlight('#winMenu .wmpre'); }, 900); }},
    {id:'answer', show:[], act:() => { winMenu.classList.remove('open'); tourHighlight('#aboutBtn'); tourTimeline(null); }}
  ]}
});
TOUR_LIST.forEach(t => { t.ready = !!TOURS[t.id]; });

/* ---------- the engine ---------- */
const tour = {on:false, id:null, i:0, facts:null, token:0, timer:0, paused:false, muted:!!prefs.tourMuted, saved:null};
let tourVoice = null;
function pickVoice(){
  if (!('speechSynthesis' in window)) return;
  const vs = speechSynthesis.getVoices().filter(v => /^en[-_]/i.test(v.lang));
  const fem = /female|libby|sonia|maisie|hazel|susan|serena|kate|martha|stephanie|fiona|moira|tessa|karen|samantha|victoria|zira|aria|jenny|emma|amy|olivia|natasha|ava|allison/i;
  tourVoice = vs.find(v => /en[-_]GB/i.test(v.lang) && fem.test(v.name)) || vs.find(v => fem.test(v.name)) || vs.find(v => /en[-_]GB/i.test(v.lang)) || vs[0] || null;
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function tourTimeline(from, speed){   // play the years the narration is about; null shows the whole century, still
  cancelCountdown(); if (state.playing) stopPlay();
  if (from == null) { state.cursor = Y1; return; }
  view.playFrom = from <= Y0 ? null : from; view.playTo = null; playSpeed = speed || 1.5; syncPlayRangeUI(); startPlay();
}
function tourExample(){   // a well-known breakthrough with all three stages in the data
  const ok = it => it && !it.removed && it.kind === 'hist' && it.adopt && it.adopt <= NOW;
  const ids = ((tourText.tours.gap || {}).exampleIds || []).concat(['transistor', 'lithium-ion-battery', 'world-wide-web', 'mrna-vaccines']);
  const pref = ids.map(u => items.find(it => it.uid === u)).find(ok);
  return pref || items.filter(it => ok(it) && it.major).sort((a, b) => a.r - b.r)[0] || null;
}
function tourHighlight(sel){ document.querySelectorAll('.tourhl').forEach(e => e.classList.remove('tourhl')); if (sel) document.querySelectorAll(sel).forEach(e => e.classList.add('tourhl')); }
function tourFilters(){ Object.assign(F, DEFAULT_FILTERS()); F.fields = new Set(FKEYS.filter(k => FIELDS[k] && !FIELDS[k].custom)); F.subOff = {}; }   // every filter back to its default
function tourPlace(ids){
  const W = innerWidth, H = innerHeight, cls = screenClass(), bar = $('tourBar').getBoundingClientRect(), bottom = H - bar.height - 18, top = 70;
  WIN_IDS.forEach(id => { if (['toolbar', 'footer', 'pagetitle'].includes(id)) return; if (id !== 'player' || !ids.includes('player')) { layout[id].open = false; placeWin(id); } });
  const solid = ids.filter(id => id !== 'player');
  if (ids.includes('player')) { const pw = Math.min(layout.player.w || 640, W - 24), ph = layout.player.h || 190; Object.assign(layout.player, {x:(W - pw) / 2, y:Math.max(top, bottom - ph), w:pw, h:ph, open:true}); placeWin('player'); }
  solid.forEach((id, k) => {
    let r;
    if (id === 'charts') r = H > W && W < 1100 ? {x:6, y:top, w:W - 12, h:bottom - top} : {x:Math.round(W * .26), y:top, w:Math.round(W * .74) - 14, h:bottom - top};   // charts need the room
    else if (H > W && W < 1100) r = {x:6, y:Math.max(top, H * .5), w:W - 12, h:bottom - Math.max(top, H * .5)};   // portrait: below the model
    else { const w = cls === 'large' ? Math.min(500, W * .3) : cls === 'laptop' ? Math.min(440, W * .32) : Math.min(380, W * .4); r = {x:id === 'filters' ? 14 : W - w - 14, y:top, w, h:bottom - top}; }
    Object.assign(layout[id], r, {open:true, sw:W, sh:H}); placeWin(id);
    if (id === 'charts') { if (typeof raise === 'function') raise('charts'); setTimeout(renderCharts, 50); }
    if (id === 'findings') renderFindings(); if (id === 'outlook') renderOutlook(); if (id === 'summary') renderStats();
  });
}
function tourSay(text, done){
  const tok = tour.token, fin = () => { if (tok === tour.token) { clearTimeout(tour.timer); done(); } };
  $('tourCap').textContent = text;
  const est = Math.max(4000, text.split(/\s+/).length / 2.7 * 1000);
  if (tour.muted) { tour.timer = setTimeout(fin, est); return; }
  const file = tourAudio.voice && tourAudio.files[textKey(text, tourAudio.voice)];
  if (file) {   // recorded voice for this exact sentence
    const a = tour.audio || (tour.audio = new Audio()); a.pause(); a.preload = 'auto'; a.src = 'audio/' + file; let started = false;
    const fallback = () => { if (tok === tour.token && !started) { started = true; browserSay(text, fin, est); } };   // only if the recording never started
    a.onplaying = () => { if (started) return; started = true; clearTimeout(tour.timer); tour.timer = setTimeout(fin, Math.max(est, (a.duration || 0) * 1000) + 8000); };
    a.onended = () => setTimeout(fin, 400);
    a.onerror = () => { if (!started) fallback(); else { clearTimeout(tour.timer); tour.timer = setTimeout(fin, 1200); } };   // a hiccup after starting: never restart in another voice
    a.play().catch(fallback);
    tour.timer = setTimeout(fallback, 7000); return;
  }
  browserSay(text, fin, est);
}
function speechText(text){   // spoken forms, such as DESNZ as one word; shared with tools/make_voice.py through data/tours.json
  const pr = Object.assign({}, TOUR_TEXT.pronounce || {}, tourText.pronounce || {});
  return Object.keys(pr).reduce((t, w) => t.replace(new RegExp('\\b' + w + '\\b', 'g'), pr[w]), text);
}
function browserSay(text, fin, est){
  if (!('speechSynthesis' in window)) { tour.timer = setTimeout(fin, est); return; }
  speechSynthesis.cancel();
  // a sentence at a time: some mobile browsers stop long utterances part-way through
  const parts = speechText(text).match(/[^.!?]+[.!?]*\s*/g) || [text], tok = tour.token; let k = 0;
  const next = () => { if (tok !== tour.token) return; if (k >= parts.length) { setTimeout(fin, 400); return; }
    const u = new SpeechSynthesisUtterance(parts[k++].trim()); if (tourVoice) { u.voice = tourVoice; u.lang = tourVoice.lang; } else u.lang = 'en-GB';
    u.rate = 1.05; u.pitch = 1.05; u.onend = next; u.onerror = next; speechSynthesis.speak(u); };
  next();
  tour.timer = setTimeout(fin, est + 6000);   // safety net: some browsers never report the end of speech
}
function tourPick(id, pick, tok, done){
  const cur = $('tourCursor'), hide = () => cur.classList.remove('on');
  cur.classList.add('on');
  const move = (el, then) => {
    const r = el.getBoundingClientRect(); cur.style.transform = `translate(${r.left + Math.min(r.width / 2, 60)}px, ${r.top + r.height / 2}px)`;
    setTimeout(() => {
      if (tok !== tour.token) return hide();
      cur.classList.add('press'); el.classList.add('tourpress');
      setTimeout(() => { cur.classList.remove('press'); el.classList.remove('tourpress'); if (tok === tour.token) then(); else hide(); }, 380);
    }, 700);
  };
  const target = pick ? pick() : null;
  if (target) return move(target, () => { hide(); done(); });
  move($('winBtn'), () => {   // through the Windows menu, as a visitor would
    positionWinMenu(); winMenu.classList.add('open');
    const g = WIN_GROUPS.find(x => x[2].includes(id)); view.menuGroups = view.menuGroups || {}; if (g) view.menuGroups[g[0]] = true; buildWinMenu();
    const item = winMenu.querySelector(`button[data-w="${id}"]`);
    if (!item) { winMenu.classList.remove('open'); hide(); return done(); }
    item.scrollIntoView({block:'nearest'});
    setTimeout(() => { if (tok !== tour.token) { winMenu.classList.remove('open'); return hide(); } move(item, () => { winMenu.classList.remove('open'); hide(); done(); }); }, 250);
  });
}
function tourStep(i){
  const T = TOURS[tour.id]; if (i < 0) i = 0; if (i >= T.steps.length) return endTour('done');
  tour.i = i; tour.token++; clearTimeout(tour.timer); if ('speechSynthesis' in window) speechSynthesis.cancel(); if (tour.audio) tour.audio.pause();
  const st = T.steps[i], before = WIN_IDS.filter(id => layout[id].open && !['toolbar', 'footer', 'pagetitle'].includes(id));
  try { if (st.act) st.act(tour.facts); } catch (e) { console.warn('tour step action failed', e); }
  let text; try { text = stepText(tour.id, st, tour.facts); } catch (e) { text = ''; }
  $('tourCap').textContent = text;   // set the caption first, so windows are sized to the space it leaves
  $('tourDots').innerHTML = T.steps.map((s, k) => `<i class="${k === i ? 'on' : k < i ? 'done' : ''}"></i>`).join('');
  const show = st.show || [], fresh = show.filter(id => !before.includes(id)), tok = tour.token;
  tourPlace(show.filter(id => before.includes(id)));   // keep windows that carry on; new ones are opened by the pointer
  let spoken = false, seen = !fresh.length;
  const advance = () => { if (tok === tour.token && spoken && seen && !tour.paused) tourStep(tour.i + 1); };
  const finish = () => { if (tok !== tour.token) return; tourPlace(show); fresh.forEach(id => flashWin(id)); requestAnimationFrame(() => { if (tour.on && tok === tour.token) tourPlace(show); });
    if (fresh.length) setTimeout(() => { seen = true; advance(); }, 3000); };
  winMenu.classList.remove('open');
  if (fresh.length) tourPick(fresh[0], st.pick, tok, finish); else finish();
  tour.paused = false; $('tourPause').textContent = '❚❚'; $('tourPause').setAttribute('aria-label', 'Pause');
  tour.spokenCb = () => { spoken = true; advance(); };
  tourSay(text, tour.spokenCb);
}
function startTour(id){
  closeWelcome(false);
  tour.saved = {view:JSON.parse(JSON.stringify(view)), speed:playSpeed, musicWasOn:!music.paused};
  cancelCountdown(); if (state.playing) stopPlay(); $('spot').classList.remove('on', 'concl', 'chg');
  Object.assign(view, {conclusion:false, chgAnnounce:false, loopPlay:false, statsLive:false, gapBuild:false, camTravel:false});
  if (!music.paused && !(kiosk.on && kiosk.opts.sound === 'music')) music.pause();
  Object.assign(tour, {on:true, id, i:0, facts:TOURS[id].facts()});
  document.body.classList.add('touring'); $('tourBar').classList.add('on'); $('tourTitle').textContent = TOURS[id].title;
  $('disc').classList.add('gone');
  tourStep(0);
}
function resetToDefaults(){
  if (typeof resetCharts === 'function') resetCharts();
  const keep = {radarSeenRev:view.radarSeenRev};
  Object.keys(view).forEach(k => delete view[k]); Object.assign(view, JSON.parse(JSON.stringify(VIEW_DEFAULTS)), keep);
  tourFilters(); hidden.clear(); F.q = ''; if ($('q')) $('q').value = '';
  playSpeed = 1; prefs.playSpeed = 1; savePrefs(); $('tbSpeed').value = '1';
  Object.keys(tick).forEach(k => delete tick[k]); Object.assign(tick, JSON.parse(JSON.stringify(TICK_DEFAULT))); try { store.set('sg.ticker', tick); } catch (e) {} applyTicker(); buildTicker();
  if (state.playing) stopPlay(); setAutoRotate(false); resetView();
  syncDisplayUI(); syncPlayRangeUI(); syncChgUI(); applyChangeFlags(); syncPanels(); refresh();
}
function returnFromTour(){
  resetToDefaults();
  if (tour.returnTo) { const s = tour.returnTo; tour.returnTo = null; applyView(s); }   // launched from inside the app: back exactly as it was
  else applyPreset('explore');   // launched from the welcome screen on loading: the defaults, with Play running
}
function endTour(how){
  if (!tour.on) return;
  if (kiosk.on && how === 'done') {   // kiosk mode: straight on to the next scene
    tour.on = false; tour.token++; clearTimeout(tour.timer); if ('speechSynthesis' in window) speechSynthesis.cancel(); if (tour.audio) tour.audio.pause();
    document.body.classList.remove('touring'); $('tourBar').classList.remove('on'); $('tourCursor').classList.remove('on'); tourHighlight(null); kioskScene(); return;
  }
  tour.on = false; tour.token++; clearTimeout(tour.timer); if ('speechSynthesis' in window) speechSynthesis.cancel(); if (tour.audio) tour.audio.pause();
  document.body.classList.remove('touring'); $('tourBar').classList.remove('on'); $('tourCursor').classList.remove('on'); winMenu.classList.remove('open'); tourHighlight(null); $('spot').classList.remove('on', 'concl', 'chg');
  toast((how === 'done' ? 'Tour complete. ' : 'Leaving the tour. ') + (tour.returnTo ? 'Back to where you were…' : 'Starting the tool…'));
  if (state.playing) stopPlay();
  const sv = tour.saved || {};
  returnFromTour();
  if (sv.musicWasOn) music.play().catch(() => {});
  showDisc();
}
$('tourNext').onclick = () => tourStep(tour.i + 1);
$('tourPrev').onclick = () => tourStep(tour.i - 1);
$('tourPause').onclick = () => {
  if (!tour.paused) { tour.paused = true; tour.token++; clearTimeout(tour.timer); if ('speechSynthesis' in window) speechSynthesis.cancel(); if (tour.audio) tour.audio.pause(); if (state.playing && !paused) togglePause(); $('tourPause').textContent = '▶'; $('tourPause').setAttribute('aria-label', 'Resume'); }
  else { if (state.playing && paused) togglePause(); tourStep(tour.i); }
};
$('tourMute').onclick = () => {
  tour.muted = !tour.muted; prefs.tourMuted = tour.muted; savePrefs(); syncMute();
  if (tour.on && !tour.paused) { tour.token++; clearTimeout(tour.timer); if ('speechSynthesis' in window) speechSynthesis.cancel(); if (tour.audio) tour.audio.pause(); tourSay($('tourCap').textContent, tour.spokenCb || (() => tourStep(tour.i + 1))); }
};
function syncMute(){ $('tourMute').textContent = tour.muted ? '🔇' : '🔊'; $('tourMute').setAttribute('aria-label', tour.muted ? 'Unmute narration' : 'Mute narration'); $('wMute').textContent = tour.muted ? '🔇 Narration off' : '🔊 Narration on'; }
$('tourSkip').onclick = () => endTour('escape');
document.addEventListener('keydown', e => {
  if (tour.on && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); endTour('escape'); }
  else if (tour.on && e.key === 'ArrowRight') { e.stopPropagation(); tourStep(tour.i + 1); }
  else if (tour.on && e.key === 'ArrowLeft') { e.stopPropagation(); tourStep(tour.i - 1); }
  else if ($('welcome').classList.contains('on') && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeWelcome(true); }
}, true);
/* ---------- the welcome screen: shown on every load ---------- */
let welcomeTimer = 0, welcomeLeft = 0, welcomeDeadline = 0, welcomeLast = 0;
let aiAcked = new URLSearchParams(location.search).get('welcome') === '0';   // a mandatory acknowledgement, once per visit (tests skip it with welcome=0)
function ackAI(){ aiAcked = true; $('welcome').classList.remove('needack'); welcomeDeadline = Date.now() + 30000; welcomeLast = Date.now(); tickWelcome(); $('wRun').focus(); }
function showWelcome(){
  $('wCards').innerHTML = TOUR_LIST.map((t, k) => `<button class="wcard${t.ready ? '' : ' soon'}" data-tour="${t.id}"${t.ready ? '' : ' disabled aria-disabled="true"'}><span class="wn">${k + 1}</span><b>${esc(t.title)}</b><span>${esc(t.blurb)}</span><em>${tourUpdatedLabel(t.id) ? 'Updated ' + chEsc(tourUpdatedLabel(t.id)) : t.ready ? '1 to 2 minute walk-through' : 'Coming soon'}</em></button>`).join('');
  $('welcome').classList.add('on'); $('disc').classList.add('gone'); syncMute();
  if (!aiAcked) { $('welcome').classList.add('needack'); clearTimeout(welcomeTimer); $('wAuto').textContent = 'Please acknowledge the notice above to continue.'; setTimeout(() => $('wAckBtn').focus(), 50); return; }
  welcomeDeadline = Date.now() + 30000; welcomeLast = Date.now(); tickWelcome();
}
function tickWelcome(){   // timed by the real clock, so a busy computer cannot slow the countdown
  clearTimeout(welcomeTimer); if (!$('welcome').classList.contains('on')) return;
  const now = Date.now();
  if ($('welcome').querySelector('.wbox').matches(':hover')) welcomeDeadline += now - welcomeLast;   // pause while hovering over the cards
  welcomeLast = now; welcomeLeft = Math.max(0, Math.ceil((welcomeDeadline - now) / 1000));
  $('wAuto').textContent = `Starting the tool in ${welcomeLeft} s`;
  if (welcomeLeft <= 0) return closeWelcome(true);
  welcomeTimer = setTimeout(tickWelcome, 250);
}
function closeWelcome(toTool){ if (!aiAcked) return; clearTimeout(welcomeTimer); $('welcome').classList.remove('on'); if (toTool) { toast(tour.returnTo ? 'Back to where you were…' : 'Starting the tool…'); returnFromTour(); showDisc(); } }
function showDisc(){ $('disc').classList.remove('gone'); clearTimeout(showDisc.t); showDisc.t = setTimeout(() => $('disc').classList.add('gone'), 12000); }
$('wCards').addEventListener('click', e => { const c = e.target.closest('.wcard'); if (c && !c.disabled && aiAcked) startTour(c.dataset.tour); });
$('wRun').onclick = () => closeWelcome(true);
$('wAckBtn').onclick = ackAI;
$('wMute').onclick = () => { tour.muted = !tour.muted; prefs.tourMuted = tour.muted; savePrefs(); syncMute(); };
$('toursBtn').onclick = () => { if (tour.on) endTour('escape'); tour.returnTo = JSON.parse(JSON.stringify(snapshot('before-tour'))); showWelcome(); };   // remember the app exactly as it was

