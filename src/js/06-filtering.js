/* ==================================================================
 *  FILTERING
 * ================================================================== */
function matches(it){
  if (it.removed) return false;
  if (F.uniOnly && !it.uni) return false;
  if (!F.fields.has(it.v) || !F.src[it.s] || !F.kinds[it.kind] || !F.conf[it.c] || !F.cats[it.co ? 'co' : 'br']) return false;
  if (it.r < F.from || it.r > F.to) return false;
  if (F.gapMax < 60 && it.lag > F.gapMax) return false;
  if (F.vision && !(it.dv && F.dv[it.dv])) return false;
  if (F.majorOnly && !it.major) return false;
  if (F.subOff && it.sub && F.subOff[it.sub] && F.fields.size === 1) return false;
  if (F.stages && it.stage && F.stages[it.stage] === false) return false;
  if (F.gbOnly && it.gb !== 'deployed') return false;
  if (F.attackOnly && !it.attack) return false;
  if (F.gapOnly) { const r = secResponse(it); if (!r || r.resp || it.kind !== 'hist' || it.p < 2010 || it.p > NOW - 3) return false; }
  if (F.regions && F.regions[it.region || 'unknown'] === false) return false;
  if (F.ver && it.ver && F.ver[it.ver] === false) return false;
  if (F.tags) { const on = Object.keys(F.tags).filter(k => F.tags[k]); if (on.length && !(it.tags || []).some(t => F.tags[t])) return false; }
  if (F.q) { const q = F.q.toLowerCase(); if (!(it.t + ' ' + it.rw + ' ' + it.pw).toLowerCase().includes(q)) return false; }
  return true;
}
function shownFully(it){ return matches(it) && !hidden.has(it.id); }

const trendGroup = new THREE.Group(); scene.add(trendGroup);
const ERAS = [[1920,1950],[1950,1970],[1970,1990],[1990,2010],[2010,2030]];
function median(a){ if (!a.length) return null; const s = a.slice().sort((x,y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m-1] + s[m]) / 2; }
function buildTrends(){
  while (trendGroup.children.length) { const c = trendGroup.children.pop(); if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); }
  if (!view.trend) return;
  const lanes = subMode() ? FIELDS[singleField()].subs.filter(x => LANEZ.sub[x.id] != null).map(x => ({key:x.id, z:LANEZ.sub[x.id], col:SUBCOL[x.id] || FIELDS[singleField()].col, test:it => it.sub === x.id}))
    : view.lanes === 'v' ? FKEYS.filter(k => LANEZ.v[k] != null).map(k => ({key:k, z:LANEZ.v[k], col:FIELDS[k].col, test:it => it.v === k}))
                                   : Object.keys(SRC).filter(k => LANEZ.s[k] != null).map(k => ({key:k, z:LANEZ.s[k], col:SRC[k].col, test:it => it.s === k}));
  lanes.forEach(L => {
    const pts = [];
    ERAS.forEach(([a, b]) => {
      const set = items.filter(it => it.kind === 'hist' && shownFully(it) && L.test(it) && it.r >= a && it.r < b);
      if (!set.length) return;
      pts.push(new THREE.Vector3(xOf(median(set.map(it => it.r + it.lag / 2))), median(set.map(it => it.lag)) * H + .6, L.z));
    });
    const col = L.col.clone().lerp(WHITE, .55);
    pts.forEach(p => { const s = new THREE.Mesh(new THREE.SphereGeometry(.3, 12, 8), new THREE.MeshBasicMaterial({color:col, transparent:true, opacity:.9})); s.position.copy(p); trendGroup.add(s); });
    if (pts.length >= 2) {
      trendGroup.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 80, .06, 6, false),
        new THREE.MeshBasicMaterial({color:col, transparent:true, opacity:.55, depthWrite:false, blending:THREE.AdditiveBlending})));
      pts.forEach(p => trendGroup.add(line([p, new THREE.Vector3(p.x, 0, p.z)], col.getHex(), .12)));
    }
  });
}

