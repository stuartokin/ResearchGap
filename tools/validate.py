#!/usr/bin/env python3
"""Validate data/data.json against the schema and the dataset's own rules.
Used as a hard gate: the weekly pipeline publishes nothing unless this passes."""
import json, sys, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def load(p): return json.loads((ROOT / p).read_text(encoding='utf-8'))

def main(path='data/data.json'):
    db = load(path); errors, warnings = [], []
    try:
        import jsonschema
        v = jsonschema.Draft202012Validator(load('data/schema.json'))
        for e in sorted(v.iter_errors(db), key=lambda e: list(e.path))[:50]:
            errors.append(f"schema: {'/'.join(map(str, e.path))}: {e.message}")
    except ImportError:
        warnings.append('jsonschema not installed: structural checks only')
    fields = {f['id'] for f in db['fields']}
    as_of = int(db['meta']['asOf'][:4]); horizon = as_of + db['meta']['horizonYears']
    seen, titles = set(), {}
    for m in db['milestones']:
        mid = m['id']
        if mid in seen: errors.append(f'duplicate id {mid}')
        seen.add(mid)
        t = re.sub(r'\W+', ' ', m['title'].lower()).strip()
        if t in titles: errors.append(f'duplicate title "{m["title"]}" ({mid}, {titles[t]})')
        titles[t] = mid
        if m['field'] not in fields: errors.append(f'{mid}: unknown field {m["field"]}')
        r, p = m['research']['year'], m['change']['year']
        if p < r: errors.append(f'{mid}: change year {p} before research year {r}')
        if r < db['meta']['startYear']: errors.append(f'{mid}: research year {r} before the timeline starts')
        if m['status'] == 'landed' and p > as_of: errors.append(f'{mid}: landed but change year {p} is after {as_of}')
        if m['status'] == 'outlook':
            if p > horizon: errors.append(f'{mid}: outlook year {p} beyond the horizon {horizon}')
            if p <= as_of: warnings.append(f'{mid}: outlook year {p} has passed; QA should confirm or re-estimate')
        ad = m.get('adoption')
        if ad:
            if m['status'] == 'in-lab': errors.append(f'{mid}: in-lab milestone cannot have an adoption year')
            elif ad['year'] < p: errors.append(f"{mid}: adoption {ad['year']} before first product {p}")
            elif ad['year'] > horizon: errors.append(f"{mid}: adoption {ad['year']} beyond the horizon {horizon}")
        subs = {x['id'] for f in db['fields'] if f['id'] == m['field'] for x in f.get('subfields', [])}
        if m.get('subfield') and subs and m['subfield'] not in subs: errors.append(f"{mid}: sub-field {m['subfield']} is not defined for {m['field']}")
        if m.get('tags') and db.get('tagVocabulary') and any(t not in db['tagVocabulary'] for t in m['tags']): errors.append(f'{mid}: tag outside the vocabulary')
        st = (m.get('readiness') or {}).get('stage')
        if st and st not in ('research', 'pilot', 'commercial', 'scale'): errors.append(f'{mid}: unknown readiness stage {st}')
        if m.get('gb') and m['gb'].get('status') not in ('deployed', 'trial', 'planned', 'not-yet', 'unknown'): errors.append(f'{mid}: unknown GB status')
        fc = m.get('forecast')
        if fc and not isinstance(fc.get('estimatedYear'), int): errors.append(f'{mid}: forecast needs an estimated year')
        if m['status'] == 'in-lab' and p <= horizon: warnings.append(f'{mid}: in-lab target {p} falls inside the horizon')
        if m['provenance']['verification'] == 'source-cited' and not any((x.get('url') for x in m.get('refs', []) + ([m['basis']] if m.get('basis') else []))):
            errors.append(f'{mid}: marked source-cited but has no source URL')
    fseen = set()
    for f in db['founders']:
        if f['id'] in fseen: errors.append(f'duplicate founder id {f["id"]}')
        fseen.add(f['id'])
        if f['fortuneYear'] < f['founded']: errors.append(f'{f["id"]}: fortune before founding')
        if f['field'] not in fields: errors.append(f'{f["id"]}: unknown field')
    for w in warnings[:40]: print('WARN ', w)
    OFFICIAL_REF = ('ncsc.gov.uk', 'gov.uk', 'nist.gov', 'nerc.com', 'federalregister.gov', 'iso.org', 'isa.org', 'iec.ch', 'etsi.org', 'unece.org', 'bsigroup.com')
    for gd in db.get('securityGuidance', []):
        for ref in gd.get('refs', []):
            url = ref[2] if len(ref) > 2 else ''
            host = url.split('/')[2].lower() if url.startswith('https://') and len(url.split('/')) > 2 else ''
            if not host or not any(host == o or host.endswith('.' + o) for o in OFFICIAL_REF): errors.append(f"mitigation {gd['id']}: reference '{ref[0]}' must link to an official source (got {url or 'no link'})")
    def _strings(x, path):
        if isinstance(x, dict):
            for k, v in x.items(): yield from _strings(v, f'{path}.{k}')
        elif isinstance(x, list):
            for i, v in enumerate(x): yield from _strings(v, f'{path}[{i}]')
        elif isinstance(x, str): yield path, x
    for path, text in _strings(db, 'data'):   # agent text is shown in the page: no markup, and only web links
        if '<' in text: errors.append(f'{path}: contains markup ("<"), which is not allowed')
        if path.endswith('.url') and text and not re.match(r'https?://', text): errors.append(f'{path}: links must be web addresses')
    tours_path = ROOT / 'data/tours.json'
    if tours_path.exists():   # the walk-through scripts: placeholders, variants, no typed figures, word limits, real examples
        sys.path.insert(0, str(ROOT / 'agents')); import tour_rules
        errors += [f'tours: {e}' for e in tour_rules.check(json.loads(tours_path.read_text(encoding='utf-8')), db['milestones'])]
    for e in errors: print('ERROR', e)   # after every check, so none is counted without being shown
    print(f"{len(db['milestones'])} milestones, {len(db['founders'])} founders: {len(errors)} errors, {len(warnings)} warnings")
    return 1 if errors else 0

if __name__ == '__main__':
    sys.exit(main(*sys.argv[1:]))
