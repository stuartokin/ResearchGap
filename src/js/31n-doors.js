/* ==================================================================
 *  THE WELCOME DOORS: Learn (guided tours), Ask (questions) and Explore (the tool), with a page behind each of the
 *  first two: section labels and a small moving picture on every tile. In the tool, the toolbar has a Home button,
 *  a Questions menu and, after a question, a breadcrumb back to the questions. A question arrives calmly: the
 *  century stays still and nothing pops up, so the answer is the first thing seen.
 * ================================================================== */
const PIC_BG = '#10283A';
/* small looping pictures, one per topic (inline SVG; paused for anyone who asks for reduced motion) */
const PICS = {
  arcs:'<line x1="20" y1="100" x2="220" y2="100" stroke="#2E4A63" stroke-width="1.5"/><path d="M30 100 Q 120 -10 210 100" fill="none" stroke="#5FD8FF" stroke-width="2.5"><animate attributeName="d" values="M30 100 Q 120 -10 210 100;M70 100 Q 120 30 170 100;M30 100 Q 120 -10 210 100" dur="6s" repeatCount="indefinite"/></path><path d="M60 100 Q 120 30 180 100" fill="none" stroke="#FFD166" stroke-width="2"><animate attributeName="d" values="M60 100 Q 120 30 180 100;M95 100 Q 120 60 145 100;M60 100 Q 120 30 180 100" dur="6s" repeatCount="indefinite"/></path>',
  bars:'<line x1="30" y1="104" x2="210" y2="104" stroke="#2E4A63" stroke-width="1.5"/>' + [['#5FD8FF', 48, '20;44;20'], ['#4CD3C2', 92, '64;30;64'], ['#FFD166', 136, '34;70;34'], ['#B794F6', 180, '54;24;54']].map(([c, x, v]) => `<rect x="${x}" width="26" rx="4" fill="${c}" y="60" height="44"><animate attributeName="height" values="${v}" dur="4s" repeatCount="indefinite"/><animate attributeName="y" values="${v.split(';').map(h => 104 - h).join(';')}" dur="4s" repeatCount="indefinite"/></rect>`).join(''),
  turbine:'<line x1="120" y1="58" x2="120" y2="116" stroke="#C9D8E6" stroke-width="4" stroke-linecap="round"/><g><animateTransform attributeName="transform" type="rotate" from="0 120 56" to="360 120 56" dur="8s" repeatCount="indefinite"/><path d="M120 56 L120 14" stroke="#E9F2FF" stroke-width="5" stroke-linecap="round"/><path d="M120 56 L156 77" stroke="#E9F2FF" stroke-width="5" stroke-linecap="round"/><path d="M120 56 L84 77" stroke="#E9F2FF" stroke-width="5" stroke-linecap="round"/></g><circle cx="120" cy="56" r="5" fill="#4CD3C2"/><circle cx="190" cy="30" r="4" fill="#4CD3C2"><animate attributeName="opacity" values="0.2;1;0.2" dur="3s" repeatCount="indefinite"/></circle><circle cx="206" cy="52" r="4" fill="#4CD3C2"><animate attributeName="opacity" values="1;0.2;1" dur="3s" repeatCount="indefinite"/></circle><path d="M190 30 L206 52" stroke="#4CD3C2" stroke-width="1.2" opacity="0.6"/>',
  radar:'<circle cx="120" cy="64" r="44" fill="none" stroke="#2E4A63" stroke-width="1.5"/><circle cx="120" cy="64" r="28" fill="none" stroke="#2E4A63" stroke-width="1.5"/><path d="M120 64 L120 20 A44 44 0 0 1 151 33 Z" fill="#4CD3C2" opacity="0.35"><animateTransform attributeName="transform" type="rotate" from="0 120 64" to="360 120 64" dur="5s" repeatCount="indefinite"/></path><circle cx="146" cy="44" r="4" fill="#FFD166"><animate attributeName="opacity" values="0.2;1;0.2" dur="5s" repeatCount="indefinite"/></circle><circle cx="98" cy="82" r="4" fill="#5FD8FF"><animate attributeName="opacity" values="1;0.2;1" dur="5s" repeatCount="indefinite"/></circle>',
  shield:'<circle cx="120" cy="60" r="30" fill="none" stroke="#FF8A7A" stroke-width="2"><animate attributeName="r" values="30;52;30" dur="3.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.6;0;0.6" dur="3.5s" repeatCount="indefinite"/></circle><path d="M120 26 L148 37 L148 60 C148 78 136 90 120 96 C104 90 92 78 92 60 L92 37 Z" fill="#0E2232" stroke="#FF8A7A" stroke-width="2.5" stroke-linejoin="round"/><path d="M108 60 L117 69 L134 50" fill="none" stroke="#E9F2FF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  shieldgap:'<path d="M120 22 L150 34 L150 58 C150 78 137 91 120 98 C103 91 90 78 90 58 L90 34 Z" fill="none" stroke="#FF8A7A" stroke-width="2.5" stroke-linejoin="round" stroke-dasharray="190 40"><animate attributeName="stroke-dashoffset" values="0;-230" dur="6s" repeatCount="indefinite"/></path><circle cx="120" cy="60" r="6" fill="#FF8A7A"><animate attributeName="opacity" values="1;0.2;1" dur="2s" repeatCount="indefinite"/></circle>',
  climb:'<path d="M36 98 L70 84 L104 88 L138 62 L172 50 L206 22" fill="none" stroke="#FFD166" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="220" stroke-dashoffset="220"><animate attributeName="stroke-dashoffset" values="220;0;0;220" keyTimes="0;0.5;0.85;1" dur="6s" repeatCount="indefinite"/></path><circle cx="206" cy="22" r="7" fill="#FFD166"><animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.45;0.55;0.85;1" dur="6s" repeatCount="indefinite"/></circle><path d="M30 104 L44 104 L42 86 L32 86 Z" fill="none" stroke="#5FD8FF" stroke-width="2" stroke-linejoin="round"/>',
  heatmap:[0, 1, 2].map(r => [0, 1, 2, 3].map(c => { const col = ['#5FD8FF', '#4CD3C2', '#FFD166'][(r + c) % 3], o = [0.3, 0.6, 0.45, 0.75][(r * 2 + c) % 4], blink = (r + c) % 3 === 0;
    return `<rect x="${48 + c * 36}" y="${22 + r * 28}" width="30" height="22" rx="3" fill="${col}" opacity="${o}">${blink ? `<animate attributeName="opacity" values="${o};0.95;${o}" dur="4s" begin="${(r + c) * 0.7}s" repeatCount="indefinite"/>` : ''}</rect>`; }).join('')).join(''),
  network:'<path d="M60 40 L120 64 L180 40 M60 92 L120 64 L180 92" stroke="#2E4A63" stroke-width="2" fill="none"/><circle r="4" fill="#FFD166"><animateMotion dur="3s" repeatCount="indefinite" path="M60 40 L120 64 L180 92"/></circle><circle r="4" fill="#5FD8FF"><animateMotion dur="3s" begin="1.5s" repeatCount="indefinite" path="M60 92 L120 64 L180 40"/></circle>' + [[60, 40, '#5FD8FF', 9], [60, 92, '#5FD8FF', 9], [120, 64, '#FFD166', 12], [180, 40, '#4CD3C2', 9], [180, 92, '#4CD3C2', 9]].map(([x, y, c, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#0E2232" stroke="${c}" stroke-width="2"/>`).join(''),
  timeline:'<line x1="30" y1="70" x2="210" y2="70" stroke="#2E4A63" stroke-width="2"/>' + [48, 84, 120, 156, 192].map(x => `<circle cx="${x}" cy="70" r="4" fill="#5E7488"/>`).join('') + '<rect x="36" y="38" width="24" height="22" rx="4" fill="#7FD6A0"><animate attributeName="x" values="36;180;36" dur="7s" repeatCount="indefinite"/></rect>',
  race:'<rect x="40" y="34" width="60" height="16" rx="8" fill="#B794F6"><animate attributeName="width" values="10;90;90;10" keyTimes="0;0.4;0.9;1" dur="5s" repeatCount="indefinite"/></rect><rect x="40" y="70" width="60" height="16" rx="8" fill="#5FD8FF"><animate attributeName="width" values="10;160;160;10" keyTimes="0;0.7;0.9;1" dur="5s" repeatCount="indefinite"/></rect>',
  sooner:'<line x1="30" y1="66" x2="210" y2="66" stroke="#2E4A63" stroke-width="2"/><circle cx="176" cy="66" r="8" fill="none" stroke="#8FA6B8" stroke-width="2" stroke-dasharray="3 3"/><circle cx="176" cy="66" r="8" fill="#FFD166"><animate attributeName="cx" values="176;96;96;176" keyTimes="0;0.5;0.85;1" dur="6s" repeatCount="indefinite"/></circle><path d="M160 40 L104 40 M112 34 L104 40 L112 46" fill="none" stroke="#FFD166" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>',
  slipping:'<line x1="30" y1="66" x2="210" y2="66" stroke="#2E4A63" stroke-width="2"/><circle cx="90" cy="66" r="8" fill="none" stroke="#8FA6B8" stroke-width="2" stroke-dasharray="3 3"/><circle cx="90" cy="66" r="8" fill="#FF8A7A"><animate attributeName="cx" values="90;170;170;90" keyTimes="0;0.5;0.85;1" dur="6s" repeatCount="indefinite"/></circle>',
  coins:'<ellipse cx="110" cy="96" rx="26" ry="7" fill="#C99A2E"/><ellipse cx="110" cy="88" rx="26" ry="7" fill="#FFD166"/>' + [[80, 0.2], [72, 0.45], [64, 0.7]].map(([y, t], k) => `<ellipse cx="110" cy="${y}" rx="26" ry="7" fill="${k % 2 ? '#FFD166' : '#C99A2E'}" opacity="0"><animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;${t - 0.05};${t};0.85;1" dur="5s" repeatCount="indefinite"/></ellipse>`).join('') + '<path d="M166 96 L166 62 L176 62 L176 96 Z M162 62 L180 62" fill="none" stroke="#5FD8FF" stroke-width="2"/>',
  newdots:'<circle cx="70" cy="60" r="5" fill="#5E7488"/><circle cx="100" cy="40" r="5" fill="#5E7488"/><circle cx="130" cy="74" r="5" fill="#5E7488"/><circle cx="176" cy="44" r="5" fill="#5E7488"/>' + [[152, 58, 0], [196, 76, 0.3], [90, 86, 0.55]].map(([x, y, t]) => `<circle cx="${x}" cy="${y}" r="0" fill="#4CD3C2"><animate attributeName="r" values="0;0;8;6;0" keyTimes="0;${t};${t + 0.15};0.85;1" dur="5s" repeatCount="indefinite"/></circle>`).join('')
};
const pic = kind => `<svg class="tpic" aria-hidden="true" viewBox="0 0 240 120" preserveAspectRatio="xMidYMid slice">${PICS[kind] || PICS.bars}</svg>`;
/* where each tour and question sits, and its picture; anything new falls into a sensible section with a default picture */
const TOUR_SECTIONS = [['week', 'Fresh this week', ['week', 'cleanweek']], ['big', 'The big picture, AI for clean energy and security', ['gap', 'horizon', 'secure', 'fortune']], ['how', 'How it works', ['charthow', 'how']]];
const TOUR_PIC = {gap:'arcs', week:'bars', cleanweek:'turbine', horizon:'radar', secure:'shield', fortune:'climb', charthow:'heatmap', how:'network'};
const Q_SECTIONS = [['AI for clean energy', ['clean-ai', 'clean-next']], ['Speed of change', ['ai-faster', 'fields']], ['What is coming', ['whatif', 'slips']], ['Security, people and this week', ['security', 'fortune', 'changed']]];
const Q_PIC = {'clean-ai':'turbine', 'clean-next':'timeline', 'ai-faster':'race', fields:'heatmap', security:'shieldgap', whatif:'sooner', slips:'slipping', fortune:'coins', changed:'newdots'};
/* tiles or a carousel, chosen separately for Learn's tours and for Ask; tiles by default. The choice is kept in
   My file (view) and, as the one setting the app keeps in the browser, in local storage. */
const LAYOUT_KEY = 'sg.doorLayouts';
function savedLayouts(){ try { return JSON.parse(localStorage.getItem(LAYOUT_KEY) || '{}') || {}; } catch (e) { return {}; } }
function layoutOf(page){ const v = view[page + 'Layout'] || savedLayouts()[page]; return v === 'carousel' ? 'carousel' : 'tiles'; }
function setLayout(page, v){
  view[page + 'Layout'] = v;
  try { const s = savedLayouts(); s[page] = v; localStorage.setItem(LAYOUT_KEY, JSON.stringify(s)); } catch (e) { /* storage may be off: My file still keeps it */ }
  if (page === 'learn') renderLearn(); else renderAsk();
  syncLayouts(); quietPics(); arrive();
}
function syncLayouts(){ document.querySelectorAll('.wlayout').forEach(g => { const v = layoutOf(g.dataset.page); g.querySelectorAll('[data-lay]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lay === v))); }); }
function group(tiles, mode, cls){
  return mode === 'carousel'
    ? `<div class="orbit"><div class="ostage" tabindex="0" role="region" aria-roledescription="carousel" aria-label="Swipe or use the arrow keys to turn"><div class="ofloor" aria-hidden="true"></div>${tiles}</div><div class="onav"><button class="wcarbtn" data-dir="-1" aria-label="Previous">‹</button><div class="oinfo"><span class="olabel" aria-live="polite"></span><span class="odots"></span></div><button class="wcarbtn" data-dir="1" aria-label="Next">›</button></div><p class="ohint">Drag or swipe to turn · select a card at the side to bring it forward</p></div>`
    : `<div class="wtiles ${cls}">${tiles}</div>`;
}
/* the orbit: cards travel round an oval track, always facing you, larger at the front */
function orbitCards(o){ return [...o.querySelectorAll('.ostage > .wtile')]; }
function layoutOrbit(o, instant){
  const cards = orbitCards(o), n = cards.length; if (!n) return;
  const st = o.querySelector('.ostage'), w = st.clientWidth || 900, s = 360 / n, a = o._a || 0;
  const RX = Math.min(440, w * (w < 600 ? 0.3 : 0.36)), RY = w < 600 ? 50 : 78;
  const front = ((Math.round(a / s) % n) + n) % n;
  st.classList.toggle('dragging', !!instant);
  cards.forEach((c, i) => {
    let rel = i * s - a; rel = ((rel % 360) + 540) % 360 - 180;
    const r = rel * Math.PI / 180, cs = Math.cos(r), sc = 0.48 + 0.52 * (cs + 1) / 2;
    c.style.transform = `translate(-50%, -50%) translate(${(Math.sin(r) * RX).toFixed(1)}px, ${(cs * RY - 8).toFixed(1)}px) scale(${sc.toFixed(3)})`;
    c.style.opacity = (0.3 + 0.7 * (cs + 1) / 2).toFixed(3); c.style.zIndex = Math.round((cs + 1) * 100);
    c.classList.toggle('ofront', i === front); c.tabIndex = i === front ? 0 : -1; c.setAttribute('aria-hidden', String(i !== front));
  });
  const k = cards[front].querySelector('.wkick');
  o.querySelector('.olabel').textContent = `${k ? k.textContent + ' · ' : ''}${front + 1} of ${n}`;
  const dots = o.querySelector('.odots');
  if (dots.children.length !== n) dots.innerHTML = cards.map((c, i) => `<button class="odot" data-i="${i}" aria-label="Card ${i + 1}"></button>`).join('');
  [...dots.children].forEach((d, i) => d.classList.toggle('on', i === front));
}
function turnOrbitTo(o, i){ const n = orbitCards(o).length, s = 360 / n; let d = i * s - (o._a || 0); d = ((d % 360) + 540) % 360 - 180; o._a = (o._a || 0) + d; layoutOrbit(o); }
function stepOrbit(o, dir){ const n = orbitCards(o).length, s = 360 / n; o._a = Math.round((o._a || 0) / s) * s + dir * s; layoutOrbit(o); }
function initOrbits(){
  document.querySelectorAll('#welcome .orbit').forEach(o => {
    if (o._ready) { layoutOrbit(o, true); return; }
    o._ready = true; o._a = 0; const st = o.querySelector('.ostage');
    layoutOrbit(o, true); requestAnimationFrame(() => layoutOrbit(o));
    let x0 = null, a0 = 0, moved = 0;
    st.addEventListener('pointerdown', e => { if (e.button) return; x0 = e.clientX; a0 = o._a || 0; moved = 0; });
    st.addEventListener('pointermove', e => { if (x0 === null) return; const dx = e.clientX - x0; moved = Math.max(moved, Math.abs(dx)); if (moved > 4) { o._a = a0 - dx * 0.3; layoutOrbit(o, true); } });
    const end = () => { if (x0 === null) return; x0 = null; if (moved > 4) { const s = 360 / orbitCards(o).length; o._a = Math.round(o._a / s) * s; layoutOrbit(o); } };
    st.addEventListener('pointerup', end); st.addEventListener('pointerleave', end); st.addEventListener('pointercancel', end);
    /* a drag is not a click; a card at the side or back comes forward instead of opening */
    st.addEventListener('click', e => { const c = e.target.closest('.wtile'); if (!c) return;
      if (moved > 4) { e.preventDefault(); e.stopPropagation(); moved = 0; return; }
      if (!c.classList.contains('ofront')) { e.preventDefault(); e.stopPropagation(); turnOrbitTo(o, orbitCards(o).indexOf(c)); } }, true);
    st.addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); stepOrbit(o, e.key === 'ArrowLeft' ? -1 : 1); } });
    o.querySelector('.odots').addEventListener('click', e => { const d = e.target.closest('.odot'); if (d) turnOrbitTo(o, +d.dataset.i); });
  });
}
function syncCars(){ initOrbits(); }
addEventListener('resize', () => setTimeout(() => document.querySelectorAll('#welcome .orbit').forEach(o => layoutOrbit(o, true)), 100));
document.addEventListener('click', e => {
  const lay = e.target.closest('.wlayout [data-lay]'); if (lay) { setLayout(lay.closest('.wlayout').dataset.page, lay.dataset.lay); return; }
  const nav = e.target.closest('.orbit .wcarbtn'); if (nav) stepOrbit(nav.closest('.orbit'), +nav.dataset.dir);
});
function renderLearn(){
  const tours = TOUR_LIST.filter(t => t.ready), placed = new Set(), html = [], carousel = [];
  TOUR_SECTIONS.forEach(([key, label, ids], k) => {
    let list = tours.filter(t => ids.includes(t.id));
    if (key === 'big') list = list.concat(tours.filter(t => !TOUR_SECTIONS.some(s => s[2].includes(t.id))));   // new tours join the big picture
    list.forEach(t => placed.add(t.id)); if (!list.length) return;
    const card = (t, n) => { const up = tourUpdatedLabel(t.id);
      return `<button class="wcard wtile" data-tour="${t.id}" style="--i:${n}">${pic(TOUR_PIC[t.id])}<span class="wtb">${up ? `<span class="wbadge">Updated ${chEsc(up)}</span>` : ''}${key !== 'week' && layoutOf('learn') === 'carousel' ? `<span class="wkick">${esc(label)}</span>` : ''}<b>${esc(t.title)}</b><span>${esc(t.blurb)}</span><em>▶ ${up ? 'about 2 minutes' : '1 to 2 minutes'}</em></span></button>`; };
    if (key === 'week' || layoutOf('learn') === 'tiles') html.push(`<h2 class="wsec">${esc(label)}</h2>` + group(list.map(card).join(''), 'tiles', key === 'week' ? 'wide' : ''));   // this week's analyses always stay as tiles
    else carousel.push(...list.map(card));
  });
  if (carousel.length) html.push('<h2 class="wsec">The tours</h2>' + group(carousel.join(''), 'carousel'));   // one carousel, each card naming its section
  $('wCards').innerHTML = html.join(''); syncCars();
}
function renderAsk(){
  const byId = Object.fromEntries(QUESTIONS.map(q => [q.id, q])), shown = new Set(), html = [];
  const sections = Q_SECTIONS.map(([label, ids]) => [label, ids.filter(id => byId[id])]);
  const rest = QUESTIONS.filter(q => !Q_SECTIONS.some(s => s[1].includes(q.id))).map(q => q.id);   // new questions get their own section
  if (rest.length) sections.push(['More questions', rest]);
  const car = layoutOf('ask') === 'carousel', all = [];
  sections.forEach(([label, ids]) => { if (!ids.length) return;
    const cards = ids.map(id => { shown.add(id); const q = byId[id];
      return `<button class="wtile qtile" data-q="${id}" style="--i:${shown.size}">${pic(Q_PIC[id])}<span class="wtb">${car ? `<span class="wkick">${esc(label)}</span>` : ''}<b>${esc(q.q)}</b><span>${esc(q.see)}</span><em class="wshow">Show me</em></span></button>`; });
    if (car) all.push(...cards); else html.push(`<h2 class="wsec">${esc(label)}</h2>` + group(cards.join(''), 'tiles', 'three')); });
  if (car) html.push(group(all.join(''), 'carousel'));   // one carousel to spin through, each card naming its section
  $('wQList').innerHTML = html.join(''); syncCars();
}
function quietPics(){ if (matchMedia('(prefers-reduced-motion: reduce)').matches) document.querySelectorAll('#welcome svg.tpic').forEach(s => { try { s.pauseAnimations(); } catch (e) { /* older browsers */ } }); }
/* the three pages of the welcome screen */
function wGo(page){
  ['doors', 'learn', 'ask'].forEach(p => { $('wp-' + p).hidden = p !== page; });
  $('welcome').dataset.page = page; $('welcome').scrollTop = 0;
  if (page === 'learn') renderLearn(); if (page === 'ask') renderAsk(); syncLayouts();
  quietPics();
  const h = $('wp-' + page).querySelector('h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({preventScroll:true}); }
}
function syncDoors(){
  const fromApp = !!tour.returnTo;   // opened from inside the tool: offer the way back
  document.querySelectorAll('.wbacktool').forEach(b => { b.hidden = !fromApp; });
  $('wLearnCount').textContent = `${TOUR_LIST.filter(t => t.ready).length} tours · 1 to 2 minutes`;
  $('wAskCount').textContent = `${QUESTIONS.length} questions · ${Q_SECTIONS.length} topics`;
  const live = items.filter(it => !it.removed && !it.aud), yrs = live.map(it => it.r).filter(Number.isFinite);
  $('wExploreCount').textContent = `${live.length} milestones · ${Math.min(...yrs)} to ${YEND}`;
}
/* entering through a door: it opens out to fill the screen in its colour, and the new space settles in */
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function arrive(){ const w = $('welcome'); w.classList.remove('arriving'); void w.offsetWidth; w.classList.add('arriving'); clearTimeout(arrive.t); arrive.t = setTimeout(() => w.classList.remove('arriving'), 1400); }
function enterDoor(door, go){
  if (calm() || !door) { go(); arrive(); return; }
  const r = door.getBoundingClientRect(), p = document.createElement('div');
  p.className = 'wportal'; p.style.setProperty('--dc', getComputedStyle(door).getPropertyValue('--dc'));
  Object.assign(p.style, {left:r.left + 'px', top:r.top + 'px', width:r.width + 'px', height:r.height + 'px'});
  document.body.appendChild(p); $('welcome').classList.add('leaving');
  requestAnimationFrame(() => requestAnimationFrame(() => { p.classList.add('open'); Object.assign(p.style, {left:'0px', top:'0px', width:innerWidth + 'px', height:innerHeight + 'px'}); }));
  setTimeout(() => { $('welcome').classList.remove('leaving'); go(); arrive(); p.classList.add('fade'); setTimeout(() => p.remove(), 560); }, 470);
}
$('wLearn').onclick = () => { if (aiAcked) enterDoor($('wLearn'), () => wGo('learn')); };
$('wQuestions').onclick = () => { if (aiAcked) enterDoor($('wQuestions'), () => wGo('ask')); };
$('wRun').onclick = () => { if (aiAcked) enterDoor($('wRun'), () => closeWelcome(true)); };
document.querySelectorAll('.wdoorsback').forEach(b => { b.onclick = () => { wGo('doors'); arrive(); }; });
document.querySelectorAll('.wbacktool').forEach(b => { b.onclick = () => closeWelcome(true); });
$('wQList').addEventListener('click', e => { const t = e.target.closest('.qtile'); if (t && aiAcked) askFromDoors(t.dataset.q); });
/* a question arrives calmly: no century playing, no reset to the default view first, nothing popping up */
function askFromDoors(id){
  clearTimeout(welcomeTimer); $('welcome').classList.remove('on'); tour.returnTo = null;
  if (state.playing) stopPlay();
  askQuestion(id); showDisc();
}
/* ---------- in the tool: Home, the Questions menu, and the breadcrumb ---------- */
$('homeBtn').onclick = () => { closeDrops(); if (tour.on) endTour('escape'); tour.returnTo = JSON.parse(JSON.stringify(snapshot('before-home'))); showWelcome('doors'); };
function openAllQuestions(){ closeDrops(); if (tour.on) endTour('escape'); tour.returnTo = JSON.parse(JSON.stringify(snapshot('before-questions'))); showWelcome('ask'); }
DROPS.questionsBtn = 'questionsMenu';
function renderQuestionsMenu(){
  const byId = Object.fromEntries(QUESTIONS.map(q => [q.id, q])), short = s => s.length > 64 ? s.slice(0, 62).replace(/\s+\S*$/, '') + '…' : s;
  const groups = Q_SECTIONS.map(([label, ids]) => [label, ids.filter(id => byId[id])]).concat([['More questions', QUESTIONS.filter(q => !Q_SECTIONS.some(s => s[1].includes(q.id))).map(q => q.id)]]).filter(g => g[1].length);
  $('questionsMenu').innerHTML = groups.map(([label, ids]) => `<div class="wmh">${esc(label)}</div>` + ids.map(id => `<button role="menuitem" data-qm="${id}" class="${view.question === id ? 'cur' : ''}">${view.question === id ? '✓ ' : ''}${esc(short(byId[id].q))}</button>`).join('')).join('')
    + '<hr><button role="menuitem" data-qm="__all" class="qall">All questions, with pictures →</button>';
}
$('questionsBtn').onclick = e => { e.stopPropagation(); const open = !$('questionsMenu').classList.contains('open'); closeDrops(); if (open) { renderQuestionsMenu(); placeDrop('questionsBtn', 'questionsMenu'); $('questionsMenu').classList.add('open'); $('questionsBtn').setAttribute('aria-expanded', true); } };
$('questionsMenu').addEventListener('click', e => { e.stopPropagation(); const b = e.target.closest('[data-qm]'); if (!b) return; closeDrops();
  if (b.dataset.qm === '__all') openAllQuestions(); else { if (state.playing) stopPlay(); askQuestion(b.dataset.qm); } });
function syncCrumb(){
  const Q = view.question && QUESTIONS.find(q => q.id === view.question), b = $('crumbBtn');
  b.hidden = !Q; if (Q) { const t = Q.q.length > 48 ? Q.q.slice(0, 46).replace(/\s+\S*$/, '') + '…' : Q.q; b.innerHTML = `<span class="crumbask">Ask</span> › ${esc(t)}`; b.title = 'All questions'; }
}
$('crumbBtn').onclick = openAllQuestions;
setInterval(syncCrumb, 700);
/* the answer's own way on: back to the questions, or the next one */
function nextQuestion(){ const i = QUESTIONS.findIndex(q => q.id === view.question); const n = QUESTIONS[(i + 1) % QUESTIONS.length]; if (state.playing) stopPlay(); askQuestion(n.id); }
$('qInsight').addEventListener('click', e => { if (e.target.id === 'qiAll') openAllQuestions(); else if (e.target.id === 'qiNext') nextQuestion(); });
