/* ==================================================================
 *  MUSIC
 * ================================================================== */
const music = $('music');
const MUSIC_DEFAULT = 'mixkit-driving-ambition-32.mp3';
const mus = Object.assign({vol:.5, track:MUSIC_DEFAULT}, store.get('sg.music', {}));
function setTrack(t){ mus.track = t || MUSIC_DEFAULT; music.src = mus.track; $('muName').textContent = mus.track === MUSIC_DEFAULT ? 'Driving Ambition (Mixkit)' : mus.track.split('/').pop(); $('muUrl').value = mus.track === MUSIC_DEFAULT ? '' : mus.track; store.set('sg.music', mus); }
if (mus.track !== MUSIC_DEFAULT) setTrack(mus.track);
music.volume = mus.vol; $('muVol').value = mus.vol; $('muVolV').textContent = Math.round(mus.vol * 100) + '%';
function syncMusic(){
  const on = !music.paused;
  $('muPlay').textContent = on ? 'Pause music' : 'Play music';
  $('musicBtn').setAttribute('aria-pressed', on); $('musicBtn').textContent = on ? '♪ Music on' : '♪ Music';
}
function toggleMusic(){
  if (!music.paused) view.musicOn = false;
  if (music.paused) {
    const pr = music.play();
    if (pr && pr.catch) pr.catch(() => { $('muMsg').textContent = 'Could not play the track. Check it is in the same GitHub folder as index.html, or choose a track from this computer.'; if (!layout.music.open) setOpen('music', true); });
  } else music.pause();
}
music.addEventListener('play', () => { $('muMsg').textContent = ''; view.musicOn = true; syncMusic(); });
music.addEventListener('pause', syncMusic);
music.addEventListener('error', () => { $('muMsg').textContent = 'Track not found. Upload mixkit-driving-ambition-32.mp3 next to index.html, or choose a track.'; syncMusic(); });
$('muPlay').onclick = toggleMusic; $('musicBtn').onclick = toggleMusic;
$('muVol').addEventListener('input', e => { mus.vol = +e.target.value; music.volume = mus.vol; $('muVolV').textContent = Math.round(mus.vol * 100) + '%'; store.set('sg.music', mus); });
$('muUrlBtn').onclick = () => { setTrack($('muUrl').value.trim()); music.play().catch(() => {}); };
$('muUrl').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') $('muUrlBtn').click(); });
$('muFile').addEventListener('change', e => {
  const f = e.target.files && e.target.files[0]; if (!f) return;
  music.src = URL.createObjectURL(f); $('muName').textContent = f.name; music.play().catch(() => {});
});

