#!/usr/bin/env python3
"""Write a short Markdown digest of the latest agent run, for the weekly GitHub issue."""
import json, sys, datetime as dt
from pathlib import Path
DESNZ = '--desnz' in sys.argv
db = json.loads((Path(__file__).resolve().parents[1] / 'data/data.json').read_text(encoding='utf-8'))
e = db['meta']['changelog'][-1]; titles = {m['id']: m['title'] for m in db['milestones']}
def tidy(d):
    head, _, rest = d.partition(': ')
    if head in ('added', 're-estimated', 'disputed'):
        mid = rest.split(' ')[0]; return f"{head}: {titles.get(mid, mid)}{rest[len(mid):]}"
    return f"{titles.get(head, head)}: {rest}" if rest else d
if DESNZ:
    ms = {m['id']: m for m in db['milestones']}; areas = {a['id']: a['name'] for a in db.get('visionAreas', [])}
    since = (dt.date.fromisoformat(db['meta']['asOf']) - dt.timedelta(days=31)).isoformat()
    print(f"**DESNZ AI energy vision: the month to {db['meta']['asOf']}**\n")
    for aid, aname in areas.items():
        its = [m for m in ms.values() if m.get('desnz') == aid and not (m.get('flags') or {}).get('hidden')]
        st = {k: sum(1 for m in its if (m.get('readiness') or {}).get('stage') == k) for k in ('research', 'pilot', 'commercial', 'scale')}
        print(f"### {aname}\n{len(its)} technologies: {st['research']} research, {st['pilot']} pilot, {st['commercial']} first commercial use, {st['scale']} at scale; {sum(1 for m in its if (m.get('gb') or {}).get('status') == 'deployed')} deployed in GB.\n")
        lines = []
        for ch in db['meta'].get('changelog', []):
            if ch['date'] < since: continue
            for d in ch.get('details', []):
                head, _, rest = d.partition(': ')
                mid = rest.split(' ')[0] if head == 'added' else head
                if mid in ms and ms[mid].get('desnz') == aid: lines.append(f"- {ch['date']}: {tidy(d)}")
        print('\n'.join(lines) if lines else '- Nothing new this month.'); print()
    print('Open the app and choose Windows, DESNZ AI vision, to explore.'); sys.exit(0)
print(f"**{e['summary']}**\n")
print(f"Data revision {db['meta']['revision']}, {e['date']} {e.get('time', '')} UTC{', monthly deep audit' if e.get('deepAudit') else ''}.\n")
s = e.get('stats') or {}
if s: print(f"Milestones: {s['milestones']}. Source-cited: {s['sourceCited']} ({round(s['sourceCited'] / max(1, s['milestones']) * 100)}%). Adoption known: {s['adoptionKnown']} of {s['landed']} landed.\n")
u = e.get('usage') or {}
if u: print(f"Usage: {u.get('calls', 0)} calls, {u.get('searches', 0)} searches, {round((u.get('inputTokens', 0) + u.get('outputTokens', 0)) / 1000)}k tokens" + (f", about ${u['costUsd']:.2f}" if u.get('costUsd') is not None else '') + f" ({u.get('model', '')}).\n")
if e.get('details'):
    print('### Changes'); [print(f'- {tidy(d)}') for d in e['details']]
print('\nOpen the app and see About, or the Data changes window, for details. Reply here or close this issue once reviewed.')
