import asyncio, json
from playwright.async_api import async_playwright
FP = r"""() => {
  const out = {};
  document.querySelectorAll('input[type=checkbox][id]').forEach(e => { if (!['audLoad','muFile','viewFile','deckPick','titleShowT'].includes(e.id)) out['cb:' + e.id] = e.checked; });
  document.querySelectorAll('input[type=range][id]').forEach(e => out['rg:' + e.id] = e.value);
  ['tbSpeed','tcAlign','paletteS','playFromS','playToS','statsMetricS','chgSinceS'].forEach(id => out['sel:' + id] = document.getElementById(id).value);
  ['tcText','tcBg','tcAcc','tkText','tkBg'].forEach(id => out['col:' + id] = document.getElementById(id).value);
  document.querySelectorAll('.seg[id]').forEach(s => out['seg:' + s.id] = [...s.querySelectorAll('button')].filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.v).join());
  document.querySelectorAll('#srcChips .chipbtn, #kindChips .chipbtn, #catChips .chipbtn, #confChips .chipbtn').forEach(b => out['chip:' + b.dataset.k] = b.getAttribute('aria-pressed'));
  out.fields = [...document.querySelectorAll('#fieldList .frow.on')].map(r => r.dataset.f).join();
  out.playBtn = document.getElementById('playBtn').textContent; out.energyHex = getComputedStyle(document.querySelector('#fieldList .frow[data-f="energy"]')).color;
  document.querySelectorAll('#regionChips .chipbtn, #tagChips .chipbtn, #verChips .chipbtn').forEach(b => out['chip2:' + b.dataset.k] = b.getAttribute('aria-pressed'));
  out.q = document.getElementById('q').value; out.radar = JSON.stringify([__getT().view.radarSince, __getT().view.radarSeenRev]); out.cyberF = [document.getElementById('attackT').checked, document.getElementById('gbOnlyT').checked].join(); out.panels = [...document.querySelectorAll('.psec')].map(d => d.open ? 1 : 0).join(''); out.tkMode = document.getElementById('tkMode').value; out.menuGroups = JSON.stringify(__getT ? (__getT().view.menuGroups || {}) : {}); out.preset = __getT ? __getT().view.preset : '';
  // the toolbar fits its contents (chips come and go), so only its top and height are a setting
  document.querySelectorAll('.win').forEach(w => { const r = w.getBoundingClientRect(); if (w.id === 'w-toolbar') { out['win:' + w.id] = w.classList.contains('closed') ? 'closed' : `top ${Math.round(r.top)}, height ${Math.round(r.height)}`; return; } out['win:' + w.id] = w.classList.contains('closed') ? 'closed' : `${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)}x${Math.round(r.height)},fs${getComputedStyle(w).getPropertyValue('--fs').trim()},max${w.classList.contains('max')}`; });
  out.zTop = [...document.querySelectorAll('.win:not(.closed)')].sort((a, b) => (+b.style.zIndex || 0) - (+a.style.zIndex || 0))[0]?.id;
  out.titleBg = document.getElementById('w-title').style.background; out.titleText = document.getElementById('titleText').textContent;
  out.tickBg = document.getElementById('w-ticker').style.background; out.pageTitle = document.getElementById('pageTitle').textContent;
  out.body = ['nouni','nothanks','lite','barauto','clean'].filter(c => document.body.classList.contains(c)).join();
  out.rot = document.getElementById('rotBtn').getAttribute('aria-pressed');
  out.ideas = [...document.querySelectorAll('#audList .audrow span')].map(s => s.textContent).join(' | ');
  out.hiddenRows = document.querySelectorAll('#mlist .mrow.off').length;
  out.vid = ['vid1','vid2'].map(id => document.getElementById(id).muted + '/' + document.getElementById(id).volume).join();
  out.music = document.getElementById('muVol').value;
  out.year = document.getElementById('yearNum').textContent; out.playing = document.getElementById('playBtn').textContent;
  return out;
}"""
CHANGE = r"""async () => {
  const $ = id => document.getElementById(id), sleep = ms => new Promise(r => setTimeout(r, ms));
  const menu = w => { $('winBtn').click(); if (!document.querySelector(`#winMenu button[data-w="${w}"]`)) document.querySelector('#winMenu .wmall').click(); document.querySelector(`#winMenu button[data-w="${w}"]`).click(); document.body.click(); };
  const seg = (id, v) => document.querySelector(`#${id} button[data-v="${v}"]`).click();
  const rng = (id, v) => { $(id).value = v; $(id).dispatchEvent(new Event('input')); };
  document.querySelectorAll('.psec').forEach(d => d.open = true);
  ['display','summary','gapchart','fortunes','vision','outlook','milestones','audience','sources','music'].forEach(menu);
  // filters
  document.querySelector('#fieldList .frow[data-f="space"]').click(); document.querySelector('#srcChips .chipbtn[data-k="government"]').click();
  document.querySelector('#confChips .chipbtn[data-k="low"]').click(); $('majT').click(); $('majT').click(); $('compactT').click();
  rng('fromR', 1940); rng('gapR', 40); $('q').value = 'grid'; $('q').dispatchEvent(new Event('input'));
  // display
  seg('labelSeg','peak'); seg('labelPlaySeg','flash'); seg('labelScopeSeg','major'); seg('laneSeg','s'); seg('colSeg','s');
  rng('lfsR', 17); rng('labelMaxR', 9); rng('lingerR', 4); rng('rotR', 0.8); rng('glowR', 1.1); rng('keepR', 8);
  ['pulseT','trendT','floorT','liteT','uniHiT','majBrightT','countdownT','thanksIconT','barAutoT','revealT','laneFollowT','loopD','gapBuildT','statsLiveT','audSpotT','audPauseT'].forEach(id => $(id).click());
  seg('camSeg','fixed'); seg('fadeSeg','keep');
  // windows and content
  seg('statsBySeg','began'); document.querySelector('#fortSortSeg button[data-v="speed"]').click(); $('fortHi').click(); $('visExpand').click();
  $('titleCfgBtn').click(); $('tcBg').value = '#224466'; $('tcBg').dispatchEvent(new Event('input')); $('tcText').value = '#ffeeaa'; $('tcText').dispatchEvent(new Event('input')); $('tcAlign').value = 'left'; $('tcAlign').dispatchEvent(new Event('input'));
  $('attackT').click(); $('gbOnlyT').click(); document.querySelector('#stageChips .chipbtn[data-k="pilot"]').click(); $('radarSince').value = '90'; $('radarSince').dispatchEvent(new Event('change')); $('radarReviewed').click();
  $('tickCfgBtn').click(); $('tkMode').value = 'news'; $('tkMode').dispatchEvent(new Event('change')); rng('tkSpeed', 130); $('tkBg').value = '#331122'; $('tkBg').dispatchEvent(new Event('input')); rng('tkAlpha', 0.6);
  $('pageTitle').textContent = 'Research to Change: QA'; $('pageTitle').dispatchEvent(new Event('input'));
  $('audName').value = 'QA round trip idea'; $('audField').value = '__new'; $('audField').dispatchEvent(new Event('change')); $('audNew').value = 'Hydrogen';
  document.querySelector('.afmore').open = true; $('audDesc').value = 'desc'; $('audSource').value = 'QA source'; $('audUrl').value = 'https://example.org'; $('audAdd').click();
  document.querySelector('#mlist input[data-h]').click();
  rng('muVol', 0.3); $('vid1').muted = false; $('vid1').volume = 0.4;
  $('tbSpeed').value = '2'; $('tbSpeed').dispatchEvent(new Event('change'));
  const sw = $('w-summary'); sw.querySelector('.wh button[data-a="up"]').click(); sw.querySelector('.wh button[data-a="up"]').click();
  $('w-sources').querySelector('.wh button[data-a="max"]').click();
  $('rotBtn').click();
  $('paletteS').value = 'cb'; $('paletteS').dispatchEvent(new Event('change')); $('playFromS').value = '1960'; $('playFromS').dispatchEvent(new Event('change')); $('playToS').value = '2020'; $('playToS').dispatchEvent(new Event('change'));
  $('statsMetricS').value = 'adopt'; $('statsMetricS').dispatchEvent(new Event('change')); document.querySelector('#statsRowsSeg button[data-v="field"]').click(); $('subLanesT').click(); $('adoptT').click(); $('statsSurvT').click();
  document.querySelector('#regionChips .chipbtn[data-k="asia"]').click(); document.querySelector('#tagChips .chipbtn[data-k="grid"]').click();
  document.dispatchEvent(new KeyboardEvent('keydown', {key:'h'}));
  $('scrub').value = 1977; $('scrub').dispatchEvent(new Event('input'));
  await sleep(600);
}"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'])
        ctx = await b.new_context(viewport={'width':1920,'height':1080}, accept_downloads=True)
        pg = await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); pg.set_default_timeout(200000)
        pg.on('dialog', lambda d: asyncio.ensure_future(d.accept('roundtrip')))
        await pg.goto('http://localhost:8765/test.html?view=none&welcome=0'); await pg.wait_for_timeout(2500)
        await pg.evaluate(CHANGE)
        before = await pg.evaluate(FP)
        async with pg.expect_download() as dl:
            await pg.evaluate("winBtn.click(); document.querySelector('#winMenu button[data-w=\"__save\"]').click();")
        await (await dl.value).save_as('/tmp/t/roundtrip.json')
        await pg.close()
        pg2 = await ctx.new_page(); pg2.on('pageerror', lambda e: errs.append(str(e))); pg2.set_default_timeout(200000)
        await pg2.goto('http://localhost:8765/test.html?view=roundtrip.json'); await pg2.wait_for_timeout(9000)
        after = await pg2.evaluate(FP)
        diffs = {k: (before.get(k), after.get(k)) for k in set(before) | set(after) if before.get(k) != after.get(k)}
        print('settings compared:', len(before))
        print('differences:', json.dumps(diffs, indent=1) if diffs else 'none')
        print('ERR', errs); await b.close()
asyncio.run(main())
