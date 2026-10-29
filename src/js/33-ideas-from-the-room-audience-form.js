/* ==================================================================
 *  IDEAS FROM THE ROOM (audience form)
 * ================================================================== */
const IDEA_ICONS = {
  bulb:{name:'💡 Lightbulb', e:'💡'}, custom:{name:'Your own image…', img:''},
  cap:{name:'🎓 Graduation cap', e:'🎓'}, bolt:{name:'⚡ Lightning', e:'⚡'}, rocket:{name:'🚀 Rocket', e:'🚀'}, lab:{name:'🔬 Microscope', e:'🔬'},
  robot:{name:'🤖 Robot', e:'🤖'}, brain:{name:'🧠 Brain', e:'🧠'}, lock:{name:'🔒 Padlock', e:'🔒'}, leaf:{name:'🌱 Seedling', e:'🌱'},
  globe:{name:'🌍 Globe', e:'🌍'}, star:{name:'⭐ Star', e:'⭐'}, trophy:{name:'🏆 Trophy', e:'🏆'}
};
let customIcon = '';  // data URI of an uploaded image (kept in your ideas file and views)
function iconHtml(key, img){ if (key === 'custom') { const src = img || customIcon; return src ? `<img class="lblicon wide" src="${src}" alt="">` : '<span class="lblemo">🖼️</span>'; } const ic = IDEA_ICONS[key] || IDEA_ICONS.bulb; return ic.img ? `<img class="lblicon${key === 'uog' ? ' wide' : ''}" src="${ic.img}" alt="">` : `<span class="lblemo">${ic.e}</span>`; }
const AUD_COL = new THREE.Color(0xFF5FD7), AUD_HEX = '#FF5FD7';
const EXTRA_COLS = ['#FF9F43','#2ED3B7','#A3E635','#F472B6','#60A5FA','#FACC15','#C084FC','#34D399'];
const AUD = [];   // {t, field (name), s, r, p, who, id}
function buildFieldList(){
  fieldList.innerHTML = FKEYS.map(k => `<div class="frow" data-f="${k}" style="color:${FIELDS[k].hex}" role="checkbox" tabindex="0"><span class="sw"></span><span class="nm">${FIELDS[k].name}</span><span class="ct"></span><button class="only" data-only="${k}" title="Show only this field">Only</button></div>`).join('');
}
function ensureField(name){
  const clean = String(name).trim().slice(0, 30); if (!clean) return null;
  const existing = FKEYS.find(k => FIELDS[k].name.toLowerCase() === clean.toLowerCase()); if (existing) return existing;
  const key = 'x_' + clean.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const hex = EXTRA_COLS[(FKEYS.length - 11) % EXTRA_COLS.length];
  FIELDS[key] = {name:clean, hex, col:new THREE.Color(hex), z:0, custom:true};
  FKEYS.push(key);
  const sub = addLane(laneSets.v, key, 0, FIELDS[key].col.getHex(), hex, clean);
  sub.traverse(c => { if (c.userData.floorLabel) c.visible = view.floor; });
  F.fields.add(key);
  buildFieldList(); fillAudFields();
  return key;
}
function makeLabel(it){
  const el = document.createElement('div'); el.className = 'lbl';
  el.innerHTML = `${it.uni ? '<span class="uni">🎓</span>' : ''}${it.aud ? iconHtml(it.icon, it.iconImg) + ' ' : ''}<b>${esc(it.t)}</b>`; el.style.color = itemHex(it);
  labelLayer.appendChild(el); it.labelEl = el; el._it = it;
}
function fillAudFields(){
  const cur = $('audField').value;
  $('audField').innerHTML = FKEYS.map(k => `<option value="${k}">${FIELDS[k].name}</option>`).join('') + '<option value="__new">New field…</option>';
  if (cur && (FKEYS.includes(cur) || cur === '__new')) $('audField').value = cur; else $('audField').value = 'energy';
  $('audNewWrap').style.display = $('audField').value === '__new' ? '' : 'none';
}
(function(){
  let r = ''; for (let y = YEND; y >= 1990; y--) r += `<option${y === NOW ? ' selected' : ''}>${y}</option>`; $('audR').innerHTML = r;
  let p = ''; for (let y = 1990; y <= YEND; y++) p += `<option${y === NOW + 4 ? ' selected' : ''}>${y}</option>`; $('audP').innerHTML = p;
  fillAudFields();
})();
$('audIcon').innerHTML = Object.entries(IDEA_ICONS).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('');
$('audIcon').value = 'bulb';
const syncIconPrev = () => { $('audIconPrev').innerHTML = iconHtml($('audIcon').value); };
$('audIcon').addEventListener('change', () => { if ($('audIcon').value === 'custom' && !customIcon) $('audIconFile').click(); syncIconPrev(); }); syncIconPrev();
$('audIconFile').addEventListener('change', e => {
  const f = e.target.files && e.target.files[0]; if (!f) return;
  const img = new Image(), rd = new FileReader();
  rd.onload = () => { img.onload = () => { const h = 72, w = Math.min(320, Math.round(img.width * h / img.height)), c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h); customIcon = c.toDataURL('image/png'); $('audIcon').value = 'custom'; syncIconPrev(); }; img.src = rd.result; };
  rd.readAsDataURL(f); e.target.value = '';
});
$('audField').addEventListener('change', () => { $('audNewWrap').style.display = $('audField').value === '__new' ? '' : 'none'; if ($('audField').value === '__new') $('audNew').focus(); });
$('audR').addEventListener('change', () => { if (+$('audP').value < +$('audR').value) $('audP').value = $('audR').value; });
['audName','audNew','audWho','audSource','audUrl'].forEach(id => $(id).addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') $('audAdd').click(); }));
function esc(t){ return String(t == null ? '' : t).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }   // a declaration, so it is available from the start
const safeUrl = u => /^https?:\/\//i.test(String(u || '').trim()) ? String(u).trim() : '';
$('audDesc').addEventListener('keydown', e => e.stopPropagation());
function addAudienceIdea(o, quiet){
  let key = o.fieldKey;
  if (!key && o.field) key = ensureField(o.field);
  if (!key || !FIELDS[key]) return null;
  const r = +o.r, p = Math.max(+o.p, +o.r);
  const d = {v:key, s:o.s || 'academic', kind:p > NOW ? 'proj' : 'hist', t:o.t, r, p, c:'medium', aud:true, who:o.who || '',
    rw:o.who ? `Added by ${esc(o.who)}.` : 'Added by hand.', pw:p > NOW ? `Expected to reach change around ${p}.` : `Reached change in ${p}.`,
    note:o.desc ? esc(o.desc) : 'Added by hand.', desc:o.desc || '', srcLabel:o.source || '', srcUrl:safeUrl(o.url), icon:IDEA_ICONS[o.icon] ? o.icon : 'bulb', iconImg:o.icon === 'custom' ? (o.iconImg || customIcon) : ''};
  d.t = esc(o.t);
  const it = buildItem(d, items.length); items.push(it); makeLabel(it);
  F.fields.add(key);
  applyColours(); refresh(); applyLanes(true);
  setTimeout(() => { if (layout.fortunes.open) renderFortunes(); }, 0);
  const rec = {t:o.t, field:FIELDS[key].name, s:d.s, r, p, who:d.who, desc:o.desc || '', source:o.source || '', url:safeUrl(o.url), icon:d.icon, iconImg:d.iconImg, id:it.id}; AUD.push(rec); renderAudList();
  if (!quiet) {
    showSpot(o.t, `${FIELDS[key].name}: research ${r}, change ${p > NOW ? 'expected ' : ''}${p}${d.who ? ', from ' + d.who : ''}`, d.icon, d.iconImg);
    focusGoal = it.peak.clone().setZ(laneZ(it)).multiply(new THREE.Vector3(1, .5, 1));
  }
  return it;
}
function retireItem(it){
  it.removed = true; it.target = 0; hideLabel(it.labelEl);
  scene.remove(it.group);
  for (let i = hitMeshes.length - 1; i >= 0; i--) if (hitMeshes[i].userData.it === it) hitMeshes.splice(i, 1);
  if (selected === it) closeDetail();
}
function removeFieldIfUnused(key){
  if (!key || !FIELDS[key] || !FIELDS[key].custom) return;
  if (items.some(it => !it.removed && it.v === key)) return;
  const sub = laneSets.v.children.find(c => c.userData.laneKey === key);
  if (sub) { laneSets.v.remove(sub); sub.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) { if (c.material.map) c.material.map.dispose(); c.material.dispose(); } }); }
  const i = FKEYS.indexOf(key); if (i >= 0) FKEYS.splice(i, 1);
  F.fields.delete(key); delete FIELDS[key]; delete LANEZ.v[key];
  buildFieldList(); fillAudFields();
}
function removeAudienceIdea(id){
  const it = items[id]; if (!it || it.removed) return;
  const key = it.v;
  retireItem(it);
  const i = AUD.findIndex(a => a.id === id); if (i >= 0) AUD.splice(i, 1);
  removeFieldIfUnused(key);
  refresh(); renderAudList(); if (layout.fortunes.open) renderFortunes();
}
function clearAudience(){
  const keys = new Set();
  AUD.slice().forEach(a => { const it = items[a.id]; if (it && !it.removed) { keys.add(it.v); retireItem(it); } });
  AUD.length = 0;
  keys.forEach(removeFieldIfUnused);
  FKEYS.filter(k => FIELDS[k] && FIELDS[k].custom).forEach(removeFieldIfUnused);
  refresh(); renderAudList();
}
function renderAudList(){
  $('audList').innerHTML = AUD.length ? AUD.map(a => `<div class="audrow"><i class="audic">${iconHtml(a.icon, a.iconImg)}</i><span><a href="#" data-open="${a.id}">${esc(a.t)}</a><em>${esc(a.field)}, ${a.r} to ${a.p}${a.who ? ', ' + esc(a.who) : ''}${a.desc || a.source ? ', with details' : ''}</em></span><button data-rm="${a.id}" title="Delete this milestone${FIELDS[items[a.id].v] && FIELDS[items[a.id].v].custom ? ' and its new field track if nothing else uses it' : ''}">✕</button></div>`).join('') : '<p class="empty">Milestones you add appear here and as bright arcs in the model.</p>';
}
$('audList').addEventListener('click', e => { const b = e.target.closest('button[data-rm]'); if (b) { removeAudienceIdea(+b.dataset.rm); return; } const o = e.target.closest('a[data-open]'); if (o) { e.preventDefault(); openDetail(items[+o.dataset.open]); } });
$('audAdd').onclick = () => {
  const t = $('audName').value.trim();
  if (!t) { $('audMsg').textContent = 'Give the milestone a short name first.'; $('audName').focus(); return; }
  let o = {t, icon:$('audIcon').value, iconImg:$('audIcon').value === 'custom' ? customIcon : '', s:$('audSrc').value, r:+$('audR').value, p:+$('audP').value, who:$('audWho').value.trim(), desc:$('audDesc').value.trim(), source:$('audSource').value.trim(), url:$('audUrl').value.trim()};
  if (o.url && !safeUrl(o.url)) { $('audMsg').textContent = 'Links must start with http:// or https://.'; $('audUrl').focus(); return; }
  if ($('audField').value === '__new') { const n = $('audNew').value.trim(); if (!n) { $('audMsg').textContent = 'Type a name for the new field.'; $('audNew').focus(); return; } o.field = n; }
  else o.fieldKey = $('audField').value;
  const it = addAudienceIdea(o);
  if (it) { $('audMsg').textContent = `Added “${t}”.`; $('audName').value = ''; $('audWho').value = ''; $('audNew').value = ''; $('audDesc').value = ''; $('audSource').value = ''; $('audUrl').value = ''; document.querySelector('.afmore').open = false; fillAudFields(); $('audField').value = it.v; $('audNewWrap').style.display = 'none'; }
};
function audSnapshot(){ return AUD.map(a => ({t:a.t, field:a.field, s:a.s, r:a.r, p:a.p, who:a.who, desc:a.desc, source:a.source, url:a.url, icon:a.icon, iconImg:a.iconImg})); }
function loadAudience(list){ clearAudience(); (list || []).forEach(a => addAudienceIdea({t:a.t, field:a.field, s:a.s, r:a.r, p:a.p, who:a.who, desc:a.desc, source:a.source, url:a.url, icon:a.icon, iconImg:a.iconImg}, true)); }
$('audSave').onclick = () => {
  const name = (prompt('Name this set of milestones:', 'my-milestones') || '').trim(); if (!name) return;
  const blob = new Blob([JSON.stringify({app:'the-shrinking-gap-ideas', version:1, saved:new Date().toISOString(), ideas:audSnapshot()}, null, 2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name.replace(/[^\w\-]+/g, '-').toLowerCase() + '.json';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
};
$('audLoad').addEventListener('change', e => {
  const f = e.target.files && e.target.files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = () => { try { const o = JSON.parse(rd.result); loadAudience(o.ideas || o.audience || []); $('audMsg').textContent = `Loaded ${AUD.length} milestones.`; } catch (err) { $('audMsg').textContent = 'Could not read that file.'; } e.target.value = ''; };
  rd.readAsText(f);
});
$('audClear').onclick = () => { if (!AUD.length || confirm('Remove all of your milestones?')) clearAudience(); };
$('audSpotT').addEventListener('change', e => { view.audSpot = e.target.checked; applyColours(); });
$('audPauseT').addEventListener('change', e => { view.audPause = e.target.checked; });
let spotTimer = 0;
let showSpotImg = '';
function showSpot(title, sub, icon, img){
  if (view.audSpot === false) return;
  $('spotT').innerHTML = (icon ? iconHtml(icon, img || showSpotImg) + ' ' : '') + esc(title); showSpotImg = ''; $('spotS').textContent = sub || '';
  $('spot').classList.add('on'); clearTimeout(spotTimer); spotTimer = setTimeout(() => $('spot').classList.remove('on'), 3800);
}
let lastAudCur = null, audPauseTimer = 0;
function audPlayCheck(){
  if (!state.playing) { lastAudCur = null; return; }
  const cur = state.cursor;
  if (lastAudCur != null && cur > lastAudCur && cur - lastAudCur < 3) {
    for (const a of AUD) {
      const it = items[a.id]; if (!it || it.removed || !shownFully(it)) continue;
      let msg = null;
      if (lastAudCur < it.r && cur >= it.r) msg = [it.t, `Research begins, ${it.r}${a.who ? ', ' + a.who : ''}`];
      else if (lastAudCur < it.p && cur >= it.p) msg = [`${it.t} lands`, `${FIELDS[it.v].name}: ${lagTxt(it.lag)} from research to change`];
      if (msg) {
        showSpotImg = it.iconImg; showSpot(msg[0].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'"), msg[1], it.icon);
        if (view.audPause !== false && !paused) { paused = true; syncPause(); clearTimeout(audPauseTimer); audPauseTimer = setTimeout(() => { if (state.playing && paused && state.cursor < playEnd()) { paused = false; syncPause(); } }, 3500); }
        break;
      }
    }
  }
  lastAudCur = cur;
}
renderAudList();

