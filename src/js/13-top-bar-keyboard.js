/* ==================================================================
 *  TOP BAR, KEYBOARD
 * ================================================================== */
function setAutoRotate(on){ state.autoRotate = on; controls.autoRotate = on && view.rotSpeed > 0; $('rotBtn').setAttribute('aria-pressed', on); }
$('rotBtn').onclick = () => setAutoRotate(!state.autoRotate);
$('resetBtn').onclick = resetAll;
function resetAll(){
  if (!confirm('Reset everything to the original defaults: windows, positions, text sizes, colours, filters, music and settings? Saved view files are not affected.')) return;
  try { Object.keys(localStorage).filter(k => k.indexOf('sg.') === 0).forEach(k => localStorage.removeItem(k)); } catch (e) {}
  location.href = location.pathname;
}
$('fsBtn').onclick = () => { if (!document.fullscreenElement) { document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); } else { document.exitFullscreen && document.exitFullscreen(); } };
document.addEventListener('fullscreenchange', () => { $('fsBtn').textContent = document.fullscreenElement ? 'Exit full screen' : 'Full screen'; });
$('aboutBtn').onclick = () => $('about').classList.add('open');
$('ideasBtn').onclick = () => setOpen('audience', !layout.audience.open);
$('aboutClose').onclick = () => $('about').classList.remove('open');
$('aboutSources').onclick = () => { $('about').classList.remove('open'); setOpen('sources', true); };
$('about').onclick = e => { if (e.target.id === 'about') $('about').classList.remove('open'); };
$('playBtn').onclick = () => { if (cdTimer) { cancelCountdown(); return; } state.playing ? stopPlay() : playWithCountdown(); };


let camGoal = null, focusGoal = null;
const travelOffset = new THREE.Vector3(-26, 22, 58), travelTarget = new THREE.Vector3(), travelPos = new THREE.Vector3();
let userDragging = false, travelOn = false, travelFinale = false;
function travelDefaultOffset(){ return view.lanes === 'v' ? new THREE.Vector3(-30, 38, 84) : new THREE.Vector3(-26, 22, 58); }
function startTravel(){ if (!view.camTravel) return; travelOn = true; camGoal = null; focusGoal = null; controls.autoRotate = false; travelOffset.copy(travelDefaultOffset()); }
function endTravel(){ if (!travelOn) return; travelOn = false; setAutoRotate(state.autoRotate); camGoal = {pos:HOME.pos.clone(), target:HOME.target.clone()}; }
controls.addEventListener('start', () => { userDragging = true; });
controls.addEventListener('end', () => { userDragging = false; if (travelOn) travelOffset.copy(camera.position).sub(controls.target); });
function resetView(){ camGoal = {pos:HOME.pos.clone(), target:HOME.target.clone()}; focusGoal = null; }
controls.addEventListener('start', () => { camGoal = null; focusGoal = null; });

