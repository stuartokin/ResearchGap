"""The welcome screen's signposts, and insights: ribbons appear only after acknowledging; a question's insight opens by
itself with every figure filled and clickable numbers; it replaces the chart's own insight; closed chart insights stay
closed until the chart changes; the setting turns both off; tours hide the card."""
import asyncio
from playwright.async_api import async_playwright
results = []
def ok(name, cond): results.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + name)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
        pg = await (await b.new_context(viewport={'width': 1600, 'height': 950})).new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200])); J = pg.evaluate
        await pg.goto('http://localhost:8765/test.html'); await pg.wait_for_timeout(3000)
        ok('W1 no signposts before acknowledging', not any(await J("[...document.querySelectorAll('#welcome .wrib')].map(x => x.offsetParent !== null)")))
        await pg.click('#wAckBtn'); await pg.wait_for_timeout(2200)
        ok('W2 three signposts after: Learn, Start here, Jump right in', [t.split(' ', 1)[1] for t in await J("[...document.querySelectorAll('#welcome .wrib')].map(x => x.textContent)")] == ['Learn', 'Start here', 'Jump right in'])
        ok('W3 one is highlighted at a time', sum(await J("[...document.querySelectorAll('#welcome .wrib')].map(x => x.classList.contains('lit'))")) == 1)
        await pg.click('#wQuestions'); await pg.wait_for_timeout(2500)
        await J("document.querySelector('#qBody .qgo[data-q=\"clean-ai\"]').click()"); await pg.wait_for_timeout(2500)
        ok('Q1 the question’s insight opens by itself', await J("document.getElementById('qInsight').classList.contains('on')"))
        ok('Q2 every figure is filled', not await J("/\\{/.test(document.querySelector('#qInsight .qitext').textContent)") and len(await J("document.querySelectorAll('#qInsight .colink')")) if False else not await J("/\\{/.test(document.querySelector('#qInsight .qitext').textContent)"))
        ok('Q3 its numbers can be selected', await J("document.querySelectorAll('#qInsight .colink').length") >= 2)
        ok('Q4 it replaces the chart’s own insight', not await J("document.getElementById('chartCallout').classList.contains('on')"))
        await J("document.querySelector('#chartTabs button[data-t=\"heat\"]').click()"); await pg.wait_for_timeout(800)
        ok('C1 a new chart opens its insight', await J("document.getElementById('chartCallout').classList.contains('on')"))
        await J("document.getElementById('coX').click()"); await pg.wait_for_timeout(800)
        ok('C2 closed, it stays closed', not await J("document.getElementById('chartCallout').classList.contains('on')"))
        await J("(() => { const s = document.getElementById('autoInsS'); s.value = 'off'; s.dispatchEvent(new Event('change')); })()"); await pg.wait_for_timeout(300)
        await J("document.querySelector('#chartTabs button[data-t=\"ai\"]').click()"); await pg.wait_for_timeout(800)
        ok('S1 with the setting off, insights stay closed', not await J("document.getElementById('chartCallout').classList.contains('on')") and not await J("document.getElementById('qInsight').classList.contains('on')"))
        await J("(() => { const s = document.getElementById('autoInsS'); s.value = 'on'; s.dispatchEvent(new Event('change')); })()")
        await J("winBtn.click(); document.querySelector('#winMenu [data-w=\"__questions\"]').click()"); await pg.wait_for_timeout(600)
        await J("document.querySelector('#qBody .qgo[data-q=\"changed\"]').click()"); await pg.wait_for_timeout(2500)
        ok('Q5 a question without a chart still has its insight', await J("document.getElementById('qInsight').classList.contains('on')"))
        await pg.click('#toursBtn'); await pg.wait_for_timeout(500); await J("__getT().tour && 0"); await J("document.querySelector('.wcard[data-tour=\"gap\"]').click()"); await pg.wait_for_timeout(1500)
        ok('T1 tours hide the insight card', await J("getComputedStyle(document.getElementById('qInsight')).display === 'none'"))
        ok('X1 no page errors', not errs)
        print(f"PASSED {sum(results)} of {len(results)} | page errors: {errs}")
        await b.close()
asyncio.run(main())
