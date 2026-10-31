#!/usr/bin/env python3
"""Deep search agent: a broad, worldwide, multi-language sweep of the last 10 years and the next 10.

Run it by hand (Actions → Deep search → Run workflow) or let it run every six months. It aims for at least 200
new milestones, at least 50 of them for AI in the clean energy system, where they exist. Every find passes the
same checks as the weekly agents (two independent sources, the facts found on both pages, sensible years, no
duplicates) before Claude's QA confirms it and Gemini gives its second opinion.
"""
import os, sys, json
from common import load_db, load_pending, save_pending, call_claude, call_gemini, record_funnel, record_rejection, reject_reason, CONFIG, TODAY
import research_agent as ra

REGIONS = {'china': ('China', 'Chinese (Mandarin)'), 'jpkr': ('Japan and South Korea', 'Japanese and Korean'), 'europe': ('Europe and the UK', 'German, French, Dutch, Nordic and other European languages'),
           'asia': ('India and the rest of Asia', 'Hindi and other local languages'), 'americas': ('the Americas', 'English, Spanish and Portuguese'), 'world': ('anywhere in the world', 'English')}
CHINA_STRONG = {'hw', 'energy', 'materials', 'comms', 'ai', 'robotics', 'space', 'quantum'}

def plan(db, Y):
    """The searches, in order: every field and window worldwide; two rotating regions per field; the clean energy areas."""
    windows = [('past', Y - 10, Y - 6, 'landed'), ('past', Y - 5, Y, 'landed'), ('future', Y + 1, Y + 10, 'outlook')]
    others = ['jpkr', 'europe', 'asia', 'americas']; out = []
    for i, f in enumerate(db['fields']):
        regions = ['world', 'china' if f['id'] in CHINA_STRONG else others[i % 4], others[(i + 1) % 4]]
        for k, (kind, a, b, status) in enumerate(windows):
            out.append({'field': f, 'region': regions[0], 'a': a, 'b': b, 'status': status})
            out.append({'field': f, 'region': regions[1 + k % 2], 'a': a, 'b': b, 'status': status})
    for area in db.get('visionAreas', []):
        f = {'id': 'energy', 'name': 'Energy', 'vision': area}
        for region in ('world', 'china', 'europe'):
            for kind, a, b, status in (windows[1], windows[2]):
                out.append({'field': f, 'region': region, 'a': a, 'b': b, 'status': status})
    return out

def prompt_for(s, existing, Y):
    region, langs = REGIONS[s['region']]; f = s['field']
    topic = f"AI in the clean energy system, area: {f['vision']['name']}" if f.get('vision') else f"the field of {f['name']}"
    when = (f"whose first product or real-world use came between {s['a']} and {s['b']}" if s['status'] == 'landed'
            else f"expected to reach first product or real-world use between {s['a']} and {s['b']} (a credible, published plan or programme, not speculation)")
    return (f"Deep search, {TODAY}. Find up to 8 milestones in {topic}, from research or work in {region}, {when}. The research may have begun years earlier.\n"
            f"Search in {langs} as well as English: much innovation is reported first in local-language sources. Translate titles and descriptions into English, "
            "but keep each source in its original language, and give evidence_terms exactly as they appear on those pages (in their language).\n"
            f"Each candidate needs an identifiable research origin and two independent, readable public sources. Use status '{s['status']}'.\n"
            f"These already exist; do not propose them or close variants: {json.dumps(existing, ensure_ascii=False)}\n"
            "Return candidates via submit_candidates, or an empty list if nothing qualifies.")

