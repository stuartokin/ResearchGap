# The Shrinking Gap from Research to Change

An interactive 3D model of how long research takes to become real-world change, across eleven fields from 1925 to ten years ahead. The data is compiled and kept up to date weekly by two AI agents, with automated guardrails instead of human review.

*A personal project by Stuart Okin, not affiliated with or endorsed by any employer. The data is maintained by AI agents without human review and may contain errors. Outlook years are AI estimates, not forecasts.*

## How it fits together

| Path | What it is |
|---|---|
| `index.html` | The app. Self-contained: 3D library, fonts, PowerPoint library and a snapshot of the data are embedded, so it works offline. |
| `data/data.json` | The dataset: milestones, founders, events, outlook assumptions and default settings. The single source of truth. |
| `data/schema.json` | The formal definition of valid data, used as a publishing gate. |
| `data/pending.json` | Candidates found by the research agent, awaiting independent QA. |
| `views/*.json` | Your own overlays: layout, settings, titles and ideas. Open with `index.html?view=views/name.json`. |
| `agents/` | The research agent, the QA agent, shared guardrails and limits (`config.json`). |
| `tools/` | `validate.py` (schema and data rules), `change_guard.py`, `build.py` (embeds the data snapshot), `smoke_test.py`. |
| `.github/workflows/data-agents.yml` | The weekly pipeline. |

When the app is served online it loads the latest `data/data.json`; offline it uses the snapshot embedded at build time. “Today” in the model is the data’s as-of date, and the outlook always runs ten years beyond it.

## The weekly pipeline

Every Monday at 06:00 UTC (or on demand from the Actions tab):

1. **Research agent** searches each field for recent breakthroughs, products and binding changes. It only *proposes* candidates.
2. **QA agent** independently confirms or rejects each candidate, then audits a rotating batch of 40 existing records: links, dates, descriptions, field, DESNZ vision area and major-milestone status. It re-checks outlook items whose year has passed.
3. **Gates**: schema and data rules, a change guard, a rebuild, and a headless browser test.
4. **Publish**: only if every gate passes, the new data is committed and tagged (`data-r2`, `data-r3`, …). GitHub Pages then serves it.

### Guardrails (enforced in code, not left to the model)

- New items need **two independent sources**, fetched by the code itself, each containing the item’s distinctive terms and change year; then **independent confirmation** by the QA agent.
- Corrections apply only if their **evidence quote is found verbatim** on a page the code fetched. Year changes are capped at ten years; field, DESNZ and major-milestone changes need high confidence.
- **No deletions.** Doubtful records are marked “Disputed”, broken links “broken”, and records downgraded from “Source-cited” when their sources disappear.
- **Limits per run**: at most 10 additions and 15 corrections.
- **Prompt-injection resistant**: agents treat web pages as data and can only return a fixed structured format; they cannot change code, settings or the workflow.
- **Transparency**: every record shows Source-cited, AI-compiled or AI estimate, and its last-checked date; About shows the change log.
- **Undo**: every run is a tagged git commit. To roll back, revert that commit (or restore `data/data.json` from an earlier tag) and push.

## Setting up (about 15 minutes)

1. **Anthropic Console** (console.anthropic.com): create an API key, ask your organisation admin to **enable web search**, and set a **monthly spend limit**.
2. **GitHub repository, Settings, Secrets and variables, Actions**:
   - Secret `ANTHROPIC_API_KEY`: your key. It is only used by the workflow and is never sent to the website or its visitors.
   - Variable `AGENTS_ENABLED`: `true` to switch on the weekly schedule (`false` is the kill switch).
   - Optional variable `AGENT_MODEL` to override the model in `agents/config.json`.
3. **Pages**: serve from the main branch root.
4. **First run**: Actions, *Weekly data agents*, *Run workflow*. Read the change log in About afterwards. Run it manually a few times before enabling the schedule.

The workflow never runs on pull requests, so outside contributors and forks cannot trigger it or see the key.

## Editing data by hand

Edit `data/data.json`, then run:

```
pip install jsonschema
python tools/validate.py
python tools/build.py
```

Keep each record’s `id` unchanged: saved views and the agents rely on it.

## Credits

See `ATTRIBUTION.md`.
