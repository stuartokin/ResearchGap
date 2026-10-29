/* ==================================================================
 *  THREE SETUP
 * ================================================================== */
const host = $('scene');
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x08131D, 1);
host.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x08131D, 0.0052);
const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.1, 1400);
/* On portrait phones the horizontal field of view is narrow, so the camera stands further back and higher to fit the whole century */
const HOME = innerWidth < innerHeight && MOBILE ? {pos:new THREE.Vector3(-40, 150, 300), target:new THREE.Vector3(4, 6, 0)} : MOBILE ? {pos:new THREE.Vector3(-20, 50, 170), target:new THREE.Vector3(2, 9, 0)} : {pos:new THREE.Vector3(-16, 36, 132), target:new THREE.Vector3(2, 9, 0)};
camera.position.set(-160, 120, 230);
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.target.copy(HOME.target);
controls.enableDamping = true; controls.dampingFactor = 0.06;
controls.autoRotate = state.autoRotate; controls.autoRotateSpeed = view.rotSpeed;
controls.minDistance = 16; controls.maxDistance = MOBILE ? 460 : 260; controls.maxPolarAngle = Math.PI * 0.49; controls.rotateSpeed = 0.6;

let composer = null, bloom = null;
if (THREE.EffectComposer && THREE.UnrealBloomPass && THREE.RenderPass) {
  try {
    composer = new THREE.EffectComposer(renderer);
    if (composer.setPixelRatio) composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    composer.addPass(new THREE.RenderPass(scene, camera));
    bloom = new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), view.glow, 0.5, 0.22);
    composer.addPass(bloom);
  } catch (e) { composer = null; }
}

function glowTexture(){
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64,64,0,64,64,64);
  gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(.18,'rgba(255,255,255,.75)');
  gr.addColorStop(.45,'rgba(255,255,255,.18)'); gr.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0,0,128,128); return new THREE.CanvasTexture(c);
}
const GLOW = glowTexture();

function textSprite(txt, o){
  o = o || {};
  const size = o.size || 26, color = o.color || '#8FA6B8';
  const family = o.serif ? '"Instrument Serif", Georgia, serif' : '"Instrument Sans", system-ui, sans-serif';
  const font = `${o.weight || (o.serif ? '400' : '500')} ${size * 2}px ${family}`;
  const c = document.createElement('canvas'), g = c.getContext('2d');
  g.font = font; const w = Math.ceil(g.measureText(txt).width) + 20;
  c.width = w; c.height = Math.ceil(size * 2.8);
  g.font = font; g.fillStyle = color; g.textBaseline = 'middle'; g.fillText(txt, 10, c.height / 2);
  const tex = new THREE.CanvasTexture(c); tex.minFilter = THREE.LinearFilter;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({map:tex, transparent:true, depthWrite:false}));
  const hh = o.world || 1.6; s.scale.set(hh * c.width / c.height, hh, 1);
  if (o.align === 'right') s.center.set(1, .5);
  if (o.align === 'left') s.center.set(0, .5);
  return s;
}
function line(points, color, opacity){
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({color, transparent:true, opacity, depthWrite:false}));
}

