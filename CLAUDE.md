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
- Send **only the changed files** as a zip that keeps the folder structure; `.github/` files separately, replaced by
  hand; just `index.html` if that is all that changed. Re-check `data/tours.json` against GitHub first.
- **Update the docs:** `docs/KNOWLEDGE_BASE.md` where behaviour changed, `docs/ROADMAP.md` (status, done, next), and
  `docs/LESSONS.md` if something went wrong that the next session should know. Ship them in the same zip.

**Written content** (articles, posts) uses the byline *Stuart Okin, Director of Cyber Regulation and Emerging
Technologies, Ofgem*, and always says the app is a personal project, not an Ofgem view.

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
