import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { feature } from 'topojson-client';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { kindOf } from './placegen.js';
import { openDiorama, dioramaOpen } from './diorama.js';
import { createNature } from './nature.js';
import { WIND } from './wind.js';
import { mountainGeometry, terrainMaterial } from './terrain.js';
import { LANDMARKS, buildModel, visitAltKm, typeForPlace, genScale, genViewKm, CAT_LABEL } from './landmarks.js';
import { buildTown, stageFor, nextStage, STAGES, CIVIC, SPACING, ROAD_EVERY, NIGHT, WALL_OPTIONS, ROOF_OPTIONS, GARDEN_OPTIONS } from './town.js';
import { createWalk, makePerson, SHIRTS, PANTS, SKINS, HAIR, STYLES } from './walk.js';
import { currentFestival } from './festivals.js';
import { sound } from './sound.js';
import { t, LANGS, lang, setLang, applyStatic } from './i18n.js';
const tr = t;

// ---------------------------------------------------------------- constants
const WORLD_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json';
const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const R_KM = 6371;
const km = (v) => v / R_KM;
const MIN_ALT = km(0.3), MAX_ALT = 5;
const PAL = {
  oceanDeep: '#164f6b', ocean: '#1d6585', shallow: '#3f93ad',
  land: ['#6fae4f', '#7ab757', '#66a548', '#82bc5e', '#5f9d45'],
  desert: ['#d6be86', '#cfb57b', '#dcc794'], ice: '#eef4f6', border: 'rgba(255,255,255,0.45)',
  grass: '#5d9f43', road: '#6c7077', wall: ['#fbf7ee', '#f3ede0', '#fffaf0'],
  roof: ['#c8432f', '#d4553a', '#b83b2a', '#cf4b33', '#e0703a'], tree: ['#3f7d3a', '#4a8c3f', '#357033'],
  pond: '#4aa3d4', dot: '#ffae2b',
};
const DESERT = new Set(['Egypt', 'Libya', 'Algeria', 'Saudi Arabia', 'Niger', 'Mali', 'Mauritania', 'Chad', 'Sudan', 'Oman',
  'United Arab Emirates', 'Yemen', 'Iraq', 'Jordan', 'Kuwait', 'Qatar', 'W. Sahara', 'Namibia', 'Iran', 'Afghanistan',
  'Turkmenistan', 'Kazakhstan', 'Mongolia', 'Australia', 'Uzbekistan', 'Syria', 'Israel', 'Bahrain', 'Djibouti', 'Somalia', 'Botswana']);

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => Number(n).toLocaleString('en');
const plural = (n, w) => `${fmt(n)} ${w}${n === 1 ? '' : 's'}`;
const aN = (w) => (/^[aeiou]/i.test(w) ? 'an ' : 'a ') + w;
const HANDLE = /^(?!.*\.\.)(?!\.)(?!.*\.$)[a-z0-9._]{1,30}$/;
const cleanHandle = (s) => String(s || '').trim().replace(/^@+/, '').toLowerCase();
async function api(p, opts) {
  const r = await fetch(p, opts);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Something went wrong');
  return j;
}
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};
function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function ll2v(lat, lon, r = 1) {
  const phi = ((90 - lat) * Math.PI) / 180, th = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
}
function v2ll(v) {
  const n = v.clone().normalize();
  const lat = 90 - (Math.acos(n.y) * 180) / Math.PI;
  let lon = (Math.atan2(n.z, -n.x) * 180) / Math.PI - 180;
  if (lon < -180) lon += 360;
  return { lat, lon };
}
// Local frame on the surface: x = east, y = up, z = south. Units: km after scaling.
function placeOnSurface(obj, lat, lon) {
  const up = ll2v(lat, lon).normalize();
  const east = new THREE.Vector3(0, 1, 0).cross(up);
  if (east.lengthSq() < 1e-10) east.set(1, 0, 0);
  east.normalize();
  const south = up.clone().cross(east).negate();
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(east, up, south));
  obj.position.copy(up).multiplyScalar(1 + km(0.004));
  obj.scale.setScalar(km(1));
  return obj;
}

// ---------------------------------------------------------------- scene
const stage = $('#stage');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap; // filtered types fail at this tiny world scale; use a big map instead
stage.appendChild(renderer.domElement);
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
labelRenderer.domElement.className = 'labels';
stage.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0a1f33');
scene.fog = new THREE.Fog('#0a1f33', 1e6, 2e6);
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 1e-7, 200);
camera.position.copy(ll2v(22, 40, 3.6));
scene.add(camera);
const hemi = new THREE.HemisphereLight(0xdcefff, 0x6f7f5a, 1.35);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d6, 1.9);
sun.position.set(0.35, 0.55, 1);
camera.add(sun);
// A second sun for close-up views: it casts real shadows over the town or walk area under the camera.
const groundSun = new THREE.DirectionalLight(0xfff0d6, 0);
groundSun.castShadow = true;
groundSun.shadow.mapSize.set(Math.min(4096, renderer.capabilities.maxTextureSize), Math.min(4096, renderer.capabilities.maxTextureSize));
groundSun.shadow.bias = 0;
groundSun.shadow.normalBias = 0;
scene.add(groundSun, groundSun.target);
const SPACE = new THREE.Color('#0a1f33'), SKY_DAY = new THREE.Color('#a9d8f0'), SKY_NIGHT = new THREE.Color('#0b1630');
const _sky = new THREE.Color();
// The camera's near/far planes follow altitude, so depth stays precise from orbit down to street level.
function fitClipPlanes(alt, walking) {
  const near = walking ? km(0.002) : Math.max(km(0.002), alt * 0.015);
  const far = walking ? km(10) : alt < 0.3 ? alt * 60 + 0.05 : 200;
  if (camera.near !== near || camera.far !== far) { camera.near = near; camera.far = far; camera.updateProjectionMatrix(); }
}
function updateSkyAndSun(alt) {
  // sky: deep space far away, soft blue sky with haze close to the ground
  const t = THREE.MathUtils.clamp((Math.log(km(400)) - Math.log(alt)) / (Math.log(km(400)) - Math.log(km(15))), 0, 1);
  _sky.copy(SPACE).lerp(night ? SKY_NIGHT : SKY_DAY, t);
  scene.background.copy(_sky);
  // the fog object always exists (adding/removing it rebuilds every material); far away it's pushed out of sight
  scene.fog.color.copy(_sky);
  if (t > 0.02) { scene.fog.near = alt * 3.2; scene.fog.far = alt * (14 - t * 6); } else { scene.fog.near = 1e6; scene.fog.far = 2e6; }
  // shadows near the ground
  const s = THREE.MathUtils.clamp((Math.log(km(14)) - Math.log(alt)) / (Math.log(km(14)) - Math.log(km(4))), 0, 1);
  groundSun.intensity = (night ? 0.12 : 1.7) * s;
  sun.intensity = (night ? 0.22 : 1.9) * (1 - s * 0.7);
  // keep the shadow light switched on (switching it rebuilds every material = a big stutter); just pause its work
  renderer.shadowMap.autoUpdate = s > 0.01;
  if (s > 0.01) {
    const T = camera.position.clone().normalize();
    const east = new THREE.Vector3(0, 1, 0).cross(T).normalize(), north = T.clone().cross(east);
    const dir = T.clone().multiplyScalar(0.8).addScaledVector(east, 0.35).addScaledVector(north, -0.45).normalize();
    groundSun.target.position.copy(T);
    groundSun.position.copy(T).addScaledVector(dir, km(8));
    const size = THREE.MathUtils.clamp(alt * 1.6, km(0.3), km(3));
    const c = groundSun.shadow.camera;
    c.left = -size; c.right = size; c.top = size; c.bottom = -size; c.near = km(1); c.far = km(16);
    c.updateProjectionMatrix();
  }
}

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.enableZoom = false;
controls.minPolarAngle = 0.08;
controls.maxPolarAngle = Math.PI - 0.08;
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: -1 };
controls.autoRotate = true;
controls.autoRotateSpeed = 0.4;
let visiting = false; // while looking at a famous place, don't auto-open nearby towns
controls.addEventListener('start', () => { fly = null; controls.autoRotate = false; visiting = false; });

const getAlt = () => camera.position.length() - 1;
const setAlt = (a) => camera.position.setLength(1 + THREE.MathUtils.clamp(a, MIN_ALT, MAX_ALT));
let zoomTarget = null; // altitude we're gliding towards
const zoomBy = (f) => { fly = null; controls.autoRotate = false; visiting = false; zoomTarget = THREE.MathUtils.clamp((zoomTarget ?? getAlt()) * f, MIN_ALT, MAX_ALT); };
function stepZoom(dt) {
  if (zoomTarget == null || fly) return;
  const a = getAlt(), la = Math.log(a), lt = Math.log(zoomTarget);
  if (Math.abs(lt - la) < 0.002) { setAlt(zoomTarget); zoomTarget = null; return; }
  setAlt(Math.exp(la + (lt - la) * (1 - Math.exp(-dt * 9))));
}
renderer.domElement.addEventListener('wheel', (e) => { e.preventDefault(); zoomBy(Math.exp(e.deltaY * 0.0016)); }, { passive: false });
const pts = new Map();
let pinch0 = 0, pinchAlt = 0;
const pdist = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
renderer.domElement.addEventListener('pointerdown', (e) => {
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pts.size === 2) { pinch0 = pdist(); pinchAlt = getAlt(); }
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (!pts.has(e.pointerId)) return;
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pts.size === 2 && pinch0) { fly = null; zoomTarget = null; setAlt(pinchAlt * (pinch0 / pdist())); }
});
const pend = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch0 = 0; };
renderer.domElement.addEventListener('pointerup', pend);
renderer.domElement.addEventListener('pointercancel', pend);
$('#zin').onclick = () => zoomBy(0.45);
$('#zout').onclick = () => zoomBy(2.2);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  labelRenderer.setSize(innerWidth, innerHeight);
});

// ---------------------------------------------------------------- earth
function logDepthShader(frag, vert) {
  return new THREE.ShaderMaterial({
    uniforms: { opacity: { value: 1 } },
    vertexShader: `#include <common>\n#include <logdepthbuf_pars_vertex>\n${vert}`,
    fragmentShader: `#include <common>\n#include <logdepthbuf_pars_fragment>\n${frag}`,
    transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
  });
}
const atmo = new THREE.Mesh(new THREE.SphereGeometry(1.03, 64, 32), logDepthShader(
  `uniform float opacity; varying vec3 vN; void main(){ float i = pow(0.72 - dot(vN, vec3(0.,0.,1.)), 3.0); gl_FragColor = vec4(0.45,0.78,1.0,1.0) * i * opacity;\n#include <logdepthbuf_fragment>\n}`,
  `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);\n#include <logdepthbuf_vertex>\n}`));
scene.add(atmo);

{ // stars
  const g = new THREE.BufferGeometry(), n = 2500, p = new Float32Array(n * 3), r = rng(7);
  for (let i = 0; i < n; i++) { const v = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(60 + r() * 40); p.set([v.x, v.y, v.z], i * 3); }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.18, sizeAttenuation: true, transparent: true, opacity: 0.8 })));
}

const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 192, 96), new THREE.MeshStandardMaterial({ color: PAL.ocean, roughness: 1, metalness: 0 }));
scene.add(earth);

const LAND = { data: null, w: 0, h: 0 };
function landAt(lat, lon) {
  if (!LAND.data) return null;
  const x = Math.min(LAND.w - 1, Math.max(0, Math.floor(((lon + 180) / 360) * LAND.w))), y = Math.min(LAND.h - 1, Math.max(0, Math.floor(((90 - lat) / 180) * LAND.h)));
  const i = (y * LAND.w + x) * 4, r = LAND.data[i], g = LAND.data[i + 1], b = LAND.data[i + 2];
  if (b > r + 18 && b >= g - 8) return null;                 // sea, lakes, rivers
  if (r > 225 && g > 225 && b > 225) return 'ice';
  if (r > 175 && r >= g && b < g - 15) return 'desert';
  return 'grass';
}
async function buildEarthTexture() {
  const topo = await fetch(WORLD_URL).then((r) => r.json());
  const countries = feature(topo, topo.objects.countries).features;
  const W = 8192, H = 4096;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, '#1a5873'); grd.addColorStop(0.5, PAL.ocean); grd.addColorStop(1, '#1a5873');
  g.fillStyle = grd; g.fillRect(0, 0, W, H);

  const X = (lon) => ((lon + 180) / 360) * W, Y = (lat) => ((90 - lat) / 180) * H;
  function pathFor(geom) {
    const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : [];
    const p = new Path2D();
    for (const poly of polys) for (const ring of poly) {
      // unwrap across the antimeridian, then draw shifted copies so nothing streaks
      let prev = ring[0][0], off = 0; const xs = [], ys = [];
      for (const [lon, lat] of ring) { let L = lon + off; if (L - prev > 180) { off -= 360; L -= 360; } else if (L - prev < -180) { off += 360; L += 360; } prev = L; xs.push(X(L)); ys.push(Y(lat)); }
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      for (const shift of [0, W, -W]) {
        if (shift === W && minX >= 0) continue;
        if (shift === -W && maxX <= W) continue;
        xs.forEach((x, i) => (i ? p.lineTo(x + shift, ys[i]) : p.moveTo(x + shift, ys[i])));
        p.closePath();
      }
    }
    return p;
  }
  const paths = countries.filter((f) => f.geometry).map((f) => ({ f, p: pathFor(f.geometry) }));
  // shallow-water glow around coasts
  g.lineJoin = 'round';
  g.strokeStyle = 'rgba(95,175,200,0.35)'; g.lineWidth = 26; paths.forEach(({ p }) => g.stroke(p));
  g.strokeStyle = 'rgba(120,195,215,0.45)'; g.lineWidth = 10; paths.forEach(({ p }) => g.stroke(p));
  paths.forEach(({ f, p }, i) => {
    const name = f.properties.name;
    let col;
    if (name === 'Antarctica' || name === 'Greenland') col = PAL.ice;
    else if (DESERT.has(name)) col = PAL.desert[i % PAL.desert.length];
    else col = PAL.land[hash(name) % PAL.land.length];
    g.fillStyle = col; g.fill(p, 'evenodd');
  });
  const green = paths.filter(({ f }) => !DESERT.has(f.properties.name) && f.properties.name !== 'Antarctica' && f.properties.name !== 'Greenland').map(({ p }) => p);
  paintDetail(g, pathFor, green, W, H, await geoP);
  { // the road network (highways only at this scale; every road appears on the close-up map)
    const roads = await fetch('/roads.json').then((r) => r.json()).catch(() => []);
    g.lineCap = 'round'; g.strokeStyle = 'rgba(120,124,130,0.55)'; g.lineWidth = 1.5;
    for (const [x1, y1, x2, y2, cls] of roads) {
      if (cls !== 2 || Math.abs(x2 - x1) > 90) continue;
      const h = hash(x1 + ',' + y1 + ',' + x2), bend = ((h & 1023) / 1023 - 0.5) * 0.35;
      const mx = (x1 + x2) / 2 - (y2 - y1) * bend, my = (y1 + y2) / 2 + (x2 - x1) * bend;
      g.beginPath(); g.moveTo(X(x1), Y(y1)); g.quadraticCurveTo(X(mx), Y(my), X(x2), Y(y2)); g.stroke();
    }
  }
  g.strokeStyle = PAL.border; g.lineWidth = 2.5; paths.forEach(({ p }) => g.stroke(p));
  // roughness: water is glossy (catches the sun), land is matte
  { const rc = document.createElement('canvas'); rc.width = 4096; rc.height = 2048; const rg = rc.getContext('2d');
    rg.fillStyle = '#6e6e6e'; rg.fillRect(0, 0, 4096, 2048); rg.scale(0.5, 0.5); rg.fillStyle = '#ffffff'; paths.forEach(({ p }) => rg.fill(p, 'evenodd'));
    const rt = new THREE.CanvasTexture(rc); earth.material.roughnessMap = rt; earth.material.roughness = 1; }
  { const sc = document.createElement('canvas'); sc.width = 4096; sc.height = 2048; const sg = sc.getContext('2d', { willReadFrequently: true }); sg.drawImage(c, 0, 0, 4096, 2048); LAND.data = sg.getImageData(0, 0, 4096, 2048).data; LAND.w = 4096; LAND.h = 2048; }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  earth.material.map = tex;
  earth.material.color.set('#ffffff');
  earth.material.needsUpdate = true;
}

// ---------------------------------------------------------------- dot sprites (towns & places)
function glowTexture(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, inner); grd.addColorStop(0.45, inner); grd.addColorStop(0.55, outer); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function makeDots(max, tex) {
  const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(2, 2),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }), max);
  m.count = 0; m.frustumCulled = false; m.renderOrder = 2;
  scene.add(m);
  return m;
}
const townDots = makeDots(50000, glowTexture('#ffc23d', 'rgba(255,150,40,0.55)'));
const placeDots = makeDots(10000, glowTexture('#ffffff', 'rgba(120,60,20,0.75)'));
const _m = new THREE.Matrix4(), _s = new THREE.Vector3(), _q = new THREE.Quaternion(), Z = new THREE.Vector3(0, 0, 1);
function layoutDots(mesh, items, size, sizeFn) {
  items.forEach((it, i) => {
    if (!it._n) { it._n = ll2v(it.lat, it.lon).normalize(); it._q = new THREE.Quaternion().setFromUnitVectors(Z, it._n); }
    const s = size * sizeFn(it);
    _m.compose(_s.copy(it._n).multiplyScalar(1 + km(0.05)), it._q, new THREE.Vector3(s, s, s));
    mesh.setMatrixAt(i, _m);
  });
  mesh.count = items.length;
  mesh.instanceMatrix.needsUpdate = true;
}

