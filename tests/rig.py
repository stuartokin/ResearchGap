#!/usr/bin/env python3
"""The portable test rig: one command, any machine (Linux, macOS, Windows; a laptop, GitHub Actions or a Claude sandbox).

    python tests/rig.py doctor            check this machine: Python, packages, a browser that launches, the build
    python tests/rig.py setup             install the pinned packages and Playwright's Chromium
    python tests/rig.py quick             about a minute: the agents' guardrails, a build, the syntax check, the smoke test
    python tests/rig.py                   everything (the same as `all`)
    python tests/rig.py capabilities reviews    any of: all, agents, browser, or suite names from tests/browser/

What it adds to tests/run_tests.py (which it calls):
  - finds a browser that actually launches, even when the installed Playwright and its browsers disagree in version,
    and passes it on as CHROME (set CHROME yourself to override);
  - builds index.html from src/ first, and checks the built script's syntax with Node when Node is present;
  - reruns each failed suite once on its own: a suite that then passes is reported as FLAKY (timing under load),
    not as broken, and the rig still fails, so flakes are seen and fixed rather than ignored;
  - writes the whole log to tests/_last_run.log and a one-screen summary to tests/_last_run.txt (both git-ignored).

Exit code: 0 when everything passed first time, 1 when anything failed or was flaky, 2 when the machine is not ready.
Nothing is published and no API is called: the agents are tested with simulated answers.
"""
import sys, os, re, glob, json, shutil, subprocess, datetime, platform
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
LOG, SUMMARY = ROOT / 'tests/_last_run.log', ROOT / 'tests/_last_run.txt'
PY = sys.executable

def say(*a): print(*a, flush=True)

# ---------- the machine ----------
def pinned():
    out = {}
    for line in (ROOT / 'requirements.txt').read_text().splitlines():
        m = re.match(r'\s*([A-Za-z0-9_.-]+)==([\w.]+)', line)
        if m: out[m.group(1).lower()] = m.group(2)
    return out

def installed(name):
    try:
        import importlib.metadata as md; return md.version(name)
    except Exception: return None

def browser_candidates():
    home, roots = Path.home(), []
    if os.environ.get('PLAYWRIGHT_BROWSERS_PATH'): roots.append(os.environ['PLAYWRIGHT_BROWSERS_PATH'])
    roots += ['/opt/pw-browsers', str(home / '.cache/ms-playwright'), str(home / 'Library/Caches/ms-playwright'),
              os.path.join(os.environ.get('LOCALAPPDATA', ''), 'ms-playwright')]
    pats = ['chromium-*/chrome-linux*/chrome', 'chromium-*/chrome-mac*/Chromium.app/Contents/MacOS/Chromium',
            'chromium-*/chrome-mac*/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing', 'chromium-*/chrome-win*/chrome.exe']
    found = [p for r in roots if r for pat in pats for p in sorted(glob.glob(os.path.join(r, pat)), reverse=True)]
    found += [shutil.which(n) for n in ('chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable') if shutil.which(n)]
    found += [p for p in ('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', r'C:\Program Files\Google\Chrome\Application\chrome.exe') if os.path.exists(p)]
    return list(dict.fromkeys(found))

def launches(path=None):
    """True if Chromium starts (with WebGL in software, as the suites use it)."""
    code = ("import asyncio,sys\nfrom playwright.async_api import async_playwright\nasync def m():\n"
            " async with async_playwright() as p:\n"
            f"  b=await p.chromium.launch({'executable_path=sys.argv[1], ' if path else ''}args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'])\n"
            "  pg=await b.new_page(); await pg.set_content('<canvas id=c></canvas>')\n"
            "  ok=await pg.evaluate(\"!!document.getElementById('c').getContext('webgl')\"); await b.close(); print('WEBGL', ok)\nasyncio.run(m())")
    try:
        r = subprocess.run([PY, '-c', code] + ([path] if path else []), capture_output=True, text=True, timeout=90)
        return 'WEBGL True' in r.stdout
    except Exception: return False

def find_browser():
    if os.environ.get('CHROME'):
        return (os.environ['CHROME'], 'from CHROME') if launches(os.environ['CHROME']) else (None, f"CHROME is set but does not launch: {os.environ['CHROME']}")
    if launches(): return ('', "Playwright's own Chromium")
    for p in browser_candidates():
        if launches(p): return (p, 'found on this machine (Playwright and its browsers differ in version; the rig passes it as CHROME)')
    return (None, 'no Chromium launches: run  python tests/rig.py setup')

