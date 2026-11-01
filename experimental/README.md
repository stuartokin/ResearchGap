# The experimental area (AI-enhanced version)

This folder holds the **experimental features** of the AI-enhanced version of The Shrinking Gap, published at
`/ai/`. The AI-enhanced version is the standard app plus these features. The standard version never includes them.

From Phase 2, an AI agent (Claude Code, using Claude Opus) adds and improves features here each Wednesday, after
automatic checks, without human review. Until then, it holds one sample feature added by hand.

## What is here

- `manifest.json`: every feature, with its id, title, description, date added and status (`active` or `paused`).
- `WHATS_NEW.md`: what the AI-enhanced version's “What's new” shows; the newest entry first.
- `features/<id>/feature.js`: the feature's code. It runs with one object, `SGX` (the extension interface).
- `features/<id>/style.css`: optional styles.
- `features/<id>/README.md`: required. What the feature shows, how to use it, and why it was added.

## The extension interface (SGX, version 1)

- `SGX.registerChart({id, name, note, render, onAction, insight})` adds a chart tab to every chart window.
  `render({width, height, fontSize, items, panel, esc})` returns SVG or HTML. An element with `data-xact` and
  `data-xval` calls `onAction(action, value, SGX)` when selected. `insight: {say, facts}` gives the chart an insight:
  `say` is a template whose every figure is a `{placeholder}`; `facts(SGX)` returns the values. A template with a
  typed number is refused.
- `SGX.addPanel({id, title, render})` adds a panel (Views, Panels, AI-enhanced); `render(SGX)` returns HTML and is
  redrawn when the filters change. `SGX.open(panelId)` opens it.
- `SGX.addStyles(css)`, `SGX.on('filters' | 'ready', fn)`, `SGX.toast(message)`, `SGX.esc(text)`.
- Reading the data (read-only): `SGX.items()` (the milestones the filters show), `SGX.allItems()`, `SGX.fortunes()`,
  `SGX.filters()`, `SGX.fieldName(field)`. Each milestone has `id, title, field, fieldName, origin, kind,
  researchYear, changeYear, stage, gb, cleanEnergyArea, aiDriven`.
- `SGX.openStory(id)` opens a milestone's story; `SGX.panel(title, html)` fills the chart window's side panel.

## What is not allowed (checked on every build)

Network access, running code from text, loading other code, script tags, browser storage, navigation, outside
addresses or styles, restricted browser features, and anything referring to the AI notices or the app's internals.
Size limits: 40 KB of code and 15 KB of styles per feature, 200 KB in all. A feature that breaks a rule is left out;
one that fails when loaded is paused; anything that would hide the banner fails the whole build, and last week's
version is kept.
