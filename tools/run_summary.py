#!/usr/bin/env python3
"""A one-line summary of what this run changed, for the commit message and tag: compares data/data.json
(and data/tours.json) with the last published versions in git."""
import json, subprocess, sys

def published(path):
    r = subprocess.run(['git', 'show', f'HEAD:{path}'], capture_output=True, text=True)
    return json.loads(r.stdout) if r.returncode == 0 and r.stdout.strip() else None

def n(k, one, many): return f"{k} {one if k == 1 else many}"

def main():
    cur = json.load(open('data/data.json')); prev = published('data/data.json')
    if not prev: print(cur['meta']['changelog'][-1]['summary']); return
    P, C = {m['id']: m for m in prev['milestones']}, {m['id']: m for m in cur['milestones']}
    core = lambda m: json.dumps({k: m.get(k) for k in ('title', 'field', 'subfield', 'status', 'research', 'change', 'adoption', 'readiness', 'gb', 'security', 'refs', 'tags', 'region', 'note', 'forecast')}, sort_keys=True)
    newly = lambda k: sum(1 for i, m in C.items() if m.get(k) and (i not in P or P[i].get(k) != m.get(k)))
    added = [i for i in C if i not in P]
    gem = sum(1 for i in added if (C[i].get('provenance') or {}).get('addedBy') == 'gemini-research')
    parts = [f"{len(added)} added" + (f" ({gem} found by Gemini)" if gem else ''),
             f"{sum(1 for i in C if i in P and core(C[i]) != core(P[i]))} corrected",
             f"{sum(1 for i, m in C.items() if (m.get('flags') or {}).get('disputed') and not (P.get(i, {}).get('flags') or {}).get('disputed'))} disputed",
             n(newly('story'), 'story', 'stories'), n(newly('aiLevers'), 'AI lever record', 'AI lever records'),
             n(len(cur.get('guidanceUpdates', [])) - len(prev.get('guidanceUpdates', [])), 'guidance update', 'guidance updates'),
             n(len(cur.get('founders', [])) - len(prev.get('founders', [])), 'fortune', 'fortunes')]
    parts = [p for p in parts if not p.startswith('0 ')] or ['no changes to the records']
    try:
        if json.load(open('data/tours.json')).get('version') != (published('data/tours.json') or {}).get('version'): parts.append('walk-throughs refreshed')
    except Exception: pass
    print(', '.join(parts) + '.')

if __name__ == '__main__':
    try: main()
    except Exception as e: print(f'Weekly update ({type(e).__name__}).'); sys.exit(0)
