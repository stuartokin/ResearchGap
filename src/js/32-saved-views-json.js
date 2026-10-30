/* ==================================================================
 *  SAVED VIEWS (JSON)
 * ================================================================== */
function snapshot(name){
  return {app:'the-shrinking-gap', version:2, name, saved:new Date().toISOString(), screen:{w:innerWidth, h:innerHeight, fullScreen:!!document.fullscreenElement},
    layout:JSON.parse(JSON.stringify(layout)), maxed:WIN_IDS.filter(id => wins[id].classList.contains('max')),
    view:Object.assign({}, view), filters:Object.assign({}, F, {fields:[...F.fields]}),
    hidden:[...hidden].map(i => items[i].uid || items[i].t), title:Object.assign({}, titleCfg), ticker:Object.assign({}, tick),
    camera:{pos:camera.position.toArray(), target:controls.target.toArray()}, autoRotate:state.autoRotate, musicVolume:mus.vol,
    music:{volume:mus.vol, track:mus.track}, playSpeed, loopPlay:!!view.loopPlay, visionExpanded:[...visOpen],
    playState:{playing:state.playing, cursor:state.cursor, paused}, cleanMode:document.body.classList.contains('clean'),
    charts:chartState(), scroll:scrollState(),
    zOrder:WIN_IDS.slice().sort((a, b) => (+wins[a].style.zIndex || 0) - (+wins[b].style.zIndex || 0)),
    videos:Object.fromEntries(['vid1','vid2'].map(id => [id, {muted:$(id).muted, volume:$(id).volume}])),
    audience:audSnapshot(), customFields:FKEYS.filter(k => FIELDS[k].custom).map(k => FIELDS[k].name),
    selected:selected ? (selected.uid || selected.t) : null, pageTitleText:$('pageTitle').textContent, autoRotateSpeed:view.rotSpeed, appVersion:APP_VERSION};
}
function saveViewFile(){
  const name = (prompt('Name this view, for example “opening”, “play” or “questions”:', 'view') || '').trim();
  if (!name) return;
  const blob = new Blob([JSON.stringify(snapshot(name), null, 2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = name.replace(/[^\w\-]+/g, '-').toLowerCase() + '.json';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}
function syncDisplayUI(){
  if (typeof renderFortunes === 'function' && layout.fortunes && layout.fortunes.open) renderFortunes();
  [['labelSeg','labels'],['labelPlaySeg','labelPlay'],['labelScopeSeg','labelScope'],['laneSeg','lanes'],['colSeg','colour']].forEach(([id, k]) => $(id).querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === view[k])));
  if (typeof syncChgUI === 'function') { syncChgUI(); applyChangeFlags(); }
  $('adoptT').checked = view.adoption !== false; $('conclT').checked = view.conclusion !== false; $('paletteS').value = view.palette || 'standard';
  if ((view.palette || 'standard') !== (window.__pal || 'standard')) applyPalette();
  syncPlayRangeUI();
  if (typeof syncPanels === 'function') syncPanels();
  $('fullTextT').checked = !!view.fullText; if (typeof clampAll === 'function') { if (view.fullText) unclampAll(); else clampAll(); }
  $('smartPlaceT').checked = view.smartPlace !== false; $('flashNewT').checked = view.flashNew !== false;
  $('keepPosT').checked = view.keepWinPos !== false; $('fitLoadT').checked = view.fitOnLoad !== false;
  $('countdownT').checked = view.countdown !== false; $('thanksIconT').checked = view.thanksIcon !== false; document.body.classList.toggle('nothanks', view.thanksIcon === false);
  $('gapBuildT').checked = view.gapBuild !== false; $('statsLiveT').checked = view.statsLive !== false; $('compactT').checked = view.compactLanes !== false;
  $('majBrightT').checked = view.majBright !== false; $('uniHiT').checked = view.uniHi !== false; document.body.classList.toggle('nouni', view.uniHi === false); $('audSpotT').checked = view.audSpot !== false; $('audPauseT').checked = view.audPause !== false;
  [['pulseT','pulses'],['trendT','trend'],['floorT','floor'],['loopD','loopPlay'],['loopT','loopPlay'],['liteT','lite']].forEach(([id, k]) => { $(id).checked = !!view[k]; });
  applyLite(); applyHeader(); syncTravelUI();
  [['labelMaxR','labelMaxV','labelMax',v => v >= 60 ? 'All' : String(v)],['lingerR','lingerV','labelLinger',v => v + ' s'],['lfsR','lfsV','lfs',v => v + 'px'],['rotR','rotV','rotSpeed',v => (+v).toFixed(2)],['glowR','glowV','glow',v => (+v).toFixed(2)]].forEach(([r, o, k, f]) => { $(r).value = view[k]; $(o).textContent = f(view[k]); });
  document.documentElement.style.setProperty('--lfs', view.lfs + 'px');
  controls.autoRotateSpeed = view.rotSpeed; if (bloom) bloom.strength = view.glow;
  applyLanes(false); applyColours(); $('floorT').dispatchEvent(new Event('change'));
}
function applyView(o){
  if (!o || o.app !== 'the-shrinking-gap') { alert('That file is not a saved view from this app.'); return; }
  const d = defaultLayout(), fit = view.fitOnLoad !== false;   // the current user's setting, not the file's
  const sw = (o.screen && o.screen.w) || innerWidth, sh = (o.screen && o.screen.h) || innerHeight;
  layout = {};
  WIN_IDS.forEach(id => {
    const saved = (o.layout || {})[id];
    const L = Object.assign({}, d[id], saved || {});
    if (saved) { if (!saved.sw) L.sw = sw; if (!saved.sh) L.sh = sh; }
    if (saved && fit && (L.sw !== innerWidth || L.sh !== innerHeight)) Object.assign(L, winRect(L, innerWidth, innerHeight, true), {sw:innerWidth, sh:innerHeight});
    layout[id] = L;
  });
  const savedOpen = Object.fromEntries(WIN_IDS.map(id => [id, layout[id].open]));
  WIN_IDS.forEach(id => { wins[id].classList.toggle('max', (o.maxed || []).includes(id)); placeWin(id); });
  saveLayout(); buildWinMenu();
  if (o.view && o.view.hideTitle && !(o.layout && o.layout.pagetitle)) { layout.pagetitle.open = false; placeWin('pagetitle'); }
  if (o.pageTitleText) $('pageTitle').textContent = o.pageTitleText;
  if (o.view) { Object.assign(view, o.view); store.set('sg.view.v2', view); syncDisplayUI(); }
  if (o.filters) { const f = o.filters, def = DEFAULT_FILTERS(); Object.assign(F, def, f, {fields:new Set(f.fields || FKEYS)}); }
  hidden.clear(); (o.hidden || []).forEach(t => { const it = items.find(x => x.uid === t || x.t === t); if (it) hidden.add(it.id); });
  if (o.title) { Object.assign(titleCfg, o.title); applyTitle(); }
  if (o.ticker) { Object.assign(tick, o.ticker); applyTicker(); buildTicker(); }
  if (o.musicVolume != null) { mus.vol = o.musicVolume; music.volume = mus.vol; $('muVol').value = mus.vol; $('muVolV').textContent = Math.round(mus.vol * 100) + '%'; }
  if (o.camera) camGoal = {pos:new THREE.Vector3().fromArray(o.camera.pos), target:new THREE.Vector3().fromArray(o.camera.target)};
  if (o.view && o.view.musicOn === false) music.pause();
  if (o.view && o.view.musicOn) startMusicIfWanted();
  if (o.music) { mus.vol = o.music.volume != null ? o.music.volume : mus.vol; music.volume = mus.vol; $('muVol').value = mus.vol; $('muVolV').textContent = Math.round(mus.vol * 100) + '%'; if (o.music.track) setTrack(o.music.track); }
  if (o.playSpeed) { playSpeed = o.playSpeed; prefs.playSpeed = playSpeed; savePrefs(); $('tbSpeed').value = String(playSpeed); }
  if (o.zOrder) o.zOrder.forEach(id => { if (wins[id]) raise(id); });
  if (o.videos) Object.entries(o.videos).forEach(([id, v]) => { if ($(id)) { $(id).muted = v.muted !== false; if (v.volume != null) $(id).volume = v.volume; } });
  if (o.customFields) o.customFields.forEach(n => ensureField(n));
  if (o.audience) loadAudience(o.audience);
  if (o.visionExpanded) { visOpen.clear(); o.visionExpanded.forEach(k => visOpen.add(k)); }
  if (o.autoRotate != null) setAutoRotate(o.autoRotate);
  refresh(); syncVideos(); twKey = '';
  if (o.cleanMode != null) document.body.classList.toggle('clean', !!o.cleanMode);
  if (o.playState) {
    if (o.playState.playing) { if (!state.playing) startPlay(); state.cursor = o.playState.cursor != null ? o.playState.cursor : Y0; paused = !!o.playState.paused; syncPause(); yearShown = -1; }
    else if (state.playing) stopPlay();
  }
  if (o.selected) { const it = items.find(x => x.uid === o.selected || x.t === o.selected); if (it) openDetail(it); }
  // selecting a milestone or starting Play opens their windows; restore exactly what the view saved
  WIN_IDS.forEach(id => { if (layout[id].open !== savedOpen[id]) { layout[id].open = savedOpen[id]; placeWin(id); } }); buildWinMenu(); syncVideos();
  if (o.camera && !(state.playing && view.camTravel)) camGoal = {pos:new THREE.Vector3().fromArray(o.camera.pos), target:new THREE.Vector3().fromArray(o.camera.target)};
  if (o.autoRotate != null) setAutoRotate(o.autoRotate);
  renderFortunes(state.playing ? Math.floor(Math.min(state.cursor, YEND)) : YEND);
  if (o.charts) applyChartState(o.charts);
  if (o.scroll) [600, 1400].forEach(ms => setTimeout(() => applyScroll(o.scroll), ms));   // once the windows and charts have drawn
}
$('viewFile').addEventListener('change', e => {
  const f = e.target.files && e.target.files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = () => { try { applyView(JSON.parse(rd.result)); } catch (err) { alert('Could not read that view file.'); } e.target.value = ''; };
  rd.readAsText(f);
});

