// Towns: a grid of houses that grow with time, plus civic buildings unlocked by population.
// Units are kilometres; x = east, y = up, z = south. A house's front faces +z before rotation.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { regionOf } from './placegen.js';
import { addWind } from './wind.js';

export const SPACING = 0.14;
export const ROAD_EVERY = 5;
export const CONSTRUCT_MS = 5 * 60 * 1000; // "your house is built within 5 minutes"
const DAY = 86400000;

// Growth stages by age of the house.
export const STAGES = [
  { id: 0, name: 'Under construction' },
  { id: 1, name: 'Cottage' },
  { id: 2, name: 'House with fence' },
  { id: 3, name: 'Garden house' },
  { id: 4, name: 'Two-storey home' },
];
export function stageFor(ageMs) {
  if (ageMs < CONSTRUCT_MS) return 0;
  if (ageMs < 1 * DAY) return 1;
  if (ageMs < 3 * DAY) return 2;
  if (ageMs < 7 * DAY) return 3;
  return 4;
}
export function nextStage(ageMs) {
  const steps = [CONSTRUCT_MS, DAY, 3 * DAY, 7 * DAY];
  const n = steps.find((s) => ageMs < s);
  return n ? { inMs: n - ageMs, name: STAGES[stageFor(n)].name } : null;
}

// Civic buildings unlocked as the town grows (config milestones are added on top).
export const CIVIC = [
  { id: 'cafe', name: 'Café', at: 10, angle: 0.55, dist: 0.2 },
  { id: 'park', name: 'Park', at: 25, angle: 1.35, dist: 0.3 },
  { id: 'school', name: 'School', at: 75, angle: 2.25, dist: 0.3 },
  { id: 'hospital', name: 'Hospital', at: 150, angle: 3.95, dist: 0.3 },
  { id: 'garden', name: 'Community garden', at: 40, angle: 3.1, dist: 0.24 },
  { id: 'square', name: 'Town square', at: 300, angle: 4.75, dist: 0.3 },
  { id: 'stadium', name: 'Stadium', at: 600, angle: 5.5, dist: 0.42 },
];

// ---------------------------------------------------------------- geometry helpers
const _c = new THREE.Color();
function tint(geo, hex) {
  _c.set(hex);
  const n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = _c.r; a[i * 3 + 1] = _c.g; a[i * 3 + 2] = _c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}
const B = (w, h, d, c, x = 0, y = 0, z = 0) => tint(new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z), c);
const CO = (r, h, c, x = 0, y = 0, z = 0, seg = 6, ry = 0) => tint(new THREE.ConeGeometry(r, h, seg).rotateY(ry).translate(x, y + h / 2, z), c);
const CY = (rt, rb, h, c, x = 0, y = 0, z = 0, seg = 8) => tint(new THREE.CylinderGeometry(rt, rb, h, seg).translate(x, y + h / 2, z), c);
const DISC = (r, c, x = 0, y = 0, z = 0, seg = 20) => tint(new THREE.CylinderGeometry(r, r, 0.002, seg).translate(x, y + 0.001, z), c);
const merge = (list) => mergeGeometries(list.flat(), false);
const vmat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });
export const NIGHT = { value: 0 };
const WIN_LIN = new THREE.Color('#bfe3f5');
vmat.onBeforeCompile = (sh) => {
  sh.vertexShader = 'varying float vLit;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
    #ifdef USE_INSTANCING
      vLit = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453);
    #else
      vLit = 0.0;
    #endif`);
  sh.uniforms.uNight = NIGHT;
  sh.uniforms.uWin = { value: new THREE.Vector3(WIN_LIN.r, WIN_LIN.g, WIN_LIN.b) };
  sh.fragmentShader = 'uniform float uNight; uniform vec3 uWin; varying float vLit;\n' + sh.fragmentShader.replace('#include <dithering_fragment>',
    '#include <dithering_fragment>\n if (uNight > 0.5 && distance(vColor.rgb, uWin) < 0.04) gl_FragColor.rgb = vLit < 0.74 ? vec3(1.0, 0.8, 0.42) * (0.85 + vLit * 0.3) : vec3(0.16, 0.2, 0.28);');
};
const imat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, flatShading: true });
// glow sprites for street lamps (visible at night)
const glowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,225,150,1)'); grd.addColorStop(0.3, 'rgba(255,200,110,0.55)'); grd.addColorStop(1, 'rgba(255,190,90,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();

function towerTex(lit) {
  const c = document.createElement('canvas'); c.width = 32; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = lit ? '#000' : '#ffffff'; g.fillRect(0, 0, 32, 128);
  for (let y = 3; y < 126; y += 6) for (let x = 2; x < 31; x += 6) {
    const on = ((x * 7 + y * 13) % 10) < 6;
    g.fillStyle = lit ? (on ? '#ffd27a' : '#000') : '#6f8fae';
    g.fillRect(x, y, 4, 3);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
  return t;
}
const towerMat = new THREE.MeshStandardMaterial({ color: '#ffffff', map: towerTex(false), emissive: '#ffffff', emissiveMap: towerTex(true), emissiveIntensity: 0, roughness: 0.6, metalness: 0.1 });
const GLASS = ['#d7dde3', '#b9c8d6', '#e6dfcf', '#9fb4c8', '#cfc6b4', '#aebfcc', '#f0ebe1'];
const WIN = '#bfe3f5', DOOR = '#7a4a2a', WOOD = '#a0784e', WHITE = '#ffffff';
function fence(P) {
  const g = [], h = 0.013, gap = 0.016, seg = P - gap;
  g.push(B(P * 2, 0.004, 0.003, WHITE, 0, h, -P), B(P * 2, 0.004, 0.003, WHITE, 0, h * 0.5, -P));
  for (const x of [-P, P]) g.push(B(0.003, 0.004, P * 2, WHITE, x, h, 0), B(0.003, 0.004, P * 2, WHITE, x, h * 0.5, 0));
  for (const s of [-1, 1]) g.push(B(seg, 0.004, 0.003, WHITE, s * (gap + seg / 2), h, P), B(seg, 0.004, 0.003, WHITE, s * (gap + seg / 2), h * 0.5, P));
  for (const [x, z] of [[-P, -P], [P, -P], [-P, P], [P, P], [-gap, P], [gap, P]]) g.push(B(0.004, 0.018, 0.004, WHITE, x, 0, z));
  return g;
}
const tree = (x, z, s = 1) => [CY(0.003 * s, 0.004 * s, 0.014 * s, '#7a5a3a', x, 0, z, 5), CO(0.016 * s, 0.035 * s, '#3f8a3a', x, 0.012 * s, z, 6)];
const frontWindows = (w, y, z, n = 2) => Array.from({ length: n }, (_, i) => B(0.013, 0.012, 0.003, WIN, (i - (n - 1) / 2) * (w / n), y, z));

function gable(w, h, d, y) {
  const shape = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, h)]);
  return new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false }).translate(0, y, -d / 2);
}
const porch = (z) => [B(0.05, 0.004, 0.02, '#d9cdb4', 0, 0, z), B(0.054, 0.004, 0.024, '#b3472f', 0, 0.034, z),
  CY(0.0018, 0.0018, 0.032, WHITE, -0.022, 0.003, z + 0.008, 5), CY(0.0018, 0.0018, 0.032, WHITE, 0.022, 0.003, z + 0.008, 5)];
export function palmGeo() {
  const parts = [];
  for (let i = 0; i < 6; i++) parts.push(CY(0.0035 - i * 0.0003, 0.004 - i * 0.0003, 0.016, '#9b7653', i * 0.0025, i * 0.016, 0, 5));
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2;
    const leaf = new THREE.ConeGeometry(0.008, 0.05, 4).rotateZ(Math.PI / 2 - 0.35).rotateY(-a).translate(0.015 + Math.cos(a) * 0.022, 0.095, -Math.sin(a) * 0.022);
    parts.push(tint(leaf, k % 2 ? '#3f8a3a' : '#5aa046'));
  }
  return merge(parts);
}
// Each stage: walls (instance-coloured), roof (instance-coloured) and fixed-colour details.
const HOUSE = {
  0: {
    walls: new THREE.BoxGeometry(0.066, 0.018, 0.066).translate(0, 0.011, 0),
    roof: null,
    details: merge([
      B(0.08, 0.004, 0.08, '#a3a19c'),
      ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => CY(0.0025, 0.0025, 0.06, WOOD, x * 0.034, 0, z * 0.034, 5)),
      B(0.072, 0.004, 0.004, WOOD, 0, 0.056, -0.034), B(0.072, 0.004, 0.004, WOOD, 0, 0.056, 0.034),
      B(0.004, 0.004, 0.072, WOOD, -0.034, 0.056, 0), B(0.004, 0.004, 0.072, WOOD, 0.034, 0.056, 0),
      B(0.022, 0.012, 0.016, '#b5543a', 0.05, 0, 0.05), B(0.016, 0.006, 0.012, '#c9c4b8', -0.05, 0, 0.05),
      B(0.012, 0.03, 0.002, '#f6c445', 0.05, 0, -0.05),
    ]),
  },
  1: {
    walls: new THREE.BoxGeometry(0.064, 0.045, 0.064).translate(0, 0.0245, 0),
    roof: new THREE.ConeGeometry(0.057, 0.04, 4).rotateY(Math.PI / 4).translate(0, 0.067, 0),
    details: merge([
      B(0.015, 0.027, 0.003, DOOR, 0, 0.002, 0.0335), ...frontWindows(0.064, 0.02, 0.0335),
      B(0.016, 0.002, 0.034, '#d9cdb4', 0, 0, 0.05),
    ]),
  },
  2: {
    walls: new THREE.BoxGeometry(0.07, 0.05, 0.07).translate(0, 0.027, 0),
    roof: new THREE.ConeGeometry(0.063, 0.045, 4).rotateY(Math.PI / 4).translate(0, 0.0745, 0),
    details: merge([
      B(0.016, 0.029, 0.003, DOOR, 0, 0.002, 0.0365), ...frontWindows(0.07, 0.022, 0.0365),
      B(0.003, 0.012, 0.013, WIN, 0.0365, 0.022, 0), B(0.003, 0.012, 0.013, WIN, -0.0365, 0.022, 0),
      B(0.01, 0.032, 0.01, '#9c4a3a', 0.018, 0.06, -0.012),
      B(0.016, 0.002, 0.03, '#d9cdb4', 0, 0, 0.052), fence(0.064),
    ]),
  },
  3: {
    walls: new THREE.BoxGeometry(0.07, 0.05, 0.07).translate(0, 0.027, 0),
    roof: new THREE.ConeGeometry(0.063, 0.045, 4).rotateY(Math.PI / 4).translate(0, 0.0745, 0),
    details: merge([
      B(0.016, 0.029, 0.003, DOOR, 0, 0.002, 0.0365), ...frontWindows(0.07, 0.022, 0.0365),
      B(0.003, 0.012, 0.013, WIN, 0.0365, 0.022, 0), B(0.003, 0.012, 0.013, WIN, -0.0365, 0.022, 0),
      B(0.01, 0.032, 0.01, '#9c4a3a', 0.018, 0.06, -0.012),
      B(0.016, 0.002, 0.03, '#d9cdb4', 0, 0, 0.052), fence(0.064),
      tree(-0.048, -0.048, 1.2), tree(0.05, -0.05, 0.9),
      B(0.014, 0.006, 0.007, '#e85a8a', -0.04, 0, 0.055), B(0.014, 0.006, 0.007, '#f6c445', 0.04, 0, 0.055),
      B(0.03, 0.01, 0.008, '#3f7d3a', -0.042, 0, 0.042), B(0.03, 0.01, 0.008, '#3f7d3a', 0.042, 0, 0.042),
      ...porch(0.045),
    ]),
  },
  4: {
    walls: new THREE.BoxGeometry(0.074, 0.09, 0.068).translate(0, 0.047, 0),
    roof: new THREE.ConeGeometry(0.066, 0.045, 4).rotateY(Math.PI / 4).translate(0, 0.1145, 0),
    details: merge([
      B(0.016, 0.03, 0.003, DOOR, 0, 0.002, 0.0355),
      ...frontWindows(0.074, 0.022, 0.0355), ...frontWindows(0.074, 0.062, 0.0355, 3),
      B(0.003, 0.012, 0.013, WIN, 0.0375, 0.062, 0), B(0.003, 0.012, 0.013, WIN, -0.0375, 0.062, 0),
      B(0.042, 0.003, 0.012, WHITE, 0, 0.05, 0.04), B(0.042, 0.008, 0.002, WHITE, 0, 0.053, 0.046),
      B(0.011, 0.034, 0.011, '#9c4a3a', 0.02, 0.1, -0.012),
      B(0.03, 0.032, 0.042, '#e9e3d6', 0.052, 0, 0.008), B(0.024, 0.022, 0.002, '#8a8f96', 0.052, 0.002, 0.03),
      B(0.018, 0.009, 0.03, '#d64533', 0.052, 0, 0.052), B(0.014, 0.007, 0.015, '#e86b5a', 0.052, 0.009, 0.05),
      tree(-0.05, -0.05, 1.3), fence(0.067),
    ]),
  },
  5: {
    roofB: null,
    walls: new THREE.BoxGeometry(0.11, 0.06, 0.08).translate(0, 0.032, -0.01),
    roof: new THREE.BoxGeometry(0.12, 0.01, 0.09).translate(0, 0.067, -0.01),
    details: merge([
      B(0.05, 0.03, 0.05, '#f7f1e3', 0, 0.072, -0.01), B(0.056, 0.006, 0.056, '#f2b134', 0, 0.102, -0.01),
      ...[-0.04, -0.015, 0.015, 0.04].map((x) => CY(0.003, 0.003, 0.055, WHITE, x, 0.002, 0.036, 6)),
      B(0.1, 0.004, 0.012, '#f2b134', 0, 0.057, 0.036),
      B(0.018, 0.034, 0.003, DOOR, 0, 0.002, 0.0305), ...frontWindows(0.11, 0.024, 0.0305, 4), ...frontWindows(0.05, 0.085, 0.0155, 2),
      B(0.045, 0.002, 0.024, '#5bc0eb', -0.035, 0.001, 0.06), B(0.05, 0.002, 0.03, '#f1ead8', -0.035, 0, 0.06),
      B(0.02, 0.002, 0.03, '#d9cdb4', 0.03, 0, 0.058),
      tree(-0.06, -0.055, 1.4), tree(0.06, -0.055, 1.4), tree(0.065, 0.06, 1.1),
      CY(0.003, 0.003, 0.05, '#666', 0.045, 0, 0.045, 5), B(0.016, 0.01, 0.002, '#f7931e', 0.053, 0.042, 0.045),
    ]),
  },
};


