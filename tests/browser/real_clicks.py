"""Real mouse clicks along the path a visitor takes: the welcome screen, "Run the tool", then the controls added most
recently. Other suites often trigger buttons from code, which can miss problems a real click meets (for example a
button rebuilt on every redraw, or a setting cleared by "Run the tool"). Slow, because each click waits for steady frames."""
import asyncio
from playwright.async_api import async_playwright
results = []
def ok(name, cond): results.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + name)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
        pg = await (await b.new_context(viewport={'width': 1600, 'height': 900})).new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto('http://localhost:8765/test.html'); await pg.wait_for_timeout(3500)
        T = 40000
        async def click(sel, name):
            try: await pg.click(sel, timeout=T); await pg.wait_for_timeout(1500); return True
            except Exception as e: print(f'   {name}: the click did not land ({str(e)[:90]})'); return False
        await click('#wAckBtn', 'acknowledge'); await click('#wRun', 'Run the tool')
        await click('#winBtn', 'Views'); await click('#winMenu button[data-w="__p_charts"]', 'Charts')
        ok('C1 New window opens a full chart window', await click('#chNewWin', 'New window') and await pg.evaluate("(() => { const w = document.querySelector('[id^=w-chartw]'); return !!w && !w.classList.contains('closed') && !!w.querySelector('[id^=chartSvg] svg') && !!w.querySelector('[id^=chartTabs] button'); })()"))
        ok('C2 a chart tab switches the chart', await click('#chartTabs button[data-t="heat"]', 'tab') and await pg.evaluate("document.querySelector('#w-charts .wh h2').textContent.includes('Heatmap')"))
        # insights open by themselves on a new chart (the default); the button then closes and reopens it
        opened = await pg.evaluate("document.getElementById('chartCallout').classList.contains('on')")
        ok('C3a a new chart opens its insight by itself', opened)
        await click('#chInsight', 'Insight'); closed = not await pg.evaluate("document.getElementById('chartCallout').classList.contains('on')")
        await click('#chInsight', 'Insight'); reopened = await pg.evaluate("document.getElementById('chartCallout').classList.contains('on')")
        ok('C3b the Insight button closes it and opens it again', closed and reopened)
        await click('#presentBtn', 'Present')
        r0 = await pg.evaluate("__getT().state.autoRotate")
        ok('C4 an item in Present works', await click('#rotBtn', 'Auto-rotate') and await pg.evaluate("__getT().state.autoRotate") != r0)
        await click('#aboutBtn', 'Help')
        ok('C5 Help opens How it works in front', await click('#helpDocsBtn', 'How it works') and await pg.evaluate("+document.getElementById('w-docs').style.zIndex > +document.getElementById('w-help').style.zIndex"))
        await click('#winBtn', 'Views'); await click('#winMenu [data-w="__questions"]', 'questions')
        ok('C6 a question’s “Show me” sets up its view', await click('#qBody .qgo[data-q="clean-ai"]', 'Show me') and await pg.evaluate("__getT().layout.charts.open && __getT().F.vision"))
        ok('X1 no page errors', not errs)
        print(f"PASSED {sum(results)} of {len(results)} | page errors: {errs}")
        await b.close()
asyncio.run(main())
