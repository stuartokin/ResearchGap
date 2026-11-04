import os
#!/usr/bin/env python3
"""The agents' guardrails, tested offline with simulated answers: no API calls, no cost. Each prints PASS or FAIL."""
import json, sys, copy
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'agents'))
results = []
def ok(name, cond): results.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + name)

import common, research_agent as ra, tour_rules, gemini_check
db = common.load_db()

# years: exact, approximate and too vague
ok('Y1 exact years stay exact', ra.read_year(1934) == (1934, False) and ra.read_year('1934') == (1934, False))
ok('Y2 approximate years are read and marked', ra.read_year('c. 1934') == (1934, True) and ra.read_year('1934–35') == (1934, True) and ra.read_year('mid-1930s') == (1935, True))
ok('Y3 a bare decade or words are rejected', ra.read_year('1930s') == (None, False) and ra.read_year('nineteen thirty') == (None, False))
# candidates in any shape
one = {'title': 'T', 'field': 'ai'}
ok('C1 a proper list', len(ra.candidates_of({'candidates': [one, one]}, 9)) == 2)
ok('C2 the list written as text', len(ra.candidates_of({'candidates': json.dumps([one, one])}, 9)) == 2)
ok('C3 junk and nothing are ignored', len(ra.candidates_of({'candidates': [one, 'x', 4, None]}, 9)) == 1 and ra.candidates_of(None, 9) == [])
ok('C4 a malformed candidate is rejected, not fatal', isinstance(ra.safe_check(db, 'ai', {'research_year': 'x'}, 2026, 2036, 2), str))
# duplicates, on a small synthetic dataset so the test does not depend on live data
syn = {'milestones': [{'id': 't', 'title': 'Transistor', 'research': {'year': 1947}, 'change': {'year': 1954}}, {'id': 'ct', 'title': 'CT scanning', 'research': {'year': 1967}, 'change': {'year': 1972}},
                      {'id': 'g', 'title': 'First 6G networks', 'research': {'year': 2025}, 'change': {'year': 2030}}]}
ra.load_pending = lambda: []
ok('U1 one title inside another, close years: duplicate', ra.near_duplicate(syn, 'Point-contact transistor', {'research_year': 1939, 'change_year': 1947}) == 'Transistor')
ok('U2 the same words, distant years: not a duplicate', ra.near_duplicate(syn, 'FinFET transistor', {'research_year': 2008, 'change_year': 2011}) is None)
ok('U3 acronyms count (CT is not just "scanning")', ra.near_duplicate(syn, 'MRI scanning', {'research_year': 1971, 'change_year': 1980}) is None)
ok('U4 generic words alone do not match', ra.near_duplicate(syn, 'AI-native radio networks', {'research_year': 2024, 'change_year': 2030}) is None)
# the narration rules hold for the current scripts
errs = tour_rules.check(json.loads((ROOT / 'data/tours.json').read_text()), db['milestones'])
ok('T1 every walk-through and insight passes the tour rules', not errs) or print('   ', errs[:3])
ok('T2 a typed figure is caught', bool(tour_rules.check_step('gap', 'intro', 'It took 7 years.')))
ok('T3 a doubled word is caught', bool(tour_rules.check_step('gap', 'intro', 'It took the the longest.')))
# the second opinion reads the substance of a page, not its menus
m = {'title': 'Radio astronomy (Jansky)', 'research': {'year': 1931}, 'change': {'year': 1933}}
page = 'Menu ' * 2000 + ' Karl Jansky detected radio waves in 1932 and published in 1933. ' + 'Footer ' * 500
ok('S1 the page excerpt finds the milestone', 'Karl Jansky' in gemini_check.excerpt(page, m))
# curation: retire once, never twice, and no empty values
cdb = {'meta': {}, 'milestones': [{'id': 'a', 'title': 'A'}]}
import tempfile, os
tmp = Path(tempfile.mkdtemp()); (tmp / 'data').mkdir(); (tmp / 'agents').mkdir()
(tmp / 'data/curation.json').write_text(json.dumps({'decisions': [{'id': 'a', 'action': 'retire', 'reason': 'test', 'date': '2026-11-01'}]}))
real = common.__file__; common.__file__ = str(tmp / 'agents/common.py')
try:
    d1 = common.apply_curation(cdb); d2 = common.apply_curation(cdb)
    ok('R1 a retire decision hides the record with its reason', cdb['milestones'][0]['flags']['hidden'] and cdb['milestones'][0]['flags']['retired']['reason'] == 'test')
    ok('R2 a decision is applied only once', len(d1) == 1 and d2 == [])
    ok('R3 no empty values are written', None not in cdb['milestones'][0]['flags']['retired'].values())