// ---------------------------------------------------------------- houses in the local style of each country
// The roof is instance-coloured, so every style shares the growth stages but swaps roof shape, wall shape and details.
const WH = { 1: 0.047, 2: 0.052, 3: 0.052, 4: 0.092 }, WW = { 1: 0.064, 2: 0.07, 3: 0.07, 4: 0.074 }, WD = { 1: 0.064, 2: 0.07, 3: 0.07, 4: 0.068 };
const nonIdx = (g) => (g.index ? g.toNonIndexed() : g);
const mergeN = (list) => mergeGeometries(list.map(nonIdx), false);
const cone4 = (r, h, y) => new THREE.ConeGeometry(r, h, 4).rotateY(Math.PI / 4).translate(0, y + h / 2, 0);
export const HOUSE_STYLES = {
  // region: roof kind per stage, wall colours, roof colours
  hip: { kind: 'hip' },
  nordic: { kind: 'steep', walls: ['#b8312a', '#e8c25a', '#f4f2ec', '#7d9cb8', '#2f5d8a', '#c0503a'], roofs: ['#3e4a52', '#2f3a40', '#5a3a2a'] },
  brit: { kind: 'hip', walls: ['#a8573e', '#b5654a', '#d8cdb4', '#efe9de', '#9c4a3a'], roofs: ['#4a4f55', '#5a5f66', '#6b4a3a'] },
  central: { kind: 'steep', walls: ['#efe9de', '#e8d9b5', '#f2efe8', '#f6e2a0', '#e9c9b0', '#d9e6ee'], roofs: ['#a6402e', '#8a3a2a', '#b5573a', '#4a4f55'] },
  orth: { kind: 'steep', walls: ['#8a5a3a', '#a0704a', '#e8d9c4', '#cfe0ea', '#b5865a'], roofs: ['#3f8f5a', '#3b6fbf', '#8a3a2a', '#6b7d8c'] },
  med: { kind: 'tile', walls: ['#f4efe4', '#efe2c8', '#e8c99a', '#f2d8a8', '#e4b98a', '#f6f3ec'], roofs: ['#c0603a', '#b5573a', '#cf7048'] },
  latam: { kind: 'tile', walls: ['#f6d27a', '#e9a0a0', '#9fd0e0', '#cfe8b8', '#f4b860', '#f2efe8', '#d0a0e0'], roofs: ['#c0603a', '#b5573a', '#cf7048'] },
  ottoman: { kind: 'tile', walls: ['#f2efe8', '#e8d9c4', '#d9c3a0', '#f0d0c0', '#cfe0ea'], roofs: ['#b5573a', '#c0603a'] },
  arab: { kind: 'flat', walls: ['#efe2c8', '#e2cfa8', '#f4efe4', '#d9bf94', '#f2efe8'], roofs: ['#e2d3b4'] },
  persian: { kind: 'flat', walls: ['#d9c3a0', '#cdb58c', '#e2d0ae'], roofs: ['#cdb58c'] },
  sahel: { kind: 'flat', walls: ['#b9824f', '#a8703f', '#c4935f'], roofs: ['#a8703f'] },
  india: { kind: 'flat', walls: ['#f6d27a', '#e9b0a0', '#cfe0ea', '#d8f0d0', '#f2efe8', '#f7c6a0', '#c9b0e8', '#9fd0e0'], roofs: ['#efe6d2', '#e2d3b4'] },
  nepal: { kind: 'steep', walls: ['#a85a3a', '#b86a46', '#e8d9c4'], roofs: ['#5a3a2a', '#6b7d8c', '#7a4a2a'] },
  lanka: { kind: 'tile', walls: ['#f2efe8', '#f6d27a', '#cfe8b8', '#9fd0e0'], roofs: ['#b5573a', '#c0603a'] },
  china: { kind: 'eave', walls: ['#e8e3d6', '#f2efe8', '#c9c2b0', '#d9d2c4'], roofs: ['#4a4f55', '#5f6a72', '#3f6f5a'] },
  japan: { kind: 'eave', walls: ['#f2efe8', '#e8e3d6', '#8a6a48', '#6b4a32'], roofs: ['#3e4650', '#4a5560', '#5a5f66'] },
  sea: { kind: 'thai', walls: ['#c9a87a', '#a0784e', '#f2efe8', '#e8d9c4'], roofs: ['#d6603a', '#c0503a', '#2f7a5a'] },
  isea: { kind: 'stilt', walls: ['#a0784e', '#c9a87a', '#8a6a48', '#f2efe8'], roofs: ['#5a3a2a', '#7a4a2a', '#b5573a'] },
  africa: { kind: 'hut', walls: ['#d9a679', '#c4935f', '#e8d9c4', '#f2efe8', '#b9824f'], roofs: ['#b59a5a', '#a08a5a', '#8a8f96', '#b5573a'] },
  nam: { kind: 'hip', walls: ['#efe9de', '#cfd6dd', '#e8d9c4', '#f2efe8', '#b5654a', '#9fb7c8'], roofs: ['#4a4f55', '#6b5a4a', '#3e4a52', '#8a3a2a'] },
  oceania: { kind: 'hip', walls: ['#efe9de', '#cfd6dd', '#e8d9c4', '#f2efe8'], roofs: ['#b5573a', '#6b7d8c', '#4a4f55'] },
};
const STILT = 0.02;
function roofGeo(kind, k) {
  const w = WW[k], d = WD[k], y = WH[k];
  switch (kind) {
    case 'steep': return gable(w * 1.16, w * 0.78, d * 1.14, y);
    case 'tile': return cone4(w * 0.84, 0.024, y);
    case 'flat': return mergeN([new THREE.BoxGeometry(w * 1.02, 0.004, d * 1.02).translate(0, y + 0.002, 0),
      ...[[0, d / 2], [0, -d / 2]].map(([x, z]) => new THREE.BoxGeometry(w * 1.04, 0.008, 0.004).translate(x, y + 0.004, z)),
      ...[[w / 2, 0], [-w / 2, 0]].map(([x, z]) => new THREE.BoxGeometry(0.004, 0.008, d * 1.04).translate(x, y + 0.004, z))]);
    case 'eave': return mergeN([cone4(w * 0.95, 0.026, y), cone4(w * 0.55, 0.026, y + 0.016), new THREE.BoxGeometry(w * 0.5, 0.006, 0.006).translate(0, y + 0.04, 0)]);
    case 'thai': return mergeN([gable(w * 1.12, 0.05, d * 1.2, y + (k > 1 ? STILT : 0)), gable(w * 0.82, 0.04, d * 1.3, y + 0.02 + (k > 1 ? STILT : 0))]);
    case 'stilt': return cone4(w * 0.86, 0.06, y + STILT);
    case 'hut': return k <= 1 ? new THREE.ConeGeometry(w * 0.62, 0.045, 9).translate(0, y + 0.0225 - 0.006, 0) : cone4(w * 0.8, 0.022, y);
    default: return null;
  }
}
function wallsGeo(kind, k) {
  if (kind === 'hut' && k <= 1) return new THREE.CylinderGeometry(WW[k] * 0.48, WW[k] * 0.5, WH[k] - 0.008, 10).translate(0, (WH[k] - 0.008) / 2 + 0.002, 0);
  if ((kind === 'stilt' || kind === 'thai') && k > 1) return HOUSE[k].walls.clone().translate(0, STILT, 0);
  return HOUSE[k].walls;
}
function detailsGeo(kind, k) {
  const w = WW[k], d = WD[k], y = WH[k], z = d / 2 + 0.0015;
  const door = B(0.015, 0.028, 0.003, DOOR, 0, 0.002, z), wins = frontWindows(w, 0.022, z);
  if (kind === 'flat') {
    const P = [door, ...wins, B(0.016, 0.002, 0.03, '#d9cdb4', 0, 0, d / 2 + 0.016)];
    if (k >= 2) { const R = 0.064, c = '#e8dcc4'; P.push(B(R * 2, 0.012, 0.004, c, 0, 0, -R), B(0.004, 0.012, R * 2, c, R, 0, 0), B(0.004, 0.012, R * 2, c, -R, 0, 0), B(R - 0.012, 0.012, 0.004, c, -(R + 0.012) / 2, 0, R), B(R - 0.012, 0.012, 0.004, c, (R + 0.012) / 2, 0, R)); } // courtyard wall
    if (k >= 3) P.push(...tree(-0.048, -0.046, 1.1), CY(0.006, 0.006, 0.012, '#3f6f8a', 0.02, y, -0.015, 8), B(0.014, 0.006, 0.007, '#e85a8a', 0.042, 0, 0.055)); // water tank on the roof, flowers
    if (k >= 4) P.push(B(0.03, 0.022, 0.026, '#f2efe8', -0.018, y, -0.012), B(0.042, 0.003, 0.012, WHITE, 0, 0.05, z + 0.005), ...frontWindows(w, 0.062, z, 3), B(0.03, 0.004, 0.03, '#e8dcc4', -0.018, y + 0.022, -0.012)); // rooftop room, balcony
    return merge(P);
  }
  if (kind === 'hut' && k <= 1) {
    const r = w * 0.5, P = [B(0.012, 0.024, 0.003, '#4a3424', 0, 0.002, r - 0.002), B(0.016, 0.002, 0.026, '#c9a87a', 0, 0, r + 0.012)];
    if (k === 2) { for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; if (Math.abs(a - Math.PI / 2) < 0.3) continue; P.push(CY(0.0015, 0.0015, 0.016, '#8a6a48', Math.cos(a) * 0.062, 0, Math.sin(a) * 0.062, 4)); } P.push(CY(0.012, 0.013, 0.018, '#c4935f', -0.045, 0, -0.04, 8), CO(0.016, 0.016, '#b59a5a', -0.045, 0.018, -0.04, 8)); } // reed fence, granary
    return merge(P);
  }
  if ((kind === 'stilt' || kind === 'thai') && k > 1) {
    const P = [B(0.015, 0.026, 0.003, DOOR, 0, STILT + 0.002, z), ...frontWindows(w, STILT + 0.022, z)];
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1]]) P.push(CY(0.0025, 0.0025, STILT, '#6b4a2a', a * (w / 2 - 0.004), 0, b * (d / 2 - 0.004), 5));
    P.push(B(w * 1.05, 0.003, d * 1.05 + 0.02, '#8a6a48', 0, STILT - 0.003, 0.01));            // floor deck / veranda
    for (let i = 0; i < 4; i++) P.push(B(0.014, 0.003, 0.006, '#8a6a48', 0, i * 0.005, d / 2 + 0.014 + (3 - i) * 0.005)); // steps
    if (k >= 3) P.push(...tree(-0.05, -0.05, 1.2));
    if (k >= 4) P.push(...frontWindows(w, STILT + 0.062, z, 3));
    return merge(P);
  }
  if (kind === 'eave' && k >= 2) {  // garden wall with a little gate and a tree, like a courtyard house
    const R = 0.064, c = '#d9d2c4', P = [door, ...wins, B(0.016, 0.002, 0.03, '#d9cdb4', 0, 0, d / 2 + 0.016)];
    P.push(B(R * 2, 0.014, 0.005, c, 0, 0, -R), B(0.005, 0.014, R * 2, c, R, 0, 0), B(0.005, 0.014, R * 2, c, -R, 0, 0), B(R - 0.012, 0.014, 0.005, c, -(R + 0.012) / 2, 0, R), B(R - 0.012, 0.014, 0.005, c, (R + 0.012) / 2, 0, R));
    P.push(B(R * 2, 0.003, 0.008, '#4a4f55', 0, 0.014, -R), B(0.008, 0.003, R * 2, '#4a4f55', R, 0.014, 0), B(0.008, 0.003, R * 2, '#4a4f55', -R, 0.014, 0));
    if (k >= 3) P.push(...tree(-0.045, -0.045, 1.1), B(0.01, 0.014, 0.003, '#c0362c', 0.02, 0.012, z + 0.001));
    if (k >= 4) P.push(...frontWindows(w, 0.062, z, 3));
    return merge(P);
  }
  return HOUSE[k].details;  // hip / steep / tile keep the full detailed house (fence, chimney, porch, garage…)
}

