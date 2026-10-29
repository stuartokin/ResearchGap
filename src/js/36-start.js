/* ==================================================================
 *  START
 * ================================================================== */
$('scrub').min = Y0; $('scrub').max = Y1; $('fromR').min = $('toR').min = Y0; $('fromR').max = $('toR').max = YEND; $('toR').value = YEND; $('toV').textContent = YEND;
$('yearSub').textContent = `Press Play to run from ${Y0} to ${YEND}`;
$('verLine').textContent = `App version ${APP_VERSION}. Data revision ${DB.meta.revision}, as of ${DATA_AS_OF}.`;
(function updateNotice(){
  const ukDate = iso => new Date(iso.slice(0, 10) + 'T12:00:00Z').toLocaleDateString('en-GB', {day:'numeric', month:'long', year:'numeric'});
  const last = (DB.meta.lastAgentRun || DATA_AS_OF).slice(0, 10);
  const days = Math.floor((Date.now() - new Date(last + 'T12:00:00Z').getTime()) / 86400000);
  const ago = days < 1 ? 'today' : days === 1 ? 'yesterday' : days < 14 ? `${days} days ago` : days < 60 ? `${Math.round(days / 7)} weeks ago` : `${Math.round(days / 30)} months ago`;
  const stale = days > 30;
  const line = `${stale ? '<span class="stale">⚠ ' : ''}Data last updated <b>${ukDate(last)}</b> (${ago})${stale ? '; weekly updates may have paused</span>' : ''}. Data revision ${DB.meta.revision}. App version ${APP_VERSION}. Created by <b>Stuart Okin</b>.`;
  $('discMeta').innerHTML = line; $('aboutMeta').innerHTML = line;
  $('citeLine').textContent = `Okin, S. (${DATA_AS_OF.slice(0, 4)}) The Shrinking Gap from Research to Change. Interactive model, version ${APP_VERSION}, data revision ${DB.meta.revision} (updated ${ukDate(last)}). ${location.protocol.indexOf('http') === 0 ? location.origin + location.pathname : ''}`.trim();
})();
(function dataStatus(){
  const ms = DB.milestones, c = v => ms.filter(m => m.provenance.verification === v).length;
  $('dataStatus').innerHTML = `<div><b>${ms.length}</b><span>milestones</span></div><div><b>${c('source-cited')}</b><span>source-cited</span></div><div><b>${c('ai-compiled')}</b><span>AI-compiled</span></div><div><b>${c('ai-estimate')}</b><span>AI estimates</span></div><div><b>${DATA_AS_OF}</b><span>data as of</span></div><div><b>${DB.meta.lastAgentRun ? DB.meta.lastAgentRun.slice(0, 10) : 'Not yet'}</b><span>last agent run</span></div>`;
  const log = (DB.meta.changelog || []).slice(-12).reverse();
  const titleOf = id => { const m = DB.milestones.find(x => x.id === id); return m ? m.title : id; };
  const tidy = d => esc(d.replace(/^([a-z0-9-]+): /, (all, id) => DB.milestones.some(x => x.id === id) ? titleOf(id) + ': ' : all).replace(/^(re-estimated|disputed): ([a-z0-9-]+)/, (all, k, id) => `${k}: ${titleOf(id)}`));
  $('changeLog').innerHTML = log.length ? log.map(e => e.details && e.details.length
    ? `<details><summary><b>${esc(e.date)}</b> ${esc(e.summary)}</summary><ul>${e.details.map(d => `<li>${tidy(d)}</li>`).join('')}</ul></details>`
    : `<p><b>${esc(e.date)}</b> ${esc(e.summary)}</p>`).join('') : '<p>No agent updates yet. The first weekly run will be listed here.</p>';
})();
$('discX').onclick = () => $('disc').classList.add('gone');
$('discAbout').onclick = () => { $('disc').classList.add('gone'); $('about').classList.add('open'); };
buildFieldList(); fillAudFields(); refresh(); syncChgUI(); applyChangeFlags(); renderChanges(); syncPlayRangeUI(); buildTicker(); attachHelp(); buildFaq(); syncPanels(); clampAll();
const pendingReport = (() => { const q = new URLSearchParams(location.search), k = q.get('report'); if (!k) return null; history.replaceState(null, '', location.pathname + location.hash); return {kind:k, title:q.get('rtitle') || ''}; })();   // then a refresh opens normally
if (pendingReport) {   // the visitor asked to reload for newer data and create a report: do that, without the welcome screen
  showDisc(); setOpen('report', true); if (pendingReport.title) $('repTitle').value = pendingReport.title;
  setTimeout(() => { $('repMsg').textContent = 'Reloaded with the latest data. Creating your report…'; (pendingReport.kind === 'desnz' ? generateDesnzSlide : generateReport)(); }, 1500);
} else if (new URLSearchParams(location.search).get('welcome') === '0') showDisc(); else showWelcome();   // the welcome screen opens on every load (welcome=0 is for automated tests)
[['title', 'titleCfgBtn'], ['ticker', 'tickCfgBtn']].forEach(([w, b]) => { const h = wins[w].querySelector('.wh'), btn = $(b); if (h && btn) { h.insertBefore(btn, h.querySelector('button')); btn.classList.add('inhead'); } }); applyLite(); applyHeader(); computeLaneLayout(); applyLanes(true); applyColours(); refresh(); setAutoRotate(state.autoRotate); syncVideos(); applyTitle(); applyTicker(); syncMusic();
function startMusicIfWanted(){
  if (!view.musicOn || !music.paused) return;
  const pr = music.play();
  if (pr && pr.catch) pr.catch(() => {
    // Autoplay with sound blocked: start on the first click or key press anywhere
    const go = () => { if (view.musicOn && music.paused) music.play().catch(() => {}); document.removeEventListener('pointerdown', go, true); document.removeEventListener('keydown', go, true); };
    document.addEventListener('pointerdown', go, true); document.addEventListener('keydown', go, true);
  });
}
if (!new URLSearchParams(location.search).get('view')) startMusicIfWanted();
{ const vp = new URLSearchParams(location.search).get('view'); if (vp) fetch(vp).then(r => r.json()).then(applyView).catch(() => {}); }
if (location.hash.length > 1) setTimeout(() => applyLinkState(location.hash), 200);
$('floorT').dispatchEvent(new Event('change'));
frame();
requestAnimationFrame(() => {
  $('loading').classList.add('done');
  camGoal = {pos:HOME.pos.clone(), target:HOME.target.clone()};
  if (!reduced && !new URLSearchParams(location.search).get('view')) setTimeout(playWithCountdown, 700);
});
}
const fontsReady = (document.fonts && document.fonts.ready) ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2000))]) : Promise.resolve();
/* Data: the snapshot embedded at build time works offline; when served online, a newer data/data.json is used instead */
const dataReady = (async () => {
  const embedded = JSON.parse(document.getElementById('embedded-data').textContent.replace('/*DATA-START*/', '').replace('/*DATA-END*/', '').trim());
  if (location.protocol.indexOf('http') === 0) {
    try {
      const r = await fetch('data/data.json', {cache:'no-cache'});
      if (r.ok) { const d = await r.json(); if (d && d.meta && d.milestones && (d.meta.revision || 0) >= (embedded.meta.revision || 0)) return d; }
    } catch (e) { /* offline or blocked: use the snapshot */ }
  }
  return embedded;
})();
const hasGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); } catch (e) { return false; } })();
Promise.all([fontsReady, dataReady]).then(([, db]) => {
  window.__DB = db;
  if (!hasGL) { document.getElementById('nogl').classList.add('on'); document.getElementById('loading').classList.add('done'); return; }
  boot();
});
