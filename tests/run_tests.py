#!/usr/bin/env python3
"""The test rig. Run it by hand (Actions → Test suite → Run workflow), or locally:  python tests/run_tests.py [all|agents|browser]

agents : the agents' guardrails, offline with simulated answers (no API calls, no cost)
browser: builds a test copy of the app beside index.html, serves the repository locally, and runs the browser suites
         (functions, the settings round trip, the Data inspector and documentation). The test copy is removed afterwards.
"""
import sys, os, re, subprocess, threading, functools, http.server, socketserver, shutil
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
RUN = str(os.getpid())   # each run has its own test page and working folder, so runs never disturb each other
WORK = ROOT / 'tests/_work' / RUN
PAGE = f'_test-{RUN}.html'
HOOK = "function boot(){ window.__getT=()=>({items,F,view,state,layout,LANEZ,trendGroup,AUD,FIELDS,FKEYS,wins,controls,camera,hidden,DB,tour,CH,CHI,refresh});"

def free_port():
    """Any free port, so runs never collide with each other or with anything else on the machine."""
    import socket
    with socket.socket() as s: s.bind(('127.0.0.1', 0)); return s.getsockname()[1]

def serve(port):
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
        def handle(self):
            try: super().handle()
            except (ConnectionResetError, BrokenPipeError): pass   # a browser closing a connection early (audio, video) is not an error
    class Server(http.server.ThreadingHTTPServer):
        allow_reuse_address = True   # back-to-back runs must not collide on the port
        daemon_threads = True        # many requests at once: one slow or held connection (a large recording) must not stall the rest
    httpd = Server(('127.0.0.1', port), functools.partial(Quiet, directory=str(ROOT)))
    threading.Thread(target=httpd.serve_forever, daemon=True).start(); return httpd

def adapt(path, port):
    """The suites were written for a local rig; point them at this one."""
    t = path.read_text()
    chrome = os.environ.get('CHROME')
    t = re.sub(r"executable_path='[^']*', ", f"executable_path='{chrome}', " if chrome else '', t)
    t = t.replace('/tmp/t/roundtrip.json', str(ROOT / 'roundtrip.json'))
    t = t.replace('http://localhost:8765/test.html', f'http://localhost:{port}/{PAGE}').replace('/tmp/t/', str(WORK) + '/')
    out = WORK / path.name; out.write_text(t); return out

def run(cmd, timeout=900):
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, cwd=ROOT)
    out = (r.stdout or '') + (r.stderr or ''); print(out[-6000:])
    failed = r.returncode != 0 or any(l.startswith('FAIL') for l in out.splitlines()) or ('differences:' in out and 'differences: none' not in out) or ('page errors: [' in out and 'page errors: []' not in out) or ('ERR [' in out and 'ERR []' not in out)
    return not failed

def main():
    names = [a.lower() for a in sys.argv[1:]] or ['all']; results = {}
    suites = sorted(x.stem for x in (ROOT / 'tests/browser').glob('*.py'))
    unknown = [n for n in names if n not in ('all', 'agents', 'browser') and n not in suites]
    if unknown:   # never an empty run that looks like a pass
        print(f"Unknown test suite(s): {', '.join(unknown)}. Use all, agents, browser, or any of: {', '.join(suites)}.\nFAILED: no tests were run."); return 2
    which = 'all' if 'all' in names else ''
    want = lambda stem: which == 'all' or 'browser' in names or stem in names
    if which == 'all' or 'agents' in names:
        print('== Agents: guardrails, offline =='); results['agents'] = run([sys.executable, 'tests/agent_tests.py'])
    if any(want(x) for x in suites):
        if not (ROOT / 'index.html').exists(): print('index.html is missing: run python tools/build.py first.'); return 1
        s = (ROOT / 'index.html').read_text(encoding='utf-8'); assert 'function boot(){' in s, 'the app no longer has a boot() function; update HOOK'
        (ROOT / PAGE).write_text(s.replace('function boot(){', HOOK, 1), encoding='utf-8')
        WORK.mkdir(parents=True, exist_ok=True); port = free_port(); httpd = serve(port)
        try:
            for suite in sorted((ROOT / 'tests/browser').glob('*.py')):
                if not want(suite.stem): continue
                print(f'== Browser: {suite.stem} =='); results[suite.stem] = run([sys.executable, str(adapt(suite, port))])
        finally:
            httpd.shutdown(); (ROOT / PAGE).unlink(missing_ok=True); (ROOT / 'roundtrip.json').unlink(missing_ok=True); shutil.rmtree(WORK, ignore_errors=True)
    print('\n== Summary =='); [print(f"{'PASS' if v else 'FAIL'}  {k}") for k, v in results.items()]
    if not results: print('FAILED: no tests were run.')
    return 0 if results and all(results.values()) else 1

if __name__ == '__main__': sys.exit(main())
