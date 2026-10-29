/* ==================================================================
 *  STATE
 * ================================================================== */
const DEFAULT_FILTERS = () => ({
  fields:new Set(FKEYS), src:{academic:true,industry:true,government:true},
  kinds:{hist:true,proj:true,flight:true}, conf:{high:true,medium:true,low:true}, cats:{br:true,co:true},
  from:Y0, to:YEND, gapMax:60, q:'', ghosts:true, vision:false, majorOnly:false, uniOnly:false,
  dv:{opt:true,asset:true,demand:true,rd:true,gov:true},
  stages:{research:true, pilot:true, commercial:true, scale:true}, gbOnly:false, attackOnly:false, gapOnly:false, subOff:{}, regions:Object.fromEntries((DB.regions || []).map(r => [r.id, true])), ver:{'source-cited':true, 'ai-compiled':true, 'ai-estimate':true}, tags:{}
});
const F = DEFAULT_FILTERS();
const hidden = new Set();
const view = {fullText:false, flashNew:true, radarSince:'review', radarSeenRev:(() => { try { const v = store.get('sg.radarSeen', null); return v == null ? null : v; } catch (e) { return null; } })(), smartPlace:true, panels:{}, preset:'explore', menuGroups:{}, subLanes:true, adoption:true, palette:'standard', conclusion:true, playFrom:null, playTo:null, gapMetric:'first', statsRows:'src', statsRange:true, markSmall:true, smallN:5, survival:true, keepWinPos:true, fitOnLoad:true, chgFlag:'new', chgScope:'all', chgSince:'30', chgAnnounce:true, countdown:true, thanksIcon:true, majBright:true, uniHi:true, audSpot:true, audPause:true, statsBy:'landed', statsLive:true, gapBuild:true, compactLanes:true, fortSort:'year', musicOn:false, loopPlay:true, fortHi:true, fortOnly:false, laneFollow:true, camTravel:true, fadeLanded:true, keepYears:5, revealEnd:true, labelPlay:'until', labelScope:'all', labelMax:14, labelLinger:2, labels:'follow', lfs:LARGE ? 18 : 15, lanes:'v', colour:'v', pulses:true, trend:true, floor:true, rotSpeed:0.35, glow:0.75};
Object.assign(view, store.get('sg.view.v2', {}));
if (MOBILE) Object.assign(view, {lite:true, labels:'peak', labelScope:'major', labelMax:6, lfs:12, camTravel:false, fadeLanded:false, pulses:true, glow:0});
const VIEW_DEFAULTS = JSON.parse(JSON.stringify(view));   // the original settings, for resets after a tour
const state = {playing:false, cursor:Y1, autoRotate:!reduced && !(MOBILE && innerWidth < innerHeight)};
let selected = null, hovered = null;

