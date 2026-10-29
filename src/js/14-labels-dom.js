/* ==================================================================
 *  LABELS (DOM)
 * ================================================================== */
const labelLayer = $('labels');
items.forEach(it => makeLabel(it));
const lv = new THREE.Vector3();
let lastLabelCur = null;
function hideLabel(el){ if (el._on) { el.style.display = 'none'; el._on = false; } }
function updateLabels(){
  const spot = view.audSpot !== false && AUD.length > 0, audOnly = view.labels === 'off';
  if ((audOnly && !spot) || document.body.classList.contains('clean')) { labelLayer.style.display = 'none'; lastLabelCur = null; return; }
  labelLayer.style.display = '';
  const W = innerWidth, Hh = innerHeight, now = performance.now(), cur = state.cursor, playing = state.playing;
  const linger = (view.labelLinger || 0) * 1000, flashMs = Math.max(2500, linger + 1500);
  // note the moment each arc lands (or starts, for arcs still in the lab) during play
  if (playing && lastLabelCur != null) {
    if (cur < lastLabelCur - .5) items.forEach(it => { it.landAt = it.startAt = 0; });
    else items.forEach(it => {
      const end = it.kind === 'flight' ? null : it.p;
      if (end != null && lastLabelCur < end && cur >= end) it.landAt = now;
      if (lastLabelCur < it.r && cur >= it.r) it.startAt = now;
    });
  }
  lastLabelCur = playing ? cur : null;
  const cands = [];
  items.forEach(it => {
    const el = it.labelEl;
    let show = it.group.visible && it.f > .5 && it.target === 1 && (it.fade == null || it.fade > .3);
    if (it.aud && show && spot) { cands.push({it, mode:state.playing ? 'follow' : 'peak', alpha:1, prio:1000, aud:true}); return; }
    if (audOnly) { hideLabel(el); return; }
    if (show && view.labelScope === 'major' && !it.major) show = false;
    let mode = view.labels, alpha = 1, prio = (it.major ? 2 : 0) + (it.uni && view.uniHi !== false ? 3 : 0) + (it.chg ? 4 : 0);
    if (show && playing && view.labelPlay !== 'always') {
      const end = it.kind === 'flight' ? Infinity : it.p;
      if (view.labelPlay === 'until') {
        if (it.kind === 'proj' && cur < NOW) show = false;
        else if (cur < end) { mode = 'tip'; prio += 10 + (cur - it.r) / 100; }
        else if (it.landAt && now - it.landAt < linger) { mode = 'land'; alpha = 1 - (now - it.landAt) / linger; prio += 9; }
        else show = false;
        if (show && it.kind === 'flight' && it.startAt && now - it.startAt > 6000) show = false;
        if (show && it.kind === 'flight' && !it.startAt) show = false;
      } else {
        const t0 = it.kind === 'flight' ? it.startAt : it.landAt;
        if (t0 && now - t0 < flashMs) { mode = 'land'; alpha = Math.min(1, (flashMs - (now - t0)) / 800); prio += 10 - (now - t0) / flashMs; }
        else show = false;
      }
    } else if (show && it.kind === 'hist') prio += it.p / 10000;
    if (!show) { hideLabel(el); return; }
    cands.push({it, mode, alpha, prio});
  });
  // Cap counts only labels actually placed on screen, so off-screen or overlapping candidates never starve the view
  const limit = view.labelMax >= 60 ? Infinity : view.labelMax;
  if (cands.length > 1) cands.sort((a, b) => b.prio - a.prio);
  const placed = [], lfs = view.lfs; let placedN = 0;
  cands.forEach(({it, mode, alpha, aud}) => {
    const el = it.labelEl;
    if (!aud && placedN >= limit) { hideLabel(el); return; }
    if (mode === 'land') lv.copy(it.kind === 'flight' ? it.curve.v0 : it.curve.v2).setY(1.6);
    else if (mode === 'tip' || mode === 'follow') { if (it.pulse) lv.copy(it.pulse.position); else lv.copy(it.lead); }
    else lv.copy(it.peak);
    lv.y += .9; lv.add(it.group.position);
    const dist = camera.position.distanceTo(lv);
    lv.project(camera);
    if (lv.z > 1 || lv.x < -1.1 || lv.x > 1.1 || lv.y < -1.1 || lv.y > 1.1) { hideLabel(el); return; }
    if (!el._on) { el.style.display = 'block'; el._on = true; }
    const wantAud = !!aud; if (el._aud !== wantAud) { el.classList.toggle('aud', wantAud); el._aud = wantAud; el._w = 0; }
    if (!el._w || el._lfs !== lfs) { el._w = el.offsetWidth; el._h = el.offsetHeight; el._lfs = lfs; }
    const x = (lv.x * .5 + .5) * W;
    let y = (-lv.y * .5 + .5) * Hh;
    // nudge upwards until this label no longer overlaps a higher-priority one
    const w = el._w, h = el._h + 2;
    let tries = 0, hit = true;
    while (hit && tries < 6) {
      hit = placed.some(r => Math.abs(r.x - x) < (r.w + w) / 2 && Math.abs(r.y - y) < (r.h + h) / 2);
      if (hit) { y -= h; tries++; }
    }
    if (hit || y - h < 64 * UI) { hideLabel(el); return; }
    placed.push({x, y, w, h}); if (!aud) placedN++;
    el.classList.toggle('aud', !!aud);
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
    const sel = (selected === it ? 1 : selected ? .35 : 1) * (view.majBright !== false && !it.major && !aud ? .72 : 1);
    el.style.opacity = (clamp(1.25 - dist / 220, (view.majBright !== false && it.major) || aud ? .85 : .25, 1) * sel * Math.min(1, it.f) * clamp(alpha, 0, 1)).toFixed(2);
    el.style.zIndex = Math.round(1000 - dist);
    el.classList.toggle('maj', !!it.major);
    el.classList.toggle('majhi', !!it.major && view.majBright !== false && !aud);
    el.classList.toggle('minor', !it.major && view.majBright !== false && !aud);
  });
}

