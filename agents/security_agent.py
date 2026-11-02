#!/usr/bin/env python3
"""Weekly security-response agent: for technologies that expand the attack surface, research the FIRST security response
made specifically for each one (a security standard, regulation, official guidance, security product or established practice
built to protect it), with a source. Most recent technologies first, a few dozen a week, so the security lag chart moves from
rough proxies to researched facts.

Guardrails (code, not the model):
  - The source must be a web page that loads, and its text must contain the response's name (or an evidence term) and its year.
  - The year must be plausible: not before the technology's research began, and not in the future.
  - "None found" is recorded as a researched open gap (with the date checked) and checked again after `recheckNoneDays`.
  - Rejected answers are kept in data/rejected.json, shown in the Data inspector, like the other agents' rejections.
"""
import sys, datetime
from common import load_db, save_db, call_claude, fetch_text, log_change, record_rejection, CONFIG, TODAY

SUBMIT = {'name': 'submit_security_response', 'description': 'Submit the first security response made specifically for this technology, or found=false.',
  'input_schema': {'type': 'object', 'required': ['found'], 'properties': {
    'found': {'type': 'boolean', 'description': 'false if no security response specific to this technology exists yet'},
    'title': {'type': 'string', 'description': 'Its name, for example "IEC 62443-3-3" or "Electric Vehicles (Smart Charge Points) Regulations 2021"'},
    'year': {'type': 'integer', 'description': 'The year it was first published or available'},
    'kind': {'type': 'string', 'enum': ['standard', 'regulation', 'guidance', 'product', 'practice']},
    'url': {'type': 'string', 'description': 'A reputable page that names it and gives that year'},
    'evidence_terms': {'type': 'array', 'items': {'type': 'string'}, 'description': '2 to 4 short phrases that appear word for word on that page, such as its name'},
    'note': {'type': 'string', 'description': 'One sentence: what it protects, or why nothing specific exists yet'}}}}
SYSTEM = ('You research the history of cyber security for a public dataset about how fast research becomes real-world change. '
          'For one technology, find the FIRST security response made specifically for it: a security standard, regulation, official guidance, '
          'security product or established practice created to protect that technology or the systems it creates. General security work that merely '
          'came later does not count, and nor does a response for a different technology. Prefer standards bodies, regulators, government security agencies, '
          'and the publisher\'s own pages. If nothing specific exists yet, say found=false: an honest gap is more useful than a weak match.')

def tech_year(m):
    c = m.get('change') or {}
    return c.get('year') if isinstance(c, dict) else None

def research_year(m):
    r = m.get('research') or {}
    return r.get('year') if isinstance(r, dict) else None

def due(m, recheck_days):
    r = (m.get('security') or {}).get('response')
    if not r: return True
    if r.get('none'):
        try: return (datetime.date.fromisoformat(TODAY) - datetime.date.fromisoformat(r.get('checked', ''))).days >= recheck_days
        except ValueError: return True
    return False

def candidates(db, cfg):
    this_year = int(TODAY[:4])
    todo = [m for m in db.get('milestones', []) if not m.get('removed') and m.get('field') != 'cyber'
            and (m.get('security') or {}).get('expandsAttackSurface') and isinstance(tech_year(m), int) and tech_year(m) <= this_year
            and due(m, cfg.get('recheckNoneDays', 182))]
    return sorted(todo, key=lambda m: -tech_year(m))   # most recent first: that is where the gaps matter

def check_answer(m, out):
    """Return (record, None) when the answer stands up, or (None, reason)."""
    title, year, url = str(out.get('title') or '').strip(), out.get('year'), str(out.get('url') or '').strip()
    if not title or not isinstance(year, int): return None, 'no name or year'
    if year > int(TODAY[:4]): return None, f'year {year} is in the future'
    floor = research_year(m) or tech_year(m)
    if isinstance(floor, int) and year < floor: return None, f'year {year} is before the technology\'s research began ({floor})'
    if not url.startswith(('http://', 'https://')): return None, 'no source page'
    code, text = fetch_text(url)
    low = (text or '').lower()
    if not (200 <= code < 400) or not low: return None, 'the source page did not load'
    terms = [t for t in (out.get('evidence_terms') or []) + [title] if t and len(str(t)) >= 3]
    if not any(str(t).lower() in low for t in terms): return None, 'the page did not name it'
    if str(year) not in low: return None, f'the page did not give the year {year}'
    return {'title': title[:140], 'year': year, 'kind': out.get('kind') or '', 'url': url, 'note': str(out.get('note') or '')[:300],
            'basis': 'researched', 'checked': TODAY}, None

def run():
    db = load_db(); cfg = CONFIG.get('security', {})
    todo = candidates(db, cfg)[:cfg.get('perRun', 20)]
    found, none, report = [], [], []
    for m in todo:
        prompt = (f"Technology: {m.get('title')}. First real-world use: {tech_year(m)}. Research began: {research_year(m) or 'unknown'}. "
                  f"Why it expands the attack surface: {(m.get('security') or {}).get('note', '')}\n"
                  "Find the first security response made specifically for it, with a page that names it and gives its year, and submit it.")
        out = call_claude(SYSTEM, prompt, SUBMIT, max_searches=cfg.get('searches', 4))
        if not out: report.append(f"no answer: {m.get('title')}"); continue
        if not out.get('found'):
            m['security']['response'] = {'none': True, 'checked': TODAY, 'note': str(out.get('note') or '')[:300]}
            none.append(m.get('title')); report.append(f"none found (an open gap): {m.get('title')}"); continue
        rec, why = check_answer(m, out)
        if not rec:
            record_rejection('security', 'security', {'title': f"{m.get('title')}: {out.get('title')}"}, why)
            report.append(f"rejected for {m.get('title')}: {out.get('title')} ({why})"); continue
        m['security']['response'] = rec; found.append(f"{m.get('title')}: {rec['title']} ({rec['year']})")
        report.append(f"researched: {m.get('title')} -> {rec['title']} ({rec['year']})")
    if found or none:
        msg = f"security responses researched: {len(found)} found, {len(none)} open gap{'s' if len(none) != 1 else ''}"
        details = [f'security: {x}' for x in found] + [f'security gap: {x}' for x in none]
        log = db['meta'].setdefault('changelog', [])
        if log and log[-1].get('date') == TODAY:
            log[-1].setdefault('details', []).extend(details); log[-1]['summary'] = log[-1]['summary'].rstrip('.') + f', {msg}.'
        else: log_change(db, msg[0].upper() + msg[1:] + '.', details)
        save_db(db)
    print('\n'.join(report) or 'No technologies due for security research.')
    print(f'{len(found)} security responses researched, {len(none)} open gaps recorded, {len(todo) - len(found) - len(none)} not settled this week.')

if __name__ == '__main__':
    sys.exit(run())
