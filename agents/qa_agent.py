#!/usr/bin/env python3
"""Weekly QA agent: independently confirms new candidates, then audits a rotating batch of existing records.

Rules enforced in code (the model only proposes):
  - A pending candidate is published only if this agent independently confirms it.
  - A correction is applied only if its evidence quote is found verbatim in a page this code fetched,
    and, for years, the new year appears in that quote and moves by no more than `maxYearShift`.
  - Field, DESNZ area and "major" changes need high confidence.
  - Nothing is deleted: doubtful records are marked "disputed"; broken links are marked "broken".
  - At most `maxCorrectionsPerRun` corrections and `maxAdditionsPerRun` additions per run.
  - Outlook records whose year has passed are confirmed as landed (with evidence) or re-estimated.
"""
import sys, json
from common import (load_pending_founders, save_pending_founders, founder_runs, slug, DEEP, load_db, save_db, load_pending, save_pending, call_claude, fetch_text, link_ok, quote_in, evidence_in, log_change, CONFIG, TODAY)

CORR = {'type': 'object', 'required': ['path', 'value', 'evidence_url', 'evidence_quote'], 'properties': {
  'path': {'enum': ['research.year', 'change.year', 'research.what', 'change.what', 'note', 'company', 'status', 'add_ref', 'adoption.year']},
  'value': {'type': ['string', 'integer']}, 'evidence_url': {'type': 'string'}, 'label': {'type': 'string'},
  'evidence_quote': {'type': 'string', 'description': 'A short passage copied exactly from the evidence page that supports the change'}}}
REVIEW = {'name': 'submit_review', 'description': 'Submit the review of each record.', 'input_schema': {'type': 'object', 'required': ['reviews'], 'properties': {'reviews': {'type': 'array', 'items': {
  'type': 'object', 'required': ['id', 'verdict'], 'properties': {
    'id': {'type': 'string'}, 'verdict': {'enum': ['ok', 'correct', 'dispute']}, 'reason': {'type': 'string'},
    'corrections': {'type': 'array', 'items': CORR},
    'adoption_estimate': {'type': 'object', 'properties': {'year': {'type': 'integer'}, 'what': {'type': 'string'}, 'confidence': {'enum': ['high', 'medium', 'low']}}, 'description': 'Only for landed records with no adoption year: when it reached mainstream use'},
    'classification': {'type': 'object', 'properties': {'field': {'type': 'string'}, 'subfield': {'type': 'string'}, 'readiness': {'enum': ['research', 'pilot', 'commercial', 'scale']}, 'gb_status': {'enum': ['deployed', 'trial', 'planned', 'not-yet', 'unknown']}, 'gb_note': {'type': 'string'}, 'security_note': {'type': 'string'}, 'expands_attack_surface': {'type': 'boolean'}, 'region': {'enum': ['uk', 'us', 'europe', 'asia', 'other', 'global']}, 'tags': {'type': 'array', 'items': {'type': 'string'}}, 'desnz': {'enum': ['opt', 'asset', 'demand', 'rd', 'gov', 'none']}, 'major': {'type': 'boolean'},
      'confidence': {'enum': ['high', 'medium', 'low']}, 'reason': {'type': 'string'}}},
    're_estimate_year': {'type': 'integer', 'description': 'For an outlook whose year has passed and has not landed: a new estimated year'}}}}}}}
PENDING_TOOL = {'name': 'submit_decisions', 'description': 'Decide on each candidate.', 'input_schema': {'type': 'object', 'required': ['decisions'], 'properties': {'decisions': {'type': 'array', 'items': {
  'type': 'object', 'required': ['id', 'decision', 'reason'], 'properties': {'id': {'type': 'string'}, 'decision': {'enum': ['confirm', 'reject', 'unsure']}, 'reason': {'type': 'string'}}}}}}}

SYSTEM = ('You are an independent fact-checker for a dataset of research-to-change milestones. Be sceptical. Check each claim '
          'against sources you find yourself. Only propose a correction if you can quote a passage, copied exactly from a page, that supports it.')

