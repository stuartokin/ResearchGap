/* ==================================================================
 *  EXTENSION INTERFACE (version 1). The only way experimental features in the AI-enhanced version plug in: they never
 *  edit or reach into the app's own code. A feature can add chart tabs (drawn in every chart window, with an insight
 *  whose figures come from placeholders), panels and styles, read the milestones and filters (read-only), open a
 *  story and show a message. A feature that fails is paused on its own; the app carries on.
 *  Experimental code runs only in the AI-enhanced version: the standard version has no features to load.
 * ================================================================== */
const AI_BUILD = window.SG_AI || null;
const EXT = {features:{}, on:{filters:[], ready:[]}, panelDraw:{}, actions:{}, emitT:0};
window.__extraWins = window.__extraWins || {};
function extStatus(id, s){ if (AI_BUILD) { AI_BUILD.status = AI_BUILD.status || {}; AI_BUILD.status[id] = s; } }
function extGroup(){ let g = WIN_GROUPS.find(x => x[0] === 'experimental'); if (!g) { g = ['experimental', 'AI-enhanced (experimental)', []]; WIN_GROUPS.push(g); } return g[2]; }
function extFail(id, err){
  const f = EXT.features[id]; if (!f || f.failed) return; f.failed = true;
  extStatus(id, 'paused: ' + String((err && err.message) || err).slice(0, 200)); console.warn('Experimental feature paused:', id, err);
  f.tabs.forEach(k => { const i = CHART_TABS.findIndex(x => x[0] === k); if (i >= 0) CHART_TABS.splice(i, 1); delete EXT_CHARTS[k]; delete EXT_INSIGHTS[k]; delete EXT.actions[k]; });
  f.wins.forEach(w => { if (layout[w]) setOpen(w, false); delete EXT.panelDraw[w]; });
  setTimeout(() => { if (typeof renderAllCharts === 'function') renderAllCharts(); }, 0);
}
const extLive = () => items.filter(it => !it.removed && !it.aud);
const EXT_ITEM = it => Object.freeze({id:it.uid, title:it.t, field:it.v, fieldName:fieldName(it.v), origin:it.s, kind:{hist:'landed', proj:'outlook', flight:'in-lab'}[it.kind] || it.kind,
  researchYear:it.r, changeYear:it.p || it.tg || null, stage:it.stage || null, gb:it.gb || null, cleanEnergyArea:it.dv || null, aiDriven:!!isAIDriven(it)});
