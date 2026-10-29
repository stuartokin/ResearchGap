/* ==================================================================
 *  STAGE
 * ================================================================== */
const stage = new THREE.Group(); scene.add(stage);
const floorLabels = new THREE.Group(); scene.add(floorLabels);
(function(){
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), gr = g.createRadialGradient(128,128,0,128,128,128);
  gr.addColorStop(0,'rgba(36,74,104,.16)'); gr.addColorStop(1,'rgba(36,74,104,0)');
  g.fillStyle = gr; g.fillRect(0,0,256,256);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(280,150), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c), transparent:true, depthWrite:false}));
  m.rotation.x = -Math.PI / 2; m.position.y = -0.05; stage.add(m);
})();
for (let y = Math.ceil((Y0 + 1) / 10) * 10; y <= YEND; y += 10) {  // decade grid
  const x = xOf(y);
  stage.add(line([new THREE.Vector3(x,0,-ZE), new THREE.Vector3(x,0,ZE)], 0x9CC3DC, y % 50 === 0 ? 0.2 : 0.09));
  const lab = textSprite(String(y), {size:26, color:'#7E95A7', world:1.6}); lab.position.set(x, 0.2, ZE + 3); floorLabels.add(lab);
}
for (let y = 1925; y <= YEND; y++) { if (y % 10) stage.add(line([new THREE.Vector3(xOf(y),0,ZE-.6), new THREE.Vector3(xOf(y),0,ZE)], 0x9CC3DC, 0.18)); }

// lanes (two layouts)
const laneSets = {s:new THREE.Group(), v:new THREE.Group(), sub:new THREE.Group()};
scene.add(laneSets.sub);
scene.add(laneSets.s); scene.add(laneSets.v);
function addLane(group, key, z, col, hex, name){
  const sub = new THREE.Group(); sub.position.z = z; sub.userData.laneKey = key; group.add(sub);
  sub.add(line([new THREE.Vector3(xOf(Y0),0,0), new THREE.Vector3(xOf(NOW),0,0)], col, 0.32));
  sub.add(line([new THREE.Vector3(xOf(NOW),0,0), new THREE.Vector3(xOf(Y1),0,0)], col, 0.12));
  const lab = textSprite(name, {size:28, color:hex, world:group === laneSets.s ? 2.1 : 1.5, align:'right'});
  lab.position.set(xOf(Y0) - 2, 0.4, 0); sub.add(lab); lab.userData.floorLabel = true; lab.userData.laneLabel = true; lab.userData.homeX = xOf(Y0) - 2;
  return sub;
}
Object.keys(SRC).forEach(k => {
  const sub = addLane(laneSets.s, k, SRC[k].z, SRC[k].col.getHex(), SRC[k].hex, SRC[k].name);
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(xOf(Y1) - xOf(Y0), 3.2),
    new THREE.MeshBasicMaterial({color:SRC[k].col, transparent:true, opacity:0.035, depthWrite:false, side:THREE.DoubleSide}));
  strip.rotation.x = -Math.PI / 2; strip.position.set(0, 0.01, 0); sub.add(strip);
});
FKEYS.forEach(k => addLane(laneSets.v, k, FIELDS[k].z, FIELDS[k].col.getHex(), FIELDS[k].hex, FIELDS[k].name));
/* Lane positions: hidden lanes collapse and the rest spread out to use the space */
const LANEZ = {s:{}, v:{}};
/* Sub-field tracks: shown instead of field tracks when exactly one field is selected */
const SUBCOL = {};
function singleField(){ return F.fields.size === 1 ? [...F.fields][0] : null; }
function subMode(){ const f = singleField(); return view.subLanes !== false && view.lanes === 'v' && !!f && !!FIELDS[f] && FIELDS[f].subs.length > 1; }
function ensureSubLanes(force){
  const f = subMode() ? singleField() : null;
  if (!force && laneSets.sub.userData.field === f) return;
  laneSets.sub.children.slice().forEach(sub => { laneSets.sub.remove(sub); sub.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) { if (c.material.map) c.material.map.dispose(); c.material.dispose(); } }); });
  laneSets.sub.userData.field = f;
  if (!f) return;
  const subs = FIELDS[f].subs, base = FIELDS[f].col;
  subs.forEach((sb, i) => {
    const c = base.clone().offsetHSL((i - (subs.length - 1) / 2) * .055, 0, (i % 2 ? .1 : -.02));
    SUBCOL[sb.id] = c; const hex = '#' + c.getHexString();
    addLane(laneSets.sub, sb.id, LANEZ.sub && LANEZ.sub[sb.id] != null ? LANEZ.sub[sb.id] : 0, c.getHex(), hex, sb.name);
  });
  laneSets.sub.traverse(c => { if (c.userData.floorLabel) c.visible = view.floor; });
}
function computeLaneLayout(){
  ['s','v'].forEach(mode => {
    const all = mode === 'v' ? FKEYS : Object.keys(SRC);
    const act = all.filter(k => !view.compactLanes || (mode === 'v' ? F.fields.has(k) : F.src[k]));
    const n = act.length, base = mode === 'v' ? 5 : 12, span = mode === 'v' ? 50 : 24;
    const sp = n > 1 ? Math.min(Math.max(base, span / (n - 1)), 16) : 0;
    all.forEach(k => { const i = act.indexOf(k); LANEZ[mode][k] = i < 0 ? null : (i - (n - 1) / 2) * sp; });
  });
  LANEZ.sub = {};
  const f = singleField();
  if (f && FIELDS[f]) {
    const all = FIELDS[f].subs.map(x => x.id), act = all.filter(k => !view.compactLanes || !(F.subOff && F.subOff[k]));
    const n = act.length, sp = n > 1 ? Math.min(Math.max(6, 50 / (n - 1)), 16) : 0;
    all.forEach(k => { const i = act.indexOf(k); LANEZ.sub[k] = i < 0 ? null : (i - (n - 1) / 2) * sp; });
  }
}
function laneHidden(it){ if (subMode()) return LANEZ.sub[it.sub] == null; return view.lanes === 'v' ? LANEZ.v[it.v] == null : LANEZ.s[it.s] == null; }

