#!/usr/bin/env python3
"""AI levers agent: researches, for a batch of projected technologies each week, what is holding each one up
and how AI could practically speed it, with sources. The What if? chart uses these instead of general rules.

Guardrails: levers and phases come from fixed lists; strengths are low, mid or high; notes are short; every
source must be fetched and its quoted evidence found on the page, or nothing is recorded for that technology.
"""
import sys, re, json
from datetime import date, timedelta
from common import load_db, save_db, call_claude, fetch_text, log_change, CONFIG, TODAY

LEVERS = {'discovery': 'AI-accelerated discovery and design (materials, molecules, chips)', 'simulation': 'simulation and digital twins (testing, design, grid studies)',
          'software': 'AI-assisted software and automation', 'approvals': 'faster evidence for approvals and consents (decisions stay human)',
          'deploy': 'planning, connection and operations during roll-out'}
PHASES = {'rd': 'research and development', 'demo': 'demonstration and testing', 'build': 'building the product', 'approvals': 'approvals and consents', 'deploy': 'deployment and roll-out'}
TOOL = {'name': 'submit_levers', 'description': 'Submit what holds this technology up and which AI levers apply.', 'input_schema': {'type': 'object', 'required': ['phase', 'bottleneck', 'levers', 'sources'], 'properties': {
  'phase': {'type': 'string', 'enum': sorted(PHASES)}, 'bottleneck': {'type': 'string', 'description': 'The main thing holding it up, in at most 25 words'},
  'levers': {'type': 'array', 'maxItems': 4, 'items': {'type': 'object', 'required': ['k', 'strength', 'note'], 'properties': {
    'k': {'type': 'string', 'enum': sorted(LEVERS)}, 'strength': {'type': 'string', 'enum': ['low', 'mid', 'high']}, 'note': {'type': 'string', 'description': 'What AI is or could practically be doing here, at most 30 words'}}}},
  'sources': {'type': 'array', 'minItems': 1, 'maxItems': 3, 'items': {'type': 'object', 'required': ['url', 'label', 'quote'], 'properties': {
    'url': {'type': 'string'}, 'label': {'type': 'string'}, 'quote': {'type': 'string', 'description': 'A short exact quote from the page supporting the bottleneck or a lever'}}}}}}}

def norm(s): return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9 ]', ' ', (s or '').lower())).strip()
def words(s): return len((s or '').split())

def due(m, refresh_days):
    if m.get('status') == 'landed' or (m.get('flags') or {}).get('hidden'): return False
    chk = (m.get('aiLevers') or {}).get('checked')
    return not chk or chk < (date.fromisoformat(TODAY) - timedelta(days=refresh_days)).isoformat()

def research(m):
    prompt = (f"Technology: {m['title']} (field: {m['field']}; readiness: {(m.get('readiness') or {}).get('stage', 'unknown')}; expected around {m['change']['year']}).\n"
              f"Context: {m['research'].get('what', '')} {m['change'].get('what', '')} {m.get('note', '')}\n"
              "Using recent, reputable public sources, say which phase it is in now, the main thing holding it up, and which of these AI levers genuinely apply, "
              f"with a strength and a short, specific note on what AI is or could practically be doing: {json.dumps(LEVERS)}. Phases: {json.dumps(PHASES)}. "
              "Only include a lever where there is a real, specific application; it is fine to include none. Give one to three sources, each with a short exact quote from the page.")
    return call_claude('You research technology programmes carefully and cite public sources exactly.', prompt, TOOL, max_searches=CONFIG.get('levers', {}).get('maxSearches', 3)) or {}

def verify(out):
    """Keep only sources whose quote really appears on the fetched page; reject anything outside the fixed lists."""
    if out.get('phase') not in PHASES or words(out.get('bottleneck')) > 25: return None, 'phase or bottleneck invalid'
    levers = [l for l in (out.get('levers') or []) if l.get('k') in LEVERS and l.get('strength') in ('low', 'mid', 'high') and 0 < words(l.get('note')) <= 30]
    refs = []
    for s in (out.get('sources') or [])[:3]:
        url, q = s.get('url', ''), norm(s.get('quote'))
        if not re.match(r'https?://', url) or len(q) < 12: continue
        code, text = fetch_text(url)
        if code == 200 and q in norm(text): refs.append({'url': url, 'label': (s.get('label') or url)[:120], 'quote': s.get('quote')[:300]})
    if not refs: return None, 'no source could be confirmed'
    return {'phase': out['phase'], 'bottleneck': out['bottleneck'].strip(), 'levers': [{'k': l['k'], 'strength': l['strength'], 'note': l['note'].strip()} for l in levers], 'refs': refs, 'checked': TODAY}, ''

def run():
    cfg = CONFIG.get('levers', {})
    if not cfg.get('enabled', True): print('AI levers agent disabled.'); return 0
    db = load_db(); todo = [m for m in db['milestones'] if due(m, cfg.get('refreshDays', 90))]
    todo.sort(key=lambda m: ((m.get('aiLevers') or {}).get('checked') or '', m['change']['year']))
    done, report = 0, []
    for m in todo[:cfg.get('perRun', 8)]:
        try: rec, why = verify(research(m))
        except Exception as e: rec, why = None, f'error: {e}'
        if rec: m['aiLevers'] = rec; done += 1; report.append(f"levers   {m['id']}: {rec['phase']}; {', '.join(l['k'] for l in rec['levers']) or 'none apply'}")
        else: report.append(f"skipped  {m['id']}: {why}")
    print('\n'.join(report) or 'No technologies due for research.')
    if done:
        log_change(db, f'AI levers researched for {done} technolog{"y" if done == 1 else "ies"}.', [r for r in report if r.startswith('levers')])
        save_db(db)
    return 0

if __name__ == '__main__':
    try: sys.exit(run())
    except Exception as e: print(f'AI levers agent could not run ({type(e).__name__}: {e}).'); sys.exit(0)
