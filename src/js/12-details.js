/* ==================================================================
 *  DETAILS
 * ================================================================== */
const detailBody = $('detailBody');
function openDetail(it){
  selected = it;
  const s = SRC[it.s];
  const pYear = it.kind === 'hist' ? it.p : it.kind === 'proj' ? '~' + it.p : 'Status';
  const gapTxt = it.kind === 'hist' ? (it.lag < 1 ? `<strong>&lt;1</strong><span>year from research to change</span>` : `<strong>${it.lag}</strong><span>${it.lag === 1 ? 'year' : 'years'} from research to change</span>`)
    : it.kind === 'proj' ? `<strong>~${it.lag}</strong><span>years, if it lands on time</span>` : `<strong>${NOW - it.r}+</strong><span>years and counting</span>`;
  const conf = it.kind === 'hist' ? (it.c === 'high' ? 'Well documented' : 'Dates approximate') : CONF_LONG[it.c];
  detailBody.innerHTML = `
    <div class="dchips"><span class="chip src" style="background:${s.hex}">${s.name}</span><span class="chip" style="color:${FIELDS[it.v].hex};border-color:${FIELDS[it.v].hex}55">${FIELDS[it.v].name}</span><span class="chip conf-${it.c}">${conf}</span>${it.sub && FIELDS[it.v] && FIELDS[it.v].subs.find(x => x.id === it.sub) ? `<span class="chip">${FIELDS[it.v].subs.find(x => x.id === it.sub).name}</span>` : ''}${it.region && it.region !== 'unknown' && REGIONS[it.region] ? `<span class="chip">${REGIONS[it.region]}</span>` : ''}${(it.tags || []).map(t => `<span class="chip tag">${TAGS[t] || t}</span>`).join('')}${it.ver ? `<span class="chip ver-${it.ver}" title="Last checked ${it.checked || ''}">${{'source-cited':'✓ Source-cited','ai-compiled':'AI-compiled','ai-estimate':'AI estimate'}[it.ver]}</span>` : ''}${it.disputed ? '<span class="chip disputed">⚠ Disputed by QA</span>' : ''}${it.uni ? `<span class="chip uni">🎓 University project</span>` : ''}${it.aud ? `<span class="chip aud">${iconHtml(it.icon, it.iconImg)} Added by you</span>` : ''}${it.co ? `<span class="chip">Company: ${it.co}</span>` : ''}${it.acc ? `<span class="chip vis">AI-accelerated outlook</span>` : ''}${it.dv ? `<span class="chip vis">AI for clean energy: ${VISION[it.dv]}</span>` : ''}</div>
    <h3 class="dtitle">${esc(it.t)}</h3>
    <div class="gap">${gapTxt}</div>
    <div class="span"><b>${it.r}</b><div>${it.rw}</div><b>${pYear}</b><div>${it.pw}</div></div>
    ${it.adopt ? `<p class="dadopt"><b>Mainstream adoption${it.adopt > NOW ? ', expected' : ''}: ${it.adopt}</b>. ${esc(it.adoptWhat || '')} <span class="note-s">${it.adopt - it.p} years after first product; ${it.adoptBasis === 'source-cited' ? 'source-cited' : 'AI estimate'}.</span></p>` : ''}
    ${(it.stage || it.gb) ? `<p class="dstage">${it.stage ? `<span class="stg stg-${it.stage}">${STAGES[it.stage]}</span>` : ''}${it.gb ? ` <span class="note-s">${GBS[it.gb]}${it.gbNote ? ': ' + esc(it.gbNote) : ''}</span>` : ''}</p>` : ''}
    ${it.sec ? `<p class="dsec"><b>${it.attack ? 'Expands the attack surface' : 'Security'}</b>: ${esc(it.sec)}${(() => { const r = secResponse(it); return !r ? '' : r.resp ? ` First security response in its category: ${r.resp.t} (${r.resp.p})${r.expected ? ', expected' : ''}, ${r.lag} years later.` : ' No security response yet in its category.'; })()}</p>${it.attack && it.secG ? guideHtml(it.secG) : ''}` : ''}
    ${it.fc && it.kind === 'proj' ? `<p class="note-s">Estimate recorded on ${it.fc.estimatedOn}: ${it.fc.estimatedYear}${(it.fc.revisions || []).length ? `, revised ${it.fc.revisions.length} time${it.fc.revisions.length > 1 ? 's' : ''}` : ''}.</p>` : ''}${it.fc && it.fc.actualYear != null ? `<p class="note-s">Forecast check: estimated ${it.fc.estimatedYear}, landed ${it.fc.actualYear} (${it.fc.actualYear - it.fc.estimatedYear >= 0 ? '+' : ''}${it.fc.actualYear - it.fc.estimatedYear} years).</p>` : ''}
    <p class="dnote">${it.note}</p><p class="basis">${sourceHtml(it)}</p>
    <div class="dacts">${it.aud ? '<button class="mini" id="dDel">Delete this milestone</button>' : ''}<button class="mini" id="dHide">Hide this arc</button><button class="mini" id="dOnly">Show only this field</button></div>`;
  if (it.aud) $('dDel').onclick = () => { if (confirm('Delete this milestone' + (FIELDS[it.v] && FIELDS[it.v].custom ? ' (and its new field track if nothing else uses it)' : '') + '?')) removeAudienceIdea(it.id); };
  $('dHide').onclick = () => { hidden.add(it.id); closeDetail(); refresh(); };
  $('dOnly').onclick = () => { F.fields = new Set([it.v]); refresh(); };
  if (!layout.details.open) setOpen('details', true); else raise('details');
  focusGoal = it.peak.clone().setZ(laneZ(it)).multiply(new THREE.Vector3(1, .5, 1));
  setAutoRotate(false);
}
function srcLink(label, url){ return url ? `<a href="${url}" target="_blank" rel="noopener">${esc(label || url)}</a>` : esc(label); }
function sourceHtml(it){
  if (it.aud) return (it.srcLabel || it.srcUrl) ? 'Source: ' + srcLink(it.srcLabel, it.srcUrl) : 'Source: added by hand.';
  const m = HIST_SRC[it.t] || (it.kind === 'proj' ? OUTLOOK_BASIS[it.t] : null);
  let h = it.kind === 'proj' ? 'Basis: ' + (m ? srcLink(m[0], m[1]) : 'our estimate; no published target found.')
    : 'Source: ' + (m ? srcLink(m[0], m[1]) : 'compiled by AI from standard references: institutional and company histories, Nobel and award citations, and regulator approval records.');
  if (it.checked) h += `<br>Last checked by the data agents: ${it.checked}${it.addedBy === 'research-agent' ? ' (added by the research agent)' : ''}.`;
  const q = it.t.replace(/\s*\(.*?\)\s*/g, ' ').trim();
  h += `<br>Further reading: <a href="https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(q)}" target="_blank" rel="noopener">look up “${esc(q)}”</a> (online)`;
  return h;
}
function closeDetail(){ selected = null; detailBody.innerHTML = '<p class="empty">Select an arc or a milestone to see its story.</p>'; }