// ---------------------------------------------------------------- façade details: window boxes, shutters, balconies, pots
// Added on top of every style's details, so each country's homes get their own touches as they grow.
const FRONT = { 1: [0.064, 0.0335], 2: [0.07, 0.0365], 3: [0.07, 0.0365], 4: [0.074, 0.0355] };
const winXs = (w, n) => Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * (w / n));
const FLOWERS = ['#e8413a', '#ff6b8a', '#ffd23f', '#ffffff', '#c86bff'];
const windowBox = (x, y, z, k = 0) => [B(0.017, 0.004, 0.006, '#8a5a3a', x, y - 0.004, z + 0.003), ...[0, 1, 2].map((i) => B(0.0045, 0.004, 0.0045, FLOWERS[(i + k) % FLOWERS.length], x - 0.005 + i * 0.005, y, z + 0.004)), B(0.016, 0.002, 0.004, '#4f8f3c', x, y - 0.0005, z + 0.0035)];
const shutters = (x, y, z, c) => [B(0.0058, 0.012, 0.0015, c, x - 0.0098, y, z + 0.0008), B(0.0058, 0.012, 0.0015, c, x + 0.0098, y, z + 0.0008)];
const sunshade = (x, y, z) => B(0.018, 0.0018, 0.007, '#d9cdb4', x, y + 0.013, z + 0.003);
const pot = (x, z, c = '#c0603a', plant = '#4f8f3c', h = 0.008) => [CY(0.0035, 0.0028, 0.006, c, x, 0, z, 6), CO(0.0045, h, plant, x, 0.006, z, 6)];
const railing = (z, y, w, c) => [B(w, 0.0015, 0.0015, c, 0, y + 0.01, z), ...Array.from({ length: Math.round(w / 0.006) + 1 }, (_, i) => B(0.001, 0.01, 0.001, c, -w / 2 + i * (w / Math.round(w / 0.006)), y, z))];
function facadeExtras(kind, k) {
  if (!FRONT[k]) return [];
  const [w, z] = FRONT[k], low = winXs(w, 2), up = winXs(w, 3), P = [];
  const balcony = (c, flowers) => { P.push(...railing(0.045, 0.053, 0.042, c)); if (flowers) P.push(B(0.04, 0.003, 0.004, '#8a5a3a', 0, 0.063, 0.0455), ...[0, 1, 2, 3, 4].map((i) => B(0.004, 0.004, 0.004, FLOWERS[i % 5], -0.016 + i * 0.008, 0.066, 0.0455))); };
  if (kind === 'hip') {
    if (k >= 2) low.forEach((x, i) => P.push(...windowBox(x, 0.022, z, i)));
    if (k === 4) { up.forEach((x, i) => P.push(...windowBox(x, 0.062, z, i + 2))); balcony('#ffffff', false); }
  } else if (kind === 'steep') {           // Alpine / Nordic: red geraniums in every window, a wooden balcony
    low.forEach((x) => P.push(...windowBox(x, k === 1 ? 0.02 : 0.022, z, 0)));
    if (k === 4) { up.forEach((x) => P.push(...windowBox(x, 0.062, z, 0))); balcony('#8a5a3a', true); }
  } else if (kind === 'tile') {            // Mediterranean / Latin American: shutters, pots, an iron balcony
    const sc = ['#3f7d5a', '#3b6fbf', '#3f7d5a'][k % 3];
    low.forEach((x) => P.push(...shutters(x, k === 1 ? 0.02 : 0.022, z, sc)));
    if (k >= 3) P.push(...pot(-0.016, z + 0.008), ...pot(0.016, z + 0.008, '#c0603a', '#5aa046', 0.012), ...pot(0.03, z + 0.012, '#d9cdb4', '#3f8a3a', 0.016));
    if (k === 4) { up.forEach((x) => P.push(...shutters(x, 0.062, z, sc))); balcony('#2f2f33', true); }
  } else if (kind === 'flat') {            // sunshades over the windows, potted plants on the roof, a balcony with plants
    low.forEach((x) => P.push(sunshade(x, 0.022, z)));
    if (k >= 2) P.push(...pot(-0.022, 0.012, '#c0603a', '#4f8f3c').map((g) => g.translate(0, FRONT[k] && k === 4 ? 0.092 : k === 1 ? 0.047 : 0.052, 0)), ...pot(0.024, -0.02, '#c0603a', '#5aa046').map((g) => g.translate(0, k === 4 ? 0.092 : 0.052, 0)));
    if (k >= 3) P.push(...pot(-0.016, z + 0.007), ...pot(0.016, z + 0.007, '#d9a42a', '#5aa046'));
    if (k === 4) { up.forEach((x) => P.push(sunshade(x, 0.062, z))); balcony('#3e4650', true); }
  } else if (kind === 'eave') {            // a lantern by the door, little pots, a wooden upper railing
    if (k >= 2) P.push(...pot(-0.016, z + 0.007, '#5a5f66', '#3f7d3a', 0.01), ...pot(0.016, z + 0.007, '#5a5f66', '#5aa046', 0.007));
    if (k >= 3) P.push(B(0.0012, 0.006, 0.0012, '#3a2a1a', 0.012, 0.034, z + 0.002), B(0.005, 0.007, 0.005, WIN, 0.012, 0.027, z + 0.003));
    if (k === 4) balcony('#6b4a32', false);
  } else if (kind === 'stilt' || kind === 'thai') { // plants on the veranda
    if (k >= 2) P.push(...[-0.024, 0.024].flatMap((x, i) => pot(x, z + 0.012, '#c0603a', i ? '#5aa046' : '#3f8a3a', 0.012).map((g) => g.translate(0, STILT, 0))));
  }
  return P;
}
const styleCache = new Map();
export function houseDefs(style) {
  const kind = (HOUSE_STYLES[style] || HOUSE_STYLES.hip).kind;
  if (styleCache.has(kind)) return styleCache.get(kind);
  const defs = {};
  for (const k of Object.keys(HOUSE)) {
    const n = +k;
    if (kind === 'hip' || n === 0 || n === 5) defs[k] = { ...HOUSE[k], gableAlt: kind === 'hip' };
    else defs[k] = { walls: wallsGeo(kind, n), roof: roofGeo(kind, n), details: detailsGeo(kind, n), gableAlt: false };
    const extra = kind === 'hut' && n <= 1 ? [] : facadeExtras(kind, n);
    if (extra.length) defs[k] = { ...defs[k], details: merge([defs[k].details, ...extra]) };
  }
  defs.farRoof = kind === 'flat' ? new THREE.BoxGeometry(0.072, 0.008, 0.072).translate(0, 0.056, 0)
    : kind === 'hut' ? new THREE.ConeGeometry(0.04, 0.04, 8).translate(0, 0.066, 0)
    : kind === 'steep' || kind === 'thai' ? gable(0.08, 0.055, 0.078, 0.052)
    : kind === 'tile' ? cone4(0.06, 0.024, 0.052) : new THREE.ConeGeometry(0.062, 0.042, 4).rotateY(Math.PI / 4).translate(0, 0.073, 0);
  styleCache.set(kind, defs);
  return defs;
}

// ---------------------------------------------------------------- civic buildings
// A small neighbourhood café: wooden terrace, tables under umbrellas, planters and string lights.
// Windows and bulbs use the window colour, so they glow warm at night like the houses.
export function cafeGeo(seed) {
  const AW = [['#e4573f', '#ffffff'], ['#2f7a5a', '#f3ead8'], ['#3b6fbf', '#ffffff'], ['#d9a42a', '#fff7e0']][seed % 4];
  const WALL = ['#f3e6cc', '#f6ede0', '#e9d3b4', '#dfe9ee'][(seed >> 2) % 4];
  const UMB = [['#e4573f', '#f6c445', '#ffffff'], ['#2f7a5a', '#f3ead8', '#d9a42a'], ['#3b6fbf', '#ffffff', '#e4573f']][seed % 3];
  const P = [
    B(0.15, 0.003, 0.115, '#b98a5c', 0, 0, 0.012),                                  // wooden terrace
    B(0.072, 0.05, 0.052, WALL, 0, 0, -0.03),                                       // the café
    B(0.08, 0.006, 0.06, '#8a4a32', 0, 0.05, -0.03), B(0.012, 0.016, 0.012, '#9c4a3a', 0.022, 0.054, -0.042), // roof, chimney
    B(0.024, 0.022, 0.002, WIN, -0.02, 0.008, -0.0035), B(0.024, 0.022, 0.002, WIN, 0.02, 0.008, -0.0035),  // big windows
    B(0.012, 0.028, 0.002, DOOR, 0, 0.002, -0.0035), B(0.03, 0.007, 0.002, '#3b2a1a', 0, 0.041, -0.0035),  // door, sign
  ];
  for (let i = 0; i < 6; i++) P.push(B(0.013, 0.003, 0.02, AW[i % 2], -0.0325 + i * 0.013, 0.034, 0.006)); // striped awning
  for (const [x, z, k] of [[-0.045, 0.03, 0], [0.0, 0.045, 1], [0.045, 0.03, 2]]) {     // tables, chairs, umbrellas
    P.push(CY(0.0012, 0.0012, 0.011, '#5a4a3a', x, 0.003, z, 5), CY(0.008, 0.008, 0.0015, '#f3ede0', x, 0.013, z, 10));
    for (const [dx, dz] of [[0.012, 0], [-0.012, 0], [0, 0.012], [0, -0.012]]) P.push(B(0.005, 0.008, 0.005, '#6b4a2a', x + dx, 0.003, z + dz), B(0.005, 0.006, 0.0012, '#6b4a2a', x + dx * 1.2, 0.011, z + dz * 1.2));
    P.push(CY(0.0008, 0.0008, 0.03, '#8a8f96', x, 0.003, z, 4), CO(0.018, 0.009, UMB[k], x, 0.03, z, 8));
  }
  for (const [x, z] of [[-0.07, 0.06], [0.07, 0.06], [-0.07, -0.005], [0.07, -0.005]]) {  // planters with flowers, light posts
    P.push(B(0.012, 0.01, 0.012, '#9a6a4a', x, 0.003, z), CO(0.008, 0.012, '#4f9a3f', x, 0.013, z, 6),
      B(0.003, 0.003, 0.003, ['#ff6b8a', '#ffd23f', '#ffffff'][(x > 0) + (z > 0)], x + 0.003, 0.02, z));
    P.push(CY(0.001, 0.001, 0.045, '#4a4a4a', x, 0.003, z + 0.008, 4));
  }
  for (let i = 0; i <= 12; i++) { const t = i / 12, x = -0.07 + t * 0.14, sag = Math.sin(t * Math.PI) * 0.006; P.push(B(0.0028, 0.0028, 0.0028, WIN, x, 0.045 - sag, 0.068)); } // string lights
  for (let i = 0; i <= 6; i++) { const t = i / 6; P.push(B(0.0028, 0.0028, 0.0028, WIN, -0.07, 0.045 - Math.sin(t * Math.PI) * 0.005, 0.003 + t * 0.065), B(0.0028, 0.0028, 0.0028, WIN, 0.07, 0.045 - Math.sin(t * Math.PI) * 0.005, 0.003 + t * 0.065)); }
  return merge(P);
}
export const benchGeo = () => merge([
  B(0.017, 0.0018, 0.006, '#a0703f', 0, 0.0055, 0), B(0.017, 0.0055, 0.0012, '#a0703f', 0, 0.0075, -0.0028),
  ...[-0.007, 0.007].map((x) => B(0.0015, 0.0055, 0.006, '#4a4a4a', x, 0, 0)),
]);

