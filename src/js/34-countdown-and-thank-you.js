/* ==================================================================
 *  COUNTDOWN AND THANK-YOU
 * ================================================================== */
let cdTimer = null;
function runCountdown(done, label){
  if (view.countdown === false || reduced) { done(); return; }
  if (cdTimer) return;
  const el = $('countdown'), num = $('cdNum'); let n = 3;
  $('cdSub').textContent = label || playLabel();
  const show = () => { num.textContent = n; num.classList.remove('pop'); void num.offsetWidth; num.classList.add('pop'); };
  el.classList.add('on'); show();
  cdTimer = setInterval(() => { n--; if (n <= 0) { clearInterval(cdTimer); cdTimer = null; el.classList.remove('on'); done(); } else show(); }, 900);
}
function cancelCountdown(){ if (cdTimer) { clearInterval(cdTimer); cdTimer = null; } $('countdown').classList.remove('on'); }
function playWithCountdown(){ if (state.playing) return; runCountdown(startPlay); }
function showThanks(on){ $('thanks').classList.toggle('on', on == null ? !$('thanks').classList.contains('on') : on); }
$('thanksBtn').onclick = () => showThanks(true);
$('thanks').onclick = () => showThanks(false);
$('countdownT').addEventListener('change', e => { view.countdown = e.target.checked; });
$('thanksIconT').addEventListener('change', e => { view.thanksIcon = e.target.checked; document.body.classList.toggle('nothanks', !view.thanksIcon); });

