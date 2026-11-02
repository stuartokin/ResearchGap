/* ==================================================================
 *  THE AI-ENHANCED VERSION: the switch between the two versions, shareable links, and (in the AI-enhanced version)
 *  the banner that always says what it is, with What's new and the way back.
 * ================================================================== */
function goVersion(ai){
  if (ai === IS_AI) return;
  const q = new URLSearchParams(location.search); q.delete('ui');
  if (aiAcked) q.set('sw', $('welcome').classList.contains('on') ? 'welcome' : 'app');   // acknowledged once is enough: the other version knows
  const s = q.toString();
  location.href = (ai ? 'ai/' : '../') + (s ? '?' + s : '') + location.hash;
}
{ const u = new URLSearchParams(location.search).get('ui'); if (u === 'ai' && !IS_AI) goVersion(true); else if (u === 'standard' && IS_AI) goVersion(false); }   // ?ui=ai shares the AI-enhanced version
function syncVersionSwitch(){
  ['wvStd', 'wvAI'].forEach(id => { const b = $(id); if (b) b.setAttribute('aria-pressed', String((id === 'wvAI') === IS_AI)); });
  const s = $('uiVersionS'); if (s) s.value = IS_AI ? 'ai' : 'standard';
}
['wvStd', 'wvAI'].forEach(id => { const b = $(id); if (b) b.onclick = () => goVersion(id === 'wvAI'); });
if ($('uiVersionS')) $('uiVersionS').onchange = e => goVersion(e.target.value === 'ai');
syncVersionSwitch();
/* the banner and What's new: AI-enhanced version only */
if (IS_AI) {
  document.body.classList.add('aiversion');
  const bar = document.createElement('div'); bar.id = 'aiBanner'; bar.setAttribute('role', 'status');
  bar.innerHTML = '<span class="aigrip" title="Drag to move; double-click to put it back" aria-hidden="true">⋮⋮</span><b>✨ AI-enhanced (experimental)</b><span>Changed weekly by AI, without human review; may contain errors.</span><button class="mini" id="aiNews">What’s new</button><button class="mini" id="aiBack">Back to standard</button>';
  document.body.appendChild(bar);
  /* movable, but always kept fully on screen (it cannot be hidden); double-click puts it back; the place is kept in My file */
  const keepOnScreen = () => { if (!view.aiBannerPos) return; const r = bar.getBoundingClientRect(), x = Math.min(Math.max(4, view.aiBannerPos.x), innerWidth - r.width - 4), y = Math.min(Math.max(4, view.aiBannerPos.y), innerHeight - r.height - 4);
    Object.assign(bar.style, {left:x + 'px', top:y + 'px', bottom:'auto', transform:'none'}); };
  const resetBanner = () => { view.aiBannerPos = null; Object.assign(bar.style, {left:'', top:'', bottom:'', transform:''}); };
  let drag = null;
  bar.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; const r = bar.getBoundingClientRect(); drag = {dx:e.clientX - r.left, dy:e.clientY - r.top}; bar.setPointerCapture(e.pointerId); bar.classList.add('dragging'); e.preventDefault(); });
  bar.addEventListener('pointermove', e => { if (!drag) return; view.aiBannerPos = {x:e.clientX - drag.dx, y:e.clientY - drag.dy}; keepOnScreen(); });
  bar.addEventListener('pointerup', () => { drag = null; bar.classList.remove('dragging'); });
  bar.addEventListener('dblclick', e => { if (!e.target.closest('button')) resetBanner(); });
  addEventListener('resize', keepOnScreen);
  setTimeout(keepOnScreen, 0);
  EXT.features.core = {tabs:[], wins:[], failed:false};
  const newsId = extApi('core').addPanel({id:'whatsnew', title:'What’s new in the AI-enhanced version', render:() => {
    const feats = (AI_BUILD.features || []).map(f => { const st = (AI_BUILD.status || {})[f.id] || f.status || 'active';
      return `<li><b>${esc(f.title)}</b> <span class="note-s">added ${esc(f.added || '')}${/^paused/.test(st) ? ' · paused: it failed a check and is switched off' : ''}</span><br>${esc(f.description || '')}</li>`; }).join('');
    return `<p class="note-s">Built ${esc(AI_BUILD.built || '')}. This version is the standard app plus experimental features that an AI agent adds and improves each week, after automatic checks, without human review. Your data and settings are the same in both versions.</p>
      <div class="aiwn">${AI_BUILD.whatsNew || '<p>Nothing new yet.</p>'}</div><h4>Features in this version</h4><ul class="aifeat">${feats || '<li>None yet.</li>'}</ul>
      <p><button class="mini" id="aiBack2">Back to the standard version</button></p>`; }});
  $('aiNews').onclick = () => { EXT.panelDraw[newsId](); setOpen(newsId, true); raise(newsId); };
  document.addEventListener('click', e => { if (e.target.id === 'aiBack' || e.target.id === 'aiBack2') goVersion(false); });
}
/* the documentation lists the AI-enhanced version's current features, read from its build */
function fillAiFeatures(){
  const box = $('aiFeatList'); if (!box) return;
  fetch(asset('ai/features.json'), {cache:'no-cache'}).then(r => r.ok ? r.json() : null).then(j => {
    if (!j) { box.textContent = 'The list appears once the AI-enhanced version has been built.'; return; }
    box.innerHTML = (j.features || []).length ? `<p>Built ${esc(j.built || '')}.</p><ul class="doclist">${j.features.map(f => `<li><b>${esc(f.title)}</b> (added ${esc(f.added || '')}): ${esc(f.description || '')}</li>`).join('')}</ul>` : '<p>No experimental features yet.</p>';
  }).catch(() => { box.textContent = 'The list could not be loaded (it needs the published site).'; });
}
/* arriving from the other version, from inside the app: go straight in */
if (SWITCHED === 'app') setTimeout(() => { if ($('welcome').classList.contains('on')) closeWelcome(false); }, 0);
