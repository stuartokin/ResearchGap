"""Data inspector, documentation and window layering: the windows open in front, every category fills, search and
the empty state work, and the documentation opens from Help with all its sections."""
import asyncio
from playwright.async_api import async_playwright
results = []
def ok(name, cond): results.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ') + name)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
        pg = await (await b.new_context(viewport={'width': 1700, 'height': 950})).new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto('http://localhost:8765/test.html?welcome=0'); await pg.wait_for_timeout(3500)
        await pg.evaluate("winBtn.click(); document.querySelector('#winMenu button[data-w=\"__p_charts\"]').click();"); await pg.wait_for_timeout(1500)
        await pg.evaluate("winBtn.click(); if (!document.querySelector('#winMenu button[data-w=\"inspect\"]')) document.querySelector('#winMenu .wmall').click();"); await pg.wait_for_timeout(300)
        await pg.evaluate("document.querySelector('#winMenu button[data-w=\"inspect\"]').click()"); await pg.wait_for_timeout(2500)
        ok('I1 a window opened from the menu comes in front of Charts', await pg.evaluate("+document.getElementById('w-inspect').style.zIndex > +document.getElementById('w-charts').style.zIndex"))
        ok('I2 the menu closes after opening a window', await pg.evaluate("!document.getElementById('winMenu').classList.contains('open')"))
        cats = await pg.evaluate("[...document.querySelectorAll('#w-inspect [data-cat]')].length")
        ok('I3 all seven categories are offered', cats == 7)
        ok('I4 the inspector lists items', await pg.evaluate("document.querySelectorAll('#w-inspect .insrow').length") > 0)
        await pg.fill('#insQ', 'zzzz-no-such-thing'); await pg.wait_for_timeout(1200)
        ok('I5 a search with no match says so', 'Nothing matches' in (await pg.evaluate("(document.querySelector('#w-inspect .empty') || {}).textContent || ''")))
        await pg.fill('#insQ', ''); await pg.wait_for_timeout(1000)
        # with the player bar open (the default arrangement), the inspector's footer must be clear of it
        await pg.evaluate('winBtn.click(); document.querySelector(`#winMenu button[data-w="__p_explore"]`).click();'); await pg.wait_for_timeout(1500)
        await pg.evaluate('winBtn.click(); if (!document.querySelector(`#winMenu button[data-w="inspect"]`)) document.querySelector("#winMenu .wmall").click(); document.querySelector(`#winMenu button[data-w="inspect"]`).click();'); await pg.wait_for_timeout(1800)
        clear = await pg.evaluate('(() => { const p = document.getElementById("w-player"), i = document.getElementById("w-inspect").getBoundingClientRect(); if (p.classList.contains("closed")) return "no player"; const r = p.getBoundingClientRect(); return i.bottom <= r.top || i.right <= r.left || i.left >= r.right; })()')
        print('   player and inspector:', await pg.evaluate('(() => { const p = document.getElementById("w-player").getBoundingClientRect(), i = document.getElementById("w-inspect").getBoundingClientRect(); return [Math.round(p.top), Math.round(i.bottom)]; })()'), clear)
        ok('I6 with the player bar open, the inspector footer is clear of it', clear is True)
        await pg.evaluate("document.getElementById('aboutBtn').click()"); await pg.wait_for_timeout(600)
        await pg.evaluate("document.getElementById('helpDocsBtn').click()"); await pg.wait_for_timeout(1500)
        ok('D1 the documentation opens from Help', await pg.evaluate("!document.getElementById('w-docs').classList.contains('closed')"))
        ok('D2 the documentation has its sections', await pg.evaluate("document.querySelectorAll('#docBody details, #docBody section, #docBody h3').length") >= 10)
        ok('X1 no page errors', not errs)
        print(f"PASSED {sum(1 for _, c in results if c)} of {len(results)} | page errors: {errs}")
        await b.close()
asyncio.run(main())
