/* ==================================================================
 *  JOKE TICKER
 * ================================================================== */
const TICK_DEFAULT = Object.assign({}, DB.defaults.ticker);
const tick = Object.assign({}, TICK_DEFAULT, store.get('sg.ticker', {}));
const ktrack = $('ktrack');
let kx = 0, kSegW = 0;
function buildTicker(){
  const FACES = ['😄','😂','🤣','😉','😜','😆','😁','🙃','😏','🤭','😅','🤦','😝','😊','🥁'];
  const jokes = JOKES.map((j, i) => i).sort(() => Math.random() - .5).map(i => `<span class="kj">${JOKES[i]}</span><span class="ks">${FACES[Math.floor(Math.random() * FACES.length)]}</span>`);
  const news = CHANGES.map((c, i) => [c, i]).filter(([c]) => c.type === 'added').slice(0, 15)
    .map(([c, i]) => `<span class="kn" data-ci="${i}" title="Open the details">New: ${esc(c.title)}${c.it ? ', ' + fieldName(c.it.v) : c.fo ? ', Time to a fortune' : ''}, ${ukDay(c.date)}</span><span class="ks kb">•</span>`);
  const mode = tick.mode || 'jokes'; let parts;
  if (mode === 'news') parts = news.length ? news : ['<span class="kj">No new milestones yet; the data agents run every week.</span><span class="ks kb">•</span>'];
  else if (mode === 'both' && news.length) { parts = []; let n = 0; jokes.forEach((j, k) => { parts.push(j); if (k % 2 === 1) parts.push(news[n++ % news.length]); }); }
  else parts = jokes;
  const html = parts.join('');
  ktrack.innerHTML = `<span class="kseg">${html}</span><span class="kseg" aria-hidden="true">${html}</span>`; kSegW = 0; kx = 0;
}
ktrack.addEventListener('click', e => { const n = e.target.closest('.kn'); if (!n) return; const c = CHANGES[+n.dataset.ci]; if (!c) return; if (c.it) { hidden.delete(c.it.id); openDetail(c.it); } else if (c.fo) { setOpen('fortunes', true); raise('fortunes'); } });
$('tkMode').addEventListener('change', e => { tick.mode = e.target.value; applyTicker(); buildTicker(); });
function measureTicker(){ const s = ktrack.firstElementChild; kSegW = s ? s.offsetWidth : 0; }
function applyTicker(){
  wins.ticker.style.background = hexA(tick.bg, tick.alpha); ktrack.style.color = tick.color;
  $('tkSpeed').value = tick.speed; $('tkSpeedV').textContent = tick.speed; $('tkText').value = tick.color; $('tkBg').value = tick.bg; $('tkAlpha').value = tick.alpha;
  $('tkPause').textContent = tick.paused ? 'Resume' : 'Pause'; $('tkMode').value = tick.mode || 'jokes';
  store.set('sg.ticker', tick); kSegW = 0;
}
function tickStep(dt){
  if (!layout.ticker.open || tick.paused) return;
  if (!kSegW) measureTicker(); if (!kSegW) return;
  kx -= tick.speed * dt * (layout.ticker.fs || 1);
  if (-kx >= kSegW) kx += kSegW;
  ktrack.style.transform = `translate3d(${kx.toFixed(1)}px,0,0)`;
}
$('tkSpeed').addEventListener('input', e => { tick.speed = +e.target.value; applyTicker(); });
$('tkText').addEventListener('input', e => { tick.color = e.target.value; applyTicker(); });
$('tkBg').addEventListener('input', e => { tick.bg = e.target.value; applyTicker(); });
$('tkAlpha').addEventListener('input', e => { tick.alpha = +e.target.value; applyTicker(); });
$('tkPause').onclick = () => { tick.paused = !tick.paused; applyTicker(); };
$('tickCfgBtn').onclick = () => $('tickCfg').classList.toggle('on');
/* Colours and Settings panels close when you click or tap anywhere else, or press Escape */
document.addEventListener('pointerdown', e => {
  [['titleCfg', 'titleCfgBtn'], ['tickCfg', 'tickCfgBtn']].forEach(([pn, bn]) => { const P = $(pn), B = $(bn); if (P.classList.contains('on') && !P.contains(e.target) && !B.contains(e.target)) P.classList.remove('on'); });
}, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape') { $('titleCfg').classList.remove('on'); $('tickCfg').classList.remove('on'); } });
addEventListener('resize', () => { kSegW = 0; });
if (window.ResizeObserver) new ResizeObserver(() => { kSegW = 0; }).observe(wins.ticker);