// ---------------------------------------------------------------- data
let CONFIG = { name: 'World Again', milestones: [] };
let STATE = { day: 1, population: 0, towns: [], news: [], recent: [] };
let towns = [];
const PLACES = []; // curated + wikidata, unified

function addCurated() {
  for (const lm of LANDMARKS) {
    PLACES.push({ ...lm, n: lm.name, k: lm.country, c: 'landmark', cur: true, l: lm.top ? 400 : 250, type: lm.type, scale: 1, viewKm: visitAltKm(lm) });
  }
}
async function loadPlaces() {
  try {
    const list = await fetch('/places.json').then((r) => r.json());
    const cur = PLACES.filter((p) => p.cur).map((p) => ({ p, v: ll2v(p.lat, p.lon).normalize() }));
    const near = km(1.5);
    for (const p of list) {
      const v = ll2v(p.lat, p.lon).normalize();
      if (cur.some((c) => c.v.angleTo(v) < near)) continue; // a hand-made model already stands here
      PLACES.push({ ...p, type: typeForPlace(p), scale: genScale(p), viewKm: genViewKm(p) });
    }
  } catch (e) { console.warn('places.json missing', e); }
  PLACES.forEach((p) => { p._n = ll2v(p.lat, p.lon).normalize(); p._q = new THREE.Quaternion().setFromUnitVectors(Z, p._n); });
  layoutDots(placeDots, PLACES, 1, () => 1);
  lastDotAlt = -1;
}

function decorateTown(t) {
  const nm = CONFIG.milestones.find((m) => t.count < m.at);
  t.built = CONFIG.milestones.filter((m) => t.count >= m.at).map((m) => m.id);
  t.next = nm ? { name: nm.name, need: nm.at - t.count } : null;
  return t;
}
const getFresh = (p) => fetch(p, { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error('Server busy, retrying…'); return r.json(); });
async function refreshState() {
  const [st, tw] = await Promise.all([getFresh('/api/state'), getFresh('/api/towns')]);
  STATE = st;
  const old = new Map(towns.map((t) => [t.key, t]));
  towns = tw.rows.map(([key, name, admin1, country, lat, lon, count, mayor]) => {
    const t = old.get(key) || {};
    return decorateTown(Object.assign(t, { key, name, admin1, country, lat, lon, count, mayor }));
  });
  STATE.news.forEach(decorateTown);
  $('#day').textContent = tr('dayN', { n: STATE.day });
  $('#pop').textContent = tr('population', { n: fmt(STATE.population) });
  lastDotAlt = -1;
  buildTownLabels();
  if (active && !active.replay) {
    const t = towns.find((x) => x.key === active.town.key);
    const grew = t ? t.count - active.town.count : 0;
    const big = active.houses.length > 4000;
    // huge towns rebuild only after real growth (2%) or 5 minutes, so the view doesn't keep stalling
    if (t && grew !== 0 && (!big || Math.abs(grew) > active.houses.length * 0.02 || Date.now() - (active.builtAt || 0) > 300000)) await openTown(t, { rebuildOnly: true, keepFocus: true });
  }
}

// ---------------------------------------------------------------- labels
const labelRoot = new THREE.Group();
scene.add(labelRoot);
function label(html, cls, onClick) {
  const el = document.createElement('div');
  el.className = cls; el.innerHTML = html;
  if (onClick) el.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
  const o = new CSS2DObject(el);
  labelRoot.add(o);
  return o;
}
function removeLabel(o) { o.element.remove(); o.removeFromParent(); }

function buildTownLabels() { lastLabelPick = 0; labelPools.town.forEach((o) => (o.userData.item = null)); }

const PLACE_LABELS = 26;
const placeLabelPool = [];
function placeLabelFor(i) {
  if (!placeLabelPool[i]) {
    const o = label('', 'pl');
    o.element.addEventListener('click', (e) => { e.stopPropagation(); if (o.userData.place) visitPlace(o.userData.place); });
    placeLabelPool[i] = o;
  }
  return placeLabelPool[i];
}

// ---------------------------------------------------------------- place models (built lazily)
const models = new Map(); // place -> group
const modelRoot = new THREE.Group();
scene.add(modelRoot);
function modelFor(p) {
  let g = models.get(p);
  if (!g) {
    const inner = buildModel(p.type, p.color, p);
    inner.scale.setScalar(p.scale || 1);
    g = placeOnSurface(new THREE.Group(), p.lat, p.lon);
    g.add(inner);
    // a small grass pad under every model
    const pad = new THREE.Mesh(new THREE.CircleGeometry(0.35 * (p.scale || 1), 20), new THREE.MeshStandardMaterial({ color: '#6aa84a', roughness: 1 }));
    pad.rotation.x = -Math.PI / 2; pad.position.y = 0.001;
    if (!inner.userData.noPad && !['mountain', 'volcano', 'canyon', 'lake', 'wall', 'mesa', 'waterfall'].includes(p.type)) g.add(pad);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = o !== pad; o.receiveShadow = true; } });
    modelRoot.add(g);
    models.set(p, g);
  }
  return g;
}

// Every ~250 ms: pick which place labels and models to show around the camera.
let lastPick = 0;
function pickPlaces(now) {
  if (now - lastPick < 250) return;
  lastPick = now;
  if (walk.active) placeLabelPool.forEach((o) => (o.visible = false));
  const alt = getAlt();
  const camN = camera.position.clone().normalize();
  // labels
  let shown = [];
  if (alt > 1.1) shown = PLACES.filter((p) => p.cur && p.top && p._n.dot(camN) > 0.35);
  else {
    const cos = Math.cos(Math.min(1.2, alt * 0.75 + km(3)));
    const cand = [];
    for (const p of PLACES) { const d = p._n.dot(camN); if (d > cos) cand.push(p); }
    cand.sort((a, b) => b.l - a.l);
    shown = cand.slice(0, PLACE_LABELS);
  }
  // keep the open town clear: no landmark labels or models inside its area
  const townN = active ? ll2v(active.town.lat, active.town.lon).normalize() : null;
  const clearR = active ? km(active.houseR + 1.1) : 0;
  const inTown = (p) => townN && p._n.angleTo(townN) < clearR;
  if (townN) shown = shown.filter((p) => !inTown(p));
  if (walk.active) shown = [];
  for (let i = 0; i < Math.max(placeLabelPool.length, shown.length); i++) {
    const o = placeLabelFor(i);
    const p = shown[i];
    if (!p) { o.visible = false; continue; }
    if (o.userData.place !== p) {
      o.userData.place = p;
      o.element.className = 'pl' + (p.cur ? ' cur' : '') + (p.h ? ' unesco' : '');
      o.element.innerHTML = `${p.icon ? `<i>${p.icon}</i>` : ''}${esc(p.n)}`;
      o.position.copy(p._n).multiplyScalar(1 + km(0.45 * (p.scale || 1)));
    }
    o.visible = true;
  }
  // models
  const want = new Set();
  if (alt < km(90)) {
    const cos = Math.cos(alt * 2.2 + km(4));
    const cand = [];
    for (const p of PLACES) if (p._n.dot(camN) > cos && !inTown(p)) cand.push(p);
    cand.sort((a, b) => b.l - a.l).slice(0, 90).forEach((p) => want.add(p));
  }
  for (const [p, g] of models) g.visible = want.has(p);
  let fresh = 0;
  for (const p of want) { if (!models.has(p) && ++fresh > 5) continue; modelFor(p).visible = true; }
  if (fresh > 5) lastPick = now - 200; // come back soon for the rest
}

// ---------------------------------------------------------------- camera flights
let fly = null;
function flyTo(lat, lon, altU, done) {
  zoomTarget = null; panVel = null;
  const p0 = camera.position.clone(), a0 = Math.max(getAlt(), MIN_ALT);
  const d0 = p0.clone().normalize(), d1 = ll2v(lat, lon).normalize();
  const ang = d0.angleTo(d1);
  const peak = Math.min(2.6, 0.25 + ang * 1.1);
  const hump = ang > 0.02 ? Math.max(0, Math.log(peak) - Math.max(Math.log(a0), Math.log(altU))) : 0;
  fly = {
    t0: performance.now(), ms: 1600 + Math.min(1600, ang * 900) + hump * 180,
    d0, q: new THREE.Quaternion().setFromUnitVectors(d0, d1),
    la0: Math.log(a0), la1: Math.log(Math.max(altU, MIN_ALT)), hump, done,
  };
  controls.autoRotate = false;
}
function stepFly(now) {
  if (!fly) return;
  const t = Math.min(1, (now - fly.t0) / fly.ms);
  const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const dir = fly.d0.clone().applyQuaternion(new THREE.Quaternion().slerp(fly.q, e));
  const la = fly.la0 + (fly.la1 - fly.la0) * e + fly.hump * Math.sin(Math.PI * e);
  camera.position.copy(dir.multiplyScalar(1 + Math.exp(la)));
  if (t >= 1) { const d = fly.done; fly = null; d && d(); }
}
function seeEarth() {
  closeTown(); hideCard(); currentPlace = null;
  flyTo(v2ll(camera.position).lat * 0.5, v2ll(camera.position).lon, 2.6, () => { controls.autoRotate = true; });
}
$('#backBtn').onclick = seeEarth;

// ---------------------------------------------------------------- towns
let active = null; // { town, group, houses, cells, labels, ring, built }
let clockOffset = 0; // server time minus browser time

async function openTown(t, opts = {}) {
  // start the flight right away (estimated size), load and build while flying, build after landing
  const flying = !opts.rebuildOnly && !opts.noFly;
  let landed = !flying;
  const estR = Math.sqrt(Math.max(1, t.count || 1) * 1.6) / 2 * SPACING + 0.2;
  const arrive = new Promise((res) => { if (flying) { closeTown(); flyTo(t.lat, t.lon, km(Math.max(1.0, estR * 3.2 + 0.6)), () => { landed = true; res(); }); } else res(); });
  let data;
  try { data = await api('/api/town?key=' + encodeURIComponent(t.key)); }
  catch (e) { toast(e.message); return; }
  if (flying) { await Promise.race([arrive, new Promise((r) => setTimeout(r, 4000))]); void landed; }
  clockOffset = (data.now || Date.now()) - Date.now();
  const houses = data.houses.map(([id, i, ht, look, v]) => ({ id, i, t: ht, look: look || null, verified: !!v }));
  const focus = opts.keepFocus && active?.focusId;
  closeTown();
  const built = buildTown({ town: data.town, houses }, CONFIG.milestones, clockOffset);
  built.group.traverse((o) => { if (o.isMesh) { o.receiveShadow = !o.userData.noShadow; o.castShadow = !o.userData.noShadow && !(o.geometry.type === 'CircleGeometry' || o.geometry.type === 'PlaneGeometry'); } });
  placeOnSurface(built.group, data.town.lat, data.town.lon);
  scene.add(built.group);
  if (!opts.rebuildOnly) { // rise out of the ground
    const s0 = built.group.scale.x;
    built.group.scale.set(s0, s0 * 0.02, s0);
    tween(650, (k) => { const e = 1 - Math.pow(1 - k, 3); built.group.scale.y = s0 * (0.02 + 0.98 * e); });
  }
  built.setNight(night);
  built.builtAt = Date.now();
  if (festOn && FEST) built.setFestival(FEST);
  nature.reset();
  active = { builtAt: Date.now(), town: decorateTown(data.town), houses, group: built.group, houseR: built.houseR, cells: built.cells, built, labels: [], ring: null, focusId: null, lastPick: 0, lastLayout: performance.now(), replay: null };
  built.freePlots.forEach((v) => {
    const o = new CSS2DObject(Object.assign(document.createElement('div'), { className: 'hl free', textContent: tr('freePlot') }));
    o.element.addEventListener('click', (e) => { e.stopPropagation(); showRegister(); });
    o.position.copy(v).setY(0.05); built.group.add(o);
  });
  loadWeather(data.town);
  showTownCard();
  $('#backBtn').classList.remove('hidden');
  if (focus) markHouse(focus, true);
  if (opts.done) setTimeout(opts.done, opts.rebuildOnly ? 0 : 450);
}
function closeTown() {
  nature.reset();
  if (!active) return;
  active.labels.forEach(removeLabel);
  active.group.traverse((o) => { if (o.isCSS2DObject) o.element.remove(); });
  active.group.removeFromParent();
  active = null;
  hideCard();
}
function houseLocal(i) { const [gx, gz] = (active && active.cells[i]) || [0, 0]; return new THREE.Vector3(gx * SPACING, 0, gz * SPACING); }
function markHouse(id, noFly) {
  if (!active) return;
  const h = active.houses.find((x) => x.id === id);
  if (!h) return;
  active.focusId = id;
  if (active.ring) active.ring.removeFromParent();
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.075, 0.1, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ff8a1f', transparent: true }));
  ring.position.copy(houseLocal(h.i)).setY(0.004);
  active.group.add(ring); active.ring = ring;
  // the owner stands by the gate and waves, next to a name sign
  if (active.greeter) active.greeter.removeFromParent();
  const [gx, gz] = active.cells[h.i];
  const front = ((gz % ROAD_EVERY) + ROAD_EVERY) % ROAD_EVERY <= 2 ? -1 : 1; // houses face their nearest road
  const greeter = new THREE.Group();
  const person = makePerson(h.id, h.id === myId() ? myLook() : (h.look ? null : null));
  person.scale.setScalar(1.6);
  person.position.set(-0.012, 0, 0);
  greeter.add(person);
  const sc = document.createElement('canvas'); sc.width = 256; sc.height = 112;
  const sg = sc.getContext('2d');
  sg.fillStyle = '#fffdf7'; sg.fillRect(0, 0, 256, 112); sg.strokeStyle = '#1c2433'; sg.lineWidth = 8; sg.strokeRect(4, 4, 248, 104);
  sg.fillStyle = '#1c2433'; sg.textAlign = 'center'; sg.font = '700 36px Fredoka, sans-serif'; sg.fillText('@' + h.id, 128, 54, 236);
  sg.font = '600 22px Fredoka, sans-serif'; sg.fillStyle = '#5e6472'; sg.fillText(active.town.name.toUpperCase(), 128, 88, 236);
  const st = new THREE.CanvasTexture(sc); st.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(0.032, 0.014), new THREE.MeshStandardMaterial({ map: st, roughness: 0.9 }));
  board.position.set(0.016, 0.02, 0.0006);
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.0016, 0.022, 0.0016), new THREE.MeshStandardMaterial({ color: '#6b4a2a' }));
  post.position.set(0.016, 0.011, 0);
  greeter.add(board, post);
  greeter.position.copy(houseLocal(h.i)).add(new THREE.Vector3(0, 0.003, front * 0.06));
  greeter.rotation.y = front > 0 ? 0 : Math.PI;
  greeter.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  active.group.add(greeter); active.greeter = greeter; active.waver = person;
  active.labels.forEach(removeLabel); active.labels = [];
  showTownCard();
  if (!noFly) {
    const { lat, lon } = v2ll(active.group.localToWorld(houseLocal(h.i)));
    flyTo(lat, lon, km(1.1));
  }
  pickHouseLabels(performance.now(), true);
}
function pickHouseLabels(now, force) {
  if (!active || (!force && now - active.lastPick < 250)) return;
  active.lastPick = now;
  const alt = getAlt();
  const T = Date.now() + clockOffset;
  const replayT = active.replay ? active.replay.T : Infinity;
  const wantLabels = alt < km(1.7);
  const centre = active.group.worldToLocal(camera.position.clone().normalize());
  const c2 = new THREE.Vector3(centre.x, 0, centre.z);
  const exists = (h) => h.t <= Math.min(T, replayT);
  const sorted = wantLabels ? active.houses.filter(exists).map((h) => ({ h, d: houseLocal(h.i).distanceToSquared(c2) })).sort((a, b) => a.d - b.d).slice(0, 22).map((x) => x.h) : [];
  if (active.focusId) { const f = active.houses.find((h) => h.id === active.focusId); if (f && exists(f) && !sorted.includes(f)) sorted.push(f); }
  const have = new Map(active.labels.map((o) => [o.userData.id, o]));
  const next = [];
  for (const h of sorted) {
    let o = have.get(h.id);
    if (!o) {
      const me = h.id === active.focusId;
      const st = stageFor(T - h.t);
      o = new CSS2DObject(Object.assign(document.createElement('div'), {
        className: 'hl' + (me ? ' me' : '') + (st === 0 ? ' building' : ''),
        textContent: '@' + h.id + (h.verified ? ' ✓' : '') + (st === 0 ? ' 🔨' : ''),
      }));
      const hm = active.built.homes[h.i] && active.built.homes[h.i].id === h.id ? active.built.homes[h.i] : active.built.homes.find((x) => x.id === h.id);
      o.position.copy(houseLocal(h.i)).setY(hm && hm.tower && st > 0 ? hm.th + 0.014 : st === 4 ? 0.15 : 0.11);
      o.userData.id = h.id;
      active.group.add(o);
    } else have.delete(h.id);
    next.push(o);
  }
  have.forEach(removeLabel);
  active.labels = next;
}
// Houses age in real time: re-stage them every 20 s while a town is open.
function updateFocus(now) {
  if (!active || !active.built.huge || active.replay || now - (active.lastFocus || 0) < 300) return;
  active.lastFocus = now;
  const c = active.group.worldToLocal(camera.position.clone().normalize());
  const altKm = walk.active ? 0.2 : getAlt() * R_KM;
  active.built.setFocus(c.x, c.z, THREE.MathUtils.clamp(altKm * 1.1, 0.8, 2.8));
}
function tickTown(now) {
  if (!active) return;
  updateFocus(now);
  if (active.replay) return stepReplay(now);
  if (now - active.lastLayout > 20000) {
    active.lastLayout = now;
    active.built.layout(Date.now() + clockOffset);
    active.labels.forEach(removeLabel); active.labels = [];
    showTownCard();
  }
}
// "Watch it grow": replay the town from its first house to today in ~12 s.
function startReplay() {
  if (!active) return;
  const end = Date.now() + clockOffset, start = active.built.firstT - 60000;
  active.replay = { start, end, t0: performance.now(), ms: 12000, T: start, last: 0 };
  active.labels.forEach(removeLabel); active.labels = [];
  closeSheet();
  flyTo(active.town.lat, active.town.lon, km(Math.max(1.0, active.houseR * 3.2 + 0.6)));
  $('#replayBar').classList.remove('hidden');
}
function stepReplay(now) {
  const r = active.replay;
  const k = Math.min(1, (now - r.t0) / r.ms);
  if (now - r.last < 80 && k < 1) return;
  r.last = now;
  r.T = r.start + (r.end - r.start) * (k * k * (3 - 2 * k));
  const { present } = active.built.layout(r.T);
  $('#replayBar').innerHTML = `<b>${new Date(r.T).toLocaleDateString('en', { day: 'numeric', month: 'short' })}</b> · ${plural(present, 'house')}<div class="bar"><i style="width:${(k * 100).toFixed(1)}%"></i></div>`;
  if (k >= 1) {
    active.replay = null;
    setTimeout(() => $('#replayBar').classList.add('hidden'), 1500);
    active.built.layout(Date.now() + clockOffset);
    showTownCard();
  }
}
// Zooming in by hand near a town opens it; zooming out closes it.
let lastTownCheck = 0;
function checkTownProximity(now) {
  if (now - lastTownCheck < 500 || fly || visiting) return;
  lastTownCheck = now;
  const alt = getAlt();
  if (active && alt > km(120)) { closeTown(); $('#backBtn').classList.add('hidden'); return; }
  if (!active && alt < km(25)) {
    const camN = camera.position.clone().normalize();
    let best = null, bestA = km(20);
    for (const t of towns) { const a = (t._n || (t._n = ll2v(t.lat, t.lon).normalize())).angleTo(camN); if (a < bestA) { best = t; bestA = a; } }
    if (best) openTown(best, { noFly: true });
  }
}

