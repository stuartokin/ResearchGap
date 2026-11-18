# AI by readiness

**What it shows:** the clean energy technologies in the data (those in an AI for clean energy area), how many are at
each stage of readiness (research, pilot, first commercial use, at scale), and how many of those are AI-driven. Two
views:

- **By stage** (the default): one bar per stage. The bar's length is how many technologies are at that stage; the
  purple part is the AI-driven ones. Beside it: "*n* of *m* AI-driven" and the share.
- **By area**: a grid with a row for each AI for clean energy area (system optimisation and operation; asset
  planning, operation and maintenance; end-use efficiency and demand; energy innovation and R&D; security, assurance
  and governance) and a column for each stage. Each cell reads "AI-driven / all"; a darker cell holds more
  technologies. The last column and the bottom row give the totals.

**How to use it:** open Charts, choose the ✨ AI by readiness tab. Use "By stage" or "By area". Select a bar, a cell
or a total to list its technologies in the side panel, AI-driven first (marked with a purple dot); select one to
open its story. Bars and cells are buttons, so they work with the keyboard and a screen reader. It follows your filters.

**Insight:** compares the AI-driven share at scale with the share still in research, then names the AI for clean
energy area with the most technologies in use so far (at first commercial use or at scale) and how many. Every
figure comes from the data. A tie goes to the area listed first.

**Honesty:** readiness, area and whether a technology is AI-driven are AI-compiled from public sources and may be
wrong. Counts are "in this data", not of the whole field.

**Why it was added:** the sample feature that proves the AI-enhanced version works end to end (added by hand on
2 November 2026). **Updated 18 November 2026** by the weekly agent: the chart only showed four bars, and gave no way to see
*which kind* of AI for clean energy is furthest along. The "By area" grid answers that, and the bars became
keyboard-friendly buttons with their shares shown. The bars keep `data-xact="stage"`, which the app's own tests use.
