#!/usr/bin/env python3
"""Weekly research agent: finds new research breakthroughs, products and binding changes in each field.

It never writes to the live dataset. Candidates that pass the hard checks below go to data/pending.json,
where the QA agent must independently confirm them before they are published.

Hard checks (code, not the model):
  1. Valid field, origin, status and years; the change year cannot precede the research year.
  2. Not a duplicate of an existing or pending milestone (fuzzy title match).
  3. At least two sources, each fetched by this code, each containing a distinctive term and the change year.
  4. At most `maxProposalsPerField` per field and `maxAdditionsPerRun` overall.
"""
import sys, json
from common import (load_db, load_pending, save_pending, call_claude, fetch_text, evidence_in, is_duplicate, new_id, CONFIG, TODAY)

SUBMIT = {
  'name': 'submit_candidates',
  'description': 'Submit candidate milestones found in this search, with sources.',
  'input_schema': {
    'type': 'object', 'required': ['candidates'],
    'properties': {'candidates': {'type': 'array', 'maxItems': 5, 'items': {
      'type': 'object',
      'required': ['title', 'origin', 'status', 'research_year', 'research_what', 'change_year', 'change_what', 'confidence', 'note', 'sources', 'evidence_terms'],
      'properties': {
        'title': {'type': 'string', 'description': 'Short name of the breakthrough or product, under 60 characters'},
        'origin': {'enum': ['academic', 'industry', 'government']},
        'status': {'enum': ['landed', 'outlook'], 'description': 'landed if it reached real-world change; outlook if a published target date is in the future'},
        'research_year': {'type': 'integer'}, 'research_what': {'type': 'string', 'description': 'One sentence, paraphrased'},
        'change_year': {'type': 'integer'}, 'change_what': {'type': 'string', 'description': 'One sentence, paraphrased'},
        'company': {'type': 'string'},
        'desnz': {'enum': ['opt', 'asset', 'demand', 'rd', 'gov', 'none'], 'description': 'DESNZ AI energy vision area if clearly relevant to energy, else none'},
        'ai_driven': {'type': 'boolean'},
        'confidence': {'enum': ['high', 'medium', 'low']},
        'note': {'type': 'string', 'description': 'Why it matters, one sentence'},
        'sources': {'type': 'array', 'minItems': 2, 'items': {'type': 'object', 'required': ['url', 'label'], 'properties': {'url': {'type': 'string'}, 'label': {'type': 'string'}}}},
        'evidence_terms': {'type': 'array', 'minItems': 2, 'items': {'type': 'string'}, 'description': 'Distinctive words that appear in the sources, such as the organisation or product name'}
      }}}}
  }
}

def run():
    db = load_db(); cfg = CONFIG['research']; pub = CONFIG['publish']
    as_of = int(db['meta']['asOf'][:4]); horizon = as_of + db['meta']['horizonYears']
    pending = load_pending(); accepted = 0; report = []
    for f in db['fields'][:cfg['fieldsPerRun']]:
        if accepted >= pub['maxAdditionsPerRun']: break
        existing = [m['title'] for m in db['milestones'] if m['field'] == f['id']]
        system = ('You are a careful research analyst maintaining a dataset of how long research takes to become real-world change. '
                  'A milestone needs a research origin (first credible publication, patent or demonstration) and a change '
                  '(first commercial sale, operational deployment, or binding rule taking effect).')
        prompt = (f"Field: {f['name']}.\nSearch for announcements in roughly the last {cfg['lookbackDays']} days of: a research breakthrough reaching its first real-world use, "
                  f"a significant new product launch with a traceable research origin, or a binding regulatory change. Today is {TODAY}.\n"
                  f"Only include items that are significant and verifiable from at least two independent sources. Outlook items need a published target year no later than {horizon}.\n"
                  f"Do not repeat these existing milestones: {json.dumps(existing[-80:])}\n"
                  f"Return at most {cfg['maxProposalsPerField']} candidates via submit_candidates. Return an empty list if nothing qualifies.")
        out = call_claude(system, prompt, SUBMIT, max_searches=cfg['searchesPerField']) or {'candidates': []}
        for c in out.get('candidates', [])[:cfg['maxProposalsPerField']]:
            why = check(db, f['id'], c, as_of, horizon, cfg['minSources'])
            if why:
                report.append(f"rejected [{f['id']}] {c.get('title')}: {why}"); continue
            pending.append({
              'id': new_id(db, c['title']), 'field': f['id'], 'origin': c['origin'], 'status': c['status'], 'title': c['title'][:90],
              'research': {'year': c['research_year'], 'what': c['research_what'][:600]},
              'change': {'year': c['change_year'], 'what': c['change_what'][:600]},
              'confidence': c['confidence'], 'note': c['note'][:600],
              **({'company': c['company'][:80]} if c.get('company') else {}),
              **({'desnz': c['desnz']} if c.get('desnz') and c['desnz'] != 'none' else {}),
              **({'flags': {'aiDriven': True}} if c.get('ai_driven') else {}),
              'refs': [{'label': s['label'][:200], 'url': s['url'], 'status': 'ok', 'checked': TODAY} for s in c['sources'][:4]],
              'evidence_terms': c['evidence_terms'][:6], 'proposed': TODAY, 'attempts': 0
            })
            accepted += 1
            report.append(f"pending  [{f['id']}] {c['title']}")
            if accepted >= pub['maxAdditionsPerRun']: break
    save_pending(pending)
    print('\n'.join(report) or 'No candidates this run.')
    print(f'{accepted} candidates queued for QA.')

def check(db, field, c, as_of, horizon, min_sources):
    r, p = c.get('research_year'), c.get('change_year')
    if not (isinstance(r, int) and isinstance(p, int)) or r < db['meta']['startYear'] or p < r: return 'invalid years'
    if c['status'] == 'landed' and p > as_of + 1: return 'landed with a future change year'
    if c['status'] == 'outlook' and not (as_of < p <= horizon): return 'outlook year outside the window'
    dup = is_duplicate(db, c['title'])
    if dup: return f'duplicate of "{dup}"'
    srcs = [s for s in c.get('sources', []) if s.get('url', '').startswith('http')]
    if len({s['url'].split('/')[2] for s in srcs}) < min_sources: return 'fewer than two independent sources'
    good = 0
    for s in srcs:
        code, text = fetch_text(s['url'])
        if 200 <= code < 400 and evidence_in(text, c.get('evidence_terms', []), [p if c['status'] == 'landed' else None]): good += 1
    if good < min_sources: return f'only {good} source(s) confirmed the key facts'
    return None

if __name__ == '__main__':
    sys.exit(run())
