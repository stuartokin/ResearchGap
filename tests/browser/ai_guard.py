"""The guard that decides whether a week's work by the interface agent can be published, tried on a scratch copy of
the repository: documented work inside experimental/ passes; touching anything else, skipping the documentation, or
adding forbidden code fails."""
import json, pathlib, shutil, subprocess, sys, tempfile
REPO = next(d for d in pathlib.Path(__file__).resolve().parents if (d / 'tools/build_ai.py').exists())
results = []
def ok(name, cond): results.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + name)
def fresh():
    tmp = pathlib.Path(tempfile.mkdtemp()) / 'r'
    shutil.copytree(REPO, tmp, ignore=shutil.ignore_patterns('.git', 'audio', '_work', '_test-*', 'ai', '__pycache__', 'node_modules'))
    run = lambda *a: subprocess.run(a, cwd=tmp, capture_output=True, text=True)
    run('git', 'init', '-q'); run('git', 'config', 'user.email', 't@t'); run('git', 'config', 'user.name', 't'); run('git', 'add', '-A'); run('git', 'commit', '-qm', 'base')
    return tmp
def guard(tmp): return subprocess.run([sys.executable, 'tools/guard_experimental.py'], cwd=tmp, capture_output=True, text=True)
def feature_change(tmp, whats_new=True, code=None):
    d = tmp / 'experimental/features/ai-by-readiness'
    (d / 'feature.js').write_text((d / 'feature.js').read_text() + ('\n' + code if code else '\n/* a small improvement */\n'))
    (d / 'README.md').write_text((d / 'README.md').read_text() + '\n**Updated:** a small improvement.\n')
    m = json.loads((tmp / 'experimental/manifest.json').read_text()); m['features'][0]['updated'] = '2026-11-04'; (tmp / 'experimental/manifest.json').write_text(json.dumps(m, indent=1))
    if whats_new: (tmp / 'experimental/WHATS_NEW.md').write_text('## 4 November 2026\n- A small improvement.\n\n' + (tmp / 'experimental/WHATS_NEW.md').read_text())
t = fresh(); feature_change(t); (t / '.ai-run').mkdir(); (t / '.ai-run/report.md').write_text('A small improvement')
g = guard(t); ok('G1 documented work inside experimental/ passes', g.returncode == 0)
t = fresh(); feature_change(t); (t / 'src/js/01-data-loaded-from-data-data-json-or-the-e.js').write_text('// changed')
g = guard(t); ok('G2 touching the app’s own code fails the week', g.returncode == 1 and 'changed outside experimental/' in g.stdout)
t = fresh(); (t / 'data/data.json').write_text('{}')
g = guard(t); ok('G3 touching the data fails the week', g.returncode == 1 and 'data/data.json' in g.stdout)
t = fresh(); feature_change(t, whats_new=False)
g = guard(t); ok('G4 changing a feature without a What’s new entry fails', g.returncode == 1 and "WHATS_NEW.md has no new entry" in g.stdout)
t = fresh(); feature_change(t, code="fetch('https://example.org');")
g = guard(t); ok('G5 forbidden code fails the week (the feature would be left out)', g.returncode == 1 and 'left out by the checks' in g.stdout and 'network access' in g.stdout)
t = fresh(); d = t / 'experimental/features/new-thing'; d.mkdir(); (d / 'feature.js').write_text("SGX.toast('hi');")
(t / 'experimental/WHATS_NEW.md').write_text('## New\n- A new thing.\n'); m = json.loads((t / 'experimental/manifest.json').read_text()); (t / 'experimental/manifest.json').write_text(json.dumps(m))
g = guard(t); ok('G6 a new feature without a README or manifest entry fails', g.returncode == 1 and 'new-thing is not in manifest.json' in g.stdout and 'new-thing has no README.md' in g.stdout)
t = fresh(); feature_change(t); (t / 'ai').mkdir(exist_ok=True); (t / 'ai/index.html').write_text('rebuilt'); (t / 'ai/features.json').write_text('{}'); (t / 'index.html').write_text('rebuilt')
g = guard(t); ok('G7 rebuilt outputs (ai/, index.html) are not counted as changes', g.returncode == 0)
t = fresh(); feature_change(t); (t / 'ai').mkdir(exist_ok=True); (t / 'ai/other.js').write_text('x')
g = guard(t); ok('G8 but anything else in ai/ still fails the week', g.returncode == 1 and 'ai/other.js' in g.stdout)
print(f'PASSED {sum(results)} of {len(results)}')
sys.exit(0 if all(results) else 1)
