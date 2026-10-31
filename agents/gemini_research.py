#!/usr/bin/env python3
"""Gemini research agent: a second model searching with Google, for up to 10 new milestones a week.

Its candidates go through exactly the same checks as Claude's (two sources, quoted evidence found on the page,
no duplicates) and into the same queue; Claude's QA agent then confirms or rejects them. It aims at what
Claude's searches tend to miss: UK, European and Asian work, and sources outside the English-speaking press.
"""
import sys, json
from common import load_db, load_pending, save_pending, call_gemini, CONFIG, TODAY
import research_agent as ra

def run():
    g = CONFIG.get('gemini', {}); cap = g.get('researchPerRun', 10)
    if not g.get('enabled', True): print('Gemini research disabled.'); return 0
    db = load_db(); pending = load_pending(); cfg = CONFIG['research']
    as_of = int(db['meta']['asOf'][:4]); horizon = as_of + db['meta']['horizonYears']
    fields = {f['id']: f for f in db['fields']}
    known = sorted({m['title'] for m in db['milestones']} | {c['title'] for c in pending})
    schema = json.dumps(ra.SUBMIT['input_schema']['properties']['candidates'])
    prompt = (f"Today is {TODAY}. You help maintain a public dataset of research breakthroughs: when research began, when the first product or real-world use arrived, and what is expected by {horizon}.\n"
              f"Using Google Search, find up to {cap} NEW milestones across these fields: {json.dumps({k: v['name'] for k, v in fields.items()})}. "
              "Favour what an English-language search tends to miss: work from the UK, Europe and Asia, and reputable sources in other languages (give the English title). "
              "Include AI for the clean energy system where you can. Each needs at least two independent, reputable public sources, and evidence_terms that appear on those pages.\n"
              f"Do not repeat any of these existing titles: {json.dumps(known, ensure_ascii=False)}\n"
              f"Reply with JSON only, in the form {{\"candidates\": [...]}}, where each candidate follows this schema: {schema}")
    out = call_gemini(prompt, search=True)
    if out is None: print('Gemini research: no reply (no key, an outage or an unreadable answer); skipping.'); return 0
    queued, report = 0, []
    for c in (out.get('candidates') or [])[:cap * 2]:
        if queued >= cap: break
        f = fields.get(c.get('field'))
        if not f: report.append(f"rejected {c.get('title')}: unknown field"); continue
        why = ra.check(db, f['id'], c, as_of, horizon, cfg['minSources'])
        if why: report.append(f"rejected [{f['id']}] {c.get('title')}: {why}"); continue
        rec = ra.pending_record(db, f, c, f['id'], fields); rec['foundBy'] = 'gemini-research'
        pending.append(rec); queued += 1; report.append(f"pending  [gemini {f['id']}] {c['title']}")
    save_pending(pending)
    db['meta'].setdefault('secondOpinion', []).append({'date':TODAY, 'kind':'gemini-research', 'proposed':len(out.get('candidates') or []), 'queued':queued})
    from common import save_db, log_change
    log_change(db, f"Gemini research: {queued} of {len(out.get('candidates') or [])} candidates passed the source checks and were queued for Claude's QA.", [r for r in report if r.startswith('pending')])
    save_db(db)
    print('\n'.join(report) or 'Gemini found nothing new.'); print(f'{queued} Gemini candidates queued for Claude\'s QA.')
    return 0

if __name__ == '__main__':
    try: sys.exit(run())
    except Exception as e: print(f'Gemini research could not run ({type(e).__name__}: {e}).'); sys.exit(0)