const prefs = Object.assign({playSpeed:1}, store.get('sg.prefs', {}));
function savePrefs(){ store.set('sg.prefs', prefs); }
const PLAY_SECONDS = 24; let paused = false, playSpeed = prefs.playSpeed || 1, endHold = 0;
function startPlay(){ if (view.camTravel) startTravel(); state.playing = true; paused = false; state.cursor = playStart(); conclusionShown = false; $('playBtn').textContent = 'Exit play'; yearShown = -1; if (!layout.player.open) setOpen('player', true); else raise('player'); cursorGroup.visible = true; syncPause(); updateTimeWindows(true); }
function stopPlay(){ cancelCountdown(); endTravel(); state.playing = false; setTimeout(() => { renderStats(); twKey = ''; }, 0); paused = false; state.cursor = Y1; $('playBtn').textContent = playLabel(); if (layout.player.open) setOpen('player', false); cursorGroup.visible = false; updateTimeWindows(true); }
function syncPause(){ $('tbPause').textContent = paused ? (state.cursor >= playEnd() ? 'Replay' : 'Resume') : 'Pause'; }
function togglePause(){ if (!state.playing) { playWithCountdown(); return; } if (paused && state.cursor >= playEnd()) { state.cursor = playStart(); conclusionShown = false; } paused = !paused; syncPause(); }
$('tbPause').onclick = togglePause;
$('tbStop').onclick = stopPlay;
$('tbSpeed').value = String(playSpeed);
$('loopT').checked = !!view.loopPlay;
$('loopT').addEventListener('change', e => { view.loopPlay = e.target.checked; $('loopD').checked = view.loopPlay; store.set('sg.view.v2', view); });
$('loopD').checked = !!view.loopPlay;
$('loopD').addEventListener('change', e => { view.loopPlay = e.target.checked; $('loopT').checked = view.loopPlay; store.set('sg.view.v2', view); });
$('tbSpeed').onchange = e => { playSpeed = +e.target.value; prefs.playSpeed = playSpeed; savePrefs(); };
$('scrub').addEventListener('input', e => { cancelCountdown(); if (!state.playing) startPlay(); paused = true; state.cursor = +e.target.value; syncPause(); });

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && ($('thanks').classList.contains('on') || $('countdown').classList.contains('on'))) { showThanks(false); cancelCountdown(); return; }
  if ($('thanks').classList.contains('on') && e.key !== 'q' && e.key !== 'Q') return;
  const tag = e.target.tagName;
  if ((tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') && e.key !== 'Escape') return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key >= '1' && e.key <= '9') { F.fields = new Set([FKEYS[+e.key - 1]]); refresh(); }
  else if (e.key === '0') { F.fields = new Set(FKEYS); refresh(); }
  else if (e.key === 'p' || e.key === 'P') state.playing ? stopPlay() : playWithCountdown();
  else if (e.key === 'q' || e.key === 'Q') showThanks();
  else if (e.key === 'm' || e.key === 'M') setOpen('toolbar', !layout.toolbar.open);
  else if (e.key === ']') stepMilestone(1);
  else if (e.key === '[') stepMilestone(-1);
  else if (e.key === ' ' && state.playing) { e.preventDefault(); togglePause(); }
  else if (e.key === 'r' || e.key === 'R') resetView();
  else if (e.key === 'h' || e.key === 'H') document.body.classList.toggle('clean');
  else if (e.key === 't' || e.key === 'T') togglePageTitle();
  else if (e.key === 'f' || e.key === 'F') $('fsBtn').click();
  else if (e.key === 'l' || e.key === 'L') { const order = ['off','peak','follow']; view.labels = order[(order.indexOf(view.labels) + 1) % 3]; syncLabelSeg(); store.set('sg.view.v2', view); }
  else if (e.key === 'Escape') { $('about').classList.remove('open'); winMenu.classList.remove('open'); selected = null; }
});

/* Picking */
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(), tip = $('tip');
let downAt = null;
function pick(ev){
  const r = renderer.domElement.getBoundingClientRect();
  mouse.x = ((ev.clientX - r.left) / r.width) * 2 - 1; mouse.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
  ray.setFromCamera(mouse, camera);
  for (const h of ray.intersectObjects(hitMeshes, false)) { const it = h.object.userData.it; if (it.f > .5 && (it.fade == null || it.fade > .4) && state.cursor >= it.r) return it; }
  return null;
}
renderer.domElement.addEventListener('pointermove', ev => {
  if (ev.pointerType !== 'mouse') return;
  const it = pick(ev); hovered = it; document.body.classList.toggle('pointing', !!it);
  if (it) {
    const span = it.kind === 'hist' ? `${it.r} to ${it.p}, ${lagTxt(it.lag)}` : it.kind === 'proj' ? `Expected around ${it.p}` : `Since ${it.r}, not yet landed`;
    tip.innerHTML = `<b>${esc(it.t)}</b><span>${FIELDS[it.v].name}. ${span}${it.dv ? '<br>Linked to an AI for clean energy area' : ''}</span>`;
    tip.style.left = Math.min(ev.clientX + 14, innerWidth - 290) + 'px'; tip.style.top = (ev.clientY + 14) + 'px'; tip.style.opacity = 1;
  } else tip.style.opacity = 0;
});
renderer.domElement.addEventListener('pointerleave', () => { hovered = null; tip.style.opacity = 0; });
renderer.domElement.addEventListener('pointerdown', ev => { downAt = {x:ev.clientX, y:ev.clientY}; });
renderer.domElement.addEventListener('pointerup', ev => {
  if (!downAt) return; const moved = Math.hypot(ev.clientX - downAt.x, ev.clientY - downAt.y); downAt = null;
  if (moved > 6) return; const it = pick(ev); if (it) openDetail(it); else selected = null;
});
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); if (composer) composer.setSize(innerWidth, innerHeight);
  WIN_IDS.forEach(placeWin);
});

