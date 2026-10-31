"""Reviews: marking as reviewed hides an item until it changes (then the review lapses); admin tools appear only when
switched on; the system file carries real record ids and the right decisions; reviews travel in My file."""
import asyncio, json, os, tempfile
from playwright.async_api import async_playwright
results = []
def ok(name, cond): results.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + name)
URL = 'http://localhost:8765/test.html?view=none&welcome=0'
OPEN_INS = "winBtn.click(); if (!document.querySelector('#winMenu button[data-w=\"inspect\"]')) document.querySelector('#winMenu .wmall').click(); document.querySelector('#winMenu button[data-w=\"inspect\"]').click();"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
        async def page(ctx):
            pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
            pg.on('dialog', lambda d: asyncio.ensure_future(d.accept('checked in test') if d.type == 'prompt' else d.accept()))
            await pg.goto(URL); await pg.wait_for_timeout(3000)
            await pg.evaluate(OPEN_INS); await pg.wait_for_function("document.querySelectorAll('#w-inspect .insrow').length > 0", timeout=15000); return pg, errs
        ctx = await b.new_context(viewport={'width': 1600, 'height': 900}, accept_downloads=True); pg, errs = await page(ctx); J = pg.evaluate
        first = "(() => [...document.querySelectorAll('#w-inspect .insrow')].find(r => /Disputed/.test(r.querySelector('.inscat').textContent)))()"
        tid = await J(f"{first}.dataset.row")
        rowsBefore = await J("document.querySelectorAll('#w-inspect .insrow').length")
        await J(f"{first}.querySelector('.inshead').click()"); await pg.wait_for_timeout(500)
        await J(f"document.querySelector('#w-inspect .insrow.open [data-review]').click()"); await pg.wait_for_timeout(800)
        ok('R1 marking as reviewed hides it from the list', await J(f"!document.querySelector('#w-inspect .insrow[data-row=\"{tid}\"]')") and await J("document.querySelectorAll('#w-inspect .insrow').length") == rowsBefore - 1)
        ok('R2 "Show reviewed" counts it', '1' in await J("document.querySelector('#w-inspect [data-showrev] b').textContent"))
        await J("document.querySelector('#w-inspect [data-showrev]').click()"); await pg.wait_for_timeout(600)
        ok('R3 shown again, it is marked Reviewed', 'Reviewed' in await J(f"document.querySelector('#w-inspect .insrow[data-row=\"{tid}\"]').textContent"))
        await J("document.querySelector('#w-inspect [data-showrev]').click()"); await pg.wait_for_timeout(400)
        # an agent changes the record (a new QA note): the review lapses and it returns
        await J(f"(() => {{ const m = __getT().DB.milestones.find(x => x.id === '{tid}'); m.provenance.qaNote = 'A new note from the QA agent.'; }})()")
        await J(OPEN_INS.split('winBtn.click();')[0] + "document.getElementById('insQ').dispatchEvent(new Event('input', {bubbles:true}))")
        try: await pg.wait_for_function(f"/lapsed/.test((document.querySelector('#w-inspect .insrow[data-row=\"{tid}\"]') || {{}}).textContent || '')", timeout=5000)
        except Exception: pass
        ok('R4 when the record changes, the review lapses and it returns', 'lapsed' in await J(f"(document.querySelector('#w-inspect .insrow[data-row=\"{tid}\"]') || {{}}).textContent || ''"))
        # admin tools only when switched on
        await J(f"(() => {{ const r = {first}; if (!r.classList.contains('open')) r.querySelector('.inshead').click(); }})()"); await pg.wait_for_timeout(400)   # open it, without toggling it shut
        ok('A1 the row is open', await J("!!document.querySelector('#w-inspect .insrow.open')"))
        ok('A1b without admin tools, no decisions for everyone are offered', not await J("!!document.querySelector('#w-inspect .insadm')") and not await J("!!document.getElementById('insCurDl')"))
        await J("(() => { const s = document.getElementById('adminS'); s.value = 'on'; s.dispatchEvent(new Event('change')); })()"); await pg.wait_for_timeout(700)
        ok('A2 with admin tools on, the inspector offers them', await J("!!document.querySelector('#w-inspect .insadm')"))
        ok('A3 …and Share offers the system file', await J("getComputedStyle(document.querySelector('#shareMenu .admonly')).display !== 'none'"))
        # make the four kinds of decision
        await J("document.querySelector('#w-inspect .insrow.open [data-adm=\"reviewed\"]').click()"); await pg.wait_for_timeout(500)
        dis = "(() => [...document.querySelectorAll('#w-inspect .insrow')].filter(r => /Disputed/.test(r.querySelector('.inscat').textContent))[1])()"
        tid2 = await J(f"{dis}.dataset.row"); await J(f"(() => {{ const r = {dis}; if (!r.classList.contains('open')) r.querySelector('.inshead').click(); }})()"); await pg.wait_for_timeout(400)
        await J("document.querySelector('#w-inspect .insrow.open [data-adm=\"clear-dispute\"]').click()"); await pg.wait_for_timeout(500)
        dup = "(() => [...document.querySelectorAll('#w-inspect .insrow')].find(r => /duplicate/i.test(r.querySelector('.inscat').textContent)))()"
        has_dup = await J(f"!!{dup}")
        if has_dup:
            await J(f"(() => {{ const r = {dup}; if (!r.classList.contains('open')) r.querySelector('.inshead').click(); }})()"); await pg.wait_for_timeout(400)
            await J("document.querySelector('#w-inspect .insrow.open [data-adm=\"not-duplicate\"]').click()"); await pg.wait_for_timeout(500)
        async with pg.expect_download() as dl: await J("document.getElementById('insCurDl').click()")
        cur = json.load(open(await (await dl.value).path())); dec = cur['decisions']; ids = {m['id'] for m in await J("__getT().DB.milestones.map(m => ({id:m.id}))")}
        acts = {d['action'] for d in dec}
        ok('A4 the system file holds the decisions made', {'reviewed', 'clear-dispute'} <= acts and (not has_dup or 'not-duplicate' in acts))
        ok('A5 every decision names real records', all(d['id'] in ids and (d.get('other') is None or d['other'] in ids) for d in dec if d['action'] in ('reviewed', 'clear-dispute', 'not-duplicate')))
        ok('A6 reviews carry a fingerprint, so they can lapse for everyone too', all(d.get('sig') for d in dec if d['action'] in ('reviewed', 'clear-dispute')))
        # reviews travel in My file
        async with pg.expect_download() as dl: await J("winBtn.click(); document.querySelector('#winMenu [data-w=\"__save\"]').click()")
        path = os.path.join(tempfile.mkdtemp(), 'f.json'); await (await dl.value).save_as(path)
        ctx2 = await b.new_context(viewport={'width': 1600, 'height': 900}); pg2, errs2 = await page(ctx2)
        await pg2.set_input_files('#viewFile', path); await pg2.wait_for_timeout(2000); await pg2.evaluate(OPEN_INS.split('winBtn.click();')[0] + "document.getElementById('insQ').dispatchEvent(new Event('input', {bubbles:true}))"); await pg2.wait_for_timeout(900)
        ok('R5 in a fresh browser, My file brings the review marks back', '1' in await pg2.evaluate("document.querySelector('#w-inspect [data-showrev] b').textContent") or '2' in await pg2.evaluate("document.querySelector('#w-inspect [data-showrev] b').textContent"))
        ok('X1 no page errors', not errs and not errs2)
        print(f"PASSED {sum(results)} of {len(results)} | page errors: {errs + errs2}")
        await b.close()
asyncio.run(main())
