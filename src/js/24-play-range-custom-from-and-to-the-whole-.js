/* ==================================================================
 *  PLAY RANGE (custom from and to; the whole century by default)
 * ================================================================== */
function playStart(){ return view.playFrom || Y0; }
function playEnd(){ return view.playTo && view.playTo < YEND ? view.playTo + 1 : Y1; }
const isCentury = () => (!view.playFrom || view.playFrom <= Y0) && (!view.playTo || view.playTo >= YEND);
function playLabel(){ return isCentury() ? 'Play the century' : `Play ${playStart()}–${playEnd() - 1}`; }
function syncPlayLabel(){ if (!state.playing) $('playBtn').textContent = playLabel(); $('cdSub').textContent = playLabel(); WIN_NAMES.player = playLabel(); }
(function fillPlayRange(){
  let f = '', t = '';
  for (let y = Y0; y <= YEND; y++) { f += `<option value="${y}">${y}</option>`; t += `<option value="${y}">${y}</option>`; }
  $('playFromS').innerHTML = f; $('playToS').innerHTML = t;
})();
function syncPlayRangeUI(){ $('playFromS').value = String(playStart()); $('playToS').value = String(playEnd() - 1); syncPlayLabel(); }
$('playFromS').addEventListener('change', e => { const v = +e.target.value; view.playFrom = v <= Y0 ? null : v; if (playEnd() - 1 < v) view.playTo = v; syncPlayRangeUI(); });
$('playToS').addEventListener('change', e => { const v = +e.target.value; view.playTo = v >= YEND ? null : v; if (playStart() > v) view.playFrom = v <= Y0 ? null : v; syncPlayRangeUI(); });
$('playCentury').onclick = () => { view.playFrom = null; view.playTo = null; syncPlayRangeUI(); };
/* Conclusion banner at the end of Play */
function headline(){
  const pool = items.filter(it => it.kind === 'hist' && shownFully(it) && !it.aud && !it.co), med = a => a.length ? median(a) : null;
  const pre = med(pool.filter(it => it.p < 1970).map(it => it.lag)), rec = med(pool.filter(it => it.p >= 2000).map(it => it.lag));
  const s10 = pool.filter(it => it.r >= 2010 && !POLICY_ARCS.has(it.t)), ai = med(s10.filter(isAIDriven).map(it => it.lag)), oth = med(s10.filter(it => !isAIDriven(it)).map(it => it.lag));   // like-for-like, as in Can AI shrink the gap?
  const ad = pool.map(METRICS.adopt.value).filter(v => v != null), adm = med(ad);
  const uk = med(pool.filter(it => it.region === 'uk').map(it => it.lag)), row = med(pool.filter(it => it.region && it.region !== 'uk' && it.region !== 'unknown').map(it => it.lag));
  return {pool, pre, rec, ai, oth, adm, adn:ad.length, uk, row, ukn:pool.filter(it => it.region === 'uk').length};
}
let conclusionShown = false;
function showConclusion(){
  if (view.conclusion === false || conclusionShown) return; conclusionShown = true;
  const h = headline(), f = v => v == null ? '–' : fmtY(v);
  $('spotT').textContent = `From research to change: ${f(h.pre)} years before 1970, ${f(h.rec)} years since 2000`;
  $('spotS').textContent = `AI-driven work since 2010: ${f(h.ai)} years against ${f(h.oth)} for everything else.${h.adm != null ? ` Mainstream adoption takes a further ${f(h.adm)} years.` : ''}`;
  const sp = $('spot'); sp.classList.remove('chg'); sp.classList.add('on', 'concl'); clearTimeout(chgSpotTimer);
  chgSpotTimer = setTimeout(() => sp.classList.remove('on', 'concl'), 7000);
}
$('conclT').addEventListener('change', e => { view.conclusion = e.target.checked; });
$('adoptT').addEventListener('change', e => { view.adoption = e.target.checked; });