// ---------------------------------------------------------------- shared green spaces
const WATER = '#6fc0ea', STONE = '#d9cfbb', LAWN = '#5fa847', PATH = '#e6dac0';
const bench = (x, z, ry) => { const g = benchGeo(); g.rotateY(ry); g.translate(x, 0, z); return g; };
function fountain(r = 1) {
  return [CY(0.022 * r, 0.025 * r, 0.007 * r, STONE, 0, 0, 0, 16), DISC(0.019 * r, WATER, 0, 0.0072 * r), CY(0.004 * r, 0.005 * r, 0.02 * r, STONE, 0, 0.007 * r, 0, 8),
    CY(0.011 * r, 0.007 * r, 0.004 * r, STONE, 0, 0.026 * r, 0, 12), DISC(0.009 * r, WATER, 0, 0.0302 * r), CO(0.004 * r, 0.012 * r, '#e9f6fd', 0, 0.03 * r, 0, 6)];
}
const flowerBed = (x, z, r, k = 0) => [DISC(r, '#4f8f3c', x, 0.0006, z, 12), ...Array.from({ length: 9 }, (_, i) => { const a = i * 2.39, d = r * 0.25 + (i % 3) * r * 0.25; return B(0.004, 0.004, 0.004, ['#ff6b8a', '#ffd23f', '#ffffff', '#c86bff', '#ff8c42'][(i + k) % 5], x + Math.cos(a) * d, 0.0008, z + Math.sin(a) * d); })];
const lampPost = (x, z) => [CY(0.0012, 0.0016, 0.032, '#3e4650', x, 0, z, 5), B(0.005, 0.005, 0.005, WIN, x, 0.032, z)];
export function parkGeo() {   // round park: lawn, ring path, cross paths, fountain, flowerbeds, benches, trees
  return merge([
    DISC(0.17, LAWN), DISC(0.105, PATH, 0, 0.0004), DISC(0.09, '#68b04f', 0, 0.0008),
    B(0.016, 0.0012, 0.33, PATH, 0, 0.0004), B(0.33, 0.0012, 0.016, PATH, 0, 0.0004), DISC(0.035, PATH, 0, 0.0013),
    ...fountain(1.1),
    ...[0, 1, 2, 3].flatMap((i) => { const a = Math.PI / 4 + i * Math.PI / 2; return flowerBed(Math.cos(a) * 0.055, Math.sin(a) * 0.055, 0.022, i); }),
    ...[0, 1, 2, 3].map((i) => { const a = i * Math.PI / 2 + 0.38; return bench(Math.cos(a) * 0.045, Math.sin(a) * 0.045, -a - Math.PI / 2); }),
    ...[0, 1, 2, 3].flatMap((i) => { const a = i * Math.PI / 2 + Math.PI / 4; return lampPost(Math.cos(a) * 0.1, Math.sin(a) * 0.1); }),
    ...Array.from({ length: 18 }, (_, i) => { const a = (i / 18) * Math.PI * 2 + 0.17; return tree(Math.cos(a) * 0.14, Math.sin(a) * 0.14, 1.5 + (i % 3) * 0.2); }),
  ]);
}
export function squareGeo() { // town square: paving, big fountain, bandstand, trees in planters, benches, lamps
  const P = [B(0.27, 0.003, 0.27, '#d9cfbb')];
  for (let i = 0; i < 9; i++) for (let k = 0; k < 9; k++) if ((i + k) % 2) P.push(B(0.03, 0.0005, 0.03, '#e8e0cf', -0.12 + i * 0.03, 0.003, -0.12 + k * 0.03));
  P.push(...fountain(1.6));
  for (const [x, z] of [[-0.1, -0.1], [0.1, -0.1], [-0.1, 0.1], [0.1, 0.1]]) P.push(B(0.022, 0.008, 0.022, '#b9a988', x, 0.003, z), ...tree(x, z, 1.3).map((g) => g.translate(0, 0.008, 0)), ...lampPost(x * 0.6, z * 1.25));
  for (const [x, z, ry] of [[0, 0.07, Math.PI], [0, -0.07, 0], [0.07, 0, -Math.PI / 2], [-0.07, 0, Math.PI / 2]]) P.push(bench(x, z, ry));
  // bandstand on one side
  const bx = 0, bz = -0.115;
  P.push(CY(0.03, 0.03, 0.006, '#e8e0cf', bx, 0.003, bz, 8));
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; P.push(CY(0.0012, 0.0012, 0.024, '#ffffff', bx + Math.cos(a) * 0.026, 0.009, bz + Math.sin(a) * 0.026, 4)); }
  P.push(CO(0.034, 0.016, '#c8432f', bx, 0.033, bz, 8), B(0.003, 0.004, 0.003, WIN, bx, 0.03, bz));
  for (const s2 of [-1, 1]) P.push(...flowerBed(s2 * 0.11, 0, 0.018, s2 + 2));
  return merge(P);
}
export function gardenGeo() { // community garden: fenced raised beds, a shed, sunflowers, water barrel
  const P = [B(0.22, 0.003, 0.18, '#7a5a3a'), B(0.21, 0.0008, 0.17, '#6a8f45', 0, 0.003, 0)];
  const CROPS = ['#3f8a3a', '#d64533', '#f08a3a', '#7a4ab0', '#9bd36a', '#f6c445'];
  for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) {
    const x = -0.075 + i * 0.045, z = -0.05 + k * 0.045;
    P.push(B(0.036, 0.006, 0.03, '#a0703f', x, 0.003, z), B(0.032, 0.002, 0.026, '#5a3e28', x, 0.009, z));
    for (let r = 0; r < 3; r++) P.push(B(0.03, 0.004, 0.005, CROPS[(i * 3 + k + r) % CROPS.length], x, 0.011, z - 0.008 + r * 0.008));
  }
  for (const [x1, z1, w, d] of [[0, -0.09, 0.22, 0.002], [0, 0.09, 0.22, 0.002], [-0.11, 0, 0.002, 0.18], [0.11, 0, 0.002, 0.18]]) P.push(B(w, 0.003, d, '#d9cdb4', x1, 0.012, z1), B(w, 0.003, d, '#d9cdb4', x1, 0.006, z1));
  P.push(B(0.03, 0.025, 0.024, '#8a5a3a', 0.08, 0.003, 0.065), CO(0.026, 0.014, '#3f6f5a', 0.08, 0.028, 0.065, 4, Math.PI / 4), CY(0.006, 0.006, 0.012, '#3b6fbf', 0.055, 0.003, 0.07, 8));
  for (let i = 0; i < 6; i++) P.push(CY(0.0008, 0.0008, 0.024, '#4f8a3f', -0.09 + i * 0.012, 0.003, 0.075, 4), CY(0.004, 0.004, 0.001, '#f6c445', -0.09 + i * 0.012, 0.027, 0.075, 8));
  return merge(P);
}
export function pocketParkGeo(seed) { // three kinds: playground, quiet garden, pond with seats
  const k = seed % 3, P = [DISC(0.075, LAWN)];
  if (k === 0) {
    P.push(DISC(0.04, '#e8d6a6', 0, 0.0004));
    for (const x of [-0.022, 0.022]) P.push(B(0.002, 0.03, 0.002, '#3b6fbf', x, 0, -0.01), B(0.002, 0.03, 0.002, '#3b6fbf', x, 0, 0.01));
    P.push(B(0.048, 0.002, 0.002, '#3b6fbf', 0, 0.03, -0.01), B(0.048, 0.002, 0.002, '#3b6fbf', 0, 0.03, 0.01), B(0.002, 0.03, 0.022, '#3b6fbf', 0, 0, 0));
    for (const x of [-0.011, 0.011]) P.push(B(0.008, 0.0015, 0.004, '#e4573f', x, 0.01, 0));
    const slide = new THREE.BoxGeometry(0.008, 0.002, 0.035).rotateX(-0.6).translate(0.04, 0.012, 0.025); P.push(tint(slide, '#f6c445'), B(0.01, 0.022, 0.008, '#e4573f', 0.04, 0, 0.008));
    P.push(B(0.03, 0.002, 0.004, '#2fa65a', -0.035, 0.008, 0.035), B(0.003, 0.008, 0.003, '#8a8f96', -0.035, 0, 0.035));
    P.push(bench(0, 0.055, Math.PI), ...tree(-0.055, -0.04, 1.3), ...tree(0.055, -0.045, 1.2));
  } else if (k === 1) {
    P.push(B(0.012, 0.001, 0.15, PATH, 0, 0.0004), ...flowerBed(-0.035, -0.02, 0.022, seed), ...flowerBed(0.035, 0.02, 0.022, seed + 2));
    P.push(bench(0.03, -0.03, -Math.PI / 2), bench(-0.03, 0.03, Math.PI / 2), CY(0.006, 0.004, 0.012, STONE, 0, 0, 0, 8), DISC(0.005, WATER, 0, 0.0122));
    P.push(...tree(-0.05, 0.045, 1.5), ...tree(0.05, -0.05, 1.4), ...lampPost(0.012, 0.05));
  } else {
    P.push(DISC(0.045, WATER, 0, 0.0005), DISC(0.05, '#c9b98a', 0, 0.0003));
    for (let i = 0; i < 8; i++) { const a = i * 0.7; P.push(CY(0.0006, 0.0006, 0.012, '#5f8f3a', Math.cos(a) * 0.044, 0, Math.sin(a) * 0.044, 3)); }
    P.push(bench(0, 0.062, Math.PI), bench(0.062, 0, -Math.PI / 2), B(0.02, 0.003, 0.008, '#a0703f', -0.03, 0.002, -0.03), ...tree(-0.06, 0.035, 1.4), ...tree(0.03, -0.065, 1.3));
  }
  return merge(P);
}
const CIVIC_GEO = {
  cafe: () => cafeGeo(0),
  square: squareGeo,
  garden: gardenGeo,
  shops: () => merge([
    ...[0, 1, 2].map((i) => {
      const x = (i - 1) * 0.07, cols = ['#e86a4a', '#3b8fd0', '#2fa65a'];
      return [B(0.062, 0.05, 0.05, '#f4ead6', x), B(0.064, 0.006, 0.06, cols[i], x, 0.05, 0.002),
        B(0.066, 0.01, 0.018, cols[i], x, 0.034, 0.033), B(0.04, 0.02, 0.002, WIN, x, 0.006, 0.0255), B(0.05, 0.009, 0.002, '#ffffff', x, 0.041, 0.0255)];
    }),
    B(0.24, 0.002, 0.05, '#d9cdb4', 0, 0, 0.05),
  ]),
  park: parkGeo,
  school: () => merge([
    B(0.16, 0.05, 0.05, '#f6c445', 0, 0, -0.04), B(0.05, 0.05, 0.1, '#f6c445', -0.055, 0, 0.03),
    B(0.17, 0.008, 0.06, '#c8432f', 0, 0.05, -0.04), B(0.06, 0.008, 0.11, '#c8432f', -0.055, 0.05, 0.03),
    ...[-0.05, -0.02, 0.01, 0.04, 0.065].map((x) => B(0.014, 0.014, 0.002, WIN, x, 0.022, -0.0145)),
    B(0.11, 0.002, 0.08, '#c27b4e', 0.04, 0, 0.05), B(0.09, 0.002, 0.06, '#d78d5c', 0.04, 0.001, 0.05),
    CY(0.002, 0.002, 0.07, '#888', 0.09, 0, -0.08, 5), B(0.02, 0.012, 0.002, '#ff9933', 0.1, 0.058, -0.08),
  ]),
  hospital: () => merge([
    B(0.14, 0.08, 0.07, '#f7f9fb'), B(0.06, 0.11, 0.06, '#eef3f7', 0.02),
    B(0.04, 0.003, 0.012, '#e23b3b', 0.02, 0.11, 0), B(0.012, 0.003, 0.04, '#e23b3b', 0.02, 0.11, 0),
    ...[0.015, 0.04, 0.065].flatMap((y) => [-0.05, -0.025, 0.045].map((x) => B(0.014, 0.012, 0.002, '#7fc3e8', x, y, 0.0355))),
    B(0.03, 0.025, 0.012, '#e23b3b', -0.03, 0, 0.04), DISC(0.025, '#5a5f66', 0.07, 0, 0.07), B(0.02, 0.002, 0.004, '#fff', 0.07, 0.002, 0.07),
  ]),
  market: () => merge(Array.from({ length: 8 }, (_, i) => {
    const x = (i % 4 - 1.5) * 0.06, z = (Math.floor(i / 4) - 0.5) * 0.08, c = ['#e86a4a', '#f6c445', '#3b8fd0', '#2fa65a'][i % 4];
    return [B(0.04, 0.012, 0.03, '#a0784e', x, 0, z), CY(0.002, 0.002, 0.035, '#777', x, 0, z, 4), CO(0.032, 0.014, c, x, 0.035, z, 4, Math.PI / 4),
      B(0.008, 0.006, 0.008, ['#ff6b3d', '#9bd16a', '#ffd54a'][i % 3], x - 0.01, 0.012, z), B(0.008, 0.006, 0.008, '#d94b6a', x + 0.01, 0.012, z)];
  })),
  stadium: () => {
    const g = [DISC(0.16, '#cfc6b8'), DISC(0.11, '#4f9a3c', 0, 0.003)];
    for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; g.push(B(0.035, 0.03 + (i % 2) * 0.004, 0.02, i % 7 ? '#d8d2c6' : '#f7931e', Math.cos(a) * 0.135, 0, Math.sin(a) * 0.135 * 0.8)); }
    g.push(B(0.002, 0.002, 0.16, '#fff', 0, 0.004), DISC(0.02, '#fff', 0, 0.004));
    for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) g.push(CY(0.002, 0.003, 0.09, '#888', x * 0.12, 0, z * 0.1, 5), B(0.016, 0.01, 0.004, '#fff8d0', x * 0.12, 0.09, z * 0.1));
    const m = merge(g); m.scale(1, 1, 1); return m;
  },
  busStop: () => merge([B(0.06, 0.004, 0.025, '#f6c445', 0, 0.04), B(0.004, 0.04, 0.004, '#555', -0.025), B(0.004, 0.04, 0.004, '#555', 0.025), B(0.05, 0.006, 0.01, '#8a5a3a', 0, 0.012, -0.006), B(0.006, 0.05, 0.004, '#3b8fd0', 0.04)]),
  station: () => merge([
    B(0.3, 0.05, 0.1, '#e9dcc2'), B(0.32, 0.015, 0.12, '#3b6ea8', 0, 0.05), B(0.06, 0.08, 0.06, '#e9dcc2', 0, 0, -0.01), CO(0.05, 0.03, '#3b6ea8', 0, 0.08, -0.01, 4, Math.PI / 4),
    ...[-0.12, -0.08, -0.04, 0.04, 0.08, 0.12].map((x) => B(0.016, 0.018, 0.002, WIN, x, 0.015, 0.0505)),
    B(1.6, 0.003, 0.05, '#8a7a68', 0, 0, 0.11), B(1.6, 0.004, 0.004, '#555', 0, 0.003, 0.1), B(1.6, 0.004, 0.004, '#555', 0, 0.003, 0.12),
    B(0.12, 0.022, 0.026, '#d64533', 0.3, 0.004, 0.11), B(0.1, 0.022, 0.026, '#3b8fd0', 0.18, 0.004, 0.11),
  ]),
  airport: () => merge([
    B(0.1, 0.003, 0.9, '#4b4f55'), ...Array.from({ length: 9 }, (_, i) => B(0.004, 0.0035, 0.04, '#fff', 0, 0, -0.4 + i * 0.1)),
    B(0.2, 0.05, 0.09, '#cfd8e0', 0.18, 0, 0.1), B(0.21, 0.006, 0.1, '#7fa3c4', 0.18, 0.05, 0.1),
    CY(0.012, 0.018, 0.13, '#e9eef3', 0.14, 0, -0.15), CY(0.024, 0.02, 0.025, '#7fc3e8', 0.14, 0.13, -0.15),
    B(0.06, 0.008, 0.012, '#fff', 0, 0.006, 0.2), B(0.012, 0.006, 0.05, '#fff', 0, 0.006, 0.2), B(0.024, 0.012, 0.004, '#f7931e', 0, 0.01, 0.222),
  ]),
};

