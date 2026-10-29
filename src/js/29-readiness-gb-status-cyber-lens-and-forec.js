/* ==================================================================
 *  READINESS, GB STATUS, CYBER LENS AND FORECASTS
 * ================================================================== */
function monthYear(d){ if (!d) return ''; const [y, m] = d.split('-'); return m ? ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m - 1] + ' ' + y : y; }
const GUIDE = {}; (DB.securityGuidance || []).forEach(gd => { GUIDE[gd.id] = gd; });
const GUIDE_NOTE = DB.meta.securityGuidanceNote || 'AI-generated research, not security advice. Engage qualified experts.';
function guideHtml(gid, open){
  const gd = GUIDE[gid]; if (!gd) return '';
  const refs = gd.refs.map(([fw, ref, url]) => '<div>' + (url ? `<a href="${esc(url)}" target="_blank" rel="noopener"><b>${esc(fw)}</b> ↗</a>` : `<b>${esc(fw)}</b>`) + ' ' + esc(ref) + '</div>').join('');
  return `<details class="mitig"${open ? ' open' : ''}><summary>Possible mitigations: ${esc(gd.title)}</summary><ul>${gd.measures.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`
    + `<div class="frefs">${refs}<p class="note-s">Links go to the official publishers. Some standards are sold by their publishers; the link shows where to obtain them.</p></div><p class="aiwarn">⚠ ${esc(GUIDE_NOTE)}</p></details>`;
}
const STAGES = {research:'Research', pilot:'Pilot', commercial:'First commercial use', scale:'At scale'};
const STAGE_SHORT = {research:'Research', pilot:'Pilot', commercial:'Commercial', scale:'At scale'};
const GBS = {deployed:'Deployed in GB', trial:'Trial in GB', planned:'Planned in GB', 'not-yet':'Not yet in GB', unknown:'GB status not known'};
/* the first security response in a technology's category: the earliest cyber milestone in matching sub-fields that landed after it */
const SEC_MAP = {energy:['ot'], hw:['identity'], sw:['network','crypto','identity'], ai:['ops'], quantum:['crypto'], comms:['crypto','network'], space:['crypto','ot'], robotics:['ot'], life:['identity']};
function secResponse(it){
  if (!it.attack || it.kind === 'flight') return null;
  const subs = SEC_MAP[it.v] || [], yr = it.p;
  const cands = items.filter(c => !c.removed && c.v === 'cyber' && subs.includes(c.sub) && c.kind !== 'flight' && c.p >= yr).sort((a, b) => a.p - b.p);
  return cands.length ? {resp:cands[0], lag:cands[0].p - yr, expected:cands[0].kind === 'proj'} : {resp:null};
}
/* ---------- Vision radar ---------- */
function radarSinceTest(c){
  const sel = view.radarSince || 'review', log = DB.meta.changelog || [];
  if (sel === 'review') { if (view.radarSeenRev == null) return c.run === log.length - 1; const e = log[c.run]; return e && (e.revision || 0) > view.radarSeenRev; }
  if (sel === 'last') return c.run === log.length - 1;
  return (new Date(DATA_AS_OF + 'T12:00:00Z') - new Date(c.date + 'T12:00:00Z')) / 86400000 <= +sel;
}
function renderRadar(){
  const f = v => v == null ? '–' : v, chip = st => `<span class="stg stg-${st}">${STAGE_SHORT[st] || st}</span>`;
  $('radarSince').value = view.radarSince || 'review';
  const seen = view.radarSeenRev;
  $('radarNote').textContent = (view.radarSince || 'review') === 'review' ? (seen == null ? 'Showing changes from the latest agent run. Press “Mark all as reviewed” to track what is new from now on (saved with your view).' : `Showing what is new since you marked data revision ${seen} as reviewed.`) : '';
  let html = '';
  Object.entries(VISION).forEach(([k, name]) => {
    const its = items.filter(it => !it.removed && it.dv === k);
    const cnt = st => its.filter(it => it.stage === st).length, gb = its.filter(it => it.gb === 'deployed').length, tot = Math.max(1, its.length);
    const news = CHANGES.filter(c => c.it && c.it.dv === k && radarSinceTest(c));
    const next = its.filter(it => it.kind === 'proj' && it.p <= NOW + 5).sort((a, b) => a.p - b.p).slice(0, 4);
    html += `<div class="rarea"><div class="rhead"><b>${name}</b><span>${its.length} milestones, ${gb} deployed in GB</span></div>
      <div class="rpipe" role="img" aria-label="Readiness of ${name}">${Object.keys(STAGES).map(st => `<i class="stg-${st}" style="flex:${Math.max(cnt(st), .0001)}" title="${STAGES[st]}: ${cnt(st)}">${cnt(st) ? cnt(st) : ''}</i>`).join('')}</div>
      <div class="rsub">${news.length ? `<b>New or changed (${news.length})</b>` + news.slice(0, 8).map(c => `<div class="trow" data-id="${c.it.id}"><b>${c.date.slice(8, 10)}/${c.date.slice(5, 7)}</b>${chip(c.it.stage)}<span>${esc(c.it.t)}<em>${esc(c.type === 'added' ? 'New' : c.text)}${c.it.gb ? ', ' + GBS[c.it.gb] : ''}</em></span></div>`).join('') : '<p class="empty">Nothing new for this area in this period.</p>'}
      ${next.length ? `<b>Coming in the next five years</b>` + next.map(it => `<div class="trow trow3" data-id="${it.id}"><b>~${it.p}</b>${chip(it.stage)}<span>${esc(it.t)}<em>${it.gb ? GBS[it.gb] : ''}</em></span></div>`).join('') : ''}</div></div>`;
  });
  $('radarBody').innerHTML = html + '<p class="note-s">Readiness stages and GB status are AI estimates, refined weekly by the data agents. Stages: research, pilot or demonstration, first commercial use, at scale.</p>';
}
$('radarSince').addEventListener('change', e => { view.radarSince = e.target.value; renderRadar(); });
$('radarReviewed').onclick = () => { view.radarSeenRev = DB.meta.revision; try { store.set('sg.radarSeen', view.radarSeenRev); } catch (e) {} view.radarSince = 'review'; renderRadar(); toast('Marked as reviewed. Save your view to keep this.'); };
$('radarBody').addEventListener('click', e => { const r = e.target.closest('[data-id]'); if (r) { const it = items[+r.dataset.id]; hidden.delete(it.id); openDetail(it); } });
/* ---------- Cyber lens ---------- */
function renderCyber(){
  const techs = items.filter(it => !it.removed && it.attack && it.kind === 'hist' && shownFully(it));
  const withR = techs.map(it => ({it, r:secResponse(it)}));
  const landedResp = withR.filter(x => x.r && x.r.resp && !x.r.expected), gaps = withR.filter(x => x.r && !x.r.resp && x.it.p >= 2010 && x.it.p <= NOW - 3).sort((a, b) => b.it.p - a.it.p);
  const med = a => a.length ? Math.round(median(a)) : '–';
  const byField = FKEYS.filter(k => k !== 'cyber' && FIELDS[k]).map(k => { const xs = landedResp.filter(x => x.it.v === k); return {k, n:techs.filter(it => it.v === k).length, m:xs.length ? median(xs.map(x => x.r.lag)) : null, g:gaps.filter(x => x.it.v === k).length}; }).filter(r => r.n);
  let html = `<div class="kf"><div class="kfc"><b>${techs.length}</b><span>technologies in this selection that expand the attack surface</span></div><div class="kfc"><b>${med(landedResp.map(x => x.r.lag))} yrs</b><span>median wait for the first security response in their category</span></div><div class="kfc"><b>${gaps.length}</b><span>open gaps: arrived 2010 to ${NOW - 3} with no security response in their category since</span></div><div class="kfc"><b>${med(landedResp.filter(x => x.it.p >= 2000).map(x => x.r.lag))} yrs</b><span>median wait for technologies arriving since 2000</span></div></div>`;
  html += '<h3>By field</h3><table class="qtab"><tr><th>Field</th><th>Technologies</th><th>Median wait</th><th>Open gaps</th></tr>' + byField.map(r => `<tr><td><i style="background:${FIELDS[r.k].hex}"></i>${FIELDS[r.k].name}</td><td>${r.n}</td><td>${r.m == null ? '–' : Math.round(r.m) + ' yrs'}</td><td>${r.g}</td></tr>`).join('') + '</table>';
  html += '<h3>Open gaps</h3>' + (gaps.length ? gaps.slice(0, 14).map(x => `<div class="trow" data-id="${x.it.id}"><b>${x.it.p}</b><i class="cat" style="background:${itemHex(x.it)}"></i><span>${esc(x.it.t)}<em>${esc(x.it.sec || '')}</em></span></div>`).join('') : '<p class="empty">No open gaps in this selection.</p>');
  html += '<h3>Longest waits</h3>' + landedResp.sort((a, b) => b.r.lag - a.r.lag).slice(0, 8).map(x => `<div class="trow trowl" data-id="${x.it.id}"><b>${x.r.lag} yrs</b><i class="cat" style="background:${itemHex(x.it)}"></i><span>${esc(x.it.t)} (${x.it.p})<em>First response in its category: ${esc(x.r.resp.t)} (${x.r.resp.p})</em></span></div>`).join('');
  html += '<p class="note-s">Responses are matched by category, not by a direct link, so treat waits as indicative. Attack-surface notes are AI-compiled.</p>';
  const gcount = id => techs.filter(it => it.secG === id).length;
  html += `<h3>Mitigation by type of exposure</h3><p class="aiwarn">⚠ ${esc(GUIDE_NOTE)}</p>` + (DB.securityGuidance || []).filter(gd => gcount(gd.id)).sort((a, b) => gcount(b.id) - gcount(a.id)).map(gd => guideHtml(gd.id).replace('<summary>Possible mitigations: ', `<summary>${gcount(gd.id)} technologies: `)).join('');
  const gu = (DB.guidanceUpdates || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 10);
  html += '<h3>Latest guidance and framework updates</h3>' + (gu.length ? gu.map(u => `<div class="trow trow2 trowg"><b>${esc(monthYear(u.date))}</b><span>${u.url ? `<a href="${esc(u.url)}" target="_blank" rel="noopener">${esc(u.title)}</a>` : esc(u.title)}<em>${esc(u.framework)}: ${esc(u.summary || '')}</em></span></div>`).join('') : '<p class="empty">No updates recorded yet.</p>') + '<p class="note-s">Found and checked weekly by the guidance agent, with priority on the NCSC CAF and Ofgem’s CAF Overlay.</p>';
  $('cyberBody').innerHTML = html;
}
$('cyberBody').addEventListener('click', e => { const r = e.target.closest('[data-id]'); if (r) { const it = items[+r.dataset.id]; hidden.delete(it.id); openDetail(it); } });
/* ---------- forecast accuracy (for Data quality) ---------- */
function forecastHtml(){
  const fc = items.filter(it => !it.removed && it.fc), done = fc.filter(it => it.fc.actualYear != null), open = fc.filter(it => it.fc.actualYear == null);
  const errs = done.map(it => it.fc.actualYear - it.fc.estimatedYear), abs = errs.map(Math.abs);
  const overdue = open.filter(it => it.fc.estimatedYear < NOW).length, revised = fc.filter(it => (it.fc.revisions || []).length).length;
  let h = `<h3>Forecast accuracy</h3><p class="note-s">Every outlook estimate is recorded when it is made. When the item lands, the agents record the actual year so the estimates can be scored.</p>`;
  h += `<div class="kf"><div class="kfc"><b>${done.length}</b><span>estimates resolved</span></div><div class="kfc"><b>${open.length}</b><span>still open (${overdue} overdue, ${revised} revised)</span></div>`;
  if (done.length) h += `<div class="kfc"><b>${(abs.reduce((a, b) => a + b, 0) / abs.length).toFixed(1)} yrs</b><span>average error</span></div><div class="kfc"><b>${Math.round(abs.filter(a => a <= 1).length / abs.length * 100)}%</b><span>within a year; ${errs.filter(e => e > 0).length} landed late, ${errs.filter(e => e < 0).length} early</span></div>`;
  h += '</div>' + (done.length ? done.slice(-8).map(it => `<div class="trow trow2"><b>${it.fc.actualYear - it.fc.estimatedYear > 0 ? '+' : ''}${it.fc.actualYear - it.fc.estimatedYear}</b><span>${esc(it.t)}<em>Estimated ${it.fc.estimatedYear} (on ${it.fc.estimatedOn}), landed ${it.fc.actualYear}</em></span></div>`).join('') : '<p class="empty">No estimates have resolved yet. The first scores appear as outlook items land.</p>');
  return h;
}

