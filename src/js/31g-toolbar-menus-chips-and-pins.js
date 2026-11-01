/* ==================================================================
 *  TOOLBAR: Present and Share menus, status chips (shown while something is on) and pinned items.
 *  The Present menu holds the original Full screen, Auto-rotate, Music, 💬 and ✚ Add buttons, unchanged.
 * ================================================================== */
const DROPS = {presentBtn:'presentMenu', shareBtn:'shareMenu'};
function closeDrops(except){ Object.entries(DROPS).forEach(([b, m]) => { if (m !== except) { $(m).classList.remove('open'); $(b).setAttribute('aria-expanded', false); } }); if (except !== 'winMenu') { winMenu.classList.remove('open'); $('winBtn').setAttribute('aria-expanded', false); } }
function placeDrop(btn, menu){
  const r = $(btn).getBoundingClientRect(), m = $(menu), below = innerHeight - r.bottom, above = r.top;
  m.style.right = Math.max(8, innerWidth - r.right) + 'px'; m.style.left = 'auto';
  if (below >= 260 || below >= above) { m.style.top = (r.bottom + 8) + 'px'; m.style.bottom = 'auto'; m.style.maxHeight = (below - 24) + 'px'; }
  else { m.style.bottom = (innerHeight - r.top + 8) + 'px'; m.style.top = 'auto'; m.style.maxHeight = (above - 24) + 'px'; }
}
Object.entries(DROPS).forEach(([b, m]) => {
  $(b).onclick = e => { e.stopPropagation(); const open = !$(m).classList.contains('open'); closeDrops(); if (open) { syncPresentTicks(); placeDrop(b, m); $(m).classList.add('open'); $(b).setAttribute('aria-expanded', true); } };
  $(m).addEventListener('click', e => e.stopPropagation());
});
$('winBtn').addEventListener('click', () => closeDrops('winMenu'));
document.addEventListener('click', e => { if (!e.target.closest('.dropmenu') && !Object.keys(DROPS).includes(e.target.id)) Object.entries(DROPS).forEach(([b, m]) => { $(m).classList.remove('open'); $(b).setAttribute('aria-expanded', false); }); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') Object.values(DROPS).forEach(m => $(m).classList.remove('open')); });
/* the actions behind the menus, chips and pins */
const PRESENT = {
  fullscreen:{label:'Full screen', icon:'⤢', run:() => $('fsBtn').click(), on:() => !!document.fullscreenElement, chipOn:'Exit full screen'},
  rotate:{label:'Auto-rotate', icon:'⟳', run:() => $('rotBtn').click(), on:() => !!state.autoRotate, chipOn:'Rotating · stop'},
  music:{label:'Music', icon:'♪', run:() => $('musicBtn').click(), on:() => $('musicBtn').getAttribute('aria-pressed') === 'true', chipOn:'Music · stop'},
  mutespeech:{label:'Mute speech', icon:'🔇', run:() => setSpeechMuted(!view.muteSpeech), on:() => !!view.muteSpeech, chipOn:'Speech muted'},
  ticker:{label:'Joke ticker', icon:'≋', run:() => setOpen('ticker', !layout.ticker.open), on:() => !!(layout.ticker && layout.ticker.open), chipOn:'Ticker · hide'},
  title:{label:'Showcase title', icon:'T', run:() => setOpen('title', !layout.title.open), on:() => !!(layout.title && layout.title.open)},
  thanks:{label:'Thank you and questions', icon:'💬', run:() => $('thanksBtn').click()},
  add:{label:'Add an idea', icon:'✚', run:() => $('ideasBtn').click(), on:() => !!(layout.audience && layout.audience.open)},
  kiosk:{label:'Kiosk mode', icon:'▣', run:() => { closeDrops(); showWelcome(); $('wKioskOpts').classList.add('on'); clearTimeout(welcomeTimer); $('wAuto').textContent = ''; }}
};
function setSpeechMuted(on){ view.muteSpeech = !!on; if (on) stopInsight(); tour.muted = !!on; if (typeof syncMute === 'function') syncMute(); toast(on ? 'Speech muted: insights and walk-throughs stay silent, with subtitles.' : 'Speech is back on.'); renderChips(true); }   // insights and tour narration together
function syncPresentTicks(){ $('pmMute').textContent = view.muteSpeech ? '✓' : ''; $('pmTick').classList.toggle('on', PRESENT.ticker.on()); $('pmTick').textContent = PRESENT.ticker.on() ? '✓' : ''; $('pmTitle').classList.toggle('on', PRESENT.title.on()); $('pmTitle').textContent = PRESENT.title.on() ? '✓' : '';
  document.querySelectorAll('#presentMenu .pin').forEach(p => p.classList.toggle('on', (view.pins || []).includes(p.dataset.pin))); }
$('presentMenu').addEventListener('click', e => {
  const pin = e.target.closest('.pin');
  if (pin) { const k = pin.dataset.pin, pins = new Set(view.pins || []); pins.has(k) ? pins.delete(k) : pins.add(k); view.pins = [...pins]; store.set('sg.view.v2', view); syncPresentTicks(); renderChips(true); return; }
  const a = e.target.closest('[data-act]'); if (a && PRESENT[a.dataset.act]) { PRESENT[a.dataset.act].run(); setTimeout(syncPresentTicks, 50); renderChips(true); }
  if (e.target.closest('#fsBtn, #rotBtn, #musicBtn')) setTimeout(() => { syncPresentTicks(); renderChips(true); }, 60);
  if (e.target.closest('#thanksBtn, #ideasBtn, [data-act="kiosk"]')) closeDrops();
});
const SHARE = {system:() => { setOpen('inspect', true); setTimeout(() => { const d = $('insCurDl'); if (d && !d.disabled) d.click(); else toast('There are no admin decisions yet: make them in the Data inspector.'); }, 600); }, report:() => setOpen('report', true), briefing:() => generateDesnzSlide(), img:() => setTimeout(exportImage, 150), link:() => copyLink(), csv:() => exportCsv(), xlsx:() => exportXlsx()};
$('shareMenu').addEventListener('click', e => { const a = e.target.closest('[data-act]'); if (!a || !SHARE[a.dataset.act]) return; closeDrops(); SHARE[a.dataset.act](); });
/* status chips: shown only while something is on; pinned items always show */
let rotOffAt = 0, lastChips = '';
function renderChips(force){
  const pins = view.pins || [], out = [];
  Object.entries(PRESENT).forEach(([k, p]) => {
    const pinned = pins.includes(k), on = p.on ? p.on() : false;
    if (pinned) out.push(`<button class="tbchip pinned${on ? ' on' : ''}" data-chip="${k}" title="${p.label}${on ? ' (on)' : ''}" aria-pressed="${on}"><i>${p.icon}</i><span>${p.label}</span></button>`);
    else if (on && p.chipOn) out.push(`<button class="tbchip on" data-chip="${k}" title="${p.chipOn}"><i>${p.icon}</i><span>${p.chipOn}</span></button>`);
    else if (k === 'rotate' && Date.now() - rotOffAt < 5000) out.push(`<button class="tbchip" data-chip="rotate" title="Start rotating again"><i>▷</i><span>Rotate</span></button>`);
  });
  const h = out.join(''); if (h !== lastChips || force) { $('tbChips').innerHTML = h; lastChips = h; fitToolbar(); }
}
/* the toolbar stays on one line: when chips or pins appear it grows leftwards, keeping its right edge (and shrinks back) */
function fitToolbar(){
  const L = layout.toolbar, el = wins.toolbar, row = el && el.querySelector('.actions'); if (!L || !L.open || !row || el.classList.contains('max')) return;
  if (innerWidth < 560) { const w = innerWidth - 16; if (Math.abs(winRect(L).w - w) >= 4 || winRect(L).x !== 8) { Object.assign(L, {x:8, w, sw:innerWidth, sh:innerHeight}); placeWin('toolbar'); } return; }   // narrow screens: full width, two rows
  const r = winRect(L), right = r.x + r.w, cs = getComputedStyle(el), pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
  const kids = [...row.children].filter(c => !c.hidden && getComputedStyle(c).display !== 'none'), rs = getComputedStyle(row), gap = parseFloat(rs.columnGap) || 0;
  const need = Math.ceil(kids.reduce((t, c) => t + c.getBoundingClientRect().width, 0) + gap * Math.max(0, kids.length - 1) + parseFloat(rs.paddingLeft) + parseFloat(rs.paddingRight) + pad) + 6;   // add up the items: a right-aligned row hides its overflow on the left, where the browser does not count it
  const w = Math.min(innerWidth - 16, Math.max(need, 200)); if (Math.abs(w - r.w) < 4) return;
  Object.assign(L, {x:Math.max(8, right - w), w, sw:innerWidth, sh:innerHeight}); placeWin('toolbar');
}
$('tbChips').addEventListener('click', e => { const c = e.target.closest('[data-chip]'); if (!c) return; const k = c.dataset.chip; if (k === 'rotate' && state.autoRotate) rotOffAt = Date.now(); PRESENT[k].run(); setTimeout(() => renderChips(true), 60); });
$('rotBtn').addEventListener('click', () => { if (!state.autoRotate) rotOffAt = Date.now(); });
setInterval(() => { renderChips(); fitToolbar(); }, 600); renderChips(true);   // and refit if anything is clipped

/* every menu stays on screen: shifted sideways, and narrowed if the screen is narrower than the menu */
function keepOnScreen(m){
  const el = typeof m === 'string' ? $(m) : m; if (!el || !el.classList.contains('open')) return;
  el.style.maxWidth = (innerWidth - 16) + 'px'; const r = el.getBoundingClientRect();
  if (r.left < 8) { el.style.left = '8px'; el.style.right = 'auto'; }
  if (el.getBoundingClientRect().right > innerWidth - 8) { el.style.right = '8px'; el.style.left = 'auto'; }
}
['winBtn', 'presentBtn', 'shareBtn'].forEach(id => $(id).addEventListener('click', () => setTimeout(() => ['winMenu', 'presentMenu', 'shareMenu'].forEach(keepOnScreen), 0)));
addEventListener('resize', () => { fitToolbar(); ['winMenu', 'presentMenu', 'shareMenu'].forEach(keepOnScreen); });
