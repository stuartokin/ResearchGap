/* ==================================================================
 *  WINDOWS MENU: arrangements, then windows in collapsible groups
 * ================================================================== */
const WIN_GROUPS = [
  ['present', 'Presenting', ['toolbar', 'footer', 'pagetitle', 'title', 'ticker', 'player', 'music', 'vid1', 'vid2']],
  ['insight', 'Insights', ['findings', 'summary', 'gapchart', 'outlook', 'fortunes', 'vision', 'radar', 'cyber']],
  ['explore', 'Explore', ['filters', 'display', 'milestones', 'details', 'table', 'key', 'context', 'landing', 'sources']],
  ['data', 'Data and agents', ['changes', 'quality', 'audience']],
  ['share', 'Share and export', ['report']]
];
const PRESETS = [['explore', 'Exploring', 'The default: filters and key findings'], ['play', 'Play the century', 'Timeline windows around the model'], ['wait', 'Waiting (kiosk)', 'Both videos, joke ticker, plays on a loop'], ['analysis', 'Analysis', 'Findings, summary and charts side by side'], ['desnz', 'DESNZ AI vision', 'Vision radar, areas and changes; plays from 1980']];
function buildWinMenu(){
  view.menuGroups = view.menuGroups || {};
  const item = id => `<button data-w="${id}"><span class="tick ${layout[id].open ? 'on' : ''}">${layout[id].open ? '✓' : ''}</span>${WIN_NAMES[id]}</button>`;
  let h = '<div class="wmh">Arrange for</div><div class="wmpre">' + PRESETS.map(([k, n, t]) => `<button data-w="__p_${k}" class="${view.preset === k ? 'cur' : ''}" title="${t}"><b>${n}</b><span>${t}</span></button>`).join('') + '</div>';
  const any = WIN_GROUPS.some(([g]) => view.menuGroups[g]);
  h += `<div class="wmh">Windows<button class="wmall" data-x="all">${any ? 'Collapse all' : 'Expand all'}</button></div>`;
  const listed = new Set(), groups = WIN_GROUPS.map(x => [x[0], x[1], x[2].filter(id => WIN_IDS.includes(id))]);
  groups.forEach(([, , ids]) => ids.forEach(id => listed.add(id)));
  const rest = WIN_IDS.filter(id => !listed.has(id)); if (rest.length) groups.push(['other', 'Other', rest]);
  groups.forEach(([g, name, ids]) => {
    const open = ids.filter(id => layout[id].open).length, ex = !!view.menuGroups[g];
    h += `<button class="wmg" data-g="${g}" aria-expanded="${ex}"><span class="car">${ex ? '▾' : '▸'}</span>${name}<span class="cnt">${open} of ${ids.length} open</span></button>`;
    if (ex) h += '<div class="wmitems">' + ids.map(item).join('') + '</div>';
  });
  h += '<hr><button data-w="__all">Open all windows</button><button data-w="__link">Copy a link to this view</button><button data-w="__save">Save this view to a file…</button><button data-w="__load">Load a view from a file…</button>' +
    '<small>Saved views remember windows, positions, text sizes, filters and display settings. Open one with index.html?view=yourfile.json. Drag a title bar to move a window, its corner to resize, A− and A+ for text size; double-click a title bar to restore its place.</small>';
  winMenu.innerHTML = h;
}
buildWinMenu();
winMenu.addEventListener('click', e => {
  e.stopPropagation();   // the menu is rebuilt on each click; keep it open
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.g) { view.menuGroups = view.menuGroups || {}; view.menuGroups[b.dataset.g] = !view.menuGroups[b.dataset.g]; buildWinMenu(); return; }
  if (b.dataset.x === 'all') { const any = WIN_GROUPS.some(([g]) => view.menuGroups[g]); WIN_GROUPS.concat([['other']]).forEach(([g]) => { view.menuGroups[g] = !any; }); buildWinMenu(); return; }
  const w = b.dataset.w;
  if (w && w.startsWith('__p_')) { applyPreset(w.slice(4)); winMenu.classList.remove('open'); $('winBtn').setAttribute('aria-expanded', false); return; }
  if (w === '__reset') applyPreset('explore');
  else if (w === '__title') togglePageTitle();
  else if (w === '__link') { winMenu.classList.remove('open'); copyLink(); }
  else if (w === '__save') { winMenu.classList.remove('open'); saveViewFile(); }
  else if (w === '__load') { winMenu.classList.remove('open'); $('viewFile').click(); }
  else if (w === '__wait') applyPreset('wait');
  else if (w === '__play') applyPreset('play');
  else if (w === '__all') { WIN_IDS.forEach(id => { layout[id].open = true; placeWin(id); }); saveLayout(); buildWinMenu(); syncVideos(); }
  else setOpen(w, !layout[w].open);
});
function positionWinMenu(){
  const r = $('winBtn').getBoundingClientRect(), below = innerHeight - r.bottom, above = r.top;
  winMenu.style.right = Math.max(8, innerWidth - r.right) + 'px'; winMenu.style.left = 'auto';
  if (below >= 260 || below >= above) { winMenu.style.top = (r.bottom + 8) + 'px'; winMenu.style.bottom = 'auto'; winMenu.style.maxHeight = (below - 24) + 'px'; }
  else { winMenu.style.bottom = (innerHeight - r.top + 8) + 'px'; winMenu.style.top = 'auto'; winMenu.style.maxHeight = (above - 24) + 'px'; }
}
$('winBtn').onclick = e => { e.stopPropagation(); positionWinMenu(); const o = winMenu.classList.toggle('open'); $('winBtn').setAttribute('aria-expanded', o); };
document.addEventListener('click', e => { if (!winMenu.contains(e.target) && e.target.id !== 'winBtn') { winMenu.classList.remove('open'); $('winBtn').setAttribute('aria-expanded', false); } });

