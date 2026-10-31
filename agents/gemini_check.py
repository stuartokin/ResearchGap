#!/usr/bin/env python3
"""Gemini second opinion: after Claude's QA agent publishes this week's additions, Gemini reads the relevant parts of
the cited source pages and checks the ESSENTIALS of each one Claude found: that it happened, and that the research and
first-use years are right to within a year. Only a contradiction marks a record disputed (never deleted); a page too
thin to judge gives "unclear", which is recorded but does not dispute. Gemini's own finds were confirmed by Claude's QA.
"""
import sys, re
from common import load_db, save_db, call_gemini, fetch_text, log_change, CONFIG, TODAY

RULES = 2   # version of these rules: records checked under older, stricter rules are checked once more

def excerpt(text, m, size=7000):
    """The parts of a page around the milestone's key words and years, rather than the menus at the top."""
    keys = [w for w in re.findall(r'[A-Za-z0-9]{4,}', m['title'])][:6] + [str(m['research']['year']), str(m['change']['year'])]
    hits = sorted({x.start() for k in keys for x in re.finditer(re.escape(k), text, re.I)})
    if not hits: return text[:size]
    parts, used = [], 0
    for h in hits:
        a, b = max(0, h - 600), h + 900
        if parts and a <= parts[-1][1]: parts[-1][1] = b
        else: parts.append([a, b])
    out = ' … '.join(text[a:b] for a, b in parts)
    return out[:size]

def run():
    g = CONFIG.get('gemini', {})
    if not g.get('enabled', True) or not g.get('secondOpinion', True): print('Gemini second opinion disabled.'); return 0
    db = load_db()
    def due(m):
        p = m.get('provenance') or {}; so = p.get('secondOpinion')
        if p.get('addedBy') != 'research-agent': return False
        if p.get('added') == TODAY and not so: return True
        return bool(so) and so.get('model') == 'gemini' and so.get('verdict') in ('not_supported', 'unclear') and so.get('rules', 1) < RULES   # judged under the old rules
    todo = [m for m in db['milestones'] if due(m)]
    if not todo: print('No Claude additions to check.'); return 0
    counts, details = {'supported': 0, 'contradicted': 0, 'unclear': 0, 'unavailable': 0}, []
    for m in todo[:g.get('checksPerRun', 20)]:
        pages = []
        for r in (m.get('refs') or [])[:3]:
            code, text = fetch_text(r['url'])
            if code == 200 and text: pages.append(f"SOURCE {r['url']}:\n{excerpt(text, m)}")
        claim = (f"MILESTONE: {m['title']}. Research began around {m['research']['year']}; "
                 f"{'first product or real-world use' if m['status'] == 'landed' else 'expected'} around {m['change']['year']}.")
        out = call_gemini("You are checking the essentials of a dataset record against its sources, for a public dataset. Use only the source text given.\n"
                          f"{claim}\n\n" + '\n\n'.join(pages) +
                          "\n\nCheck only: (1) did this milestone happen as described in its title, and (2) are the two years right to within one year? Ignore any other details. "
                          "Answer \"supported\" if the sources confirm both, \"contradicted\" only if the sources clearly state something different, and \"unclear\" if the text is too thin to judge. "
                          "Reply with JSON only: {\"verdict\": \"supported\" | \"contradicted\" | \"unclear\", \"reason\": \"one sentence\"}", want='verdict') if pages else None
        v = (out or {}).get('verdict') if isinstance(out, dict) else None
        verdict = v if v in ('supported', 'contradicted', 'unclear') else 'unavailable'
        counts[verdict] += 1
        prev = (m['provenance'].get('secondOpinion') or {}).get('verdict')
        m['provenance']['secondOpinion'] = {'model':'gemini', 'verdict':verdict, 'reason':str((out or {}).get('reason', ''))[:300], 'date':TODAY, 'rules':RULES}
        flags = m.setdefault('flags', {})
        if verdict == 'contradicted':
            flags['disputed'] = True
            m['provenance']['qaNote'] = f"Second opinion (Gemini): contradicted. {m['provenance']['secondOpinion']['reason']}"[:300]
            details.append(f"disputed: {m['id']} (second opinion from Gemini: contradicted. {m['provenance']['secondOpinion']['reason']})"[:300])
        elif prev in ('not_supported', 'unclear') and flags.get('disputed') and 'Second opinion (Gemini)' in (m['provenance'].get('qaNote') or ''):
            flags.pop('disputed', None); m['provenance'].pop('qaNote', None)   # disputed under the old, stricter rules: lifted
            details.append(f"{m['id']}: dispute lifted on re-check (Gemini: {verdict})")
    db['meta'].setdefault('secondOpinion', []).append({'date':TODAY, 'kind':'gemini-check', 'supported':counts['supported'], 'not_supported':counts['contradicted'], 'unclear':counts['unclear'], 'unavailable':counts['unavailable']})
    log_change(db, f"Gemini second opinion on {len(todo)} additions: {counts['supported']} supported, {counts['contradicted']} contradicted (disputed), {counts['unclear']} unclear.", details)
    save_db(db); print(counts); return 0

if __name__ == '__main__':
    try: sys.exit(run())
    except Exception as e: print(f'Gemini second opinion could not run ({type(e).__name__}: {e}).'); sys.exit(0)
