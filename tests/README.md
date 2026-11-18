# Test rig

Nothing here publishes anything or calls a paid API: the agents are tested with simulated answers.

## Run it anywhere: `tests/rig.py`

```
python tests/rig.py doctor                  # is this machine ready? (Python, packages, a browser that launches, Node)
python tests/rig.py setup                   # install the pinned packages and Playwright's Chromium
python tests/rig.py quick                   # about a minute: build, syntax check, smoke test, agents' guardrails
python tests/rig.py                         # everything, 15-25 minutes
python tests/rig.py capabilities reviews    # chosen suites: all, agents, browser, or any name in tests/browser/
```

The rig builds `index.html` from `src/`, checks the built script with `node --check` (when Node is installed), finds a
Chromium that actually launches (and passes it on as `CHROME` when Playwright's own is missing or a different version),
runs `run_tests.py`, and **reruns each failed suite on its own**. A suite that then passes is reported **FLAKY** (a timing
check to make robust), not broken. Results: `tests/_last_run.txt` (one screen) and `tests/_last_run.log` (everything);
both are git-ignored. Exit code 0 means everything passed first time.

On GitHub: **Actions → Test suite → Run workflow** runs the same suites. The weekly AI-enhanced run also runs them all
before it may publish.

## What is in it

- `agent_tests.py`: the agents' guardrails offline (years, candidate shapes, duplicates, tour rules, page evidence,
  curation, Gemini salvage, guidance memory, security responses, narration review).
- `browser/*.py`: one file per suite; see the table in `docs/KNOWLEDGE_BASE.md`, section 10.
- `run_tests.py`: builds a private test copy of the page with a test hook (`window.__getT()`), serves the repository
  on a free port with a threaded server, runs the chosen suites, and refuses unknown suite names.

## Writing a new check

- Find elements by id or name, never by position (a new experimental feature can come first).
- Wait for the result (`wait_for_function(…, polling=500)`, `wait_for_selector`), not for a fixed time.
- Print `PASS <id> <what>` or `FAIL <id> <what>` lines and end with `PASSED n of m | page errors: [...]`, as the
  other suites do; `run_tests.py` treats any `FAIL` line or page error as a failure.
- Keep suites independent: each opens its own page.
