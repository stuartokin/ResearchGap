/* ==================================================================
 *  ARRANGEMENTS: five presets that adapt to phone, tablet, laptop and large screens without overlapping
 * ================================================================== */
function screenClass(){ const W = innerWidth, H = innerHeight; if (MOBILE) return W >= H ? 'compact' : 'phone';   // compact: small landscape screens such as a folding phone opened out
  if (H > W && W < 1100) return 'tabletP'; if (W < 1180 || (matchMedia('(pointer: coarse)').matches && W < 1400)) return 'tablet'; if (W < 1500 || H < 860) return 'small'; return W < 1900 ? 'laptop' : 'large'; }
/* Small or portrait screens: the model keeps the open centre. Landscape: one content column on the right and a compact
   Play strip along the bottom left. Portrait: the model on top, content and Play in the lower half. */
function compactArrange(name, d, set, top, bot, W, H){
  const g = 8, land = W >= H, ph = land ? Math.min(d.player.h, 150) : Math.min(d.player.h, 160);
  d.player.fs = .8;
  if (name === 'analysis') {   // a dashboard: two panels side by side, or one above the other
    if (land) { const cw = (W - 12 - g) / 2; set('findings', 6, top, cw, bot - top); set('summary', 6 + cw + g, top, cw, bot - top); }
    else { const mid = Math.round(top + (bot - top) / 2); set('findings', 6, top, W - 12, mid - top - 4); set('summary', 6, mid + 4, W - 12, bot - mid - 4); }
    return d;
  }
  if (name === 'wait') { const th = 50; set('ticker', 6, bot - th, W - 12, th); d.ticker.fs = .85; bot -= th + g; }
  const side = {explore:['findings'], play:['landing'], desnz:['radar']}[name] || [];
  if (land) {
    const cw = Math.round(Math.max(250, Math.min(420, W * .34))), xr = W - cw - 6;
    if (name === 'wait') { const two = H >= 500, vh = Math.min(cw * 9 / 16 + 34, two ? (bot - top - g) / 2 : bot - top); set('vid1', xr, top, cw, vh); if (two) set('vid2', xr, top + vh + g, cw, vh); }   // one video on short screens
    else side.forEach(id => set(id, xr, top, cw, bot - top));
    set('player', 6, bot - ph, xr - g - 6, ph);
  } else {
    set('player', 6, bot - ph, W - 12, ph);
    const y0 = Math.max(top, Math.round(H * .5)), y1 = bot - ph - g;
    if (name === 'wait') { const vh = Math.min((W - 12) * 9 / 16 + 34, y1 - y0); if (vh > 120) set('vid1', 6, y1 - vh, Math.min(W - 12, (vh - 34) * 16 / 9), vh); }
    else if (y1 - y0 >= 140) side.forEach(id => set(id, 6, y0, W - 12, y1 - y0));
  }
  return d;
}
function arrangeLayout(name){
  const d = defaultLayout(), W = innerWidth, H = innerHeight, g = 12, cls = screenClass(), big = cls === 'laptop' || cls === 'large';
  WIN_IDS.forEach(id => { d[id].open = false; d[id].sw = W; d[id].sh = H; });
  const tight = cls === 'phone' || cls === 'compact';
  d.toolbar.open = true; d.footer.open = !tight; d.pagetitle.open = !tight;
  const top = Math.max(d.pagetitle.open ? d.pagetitle.y + d.pagetitle.h : 0, d.toolbar.y + d.toolbar.h) + g;
  let bot = (d.footer.open ? d.footer.y : H) - g;
  const set = (id, x, y, w, h, open = true) => Object.assign(d[id], {x:Math.round(x), y:Math.round(y), w:Math.round(w), h:Math.round(h), open});
  const stack = (ids, x, w, y0, y1, fr, opens) => { const tot = y1 - y0 - g * (ids.length - 1); let y = y0; ids.forEach((id, i) => { const h = tot * fr[i]; set(id, x, y, w, h, opens ? opens[i] : true); y += h + g; }); };
  // narrower side columns on smaller screens, so the timeline stays the focus
  const L = {tablet:Math.min(320, W * .36), small:Math.min(290, W * .23), laptop:Math.min(360, W * .25), large:Math.min(440, W * .23)}[cls] || 300;
  const Rw = {tablet:Math.min(320, W * .36), small:Math.min(310, W * .24), laptop:Math.min(400, W * .27), large:Math.min(520, W * .27)}[cls] || 320;
  if (tight || cls === 'tabletP') return compactArrange(name, d, set, top, bot, W, H);   // small or portrait screens: protect the centre
  const xL = 12, xR = W - Rw - 12, xC = xL + L + g, wC = xR - g - xC, ph = d.player.h;
  const centrePlayer = (x0, w0, open = true) => { const pw = Math.min(d.player.w, Math.max(280, w0)); set('player', x0 + (w0 - Math.min(pw, w0)) / 2, bot - ph, Math.min(pw, w0), ph, open); };
  if (name === 'wait') {
    const th = d.ticker.h;
    if (cls === 'phone') {
      set('ticker', 6, H - th - 8, W - 12, th);
      if (W > H) {
        const hw = (W - 18) / 2, tbBottom = wins.toolbar ? Math.max(top, wins.toolbar.getBoundingClientRect().bottom + 8) : top, avail = H - th - 16 - tbBottom, ph2 = Math.min(ph, avail), vh = Math.min(hw * 9 / 16 + 34, avail);
        set('vid1', 6, tbBottom, Math.min(hw, (vh - 34) * 16 / 9), vh); set('player', 12 + hw, H - th - 16 - ph2, hw, ph2);
      } else { set('player', 6, H - th - 16 - ph, W - 12, ph); set('vid1', 6, top, W - 12, Math.min((W - 12) * 9 / 16 + 34, H - th - ph - top - 30)); }
    } else {
      set('ticker', 12, bot - th, W - 24, th); bot -= th + g;
      const vmax = {tablet:Math.min(W * .3, 320), small:Math.min(W * .24, 330), laptop:Math.min(W * .25, 420), large:Math.min(W * .23, 540)}[cls];
      let vh = vmax * 9 / 16 + 34; if (2 * vh + g > bot - top) vh = (bot - top - g) / 2;
      const vw = Math.min(vmax, (vh - 34) * 16 / 9);
      set('vid1', W - vw - 12, top, vw, vh); set('vid2', W - vw - 12, top + vh + g, vw, vh);
      const cx0 = cls === 'large' ? xC : 12, cw = W - vw - 24 - g - cx0;
      if (cls === 'large') stack(['landing'], xL, L, top, bot, [1]);
      if (big) { const tw = Math.min(cw, d.title.w); set('title', cx0 + (cw - tw) / 2, top, tw, d.title.h); }
      centrePlayer(cx0, cw);
    }
  } else if (name === 'play') {
    if (cls === 'phone') set('player', 6, H - ph - 8, W - 12, ph);
    else if (!big) { stack(['landing'], xL, L, top, bot, [1]); centrePlayer(xC, W - 12 - xC); }
    else if (cls === 'laptop') { stack(['landing'], xL, L, top, bot, [1]); stack(['gapchart'], xR, Rw, top, Math.min(bot, top + (bot - top) * .6), [1]); centrePlayer(xC, wC); }
    else { stack(['context', 'landing'], xL, L, top, bot, [.38, .62]); stack(['gapchart', 'fortunes'], xR, Rw, top, bot, [.45, .55]); centrePlayer(xC, wC); }
  } else if (name === 'analysis') {   // a dashboard: charts take priority over the timeline here
    if (cls === 'phone') set('findings', 6, top, W - 12, H - top - 8);
    else if (!big) { const cw = (W - 24 - g) / 2, mid = top + (bot - top) * .55; set('findings', 12, top, cw, mid - top); set('summary', 12 + cw + g, top, cw, mid - top); set('gapchart', 12, mid + g, cw, bot - mid - g); set('outlook', 12 + cw + g, mid + g, cw, bot - mid - g); }
    else {
      const mid = top + (bot - top) * .55, ww = W - 24 - 2 * g, w1 = ww * .3, w2 = ww * .4, w3 = ww - w1 - w2, wb = W - 24 - g;
      set('findings', 12, top, w1, mid - top); set('summary', 12 + w1 + g, top, w2, mid - top); set('gapchart', 12 + w1 + w2 + 2 * g, top, w3, mid - top);
      set('outlook', 12, mid + g, wb * .58, bot - mid - g); set('fortunes', 12 + wb * .58 + g, mid + g, wb - wb * .58, bot - mid - g);
    }
  } else if (name === 'desnz') {
    if (cls === 'phone') { set('player', 6, H - ph - 8, W - 12, ph); set('radar', 6, top, W - 12, H - ph - 24 - top); }
    else if (cls === 'tablet') { const vw = (W - 24 - g) * .55; stack(['radar'], 12, vw, top, bot - ph - g, [1]); set('player', 12, bot - ph, vw, ph); stack(['vision'], 12 + vw + g, W - vw - 24 - g, top, bot, [1], [false]); }
    else {
      const rw = cls === 'small' ? Math.min(380, W * .3) : Math.min(560, W * .3), xr = 12 + rw + g;
      stack(['radar'], 12, rw, top, bot, [1]);
      if (cls === 'small') { stack(['vision', 'changes'], xR, Rw, top, bot, [.55, .45], [false, false]); centrePlayer(xr, xR - g - xr); }
      else if (cls === 'laptop') { stack(['vision', 'changes'], xR, Rw, top, bot, [.6, .4], [true, false]); centrePlayer(xr, xR - g - xr); }
      else { stack(['vision', 'changes'], xR, Rw, top, bot, [.55, .45]); centrePlayer(xr, xR - g - xr); }
      const cw = xR - g - xr, w0 = Math.min(460, cw), h0 = Math.min(380, (bot - top - ph - g) * .6); set('details', xr + (cw - w0) / 2, bot - ph - g - h0, w0, h0, false);
    }
  } else {   // exploring (the default): the timeline first
    if (cls === 'phone') set('findings', 6, top, W - 12, Math.min(H - top - 8, H * .62));
    else {
      stack(['filters'], xL, L, top, bot, [1]);
      if (big) stack(['findings', 'details'], xR, Rw, top, bot, [.42, .58], [true, false]);
      else { stack(['findings'], xR, Rw, top, bot, [1], [false]); set('details', xR, top, Rw, bot - top, false); }
      centrePlayer(xC, (big ? xR : W - 12) - g - xC, false);
    }
  }
  return d;
}
function applyPreset(name){
  const wasDesnz = view.preset === 'desnz';
  view.preset = name; view.chgFlag = 'new'; view.conclusion = !(name === 'desnz' || name === 'analysis'); if ($('conclT')) $('conclT').checked = view.conclusion; syncChgUI(); applyChangeFlags();
  layout = arrangeLayout(name); WIN_IDS.forEach(placeWin); saveLayout(); syncVideos();
  if (name === 'desnz') { view.preDesnzFields = [...F.fields]; F.fields = new Set(FKEYS.filter(k => items.some(it => it.v === k && it.dv && !it.removed))); F.vision = true; view.chgScope = 'desnz'; $('chgDesnzT').checked = true; syncChgUI(); applyChangeFlags(); refresh(); renderChanges(); }
  else if (wasDesnz) { F.fields = new Set((view.preDesnzFields || FKEYS).filter(k => FIELDS[k])); delete view.preDesnzFields; F.vision = false; view.chgScope = 'all'; $('chgDesnzT').checked = false; syncChgUI(); applyChangeFlags(); refresh(); renderChanges(); }
  if (name === 'analysis' && state.playing) stopPlay();
  if (name === 'desnz') {   // a slow loop from 1980; your own range and speed come back when you leave
    if (!view.preDesnzPlay) view.preDesnzPlay = {from:view.playFrom, to:view.playTo, speed:playSpeed, loop:view.loopPlay};
    view.playFrom = 1980; view.playTo = null; playSpeed = .25; $('tbSpeed').value = '0.25'; view.loopPlay = true;
    syncPlayRangeUI(); syncDisplayUI(); cancelCountdown(); if (state.playing) stopPlay(); startPlay();
  } else if (wasDesnz && view.preDesnzPlay) {
    const pp = view.preDesnzPlay; view.playFrom = pp.from; view.playTo = pp.to; playSpeed = pp.speed || 1; $('tbSpeed').value = String(playSpeed); view.loopPlay = pp.loop; delete view.preDesnzPlay;
    syncPlayRangeUI(); syncDisplayUI();
  }
  $('spot').classList.remove('on', 'concl', 'chg');
  setTimeout(() => { renderStats(); if (layout.findings.open) renderFindings(); if (layout.outlook.open) renderOutlook(); if (layout.fortunes.open) renderFortunes(); twKey = ''; updateTimeWindows(true); }, 80);
  if (name === 'wait') { tick.mode = 'both'; applyTicker(); buildTicker();
    view.loopPlay = true; syncDisplayUI(); if (!state.playing) { cancelCountdown(); startPlay(); } setAutoRotate(true); }
  if (name === 'play') updateTimeWindows(true);
  if ((name === 'explore' || name === 'play') && !state.playing) { cancelCountdown(); startPlay(); }   // only Analysis has Play stopped
  buildWinMenu();
}