// ---------------------------------------------------------------- cards & panels
const card = $('#townCard');
let cardOpen = false;
const ago = (ms) => (ms < 3600000 ? `${Math.max(1, Math.round(ms / 60000))} min` : ms < 86400000 ? `${Math.round(ms / 3600000)} h` : `${Math.round(ms / 86400000)} days`);
function showTownCard() {
  if (!active) return;
  const t = active.town, T = Date.now() + clockOffset;
  const counts = [0, 0, 0, 0, 0, 0];
  for (const h of active.houses) counts[stageFor(T - h.t)]++;
  const unlocks = [...CIVIC, ...CONFIG.milestones.map((m) => ({ ...m }))].sort((a, b) => a.at - b.at);
  const next = unlocks.find((u) => t.count < u.at);
  let mine = '';
  if (active.focusId) {
    const h = active.houses.find((x) => x.id === active.focusId);
    if (h) {
      const age = T - h.t, st = stageFor(age), nx = nextStage(age);
      mine = `<div class="mine">🏠 @${esc(h.id)}: <b>${esc(STAGES[st].name)}</b>${nx ? ` · becomes ${esc(nx.name.toLowerCase())} in ${ago(nx.inMs)}` : ''}</div>`;
    }
  }
  const growth = [[0, '🔨'], [1, 'Cottages'], [2, 'Houses'], [3, 'Gardens'], [4, 'Two-storey']].filter(([i]) => counts[i])
    .map(([i, n]) => `<span>${n === '🔨' ? `🔨 ${counts[i]} building` : `${counts[i]} ${n}`}</span>`).join('');
  const w = weather.get(t.key);
  card.innerHTML = `<b>${esc(t.name)}</b>${w ? ` · ${w}` : ''} <span class="muted">${esc([t.admin1, t.country].filter(Boolean).join(', '))}</span>
    <div>${fmt(t.count)} ${t.count === 1 ? tr('house') : tr('houses')}</div>
    ${mine}
    ${next ? `<div class="next">${esc(tr('moreFor', { n: fmt(next.at - t.count), x: lang === 'en' ? aN(tr(next.name)) : tr(next.name) }))}</div>` : `<div class="next">${tr('fullyBuilt')}</div>`}
    <details id="townMore"${cardOpen ? ' open' : ''}><summary>${tr('homes')}</summary>
      <div class="steps">${growth}</div>
      <div class="steps">${unlocks.map((u) => `<span class="${t.count >= u.at ? 'done' : ''}">${esc(u.name)}</span>`).join('')}</div>
      <p class="small">${tr('growNote')}</p>
    </details>
    ${active.focusId && active.focusId === myId() ? `<div class="cardbtns"><button class="grow alt" id="customBtn" type="button">${esc(tr('customise'))}</button></div>` : ''}
    <div class="cardbtns"><button class="grow" id="growBtn" type="button">${tr('watchGrow')}</button><button class="grow alt" id="cardWalk" type="button">${tr('walkHere')}</button><button class="grow ghost" id="cardShare" type="button">${tr('invite')}</button><button class="grow ghost" id="townDio" type="button" title="Diorama">🏝️</button></div>`;
  $('#cardShare').onclick = () => shareTown(active.town);
  $('#growBtn').onclick = startReplay;
  $('#townDio').onclick = townDiorama;
  if ($('#customBtn')) $('#customBtn').onclick = showCustomise;
  $('#cardWalk').onclick = () => walkInTown(active.focusId);
  $('#townMore').ontoggle = (e) => (cardOpen = e.target.open);
  card.classList.remove('hidden');
}
// Real photo + short description from Wikipedia (free licences; credited with a link to the article).
const wikiCache = new Map();
async function wikiFor(p) {
  const key = p.id || p.n;
  if (wikiCache.has(key)) return wikiCache.get(key);
  const job = (async () => {
    let title = p.cur ? p.n : null;
    if (!title && p.id) {
      const r = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${encodeURIComponent(p.id)}&props=sitelinks&sitefilter=enwiki&format=json&origin=*`).then((x) => x.json());
      title = r.entities?.[p.id]?.sitelinks?.enwiki?.title;
    }
    if (!title) title = p.n;
    const s = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`).then((x) => (x.ok ? x.json() : null));
    if (!s || s.type === 'disambiguation') return null;
    return { img: s.thumbnail?.source || null, text: s.extract || '', url: s.content_urls?.desktop?.page };
  })().catch(() => null);
  wikiCache.set(key, job);
  return job;
}
function showPlaceCard(p) {
  const kind = p.cur ? 'Wonder of the world' : (CAT_LABEL[p.c] || 'Famous place');
  const link = p.id ? `https://www.wikidata.org/wiki/${p.id}` : `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(p.n)}`;
  card.innerHTML = `<b>${p.icon ? p.icon + ' ' : ''}${esc(p.n)}</b>
    <div class="muted">${esc(kind)}${p.k ? ' · ' + esc(p.k) : ''}${p.h && p.c !== 'heritage' ? ' · UNESCO World Heritage' : ''}</div>
    <div class="cardbtns">${canWalk(p) ? `<button class="grow alt" id="placeWalk" type="button">${tr('walkHere')}</button>` : ''}<button class="grow ghost" id="placeDio" type="button">🏝️ Diorama</button><a href="${link}" target="_blank" rel="noopener">${tr('readMore')}</a></div>`;
  const pw = $('#placeWalk'); if (pw) pw.onclick = () => walkAtPlace(p);
  $('#placeDio').onclick = () => placeDiorama(p);
  currentPlace = p;
  wikiFor(p).then((w) => {
    if (!w || currentPlace !== p || card.classList.contains('hidden')) return;
    const box = document.createElement('div');
    box.className = 'wiki';
    // compact by default: small photo + two lines; "More" opens the full photo and text
    box.innerHTML = `${w.img ? `<img src="${esc(w.img)}" alt="${esc(p.n)}" loading="lazy">` : ''}<div class="wtxt"><p>${esc(w.text.split('. ').slice(0, 2).join('. ').slice(0, 260))}${w.text ? '.' : ''}</p>
      <span class="wmeta"><button type="button" class="wmore">More</button>${w.url ? ` · <a href="${esc(w.url)}" target="_blank" rel="noopener">Wikipedia</a>` : ''}</span></div>`;
    box.querySelector('.wmore').onclick = () => { const open = box.classList.toggle('open'); box.querySelector('.wmore').textContent = open ? 'Less' : 'More'; };
    card.querySelector('.wiki')?.remove();
    card.insertBefore(box, card.querySelector('.cardbtns'));
  });
  card.classList.remove('hidden');
}
// ---------------------------------------------------------------- diorama posters
const brandLine = () => `${CONFIG.name || 'World Again'}${CONFIG.instagram ? ' · @' + CONFIG.instagram : ''}`;
function placeDiorama(p) {
  const model = buildModel(p.type, p.color, p);
  const kind = p.cur ? 'Wonder of the world' : (CAT_LABEL[p.c] || 'Famous place');
  openDiorama({ model, title: p.n, kicker: p.k || '', subtitle: kind + (p.h && p.c !== 'heritage' ? ' · UNESCO World Heritage' : ''), brand: brandLine() });
}
function townDiorama() {
  if (!active) return;
  const t = active.town;
  const b = buildTown({ town: t, houses: active.houses }, CONFIG.milestones, clockOffset);
  b.layout(Date.now() + clockOffset);
  b.setFocus(0, 0, b.R * 2);
  openDiorama({ model: b.group, round: true, title: t.name, kicker: [t.admin1, t.country].filter(Boolean).join(' · '), subtitle: `${fmt(t.count)} ${t.count === 1 ? 'house' : 'houses'} · rebuilt by its people`, update: (dt) => b.update(dt), brand: brandLine() });
}
function hideCard() { card.classList.add('hidden'); }
function visitPlace(p) {
  closeTown(); closeSheet();
  showPlaceCard(p);
  visiting = true;
  $('#backBtn').classList.remove('hidden');
  flyTo(p.lat, p.lon, km((p.viewKm || 1.6) * (innerWidth < 600 ? 1.5 : 1.15)));
}

const sheet = $('#sheet'), sheetBody = $('#sheetBody');
let openPanel = null;
function openSheet(name, html) {
  openPanel = name;
  sheetBody.innerHTML = html;
  sheet.classList.remove('hidden');
  document.querySelectorAll('[data-panel]').forEach((b) => b.classList.toggle('on', b.dataset.panel === name));
}
function closeSheet() {
  sheet.classList.remove('walkok');
  sheet.classList.add('hidden'); openPanel = null;
  document.querySelectorAll('[data-panel]').forEach((b) => b.classList.remove('on'));
}
$('#sheetX').onclick = closeSheet;
document.querySelectorAll('[data-panel]').forEach((b) => (b.onclick = () => {
  if (openPanel === b.dataset.panel) return closeSheet();
  ({ towns: showTowns, today: showToday, visit: showVisit, ideas: showIdeas, race: showRace })[b.dataset.panel]();
}));

function showToday() {
  const steps = ['Empty Earth', 'First person', 'First house', ...CONFIG.milestones.map((m) => `First ${m.name.toLowerCase()}`)];
  const doneN = 3 + CONFIG.milestones.filter((m) => towns.some((t) => t.count >= m.at)).length;
  openSheet('today', `
    <h2>Day ${STATE.day}</h2>
    <p class="muted">${fmt(STATE.population)} people so far, so we built ${fmt(STATE.population)} houses in ${fmt(towns.length)} towns.</p>
    <div class="steps">${steps.map((s, i) => `<span class="${i < (STATE.population ? doneN : 1) ? 'done' : ''}">${esc(s)}</span>`).join('')}</div>
    <p class="small">New houses for new people. Bring enough people and your town earns a bus stop, then a railway station, then an airport.</p>
    <h3>Town news</h3>
    <ul class="list">${STATE.news.map((t) => `<li class="click" data-town="${esc(t.key)}"><div><b>${esc(t.name)}</b> got ${fmt(t.newThisWeek)} new neighbours<div class="sub">${t.next ? `${fmt(t.next.need)} more people for ${esc(aN(t.next.name.toLowerCase()))}` : 'Fully built'} · ${esc(t.country)}</div></div><span class="num">This week</span></li>`).join('') || '<li class="sub">No houses yet. Be the first!</li>'}</ul>
    <h3>Just moved in</h3>
    <ul class="list">${STATE.recent.map((r) => `<li class="click" data-find="${esc(r.id)}"><span>@${esc(r.id)}</span><span class="sub">${esc(r.town)}, ${esc(r.country)}</span></li>`).join('')}</ul>`);
  bindListClicks();
}
function showTowns() {
  openSheet('towns', `<h2>Towns</h2><p class="muted">${fmt(towns.length)} towns on Earth so far.</p>
    <input class="field" id="townFilter" placeholder="Search towns" autocomplete="off"><ul class="list" id="townList"></ul>`);
  const render = (q = '') => {
    const ql = q.toLowerCase();
    $('#townList').innerHTML = [...towns].filter((t) => !ql || `${t.name} ${t.country} ${t.admin1}`.toLowerCase().includes(ql))
      .sort((a, b) => b.count - a.count).slice(0, 150)
      .map((t) => `<li class="click" data-town="${esc(t.key)}"><div><b>${esc(t.name)}</b><div class="sub">${esc([t.admin1, t.country].filter(Boolean).join(', '))}</div></div><span class="num">${fmt(t.count)}</span></li>`).join('')
      || '<li class="sub">No town yet. Register and start one!</li>';
    bindListClicks();
  };
  $('#townFilter').oninput = (e) => render(e.target.value);
  render();
}
function showVisit() {
  openSheet('visit', `<h2>Visit famous places</h2><p class="muted">${fmt(PLACES.length)} wonders, monuments and natural sights across Earth.</p>
    <input class="field" id="placeFilter" placeholder="Search: Taj Mahal, castle, Japan, waterfall…" autocomplete="off"><ul class="list" id="placeList"></ul>`);
  const render = (q = '') => {
    const ql = q.trim().toLowerCase();
    const list = ql
      ? PLACES.filter((p) => `${p.n} ${p.k} ${CAT_LABEL[p.c] || ''} ${p.cur ? 'wonder' : ''}`.toLowerCase().includes(ql)).sort((a, b) => b.l - a.l).slice(0, 120)
      : PLACES.filter((p) => p.cur).concat(PLACES.filter((p) => !p.cur).slice(0, 60));
    $('#placeList').innerHTML = list.map((p) => `<li class="click" data-place="${PLACES.indexOf(p)}"><div><b>${p.icon ? p.icon + ' ' : ''}${esc(p.n)}</b><div class="sub">${esc(p.cur ? 'Wonder' : CAT_LABEL[p.c] || '')}${p.k ? ' · ' + esc(p.k) : ''}</div></div><span class="num">Visit</span></li>`).join('') || '<li class="sub">Nothing found</li>';
    bindListClicks();
  };
  $('#placeFilter').oninput = (e) => render(e.target.value);
  render();
}
function bindListClicks() {
  sheetBody.querySelectorAll('[data-town]').forEach((li) => (li.onclick = () => {
    const t = towns.find((x) => x.key === li.dataset.town); if (t) { closeSheet(); openTown(t); }
  }));
  sheetBody.querySelectorAll('[data-find]').forEach((li) => (li.onclick = () => { closeSheet(); findHouse(li.dataset.find); }));
  sheetBody.querySelectorAll('[data-place]').forEach((li) => (li.onclick = () => visitPlace(PLACES[+li.dataset.place])));
}

