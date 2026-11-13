# Roadmap

What is done, what to watch, and what comes next. Update it at the end of every working session: tick items off,
move them between sections, and add new ones with a date.

*Last updated: 13 November 2026 (app 13.4, data revision 37).*

## Where things stand

- **Both weekly pipelines are running on their schedules**, sometimes hours late (data revision 37 on Mon 9 Nov;
  the AI-enhanced version published on Wed 11 Nov).
- **The AI-enhanced version has four experimental features:** AI by readiness (sample), AI in Great Britain, Security
  timeline, Coming next.
- **The security-response agent is working through recent technologies** (20 a week, most recent first; 88 arrived
  since 2018). Until most are researched, the security lag is mostly proxies, and the narration says so.
- **Narration quality chain in place since 13.4:** code check, review agent, frozen texts with recordings.
- **Portable test rig added** (`tests/rig.py`), with this knowledge base, lessons and roadmap.

## Watch (check after the next runs)

- [ ] **Narration review's first digest sections:** are its rewrites good? Is anything flagged every week?
- [ ] **Security-response progress:** researched count rising, open gaps plausible; when researched responses
      outnumber proxies, the narration switches from the proxy wording automatically. Then reconsider the Security
      lag chart's default (e.g. *Researched only* on).
- [ ] **Gemini research:** does it now contribute candidates each week (reasoning budget and salvage, 12.9)?
- [ ] **Schedule delays:** if a slot and its safety net are both missed twice, add an outside trigger (a free cron
      service calling GitHub's "run workflow" API with a token limited to these two workflows).
- [ ] **Flaky checks:** capabilities P3 (Rotating chip) and S1 (Excel save) under full-run load. Make them wait for
      their result if they recur.

## Next (agreed or clearly useful)

1. **Expose security fields to experimental features** (`SGX` items: `security.response`, `expandsAttackSurface`),
   as the weekly agent asked (idea #36). Small change in `31l-extensions.js`, its docs, and `experimental/README.md`.
2. **Upgrade GitHub actions off Node 20:** `actions/create-github-app-token` and `actions/upload-artifact` to their
   current major versions, in all workflows (by hand).
3. **Screenshots of new experimental charts at phone width** in `tools/screens_ai.py` (the agent noted it cannot see
   its charts on a phone).
4. **Tidy issues:** weekly digests and AI summaries accumulate (44+ open). Close the previous digest automatically
   when a new one is opened.
5. **Refresh the tests README** around the portable rig; remove the empty `popouts` suite.
6. **Ideas for the weekly agent:** keep a few `experimental-idea` issues open so it builds what is wanted.

## Later

- Score the model's own forecasts as their years pass (forecast drift exists; a public accuracy score does not).
- An accuracy page: disputed and corrected records over time, by source type.
- Move root media files (`QDayIntro.mp4`, `cae_cover_16x9.mp4`, music, `sample-report.pptx`) into a `media/` folder.
- Deep search runs on 1 January: check its results and costs.
- Refresh the internal article's figures before it is sent (they move weekly).

## Done (most recent first)

| Version | Date | What |
|---|---|---|
| — | 13 Nov | Knowledge base, lessons, roadmap, read-first `CLAUDE.md`, portable test rig; Test suite workflow runs the rig (AI suites now pass on main) |
| test fix | 4 Nov | Runner refuses unknown suite names; AI-version tests address features by name and check every chart |
| 13.4 | 3 Nov | Narration check and review agent; frozen narration with recordings; tour figures match panels; no menu flashing |
| 13.3 | 2 Nov | Honest security lag (researched vs proxy); security-response agent |
| 13.2 | 2 Nov | Orbit carousel |
| 13.1 | 2 Nov | Tiles or carousel; Tours into Help; Questions menu replaces the Views entry |
| 13.0 | 2 Nov | Welcome doors (Learn, Ask, Explore), moving tile pictures, Home, breadcrumb, calm arrival |
| 12.9 | 2 Nov | Gemini reasoning budget and salvage; 1925 floor for gap-filling; guidance rejections remembered |
| 12.8 | 2 Nov | Off-the-hour schedules with safety nets; `UI_AGENT_ENABLED` |
| 12.0–12.7 | Oct–Nov | Toolbar, My file and views, chart windows, questions and insights, AI-enhanced version, weekly Claude Code agent, protected main |