// ---------------------------------------------------------------- layout helpers
const mod = (a, n) => ((a % n) + n) % n;
export function gridCells(n) {
  const r = Math.ceil(Math.sqrt(n * 1.6) / 2) + 6;
  const list = [];
  for (let gx = -r; gx <= r; gx++) for (let gz = -r; gz <= r; gz++) {
    if (mod(gx, ROAD_EVERY) === 0 || mod(gz, ROAD_EVERY) === 0) continue;
    list.push([gx, gz, gx * gx + gz * gz]);
  }
  list.sort((a, b) => a[2] - b[2] || a[0] - b[0] || a[1] - b[1]);
  return list;
}
function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const flat = (c, lift = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: 1, flatShading: true, polygonOffset: lift > 0, polygonOffsetFactor: -lift, polygonOffsetUnits: -lift * 4 });

const WALLS = ['#fbf7ee', '#f3ede0', '#fffaf0', '#f6e7cf', '#eaf1f4', '#f9e9e4'];
const ROOFS = ['#c8432f', '#d4553a', '#b83b2a', '#cf4b33', '#e0703a', '#a8452f', '#6b7d8c'];
// choices people can pick in "Customise" (indices are stored on the server)
export const WALL_OPTIONS = ['#fbf7ee', '#f6e7cf', '#ffd9c2', '#cfe8f7', '#d8f0d0', '#f7d6e6', '#f3e38a', '#c9c4bd'];
export const ROOF_OPTIONS = ['#c8432f', '#e0703a', '#f2b134', '#3f7d3a', '#3b6ea8', '#6b4aa8', '#2b2b2b', '#6b7d8c', '#8a5a3a', '#d64588'];
export const GARDEN_OPTIONS = ['Lawn', 'Flowers', 'Trees', 'Vegetables'];

/**
 * Build a town. data = { town, houses: [{id, i, t}], now }, milestones from config.
 * Returns { group, houseR, cells, layout(T), stats(T), present(T) }.
 */
