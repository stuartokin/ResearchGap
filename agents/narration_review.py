#!/usr/bin/env python3
"""Narration review agent: before narration is published, review each step of the weekly analysis tours as a viewer would
meet it: the narration as spoken (filled with this week's figures), a screenshot of what the step shows, and this week's
actual changes. Run after tools/narration_check.py, which plays the tours and records what is on screen.

For each step Claude answers ok, or rewrite with a new template. Guardrails (code, not the model):
  - A rewrite must pass the same tour rules as the tour agent (placeholders only, no typed figures, word limits, every case).
  - An invalid rewrite gets one retry with the rule failures; if it still fails, the step goes back to last week's
    approved wording (the last published data/tours.json), so nothing unreviewed or broken is published.
  - At most `maxSteps` steps a run. A short report is written to .narration/review.md for the weekly digest.
"""
import sys, json, base64, subprocess, pathlib
from common import CONFIG, MODEL, TODAY, load_db
import tour_rules as R
ROOT = pathlib.Path(__file__).resolve().parents[1]
NARR = ROOT / '.narration'

SUBMIT = {'name': 'submit_review', 'description': 'Submit the review of one narration step.', 'input_schema': {'type': 'object', 'required': ['verdict', 'problems'], 'properties': {
  'verdict': {'type': 'string', 'enum': ['ok', 'rewrite']},
  'problems': {'type': 'array', 'items': {'type': 'string'}, 'description': 'Each problem found, in a short sentence; empty if none'},
  'say': {'description': 'Only for rewrite: the new template, a string, or a list mixing strings and {"by": condition, "cases": {...}} blocks, in the same form as the template given',
          'anyOf': [{'type': 'string'}, {'type': 'array'}]}}}}
SYSTEM = ('You review the narration of a guided tour before it is published. A general audience hears each step while the screen shows a chart or panel. '
  'Check four things. 1 Sense: it reads clearly to a non-specialist, with no jargon about the agents, their reviews, records or regrouping. '
  '2 Match: what is said matches what the screenshot shows, the same figures, the same subject (for example clean energy only when the chart shows clean energy only). '
  '3 Truth: anything it says happened this week is supported by this week\'s changes, given below; otherwise remove it. '
  '4 Speech: it reads well aloud: figures have units, sentences still read well when a figure is 0, lists are short, acronyms in brackets are avoided. '
  'If all four hold, answer ok. Otherwise answer rewrite, with a new template that keeps the same form: figures only as the {placeholders} already used '
  'or listed as allowed (never type a number), every case kept for any {"by": ..., "cases": ...} block, at most the word limit. Prefer a plainer sentence to a cleverer one.')

def steps_of(tours, tid):
    st = tours['tours'].get(tid, {}).get('steps', {})
    return st if isinstance(st, dict) else {x['id']: x for x in st}

def approved_tours():
    try: return json.loads(subprocess.run(['git', 'show', 'HEAD:data/tours.json'], cwd=ROOT, capture_output=True, text=True, check=True).stdout)
    except Exception: return None

def ask(content):
    import anthropic
    r = anthropic.Anthropic().messages.create(model=MODEL, max_tokens=1500, system=SYSTEM, tools=[SUBMIT], tool_choice={'type': 'tool', 'name': 'submit_review'},
                                              messages=[{'role': 'user', 'content': content}])
    return next((b.input for b in r.content if getattr(b, 'type', '') == 'tool_use'), None)

def load_report(): return json.loads((NARR / 'report.json').read_text(encoding='utf-8'))
def load_tours(): return json.loads((ROOT / 'data/tours.json').read_text(encoding='utf-8'))
def save_tours(t): (ROOT / 'data/tours.json').write_text(json.dumps(t, ensure_ascii=False, indent=1), encoding='utf-8')
def image(rel):
    p = ROOT / rel
    return {'type': 'image', 'source': {'type': 'base64', 'media_type': 'image/jpeg', 'data': base64.b64encode(p.read_bytes()).decode()}} if p.exists() else None

