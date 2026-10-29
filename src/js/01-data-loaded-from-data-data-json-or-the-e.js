/* ==================================================================
 *  DATA (loaded from data/data.json, or the embedded snapshot when offline)
 *  The app maps the dataset into the compact shape the rest of the code uses.
 * ================================================================== */
const DB = window.__DB;
const KIND_OF = {landed:'hist', outlook:'proj', 'in-lab':'flight'};
const DATA = DB.milestones.filter(m => !(m.flags && m.flags.hidden)).map(m => {
  const fl = m.flags || {}, k = KIND_OF[m.status];
  const d = {uid:m.id, v:m.field, s:m.origin, kind:k, t:m.title, r:m.research.year, c:m.confidence, rw:m.research.what, pw:m.change.what, note:m.note,
    ver:m.provenance.verification, checked:m.provenance.lastChecked, addedBy:m.provenance.addedBy, refs:m.refs || [], basisRef:m.basis || null};
  if (k === 'flight') d.tg = m.change.year; else d.p = m.change.year;
  if (m.company) d.co = m.company;
  if (m.desnz) d.dv = m.desnz;
  if (m.adoption) { d.adopt = m.adoption.year; d.adoptWhat = m.adoption.what; d.adoptBasis = m.adoption.basis; }
  d.region = m.region || 'unknown'; if (m.tags) d.tags = m.tags; if (m.subfield) d.sub = m.subfield;
  d.stage = (m.readiness || {}).stage || 'commercial'; if (m.gb) { d.gb = m.gb.status; d.gbNote = m.gb.note || ''; }
  if (m.security) { d.attack = !!m.security.expandsAttackSurface; d.sec = m.security.note || ''; d.secG = m.security.guidance || ''; }
  if (m.forecast) d.fc = m.forecast;
  if (fl.major) d.major = true; if (fl.university) d.uni = true; if (fl.aiDriven) d.acc = true; if (fl.policy) d.policy = true; if (fl.disputed) d.disputed = true;
  return d;
});
const FIELDS = {}; DB.fields.forEach(f => { FIELDS[f.id] = {name:f.name, hex:f.colour, subs:f.subfields || []}; });
const FKEYS = Object.keys(FIELDS);
FKEYS.forEach((k, i) => { FIELDS[k].col = new THREE.Color(FIELDS[k].hex); FIELDS[k].z = -25 + i * 5; });
const SRC = {}; DB.origins.forEach(o => { SRC[o.id] = {name:o.name, hex:o.colour, z:o.z, col:new THREE.Color(o.colour)}; });
const KINDS = {hist:'Landed', proj:'Next ten years', flight:'Still in the lab'};
const CONFS = {high:'High', medium:'Medium', low:'Low'};
const CONF_LONG = {high:'High confidence', medium:'Medium confidence', low:'Low confidence'};
const OUTLOOK_BASIS = {}, HIST_SRC = {};
DATA.forEach(d => {
  if (d.basisRef) OUTLOOK_BASIS[d.t] = [d.basisRef.label, d.basisRef.url || ''];
  const okRef = d.refs.find(x => x.status !== 'broken') || d.refs[0];
  if (okRef) HIST_SRC[d.t] = [okRef.label, okRef.status === 'broken' ? '' : (okRef.url || '')];
});
const VISION = {}; DB.visionAreas.forEach(a => { VISION[a.id] = a.name; });
const EVENTS = DB.events.map(e => ({y:e.year, c:e.category, t:e.text})).sort((a, b) => a.y - b.y);
const CTX_ERAS = DB.eras.map(e => [e.year, e.name]);
const FX_GBP = DB.fx.gbpPerUsd;
const FORTUNES = DB.founders.map(f => {
  const x = {fid:f.id, n:f.names, co:f.company, v:f.field, f:f.founded, w:f.fortuneYear, how:f.how, c:f.confidence};
  if (f.research) x.ac = f.research === 'university' ? 'uni' : 'lab';
  if (f.prize) x.prize = f.prize;
  if (f.netWorth) { x.nw = f.netWorth.usdBn; x.nwWho = f.netWorth.who; x.nwAsOf = f.netWorth.asOf; x.nwBasis = f.netWorth.basis + (f.netWorth.asOf ? ', as of ' + f.netWorth.asOf : '') + (f.netWorth.source && f.netWorth.source.label && f.netWorth.source.label !== f.netWorth.basis ? ` (${f.netWorth.source.label})` : ''); }
  x.checked = f.provenance && f.provenance.lastChecked; x.fver = f.provenance ? f.provenance.verification : 'ai-compiled';
  return x;
});
const fmtMoney = (bn, sym) => bn >= 1000 ? `${sym}${(bn / 1000).toFixed(1)}tn` : bn >= 1 ? `${sym}${bn >= 100 ? Math.round(bn) : Math.round(bn * 10) / 10}bn` : `${sym}${Math.round(bn * 1000)}m`;
const DATA_AS_OF = DB.meta.asOf;
const APP_VERSION = '10.3', APP_BUILD = '';
// Screen-aware scaling: laptops slightly smaller, large screens larger
const UI = (() => { const w = innerWidth; return w < 1280 ? .85 : w < 1500 ? .95 : w < 1800 ? 1.05 : w < 2300 ? 1.2 : 1.4; })();
const LARGE = innerWidth >= 1700;
const MOBILE = innerWidth < 820 || (matchMedia('(pointer: coarse)').matches && Math.min(innerWidth, innerHeight) < 600);
document.documentElement.style.setProperty('--ui', UI);
/* Rolling horizon: 'today' is the dataset's as-of date; the outlook always runs ten years beyond it */
const Y0 = DB.meta.startYear, NOW = +DB.meta.asOf.slice(0, 4), YEND = NOW + DB.meta.horizonYears, Y1 = YEND + 1, HORIZON = YEND + .6, XS = 1.2 * 112 / (Y1 - Y0), MID = (Y0 + Y1) / 2, H = 0.85, ZE = 28;
const xOf = y => (y - MID) * XS;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lagTxt = n => n < 1 ? 'under a year' : n === 1 ? '1 year' : n + ' years';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = id => document.getElementById(id);
const store = {
  // Always start from the app's defaults: nothing is read from or written to browser storage.
  // Settings are saved and restored only through JSON view files.
  get(k, d){ return d; },
  set(k, v){}
};

const JOKES = DB.jokes;
/* Outlook scenario assumptions come from the dataset (outlookModel) */
const ACCEL = DB.outlookModel.fields;

