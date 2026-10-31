/* ==================================================================
 *  MY FILE AND MY VIEWS
 *  My file: everything about your session plus a personal section (My views, review marks, My list, pending admin
 *  decisions, kiosk options, pins), saved to a file you keep. My views: named arrangements, each with its own panels,
 *  positions, chart tab, filters and display settings. A status sign shows what is unsaved; autosave keeps a connected
 *  file updated (Chrome and Edge on a computer) or, elsewhere, a copy in this browser.
 * ================================================================== */
var MY = Object.assign({views:[], start:null}, store.get('sg.my', {}));   // var: the Views menu is first drawn before this file runs
var MYSAVE = {dirty:false, savedAt:null, handle:null, handleName:'', browserOnly:false, t:0};
const PERSONAL_VIEW_KEYS = ['pins', 'autosave', 'admin'];   // settings that belong to the person, not to a view
function personalSnapshot(){
  return {myViews:JSON.parse(JSON.stringify(MY.views)), startView:MY.start, kiosk:Object.assign({}, kiosk.opts), pins:(view.pins || []).slice(),
    inspector:{mine:[...INS.mine], decisions:Object.assign({}, INS.decisions), extra:Object.assign({}, INS.extra || {}), reviewed:Object.assign({}, INS.reviewed || {})}};
}
function myFileObject(){ return Object.assign(snapshot('my file'), {kind:'my-file', personal:personalSnapshot()}); }
function viewOnlySnapshot(name){ const s = snapshot(name); s.view = Object.assign({}, s.view); PERSONAL_VIEW_KEYS.forEach(k => delete s.view[k]); delete s.audience; return s; }
function applyPersonal(p){
  if (!p) return;
  if (Array.isArray(p.myViews)) MY.views = p.myViews; if ('startView' in p) MY.start = p.startView;
  if (p.kiosk) Object.assign(kiosk.opts, p.kiosk); if (Array.isArray(p.pins)) view.pins = p.pins;
  if (p.inspector) { INS.mine = new Set(p.inspector.mine || []); INS.decisions = p.inspector.decisions || {}; INS.extra = p.inspector.extra || {}; INS.reviewed = p.inspector.reviewed || {}; }
  store.set('sg.my', MY); store.set('sg.view.v2', view); buildWinMenu(); if (typeof renderChips === 'function') renderChips(true); if (layout.inspect && layout.inspect.open) renderInspector();
}
/* opening a file: a full My file restores everything; an older saved view (or an exported My view) also joins My views */
function openMyFileObject(o){
  if (!o || o.app !== 'the-shrinking-gap') { alert('That file is not a file from this app.'); return; }
  const keep = view.pins; applyView(o);
  if (o.kind === 'my-file') { applyPersonal(o.personal); markSaved('opened'); if (MY.start) { const i = MY.views.findIndex(v => v.name === MY.start); if (i >= 0) setTimeout(() => handleMyView(i, 'apply'), 300); } toast('Your file is open: your views, reviews and settings are restored.'); return; }
  view.pins = keep;
  const name = (o.name && o.name !== 'my file' ? o.name : 'Opened view').slice(0, 60), snap = Object.assign({}, o); delete snap.personal;
  MY.views = MY.views.filter(v => v.name !== name).concat([{name, saved:new Date().toISOString(), snap}]); store.set('sg.my', MY); buildWinMenu(); markDirty();
  toast(`Opened “${name}”, and added it to My views.`);
}
/* the status sign: only things you would regret losing count as unsaved */
function markDirty(){ MYSAVE.dirty = true; renderSaveSign(); if (view.autosave) { clearTimeout(MYSAVE.t); MYSAVE.t = setTimeout(autosave, 1500); } }
function markSaved(how){ MYSAVE.dirty = false; MYSAVE.savedAt = new Date(); MYSAVE.browserOnly = how === 'browser'; renderSaveSign(); }
function renderSaveSign(){
  const el = $('saveSign'), t = MYSAVE.savedAt ? MYSAVE.savedAt.toLocaleTimeString(view.dateFmt === 'us' ? 'en-US' : 'en-GB', {hour:'2-digit', minute:'2-digit'}) : '';
  let cls = '', txt = '', tip = '';
  if (MYSAVE.handle && view.autosave) { cls = 'ok'; txt = MYSAVE.dirty ? '⟳ Autosaving…' : `⟳ Autosaved ${t}`; tip = `Changes are saved to ${MYSAVE.handleName} automatically.`; }
  else if (MYSAVE.dirty) { cls = 'warn'; txt = '● Unsaved'; tip = 'Your review marks, list or views have changed since you last saved your file. Select to save.'; }
  else if (MYSAVE.browserOnly) { cls = 'warn'; txt = 'Saved in this browser only'; tip = 'Autosave keeps a copy in this browser. Select to save your file as well, so it is safe on any device.'; }
  else if (MYSAVE.savedAt) { cls = 'ok'; txt = `✓ Saved ${t}`; tip = 'Everything is in your file.'; }
  const pending = view.admin ? Object.keys(INS.decisions || {}).filter(k => INS.decisions[k] !== 'keep').length : 0;
  el.className = 'savesign ' + cls; el.hidden = !txt && !pending; el.title = tip;
  el.innerHTML = (txt ? `<span>${txt}</span>` : '') + (pending ? `<b class="admpend" title="Admin decisions not yet downloaded for GitHub">${pending} admin</b>` : '');
}
async function autosave(){
  if (!view.autosave || !MYSAVE.dirty) return;
  const json = JSON.stringify(myFileObject(), null, 1);
  if (MYSAVE.handle) { try { const w = await MYSAVE.handle.createWritable(); await w.write(json); await w.close(); markSaved('file'); return; } catch (e) { MYSAVE.handle = null; toast('Autosave lost access to your file; saving in this browser instead.'); } }
  try { localStorage.setItem('sg.myfile', json); markSaved('browser'); } catch (e) { renderSaveSign(); }
}
function saveMyFile(){
  const name = (prompt('Name your file:', 'my-shrinking-gap') || '').trim(); if (!name) return;
  saveBlob(new Blob([JSON.stringify(myFileObject(), null, 1)], {type:'application/json'}), name.replace(/[^\w\-]+/g, '-').toLowerCase() + '.json');
  markSaved('file'); toast('Your file is saved. Open it again from Views → Open my file.');
}
/* autosave to a connected file (Chrome and Edge on a computer): the handle is kept in this browser, so after a reload one click reconnects */
const IDB = {db:null, open(){ return new Promise(res => { try { const r = indexedDB.open('shrinking-gap', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch (e) { res(null); } }); },
  async put(k, v){ const d = await this.open(); if (!d) return; d.transaction('kv', 'readwrite').objectStore('kv').put(v, k); },
  async get(k){ const d = await this.open(); if (!d) return null; return new Promise(res => { const q = d.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); }};
const canConnect = () => typeof window.showSaveFilePicker === 'function' && window.isSecureContext;
async function connectMyFile(){
  if (!canConnect()) { toast('Keeping a file updated needs Chrome or Edge on a computer. Autosave will keep a copy in this browser instead.'); return; }
  try {
    const h = await window.showSaveFilePicker({suggestedName:'my-shrinking-gap.json', types:[{description:'Shrinking Gap file', accept:{'application/json':['.json']}}]});
    MYSAVE.handle = h; MYSAVE.handleName = h.name; await IDB.put('myFileHandle', h); MYSAVE.dirty = true; view.autosave = true; store.set('sg.view.v2', view); syncAutosaveUI(); await autosave();
  } catch (e) { /* the person cancelled the picker */ }
}
async function reconnectMyFile(){ const h = await IDB.get('myFileHandle'); if (!h) return false; try { if ((await h.requestPermission({mode:'readwrite'})) === 'granted') { MYSAVE.handle = h; MYSAVE.handleName = h.name; renderSaveSign(); return true; } } catch (e) {} return false; }
function syncAutosaveUI(){ $('autosaveS').value = view.autosave ? (MYSAVE.handle ? 'file' : 'on') : 'off'; $('autosaveNote').textContent = view.autosave ? (MYSAVE.handle ? `Keeping ${MYSAVE.handleName} updated.` : canConnect() ? 'Saving a copy in this browser. Choose “Keep a file updated” to save to a file instead.' : 'Saving a copy in this browser (this browser cannot keep a file updated).') : ''; }
$('autosaveS').onchange = async e => { const v = e.target.value; if (v === 'file') { await connectMyFile(); } else { view.autosave = v === 'on'; if (v === 'off') { MYSAVE.handle = null; try { localStorage.removeItem('sg.myfile'); } catch (e) {} } store.set('sg.view.v2', view); if (view.autosave) { MYSAVE.dirty = true; autosave(); } } syncAutosaveUI(); renderSaveSign(); };
$('saveSign').onclick = async () => { if (view.autosave && !MYSAVE.handle && (await IDB.get('myFileHandle')) && await reconnectMyFile()) { MYSAVE.dirty = true; autosave(); return; } saveMyFile(); };
/* restore what autosave kept in this browser */
(() => { try { const o = JSON.parse(localStorage.getItem('sg.myfile') || 'null'); if (o && o.personal && o.view && o.view.autosave) { view.autosave = true; applyPersonal(o.personal); MYSAVE.savedAt = new Date(o.saved || Date.now()); MYSAVE.browserOnly = true; } } catch (e) {} IDB.get('myFileHandle').then(h => { if (h) { MYSAVE.handleName = h.name; $('saveSign').hidden = false; $('saveSign').className = 'savesign warn'; $('saveSign').innerHTML = `<span>Reconnect ${esc(h.name)}</span>`; $('saveSign').title = 'Select to keep your file updated again (the browser asks once per visit).'; } }); syncAutosaveUI(); renderSaveSign(); })();
/* ---------- My views ---------- */
function myViewsMenuHtml(){
  if (!MY) return '';   // not ready yet during start-up
  const rows = MY.views.map((v, i) => `<div class="mvrow"><button data-mv="${i}" data-mvact="apply" class="${view.myView === v.name ? 'cur' : ''}" title="Open this view">${esc(v.name)}${MY.start === v.name ? ' <span class="mvstart">at start</span>' : ''}</button>
    <button class="mvi" data-mv="${i}" data-mvact="update" title="Update it to what is on screen now">↻</button><button class="mvi" data-mv="${i}" data-mvact="rename" title="Rename">✎</button>
    <button class="mvi" data-mv="${i}" data-mvact="start" title="${MY.start === v.name ? 'Stop opening it at start' : 'Open it at start'}">${MY.start === v.name ? '★' : '☆'}</button>
    <button class="mvi" data-mv="${i}" data-mvact="export" title="Export it as its own file, to share">⤓</button><button class="mvi" data-mv="${i}" data-mvact="delete" title="Delete">✕</button></div>`).join('');
  return `<div class="wmh">My views</div>${rows || '<small>Save how things are arranged now, filters included, and open it again in one click.</small>'}<button data-mv="new" data-mvact="new">＋ Save this view as…</button>`;
}
function handleMyView(i, act){
  if (act === 'new') { const name = (prompt('Name this view, for example “Board briefing” or “Conference screen”:') || '').trim().slice(0, 60); if (!name) return;
    MY.views = MY.views.filter(v => v.name !== name).concat([{name, saved:new Date().toISOString(), snap:viewOnlySnapshot(name)}]); view.myView = name; toast(`Saved “${name}” to My views.`); }
  else { const v = MY.views[+i]; if (!v) return;
    if (act === 'apply') { const pins = view.pins, auto = view.autosave, admin = view.admin; applyView(v.snap); Object.assign(view, {pins, autosave:auto, admin, myView:v.name}); store.set('sg.view.v2', view); winMenu.classList.remove('open'); buildWinMenu(); renderChips(true); return; }
    if (act === 'update') { v.snap = viewOnlySnapshot(v.name); v.saved = new Date().toISOString(); toast(`Updated “${v.name}”.`); }
    if (act === 'rename') { const n = (prompt('Rename this view:', v.name) || '').trim().slice(0, 60); if (!n || n === v.name) return; if (MY.start === v.name) MY.start = n; v.name = n; v.snap.name = n; }
    if (act === 'start') MY.start = MY.start === v.name ? null : v.name;
    if (act === 'export') { saveBlob(new Blob([JSON.stringify(Object.assign({}, v.snap, {kind:'view', name:v.name}), null, 1)], {type:'application/json'}), v.name.replace(/[^\w\-]+/g, '-').toLowerCase() + '.json'); return; }
    if (act === 'delete') { if (!confirm(`Delete “${v.name}” from My views?`)) return; MY.views.splice(+i, 1); if (MY.start === v.name) MY.start = null; } }
  store.set('sg.my', MY); markDirty(); buildWinMenu();
}
/* your start view: applied when you enter the tool from the welcome screen (instead of Exploring), or once start-up has
   finished when the welcome screen is skipped; never when the address asks for a particular view */
function applyStartView(){
  if (!MY || !MY.start || new URLSearchParams(location.search).get('view')) return false;
  const i = MY.views.findIndex(v => v.name === MY.start); if (i < 0) return false;
  handleMyView(i, 'apply'); return true;
}
if (new URLSearchParams(location.search).get('welcome') === '0') setTimeout(applyStartView, 2500);

buildWinMenu();   // now that My views is ready
$('winBtn').addEventListener('click', () => { if (winMenu.classList.contains('open')) buildWinMenu(); });   // always current when opened

/* never lose the last change: when the page is closed, reloaded or hidden, autosave writes at once rather than after its delay */
function flushAutosave(){
  if (!view.autosave || !MYSAVE.dirty) return;
  clearTimeout(MYSAVE.t); const json = JSON.stringify(myFileObject(), null, 1);
  try { localStorage.setItem('sg.myfile', json); } catch (e) {}   // instant, so it completes even as the page closes
  if (MYSAVE.handle) MYSAVE.handle.createWritable().then(w => w.write(json).then(() => w.close())).catch(() => {});   // and the connected file, if the browser allows
  MYSAVE.dirty = false;
}
addEventListener('pagehide', flushAutosave);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushAutosave(); });

/* admin tools: a switch in Display, kept in your file (not a security feature: only someone who can upload to the
   repository can apply the system file) */
function syncAdminUI(){ $('adminS').value = view.admin ? 'on' : 'off'; document.body.classList.toggle('admin', !!view.admin); renderSaveSign(); if (layout.inspect && layout.inspect.open) renderInspector(); }
$('adminS').onchange = e => { view.admin = e.target.value === 'on'; markDirty(); syncAdminUI(); };
syncAdminUI();
