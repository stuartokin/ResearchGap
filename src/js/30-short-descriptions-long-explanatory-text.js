/* ==================================================================
 *  SHORT DESCRIPTIONS: long explanatory text shows its first few words and an (i) button for the rest
 * ================================================================== */
const CLAMP_SEL = '.wbody p.note-s, #w-outlook .wbody p:not(.insight):not(.fbanner):not(.note-s)';
const clampFull = new WeakMap();
function clampText(el){
  if (view.fullText || el.closest('.cfg, #detailBody, .faqi') || el.querySelector(':scope > .infob')) return;
  if (el.matches('#repMsg, [role="status"], [aria-live]') || el.querySelector('button, input, select')) return;   // status messages and anything with controls stay in full
  const txt = el.textContent.replace(/\s+/g, ' ').trim(); if (txt.length < 100) return;
  clampFull.set(el, el.innerHTML);
  const lead = txt.split(' ').slice(0, 8).join(' ').replace(/[,;:.–-]+$/, '');
  el.classList.add('tclamp'); el.classList.remove('topen');
  el.innerHTML = `<span class="tlead">${esc(lead)}…</span><button class="infob" type="button" aria-expanded="false" title="Read the full text" aria-label="Read the full text">i</button>`;
}
function clampAll(){ document.querySelectorAll(CLAMP_SEL).forEach(clampText); }
function unclampAll(){ document.querySelectorAll('.tclamp').forEach(el => { if (clampFull.has(el)) el.innerHTML = clampFull.get(el); el.classList.remove('tclamp', 'topen'); }); }
document.addEventListener('click', e => {
  const b = e.target.closest('.infob'); if (!b) return;
  e.preventDefault(); e.stopPropagation();
  const el = b.parentElement;
  if (b.getAttribute('aria-expanded') !== 'true') {
    el.innerHTML = clampFull.get(el) + ' <button class="infob on" type="button" aria-expanded="true" title="Show less" aria-label="Show less">i</button>';
    el.classList.add('topen');
  } else { el.innerHTML = clampFull.get(el); el.classList.remove('topen'); clampText(el); }
}, true);
let clampTimer = 0;
new MutationObserver(() => { if (!clampTimer) clampTimer = setTimeout(() => { clampTimer = 0; clampAll(); }, 100); }).observe(document.body, {childList:true, subtree:true});   // throttled, so a steady stream of updates cannot starve it
$('fullTextT').addEventListener('change', e => { view.fullText = e.target.checked; if (view.fullText) unclampAll(); else clampAll(); });

