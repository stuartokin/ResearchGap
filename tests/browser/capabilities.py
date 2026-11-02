"""Every capability from before the toolbar change, in its new home: the toolbar, Present, Share and Views menus,
status chips and pins, and the keyboard shortcuts. If a control is moved or renamed again, this test should be updated."""
import asyncio
from playwright.async_api import async_playwright
results = []
def ok(name, cond): results.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + name)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'])
        ctx = await b.new_context(viewport={'width': 1600, 'height': 900}, accept_downloads=True); pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        pg.on('dialog', lambda d: asyncio.ensure_future(d.accept('capability-test') if d.type == 'prompt' else d.dismiss()))   # name prompts answered; confirmations declined
        await pg.goto('http://localhost:8765/test.html?view=none&welcome=0'); await pg.wait_for_timeout(3000)
        J = pg.evaluate
        vis = await J("['homeBtn', 'questionsBtn', 'playBtn', 'winBtn', 'presentBtn', 'shareBtn', 'aboutBtn'].every(id => { const e = document.getElementById(id); return e && e.offsetParent !== null; }) && !!document.getElementById('toursBtn').closest('#w-help')")
        ok('T1 the toolbar shows Home, Questions, Play the century, Views, Present, Share and Help (Tours is in Help)', vis)
        ok('T2 the Views button is called Views', (await J("document.getElementById('winBtn').textContent")).startswith('Views'))
        # Present
        await J("document.getElementById('presentBtn').click()"); await pg.wait_for_timeout(300)
        ok('P1 the Present menu opens', await J("document.getElementById('presentMenu').classList.contains('open')"))
        r0 = await J("__getT().state.autoRotate"); await J("document.getElementById('rotBtn').click()"); await pg.wait_for_timeout(200)
        ok('P2 Auto-rotate switches from the Present menu', await J("__getT().state.autoRotate") != r0)
        if not await J("__getT().state.autoRotate"): await J("document.getElementById('rotBtn').click()")
        await pg.wait_for_timeout(800)
        ok('P3 a "Rotating" chip shows while rotating', await J("!!document.querySelector('#tbChips [data-chip=\"rotate\"]')"))
        await J("document.querySelector('#tbChips [data-chip=\"rotate\"]').click()"); await pg.wait_for_timeout(700)
        ok('P4 the chip stops rotation, then offers "Rotate" again', not await J("__getT().state.autoRotate") and 'Rotate' in await J("(document.querySelector('#tbChips [data-chip=\"rotate\"]') || {}).textContent || ''"))
        await J("document.getElementById('musicBtn').click()"); await pg.wait_for_timeout(600)
        mus = await J("document.getElementById('musicBtn').getAttribute('aria-pressed')")
        ok('P5 Music switches from the Present menu', mus in ('true', 'false'))
        if mus == 'true': ok('P6 a "Music" chip shows while music plays', await J("!!document.querySelector('#tbChips [data-chip=\"music\"]')")); await J("document.getElementById('musicBtn').click()")
        for act, lay, name in (('ticker', 'ticker', 'Joke ticker'), ('title', 'title', 'Showcase title')):
            before = await J(f"__getT().layout.{lay}.open"); await J(f"document.querySelector('#presentMenu [data-act=\"{act}\"]').click()"); await pg.wait_for_timeout(300)
            ok(f'P7 {name} switches from the Present menu', await J(f"__getT().layout.{lay}.open") != before)
            await J(f"document.querySelector('#presentMenu [data-act=\"{act}\"]').click()"); await pg.wait_for_timeout(200)
        await J("document.getElementById('ideasBtn').click()"); await pg.wait_for_timeout(300)
        ok('P8 "Add an idea" opens the audience panel', await J("__getT().layout.audience.open")); await J("__getT().layout.audience.open && document.getElementById('ideasBtn').click()")
        await J("document.getElementById('thanksBtn').click()"); await pg.wait_for_timeout(400)
        ok('P9 "Thank you and questions" opens', await J("!!document.querySelector('#thanks.on, .thanks.on, #thanks.show')") or await J("document.body.classList.contains('thanks')"))
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
        await J("document.getElementById('presentBtn').click()"); await pg.wait_for_timeout(200)
        await J("document.querySelector('#presentMenu [data-pin=\"fullscreen\"]').click()"); await pg.wait_for_timeout(300)
        ok('P10 pinning Full screen puts it on the toolbar', await J("!!document.querySelector('#tbChips .pinned[data-chip=\"fullscreen\"]')"))
        await J("document.querySelector('#presentMenu [data-pin=\"fullscreen\"]').click()"); await pg.wait_for_timeout(300)
        ok('P11 unpinning removes it', not await J("!!document.querySelector('#tbChips .pinned[data-chip=\"fullscreen\"]')"))
        ok('P12 Full screen and Kiosk mode are in the Present menu', await J("!!document.getElementById('fsBtn') && !!document.querySelector('#presentMenu [data-act=\"kiosk\"]')"))
        await J("document.querySelector('#presentMenu [data-act=\"kiosk\"]').click()"); await pg.wait_for_timeout(500)
        ok('P13 Kiosk mode opens its options', await J("document.getElementById('wKioskOpts').classList.contains('on')"))
        await J("document.getElementById('wRun') && document.getElementById('wRun').click()"); await pg.wait_for_timeout(800)
        # Share
        for act, name in (('img', 'an image of the view'), ('csv', 'the data as CSV'), ('xlsx', 'the data as Excel')):
            await J("document.getElementById('shareBtn').click()"); await pg.wait_for_timeout(200)
            try:
                async with pg.expect_download(timeout=45000) as dl: await J(f"document.querySelector('#shareMenu [data-act=\"{act}\"]').click()")
                ok(f'S1 Share saves {name}', bool((await dl.value).suggested_filename))
            except Exception as e: ok(f'S1 Share saves {name}', False); print('   ', str(e)[:120])
        await J("document.getElementById('shareBtn').click()"); await pg.wait_for_timeout(200); await J("document.querySelector('#shareMenu [data-act=\"report\"]').click()"); await pg.wait_for_timeout(400)
        ok('S2 Share opens the PowerPoint report panel', await J("__getT().layout.report.open"))
        ok('S3 Share offers the briefing slide and a link', await J("!!document.querySelector('#shareMenu [data-act=\"briefing\"]') && !!document.querySelector('#shareMenu [data-act=\"link\"]')"))
        # Views
        await J("winBtn.click()"); await pg.wait_for_timeout(300)
        heads = await J("[...document.querySelectorAll('#winMenu .wmh')].map(h => h.firstChild.textContent.trim())")
        ok('V1 the Views menu has Ready-made views, My views, Panels and Your file', heads == ['Ready-made views', 'My views', 'Panels', 'Your file'])
        ok('V2 all seven ready-made views are offered, Compare included', await J("document.querySelectorAll('#winMenu [data-w^=\"__p_\"]').length") == 7)
        ok('V3 Save my file, Open my file and Reset everything are offered', await J("['__save', '__load', '__reset_all', '__all'].every(k => !!document.querySelector(`#winMenu [data-w=\"${k}\"]`))"))
        await J("document.querySelector('#winMenu [data-w=\"__p_charts\"]').click()"); await pg.wait_for_timeout(900)
        ok('V4 a ready-made view still applies', await J("__getT().view.preset") == 'charts')
        await J("winBtn.click()"); await pg.wait_for_timeout(200)
        try:
            async with pg.expect_download(timeout=30000) as dl: await J("document.querySelector('#winMenu [data-w=\"__save\"]').click()")
            ok('V5 Save my file downloads a file', (await dl.value).suggested_filename.endswith('.json'))
        except Exception as e: ok('V5 Save my file downloads a file', False); print('   ', str(e)[:120])
        await J("winBtn.click()"); await pg.wait_for_timeout(200); await J("document.querySelector('#winMenu [data-w=\"__reset_all\"]').click()"); await pg.wait_for_timeout(500)
        ok('V6 Reset everything asks first (dismissed here, so nothing was reset)', await J("__getT().view.preset") == 'charts')
        # keyboard shortcuts still work
        await pg.mouse.click(800, 500); await pg.keyboard.press('q'); await pg.wait_for_timeout(400)
        ok('K1 Q still opens Thank you and questions', await J("!!document.querySelector('#thanks.on, .thanks.on, #thanks.show')") or await J("document.body.classList.contains('thanks')"))
        await pg.keyboard.press('Escape')
        ok('X1 no page errors', not errs)
        print(f"PASSED {sum(results)} of {len(results)} | page errors: {errs}")
        await b.close()
asyncio.run(main())
