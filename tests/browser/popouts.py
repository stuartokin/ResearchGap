"""Chart pop-outs, entering the tool through the welcome screen exactly as a visitor does (which resets the display
settings): Pop out opens a panel with its chart, a second opens beside it, and both follow the filters."""
import asyncio
from playwright.async_api import async_playwright
results = []
def ok(name, cond): results.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + name)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
        pg = await (await b.new_context(viewport={'width': 1700, 'height': 950})).new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto('http://localhost:8765/test.html'); await pg.wait_for_timeout(3000)
        await pg.click('#wAckBtn'); await pg.click('#wRun'); await pg.wait_for_timeout(2500)   # through the welcome screen, as a visitor
        await pg.click('#winBtn'); await pg.wait_for_timeout(300); await pg.click('#winMenu button[data-w="__p_charts"]'); await pg.wait_for_timeout(2000)
        await pg.click('#chPopOut'); await pg.wait_for_timeout(1500)
        ok('O1 Pop out opens a panel with its chart', await pg.evaluate("!document.getElementById('w-chartpop1').classList.contains('closed') && !!document.querySelector('#chpop1 svg')"))
        await pg.click('#chartTabs button[data-t="pipe"]'); await pg.wait_for_timeout(500); await pg.click('#chPopOut'); await pg.wait_for_timeout(1500)
        ok('O2 a second pop-out opens beside it, with the other chart', await pg.evaluate("!!document.querySelector('#chpop2 svg') && document.querySelector('#w-chartpop2 .wh h2').textContent !== document.querySelector('#w-chartpop1 .wh h2').textContent"))
        before = await pg.evaluate("document.getElementById('chpop1').innerHTML.length")
        await pg.evaluate("__getT().F.fields = new Set(['energy'])"); await pg.wait_for_timeout(2800)
        ok('O3 the pop-outs follow the filters', await pg.evaluate("document.getElementById('chpop1').innerHTML.length") != before)
        ok('X1 no page errors', not errs)
        print(f"PASSED {sum(results)} of {len(results)} | page errors: {errs}")
        await b.close()
asyncio.run(main())
