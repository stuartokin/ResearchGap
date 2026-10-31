"""My file and My views: a view keeps its own filters; the status sign; saving My file and opening it in a fresh browser;
old saved views joining My views; autosave to this browser surviving a reload; opening a view at start."""
import asyncio, json, os, tempfile
from playwright.async_api import async_playwright
results = []
def ok(name, cond): results.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + name)
URL = 'http://localhost:8765/test.html?view=none&welcome=0'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
        names = iter(['Board briefing', 'my-test-file'])
        async def page(ctx):
            pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
            pg.on('dialog', lambda d: asyncio.ensure_future(d.accept(next(names, 'x')) if d.type == 'prompt' else d.accept()))
            await pg.goto(URL); await pg.wait_for_timeout(3000); return pg, errs
        ctx = await b.new_context(viewport={'width': 1600, 'height': 900}, accept_downloads=True); pg, errs = await page(ctx); J = pg.evaluate
        await J("(() => { const T = __getT(); T.F.fields = new Set(['energy']); })()")
        await J("winBtn.click()"); await pg.wait_for_timeout(200); await J("document.querySelector('#winMenu [data-mvact=\"new\"]').click()"); await pg.wait_for_timeout(500)
        ok('M1 "Save this view as…" adds it to My views', 'Board briefing' in await J("[...document.querySelectorAll('#winMenu .mvrow')].map(r => r.textContent).join()") if await J("winBtn.click() || true") else False)
        ok('M2 the sign shows Unsaved', 'Unsaved' in await J("document.getElementById('saveSign').textContent"))
        await J("(() => { const T = __getT(); T.F.fields = new Set(T.FKEYS); })()")
        await J("document.querySelector('#winMenu [data-mvact=\"apply\"]') || winBtn.click()"); await pg.wait_for_timeout(200)
        await J("document.querySelector('#winMenu [data-mvact=\"apply\"]').click()"); await pg.wait_for_timeout(1200)
        ok('M3 opening the view brings back its own filters', await J("[...__getT().F.fields].join()") == 'energy')
        # My list, then save the file
        await J("winBtn.click(); if (!document.querySelector('#winMenu button[data-w=\"inspect\"]')) document.querySelector('#winMenu .wmall').click(); document.querySelector('#winMenu button[data-w=\"inspect\"]').click();"); await pg.wait_for_timeout(1800)
        await pg.wait_for_function("document.querySelectorAll('#w-inspect .insrow').length > 0", timeout=15000)
        await J("(() => { const r = document.querySelector('#w-inspect .insrow .inshead'); r && r.click(); })()"); await pg.wait_for_function("!!document.querySelector('#w-inspect .insrow.open [data-mine]')", timeout=10000)
        await J("(() => { const m = document.querySelector('#w-inspect .insrow.open [data-mine]'); m && m.click(); })()"); await pg.wait_for_timeout(400)
        ok('M4 adding to My list shows in the inspector', '(1)' in await J("document.getElementById('insFoot').textContent"))
        async with pg.expect_download() as dl: await J("winBtn.click(); document.querySelector('#winMenu [data-w=\"__save\"]').click()")
        path = os.path.join(tempfile.mkdtemp(), 'my-file.json'); await (await dl.value).save_as(path); f = json.load(open(path))
        ok('M5 My file holds My views and My list', f.get('kind') == 'my-file' and [v['name'] for v in f['personal']['myViews']] == ['Board briefing'] and len(f['personal']['inspector']['mine']) == 1)
        ok('M6 the sign shows Saved', 'Saved' in await J("document.getElementById('saveSign').textContent"))
        # a completely fresh browser opens the file
        ctx2 = await b.new_context(viewport={'width': 1600, 'height': 900}, accept_downloads=True); pg2, errs2 = await page(ctx2)
        await pg2.set_input_files('#viewFile', path); await pg2.wait_for_timeout(2000)
        ok('M7 a fresh browser gets My views back from the file', 'Board briefing' in await pg2.evaluate("winBtn.click(); [...document.querySelectorAll('#winMenu .mvrow')].map(r => r.textContent).join()"))
        await pg2.evaluate("winBtn.click(); if (!document.querySelector('#winMenu button[data-w=\"inspect\"]')) document.querySelector('#winMenu .wmall').click(); document.querySelector('#winMenu button[data-w=\"inspect\"]').click();"); await pg2.wait_for_timeout(1800); await pg2.wait_for_function("document.querySelectorAll('#w-inspect .insrow').length > 0", timeout=15000)
        ok('M8 …and My list', '(1)' in await pg2.evaluate("document.getElementById('insFoot').textContent"))
        # an old-style saved view (no personal section) opens and joins My views
        old = dict(f); old.pop('personal'); old.pop('kind'); old['name'] = 'Old conference view'
        op = os.path.join(tempfile.mkdtemp(), 'old.json'); json.dump(old, open(op, 'w')); await pg2.set_input_files('#viewFile', op); await pg2.wait_for_timeout(1500)
        ok('M9 an old saved view opens and joins My views', 'Old conference view' in await pg2.evaluate("winBtn.click(); [...document.querySelectorAll('#winMenu .mvrow')].map(r => r.textContent).join()"))
        # autosave to this browser survives a reload; open at start
        await pg2.evaluate("(() => { const s = document.getElementById('autosaveS'); s.value = 'on'; s.dispatchEvent(new Event('change')); })()"); await pg2.wait_for_timeout(2500)
        ok('M10 autosave says it is saving in this browser', 'browser' in await pg2.evaluate("document.getElementById('saveSign').textContent"))
        await pg2.evaluate("winBtn.click(); document.querySelector('#winMenu [data-mvact=\"start\"]').click()")   # then reload at once: the change must not be lost
        await pg2.goto('http://localhost:8765/test.html?welcome=0'); await pg2.wait_for_timeout(4500)   # a normal visit: no view asked for in the address
        ok('M11 after a reload, autosave has kept My views', await pg2.evaluate("winBtn.click(); document.querySelectorAll('#winMenu .mvrow').length") == 2)
        ok('M12 a view marked "at start" opens at start', await pg2.evaluate("[...__getT().F.fields].join()") == 'energy')
        ok('X1 no page errors', not errs and not errs2)
        print(f"PASSED {sum(results)} of {len(results)} | page errors: {errs + errs2}")
        await b.close()
asyncio.run(main())
