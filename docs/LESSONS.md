# Lessons learned

Hard-won lessons from building and running The Shrinking Gap, so they are not learned twice. Each says what happened,
what we learned, and what is now in place. Add new ones at the top of their section.

## Working with Stuart, and with the AI sessions themselves

1. **Check before concluding.** A session told Stuart the `AGENTS_ENABLED` variable was missing; his screenshot showed
   it had been set five days earlier. *Lesson:* ask for evidence (a screenshot, a log) before stating a cause, and say
   "most likely" until it is confirmed.
2. **A session cannot see GitHub's Actions pages.** Unauthenticated GitHub API calls from the sandbox hit rate limits.
   `git clone` works. *Lesson:* clone for code; ask Stuart for run logs, issue text or screenshots of Actions pages.
3. **Long work spans several replies.** Each reply has a limited number of tool calls, and background processes do not
   survive between replies. *Lesson:* plan in chunks, keep a short "done / still to do" at the end of each reply,
   package early, and restart test runs at the start of the next reply rather than assuming they finished.
4. **Ship only what changed, in the structure GitHub expects.** Compare hashes with a fresh clone; zip the changed files
   with their folders; `.github/` files separately, by hand; a single file when only `index.html` changed.
5. **Rebase shared files before shipping.** `data/tours.json` and `data/data.json` change every week. Compare with the
   latest GitHub copy and apply your edits on top; never overwrite the agents' work.
6. **Web uploads have traps.** Hidden files (`.gitignore`) vanish after unzipping; GitHub's editor may default to a new
   branch and a pull request (merge it, ticking the admin bypass if the ruleset asks). Say so up front.
7. **Mock up before coding interface changes.** Stuart judges by eye. A design canvas with laptop and phone versions,
   then one round of feedback, saved rework every time (doors, tiles, the orbit carousel).

## GitHub Actions and scheduling

8. **Scheduled runs can start hours late, or not at all, at busy times.** The first Monday slot at 06:00 never ran; a
   Wednesday 05:23 run started at 13:00. *In place:* off-the-hour times, a safety-net slot later the same day, and a
   `check` job that skips the second slot if the first ran. Manual runs always work.
9. **Kill switches are variables, not edits.** `AGENTS_ENABLED`, `UI_AGENT_ENABLED`. A schedule only runs when `true`.
10. **Protect main, publish through narrow apps.** A ruleset blocks direct pushes; a Contents-only app publishes; the
    Claude Code agent's app cannot touch workflows and can only push `experimental`. The bypass appears in logs as
    "Bypassed rule violations"; that is expected.
11. **Artifact links in logs 404 unless signed in in that browser.** Open the run's summary page and use the
    Artifacts list at the bottom.
12. **Node 20 deprecation warnings** come from `create-github-app-token@v1` and `upload-artifact@v4`. Harmless for now;
    on the roadmap.

## Testing

13. **An empty test run must never look like a pass.** `run_tests.py` once ignored suite names it did not understand,
    printed an empty summary, and the weekly agent reported its checks as passed. *In place:* unknown names fail with
    "FAILED: no tests were run"; the skill says an empty summary means the checks did not run.
14. **Address things by name, not position.** The AI-version test opened "the first experimental chart"; when a second
    feature appeared first, it tested the wrong chart. *In place:* the sample is opened by id, and V7b checks every
    experimental chart draws with its insight filled.
15. **Fixed waits are flaky under load.** Capabilities P3 and S1 failed in full runs and passed alone; reviews R1
    assumed an exact row count when the list is capped at 150. *In place:* the portable rig reruns failures alone and
    reports FLAKY separately; make such checks wait for the result, not for a fixed time.
16. **A one-at-a-time test server stalls on audio.** Large recordings held the connection. *In place:*
    `ThreadingHTTPServer` with daemon threads, a free port per run, quiet handling of dropped connections.
17. **Headless pages with heavy WebGL may never fire animation frames.** `wait_for_function` polls by animation frame
    by default and timed out. *Use* `polling=500`. Also prefer `127.0.0.1` to `localhost` in tools.
18. **Playwright and its browsers can disagree in version.** A machine may have Playwright 1.64 but only an older
    Chromium, and downloads may be blocked. *In place:* the rig finds any Chromium that launches and passes it as
    `CHROME`; every tool honours `CHROME`.
19. **Check the built script, not just the source.** A `//` comment placed mid-line silently commented out the code
    after it. *In place:* the rig runs `node --check` on the built script.
20. **State that a deferred callback relies on can change before it runs.** An insight closed while a chart was drawing
    popped back open. *Pattern:* re-check the setting inside the deferred function.
21. **Don't keep live references in objects that a settings reset replaces.** Chart pop-outs vanished after the welcome
    screen reset `view`. Globals the menus need (`IS_AI`) must be defined before the menus are built.

34. **The AI-version suites need the `experimental` branch's folder.** On a `main` checkout they failed for want of
    `experimental/`, and the old Test suite workflow could never pass them. *In place:* the rig borrows the folder from
    the branch for the run, and the Test suite workflow now runs the rig.

## Agents and data quality

22. **A plausible proxy is not a fact.** The security lag matched each technology to *any* later security milestone in a
    broad category, so the chart claimed "no security response yet: 0". *In place:* researched responses (sourced,
    confirmed on the page) are solid; proxies are dashed, labelled, counted, and the narration says so; a
    security-response agent researches the real ones; "none found" is a genuine open gap.
23. **Tell the agent the rules of the dataset.** The gap-filler asked for "the 1920s" while the timeline starts in 1925,
    wasting six finds a week. Put floors, units and limits in the prompt, and enforce them in code.
24. **Remember rejections.** The guidance agent rejected the same two pages every week. Record rejections and skip
    them for a period.
25. **Reasoning tokens count against the output limit.** Gemini's answer was cut off at MAX_TOKENS with nothing usable.
    *In place:* a reasoning budget, brief fields, and salvage of every complete item before the cut.
26. **Ask once for a shorter answer, then record.** Rejecting over-long answers outright lost good work; one retry
    with the limit quoted fixed it.

## Narration

27. **Spoken figures must come from the panel's own calculation.** "111 to 112" was spoken while the chart showed
    32 → 33 (all technologies against the clean energy view); "2 years" against a panel's "2 vs 5". *In place:* one
    source of figures, the same rounding, and a code check that every spoken number is on screen.
28. **Freeze the narration with its recordings.** Clips are keyed by exact text; a viewer's own filters changed a figure,
    so no clip matched and the browser voice took over. *In place:* the exact text is stored in `audio/manifest.json`
    and spoken while the data revision and tours version match.
29. **Mechanical rules don't catch nonsense.** "Regrouped twice… left many unclear" passed every rule. *In place:* a
    narration review agent sees a screenshot of each step and this week's changes; otherwise last week's wording.
30. **Write for zero and for units.** "0 cases remain open" and "took 6 to get from…" read badly. Placeholders are bare
    numbers: write the unit; word sentences so they read well at zero.

## Interface

31. **Too many choices at once confuses.** The old welcome screen had eight cards, ribbons, switches and a countdown.
    Three doors, one decision each, and a calm arrival (century paused) fixed "getting lost".
32. **Always offer a way home.** Home, a breadcrumb, All questions, Next question.
33. **Respect reduced motion** for every animation, including tile pictures, door transitions and the orbit.
