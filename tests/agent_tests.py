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
print(f'PASSED {sum(results)} of {len(results)}')
sys.exit(0 if all(results) else 1)
