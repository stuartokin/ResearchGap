# The Shrinking Gap from Research to Change

An interactive 3D model of how long research takes to become real-world change, across eleven fields from 1925 to ten years ahead. The data is compiled and kept up to date weekly by two AI agents, with automated guardrails instead of human review.

*A personal project by Stuart Okin, not affiliated with or endorsed by any employer. The data is maintained by AI agents without human review and may contain errors. Outlook years are AI estimates, not forecasts.*

## How this works, in plain English

- **What you are looking at.** Each arc is one breakthrough: it rises when the research began and lands when it first reached real-world use. A second, thinner arc carries on to mainstream adoption. The height of an arc is the gap in years.
- **Where the data comes from.** Two AI agents run every week. One searches for new breakthroughs and products in each field. The other independently checks them, and re-checks older records, before anything is published.
- **How errors are kept out without a human reviewer.** New items need two independent sources that the code fetches and reads itself. A correction is only applied if its quoted evidence really appears on the source page. Nothing is ever deleted, every change is logged and can be undone, and each record shows whether it is source-cited, AI-compiled or an AI estimate.
- **What it cannot tell you.** It only contains ideas that succeeded, dates are often approximate, and outlook years are estimates, not forecasts.
- **Licences.** Code: MIT (`LICENSE`). Data: CC BY 4.0 (`DATA-LICENSE.md`). Third-party components: `ATTRIBUTION.md`.

## How it fits together

| Path | What it is |
|---|---|
| `index.html` | The app. Self-contained: 3D library, fonts, PowerPoint library and a snapshot of the data are embedded, so it works offline. |
| `data/data.json` | The dataset: milestones, founders, events, outlook assumptions and default settings. The single source of truth. |
| `data/schema.json` | The formal definition of valid data, used as a publishing gate. |
| `data/pending.json` | Candidates found by the research agent, awaiting independent QA. |
| `requirements.txt` | Fixed versions of the Python packages the agents use. |
| `tools/digest.py` | Writes the weekly digest issue. |
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
5. **Digest**: a GitHub issue summarises the run, which also emails you.

The research agent also searches each of the five DESNZ AI energy vision areas directly every week. Each record carries a readiness stage (research, pilot, first commercial use, at scale), a GB status for energy and vision-linked records, and, for technologies, a note on whether it expands the cyber attack surface. Outlook estimates are recorded when made and scored when the item lands, so forecast accuracy builds up over time (see Data quality in the app). On deep-audit runs a second issue, labelled `desnz`, summarises the month for each vision area.

A third agent, the guidance agent, runs weekly to record new and updated security guidance, with priority on the NCSC Cyber Assessment Framework and Ofgem's CAF Overlay and profiles, then NIST, NERC CIP, IEC 62443, ISO/IEC, ETSI and regulators worldwide. It accepts only official sources whose page it has read, and the updates appear in the Cyber lens. The mitigation guidance shown in the app is AI-generated research to prompt discussion, not security advice: engage qualified experts before acting.

**Guided walk-throughs.** The narration lives in `data/tours.json` as templates: figures are filled in, and conclusions chosen, by the app from the live data, so a tour never states an out-of-date number or verdict. A weekly tour agent chooses the worked examples and may refine wording, but only within rules checked in code (`agents/tour_rules.py`): known placeholders only, a variant for every conclusion, no typed figures, word limits, and real examples. After the gates pass, `tools/make_voice.py` asks the built app for the exact narration, records any changed sentences with a human-like voice (Microsoft Azure's British "Sonia" voice by default; Google, ElevenLabs and OpenAI are also supported in `agents/config.json`), and saves them in `audio/`. To switch it on, add your provider key as the repository secret `TTS_API_KEY` (and, for Azure, the region as the variable `TTS_REGION`, for example `uksouth`). Without a key, visitors hear their browser's voice.

Time to a fortune is refreshed monthly with the deep audit: the research agent looks for new fortunes (two sources, independent QA), and the QA agent updates net worths only from a dated source whose quoted text contains the new figure, with jumps of more than threefold refused. Set `founders.weekly` in `agents/config.json` to run it every week.

On the first Monday of each month (or when you tick *deep* on a manual run) the QA agent uses the stronger model and a bigger batch. To see estimated costs in the app, add your model prices under `pricing` in `agents/config.json`; the Claude Console always shows the exact charge.

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
