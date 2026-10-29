/* ==================================================================
 *  ITEMS
 * ================================================================== */
const SEG = 90, RAD = 6, IDX_PER_SEG = RAD * 6;
const hitMeshes = [];
const WHITE = new THREE.Color(0xffffff);
function buildItem(d, i) {
  const it = Object.assign({id:i, f:0, target:1}, d);
  const end = d.kind === 'flight' ? d.tg : d.p;
  it.lag = end - d.r;
  const x0 = xOf(d.r), x1 = xOf(end), h = Math.max(it.lag, 0.8) * H;
  it.curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(x0,0,0), new THREE.Vector3((x0+x1)/2, 2*h, 0), new THREE.Vector3(x1,0,0));
  it.group = new THREE.Group(); scene.add(it.group);
  it.mats = [];
  const addMat = (m, base) => { m.userData.base = base; it.mats.push(m); return m; };

  if (d.kind === 'hist' || d.kind === 'flight') {
    const geo = new THREE.TubeGeometry(it.curve, SEG, d.aud ? 0.26 : d.kind === 'flight' ? 0.08 : 0.1, RAD, false);
    if (d.kind === 'flight') {
      it.maxFrac = clamp((HORIZON - d.r) / it.lag, 0, 1);
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 3), 3));
      it.tubeMat = addMat(new THREE.MeshBasicMaterial({vertexColors:true, transparent:true, opacity:.9, depthWrite:false, blending:THREE.AdditiveBlending}), .9);
    } else {
      it.maxFrac = 1;
      it.tubeMat = addMat(new THREE.MeshBasicMaterial({transparent:true, opacity:.85, depthWrite:false, blending:THREE.AdditiveBlending}), .85);
    }
    it.tube = new THREE.Mesh(geo, it.tubeMat); it.group.add(it.tube);
    it.pulseMat = addMat(new THREE.SpriteMaterial({map:GLOW, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending}), 1);
    it.pulse = new THREE.Sprite(it.pulseMat); it.pulse.scale.set(2.2, 2.2, 1); it.group.add(it.pulse);
    it.speed = 1 / (1.6 + it.lag * 0.12); it.phase = Math.random();
  }
  if (d.kind === 'proj') {
    it.dotN = 34; it.dotPos = new Float32Array(it.dotN * 3);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(it.dotPos, 3));
    it.dotMat = addMat(new THREE.PointsMaterial({size:d.aud ? 1.6 : .75, map:GLOW, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending}), 1);
    it.dots = new THREE.Points(g, it.dotMat); it.group.add(it.dots); it.speed = 0.05;
    it.lead = new THREE.Vector3();
  }
  it.originMat = addMat(new THREE.MeshBasicMaterial({transparent:true, opacity:.95}), .95);
  it.origin = new THREE.Mesh(new THREE.SphereGeometry(d.kind === 'proj' ? .22 : .32, 16, 12), it.originMat);
  it.origin.position.copy(it.curve.v0); it.group.add(it.origin);
  if (d.kind !== 'flight') {
    it.ringMat = addMat(new THREE.MeshBasicMaterial({transparent:true, opacity:.9, depthWrite:false, side:THREE.DoubleSide, blending:THREE.AdditiveBlending}), .9);
    it.ring = new THREE.Mesh(new THREE.RingGeometry(.55, .85, 40), it.ringMat);
    it.ring.rotation.x = -Math.PI / 2; it.ring.position.copy(it.curve.v2).setY(.05); it.group.add(it.ring);
    it.landMat = addMat(new THREE.SpriteMaterial({map:GLOW, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending}), .7);
    it.land = new THREE.Sprite(it.landMat); it.land.scale.set(2.6, 2.6, 1); it.land.position.copy(it.curve.v2).setY(.3); it.group.add(it.land);
  }
  if (d.adopt && d.kind !== 'flight' && d.adopt > end) {
    const xa = xOf(d.adopt), ha = Math.max(d.adopt - end, .6) * H * .45;
    it.adCurve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(x1, 0, 0), new THREE.Vector3((x1 + xa) / 2, 2 * ha, 0), new THREE.Vector3(xa, 0, 0));
    it.adMat = addMat(new THREE.MeshBasicMaterial({transparent:true, opacity:.5, depthWrite:false, blending:THREE.AdditiveBlending}), .5);
    it.adTube = new THREE.Mesh(new THREE.TubeGeometry(it.adCurve, SEG, .055, RAD, false), it.adMat); it.group.add(it.adTube);
    it.adRingMat = addMat(new THREE.MeshBasicMaterial({transparent:true, opacity:.7, depthWrite:false, side:THREE.DoubleSide, blending:THREE.AdditiveBlending}), .7);
    it.adRing = new THREE.Mesh(new THREE.RingGeometry(.32, .48, 32), it.adRingMat); it.adRing.rotation.x = -Math.PI / 2; it.adRing.position.copy(it.adCurve.v2).setY(.05); it.group.add(it.adRing);
  }
  const hitMat = new THREE.MeshBasicMaterial({transparent:true, opacity:0, depthWrite:false});
  const pts = [it.curve.v0, it.curve.getPoint(d.kind === 'flight' ? it.maxFrac * .55 : .5)];
  if (d.kind !== 'flight') pts.push(it.curve.v2);
  pts.forEach(p => { const m = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 6), hitMat); m.position.copy(p); m.userData.it = it; it.group.add(m); hitMeshes.push(m); });
  it.peak = it.curve.getPoint(d.kind === 'flight' ? it.maxFrac * .55 : .5);
  if (d.dv) {
    it.diamondMat = addMat(new THREE.MeshBasicMaterial({color:0xFFF4D6, transparent:true, opacity:.95, depthWrite:false}), .95);
    it.diamond = new THREE.Mesh(new THREE.OctahedronGeometry(.42, 0), it.diamondMat);
    it.diamond.position.copy(d.kind === 'flight' ? it.curve.v0 : it.curve.v2).setY(1.5);
    it.group.add(it.diamond);
  }
  if (d.uni) {
    it.uniMat = addMat(new THREE.MeshBasicMaterial({color:0xFFD166, transparent:true, opacity:.95, depthWrite:false, side:THREE.DoubleSide}), .95);
    it.uniMark = new THREE.Mesh(new THREE.TorusGeometry(.8, .13, 8, 32), it.uniMat);
    it.uniMark.position.copy(it.curve.v0).setY(1.7); it.group.add(it.uniMark);
  }
  if (d.aud) {
    it.audMat = addMat(new THREE.SpriteMaterial({map:GLOW, color:0xFF5FD7, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending}), .9);
    it.audGlow = new THREE.Sprite(it.audMat); it.audGlow.scale.set(7, 7, 1); it.audGlow.position.copy(it.peak); it.group.add(it.audGlow);
  }
  return it;
}
const items = DATA.map(buildItem);

