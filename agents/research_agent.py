#!/usr/bin/env python3
"""Weekly research agent: finds new research breakthroughs, products and binding changes in each field.

It never writes to the live dataset. Candidates that pass the hard checks below go to data/pending.json,
where the QA agent must independently confirm them before they are published.

Hard checks (code, not the model):
  1. Valid field, origin, status and years; the change year cannot precede the research year.
  2. Not a duplicate of an existing or pending milestone (fuzzy title match).
  3. At least two sources, each fetched by this code, each containing a distinctive term and the change year.
  4. At most `maxProposalsPerField` per field and `maxAdditionsPerRun` overall, with `reservedForVision` places
     kept for the DESNZ vision-area searches (they run first; unused places go to the general searches).
"""
import sys, json, re
from common import norm
from common import (record_funnel, reject_reason, load_pending_founders, save_pending_founders, founder_runs, load_db, load_pending, save_pending, call_claude, fetch_text, evidence_in, is_duplicate, new_id, CONFIG, TODAY)

SUBMIT = {
  'name': 'submit_candidates',
  'description': 'Submit candidate milestones found in this search, with sources.',
  'input_schema': {
    'type': 'object', 'required': ['candidates'],
    'properties': {'candidates': {'type': 'array', 'maxItems': 5, 'items': {
      'type': 'object',
      'required': ['title', 'origin', 'status', 'research_year', 'research_what', 'research_origin', 'change_year', 'change_what', 'confidence', 'note', 'is_policy', 'sources', 'evidence_terms'],
      'properties': {
        'title': {'type': 'string', 'description': 'Short name of the breakthrough or product, under 60 characters'},
        'origin': {'enum': ['academic', 'industry', 'government']},
        'status': {'enum': ['landed', 'outlook'], 'description': 'landed if it reached real-world change; outlook if a published target date is in the future'},
        'research_year': {'type': 'integer'}, 'research_what': {'type': 'string', 'description': 'One sentence, paraphrased'},
        'change_year': {'type': 'integer'}, 'change_what': {'type': 'string', 'description': 'One sentence, paraphrased'},
        'company': {'type': 'string'},
        'desnz': {'enum': ['opt', 'asset', 'demand', 'rd', 'gov', 'none'], 'description': 'DESNZ AI energy vision area if clearly relevant to energy, else none'},
        'ai_driven': {'type': 'boolean'},
        'subfield': {'type': 'string', 'description': 'Sub-field id chosen from the list given for this field'},
        'field': {'type': 'string', 'description': 'Field id (only needed for vision-area searches)'},
        'readiness': {'enum': ['research', 'pilot', 'commercial', 'scale'], 'description': 'Research, pilot or demonstration, first commercial use, or at scale'},
        'gb_status': {'enum': ['deployed', 'trial', 'planned', 'not-yet', 'unknown'], 'description': 'Is it deployed, trialled or planned in Great Britain?'},
        'expands_attack_surface': {'type': 'boolean', 'description': 'Does it add new ways to attack systems, such as connected devices, remote control or AI agents?'},
        'security_note': {'type': 'string', 'description': 'One sentence on its cyber security implications'},
        'region': {'enum': ['uk', 'us', 'europe', 'asia', 'other', 'global'], 'description': 'Where the research began: uk, us, europe (rest of Europe), asia, other (rest of world) or global (many countries)'},
        'tags': {'type': 'array', 'maxItems': 4, 'items': {'type': 'string'}, 'description': 'Topic tags chosen only from the provided vocabulary'},
        'is_policy': {'type': 'boolean', 'description': 'True if the change is a law, regulation or mandate taking effect rather than a product or deployment'},
        'research_origin': {'type': 'string', 'description': 'The specific paper, patent, lab demonstration or programme where the research began, with its year'},
        'confidence': {'enum': ['high', 'medium', 'low']},
        'note': {'type': 'string', 'description': 'Why it matters, one sentence'},
        'sources': {'type': 'array', 'minItems': 2, 'items': {'type': 'object', 'required': ['url', 'label'], 'properties': {'url': {'type': 'string'}, 'label': {'type': 'string'}}}},
        'evidence_terms': {'type': 'array', 'minItems': 2, 'items': {'type': 'string'}, 'description': 'Distinctive words that appear in the sources, such as the organisation or product name'}
      }}}}
  }
}

