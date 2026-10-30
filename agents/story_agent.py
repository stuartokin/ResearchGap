#!/usr/bin/env python3
"""Story agent: for a batch of milestones each week, most recent first, researches the story behind it:
what kind of research it began as, where it was first used, and the impact it has made since, with sources.
The tours and chart insights retell these stories; the Details card shows them.

Guardrails: short fields written to complete fixed sentences; every source must be fetched and its quoted
evidence found on the page, or nothing is recorded for that milestone.
"""
import sys, re, json
from datetime import date, timedelta
from common import load_db, save_db, call_claude, fetch_text, log_change, CONFIG, TODAY

TOOL = {'name': 'submit_story', 'description': 'Submit the story of this milestone.', 'input_schema': {'type': 'object', 'required': ['research', 'deploy', 'impact', 'sources'], 'properties': {
  'research': {'type': 'string', 'description': 'Completes "It started as ...": who did what kind of research, at most 25 words'},
  'deploy': {'type': 'string', 'description': 'Completes "It was first used ...": where, by whom and when, at most 25 words'},
  'impact': {'type': 'string', 'description': 'Completes "Since then, ...": the measurable or clearly evidenced impact, at most 35 words'},
  'sources': {'type': 'array', 'minItems': 1, 'maxItems': 3, 'items': {'type': 'object', 'required': ['url', 'label', 'quote'], 'properties': {
    'url': {'type': 'string'}, 'label': {'type': 'string'}, 'quote': {'type': 'string', 'description': 'A short exact quote from the page supporting the story'}}}}}}}
LIMITS = {'research': 25, 'deploy': 25, 'impact': 35}

def norm(s): return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9 ]', ' ', (s or '').lower())).strip()

def candidates(db, refresh_days):
    cutoff = (date.fromisoformat(TODAY) - timedelta(days=refresh_days)).isoformat()
    ms = [m for m in db['milestones'] if m.get('status') == 'landed' and not (m.get('flags') or {}).get('hidden') and (not m.get('story') or m['story'].get('checked', '') < cutoff)]
    # most recent first; within a year, clean energy, AI and major milestones first
    return sorted(ms, key=lambda m: (-m['change']['year'], not m.get('vision'), m.get('field') != 'ai', not (m.get('flags') or {}).get('major')))

def research(m):
    prompt = (f"Milestone: {m['title']} (field: {m['field']}). Research: {m['research']['year']}, {m['research'].get('what', '')} First product or use: {m['change']['year']}, {m['change'].get('what', '')}\n"
              "Using reputable public sources, write its story in three short parts that complete these sentences: \"It started as ...\" (the kind of research and who did it), "
              "\"It was first used ...\" (where, by whom and when), and \"Since then, ...\" (the impact it has made, with a figure where a source gives one). "
              "Do not invent anything; give one to three sources, each with a short exact quote from the page.")
    return call_claude('You research the history of technologies carefully and cite public sources exactly.', prompt, TOOL, max_searches=CONFIG.get('stories', {}).get('maxSearches', 3)) or {}

def verify(out):
    for k, n in LIMITS.items():
        v = (out.get(k) or '').strip()
        if not v or len(v.split()) > n or '<' in v: return None, f'{k} missing or too long'
    refs = []
    for s in (out.get('sources') or [])[:3]:
        url, q = s.get('url', ''), norm(s.get('quote'))
        if not re.match(r'https?://', url) or len(q) < 12: continue
        code, text = fetch_text(url)
        if code == 200 and q in norm(text): refs.append({'url': url, 'label': (s.get('label') or url)[:120], 'quote': s.get('quote')[:300]})
    if not refs: return None, 'no source could be confirmed'
    return {k: out[k].strip() for k in LIMITS} | {'refs': refs, 'checked': TODAY}, ''

def run():
    cfg = CONFIG.get('stories', {})
    if not cfg.get('enabled', True): print('Story agent disabled.'); return 0
    db = load_db(); done, report = 0, []
    for m in candidates(db, cfg.get('refreshDays', 180))[:cfg.get('perRun', 10)]:
        try: rec, why = verify(research(m))
        except Exception as e: rec, why = None, f'error: {e}'
        if rec: m['story'] = rec; done += 1; report.append(f"story    {m['id']}")
        else: report.append(f"skipped  {m['id']}: {why}")
    print('\n'.join(report) or 'No milestones due a story.')
    if done:
        log_change(db, f'Stories researched for {done} milestone{"" if done == 1 else "s"}.', [r for r in report if r.startswith('story')])
        save_db(db)
    return 0

if __name__ == '__main__':
    try: sys.exit(run())
    except Exception as e: print(f'Story agent could not run ({type(e).__name__}: {e}).'); sys.exit(0)
