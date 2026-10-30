"""Rules for the walk-through scripts in data/tours.json, shared by the validator (Gate 1) and the tour agent.

Figures and conclusions come from the live data in the app: templates may only use known {placeholders}, every
conclusion needs a variant, and no figures may be typed into the text (apart from the fixed reference years).
"""
import re, itertools

SPEC = {
  'gap': {
    'steps': ['intro', 'example', 'century', 'trend', 'corrected', 'gapchart', 'fields', 'outlook', 'answer'],
    'placeholders': {'n', 'pre', 'recent', 'adopt', 'kmYears', 'exTitle', 'exWhere', 'exR', 'exP', 'exAdopt', 'fastestName', 'fastestYears', 'aiRankWord', 'nFields', 'ai', 'oth', 'aiOut', 'convOut'},
    'cases': {'trend': {'shrunk', 'grown', 'flat', 'unclear'}, 'corr': {'holds', 'weakens', 'tooEarly', 'unclear'}, 'aiCmp': {'faster', 'slower', 'similar', 'unclear'},
              'outCmp': {'faster', 'slower', 'similar', 'unclear'}, 'score': {'0', '1', '2', '3', '4'}, 'hasAdopt': {'yes', 'no'}, 'exFound': {'yes', 'no'},
              'exHasAdopt': {'yes', 'no'}, 'fastestIsAI': {'ai', 'other', 'none'}},
    'years': {'1970', '2000', '2010'},
    'maxWords': 40, 'examples': True,
    'meanings': {'score': {'0': 'none of the four measures points to yes', '1': 'one of four measures points to yes', '2': 'two of four (half) point to yes',
                           '3': 'three of four point to yes', '4': 'all four point to yes'},
                 'trend': {'shrunk': 'median gap since 2000 is at least two years shorter than before 1970', 'grown': 'at least two years longer', 'flat': 'within two years'},
                 'corr': {'holds': 'counting unfinished work, research since 2010 is still clearly quicker than before 1970', 'weakens': 'counting unfinished work, it is not clearly quicker'}},
  },
  'horizon': {
    'steps': ['intro', 'radar', 'new', 'next', 'changes', 'slide', 'answer'],
    'placeholders': {'nResearch', 'nPilot', 'nCommercial', 'nScale', 'nGB', 'newCount', 'newTitle', 'nextCount', 'nextTitle', 'nextYear', 'busiestArea'},
    'cases': {'newCase': {'some', 'none'}, 'nextCase': {'some', 'none'}, 'horizonCase': {'busy', 'steady', 'quiet'}},
    'years': {'1980'}, 'maxWords': 40,
  },
  'secure': {
    'steps': ['intro', 'lens', 'gaps', 'example', 'guidance', 'caution', 'answer'],
    'placeholders': {'attackPct', 'lag', 'gapCount', 'gapTitle', 'guideTitle'},
    'cases': {'lagCase': {'slow', 'moderate', 'fast', 'unclear'}, 'gapCase': {'some', 'none'}, 'guideCase': {'some', 'none'}, 'trendCase': {'improving', 'worsening', 'flat', 'unclear'}},
    'years': {'2010', '62443'}, 'maxWords': 40,
  },
  'fortune': {
    'steps': ['intro', 'research', 'speed', 'fastest', 'uk', 'uni', 'table', 'answer'],
    'placeholders': {'nFortunes', 'nResearch', 'preYears', 'recentYears', 'fastestCo', 'fastestTime', 'ukYears', 'rowYears', 'nUni'},
    'cases': {'speedCase': {'faster', 'slower', 'similar', 'unclear'}, 'ukCase': {'faster', 'slower', 'similar', 'unclear'}},
    'years': {'1970', '2015'}, 'maxWords': 40,
  },
  'how': {
    'steps': ['intro', 'research', 'qa', 'more', 'quality', 'labels', 'arrange', 'answer'],
    'placeholders': {'nMilestones', 'pctSourceCited', 'fcResolved'},
    'cases': {'fcCase': {'scored', 'none'}},
    'years': set(), 'maxWords': 40,
  }
}

