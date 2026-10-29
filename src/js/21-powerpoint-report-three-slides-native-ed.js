/* ==================================================================
 *  POWERPOINT REPORT (three slides, native editable charts, follows the current filters)
 * ================================================================== */
function reportData(){
  const pool = items.filter(it => it.kind === 'hist' && shownFully(it) && !it.aud && !it.co);
  const med = a => a.length ? median(a) : null;
  const landed = (a, b) => pool.filter(it => it.p >= a && it.p < b).map(it => it.lag);
  const pre = med(landed(0, 1970)), recent = med(landed(2000, 9999));
  const since2010 = pool.filter(it => it.r >= 2010 && !POLICY_ARCS.has(it.t));   // like-for-like technology arcs, as in Can AI shrink the gap?
  const ai = med(since2010.filter(isAIDriven).map(it => it.lag)), conv = med(since2010.filter(it => !isAIDriven(it)).map(it => it.lag));
  const fieldRows = FKEYS.filter(k => F.fields.has(k) && FIELDS[k] && !FIELDS[k].custom).map(k => {
    const fp = pool.filter(it => it.v === k);
    return {k, name:FIELDS[k].name, before:med(fp.filter(it => it.p < 2000).map(it => it.lag)), since:med(fp.filter(it => it.p >= 2000).map(it => it.lag)), n:fp.length};
  }).filter(r => r.before != null && r.since != null);
  const sc = scenario();
  const outRows = FKEYS.filter(k => F.fields.has(k) && ACCEL[k]).map(k => {
    const r = recentMedianFor(it => it.v === k && F.src[it.s]); if (!r) return null;
    const A = ACCEL[k]; return {name:FIELDS[k].name, recent:r.m, ai:r.m * (A.lo + A.hi) / 2};
  }).filter(Boolean);
  const fut = items.filter(it => it.kind === 'proj' && it.r >= 2015 && shownFully(it) && !POLICY_ARCS.has(it.t) && !it.aud);
  const fa = med(fut.filter(isAIDriven).map(it => it.lag)), fc = med(fut.filter(it => !isAIDriven(it)).map(it => it.lag));
  computeGapSeries();
  const series = gapSeries.filter(p => p.m != null && p.y >= 1940 && p.y % 5 === 0);
  return {pool, pre, recent, ai, conv, fieldRows, sc, outRows, fa, fc, series, n:items.filter(it => shownFully(it) && !it.aud).length};
}
function selectionText(){
  const all = FKEYS.filter(k => FIELDS[k] && !FIELDS[k].custom), on = all.filter(k => F.fields.has(k));
  return on.length === all.length ? 'All fields' : on.map(k => FIELDS[k].name).join(', ');
}
/* The weekly AI narrative (the walk-through scripts) rendered with today's data, for the reports */
function narrative(tourId, stepIds){
  const T = TOURS[tourId]; if (!T) return [];
  let f; try { f = T.facts(); } catch (e) { return []; }
  return stepIds.map(id => { const st = T.steps.find(x => x.id === id); return st ? stepText(tourId, st, f) : ''; }).filter(Boolean);
}
const narrVersion = () => tourText.version || TOUR_TEXT.version || 1;
/* Before building a report: make sure it uses the latest published data and narrative */
async function ensureFresh(kind){
  if (location.protocol.indexOf('http') !== 0) return true;   // an offline copy: use what it has
  const msg = $('repMsg'); msg.textContent = 'Checking for the latest data and narrative…';
  try {
    const [d, t] = await Promise.all([fetch('data/data.json', {cache:'no-cache'}).then(r => r.ok ? r.json() : null), fetch('data/tours.json', {cache:'no-cache'}).then(r => r.ok ? r.json() : null)]);
    if (t && t.tours && (t.version || 0) >= narrVersion()) tourText = t;   // newer narrative can be used at once
    if (d && d.meta && (d.meta.revision || 0) > (DB.meta.revision || 0)) {
      msg.innerHTML = `Newer data (revision ${esc(d.meta.revision)}) was published since this page opened. <button class="mini" id="repReload">Reload and create</button> <button class="mini" id="repAnyway">Use the data on screen</button>`;
      return await new Promise(res => {
        $('repReload').onclick = () => { const t = $('repTitle').value || ''; location.href = location.pathname + '?report=' + kind + (t ? '&rtitle=' + encodeURIComponent(t) : ''); res(false); };   // carried in the address: the app keeps nothing in browser storage
        $('repAnyway').onclick = () => res(true);
      });
    }
  } catch (e) { /* no connection: use the data on screen */ }
  return true;
}
async function generateReport(){
  const msg = $('repMsg');
  if (!window.PptxGenJS) { msg.textContent = 'The PowerPoint library did not load.'; return; }
  msg.textContent = 'Building your report…';
  const R = reportData(), f1 = v => v == null ? '–' : fmtY(v);
  const BG = '0B1724', PANEL = '13283A', TXT = 'E9F2FF', MUTED = '8FA6B8', AMBER = 'F7C04A', TEAL = '4CD3C2', VIOLET = 'A891FF', LINE = '22384A';
  const titleText = ($('repTitle').value || 'The Shrinking Gap from Research to Change').trim();
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9'; pptx.author = 'Stuart Okin'; pptx.title = titleText; pptx.subject = 'Research to change, ' + Y0 + '–' + YEND;
  const footer = (slide, n) => {
    slide.addText(`Stuart Okin, personal project. Data as of ${DATA_AS_OF} (revision ${DB.meta.revision}), narrative version ${narrVersion()}; maintained by AI agents without human review and may contain errors. Outlook years are AI estimates. Selection: ${selectionText()}.`,
      {x:0.5, y:5.2, w:8.4, h:0.3, fontSize:7, color:MUTED, fontFace:'Arial', margin:0, isTextBox:true});
    slide.addText(String(n), {x:9.1, y:5.2, w:0.4, h:0.3, fontSize:8, color:MUTED, align:'right', fontFace:'Arial', margin:0, isTextBox:true});
  };
  const arcs = (slide, x, y, w, h, cols) => cols.forEach((c, i) => slide.addShape(pptx.ShapeType.arc, {x:x + i * 0.35, y:y + i * 0.22, w:w - i * 0.7, h:h - i * 0.44, angleRange:[180, 360], line:{color:c, width:1.5, transparency:20 + i * 12}}));
  const card = (slide, x, y, w, big, label, colour) => {
    slide.addShape(pptx.ShapeType.roundRect, {x, y, w, h:1.2, fill:{color:PANEL}, line:{color:LINE, width:0.75}, rectRadius:0.12});
    slide.addText(big, {x:x + 0.2, y:y + 0.12, w:w - 0.4, h:0.6, fontSize:big.length > 9 ? 22 : 28, bold:true, color:colour, fontFace:'Georgia', margin:0, fit:'shrink', isTextBox:true});
    slide.addText(label, {x:x + 0.2, y:y + 0.74, w:w - 0.4, h:0.4, fontSize:9, color:MUTED, fontFace:'Arial', margin:0, valign:'top', isTextBox:true});
  };
  const axisOpts = {catAxisLabelColor:'B7C6D2', valAxisLabelColor:'8FA6B8', catAxisLabelFontFace:'Arial', valAxisLabelFontFace:'Arial', catAxisLabelFontSize:8, valAxisLabelFontSize:8,
    valGridLine:{color:LINE, size:0.5}, catGridLine:{style:'none'}, catAxisLineShow:false, valAxisLineShow:false, plotArea:{fill:{color:BG}}};

  // ---------- Slide 1: the headline ----------
  let s = pptx.addSlide(); s.background = {color:BG};
  arcs(s, 5.6, 0.35, 4.2, 2.4, [AMBER, TEAL, VIOLET]);
  s.addText(titleText, {x:0.5, y:0.35, w:6.6, h:0.95, fontSize:titleText.length > 34 ? 24 : 28, color:TXT, fontFace:'Georgia', margin:0, valign:'top', isTextBox:true});
  s.addText(`How long research takes to become real-world change, ${Y0}–${YEND}`, {x:0.5, y:1.33, w:6.4, h:0.3, fontSize:12, color:MUTED, fontFace:'Arial', margin:0, isTextBox:true});
  card(s, 0.5, 1.75, 2.85, `${f1(R.pre)} → ${f1(R.recent)} yrs`, 'Median gap for milestones landing before 1970, and since 2000', AMBER);
  card(s, 3.575, 1.75, 2.85, `${f1(R.ai)} vs ${f1(R.conv)} yrs`, 'AI-driven work against everything else (research since 2010)', TEAL);
  card(s, 6.65, 1.75, 2.85, String(R.n), `Milestones in this selection, across ${FKEYS.filter(k => F.fields.has(k)).length} fields`, VIOLET);
  if (R.series.length > 3) s.addChart(pptx.ChartType.line, [{name:'Median years, rolling ten-year window', labels:R.series.map(p => String(p.y)), values:R.series.map(p => Math.round(p.m * 10) / 10)}],
    Object.assign({x:0.4, y:3.1, w:9.2, h:2.0, chartColors:[AMBER], lineSize:2, lineDataSymbol:'none', showLegend:false, showTitle:true, title:'Median years from research to change, for milestones landing in each preceding ten years',
      titleColor:'B7C6D2', titleFontSize:9, titleFontFace:'Arial', catAxisLabelFrequency:2}, axisOpts));
  const verdict = narrative('gap', ['answer'])[0];
  if (verdict) s.addText(verdict, {x:0.5, y:2.78, w:9, h:0.28, fontSize:10, italic:true, color:AMBER, fontFace:'Arial', margin:0, isTextBox:true});
  s.addNotes(narrative('gap', ['trend', 'corrected', 'answer']).join(' ') + `\n\nSelection figures: across the selection, the typical gap has moved from ${f1(R.pre)} years (before 1970) to ${f1(R.recent)} years (since 2000). AI-driven work since 2010 has taken a median ${f1(R.ai)} years against ${f1(R.conv)} for other work. Data is AI-maintained and may contain errors.`);
  footer(s, 1);

  // ---------- Slide 2: by field ----------
  s = pptx.addSlide(); s.background = {color:BG};
  s.addText('Where the gap has shrunk, and where it hasn’t', {x:0.5, y:0.35, w:9, h:0.6, fontSize:24, color:TXT, fontFace:'Georgia', margin:0, isTextBox:true});
  const rows = R.fieldRows.slice().sort((a, b) => b.since - a.since);
  if (rows.length) s.addChart(pptx.ChartType.bar, [
      {name:'Landed before 2000', labels:rows.map(r => r.name), values:rows.map(r => Math.round(r.before * 10) / 10)},
      {name:'Landed since 2000', labels:rows.map(r => r.name), values:rows.map(r => Math.round(r.since * 10) / 10)}],
    Object.assign({x:0.4, y:1.05, w:6.0, h:4.05, barDir:'bar', barGrouping:'clustered', chartColors:['5D7486', TEAL], showLegend:true, legendPos:'b', legendColor:'B7C6D2', legendFontSize:8, legendFontFace:'Arial',
      showValue:true, dataLabelColor:TXT, dataLabelFontSize:7, dataLabelPosition:'outEnd', showTitle:true, title:'Median years from research to change', titleColor:'B7C6D2', titleFontSize:9, titleFontFace:'Arial'}, axisOpts));
  const shrank = rows.filter(r => r.since < r.before).sort((a, b) => (a.since - a.before) - (b.since - b.before)).slice(0, 3);
  const stuck = rows.filter(r => r.since >= r.before).slice(0, 3);
  s.addShape(pptx.ShapeType.roundRect, {x:6.65, y:1.05, w:2.85, h:4.05, fill:{color:PANEL}, line:{color:LINE, width:0.75}, rectRadius:0.12});
  const bullets = [{text:'Shrinking fastest', options:{bold:true, color:TEAL, fontSize:11, breakLine:true, paraSpaceAfter:4}}]
    .concat(shrank.map(r => ({text:`${r.name}: ${f1(r.before)} → ${f1(r.since)} years`, options:{bullet:true, breakLine:true, color:TXT, fontSize:10, paraSpaceAfter:4}})))
    .concat([{text:'Not shrinking', options:{bold:true, color:AMBER, fontSize:11, breakLine:true, paraSpaceAfter:4}}])
    .concat(stuck.length ? stuck.map((r, i) => ({text:`${r.name}: ${f1(r.before)} → ${f1(r.since)} years`, options:{bullet:true, breakLine:i < stuck.length - 1, color:TXT, fontSize:10, paraSpaceAfter:4}})) : [{text:'Every selected field has shrunk.', options:{color:TXT, fontSize:10}}]);
  s.addText(bullets, {x:6.85, y:1.25, w:2.5, h:3.7, fontFace:'Arial', valign:'top', margin:0, isTextBox:true});
  s.addNotes('Software and AI compress fastest. Physical, safety-critical fields such as energy, materials and life sciences are limited by manufacturing, trials, safety cases and consent.');
  footer(s, 2);

  // ---------- Slide 3: AI outlook ----------
  s = pptx.addSlide(); s.background = {color:BG};
  s.addText('Can AI shrink the gap further?', {x:0.5, y:0.35, w:9, h:0.6, fontSize:24, color:TXT, fontFace:'Georgia', margin:0, isTextBox:true});
  const orows = R.outRows.slice().sort((a, b) => b.recent - a.recent);
  if (orows.length) s.addChart(pptx.ChartType.bar, [
      {name:'Recent pace (research since 2000)', labels:orows.map(r => r.name), values:orows.map(r => Math.round(r.recent * 10) / 10)},
      {name:'With AI and digital twins (scenario midpoint)', labels:orows.map(r => r.name), values:orows.map(r => Math.round(r.ai * 10) / 10)}],
    Object.assign({x:0.4, y:1.05, w:6.0, h:4.05, barDir:'bar', barGrouping:'clustered', chartColors:['5D7486', AMBER], showLegend:true, legendPos:'b', legendColor:'B7C6D2', legendFontSize:8, legendFontFace:'Arial',
      showValue:true, dataLabelColor:TXT, dataLabelFontSize:7, dataLabelPosition:'outEnd', showTitle:true, title:'Median years from research to change', titleColor:'B7C6D2', titleFontSize:9, titleFontFace:'Arial'}, axisOpts));
  card(s, 6.65, 1.05, 2.85, R.sc ? `${fmtR(R.sc.lo, R.sc.hi)} yrs` : '–', `Scenario for research starting now, against ${R.sc ? f1(R.sc.base) : '–'} years at the recent pace`, AMBER);
  card(s, 6.65, 2.4, 2.85, `${f1(R.fa)} vs ${f1(R.fc)}`, `Years to change, outlook to ${YEND}: AI-driven routes against conventional ones`, TEAL);
  s.addText('AI compresses discovery, design and testing. It does not compress factories, clinical trials, safety cases, standards or planning consent.', {x:6.65, y:3.75, w:2.85, h:1.1, fontSize:9, color:'B7C6D2', fontFace:'Arial', margin:0, valign:'top', isTextBox:true});
  s.addNotes(narrative('gap', ['outlook', 'fields']).join(' ') + ' The AI ranges are scenario assumptions stated in the dataset, not forecasts. The comparison uses technology arcs only, excluding policy milestones.');
  footer(s, 3);

  // ---------- Slide 4: the weekly AI narrative across all five walk-throughs ----------
  s = pptx.addSlide(); s.background = {color:BG};
  s.addText('What the agents found this week', {x:0.5, y:0.35, w:9, h:0.6, fontSize:24, color:TXT, fontFace:'Georgia', margin:0, isTextBox:true});
  s.addText('AI-generated narrative from the weekly agents’ findings, across all the data. No human review.', {x:0.5, y:0.92, w:9, h:0.28, fontSize:10, color:MUTED, fontFace:'Arial', margin:0, isTextBox:true});
  const themes = [['Is AI shrinking the gap?', AMBER, narrative('gap', ['trend', 'answer'])], ['On the horizon for the energy system', TEAL, narrative('horizon', ['next', 'answer'])],
                  ['Securing the future energy system', 'FF6B6B', narrative('secure', ['lens', 'answer'])], ['From lab to fortune', VIOLET, narrative('fortune', ['speed', 'answer'])]];
  themes.forEach(([head, col, lines], i) => {
    const x = 0.5 + (i % 2) * 4.6, y = 1.35 + Math.floor(i / 2) * 1.9;
    s.addShape(pptx.ShapeType.roundRect, {x, y, w:4.4, h:1.75, fill:{color:PANEL}, line:{color:LINE, width:0.75}, rectRadius:0.1});
    s.addShape(pptx.ShapeType.rect, {x, y:y + 0.15, w:0.06, h:1.45, fill:{color:col}, line:{color:col, width:0}});
    s.addText([{text:head, options:{bold:true, color:col, fontSize:11, breakLine:true, paraSpaceAfter:4}}].concat(lines.map((l, j) => ({text:l, options:{color:TXT, fontSize:9.5, breakLine:j < lines.length - 1, paraSpaceAfter:3}}))),
      {x:x + 0.2, y:y + 0.12, w:4.05, h:1.55, fontFace:'Arial', valign:'top', margin:0, isTextBox:true});
  });
  s.addNotes('This slide uses the narration of the guided walk-throughs. AI agents write and update it every week, within fixed rules; figures and conclusions are calculated from the live data when the report is created. No person reviews it.');
  footer(s, 4);

  const fileName = `shrinking-gap-report-${new Date().toISOString().slice(0, 10)}.pptx`;
  try { await pptx.writeFile({fileName}); msg.textContent = `Saved ${fileName}. Open it in PowerPoint, Keynote or Google Slides; the charts are editable.`; }
  catch (e) { msg.textContent = 'Could not create the report: ' + e.message; }
}

$('repGo').onclick = async () => { if (await ensureFresh('report')) generateReport(); };
$('repDesnz').onclick = async () => { if (await ensureFresh('desnz')) generateDesnzSlide(); };
$('repTitle').addEventListener('keydown', e => e.stopPropagation());