def pending_record(db, f, c, fld, fields_by_id):
    """A checked candidate as a queued record for the QA agent (shared with the Gemini research agent)."""
    return {
      'id': new_id(db, c['title']), 'field': fld, 'origin': c['origin'], 'status': c['status'], 'title': c['title'][:90],
      'research': {'year': c['research_year'], 'what': (c['research_what'] + (' Origin: ' + c['research_origin'] if c.get('research_origin') and c['research_origin'] not in c['research_what'] else ''))[:600]},
      'change': {'year': c['change_year'], 'what': c['change_what'][:600]},
      'confidence': c['confidence'], 'note': c['note'][:600],
      **({'company': c['company'][:80]} if c.get('company') else {}),
      **({'desnz': c['desnz']} if c.get('desnz') and c['desnz'] != 'none' else ({'desnz': f['vision']['id']} if f.get('vision') else {})),
      **({'flags': {k: True for k, v in (('aiDriven', c.get('ai_driven')), ('policy', c.get('is_policy'))) if v}} if (c.get('ai_driven') or c.get('is_policy')) else {}),
      'refs': [{'label': s['label'][:200], 'url': s['url'], 'status': 'ok', 'checked': TODAY} for s in c['sources'][:4]],
      'subfield': (lambda ids: c.get('subfield') if c.get('subfield') in ids else (ids[-1] if ids else None))([x['id'] for x in fields_by_id[fld].get('subfields', [])]),
      **({'region': c['region']} if c.get('region') in ('uk', 'us', 'europe', 'asia', 'other', 'global') else {'region': 'unknown'}),
      **({'tags': [t for t in c.get('tags', []) if t in db.get('tagVocabulary', [])][:4]} if any(t in db.get('tagVocabulary', []) for t in c.get('tags', [])) else {}),
      'readiness': {'stage': c.get('readiness') if c.get('readiness') in ('research', 'pilot', 'commercial', 'scale') else ('commercial' if c['status'] == 'landed' else 'research'), 'basis': 'ai-estimate'},
      **({'gb': {'status': c.get('gb_status') if c.get('gb_status') in ('deployed', 'trial', 'planned', 'not-yet', 'unknown') else 'unknown', 'basis': 'ai-estimate'}} if (f['id'] == 'energy' or c.get('desnz') not in (None, 'none')) else {}),
      **({'security': {'expandsAttackSurface': bool(c.get('expands_attack_surface')), 'note': c['security_note'][:300], 'basis': 'ai-compiled'}} if c.get('security_note') and f['id'] != 'cyber' else {}),
      **({'forecast': {'estimatedYear': c['change_year'], 'estimatedOn': TODAY, 'revisions': []}} if c['status'] == 'outlook' else {}),
      'evidence_terms': c['evidence_terms'][:6], 'proposed': TODAY, 'attempts': 0
    }

