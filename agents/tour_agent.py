#!/usr/bin/env python3
"""Weekly tour agent: keeps the walk-through scripts in data/tours.json fresh and accurate.

It may (1) choose the worked examples from the current data and (2) refine wording, step by step.
It cannot change figures or conclusions: those are filled in and chosen by the app from the live data.
Every change is checked against agents/tour_rules.py; a step that fails keeps last week's wording.
"""
import sys, json, copy, re
from pathlib import Path
from common import load_db, call_claude, log_change, CONFIG, TODAY
import tour_rules

TOURS = Path(__file__).resolve().parents[1] / 'data' / 'tours.json'
TOOL = {'name': 'submit_tour_update', 'description': 'Submit the chosen examples and any improved step wording.', 'input_schema': {'type': 'object', 'required': ['exampleIds', 'steps', 'reason'], 'properties': {
  'exampleIds': {'type': 'array', 'minItems': 0, 'maxItems': 4, 'items': {'type': 'string'}, 'description': 'Ids from the candidate list, best first'},
  'steps': {'type': 'object', 'description': 'Only the steps whose wording you are improving: {stepId: {"say": template}}. Leave out steps that should stay as they are.'},
  'reason': {'type': 'string'}}}}

def candidates(db):
    as_of = int(db['meta']['asOf'][:4]); out = []
    for m in db['milestones']:
        if (m.get('flags') or {}).get('hidden') or m['status'] != 'landed': continue
        ad = (m.get('adoption') or {}).get('year')
        if not ad or ad > as_of: continue
        out.append({'id': m['id'], 'title': m['title'], 'research': m['research']['year'], 'firstProduct': m['change']['year'], 'adoption': ad,
                    'origin': m['origin'], 'major': bool((m.get('flags') or {}).get('major')), 'verification': m['provenance']['verification']})
    out.sort(key=lambda c: (not c['major'], c['verification'] != 'source-cited', c['research']))
    return out[:60]

STEP_VISUALS = {
  'gap': {'intro':'the model, coloured by source', 'example':'one milestone highlighted, with its story card', 'century':'the century playing', 'trend':'Key findings', 'heatchart':'the Heatmap chart', 'corrected':'the Summary table',
          'gapchart':'the Gap over time chart', 'fields':'the Filters window, with AI selected', 'outlook':'the AI outlook window', 'aichart':'the AI vs the rest chart', 'answer':'Key findings'},
  'horizon': {'intro':'the vision window and the model filtered to AI for clean energy', 'radar':'the Vision radar', 'new':'the Vision radar', 'next':'the Vision radar, next five years', 'pipechart':'the Clean energy pipeline chart',
              'changes':'the Forecast drift chart, clean energy only', 'slide':'the PowerPoint report window', 'answer':'the Vision radar'},
  'secure': {'intro':'the Filters window, attack-surface filter on', 'lens':'the Cyber lens', 'secchart':'the Security lag chart', 'gaps':'the Security lag chart, open gaps first', 'example':'one milestone story card with mitigations',
             'guidance':'the Cyber lens, latest guidance', 'caution':'the Cyber lens caution', 'answer':'the Cyber lens'},
  'fortune': {'intro':'Time to a fortune', 'research':'Time to a fortune', 'speed':'Time to a fortune', 'fortchart':'the Race to a fortune chart playing', 'fastest':'Time to a fortune sorted by speed', 'uk':'the Filters window, UK only',
              'uni':'the Filters window, university projects', 'table':'the Table', 'answer':'Time to a fortune'},
  'how': {'intro':'the model', 'research':'Data changes', 'qa':'Data changes', 'more':'the Cyber lens', 'quality':'Data quality', 'labels':'the Filters window', 'arrange':'the Windows menu', 'whatifchart':'the What if? chart', 'answer':'the toolbar'},
  'charts': {k: f'the {k} chart' for k in ['gaps', 'heat', 'ai', 'pipe', 'drift', 'sec', 'fort', 'whatif']},
  'charthow': {'open':'the Gap explorer', 'gapsort':'the Gap explorer, sorted and zoomed', 'filter':'the Gap explorer, energy only', 'heat':'the Heatmap with a cell list', 'ai':'AI vs the rest, zoomed', 'pipe':'the pipeline with a flow list',
               'drift':'Forecast drift with a year list', 'sec':'Security lag, open gaps first', 'fort':'the Race to a fortune playing', 'whatif':'What if?, ambitious scenario', 'insight':'the Heatmap with its Insight callout'}}

