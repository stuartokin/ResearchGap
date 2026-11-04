"""After the weekly agent: is the work allowed, documented and passing? Exit 1 (the week's work is not published) if:
anything outside experimental/ (or the .ai-run/ scratch folder) changed; a feature changed without its README,
manifest entry and a What's new entry; or an active feature is left out by the builder's checks."""
import json, pathlib, re, subprocess, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
def changed():
    out = subprocess.run(['git', 'status', '--porcelain=v1', '-uall'], cwd=ROOT, capture_output=True, text=True).stdout
    return [line[3:].split(' -> ')[-1].strip('"') for line in out.splitlines() if line.strip()]
def main():
    problems, paths = [], changed()
    # build outputs, rebuilt by the briefing and the agent's checks: never committed by this run (only experimental/ is),
    # and rebuilt from scratch on main when publishing, so a change to them can never reach the site
    GENERATED = {'ai/index.html', 'ai/features.json', 'index.html'}
    outside = [p for p in paths if not (p.startswith('experimental/') or p.startswith('.ai-run/') or p in GENERATED)]
    if outside: problems.append('changed outside experimental/: ' + ', '.join(sorted(outside)[:12]))
    exp = [p for p in paths if p.startswith('experimental/')]
    feats = sorted({p.split('/')[2] for p in exp if p.startswith('experimental/features/') and len(p.split('/')) > 3})
    if feats:
        if 'experimental/manifest.json' not in exp: problems.append('features changed but manifest.json was not updated')
        if 'experimental/WHATS_NEW.md' not in exp: problems.append("features changed but WHATS_NEW.md has no new entry")
    try: manifest = json.loads((ROOT / 'experimental/manifest.json').read_text(encoding='utf-8'))
    except Exception as e: manifest = {'features': []}; problems.append(f'manifest.json is not valid: {e}')
    listed = {f.get('id') for f in manifest.get('features', [])}
    for fid in feats:
        d = ROOT / 'experimental/features' / fid
        if not d.exists(): continue   # removed (What's new must say why)
        if fid not in listed: problems.append(f'{fid} is not in manifest.json')
        if not (d / 'README.md').exists(): problems.append(f'{fid} has no README.md')
        elif f'experimental/features/{fid}/README.md' not in exp and f'experimental/features/{fid}/feature.js' in exp: problems.append(f'{fid} changed but its README.md was not updated')
    build = subprocess.run([sys.executable, str(ROOT / 'tools/build_ai.py'), '--exp', str(ROOT / 'experimental')], capture_output=True, text=True).stdout
    active = [f.get('id') for f in manifest.get('features', []) if f.get('status', 'active') == 'active']
    for fid in active:
        if f'included {fid}' not in build:
            why = re.search(rf'left out {re.escape(fid)}: (.*)', build); problems.append(f'{fid} is left out by the checks: {why.group(1) if why else "unknown reason"}')
    (ROOT / '.ai-run').mkdir(exist_ok=True)
    (ROOT / '.ai-run/guard.json').write_text(json.dumps({'passed': not problems, 'problems': problems, 'changed': paths, 'features_changed': feats}, indent=1))
    print('Guard:', 'passed' if not problems else 'FAILED'); [print('  -', p) for p in problems]
    print('  changed:', ', '.join(paths) if paths else 'nothing')
    return 0 if not problems else 1
if __name__ == '__main__': sys.exit(main())