def run():
    cfg = CONFIG.get('narrationReview', {}); db = load_db(); tours = load_tours(); old = approved_tours()
    titles = [m.get('title') for m in db.get('milestones', [])]
    log = (db.get('meta') or {}).get('changelog') or []; week = log[-1] if log else {}
    changes = '\n'.join([str(week.get('summary', ''))] + [str(d) for d in (week.get('details') or [])[:60]])
    kept, rewritten, restored, flagged, lines = 0, [], [], [], []
    for r in load_report()[:cfg.get('maxSteps', 20)]:
        tid, sid = r['tour'], r['step']; st = steps_of(tours, tid).get(sid)
        if not r.get('narration') or not st: continue
        sp = R.SPEC.get(tid, {})
        brief = (f"Tour: {tid}. Step: {sid}. Word limit: {sp.get('maxWords', 45)}.\nTemplate: {json.dumps(st['say'], ensure_ascii=False)}\n"
                 f"Narration as spoken this week: {r['narration']}\n"
                 + (f"Numbers spoken but NOT found on screen by the code check: {', '.join(r['notOnScreen'])}\n" if r.get('notOnScreen') else '')
                 + f"Allowed placeholders: {', '.join(sorted(sp.get('placeholders', [])))}\nThis week's changes:\n{changes}")
        content = ([image(r['shot'])] if image(r['shot']) else []) + [{'type': 'text', 'text': brief}]
        out = ask(content)
        if not out: lines.append(f'- {tid}.{sid}: no answer; kept'); kept += 1; continue
        if out.get('verdict') == 'ok' and not r.get('notOnScreen'): kept += 1; continue
        if out.get('verdict') == 'ok':   # ok, but the code found a figure not on screen: ask again, naming it
            out = ask(content + [{'type': 'text', 'text': f"The code check could not find these spoken figures on screen: {', '.join(r['notOnScreen'])}. Rewrite so what is said matches the screen; answer ok only if you can see them in the screenshot."}]) or {}
            if out.get('verdict') == 'ok': flagged.append(f'{tid}.{sid}'); lines.append(f"- {tid}.{sid}: figures {', '.join(r['notOnScreen'])} not found on screen, though the review saw them; kept and flagged"); continue
        say, errs = out.get('say'), (['no rewrite given'] if not out.get('say') else R.check_step(tid, sid, out.get('say'), titles))
        if errs:   # one retry, with the rule failures quoted
            out2 = ask(content + [{'type': 'text', 'text': 'Your rewrite broke these rules: ' + '; '.join(errs) + '. Submit a corrected rewrite.'}]) or {}
            say = out2.get('say'); errs = ['no rewrite given'] if not say else R.check_step(tid, sid, say, titles)
        problems = '; '.join(out.get('problems') or []) or 'figures not on screen'
        if not errs:
            st['say'] = say; rewritten.append(f'{tid}.{sid}'); lines.append(f'- {tid}.{sid}: rewritten ({problems})')
        elif old and steps_of(old, tid).get(sid) and steps_of(old, tid)[sid].get('say') != st['say']:
            st['say'] = steps_of(old, tid)[sid]['say']; restored.append(f'{tid}.{sid}'); lines.append(f'- {tid}.{sid}: back to last week\'s wording ({problems})')
        else:
            flagged.append(f'{tid}.{sid}'); lines.append(f'- {tid}.{sid}: could not be fixed; kept and flagged ({problems})')
    if rewritten or restored: save_tours(tours)
    summary = f'Narration review {TODAY}: {kept} steps fine, {len(rewritten)} rewritten, {len(restored)} back to last week\'s wording, {len(flagged)} flagged.'
    NARR.mkdir(exist_ok=True); (NARR / 'review.md').write_text(summary + '\n' + '\n'.join(lines) + '\n', encoding='utf-8')
    print(summary); print('\n'.join(lines))

if __name__ == '__main__':
    sys.exit(run())
