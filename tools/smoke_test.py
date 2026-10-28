#!/usr/bin/env python3
"""Gate: open the rebuilt page in a headless browser and check it works with the new data."""
import asyncio, json, subprocess, sys, time
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

async def main():
    from playwright.async_api import async_playwright
    db = json.loads((ROOT / 'data/data.json').read_text(encoding='utf-8'))
    server = subprocess.Popen([sys.executable, '-m', 'http.server', '8799'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.5)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
            pg = await (await b.new_context(viewport={'width': 1600, 'height': 900})).new_page()
            errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto('http://localhost:8799/index.html?view=none'); await pg.wait_for_timeout(6000)
            r = await pg.evaluate("() => ({labels: document.querySelectorAll('.lbl').length, ver: document.getElementById('verLine').textContent, rows: document.querySelectorAll('#fieldList .frow').length})")
            await b.close()
    finally:
        server.terminate()
    live = sum(1 for m in db['milestones'] if not (m.get('flags') or {}).get('hidden'))
    problems = []
    if errs: problems.append(f'page errors: {errs[:3]}')
    if r['labels'] != live: problems.append(f"{r['labels']} arcs rendered, expected {live}")
    if f"Data revision {db['meta']['revision']}" not in r['ver']: problems.append('page is not showing the new data revision')
    if r['rows'] != len(db['fields']): problems.append('field list incomplete')
    for x in problems: print('ERROR', x)
    print('Smoke test passed.' if not problems else 'Smoke test failed.')
    return 1 if problems else 0

if __name__ == '__main__':
    sys.exit(asyncio.run(main()))
