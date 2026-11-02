# The Shrinking Gap from Research to Change: rules for Claude Code

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
