"""The two versions, as a visitor meets them: the switch both ways (and a shared ?ui=ai link), the AI-enhanced
version's banner and What's new, the sample feature's chart, insight and story links, an insight with a typed number
refused, and the standard version with no experimental code at all."""
import asyncio, pathlib, subprocess, sys
from playwright.async_api import async_playwright
ROOT = next(d for d in pathlib.Path(__file__).resolve().parents if (d / "tools/build_ai.py").exists())   # also when the test rig runs a working copy
TEST = 'http://localhost:8765/test.html'; BASE = TEST.rsplit('/', 1)[0]
results = []
def ok(name, cond): results.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + name)
async def main():
    subprocess.run([sys.executable, str(ROOT / 'tools/build_ai.py')], capture_output=True)
    page = (ROOT / 'ai/index.html').read_text(encoding='utf-8')   # a variant with a typed number in the sample insight, to prove it is refused
    (ROOT / 'ai/_typed.html').write_text(page.replace('{aiScale} of the {scale} clean energy', '{aiScale} of the 10 clean energy'), encoding='utf-8')
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
        pg = await (await b.new_context(viewport={'width': 1700, 'height': 950})).new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200])); J = pg.evaluate
        await pg.goto(TEST + '?welcome=0'); await pg.wait_for_timeout(3500)
        ok('V1 the standard version has no banner and no experimental code', not await J("!!document.getElementById('aiBanner')") and not await J("!!window.SG_AI") and not await J("[...document.querySelectorAll('#chartTabs button')].some(b => b.dataset.t.startsWith('x-'))"))
        await pg.goto(BASE + '/index.html?ui=ai&welcome=0'); await pg.wait_for_timeout(4500)
        ok('V2 a shared ?ui=ai link opens the AI-enhanced version', '/ai/' in pg.url and await J("!!window.SG_AI"))
        ok('V3 its banner is visible, saying it is changed by AI without human review', await J("(() => { const b = document.getElementById('aiBanner'), r = b.getBoundingClientRect(); return getComputedStyle(b).display !== 'none' && r.bottom <= innerHeight && /without human review/.test(b.textContent); })()"))
        ok('V4 the data and narration load from one folder up', await J("document.getElementById('loading').classList.contains('done')") and await J("document.body.innerText.length > 500"))
        await J("winBtn.click(); document.querySelector('#winMenu button[data-w=\"__p_charts\"]').click()"); await pg.wait_for_timeout(1500)
        tab = await J("([...document.querySelectorAll('#chartTabs button')].find(b => b.dataset.t.startsWith('x-')) || {dataset:{}}).dataset.t || ''")
        await J(f"document.querySelector('#chartTabs button[data-t=\"{tab}\"]').click()"); await pg.wait_for_timeout(1200)
        ok('V5 the sample feature’s chart draws, with its own controls', await J("!!document.querySelector('#chartSvg [data-xact=\"stage\"]')") and 'experimental chart' in await J("document.getElementById('chartCtl').textContent"))
        ins = await J("(document.querySelector('#chartCallout .cotext') || {}).textContent || ''")
        ok('V6 its insight is filled from the data', 'clean energy technologies at scale are AI-driven' in ins and '{' not in ins)
        await J("document.querySelector('#chartSvg [data-xact=\"stage\"][data-xval=\"commercial\"]').dispatchEvent(new MouseEvent('click', {bubbles:true}))"); await pg.wait_for_timeout(700)
        await J("(() => { const s = document.querySelector('#chartSide [data-xact=\"story\"]'); s && s.dispatchEvent(new MouseEvent('click', {bubbles:true})); })()"); await pg.wait_for_timeout(700)
        ok('V7 a bar lists its technologies, and one opens its story', await J("document.getElementById('detailBody').innerText.length > 80"))
        await pg.click('#aiNews'); await pg.wait_for_timeout(600)
        ok('V8 What’s new lists the features', 'AI by readiness' in await J("(document.querySelector('[id^=\"w-xp-core\"] .xbody') || {}).innerText || ''"))
        await pg.click('#aiBack'); await pg.wait_for_timeout(3500)
        ok('V9 Back to standard returns to the standard version', '/ai/' not in pg.url and not await J("!!window.SG_AI"))
        await pg.goto(BASE + '/ai/_typed.html?welcome=0'); await pg.wait_for_timeout(4000)
        ok('V10 an insight with a typed number is refused, and the chart still works', await J("/typed numbers/.test(JSON.stringify(window.SG_AI.status))") and await J("window.SG_AI.status['ai-by-readiness'] === 'active'"))
        ok('X1 no page errors', not errs)
        print(f"PASSED {sum(results)} of {len(results)} | page errors: {errs}")
        await b.close()
    (ROOT / 'ai/_typed.html').unlink(missing_ok=True)
asyncio.run(main())