def run():
    cfg, dcfg = CONFIG['research'], CONFIG.get('deepSearch', {})
    Y = int(os.environ.get('START_YEAR') or TODAY[:4]); target, target_clean = int(os.environ.get('TARGET_TOTAL') or dcfg.get('targetTotal', 200)), int(os.environ.get('TARGET_CLEAN') or dcfg.get('targetClean', 50))
    db = load_db(); pending = load_pending(); fields_by_id = {f['id']: f for f in db['fields']}
    as_of = int(db['meta']['asOf'][:4]); horizon = as_of + db['meta']['horizonYears']
    steps = plan(db, Y)[:dcfg.get('maxCalls', 100)]
    queued, clean, funnel, report = 0, 0, {'proposed': 0, 'queued': 0, 'rejected': {}}, []
    print(f'Deep search from {Y}: {len(steps)} searches planned; aiming for {target} finds, {target_clean} for AI in clean energy.')
    for n, s in enumerate(steps, 1):
        if queued >= dcfg.get('maxQueue', 350): print('The queue limit for this run is reached.'); break
        if queued >= target and clean >= target_clean: print('Both targets met; stopping early to save cost.'); break
        f = s['field']; existing = [m['title'] for m in db['milestones']] + [c['title'] for c in pending]
        out = call_claude('You are a meticulous international technology researcher. You cite readable public sources exactly.', prompt_for(s, existing, Y), ra.SUBMIT, max_searches=dcfg.get('searchesPerCall', 4))
        cands = ra.candidates_of(out, 8)
        print(f"[{n}/{len(steps)}] {f.get('vision', {}).get('name') or f['name']} · {REGIONS[s['region']][0]} · {s['a']}–{s['b']}: " + (f'{len(cands)} candidate(s)' if out is not None else 'no answer'))
        for c in cands:
            funnel['proposed'] += 1
            fld = c.get('field') if f.get('vision') and c.get('field') in fields_by_id else f['id']
            why = ra.safe_check(db, fld, c, as_of, horizon, cfg['minSources'])
            if not why and not (s['a'] <= (c.get('change_year') or 0) <= s['b']): why = 'first use outside the years searched'
            if why:
                record_rejection('deep-search', s['region'], c, why); funnel['rejected'][reject_reason(why)] = funnel['rejected'].get(reject_reason(why), 0) + 1
                report.append(f"rejected [{fld} {s['region']}] {c.get('title')}: {why}"); continue
            rec = ra.pending_record(db, f if f.get('vision') else fields_by_id[fld], c, fld, fields_by_id); rec['foundBy'] = 'deep-search'
            pending.append(rec); queued += 1; funnel['queued'] += 1; clean += 1 if (f.get('vision') or rec.get('desnz')) else 0
            report.append(f"queued   [{fld} {s['region']}] {c['title']}")
        save_pending(pending)   # save as we go, so a late failure loses little
    # Gemini: a China and Asia sweep per field, when its key is present
    if os.environ.get('GEMINI_API_KEY') and dcfg.get('gemini', True):
        for f in db['fields']:
            if queued >= dcfg.get('maxQueue', 350): break
            existing = [m['title'] for m in db['milestones'] if m['field'] == f['id']] + [c['title'] for c in pending]
            out = call_gemini(prompt_for({'field': f, 'region': 'china', 'a': Y - 10, 'b': Y, 'status': 'landed'}, existing, Y).replace('via submit_candidates', 'as one JSON object {"candidates": [...]}, using these keys: '
                              + ', '.join(ra.SUBMIT['input_schema']['properties']['candidates']['items']['properties'])), search=True, max_tokens=32000, want='candidates')
            for c in ra.candidates_of(out, 8):
                funnel['proposed'] += 1; why = ra.safe_check(db, f['id'], c, as_of, horizon, cfg['minSources'])
                if why: record_rejection('deep-search-gemini', 'china', c, why); funnel['rejected'][reject_reason(why)] = funnel['rejected'].get(reject_reason(why), 0) + 1; continue
                rec = ra.pending_record(db, f, c, f['id'], fields_by_id); rec['foundBy'] = 'gemini-research'; pending.append(rec); queued += 1; funnel['queued'] += 1
            save_pending(pending)
    record_funnel({'agent': 'deep', 'deep_proposed': funnel['proposed'], 'deep_queued': funnel['queued'], 'deep_rejected': funnel['rejected']})
    print('\n'.join(report[-400:])); print(f'Deep search: {queued} candidates queued for QA ({clean} for AI in clean energy).')
    return 0

if __name__ == '__main__':
    try: sys.exit(run())
    except Exception as e: print(f'Deep search stopped ({type(e).__name__}: {e}); anything already queued is kept.'); sys.exit(0)
