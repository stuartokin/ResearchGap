/* ==================================================================
 *  WINDOW MANAGER
 * ================================================================== */
const WIN_IDS = ['toolbar','footer','radar','cyber','charts','findings','quality','table','changes','audience','pagetitle','title','ticker','player','sources','filters','display','summary','milestones','details','key','context','landing','gapchart','fortunes','vision','outlook','report','music','vid1','vid2'];
const WIN_NAMES = {radar:'Vision radar', cyber:'Cyber lens', charts:'Charts', toolbar:'Toolbar', footer:'Footer', findings:'Key findings', quality:'Data quality', table:'Table of milestones', changes:'Data changes', audience:'Your milestones', pagetitle:'Page title', title:'Showcase title', ticker:'Ticker', player:'Play the century', sources:'Sources', filters:'Filters', display:'Display', summary:'Summary', milestones:'Milestones', details:'Details', key:'Reading the model', context:'Context', landing:'Landing and starting', gapchart:'Gap over time', fortunes:'Time to a fortune', vision:'AI for clean energy', outlook:'Can AI shrink the gap?', music:'Music', report:'PowerPoint report', vid1:'Countdown to Q-Day', vid2:'University Curated Cyber-attacks since 2000'};
function defaultLayout(){
  const W = innerWidth, H = innerHeight, Hh = innerHeight, u = UI, narrow = W < 820; let top = Math.round(72 * u);
  const rw = Math.min(Math.round(360 * u), W - 36), lw = Math.min(Math.round(330 * u), W - 36);
  const footH = Math.round(26 * u), tickH = Math.round(66 * u), tickY = Hh - footH - tickH - 10, bottom = tickY - 12;
  const btns = [...document.querySelectorAll('#top .actions > button')].filter(b => b.offsetWidth), tbNat = btns.reduce((a, b) => a + b.offsetWidth, 0) + 8 * Math.max(0, btns.length - 1) + 40;
  const tbW = Math.min(tbNat + 56, W - 16), tbRows = Math.max(1, Math.ceil((tbNat + 72) / (W - 16))), tbH = tbRows * Math.round(42 * u) + 12;
  // if the page title and toolbar don't fit side by side, the title drops below the toolbar
  const titleRow = W - tbW - 52 < 320, ptH = Math.round(58 * u);
  const ptY = titleRow ? Math.round(6 * u) + tbH + 6 : Math.round(8 * u);
  const ptW = titleRow ? Math.min(Math.round(760 * u), W - 24) : Math.max(260, Math.min(Math.round(760 * u), W - tbW - 40));
  top = Math.max(top, (titleRow ? ptY + ptH : Math.round(6 * u) + tbH) + 10);
  const keyH = Math.round(160 * u), keyY = bottom - keyH;
  const vw = Math.round(W * .42), vh = Math.round(vw * 9 / 16 + 40 * u), midX = lw + 36, midW = Math.max(300, W - midX - rw - 36);
  const pw = Math.min(Math.round(560 * u), Math.round(W * .42)), ph = Math.round(250 * u);
  const tw = Math.min(Math.round(1000 * u), W - midX - 18);
  if (MOBILE) {
    const o = {}; const all = ['toolbar','footer','radar','cyber','charts','findings','quality','table','changes','audience','pagetitle','title','ticker','player','sources','report','filters','display','summary','milestones','details','key','context','landing','gapchart','fortunes','vision','outlook','music','vid1','vid2'];
    const y0 = Math.max(Math.round(H * .18), tbH + 14);
    const land = W >= H, cw = Math.round(Math.max(250, Math.min(420, W * .34))), band = Math.max(y0, Math.round(H * .5));
    // windows open beside the model (landscape) or below it (portrait), never across the centre
    all.forEach(id => { o[id] = land ? {x:W - cw - 6, y:y0, w:cw, h:H - y0 - 8, fs:.9, open:false} : {x:6, y:band, w:W - 12, h:Math.max(160, H - band - 176), fs:.9, open:false}; });
    o.player = land ? {x:6, y:H - 158, w:W - cw - 18, h:150, fs:.8, open:false} : {x:6, y:H - 168, w:W - 12, h:160, fs:.8, open:false};
    o.ticker = {x:6, y:H - 58, w:W - 12, h:50, fs:.85, open:false};
    o.toolbar = {x:6, y:6, w:W - 12, h:tbH, fs:1, open:true};
    o.charts = {x:6, y:y0, w:W - 12, h:H - y0 - 8, fs:.9, open:false};   // charts need the width
    o.findings.open = true;   // phones open on the headline findings, with the 3D model a tap away
    o.footer = {x:6, y:H - footH - 4, w:W - 12, h:footH, fs:.9, open:false};
    Object.values(o).forEach(L => { L.sw = W; L.sh = H; });
    return o;
  }
  const o = {
    toolbar:{x:W - tbW - 8, y:Math.round(6 * u), w:tbW, h:tbH, fs:1, open:true},
    footer:{x:10, y:Hh - footH - 4, w:W - 20, h:footH, fs:1, open:true},
    audience:{x:Math.max(18, W - Math.round(420 * u) - 18), y:top, w:Math.round(420 * u), h:Math.min(Math.round(680 * u), bottom - top), fs:1, open:false},
    pagetitle:{x:12, y:ptY, w:ptW, h:ptH, fs:1, open:true},
    title:{x:midX + Math.round((W - midX - 18 - tw) / 2), y:top, w:tw, h:Math.round(140 * u), fs:1, open:false},
    ticker:{x:10, y:tickY, w:W - 20, h:tickH, fs:1, open:true},
    player:{x:W - pw - 18, y:Math.max(top + 140, bottom - ph), w:pw, h:ph, fs:1, open:false},
    filters:{x:18, y:top, w:lw, h:Math.max(200, keyY - top - 12), fs:1, open:false},
    key:{x:18, y:keyY, w:lw, h:keyH, fs:1, open:false},
    display:{x:midX, y:top + 20, w:Math.round(320 * u), h:Math.min(Math.round(600 * u), bottom - top - 20), fs:1, open:false},
    summary:{x:Math.max(lw + 36, W - 2 * rw - 34), y:top + Math.round(150 * u), w:rw, h:Math.round(470 * u), fs:1, open:false},
    details:{x:W - rw - 18, y:top, w:rw, h:Math.min(Math.round(420 * u), bottom - top), fs:1, open:false},
    milestones:{x:Math.max(18, W - rw - 18 - Math.round(340 * u)), y:top, w:Math.round(330 * u), h:Math.min(Math.round(600 * u), bottom - top), fs:1, open:false},
    context:{x:W - rw - 18, y:top, w:rw, h:Math.round(330 * u), fs:1, open:false},
    landing:{x:18, y:top, w:lw, h:Math.max(200, bottom - top), fs:1, open:!narrow},
    gapchart:{x:W - rw - 18, y:top, w:rw, h:Math.round(340 * u), fs:1, open:false},
    fortunes:{x:W - rw - 18, y:top + Math.round(356 * u), w:rw, h:Math.max(200, bottom - top - Math.round(356 * u)), fs:1, open:false},
    vision:{x:midX, y:top + 20, w:Math.round(390 * u), h:Math.min(Math.round(600 * u), bottom - top - 20), fs:1, open:false},
    outlook:{x:midX + Math.round(406 * u), y:top + 20, w:Math.max(320, W - rw - 36 - midX - Math.round(406 * u)), h:Math.min(Math.round(620 * u), bottom - top - 20), fs:1, open:false},
    radar:{x:midX - 20, y:top + 10, w:Math.round(460 * u), h:Math.max(260, bottom - top - 10), fs:1, open:false},
    cyber:{x:midX + 10, y:top + 20, w:Math.round(470 * u), h:Math.min(Math.round(680 * u), bottom - top - 20), fs:1, open:false},
    charts:{x:Math.round(W * .36), y:top, w:W - Math.round(W * .36) - 18, h:bottom - top, fs:1, open:false},
    findings:{x:midX, y:top + 20, w:Math.round(430 * u), h:Math.min(Math.round(600 * u), bottom - top - 20), fs:1, open:false},
    quality:{x:midX + 30, y:top + 20, w:Math.round(460 * u), h:Math.min(Math.round(640 * u), bottom - top - 20), fs:1, open:false},
    table:{x:midX, y:top + 10, w:Math.max(420, Math.min(Math.round(940 * u), W - midX - 18)), h:Math.max(260, bottom - top - 10), fs:1, open:false},
    changes:{x:Math.max(18, W - rw - 18), y:top, w:rw, h:Math.max(260, bottom - top), fs:1, open:false},
    report:{x:Math.max(18, W - rw - 18), y:top + 20, w:rw, h:Math.min(Math.round(330 * u), bottom - top - 20), fs:1, open:false},
    music:{x:midX, y:Math.max(top + 20, bottom - Math.round(200 * u)), w:Math.round(330 * u), h:Math.round(200 * u), fs:1, open:false},
    vid1:{x:Math.round(W * .06), y:top + 20, w:vw, h:vh, fs:1, open:false},
    vid2:{x:Math.round(W * .52), y:top + 20, w:vw, h:vh, fs:1, open:false},
    sources:{x:midX, y:top + 20, w:Math.round(440 * u), h:Math.min(Math.round(620 * u), bottom - top - 20), fs:1, open:false}
  };
  Object.values(o).forEach(L => { L.sw = W; L.sh = H; });
  return o;
}
let layout = Object.assign(arrangeLayout('explore'), store.get('sg.layout.v4', {}));
let zTop = 20;
const wins = {};
function saveLayout(){ store.set('sg.layout.v4', layout); }
/* Where a window should appear on the current screen. With "keep positions" on, a window keeps its distance
   from the nearest edges when the screen size changes (for example leaving full screen), and its saved position
   is never overwritten, so it returns exactly when the screen size does. */
