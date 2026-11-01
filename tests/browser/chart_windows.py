"""Chart windows: full copies of Charts, created on demand, entering through the welcome screen as a visitor does.
Each has its own chart and controls, follows the filters, links its selection (unless unlinked), travels in My file,
appears in the Compare view, and is removed when closed."""
import asyncio, json, os, tempfile
from playwright.async_api import async_playwright
results = []
def ok(name, cond): results.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + name)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
        ctx = await b.new_context(viewport={'width': 1800, 'height': 1000}, accept_downloads=True); pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200])); J = pg.evaluate
        pg.on('dialog', lambda d: asyncio.ensure_future(d.accept('chart-windows-test') if d.type == 'prompt' else d.accept()))
        await pg.goto('http://localhost:8765/test.html'); await pg.wait_for_timeout(3000)
        await pg.click('#wAckBtn'); await pg.click('#wRun'); await pg.wait_for_timeout(2500)
        await pg.click('#winBtn'); await pg.wait_for_timeout(300); await pg.click('#winMenu button[data-w="__p_charts"]'); await pg.wait_for_timeout(2000)
        await pg.click('#chartTabs button[data-t="heat"]'); await pg.wait_for_timeout(600)
        await pg.click('#chNewWin'); await pg.wait_for_timeout(1500)
        k = await J("Object.keys(__getT().CHI.roots)[0] || null")
        W = f'#w-{k}'
        ok('C1 New window creates a full chart window', bool(k) and await J(f"!!document.querySelector('{W} [id^=\"chartTabs\"] button') && !!document.querySelector('{W} [id^=\"chartSvg\"] svg') && !!document.querySelector('{W} [id^=\"chartCtl\"] select')"))
        ok('C2 it starts as a copy of the chart it came from', 'Heatmap' in await J(f"document.querySelector('{W} .wh h2').textContent"))
        await pg.click(f'{W} [id^="chartTabs"] button[data-t="pipe"]'); await pg.wait_for_timeout(800)
        ok('C3 switching chart in the new window changes only that window', 'pipeline' in (await J(f"document.querySelector('{W} .wh h2').textContent")).lower() and 'Heatmap' in await J("document.querySelector('#w-charts .wh h2').textContent"))
        await pg.click(f'{W} [id^="chartTabs"] button[data-t="gaps"]'); await pg.wait_for_timeout(800)
        await J(f"(() => {{ const x = document.querySelector('{W} [id^=\"coX\"]'); if (x) x.click(); }})()"); await pg.wait_for_timeout(400)   # the insight card sits over the top of the chart: close it first, as a person would
        svg = await J(f"(() => {{ const s = document.querySelector('{W} svg.chzoomx'); if (!s) return null; const r = s.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }})()")
        if svg:
            y = svg[1] + min(svg[3] * .5, 120)   # near the top: a tall chart scrolls inside its window
            await pg.mouse.move(svg[0] + svg[2] * .55, y); await pg.mouse.down(); await pg.mouse.move(svg[0] + svg[2] * .85, y, steps=8); await pg.mouse.up(); await pg.wait_for_timeout(800)
        ok('C4 drag-to-zoom works in the new window', bool(svg) and await J(f"!!__getT().CHI.states['{k}'].zoom.gaps"))
        await J("document.querySelector('#w-charts [id=\"chartTabs\"] button[data-t=\"gaps\"]').click()"); await pg.wait_for_timeout(800)
        await J("(() => { const r = document.querySelector('#chartSvg .chrow'); r && r.dispatchEvent(new MouseEvent('click', {bubbles:true})); })()"); await pg.wait_for_timeout(900)
        sel = await J("__getT().CH.sel")
        ok('C5 selecting in Charts opens Details', await J("__getT().layout.details.open") and sel is not None)
        ok('C6 the linked window highlights the same milestone', await J(f"__getT().CHI.states['{k}'].sel") == sel)
        await pg.click(f'{W} [id^="chLink"]'); await pg.wait_for_timeout(500)
        await J("(() => { const rs = document.querySelectorAll('#chartSvg .chrow'); rs[3] && rs[3].dispatchEvent(new MouseEvent('click', {bubbles:true})); })()"); await pg.wait_for_timeout(900)
        ok('C7 an unlinked window keeps its own highlight', await J(f"__getT().CHI.states['{k}'].sel") == sel and await J("__getT().CH.sel") != sel)
        before = await J(f"document.querySelector('{W} [id^=\"chartSvg\"]').innerHTML.length")
        await J("(() => { const T = __getT(); T.F.fields = new Set(['energy']); T.refresh(); })()"); await pg.wait_for_timeout(2500)   # a filter change, as the app makes it
        ok('C8 the filters redraw every chart window', await J(f"document.querySelector('{W} [id^=\"chartSvg\"]').innerHTML.length") != before)
        async with pg.expect_download() as dl: await J("winBtn.click(); document.querySelector('#winMenu [data-w=\"__save\"]').click()")
        path = os.path.join(tempfile.mkdtemp(), 'f.json'); await (await dl.value).save_as(path); f = json.load(open(path))
        ok('C9 My file keeps the chart windows', len(f.get('chartWindows', [])) == 1 and f['chartWindows'][0]['state']['tab'] == 'gaps' and f['chartWindows'][0]['state'].get('linked') is False)
        ctx2 = await b.new_context(viewport={'width': 1800, 'height': 1000}); pg2 = await ctx2.new_page(); pg2.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg2.goto('http://localhost:8765/test.html?welcome=0'); await pg2.wait_for_timeout(3000); await pg2.set_input_files('#viewFile', path); await pg2.wait_for_timeout(2500)
        ok('C10 a fresh browser gets the chart window back', await pg2.evaluate("Object.keys(__getT().CHI.roots).length") == 1 and await pg2.evaluate("!!document.querySelector('[id^=\"w-chartw\"] [id^=\"chartSvg\"] svg')"))
        await J("winBtn.click(); document.querySelector('#winMenu [data-w=\"__p_compare\"]').click()"); await pg.wait_for_timeout(2500)
        ok('C11 Compare shows two chart windows and the radar', await J("__getT().layout.charts.open && Object.keys(__getT().CHI.roots).length === 1 && __getT().layout.radar.open"))
        k2 = await J("Object.keys(__getT().CHI.roots)[0]")
        await J(f"document.querySelector('#w-{k2} .wh [data-a=\"x\"]').click()"); await pg.wait_for_timeout(500)
        ok('C12 closing a chart window removes it', await J(f"!document.getElementById('w-{k2}') && !Object.keys(__getT().CHI.roots).length"))
        ok('X1 no page errors', not errs)
        print(f"PASSED {sum(results)} of {len(results)} | page errors: {errs}")
        await b.close()
asyncio.run(main())