PH_MEANINGS = {'nGap':'number of landed milestones', 'longestTitle / longestYears':'the longest journey and its years', 'quickRecentTitle / quickRecentYears':'the quickest recent arrival and its time',
  'fastField / fastFieldYears, slowField / slowFieldYears':'quickest and slowest fields since 2010', 'improvedField / improvedFrom / improvedTo':'field that sped up most, 1990s to 2010s',
  'aiMed / restMed / aiCount':'AI-driven against the rest since 2010, and how many AI-driven', 'pipeTotal / pipeResearch / pipePilot / pipeCommercial / pipeScale / pipeGB':'the clean energy pipeline counts',
  'driftCount / driftPeakYear / driftPeakCount / driftRevised / driftSlipped':'forecast tracking', 'secCount / secMedian / secLongestTitle / secLongestYears / secOpen':'the security lag',
  'fortCount / fortResearch / fortFastest / fortFastestTime / fortPre / fortRecent':'fortunes', 'wiAvg / wi2030Now / wi2030AI / wiTopLever':'the AI levers scenario',
  'n, pre, recent, adopt, ai, oth, aiOut, convOut, kmYears':'the headline gap figures', 'updatedAt / newCount / newTitles / changedCount':'this week: date, additions and corrections'}
VIEWS = {'main':'the 3D model of every milestone', 'findings':'Key findings', 'radar':'Vision radar (AI for clean energy)', 'cyber':'Cyber lens', 'fortunes':'Time to a fortune',
  'gaps':'Gap explorer chart', 'heat':'Heatmap chart (field by decade)', 'ai':'AI vs the rest chart', 'pipe':'Clean energy pipeline chart', 'drift':'Forecast drift chart', 'sec':'Security lag chart', 'fort':'Race to a fortune chart', 'whatif':'What if? chart'}

def week_changes(db, clean=False):
    from datetime import date, timedelta
    cutoff = (date.fromisoformat(TODAY) - timedelta(days=8)).isoformat(); lines = []
    for e in db['meta'].get('changelog', []):
        if e.get('date', '') >= cutoff:
            det = [d for d in (e.get('details') or []) if not clean or re.search(r'clean energy|energy', d, re.I)]
            lines.append(f"{e.get('date')}: {e.get('summary', '')}"); lines += [f"  {d}" for d in det[:40]]
    return '\n'.join(lines[:150]) or 'No changes were logged this week.'