def run():
    db = load_db(); cfg = CONFIG['qa']; pub = CONFIG['publish']
    as_of = int(TODAY[:4]); horizon = as_of + db['meta']['horizonYears']
    fields = {f['id'] for f in db['fields']}
    added, corrected, disputed, broken, reestimated, notes = [], [], [], [], [], []

    # ---------- 1. pending candidates: independent confirmation ----------
    pending = load_pending(); keep = []
    if pending:
        brief = [{k: c[k] for k in ('id', 'title', 'field', 'status', 'research', 'change', 'company', 'refs') if k in c} for c in pending[:pub['maxAdditionsPerRun']]]
        out = call_claude(SYSTEM, f"Independently verify each candidate milestone. Search for your own sources. Confirm only if the research origin, the change and both years are right.\n{json.dumps(brief, ensure_ascii=False)}",
                          PENDING_TOOL, max_searches=min(12, 3 * len(brief))) or {'decisions': []}
        dec = {d['id']: d for d in out.get('decisions', [])}
        for c in pending:
            d = dec.get(c['id'])
            if d and d['decision'] == 'confirm' and len(added) < pub['maxAdditionsPerRun'] and not any(m['id'] == c['id'] for m in db['milestones']):
                rec = {k: v for k, v in c.items() if k not in ('evidence_terms', 'proposed', 'attempts', 'foundBy')}
                rec['provenance'] = {'verification': 'source-cited', 'addedBy': c.get('foundBy', 'research-agent'), 'added': TODAY, 'lastChecked': TODAY, 'approximate': False}
                if rec['status'] == 'outlook': rec['basis'] = rec['refs'][0]
                db['milestones'].append(rec); added.append(rec['id'])   # stable ID, shown by title in the app
            elif d and d['decision'] == 'reject':
                notes.append(f"rejected candidate {c['title']}: {d.get('reason', '')[:120]}")
            else:
                c['attempts'] = c.get('attempts', 0) + 1
                if c['attempts'] < cfg['pendingMaxAttempts']: keep.append(c)
                else: notes.append(f"dropped unconfirmed candidate {c['title']}")
        save_pending(keep)

    # ---------- 2. rotating audit of existing records ----------
    live = [m for m in db['milestones'] if not (m.get('flags') or {}).get('hidden')]
    overdue = [m for m in live if m['status'] == 'outlook' and m['change']['year'] <= as_of]
    rest = sorted([m for m in live if m not in overdue], key=lambda m: m['provenance'].get('lastChecked', '1900-01-01'))
    # sources first for AI-compiled records with no working link; then the least recently checked
    unsourced = [m for m in rest if m['provenance']['verification'] == 'ai-compiled' and not any(r.get('url') and r.get('status') != 'broken' for r in m.get('refs', []))]
    others = [m for m in rest if m not in unsourced]
    size = cfg.get('deepAuditBatchSize', cfg['auditBatchSize']) if DEEP else cfg['auditBatchSize']
    batch = (overdue + unsourced[:size // 2] + others)[:size]
    # deterministic link checks first
    for m in batch:
        for ref in m.get('refs', []) + ([m['basis']] if m.get('basis') else []):
            if ref.get('url'):
                ok = link_ok(ref['url']); ref['status'] = 'ok' if ok else 'broken'; ref['checked'] = TODAY
                if not ok: broken.append(f"{m['id']}: {ref['url']}")
        if m['provenance']['verification'] == 'source-cited' and not any(r.get('url') and r.get('status') != 'broken' for r in m.get('refs', []) + ([m['basis']] if m.get('basis') else [])):
            m['provenance']['verification'] = 'ai-compiled' if m['status'] == 'landed' else 'ai-estimate'
            m['provenance']['qaNote'] = 'All cited links are broken; downgraded until a new source is found.'
    # model review in small groups
    budget = cfg['maxCorrectionsPerRun']
    for i in range(0, len(batch), 8):
        group = batch[i:i + 8]
        brief = [{'id': m['id'], 'title': m['title'], 'field': m['field'], 'status': m['status'], 'research': m['research'], 'change': m['change'], 'company': m.get('company'),
                  'desnz': m.get('desnz'), 'major': bool((m.get('flags') or {}).get('major')), 'refs': m.get('refs', []), 'outlook_year_passed': m in overdue,
                  'adoption': m.get('adoption'), 'region': m.get('region', 'unknown'), 'tags': m.get('tags', [])} for m in group]
        prompt = (f"Today is {TODAY}. Review these records. Check the research year and description, the change year and description, the field "
                  f"({', '.join(sorted(fields))}), the DESNZ AI energy vision area (opt, asset, demand, rd, gov or none) and whether it is a major milestone. "
                  f"For any record marked outlook_year_passed, find out whether it has now landed (give the change year with an evidence quote) or give re_estimate_year (no later than {horizon}). "
                  f"Where a record has no working source, find one and add it with path add_ref and an evidence quote mentioning it; this is a priority. "
                  f"{db['meta'].get('adoptionDefinition', '')} If a landed record has no adoption year, give adoption_estimate; if you find a source stating when it reached mainstream use, propose path adoption.year with an evidence quote. "
                  f"If region is unknown give classification.region (uk, us, europe, asia, other, global). Check the sub-field and give classification.subfield if it is wrong (sub-fields per field: {'; '.join(f['id'] + ': ' + ', '.join(x['id'] for x in f.get('subfields', [])) for f in db['fields'])}). Check the readiness stage (research, pilot, commercial, scale) and, for energy or vision-linked records, gb_status and a short gb_note on why it matters for GB networks. If a technology record has no security note, give security_note and expands_attack_surface. If tags are empty give classification.tags from: {', '.join(db.get('tagVocabulary', []))}.\n{json.dumps(brief, ensure_ascii=False)}")
        out = call_claude(SYSTEM, prompt, REVIEW, max_searches=min(10, cfg['searchesPerReview'] * len(group))) or {'reviews': []}
        byid = {m['id']: m for m in group}
        for rv in out.get('reviews', []):
            m = byid.get(rv.get('id'))
            if not m: continue
            m['provenance']['lastChecked'] = TODAY
            for c in rv.get('corrections', []) or []:
                if budget <= 0: break
                msg = apply_correction(m, c, cfg, as_of)
                if msg: corrected.append(msg); budget -= 1
            ae = rv.get('adoption_estimate') or {}
            if m['status'] == 'landed' and not m.get('adoption') and ae.get('confidence') == 'high' and isinstance(ae.get('year'), int) and m['change']['year'] <= ae['year'] <= as_of + db['meta']['horizonYears'] and budget > 0:
                m['adoption'] = {'year': ae['year'], 'what': (ae.get('what') or 'Reached mainstream use.')[:300], 'basis': 'ai-estimate'}
                corrected.append(f"{m['id']}: adoption estimate {ae['year']}"); budget -= 1
            cl = rv.get('classification') or {}
            if cl.get('confidence') == 'high' and cl.get('region') in ('uk', 'us', 'europe', 'asia', 'other', 'global') and m.get('region', 'unknown') == 'unknown':
                m['region'] = cl['region']; corrected.append(f"{m['id']}: region → {cl['region']}")
            subs_ok = [x['id'] for f in db['fields'] if f['id'] == m['field'] for x in f.get('subfields', [])]
            if cl.get('confidence') == 'high' and cl.get('subfield') in subs_ok and cl['subfield'] != m.get('subfield'):
                corrected.append(f"{m['id']}: sub-field {m.get('subfield')} → {cl['subfield']}"); m['subfield'] = cl['subfield']
            if cl.get('confidence') == 'high' and cl.get('readiness') and cl['readiness'] != (m.get('readiness') or {}).get('stage'):
                corrected.append(f"{m['id']}: readiness {(m.get('readiness') or {}).get('stage')} → {cl['readiness']}"); m['readiness'] = {'stage': cl['readiness'], 'basis': 'ai-estimate', 'checked': TODAY}
            if cl.get('confidence') == 'high' and (m['field'] == 'energy' or m.get('desnz')) and cl.get('gb_status') and cl['gb_status'] != (m.get('gb') or {}).get('status'):
                corrected.append(f"{m['id']}: GB status {(m.get('gb') or {}).get('status')} → {cl['gb_status']}"); m['gb'] = {**(m.get('gb') or {}), 'status': cl['gb_status'], 'basis': 'ai-estimate'}
            if cl.get('gb_note') and (m['field'] == 'energy' or m.get('desnz')) and not (m.get('gb') or {}).get('note'):
                m.setdefault('gb', {'status': 'unknown', 'basis': 'ai-estimate'})['note'] = cl['gb_note'][:240]
            if cl.get('security_note') and not m.get('security') and m['field'] != 'cyber' and not (m.get('flags') or {}).get('policy'):
                m['security'] = {'expandsAttackSurface': bool(cl.get('expands_attack_surface')), 'note': cl['security_note'][:300], 'basis': 'ai-compiled'}
            if cl.get('confidence') == 'high' and cl.get('tags') and not m.get('tags'):
                tg = [t for t in cl['tags'] if t in db.get('tagVocabulary', [])][:4]
                if tg: m['tags'] = tg; corrected.append(f"{m['id']}: tags added")
            if cl.get('confidence') == 'high' and budget > 0:
                if cl.get('field') in fields and cl['field'] != m['field']:
                    corrected.append(f"{m['id']}: field {m['field']} → {cl['field']}"); m['field'] = cl['field']; budget -= 1
                    subs_new = [x['id'] for f in db['fields'] if f['id'] == m['field'] for x in f.get('subfields', [])]
                    if subs_new and m.get('subfield') not in subs_new: m['subfield'] = cl.get('subfield') if cl.get('subfield') in subs_new else subs_new[-1]
                if 'desnz' in cl and (cl['desnz'] or 'none') != (m.get('desnz') or 'none'):
                    if cl['desnz'] == 'none': m.pop('desnz', None)
                    else: m['desnz'] = cl['desnz']
                    corrected.append(f"{m['id']}: DESNZ area → {cl['desnz']}"); budget -= 1
                if 'major' in cl and cl['major'] != bool((m.get('flags') or {}).get('major')):
                    m.setdefault('flags', {})['major'] = bool(cl['major']); corrected.append(f"{m['id']}: major → {cl['major']}"); budget -= 1
            if m in overdue and m['status'] == 'outlook' and m['change']['year'] <= as_of:
                ny = rv.get('re_estimate_year')
                ny = ny if isinstance(ny, int) and as_of < ny <= horizon else min(horizon, as_of + 2)
                m.setdefault('forecast', {'estimatedYear': m['change']['year'], 'estimatedOn': db['meta'].get('asOf', TODAY), 'revisions': []})['revisions'].append({'year': ny, 'on': TODAY})
                m['change']['year'] = ny; m['provenance']['verification'] = 'ai-estimate'; m['provenance']['approximate'] = True
                m['provenance']['qaNote'] = f'Outlook year passed without confirmation; re-estimated on {TODAY}.'
                reestimated.append(f"{m['id']} → {ny}")
            if rv.get('verdict') == 'dispute':
                m.setdefault('flags', {})['disputed'] = True
                m['provenance']['qaNote'] = (rv.get('reason') or 'Disputed by the QA agent.')[:400]
                disputed.append(m['id'])

    # ---------- 3. fortunes: confirm new founders and audit net worths (monthly by default) ----------
    if founder_runs():
        fc = CONFIG.get('founders', {})
        pend = load_pending_founders(); keepf = []
        if pend:
            out = call_claude(SYSTEM, f"Independently verify each founder fortune. Confirm only if the company, founders, founding year and fortune year are right.\n{json.dumps([{k: p[k] for k in ('company', 'names', 'founded', 'fortuneYear', 'how', 'sources') if k in p} for p in pend], ensure_ascii=False)}",
                              {**PENDING_TOOL, 'input_schema': {'type': 'object', 'required': ['decisions'], 'properties': {'decisions': {'type': 'array', 'items': {'type': 'object', 'required': ['id', 'decision', 'reason'], 'properties': {'id': {'type': 'string', 'description': 'The company name'}, 'decision': {'enum': ['confirm', 'reject', 'unsure']}, 'reason': {'type': 'string'}}}}}}},
                              max_searches=min(10, 3 * len(pend))) or {'decisions': []}
            dec = {d['id'].lower(): d for d in out.get('decisions', [])}
            used = {f['id'] for f in db['founders']}
            for pf in pend:
                d = dec.get(pf['company'].lower())
                if d and d['decision'] == 'confirm':
                    fid = 'f-' + slug(pf['company']); k = 2
                    while fid in used: fid = f"f-{slug(pf['company'])}-{k}"; k += 1
                    used.add(fid)
                    rec = {'id': fid, **{k2: v for k2, v in pf.items() if k2 not in ('proposed', 'attempts', 'sources')}, 'provenance': {'verification': 'source-cited', 'addedBy': 'research-agent', 'added': TODAY, 'lastChecked': TODAY, 'sources': pf.get('sources', [])}}
                    db['founders'].append(rec); added.append('founder ' + fid)
                elif d and d['decision'] == 'reject': notes.append(f"rejected fortune {pf['company']}: {d.get('reason', '')[:100]}")
                else:
                    pf['attempts'] = pf.get('attempts', 0) + 1
                    if pf['attempts'] < cfg['pendingMaxAttempts']: keepf.append(pf)
            save_pending_founders(keepf)
        # audit the founders checked longest ago
        fb = sorted(db['founders'], key=lambda f: (f.get('provenance') or {}).get('lastChecked', '1900-01-01'))[:fc.get('auditBatchSize', 20)]
        brief = [{'id': f['id'], 'names': f['names'], 'company': f['company'], 'founded': f['founded'], 'fortuneYear': f['fortuneYear'], 'netWorth': f.get('netWorth')} for f in fb]
        out = call_claude(SYSTEM, f"Today is {TODAY}. For each founder record, check the founding year and fortune year, and find the latest published net worth (Forbes or Bloomberg Billionaires Index preferred) for the person named in netWorth.who. "
                                  f"Propose corrections only with an exact quote from the page that contains the new figure or year. Use path netWorth.usdBn (value in US$ billions), founded or fortuneYear.\n{json.dumps(brief, ensure_ascii=False)}",
                          REVIEW_F, max_searches=min(12, 2 * len(fb))) or {'reviews': []}
        byid = {f['id']: f for f in fb}; fcount = 0
        for rv in out.get('reviews', []):
            f = byid.get(rv.get('id'))
            if not f: continue
            f.setdefault('provenance', {'verification': 'ai-compiled', 'addedBy': 'initial-build', 'added': db['meta'].get('asOf', TODAY)})['lastChecked'] = TODAY
            for c in rv.get('corrections', []) or []:
                if fcount >= fc.get('auditBatchSize', 20): break
                msg = apply_founder_correction(f, c, cfg, fc, as_of)
                if msg: corrected.append(msg); fcount += 1
            if rv.get('verdict') == 'dispute':
                f['provenance']['qaNote'] = (rv.get('reason') or 'Disputed by the QA agent.')[:300]; disputed.append(f['id'])

    # ---------- 4. publish ----------
    db['meta']['asOf'] = TODAY
    db['meta']['revision'] += 1
    import datetime as _dt
    db['meta']['lastAgentRun'] = TODAY + 'T' + _dt.datetime.now(_dt.timezone.utc).strftime('%H:%MZ')
    summary = f"{len(added)} added, {len(corrected)} corrected, {len(reestimated)} outlook re-estimated, {len(disputed)} disputed, {len(broken)} broken links."
    log_change(db, summary, [f'added: {t}' for t in added] + corrected + [f're-estimated: {x}' for x in reestimated] + [f'disputed: {x}' for x in disputed])
    save_db(db)
    print(summary)
    for line in notes + broken[:20]: print(' ', line)

REVIEW_F = {'name': 'submit_founder_review', 'description': 'Submit the review of each founder record.', 'input_schema': {'type': 'object', 'required': ['reviews'], 'properties': {'reviews': {'type': 'array', 'items': {
  'type': 'object', 'required': ['id', 'verdict'], 'properties': {'id': {'type': 'string'}, 'verdict': {'enum': ['ok', 'correct', 'dispute']}, 'reason': {'type': 'string'},
    'corrections': {'type': 'array', 'items': {'type': 'object', 'required': ['path', 'value', 'evidence_url', 'evidence_quote'], 'properties': {
      'path': {'enum': ['netWorth.usdBn', 'founded', 'fortuneYear']}, 'value': {'type': 'number'}, 'evidence_url': {'type': 'string'}, 'label': {'type': 'string'},
      'evidence_quote': {'type': 'string', 'description': 'A short passage copied exactly from the page that contains the new figure or year'}}}}}}}}}}

def apply_founder_correction(f, c, cfg, fc, as_of):
    url, quote, path = c.get('evidence_url', ''), c.get('evidence_quote', ''), c.get('path')
    if not url.startswith('http'): return None
    code, text = fetch_text(url)
    if not (200 <= code < 400 and quote_in(text, quote)): return None
    if path == 'netWorth.usdBn':
        try: val = round(float(c['value']), 1)
        except Exception: return None
        if not (0 < val < 5000): return None
        digits = __import__('re').sub(r'\D', '', str(int(val)))
        if digits not in __import__('re').sub(r'[^0-9]', '', quote) or not __import__('re').search(r'billion|bn', quote, __import__('re').I): return None
        old = (f.get('netWorth') or {}).get('usdBn')
        if old is not None and abs(val - old) < .05: return None
        if old and not (1 / fc.get('maxNetWorthChangeFactor', 3) <= val / old <= fc.get('maxNetWorthChangeFactor', 3)): return None
        nw = f.get('netWorth') or {'who': f['names']}
        nw.update({'usdBn': val, 'basis': (c.get('label') or url.split('/')[2])[:160], 'asOf': TODAY, 'source': {'label': (c.get('label') or url)[:200], 'url': url}})
        f['netWorth'] = nw; f['provenance']['verification'] = 'source-cited'
        return f"{f['id']}: net worth {old if old is not None else 'none'} → {val}"
    if path in ('founded', 'fortuneYear'):
        try: val = int(c['value'])
        except Exception: return None
        old = f[path]
        if val == old or str(val) not in quote or abs(val - old) > cfg['maxYearShift'] or val > as_of: return None
        if (path == 'founded' and val > f['fortuneYear']) or (path == 'fortuneYear' and val < f['founded']): return None
        f[path] = val; f['provenance']['verification'] = 'source-cited'
        return f"{f['id']}: {path} {old} → {val}"
    return None

def apply_correction(m, c, cfg, as_of):
    url, quote, path, val = c.get('evidence_url', ''), c.get('evidence_quote', ''), c.get('path'), c.get('value')
    if not url.startswith('http'): return None
    code, text = fetch_text(url)
    if not (200 <= code < 400 and quote_in(text, quote)): return None          # evidence must really be on the page
    if path == 'adoption.year':
        try: val = int(val)
        except Exception: return None
        if str(val) not in quote or val < m['change']['year'] or m['status'] == 'in-lab': return None
        old = (m.get('adoption') or {}).get('year')
        if old and abs(val - old) > cfg['maxYearShift']: return None
        m['adoption'] = {'year': val, 'what': (m.get('adoption') or {}).get('what') or 'Reached mainstream use.', 'basis': 'source-cited',
                         'refs': [{'label': (c.get('label') or url)[:200], 'url': url, 'status': 'ok', 'checked': TODAY}]}
        return f"{m['id']}: adoption year {old or 'none'} → {val} (source-cited)"
    if path in ('research.year', 'change.year'):
        try: val = int(val)
        except Exception: return None
        sec = path.split('.')[0]; old = m[sec]['year']
        if str(val) not in quote or abs(val - old) > cfg['maxYearShift'] or val == old: return None
        if sec == 'change' and val < m['research']['year']: return None
        if sec == 'research' and val > m['change']['year']: return None
        if m['status'] == 'landed' and sec == 'change' and val > as_of: return None
        m[sec]['year'] = val; m.setdefault('refs', []).append({'label': (c.get('label') or url)[:200], 'url': url, 'status': 'ok', 'checked': TODAY})
        m['provenance']['verification'] = 'source-cited'
        return f"{m['id']}: {path} {old} → {val}"
    if path in ('research.what', 'change.what', 'note', 'company'):
        if not isinstance(val, str) or not (3 <= len(val) <= 600): return None
        if path == 'company': m['company'] = val[:80]
        elif path == 'note': m['note'] = val
        else: m[path.split('.')[0]]['what'] = val
        return f"{m['id']}: {path} updated"
    if path == 'status' and val == 'landed' and m['status'] == 'outlook':
        yr = next((int(y) for y in __import__('re').findall(r'\b(19\d\d|20\d\d)\b', quote) if int(y) <= as_of), None)
        if not yr or yr < m['research']['year']: return None
        if m.get('forecast'): m['forecast'].update({'actualYear': yr, 'resolvedOn': TODAY})
        m['status'] = 'landed'; m['change']['year'] = yr; m.pop('basis', None)
        if (m.get('readiness') or {}).get('stage') in (None, 'research', 'pilot'): m['readiness'] = {'stage': 'commercial', 'basis': 'ai-estimate'}
        m.setdefault('refs', []).append({'label': (c.get('label') or url)[:200], 'url': url, 'status': 'ok', 'checked': TODAY})
        m['provenance']['verification'] = 'source-cited'
        return f"{m['id']}: confirmed landed in {yr}"
    if path == 'add_ref':
        terms = [w for w in m['title'].split() if len(w) > 4]
        if not evidence_in(text, terms or [m['title']], []): return None
        m.setdefault('refs', []).append({'label': (c.get('label') or url)[:200], 'url': url, 'status': 'ok', 'checked': TODAY})
        if m['status'] == 'landed': m['provenance']['verification'] = 'source-cited'
        return f"{m['id']}: source added"
    return None

if __name__ == '__main__':
    sys.exit(run())