function itemColour(it){ if (it.aud && view.audSpot !== false) return AUD_COL; if (view.colour === 'v' && it.sub && SUBCOL[it.sub] && subMode()) return SUBCOL[it.sub]; return view.colour === 'v' ? FIELDS[it.v].col : SRC[it.s].col; }
function itemHex(it){ if (it.aud && view.audSpot !== false) return '#FF5FD7'; if (view.colour === 'v' && it.sub && SUBCOL[it.sub] && subMode()) return '#' + SUBCOL[it.sub].getHexString(); return view.colour === 'v' ? FIELDS[it.v].hex : SRC[it.s].hex; }
function laneZ(it){ const z = subMode() ? (LANEZ.sub[it.sub] != null ? LANEZ.sub[it.sub] : LANEZ.sub[(FIELDS[it.v] && FIELDS[it.v].subs.length ? FIELDS[it.v].subs[FIELDS[it.v].subs.length - 1].id : '')]) : view.lanes === 'v' ? LANEZ.v[it.v] : LANEZ.s[it.s]; return z == null ? (it.group ? it.group.position.z : 0) : z; }
function applyColours(){
  items.forEach(it => {
    if (it.removed || !FIELDS[it.v]) return;
    const col = itemColour(it);
    if (it.adMat) { const lc = col.clone().lerp(new THREE.Color(1, 1, 1), .35); it.adMat.color.copy(lc); it.adRingMat.color.copy(lc); }
    if (it.kind === 'hist') it.tubeMat.color.copy(col);
    if (it.kind === 'flight') {
      const a = it.tube.geometry.attributes.color, per = RAD + 1;
      for (let v = 0; v < a.count; v++) {
        const seg = Math.floor(v / per) / SEG, k = Math.pow(clamp(1 - seg / it.maxFrac, 0, 1), .7);
        a.setXYZ(v, col.r * k, col.g * k, col.b * k);
      }
      a.needsUpdate = true;
    }
    if (it.pulseMat) it.pulseMat.color.copy(col);
    it.originMat.color.copy(col);
    if (it.ringMat) { const rc = it.kind === 'proj' ? col.clone().lerp(WHITE, .6) : col; it.ringMat.color.copy(rc); it.landMat.color.copy(rc); }
    if (it.dotMat) it.dotMat.color.copy(col.clone().lerp(WHITE, .35));
    if (it.labelEl) it.labelEl.style.color = itemHex(it);
  });
}
function applyLanes(instant){
  ensureSubLanes(); const sm = subMode();
  laneSets.s.visible = view.lanes === 's'; laneSets.v.visible = view.lanes === 'v' && !sm; laneSets.sub.visible = sm;
  if (sm !== applyLanes.lastSub) { applyLanes.lastSub = sm; if (typeof applyColours === 'function') applyColours(); }
  items.forEach(it => { it.zTarget = laneZ(it); if (instant) it.group.position.z = it.zTarget; });
}

