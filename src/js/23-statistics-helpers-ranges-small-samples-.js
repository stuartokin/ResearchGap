/* ==================================================================
 *  STATISTICS HELPERS: ranges, small samples, unfinished research (survival analysis)
 * ================================================================== */
function quantile(a, q){ if (!a.length) return null; const s = a.slice().sort((x, y) => x - y), pos = (s.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos); return s[lo] + (s[hi] - s[lo]) * (pos - lo); }
/* Kaplan-Meier median: research still in progress counts as "at least this many years so far" */
function kmMedian(done, running){
  const all = done.map(t => [t, 1]).concat(running.map(t => [t, 0])).sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  let n = all.length, S = 1;
  for (let i = 0; i < all.length;) {
    const t = all[i][0]; let d = 0, c = 0;
    while (i < all.length && all[i][0] === t) { all[i][1] ? d++ : c++; i++; }
    if (d) { S *= 1 - d / n; if (S <= .5) return {m:t}; }
    n -= d + c;
  }
  return all.length ? {gt:Math.max(...all.map(x => x[0]))} : null;
}
const METRICS = {
  first:{label:'Research to first product', value:it => it.kind === 'hist' ? it.lag : null, landKey:it => it.p},
  adopt:{label:'First product to mainstream adoption', value:it => it.kind === 'hist' && it.adopt && it.adopt <= NOW ? it.adopt - it.p : null, landKey:it => it.adopt},
  total:{label:'Research to mainstream adoption', value:it => it.kind === 'hist' && it.adopt && it.adopt <= NOW ? it.adopt - it.r : null, landKey:it => it.adopt}
};
const REGIONS = {}; (DB.regions || []).forEach(r => { REGIONS[r.id] = r.name; });
const VERS = {'source-cited':'Source-cited', 'ai-compiled':'AI-compiled', 'ai-estimate':'AI estimate'};
const TAGS = {}; (DB.tagVocabulary || []).forEach(t => { TAGS[t] = t.charAt(0).toUpperCase() + t.slice(1).replace(/-/g, ' ').replace('Ai models', 'AI models'); });