// ---------------------------------------------------------------- register & find
let picked = null;
function showRegister(prefill = {}) {
  picked = active ? { geoId: active.town.key, name: active.town.name, admin1: active.town.admin1, country: active.town.country, lat: active.town.lat, lon: active.town.lon } : null;
  openSheet('register', `
    <h2>${tr('regTitle')}</h2>
    <p class="muted">${tr('regSub')}</p>
    <form id="regForm" autocomplete="off">
      <input class="field" id="regId" placeholder="${tr('idPh')}" autocapitalize="none" spellcheck="false" value="${esc(prefill.id || '')}">
      <input class="field" id="regTown" placeholder="${tr('townPh')}" value="${esc(picked ? picked.name : '')}">
      <ul class="suggest" id="regSuggest"></ul>
      <div class="picked" id="regPicked">${picked ? '📍 ' + esc([picked.name, picked.admin1, picked.country].filter(Boolean).join(', ')) : ''}</div>
      <input class="field" id="regEmail" type="email" placeholder="Your email (to log in later)" autocomplete="email" autocapitalize="none">
      <div class="pwrow"><input class="field" id="regPass" type="password" placeholder="Make a password (8+ characters)" autocomplete="new-password"><button type="button" class="eye" data-eye="regPass">Show</button></div>
      <p class="small">We never show your email. It only lets you log in on any phone and keeps your house safe.</p>
      <div class="err" id="regErr"></div>
      <button class="primary" id="regSubmit">${tr('regBtn')}</button>
    </form>
    <button class="link" id="regCheck" type="button">${tr('checkHouse')}</button>
    <p class="small">${tr('privacy')} <a href="/privacy" target="_blank">Privacy</a></p>`);
  let timer, seq = 0;
  $('#regTown').oninput = (e) => {
    picked = null; $('#regPicked').textContent = '';
    clearTimeout(timer);
    const q = e.target.value.trim();
    if (q.length < 2) { $('#regSuggest').innerHTML = ''; return; }
    timer = setTimeout(async () => {
      const my = ++seq;
      try {
        const r = await fetch(`${GEO_URL}?name=${encodeURIComponent(q)}&count=6&language=en&format=json`).then((x) => x.json());
        if (my !== seq) return;
        const res = r.results || [];
        $('#regSuggest').innerHTML = res.map((p, i) => `<li data-i="${i}">${esc(p.name)} <small>${esc([p.admin1, p.country].filter(Boolean).join(', '))}</small></li>`).join('');
        $('#regSuggest').querySelectorAll('li').forEach((li) => (li.onclick = () => {
          const p = res[+li.dataset.i];
          picked = { geoId: String(p.id), name: p.name, admin1: p.admin1 || '', country: p.country || '', cc: p.country_code || '', lat: p.latitude, lon: p.longitude };
          $('#regTown').value = p.name;
          $('#regSuggest').innerHTML = '';
          $('#regPicked').textContent = '📍 ' + [p.name, p.admin1, p.country].filter(Boolean).join(', ');
        }));
      } catch { $('#regSuggest').innerHTML = '<li>Could not search towns right now</li>'; }
    }, 280);
  };
  $('#regCheck').onclick = () => showLogin();
  bindEyes();
  $('#regForm').onsubmit = async (e) => {
    e.preventDefault();
    const id = cleanHandle($('#regId').value);
    const err = $('#regErr');
    err.textContent = '';
    if (!HANDLE.test(id)) { err.textContent = 'Type your Instagram ID, like @yourname'; return; }
    if (!picked) { err.textContent = 'Pick your town from the list'; return; }
    const email = $('#regEmail').value.trim(), password = $('#regPass').value;
    if (!/^\S+@\S+\.\S+$/.test(email)) { err.textContent = 'Type your email, like name@gmail.com'; return; }
    if (password.length < 8) { err.textContent = 'Password must be at least 8 characters'; return; }
    $('#regSubmit').disabled = true;
    try {
      const r = await api('/api/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, place: picked, key: deviceKey(), email, password }) });
      closeSheet();
      if (r.me) { me = r.me; updateMyHouse(); }
      toast(`Welcome home, @${id}! Your house is ready in ${r.town.name}. Verify your Instagram from "My house".`);
      store.set('wa-me', id); updateMyHouse();
      await refreshState();
      const t = towns.find((x) => x.key === r.town.key) || r.town;
      openTown(t, { done: () => markHouse(id) });
    } catch (ex) {
      err.innerHTML = esc(ex.message) + (/Log in/.test(ex.message) ? ' <button type="button" class="link inline" id="regToLogin">Log in</button>' : '') + (/Claim it/.test(ex.message) ? ' <button type="button" class="link inline" id="regToClaim">Claim it</button>' : '');
      const a = $('#regToLogin'); if (a) a.onclick = () => showLogin();
      const c = $('#regToClaim'); if (c) c.onclick = () => showClaim(id);
    }
    finally { const b = $('#regSubmit'); if (b) b.disabled = false; }
  };
  setTimeout(() => (prefill.id ? $('#regTown') : $('#regId')).focus(), 50);
}
$('#regBtn').onclick = () => (openPanel === 'register' ? closeSheet() : showRegister());

async function findHouse(raw) {
  const id = cleanHandle(raw);
  if (!id) return;
  try {
    const r = await api('/api/find?id=' + encodeURIComponent(id));
    const t = towns.find((x) => x.key === r.town.key) || r.town;
    if (id === myId() && r.house.look) store.set('wa-look', JSON.stringify(r.house.look));
    toast(`@${id} lives in ${t.name}`);
    if (active?.town.key === t.key) markHouse(id);
    else openTown(t, { done: () => markHouse(id) });
  } catch {
    // Not an ID on the map: try a town, then a famous place, then any town on Earth.
    const q = String(raw).trim().toLowerCase();
    const t = towns.find((x) => x.name.toLowerCase() === q);
    if (t) return openTown(t);
    const p = PLACES.find((x) => x.n.toLowerCase() === q) || (q.length >= 4 && PLACES.find((x) => x.n.toLowerCase().includes(q)));
    if (p) return visitPlace(p);
    try {
      const r = await fetch(`${GEO_URL}?name=${encodeURIComponent(raw.trim())}&count=1&language=en&format=json`).then((x) => x.json());
      const g = r.results && r.results[0];
      if (g && HANDLE.test(id) && !id.includes('.') && !id.includes('_')) {
        closeTown(); hideCard();
        $('#backBtn').classList.remove('hidden');
        flyTo(g.latitude, g.longitude, km(60));
        toast(`No houses in ${g.name} yet. Register and be the first!`);
        return;
      }
    } catch { /* offline geocoder */ }
    toast(`No house for @${id} yet. Register it!`);
    showRegister({ id });
  }
}
$('#findForm').onsubmit = (e) => { e.preventDefault(); findHouse($('#findInput').value); $('#findInput').blur(); };

// click a town dot
const ray = new THREE.Raycaster();
let downAt = null;
renderer.domElement.addEventListener('pointerdown', (e) => (downAt = { x: e.clientX, y: e.clientY, t: performance.now() }));
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6 || performance.now() - downAt.t > 450) return;
  const p = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  applyTilt();
  ray.setFromCamera(p, camera);
  restoreTilt();
  const hitEarth = ray.intersectObject(earth)[0];
  const hit = townDots.visible && ray.intersectObject(townDots)[0];
  if (hit && (!hitEarth || hit.distance <= hitEarth.distance + 1e-4)) { openTown(towns[hit.instanceId]); return; }
  const hp = placeDots.visible && ray.intersectObject(placeDots)[0];
  if (hp && (!hitEarth || hp.distance <= hitEarth.distance + 1e-4)) visitPlace(PLACES[hp.instanceId]);
});

// ---------------------------------------------------------------- toast & welcome
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.add('hidden'), 3800);
}
function welcome() {
  if (store.get('wa-welcomed')) return;
  const w = $('#welcome');
  w.classList.remove('hidden');
  const close = () => { w.classList.add('hidden'); store.set('wa-welcomed', '1'); };
  $('#wFind').onclick = () => { close(); showLogin(); };
  $('#wReg').onclick = () => { close(); showRegister(); };
  $('#wLook').onclick = () => { close(); tour(); };
}
function tour() {
  if (store.get('wa-tour')) return;
  const steps = [[tr('tour1t'), tr('tour1')], [tr('tour2t'), tr('tour2')], [tr('tour3t'), tr('tour3')]];
  let i = 0;
  const show = () => {
    $('#tourStep').textContent = `${i + 1} of ${steps.length}`;
    $('#tourTitle').textContent = steps[i][0]; $('#tourText').textContent = steps[i][1];
    $('#tourNext').textContent = i === steps.length - 1 ? tr('done') : tr('next');
  };
  const end = () => { $('#tour').classList.add('hidden'); store.set('wa-tour', '1'); };
  $('#tourSkip').onclick = end;
  $('#tourNext').onclick = () => (++i >= steps.length ? end() : show());
  show(); $('#tour').classList.remove('hidden');
}

// ---------------------------------------------------------------- walk mode
const walk = createWalk({ scene, camera, placeOnSurface, dom: renderer.domElement });
let currentPlace = null, walkLL = null;
const NO_WALK = new Set(['mountain', 'volcano', 'canyon', 'mesa', 'wall', 'waterfall', 'lake']);
const canWalk = (p) => !NO_WALK.has(p.type) && (p.cur || !['mountain', 'volcano', 'canyon', 'lake', 'waterfall', 'coast', 'island'].includes(kindOf(p)));
let me = null; // the logged-in account (from /api/account/me)
const myId = () => (me && me.id) || store.get('wa-me');

function modelObstacles(p) {
  const g = modelFor(p);
  g.visible = true;
  g.updateMatrixWorld(true);
  const inner = g.children[0], k = inner.scale.x;
  return (inner.userData.obstacles || []).map(([a, b, c, d]) => [a * k, b * k, c * k, d * k]);
}
function startWalk(opts) {
  closeSheet();
  walkLL = { lat: opts.lat, lon: opts.lon };
  fly = null; controls.autoRotate = false; controls.enabled = false;
  if (active?.ring) active.ring.visible = false;
  walk.start({ ...opts, handle: myId() || 'guest', look: myId() ? myLook() : null, key: deviceKey(), onExit: endWalk, onStep: (soft) => sound.step(soft) });
  sound.setScene(night ? 'night' : 'outdoor');
}
function endWalk() {
  controls.enabled = true;
  sound.setScene(night ? 'night' : 'outdoor');
  if (active?.ring) active.ring.visible = true;
  camera.position.copy(ll2v(walkLL.lat, walkLL.lon, 1 + km(1.6)));
  camera.up.set(0, 1, 0);
  controls.update();
  if (active) showTownCard(); else if (currentPlace) { visiting = true; showPlaceCard(currentPlace); }
}
$('#walkBack').onclick = () => walk.stop();
$('#walkPhoto').onclick = () => (photoPending = true);

