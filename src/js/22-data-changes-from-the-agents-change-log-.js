/* ==================================================================
 *  DATA CHANGES (from the agents' change log): window, highlighting, Play announcements
 * ================================================================== */
const CHG_TYPES = {guidance:{label:'Guidance update', short:'GUIDANCE', cls:'gui'}, added:{label:'Added', short:'NEW', cls:'add'}, corrected:{label:'Corrected', short:'UPDATED', cls:'cor'}, reestimated:{label:'Re-estimated', short:'UPDATED', cls:'est'},
  landed:{label:'Confirmed landed', short:'UPDATED', cls:'lan'}, source:{label:'Source added', short:'UPDATED', cls:'src'}, disputed:{label:'Disputed', short:'DISPUTED', cls:'dis'}};
function fieldName(k){ return (FIELDS[k] && FIELDS[k].name) || k; }
function parseChange(d){
  let m;
  if ((m = d.match(/^guidance: (.+)$/))) return {type:'guidance', key:'guidance', text:'New or updated security guidance', title:m[1]};
  if ((m = d.match(/^added: founder (f-[a-z0-9-]+)/))) return {type:'added', key:m[1], founder:true, text:'New fortune added to Time to a fortune'};
  if ((m = d.match(/^(f-[a-z0-9-]+): net worth (\S+) → ([\d.]+)/))) return {type:'corrected', key:m[1], founder:true, text:m[2] === 'none' ? `Net worth added: $${Math.round(+m[3])}bn` : `Net worth $${Math.round(+m[2])}bn → $${Math.round(+m[3])}bn`};
  if ((m = d.match(/^(f-[a-z0-9-]+): (founded|fortuneYear) (\d{4}) → (\d{4})/))) return {type:'corrected', key:m[1], founder:true, text:`${m[2] === 'founded' ? 'Founding year' : 'Fortune year'} ${m[3]} → ${m[4]}`};
  if ((m = d.match(/^added: (.+)$/))) return {type:'added', key:m[1], text:''};
  if ((m = d.match(/^re-estimated: ([a-z0-9-]+) → (\d{4})/))) return {type:'reestimated', key:m[1], text:`Outlook year re-estimated to ${m[2]}`};
  if ((m = d.match(/^disputed: (\S+)(?: \((.+)\))?$/))) return {type:'disputed', key:m[1], text:m[2] ? m[2].charAt(0).toUpperCase() + m[2].slice(1) : 'Marked as disputed by the QA agent'};   // with the reason, when given
  if ((m = d.match(/^([a-z0-9-]+): confirmed landed in (\d{4})/))) return {type:'landed', key:m[1], text:`Confirmed as landed in ${m[2]}`};
  if ((m = d.match(/^([a-z0-9-]+): source added/))) return {type:'source', key:m[1], text:''};
  if ((m = d.match(/^([a-z0-9-]+): (research|change)\.year (\d{4}) → (\d{4})/))) return {type:'corrected', key:m[1], text:`${m[2] === 'research' ? 'Research' : 'Change'} year ${m[3]} → ${m[4]}`};
  if ((m = d.match(/^([a-z0-9-]+): field (\S+) → (\S+)/))) return {type:'corrected', key:m[1], text:`Field ${fieldName(m[2])} → ${fieldName(m[3])}`};
  if ((m = d.match(/^([a-z0-9-]+): DESNZ area → (\S+)/))) return {type:'corrected', key:m[1], text:`clean energy area → ${VISION[m[2]] || 'none'}`};
  if ((m = d.match(/^([a-z0-9-]+): major → (\S+)/))) return {type:'corrected', key:m[1], text:/^true$/i.test(m[2]) ? 'Marked as a major milestone' : 'No longer a major milestone'};
  if ((m = d.match(/^([a-z0-9-]+): (research|change)\.what updated/))) return {type:'corrected', key:m[1], text:`${m[2] === 'research' ? 'Research' : 'Change'} description updated`};
  if ((m = d.match(/^([a-z0-9-]+): (note|company) updated/))) return {type:'corrected', key:m[1], text:`${m[2] === 'note' ? 'Note' : 'Company'} updated`};
  if ((m = d.match(/^([a-z0-9-]+): (.+)$/))) return {type:'corrected', key:m[1], text:m[2]};
  return null;
}
const CHANGES = [];
(function buildChanges(){
  const log = DB.meta.changelog || [], lastRun = DB.meta.lastAgentRun || '';
  log.forEach((e, idx) => {
    const time = e.time || (lastRun.slice(0, 10) === e.date && idx === log.length - 1 ? lastRun.slice(11, 16) : '');
    (e.details || []).forEach(d => {
      const c = parseChange(d); if (!c) return;
      const it = c.founder || c.type === 'guidance' ? null : items.find(x => x.uid === c.key || x.t === c.key), fo = c.founder ? FORTUNES.find(x => x.fid === c.key) : null;
      CHANGES.push(Object.assign(c, {it, fo, title:it ? it.t : fo ? `${fo.co} (${fo.n})` : c.title || c.key, date:e.date, time, rev:e.revision || '', summary:e.summary, run:idx}));
    });
  });
  CHANGES.reverse();
})();
function ukDay(iso){ return fmtDate(iso); }   // follows the UK or US date setting
function changeInWindow(c){
  if (view.chgSince === 'last') return c.run === (DB.meta.changelog || []).length - 1;
  const days = +view.chgSince; if (!days) return true;
  return (new Date(DATA_AS_OF + 'T12:00:00Z') - new Date(c.date + 'T12:00:00Z')) / 86400000 <= days;
}
let chgFlagged = [];
function applyChangeFlags(){
  items.forEach(it => { it.chg = null; });
  if (view.chgFlag !== 'off') {
    CHANGES.forEach(c => {
      if (!c.it || c.it.removed || c.it.chg || !changeInWindow(c)) return;
      if (view.chgFlag === 'new' && c.type !== 'added') return;
      if (view.chgScope === 'desnz' && !c.it.dv) return;
      c.it.chg = c;
    });
  }
  chgFlagged = items.filter(it => it.chg);
  items.forEach(it => {
    const on = !!it.chg, isNew = on && it.chg.type === 'added';
    if (it.labelEl) { it.labelEl.classList.toggle('chg-new', isNew); it.labelEl.classList.toggle('chg-upd', on && !isNew); it.labelEl._w = 0; }
    if (on && !it.chgGlow) {
      it.chgMat = new THREE.SpriteMaterial({map:GLOW, color:0x5FD8FF, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending}); it.chgMat.userData.base = .85; it.chgMat.opacity = 0; it.mats.push(it.chgMat);
      it.chgGlow = new THREE.Sprite(it.chgMat); it.chgGlow.position.copy(it.peak || it.curve.v0); it.group.add(it.chgGlow);
    }
    if (it.chgGlow) it.chgGlow.visible = on;
  });
  if (layout.vision && layout.vision.open) renderVision();
}
function chgTag(it){ return it && it.chg ? `<i class="chgtag ${CHG_TYPES[it.chg.type].cls}">${CHG_TYPES[it.chg.type].short}</i>` : ''; }
function chgFrame(t){ chgFlagged.forEach(it => { if (it.chgGlow) { const s = 4.5 + Math.sin(t * 2.4) * 1.2; it.chgGlow.scale.set(s, s, 1); } }); }
let lastChgCur = null, chgSpotTimer = 0;
function chgPlayCheck(){
  if (!state.playing || view.chgFlag === 'off' || view.chgAnnounce === false) { lastChgCur = null; return; }
  const cur = state.cursor;
  if (lastChgCur != null && cur > lastChgCur && cur - lastChgCur < 3) {
    const hits = chgFlagged.filter(it => shownFully(it) && it.kind !== 'flight' && lastChgCur < it.p && cur >= it.p);
    if (hits.length) {
      const c = hits[0].chg, ty = CHG_TYPES[c.type];
      $('spotT').textContent = `${c.type === 'added' ? '🆕 New data' : '✎ Updated data'}: ${hits[0].t}`;
      $('spotS').textContent = `${c.text}, ${ukDay(c.date)}${hits.length > 1 ? ` (and ${hits.length - 1} more this year)` : ''}`;
      const sp = $('spot'); sp.classList.add('chg', 'on'); clearTimeout(chgSpotTimer);
      chgSpotTimer = setTimeout(() => sp.classList.remove('on', 'chg'), 3600);
    }
  }
  lastChgCur = cur;
}
/* ---------- Data changes window ---------- */
const chgTypeOn = new Set(Object.keys(CHG_TYPES));
$('chgTypes').innerHTML = Object.entries(CHG_TYPES).map(([k, v]) => `<button class="chipbtn" data-k="${k}" aria-pressed="true">${v.label}</button>`).join('');
$('chgTypes').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; chgTypeOn.has(b.dataset.k) ? chgTypeOn.delete(b.dataset.k) : chgTypeOn.add(b.dataset.k); b.setAttribute('aria-pressed', chgTypeOn.has(b.dataset.k)); renderChanges(); });
$('chgQ').addEventListener('input', renderChanges); $('chgQ').addEventListener('keydown', e => e.stopPropagation());
$('chgDesnzT').addEventListener('change', renderChanges);
function chgRow(c, i){
  const ty = CHG_TYPES[c.type], it = c.it;
  const meta = [c.text, it ? fieldName(it.v) : c.fo ? 'Time to a fortune' : null, it && it.dv ? 'Clean energy AI: ' + VISION[it.dv] : null].filter(Boolean).join(', ');
  return `<div class="trow chgrow" data-ci="${i}"><span class="chgb ${ty.cls}">${ty.label}</span><span>${it || c.fo || c.type === 'guidance' ? `<a href="#" data-ci="${i}">${esc(c.title)}</a>` : esc(c.title)}<em>${esc(meta)}</em></span></div>`;
}
function chgGroupRow(g){
  if (g.all.length === 1) return chgRow(g.c, g.i);
  const c = g.c, it = c.it, types = [...new Set(g.all.map(x => x.type))], counts = new Map();
  g.all.forEach(x => { const t = x.text || CHG_TYPES[x.type].label; counts.set(t, (counts.get(t) || 0) + 1); });
  const texts = [...counts].map(([t, n]) => n === 1 ? t : /^source added$/i.test(t) ? `${n} sources added` : `${t} (×${n})`);
  const meta = texts.concat([it ? fieldName(it.v) : c.fo ? 'Time to a fortune' : null, it && it.dv ? 'Clean energy AI: ' + VISION[it.dv] : null].filter(Boolean)).join('; ');
  return `<div class="trow chgrow" data-ci="${g.i}">${types.slice(0, 2).map(t => `<span class="chgb ${CHG_TYPES[t].cls}">${CHG_TYPES[t].label}</span>`).join('')}<span>${it || c.fo || c.type === 'guidance' ? `<a href="#" data-ci="${g.i}">${esc(c.title)}</a>` : esc(c.title)}<em>${esc(meta)}</em></span></div>`;
}
function renderChanges(){
  const q = $('chgQ').value.trim().toLowerCase(), desnz = $('chgDesnzT').checked;
  const list = CHANGES.map((c, i) => [c, i]).filter(([c]) => chgTypeOn.has(c.type) && (!desnz || (c.it && c.it.dv)) && (!q || (c.title + ' ' + c.text + ' ' + (c.it ? c.it.rw + c.it.pw : '')).toLowerCase().includes(q)));
  if (!CHANGES.length) { $('chgList').innerHTML = '<p class="empty">No agent changes yet. Each weekly run will appear here.</p>'; return; }
  if (!list.length) { $('chgList').innerHTML = '<p class="empty">No changes match these filters.</p>'; return; }
  // one row per item in each run, however many separate changes the agents made to it
  let html = '', run = -1, rows = 0, groups = new Map();
  const flush = () => { groups.forEach(g => { html += chgGroupRow(g); rows++; }); groups = new Map(); };
  list.forEach(([c, i]) => {
    if (c.run !== run) { flush(); run = c.run; html += `<div class="chgrun"><b>${ukDay(c.date)}${c.time ? ', ' + c.time + ' UTC' : ''}</b><span>${c.rev ? 'Revision ' + c.rev + ': ' : ''}${esc(c.summary || '')}</span></div>`; }
    const k = c.it ? 'm:' + c.it.id : c.fo ? 'f:' + c.title : 'x:' + c.type + ':' + c.title;
    if (!groups.has(k)) groups.set(k, {c, i, all:[]});
    groups.get(k).all.push(c);
  });
  flush();
  $('chgList').innerHTML = html;
  $('chgCount').textContent = `${list.length} of ${CHANGES.length} changes, in ${rows} rows`;
}
$('chgList').addEventListener('click', e => { const a = e.target.closest('[data-ci]'); if (!a) return; e.preventDefault(); const c = CHANGES[+a.dataset.ci]; if (c && c.it) { hidden.delete(c.it.id); openDetail(c.it); } else if (c && c.fo) { setOpen('fortunes', true); raise('fortunes'); } else if (c && c.type === 'guidance') { setOpen('cyber', true); raise('cyber'); } });
/* ---------- Display settings for changes ---------- */
function syncChgUI(){
  document.querySelectorAll('#chgFlagSeg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === view.chgFlag));
  document.querySelectorAll('#chgScopeSeg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === view.chgScope));
  $('chgSinceS').value = String(view.chgSince); $('chgAnnounceT').checked = view.chgAnnounce !== false;
}
$('chgFlagSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; view.chgFlag = b.dataset.v; syncChgUI(); applyChangeFlags(); });
$('chgScopeSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; view.chgScope = b.dataset.v; syncChgUI(); applyChangeFlags(); });
$('chgSinceS').addEventListener('change', e => { view.chgSince = e.target.value; applyChangeFlags(); });
$('chgAnnounceT').addEventListener('change', e => { view.chgAnnounce = e.target.checked; });
$('flashNewT').addEventListener('change', e => { view.flashNew = e.target.checked; });
$('smartPlaceT').addEventListener('change', e => { view.smartPlace = e.target.checked; });
$('keepPosT').addEventListener('change', e => { view.keepWinPos = e.target.checked; WIN_IDS.forEach(placeWin); });
$('fitLoadT').addEventListener('change', e => { view.fitOnLoad = e.target.checked; });
/* ---------- Search in the Details window ---------- */
function detSearch(){
  const q = $('detQ').value.trim().toLowerCase(), box = $('detRes');
  if (q.length < 2) { box.innerHTML = ''; box.classList.remove('on'); return; }
  const words = q.split(/\s+/);
  const hits = items.filter(it => !it.removed && words.every(w => (it.t + ' ' + (it.co || '') + ' ' + it.rw + ' ' + it.pw + ' ' + it.note + ' ' + fieldName(it.v)).toLowerCase().includes(w)))
    .sort((a, b) => (b.t.toLowerCase().includes(q) ? 1 : 0) - (a.t.toLowerCase().includes(q) ? 1 : 0)).slice(0, 12);
  box.innerHTML = hits.length ? hits.map(it => `<div class="drow" data-id="${it.id}"><i class="cat" style="background:${itemHex(it)}"></i><span>${esc(it.t)}<em>${fieldName(it.v)}, ${it.r} to ${it.kind === 'flight' ? 'later' : it.p}${it.chg ? ', ' + CHG_TYPES[it.chg.type].short.toLowerCase() : ''}</em></span></div>`).join('') : '<p class="empty">No milestones match.</p>';
  box.classList.add('on');
}
$('detQ').addEventListener('input', detSearch);
$('detQ').addEventListener('keydown', e => {
  e.stopPropagation();
  if (e.key === 'Enter') { const first = $('detRes').querySelector('.drow'); if (first) first.click(); }
  if (e.key === 'Escape') { $('detQ').value = ''; detSearch(); }
});
$('detRes').addEventListener('click', e => { const r = e.target.closest('.drow'); if (!r) return; const it = items[+r.dataset.id]; hidden.delete(it.id); $('detRes').classList.remove('on'); $('detQ').value = ''; openDetail(it); });