finally: common.__file__ = real
# the owner's review decisions
cdb2 = {'meta': {}, 'milestones': [{'id': 'a', 'title': 'A', 'flags': {'disputed': True}}, {'id': 'b', 'title': 'B'}, {'id': 'c', 'title': 'C'}]}
(tmp / 'data/curation.json').write_text(json.dumps({'decisions': [
    {'id': 'a', 'action': 'clear-dispute', 'note': 'checked', 'sig': 'x1', 'date': '2026-11-02'},
    {'id': 'b', 'action': 'reviewed', 'note': 'fine', 'sig': 'x2', 'date': '2026-11-02'},
    {'id': 'b', 'other': 'c', 'action': 'not-duplicate', 'note': 'different', 'date': '2026-11-02'}]}))
common.__file__ = str(tmp / 'agents/common.py')
try:
    d1 = common.apply_curation(cdb2); d2 = common.apply_curation(cdb2)
    a, b_ = cdb2['milestones'][0], cdb2['milestones'][1]
    ok('R4 "clear the dispute" lifts it and records the review', 'disputed' not in a['flags'] and a['flags']['reviewed']['cleared'] is True and a['flags']['reviewed']['sig'] == 'x1')
    ok('R5 "reviewed" records it without changing the record', b_['flags']['reviewed']['note'] == 'fine' and b_['title'] == 'B')
    ok('R6 "not a duplicate" is kept for the pair', cdb2['meta']['notDuplicates'][0]['a'] == 'b' and cdb2['meta']['notDuplicates'][0]['b'] == 'c')
    ok('R7 each decision applies once', len(d1) == 3 and d2 == [])
finally: common.__file__ = real
# Gemini sometimes names a field instead of giving its id
import gemini_research
FIELDS = {f['id']: f for f in db['fields']}
ok('G1 field ids and names are both accepted', gemini_research.resolve_field('hw', FIELDS) == 'hw' and gemini_research.resolve_field('Computing hardware', FIELDS) == 'hw')
ok('G2 common variants are understood', gemini_research.resolve_field('telecommunications', FIELDS) == 'comms' and gemini_research.resolve_field('Medicine', FIELDS) == 'life')
ok('G3 nonsense is still rejected', gemini_research.resolve_field('nonsense', FIELDS) is None)
# levers and stories: one request for a shorter answer instead of a rejection
import levers_agent, story_agent
page = 'The plant is waiting for a grid connection offer and uses machine learning to plan connections. Research began at the university in 2015.'
levers_agent.fetch_text = story_agent.fetch_text = lambda url, timeout=20: (200, page)
long_answer = {'phase': 'Demonstration', 'bottleneck': ' '.join(['word'] * 40), 'levers': [{'k': 'deploy', 'strength': 'high', 'note': 'Machine learning plans connections.'}],
               'sources': [{'url': 'https://example.org/a', 'label': 'A', 'quote': 'waiting for a grid connection offer'}]}
short_answer = dict(long_answer, bottleneck='Waiting for a grid connection offer.')
answers = iter([long_answer, short_answer]); levers_agent.call_claude = lambda *a, **k: next(answers)
out = levers_agent.tidy_phase(levers_agent.research({'title': 'T', 'field': 'energy', 'change': {'year': 2030}, 'research': {}, 'readiness': {}})); rec, why = levers_agent.verify(out)
if not rec and 'invalid' in why: out = levers_agent.tidy_phase(levers_agent.shorten(out)); rec, why = levers_agent.verify(out)
ok('L1 an over-long lever answer is shortened on one retry, then recorded', bool(rec) and rec['phase'] == 'demo')
st_long = {'research': 'university research', 'deploy': 'in 2020 at a plant', 'impact': ' '.join(['word'] * 50), 'sources': [{'url': 'https://example.org/b', 'label': 'B', 'quote': 'Research began at the university in 2015'}]}
answers = iter([st_long, dict(st_long, impact='connections are planned faster')]); story_agent.call_claude = lambda *a, **k: next(answers)
out = story_agent.research({'title': 'T', 'field': 'energy', 'research': {'year': 2015}, 'change': {'year': 2020}}); rec, why = story_agent.verify(out)
if not rec and 'too long' in why: out = story_agent.shorten(out); rec, why = story_agent.verify(out)
ok('S1 an over-long story is shortened on one retry, then recorded', bool(rec) and rec['impact'] == 'connections are planned faster')
# Gemini: an answer cut off at the length limit keeps its complete candidates; the reasoning budget is sent
import common as _c
cut = '{"candidates": [{"title": "A", "x": {"y": [1]}}, {"title": "B"}, {"title": "C, cut off mid-wo'
ok('M1 a cut-off answer keeps the complete candidates', [x['title'] for x in (_c.salvage_items(cut, 'candidates') or {}).get('candidates', [])] == ['A', 'B'])
_sent = {}
class _R:
    status_code = 200
    def __init__(self, d): self._d = d
    def json(self): return self._d