def doctor(verbose=True):
    ok, notes = True, []
    v = sys.version_info
    if v < (3, 10): ok = False; notes.append(f'FAIL Python {v.major}.{v.minor}: 3.10 or newer is needed (3.12 is what GitHub uses)')
    else: notes.append(f'ok   Python {v.major}.{v.minor}.{v.micro} on {platform.system()}')
    for name, want in pinned().items():
        have = installed(name)
        if not have: ok = False; notes.append(f'FAIL {name} is not installed (pinned {want}): run  python tests/rig.py setup')
        elif have != want: notes.append(f'warn {name} {have} (the workflows pin {want}; usually fine, but a difference can explain a test that passes here and fails on GitHub)')
        else: notes.append(f'ok   {name} {have}')
    if installed('playwright'):
        chrome, how = find_browser()
        if chrome is None: ok = False; notes.append('FAIL browser: ' + how)
        else: notes.append(f"ok   browser: {how}{(' ' + chrome) if chrome else ''}"); os.environ['CHROME'] = chrome or os.environ.get('CHROME', '')
    notes.append('ok   node ' + subprocess.run(['node', '--version'], capture_output=True, text=True).stdout.strip() if shutil.which('node') else 'warn node not found: the built script\'s syntax check is skipped (install Node 18+ to enable it)')
    for f in ('data/data.json', 'data/tours.json', 'src/index.html', 'tools/build.py'):
        if not (ROOT / f).exists(): ok = False; notes.append(f'FAIL {f} is missing: run the rig from a full copy of the repository')
    try: notes.append('ok   git commit ' + subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], cwd=ROOT, capture_output=True, text=True).stdout.strip())
    except Exception: notes.append('warn not a git checkout (fine; the summary will not name a commit)')
    if verbose: say('\n'.join(notes))
    return ok, notes

def setup():
    say('Installing the pinned packages…'); subprocess.run([PY, '-m', 'pip', 'install', '-r', str(ROOT / 'requirements.txt')] + (['--break-system-packages'] if platform.system() == 'Linux' and not os.environ.get('VIRTUAL_ENV') else []), check=False)
    say("Installing Playwright's Chromium…")
    deps = ['--with-deps'] if platform.system() == 'Linux' and hasattr(os, 'geteuid') and os.geteuid() == 0 else []
    subprocess.run([PY, '-m', 'playwright', 'install'] + deps + ['chromium'], check=False)
    return 0 if doctor()[0] else 2


# ---------- the experimental features (they live on the experimental branch, not on main) ----------
def git(*a, **k): return subprocess.run(['git'] + list(a), cwd=ROOT, capture_output=True, **k)

def bring_experimental():
    """The AI-version suites need experimental/. On a main checkout, borrow it from the experimental branch for the
    run (as the publishing workflows do), and say so; it is removed again afterwards. Returns True if it was borrowed."""
    if (ROOT / 'experimental').exists(): return False
    import tarfile, io
    if git('fetch', '--quiet', '--depth=1', 'origin', 'experimental').returncode == 0:
        tar = git('archive', 'FETCH_HEAD', 'experimental').stdout
        if tar:
            t = tarfile.open(fileobj=io.BytesIO(tar))
            try: t.extractall(ROOT, filter='data')
            except TypeError: t.extractall(ROOT)   # Python without extraction filters
            say('ok   experimental features borrowed from the experimental branch for this run'); return True
    say('warn experimental/ is missing and could not be fetched: the ai_build, ai_guard and ai_version suites will fail'); return False

def snapshot_ai():
    """Whether ai/ was clean before the run, so test side effects there can be undone afterwards."""
    r = git('status', '--porcelain', '--untracked-files=all', '--', 'ai', text=True)
    return r.returncode == 0 and not r.stdout.strip()

def tidy(borrowed, ai_was_clean):
    if borrowed: shutil.rmtree(ROOT / 'experimental', ignore_errors=True)
    if ai_was_clean:   # the AI-version suites rebuild ai/; put the committed copy back
        git('checkout', '--', 'ai'); git('clean', '-fdq', '--', 'ai')
    for f in ROOT.glob('_test-*.html'): f.unlink(missing_ok=True)