def run_week(tours, db, tid='week'):
    """Write this week's analysis: three to six steps, each showing a view, about the best of the week's findings."""
    import datetime as _dt
    sp, t = tour_rules.SPEC[tid], tours['tours'].get(tid)
    clean = tid == 'cleanweek'; views = {k: v for k, v in VIEWS.items() if k in sp.get('views', VIEWS)}
    if not t: return tours
    tool = {'name': 'submit_week', 'description': "Submit this week's analysis.", 'input_schema': {'type': 'object', 'required': ['steps', 'reason'], 'properties': {
        'steps': {'type': 'array', 'minItems': 3, 'maxItems': 6, 'items': {'type': 'object', 'required': ['view', 'say'], 'properties': {'view': {'type': 'string', 'enum': sorted(views)}, 'say': {'type': 'string'}}}},
        'reason': {'type': 'string'}}}}
    stories = [f"{m['title']}: research: {m['story']['research']}; first used: {m['story']['deploy']}; impact: {m['story']['impact']}" for m in db['milestones'] if m.get('story') and (not clean or m.get('vision'))][:12]
    prompt = (f"Write the narration for a one to two minute guided tour called \"{t['title']}\". It walks a general audience through the best and most interesting findings of this week"
              + (" for AI in the clean energy system" if clean else "") + ", showing a view for each step that supports the point. People like stories: where you can, tell how a piece of research became a first use and then made an impact, using the stories below.\n"
              "The intro step (written by the app) already gives the date and the week's additions: do not repeat it. Start with a finding, and make each step a different point.\n"
              f"Views you can show: {json.dumps(views)}\n"
              f"Placeholders the app fills from live data (use these for every figure; never type a number yourself): {json.dumps(PH_MEANINGS)}\n"
              f"Rules: three to six steps; at most {sp['maxWords']} words each; plain British English; no links; refer to the government's clean energy vision areas as \"AI for clean energy\", never by department name; "
              "you may name a milestone by its exact title from the changes below; do not overstate: if the evidence is mixed, say so.\n"
              f"This week's changes, as logged by the agents:\n{week_changes(db, clean)}\n"
              f"Researched stories you can retell (name the milestone exactly): {json.dumps(stories, ensure_ascii=False)}\n"
              f"Last week's steps, for reference: {json.dumps(t['steps'], ensure_ascii=False)}")
    try: out = call_claude('You write clear, accurate weekly analysis for a data visualisation.', prompt, tool, max_searches=0) or {}
    except Exception as e: print(f'Weekly analysis not written ({e}); keeping last week\'s.'); return tours
    titles = {m['title'] for m in db['milestones']}
    steps = {'intro': t['steps']['intro']}
    for st in (out.get('steps') or [])[:6]:
        sid = f"{'c' if clean else 'w'}{len(steps)}"
        lit = ' '.join(tour_rules._paths(st.get('say'))[:1])
        if any(tour_rules.similarity(lit, ' '.join(tour_rules._paths(v['say'])[:1])) > .6 for v in steps.values()):
            print(f"weekly analysis: dropped a step that repeats an earlier one ({lit[:60]})"); continue
        if st.get('view') in views and not tour_rules.check_step(tid, sid, st.get('say'), titles):
            steps[sid] = {'view': st['view'], 'say': st['say']}
        else: print(f"weekly analysis: dropped a step that broke the rules ({str(st.get('say'))[:60]})")
    if len(steps) - 1 < 3: print('Weekly analysis: fewer than three valid steps; keeping last week\'s.'); return tours
    new = dict(t, steps=steps, updated=_dt.datetime.now(_dt.timezone.utc).strftime('%Y-%m-%dT%H:%MZ'))
    trial = copy.deepcopy(tours); trial['tours'][tid] = new
    errs = tour_rules.check(trial, db['milestones'])
    if errs: print('Weekly analysis rejected: ' + '; '.join(errs[:3])); return tours
    print(f"{tid}: {len(steps) - 1} steps written ({out.get('reason', '')[:120]})")
    return trial

