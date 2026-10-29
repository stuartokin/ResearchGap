/* ==================================================================
 *  FILTER UI
 * ================================================================== */
const fieldList = $('fieldList');
/* built by buildFieldList() below */
fieldList.addEventListener('click', e => {
  const only = e.target.dataset.only;
  if (only) { F.fields = new Set([only]); refresh(); return; }
  const row = e.target.closest('.frow'); if (!row) return;
  const k = row.dataset.f; F.fields.has(k) ? F.fields.delete(k) : F.fields.add(k); refresh();
});
fieldList.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && e.target.classList.contains('frow')) { e.preventDefault(); e.target.click(); } });
document.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => {
  const p = b.dataset.preset;
  F.fields = p === 'all' ? new Set(FKEYS) : p === 'none' ? new Set() : new Set(['energy','cyber','hw','sw','ai','quantum']);
  refresh();
});
function chipGroup(el, obj, labels, colours){
  el.innerHTML = Object.keys(labels).map(k => `<button class="chipbtn" data-k="${k}" ${colours ? `style="color:${colours[k]}"` : ''}>${colours ? '<span class="d"></span>' : ''}<span class="t">${labels[k]}</span></button>`).join('');
  el.addEventListener('click', e => { const b = e.target.closest('.chipbtn'); if (!b) return; obj()[b.dataset.k] = !obj()[b.dataset.k]; refresh(); });
}
chipGroup($('srcChips'), () => F.src, {academic:'Academic', industry:'Industry', government:'Government'}, {academic:SRC.academic.hex, industry:SRC.industry.hex, government:SRC.government.hex});
chipGroup($('kindChips'), () => F.kinds, KINDS);
chipGroup($('catChips'), () => F.cats, {br:'Research breakthroughs', co:'Company products'});
chipGroup($('confChips'), () => F.conf, CONFS);
$('q').addEventListener('input', e => { F.q = e.target.value.trim(); refresh(); });
$('fromR').addEventListener('input', e => { F.from = +e.target.value; if (F.from > F.to) { F.to = F.from; } refresh(); });
$('toR').addEventListener('input', e => { F.to = +e.target.value; if (F.to < F.from) { F.from = F.to; } refresh(); });
$('gapR').addEventListener('input', e => { F.gapMax = +e.target.value; refresh(); });
$('ghostT').addEventListener('change', e => { F.ghosts = e.target.checked; refresh(); });
$('statsBySeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; view.statsBy = b.dataset.v; renderStats(); });
$('statsLiveT').addEventListener('change', e => { view.statsLive = e.target.checked; renderStats(); });
$('gapBuildT').addEventListener('change', e => { view.gapBuild = e.target.checked; twKey = ''; });
$('subChips').addEventListener('click', e => { const b = e.target.closest('.chipbtn'); if (!b) return; F.subOff = F.subOff || {}; F.subOff[b.dataset.k] = !F.subOff[b.dataset.k]; refresh(); });
$('subLanesT').addEventListener('change', e => { view.subLanes = e.target.checked; refresh(); });
$('compactT').addEventListener('change', e => { view.compactLanes = e.target.checked; refresh(); });
$('majBrightT').addEventListener('change', e => { view.majBright = e.target.checked; });
$('uniOnlyT').addEventListener('change', e => { F.uniOnly = e.target.checked; refresh(); });
$('uniHiT').addEventListener('change', e => { view.uniHi = e.target.checked; document.body.classList.toggle('nouni', !view.uniHi); });
$('majT').addEventListener('change', e => { F.majorOnly = e.target.checked; refresh(); });
$('visT').addEventListener('change', e => { F.vision = e.target.checked; if (F.vision) F.dv = {opt:true,asset:true,demand:true,rd:true,gov:true}; refresh(); });
$('resetFilters').onclick = () => { Object.assign(F, DEFAULT_FILTERS()); hidden.clear(); refresh(); };

function syncFilterUI(){
  fieldList.querySelectorAll('.frow').forEach(r => {
    const k = r.dataset.f, on = F.fields.has(k); r.classList.toggle('on', on); r.setAttribute('aria-checked', on);
    r.querySelector('.ct').textContent = items.filter(it => it.v === k && !it.removed).length;
  });
  const sync = (el, obj) => el.querySelectorAll('.chipbtn').forEach(b => b.setAttribute('aria-pressed', !!obj[b.dataset.k]));
  sync($('srcChips'), F.src); sync($('kindChips'), F.kinds); sync($('confChips'), F.conf); sync($('catChips'), F.cats);
  { const f = singleField(), subs = f && FIELDS[f] ? FIELDS[f].subs : [];
    if ($('subChips').dataset.f !== (f || '')) { $('subChips').dataset.f = f || ''; $('subChips').innerHTML = subs.map(x => `<button class="chipbtn" data-k="${x.id}" style="color:${SUBCOL[x.id] ? '#' + SUBCOL[x.id].getHexString() : FIELDS[f].hex}"><span class="d"></span><span class="t">${x.name}</span></button>`).join(''); }
    $('subChips').querySelectorAll('.chipbtn').forEach(b => { b.setAttribute('aria-pressed', !(F.subOff && F.subOff[b.dataset.k])); b.querySelector('.t').textContent = subs.find(x => x.id === b.dataset.k).name + ' (' + items.filter(it => it.v === f && it.sub === b.dataset.k && !it.removed).length + ')'; });
    $('subHint').textContent = f ? `${FIELDS[f].name}: pick sub-fields to show. ${view.subLanes !== false ? 'Each has its own track.' : ''}` : 'Select a single field (use “Only”) to see and filter its sub-fields.';
    $('subLanesT').checked = view.subLanes !== false; }
  sync($('stageChips'), F.stages || {}); $('gbOnlyT').checked = !!F.gbOnly; $('attackT').checked = !!F.attackOnly; $('gapOnlyT').checked = !!F.gapOnly;
  sync($('regionChips'), F.regions || {}); sync($('verChips'), F.ver || {}); sync($('tagChips'), F.tags || {});
  $('fromR').value = F.from; $('toR').value = F.to; $('gapR').value = F.gapMax;
  $('fromV').textContent = F.from; $('toV').textContent = F.to; $('gapV').textContent = F.gapMax >= 60 ? 'Any' : F.gapMax + ' years';
  $('ghostT').checked = F.ghosts; if ($('q').value.trim() !== F.q) $('q').value = F.q;
  $('visT').checked = F.vision; $('majT').checked = !!F.majorOnly; $('uniOnlyT').checked = !!F.uniOnly; $('compactT').checked = view.compactLanes !== false;
}

/* Display UI */
function segBind(id, key, after){
  const el = $(id);
  const sync = () => el.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === view[key]));
  el.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; view[key] = b.dataset.v; sync(); store.set('sg.view.v2', view); after && after(); });
  sync(); return sync;
}
const syncLabelSeg = segBind('labelSeg', 'labels', () => {});
segBind('labelPlaySeg', 'labelPlay', () => {});
function syncTravelUI(){
  document.querySelectorAll('#camSeg button').forEach(b => b.setAttribute('aria-pressed', (b.dataset.v === 'travel') === !!view.camTravel));
  document.querySelectorAll('#fadeSeg button').forEach(b => b.setAttribute('aria-pressed', (b.dataset.v === 'fade') === !!view.fadeLanded));
  $('keepR').value = view.keepYears; $('keepV').textContent = view.keepYears + (view.keepYears === 1 ? ' year' : ' years');
  $('revealT').checked = view.revealEnd !== false;
  $('laneFollowT').checked = view.laneFollow !== false;
}
$('camSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; view.camTravel = b.dataset.v === 'travel'; store.set('sg.view.v2', view); syncTravelUI(); if (state.playing) startTravel(); if (!view.camTravel) endTravel(); });
$('fadeSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; view.fadeLanded = b.dataset.v === 'fade'; store.set('sg.view.v2', view); syncTravelUI(); });
$('keepR').addEventListener('input', e => { view.keepYears = +e.target.value; store.set('sg.view.v2', view); syncTravelUI(); });
$('laneFollowT').addEventListener('change', e => { view.laneFollow = e.target.checked; store.set('sg.view.v2', view); });
$('revealT').addEventListener('change', e => { view.revealEnd = e.target.checked; store.set('sg.view.v2', view); });
$('travelPreset').onclick = () => {
  Object.assign(view, {laneFollow:true, floor:true, camTravel:true, fadeLanded:true, keepYears:5, revealEnd:true, labels:'follow', labelPlay:'until', labelScope:'major', labelMax:8, labelLinger:2, trend:true});
  store.set('sg.view.v2', view); syncDisplayUI();
  if (!state.playing) playWithCountdown(); else startTravel();
};
syncTravelUI();
const LABEL_PRESETS = {
  story:{labels:'follow', labelPlay:'until', labelScope:'major', labelMax:8, labelLinger:2},
  highlights:{labels:'follow', labelPlay:'flash', labelScope:'all', labelMax:12, labelLinger:3},
  major:{labels:'peak', labelPlay:'always', labelScope:'major', labelMax:60, labelLinger:2},
  all:{labels:'follow', labelPlay:'always', labelScope:'all', labelMax:60, labelLinger:2}
};
document.querySelectorAll('[data-lp]').forEach(b => b.onclick = () => { Object.assign(view, LABEL_PRESETS[b.dataset.lp]); store.set('sg.view.v2', view); syncDisplayUI(); });
segBind('labelScopeSeg', 'labelScope', () => {});
segBind('laneSeg', 'lanes', () => { applyLanes(false); buildTrends(); if (travelOn) travelOffset.copy(travelDefaultOffset()); });
segBind('colSeg', 'colour', () => { applyColours(); renderMilestones(); });
function bindToggle(id, key, after){ const el = $(id); el.checked = view[key]; el.addEventListener('change', () => { view[key] = el.checked; store.set('sg.view.v2', view); after && after(); }); }
bindToggle('pulseT', 'pulses');
function applyHeader(){ document.body.classList.toggle('barauto', !!view.barAuto); if (layout.pagetitle) { view.hideTitle = !layout.pagetitle.open; $('titleShowT').checked = layout.pagetitle.open; } $('barAutoT').checked = !!view.barAuto; }
function togglePageTitle(on){ setOpen('pagetitle', on == null ? !layout.pagetitle.open : on); applyHeader(); buildWinMenu(); }
$('titleShowT').addEventListener('change', e => togglePageTitle(e.target.checked));
$('barAutoT').addEventListener('change', e => { view.barAuto = e.target.checked; store.set('sg.view.v2', view); applyHeader(); });
document.addEventListener('mousemove', e => { if (!view.barAuto) return; const r = wins.toolbar.getBoundingClientRect(); document.body.classList.toggle('near-top', (e.clientX > r.left - 60 && e.clientX < r.right + 60 && e.clientY > r.top - 60 && e.clientY < r.bottom + 60) || winMenu.classList.contains('open')); });
function applyLite(){ document.body.classList.toggle('lite', !!view.lite); renderer.setPixelRatio(view.lite ? 1 : Math.min(window.devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight); if (composer) { if (composer.setPixelRatio) composer.setPixelRatio(view.lite ? 1 : Math.min(window.devicePixelRatio, 2)); composer.setSize(innerWidth, innerHeight); } }
bindToggle('liteT', 'lite', applyLite);
bindToggle('trendT', 'trend', buildTrends);
bindToggle('floorT', 'floor', () => { floorLabels.visible = view.floor; laneSets.s.children.concat(laneSets.v.children).forEach(c => { if (c.userData.floorLabel) c.visible = view.floor; }); });
function bindRange(id, outId, key, after, fmt){
  const el = $(id), out = $(outId); el.value = view[key]; out.textContent = fmt ? fmt(view[key]) : view[key];
  el.addEventListener('input', () => { view[key] = +el.value; out.textContent = fmt ? fmt(view[key]) : view[key]; store.set('sg.view.v2', view); after && after(); });
}
bindRange('labelMaxR', 'labelMaxV', 'labelMax', () => {}, v => v >= 60 ? 'All' : String(v));
bindRange('lingerR', 'lingerV', 'labelLinger', () => {}, v => v + ' s');
bindRange('lfsR', 'lfsV', 'lfs', () => document.documentElement.style.setProperty('--lfs', view.lfs + 'px'), v => v + 'px');
bindRange('rotR', 'rotV', 'rotSpeed', () => { controls.autoRotateSpeed = view.rotSpeed; if (view.rotSpeed > 0 && !state.autoRotate) setAutoRotate(true); if (view.rotSpeed === 0) setAutoRotate(false); }, v => v.toFixed(2));
bindRange('glowR', 'glowV', 'glow', () => { if (bloom) bloom.strength = view.glow; }, v => v.toFixed(2));
document.documentElement.style.setProperty('--lfs', view.lfs + 'px');
floorLabels.visible = view.floor;