# ---------- build and run ----------
def build(log):
    r = subprocess.run([PY, 'tools/build.py'], cwd=ROOT, capture_output=True, text=True); log.append(r.stdout + r.stderr)
    if r.returncode: say('FAIL build:\n' + (r.stdout + r.stderr)[-1500:]); return False
    say('ok   build: ' + (r.stdout.strip().splitlines() or [''])[-1])
    if shutil.which('node'):
        html = (ROOT / 'index.html').read_text(encoding='utf-8'); m = re.search(r'<script>\n(function boot.*?)</script>', html, re.S)
        if m:
            tmp = ROOT / 'tests/_work'; tmp.mkdir(parents=True, exist_ok=True); f = tmp / '_app_syntax.js'; f.write_text(m.group(1), encoding='utf-8')
            r = subprocess.run(['node', '--check', str(f)], capture_output=True, text=True); f.unlink(missing_ok=True)
            if r.returncode: say('FAIL syntax of the built script (a mid-line // comment is the usual cause):\n' + r.stderr[-1200:]); return False
            say('ok   syntax of the built script')
    return True

def run_suites(names, log):
    """Streams progress as it goes (suite names, PASSED lines, failures), keeping the whole output for the log."""
    p = subprocess.Popen([PY, '-u', 'tests/run_tests.py'] + names, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                         text=True, env=dict(os.environ, PYTHONUNBUFFERED='1'))
    lines = []
    for line in p.stdout:
        lines.append(line)
        if re.match(r'^(FAIL |PASSED |== |Unknown test suite|FAILED: no tests)', line): say('     ' + line.rstrip())
    p.wait(); out = ''.join(lines); log.append(out)
    res = dict((m.group(2), m.group(1) == 'PASS') for m in re.finditer(r'^(PASS|FAIL)  (\S+)$', out, re.M))
    return p.returncode, res, out

def main():
    args = [a.lower() for a in sys.argv[1:]]
    if args[:1] == ['doctor']: return 0 if doctor()[0] else 2
    if args[:1] == ['setup']: return setup()
    say(f'== The Shrinking Gap test rig, {datetime.datetime.now():%Y-%m-%d %H:%M} ==')
    ready, notes = doctor(verbose=False)
    for n in notes:
        if not n.startswith('ok'): say(n)
    if not ready: say('The machine is not ready (see above). Nothing was run.'); return 2
    log, t0 = [], datetime.datetime.now()
    if not build(log): return 1
    quick = args[:1] == ['quick']
    names = ['agents'] if quick else (args or ['all'])
    if quick:
        r = subprocess.run([PY, 'tools/smoke_test.py'], cwd=ROOT, capture_output=True, text=True); log.append(r.stdout + r.stderr)
        say(('ok   ' if r.returncode == 0 else 'FAIL ') + 'smoke test: ' + (r.stdout + r.stderr).strip().splitlines()[-1][:200])
        if r.returncode: return 1
    needs_exp = any(n in ('all', 'browser') or n.startswith('ai_') for n in names)
    borrowed, ai_clean = (bring_experimental() if needs_exp else False), snapshot_ai()
    try:
        say('Running: ' + ' '.join(names)); code, res, _ = run_suites(names, log)
        if code == 2 or not res: say('No suite results: see tests/_last_run.log.'); LOG.write_text('\n'.join(log), encoding='utf-8'); return 1
        failed, flaky = [k for k, v in res.items() if not v], []
        for s in failed:   # a suite that fails under the full run's load but passes alone is flaky, not broken
            if s == 'agents': continue
            say(f'Rerunning {s} on its own…'); _, r2, _ = run_suites([s], log)
            if r2.get(s): flaky.append(s)
    finally:
        tidy(borrowed, ai_clean)
    broken = [s for s in failed if s not in flaky]
    head = 'ALL PASSED' if not failed else ('FAILED: ' + ', '.join(broken) if broken else 'PASSED, BUT FLAKY: ' + ', '.join(flaky))
    try: commit = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    except Exception: commit = '?'
    lines = [f'{head}', f'Run {t0:%Y-%m-%d %H:%M}, {(datetime.datetime.now() - t0).seconds // 60} min, commit {commit or "?"}, suites: {" ".join(names)}']
    lines += [f"{'PASS ' if v else ('FLAKY' if k in flaky else 'FAIL ')} {k}" for k, v in res.items()]
    if flaky: lines.append('FLAKY = failed in the full run, passed alone: a timing check to make robust (see docs/LESSONS.md).')
    SUMMARY.write_text('\n'.join(lines) + '\n', encoding='utf-8'); LOG.write_text('\n'.join(log), encoding='utf-8')
    say('\n' + '\n'.join(lines) + '\nSummary: tests/_last_run.txt   Full log: tests/_last_run.log')
    return 0 if not failed else 1

if __name__ == '__main__':
    sys.exit(main())