$('#walkSound').onclick = () => {
  sound.setEnabled(!sound.enabled);
  $('#walkSound').textContent = sound.enabled ? '🔊 Sound on' : '🔇 Sound off';
};
function walkAtPlace(p) {
  closeTown();
  const obstacles = modelObstacles(p);
  const southEdge = obstacles.length ? Math.max(...obstacles.map((b) => b[3])) : 0.1;
  startWalk({ lat: p.lat, lon: p.lon, room: 'p:' + (p.id || p.n), title: `${p.icon ? p.icon + ' ' : ''}${p.n}`, obstacles, spawn: [0, Math.min(0.9, southEdge + 0.07), 0], bound: 1.0 });
}
function walkInTown(focusId) {
  if (!active) return;
  const T = Date.now() + clockOffset;
  const obstacles = active.houses.filter((h) => h.t <= T).map((h) => {
    const v = houseLocal(h.i), r = h.i === 0 ? 0.064 : 0.042;
    return [v.x - r, v.x + r, v.z - r * 0.95, v.z + r * 0.95];
  });
  for (const [x, z] of active.built.treeObstacles) obstacles.push([x - 0.008, x + 0.008, z - 0.008, z + 0.008]);
  for (const c of active.built.civic) {
    if (!c.mesh.visible) continue;
    if (!c.mesh.geometry.boundingBox) c.mesh.geometry.computeBoundingBox();
    c.mesh.updateMatrix();
    const b = c.mesh.geometry.boundingBox.clone().applyMatrix4(c.mesh.matrix);
    if (b.max.y > 0.012) obstacles.push([b.min.x - 0.004, b.max.x + 0.004, b.min.z - 0.004, b.max.z + 0.004]);
  }
  let spawn = [0.026, -SPACING * 2.5, 0]; // boulevard lane, facing away from the bus stop
  const h = active.houses.find((x) => x.id === focusId);
  if (h) {
    const [gx, gz] = active.cells[h.i];
    const m = ((gz % ROAD_EVERY) + ROAD_EVERY) % ROAD_EVERY;
    const roadZ = (m <= 2 ? gz - m : gz + (ROAD_EVERY - m)) * SPACING;
    spawn = [gx * SPACING, roadZ + (roadZ > gz * SPACING ? -0.012 : 0.012), roadZ > gz * SPACING ? 0 : Math.PI];
  }
  const t = active.town;
  startWalk({ lat: t.lat, lon: t.lon, room: 't:' + t.key, title: `${t.name}${h ? ` · @${h.id}'s house` : ''}`, obstacles, spawn, bound: active.houseR + 0.8 });
}
function showWalkSheet() {
  const near = towns[0];
  openSheet('walk', `<h2>Walk around</h2>
    <p class="muted">Type your Instagram ID to start at your own house. No password.</p>
    <form id="walkForm" autocomplete="off"><input class="field" id="walkId" placeholder="Your Instagram ID" autocapitalize="none" spellcheck="false" value="${esc(myId() || '')}">
    <div class="err" id="walkErr"></div><button class="primary">Walk from my house</button></form>
    ${near ? `<button class="choice yellow" id="walkGuest" type="button"><b>Walk as a guest</b>in ${esc(near.name)}</button>` : ''}
    <button class="choice" id="walkWonder" type="button" style="background:#eef1f6"><b>Visit a wonder</b>Taj Mahal, Eiffel Tower, Colosseum…</button>
    <p class="small">Please use only your own ID.</p>`);
  $('#walkForm').onsubmit = async (e) => {
    e.preventDefault();
    const id = cleanHandle($('#walkId').value);
    try {
      const r = await api('/api/find?id=' + encodeURIComponent(id));
      store.set('wa-me', id); updateMyHouse();
      const t = towns.find((x) => x.key === r.town.key) || r.town;
      closeSheet();
      openTown(t, { noFly: true, done: () => { markHouse(id, true); walkInTown(id); } });
    } catch { $('#walkErr').textContent = `No house for @${id} yet. Register first, it's free.`; }
  };
  const g = $('#walkGuest');
  if (g) g.onclick = () => { closeSheet(); openTown(near, { noFly: true, done: () => walkInTown() }); };
  $('#walkWonder').onclick = () => { const w = PLACES.filter((p) => p.cur && p.top && canWalk(p)); walkAtPlace(w[Math.floor(Math.random() * w.length)]); };
}
$('#walkBtn').onclick = () => {
  if (active) return walkInTown(active.focusId);
  if (currentPlace && !card.classList.contains('hidden')) return walkAtPlace(currentPlace);
  showWalkSheet();
};

// ---------------------------------------------------------------- accounts: log in, claim, reset, my account
const bindEyes = () => sheetBody.querySelectorAll('[data-eye]').forEach((b) => (b.onclick = () => { const i = $('#' + b.dataset.eye); i.type = i.type === 'password' ? 'text' : 'password'; b.textContent = i.type === 'password' ? 'Show' : 'Hide'; }));
const postJSON = (url, body) => api(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
async function afterLogin(r, msg) {
  me = r.me; updateMyHouse(); closeSheet();
  toast(msg || `Welcome back, @${me.id}!`);
  if (me.id) findHouse(me.id);
}
function showLogin() {
  openSheet('login', `<h2>Welcome back</h2><p class="muted">Use the email and password you made here.</p>
    <form id="loginForm" autocomplete="on">
      <input class="field" id="loginEmail" type="email" placeholder="Your email" autocomplete="email" autocapitalize="none">
      <div class="pwrow"><input class="field" id="loginPass" type="password" placeholder="Your password" autocomplete="current-password"><button type="button" class="eye" data-eye="loginPass">Show</button></div>
      <div class="err" id="loginErr"></div>
      <button class="primary">Go to my house</button>
    </form>
    <button class="link" id="forgotBtn" type="button">Forgot password?</button>
    <button class="choice" id="claimBtn" type="button" style="background:#eef1f6"><b>My house came from a comment</b>Claim it with an email and password</button>
    <button class="link" id="loginToReg" type="button">New here? Register</button>`);
  bindEyes();
  $('#loginForm').onsubmit = async (e) => {
    e.preventDefault();
    try { await afterLogin(await postJSON('/api/account/login', { email: $('#loginEmail').value.trim(), password: $('#loginPass').value })); }
    catch (ex) { $('#loginErr').textContent = ex.message; }
  };
  $('#forgotBtn').onclick = () => { $('#loginErr').innerHTML = `Message ${CONFIG.instagram ? `<b>@${esc(CONFIG.instagram)}</b>` : 'us'} on Instagram <b>from your own account</b> and we'll send you a reset link.`; };
  $('#claimBtn').onclick = () => showClaim('');
  $('#loginToReg').onclick = () => showRegister();
}
function showClaim(id) {
  openSheet('claim', `<h2>Claim your house</h2><p class="muted">Houses added from Instagram comments have no password yet. Set one to make it yours.</p>
    <form id="claimForm">
      <input class="field" id="claimId" placeholder="Your Instagram ID" autocapitalize="none" spellcheck="false" value="${esc(id || '')}">
      <input class="field" id="claimEmail" type="email" placeholder="Your email" autocomplete="email" autocapitalize="none">
      <div class="pwrow"><input class="field" id="claimPass" type="password" placeholder="Make a password (8+ characters)" autocomplete="new-password"><button type="button" class="eye" data-eye="claimPass">Show</button></div>
      <div class="err" id="claimErr"></div><button class="primary">Claim my house</button></form>
    <p class="small">Please claim only your own ID. Fake claims are removed, and the real owner can get the house back by verifying their Instagram.</p>`);
  bindEyes();
  $('#claimForm').onsubmit = async (e) => {
    e.preventDefault();
    try { await afterLogin(await postJSON('/api/account/claim', { id: cleanHandle($('#claimId').value), email: $('#claimEmail').value.trim(), password: $('#claimPass').value }), 'Your house is linked to your account.'); }
    catch (ex) { $('#claimErr').textContent = ex.message; }
  };
}
function showReset(token) {
  openSheet('reset', `<h2>Set a new password</h2>
    <form id="resetForm"><div class="pwrow"><input class="field" id="resetPass" type="password" placeholder="New password (8+ characters)" autocomplete="new-password"><button type="button" class="eye" data-eye="resetPass">Show</button></div>
    <div class="err" id="resetErr"></div><button class="primary">Save and go to my house</button></form>`);
  bindEyes();
  $('#resetForm').onsubmit = async (e) => {
    e.preventDefault();
    try { await afterLogin(await postJSON('/api/account/reset', { token, password: $('#resetPass').value }), 'Password changed.'); history.replaceState(null, '', '/'); }
    catch (ex) { $('#resetErr').textContent = ex.message; }
  };
}
function showAccount() {
  if (!me) return showLogin();
  const ig = CONFIG.instagram ? `@${esc(CONFIG.instagram)}` : 'our Instagram';
  openSheet('account', `<h2>@${esc(me.id || '')} ${me.verified ? '<span class="vbadge">✓ Verified</span>' : ''}</h2>
    <p class="muted">${esc(me.email)}${me.town ? ' · ' + esc(me.town.name) : ''}</p>
    <button class="primary" id="accHouse" type="button">Go to my house</button>
    <button class="choice" id="accCustom" type="button" style="background:#eef1f6"><b>🎨 Customise</b>Colours, garden and your character</button>
    ${me.verified ? '' : `<div class="verify"><b>Prove this Instagram is yours</b><p>Put this code in your Instagram bio, or send it to ${ig} in a DM from <b>@${esc(me.id || '')}</b>:</p><div class="code">${esc(me.code || '')}</div><p class="small">We'll add a ✓ to your house. Verified owners win any dispute over an ID.</p></div>`}
    <button class="link" id="accOut" type="button">Log out</button>`);
  $('#accHouse').onclick = () => { closeSheet(); findHouse(me.id); };
  $('#accCustom').onclick = () => showCustomise();
  $('#accOut').onclick = async () => { await postJSON('/api/account/logout', {}); me = null; store.set('wa-me', ''); updateMyHouse(); closeSheet(); toast('Logged out'); };
}

// ---------------------------------------------------------------- my house, night, weather, ideas
function updateMyHouse() {
  const b = $('#myHouseBtn');
  b.classList.remove('hidden');
  b.querySelector('span').textContent = me ? `@${me.id}` : 'Log in';
}
$('#myHouseBtn').onclick = () => (me ? showAccount() : showLogin());

let night = false;
$('#nightBtn').onclick = () => {
  night = !night;
  NIGHT.value = night ? 1 : 0;
  document.body.classList.toggle('night', night);
  $('#nightBtn').textContent = night ? tr('day') : tr('night');
  hemi.intensity = night ? 0.32 : 1.55;
  hemi.color.set(night ? '#8fa8ff' : '#ffffff');
  sun.intensity = night ? 0.22 : 1.5;
  // sky colour follows altitude in updateSkyAndSun()
  active?.built.setNight(night);
};

const weather = new Map();
const WMO = { 0: '☀️ Clear sky', 1: '🌤️ Mostly clear', 2: '⛅ Partly cloudy', 3: '☁️ Cloudy', 45: '🌫️ Fog', 48: '🌫️ Fog', 51: '🌦️ Drizzle', 53: '🌦️ Drizzle', 55: '🌦️ Drizzle',
  61: '🌧️ Rain', 63: '🌧️ Rain', 65: '🌧️ Heavy rain', 71: '🌨️ Snow', 73: '🌨️ Snow', 75: '❄️ Heavy snow', 80: '🌦️ Showers', 81: '🌧️ Showers', 82: '⛈️ Storm', 95: '⛈️ Thunderstorm', 96: '⛈️ Thunderstorm', 99: '⛈️ Thunderstorm' };
async function loadWeather(t) {
  if (weather.has(t.key)) return;
  weather.set(t.key, '');
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${t.lat}&longitude=${t.lon}&current=temperature_2m,weather_code`).then((x) => x.json());
    const c = r.current;
    if (c) weather.set(t.key, `${Math.round(c.temperature_2m)}° ${WMO[c.weather_code] || ''}`);
    if (active?.town.key === t.key) showTownCard();
  } catch { /* no weather today */ }
}

const IDEAS = [
  ['For your town', [['Bus stop', 'Opens at 50 people', 'busStop'], ['Railway station', 'Opens at 200 people', 'station'], ['Airport', 'Opens at 1,000 people', 'airport'],
    ['School', 'Opens at 75 people', 'school'], ['Park', 'Opens at 25 people', 'park'], ['Hospital', 'Opens at 150 people', 'hospital'], ['Town square', 'Opens at 300 people', 'square'], ['Community garden', 'Opens at 40 people', 'garden'], ['Stadium', 'Opens at 600 people', 'stadium'],
    ['Metro line', '“Bring a metro to Lagos”'], ['Library', '“My town needs a library”'], ['Dam', '“Build a dam near my village”'], ['Beach promenade', '“Give Goa a seaside walk”']]],
  ['Who you want to become', [['Doctor', '“I want my own clinic in Nairobi”'], ['Footballer', '“Build me a pitch in São Paulo”'], ['Cricketer', '“Build a cricket ground in Mumbai”'],
    ['Chef', '“I want a restaurant in Istanbul”'], ['Actor', '“Build me a film studio in LA”'], ['Teacher', '“I want to open a school in Dhaka”'], ['Engineer', '“I want to build bridges in Manila”'], ['Singer', '“Give me a stage in Seoul”']]],
  ['A business', [['Tea stall', '“I want a chai stall in Kolkata”'], ['Bakery', '“A bakery in Paris”'], ['Coffee shop', '“A café in Melbourne”'], ['Gym', '“A gym in Dubai”'],
    ['Farm', '“A farm business in Punjab”'], ['Garage', '“A mechanic garage in Cairo”'], ['Clothes shop', '“A clothes shop in Jakarta”'], ['Hotel', '“A heritage hotel in Jaipur”']]],
];
function showIdeas() {
  const ig = CONFIG.instagram ? `<a href="https://instagram.com/${esc(CONFIG.instagram)}" target="_blank" rel="noopener">@${esc(CONFIG.instagram)}</a>` : 'our latest post';
  const builtAnywhere = (id) => id && towns.some((t) => t.count >= ([...CIVIC, ...CONFIG.milestones].find((c) => c.id === id) || { at: 1e9 }).at);
  openSheet('ideas', `<h2>What do you need?</h2>
    <p class="muted">You get your house first. Then comment on ${ig} what you need and where. The most-liked ideas get built first.</p>
    ${IDEAS.map(([title, list]) => `<h3>${esc(title)}</h3><div class="ideas">${list.map(([n, q, id]) => `<div class="${builtAnywhere(id) ? 'built' : ''}"><b>${esc(n)}</b>${esc(q)}${builtAnywhere(id) ? '<em>Already built somewhere!</em>' : ''}</div>`).join('')}</div>`).join('')}
    <p class="small">Anything else you can imagine, just comment it.</p>`);
}
updateMyHouse();

// ---------------------------------------------------------------- map detail: states, rivers, hills, clouds
const geoP = fetch('/geo.json').then((r) => r.json()).catch(() => null);
const titleCase = (s) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
function pip(ring, x, y) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function lineSegs(list, radius, color, opacity) {
  const pos = [];
  for (const line of list) for (let i = 0; i < line.length - 1; i++) {
    const [a, b] = [line[i], line[i + 1]];
    if (Math.abs(a[0] - b[0]) > 180) continue;
    const p = ll2v(a[1], a[0], radius), q = ll2v(b[1], b[0], radius);
    pos.push(p.x, p.y, p.z, q.x, q.y, q.z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const m = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
  m.frustumCulled = false; m.renderOrder = 1;
  scene.add(m);
  return m;
}
const GEO = { states: null, rivers: null, hills: null, snow: null, clouds: null, stateLabels: [], ranges: [] };
async function buildGeoOverlays() {
  const geo = await geoP;
  if (!geo) return;
  GEO.states = lineSegs(geo.states, 1 + km(0.4), '#ffffff', 0.55);
  GEO.rivers = lineSegs(geo.rivers.filter(([r]) => r <= 8).map(([, l]) => l), 1 + km(0.3), '#4fa8d8', 0.9);
  GEO.stateLabels = geo.stateLabels.map(([n, lon, lat, country, rank]) => ({ n, country, rank, _n: ll2v(lat, lon).normalize() }));

  // low-poly hills on every mountain range
  const rand = rng(42), spots = [];
  for (const [name, poly] of geo.ranges) {
    const ring = poly[0];
    let minX = 180, maxX = -180, minY = 90, maxY = -90, sx = 0, sy = 0;
    for (const [x, y] of ring) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); sx += x; sy += y; }
    if (maxX - minX > 180) continue;
    GEO.ranges.push({ n: titleCase(name), _n: ll2v(sy / ring.length, sx / ring.length).normalize(), size: (maxX - minX) * (maxY - minY) });
    const tries = Math.min(260, Math.ceil((maxX - minX) * (maxY - minY) * 2.2));
    for (let i = 0; i < tries; i++) {
      const x = minX + rand() * (maxX - minX), y = minY + rand() * (maxY - minY);
      if (pip(ring, x, y)) spots.push([y, x, rand(), Math.abs(y)]);
    }
  }
  // real-looking terrain massifs (ridges, valleys, rock and snow) instead of cones; a few shapes reused by instancing
  // natural massifs (6 shapes, each stretched and turned differently) with soft green foothills around them
  const NV = 6;
  const VAR = Array.from({ length: NV }, (_, k) => ({ green: mountainGeometry({ seed: 11 + k, snow: 0, peaks: 2 + (k % 3), grid: 14 }), snowy: mountainGeometry({ seed: 21 + k, snow: 0.36, peaks: 2 + (k % 3), grid: 14 }) }));
  const HILLG = mountainGeometry({ seed: 77, hill: true, grid: 6 });
  const pick = spots.map(([lat, lon, r, alat]) => ({ v: Math.floor(r * 997) % NV, snowy: (r > 0.6 && alat > 27) || alat > 48 }));
  const meshes = [];
  const up = new THREE.Vector3(0, 1, 0), m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), col = new THREE.Color();
  for (let v = 0; v < NV; v++) for (const sn of [false, true]) {
    const list = spots.map((s, i) => [s, pick[i]]).filter(([, k]) => k.v === v && k.snowy === sn);
    if (!list.length) continue;
    const im = new THREE.InstancedMesh(sn ? VAR[v].snowy : VAR[v].green, terrainMaterial, list.length);
    list.forEach(([[lat, lon, r]], i) => {
      const nn = ll2v(lat, lon).normalize(), rad = km(12 + r * 22), h = km(3.5 + r * 11), stretch = 1 + ((r * 13) % 1) * 0.8;
      qq.setFromUnitVectors(up, nn).multiply(new THREE.Quaternion().setFromAxisAngle(up, r * 41));
      m4.compose(nn.clone().multiplyScalar(1 - km(0.4)), qq, new THREE.Vector3(rad * stretch, h, rad / Math.sqrt(stretch)));
      im.setMatrixAt(i, m4); im.setColorAt(i, col.setScalar(0.92 + ((r * 7) % 1) * 0.14));
    });
    im.frustumCulled = false; meshes.push(im);
  }
  { // foothills: low rolling green hills scattered around every range
    const fs = spots.filter((_, i) => i % 2 === 0); // every other range spot gets a foothill
    const fh = new THREE.InstancedMesh(HILLG, terrainMaterial, Math.max(1, fs.length));
    fs.forEach(([lat, lon, r], i) => {
      const a = r * 97, d = 0.12 + ((r * 31) % 1) * 0.18, la = lat + Math.sin(a) * d, lo = lon + Math.cos(a) * d / Math.max(0.3, Math.cos((lat * Math.PI) / 180));
      const nn = ll2v(la, lo).normalize(), rad = km(9 + ((r * 17) % 1) * 10);
      qq.setFromUnitVectors(up, nn).multiply(new THREE.Quaternion().setFromAxisAngle(up, r * 23));
      fh.setMatrixAt(i, m4.compose(nn.clone().multiplyScalar(1 - km(0.3)), qq, new THREE.Vector3(rad * 1.4, km(1.2 + ((r * 5) % 1) * 1.6), rad)));
      fh.setColorAt(i, col.setScalar(0.95 + ((r * 3) % 1) * 0.1));
    });
    fh.frustumCulled = false; meshes.push(fh);
  }
  GEO.hills = new THREE.Group(); GEO.hills.add(...meshes);
  GEO.snow = new THREE.Group(); // snow is part of the terrain colours now
  scene.add(GEO.hills, GEO.snow);

  // 3D skylines for real cities (Natural Earth populated places), sized by population
  if (geo.cities) buildCities(geo.cities, rand);

  // drifting clouds
  const m = new THREE.Matrix4(), q = new THREE.Quaternion();
  const puffs = [];
  for (let k = 0; k < 5; k++) puffs.push(new THREE.IcosahedronGeometry(0.5 + (k % 3) * 0.18, 1).translate((k - 2) * 0.55, (k % 2) * 0.15, (k % 3 - 1) * 0.25));
  const cloudG = mergeGeometries(puffs.map((p) => p.toNonIndexed()));
  cloudG.scale(1, 0.45, 1);
  const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true, transparent: true, opacity: 0.92 });
  const N = 90;
  GEO.clouds = new THREE.InstancedMesh(cloudG, cloudMat, N);
  for (let i = 0; i < N; i++) {
    const lat = -55 + rand() * 120, lon = -180 + rand() * 360;
    const n = ll2v(lat, lon).normalize();
    const s = km(60 + rand() * 120);
    q.setFromUnitVectors(up, n).multiply(new THREE.Quaternion().setFromAxisAngle(up, rand() * 6));
    GEO.clouds.setMatrixAt(i, m.compose(n.clone().multiplyScalar(1 + km(30)), q, new THREE.Vector3(s, s, s)));
  }
  const cloudRoot = new THREE.Group(); cloudRoot.add(GEO.clouds); GEO.cloudRoot = cloudRoot;
  scene.add(cloudRoot);
}
// Paint deserts, forests, mountain shading, lakes and rivers into the globe texture.
function paintDetail(g, pathFor, landPaths, W, H, geo) {
  const X = (lon) => ((lon + 180) / 360) * W, Y = (lat) => ((90 - lat) / 180) * H;
  const rand = rng(9);
  // forest texture on green land
  g.save();
  const clip = new Path2D();
  landPaths.forEach((p) => clip.addPath(p));
  g.clip(clip, 'evenodd');
  for (let i = 0; i < 90000; i++) {
    const lat = -55 + Math.pow(rand(), 1) * 125, lon = -180 + rand() * 360;
    const tropical = Math.abs(lat) < 23 ? 0.35 : 0.2;
    g.fillStyle = rand() < 0.5 ? `rgba(40,95,40,${tropical})` : `rgba(130,180,90,${tropical * 0.8})`;
    g.beginPath(); g.arc(X(lon), Y(lat), 1.5 + rand() * 3.5, 0, Math.PI * 2); g.fill();
  }
  g.restore();
  if (!geo) return;
  for (const poly of geo.deserts) {
    const p = pathFor({ type: 'Polygon', coordinates: poly });
    g.fillStyle = 'rgba(222,196,140,0.85)'; g.fill(p, 'evenodd');
  }
  for (const [, poly] of geo.ranges) {
    const p = pathFor({ type: 'Polygon', coordinates: poly });
    g.fillStyle = 'rgba(110,105,80,0.35)'; g.fill(p, 'evenodd');
  }
  g.fillStyle = PAL.shallow;
  for (const poly of geo.lakes) g.fill(pathFor({ type: 'Polygon', coordinates: poly }), 'evenodd');
  g.strokeStyle = '#3f93c4'; g.lineCap = 'round'; g.lineJoin = 'round';
  for (const [rank, line] of geo.rivers) {
    g.lineWidth = rank <= 3 ? 3.5 : rank <= 6 ? 2.2 : 1.4;
    g.beginPath();
    line.forEach(([lon, lat], i) => (i && Math.abs(line[i - 1][0] - lon) < 180 ? g.lineTo(X(lon), Y(lat)) : g.moveTo(X(lon), Y(lat))));
    g.stroke();
  }
}
// Labels that appear as you zoom: town names, state names, mountain ranges.
const TOWN_LABELS = 40, STATE_LABELS = 34, RANGE_LABELS = 10;
const labelPools = { town: [], state: [], range: [], city: [] };
function poolLabel(kind, i, cls, onClick) {
  const pool = labelPools[kind];
  if (!pool[i]) {
    const o = label('', cls);
    if (onClick) o.element.addEventListener('click', (e) => { e.stopPropagation(); if (o.userData.item) onClick(o.userData.item); });
    pool[i] = o;
  }
  return pool[i];
}
function fillPool(kind, items, cls, html, height, onClick) {
  const pool = labelPools[kind];
  for (let i = 0; i < Math.max(pool.length, items.length); i++) {
    const o = poolLabel(kind, i, cls, onClick), it = items[i];
    if (!it) { o.visible = false; continue; }
    if (o.userData.item !== it) { o.userData.item = it; o.element.innerHTML = html(it); o.position.copy(it._n).multiplyScalar(1 + height); }
    o.visible = true;
  }
}
let lastLabelPick = 0;
function pickMapLabels(now) {
  if (now - lastLabelPick < 300) return;
  lastLabelPick = now;
  const alt = getAlt(), camN = camera.position.clone().normalize();
  const inView = (list, ang) => { const c = Math.cos(ang); return list.filter((t) => t._n.dot(camN) > c); };
  const hide = walk.active || alt < km(30);
  // towns: biggest first, more as you zoom in
  let ts = [];
  if (!hide) {
    towns.forEach((t) => { if (!t._n) t._n = ll2v(t.lat, t.lon).normalize(); });
    ts = inView(towns, Math.min(1.25, alt * 0.8 + km(30))).filter((t) => !(active && active.town.key === t.key)).sort((a, b) => b.count - a.count).slice(0, alt > 1 ? 14 : TOWN_LABELS);
  }
  fillPool('town', ts, 'tl', (t) => `${esc(t.name)}<span>${fmt(t.count)}</span>`, km(0.3), (t) => openTown(t));
  // real cities
  let cs = [];
  if (!hide && alt < 0.7 && GEO.cities) {
    const shown = new Set(ts.map((t) => t.name.toLowerCase()));
    if (active) shown.add(active.town.name.toLowerCase());
    cs = inView(GEO.cities, alt * 0.75 + km(30)).filter((c) => !shown.has(c.n.toLowerCase())).sort((a, b) => b.pop - a.pop).slice(0, 26);
  }
  fillPool('city', cs, 'cl', (c) => esc(c.n), km(3));
  for (const o of labelPools.city) if (o.userData.item) o.element.classList.toggle('cap', !!o.userData.item.cap);
  // states / provinces
  let ss = [];
  if (!hide && alt < 0.32) ss = inView(GEO.stateLabels, alt * 0.75 + km(40)).sort((a, b) => a.rank - b.rank).slice(0, STATE_LABELS);
  fillPool('state', ss, 'sl', (s) => esc(s.n), km(0.2));
  // mountain ranges
  let rs = [];
  if (!hide && alt < 0.9 && alt > km(200)) rs = inView(GEO.ranges, alt * 0.8).sort((a, b) => b.size - a.size).slice(0, RANGE_LABELS);
  fillPool('range', rs, 'rl', (r) => `⛰ ${esc(r.n)}`, km(25));
}
function windowTex(lit) {
  const c = document.createElement('canvas'); c.width = 32; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = lit ? '#000' : '#ffffff'; g.fillRect(0, 0, 32, 64);
  const r = rng(lit ? 3 : 4);
  for (let y = 4; y < 62; y += 7) for (let x = 3; x < 30; x += 7) {
    g.fillStyle = lit ? (r() < 0.65 ? '#ffd27a' : '#000') : '#7d93a8';
    g.fillRect(x, y, 4, 4);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; return t;
}
function buildCities(list, rand) {
  const cities = list.filter((c) => c[3] >= 200000);
  const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', map: windowTex(false), emissive: '#ffffff', emissiveMap: windowTex(true), emissiveIntensity: 0, roughness: 0.85 });
  const COLS = ['#d9d4c7', '#c7cdd4', '#a9b8c6', '#e6dfcf', '#b9b0a2', '#8fa7bd', '#d2c3a8', '#e8e2d6'];
  const up = new THREE.Vector3(0, 1, 0), m = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color(), sc = new THREE.Vector3();
  const items = [], pads = [];
  const CELL = 0.75; // km: one city block
  for (const [, lon, lat, pop] of cities) {
    const R = 2.5 + Math.sqrt(pop) / 850;  // km
    const tall = THREE.MathUtils.clamp((Math.log10(pop) - 5.2) / 2.2, 0.15, 1);
    const cosLat = Math.max(0.2, Math.cos((lat * Math.PI) / 180));
    const nC = ll2v(lat, lon).normalize();
    const east = new THREE.Vector3(0, 1, 0).cross(nC).normalize(), north = nC.clone().cross(east);
    const tilt = rand() * 0.6 - 0.3; // each city's street grid has its own angle
    pads.push([nC, R]);
    const r = Math.ceil(R / CELL);
    for (let gx = -r; gx <= r; gx++) for (let gz = -r; gz <= r; gz++) {
      if (gx % 4 === 0 || gz % 4 === 0) continue; // avenues
      const d = Math.hypot(gx, gz) * CELL;
      if (d > R) continue;
      const near = 1 - d / R;
      if (rand() > 0.35 + near * 0.6) continue;
      const x = gx * CELL * Math.cos(tilt) - gz * CELL * Math.sin(tilt), z = gx * CELL * Math.sin(tilt) + gz * CELL * Math.cos(tilt);
      const blat = lat + z / 111, blon = lon + x / (111 * cosLat);
      const nrm = ll2v(blat, blon).normalize();
      const w = CELL * (0.45 + rand() * 0.35), dep = CELL * (0.45 + rand() * 0.35);
      const h = 0.1 + Math.pow(near, 2.4) * (0.3 + rand() * 2.8) * tall + rand() * 0.12;
      q.setFromUnitVectors(up, nrm);
      // keep the block aligned with the city grid
      const fwd = north.clone().applyAxisAngle(nC, tilt);
      const yaw = Math.atan2(fwd.clone().cross(new THREE.Vector3(0, 0, 1).applyQuaternion(q)).dot(nrm), fwd.dot(new THREE.Vector3(0, 0, -1).applyQuaternion(q)));
      q.multiply(new THREE.Quaternion().setFromAxisAngle(up, -yaw));
      items.push([nrm.multiplyScalar(1 + km(0.004)), q.clone(), km(w), km(h), km(dep)]);
    }
  }
  const mesh = new THREE.InstancedMesh(geo, mat, items.length);
  items.forEach(([p, qq, w, h, d], i) => { mesh.setMatrixAt(i, m.compose(p, qq, sc.set(w, h, d))); mesh.setColorAt(i, col.set(COLS[Math.floor(rand() * COLS.length)])); });
  mesh.frustumCulled = false;
  scene.add(mesh);
  // grey urban ground under each city
  const padMesh = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#b8b3a7', roughness: 1, transparent: true, opacity: 0.85 }), pads.length);
  pads.forEach(([n, R], i) => padMesh.setMatrixAt(i, m.compose(n.clone().multiplyScalar(1 + km(0.003)), q.setFromUnitVectors(up, n), sc.set(km(R * 1.1), 1, km(R * 1.1)))));
  padMesh.frustumCulled = false;
  scene.add(padMesh);
  GEO.cityMesh = mesh; GEO.cityPads = padMesh;
  GEO.cities = list.slice(0, 1500).map(([n, lon, lat, pop, country, cap]) => ({ n, country, pop, cap, _n: ll2v(lat, lon).normalize() }));
}
// Hide lower-priority labels that collide on screen (your town and wonders win, states lose).
const PRIORITY = { tl: 6, 'pl cur': 5, hl: 5, cl: 4, pl: 3, rl: 2, sl: 1 };
let lastDeclutter = 0;
function declutter(now) {
  if (now - lastDeclutter < 200) return;
  lastDeclutter = now;
  const items = [];
  const v = new THREE.Vector3();
  labelRoot.traverse((o) => collect(o));
  if (active) active.group.traverse((o) => collect(o));
  function collect(o) {
    if (!o.isCSS2DObject || !o.visible) return;
    const el = o.element;
    o.getWorldPosition(v); v.project(camera);
    if (v.z > 1) return;
    const cls = el.className.replace(' declutter-hide', '');
    const pr = PRIORITY[cls.startsWith('pl cur') ? 'pl cur' : cls.split(' ')[0]] || 2;
    if (!el._w || el._html !== el.innerHTML) { el._w = el.offsetWidth || 60; el._h = el.offsetHeight || 18; el._html = el.innerHTML; }
    const w = el._w, h = el._h;
    const x = (v.x * 0.5 + 0.5) * innerWidth, y = (-v.y * 0.5 + 0.5) * innerHeight;
    items.push({ el, pr: pr + (el.classList.contains('me') ? 10 : 0), x0: x - w / 2 - 3, x1: x + w / 2 + 3, y0: y - h / 2 - 2, y1: y + h / 2 + 2 });
  }
  items.sort((a, b) => b.pr - a.pr);
  const placed = [];
  for (const it of items) {
    const hit = placed.some((p) => it.x0 < p.x1 && it.x1 > p.x0 && it.y0 < p.y1 && it.y1 > p.y0);
    it.el.classList.toggle('declutter-hide', hit);
    if (!hit) placed.push(it);
  }
}
function geoFrame(alt, dt) {
  if (GEO.cityMesh) {
    GEO.cityMesh.visible = GEO.cityPads.visible = alt < 0.55 && alt > km(30) && !(active && alt < km(150));
    GEO.cityMesh.material.emissiveIntensity = night ? 1.1 : 0;
  }
  if (GEO.states) { GEO.states.visible = alt < 1.6 && alt > km(25); GEO.states.material.opacity = THREE.MathUtils.clamp(0.9 - alt * 0.5, 0.25, 0.75); }
  if (GEO.rivers) GEO.rivers.visible = alt < 0.45 && alt > km(25);
  if (GEO.hills) { const v = alt < 1.3 && alt > km(70); GEO.hills.visible = GEO.snow.visible = v; }
  if (GEO.cloudRoot) {
    GEO.cloudRoot.rotation.y += dt * 0.004;
    GEO.cloudRoot.visible = alt > 0.06 && !walk.active;
    GEO.clouds.material.opacity = THREE.MathUtils.clamp((alt - 0.06) * 6, 0, 0.92);
  }
}

// ---------------------------------------------------------------- language
{
  const sel = $('#langSel');
  sel.innerHTML = Object.entries(LANGS).map(([k, v]) => `<option value="${k}"${k === lang ? ' selected' : ''}>🌐 ${v}</option>`).join('');
  sel.onchange = () => {
    setLang(sel.value);
    $('#nightBtn').textContent = night ? tr('day') : tr('night');
    $('#day').textContent = tr('dayN', { n: STATE.day }); $('#pop').textContent = tr('population', { n: fmt(STATE.population) });
    if (FEST) $('#festBtn').textContent = festOn ? tr('hideLights') : tr('festBtn', { x: FEST.name });
    closeSheet();
    if (active) openTown(active.town, { rebuildOnly: true, keepFocus: true }); else if (currentPlace && !card.classList.contains('hidden')) showPlaceCard(currentPlace);
  };
  applyStatic();
}

// ---------------------------------------------------------------- festivals
const FEST = currentFestival();
let festOn = false, festMadeNight = false;
if (FEST) { $('#festBtn').textContent = tr('festBtn', { x: FEST.name }); $('#festBtn').classList.remove('hidden'); }
$('#festBtn').onclick = () => {
  festOn = !festOn;
  $('#festBtn').classList.toggle('on', festOn);
  $('#festBtn').textContent = festOn ? tr('hideLights') : tr('festBtn', { x: FEST.name });
  if (festOn) {
    toast(FEST.greeting);
    if (FEST.night && !night) { $('#nightBtn').click(); festMadeNight = true; }
    if (!FEST.night && night) $('#nightBtn').click();
    if (active) active.built.setFestival(FEST);
    else {
      const top = [...towns].sort((x, y) => y.count - x.count)[0];
      (async () => {
        try {
          if (!myId()) throw new Error('none');
          const r = await api('/api/find?id=' + encodeURIComponent(myId()));
          const t = towns.find((x) => x.key === r.town.key) || r.town;
          openTown(t, { done: () => markHouse(myId()) });
        } catch { if (top) openTown(top); }
      })();
    }
  } else {
    active?.built.setFestival(null);
    if (festMadeNight && night) $('#nightBtn').click();
    festMadeNight = false;
  }
};

// ---------------------------------------------------------------- race (leaderboards) + share links
const flag = (cc) => (cc && /^[a-z]{2}$/i.test(cc) ? String.fromCodePoint(...cc.toUpperCase().split('').map((c) => 127397 + c.charCodeAt(0))) : '🌍');
const medal = (i) => ['🥇', '🥈', '🥉'][i] || `<span class="rank">${i + 1}</span>`;
let raceView = { kind: 'countries', span: 'week' };
async function showRace() {
  openSheet('race', `<h2>🏆 The race</h2><p class="muted">Which country and town grows fastest? Invite friends to push yours up.</p>
    <div class="seg" id="raceKind"><button data-k="countries">Countries</button><button data-k="towns">Towns</button></div>
    <div class="seg" id="raceSpan"><button data-s="today">Today</button><button data-s="week">This week</button><button data-s="all">All time</button></div>
    <ul class="list race" id="raceList"><li class="sub">Loading…</li></ul>
    <button class="primary" id="raceShare" type="button">📣 Invite friends to your town</button>`);
  let data;
  try { data = await getFresh('/api/race'); } catch { $('#raceList').innerHTML = '<li class="sub">Could not load the race right now.</li>'; return; }
  const render = () => {
    document.querySelectorAll('#raceKind button').forEach((b) => b.classList.toggle('on', b.dataset.k === raceView.kind));
    document.querySelectorAll('#raceSpan button').forEach((b) => b.classList.toggle('on', b.dataset.s === raceView.span));
    const rows = data[raceView.kind][raceView.span];
    const max = Math.max(1, ...rows.map((r) => r.n));
    const unit = raceView.span === 'all' ? 'houses' : 'new';
    $('#raceList').innerHTML = rows.length ? rows.map((r, i) => raceView.kind === 'countries'
      ? `<li class="click" data-country="${esc(r.country)}"><div class="rk">${medal(i)}</div><div class="grow1"><b>${flag(r.cc)} ${esc(r.country)}</b><div class="bar"><i style="width:${(r.n / max) * 100}%"></i></div></div><span class="num">${fmt(r.n)} <small>${unit}</small></span></li>`
      : `<li class="click" data-town="${esc(r.key)}"><div class="rk">${medal(i)}</div><div class="grow1"><b>${flag(r.cc)} ${esc(r.name)}</b> <span class="sub">${esc(r.country)}</span><div class="bar"><i style="width:${(r.n / max) * 100}%"></i></div></div><span class="num">${fmt(r.n)} <small>${unit}</small></span></li>`).join('')
      : '<li class="sub">No one yet. Be the first!</li>';
    bindListClicks();
    sheetBody.querySelectorAll('[data-country]').forEach((li) => (li.onclick = () => {
      const top = towns.filter((t) => t.country === li.dataset.country).sort((a, b) => b.count - a.count)[0];
      if (top) { closeSheet(); closeTown(); hideCard(); $('#backBtn').classList.remove('hidden'); flyTo(top.lat, top.lon, 0.12); }
    }));
  };
  $('#raceKind').onclick = (e) => { if (e.target.dataset.k) { raceView.kind = e.target.dataset.k; render(); } };
  $('#raceSpan').onclick = (e) => { if (e.target.dataset.s) { raceView.span = e.target.dataset.s; render(); } };
  $('#raceShare').onclick = () => shareTown();
  render();
}
async function shareTown(t = active?.town) {
  const me = myId();
  const url = new URL(location.origin);
  if (me) url.searchParams.set('id', me); else if (t) url.searchParams.set('town', t.key);
  const where = t ? t.name : 'your town';
  const text = `Help ${where} win the ${CONFIG.name || 'World Again'} race! Get your free house with your Instagram ID on it.`;
  try {
    if (navigator.share) await navigator.share({ title: CONFIG.name, text, url: url.href });
    else { await navigator.clipboard.writeText(`${text} ${url.href}`); toast('Invite link copied. Paste it in your story or chats!'); }
  } catch { /* cancelled */ }
}
// Deep links: ?id=handle, ?town=key, ?place=name
async function openFromLink() {
  const q = new URLSearchParams(location.search);
  if (q.get('id')) return findHouse(q.get('id'));
  if (q.get('town')) { const t = towns.find((x) => x.key === q.get('town')); if (t) return openTown(t); }
  if (q.get('place')) { const n = q.get('place').toLowerCase(); const p = PLACES.find((x) => x.n.toLowerCase() === n); if (p) return visitPlace(p); }
}

// ---------------------------------------------------------------- sharp close-up map
// Near the ground we paint a high-resolution map of just the area on screen (10 m-scale coastlines)
// and lay it over the globe; the globe's own low-res texture is hidden underneath it.
const HI = { ready: null, countries: null, mesh: null, key: null, busy: false, last: 0, r: 1 };
// a wider second layer around the close-up one, so the land towards the horizon stays sharp too
const HO = { mesh: null, key: null, busy: false, last: 0, r: 1 - 0.0000004 };
const PATCH_ALT = 0.36;
const patchUniforms = { uPatchOn: { value: 0 }, uPatch: { value: new THREE.Vector4() } };
earth.material.onBeforeCompile = (sh) => {
  Object.assign(sh.uniforms, patchUniforms);
  sh.vertexShader = 'varying vec3 vObjPos;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vObjPos = position;');
  sh.fragmentShader = 'varying vec3 vObjPos; uniform float uPatchOn; uniform vec4 uPatch;\n' + sh.fragmentShader.replace('void main() {', `void main() {
    if (uPatchOn > 0.5) {
      vec3 n = normalize(vObjPos);
      float lat = degrees(asin(clamp(n.y, -1.0, 1.0)));
      float lon = degrees(atan(n.z, -n.x)) - 180.0;
      if (lon < -180.0) lon += 360.0;
      if (lon > uPatch.x && lon < uPatch.y && lat > uPatch.z && lat < uPatch.w) discard;
    }`);
};
function degPath(rings) {
  const p = new Path2D();
  let minX = 999, maxX = -999, minY = 999, maxY = -999;
  for (const ring of rings) {
    let prev = ring[0][0], off = 0;
    ring.forEach(([lon, lat], i) => {
      let L = lon + off;
      if (L - prev > 180) { off -= 360; L -= 360; } else if (L - prev < -180) { off += 360; L += 360; }
      prev = L;
      if (i) p.lineTo(L, lat); else p.moveTo(L, lat);
      if (L < minX) minX = L; if (L > maxX) maxX = L; if (lat < minY) minY = lat; if (lat > maxY) maxY = lat;
    });
    p.closePath();
  }
  return { p, box: [minX, maxX, minY, maxY] };
}
const polyRings = (geom) => (geom.type === 'Polygon' ? geom.coordinates : geom.type === 'MultiPolygon' ? geom.coordinates.flat() : []);
function loadHiRes() {
  if (!HI.ready) HI.ready = (async () => {
    const [topo, geo] = await Promise.all([fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-10m.json').then((r) => r.json()), geoP]);
    HI.countries = feature(topo, topo.objects.countries).features.filter((f) => f.geometry).map((f, i) => {
      const name = f.properties.name;
      const col = name === 'Antarctica' || name === 'Greenland' ? PAL.ice : DESERT.has(name) ? PAL.desert[i % PAL.desert.length] : PAL.land[hash(name) % PAL.land.length];
      return { ...degPath(polyRings(f.geometry)), col, green: col !== PAL.ice && !DESERT.has(name) };
    });
    if (geo) {
      HI.deserts = geo.deserts.map((poly) => degPath(poly));
      HI.ranges = geo.ranges.map(([, poly]) => degPath(poly));
      HI.lakes = geo.lakes.map((poly) => degPath(poly));
      HI.rivers = geo.rivers.map(([rank, line]) => {
        const p = new Path2D(); line.forEach(([lon, lat], i) => (i ? p.lineTo(lon, lat) : p.moveTo(lon, lat)));
        const xs = line.map((q) => q[0]), ys = line.map((q) => q[1]);
        return { p, rank, box: [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)] };
      });
    }
  })().catch((e) => { console.warn('hi-res map failed', e); HI.ready = null; });
  return HI.ready;
}
const overlaps = (b, x0, x1, y0, y1) => b[1] >= x0 && b[0] <= x1 && b[3] >= y0 && b[2] <= y1;
function paintPatch(lon0, lon1, lat0, lat1) {
  const S = 2048;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  const sx = S / (lon1 - lon0), sy = S / (lat1 - lat0);
  g.fillStyle = PAL.ocean; g.fillRect(0, 0, S, S);
  g.setTransform(sx, 0, 0, -sy, -lon0 * sx, lat1 * sy);
  const px = 1 / Math.min(sx, sy);
  const vis = HI.countries.filter((f) => overlaps(f.box, lon0, lon1, lat0, lat1));
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = 'rgba(95,175,200,0.35)'; g.lineWidth = 22 * px; vis.forEach((f) => g.stroke(f.p));
  g.strokeStyle = 'rgba(120,195,215,0.5)'; g.lineWidth = 8 * px; vis.forEach((f) => g.stroke(f.p));
  vis.forEach((f) => { g.fillStyle = f.col; g.fill(f.p, 'evenodd'); });
  // forest texture anchored to the world grid, so it doesn't shimmer when the patch moves
  g.save();
  const clip = new Path2D(); vis.filter((f) => f.green).forEach((f) => clip.addPath(f.p));
  g.clip(clip, 'evenodd');
  const cell = (lat1 - lat0) / 110;
  for (let y = Math.floor(lat0 / cell); y * cell < lat1; y++) for (let x = Math.floor(lon0 / cell); x * cell < lon1; x++) {
    const h = hash(x + ':' + y);
    const jx = ((h & 255) / 255) * cell, jy = (((h >>> 8) & 255) / 255) * cell;
    g.fillStyle = h & 0x10000 ? 'rgba(40,95,40,0.28)' : 'rgba(130,180,90,0.25)';
    g.beginPath(); g.arc(x * cell + jx, y * cell + jy, (3 + ((h >>> 20) & 7)) * px, 0, Math.PI * 2); g.fill();
  }
  g.restore();
  const draw = (list, style) => list && list.filter((f) => overlaps(f.box, lon0, lon1, lat0, lat1)).forEach((f) => { g.fillStyle = style; g.fill(f.p, 'evenodd'); });
  draw(HI.deserts, 'rgba(222,196,140,0.85)');
  draw(HI.ranges, 'rgba(110,105,80,0.3)');
  draw(HI.lakes, PAL.shallow);
  g.strokeStyle = '#3f93c4';
  (HI.rivers || []).filter((r) => overlaps(r.box, lon0, lon1, lat0, lat1)).forEach((r) => { g.lineWidth = (r.rank <= 3 ? 4 : r.rank <= 6 ? 2.6 : 1.6) * px; g.stroke(r.p); });
  g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 2.2 * px; vis.forEach((f) => g.stroke(f.p));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const rc = document.createElement('canvas'); rc.width = rc.height = 512;
  const rg = rc.getContext('2d');
  rg.fillStyle = '#6e6e6e'; rg.fillRect(0, 0, 512, 512);
  rg.setTransform(sx / 4, 0, 0, -sy / 4, (-lon0 * sx) / 4, (lat1 * sy) / 4);
  rg.fillStyle = '#ffffff'; vis.forEach((f) => rg.fill(f.p, 'evenodd'));
  tex.userData.rough = new THREE.CanvasTexture(rc);
  return tex;
}
// Background painter (Web Worker + OffscreenCanvas) so repainting never freezes the 3D view.
const mapWorker = (() => {
  if (typeof OffscreenCanvas === 'undefined') return null;
  try {
    const w = new Worker('/mapworker.js', { type: 'module' });
    const st = { w, ready: false, starting: false, failed: false, pending: null };
    w.onmessage = ({ data }) => {
      if (data.type === 'ready') st.ready = true;
      if (data.type === 'painted') { const L = data.box.layer === 'outer' ? HO : HI; if (data.id === L.reqId) applyPatch(data.box, data.color, data.rough, true, L); else { data.color.close?.(); data.rough.close?.(); } }
      if (data.type === 'error') { console.warn('map worker', data.message); st.failed = true; HI.busy = HO.busy = false; }
    };
    w.onerror = () => { st.failed = true; HI.busy = false; };
    return st;
  } catch { return null; }
})();
function startMapWorker() {
  if (!mapWorker || mapWorker.starting) return;
  mapWorker.starting = true;
  mapWorker.w.postMessage({ type: 'init', worldUrl: 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-10m.json', geoUrl: '/geo.json',
    pal: { ocean: PAL.ocean, shallow: PAL.shallow, ice: PAL.ice, desert: PAL.desert, land: PAL.land }, desert: [...DESERT] });
}
function applyPatch({ lon0, lon1, lat0, lat1, lat, lon, latSpan, lonSpan }, color, rough, fromWorker, L = HI) {
  const geo = new THREE.SphereGeometry(L.r, 160, 160, ((lon0 + 180) * Math.PI) / 180, ((lon1 - lon0) * Math.PI) / 180, ((90 - lat1) * Math.PI) / 180, ((lat1 - lat0) * Math.PI) / 180);
  let tex, rt;
  if (fromWorker) {
    // ImageBitmaps can't be flipped on upload, so flip the patch's texture coordinates instead
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
    tex = new THREE.Texture(color); tex.flipY = false; tex.needsUpdate = true;
    rt = new THREE.Texture(rough); rt.flipY = false; rt.needsUpdate = true;
  } else { tex = color; rt = rough; }
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  if (!L.mesh) {
    L.mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughnessMap: rt, roughness: 1, metalness: 0 }));
    L.mesh.receiveShadow = true;
    if (L === HI) { L.mesh.material.polygonOffset = true; L.mesh.material.polygonOffsetFactor = -1; L.mesh.material.polygonOffsetUnits = -2; }
    scene.add(L.mesh);
  } else {
    L.mesh.geometry.dispose(); L.mesh.geometry = geo;
    L.mesh.material.map?.dispose(); L.mesh.material.roughnessMap?.dispose();
    L.mesh.material.map = tex; L.mesh.material.roughnessMap = rt; L.mesh.material.needsUpdate = true;
  }
  L.box = [lon0, lon1, lat0, lat1];
  L.mesh.visible = getAlt() <= PATCH_ALT && !walk.active;
  L.key = { lat, lon, latSpan, lonSpan };
  L.busy = false;
  setPatchMask();
}
// the globe hides itself under the widest visible sharp layer
function setPatchMask() {
  const L = HO.mesh?.visible ? HO : HI.mesh?.visible ? HI : null;
  if (!L || !L.box) { patchUniforms.uPatchOn.value = 0; return; }
  const [lon0, lon1, lat0, lat1] = L.box, ml = (lon1 - lon0) * 0.01, mt = (lat1 - lat0) * 0.01;
  patchUniforms.uPatch.value.set(lon0 + ml, lon1 - ml, lat0 + mt, lat1 - mt);
  patchUniforms.uPatchOn.value = 1;
}
function requestLayer(L, now, lat, lon, latSpan, layer, tight) {
  if (now - L.last < 250 || L.busy) return;
  const lonSpan = Math.min(latSpan / Math.max(0.25, Math.cos((lat * Math.PI) / 180)), 120);
  const P = L.key;
  // repaint early when zooming in, so the close-up never looks soft
  if (P && Math.abs(lat - P.lat) < P.latSpan * tight && Math.abs(lon - P.lon) < P.lonSpan * tight && latSpan / P.latSpan < 1.5 && latSpan / P.latSpan > 0.78) { if (L.mesh) L.mesh.visible = true; return; }
  L.last = now; L.busy = true;
  let lat0 = Math.max(-85, lat - latSpan / 2), lat1 = Math.min(85, lat + latSpan / 2);
  let lon0 = lon - lonSpan / 2, lon1 = lon + lonSpan / 2;
  if (lon0 < -180) { lon1 += -180 - lon0; lon0 = -180; }
  if (lon1 > 180) { lon0 -= lon1 - 180; lon1 = 180; }
  L.reqId = (L.reqId || 0) + 1;
  mapWorker.w.postMessage({ type: 'paint', layer, id: L.reqId, lon0, lon1, lat0, lat1, lat, lon, latSpan, lonSpan });
}
function updatePatch(now) {
  const alt = getAlt();
  if (walk.active) return;
  if (alt > PATCH_ALT) {
    if (HI.mesh) HI.mesh.visible = false;
    if (HO.mesh) HO.mesh.visible = false;
    patchUniforms.uPatchOn.value = 0;
    return;
  }
  const useWorker = mapWorker && !mapWorker.failed;
  if (useWorker) { if (!mapWorker.ready) { startMapWorker(); return; } }
  else if (!HI.countries) { loadHiRes(); return; }
  const { lat, lon } = v2ll(camera.position);
  const latSpan = THREE.MathUtils.clamp(alt * 57.3 * 3.2, 0.045, 40); // down to ~5 km across, for street-level detail
  if (useWorker) {
    requestLayer(HI, now, lat, lon, latSpan, 'inner', 0.18);
    const outer = Math.min(70, latSpan * 5);
    if (alt < PATCH_ALT * 0.6 && outer > latSpan * 1.5) requestLayer(HO, now, lat, lon, outer, 'outer', 0.12);
    else if (HO.mesh) HO.mesh.visible = false;
    setPatchMask();
    return;
  }
  if (now - HI.last < 350 || HI.busy) return;
  HI.last = now;
  const lonSpan = Math.min(latSpan / Math.max(0.25, Math.cos((lat * Math.PI) / 180)), 90);
  const P = HI.key;
  if (P && Math.abs(lat - P.lat) < P.latSpan * 0.22 && Math.abs(lon - P.lon) < P.lonSpan * 0.22 && latSpan / P.latSpan < 1.6 && latSpan / P.latSpan > 0.55) { if (HI.mesh) HI.mesh.visible = true; setPatchMask(); return; }
  HI.busy = true;
  let lat0 = Math.max(-85, lat - latSpan / 2), lat1 = Math.min(85, lat + latSpan / 2);
  let lon0 = lon - lonSpan / 2, lon1 = lon + lonSpan / 2;
  if (lon0 < -180) { lon1 += -180 - lon0; lon0 = -180; }
  if (lon1 > 180) { lon0 -= lon1 - 180; lon1 = 180; }
  const tex = paintPatch(lon0, lon1, lat0, lat1);
  applyPatch({ lon0, lon1, lat0, lat1, lat, lon, latSpan, lonSpan }, tex, tex.userData.rough, false);
}

