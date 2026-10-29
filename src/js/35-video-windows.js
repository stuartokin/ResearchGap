/* ==================================================================
 *  VIDEO WINDOWS
 * ================================================================== */
function syncVideos(){
  ['vid1','vid2'].forEach(id => {
    const v = $(id); if (!v) return;
    if (layout[id] && layout[id].open) { const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); }
    else v.pause();
  });
}
const vidWatch = {vid1:{t:-1, n:0}, vid2:{t:-1, n:0}};
setInterval(() => {
  ['vid1','vid2'].forEach(id => {
    const v = $(id), w = vidWatch[id];
    if (!layout[id] || !layout[id].open || v.paused || v.readyState === 0 || $(id + 'msg').classList.contains('on')) { w.t = -1; w.n = 0; return; }
    if (Math.abs(v.currentTime - w.t) < 0.01) {
      w.n++;
      if (w.n === 1) { try { v.currentTime = (v.currentTime + 0.1) % (v.duration || 1); } catch (e) {} v.play().catch(() => {}); }
      else { const t = v.currentTime; v.load(); v.addEventListener('loadeddata', () => { try { v.currentTime = t; } catch (e) {} v.play().catch(() => {}); }, {once:true}); w.n = 0; }
    } else w.n = 0;
    w.t = v.currentTime;
  });
}, 2000);
['vid1','vid2'].forEach(id => {
  const v = $(id), msg = $(id + 'msg');
  v.addEventListener('ended', () => { v.currentTime = 0; v.play().catch(() => {}); });
  v.addEventListener('stalled', () => { if (layout[id] && layout[id].open && !v._stallT) v._stallT = setTimeout(() => { v._stallT = 0; if (v.readyState < 2 && !v.paused) v.play().catch(() => {}); }, 8000); });
  // A playback error is usually temporary (a network hiccup on a larger file): check the file exists and retry before asking for it
  v.addEventListener('error', () => {
    const src = v.getAttribute('src') || '', tries = (v._tries = (v._tries || 0) + 1), code = v.error ? v.error.code : 0;
    const give = why => { msg.classList.add('on'); msg.title = `Video ${why} (attempt ${tries}).`; };
    if (!src || src.startsWith('blob:')) return give(`error ${code}`);
    fetch(src, {method:'HEAD', cache:'no-store'}).then(r => {
      if (r.ok && tries <= 4) setTimeout(() => { v.load(); if (layout[id] && layout[id].open) v.play().catch(() => {}); }, 1500 * tries);
      else give(r.ok ? `error ${code}` : `not found (${r.status})`);
    }).catch(() => { if (tries <= 4) setTimeout(() => { v.load(); }, 2000 * tries); else give('could not be reached'); });
  });
  v.addEventListener('loadeddata', () => { msg.classList.remove('on'); v._tries = 0; });
  msg.querySelector('input').addEventListener('change', e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    v.src = URL.createObjectURL(f); msg.classList.remove('on'); v.load(); syncVideos();
  });
});

