# The Shrinking Gap from Research to Change: read this first

Two kinds of Claude work in this repository. **Find yours, and follow only that part.**

- **A. The weekly experimental agent** (Claude Code, run by `.github/workflows/ui-agent.yml` on Wednesdays):
  follow **Part A** only. Part B does not apply to you, and gives you no permission to change anything outside
  `experimental/`.
- **B. A development session with Stuart** (claude.ai, the Claude app or Claude Code on his machine): read **Part B**,
  then the knowledge base.

---

# Part B. Development sessions: start here

You are picking up a live project with no memory of earlier conversations. Everything you need is in the repository.

**Read, in this order (about ten minutes):**
1. `docs/KNOWLEDGE_BASE.md`: what the app is, the repository map, the data, the agents, the workflows, credentials,
   narration, the release routine and the tests.
2. `docs/ROADMAP.md`: where things stand, what to watch, what is next.
3. `docs/LESSONS.md`: mistakes already made once. Don't repeat them.
4. The top of the in-app changelog in `src/js/31f-inspector-and-docs.js` (search `doclist`) for the latest version.

**Before changing anything:**
- Get the current code: `git clone https://github.com/stuartokin/ResearchGap` (the sandbox cannot use GitHub's API
  reliably; cloning works). The `experimental/` folder lives on the `experimental` branch.
- Check the machine and run the quick tests: `python tests/rig.py doctor`, then `python tests/rig.py quick`
  (about a minute). Use `python tests/rig.py setup` if anything is missing.
- Ask Stuart for logs or screenshots of GitHub Actions pages rather than guessing what happened in a run.

**While working:**
- Edit `src/`, never the built `index.html` or `ai/`. Rebuild with `python tools/build.py`.
- Run the suites your change touches (`python tests/rig.py <suite> …`), then the full rig before packaging
  (`python tests/rig.py`, 15–25 minutes). A suite reported FLAKY passed alone: note it, don't ignore it.
- Keep honesty rules: figures in narration only through `{placeholders}`; proxies labelled; "so far", "in this data".
- British English, plain short sentences. Mock up interface changes (laptop and phone) before coding them.

**When you finish (the release routine, details in the knowledge base, section 9):**
- Bump `APP_VERSION` (`src/js/01-…`), `DOCS_UPDATED` and the changelog (`src/js/31f-…`) for app changes.
- Pull first and re-check `data/tours.json` (the agents change files on `main` every week), then commit and push
  straight to `main` yourself, `.github/` included. No zips (see the working standard below).
- **Update the docs:** `docs/KNOWLEDGE_BASE.md` where behaviour changed, `docs/ROADMAP.md` (status, done, next), and
  `docs/LESSONS.md` if something went wrong that the next session should know. Push them in the same commit.

**Written content** (articles, posts) uses the byline *Stuart Okin* and always says the app is a personal
project, written in a personal capacity. Never name his employer or job title.

*(Part B sessions only. The weekly agent in Part A ignores this block and keeps to `experimental/`.)*

<!-- STANDARD:BEGIN v1 — the same block is in every one of Stuart's repos. Master copy:
     stuartokin/stuartokin.github.io docs/STANDARDS.md. Change it there, then everywhere. -->
## Working standard (all of Stuart's repos)

**Stuart** owns this. British English; short, plain replies. He does not read or edit code:
you make every change, test it, push it, and tell him what to check. Plan first for big
things; when he says "go ahead", build without further proofs.

**Personal capacity.** Never name his employer or job title anywhere: pages, docs, commit
messages, articles. Byline: *Stuart Okin*. Where a disclaimer is needed: *"Written in a
personal capacity and do not represent the position of any organisation I am engaged with."*
Citing an organisation as a source is fine.

**Delivering changes.** Commit and push straight to `main` yourself. Don't send zips or ask
him to upload; older instructions in this repo that say so are superseded. Before anything
major (deleting or restructuring, rewriting a core file, changing workflows or agents,
migrating data) push a backup tag first:
`git tag backup/YYYY-MM-DD-<what> origin/main && git push origin backup/YYYY-MM-DD-<what>`.
To undo, reset `main` to that tag; say in your reply that a backup exists. Never commit
secrets: keys live only in GitHub secrets.

