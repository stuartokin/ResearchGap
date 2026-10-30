/* ==================================================================
 *  DATA EXPORT: the milestones (and fortunes) as CSV or an Excel workbook
 * ================================================================== */
function exportRows(selectionOnly){
  const byId = {}; items.forEach(it => { byId[it.uid || it.id] = it; });
  const ms = DB.milestones.filter(m => !selectionOnly || (byId[m.id] && shownFully(byId[m.id])));
  const head = ['ID', 'Title', 'Field', 'Sub-field', 'Origin', 'Status', 'Research year', 'Research', 'First product year', 'First product', 'Gap (years)', 'Mainstream adoption year', 'Mainstream adoption',
    'Readiness', 'GB status', 'AI-driven', 'Expands attack surface', 'Security note', 'AI for clean energy area', 'Region', 'Tags', 'Confidence', 'Verification', 'Note', 'Sources'];
  const rows = ms.map(m => {
    const it = byId[m.id] || {}, r = (m.research || {}).year, c = (m.change || {}).year;
    return [m.id, m.title, (FIELDS[m.field] || {}).name || m.field, m.subfield || '', m.origin || '', m.status || '', r ?? '', (m.research || {}).what || '', c ?? '', (m.change || {}).what || '',
      m.status === 'landed' && r != null && c != null ? c - r : '', (m.adoption || {}).year ?? '', (m.adoption || {}).what || '',
      (m.readiness || {}).stage || '', (m.gb || {}).status || '', it.t && typeof isAIDriven === 'function' ? (isAIDriven(it) ? 'yes' : 'no') : '',
      (m.security || {}).expandsAttackSurface ? 'yes' : (m.security ? 'no' : ''), (m.security || {}).note || '', it.dv ? VISION[it.dv] : '', m.region || '', (m.tags || []).join('; '),
      m.confidence || '', (m.provenance || {}).verification || '', m.note || '', (m.refs || []).map(x => x.url).join(' | ')];
  });
  return {head, rows};
}
function fortuneRows(){
  const fs = DB.founders || []; const keys = [];
  fs.forEach(f => Object.keys(f).forEach(k => { if (!keys.includes(k) && typeof f[k] !== 'object') keys.push(k); }));
  const head = keys.concat(fs.some(f => f.refs) ? ['sources'] : []);
  return {head, rows:fs.map(f => keys.map(k => f[k] ?? '').concat(f.refs ? [(f.refs || []).map(x => x.url || x).join(' | ')] : []))};
}
const ABOUT_ROWS = () => [['The Shrinking Gap from Research to Change'], ['Stuart Okin, personal project'], [`Data revision ${DB.meta.revision}, as of ${DATA_AS_OF}`],
  ['This data is run and managed by AI agents, with no human in the loop. It may contain errors: check anything important against the sources.'],
  ['Verification: source-cited (checked against a source), AI-compiled, or AI estimate.'], [siteUrl() || 'https://stuartokin.github.io/ResearchGap/']];
function saveBlob(blob, name){ const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }
const stamp = () => new Date().toISOString().slice(0, 10);
function exportCsv(){
  const {head, rows} = exportRows($('expSel').checked);
  const cell = v => { const s = String(v ?? ''); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = '\ufeff' + [head].concat(rows).map(r => r.map(cell).join(',')).join('\r\n');   // the byte-order mark lets Excel read the accents correctly
  saveBlob(new Blob([csv], {type:'text/csv;charset=utf-8'}), `shrinking-gap-milestones-${stamp()}.csv`);
  toast(`Saved ${rows.length} milestones as CSV.`);
}
async function exportXlsx(){
  if (typeof JSZip !== 'function') { toast('Excel export is not available here; saving CSV instead.'); return exportCsv(); }
  const x = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'}[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  const col = n => { let s = ''; n++; while (n) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
  const sheet = (head, rows, widths) => {
    const all = [head].concat(rows);
    const data = all.map((r, i) => `<row r="${i + 1}">` + r.map((v, j) => {
      const ref = col(j) + (i + 1), st = i === 0 ? ' s="1"' : '';
      return typeof v === 'number' && isFinite(v) ? `<c r="${ref}"${st}><v>${v}</v></c>` : `<c r="${ref}" t="inlineStr"${st}><is><t xml:space="preserve">${x(v)}</t></is></c>`;
    }).join('') + '</row>').join('');
    const cols = `<cols>${head.map((h, j) => `<col min="${j + 1}" max="${j + 1}" width="${(widths && widths[j]) || 14}" customWidth="1"/>`).join('')}</cols>`;
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>${cols}<sheetData>${data}</sheetData>${rows.length ? `<autoFilter ref="A1:${col(head.length - 1)}${rows.length + 1}"/>` : ''}</worksheet>`;
  };
  const m = exportRows($('expSel').checked), f = fortuneRows();
  const sheets = [['Milestones', sheet(m.head, m.rows, [22, 34, 18, 18, 11, 9, 9, 40, 10, 40, 8, 10, 30, 11, 10, 8, 9, 40, 26, 9, 22, 10, 13, 40, 50])], ['Fortunes', sheet(f.head, f.rows)], ['About', sheet(['About this data'], ABOUT_ROWS(), [110])]];
  const z = new JSZip();
  z.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`);
  z.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  z.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${s[0]}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`);
  z.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  z.file('xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf xfId="0"/><xf fontId="1" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>');
  sheets.forEach((s, i) => z.file(`xl/worksheets/sheet${i + 1}.xml`, s[1]));
  const blob = await z.generateAsync({type:'blob', mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  saveBlob(blob, `shrinking-gap-data-${stamp()}.xlsx`); toast(`Saved ${m.rows.length} milestones and ${f.rows.length} fortunes as an Excel workbook.`);
}
$('expCsv').onclick = exportCsv; $('expXlsx').onclick = exportXlsx;