const todayX = xOf(NOW);
(function(){
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(ZE * 2, 30),
    new THREE.MeshBasicMaterial({color:0xE9F2FF, transparent:true, opacity:0.03, depthWrite:false, side:THREE.DoubleSide}));
  wall.rotation.y = Math.PI / 2; wall.position.set(todayX, 15, 0); stage.add(wall);
  stage.add(line([new THREE.Vector3(todayX,0,-ZE), new THREE.Vector3(todayX,0,ZE)], 0xE9F2FF, 0.55));
  stage.add(line([new THREE.Vector3(todayX,30,-ZE), new THREE.Vector3(todayX,30,ZE)], 0xE9F2FF, 0.12));
  stage.add(line([new THREE.Vector3(todayX,0,-ZE), new THREE.Vector3(todayX,30,-ZE)], 0xE9F2FF, 0.12));
  const t = textSprite('Today', {size:30, color:'#E9F2FF', world:3, serif:true}); t.position.set(todayX, 31.8, -ZE); floorLabels.add(t);
  const w = xOf(Y1) - todayX;
  const zone = new THREE.Mesh(new THREE.PlaneGeometry(w, ZE * 2),
    new THREE.MeshBasicMaterial({color:0xE9F2FF, transparent:true, opacity:0.045, depthWrite:false, side:THREE.DoubleSide}));
  zone.rotation.x = -Math.PI / 2; zone.position.set(todayX + w / 2, 0.02, 0); stage.add(zone);
  const z2 = textSprite('Next ten years', {size:24, color:'#C9D8E6', world:1.6, serif:true, align:'left'});
  z2.position.set(todayX + 0.6, 0.3, -ZE - 2.5); floorLabels.add(z2);
  const cap = textSprite('Year research began', {size:22, color:'#5D7486', world:1.3, align:'left'});
  cap.position.set(xOf(Y0), 0.2, ZE + 6); floorLabels.add(cap);
  for (let yrs = 10; yrs <= 30; yrs += 10) {
    const y = yrs * H;
    stage.add(line([new THREE.Vector3(xOf(Y0),y,-ZE), new THREE.Vector3(xOf(Y0),y,ZE)], 0x9CC3DC, 0.07));
    const l = textSprite(yrs + ' years', {size:22, color:'#5D7486', world:1.3, align:'right'});
    l.position.set(xOf(Y0) - 1, y, -ZE); floorLabels.add(l);
  }
})();

const dust = (function(){
  const N = 1400, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 70 + Math.random() * 230, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    pos[i*3] = r * Math.sin(ph) * Math.cos(th); pos[i*3+1] = Math.abs(r * Math.cos(ph)) * .6 - 10; pos[i*3+2] = r * Math.sin(ph) * Math.sin(th);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({size:0.9, map:GLOW, color:0x7FA6C4, transparent:true, opacity:0.5, depthWrite:false, blending:THREE.AdditiveBlending}));
  scene.add(p); return p;
})();

const cursorGroup = new THREE.Group(); scene.add(cursorGroup);
(function(){
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(ZE * 2, 30),
    new THREE.MeshBasicMaterial({color:0xE9F2FF, transparent:true, opacity:0.06, depthWrite:false, side:THREE.DoubleSide, blending:THREE.AdditiveBlending}));
  wall.rotation.y = Math.PI / 2; wall.position.y = 15; cursorGroup.add(wall);
  cursorGroup.add(line([new THREE.Vector3(0,0.05,-ZE), new THREE.Vector3(0,0.05,ZE)], 0xFFFFFF, 0.9));
  cursorGroup.visible = false;
})();