function winRect(L, W, H, fit){
  W = W || innerWidth; H = H || innerHeight;
  let x = L.x, y = L.y, w = L.w, h = L.h;
  const sw = L.sw || W, sh = L.sh || H;
  if (view.keepWinPos !== false || fit) {
    if (x + w / 2 > sw / 2) x += W - sw;
    if (y + h / 2 > sh / 2) y += H - sh;
  }
  w = Math.min(w, W - 8); h = Math.min(h, H - 8);
  if (fit) { x = clamp(x, 4, W - w - 4); y = clamp(y, 4, H - h - 4); }
  else { x = clamp(x, -w + 80, W - 80); y = clamp(y, 0, H - 40); }
  return {x:Math.round(x), y:Math.round(y), w:Math.round(w), h:Math.round(h)};
}
function commitWin(id){ const L = layout[id], r = winRect(L); Object.assign(L, r, {sw:innerWidth, sh:innerHeight}); }
/* Find free space for a window being opened: least overlap with open windows and the centre of the model, nearest its usual place */
function flashWin(id){ const el = wins[id]; if (!el) return; raise(id); el.classList.remove('justopened'); void el.offsetWidth; el.classList.add('justopened'); clearTimeout(el._flashT); el._flashT = setTimeout(() => el.classList.remove('justopened'), 2600); }
function smartPlace(id){
  if (['toolbar', 'footer', 'ticker', 'pagetitle', 'title', 'player'].includes(id) || !wins[id] || wins[id].classList.contains('max')) return;
  const L = layout[id], W = innerWidth, H = innerHeight, r0 = winRect(L), w = r0.w, h = r0.h;
  const others = WIN_IDS.filter(o => o !== id && layout[o].open && o !== 'footer').map(o => wins[o].getBoundingClientRect()).filter(o => o.width > 0);
  const tb = wins.toolbar.getBoundingClientRect(), top = layout.toolbar.open ? Math.max(8, Math.min(tb.bottom + 8, H * .3)) : 8;
  const model = {left:W * .3, top:H * .22, right:W * .7, bottom:H * .78};
  const ovl = (R, o) => Math.max(0, Math.min(R.right, o.right) - Math.max(R.left, o.left)) * Math.max(0, Math.min(R.bottom, o.bottom) - Math.max(R.top, o.top));
  const score = (x, y) => { const R = {left:x, top:y, right:x + w, bottom:y + h}; let a = 0; others.forEach(o => { a += ovl(R, o); }); return a + ovl(R, model) * .35; };
  const cur = score(r0.x, r0.y); if (cur < 1) return;
  let best = {s:cur, x:r0.x, y:r0.y, d:0};
  for (let y = top; y <= H - h - 8; y += 16) for (let x = 8; x <= W - w - 8; x += 16) {
    const sc = score(x, y), d = Math.hypot(x - r0.x, y - r0.y);
    if (sc < best.s - 1 || (Math.abs(sc - best.s) <= 1 && d < best.d)) best = {s:sc, x, y, d};
  }
  if (best.s < cur - 1) Object.assign(L, {x:best.x, y:best.y, sw:W, sh:H});
}
function placeWin(id){
  const el = wins[id], L = layout[id];
  if (view.keepWinPos === false) { Object.assign(L, winRect(L), {sw:innerWidth, sh:innerHeight}); }
  const r = winRect(L);
  el._setW = r.w; el._setH = r.h;
  el.style.left = r.x + 'px'; el.style.top = r.y + 'px'; el.style.width = r.w + 'px'; el.style.height = r.h + 'px';
  el.style.setProperty('--fs', L.fs);
  el.classList.toggle('closed', !L.open);
}
function raise(id){
  if (zTop > 900) { zTop = 20; WIN_IDS.slice().sort((a, b) => (+wins[a].style.zIndex || 0) - (+wins[b].style.zIndex || 0)).forEach(w => { wins[w].style.zIndex = ++zTop; }); }
  wins[id].style.zIndex = ++zTop;
}
function setOpen(id, open){ const wasOpen = layout[id].open; layout[id].open = open; if (id === 'charts' && open) setTimeout(() => { raise('charts'); wins.charts.style.zIndex = Math.max(+wins.charts.style.zIndex || 0, 1200); renderCharts(); }, 0); if (open && !wasOpen && view.flashNew !== false && !['toolbar', 'footer', 'pagetitle'].includes(id)) setTimeout(() => flashWin(id), 30); if (open) setTimeout(() => { if (id === 'radar') renderRadar(); if (id === 'cyber') renderCyber(); }, 0); if (open && !wasOpen && view.smartPlace !== false) smartPlace(id); if (open) setTimeout(() => { if (id === 'findings') renderFindings(); if (id === 'quality') renderQuality(); if (id === 'table') renderTable(); }, 0); if (!open) wins[id].classList.remove('max'); placeWin(id); if (typeof syncVideos === 'function') syncVideos(); if (open) raise(id); saveLayout(); buildWinMenu(); if (open && typeof updateTimeWindows === 'function') updateTimeWindows(true); }
WIN_IDS.forEach(id => {
  const el = $('w-' + id); wins[id] = el;
  const head = document.createElement('div'); head.className = 'wh';
  head.innerHTML = `<h2>${el.dataset.title}</h2><button data-a="max" title="Maximise or restore" aria-label="Maximise or restore">⤢</button><button data-a="dn" title="Smaller text" aria-label="Smaller text">A−</button><button data-a="up" title="Larger text" aria-label="Larger text">A+</button><button data-a="x" title="Close" aria-label="Close window">✕</button>`;
  el.prepend(head);
  head.addEventListener('click', e => {
    const a = e.target.dataset && e.target.dataset.a; if (!a) return;
    if (a === 'x') setOpen(id, false);
    if (a === 'max') { const on = el.classList.toggle('max'); raise(id); e.target.textContent = on ? '⤡' : '⤢'; twKey = ''; }
    if (a === 'up' || a === 'dn') { commitWin(id); const old = layout[id].fs, nf = Math.round(clamp(old + (a === 'up' ? .1 : -.1), .7, 2.2) * 10) / 10, k = nf / old; layout[id].fs = nf; layout[id].w = Math.max(220, layout[id].w * k); layout[id].h = Math.max(96, layout[id].h * k); if (layout[id].x + layout[id].w > innerWidth - 8) layout[id].x = Math.max(8, innerWidth - 8 - layout[id].w); if (layout[id].y + layout[id].h > innerHeight - 8) layout[id].y = Math.max(8, innerHeight - 8 - layout[id].h); placeWin(id); saveLayout(); updateTimeWindows(true); }
  });
  let drag = null;
  head.addEventListener('pointerdown', e => {
    if (e.target.tagName === 'BUTTON' || el.classList.contains('max')) return;
    raise(id); commitWin(id); drag = {dx:e.clientX - layout[id].x, dy:e.clientY - layout[id].y}; head.setPointerCapture(e.pointerId);
  });
  head.addEventListener('pointermove', e => { if (!drag) return; layout[id].x = e.clientX - drag.dx; layout[id].y = e.clientY - drag.dy; placeWin(id); });
  head.addEventListener('pointerup', () => { if (drag) { drag = null; saveLayout(); } });
  head.addEventListener('dblclick', e => { if (e.target.tagName !== 'BUTTON') { const d = defaultLayout()[id]; Object.assign(layout[id], {x:d.x, y:d.y, w:d.w, h:d.h}); placeWin(id); saveLayout(); } });
  el.addEventListener('pointerdown', () => raise(id));
  placeWin(id);
});
if (window.ResizeObserver) {
  const ro = new ResizeObserver(entries => {
    entries.forEach(en => {
      const id = en.target.id.slice(2), el = en.target;
      if (el.classList.contains('closed') || el.classList.contains('max')) return;
      if (Math.abs(el.offsetWidth - (el._setW || 0)) <= 2 && Math.abs(el.offsetHeight - (el._setH || 0)) <= 2) return;   // our own placement, not a user resize
      commitWin(id); layout[id].w = el.offsetWidth; layout[id].h = el.offsetHeight; el._setW = el.offsetWidth; el._setH = el.offsetHeight;
    });
    clearTimeout(ro.t); ro.t = setTimeout(saveLayout, 300);
  });
  WIN_IDS.forEach(id => ro.observe(wins[id]));
}
const winMenu = $('winMenu');
