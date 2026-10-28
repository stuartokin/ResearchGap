#!/usr/bin/env python3
"""Write a short Markdown digest of the latest agent run, for the weekly GitHub issue."""
import json
from pathlib import Path
db = json.loads((Path(__file__).resolve().parents[1] / 'data/data.json').read_text(encoding='utf-8'))
e = db['meta']['changelog'][-1]; titles = {m['id']: m['title'] for m in db['milestones']}
def tidy(d):
    head, _, rest = d.partition(': ')
    if head in ('added', 're-estimated', 'disputed'):
        mid = rest.split(' ')[0]; return f"{head}: {titles.get(mid, mid)}{rest[len(mid):]}"
    return f"{titles.get(head, head)}: {rest}" if rest else d
print(f"**{e['summary']}**\n")
print(f"Data revision {db['meta']['revision']}, {e['date']} {e.get('time', '')} UTC{', monthly deep audit' if e.get('deepAudit') else ''}.\n")
s = e.get('stats') or {}
if s: print(f"Milestones: {s['milestones']}. Source-cited: {s['sourceCited']} ({round(s['sourceCited'] / max(1, s['milestones']) * 100)}%). Adoption known: {s['adoptionKnown']} of {s['landed']} landed.\n")
u = e.get('usage') or {}
if u: print(f"Usage: {u.get('calls', 0)} calls, {u.get('searches', 0)} searches, {round((u.get('inputTokens', 0) + u.get('outputTokens', 0)) / 1000)}k tokens" + (f", about ${u['costUsd']:.2f}" if u.get('costUsd') is not None else '') + f" ({u.get('model', '')}).\n")
if e.get('details'):
    print('### Changes'); [print(f'- {tidy(d)}') for d in e['details']]
print('\nOpen the app and see About, or the Data changes window, for details. Reply here or close this issue once reviewed.')
