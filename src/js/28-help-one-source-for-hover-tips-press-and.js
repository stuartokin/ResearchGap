/* ==================================================================
 *  HELP: one source for hover tips, press-and-hold on touch screens, and the FAQ in Help
 * ================================================================== */
const HELP = {
  // Filters
  q:'Type words to show only milestones whose title, company or descriptions contain them.',
  fieldList:'Tick fields to show them. “Only” shows just that field; with a single field you can split it into sub-field tracks.',
  compactT:'Removes the tracks of fields or sources you have deselected, so the remaining tracks spread out to use the space.',
  subLanesT:'When exactly one field is selected, gives each of its sub-fields its own track and shade of colour.',
  subChips:'Show or hide individual sub-fields of the selected field. Counts show how many milestones each holds.',
  srcChips:'Where the research began: universities, industry labs, or government and publicly funded labs.',
  regionChips:'The country or region where the research began. “Many countries” marks work with no single origin.',
  uniOnlyT:'Shows only ongoing university projects, marked with a gold ring.',
  catChips:'Research breakthroughs run from first research to first use. Company products run from founding to first release.',
  kindChips:'Landed: already reached real-world use. Next ten years: AI estimates. Still in the lab: no reliable date yet.',
  majT:'Shows only the landmark milestones, such as the transistor, the web and mRNA vaccines.',
  confChips:'How confident the dates are. Low-confidence records are often approximate or contested.',
  verChips:'Source-cited records link to a checked source; AI-compiled ones come from standard references; AI estimates are forward-looking guesses.',
  tagChips:'Topics cut across fields, such as storage, grid or cryptography. Pick some to show only those.',
  fromR:'Shows milestones whose research began in or after this year.',
  toR:'Shows milestones whose research began in or before this year.',
  gapR:'Hides milestones whose gap from research to change is longer than this.',
  visT:'Shows only milestones linked to an area of the AI for clean energy.',
  stageChips:'How ready each technology is: research, pilot or demonstration, first commercial use, or at scale.',
  gbOnlyT:'Shows only technologies already deployed in Great Britain.',
  attackT:'Shows only technologies that add new ways to attack systems, such as connected devices or AI agents.',
  gapOnlyT:'Shows technologies that arrived from 2010 and at least three years ago, with no security response in their category since.',
  ghostT:'Keeps filtered-out arcs as faint outlines, for context.',
  resetFilters:'Puts every filter back to its default.',
  // Display
  labelSeg:'Off hides labels. On arcs puts each label at the top of its arc. Follow lights moves labels with the travelling lights.',
  labelScopeSeg:'Label every shown arc, or only major milestones.',
  lfsR:'Text size of the labels in the model.',
  labelMaxR:'Caps how many labels show at once. The newest landings and major milestones win.',
  majBrightT:'Makes major milestone labels brighter and bolder than the rest.',
  playFromS:'The year Play starts from. The button title changes to match.',
  playToS:'The year Play stops at. “Whole century” resets both years.',
  loopD:'Starts Play again from the beginning when it reaches the end.',
  countdownT:'Shows a 3, 2, 1 countdown before Play starts.',
  conclT:'Shows the headline finding in a banner when Play reaches the end.',
  labelPlaySeg:'During Play: keep labels on, show each label until its arc lands, or flash a label as each arc lands.',
  lingerR:'How long a label stays after its arc lands during Play.',
  travelPreset:'One click to set the camera travelling with time, with labels and fading tuned for a journey.',
  camSeg:'Keep the camera still, or let it ride along the timeline as Play runs.',
  fadeSeg:'Keep landed arcs on screen, or fade them after a few years to reduce clutter.',
  keepR:'How many years landed arcs stay before fading, when fading is on.',
  revealT:'At the end of a journey, pulls the camera back to show the whole century.',
  laneFollowT:'Keeps track names next to the camera while it travels.',
  laneSeg:'Arrange tracks by where the research began, or by field.',
  colSeg:'Colour arcs by where the research began, or by field.',
  paletteS:'Colour-blind safe uses a palette that stays distinct for the common types of colour blindness.',
  adoptT:'Shows a second, thinner arc from first product to mainstream adoption.',
  uniHiT:'Marks ongoing university projects with a gold ring and a mortarboard on the label.',
  pulseT:'Lights that travel along arcs as they are drawn.',
  trendT:'Lines joining the median gap in each era for each track.',
  floorT:'Year and track names on the floor of the model.',
  chgFlagSeg:'Highlight milestones the data agents have added (New only) or added and corrected (All changes).',
  chgScopeSeg:'Highlight changes everywhere, or only those linked to AI for clean energy.',
  chgSinceS:'How far back highlighted changes go.',
  chgAnnounceT:'Shows a banner when Play reaches the year of a changed milestone.',
  rotR:'How fast the model turns when auto-rotate is on.',
  glowR:'Strength of the glow around arcs and lights.',
  liteT:'Turns off glow and window blur and lowers resolution. Use it on slower laptops.',
  titleShowT:'Shows or hides the page title in the top-left corner (T key).',
  barAutoT:'Hides the toolbar buttons until the mouse moves near them.',
  thanksIconT:'Shows the speech-bubble button that opens the thank-you screen (Q key).',
  fullTextT:'Long explanations in windows show their first few words and an i button for the rest. Switch this on to always show the full text.',
  flashNewT:'A newly opened window glows briefly and comes to the front, so it is easy to spot on a busy screen.',
  expCsv:'Downloads the milestones as a CSV file, which opens in Excel or any spreadsheet. Tick "Only the current selection" to follow your filters.',
  expXlsx:'Downloads an Excel workbook with three sheets: the milestones, the fortunes, and a note about the data. Tick "Only the current selection" to follow your filters.',
  imgBtn:'Saves a picture of the model as it is now, with its labels, a title, the current verdict and the attribution, as a PNG file.',
  smartPlaceT:'When you open a window, it is placed in free space where possible, without covering other windows or the centre of the model.',
  keepPosT:'Windows keep their distance from the nearest edges when the screen size changes, such as leaving full screen.',
  fitLoadT:'When opening a view saved on a different screen size, brings every window fully into view.',
  copyLinkBtn:'Copies a web link that reopens this view with your filters and key settings.',
  // Toolbar
  playBtn:'Plays the timeline from the first year to the last (or your chosen range). P key.',
  thanksBtn:'Opens the thank-you and questions screen. Q key.',
  ideasBtn:'Add your own milestones by hand, with an icon, description and source.',
  musicBtn:'Starts or stops the background music.',
  winBtn:'Open, close and arrange windows, or save and load a view.',
  rotBtn:'Turns the model slowly. Drag the model to look around.',
  resetBtn:'Reloads the app with its default settings.',
  fsBtn:'Uses the whole screen.',
  toursBtn:'Reopen the welcome screen with the one-minute guided walk-throughs.',
  aboutBtn:'Help, frequently asked questions and information about the data.'
};
const FAQ_EXTRA = [
  ['Getting started', [
    ['What am I looking at?', 'Each arc is one breakthrough. It rises from the year the research began and lands when it first reached real-world use. A thinner arc carries on to mainstream adoption. The height of an arc is the gap in years.'],
    ['How do I explore?', 'Drag to rotate, scroll or pinch to zoom, right-drag to pan. Click an arc or label for its details. Use Filters to narrow the view and Windows to open more panels.'],
    ['What are arrangements?', 'Ready-made window layouts under Windows: Exploring (the default), Play the century, Waiting (a kiosk mode with videos and the ticker), Analysis and AI for clean energy. Each adapts to phones, tablets, laptops and large screens.']]],
  ['Windows', [
    ['Key findings', 'The headline numbers and a chart by field. Follows your filters.'],
    ['Summary', 'Median years from research to change in a table. Choose the measure, group by the year a milestone landed or the year research began, and show rows by source, field or region. With one field selected, rows show its sub-fields.'],
    ['Gap over time', 'The median gap for milestones landing in each preceding ten years, with a scenario beyond today.'],
    ['Can AI shrink the gap?', 'For each field, the recent gap and a plausible range with AI and digital twins. Scenario assumptions, not forecasts.'],
    ['Time to a fortune', 'How long founders took to make a fortune, with net worths and their dates. Refreshed monthly by the agents.'],
    ['AI for clean energy', 'Milestones grouped by the five areas of the vision, with what is already helping, what is still to land and recent data changes.'],
    ['Data changes', 'Every change the data agents have made, newest first, with search and filters.'],
    ['Data quality', 'How much of the data is source-cited, coverage of adoption years and regions, and agent costs.'],
    ['Table of milestones', 'Every milestone in a sortable table. Click a heading to sort and a row to open it.'],
    ['Your milestones', 'Add your own milestones by hand. They appear as bright arcs and can be saved to a file.'],
    ['PowerPoint report', 'Creates a three-slide report with editable charts from your current filters.'],
    ['Vision radar', 'For each area of AI for clean energy (the five areas of DESNZ’s Vision for an AI-enabled clean energy system): readiness of its technologies, how many are deployed in GB, what is new since your last review, and what is coming in the next five years.'],
    ['Cyber lens', 'Technologies that expand the attack surface, possible mitigations mapped to the NCSC CAF, Ofgem’s CAF Overlay, NIST, NERC CIP, IEC 62443 and ISO/IEC (AI research: engage experts), how long security responses took to follow in their category, and open gaps with no response yet.'],
    ['Walk-throughs (Tours)', 'Five one-minute guided tours. They are fully AI-generated: AI agents write and update the narration every week from their own findings, within fixed rules, and an AI voice speaks it. No person reviews them, so check anything important against the sources.'],
    ['Where does the data come from?', 'Only from publicly available sources: published research, company and product announcements, official publications and reputable news. The agents search the open web and record a link for every source; no confidential, non-public or regulatory information is used. Each record says whether it is source-cited, AI-compiled or an AI estimate.'],
    ['Kiosk mode', 'An unattended loop for stands and waiting areas: it plays the walk-throughs and arrangements in turn, with AI narration, music or silence, the ticker on or off, and a QR code to the site. Visitors can explore at any time; it resumes after a minute without a touch. Only Escape works on the keyboard, and it leaves kiosk mode. Start it from the welcome screen or the Windows menu.'],
    ['Ticker', 'A scrolling line of news (new milestones, click one to open it), jokes, or both. Choose in its Settings.']]],
  ['Data and agents', [
    ['Where does the data come from?', 'Two AI agents run every week. One looks for new breakthroughs and products; the other independently checks them and re-checks older records before anything is published.'],
    ['How reliable is it?', 'New items need two independent sources that the code reads itself, and corrections need quoted evidence. Every record shows whether it is source-cited, AI-compiled or an AI estimate. It may still contain errors.'],
    ['What do NEW and UPDATED mean?', 'Badges on labels for milestones the agents added or corrected recently. Click a highlighted label to open its details. Choose what is highlighted in Display, Data changes.']]],
  ['Saving and sharing', [
    ['How do I save my layout?', 'Windows, then “Save this view to a file”. It keeps windows, positions, filters and settings. Load it again from the same menu, or open index.html?view=yourfile.json.'],
    ['How do I share a view?', 'Display, Presenting, “Copy a link to this view”, or the same option in Windows.']]],
  ['Keyboard shortcuts', [
    ['Keys', 'P play, Space pause, ] and [ next and previous milestone, 1–9 a single field, 0 all fields, L labels, M toolbar, T page title, Q thank you, R reset camera, H hide windows, Escape close overlays.']]]
];
function helpLabel(id){
  const el = $(id); if (!el) return id;
  const row = el.closest('.toggle, .slider, .af') || el;
  const t = (row.querySelector('label') || row).textContent.replace(/\s+/g, ' ').trim();
  return t.replace(/\s*\d+(\.\d+)?\s*(s|years)?\s*$/, '').replace(/ Any$| All$/, '') || id;
}
function attachHelp(){
  Object.entries(HELP).forEach(([id, txt]) => {
    const el = $(id); if (!el) return;
    const row = el.closest('.toggle, .slider, .af, .prange') || el;
    row.dataset.help = txt; if (!row.title) row.title = txt;
    if (el !== row && !el.title) el.title = txt;
  });
  document.querySelectorAll('#winMenu [data-w]').forEach(b => { const id = b.dataset.w; if (WIN_NAMES[id]) { const f = FAQ_EXTRA[1][1].find(x => x[0] === WIN_NAMES[id]); if (f) b.title = f[1]; } });
}
/* press and hold on touch screens shows the help text */
let holdTimer = 0, holdFired = false;
document.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'touch') return;
  const row = e.target.closest('[data-help], [title]'); if (!row) return;
  holdFired = false; clearTimeout(holdTimer);
  holdTimer = setTimeout(() => { holdFired = true; toast(row.dataset.help || row.title); }, 550);
}, true);
['pointerup', 'pointercancel', 'pointermove'].forEach(ev => document.addEventListener(ev, e => { if (ev !== 'pointermove' || Math.abs(e.movementX) + Math.abs(e.movementY) > 6) clearTimeout(holdTimer); }, true));
document.addEventListener('click', e => { if (holdFired) { holdFired = false; e.preventDefault(); e.stopPropagation(); } }, true);
/* the FAQ in Help */
function buildFaq(){
  const groups = [['Filters', 'w-filters'], ['Display', 'w-display'], ['Toolbar', 'w-toolbar']].map(([name, win]) => [name, Object.entries(HELP).filter(([id]) => $(id) && $(id).closest('#' + win)).map(([id, txt]) => [helpLabel(id), txt])]);
  const all = FAQ_EXTRA.slice(0, 2).concat(groups).concat(FAQ_EXTRA.slice(2));
  $('faq').innerHTML = all.map(([g, list]) => `<details class="faqg"><summary>${g} <span>${list.length}</span></summary>${list.map(([q, a]) => `<div class="faqi"><b>${esc(q)}</b><p>${esc(a)}</p></div>`).join('')}</details>`).join('');
}
$('faqQ').addEventListener('input', () => {
  const q = $('faqQ').value.trim().toLowerCase();
  document.querySelectorAll('#faq .faqg').forEach(g => {
    let any = false;
    g.querySelectorAll('.faqi').forEach(i => { const hit = !q || i.textContent.toLowerCase().includes(q); i.style.display = hit ? '' : 'none'; any = any || hit; });
    g.style.display = any ? '' : 'none'; g.open = !!q && any;
  });
});
$('faqQ').addEventListener('keydown', e => e.stopPropagation());
/* collapsible sections in Filters and Display, remembered in saved views */
function syncPanels(){
  view.panels = view.panels || {};
  ['filters', 'display'].forEach(w => {
    const st = view.panels[w] || {}, secs = wins[w].querySelectorAll('.psec');
    secs.forEach((d, i) => { const want = st[d.dataset.sec] != null ? st[d.dataset.sec] : i === 0; if (d.open !== want) d.open = want; });
    const anyClosed = [...secs].some(d => !d.open);
    const b = wins[w].querySelector('[data-pexp]'); if (b) b.textContent = anyClosed ? 'Expand all' : 'Collapse all';
  });
}
['filters', 'display'].forEach(w => {
  wins[w].querySelectorAll('.psec').forEach(d => d.addEventListener('toggle', () => { view.panels = view.panels || {}; view.panels[w] = view.panels[w] || {}; view.panels[w][d.dataset.sec] = d.open; const secs = wins[w].querySelectorAll('.psec'); wins[w].querySelector('[data-pexp]').textContent = [...secs].some(x => !x.open) ? 'Expand all' : 'Collapse all'; }));
  wins[w].querySelector('[data-pexp]').addEventListener('click', () => { const secs = [...wins[w].querySelectorAll('.psec')], open = secs.some(d => !d.open); view.panels = view.panels || {}; view.panels[w] = {}; secs.forEach(d => { d.open = open; view.panels[w][d.dataset.sec] = open; }); syncPanels(); });
});

labelLayer.addEventListener('click', e => { const l = e.target.closest('.lbl.chg-new, .lbl.chg-upd'); if (l && l._it) { hidden.delete(l._it.id); openDetail(l._it); } });
