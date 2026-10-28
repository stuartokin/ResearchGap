#!/usr/bin/env python3
"""Weekly guidance agent: finds new or updated security guidance and frameworks that mitigate the risks the model highlights.

Priority: the NCSC Cyber Assessment Framework and Ofgem's CAF Overlay and profiles; then NIST, NERC CIP, IEC 62443, ISO/IEC,
ETSI, ENISA, CISA, DESNZ and other regulators worldwide.

Guardrails (code, not the model):
  - Each update must link to an official source (regulator, government or standards body), fetched by this code,
    whose text mentions the framework.
  - No duplicates of existing updates (same address or near-identical title).
  - At most `maxUpdatesPerRun` updates per run. Updates are summaries with links, not changes to milestones.
"""
import sys, json, difflib
from common import load_db, save_db, call_claude, fetch_text, log_change, CONFIG, TODAY

OFFICIAL = ('ncsc.gov.uk', 'ofgem.gov.uk', 'gov.uk', 'nist.gov', 'nerc.com', 'ferc.gov', 'iec.ch', 'isa.org', 'iso.org', 'etsi.org', 'enisa.europa.eu',
            'europa.eu', 'cisa.gov', 'federalregister.gov', 'unece.org', 'legislation.gov.uk', 'energy.gov', 'cyber.gov.au', 'cyber.gc.ca', 'bsigroup.com', 'bsi.bund.de', 'ssi.gouv.fr', 'neso.energy', 'owasp.org')
SUBMIT = {'name': 'submit_guidance', 'description': 'Submit new or updated security guidance found.', 'input_schema': {'type': 'object', 'required': ['updates'], 'properties': {'updates': {'type': 'array', 'maxItems': 8, 'items': {
  'type': 'object', 'required': ['framework', 'title', 'date', 'summary', 'url', 'evidence_terms'],
  'properties': {'framework': {'type': 'string', 'description': 'For example NCSC CAF, Ofgem, NIST, NERC CIP, IEC 62443, ISO/IEC, ETSI'},
    'title': {'type': 'string'}, 'date': {'type': 'string', 'description': 'Publication date, YYYY-MM-DD or YYYY-MM'},
    'summary': {'type': 'string', 'description': 'Two sentences, paraphrased: what changed and which risks it helps mitigate'},
    'url': {'type': 'string', 'description': 'The official page or document'},
    'evidence_terms': {'type': 'array', 'items': {'type': 'string'}, 'description': 'Distinctive words that appear on that page, such as the framework or document name'}}}}}}}

def run():
    db = load_db(); cfg = CONFIG.get('guidance', {}); have = db.setdefault('guidanceUpdates', [])
    known_urls = {u.get('url') for u in have}; known_titles = [u['title'].lower() for u in have]
    prompt = (f"Today is {TODAY}. Find security guidance, standards or regulatory frameworks published or updated in roughly the last {cfg.get('lookbackDays', 45)} days "
              "that help mitigate cyber risks from new technology in critical infrastructure, especially energy: operational technology, grid-edge devices, AI systems and agents, "
              "cloud and software supply chains, post-quantum cryptography, communications and timing. Priority: the NCSC Cyber Assessment Framework (CAF) and Ofgem's CAF Overlay "
              "and CAF profiles for the energy sector; then NIST, NERC CIP, IEC 62443, ISO/IEC, ETSI, ENISA, CISA, DESNZ and other regulators worldwide. "
              f"Ignore these, already recorded: {json.dumps([u['title'] for u in have][-40:])}. Use official sources only. Return them via submit_guidance, or an empty list.")
    out = call_claude('You track cyber security guidance and regulation for critical infrastructure.', prompt, SUBMIT, max_searches=cfg.get('searches', 8)) or {'updates': []}
    added, report = [], []
    for u in out.get('updates', []):
        if len(added) >= cfg.get('maxUpdatesPerRun', 5): break
        url = (u.get('url') or '').strip(); host = url.split('/')[2].lower() if url.startswith('http') and len(url.split('/')) > 2 else ''
        if not host or not any(host == o or host.endswith('.' + o) for o in OFFICIAL): report.append(f"rejected {u.get('title')}: not an official source"); continue
        if url in known_urls or any(difflib.SequenceMatcher(None, u['title'].lower(), t).ratio() > .85 for t in known_titles): report.append(f"skipped {u['title']}: already recorded"); continue
        code, text = fetch_text(url)
        terms = [t for t in (u.get('evidence_terms') or []) + [u['framework']] if t]
        if not (200 <= code < 400) or not any(t.lower() in text.lower() for t in terms): report.append(f"rejected {u['title']}: page did not confirm it"); continue
        rec = {'date': (u.get('date') or '')[:10], 'framework': u['framework'][:60], 'title': u['title'][:160], 'summary': u['summary'][:400], 'url': url, 'added': TODAY, 'by': 'guidance-agent'}
        have.append(rec); known_urls.add(url); known_titles.append(rec['title'].lower()); added.append(rec['title'])
    db['guidanceUpdates'] = have[-80:]
    if added:
        log = db['meta'].setdefault('changelog', [])
        if log and log[-1].get('date') == TODAY:
            log[-1].setdefault('details', []).extend(f'guidance: {t}' for t in added)
            log[-1]['summary'] = log[-1]['summary'].rstrip('.') + f', {len(added)} guidance update{"s" if len(added) > 1 else ""}.'
        else: log_change(db, f"{len(added)} guidance update{'s' if len(added) > 1 else ''}.", [f'guidance: {t}' for t in added])
    save_db(db)
    print('\n'.join(report) or 'No guidance candidates.'); print(f'{len(added)} guidance updates recorded.')

if __name__ == '__main__':
    sys.exit(run())