def _paths(tpl, limit=400):
    """Every possible rendering of a template, with placeholders kept as single words."""
    if tpl is None: return ['']
    if isinstance(tpl, str): return [tpl]
    if isinstance(tpl, list):
        out = ['']
        for part in tpl:
            out = [a + b for a, b in itertools.product(out, _paths(part, limit))][:limit]
        return out
    if isinstance(tpl, dict) and 'by' in tpl: return [p for c in tpl.get('cases', {}).values() for p in _paths(c, limit)][:limit]
    return ['']

def _nodes(tpl):
    if isinstance(tpl, list):
        for t in tpl: yield from _nodes(t)
    elif isinstance(tpl, dict):
        yield tpl
        for c in tpl.get('cases', {}).values(): yield from _nodes(c)

def check_step(tour_id, step_id, say):
    sp, errs = SPEC[tour_id], []
    for node in _nodes(say):
        if 'by' not in node or not isinstance(node.get('cases'), dict): errs.append(f'{tour_id}.{step_id}: a variant block needs "by" and "cases"'); continue
        need = sp['cases'].get(node['by'])
        if need is None: errs.append(f"{tour_id}.{step_id}: unknown condition '{node['by']}'"); continue
        missing = need - set(node['cases']) - ({'default'} if 'default' in node['cases'] else set())
        if missing and 'default' not in node['cases']: errs.append(f"{tour_id}.{step_id}: no variant for {node['by']} = {', '.join(sorted(missing))}")
    for text in _paths(say):
        for ph in re.findall(r'\{(\w+)\}', text):
            if ph not in sp['placeholders']: errs.append(f'{tour_id}.{step_id}: unknown placeholder {{{ph}}}')
        literal = re.sub(r'\{\w+\}', ' ', text)
        for num in re.findall(r'\d+(?:\.\d+)?', literal):
            if num not in sp['years']: errs.append(f'{tour_id}.{step_id}: typed figure "{num}" (figures must come from placeholders)')
        if re.search(r'https?:|www\.|<|>', literal): errs.append(f'{tour_id}.{step_id}: links or markup are not allowed')
        if re.search(r'DESNZ|Department for Energy Security', literal): errs.append(f'{tour_id}.{step_id}: say "AI for clean energy" rather than naming DESNZ')
        words = len(re.sub(r'\{\w+\}', 'X', text).split())
        if words > sp['maxWords']: errs.append(f'{tour_id}.{step_id}: {words} words (limit {sp["maxWords"]})')
    return sorted(set(errs))

def check(tours, milestones=None):
    errs = []
    if not isinstance(tours, dict) or not isinstance(tours.get('tours'), dict): return ['tours.json: missing "tours"']
    ms = {m['id']: m for m in (milestones or [])}
    for tid, sp in SPEC.items():
        t = tours['tours'].get(tid)
        if not t: errs.append(f'tours.json: tour "{tid}" is missing'); continue
        steps = t.get('steps', {})
        for sid in sp['steps']:
            if sid not in steps or 'say' not in steps[sid]: errs.append(f'{tid}: step "{sid}" is missing'); continue
            errs += check_step(tid, sid, steps[sid]['say'])
        for sid in steps:
            if sid not in sp['steps']: errs.append(f'{tid}: unknown step "{sid}"')
        if not sp.get('examples'): continue
        ex = t.get('exampleIds', [])
        if not isinstance(ex, list) or not 1 <= len(ex) <= 6: errs.append(f'{tid}: exampleIds needs one to six ids')
        elif ms:
            for e in ex:
                m = ms.get(e)
                if not m: errs.append(f'{tid}: example "{e}" is not in the data')
                elif m['status'] != 'landed' or not (m.get('adoption') or {}).get('year'): errs.append(f'{tid}: example "{e}" needs a first product and an adoption year')
    return errs
