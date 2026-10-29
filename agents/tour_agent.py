#!/usr/bin/env python3
"""Weekly tour agent: keeps the walk-through scripts in data/tours.json fresh and accurate.

It may (1) choose the worked examples from the current data and (2) refine wording, step by step.
It cannot change figures or conclusions: those are filled in and chosen by the app from the live data.
Every change is checked against agents/tour_rules.py; a step that fails keeps last week's wording.
"""
import sys, json, copy
from pathlib import Path
from common import load_db, call_claude, log_change, CONFIG, TODAY
import tour_rules

TOURS = Path(__file__).resolve().parents[1] / 'data' / 'tours.json'
TOOL = {'name': 'submit_tour_update', 'description': 'Submit the chosen examples and any improved step wording.', 'input_schema': {'type': 'object', 'required': ['exampleIds', 'steps', 'reason'], 'properties': {
  'exampleIds': {'type': 'array', 'minItems': 1, 'maxItems': 4, 'items': {'type': 'string'}, 'description': 'Ids from the candidate list, best first'},
  'steps': {'type': 'object', 'description': 'Only the steps whose wording you are improving: {stepId: {"say": template}}. Leave out steps that should stay as they are.'},
  'reason': {'type': 'string'}}}}

def candidates(db):
    as_of = int(db['meta']['asOf'][:4]); out = []
    for m in db['milestones']:
        if (m.get('flags') or {}).get('hidden') or m['status'] != 'landed': continue
        ad = (m.get('adoption') or {}).get('year')
        if not ad or ad > as_of: continue
        out.append({'id': m['id'], 'title': m['title'], 'research': m['research']['year'], 'firstProduct': m['change']['year'], 'adoption': ad,
                    'origin': m['origin'], 'major': bool((m.get('flags') or {}).get('major')), 'verification': m['provenance']['verification']})
    out.sort(key=lambda c: (not c['major'], c['verification'] != 'source-cited', c['research']))
    return out[:60]

def run():
    cfg = CONFIG.get('tours', {})
    if not cfg.get('enabled', True): print('Tour agent disabled.'); return 0
    db = load_db(); tours = json.loads(TOURS.read_text(encoding='utf-8')); before = json.dumps(tours, sort_keys=True)
    cands = candidates(db); cand_ids = {c['id'] for c in cands}
    for tid in tour_rules.SPEC:
        t = tours['tours'][tid]
        sp = tour_rules.SPEC[tid]
        prompt = (f"You maintain the narration for a one-minute guided tour: \"{t['title']}\". Today is {TODAY}.\n"
                  "Narration templates use {placeholders} that the app fills from live data, and {\"by\": condition, \"cases\": {...}} blocks whose variant the app chooses from the evidence. "
                  "So you never state figures or decide conclusions yourself.\n"
                  f"Rules: only these placeholders: {sorted(sp['placeholders'])}; keep every case of every condition ({ {k: sorted(v) for k, v in sp['cases'].items()} }); "
                  f"no figures typed in the text except the years {sorted(sp['years'])}; at most {sp['maxWords']} words per step; plain British English; no links.\n"
                  "Tasks: (1) choose up to four worked examples, best first, from the candidates: well-known breakthroughs that make the stages easy to follow, preferring source-cited records and a mix of university, industry and government origins. "
                  "(2) Improve the wording of at most three steps, only where it becomes clearer or more accurate for a general audience. Leave the rest out.\n"
                  f"Current steps: {json.dumps(t['steps'], ensure_ascii=False)}\nCandidates: {json.dumps(cands, ensure_ascii=False)}")
        out = call_claude('You write clear, accurate narration for a data visualisation.', prompt, TOOL, max_searches=0) or {}
        new = copy.deepcopy(t); changes = []
        ex = [e for e in (out.get('exampleIds') or []) if e in cand_ids][:4]
        if ex and ex != t.get('exampleIds'): new['exampleIds'] = ex; changes.append(f"examples: {', '.join(ex)}")
        edits = out.get('steps') or {}
        for sid in list(edits)[:cfg.get('maxStepsChangedPerRun', 3)]:
            if sid not in sp['steps'] or not isinstance(edits[sid], dict) or 'say' not in edits[sid]: continue
            errs = tour_rules.check_step(tid, sid, edits[sid]['say'])
            if errs: print(f'kept the old wording for {tid}.{sid}: ' + '; '.join(errs[:3])); continue
            if edits[sid]['say'] != t['steps'][sid]['say']: new['steps'][sid] = {'say': edits[sid]['say']}; changes.append(f'wording: {sid}')
        trial = copy.deepcopy(tours); trial['tours'][tid] = new
        errs = tour_rules.check(trial, db['milestones'])
        if errs: print('tour update rejected: ' + '; '.join(errs[:4])); continue
        tours = trial
        if changes: print(f"{tid}: " + '; '.join(changes) + (f" ({out.get('reason', '')[:160]})" if out.get('reason') else ''))
    if json.dumps(tours, sort_keys=True) != before:
        tours['version'] = tours.get('version', 1) + 1; tours['updated'] = TODAY; tours['updatedBy'] = 'tour-agent'
        TOURS.write_text(json.dumps(tours, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
        db2 = load_db(); log = db2['meta'].setdefault('changelog', [])
        note = f"tours: walk-through scripts refreshed (version {tours['version']})"
        if log and log[-1].get('date') == TODAY: log[-1].setdefault('details', []).append(note)
        else: log_change(db2, 'Walk-through scripts refreshed.', [note])
        from common import save_db; save_db(db2)
        print(f"tours.json updated to version {tours['version']}.")
    else: print('Walk-through scripts unchanged.')
    return 0

if __name__ == '__main__':
    try: sys.exit(run())
    except Exception as e:   # the walk-throughs must never block the week's data: keep last week's scripts
        print(f'Tour agent could not run ({type(e).__name__}: {e}). Keeping last week\'s scripts.'); sys.exit(0)