// ---------------------------------------------------------------- 3D nature (trees, flowers, rocks, rivers)
const placeBuckets = new Map();
function bucketPlaces() {
  placeBuckets.clear();
  for (const p of PLACES) { if (['mountain', 'volcano'].includes(p.type)) continue; const k = Math.floor(p.lat * 20) + ',' + Math.floor(p.lon * 20); if (!placeBuckets.has(k)) placeBuckets.set(k, []); placeBuckets.get(k).push(p); }
}
function natureBlocked(lat, lon) {
  if (active) { const c = active.center || (active.center = v2ll(active.group.position)); const dk = Math.hypot(lat - c.lat, (lon - c.lon) * Math.cos((lat * Math.PI) / 180)) * 111.2; if (dk < (active.built.R || 1) + 0.15) return true; }
  const by = Math.floor(lat * 20), bx = Math.floor(lon * 20);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const p of placeBuckets.get(by + i + ',' + (bx + j)) || []) {
    if (Math.hypot(lat - p.lat, (lon - p.lon) * Math.cos((lat * Math.PI) / 180)) * 111.2 < 0.45 * (p.scale || 1) + 0.05) return true;
  }
  return false;
}
const nature = createNature({ scene, ll2v, v2ll, landAt, blocked: natureBlocked, rivers: geoP.then((g) => (g?.rivers || []).filter(([r]) => r <= 9)) });
let bucketedN = 0;
function natureFrame(lat, lon, altKm) { if (PLACES.length !== bucketedN) { bucketedN = PLACES.length; bucketPlaces(); nature.reset(); } nature.update(lat, lon, altKm); }