def run():
    cfg = CONFIG.get('tours', {})
    if not cfg.get('enabled', True): print('Tour agent disabled.'); return 0
    db = load_db(); tours = json.loads(TOURS.read_text(encoding='utf-8')); before = json.dumps(tours, sort_keys=True)
    cands = candidates(db); cand_ids = {c['id'] for c in cands}
    for tid in tour_rules.SPEC:
        if tid in ('week', 'cleanweek'):   # the weekly analyses are written fresh each week
            tours = run_week(tours, db, tid); continue
        t = tours['tours'][tid]
        sp = tour_rules.SPEC[tid]
        task1 = ("Tasks: (1) choose up to four worked examples, best first, from the candidates: well-known breakthroughs that make the stages easy to follow, "
                 "preferring source-cited records and a mix of university, industry and government origins. ") if sp.get('examples') else "Tasks: (1) return exampleIds as an empty list; this tour has no worked example. "
        prompt = (f"You maintain the narration for a one-minute guided tour: \"{t['title']}\". Today is {TODAY}.\n"
                  "Narration templates use {placeholders} that the app fills from live data, and {\"by\": condition, \"cases\": {...}} blocks whose variant the app chooses from the evidence. "
                  "So you never state figures or decide conclusions yourself.\n"
                  f"Rules: only these placeholders: {sorted(sp['placeholders'])}; keep every case of every condition ({ {k: sorted(v) for k, v in sp['cases'].items()} }); "
                  f"refer to the government's clean energy vision areas as \"AI for clean energy\", never by department name; no figures typed in the text except {sorted(sp['years'])}; at most {sp['maxWords']} words per step; plain British English; no links.\n"
                  + (f"Each variant's wording must state exactly what its condition means, no more and no less: {json.dumps(sp.get('meanings', {}))}.\n" if sp.get('meanings') else '')
                  + (f"Chart facts you can use: {json.dumps(PH_MEANINGS)}.\n" if tid == 'charts' else '')
                  + f"What is on screen at each step (your words must fit it): {json.dumps(STEP_VISUALS.get(tid, {}))}.\n"
                  + task1 +
                  "(2) Improve the wording of at most three steps, only where it becomes clearer or more accurate for a general audience. Leave the rest out.\n"
                  f"Current steps: {json.dumps(t['steps'], ensure_ascii=False)}\n"
                  + (f"Candidates: {json.dumps(cands, ensure_ascii=False)}" if sp.get('examples') else ''))
        out = call_claude('You write clear, accurate narration for a data visualisation.', prompt, TOOL, max_searches=0) or {}
        new = copy.deepcopy(t); changes = []
        ex = [e for e in (out.get('exampleIds') or []) if e in cand_ids][:4] if sp.get('examples') else []
        if ex and ex != t.get('exampleIds'): new['exampleIds'] = ex; changes.append(f"examples: {', '.join(ex)}")
        edits = out.get('steps') or {}
        for sid in list(edits)[:cfg.get('maxStepsChangedPerRun', 3)]:
            if sid not in sp['steps'] or not isinstance(edits[sid], dict) or 'say' not in edits[sid]: continue
            errs = tour_rules.check_step(tid, sid, edits[sid]['say'])
            if errs: print(f'kept the old wording for {tid}.{sid}: ' + '; '.join(errs[:3])); continue
            if edits[sid]['say'] != t['steps'][sid]['say']: new['steps'][sid] = {'say': edits[sid]['say']}; changes.append(f'wording: {sid}')
        trial = copy.deepcopy(tours); trial['tours'][tid] = new
        errs = tour_rules.check(trial, db['milestones'])
        if errs: print('tour update rejected: ' + '; '.join(errs[:4])); continue
        tours = trial
        if changes: print(f"{tid}: " + '; '.join(changes) + (f" ({out.get('reason', '')[:160]})" if out.get('reason') else ''))
    for tid in ('week', 'cleanweek'):   # never leave repeated steps in an analysis, even if this week's rewrite failed
        t = tours['tours'].get(tid)
        if not t: continue
        lit = lambda v: ' '.join(tour_rules._paths(v.get('say'))[:1]); kept = {}
        for k, v in t['steps'].items():
            if any(tour_rules.similarity(lit(v), lit(w)) > .6 for w in kept.values()): print(f'{tid}: removed a repeated step ({k})'); continue
            kept[k] = v
        if len(kept) - 1 >= 3: t['steps'] = kept
    if json.dumps(tours, sort_keys=True) != before:
        tours['version'] = tours.get('version', 1) + 1; tours['updated'] = TODAY; tours['updatedBy'] = 'tour-agent'
        TOURS.write_text(json.dumps(tours, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
        db2 = load_db(); log = db2['meta'].setdefault('changelog', [])
        note = f"tours: walk-through scripts refreshed (version {tours['version']})"
        if log and log[-1].get('date') == TODAY: log[-1].setdefault('details', []).append(note)
        else: log_change(db2, 'Walk-through scripts refreshed.', [note])
        from common import save_db; save_db(db2)
        print(f"tours.json updated to version {tours['version']}.")
    else: print('Walk-through scripts unchanged.')
    return 0

if __name__ == '__main__':
    try: sys.exit(run())
    except Exception as e:   # the walk-throughs must never block the week's data: keep last week's scripts
        print(f'Tour agent could not run ({type(e).__name__}: {e}). Keeping last week\'s scripts.'); sys.exit(0)