/* the same rule as the narration: every figure in an insight comes from the data, through a {placeholder} */
function checkTemplate(say){ const s = String(say || ''), bare = s.replace(/\{[A-Za-z][A-Za-z0-9]*\}/g, ''); if (!s.trim()) return 'it is empty'; if (/\d/.test(bare)) return 'it contains typed numbers; every figure must be a {placeholder}'; if (s.split(/\s+/).length > 60) return 'it is longer than 60 words'; return ''; }
function extApi(fid){
  const f = EXT.features[fid];
  const api = {
    apiVersion: 1,
    /* a chart tab: render({width, height, fontSize, items, panel, esc}) returns SVG or HTML. Give a clickable element
       data-xact="name" and data-xval="value" to receive onAction(name, value, api); class "chrow" with data-id opens a story. */
    registerChart(def){
      const k = 'x-' + fid + '-' + String(def.id || 'chart').replace(/[^a-z0-9-]/gi, '').toLowerCase();
      if (EXT_CHARTS[k]) return k;
      CHART_TABS.push([k, '✨ ' + String(def.name || 'Experimental chart').slice(0, 40)]); f.tabs.push(k);
      EXT_CHARTS[k] = (W, H, fs) => { if (f.failed) return ''; setCtl('<span class="note-s xctl">✨ An experimental chart in the AI-enhanced version. It follows your filters.</span>'); try { CH.note = String(def.note || 'An experimental chart in the AI-enhanced version, made by AI.'); return String(def.render({width:W, height:H, fontSize:fs, items:api.items(), panel:api.panel, esc:api.esc}) || ''); } catch (e) { extFail(fid, e); return '<p class="note-s">This experimental chart has been paused because it failed.</p>'; } };
      if (typeof def.onAction === 'function') EXT.actions[k] = def.onAction;
      if (def.insight) {
        const why = checkTemplate(def.insight.say);
        if (why) { console.warn(`Insight for ${k} not used: ${why}`); extStatus(fid + ':insight', 'not used: ' + why); }
        else EXT_INSIGHTS[k] = {say:String(def.insight.say), facts:() => { const o = def.insight.facts ? def.insight.facts(api) || {} : {}; const out = {}; Object.keys(o).forEach(x => { out[x] = String(o[x]); }); return out; }};
      }
      return k;
    },
    /* a panel, listed under Views → Panels → AI-enhanced (experimental); render(api) returns HTML, redrawn when the filters change */
    addPanel(def){
      const k = 'xp-' + fid + '-' + String(def.id || 'panel').replace(/[^a-z0-9-]/gi, '').toLowerCase();
      if (wins[k]) return k;
      const sec = document.createElement('section'); sec.className = 'win'; sec.id = 'w-' + k; sec.dataset.title = '✨ ' + String(def.title || 'Experimental').slice(0, 60);
      sec.innerHTML = '<div class="wbody xbody"></div>'; $('w-charts').after(sec);
      const W = innerWidth, H = innerHeight; window.__extraWins[k] = {x:Math.round(W * .18), y:90, w:Math.min(680, Math.round(W * .46)), h:Math.min(560, Math.round(H * .62)), fs:1};
      WIN_IDS.push(k); WIN_NAMES[k] = sec.dataset.title; extGroup().push(k);
      layout[k] = Object.assign({open:false, sw:W, sh:H}, window.__extraWins[k]);
      initWin(k); f.wins.push(k);
      const body = sec.querySelector('.xbody');
      EXT.panelDraw[k] = () => { if (f.failed) return; try { body.innerHTML = String(def.render ? def.render(api) || '' : ''); } catch (e) { extFail(fid, e); } };
      EXT.panelDraw[k](); if (typeof buildWinMenu === 'function') buildWinMenu();
      return k;
    },
    open(panelId){ if (layout[panelId]) { setOpen(panelId, true); raise(panelId); } },
    addStyles(css){ const st = document.createElement('style'); st.dataset.feature = fid; st.textContent = String(css || ''); document.head.appendChild(st); },
    on(evt, fn){ if (EXT.on[evt] && typeof fn === 'function') EXT.on[evt].push([fid, fn]); },
    items(){ return extLive().filter(shownFully).map(EXT_ITEM); },        // the milestones your filters show
    allItems(){ return extLive().map(EXT_ITEM); },
    fortunes(){ return (typeof FORTUNES !== 'undefined' ? FORTUNES : []).map(p => Object.freeze(Object.assign({}, p))); },
    filters(){ return Object.freeze({fields:[...F.fields], from:F.from, to:F.to, cleanEnergyOnly:!!F.vision, search:F.q || ''}); },
    fieldName:k => fieldName(k),
    openStory(id){ const it = items.find(x => x.uid === id); if (it) { openDetail(it); setOpen('details', true); raise('details'); } },
    panel(title, html){ chPanel(String(title || ''), String(html || '')); renderCharts(); },   // the side panel of the chart window in use
    toast(msg){ toast(String(msg || '').slice(0, 300)); },
    esc:s => esc(String(s == null ? '' : s))
  };
  return Object.freeze(api);
}
/* clicks on a feature's chart */
onChartBody('click', e => { const el = e.target.closest('[data-xact]'), fn = EXT.actions[CH.tab]; if (!el || !fn) return;
  try { fn(el.dataset.xact, el.dataset.xval, extApi(Object.keys(EXT.features).find(id => EXT.features[id].tabs.includes(CH.tab)))); } catch (err) { const id = Object.keys(EXT.features).find(x => EXT.features[x].tabs.includes(CH.tab)); if (id) extFail(id, err); } });
/* filter changes: redraw feature panels and tell features (gathered, so a burst of changes is one call) */
window.SGX_EMIT = evt => { clearTimeout(EXT.emitT); EXT.emitT = setTimeout(() => {
  Object.values(EXT.panelDraw).forEach(d => d());
  (EXT.on[evt] || []).forEach(([fid, fn]) => { if (EXT.features[fid] && !EXT.features[fid].failed) { try { fn(extApi(fid)); } catch (e) { extFail(fid, e); } } });
}, 150); };
/* load the features (AI-enhanced version only) */
if (AI_BUILD) {
  (AI_BUILD.queue || []).forEach(q => { EXT.features[q.id] = {tabs:[], wins:[], failed:false}; extStatus(q.id, 'active'); try { q.run(extApi(q.id)); } catch (e) { extFail(q.id, e); } });
  setTimeout(() => (EXT.on.ready || []).forEach(([fid, fn]) => { if (!EXT.features[fid].failed) { try { fn(extApi(fid)); } catch (e) { extFail(fid, e); } } }), 0);
  /* feature insights are recorded in the same voice as the rest of the narration */
  const textsBeforeFeatures = window.__tourTexts;
  window.__tourTexts = () => textsBeforeFeatures().concat(Object.keys(EXT_INSIGHTS).map(k => ({tour:'ai-features', step:k, text:chartInsight(k)})).filter(x => x.text));
}