_orig_post, _orig_key = _c._gemini_post, os.environ.get('GEMINI_API_KEY')
_c._gemini_post = lambda key, model, body: (_sent.update(body=body), _R({'candidates': [{'content': {'parts': [{'text': cut}]}, 'finishReason': 'MAX_TOKENS'}]}))[1]
os.environ['GEMINI_API_KEY'] = 'test'
_out = _c.call_gemini('p', want='candidates', thinking_budget=4096)
ok('M2 call_gemini returns them, with the reasoning budget sent', len((_out or {}).get('candidates', [])) == 2 and _sent['body']['generationConfig'].get('thinkingConfig') == {'thinkingBudget': 4096})
_c._gemini_post = _orig_post
if _orig_key is None: os.environ.pop('GEMINI_API_KEY', None)
else: os.environ['GEMINI_API_KEY'] = _orig_key
# the guidance agent remembers what it could not confirm (in memory here: the real data files are never touched)
import guidance_agent as _g
_mem = []
_g.record_rejection = lambda agent, mode, c, why: _mem.append({'agent': agent, 'title': c.get('title'), 'date': _g.TODAY, 'reason': why})
_g.recent_rejections = lambda days=56: list(_mem)
_g.load_db = lambda: {'guidanceUpdates': [], 'meta': {'changelog': []}}; _g.save_db = lambda db: None; _g.log_change = lambda *a, **k: None
_g.fetch_text = lambda url, timeout=20: (200, 'a page that does not mention it')
_ans = {'updates': [{'title': 'CISA 2030: Defend, Harden, Prevail', 'framework': 'CISA', 'url': 'https://www.cisa.gov/x', 'summary': 's', 'date': '2026-10-01', 'evidence_terms': ['Defend, Harden']}]}
_prompts = []
_g.call_claude = lambda system, prompt, tool, **k: (_prompts.append(prompt), _ans)[1]
import io as _io, contextlib as _cl
_b = _io.StringIO()
with _cl.redirect_stdout(_b): _g.run()
ok('N1 guidance that cannot be confirmed is recorded', len(_mem) == 1 and 'page did not confirm it' in _b.getvalue())
_b = _io.StringIO()
with _cl.redirect_stdout(_b): _g.run()
ok('N2 the next week it is skipped, and named in the instructions', 'rejected in the last eight weeks' in _b.getvalue() and 'CISA 2030' in _prompts[-1] and len(_mem) == 1)
# the security-response agent: researched responses must stand up on their own page; "none found" is an open gap (all in memory)
import security_agent as _s
_db = {'meta': {'changelog': []}, 'milestones': [
  {'id': 'a', 'title': 'Grid-edge AI controllers', 'field': 'energy', 'change': {'year': 2024}, 'research': {'year': 2018}, 'security': {'expandsAttackSurface': True, 'note': 'n'}},
  {'id': 'b', 'title': 'EV smart charge points', 'field': 'energy', 'change': {'year': 2019}, 'research': {'year': 2012}, 'security': {'expandsAttackSurface': True, 'note': 'n'}},
  {'id': 'c', 'title': 'Old technology', 'field': 'energy', 'change': {'year': 1960}, 'research': {'year': 1950}, 'security': {'expandsAttackSurface': True, 'note': 'n'}},
  {'id': 'd', 'title': 'Already researched', 'field': 'energy', 'change': {'year': 2023}, 'security': {'expandsAttackSurface': True, 'response': {'title': 'X', 'year': 2024}}}]}
_s.load_db = lambda: _db; _s.save_db = lambda db: None; _s.log_change = lambda *a, **k: None
_rej = []; _s.record_rejection = lambda agent, mode, c, why: _rej.append(why)
_ans = {'Grid-edge AI controllers': {'found': False, 'note': 'nothing specific yet'},
        'EV smart charge points': {'found': True, 'title': 'Electric Vehicles (Smart Charge Points) Regulations 2021', 'year': 2021, 'kind': 'regulation', 'url': 'https://www.legislation.gov.uk/uksi/2021/1467', 'evidence_terms': ['Smart Charge Points']},
        'Old technology': {'found': True, 'title': 'Something', 'year': 1940, 'url': 'https://example.org/x', 'evidence_terms': ['Something']}}