// ---------------------------------------------------------------- customise house & avatar
const deviceKey = () => {
  let k = store.get('wa-key');
  if (!k) { k = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)) + Math.random().toString(36).slice(2, 10); store.set('wa-key', k); }
  return k;
};
const myLook = () => { try { return JSON.parse(store.get('wa-look') || 'null'); } catch { return null; } };
const DEFAULT_LOOK = { house: { w: 0, r: 0, g: 1 }, avatar: { s: 0, p: 0, k: 0, h: 0, y: 0 } };
let preview = null;
function showCustomise() {
  const me = myId();
  if (!me && !store.get('wa-me')) { toast('Log in first'); return showLogin(); }
  const look = JSON.parse(JSON.stringify(myLook() || DEFAULT_LOOK));
  const sw = (key, part, list, labels) => `<div class="swrow" data-part="${part}" data-key="${key}">${list.map((c, i) => labels
    ? `<button type="button" class="chip${look[part][key] === i ? ' on' : ''}" data-v="${i}">${esc(labels[i])}</button>`
    : `<button type="button" class="sw${look[part][key] === i ? ' on' : ''}" data-v="${i}" style="background:${c}" aria-label="colour ${i + 1}"></button>`).join('')}</div>`;
  openSheet('custom', `<h2>🎨 Make it yours</h2><p class="muted">@${esc(me)} · changes show to everyone.</p>
    <h3>Your house</h3>
    <div class="lbl">Walls</div>${sw('w', 'house', WALL_OPTIONS)}
    <div class="lbl">Roof</div>${sw('r', 'house', ROOF_OPTIONS)}
    <div class="lbl">Garden</div>${sw('g', 'house', GARDEN_OPTIONS, GARDEN_OPTIONS)}
    <h3>Your character</h3>
    <div class="avwrap"><canvas id="avPreview" width="150" height="190"></canvas><div class="avopts">
      <div class="lbl">Shirt</div>${sw('s', 'avatar', SHIRTS)}
      <div class="lbl">Trousers</div>${sw('p', 'avatar', PANTS)}
      <div class="lbl">Skin</div>${sw('k', 'avatar', SKINS)}
      <div class="lbl">Hair colour</div>${sw('h', 'avatar', HAIR)}
      <div class="lbl">Style</div>${sw('y', 'avatar', STYLES, STYLES)}
    </div></div>
    <div class="err" id="lookErr"></div>
    <button class="primary" id="lookSave" type="button">Save</button>`);
  // live avatar preview in a tiny 3D view
  const cv = $('#avPreview');
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  r.setPixelRatio(Math.min(devicePixelRatio, 2));
  const sc = new THREE.Scene();
  sc.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 2.2));
  const dl = new THREE.DirectionalLight(0xffffff, 1.4); dl.position.set(1, 2, 3); sc.add(dl);
  const cam = new THREE.PerspectiveCamera(30, 150 / 190, 0.001, 1);
  cam.position.set(0, 0.014, 0.075); cam.lookAt(0, 0.011, 0);
  let person = null;
  const rebuild = () => { if (person) sc.remove(person); person = makePerson(me, look); sc.add(person); };
  rebuild();
  preview = { r, stop: false };
  const spin = (t) => { if (preview?.stop || !cv.isConnected) { r.dispose(); return; } person.rotation.y = t / 1400; renderPreview(); requestAnimationFrame(spin); };
  const renderPreview = () => r.render(sc, cam);
  requestAnimationFrame(spin);
  const houseArr = () => [look.house.w, look.house.r, look.house.g];
  sheetBody.querySelectorAll('.swrow').forEach((row) => row.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    look[row.dataset.part][row.dataset.key] = +b.dataset.v;
    row.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    if (row.dataset.part === 'avatar') rebuild();
    else if (active) active.built.setLook(me, houseArr());
  }));
  $('#lookSave').onclick = async () => {
    $('#lookErr').textContent = '';
    try {
      const res = await api('/api/look', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: me, key: deviceKey(), look }) });
      store.set('wa-look', JSON.stringify(res.look));
      closeSheet();
      toast(res.claimed ? 'Saved! This house is now linked to this device.' : 'Saved! Everyone sees your new look.');
    } catch (ex) { $('#lookErr').textContent = ex.message; }
  };
}

