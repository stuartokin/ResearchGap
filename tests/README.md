# Test rig

Not run automatically. Run it by hand from **Actions → Test suite → Run workflow** (choose all, agents or browser), or locally with `python tests/run_tests.py`.

- `agent_tests.py` checks the agents' guardrails offline with simulated answers (years, candidate shapes, duplicates, tour rules, the second opinion's page reading, curation). No API calls, no cost.
- `browser/` holds the browser suites: `functions.py` (68 checks across the app), `settings_roundtrip.py` (every setting survives a saved view), `inspector_docs.py` (Data inspector, documentation and window layering).
- `run_tests.py` builds a test copy of the app beside `index.html`, serves the repository locally, runs the suites, and removes the test copy afterwards. Nothing is published.