export function buildTown(data, milestones, clockOffset = 0) {
  const n = data.houses.length;
  const cells = gridCells(n);
  const used = cells.slice(0, Math.max(1, n));
  const houseR = Math.sqrt(used[used.length - 1][2]) * SPACING;
  const R = houseR + 0.95;
  const group = new THREE.Group();
  const rand = rng(hash(data.town.key));
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), UP = new THREE.Vector3(0, 1, 0);

  // ground
  const ground = new THREE.Mesh(new THREE.CircleGeometry(R, 72).rotateX(-Math.PI / 2), flat('#5d9f43'));
  ground.position.y = 0.0015;
  group.add(ground);
  const inner = new THREE.Mesh(new THREE.CircleGeometry(houseR + 0.12, 64).rotateX(-Math.PI / 2), flat('#67a84c'));
  inner.position.y = 0.0018;
  group.add(inner);

  // roads (with a centre line)
  const lines = [];
  const kMax = Math.ceil(R / (ROAD_EVERY * SPACING));
  for (let k = -kMax; k <= kMax; k++) {
    const c = k * ROAD_EVERY * SPACING;
    if (Math.abs(c) >= R - 0.05) continue;
    lines.push([c, Math.sqrt(R * R - c * c) - 0.04]);
  }
  const plane = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const roadW = (c) => (Math.abs(c) < 1e-6 ? 0.075 : 0.05); // the centre lines are boulevards
  // each street: grass verge | pale sidewalk | light curb | road
  const SIDEWALK = 0.017;
  const walks = new THREE.InstancedMesh(plane, flat('#ddd6c6', 1), lines.length * 2);
  const curbs = new THREE.InstancedMesh(plane, flat('#f1ece0', 1.5), lines.length * 2);
  const roads = new THREE.InstancedMesh(plane, flat('#5f646b', 2), lines.length * 2);
  lines.forEach(([c, half], i) => {
    const w = roadW(c);
    walks.setMatrixAt(i * 2, _m.compose(_p.set(c, 0.0029, 0), _q.identity(), _s.set(w + SIDEWALK * 2, 1, half * 2)));
    walks.setMatrixAt(i * 2 + 1, _m.compose(_p.set(0, 0.00295, c), _q.identity(), _s.set(half * 2, 1, w + SIDEWALK * 2)));
    curbs.setMatrixAt(i * 2, _m.compose(_p.set(c, 0.00297, 0), _q.identity(), _s.set(w + 0.006, 1, half * 2)));
    curbs.setMatrixAt(i * 2 + 1, _m.compose(_p.set(0, 0.00298, c), _q.identity(), _s.set(half * 2, 1, w + 0.006)));
    roads.setMatrixAt(i * 2, _m.compose(_p.set(c, 0.003, 0), _q.identity(), _s.set(w, 1, half * 2)));
    roads.setMatrixAt(i * 2 + 1, _m.compose(_p.set(0, 0.0031, c), _q.identity(), _s.set(half * 2, 1, w)));
  });
  // dashed centre lines (a green median with trees on the boulevards)
  const dashes = [];
  const DASH_R = 2.5; // km: dashed lines near the centre, one long line further out (keeps huge towns light)
  const solid = [];
  for (const [c, half] of lines) {
    if (Math.abs(c) < 1e-6) continue;
    const lim = Math.abs(c) < DASH_R ? Math.min(half, DASH_R) : 0;
    for (let t = -lim + 0.01; t < lim - 0.01; t += 0.032) { dashes.push([c, t, true], [t, c, false]); }
    if (half > lim + 0.01) for (const sgn of [-1, 1]) { const a = lim, b = half, mid = sgn * (a + b) / 2, len = b - a; solid.push([c, mid, len, true], [mid, c, len, false]); }
  }
  const marks = new THREE.InstancedMesh(plane, flat('#f2ead6', 4), Math.max(1, dashes.length + solid.length));
  dashes.forEach(([a, b, v], i) => marks.setMatrixAt(i, _m.compose(_p.set(a, 0.0034, b), _q.identity(), v ? _s.set(0.0028, 1, 0.016) : _s.set(0.016, 1, 0.0028))));
  solid.forEach(([a, b, len, v], j) => marks.setMatrixAt(dashes.length + j, _m.compose(_p.set(a, 0.0034, b), _q.identity(), v ? _s.set(0.0024, 1, len) : _s.set(len, 1, 0.0024))));
  marks.count = dashes.length + solid.length;
  const centre = lines.find(([c]) => Math.abs(c) < 1e-6);
  const median = new THREE.InstancedMesh(plane, flat('#5c9a44', 5), 2);
  if (centre) {
    median.setMatrixAt(0, _m.compose(_p.set(0, 0.0035, 0), _q.identity(), _s.set(0.012, 1, centre[1] * 2)));
    median.setMatrixAt(1, _m.compose(_p.set(0, 0.0036, 0), _q.identity(), _s.set(centre[1] * 2, 1, 0.012)));
  }
  group.add(walks, curbs, roads, marks, median);
  const boulevardTrees = [];
  if (centre) for (let t = -centre[1] + 0.06; t < centre[1] - 0.06; t += 0.07) if (Math.abs(t) > 0.06) boulevardTrees.push([0, t], [t, 0]);

  // civic buildings (positions fixed; shown once the town is big enough)
  const civic = [];
  const spots = [];
  const cafeLights = [];
  const addCivic = (id, name, at, x, z, ry = 0, geo) => {
    const mesh = new THREE.Mesh(geo || CIVIC_GEO[id](), vmat);
    if (id === 'cafe') { // warm glow over the terrace at night
      const gp = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([-0.04, 0.042, 0.04, 0.04, 0.042, 0.04, 0, 0.03, -0.002], 3)),
        new THREE.PointsMaterial({ map: glowTex, size: 0.045 / 6371, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      gp.visible = false; gp.frustumCulled = false; mesh.add(gp); cafeLights.push(gp);
    }
    // keep every public place off the roads (and their sidewalks), off the homes and off each other:
    // nudge it round the town and outwards until its whole footprint is clear
    mesh.geometry.computeBoundingBox();
    const bb = mesh.geometry.boundingBox, rr = Math.max(-bb.min.x, bb.max.x, -bb.min.z, bb.max.z);
    if (!['busStop', 'station', 'airport'].includes(id)) {
      const L = SPACING * ROAD_EVERY, gap = (v) => Math.abs(mod(v + L / 2, L) - L / 2);
      const a0 = Math.atan2(z, x), d0 = Math.hypot(x, z);
      const ok = (cx, cz, d) => gap(cx) > rr + 0.048 && gap(cz) > rr + 0.048 && d - rr > houseR + 0.09 &&
        !spots.some(([sx, sz, r]) => Math.hypot(cx - sx, cz - sz) < r + rr + 0.01) &&
        !cells.slice(n, n + 4).some(([gx, gz]) => Math.hypot(cx - gx * SPACING, cz - gz * SPACING) < rr + 0.07);
      let found = null;
      for (let m = 0; m < 10 && !found; m++) for (let j = 0; j <= 40 && !found; j++) {
        const a = a0 + (j % 2 ? 1 : -1) * Math.ceil(j / 2) * 0.035, d = Math.max(d0, houseR + rr + 0.1) + m * 0.05;
        const cx = Math.cos(a) * d, cz = Math.sin(a) * d;
        if (ok(cx, cz, d)) found = [cx, cz, a];
      }
      if (found) { ry -= found[2] - a0; x = found[0]; z = found[1]; }
    }
    mesh.position.set(x, 0.003, z); mesh.rotation.y = ry; mesh.visible = false;
    group.add(mesh); civic.push({ id, name, at, mesh }); spots.push([x, z, id === 'airport' || id === 'station' ? 0.5 : rr]);
  };
  for (const c of CIVIC) {
    const d = houseR + c.dist;
    addCivic(c.id, c.name, c.at, Math.cos(c.angle) * d, Math.sin(c.angle) * d, -c.angle + Math.PI / 2);
  }
  // more neighbourhood cafés as the town grows, spread around the homes, facing in towards the streets
  { const AT = [60, 130, 220, 340, 500, 700, 950, 1300, 1800, 2500];
    const onRoad = (v) => Math.abs(mod(v + SPACING * ROAD_EVERY / 2, SPACING * ROAD_EVERY) - SPACING * ROAD_EVERY / 2) < 0.1;
    let a = 0.55 + 2.39;
    AT.forEach((at, k) => {
      for (let tries = 0; tries < 24; tries++, a += 0.21) {
        const d = houseR + 0.16, x = Math.cos(a) * d, z = Math.sin(a) * d;
        if (onRoad(x) || onRoad(z) || spots.some(([sx, sz, r]) => Math.hypot(x - sx, z - sz) < r + 0.1)) continue;
        addCivic('cafe', 'Café', at, x, z, -a + Math.PI / 2 + Math.PI, cafeGeo(k + 1));
        break;
      }
      a += 2.39;
    });
  }
  // pocket parks (playgrounds, quiet gardens, ponds with seats) around the homes as the town grows
  { const AT = [25, 90, 180, 280, 420, 600, 850, 1200, 1700, 2400];
    const onRoad = (v) => Math.abs(mod(v + SPACING * ROAD_EVERY / 2, SPACING * ROAD_EVERY) - SPACING * ROAD_EVERY / 2) < 0.09;
    let a = 1.9;
    AT.forEach((at, k) => {
      for (let tries = 0; tries < 30; tries++, a += 0.19) {
        const d = houseR + 0.15, x = Math.cos(a) * d, z = Math.sin(a) * d;
        if (onRoad(x) || onRoad(z) || spots.some(([sx, sz, r]) => Math.hypot(x - sx, z - sz) < r + 0.06)) continue;
        addCivic('pocket', 'Pocket park', at, x, z, -a, pocketParkGeo(k));
        break;
      }
      a += 2.17;
    });
  }
  // a walking path all round the homes, with a bench now and then
  { const rp = houseR + 0.075;
    const ring = new THREE.Mesh(new THREE.RingGeometry(rp - 0.008, rp + 0.008, 160).rotateX(-Math.PI / 2), flat(PATH, 1));
    ring.position.y = 0.0028; group.add(ring);
    const L = SPACING * ROAD_EVERY, nearRoad = (v) => Math.abs(mod(v + L / 2, L) - L / 2) < 0.06;
    const nb = Math.max(4, Math.floor((rp * Math.PI * 2) / 0.3)), bm = new THREE.InstancedMesh(benchGeo(), vmat, nb);
    let c = 0;
    for (let i = 0; i < nb; i++) {
      const t = (i / nb) * Math.PI * 2 + 0.11, x = Math.cos(t) * (rp + 0.014), z = Math.sin(t) * (rp + 0.014);
      if (nearRoad(x) || nearRoad(z) || spots.some(([sx, sz, r]) => Math.hypot(x - sx, z - sz) < r)) continue;
      bm.setMatrixAt(c++, _m.compose(_p.set(x, 0.003, z), _q.setFromAxisAngle(UP, -t - Math.PI / 2), _s.set(1, 1, 1)));
    }
    bm.count = c; group.add(bm); }
  for (const m of milestones || []) {
    if (m.id === 'busStop') addCivic('busStop', m.name, m.at, 0.07, SPACING * 1.5, Math.PI / 2);
    if (m.id === 'station') addCivic('station', m.name, m.at, -(houseR + 0.32), 0.0, 0);
    if (m.id === 'airport') addCivic('airport', m.name, m.at, 0.0, -(houseR + 0.55), Math.PI / 2);
  }

  // houses: one walls/roof/details instanced mesh per growth stage
  const ROOF_B = { 1: gable(0.078, 0.036, 0.074, 0.047), 2: gable(0.084, 0.04, 0.08, 0.052), 3: gable(0.084, 0.04, 0.08, 0.052), 4: gable(0.088, 0.042, 0.078, 0.092) };
  const DETAIL_MAX = Math.max(1, Math.min(n, 4000)); // full-detail houses at once
  const T = data.town, region = T.country ? regionOf({ k: T.country, lat: T.lat || 0, lon: T.lon || 0 }) : 'hip';
  const styleKey = HOUSE_STYLES[region] ? region : 'hip', STY = HOUSE_STYLES[styleKey], DEFS = houseDefs(styleKey);
  const PAL_W = STY.walls || WALLS, PAL_R = STY.roofs || ROOFS;
  const stages = Object.keys(HOUSE).map((k) => {
    const def = DEFS[k];
    const walls = new THREE.InstancedMesh(def.walls, imat, DETAIL_MAX);
    const roof = def.roof ? new THREE.InstancedMesh(def.roof, imat, DETAIL_MAX) : null;
    const details = new THREE.InstancedMesh(def.details, vmat, DETAIL_MAX);
    const roofB = def.gableAlt && ROOF_B[k] ? new THREE.InstancedMesh(ROOF_B[k], imat, DETAIL_MAX) : null;
    walls.count = details.count = 0; if (roof) roof.count = 0; if (roofB) { roofB.count = 0; group.add(roofB); }
    group.add(walls, details); if (roof) group.add(roof);
    return { walls, roof, roofB, details };
  });
  // Downtown (Cities: Skylines style): in big towns the central blocks become apartment towers,
  // taller towards the middle and taller as the town grows. Each resident still has their own tower/apartment.
  const dtR = n >= 400 ? SPACING * Math.sqrt(n) * 0.22 : 0;                       // km
  const dtH = THREE.MathUtils.clamp(0.18 + Math.log10(Math.max(1, n / 400)) * 0.38, 0.18, 1.05); // km
  const towers = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), towerMat, Math.max(1, n));
  const roofTops = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), flat('#8a9099'), Math.max(1, n));
  towers.count = roofTops.count = 0;
  group.add(towers, roofTops);
  // far away: one simple block + roof per house (same colours), no shadows
  const farWalls = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 0.05, 0.07).translate(0, 0.027, 0), imat, Math.max(1, n));
  const farRoofs = new THREE.InstancedMesh(DEFS.farRoof, imat, Math.max(1, n));
  farWalls.count = farRoofs.count = 0;
  farWalls.userData.noShadow = farRoofs.userData.noShadow = true;
  group.add(farWalls, farRoofs);
  const homes = data.houses.map((h) => {
    const [gx, gz] = cells[h.i] || cells[cells.length - 1];
    const m = mod(gz, ROAD_EVERY);
    const ry = m <= 2 ? Math.PI : 0; // face the nearest road
    const hh = hash(h.id);
    // a little variety: some homes wider and lower, some narrower and taller (fence stays inside the plot)
    const sw = 0.9 + ((hh >>> 3) & 15) / 15 * 0.17, sd = 0.9 + ((hh >>> 7) & 15) / 15 * 0.17, sh = 0.9 + ((hh >>> 19) & 15) / 15 * 0.26;
    const mat = new THREE.Matrix4().compose(new THREE.Vector3(gx * SPACING, 0.003, gz * SPACING), new THREE.Quaternion().setFromAxisAngle(UP, ry), new THREE.Vector3(sw, sh, sd));
    const dc = Math.hypot(gx, gz) * SPACING;
    const tower = dtR > 0 && dc < dtR;
    const home = { ...h, px: gx * SPACING, pz: gz * SPACING, tower, th: tower ? 0.07 + Math.pow(1 - dc / dtR, 1.6) * dtH * (0.6 + ((hh >>> 4) & 15) / 25) : 0, tw: 0.075 + ((hh >>> 9) & 3) * 0.006, tc: GLASS[(hh >>> 14) % GLASS.length], gable: ((hh >>> 12) & 3) !== 0, mat, wall: new THREE.Color(PAL_W[hh % PAL_W.length]), roof: new THREE.Color(PAL_R[(hh >>> 8) % PAL_R.length]), garden: 0 };
    applyLook(home, h.look);
    return home;
  });
  function applyLook(home, look) {
    if (!look) return;
    const [w, r, g] = look;
    if (w >= 0 && w < WALL_OPTIONS.length) home.wall.set(WALL_OPTIONS[w]);
    if (r >= 0 && r < ROOF_OPTIONS.length) home.roof.set(ROOF_OPTIONS[r]);
    home.garden = g > 0 && g < GARDEN_OPTIONS.length ? g : 0;
  }
  // garden extras in the front-left yard
  const gardenGeo = [null,
    merge([B(0.026, 0.002, 0.016, '#6b4a2a', -0.04, 0, 0.048), ...[0, 1, 2, 3, 4].map((k) => B(0.004, 0.007, 0.004, ['#e85a8a', '#f6c445', '#ffffff', '#d64533', '#8e5cc4'][k], -0.05 + k * 0.005, 0.002, 0.048))]),
    merge([tree(-0.045, 0.045, 1.1), tree(-0.03, 0.055, 0.8)]),
    merge([B(0.03, 0.002, 0.02, '#6b4a2a', -0.04, 0, 0.047), ...[0, 1, 2].map((k) => B(0.026, 0.005, 0.003, '#4f9a3c', -0.04, 0.002, 0.04 + k * 0.007))]),
  ];
  const gardens = gardenGeo.map((g) => (g ? new THREE.InstancedMesh(g, vmat, DETAIL_MAX) : null));
  gardens.forEach((g) => { if (g) { g.count = 0; group.add(g); } });

  // moving cars: each drives along one road, on its own lane, and wraps around at the town edge
  const carCount = Math.min(240, Math.max(4, Math.floor(n / 3)));
  const carGeo = merge([B(0.014, 0.008, 0.026, WHITE), B(0.011, 0.006, 0.013, WIN, 0, 0.008, -0.002),
    B(0.004, 0.003, 0.001, '#fff6c8', -0.004, 0.003, 0.013), B(0.004, 0.003, 0.001, '#fff6c8', 0.004, 0.003, 0.013),
    B(0.004, 0.003, 0.001, '#d63a2a', -0.004, 0.003, -0.013), B(0.004, 0.003, 0.001, '#d63a2a', 0.004, 0.003, -0.013)]);
  const cars = new THREE.InstancedMesh(carGeo, imat, carCount);
  const carCols = ['#d64533', '#3b8fd0', '#f6c445', '#ffffff', '#2b2b2b', '#2fa65a', '#9aa2ad', '#f7931e'];
  const reach = houseR + 0.25;
  const drivers = [];
  for (let i = 0; i < carCount; i++) {
    const line = lines[Math.floor(rand() * lines.length)] || [0, 1];
    const c = line[0];
    if (Math.abs(c) > reach) { i--; if (drivers.length === 0 && i < -50) break; continue; }
    const dir = rand() < 0.5 ? 1 : -1;
    drivers.push({ c, vertical: rand() < 0.5, dir, lane: dir * 0.011, s: (rand() * 2 - 1) * reach, v: 0.025 + rand() * 0.02, half: Math.min(line[1], reach) });
    cars.setColorAt(drivers.length - 1, _c.set(carCols[i % carCols.length]));
  }
  cars.count = 0;
  group.add(cars);
  function moveCars(dt, limit) {
    const k = Math.min(drivers.length, limit);
    for (let i = 0; i < k; i++) {
      const d = drivers[i];
      d.s += d.dir * d.v * dt;
      if (d.s > d.half) d.s = -d.half; else if (d.s < -d.half) d.s = d.half;
      if (d.vertical) _p.set(d.c + d.lane, 0.0035, d.s); else _p.set(d.s, 0.0035, d.c - d.lane);
      const ang = d.vertical ? (d.dir > 0 ? 0 : Math.PI) : (d.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      cars.setMatrixAt(i, _m.compose(_p, _q.setFromAxisAngle(UP, ang), _s.set(1, 1, 1)));
    }
    cars.count = k;
    cars.instanceMatrix.needsUpdate = true;
  }

  // street lamps along the roads (glow at night)
  const lampSpots = [];
  const step = SPACING * 2.5;
  for (const [c] of lines) {
    if (Math.abs(c) > houseR + 0.15) continue;
    for (let s2 = -houseR - 0.1; s2 <= houseR + 0.1; s2 += step) {
      if (Math.hypot(c, s2) > houseR + 0.2) continue;
      lampSpots.push([c + 0.03, s2]); lampSpots.push([s2, c - 0.03]);
    }
  }
  if (lampSpots.length > 3000) { lampSpots.sort((a, b) => a[0] * a[0] + a[1] * a[1] - b[0] * b[0] - b[1] * b[1]); lampSpots.length = 3000; }
  const poleG = merge([CY(0.0015, 0.002, 0.045, '#3a3d42', 0, 0, 0, 5), B(0.012, 0.002, 0.002, '#3a3d42', -0.005, 0.044, 0), B(0.006, 0.003, 0.005, '#fff3c4', -0.01, 0.041, 0)]);
  const lamps = new THREE.InstancedMesh(poleG, vmat, Math.max(1, lampSpots.length));
  const glows = new THREE.Group(); glows.visible = false;
  const glowPos = new Float32Array(lampSpots.length * 3);
  const pools = new THREE.InstancedMesh(new THREE.CircleGeometry(0.03, 16).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -24 }), Math.max(1, lampSpots.length));
  lampSpots.forEach(([x, z], i) => {
    lamps.setMatrixAt(i, _m.compose(_p.set(x, 0.003, z), _q.identity(), _s.set(1, 1, 1)));
    glowPos.set([x - 0.01, 0.043, z], i * 3);
    pools.setMatrixAt(i, _m.compose(_p.set(x - 0.01, 0.0038, z), _q.identity(), _s.set(1, 1, 1)));
  });
  pools.count = lampSpots.length;
  const glowGeo = new THREE.BufferGeometry(); glowGeo.setAttribute('position', new THREE.BufferAttribute(glowPos, 3));
  // points size ignores the group's km scale, so it is given in world units (Earth radii)
  const glowPts = new THREE.Points(glowGeo, new THREE.PointsMaterial({ map: glowTex, size: 0.05 / 6371, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  glowPts.frustumCulled = false;
  glows.add(glowPts, pools);
  lamps.count = lampSpots.length;
  group.add(lamps, glows);
  { const bench = new THREE.InstancedMesh(benchGeo(), vmat, Math.max(1, Math.ceil(lampSpots.length / 2) + 1));
    let nb = 0;
    // a lamp sits 0.03 east of a north-south street or 0.03 north of an east-west one; benches go beside every other lamp
    const L = SPACING * ROAD_EVERY, near = (v) => Math.abs(mod(v + L / 2, L) - L / 2) < 0.004;
    for (let i = 0; i < lampSpots.length; i += 2) {
      const [x, z] = lampSpots[i];
      if (near(x - 0.03)) {
        if (Math.abs(x - 0.03) < 1e-3) continue; // not on the boulevard
        bench.setMatrixAt(nb++, _m.compose(_p.set(x + 0.008, 0.003, z + 0.03), _q.setFromAxisAngle(UP, -Math.PI / 2), _s.set(1, 1, 1)));
      } else if (near(z + 0.03)) {
        if (Math.abs(z + 0.03) < 1e-3) continue;
        bench.setMatrixAt(nb++, _m.compose(_p.set(x + 0.03, 0.003, z - 0.008), _q.identity(), _s.set(1, 1, 1)));
      }
    }
    bench.count = nb; group.add(bench); }

  // free plots: the next empty cells, outlined, waiting for new neighbours
  const freePlots = cells.slice(n, n + 4).map(([gx, gz]) => {
    const x = gx * SPACING, z = gz * SPACING;
    const plot = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.11).rotateX(-Math.PI / 2), flat('#8cc46a', 2));
    plot.position.set(x, 0.0037, z);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.11, 0.0001, 0.11)), new THREE.LineBasicMaterial({ color: '#ffffff' }));
    edge.position.set(x, 0.004, z);
    const stake = new THREE.Mesh(merge([CY(0.0015, 0.0015, 0.03, WOOD, 0, 0, 0, 4), B(0.022, 0.012, 0.002, '#fffdf0', 0, 0.022, 0)]), vmat);
    stake.position.set(x + 0.04, 0.003, z + 0.04);
    group.add(plot, edge, stake);
    return new THREE.Vector3(x, 0, z);
  });

  // trees, ponds, rocks in the open land
  const free = (x, z, pad) => !spots.some(([sx, sz, r]) => Math.hypot(x - sx, z - sz) < r + pad) &&
    Math.abs(mod(x + SPACING * ROAD_EVERY / 2, SPACING * ROAD_EVERY) - SPACING * ROAD_EVERY / 2) > 0.04 &&
    Math.abs(mod(z + SPACING * ROAD_EVERY / 2, SPACING * ROAD_EVERY) - SPACING * ROAD_EVERY / 2) > 0.04;
  const treeSpots = [];
  for (let i = 0; i < 420; i++) {
    const a = rand() * Math.PI * 2, d = houseR + 0.14 + Math.sqrt(rand()) * (R - houseR - 0.2);
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (free(x, z, 0.03)) treeSpots.push([x, z, 0.7 + rand() * 0.8, rand() < 0.3]);
  }
  const trunkG = new THREE.CylinderGeometry(0.006, 0.008, 0.03, 5).translate(0, 0.015, 0);
  const pineG = new THREE.ConeGeometry(0.035, 0.09, 6).translate(0, 0.075, 0);
  const roundG = new THREE.IcosahedronGeometry(0.035, 0).translate(0, 0.06, 0);
  for (const [x, z] of boulevardTrees) treeSpots.push([x, z, 0.75, true]);
  { const streetTrees = [];
    for (const [c] of lines) {
      if (Math.abs(c) < 1e-6 || Math.abs(c) > houseR + 0.1) continue;
      const off = roadW(c) / 2 + SIDEWALK + 0.008;
      for (let j = -Math.ceil(houseR / SPACING); j <= Math.ceil(houseR / SPACING); j++) {
        const m = mod(j, ROAD_EVERY); if (m === 0 || m === ROAD_EVERY - 1) continue; // keep corners clear
        const t = (j + 0.5) * SPACING;
        if (Math.hypot(c, t) > houseR + 0.05) continue;
        if (rand() < 0.7 && free(c - off, t, 0.02)) streetTrees.push([c - off, t, 0.42 + rand() * 0.12, true]);
        if (rand() < 0.7 && free(t, c + off, 0.02)) streetTrees.push([t, c + off, 0.42 + rand() * 0.12, true]);
      }
    }
    if (streetTrees.length > 3000) { streetTrees.sort((a, b) => a[0] * a[0] + a[1] * a[1] - b[0] * b[0] - b[1] * b[1]); streetTrees.length = 3000; }
    treeSpots.push(...streetTrees); }
  const tropical = Math.abs(data.town.lat || 0) < 24;
  const palmSpots = [];
  if (tropical) for (let i = treeSpots.length - 1; i >= 0; i--) if (rand() < 0.45) palmSpots.push(...treeSpots.splice(i, 1));
  const palms = new THREE.InstancedMesh(palmGeo(), vmat, Math.max(1, palmSpots.length));
  palmSpots.forEach(([x, z, sc], i) => palms.setMatrixAt(i, _m.compose(_p.set(x, 0.003, z), _q.setFromAxisAngle(UP, rand() * 6.28), _s.set(sc, sc, sc))));
  palms.count = palmSpots.length;
  group.add(palms);
  const trunks = new THREE.InstancedMesh(trunkG, flat('#7a5a3a'), treeSpots.length || 1);
  const treeMat = addWind(imat.clone(), { from: 0.03, amp: 0.06, phase: 30 });
  const pines = new THREE.InstancedMesh(pineG, treeMat, treeSpots.length || 1);
  const rounds = new THREE.InstancedMesh(roundG, treeMat, treeSpots.length || 1);
  let np = 0, nr = 0;
  const TREE = ['#3f7d3a', '#4a8c3f', '#357033', '#5a9a46'];
  treeSpots.forEach(([x, z, s, round], i) => {
    _m.compose(_p.set(x, 0.003, z), _q.identity(), _s.set(s, s, s));
    trunks.setMatrixAt(i, _m);
    if (round) { rounds.setMatrixAt(nr, _m); rounds.setColorAt(nr++, _c.set(TREE[i % 4])); }
    else { pines.setMatrixAt(np, _m); pines.setColorAt(np++, _c.set(TREE[(i + 1) % 4])); }
  });
  trunks.count = treeSpots.length; pines.count = np; rounds.count = nr;
  group.add(trunks, pines, rounds);
  for (let i = 0; i < 4; i++) {
    const a = rand() * Math.PI * 2, d = houseR + 0.4 + rand() * 0.35, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (!free(x, z, 0.1)) continue;
    const pond = new THREE.Mesh(new THREE.CircleGeometry(0.08 + rand() * 0.07, 24).rotateX(-Math.PI / 2), flat('#4aa3d4'));
    pond.position.set(x, 0.0036, z); pond.scale.z = 0.6 + rand() * 0.4;
    group.add(pond);
  }

  let carLimit = 0;
  let focus = { x: 0, z: 0, r: Infinity }; // detailed houses are the ones nearest this point (town-local km)
  let lastT = Date.now() + clockOffset;
  // Place every house that exists at time T, at the stage its age gives it.
  function layout(T) {
    lastT = T;
    const counts = [0, 0, 0, 0, 0, 0], countsB = [0, 0, 0, 0, 0, 0];
    let present = 0, nf = 0;
    const live = [];
    for (const h of homes) {
      if (h.t > T) { h.stage = null; h.detail = false; continue; }
      present++;
      h.stage = stageFor(T - h.t);
      live.push(h);
    }
    // choose which houses get full detail: all of them in normal towns, the nearest DETAIL_MAX in huge ones
    if (live.length <= DETAIL_MAX) for (const h of live) h.detail = true;
    else {
      const r2 = focus.r * focus.r;
      for (const h of live) { h._d = (h.px - focus.x) ** 2 + (h.pz - focus.z) ** 2; h.detail = false; }
      const near = live.filter((h) => h._d <= r2).sort((a, b) => a._d - b._d);
      for (let i = 0; i < Math.min(DETAIL_MAX, near.length); i++) near[i].detail = true;
    }
    let nt = 0;
    for (const h of live) {
      const st = h.stage;
      if (h.tower && st > 0) {
        _p.setFromMatrixPosition(h.mat);
        towers.setMatrixAt(nt, _m.compose(_p, _q.identity(), _s.set(h.tw, h.th, h.tw)));
        towers.setColorAt(nt, _c.set(h.tc));
        roofTops.setMatrixAt(nt, _m.compose(_p.setY(_p.y + h.th), _q.identity(), _s.set(h.tw * 0.45, 0.012, h.tw * 0.45)));
        nt++;
        continue;
      }
      if (!h.detail) {
        if (st === 0) continue; // building sites are invisible from afar
        farWalls.setMatrixAt(nf, h.mat); farWalls.setColorAt(nf, h.wall);
        farRoofs.setMatrixAt(nf, h.mat); farRoofs.setColorAt(nf, h.roof); nf++;
        continue;
      }
      const S = stages[st], k = counts[st]++;
      S.walls.setMatrixAt(k, h.mat); S.walls.setColorAt(k, h.wall);
      S.details.setMatrixAt(k, h.mat);
      if (S.roofB && h.gable) { const kb = countsB[st]++; S.roofB.setMatrixAt(kb, h.mat); S.roofB.setColorAt(kb, h.roof); }
      else if (S.roof) { const ka = k - countsB[st]; S.roof.setMatrixAt(ka, h.mat); S.roof.setColorAt(ka, h.roof); }
    }
    const gc = [0, 0, 0, 0];
    towers.count = roofTops.count = nt;
    towers.instanceMatrix.needsUpdate = roofTops.instanceMatrix.needsUpdate = true;
    if (towers.instanceColor) towers.instanceColor.needsUpdate = true;
    farWalls.count = farRoofs.count = nf;
    farWalls.instanceMatrix.needsUpdate = farRoofs.instanceMatrix.needsUpdate = true;
    if (farWalls.instanceColor) farWalls.instanceColor.needsUpdate = farRoofs.instanceColor.needsUpdate = true;
    for (const h of homes) {
      if (!h.garden || !h.detail || h.stage == null || h.stage === 0) continue;
      gardens[h.garden].setMatrixAt(gc[h.garden]++, h.mat);
    }
    gardens.forEach((g, i) => { if (g) { g.count = gc[i]; g.instanceMatrix.needsUpdate = true; } });
    stages.forEach((S, i) => {
      S.walls.count = S.details.count = counts[i];
      S.walls.instanceMatrix.needsUpdate = S.details.instanceMatrix.needsUpdate = true;
      if (S.walls.instanceColor) S.walls.instanceColor.needsUpdate = true;
      if (S.roof) { S.roof.count = counts[i] - countsB[i]; S.roof.instanceMatrix.needsUpdate = true; if (S.roof.instanceColor) S.roof.instanceColor.needsUpdate = true; }
      if (S.roofB) { S.roofB.count = countsB[i]; S.roofB.instanceMatrix.needsUpdate = true; if (S.roofB.instanceColor) S.roofB.instanceColor.needsUpdate = true; }
    });
    for (const c of civic) c.mesh.visible = present >= c.at;
    carLimit = Math.max(present > 0 ? 2 : 0, Math.floor(present / 3));
    moveCars(0, carLimit);
    return { present, counts };
  }
  const firstT = homes.length ? homes.reduce((m, h) => (h.t < m ? h.t : m), Infinity) : Date.now();
  layout(Date.now() + clockOffset);
  // ---------------- festivals: string lights, diyas, lanterns, Christmas tree, fireworks, Holi colours
  const festRoot = new THREE.Group(); festRoot.visible = false; group.add(festRoot);
  const EAVE = { 1: [0.047, 0.034, 0.034, 0], 2: [0.052, 0.037, 0.037, 0], 3: [0.052, 0.037, 0.037, 0], 4: [0.092, 0.039, 0.036, 0], 5: [0.067, 0.06, 0.045, -0.01] };
  const bulbMat = new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false });
  const bulbG = new THREE.SphereGeometry(0.006, 6, 4);
  let bulbs = null, fest = null, twinkleT = 0;
  const bursts = [];
  let burstT = 0;
  const sparkTex = glowTex;
  function buildFestival(f) {
    festRoot.clear(); bulbs = null; bursts.length = 0;
    fest = f;
    festRoot.visible = !!f;
    if (!f) return;
    const pal = f.colors.map((c) => new THREE.Color(c));
    const local = new THREE.Vector3(), world = new THREE.Vector3();
    const spots = [];
    for (const h of homes) {
      if (h.stage == null || h.stage === 0 || !h.detail) continue;
      const [y, hx, hz, oz] = EAVE[h.stage];
      // three bulbs per eave edge plus corners
      for (let k = 0; k <= 4; k++) {
        const t = -1 + k * 0.5;
        spots.push([t * hx, y, hz + oz], [t * hx, y, -hz + oz], [hx, y, t * hz + oz], [-hx, y, t * hz + oz]);
      }
      if (f.diyas) spots.push([-0.012, 0.004, 0.06], [0.012, 0.004, 0.06]);
      if (spots.length > 9000) break;
      h._spotsEnd = spots.length;
    }
    bulbs = new THREE.InstancedMesh(bulbG, bulbMat, Math.max(1, spots.length));
    let hi = 0, idx = 0;
    for (const h of homes) {
      if (h.stage == null || h.stage === 0 || !h.detail || !h._spotsEnd) continue;
      for (; idx < h._spotsEnd; idx++) {
        local.set(...spots[idx]);
        world.copy(local).applyMatrix4(h.mat);
        bulbs.setMatrixAt(idx, _m.compose(world, _q.identity(), _s.set(1, 1, 1)));
        const diya = f.diyas && spots[idx][1] < 0.01;
        bulbs.setColorAt(idx, diya ? _c.set('#ff9e2c') : pal[(idx + hi) % pal.length]);
      }
      hi++;
    }
    bulbs.count = spots.length;
    festRoot.add(bulbs);
    if (f.lanterns || f.diyas) {
      const lan = new THREE.InstancedMesh(merge([CY(0.006, 0.006, 0.012, f.lanterns ? '#e63946' : '#ff9e2c', 0, 0, 0, 8), CY(0.003, 0.003, 0.002, '#ffd166', 0, 0.012, 0, 8)]),
        new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }), Math.max(1, lampSpots.length));
      lampSpots.forEach(([x, z], i) => lan.setMatrixAt(i, _m.compose(_p.set(x - 0.01, 0.026, z), _q.identity(), _s.set(1, 1, 1))));
      lan.count = lampSpots.length; festRoot.add(lan);
    }
    if (f.tree) {
      const tree = new THREE.Group();
      [[0.07, 0.07, 0], [0.055, 0.06, 0.045], [0.04, 0.05, 0.085]].forEach(([r, h, y]) => tree.add(new THREE.Mesh(new THREE.ConeGeometry(r, h, 8).translate(0, y + h / 2 + 0.01, 0), new THREE.MeshStandardMaterial({ color: '#1f6f3a', flatShading: true }))));
      tree.add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.012, 6).translate(0, 0.006, 0), new THREE.MeshStandardMaterial({ color: '#6b4a2a' })));
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.01), new THREE.MeshBasicMaterial({ color: '#ffd166', fog: false }));
      star.position.y = 0.15; tree.add(star);
      for (let i = 0; i < 40; i++) {
        const a = i * 2.4, yy = 0.015 + (i / 40) * 0.12, rr = 0.065 * (1 - (i / 40) * 0.85);
        const b = new THREE.Mesh(bulbG, new THREE.MeshBasicMaterial({ color: f.colors[i % f.colors.length], fog: false }));
        b.position.set(Math.cos(a) * rr, yy, Math.sin(a) * rr); b.scale.setScalar(1.6); tree.add(b);
      }
      tree.position.set(0, 0.003, 0);
      festRoot.add(tree);
    }
  }
  function spawnBurst() {
    const n = fest.powder ? 70 : 140;
    const pos = new Float32Array(n * 3), vel = new Float32Array(n * 3);
    const cx = (rand() * 2 - 1) * houseR * 0.8, cz = (rand() * 2 - 1) * houseR * 0.8;
    const cy = fest.powder ? 0.02 + rand() * 0.03 : 0.22 + rand() * 0.2;
    const speed = fest.powder ? 0.05 : 0.16 + rand() * 0.08;
    for (let i = 0; i < n; i++) {
      const u = rand() * 2 - 1, th = rand() * Math.PI * 2, r = Math.sqrt(1 - u * u);
      pos.set([cx, cy, cz], i * 3);
      vel.set([Math.cos(th) * r * speed, (fest.powder ? Math.abs(u) : u) * speed, Math.sin(th) * r * speed], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: fest.colors[Math.floor(rand() * fest.colors.length)], size: (fest.powder ? 0.06 : 0.075) / 6371, map: sparkTex,
      transparent: true, depthWrite: false, fog: false, blending: fest.powder ? THREE.NormalBlending : THREE.AdditiveBlending, sizeAttenuation: true });
    const pts = new THREE.Points(g, mat);
    pts.frustumCulled = false;
    festRoot.add(pts);
    bursts.push({ pts, vel, age: 0, life: fest.powder ? 3 : 1.9 });
  }
  function festUpdate(dt) {
    if (!fest) return;
    twinkleT += dt;
    if (bulbs && twinkleT > 0.35) {
      twinkleT = 0;
      const pal = fest.colors;
      for (let k = 0; k < Math.min(400, bulbs.count / 6); k++) {
        const i = Math.floor(rand() * bulbs.count);
        bulbs.setColorAt(i, _c.set(rand() < 0.15 ? '#3a2a10' : pal[Math.floor(rand() * pal.length)]));
      }
      if (bulbs.instanceColor) bulbs.instanceColor.needsUpdate = true;
    }
    if (fest.fireworks || fest.powder) {
      burstT -= dt;
      if (burstT <= 0 && bursts.length < 12) { spawnBurst(); burstT = 0.35 + rand() * 0.8; }
    }
    for (let b = bursts.length - 1; b >= 0; b--) {
      const B2 = bursts[b];
      B2.age += dt;
      const p = B2.pts.geometry.attributes.position, v = B2.vel;
      for (let i = 0; i < v.length; i += 3) {
        v[i + 1] -= (fest.powder ? 0.004 : 0.05) * dt;
        v[i] *= 0.985; v[i + 2] *= 0.985;
        p.array[i] += v[i] * dt; p.array[i + 1] += v[i + 1] * dt; p.array[i + 2] += v[i + 2] * dt;
      }
      p.needsUpdate = true;
      B2.pts.material.opacity = Math.max(0, 1 - B2.age / B2.life);
      if (B2.age > B2.life) { B2.pts.removeFromParent(); B2.pts.geometry.dispose(); B2.pts.material.dispose(); bursts.splice(b, 1); }
    }
  }

  const update = (dt) => { moveCars(dt, carLimit); festUpdate(dt); };
  const setFestival = (f) => buildFestival(f);
  // live preview / update of one house's colours and garden
  // move the full-detail area (only matters for towns bigger than DETAIL_MAX)
  const setFocus = (x, z, r) => {
    if (homes.length <= DETAIL_MAX) return;
    const moved = Math.hypot(x - focus.x, z - focus.z), rr = focus.r === Infinity ? 0 : focus.r;
    if (moved < r * 0.25 && Math.abs(r - rr) < r * 0.35) return;
    focus = { x, z, r };
    layout(lastT);
  };
  const setLook = (id, look) => { const h = homes.find((x) => x.id === id); if (!h) return; applyLook(h, look); layout(Date.now() + clockOffset); };
  const setNight = (on) => { glows.visible = on; towerMat.emissiveIntensity = on ? 1.1 : 0; cafeLights.forEach((g) => (g.visible = on)); };
  const treeObstacles = treeSpots.concat(palmSpots).map(([x, z]) => [x, z]);
  return { group, houseR, R, cells, homes, civic, layout, firstT, update, setNight, setFestival, setLook, setFocus, freePlots, treeObstacles, huge: homes.length > DETAIL_MAX };
}
