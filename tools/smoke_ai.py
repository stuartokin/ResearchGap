"""Check the AI-enhanced version in a browser after build_ai.py. Features that fail when loaded are paused (rebuilt
without them, once); the banner and the AI notices must be visible. Exit 1 only if the AI-enhanced version itself is
broken, so the workflow keeps the previous one; the standard version is never affected."""
import os
import asyncio, functools, http.server, json, pathlib, subprocess, sys, threading
ROOT = pathlib.Path(__file__).resolve().parent.parent
async def check(port):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('CHROME') or None, args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
        pg = await (await b.new_context(viewport={'width': 1440, 'height': 900})).new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto(f'http://localhost:{port}/ai/index.html?welcome=0')
        try: await pg.wait_for_function("document.getElementById('loading') && document.getElementById('loading').classList.contains('done')", timeout=60000)
        except Exception: pass
        await pg.wait_for_timeout(3000)
        r = await pg.evaluate("""(() => { const b = document.getElementById('aiBanner'); const vis = el => { if (!el) return false; const cs = getComputedStyle(el), r = el.getBoundingClientRect();
            return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > .5 && r.width > 60 && r.height > 10 && r.bottom <= innerHeight + 1 && r.top >= 0; };
            const feats = (window.SG_AI && window.SG_AI.features || []).map(f => f.id), st = (window.SG_AI && window.SG_AI.status) || {};
            return {booted: !!document.getElementById('winMenu') && document.getElementById('loading').classList.contains('done'), banner: vis(b),
              notice: !!b && /without human review/.test(b.textContent), failed: feats.filter(id => st[id] !== 'active')}; })()""")
        r['errors'] = errs; await b.close(); return r
def run_check():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
        def handle(self):
            try: super().handle()
            except (ConnectionResetError, BrokenPipeError): pass
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT))); threading.Thread(target=srv.serve_forever, daemon=True).start()
    try: return asyncio.run(check(srv.server_address[1]))
    finally: srv.shutdown()
def main():
    exp = sys.argv[sys.argv.index('--exp') + 1] if '--exp' in sys.argv else str(ROOT / 'experimental')
    r = run_check()
    if r['booted'] and r['failed']:
        print('Pausing features that failed when loaded:', ', '.join(r['failed']))
        subprocess.run([sys.executable, str(ROOT / 'tools/build_ai.py'), '--exp', exp, '--skip', *r['failed']], check=True); r = run_check()
    ok = r['booted'] and r['banner'] and r['notice'] and not r['failed']
    print(f"AI-enhanced version check: {'passed' if ok else 'FAILED'} (started: {r['booted']}, banner visible: {r['banner']}, notice: {r['notice']}, failed features: {r['failed'] or 'none'})")
    if r['errors']: print('  page errors:', r['errors'][:3])
    return 0 if ok else 1
if __name__ == '__main__': sys.exit(main())
