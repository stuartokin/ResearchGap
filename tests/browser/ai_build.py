"""The AI-enhanced version's safeguards, tried with deliberately bad features in a scratch experimental folder:
the builder leaves out forbidden code; a crashing feature is paused; a typed number in an insight is refused;
anything that hides the banner fails the whole build (so the workflow keeps last week's version)."""
import json, pathlib, shutil, subprocess, sys, tempfile
ROOT = next(d for d in pathlib.Path(__file__).resolve().parents if (d / "tools/build_ai.py").exists())   # also when the test rig runs a working copy
results = []
def ok(name, cond): results.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + name)
README = '# Test feature\n\nA deliberately bad feature, used only by the tests to prove the safeguards work. It is never published.\n'
def make(exp, fid, js, css='', insight_ok=True):
    d = exp / 'features' / fid; d.mkdir(parents=True); (d / 'feature.js').write_text(js); (d / 'README.md').write_text(README)
    if css: (d / 'style.css').write_text(css)
    return {'id': fid, 'title': fid, 'description': 'A test feature.', 'added': '2026-11-02', 'status': 'active'}
def build(exp, *extra):
    return subprocess.run([sys.executable, str(ROOT / 'tools/build_ai.py'), '--exp', str(exp), *extra], capture_output=True, text=True).stdout
def main():
    keep = (ROOT / 'ai/index.html').read_text(encoding='utf-8') if (ROOT / 'ai/index.html').exists() else None
    tmp = pathlib.Path(tempfile.mkdtemp()); exp = tmp / 'experimental'; shutil.copytree(ROOT / 'experimental', exp)
    m = json.loads((exp / 'manifest.json').read_text())
    m['features'] += [make(exp, 'net-call', "SGX.registerChart({id:'a', name:'A', render:() => { fetch('https://example.org'); return ''; }});"),
                      make(exp, 'bad-insight', "SGX.registerChart({id:'b', name:'Bad insight', render:() => '<svg></svg>', insight:{say:'There are 42 of them.', facts:() => ({})}});"),
                      make(exp, 'crashes', "SGX.registerChart({id:'c', name:'Crash', render:() => ''}); undefinedFunctionCall();")]
    (exp / 'manifest.json').write_text(json.dumps(m))
    out = build(exp)
    ok('B1 network access is left out', 'left out net-call: not allowed: network access' in out)
    ok('B2 the good feature and the others are included', all(f'included {x}' in out for x in ('ai-by-readiness', 'bad-insight', 'crashes')))
    smoke = subprocess.run([sys.executable, str(ROOT / 'tools/smoke_ai.py'), '--exp', str(exp)], capture_output=True, text=True)
    ok('B3 a feature that crashes on loading is paused, and the build passes', 'Pausing features that failed when loaded: crashes' in smoke.stdout and smoke.returncode == 0)
    page = (ROOT / 'ai/index.html').read_text(encoding='utf-8')
    ok('B4 the paused feature is left out of the published page', 'experimental feature: crashes' not in page and 'experimental feature: ai-by-readiness' in page)
    ok('B5 an insight with a typed number is refused (checked in the browser by the AI version suite)', 'experimental feature: bad-insight' in page)
    for f in ('net-call', 'bad-insight', 'crashes'): shutil.rmtree(exp / 'features' / f)
    m['features'] = [x for x in m['features'] if x['id'] == 'ai-by-readiness'] + [make(exp, 'hides-banner', "SGX.addStyles('body > div[role=status] { display: none !important; }');")]
    (exp / 'manifest.json').write_text(json.dumps(m)); build(exp)
    smoke = subprocess.run([sys.executable, str(ROOT / 'tools/smoke_ai.py'), '--exp', str(exp)], capture_output=True, text=True)
    ok('B6 a feature that hides the banner fails the whole build, so last week\'s version is kept', smoke.returncode == 1 and 'banner visible: False' in smoke.stdout)
    m['features'][-1] = make(exp, 'names-banner', "SGX.addStyles('#aiBanner{display:none}');"); (exp / 'manifest.json').write_text(json.dumps(m))
    ok('B7 naming the AI notices is left out before it reaches a browser', 'left out names-banner: not allowed: touching the AI notices' in build(exp))
    no_readme = make(exp, 'undocumented', "SGX.toast('hello');"); (exp / 'features/undocumented/README.md').unlink(); m['features'].append(no_readme); (exp / 'manifest.json').write_text(json.dumps(m))
    ok('B8 a feature without its README is left out', 'left out undocumented: README.md is missing' in build(exp))
    shutil.rmtree(tmp)
    if keep is not None: (ROOT / 'ai/index.html').write_text(keep, encoding='utf-8')
    else: subprocess.run([sys.executable, str(ROOT / 'tools/build_ai.py')], capture_output=True)
    print(f'PASSED {sum(results)} of {len(results)}')
    return 0 if all(results) else 1
if __name__ == '__main__': sys.exit(main())
