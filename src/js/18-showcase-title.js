/* ==================================================================
 *  SHOWCASE TITLE
 * ================================================================== */
const TITLE_DEFAULT = Object.assign({}, DB.defaults.showcaseTitle);
const titleCfg = Object.assign({}, TITLE_DEFAULT, store.get('sg.title', {}));
const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
function applyTitle(){
  const el = wins.title, tt = $('titleText');
  if (document.activeElement !== tt) tt.textContent = titleCfg.text;
  tt.style.color = titleCfg.color; tt.style.textAlign = titleCfg.align;
  el.style.background = hexA(titleCfg.bg, titleCfg.alpha);
  $('titleBar').style.background = titleCfg.accent; $('titleBar').style.alignSelf = titleCfg.align === 'center' ? 'center' : 'flex-start';
  if (document.activeElement !== $('tcName')) $('tcName').value = titleCfg.text;
  $('tcText').value = titleCfg.color; $('tcBg').value = titleCfg.bg; $('tcAcc').value = titleCfg.accent; $('tcAlpha').value = titleCfg.alpha; $('tcAlign').value = titleCfg.align;
  store.set('sg.title', titleCfg);
}
$('tcName').addEventListener('input', e => { titleCfg.text = e.target.value; applyTitle(); });
$('tcName').addEventListener('keydown', e => e.stopPropagation());
$('titleText').addEventListener('input', e => { titleCfg.text = e.target.textContent; store.set('sg.title', titleCfg); });
$('pageTitle').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } });
$('titleText').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } });
[['tcText','color'],['tcBg','bg'],['tcAcc','accent'],['tcAlign','align']].forEach(([id, k]) => $(id).addEventListener('input', e => { titleCfg[k] = e.target.value; applyTitle(); }));
$('tcAlpha').addEventListener('input', e => { titleCfg.alpha = +e.target.value; applyTitle(); });
$('tcReset').onclick = () => { Object.assign(titleCfg, TITLE_DEFAULT); applyTitle(); };
$('titleCfgBtn').onclick = () => $('titleCfg').classList.toggle('on');

