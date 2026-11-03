#!/usr/bin/env python3
"""Narration check (code, no model): play each analysis tour in a headless browser and, for every step, compare what is
said with what is on screen. Every number spoken must be visible at that moment (years, dates and times aside).

Writes .narration/report.json (each step's narration, template, numbers not on screen, and a screenshot path) for the
narration review agent, and prints a summary. Advisory: exits 0 unless --strict and a number is missing.
"""
import os, sys, json, re, asyncio, threading, http.server, functools
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]; OUT = ROOT / '.narration'
TOURS = ['cleanweek', 'week']
MONTHS = r'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*'

def spoken_numbers(text):
    t = re.sub(r'\b\d{1,2}:\d{2}\b', ' ', text)                       # times
    t = re.sub(rf'\b\d{{1,2}}\s+{MONTHS}\b', ' ', t)                   # dates such as 2 Nov
    nums = re.findall(r'(?<![\w.])\d+(?:\.\d+)?(?![\w])', t)
    return [n for n in nums if not (len(n) == 4 and n.isdigit() and 1900 <= int(n) <= 2100)]   # years

def visible_numbers(text):
    return set(re.findall(r'(?<![\w.])\d+(?:\.\d+)?(?![\w])', text))

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

async def play(port):
    from playwright.async_api import async_playwright
    rows = []
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('CHROME') or None, args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
        pg = await (await b.new_context(viewport={'width': 1440, 'height': 900})).new_page()
        await pg.goto(f'http://127.0.0.1:{port}/index.html?welcome=0'); await pg.wait_for_function('!!window.__tourPlay', polling=500, timeout=90000); await pg.wait_for_timeout(4000)
        templates = json.loads((ROOT / 'data/tours.json').read_text(encoding='utf-8'))['tours']
        for tid in TOURS:
            first = await pg.evaluate(f'window.__tourPlay({json.dumps(tid)}, 0)')
            if not first: continue
            for i in range(first['count']):
                info = await pg.evaluate(f'window.__tourPlay({json.dumps(tid)}, {i})'); await pg.wait_for_timeout(3800)
                cap = (await pg.evaluate("document.getElementById('tourCap').textContent") or '').strip()
                seen = await pg.evaluate("(() => { const bar = document.getElementById('tourBar'); const all = document.body.innerText; return bar ? all.replace(bar.innerText, ' ') : all; })()")
                shot = OUT / f'{tid}-{i + 1}-{info["step"]}.jpg'
                await pg.screenshot(path=str(shot), type='jpeg', quality=70)
                st = templates.get(tid, {}).get('steps', {}); tpl = (st.get(info['step']) if isinstance(st, dict) else next((x for x in st if x.get('id') == info['step']), None)) or {}
                vis = visible_numbers(seen); missing = [n for n in dict.fromkeys(spoken_numbers(cap)) if n not in vis]
                rows.append({'tour': tid, 'step': info['step'], 'index': i, 'narration': cap, 'template': tpl.get('say'), 'view': tpl.get('view'),
                             'notOnScreen': missing, 'shot': shot.relative_to(ROOT).as_posix()})
            await pg.evaluate("document.getElementById('tourSkip') && document.getElementById('tourSkip').click()"); await pg.wait_for_timeout(800)
        await b.close()
    return rows

def main():
    OUT.mkdir(exist_ok=True)
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT))); threading.Thread(target=srv.serve_forever, daemon=True).start()
    try: rows = asyncio.run(play(srv.server_address[1]))
    finally: srv.shutdown()
    (OUT / 'report.json').write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding='utf-8')
    bad = [r for r in rows if r['notOnScreen']]
    for r in rows: print(f"{'!!' if r['notOnScreen'] else 'ok'} {r['tour']}.{r['step']}: {r['narration'][:110]}" + (f"  [not on screen: {', '.join(r['notOnScreen'])}]" if r['notOnScreen'] else ''))
    print(f'Narration check: {len(rows)} steps, {len(bad)} with a number not on screen.')
    return 1 if bad and '--strict' in sys.argv else 0

if __name__ == '__main__':
    sys.exit(main())
