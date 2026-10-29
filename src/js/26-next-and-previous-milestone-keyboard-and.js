/* ==================================================================
 *  NEXT AND PREVIOUS MILESTONE (keyboard: ] and [)
 * ================================================================== */
function stepMilestone(dir){
  const list = items.filter(it => shownFully(it)).sort((a, b) => a.r - b.r || (a.p || a.tg) - (b.p || b.tg) || a.t.localeCompare(b.t));
  if (!list.length) return;
  let i = selected ? list.indexOf(selected) : -1;
  i = i < 0 ? (dir > 0 ? 0 : list.length - 1) : (i + dir + list.length) % list.length;
  openDetail(list[i]);
}

