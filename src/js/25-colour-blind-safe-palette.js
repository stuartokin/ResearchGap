/* ==================================================================
 *  COLOUR-BLIND-SAFE PALETTE
 * ================================================================== */
const ORIG_FIELD_HEX = {}; FKEYS.forEach(k => { ORIG_FIELD_HEX[k] = FIELDS[k].hex; });
const ORIG_SRC_HEX = {}; Object.keys(SRC).forEach(k => { ORIG_SRC_HEX[k] = SRC[k].hex; });
const CB_FIELDS = ['#E69F00','#56B4E9','#009E73','#F0E442','#0072B2','#D55E00','#CC79A7','#FFFFFF','#88CCEE','#AA4499','#999933'];
const CB_SRC = {academic:'#E69F00', industry:'#56B4E9', government:'#CC79A7'};
function applyPalette(){
  const cb = view.palette === 'cb'; window.__pal = view.palette || 'standard';
  FKEYS.filter(k => !FIELDS[k].custom).forEach((k, i) => { FIELDS[k].hex = cb ? CB_FIELDS[i % CB_FIELDS.length] : ORIG_FIELD_HEX[k]; FIELDS[k].col = new THREE.Color(FIELDS[k].hex); });
  Object.keys(SRC).forEach(k => { SRC[k].hex = cb ? CB_SRC[k] : ORIG_SRC_HEX[k]; SRC[k].col = new THREE.Color(SRC[k].hex); });
  rebuildLanes();
  document.querySelectorAll('#srcChips .chipbtn').forEach(b => { b.style.color = SRC[b.dataset.k].hex; });
  buildFieldList(); applyColours();
  items.forEach(it => { if (it.labelEl && FIELDS[it.v]) it.labelEl.style.color = itemHex(it); });
  refresh();
}
function rebuildLanes(){
  [laneSets.s, laneSets.v].forEach(g => g.children.slice().forEach(sub => { if (sub.userData.laneKey == null) return; g.remove(sub); sub.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) { if (c.material.map) c.material.map.dispose(); c.material.dispose(); } }); }));
  Object.keys(SRC).forEach(k => {
    const sub = addLane(laneSets.s, k, LANEZ.s[k] || SRC[k].z, SRC[k].col.getHex(), SRC[k].hex, SRC[k].name);
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(xOf(Y1) - xOf(Y0), 3.2), new THREE.MeshBasicMaterial({color:SRC[k].col, transparent:true, opacity:0.035, depthWrite:false, side:THREE.DoubleSide}));
    strip.rotation.x = -Math.PI / 2; strip.position.set(0, 0.01, 0); sub.add(strip);
  });
  FKEYS.forEach(k => addLane(laneSets.v, k, LANEZ.v[k] != null ? LANEZ.v[k] : FIELDS[k].z, FIELDS[k].col.getHex(), FIELDS[k].hex, FIELDS[k].name));
  [laneSets.s, laneSets.v, laneSets.sub].forEach(g => g.traverse(c => { if (c.userData.floorLabel) c.visible = view.floor; }));
  ensureSubLanes(true);
}
$('paletteS').addEventListener('change', e => { view.palette = e.target.value; applyPalette(); });

