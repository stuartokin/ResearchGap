/* ==================================================================
 *  KIOSK MODE: an unattended loop for stands and waiting areas. Escape always leaves it.
 * ================================================================== */
/* The kiosk script: scenes run in order, then loop. Tours advance when their narration ends. */
const KIOSK_SCRIPT = [
  {scene:'arrangement', name:'wait', seconds:45, note:'Waiting: the century plays, with the videos'},
  {scene:'tour', id:'gap'},
  {scene:'arrangement', name:'desnz', seconds:35, note:'AI for clean energy: the Vision radar, playing from 1980'},
  {scene:'tour', id:'horizon'},
  {scene:'tour', id:'secure'},
  {scene:'arrangement', name:'analysis', seconds:30, note:'Analysis: the findings dashboard'},
  {scene:'tour', id:'fortune'},
  {scene:'tour', id:'how'}
];
const KIOSK_SAY = {
  wait:() => 'Welcome to The Shrinking Gap from Research to Change. A century of research breakthroughs is playing now, from first research to real-world use. Touch the screen to explore it yourself.',
  desnz:() => ['This view follows AI for clean energy. The Vision radar shows how ready each area’s technologies are, and what is arriving next.'].concat(narrative('horizon', ['answer'])).join(' '),
  analysis:() => ['The findings dashboard brings the headline results together.'].concat(narrative('gap', ['answer'])).join(' ')
};
const kiosk = {on:false, i:0, timer:0, idleTimer:0, paused:false, opts:{sound:'narration', ticker:true, qr:true, idleSeconds:60}};
function setMusic(on){ if (on === music.paused) toggleMusic(); }
function siteUrl(){ return location.protocol.indexOf('http') === 0 ? location.origin + location.pathname : ''; }
function showQr(on){
  const url = siteUrl(), box = $('qrBadge');
  if (!on || !url || typeof qrcode !== 'function') { box.classList.remove('on'); return; }
  const q = qrcode(0, 'M'); q.addData(url); q.make();
  $('qrImg').innerHTML = q.createSvgTag({cellSize:3, margin:2, scalable:true});
  box.classList.add('on');
}
function kioskStart(opts){
  if (!aiAcked) return;
  Object.assign(kiosk.opts, opts || {});
  kiosk.on = true; kiosk.i = 0; kiosk.paused = false;
  closeWelcome(false); document.body.classList.add('kiosk');
  if (document.documentElement.requestFullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
  tour.muted = kiosk.opts.sound !== 'narration'; syncMute();
  setMusic(kiosk.opts.sound === 'music');
  showQr(kiosk.opts.qr);
  toast('Kiosk mode. Press Escape to leave.');
  kioskScene();
}
function kioskScene(){
  clearTimeout(kiosk.timer); if (!kiosk.on || kiosk.paused) return;
  const sc = KIOSK_SCRIPT[kiosk.i % KIOSK_SCRIPT.length]; kiosk.i++;
  if (sc.scene === 'tour' && TOURS[sc.id]) { kioskCapOff(); startTour(sc.id); return; }   // the tour moves on to the next scene when it ends
  resetToDefaults(); applyPreset(sc.name);
  if ((titleCfg.text || '').trim() === (TITLE_DEFAULT.text || '').trim()) setOpen('title', false);   // an unchanged showcase title says nothing about the event: leave it off
  kioskSay(sc);
  if (sc.name === 'wait') { tick.mode = 'both'; applyTicker(); buildTicker(); if (!kiosk.opts.ticker) setOpen('ticker', false); }
  if (kiosk.opts.sound === 'music') setMusic(true);
  kiosk.timer = setTimeout(kioskScene, sc.seconds * 1000);
}
/* captions (and the voice, in narration mode) for the arrangement scenes, using the tour's caption bar without its controls */
function kioskSay(sc){
  const f = KIOSK_SAY[sc.name]; if (!f) return;
  const bar = $('tourBar'); bar.classList.add('on', 'kioskcap'); $('tourTitle').textContent = sc.note || 'Kiosk';
  tour.token++; tourSay(f(), () => {});
}
function kioskCapOff(){ const bar = $('tourBar'); if (bar.classList.contains('kioskcap')) { bar.classList.remove('on', 'kioskcap'); tour.token++; clearTimeout(tour.timer); if ('speechSynthesis' in window) speechSynthesis.cancel(); if (tour.audio) tour.audio.pause(); } }
/* a visible notice while the kiosk is paused for a visitor, counting down to when it resumes */
function kioskPill(){
  const el = $('kioskPill'); clearInterval(kioskPill.t);
  if (!kiosk.on || !kiosk.paused) { el.classList.remove('on'); return; }
  const tick = () => { const left = Math.max(0, Math.ceil((kiosk.resumeAt - Date.now()) / 1000)); el.textContent = `Kiosk paused while you explore. It carries on in ${left} s without a touch. Escape leaves kiosk mode.`; };
  tick(); el.classList.add('on'); kioskPill.t = setInterval(tick, 1000);
}
function kioskStop(){
  if (!kiosk.on) return;
  kiosk.on = false; clearTimeout(kiosk.timer); clearTimeout(kiosk.idleTimer); kioskCapOff(); kioskPill();
  if (tour.on) { tour.on = false; tour.token++; clearTimeout(tour.timer); if ('speechSynthesis' in window) speechSynthesis.cancel(); if (tour.audio) tour.audio.pause(); document.body.classList.remove('touring'); $('tourBar').classList.remove('on'); $('tourCursor').classList.remove('on'); tourHighlight(null); }
  document.body.classList.remove('kiosk'); showQr(false); setMusic(false); tour.muted = !!prefs.tourMuted; syncMute();
  resetToDefaults(); applyPreset('explore'); toast('Kiosk mode off.');
}
/* Visitors may explore: a touch or click pauses the script; it starts again after a quiet spell. Keys are blocked, except Escape. */
function kioskInteraction(){
  if (!kiosk.on) return;
  if (!kiosk.paused) {
    kiosk.paused = true; clearTimeout(kiosk.timer);
    if (tour.on) { tour.on = false; tour.token++; clearTimeout(tour.timer); if ('speechSynthesis' in window) speechSynthesis.cancel(); if (tour.audio) tour.audio.pause(); document.body.classList.remove('touring'); $('tourBar').classList.remove('on'); $('tourCursor').classList.remove('on'); tourHighlight(null); resetToDefaults(); applyPreset('explore'); }
    kioskCapOff();
  }
  clearTimeout(kiosk.idleTimer); kiosk.resumeAt = Date.now() + kiosk.opts.idleSeconds * 1000; kioskPill();
  kiosk.idleTimer = setTimeout(() => { if (!kiosk.on) return; kiosk.paused = false; kioskPill(); kiosk.i = 0; winMenu.classList.remove('open'); kioskScene(); }, kiosk.opts.idleSeconds * 1000);
}
window.addEventListener('keydown', e => {   // on the window, so it runs before any other key handling
  if (!kiosk.on) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (e.key === 'Escape') kioskStop(); else kioskInteraction();   // safe mode: only Escape does anything
}, true);
['pointerdown', 'wheel'].forEach(ev => document.addEventListener(ev, e => { if (kiosk.on && !e.target.closest('#welcome')) kioskInteraction(); }, {capture:true, passive:true}));
const tourTextsOnly = window.__tourTexts;
window.__tourTexts = () => tourTextsOnly().concat(Object.keys(KIOSK_SAY).map(k => ({tour:'kiosk', step:k, text:KIOSK_SAY[k]().replace(/\s+/g, ' ').trim()})));
/* welcome screen: the kiosk options */
$('wKiosk').onclick = () => { $('wKioskOpts').classList.toggle('on'); clearTimeout(welcomeTimer); $('wAuto').textContent = ''; };
$('wKioskGo').onclick = () => kioskStart({sound:document.querySelector('input[name="kSound"]:checked').value, ticker:$('kTicker').checked, qr:$('kQr').checked});
$('wKioskScript').innerHTML = KIOSK_SCRIPT.map((s, k) => `<li>${s.scene === 'tour' ? esc((TOUR_LIST.find(t => t.id === s.id) || {}).title || s.id) : esc(s.note)}${s.scene === 'arrangement' ? ` (${s.seconds} s)` : ' (walk-through)'}</li>`).join('');

/* ==================================================================
 *  IMAGE EXPORT: the model with its labels, a title and the attribution, as a PNG
 * ================================================================== */
/* the view as a picture: the model, its labels, a title and the attribution (also used on the report's title slide) */
function viewCanvas(plain){   // plain: the model and its labels only (for the report's title slide)
    if (composer && !view.lite) composer.render(); else renderer.render(scene, camera);   // draw now, so the frame can be read
    const src = renderer.domElement, dpr = src.width / innerWidth, band = Math.round(84 * dpr);
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height + band;
    const x = c.getContext('2d');
    x.fillStyle = '#08131D'; x.fillRect(0, 0, c.width, c.height); x.drawImage(src, 0, 0);
    labelLayer.querySelectorAll('.lbl').forEach(el => {   // the labels are page elements, so draw them too
      const cs = getComputedStyle(el), r = el.getBoundingClientRect();
      if (!r.width || cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < .25 || r.right < 0 || r.left > innerWidth) return;
      const fs = parseFloat(cs.fontSize) * dpr; x.font = `600 ${fs}px "Instrument Sans", Arial, sans-serif`;
      const t = el.textContent.trim(), w = x.measureText(t).width;
      x.globalAlpha = Math.min(1, +cs.opacity); x.fillStyle = 'rgba(8,19,29,.78)';
      x.fillRect(r.left * dpr, r.top * dpr, w + 14 * dpr, r.height * dpr);
      x.fillStyle = cs.color; x.fillText(t, r.left * dpr + 7 * dpr, (r.top + r.height * .7) * dpr); x.globalAlpha = 1;
    });
    if (plain) { const p = document.createElement('canvas'); p.width = src.width; p.height = src.height; p.getContext('2d').drawImage(c, 0, 0); return p; }
    x.fillStyle = 'rgba(8,19,29,.82)'; x.fillRect(0, 0, c.width, Math.round(64 * dpr));
    x.fillStyle = '#E9F2FF'; x.font = `${Math.round(30 * dpr)}px "Instrument Serif", Georgia, serif`;
    x.fillText('The Shrinking Gap from Research to Change', 22 * dpr, 42 * dpr);
    const yr = state.playing ? `  ${Math.floor(Math.min(state.cursor, YEND))}` : '';
    x.font = `${Math.round(15 * dpr)}px "Instrument Sans", Arial, sans-serif`; x.fillStyle = '#8FA6B8';
    x.fillText(`${selectionText()}${yr}`, 22 * dpr, 60 * dpr);
    const y0 = src.height; x.fillStyle = '#0d1d2b'; x.fillRect(0, y0, c.width, band);
    const verdict = (narrative('gap', ['answer'])[0] || '');
    x.fillStyle = '#F7C04A'; x.font = `italic ${Math.round(16 * dpr)}px "Instrument Sans", Arial, sans-serif`; x.fillText(verdict, 22 * dpr, y0 + 32 * dpr);
    x.fillStyle = '#8FA6B8'; x.font = `${Math.round(12.5 * dpr)}px "Instrument Sans", Arial, sans-serif`;
    x.fillText(`Stuart Okin, personal project. Data revision ${DB.meta.revision} (${DATA_AS_OF}); AI-maintained data and narrative from public sources only, no human review; may contain errors.${siteUrl() ? '  ' + siteUrl() : ''}`, 22 * dpr, y0 + 60 * dpr);
    return c;
}
function exportImage(){
  try {
    const c = viewCanvas();
    c.toBlob(b => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `shrinking-gap-${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); toast('Image saved.');
    }, 'image/png');
  } catch (e) { toast('Could not create the image: ' + e.message); }
}
$('imgBtn').onclick = exportImage;
