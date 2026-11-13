# Knowledge base: The Shrinking Gap from Research to Change

How everything works, in one place. Read `CLAUDE.md` first, then this. Lessons learned are in `docs/LESSONS.md`,
plans in `docs/ROADMAP.md`.

*As of 13 November 2026: app version 13.4, data revision 37 (705 milestones, 86 founders, 11 fields).*
*Keep this file current: any session that changes how something works updates the section concerned.*

---

## 1. What it is

A single-page 3D web app (three.js) asking: **has the journey from research to real-world change got quicker, and
will AI shorten it further?** Each milestone is an arc: it rises when research began, lands at the first real-world
use, and a thinner arc runs on to mainstream adoption. It covers 11 fields from 1925 to ten years ahead, with a
special focus on **AI for clean energy** (DESNZ's vision of an AI-enabled clean energy system) and **cyber security**.

- **Live:** https://stuartokin.github.io/ResearchGap/ (standard) and `/ai/` (the AI-enhanced version).
- **Repository:** https://github.com/stuartokin/ResearchGap (public).
- **Owner:** Stuart Okin, a personal project, not affiliated with or endorsed by any employer. Written content uses
  the byline *Stuart Okin, Director of Cyber Regulation and Emerging Technologies, Ofgem*, while always saying the
  app is personal and not an Ofgem view.
- **Principle:** maintained weekly by AI agents **without human review**, so the guardrails are code, not trust.
  The app says plainly that it may contain errors. Figures in text always come from the data (placeholders), never
  typed by hand or by a model.
- **Licences:** code MIT (`LICENSE`), data CC BY 4.0 (`DATA-LICENSE.md`), third parties in `ATTRIBUTION.md`.

## 2. Repository map

| Path | What it is | Edited by |
|---|---|---|
| `src/index.html`, `src/js/*.js`, `src/styles/app.css`, `src/vendor/` | The app's source, in numbered files | Development sessions |
| `index.html` | **Built output**: `tools/build.py` concatenates `src/` and embeds the data, libraries and fonts into one self-contained page that works offline | Built; never edit by hand |
| `ai/index.html`, `ai/features.json` | **Built output**: the AI-enhanced version (`tools/build_ai.py`) | Built |
| `data/data.json` | The dataset, the single source of truth (schema: `data/schema.json`) | The weekly agents |
| `data/tours.json` | Narration templates for tours, insights and questions (`{placeholders}` and `{by, cases}` blocks) | Tour agent, narration review, development sessions |
| `data/pending.json`, `pending_founders.json`, `rejected.json`, `curation.json` | Candidates awaiting QA; rejections (last 800, shown in the Data inspector); admin decisions | Agents; admin via the app's system file |
| `agents/` | Python agents and shared guardrails (`common.py`), limits and models (`config.json`), tour rules (`tour_rules.py`) | Development sessions |
| `tools/` | Build, gates, voice, narration check, digest, AI-version builder and guard, screenshots | Development sessions |
| `tests/` | The test rig: `rig.py` (portable entry point), `run_tests.py`, `agent_tests.py`, `browser/*.py` | Development sessions |
| `audio/` | Recorded narration (`tours/<tour>/<step>-<hash>.mp3`) and `manifest.json` (voice, files, frozen texts) | Voice step |
| `views/*.json` | Saved view overlays, e.g. `?view=views/spen-glasgow-showcase.json` | By hand |
| `.github/workflows/` | Five workflows (section 6) | **Stuart by hand** (see section 9) |
| `CLAUDE.md`, `.claude/skills/improve-experimental/SKILL.md` | Rules and procedure for the weekly Claude Code agent | Development sessions |
| `experimental/` (**on the `experimental` branch only**) | Features of the AI-enhanced version, plus `README.md` (the extension interface), `manifest.json`, `WHATS_NEW.md` | The weekly Claude Code agent |
| Root media (`QDayIntro.mp4`, `cae_cover_16x9.mp4`, `mixkit-*.mp3`, `sample-report.pptx`) | Video windows, music and a sample report | By hand |

## 3. The app (front end)

**Architecture.** One `boot()` function. `src/js/00-start.js` opens it, `36-start.js` closes it; files are concatenated
in name order, so later files can use earlier ones' functions. Three.js r128 with UnrealBloomPass, PptxGenJS,
qrcode-generator, Instrument Sans and Serif fonts are all embedded.

**Key source files** (`src/js/`):

| File | Role |
|---|---|
| `01-data…` | Loads `data/data.json` (or the embedded snapshot offline) and maps it to `items`; `APP_VERSION`, `IS_AI`, `asset()` (paths that work from `/ai/` too), the storage stub |
| `02-state.js`, `06-filtering.js`, `10-filter-ui.js` | State, filters `F`, the Filters panel |
| `03`–`05`, `14`, `15` | 3D scene, stage, arcs, labels, animation |
| `07-window-manager.js`, `08-arrangements…`, `09-…views menu` | Floating panels; ready-made views (presets); the Views menu |
| `12-details.js` | Details panel for a milestone |
| `21-powerpoint…` | Three-slide PowerPoint report |
| `22-data-changes…` | The agents' change log in the app |
| `27-shareable-links…`, `32-saved-views-json.js` | Links and saved view files |
| `28-help…` | One source for hover tips, Help panel and its FAQ |
| `29-readiness…cyber lens…` | Readiness stages, GB status, Cyber lens, `secResponse()` (security lag: researched or proxy) |
| `31-welcome…tours.js` | Welcome screen behaviour, the tour engine, narration filling (`stepText`, `frozenText`), voice playback |
| `31b`–`31c` | Kiosk mode, image export; CSV/Excel export |
| `31d-charts.js` | Charts window: tabs Gap explorer, Heatmap, AI vs the rest, Clean energy pipeline, Forecast drift, Security lag, Race to a fortune, What if?, plus experimental tabs |
| `31e-insights…` | Chart insights, figures (`chartFacts`, `weekFacts`, `cleanWeekFacts`), the weekly analysis tours |
| `31f-inspector-and-docs.js` | Data inspector; in-app documentation, **changelog** (`DOCS_UPDATED`) and files table |
| `31g-toolbar…` | Toolbar menus (Present, Share), chips, pins, Mute speech |
| `31h-my-file…` | My file (save/open, autosave) and My views |
| `31i-chart-popouts.js` | Chart windows (replaced pop-outs; unlimited, linked or unlinked) |
| `31j-questions.js` | The questions, their answers and the question insight card |
| `31k-docs-infographic.js` | "At a glance" diagrams, including the agents diagram |
| `31l-extensions.js` | `SGX`, the extension interface for experimental features |
| `31m-ai-version.js` | The AI-enhanced version: switch, banner (movable), acknowledgement |
| `31n-doors.js` | Welcome doors (Learn, Ask, Explore), tile pictures, the orbit carousel, Home, Questions menu, breadcrumb |

**The toolbar:** Home, (breadcrumb after a question), Questions ▾, Play the century, Views ▾, Present ▾, Share ▾, Help.
Guided tours are behind Home's Learn door and in Help.

**The welcome screen (13.0+):** an acknowledgement ("AI-maintained… may contain errors") must be accepted, then three
doors. **Learn**: 8 tours in labelled sections (*Fresh this week* always as tiles). **Ask**: 9 questions in four
sections. **Explore**: the tool. Each page has *Show as: Tiles | Carousel*; the carousel is an orbit (cards round an
oval track; drag, swipe, ‹ ›, arrow keys, dots; a side card comes forward when clicked, the front card opens). Tile
pictures are small inline-SVG animations paused under reduced motion. No auto-start countdown except kiosk mode.

**Tours:** `gap`, `week` (this week's analysis), `cleanweek` (AI for clean energy analysis), `horizon`, `secure`,
`fortune`, `charthow`, `how`. **Questions:** `clean-ai`, `clean-next`, `ai-faster`, `fields`, `whatif`, `slips`,
`security`, `fortune`, `changed`. Sections and pictures for both are mapped in `31n-doors.js`; new ones fall into a
default section automatically.

**Storage policy:** the app stores **nothing** in the browser except one documented exception: the Learn/Ask layout
choice (`localStorage` key `sg.doorLayouts`). Everything else is saved in **My file** (a JSON file the user saves and
opens) or view files. Shareable links carry filters and display settings.

**AI-enhanced version (`/ai/`):** the standard app plus experimental features from the `experimental` branch, a purple
always-visible (movable) banner, "Back to standard", "What's new". Switch on the welcome screen, in Display, in Views,
or with `?ui=ai`. Data and audio load from one folder up via `asset()`.

**Extension interface `SGX` (version 1):** `registerChart({id, name, note, render, onAction, insight})` (insight
templates must use `{placeholders}`; typed numbers are refused), `addPanel`, `addStyles`, `on('filters'|'ready')`,
`toast`, `esc`, read-only `items()`, `allItems()`, `fortunes()`, `filters()`, `fieldName()`, `openStory()`, `panel()`.
Items expose id, title, field, origin, kind, years, stage, gb, cleanEnergyArea, aiDriven (**not** security fields yet;
see the roadmap). Full reference: `experimental/README.md` on the `experimental` branch.

## 4. The data

`data/data.json` top-level keys: `meta` (revision, asOf, startYear 1925, horizonYears, changelog, …), `fields` (11:
energy, hw, sw, ai, quantum, cyber, comms, materials, space, robotics, life), `origins`, `visionAreas` (DESNZ's five
areas), `milestones`, `founders`, `events`, `eras`, `outlookModel`, `securityGuidance`, `guidanceUpdates`, and more.

A milestone has `id`, `field`, `subfield`, `origin`, `status` (landed / outlook / …), `title`, `research{year}`,
`change{year}`, `adoption`, `confidence`, `provenance` (source-cited, AI-compiled, AI estimate), `refs`, `region`,
`readiness`, `gb` (GB status), `desnz` (vision area), `security{expandsAttackSurface, note, guidance, response}`,
`forecast`, `story`, `aiLevers`, `flags`, `tags`.

- `security.response` is written by the security-response agent: `{title, year, kind, url, note, basis:'researched',
  checked}`, or `{none:true, checked}` for a researched open gap. Without it the app shows a **proxy** (the nearest
  later security milestone in a related category), drawn dashed and labelled "(proxy)".
- Nothing is ever deleted: records are retired with a reason; every change goes in `meta.changelog`.
- Releases are tagged `data-r<revision>`.

## 5. The agents (Python, `agents/`)

Models from `agents/config.json`: `model` claude-sonnet-5-5 (overridable by the `AGENT_MODEL` variable), `deepModel`
claude-opus-5-5 for the monthly audit and deep search. Gemini 2.5 Flash is an independent second researcher and
second opinion. Shared guardrails live in `common.py` (`call_claude`, `call_gemini` with a reasoning budget and
salvage of cut-off answers, `fetch_text`, `record_rejection`, `log_change`).

| Agent | What it does | Key guardrails |
|---|---|---|
| `research_agent.py` | Proposes candidates: recent news per field and vision area, catch-up by quarter, gap-filling thin decades (told the floor is 1925) | Proposes only; duplicates and invalid years rejected |
| `gemini_research.py` | Up to 10 further candidates (UK, Europe, Asia, other languages) | Claude's QA must confirm them |
| `qa_agent.py` | Confirms or rejects candidates; audits a rotating batch; replaces broken links; reclassifies in-lab items as outlooks | Two independent sources fetched by code; quoted evidence must appear on the page |
| `gemini_check.py` | Second opinion on additions | Unsupported → marked disputed |
| `guidance_agent.py` | New security guidance (CAF and Ofgem first) | Official sources only; confirmed on the page; failures skipped for eight weeks |
| `security_agent.py` | Each technology's **own** first security response, most recent first, 20 a week | Page must name it and give the year; year not before research; none found = open gap, rechecked after six months |
| `tour_agent.py` | Rewrites tour and insight templates within `tour_rules.py` | Placeholders only, no typed figures, word limits, every case kept; never present a proxy as fact |
| `narration_review.py` | Reviews each analysis-tour step against a screenshot and the week's changes (after `tools/narration_check.py`) | Rewrites must pass tour rules; else last week's approved wording |
| `levers_agent.py`, `story_agent.py` | AI levers for projected technologies; research → first use → impact stories | Asks once for a shorter answer, then records |
| `deep_search.py` | Twice-yearly worldwide, multi-language search | Same QA and gates |

## 6. Workflows (GitHub Actions)

| Workflow | When | What |
|---|---|---|
| `data-agents.yml` **Weekly data agents** | Mon 05:17 UTC, safety net 09:47 (only if the first did not run); by hand | check → research, Gemini, QA, second opinion, guidance, security response, tours, levers, stories → Gate 1 (schema), Gate 2 (change guard), build, Gate 3 (smoke) → narration check and review → rebuild and Gate 3 → build AI version → voice → publish (tag) → digest issues |
| `ui-agent.yml` **AI-enhanced version (weekly)** | Wed 05:23 UTC, safety net 09:53; by hand (dry run by default) | check → improve (Claude Code on the `experimental` branch, guard, full tests, screenshots, commit) → publish `/ai/` → summary issue |
| `build.yml` **Build the app** | Every push to main; by hand | build both versions, checks, smoke test, publish `index.html` |
| `deep-search.yml` **Deep search** | 1 January and 1 July 04:41 UTC; by hand | worldwide search, QA, gates, publish |
| `tests.yml` **Test suite** | By hand only | the full test rig on GitHub |

- **Switches:** repository variables `AGENTS_ENABLED` (data agents and deep search) and `UI_AGENT_ENABLED` (AI-enhanced
  agent) must be `true` for schedules; manual runs always work. Set `false` to stop a schedule.
- **Schedules start late:** GitHub can delay scheduled runs by hours at busy times (seen: a 05:23 slot running at 13:00).
  Off-the-hour times plus a safety-net slot cover drops; the `check` job prevents double runs.
- **Never blocks publishing:** voice, the AI-version build, and the narration check/review are `continue-on-error`.

## 7. Access and credentials (names only; values live in GitHub)

- **Ruleset "Protect main":** only Repository admin and the `research-gap-publisher` app can update `main`.
- **GitHub App `research-gap-publisher`** (Contents only): every publish step. Secrets `PUBLISH_APP_ID`, `PUBLISH_APP_PRIVATE_KEY`.
- **GitHub App `research-gap-ui-agent`** (Contents, Issues, Pull requests; **no** Workflows): the weekly Claude Code
  agent, which can only push the `experimental` branch. Environment `ui-agent` holds `CLAUDE_UI_API_KEY`, `UI_APP_ID`,
  `UI_APP_PRIVATE_KEY`.
- **Other secrets:** `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `TTS_API_KEY` (Azure Speech). **Variables:**
  `AGENTS_ENABLED`, `UI_AGENT_ENABLED`, `TTS_REGION` (uksouth), `AGENT_MODEL` (optional).
- **Labels:** `experimental-idea` issues feed the weekly agent's ideas.

## 8. Narration, voice and the quality chain

1. Templates in `data/tours.json`; the app fills `{placeholders}` from live figures (`31e`, `31-welcome`).
   Figures must come from the **same calculation and rounding** as the panel the step shows.
2. `tour_rules.py` (code) checks every template; the tour agent and narration review must pass it.
3. `tools/narration_check.py` plays the `cleanweek` and `week` tours headless; every spoken number must be on screen.
   Output in `.narration/` (git-ignored).
4. `agents/narration_review.py` reviews each step with its screenshot; report appended to the weekly digest.
5. `tools/make_voice.py` records changed sentences in Azure `en-GB-SoniaNeural`, keyed by a hash of the exact text,
   and **freezes** each step's exact text in `audio/manifest.json` with the data revision and tours version. The app
   speaks the frozen text while both match, so subtitles, voice and figures agree; otherwise it falls back to the
   browser's voice.

## 9. How changes reach GitHub (the release routine)

Stuart uploads through GitHub's web interface. For every change:

1. Work on a clone of `main`; compare file hashes with a fresh clone to find **only the changed files**.
2. Package them as a zip that keeps the folder structure (e.g. `researchgap-vX.Y-upload.zip`); Stuart unzips and
   drags the folders into **Add file → Upload files**, choosing **Commit directly to the main branch**.
3. Files under `.github/` are **never** in the zip: send them separately; Stuart replaces them by hand. If only `index.html` changed, send that one file.
4. `data/tours.json` changes weekly: re-check against the latest GitHub copy before shipping and rebase if needed.
5. Hidden files (`.gitignore`) don't show after unzipping on a Mac (Cmd+Shift+.) or Windows (View → Hidden items).
6. Bump `APP_VERSION` (`src/js/01-…`), `DOCS_UPDATED` and add a changelog line (`src/js/31f-…`) for any app change.
7. After upload, `build.yml` rebuilds `index.html` automatically.

## 10. Testing

**Use the portable rig:** `python tests/rig.py doctor | setup | quick | [all|agents|browser|<suite>…]`.
It finds a working Chromium, builds, checks the built script's syntax with Node, runs `tests/run_tests.py`, reruns
failures alone to separate **flaky** from **broken**, and writes `tests/_last_run.txt`.

| Suite | Covers |
|---|---|
| `agents` (`tests/agent_tests.py`) | 40 offline checks of the agents' guardrails with simulated answers (no API calls) |
| `ai_build`, `ai_guard`, `ai_version` | The AI-version builder's forbidden-code checks, the weekly guard, the AI version in the browser (every experimental chart must draw) |
| `capabilities` | Toolbar, Present, Share, Views menus |
| `chart_windows` | Chart windows, linking, saving |
| `functions` | ~67 filters, display settings and windows (its frame-rate line counts as an entry: "67 of 68" is normal) |
| `insights_welcome` | Doors, carousel, questions, insights, speech, tours |
| `inspector_docs`, `my_file_views`, `real_clicks`, `reviews`, `settings_roundtrip` | Data inspector and docs; My file; real mouse clicks; reviews and admin decisions; 177 settings survive a save |
| `popouts` | Empty placeholder (pop-outs were replaced) |

The AI-version suites need `experimental/`, which lives on the `experimental` branch; on a `main` checkout the rig
borrows it for the run and removes it afterwards (and restores `ai/`, which those suites rebuild). A full run takes
15–25 minutes. Suites address the app through a test hook `window.__getT()` injected by
`run_tests.py`. The weekly AI agent runs the full rig before publishing.

## 11. Working conventions

- **Language:** British English, plain short sentences, sentence case. Name things as the app does: milestone,
  AI for clean energy, the AI Energy Vision Radar, panel, Views.
- **Honesty:** no typed figures in narration; proxies always labelled; "so far", "in this data".
- **Accessibility:** contrast in both themes, labels on controls, 390 px phones, reduced motion respected.
- **Code comments:** a `//` comment runs to the end of the line, so never put code after one; for a comment beside
  code use `/* … */`. The rig's Node syntax check catches the usual result.
- **Documentation travels with code:** update this file, the in-app docs and changelog, and the README when behaviour
  changes.