// ---------------------------------------------------------------- loop
let lastDotAlt = -1;
let lastNow = 0, photoPending = false;
function frame(now) {
  requestAnimationFrame(frame);
  WIND.value = now / 1000;
  if (dioramaOpen()) { lastNow = now; return; } // the diorama has the screen; the globe rests
  const dt = Math.min(0.1, (now - (lastNow || now)) / 1000); lastNow = now;
  if (walk.active) return walkFrame(now, dt);
  stepFly(now);
  stepZoom(dt);
  stepPan(dt);
  stepView(dt);
  stepTweens(now);
  updateSkyAndSun(getAlt());
  fitClipPlanes(getAlt(), false);
  const alt = getAlt();
  controls.rotateSpeed = Math.min(0.9, alt * 0.15);
  controls.enableRotate = alt > NEAR;
  if (controls.autoRotate && alt < 1.2) controls.autoRotate = false;
  if (lastDotAlt < 0 || Math.abs(alt - lastDotAlt) / lastDotAlt > 0.03) {
    const base = Math.min(alt, 2.2) * 0.0085;
    layoutDots(townDots, towns, base, (t) => 0.8 + Math.log10(t.count + 1) * 0.9);
    layoutDots(placeDots, PLACES, base * 0.42, (p) => (p.cur ? 1.5 : 1));
    lastDotAlt = alt;
  }
  townDots.visible = alt > km(9) && !(active && alt < km(Math.max(80, active.houseR * 7)));
  placeDots.visible = alt < 1.3 && alt > km(30);
  atmo.material.uniforms.opacity.value = THREE.MathUtils.clamp((alt - 0.02) * 4, 0, 1);
  const camN = camera.position.clone().normalize();
  void camN;
  pickMapLabels(now);
  geoFrame(alt, dt);
  updatePatch(now);
  { const ll = v2ll(camera.position); natureFrame(ll.lat, ll.lon, alt * R_KM); }
  declutter(now);
  keyTurn(dt);
  $('#viewPad i').style.transform = `rotate(${(viewYaw * 180) / Math.PI}deg)`;
  pickPlaces(now);
  pickHouseLabels(now);
  tickTown(now);
  active?.built.update(dt);
  checkTownProximity(now);
  if (active?.ring) { const s = 1 + 0.15 * Math.sin(now / 250); active.ring.scale.set(s, 1, s); }
  if (active?.waver) { const a = active.waver.userData.arms[1]; a.rotation.z = -2.4 + Math.sin(now / 160) * 0.35; a.rotation.x = 0; }
  controls.update();
  applyTilt();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  restoreTilt();
}
function walkFrame(now, dt) {
  if (walkLL) natureFrame(walkLL.lat, walkLL.lon, 1);
  townDots.visible = placeDots.visible = false;
  walk.update(dt, now);
  { const bg = scene.background.clone(), fog = scene.fog; updateSkyAndSun(km(0.15)); scene.background.copy(bg); scene.fog = fog; }
  fitClipPlanes(0, true);
  pickPlaces(now);
  pickMapLabels(now);
  geoFrame(getAlt(), dt);
  pickHouseLabels(now);
  if (active) { tickTown(now); active.built.update(dt); }
  renderer.render(scene, camera);
  if (photoPending) { photoPending = false; savePhoto(); }
  labelRenderer.render(scene, camera);
}
function savePhoto() {
  const a = document.createElement('a');
  a.href = renderer.domElement.toDataURL('image/png');
  a.download = `${(CONFIG.name || 'world-again').toLowerCase().replace(/\W+/g, '-')}-${Date.now()}.png`;
  a.click();
  toast('Photo saved');
}

// Near the ground you can turn the view (yaw) and change the tilt; drag pans the map in view space.
let viewYaw = 0, viewPitch = 0.95, yawT = 0, pitchT = 0.95, panVel = null;
function stepView(dt) { const k = 1 - Math.exp(-dt * 12); viewYaw += (yawT - viewYaw) * k; viewPitch += (pitchT - viewPitch) * k; }
const NEAR = km(900); // below this you can pan, turn and tilt; above it you spin the globe
const viewAxes = () => {
  const S = camera.position.clone().normalize();
  const north = new THREE.Vector3(0, 1, 0).sub(S.clone().multiplyScalar(S.y)).normalize();
  const east = new THREE.Vector3(0, 1, 0).cross(S).normalize();
  const fwdV = north.clone().multiplyScalar(Math.cos(viewYaw)).addScaledVector(east, Math.sin(viewYaw)).normalize();
  return { S, fwd: fwdV, right: fwdV.clone().cross(S).normalize() };
};
{
  const el = renderer.domElement;
  let g = null, twist0 = 0, yaw0 = 0, midY0 = 0, pitch0 = 0;
  const two = () => { const [a, b] = [...pts.values()]; return { ang: Math.atan2(b.y - a.y, b.x - a.x), midY: (a.y + b.y) / 2 }; };
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  el.addEventListener('pointerdown', (e) => {
    if (walk.active || getAlt() > NEAR) return;
    g = { x: e.clientX, y: e.clientY, rotate: e.button === 2 || e.button === 1 || e.shiftKey || e.ctrlKey || e.altKey };
    if (pts.size === 2) { const t = two(); twist0 = t.ang; yaw0 = viewYaw; midY0 = t.midY; pitch0 = viewPitch; }
  });
  el.addEventListener('pointermove', (e) => {
    if (!g || walk.active) return;
    if (pts.size === 2) {
      const t = two();
      viewYaw = yaw0 - (t.ang - twist0);
      viewPitch = THREE.MathUtils.clamp(pitch0 + (t.midY - midY0) * 0.004, 0.05, 1.5);
      return;
    }
    const dx = e.clientX - g.x, dy = e.clientY - g.y, nowT = performance.now(), gap = Math.max(1, nowT - (g.t || nowT - 16));
    g.x = e.clientX; g.y = e.clientY; g.t = nowT;
    fly = null; visiting = false;
    if (g.rotate) { yawT -= dx * 0.008; pitchT = THREE.MathUtils.clamp(pitchT - dy * 0.005, 0.05, 1.5); return; }
    panBy(dx, dy);
    g.vx = (dx / gap) * 1000; g.vy = (dy / gap) * 1000; // pixels per second, for momentum
  });
  el.addEventListener('pointerup', () => { if (g && !g.rotate && g.t && performance.now() - g.t < 80 && Math.hypot(g.vx || 0, g.vy || 0) > 60) panVel = { x: g.vx, y: g.vy }; });
  el.addEventListener('pointerdown', () => { panVel = null; });
  el.addEventListener('pointermove', () => {
  });
  const end = () => { g = null; };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}
function panBy(dx, dy) {
  const { S, fwd: F, right } = viewAxes();
  const k = (getAlt() * 1.6) / innerHeight;
  const n = S.addScaledVector(right, -dx * k).addScaledVector(F, dy * k).normalize();
  camera.position.copy(n.multiplyScalar(1 + getAlt()));
}
function stepPan(dt) {
  if (!panVel || fly) return;
  panBy(panVel.x * dt, panVel.y * dt);
  const d = Math.exp(-dt * 4.5); panVel.x *= d; panVel.y *= d;
  if (Math.hypot(panVel.x, panVel.y) < 8) panVel = null;
}
// small animation helper (towns rising out of the ground, etc.)
const tweens = [];
function tween(ms, fn, done) { tweens.push({ t0: performance.now(), ms, fn, done }); }
function stepTweens(now) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const w = tweens[i], k = Math.min(1, (now - w.t0) / w.ms);
    w.fn(k);
    if (k >= 1) { tweens.splice(i, 1); w.done && w.done(); }
  }
}
// turn buttons (hold to keep turning) and a 2D / 3D tilt toggle
{
  let hold = null;
  const start = (dir) => { stop(); const t0 = performance.now(); let last = t0; const step = (now) => { const dt = (now - last) / 1000; last = now; turnView(dir * 1.4 * dt, 0); hold = requestAnimationFrame(step); }; hold = requestAnimationFrame(step); };
  const stop = () => { if (hold) cancelAnimationFrame(hold); hold = null; };
  for (const [id, dir] of [['#rotL', -1], ['#rotR', 1]]) { const b = $(id); b.addEventListener('pointerdown', (e) => { e.preventDefault(); start(dir); }); ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, stop)); }
  $('#tiltBtn').onclick = () => { fly = null; pitchT = pitchT > 0.6 ? 0.08 : 1.2; $('#tiltBtn').textContent = pitchT > 0.6 ? '2D' : '3D'; };
}
// view pad: drag left/right to turn, up/down to tilt, tap to face north again
{
  const pad = $('#viewPad');
  let d = null;
  pad.addEventListener('pointerdown', (e) => { d = { x: e.clientX, y: e.clientY, moved: 0 }; pad.setPointerCapture(e.pointerId); e.stopPropagation(); });
  pad.addEventListener('pointermove', (e) => {
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    d.x = e.clientX; d.y = e.clientY; d.moved += Math.abs(dx) + Math.abs(dy);
    turnView(dx * 0.012, dy * 0.008);
  });
  pad.addEventListener('pointerup', () => {
    if (d && d.moved < 5) { yawT = Math.round(yawT / (Math.PI * 2)) * Math.PI * 2; pitchT = 0.95; }
    d = null;
  });
}
function turnView(dYaw, dPitch) {
  fly = null; controls.autoRotate = false; visiting = false;
  if (getAlt() <= NEAR) {
    yawT -= dYaw;
    pitchT = THREE.MathUtils.clamp(pitchT - dPitch, 0.05, 1.5);
  } else {
    // far away: spin the globe instead
    camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), -dYaw);
    const right = new THREE.Vector3().crossVectors(camera.up, camera.position).normalize();
    const next = camera.position.clone().applyAxisAngle(right, dPitch);
    if (Math.abs(next.clone().normalize().y) < 0.97) camera.position.copy(next);
  }
}
const viewKeys = new Set();
addEventListener('keydown', (e) => { if (!walk.active && !/input|textarea/i.test(e.target.tagName) && 'qerf'.includes(e.key.toLowerCase())) viewKeys.add(e.key.toLowerCase()); });
addEventListener('keyup', (e) => viewKeys.delete(e.key.toLowerCase()));
function keyTurn(dt) {
  if (!viewKeys.size) return;
  turnView((viewKeys.has('e') ? 1 : 0) * 1.6 * dt - (viewKeys.has('q') ? 1 : 0) * 1.6 * dt, (viewKeys.has('f') ? 1 : 0) * dt - (viewKeys.has('r') ? 1 : 0) * dt);
}

// Near the ground, lean the camera back so buildings read as 3D.
const _savedPos = new THREE.Vector3(), _savedQuat = new THREE.Quaternion();
let tilted = false;
function applyTilt() {
  const alt = getAlt();
  const t = THREE.MathUtils.clamp((Math.log(NEAR) - Math.log(alt)) / (Math.log(NEAR) - Math.log(km(3))), 0, 1);
  if (t <= 0) return;
  const ang = t * viewPitch;
  _savedPos.copy(camera.position); _savedQuat.copy(camera.quaternion); tilted = true;
  const { S, fwd: F } = viewAxes();
  const yawK = t; // blend the turn in as you get close
  const north = new THREE.Vector3(0, 1, 0).sub(S.clone().multiplyScalar(S.y)).normalize();
  const dir = north.lerp(F, yawK).normalize();
  const offset = S.clone().multiplyScalar(Math.cos(ang)).addScaledVector(dir, -Math.sin(ang)).multiplyScalar(alt * 1.15);
  camera.position.copy(S).add(offset);
  camera.up.copy(dir.lengthSq() > 0.5 ? dir : new THREE.Vector3(0, 1, 0));
  camera.lookAt(S);
  camera.updateMatrixWorld();
}
function restoreTilt() {
  if (!tilted) return;
  camera.position.copy(_savedPos); camera.quaternion.copy(_savedQuat); camera.up.set(0, 1, 0);
  camera.updateMatrixWorld(); tilted = false;
}

// ---------------------------------------------------------------- boot
// Prepare every kind of material once during the loading screen, so the first town or zoom doesn't stutter.
async function warmUp() {
  try {
    const now = Date.now(), day = 86400000;
    const fake = [0, 4, 2, 1.5, 0.5, 0.0001].map((d, i) => ({ id: 'warm' + i, i, t: now - d * day * (i ? 1 : 10), look: i === 3 ? [2, 3, 1] : null }));
    const b = buildTown({ town: { key: 'warm', lat: 0, lon: 0 }, houses: fake }, CONFIG.milestones, 0);
    placeOnSurface(b.group, 0, 0);
    b.group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    b.setFestival(FEST || { colors: ['#ffd166'], fireworks: true, diyas: true, lanterns: true, tree: true });
    const hidden = [];
    scene.traverse((o) => { if (o.isMesh && !o.visible) { hidden.push(o); o.visible = true; } });
    scene.add(b.group);
    if (renderer.compileAsync) await renderer.compileAsync(scene, camera); else renderer.compile(scene, camera);
    hidden.forEach((o) => (o.visible = false));
    b.group.removeFromParent();
  } catch (e) { console.warn('warm-up skipped', e); }
}
const setLoad = (pct, text) => { const f = $('#loadFill'); if (f) f.style.width = pct + '%'; const st = $('#loadStep'); if (st && text) st.textContent = text; };
(async function boot() {
  requestAnimationFrame(frame);
  addCurated();
  const cfgP = api('/api/config').then((c) => {
    CONFIG = c;
    document.title = c.name;
    $('#brandName').textContent = c.name;
    document.querySelectorAll('.js-name').forEach((e) => (e.textContent = c.name));
  }).catch(() => {});
  setLoad(15, 'Drawing the coastlines…');
  try { await buildEarthTexture(); } catch (e) { console.error(e); toast('Could not load the world map'); }
  setLoad(55, 'Building the towns…');
  await cfgP;
  await refreshState().catch((e) => toast(e.message));
  setLoad(75, 'Placing 7,000 wonders…');
  await loadPlaces();
  setLoad(90, 'Planting forests…');
  await buildGeoOverlays();
  setLoad(96, 'Warming up…');
  await warmUp();
  setLoad(100, 'Welcome!');
  // opening shot: start far out in space and glide in
  const q = new URLSearchParams(location.search);
  if (!q.get('id') && !q.get('town') && !q.get('place')) { camera.position.setLength(1 + 9); const { lat, lon } = v2ll(camera.position); flyTo(lat * 0.6, lon, 2.6, () => { controls.autoRotate = true; }); }
  const l = $('#loading'); setTimeout(() => { l.style.opacity = 0; setTimeout(() => l.remove(), 500); }, 250);
  welcome();
  try { me = (await api('/api/account/me')).me; } catch { me = null; }
  updateMyHouse();
  { const rt = new URLSearchParams(location.search).get('reset'); if (rt) showReset(rt); }
  openFromLink();
  setInterval(() => refreshState().catch(() => {}), 30000);
})();
