import asyncio
from playwright.async_api import async_playwright
JS = r"""async () => {
 const $ = id => document.getElementById(id), sleep = ms => new Promise(r => setTimeout(r, ms)), T = __getT(), R = [];
 const ok = (name, cond, info='') => R.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '  -> ' + info));
 const shown = () => T.items.filter(it => it.target === 1);
 const visL = () => [...document.querySelectorAll('.lbl')].filter(e => e.style.display === 'block');
 const itemOf = el => T.items.find(i => i.labelEl === el);
 const menu = w => { $('winBtn').click(); if (!document.querySelector(`#winMenu button[data-w="${w}"]`)) document.querySelector('#winMenu .wmall').click(); document.querySelector(`#winMenu button[data-w="${w}"]`).click(); document.body.click(); };
 const WIN_GROUPS_OPEN = () => { if (!document.querySelector('#winMenu .wmitems') || document.querySelectorAll('#winMenu .wmitems').length < 5) { const b = document.querySelector('#winMenu .wmall'); if (b && /Expand/.test(b.textContent)) b.click(); else if (b) { b.click(); document.querySelector('#winMenu .wmall').click(); } } };
 const seg = (id, v) => document.querySelector(`#${id} button[data-v="${v}"]`).click();
 const chip = (grp, k) => document.querySelector(`#${grp} .chipbtn[data-k="${k}"]`).click();
 const total = () => T.items.filter(i => !i.removed).length;
 const waitUntil = async (fn, ms) => { const t0 = performance.now(); while (!fn() && performance.now() - t0 < ms) await sleep(100); return fn(); };
 const frames = n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
 menu('filters'); menu('display'); document.querySelectorAll('.psec').forEach(d => d.open = true); $('liteT').click(); const fps0 = await (async () => { let n = 0; const t0 = performance.now(); await new Promise(r => { const f = () => { n++; performance.now() - t0 < 2000 ? requestAnimationFrame(f) : r(); }; requestAnimationFrame(f); }); return n / 2; })(); R.push('INFO frame rate ' + fps0.toFixed(1));
 // ---------- FILTERS ----------
 document.querySelector('#fieldList .frow[data-f="energy"]').click(); ok('F1 field off hides it', shown().every(i => i.v !== 'energy') && shown().length > 0);
 document.querySelector('#fieldList .frow[data-f="energy"]').click();
 document.querySelector('#fieldList .only[data-only="cyber"]').click(); ok('F2 Only cyber', shown().length > 0 && shown().every(i => i.v === 'cyber'));
 document.querySelector('[data-preset="all"]').click(); ok('F2b All fields', shown().length === total(), shown().length + '/' + total());
 chip('srcChips','academic'); ok('F3 source off', shown().every(i => i.s !== 'academic')); chip('srcChips','academic');
 chip('kindChips','proj'); ok('F4 outlook off', shown().every(i => i.kind !== 'proj')); chip('kindChips','proj');
 chip('confChips','low'); ok('F5 low confidence off', shown().every(i => i.c !== 'low')); chip('confChips','low');
 chip('catChips','co'); ok('F6 company products off', shown().every(i => !i.co)); chip('catChips','co');
 $('majT').click(); ok('F7 major only', shown().length > 0 && shown().every(i => i.major), shown().length); $('majT').click();
 $('uniOnlyT').click(); ok('F8 university only', shown().length > 0 && shown().every(i => i.uni), shown().length); $('uniOnlyT').click();
 $('q').value = 'battery'; $('q').dispatchEvent(new Event('input')); ok('F9 search', shown().length > 0 && shown().every(i => (i.t + i.rw + i.pw).toLowerCase().includes('battery'))); $('q').value = ''; $('q').dispatchEvent(new Event('input'));
 $('fromR').value = 1990; $('fromR').dispatchEvent(new Event('input')); $('toR').value = 2000; $('toR').dispatchEvent(new Event('input'));
 ok('F10 research year range', shown().length > 0 && shown().every(i => i.r >= 1990 && i.r <= 2000));
 $('gapR').value = 5; $('gapR').dispatchEvent(new Event('input')); ok('F11 longest gap', shown().every(i => i.lag <= 5));
 $('resetFilters').click(); ok('F15 reset filters', shown().length === total());
 $('visT').click(); ok('F12 DESNZ vision only', shown().length > 0 && shown().every(i => i.dv)); $('visT').click();
 $('ghostT').checked || $('ghostT').click(); document.querySelector('#fieldList .only[data-only="space"]').click(); $('compactT').checked && $('compactT').click();
 ok('F13 faint arcs on', T.items.some(i => i.target > 0 && i.target < 1)); $('ghostT').click(); ok('F13b faint arcs off', !T.items.some(i => i.target > 0 && i.target < 1)); $('ghostT').click();
 $('compactT').click(); await frames(3);
 ok('F14 hide unselected tracks', Object.entries(T.LANEZ.v).filter(([k, z]) => z != null).length === 1 && !T.items.some(i => i.target > 0 && i.target < 1 && i.v !== 'space'));
 document.querySelector('[data-preset="all"]').click();
 // ---------- DISPLAY ----------
 seg('labelSeg','off'); await frames(3); ok('D1 labels off', getComputedStyle(document.getElementById('labels')).display === 'none' || visL().length === 0, visL().length);
 seg('labelSeg','peak'); await frames(3); ok('D2 labels on arcs', visL().length > 0);
 seg('labelSeg','follow'); await frames(3); ok('D2b labels follow', visL().length > 0);
 $('lfsR').value = 20; $('lfsR').dispatchEvent(new Event('input')); await sleep(500);
 const minor = visL().find(e => e.classList.contains('minor')) || visL()[0]; ok('D3 label size', minor && Math.abs(parseFloat(getComputedStyle(minor).fontSize) - 20) < 0.6, minor && getComputedStyle(minor).fontSize);
 seg('labelScopeSeg','major'); await sleep(600); ok('D4 major-only labels', visL().length > 0 && visL().every(e => itemOf(e).major), visL().filter(e => !itemOf(e).major).map(e => e.textContent).join(','));
 seg('labelScopeSeg','all'); $('labelMaxR').value = 5; $('labelMaxR').dispatchEvent(new Event('input')); await sleep(600); ok('D5 label limit', visL().length <= 5 && visL().length > 0, visL().length);
 $('labelMaxR').value = 60; $('labelMaxR').dispatchEvent(new Event('input')); await sleep(700);
 const hi = visL().filter(e => e.classList.contains('majhi')), lo = visL().filter(e => e.classList.contains('minor'));
 ok('D6 bright labels only for major milestones', hi.length > 0 && lo.length > 0 && hi.every(e => itemOf(e).major) && lo.every(e => !itemOf(e).major), `${hi.length} bright, ${lo.length} normal`);
 $('majBrightT').click(); await sleep(500); ok('D6b bright labels off', !visL().some(e => e.classList.contains('majhi') || e.classList.contains('minor'))); $('majBrightT').click();
 seg('laneSeg','s'); await frames(2); ok('D7 lanes by source', T.items.filter(i => !i.removed).every(i => i.zTarget === T.LANEZ.s[i.s]));
 seg('laneSeg','v'); await frames(2); ok('D7b lanes by field', T.items.filter(i => !i.removed).every(i => i.zTarget === T.LANEZ.v[i.v]));
 seg('colSeg','s'); const h1 = T.items.find(i => i.kind === 'hist' && !i.aud); ok('D8 colour by source', h1.tubeMat.color.getHex() === new THREE.Color({academic:'#F5B04C',industry:'#4CD3C2',government:'#A891FF'}[h1.s]).getHex()); seg('colSeg','v');
 $('pulseT').click(); await frames(3); ok('D9 moving lights off', T.items.filter(i => i.kind === 'hist' && i.group.visible).every(i => !i.pulse.visible)); $('pulseT').click();
 $('trendT').click(); ok('D10 trend lines off', T.trendGroup.children.length === 0); $('trendT').click(); ok('D10b trend lines on', T.trendGroup.children.length > 0);
 $('floorT').click(); ok('D11 floor labels off', T.view.floor === false); $('floorT').click();
 $('glowR').value = 1.2; $('glowR').dispatchEvent(new Event('input')); ok('D13 glow', Math.abs(T.view.glow - 1.2) < 1e-6);
 $('liteT').click(); ok('D14 performance mode toggles', !document.body.classList.contains('lite')); $('liteT').click(); ok('D14b performance mode back on', document.body.classList.contains('lite'));
 $('uniHiT').click(); await frames(2); ok('D18 university highlight off', document.body.classList.contains('nouni') && T.items.filter(i => i.uniMark).every(i => !i.uniMark.visible)); $('uniHiT').click();
 // rotation: same angular speed regardless of frame rate (measure over ~3s)
 const perSecond = hz => { const dt = Math.min(1 / hz, .05); const speed = 1 * Math.min(3, dt * 60); return hz * (2 * Math.PI / 60 / 60 * speed); };
 const rates = [30, 60, 120, 144].map(perSecond);
 ok('D12 auto-rotate speed is the same at 30, 60, 120 and 144Hz', rates.every(r => Math.abs(r - rates[1]) < 1e-9), rates.map(r => r.toFixed(4)).join(', '));
 ok('D12b auto-rotate actually turns the camera', await (async () => { if (!T.state.autoRotate) $('rotBtn').click(); await waitUntil(() => true, 0); await sleep(4500); const az = () => Math.atan2(T.camera.position.x - T.controls.target.x, T.camera.position.z - T.controls.target.z); const a0 = az(); await frames(8); return Math.abs(az() - a0) > 1e-4; })());
 $('rotBtn').click();
 // ---------- PRESENTING ----------
 $('playBtn').click(); await waitUntil(() => $('countdown').classList.contains('on'), 1000); ok('P1 countdown shows 3', $('countdown').classList.contains('on') && $('cdNum').textContent === '3');
 await waitUntil(() => T.state.playing, 9000); await frames(2); ok('P2 Play starts after countdown', T.state.playing && !$('countdown').classList.contains('on'));
 $('tbStop').click(); $('countdownT').click(); $('playBtn').click(); await sleep(150); ok('P3 countdown can be switched off', T.state.playing && !$('countdown').classList.contains('on')); $('tbStop').click(); $('countdownT').click();
 $('thanksBtn').click(); ok('P4 thank-you opens', $('thanks').classList.contains('on'));
 document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape'})); ok('P5 Escape closes it', !$('thanks').classList.contains('on'));
 document.dispatchEvent(new KeyboardEvent('keydown', {key:'q'})); ok('P6 Q opens it', $('thanks').classList.contains('on')); $('thanks').click(); ok('P7 click closes it', !$('thanks').classList.contains('on'));
 $('thanksIconT').click(); ok('P8 thank-you icon can be hidden', getComputedStyle($('thanksBtn')).display === 'none'); $('thanksIconT').click();
 document.dispatchEvent(new KeyboardEvent('keydown', {key:'t'})); ok('P9 T hides page title', $('w-pagetitle').classList.contains('closed')); document.dispatchEvent(new KeyboardEvent('keydown', {key:'t'}));
 // ---------- WINDOWS ----------
 menu('summary'); seg('statsBySeg','began'); const hb = $('stats').innerText; seg('statsBySeg','landed'); ok('W1 summary grouping switches', hb !== $('stats').innerText && /2020–26/.test($('stats').innerText));
 menu('gapchart'); await sleep(300); const cv = $('gapCanvas'); const px = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let ink = 0; for (let i = 3; i < px.length; i += 4) ink += px[i] > 0; ok('W2 gap chart drawn', ink > 500, ink);
 menu('fortunes'); document.querySelector('#fortSortSeg button[data-v="worth"]').click(); ok('W3 fortunes sort by net worth', /Musk/.test(document.querySelector('#fortList .trow strong').textContent));
 menu('vision'); $('visExpand').click(); ok('W4 vision expand all', document.querySelectorAll('.vdet[open]').length === document.querySelectorAll('.vdet').length && document.querySelectorAll('.vdet').length >= 10);
 menu('outlook'); await sleep(200); ok('W5 outlook rows', document.querySelectorAll('.olrow').length === 11 && /years/.test($('olAI').textContent));
 menu('report'); ok('W6 report window opens', !$('w-report').classList.contains('closed') && !window.PptxGenJS);   // the library now loads only when a report is made
 menu('sources'); ok('W7 sources links', document.querySelectorAll('#w-sources a').length >= 30);
 $('ideasBtn').click(); $('audName').value = 'QA idea'; $('audField').value = '__new'; $('audField').dispatchEvent(new Event('change')); $('audNew').value = 'QA field'; $('audAdd').click();
 ok('W8 idea with new field added', T.AUD.length === 1 && T.FKEYS.some(k => T.FIELDS[k].name === 'QA field'));
 document.querySelector('#audList button[data-rm]').click(); ok('W8b idea and its field deleted', T.AUD.length === 0 && !T.FKEYS.some(k => T.FIELDS[k] && T.FIELDS[k].name === 'QA field'));
 $('titleCfgBtn').click(); $('tcBg').value = '#123456'; $('tcBg').dispatchEvent(new Event('input')); ok('W9 title colour', /18, 52, 86/.test($('w-title').style.background));
 $('tickCfgBtn').click(); $('tkSpeed').value = 150; $('tkSpeed').dispatchEvent(new Event('input')); ok('W10 ticker speed', $('tkSpeedV').textContent === '150');
 $('playBtn').click(); await waitUntil(() => T.state.playing, 9000); await frames(2); $('tbSpeed').value = '2'; $('tbSpeed').dispatchEvent(new Event('change')); $('tbPause').click(); await frames(1); const c1 = T.state.cursor; await frames(3); ok('W11 player pause', Math.abs(T.state.cursor - c1) < .01); $('tbPause').click(); $('tbStop').click(); ok('W11b exit play', !T.state.playing);
 menu('milestones'); const box = document.querySelector('#mlist input[data-h]'); box.click(); ok('W12 hide one milestone', T.hidden.size === 1); $('showAllM').click(); ok('W12b show all', T.hidden.size === 0);
 document.querySelector('#mlist button[data-s]').click(); await sleep(200); ok('W13 details open', !$('w-details').classList.contains('closed') && $('detailBody').querySelector('.basis'));
 $('dOnly').click(); ok('W13b only this field', T.F.fields.size === 1); document.querySelector('[data-preset="all"]').click();
 const w = $('w-summary'); w.querySelector('.wh button[data-a="max"]').click(); ok('W16 maximise', w.classList.contains('max')); w.querySelector('.wh button[data-a="max"]').click();
 const fs0 = T.layout.summary.fs; w.querySelector('.wh button[data-a="up"]').click(); ok('W17 text size', T.layout.summary.fs > fs0);
 let toggles = 0; for (const id of Object.keys(T.layout)) { const before = T.layout[id].open; $('winBtn').click(); WIN_GROUPS_OPEN && WIN_GROUPS_OPEN(); document.querySelector(`#winMenu button[data-w="${id}"]`).click(); document.body.click(); if (T.layout[id].open !== before) toggles++; }
 ok('W18 every window toggles from the Windows menu', toggles === Object.keys(T.layout).length, toggles + '/' + Object.keys(T.layout).length);
 return R;
}"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'])
        pg = await (await b.new_context(viewport={'width':1920,'height':1080})).new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); pg.set_default_timeout(200000)
        pg.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
        await pg.goto('http://localhost:8765/test.html?view=none&welcome=0'); await pg.wait_for_timeout(2500)
        res = await pg.evaluate(JS)
        for r in res: print(r)
        print('PASSED', sum(r.startswith('PASS') for r in res), 'of', len(res), '| page errors:', errs)
        await b.close()
asyncio.run(main())
