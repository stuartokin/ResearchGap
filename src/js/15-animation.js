/* ==================================================================
 *  ANIMATION
 * ================================================================== */
const clock = new THREE.Clock(), tmp = new THREE.Vector3(); let yearShown = -1;
function updatePlayTotals(yr){
  const pool = items.filter(shownFully);
  const reached = pool.filter(it => it.kind === 'hist' ? it.p <= yr : it.kind === 'proj' && yr > NOW && it.p <= yr);
  const rset = new Set(reached);
  const research = reached.filter(it => !it.co).length, products = reached.length - research;
  const inFlight = pool.filter(it => it.r <= yr && !rset.has(it)).length;
  $('playTotals').innerHTML = `<b>${reached.length}</b> reached so far: ${research} research ${research === 1 ? 'breakthrough' : 'breakthroughs'}, ${products} company ${products === 1 ? 'product' : 'products'}. <b>${inFlight}</b> in progress. <span>${pool.length} in this selection.</span>`;
}
function frame(){
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
  if (state.playing) {
    if (!paused) {
      const pe = playEnd();
      if (state.cursor < pe) { state.cursor += dt * (Y1 - Y0) / PLAY_SECONDS * playSpeed; if (state.cursor >= pe) { state.cursor = pe; endHold = 0; showConclusion(); } }
      else if (view.loopPlay) { endHold += dt; if (endHold > (view.conclusion !== false ? 7.5 : 4)) { state.cursor = playStart(); endHold = 0; conclusionShown = false; } }
      else { paused = true; syncPause(); }
    }
    cursorGroup.position.x = xOf(Math.min(state.cursor, Y1));
    const yr = Math.floor(Math.min(state.cursor, YEND));
    if (yearShown !== yr) {
      yearShown = yr;
      $('yearNum').textContent = yr;
      const g = rollingGap(yr);
      const scY = yr > NOW ? scenario() : null;
      if (scY) { const v = scenAt(scY, yr); $('yearSub').innerHTML = `Scenario for research starting now: <b>${fmtY(scY.base)} years</b> at the recent pace, <b>${fmtR(v.lo, v.hi)}</b> with AI and digital twins<br><span>an illustration, not a forecast</span>`; }
      else $('yearSub').innerHTML = g ? `Time taken from research to change: <b>${g.m} years</b><br><span>median of ${g.n} ${g.n === 1 ? 'arc' : 'arcs'} landing ${Math.max(Y0, yr - 9)}–${yr}${yr > NOW ? ', including expected' : ''}</span>` : `Time taken from research to change: <b>${yr - 9 <= Y0 ? 'no arcs landing yet' : 'no arcs landed in the last ten years'}</b><br><span>for this selection</span>`;
      if (document.activeElement !== $('scrub')) $('scrub').value = state.cursor;
      updatePlayTotals(yr);
      if (layout.summary.open && view.statsLive !== false) renderStats(yr);
    }
  }
  updateTimeWindows(false);
  tickStep(dt);
  audPlayCheck();
  chgPlayCheck(); if (chgFlagged.length) chgFrame(t);
  if (travelOn && state.playing) {
    const finale = view.revealEnd !== false && state.cursor >= playEnd() - .01;
    if (finale) { if (!travelFinale) { travelFinale = true; camGoal = {pos:HOME.pos.clone(), target:HOME.target.clone()}; } }
    else {
      if (travelFinale) { travelFinale = false; camGoal = null; }
      controls.autoRotate = false;
      if (!userDragging) {
        const k = 1 - Math.pow(.03, dt);
        travelTarget.set(xOf(Math.min(state.cursor, Y1)) - 8, 4, 0);
        controls.target.lerp(travelTarget, k);
        travelPos.copy(travelTarget).add(travelOffset);
        camera.position.lerp(travelPos, k);
      }
    }
  }
  if (camGoal) {
    // Glide the camera; pause auto-rotate meanwhile so the two never fight, and always finish within 4 seconds
    if (!camGoal.t0) camGoal.t0 = performance.now();
    controls.autoRotate = false;
    camera.position.lerp(camGoal.pos, 1 - Math.pow(.02, dt)); controls.target.lerp(camGoal.target, 1 - Math.pow(.02, dt));
    if (camera.position.distanceTo(camGoal.pos) < .3 || performance.now() - camGoal.t0 > 4000) {
      camGoal = null;
      if (!(travelOn && state.playing)) controls.autoRotate = state.autoRotate && view.rotSpeed > 0;
    }
  } else if (focusGoal) {
    controls.target.lerp(focusGoal, 1 - Math.pow(.05, dt)); if (controls.target.distanceTo(focusGoal) < .1) focusGoal = null;
  }
  const laneTravel = travelOn && state.playing && view.laneFollow !== false && !(view.revealEnd !== false && state.cursor >= playEnd() - .01);
  [['s', laneSets.s], ['v', laneSets.v], ['sub', laneSets.sub]].forEach(([mode, g]) => g.children.forEach(sub => {
    if (sub.userData.laneKey == null) return;
    const z = LANEZ[mode][sub.userData.laneKey];
    sub.visible = z != null;
    if (z != null) sub.position.z += (z - sub.position.z) * Math.min(1, dt * 3.5);
  }));
  [laneSets.s, laneSets.v, laneSets.sub].forEach(g => g.traverse(c => {
    if (!c.userData.laneLabel) return;
    const wantX = laneTravel ? controls.target.x - 18 : c.userData.homeX;
    c.position.x += (wantX - c.position.x) * Math.min(1, dt * 4);
    const left = laneTravel || Math.abs(c.position.x - c.userData.homeX) > 1;
    c.center.set(left ? 0 : 1, .5);
    if (laneTravel) c.position.y += (1.2 - c.position.y) * Math.min(1, dt * 4); else c.position.y += (.4 - c.position.y) * Math.min(1, dt * 4);
  }));
  const cur = state.cursor;
  items.forEach(it => {
    it.f += (it.target - it.f) * Math.min(1, dt * 5);
    it.group.position.z += (it.zTarget - it.group.position.z) * Math.min(1, dt * 3.5);
    const born = cur >= it.r ? 1 : 0;
    let fadeT = 1;
    if (state.playing && view.fadeLanded && !(view.revealEnd !== false && cur >= playEnd() - .01) && it.kind !== 'flight') {
      const gone = cur - it.p - (view.keepYears || 0);
      if (gone > 0) fadeT = clamp(1 - gone / 2, 0, 1);
    }
    it.fade = it.fade == null ? fadeT : it.fade + (fadeT - it.fade) * Math.min(1, dt * 4);
    if (Math.abs(fadeT - it.fade) < .04) it.fade = fadeT;
    it.group.visible = it.f * it.fade > .005 && born > 0;
    if (!it.group.visible) return;
    const boost = selected ? (selected === it ? 1.4 : .28) : 1, hov = hovered === it ? 1.5 : 1;
    const k = it.f * boost * hov * it.fade;
    let frac = 1;
    if (it.kind === 'hist') frac = clamp((cur - it.r) / Math.max(it.lag, .5), 0, 1);
    if (it.kind === 'flight') frac = Math.min(it.maxFrac, clamp((cur - it.r) / it.lag, 0, 1));
    it.mats.forEach(m => { m.opacity = clamp(m.userData.base * k, 0, 1); });
    if (it.tube) {
      it.tube.geometry.setDrawRange(0, Math.max(1, Math.floor(frac * SEG)) * IDX_PER_SEG);
      it.pulse.visible = view.pulses || frac < 1;
      if (it.kind === 'hist' && frac >= 1) {
        const tt = (t * it.speed + it.phase) % 1; it.curve.getPoint(tt, tmp); it.pulse.position.copy(tmp);
        const s = 1.8 + Math.sin(tt * Math.PI) * 1.2; it.pulse.scale.set(s, s, 1);
        if (!view.pulses) it.pulse.position.copy(it.peak);
      } else if (it.kind === 'flight') {
        it.curve.getPoint(Math.max(frac - .002, 0), tmp); it.pulse.position.copy(tmp);
        const s = 2 + Math.sin(t * 2.2 + it.phase * 6) * .6; it.pulse.scale.set(s, s, 1);
        if (frac >= it.maxFrac) it.pulseMat.opacity *= .35;
      } else { it.curve.getPoint(frac, tmp); it.pulse.position.copy(tmp); it.pulse.scale.set(3, 3, 1); }
    }
    if (it.adTube) {
      const af = clamp((cur - it.p) / Math.max(it.adopt - it.p, .5), 0, 1);
      const show = view.adoption !== false && (it.kind === 'hist' ? frac >= 1 : cur >= NOW) && af > 0;
      it.adTube.visible = show; it.adRing.visible = show && af >= 1;
      if (show) it.adTube.geometry.setDrawRange(0, Math.max(1, Math.floor(af * SEG)) * IDX_PER_SEG);
      if (it.adopt > NOW) { it.adMat.opacity *= .55; it.adRingMat.opacity *= .55; }
    }
    if (it.diamond) it.diamond.rotation.y = t * 1.4;
    if (it.uniMark) { it.uniMark.visible = view.uniHi !== false; it.uniMark.rotation.y = t * 1.1; }
    if (it.audGlow) { it.audGlow.visible = view.audSpot !== false; const sc = 6 + Math.sin(t * 3) * 1.5; it.audGlow.scale.set(sc, sc, 1); }
    if (it.ring) {
      const landed = it.kind === 'hist' ? frac >= 1 : cur >= NOW;
      it.ring.visible = it.land.visible = landed;
      const p = 1 + .12 * Math.sin(t * 2 + it.id); it.ring.scale.set(p, p, p);
    }
    if (it.dots) {
      const a = clamp((cur - NOW) / 2.5, 0, 1);
      it.dotMat.opacity *= a; if (it.ring) { it.ringMat.opacity *= a; it.landMat.opacity *= a; }
      const off = view.pulses ? t * it.speed : 0;
      for (let i = 0; i < it.dotN; i++) {
        it.curve.getPoint(((i / it.dotN) + off) % 1, tmp);
        it.dotPos[i*3] = tmp.x; it.dotPos[i*3+1] = tmp.y; it.dotPos[i*3+2] = tmp.z;
      }
      it.dots.geometry.attributes.position.needsUpdate = true;
      it.curve.getPoint((off * 1.0 + .5) % 1, it.lead);
    }
  });
  trendGroup.visible = !state.playing || cur >= Y1 - .5;
  dust.rotation.y += dt * .006;
  // Auto-rotate is applied per frame by three.js; scale it so 60Hz and 144Hz monitors rotate at the same speed
  controls.autoRotateSpeed = view.rotSpeed * Math.min(3, dt * 60);
  controls.update();
  if (composer && !view.lite) composer.render(); else renderer.render(scene, camera);
  updateLabels();
}