**Tests.** Run the repo's tests before every push; all must pass. Fix a bug, add a check so
it stays fixed. If the repo has no tests yet, add at least a smoke test the next time you
change it.

**Automation.** Any workflow that runs on its own (schedule, issues, comments, other
workflows) must start with the kill-switch `switch` job, reading `automation.json` here and
the master in stuartokin.github.io (see its docs/KNOWLEDGE-BASE.md §15). Don't add an AI
agent without saying what it costs, what it can change and how to switch it off.

**"Wrap up".** When Stuart says "wrap up", and before you finish any session that changed
something:
1. Run the tests; fix or report any failure.
2. Update the docs: how the app works (knowledge base or handover), `LESSONS` (what went
   wrong or surprised you), `ROADMAP` (done, next, open questions for Stuart, decisions with
   dates) and `CHANGELOG` (bump the version if the app changed). Create them if missing.
3. If a lesson would help the other repos, add it to `docs/SHARED-LESSONS.md` in
   stuartokin.github.io.
4. Commit and push to `main` (backup tag first if major). Check the deploy or workflow run.
5. Reply with what changed, the version, what was and wasn't tested, a short numbered list of
   things for Stuart to try, and anything waiting on him.

A new session must be able to carry on from the repo alone. If it couldn't, the wrap-up
isn't done.
<!-- STANDARD:END -->

---

# Part A. The weekly experimental agent: rules for Claude Code

This repository is a public, personal project by Stuart Okin: a 3D, data-driven app about how long research takes to
become real-world change, maintained by AI agents from public sources. Claude Code works here only as the
**experimental interface agent**, which improves the **AI-enhanced version** (published at `/ai/`) each week.

## The one rule that matters most

**Change only files inside `experimental/`** (and scratch files inside `.ai-run/`, which are never published).
Never change `src/`, `data/`, `agents/`, `tools/`, `tests/`, `audio/`, `.github/`, `index.html`, `ai/`, this file or
the skill. A check after every run rejects the whole week's work if anything outside `experimental/` changed, and
GitHub itself refuses any change to the main branch or the workflows from this agent.

## What the AI-enhanced version is

The standard app plus experimental features. Features live in `experimental/features/<id>/` and plug in **only**
through the extension interface `SGX`, documented in `experimental/README.md`. They can add chart tabs (with an
insight), panels and styles, and read the milestones, fortunes and filters. They cannot change the data or the
app's own code.

## Hard limits (checked by `tools/build_ai.py` on every build; a breach leaves the feature out)

- No network access, no running code from text, no loading other code, no script tags.
- No browser storage, cookies, navigation, outside addresses, outside styles or images, workers or messages.
- Never refer to or affect the AI notices (the banner, the disclaimer, the acknowledgement) or the app's internals.
- Size: 40 KB of code and 15 KB of styles per feature; 200 KB in all.
- Every feature has a `README.md`; every feature is in `experimental/manifest.json`.

## Honesty rules (the same as the rest of the app)

- **Never type a figure into an insight.** Every number comes from the data through a `{placeholder}`; the
  interface refuses an insight template containing a typed number.
- Say only what the data supports; prefer "so far" and "in this data" to sweeping claims.
- The data is AI-compiled from public sources and may contain errors; do not present it as authoritative.
- No political opinions, no claims about named people beyond what the data says, no marketing language.

## Style

- British English. Plain, short sentences. Name things as the app does: "milestone", "AI for clean energy",
  "the AI Energy Vision Radar", "panel", "Views".
- Accessible: readable contrast in light and dark, labels for anything interactive, works on a phone (390 px wide).
- Fast: features run on every redraw; keep them light.

## Documentation is part of the work

A run that changes a feature must also update its `README.md`, `experimental/manifest.json` (description, date
added or `updated`) and add an entry at the top of `experimental/WHATS_NEW.md`. A run that changes code without
these fails its checks.

## How to work each week

Follow the skill `improve-experimental` (`.claude/skills/improve-experimental/SKILL.md`).

## Kill switch

`automation.json` at the top of this repo switches its automatic workflows off
(`"paused": true`) or on (`false`). The master switch for every repo is
`automation.json` in `stuartokin/stuartokin.github.io`. Each automated workflow
starts with a `switch` job that reads both; keep it when editing workflows, and
add it to any new scheduled or agent workflow. Manual "Run workflow" runs and
pushes always go ahead.
