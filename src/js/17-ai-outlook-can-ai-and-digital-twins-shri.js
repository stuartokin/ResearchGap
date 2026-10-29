/* ==================================================================
 *  AI OUTLOOK: CAN AI AND DIGITAL TWINS SHRINK THE GAP?
 * ================================================================== */
function fmtY(v){ return v < 3 ? String(Math.round(v * 10) / 10) : String(Math.round(v)); }
function fmtR(a, b){ return fmtY(a) === fmtY(b) ? fmtY(a) : `${fmtY(a)}–${fmtY(b)}`; }
function recentMedianFor(test){
  let set = items.filter(it => it.kind === 'hist' && !it.co && test(it) && it.r >= 2000);
  if (set.length < 3) set = items.filter(it => it.kind === 'hist' && !it.co && test(it) && it.r >= 1990);
  return set.length ? {m:median(set.map(it => it.lag)), n:set.length} : null;
}
function scenario(){
  const per = FKEYS.filter(k => F.fields.has(k) && ACCEL[k]).map(k => ({k, r:recentMedianFor(it => it.v === k && F.src[it.s])})).filter(x => x.r);
  if (!per.length) return null;
  const pool = items.filter(it => it.kind === 'hist' && !it.co && F.fields.has(it.v) && F.src[it.s] && it.r >= 2000);
  const base = pool.length >= 3 ? median(pool.map(it => it.lag)) : median(per.map(x => x.r.m));
  let w = 0, lo = 0, hi = 0;
  per.forEach(x => { w += x.r.n; lo += ACCEL[x.k].lo * x.r.n; hi += ACCEL[x.k].hi * x.r.n; });
  return {base, lo:base * lo / w, hi:base * hi / w, per};
}
function scenAt(sc, y){ const t = clamp((y - NOW) / 10, 0, 1); return {lo:sc.base - (sc.base - sc.lo) * t, hi:sc.base - (sc.base - sc.hi) * t}; }
const POLICY_ARCS = new Set(DATA.filter(d => d.policy).map(d => d.t));
const AI_RX = /\bAI\b|machine learning|machine-learning|reinforcement|neural|AI-/;
const isAIDriven = it => !!it.acc || AI_RX.test(it.t) || AI_RX.test(it.rw);
function renderOutlook(){
  const sc = scenario();
  { // Like-for-like: technology arcs only (policy and regulatory arcs excluded); AI identified consistently
    const sel = it => F.fields.has(it.v) && F.src[it.s] && !POLICY_ARCS.has(it.t);
    const fut = items.filter(it => it.kind === 'proj' && it.r >= 2015 && sel(it)), past = items.filter(it => it.kind === 'hist' && !it.co && it.r >= 2010 && sel(it));
    const fa = fut.filter(isAIDriven), fc = fut.filter(it => !isAIDriven(it)), pa = past.filter(isAIDriven), pc = past.filter(it => !isAIDriven(it));
    const m = a => fmtY(median(a.map(it => it.lag)));
    let h = '';
    if (pa.length && pc.length) h += `Already landed (research since 2010): <b>${m(pa)} years</b> where AI drives the work (${pa.length}), <b>${m(pc)} years</b> otherwise (${pc.length}). `;
    if (fa.length && fc.length) h += `Outlook to ${YEND} (research since 2015): <b>${m(fa)} years</b> with AI (${fa.length}), <b>${m(fc)} years</b> conventional (${fc.length}).`;
    $('olAI').innerHTML = h ? h + ' <span>Technology arcs only; outlook years are estimates, not forecasts.</span>' : ''; }
  $('olHead').textContent = sc ? `For the selected fields, research begun since 2000 has taken a median of ${fmtY(sc.base)} years to reach change. With AI and digital twins compressing discovery, design and testing, a plausible range for research starting now is ${fmtR(sc.lo, sc.hi)} years.` : 'Select at least one field to see the outlook.';
  $('olList').innerHTML = FKEYS.filter(k => F.fields.has(k)).map(k => {
    const r = recentMedianFor(it => it.v === k && F.src[it.s]); if (!r) return '';
    if (!ACCEL[k]) return '';
    const A = ACCEL[k], lo = Math.max(.5, r.m * A.lo), hi = r.m * A.hi, sc25 = v => Math.min(100, v / 25 * 100);
    return `<div class="olrow"><div class="olh"><i style="background:${FIELDS[k].hex}"></i><b>${FIELDS[k].name}</b><span>${fmtY(r.m)} → ${fmtR(lo, hi)} years</span></div>
      <div class="olbar"><div class="b" style="width:${sc25(r.m)}%"></div><div class="a" style="left:${sc25(lo)}%;width:${Math.max(1, sc25(hi) - sc25(lo))}%"></div></div>
      <p><strong>AI speeds up:</strong> ${A.speeds}. <strong>Still limits:</strong> ${A.limits}.</p></div>`;
  }).join('');
}