def thin_cells(db, as_of, n):
    """The thinnest field-and-decade cells, thinnest first; ties rotate weekly so coverage builds evenly.
    Only decades from ten years before a field's earliest research, up to the last full decade."""
    import random
    hist = [m for m in db['milestones'] if m['status'] == 'landed' and not (m.get('flags') or {}).get('hidden') and not m.get('company')]
    last = (as_of // 10) * 10 - 10; cells = []
    for f in db['fields']:
        ys = [m['research']['year'] for m in hist if m['field'] == f['id']]
        if not ys: continue
        for d in range(max((min(ys) // 10) * 10, (db['meta']['startYear'] // 10) * 10), last + 1, 10):
            cells.append((sum(1 for m in hist if m['field'] == f['id'] and d <= m['change']['year'] < d + 10), f, d))
    random.Random(TODAY[:8] + str(int(TODAY[8:]) // 7)).shuffle(cells)   # a different order each week
    return sorted(cells, key=lambda x: x[0])[:n]

def run():
    db = load_db(); cfg = CONFIG['research']; pub = CONFIG['publish']
    as_of = int(db['meta']['asOf'][:4]); horizon = as_of + db['meta']['horizonYears']
    pending = load_pending(); accepted = 0; report = []
    funnel = {'recent': {'proposed':0, 'queued':0, 'rejected':{}}, 'backfill': {'proposed':0, 'queued':0, 'rejected':{}}}
    vision_runs = [{'id': fid, 'name': fname, 'subfields': next((x.get('subfields', []) for x in db['fields'] if x['id'] == fid), []), 'vision': a} for a in (db.get('visionAreas', []) if cfg.get('visionSearches', True) else []) for fid, fname in [('energy', 'Energy')]]
    # DESNZ vision areas first, with places reserved for them; the general field searches then fill the rest
    reserved, vision_accepted = pub.get('reservedForVision', 0), 0
    for f in vision_runs + list(db['fields'][:cfg['fieldsPerRun']]):
        if accepted >= pub.get('claudeAdditionsPerRun', pub['maxAdditionsPerRun']): break
        if f.get('vision') and reserved and vision_accepted >= reserved: continue
        va = f.get('vision')
        existing = [m['title'] for m in db['milestones']]   # every field, so cross-field duplicates are visible
        field_guide = '; '.join(f"{x['id']}: {x['name']}" for x in db['fields'])
        vocab = ', '.join(db.get('tagVocabulary', []))
        subs = f.get('subfields', []); sub_ids = [x['id'] for x in subs]
        sub_guide = '; '.join(f"{x['id']}: {x['name']}" for x in subs)
        system = ('You are a careful research analyst maintaining a dataset of how long research takes to become real-world change. '
                  'A milestone needs a research origin (first credible publication, patent or demonstration) and a change '
                  '(first commercial sale, operational deployment, or binding rule taking effect).')
        if va: prompt0 = (f"DESNZ AI energy vision area: {va['name']}. Search specifically for technologies that help this area of the UK's clean energy system, "
                          "including AI for network operation, asset health, flexibility and demand, energy innovation, and security and assurance. Set desnz to this area's id ('" + va['id'] + "'). ")
        else: prompt0 = ''
        prompt = prompt0 + (f"Field: {f['name']} (id {f['id']}). All fields: {field_guide}. Only return items that belong to {f['name']}; if an item fits another field better, leave it out.\n"
                  "WHAT QUALIFIES: a specific technology whose research origin can be identified (a named paper, patent, lab demonstration or programme, with its year) "
                  "and which has now reached real-world change: first commercial sale, first operational deployment, or a binding rule that requires or enables that specific technology. "
                  "WHAT DOES NOT QUALIFY: chemical or product bans and restrictions, exemptions and waivers, funding or investment announcements, procurement deals, partnerships, "
                  "incremental product versions, and regulations with no specific technology and research origin behind them. Set is_policy true for any law, regulation or mandate.\n"
                  f"Search for announcements in roughly the last {cfg['lookbackDays']} days of: a research breakthrough reaching its first real-world use, "
                  f"a significant new product with a traceable research origin, or a binding rule that requires a specific technology. Today is {TODAY}.\n"
                  f"Only include items that are significant and verifiable from at least two independent sources. Outlook items need a published target year no later than {horizon}.\n"
                  f"Topic tags must come from this list: {vocab}. Give the region where the research began. Sub-field must be one of: {sub_guide}.\n"
                  f"These milestones already exist in any field; do not propose them or close variants of them: {json.dumps(existing, ensure_ascii=False)}\n"
                  f"Return at most {cfg['maxProposalsPerField']} candidates via submit_candidates. Return an empty list if nothing qualifies.")
        out = call_claude(system, prompt, SUBMIT, max_searches=cfg['searchesPerField']) or {'candidates': []}
        for c in out.get('candidates', [])[:cfg['maxProposalsPerField']]:
            funnel['recent']['proposed'] += 1
            why = check(db, f['id'], c, as_of, horizon, cfg['minSources'])
            if why:
                rr = funnel['recent']['rejected']; rr[reject_reason(why)] = rr.get(reject_reason(why), 0) + 1
                report.append(f"rejected [{f['id']}] {c.get('title')}: {why}"); continue
            fields_by_id = {x['id']: x for x in db['fields']}
            fld = c.get('field') if f.get('vision') and c.get('field') in fields_by_id else f['id']
            if fld != f['id']:
                ids2 = [x['id'] for x in fields_by_id[fld].get('subfields', [])]
                c['subfield'] = c.get('subfield') if c.get('subfield') in ids2 else (ids2[-1] if ids2 else None)
            pending.append(pending_record(db, f, c, fld, fields_by_id))
            accepted += 1; vision_accepted += 1 if f.get('vision') else 0; funnel['recent']['queued'] += 1
            report.append(f"pending  [{'vision ' if f.get('vision') else ''}{f['id']}] {c['title']}")
            if accepted >= pub.get('claudeAdditionsPerRun', pub['maxAdditionsPerRun']) or (f.get('vision') and reserved and vision_accepted >= reserved): break
    # ---------- fill the gaps: important past milestones missing from the thinnest field-and-decade cells ----------
    bf = cfg.get('backfill', {})
    if bf.get('enabled', True):
        fields_by_id = {x['id']: x for x in db['fields']}; queued_bf = 0
        for k, f, d in thin_cells(db, as_of, bf.get('cellsPerRun', 5)):
            if queued_bf >= bf.get('perRun', 5): break
            existing = [m['title'] for m in db['milestones'] if m['field'] == f['id']] + [c['title'] for c in pending]
            prompt = (f"Fill a gap in a historical dataset of research breakthroughs. Field: {f['name']}. Find up to 2 important milestones whose first product or real-world use came in the {d}s "
                      f"(the research may have begun earlier) and which are missing from the dataset; it currently has {k} for this field in that decade. Prefer milestones that changed the field, with a well-documented research origin. "
                      "Use reputable sources that can be read without a login: encyclopaedias, institutional, company and museum histories, archives, and journal or learned-society pages. Use status 'landed'.\n"
                      f"These already exist; do not propose them or close variants: {json.dumps(existing, ensure_ascii=False)}\n"
                      "Return at most 2 candidates via submit_candidates, or an empty list if nothing important is missing.")
            out = call_claude('You research the history of technology carefully and cite readable public sources exactly.', prompt, SUBMIT, max_searches=bf.get('searchesPerCell', 3)) or {'candidates': []}
            for c in out.get('candidates', [])[:2]:
                funnel['backfill']['proposed'] += 1
                why = check(db, f['id'], c, as_of, horizon, cfg['minSources'])
                if not why and not (d <= (c.get('change_year') or 0) < d + 10): why = 'first use outside the decade asked for'
                if why:
                    rr = funnel['backfill']['rejected']; rr[reject_reason(why)] = rr.get(reject_reason(why), 0) + 1
                    report.append(f"rejected [backfill {f['id']} {d}s] {c.get('title')}: {why}"); continue
                pending.append(pending_record(db, f, c, f['id'], fields_by_id)); queued_bf += 1; funnel['backfill']['queued'] += 1
                report.append(f"pending  [backfill {f['id']} {d}s] {c['title']}")
                if queued_bf >= bf.get('perRun', 5): break
    save_pending(pending)
    record_funnel({'agent':'claude', **{f'{m}_{k}': v for m, x in funnel.items() for k, v in x.items()}})
    if founder_runs(): report += research_founders(db)
    print('\n'.join(report) or 'No candidates this run.')
    print(f'{accepted} candidates queued for QA.')

STOP = {'the', 'and', 'for', 'with', 'first', 'new', 'of', 'in', 'to', 'a', 'an', 'at', 'scale', 'commercial', 'service', 'launch', 'launched'}
def near_duplicate(db, title):
    words = lambda t: {w for w in re.findall(r'[a-z0-9]+', t.lower().replace('-', ' ')) if w not in STOP and len(w) > 2}
    a = words(title)
    if len(a) < 2: return None
    for m in db['milestones'] + load_pending():
        b = words(m['title'])
        if b and len(a & b) / len(a | b) >= 0.5: return m['title']
    return None

def check(db, field, c, as_of, horizon, min_sources):
    r, p = c.get('research_year'), c.get('change_year')
    if not (isinstance(r, int) and isinstance(p, int)) or r < db['meta']['startYear'] or p < r: return 'invalid years'
    if c['status'] == 'landed' and p > as_of + 1: return 'landed with a future change year'
    if c['status'] == 'outlook' and not (as_of < p <= horizon): return 'outlook year outside the window'
    if not (c.get('research_origin') or '').strip(): return 'no identifiable research origin'
    dup = is_duplicate(db, c['title']) or near_duplicate(db, c['title'])
    if dup: return f'duplicate of "{dup}"'
    srcs = [s for s in c.get('sources', []) if s.get('url', '').startswith('http')]
    if len({s['url'].split('/')[2] for s in srcs}) < min_sources: return 'fewer than two independent sources'
    good = 0
    for s in srcs:
        code, text = fetch_text(s['url'])
        if 200 <= code < 400 and evidence_in(text, c.get('evidence_terms', []), [p if c['status'] == 'landed' else None]): good += 1
    if good < min_sources: return f'only {good} source(s) confirmed the key facts'
    return None

SUBMIT_F = {
  'name': 'submit_fortunes', 'description': 'Submit founders who have recently made a fortune from a technology company.',
  'input_schema': {'type': 'object', 'required': ['founders'], 'properties': {'founders': {'type': 'array', 'maxItems': 5, 'items': {
    'type': 'object', 'required': ['names', 'company', 'field', 'founded', 'fortune_year', 'how', 'sources', 'evidence_terms'],
    'properties': {
      'names': {'type': 'string', 'description': 'Founder names, for example "Jane Smith and co-founders"'},
      'company': {'type': 'string'}, 'field': {'type': 'string', 'description': 'Field id from the list given'},
      'founded': {'type': 'integer'}, 'fortune_year': {'type': 'integer', 'description': 'Year of the listing, sale or valuation that made the founders very rich'},
      'how': {'type': 'string', 'description': 'Listing, acquisition or private valuation, in a few words'},
      'research': {'enum': ['university', 'lab', 'none'], 'description': 'Did the founding technology come from university or lab research?'},
      'net_worth_usd_bn': {'type': 'number'}, 'net_worth_source': {'type': 'string', 'description': 'Publication and date for the net worth figure'},
      'sources': {'type': 'array', 'minItems': 2, 'items': {'type': 'object', 'required': ['url', 'label'], 'properties': {'url': {'type': 'string'}, 'label': {'type': 'string'}}}},
      'evidence_terms': {'type': 'array', 'minItems': 1, 'items': {'type': 'string'}}}}}}}
}
def research_founders(db):
    fc = CONFIG.get('founders', {}); report = []
    as_of = int(db['meta']['asOf'][:4]); fields = {f['id'] for f in db['fields']}
    pend = load_pending_founders()
    known = {norm(f['company']) for f in db['founders']} | {norm(p['company']) for p in pend}
    system = 'You are a careful analyst tracking founders who become very rich from technology companies.'
    prompt = (f"Today is {TODAY}. Search for technology founders who, in roughly the last 60 days, became very wealthy (a net worth of about $1bn or more) through a stock-market listing, acquisition or private valuation. "
              f"Fields: {'; '.join(f['id'] + ': ' + f['name'] for f in db['fields'])}. Do not include these companies: {json.dumps(sorted({f['company'] for f in db['founders']}))}. "
              "Each must be supported by two independent sources that name the company and the year. Return them via submit_fortunes, or an empty list.")
    out = call_claude(system, prompt, SUBMIT_F, max_searches=fc.get('searches', 6)) or {'founders': []}
    added = 0
    for c in out.get('founders', []):
        if added >= fc.get('maxNewPerRun', 3): break
        why = None
        if norm(c.get('company', '')) in known: why = 'already in the data'
        elif c.get('field') not in fields: why = 'unknown field'
        elif not (isinstance(c.get('founded'), int) and isinstance(c.get('fortune_year'), int)) or c['fortune_year'] < c['founded'] or c['fortune_year'] > as_of: why = 'invalid years'
        else:
            srcs = [x for x in c.get('sources', []) if x.get('url', '').startswith('http')]
            if len({x['url'].split('/')[2] for x in srcs}) < 2: why = 'fewer than two independent sources'
            else:
                good = sum(1 for x in srcs if (lambda r: 200 <= r[0] < 400 and evidence_in(r[1], [c['company']] + c.get('evidence_terms', []), [c['fortune_year']]))(fetch_text(x['url'])))
                if good < 2: why = f'only {good} source(s) confirmed the company and year'
        if why: report.append(f"rejected fortune {c.get('company')}: {why}"); continue
        rec = {'names': c['names'][:120], 'company': c['company'][:80], 'field': c['field'], 'founded': c['founded'], 'fortuneYear': c['fortune_year'], 'how': c['how'][:80], 'confidence': 'medium',
               'sources': [{'label': x['label'][:200], 'url': x['url']} for x in c['sources'][:3]], 'proposed': TODAY, 'attempts': 0}
        if c.get('research') in ('university', 'lab'): rec['research'] = c['research']
        if isinstance(c.get('net_worth_usd_bn'), (int, float)) and 0 < c['net_worth_usd_bn'] < 5000:
            rec['netWorth'] = {'usdBn': round(float(c['net_worth_usd_bn']), 1), 'who': c['names'][:120], 'basis': (c.get('net_worth_source') or 'Reported estimate')[:160], 'asOf': TODAY}
        pend.append(rec); known.add(norm(c['company'])); added += 1; report.append(f"pending fortune {c['company']}")
    save_pending_founders(pend)
    return report

if __name__ == '__main__':
    sys.exit(run())
