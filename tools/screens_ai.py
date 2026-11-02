"""Screenshots of the AI-enhanced version for the weekly agent (and its report): phone, tablet and laptop, plus each
experimental chart tab on a laptop. python tools/screens_ai.py --out .ai-run/screens"""
import asyncio, functools, http.server, pathlib, sys, threading
ROOT = pathlib.Path(__file__).resolve().parent.parent
async def shoot(port, out):
    from playwright.async_api import async_playwright
    out.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
        for name, w, h, mob in (('phone', 390, 844, True), ('tablet', 1024, 768, True), ('laptop', 1440, 900, False)):
            pg = await (await b.new_context(viewport={'width': w, 'height': h}, is_mobile=mob, has_touch=mob)).new_page()
            await pg.goto(f'http://localhost:{port}/ai/index.html?welcome=0'); await pg.wait_for_timeout(6000)
            await pg.screenshot(path=str(out / f'{name}.png'))
            if name == 'laptop':
                await pg.evaluate("winBtn.click(); document.querySelector('#winMenu button[data-w=\"__p_charts\"]').click()"); await pg.wait_for_timeout(1500)
                tabs = await pg.evaluate("[...document.querySelectorAll('#chartTabs button')].map(b => b.dataset.t).filter(t => t && t.startsWith('x-'))")
                for t in tabs:
                    await pg.evaluate(f"document.querySelector('#chartTabs button[data-t=\"{t}\"]').click()"); await pg.wait_for_timeout(1200)
                    await pg.screenshot(path=str(out / f'chart-{t}.png'))
            await pg.close()
        await b.close()
def main():
    out = pathlib.Path(sys.argv[sys.argv.index('--out') + 1]) if '--out' in sys.argv else ROOT / '.ai-run/screens'
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
        def handle(self):
            try: super().handle()
            except (ConnectionResetError, BrokenPipeError): pass
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT))); threading.Thread(target=srv.serve_forever, daemon=True).start()
    try: asyncio.run(shoot(srv.server_address[1], out if out.is_absolute() else ROOT / out))
    finally: srv.shutdown()
    print('Screenshots saved to', out); return 0
if __name__ == '__main__': sys.exit(main())
