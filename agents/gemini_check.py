#!/usr/bin/env python3
"""Gemini second opinion: after Claude's QA agent publishes this week's additions, Gemini reads the cited
source pages and judges whether they support each one Claude found. Anything it does not judge "supported"
is marked disputed (never deleted), with both opinions recorded. Gemini's own finds were already confirmed
by Claude's QA, so every addition has been agreed by both models.
"""
import sys
from common import load_db, save_db, call_gemini, fetch_text, log_change, CONFIG, TODAY

def run():
    g = CONFIG.get('gemini', {})
    if not g.get('enabled', True) or not g.get('secondOpinion', True): print('Gemini second opinion disabled.'); return 0
    db = load_db()
    todo = [m for m in db['milestones'] if (m.get('provenance') or {}).get('added') == TODAY and (m.get('provenance') or {}).get('addedBy') == 'research-agent' and not (m.get('provenance') or {}).get('secondOpinion')]
    if not todo: print('No new Claude additions to check.'); return 0
    counts, details = {'supported': 0, 'not_supported': 0, 'unclear': 0, 'unavailable': 0}, []
    for m in todo[:g.get('checksPerRun', 20)]:
        pages = []
        for r in (m.get('refs') or [])[:3]:
            code, text = fetch_text(r['url'])
            if code == 200 and text: pages.append(f"SOURCE {r['url']}:\n{text[:6000]}")
        claim = (f"{m['title']}: research began in {m['research']['year']} ({m['research'].get('what', '')}); "
                 f"{'first product or real-world use' if m['status'] == 'landed' else 'expected'} in {m['change']['year']} ({m['change'].get('what', '')}).")
        out = call_gemini("You are checking a claim against its sources, for a public dataset. Use only the source text given, not other knowledge.\n"
                          f"CLAIM: {claim}\n\n" + '\n\n'.join(pages) +
                          "\n\nDo these sources support the claim, including its years? Reply with JSON only: {\"verdict\": \"supported\" | \"not_supported\" | \"unclear\", \"reason\": \"one sentence\"}") if pages else None
        v = (out or {}).get('verdict') if isinstance(out, dict) else None
        verdict = v if v in ('supported', 'not_supported', 'unclear') else 'unavailable'
        counts[verdict] += 1
        m['provenance']['secondOpinion'] = {'model':'gemini', 'verdict':verdict, 'reason':str((out or {}).get('reason', ''))[:300], 'date':TODAY}
        if verdict in ('not_supported', 'unclear'):   # both models must agree to publish undisputed
            m.setdefault('flags', {})['disputed'] = True
            m['provenance']['qaNote'] = f"Second opinion (Gemini): {verdict.replace('_', ' ')}. {m['provenance']['secondOpinion']['reason']}"[:300]
            details.append(f"disputed: {m['id']} (second opinion from Gemini: {verdict.replace('_', ' ')}. {m['provenance']['secondOpinion']['reason']})"[:300])
    db['meta'].setdefault('secondOpinion', []).append({'date':TODAY, 'kind':'gemini-check', **counts})
    log_change(db, f"Gemini second opinion on {len(todo)} new additions: {counts['supported']} supported, {counts['not_supported'] + counts['unclear']} disputed.", details)
    save_db(db); print(counts); return 0

if __name__ == '__main__':
    try: sys.exit(run())
    except Exception as e: print(f'Gemini second opinion could not run ({type(e).__name__}: {e}).'); sys.exit(0)
