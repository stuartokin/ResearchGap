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
  const msg = $('repMsg'); if (!window.PptxGenJS) { msg.textContent = 'The PowerPoint library did not load.'; return; }
  msg.textContent = 'Building your report…';
  const BG = '0B1724', PANEL = '13283A', LINE = '22384A', TXT = 'E9F2FF', MUTED = '8FA6B8', AMBER = 'F7C04A', TEAL = '4CD3C2', VIOLET = 'A891FF', CORAL = 'FF6B6B', GREEN = '7FD6A0';
  const R = reportData(), yrsTxt = v => v == null ? '–' : `${Math.round(v)} yr${Math.round(v) === 1 ? '' : 's'}`, gapOf = it => Math.max(0, Math.round(it.lag));
  const title = ($('repTitle').value || '').trim() || 'The Shrinking Gap from Research to Change';
  // examples from the live data, in the current selection
  const L = items.filter(it => it.kind === 'hist' && shownFully(it) && !it.aud && !it.co && !POLICY_ARCS.has(it.t));
  const pickMajor = (arr, n) => arr.filter(it => it.major).slice(0, n).concat(arr.filter(it => !it.major)).slice(0, n);
  const fastRecent = pickMajor(L.filter(it => it.p >= 2015).sort((a, b) => a.lag - b.lag), 3);
  const slowRecent = L.filter(it => it.p >= 2010).sort((a, b) => b.lag - a.lag)[0];
  const oldEx = L.filter(it => it.p < 1970 && it.major).sort((a, b) => b.lag - a.lag)[0];
  const aiEx = L.filter(it => it.r >= 2010 && isAIDriven(it)).sort((a, b) => a.lag - b.lag || b.major - a.major).slice(0, 3);
  const adoptEx = L.filter(it => it.adopt && it.adopt <= NOW && it.major).sort((a, b) => b.p - a.p)[0];
  const adm = (() => { const v = L.filter(it => it.adopt && it.adopt <= NOW).map(it => it.adopt - it.p); return v.length ? median(v) : null; })();
  const exLine = it => `${it.t}: ${it.r} → ${it.p} (${gapOf(it)} yr${gapOf(it) === 1 ? '' : 's'})`;
  const pptx = new PptxGenJS(); pptx.layout = 'LAYOUT_16x9'; pptx.author = 'Stuart Okin'; pptx.title = title;
  const footer = (s, n) => {
    s.addText(`Stuart Okin, personal project. Data revision ${DB.meta.revision} (${DATA_AS_OF}), narrative version ${narrVersion()}. AI-maintained data and narrative from public sources only, no human review; may contain errors. Selection: ${selectionText()}.`,
      {x:0.4, y:5.3, w:8.7, h:0.22, fontSize:6.5, color:MUTED, fontFace:'Arial', margin:0, isTextBox:true});
    s.addText(String(n), {x:9.2, y:5.3, w:0.4, h:0.22, fontSize:7, color:MUTED, align:'right', fontFace:'Arial', margin:0, isTextBox:true});
  };
  const heading = (s, t, sub, col) => {
    s.addShape(pptx.ShapeType.rect, {x:0.4, y:0.38, w:0.08, h:0.5, fill:{color:col}, line:{color:col, width:0}});
    s.addText(t, {x:0.6, y:0.3, w:8.9, h:0.5, fontSize:24, color:TXT, fontFace:'Georgia', margin:0, isTextBox:true});
    if (sub) s.addText(sub, {x:0.6, y:0.78, w:8.9, h:0.28, fontSize:10.5, color:MUTED, fontFace:'Arial', margin:0, isTextBox:true});
  };
  const card = (s, x, y, w, h, col) => { s.addShape(pptx.ShapeType.roundRect, {x, y, w, h, fill:{color:PANEL}, line:{color:LINE, width:0.75}, rectRadius:0.08}); s.addShape(pptx.ShapeType.rect, {x, y:y + 0.12, w:0.05, h:h - 0.24, fill:{color:col}, line:{color:col, width:0}}); };

  // 1. Title: the live model, full width
  let s = pptx.addSlide(); s.background = {color:BG};
  try { const c = viewCanvas(true); s.addImage({data:c.toDataURL('image/jpeg', 0.88), x:0, y:0, w:10, h:5.625, sizing:{type:'cover', w:10, h:5.625}}); } catch (e) { /* no picture available */ }
  s.addShape(pptx.ShapeType.rect, {x:0, y:3.05, w:10, h:2.575, fill:{color:BG, transparency:12}, line:{color:BG, width:0}});
  s.addText(title, {x:0.5, y:3.2, w:9, h:0.62, fontSize:title.length > 40 ? 28 : 32, color:TXT, fontFace:'Georgia', margin:0, fit:'shrink', isTextBox:true});
  s.addText('How long it takes research to become real-world change, and whether AI is shortening the journey.', {x:0.5, y:3.95, w:9, h:0.35, fontSize:13, color:MUTED, fontFace:'Arial', margin:0, isTextBox:true});
  s.addText(`${R.n || L.length} milestones across ${FKEYS.filter(k => F.fields.has(k) && FIELDS[k] && !FIELDS[k].custom).length} fields, 1925 to ${YEND}  •  ${new Date().toLocaleDateString('en-GB', {day:'numeric', month:'long', year:'numeric'})}`, {x:0.5, y:4.4, w:9, h:0.3, fontSize:10, color:AMBER, fontFace:'Arial', margin:0, isTextBox:true});
  s.addNotes('A visual introduction: each arc is one research breakthrough, rising when the research began and landing at its first real-world use. The picture shows the live model as it was when this deck was created.');
  footer(s, 1);

  // 2. The headline: three figures, each with a real example, and the verdict once
  s = pptx.addSlide(); s.background = {color:BG};
  heading(s, 'The headline', 'Median years, for the current selection', AMBER);
  const big = [
    [`${R.pre == null ? '–' : Math.round(R.pre)} → ${yrsTxt(R.recent)}`, 'From research to first product: milestones landing before 1970, against since 2000', AMBER, [oldEx && `Then: ${exLine(oldEx)}`, fastRecent[0] && `Now: ${exLine(fastRecent[0])}`]],
    [`${R.ai == null ? '–' : Math.round(R.ai)} vs ${yrsTxt(R.conv)}`, 'AI-driven work against everything else, for research since 2010', TEAL, aiEx.slice(0, 2).map(exLine)],
    [adm != null ? `+${yrsTxt(adm)}` : '–', 'From first product to mainstream adoption', VIOLET, [adoptEx && `${adoptEx.t}: first product ${adoptEx.p}, mainstream by ${adoptEx.adopt}`]]
  ];
  big.forEach(([v, label, col, ex], i) => {
    const x = 0.4 + i * 3.1; card(s, x, 1.25, 2.95, 3.0, col);
    s.addText(v, {x:x + 0.2, y:1.38, w:2.65, h:0.7, fontSize:28, color:col, fontFace:'Georgia', margin:0, fit:'shrink', isTextBox:true});
    s.addText(label, {x:x + 0.2, y:2.12, w:2.65, h:0.6, fontSize:9.5, color:TXT, fontFace:'Arial', margin:0, valign:'top', isTextBox:true});
    const lines = ex.filter(Boolean);
    s.addText([{text:'For example', options:{bold:true, color:MUTED, fontSize:8, breakLine:true}}].concat(lines.map((l, j) => ({text:l, options:{color:TXT, fontSize:8.5, breakLine:j < lines.length - 1, paraSpaceAfter:3}}))),
      {x:x + 0.2, y:2.8, w:2.65, h:1.35, fontFace:'Arial', valign:'top', margin:0, isTextBox:true});
  });
  const verdict = narrative('gap', ['answer'])[0] || '';
  s.addShape(pptx.ShapeType.roundRect, {x:0.4, y:4.45, w:9.2, h:0.62, fill:{color:'2A2410'}, line:{color:AMBER, width:0.75}, rectRadius:0.08});
  s.addText(verdict, {x:0.6, y:4.5, w:8.8, h:0.52, fontSize:12.5, italic:true, color:AMBER, fontFace:'Georgia', valign:'middle', margin:0, isTextBox:true});
  s.addNotes(narrative('gap', ['trend', 'corrected']).join(' ') + ' (AI-generated narrative from the weekly agents; no human review.)');
  footer(s, 2);

  // 3. Gap over time, with key examples
  s = pptx.addSlide(); s.background = {color:BG};
  heading(s, 'The gap over time', 'Median years from research to first product, for milestones landing in the preceding ten years', AMBER);
  computeGapSeries(); const gs = gapSeries.filter(g => g.m != null && g.y % 2 === 0);
  if (gs.length) s.addChart(pptx.ChartType.line, [{name:'Median gap (years)', labels:gs.map(g => String(g.y)), values:gs.map(g => Math.round(g.m * 10) / 10)}],
    {x:0.4, y:1.2, w:6.0, h:3.85, chartColors:[AMBER], lineSize:2.5, lineDataSymbol:'none', showLegend:false, catAxisLabelColor:MUTED, valAxisLabelColor:MUTED, catAxisLabelFontSize:8, valAxisLabelFontSize:8,
     valGridLine:{color:LINE, size:0.5}, catGridLine:{style:'none'}, catAxisLineShow:false, valAxisLineShow:false, catAxisLabelFrequency:5, valAxisMinVal:0, plotArea:{fill:{color:BG}}});
  card(s, 6.6, 1.2, 3.0, 3.85, TEAL);
  s.addText([{text:'Fastest recent arrivals', options:{bold:true, color:TEAL, fontSize:10.5, breakLine:true, paraSpaceAfter:4}}]
    .concat(fastRecent.map(it => ({text:exLine(it), options:{bullet:{indent:9}, color:TXT, fontSize:9, breakLine:true, paraSpaceAfter:3}})))
    .concat(slowRecent ? [{text:'Still slow', options:{bold:true, color:CORAL, fontSize:10.5, breakLine:true, paraSpaceBefore:6, paraSpaceAfter:4}}, {text:exLine(slowRecent), options:{bullet:{indent:9}, color:TXT, fontSize:9}}] : []),
    {x:6.8, y:1.3, w:2.7, h:3.65, fontFace:'Arial', valign:'top', margin:0, isTextBox:true});
  s.addNotes('The line shows the typical gap for milestones landing in each preceding decade. The examples are the quickest recent arrivals in the selection, and the slowest since 2010.');
  footer(s, 3);

  // 4. Can AI shrink the gap?
  s = pptx.addSlide(); s.background = {color:BG};
  heading(s, 'Can AI shrink the gap?', 'Recent median gap by field, against a plausible range with AI and digital twins (scenario, not forecast)', TEAL);
  const rows = R.outRows.slice(0, 9);
  if (rows.length) s.addChart(pptx.ChartType.bar, [{name:'Recent gap', labels:rows.map(r => r.name), values:rows.map(r => Math.round(r.recent * 10) / 10)}, {name:'With AI (scenario)', labels:rows.map(r => r.name), values:rows.map(r => Math.round(r.ai * 10) / 10)}],
    {x:0.4, y:1.2, w:5.9, h:3.85, barDir:'bar', barGrouping:'clustered', chartColors:[MUTED, TEAL], showLegend:true, legendPos:'b', legendColor:MUTED, legendFontSize:8, catAxisLabelColor:TXT, valAxisLabelColor:MUTED,
     catAxisLabelFontSize:8, valAxisLabelFontSize:8, valGridLine:{color:LINE, size:0.5}, catGridLine:{style:'none'}, catAxisOrientation:'maxMin', valAxisMinVal:0, plotArea:{fill:{color:BG}}});
  card(s, 6.5, 1.2, 3.1, 3.85, TEAL);
  s.addText([{text:'AI at work', options:{bold:true, color:TEAL, fontSize:10.5, breakLine:true, paraSpaceAfter:4}}]
    .concat(aiEx.map(it => ({text:exLine(it), options:{bullet:{indent:9}, color:TXT, fontSize:9, breakLine:true, paraSpaceAfter:3}})))
    .concat([{text:`Since 2010, AI-driven work took ${yrsTxt(R.ai)}, against ${yrsTxt(R.conv)} for the rest.`, options:{color:AMBER, fontSize:9.5, italic:true, paraSpaceBefore:8}}]),
    {x:6.7, y:1.3, w:2.8, h:3.65, fontFace:'Arial', valign:'top', margin:0, isTextBox:true});
  s.addNotes(narrative('gap', ['outlook', 'fields']).join(' ') + ' The AI ranges are scenario assumptions stated in the dataset, not forecasts.');
  footer(s, 4);

  // 5. Arriving next: AI for clean energy
  s = pptx.addSlide(); s.background = {color:BG};
  heading(s, 'Arriving next: AI for clean energy', 'Readiness behind each area, and the soonest arrivals (areas from DESNZ’s AI energy vision)', 'F2D38A');
  const SC = {research:MUTED, pilot:'F2D38A', commercial:'5FD8FF', scale:GREEN};
  Object.entries(VISION).forEach(([k, name], i) => {
    const x = 0.4 + i * 1.86, w = 1.76, its = items.filter(it => !it.removed && it.dv === k), tot = Math.max(1, its.length);
    card(s, x, 1.2, w, 3.2, 'F2D38A');
    s.addText(name, {x:x + 0.15, y:1.28, w:w - 0.25, h:0.62, fontSize:9.5, bold:true, color:TXT, fontFace:'Arial', valign:'top', margin:0, isTextBox:true});
    let bx = x + 0.15; Object.keys(SC).forEach(st => { const n = its.filter(it => it.stage === st).length; if (!n) return; const bw = (w - 0.3) * n / tot; s.addShape(pptx.ShapeType.rect, {x:bx, y:1.95, w:bw, h:0.16, fill:{color:SC[st]}, line:{color:SC[st], width:0}}); bx += bw; });
    s.addText(`${its.length} technologies, ${its.filter(it => it.gb === 'deployed').length} deployed in GB`, {x:x + 0.15, y:2.15, w:w - 0.25, h:0.3, fontSize:7.5, color:MUTED, fontFace:'Arial', margin:0, isTextBox:true});
    const nx = its.filter(it => it.kind === 'proj' && it.p <= NOW + 5).sort((a, b) => a.p - b.p).slice(0, 2);
    s.addText([{text:'Next', options:{bold:true, color:'F2D38A', fontSize:8, breakLine:true, paraSpaceAfter:2}}].concat(nx.length ? nx.map((n, j) => ({text:`~${n.p}  ${n.t}`, options:{color:TXT, fontSize:8.5, breakLine:j < nx.length - 1, paraSpaceAfter:5}})) : [{text:'None expected within five years', options:{color:MUTED, fontSize:8.5}}]),
      {x:x + 0.15, y:2.5, w:w - 0.25, h:1.8, fontFace:'Arial', valign:'top', margin:0, isTextBox:true});
  });
  const hv = narrative('horizon', ['answer'])[0] || '';
  s.addText(hv, {x:0.4, y:4.55, w:9.2, h:0.5, fontSize:11, italic:true, color:'F2D38A', fontFace:'Georgia', valign:'middle', margin:0, isTextBox:true});
  s.addNotes(narrative('horizon', ['radar', 'next']).join(' ') + ' Readiness stages and GB status are AI estimates.');
  footer(s, 5);

  // 6. Securing it
  s = pptx.addSlide(); s.background = {color:BG};
  heading(s, 'Securing it', 'New technology brings new ways in; security has historically followed later', CORAL);
  const sf = secureFacts();
  [[`${sf.attackPct}%`, 'of the technologies here expand the attack surface'], [sf.lag ? `${sf.lag} yrs` : '–', 'typical wait for the first security response in a technology’s category'], [sf.gapCount, 'open gaps: arrived since 2010 with no response yet']].forEach(([v, l], i) => {
    const y = 1.2 + i * 1.07; card(s, 0.4, y, 3.0, 0.95, CORAL);
    s.addText(v, {x:0.6, y:y + 0.06, w:1.2, h:0.8, fontSize:24, color:CORAL, fontFace:'Georgia', valign:'middle', margin:0, isTextBox:true});
    s.addText(l, {x:1.75, y:y + 0.08, w:1.55, h:0.8, fontSize:8.5, color:TXT, fontFace:'Arial', valign:'middle', margin:0, isTextBox:true});
  });
  const ex = secExample(), er = ex ? secResponse(ex) : null;
  card(s, 3.6, 1.2, 6.0, 1.85, CORAL);
  s.addText([{text:'Example', options:{bold:true, color:CORAL, fontSize:10, breakLine:true, paraSpaceAfter:3}},
             {text:ex ? `${ex.t} (${ex.p}). ${ex.sec || ''}` : '', options:{color:TXT, fontSize:9.5, breakLine:true, paraSpaceAfter:3}},
             {text:er && er.resp ? `First security response in its category: ${er.resp.t} (${er.resp.p}), ${er.lag} years later.` : '', options:{color:AMBER, fontSize:9.5}}],
    {x:3.8, y:1.28, w:5.7, h:1.7, fontFace:'Arial', valign:'top', margin:0, isTextBox:true});
  card(s, 3.6, 3.2, 6.0, 1.82, CORAL);
  const fw = ['NCSC CAF', 'Ofgem CAF Overlay', 'NERC CIP', 'ISA/IEC 62443', 'NIST CSF 2.0', 'IEC 62351'];
  s.addText('Mitigations are mapped to official frameworks', {x:3.8, y:3.28, w:5.7, h:0.3, fontSize:10, bold:true, color:CORAL, fontFace:'Arial', margin:0, isTextBox:true});
  fw.forEach((t, i) => { const x = 3.8 + (i % 3) * 1.9, y = 3.68 + Math.floor(i / 3) * 0.42; s.addShape(pptx.ShapeType.roundRect, {x, y, w:1.78, h:0.32, fill:{color:'2A1517'}, line:{color:CORAL, width:0.5}, rectRadius:0.06}); s.addText(t, {x, y, w:1.78, h:0.32, fontSize:8.5, color:TXT, align:'center', valign:'middle', fontFace:'Arial', margin:0, isTextBox:true}); });
  s.addText('AI research to prompt discussion, not security advice: engage qualified experts.', {x:3.8, y:4.6, w:5.7, h:0.3, fontSize:8, italic:true, color:'F2D38A', fontFace:'Arial', margin:0, isTextBox:true});
  s.addNotes(narrative('secure', ['lens', 'answer']).join(' '));
  footer(s, 6);

  // 7. From lab to fortune
  s = pptx.addSlide(); s.background = {color:BG};
  heading(s, 'From lab to fortune', 'Years from founding a company to the listing, sale or valuation that made its founders wealthy', VIOLET);
  const ff = fortuneFacts(), fast = FORTUNES.filter(x => x.w && x.f).sort((a, b) => (a.w - a.f) - (b.w - b.f) || b.w - a.w)[0];
  [[`${ff.nResearch} of ${ff.nFortunes}`, 'fortunes began in a university or research lab'], [`${ff.preYears || '–'} → ${ff.recentYears || '–'} yrs`, 'typical time to a fortune: companies founded before 1970, against since 2015'], [fast ? fast.co : '–', fast ? `the fastest so far: ${ff.fastestTime}, from founding in ${fast.f}` : '']].forEach(([v, l], i) => {
    const x = 0.4 + i * 3.1; card(s, x, 1.3, 2.95, 2.4, VIOLET);
    s.addText(v, {x:x + 0.2, y:1.45, w:2.65, h:0.9, fontSize:i === 2 ? 20 : 28, color:VIOLET, fontFace:'Georgia', valign:'middle', margin:0, isTextBox:true});
    s.addText(l, {x:x + 0.2, y:2.4, w:2.65, h:1.2, fontSize:10, color:TXT, fontFace:'Arial', valign:'top', margin:0, isTextBox:true});
  });
  s.addText(narrative('fortune', ['answer'])[0] || '', {x:0.4, y:4.0, w:9.2, h:0.5, fontSize:13, italic:true, color:VIOLET, fontFace:'Georgia', valign:'middle', margin:0, isTextBox:true});
  s.addNotes(narrative('fortune', ['speed', 'fastest']).join(' '));
  footer(s, 7);

  const fileName = `shrinking-gap-report-${new Date().toISOString().slice(0, 10)}.pptx`;
  try { await pptx.writeFile({fileName}); msg.textContent = `Saved ${fileName}: seven slides with live examples.`; } catch (e) { msg.textContent = 'Could not create the report: ' + e.message; }
}

$('repGo').onclick = async () => { if (await ensureFresh('report')) generateReport(); };
$('repDesnz').onclick = async () => { if (await ensureFresh('desnz')) generateDesnzSlide(); };
$('repTitle').addEventListener('keydown', e => e.stopPropagation());

