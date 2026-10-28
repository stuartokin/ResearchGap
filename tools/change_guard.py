#!/usr/bin/env python3
"""Gate: compare the new dataset with the last published one (git HEAD).
Fails if any record disappeared, or if more were added than the run limit allows."""
import json, subprocess, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
LIMIT = json.loads((ROOT / 'agents/config.json').read_text())['publish']['maxAdditionsPerRun']

def main():
    try:
        old = json.loads(subprocess.run(['git', 'show', 'HEAD:data/data.json'], cwd=ROOT, capture_output=True, text=True, check=True).stdout)
    except Exception:
        print('No previous published dataset; skipping change guard.'); return 0
    new = json.loads((ROOT / 'data/data.json').read_text(encoding='utf-8'))
    old_ids, new_ids = {m['id'] for m in old['milestones']}, {m['id'] for m in new['milestones']}
    gone, added = old_ids - new_ids, new_ids - old_ids
    fo, fn = {f['id'] for f in old['founders']}, {f['id'] for f in new['founders']}
    errors = []
    if gone: errors.append(f'{len(gone)} milestones disappeared: {sorted(gone)[:10]}')
    if fo - fn: errors.append(f'{len(fo - fn)} founders disappeared')
    if len(added) > LIMIT: errors.append(f'{len(added)} additions exceed the limit of {LIMIT}')
    if new['meta']['revision'] <= old['meta']['revision']: errors.append('revision did not increase')
    for e in errors: print('ERROR', e)
    print(f'{len(added)} added, {len(gone)} removed.')
    return 1 if errors else 0

if __name__ == '__main__':
    sys.exit(main())