_order = []
_s.call_claude = lambda system, prompt, tool, **k: (_order.append(prompt.split('.')[0].replace('Technology: ', '')), _ans[prompt.split('.')[0].replace('Technology: ', '')])[1]
_s.fetch_text = lambda url, timeout=20: (200, 'The Electric Vehicles (Smart Charge Points) Regulations 2021 set security requirements.')
import io as _io2, contextlib as _cl2
with _cl2.redirect_stdout(_io2.StringIO()): _s.run()
_m = {m['id']: m for m in _db['milestones']}
ok('O1 a response the page confirms is recorded, with its source', (_m['b']['security'].get('response') or {}).get('year') == 2021 and _m['b']['security']['response'].get('basis') == 'researched')
ok('O2 none found is recorded as a researched open gap', (_m['a']['security'].get('response') or {}).get('none') is True)
ok('O3 a year before the research began is rejected', 'response' not in _m['c']['security'] and any('before' in w for w in _rej))
ok('O4 most recent first, and researched ones are skipped', _order == ['Grid-edge AI controllers', 'EV smart charge points', 'Old technology'])
_s.fetch_text = lambda url, timeout=20: (200, 'The Electric Vehicles (Smart Charge Points) Regulations set security requirements.')
_rec, _why = _s.check_answer(_m['b'], _ans['EV smart charge points'])
ok('O5 a page that does not give the year is rejected', _rec is None and 'year' in (_why or ''))
# the narration review: a valid rewrite is applied; one that breaks the rules twice goes back to last week's wording (all in memory)
import narration_review as _n
_good = "Of {pipeTotal} clean energy technologies, {pipeScale} are at scale and {pipeGB} are already used in Great Britain."
_tours = {'version': 1, 'tours': {'cleanweek': {'steps': {'c1': {'say': 'Fine as it is: {aiMed} years.'}, 'c2': {'say': 'An item moved this week.'}, 'c3': {'say': 'Something vague.'}, 'c5': {'say': 'Shows {wi2030Now}.'}}}}}
_old = {'version': 0, 'tours': {'cleanweek': {'steps': {'c3': {'say': 'Last week, {pipeTotal} technologies were tracked.'}}}}}
_rep = [{'tour': 'cleanweek', 'step': 'c1', 'narration': 'Fine as it is: 3 years.', 'notOnScreen': [], 'shot': 'none.jpg'},
        {'tour': 'cleanweek', 'step': 'c2', 'narration': 'An item moved this week.', 'notOnScreen': [], 'shot': 'none.jpg'},
        {'tour': 'cleanweek', 'step': 'c3', 'narration': 'Something vague.', 'notOnScreen': [], 'shot': 'none.jpg'},
        {'tour': 'cleanweek', 'step': 'c5', 'narration': 'Shows 68.', 'notOnScreen': ['68'], 'shot': 'none.jpg'}]
_saved = []
_n.load_report = lambda: _rep; _n.load_tours = lambda: _tours; _n.approved_tours = lambda: _old; _n.save_tours = lambda t: _saved.append(1)
_n.load_db = lambda: {'meta': {'changelog': [{'summary': 'Data revision 35.', 'details': []}]}, 'milestones': [{'title': 'X'}]}
_asked = []
def _ask(content):
    t = content[-1]['text']; _asked.append(t)
    if 'Step: c1.' in t: return {'verdict': 'ok', 'problems': []}
    if 'Step: c2.' in t: return {'verdict': 'rewrite', 'problems': ['vague'], 'say': _good}
    if 'Step: c5.' in t and 'NOT found on screen' in t: return {'verdict': 'ok', 'problems': []}
    return {'verdict': 'rewrite', 'problems': ['vague'], 'say': 'There are 59 technologies.'}   # a typed figure: breaks the rules
_n.ask = _ask
_nn = _n.NARR
import tempfile as _tf, pathlib as _pl; _n.NARR = _pl.Path(_tf.mkdtemp())
with _cl2.redirect_stdout(_io2.StringIO()): _n.run()
_n.NARR = _nn
_st = _tours['tours']['cleanweek']['steps']
ok('P1 a step found fine is left alone', _st['c1']['say'] == 'Fine as it is: {aiMed} years.')
ok('P2 a valid rewrite is applied', _st['c2']['say'] == _good)
ok('P3 a rewrite that breaks the rules twice goes back to last week\'s wording', _st['c3']['say'] == 'Last week, {pipeTotal} technologies were tracked.' and sum('Step: c3.' in t for t in _asked) == 1)
ok('P4 a figure not on screen is not let through as fine', _st['c5']['say'] == 'Shows {wi2030Now}.' and any('NOT found on screen by the code check: 68' in t for t in _asked) and any('could not find these spoken figures on screen: 68' in t for t in _asked))
print(f'PASSED {sum(results)} of {len(results)}')
sys.exit(0 if all(results) else 1)