chipGroup($('stageChips'), () => F.stages, STAGE_SHORT);
$('gbOnlyT').addEventListener('change', e => { F.gbOnly = e.target.checked; refresh(); });
$('attackT').addEventListener('change', e => { F.attackOnly = e.target.checked; refresh(); });
$('gapOnlyT').addEventListener('change', e => { F.gapOnly = e.target.checked; refresh(); });
/* ---------- DESNZ briefing: one slide, five vision areas ---------- */
async function generateDesnzSlide(){
  const msg = $('repMsg'); if (!window.PptxGenJS) { msg.textContent = 'The PowerPoint library did not load.'; return; }
  msg.textContent = 'Building the DESNZ briefing slide…';
  const BG = '0B1724', PANEL = '13283A', TXT = 'E9F2FF', MUTED = '8FA6B8', LINE = '22384A';
  const SC = {research:'8FA6B8', pilot:'F2D38A', commercial:'5FD8FF', scale:'7FD6A0'};
  const pptx = new PptxGenJS(); pptx.layout = 'LAYOUT_16x9'; pptx.author = 'Stuart Okin'; pptx.title = 'DESNZ AI energy vision: what is arriving';
  const s = pptx.addSlide(); s.background = {color:BG};
  s.addText('DESNZ AI energy vision: what is arriving', {x:0.4, y:0.25, w:9.2, h:0.5, fontSize:22, color:TXT, fontFace:'Georgia', margin:0, isTextBox:true});
  const sinceLabel = {review:view.radarSeenRev == null ? 'the latest agent run' : `data revision ${view.radarSeenRev}`, last:'the latest agent run', 30:'the last 30 days', 90:'the last 90 days'}[view.radarSince || 'review'];
  s.addText(`Readiness of the technologies behind each area, and what is new since ${sinceLabel}. Data as of ${DATA_AS_OF}.`, {x:0.4, y:0.75, w:9.2, h:0.3, fontSize:10, color:MUTED, fontFace:'Arial', margin:0, isTextBox:true});
  const areas = Object.entries(VISION), cw = 9.2 / areas.length;
  areas.forEach(([k, name], i) => {
    const x = 0.4 + i * cw, w = cw - 0.12, its = items.filter(it => !it.removed && it.dv === k);
    const news = CHANGES.filter(c => c.it && c.it.dv === k && radarSinceTest(c)).slice(0, 4), next = its.filter(it => it.kind === 'proj' && it.p <= NOW + 5).sort((a, b) => a.p - b.p).slice(0, 3);
    s.addShape(pptx.ShapeType.roundRect, {x, y:1.2, w, h:3.85, fill:{color:PANEL}, line:{color:LINE, width:0.75}, rectRadius:0.08});
    s.addText(name, {x:x + 0.1, y:1.28, w:w - 0.2, h:0.55, fontSize:10.5, bold:true, color:TXT, fontFace:'Arial', margin:0, valign:'top', isTextBox:true});
    const tot = Math.max(1, its.length); let bx = x + 0.1;
    Object.keys(SC).forEach(st => { const n = its.filter(it => it.stage === st).length; if (!n) return; const bw = (w - 0.2) * n / tot;
      s.addShape(pptx.ShapeType.rect, {x:bx, y:1.88, w:bw, h:0.2, fill:{color:SC[st]}, line:{color:SC[st], width:0}}); if (bw > .18) s.addText(String(n), {x:bx, y:1.88, w:bw, h:0.2, fontSize:7, bold:true, color:'04131C', align:'center', valign:'middle', margin:0, isTextBox:true}); bx += bw; });
    s.addText(`${its.length} technologies, ${its.filter(it => it.gb === 'deployed').length} deployed in GB`, {x:x + 0.1, y:2.12, w:w - 0.2, h:0.25, fontSize:7.5, color:MUTED, fontFace:'Arial', margin:0, isTextBox:true});
    const lines = [{text:'New or changed', options:{bold:true, color:'5FD8FF', fontSize:8, breakLine:true}}]
      .concat(news.length ? news.map(c => ({text:c.it.t, options:{bullet:{indent:8}, color:TXT, fontSize:7.5, breakLine:true}})) : [{text:'Nothing new', options:{color:MUTED, fontSize:7.5, breakLine:true}}])
      .concat([{text:'Next five years', options:{bold:true, color:'F2D38A', fontSize:8, breakLine:true}}])
      .concat(next.length ? next.map((it, j) => ({text:`~${it.p} ${it.t}`, options:{bullet:{indent:8}, color:TXT, fontSize:7.5, breakLine:j < next.length - 1}})) : [{text:'None expected', options:{color:MUTED, fontSize:7.5}}]);
    s.addText(lines, {x:x + 0.1, y:2.4, w:w - 0.2, h:2.6, fontFace:'Arial', valign:'top', margin:0, paraSpaceAfter:2, isTextBox:true});
  });
  const legend = Object.entries({research:'Research', pilot:'Pilot', commercial:'First commercial use', scale:'At scale'});
  legend.forEach(([st, n], i) => { s.addShape(pptx.ShapeType.rect, {x:0.4 + i * 1.6, y:5.12, w:0.14, h:0.12, fill:{color:SC[st]}, line:{color:SC[st], width:0}}); s.addText(n, {x:0.58 + i * 1.6, y:5.08, w:1.4, h:0.2, fontSize:7.5, color:MUTED, fontFace:'Arial', margin:0, isTextBox:true}); });
  s.addText(`Stuart Okin, personal project. Data revision ${DB.meta.revision}, narrative version ${narrVersion()}. AI-maintained data; readiness and GB status are AI estimates.`, {x:0.4, y:5.32, w:9.2, h:0.2, fontSize:6.5, color:MUTED, fontFace:'Arial', margin:0, isTextBox:true});
  const hv = narrative('horizon', ['answer'])[0];
  if (hv) s.addText(hv + ' (AI-generated narrative; no human review.)', {x:0.4, y:1.0, w:9.2, h:0.22, fontSize:8.5, italic:true, color:'F2D38A', fontFace:'Arial', margin:0, isTextBox:true});
  s.addNotes(narrative('horizon', ['radar', 'new', 'next', 'answer']).join(' ') + '\n\nEach column is one area of the DESNZ AI energy vision. The bar shows how many of its technologies are at each readiness stage. Lists show what the data agents found new and what is expected within five years.');
  const fileName = `desnz-briefing-${new Date().toISOString().slice(0, 10)}.pptx`;
  try { await pptx.writeFile({fileName}); msg.textContent = `Saved ${fileName}.`; } catch (e) { msg.textContent = 'Could not create the slide: ' + e.message; }
}

