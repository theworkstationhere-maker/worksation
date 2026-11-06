// Famous places of the world, each drawn as a small stylised low-poly model.
// Model units are kilometres (exaggerated, cartoon scale). y is up.
import * as THREE from 'three';
import { WONDERS } from './wonders.js';
import { REAL } from './landmarks-real.js';
import { REAL2 } from './landmarks-real2.js';
import { REAL3 } from './landmarks-real3.js';
import { buildPlace, genScale, genViewKm } from './placegen.js';
import { bake } from './lm-kit.js';
export { genScale, genViewKm };

// view: altitude (km) the camera flies to when visiting. top: shown on the whole-Earth view.
export const LANDMARKS = [
  // Europe
  { name: 'Eiffel Tower', lat: 48.8584, lon: 2.2945, type: 'eiffel', country: 'France', icon: '🗼', top: true },
  { name: 'Arc de Triomphe', lat: 48.8738, lon: 2.2950, type: 'arch', country: 'France', icon: '🏛️' },
  { name: 'Louvre Pyramid', lat: 48.8606, lon: 2.3376, type: 'glasspyramid', country: 'France', icon: '🔺' },
  { name: 'Mont-Saint-Michel', lat: 48.6361, lon: -1.5115, type: 'castle', country: 'France', icon: '🏰' },
  { name: 'Big Ben', lat: 51.5007, lon: -0.1246, type: 'clocktower', country: 'United Kingdom', icon: '🕰️', top: true },
  { name: 'Tower Bridge', lat: 51.5055, lon: -0.0754, type: 'bridge', country: 'United Kingdom', icon: '🌉', color: '#9fb7d0' },
  { name: 'Stonehenge', lat: 51.1789, lon: -1.8262, type: 'stones', country: 'United Kingdom', icon: '🪨' },
  { name: 'Colosseum', lat: 41.8902, lon: 12.4922, type: 'colosseum', country: 'Italy', icon: '🏟️', top: true },
  { name: 'Leaning Tower of Pisa', lat: 43.7230, lon: 10.3966, type: 'pisa', country: 'Italy', icon: '🗼' },
  { name: 'Parthenon', lat: 37.9715, lon: 23.7267, type: 'temple', country: 'Greece', icon: '🏛️' },
  { name: 'Sagrada Família', lat: 41.4036, lon: 2.1744, type: 'spires', country: 'Spain', icon: '⛪' },
  { name: 'Alhambra', lat: 37.1761, lon: -3.5881, type: 'fort', country: 'Spain', icon: '🏯', color: '#d99a6c' },
  { name: 'Brandenburg Gate', lat: 52.5163, lon: 13.3777, type: 'gate', country: 'Germany', icon: '🏛️' },
  { name: 'Neuschwanstein Castle', lat: 47.5576, lon: 10.7498, type: 'castle', country: 'Germany', icon: '🏰' },
  { name: "St Basil's Cathedral", lat: 55.7525, lon: 37.6231, type: 'onion', country: 'Russia', icon: '⛪', top: true },
  { name: 'Hagia Sophia', lat: 41.0086, lon: 28.9802, type: 'mosque', country: 'Türkiye', icon: '🕌', color: '#e7b9a0' },
  // Africa & Middle East
  { name: 'Pyramids of Giza', lat: 29.9792, lon: 31.1342, type: 'pyramids', country: 'Egypt', icon: '🔺', top: true },
  { name: 'Petra', lat: 30.3285, lon: 35.4444, type: 'rockfacade', country: 'Jordan', icon: '🏜️' },
  { name: 'Burj Khalifa', lat: 25.1972, lon: 55.2744, type: 'burj', country: 'UAE', icon: '🏙️', top: true },
  { name: 'Burj Al Arab', lat: 25.1412, lon: 55.1853, type: 'sail', country: 'UAE', icon: '⛵' },
  { name: 'Sheikh Zayed Mosque', lat: 24.4128, lon: 54.4750, type: 'mosque', country: 'UAE', icon: '🕌' },
  { name: 'Kilimanjaro', lat: -3.0674, lon: 37.3556, type: 'volcano', country: 'Tanzania', icon: '🏔️', view: 30, top: true },
  { name: 'Victoria Falls', lat: -17.9243, lon: 25.8572, type: 'waterfall', country: 'Zambia / Zimbabwe', icon: '💦', view: 5 },
  { name: 'Table Mountain', lat: -33.9628, lon: 18.4098, type: 'mesa', country: 'South Africa', icon: '⛰️', view: 12 },
  // South Asia
  { name: 'Taj Mahal', lat: 27.1751, lon: 78.0421, type: 'taj', country: 'India', icon: '🕌', top: true, view: 1.2 },
  { name: 'India Gate', lat: 28.6129, lon: 77.2295, type: 'gate', country: 'India', icon: '🏛️', color: '#d9a679' },
  { name: 'Red Fort', lat: 28.6562, lon: 77.2410, type: 'fort', country: 'India', icon: '🏯' },
  { name: 'Qutub Minar', lat: 28.5245, lon: 77.1855, type: 'minar', country: 'India', icon: '🗼' },
  { name: 'Lotus Temple', lat: 28.5535, lon: 77.2588, type: 'lotus', country: 'India', icon: '🪷' },
  { name: 'Gateway of India', lat: 18.9220, lon: 72.8347, type: 'arch', country: 'India', icon: '🏛️', color: '#e0c39a' },
  { name: 'Golden Temple', lat: 31.6200, lon: 74.8765, type: 'goldtemple', country: 'India', icon: '✨' },
  { name: 'Charminar', lat: 17.3616, lon: 78.4747, type: 'charminar', country: 'India', icon: '🕌' },
  { name: 'Meenakshi Temple', lat: 9.9195, lon: 78.1193, type: 'gopuram', country: 'India', icon: '🛕' },
  { name: 'Mysore Palace', lat: 12.3052, lon: 76.6552, type: 'palace', country: 'India', icon: '🏰' },
  { name: 'Ellora Caves', lat: 20.0268, lon: 75.1771, type: 'rockfacade', country: 'India', icon: '🛕', color: '#9c8a78' },
  { name: 'Statue of Unity', lat: 21.8380, lon: 73.7191, type: 'statue', country: 'India', icon: '🗿', color: '#8b8f86' },
  { name: 'Mount Everest', lat: 27.9881, lon: 86.9250, type: 'mountain', country: 'Nepal / China', icon: '🏔️', view: 40, top: true },
  // East & South-East Asia
  { name: 'Great Wall of China', lat: 40.4319, lon: 116.5704, type: 'wall', country: 'China', icon: '🧱', view: 4, top: true },
  { name: 'Forbidden City', lat: 39.9163, lon: 116.3972, type: 'pagoda', country: 'China', icon: '🏯' },
  { name: 'Mount Fuji', lat: 35.3606, lon: 138.7274, type: 'volcano', country: 'Japan', icon: '🗻', view: 30, top: true },
  { name: 'Tokyo Tower', lat: 35.6586, lon: 139.7454, type: 'eiffel', country: 'Japan', icon: '🗼', color: '#e8553e' },
  { name: 'Angkor Wat', lat: 13.4125, lon: 103.8670, type: 'angkor', country: 'Cambodia', icon: '🛕', top: true },
  { name: 'Shwedagon Pagoda', lat: 16.7983, lon: 96.1497, type: 'stupa', country: 'Myanmar', icon: '✨' },
  { name: 'Borobudur', lat: -7.6079, lon: 110.2038, type: 'stupa', country: 'Indonesia', icon: '🛕', color: '#8d8579' },
  { name: 'Petronas Towers', lat: 3.1579, lon: 101.7116, type: 'twin', country: 'Malaysia', icon: '🏙️' },
  { name: 'Marina Bay Sands', lat: 1.2834, lon: 103.8607, type: 'mbs', country: 'Singapore', icon: '🏙️' },
  // Oceania
  { name: 'Sydney Opera House', lat: -33.8568, lon: 151.2153, type: 'opera', country: 'Australia', icon: '🎭', top: true },
  { name: 'Uluru', lat: -25.3444, lon: 131.0369, type: 'mesa', country: 'Australia', icon: '🪨', color: '#c4602f', view: 10 },
  { name: 'Moai of Easter Island', lat: -27.1257, lon: -109.2766, type: 'moai', country: 'Chile', icon: '🗿' },
  // Americas
  { name: 'Statue of Liberty', lat: 40.6892, lon: -74.0445, type: 'liberty', country: 'USA', icon: '🗽', top: true },
  { name: 'Empire State Building', lat: 40.7484, lon: -73.9857, type: 'skyscraper', country: 'USA', icon: '🏙️' },
  { name: 'Golden Gate Bridge', lat: 37.8199, lon: -122.4783, type: 'bridge', country: 'USA', icon: '🌉', top: true },
  { name: 'Hollywood Sign', lat: 34.1341, lon: -118.3215, type: 'sign', country: 'USA', icon: '🎬' },
  { name: 'Space Needle', lat: 47.6205, lon: -122.3493, type: 'needle', country: 'USA', icon: '🗼' },
  { name: 'Grand Canyon', lat: 36.1069, lon: -112.1129, type: 'canyon', country: 'USA', icon: '🏜️', view: 14, top: true },
  { name: 'Mount Rushmore', lat: 43.8791, lon: -103.4591, type: 'mountain', country: 'USA', icon: '⛰️', view: 8 },
  { name: 'Niagara Falls', lat: 43.0962, lon: -79.0377, type: 'waterfall', country: 'Canada / USA', icon: '💦', view: 5 },
  { name: 'CN Tower', lat: 43.6426, lon: -79.3871, type: 'needle', country: 'Canada', icon: '🗼' },
  { name: 'Chichén Itzá', lat: 20.6843, lon: -88.5678, type: 'steppyramid', country: 'Mexico', icon: '🔺', top: true },
  { name: 'Christ the Redeemer', lat: -22.9519, lon: -43.2105, type: 'christ', country: 'Brazil', icon: '✝️', top: true },
  { name: 'Machu Picchu', lat: -13.1631, lon: -72.5450, type: 'terraces', country: 'Peru', icon: '⛰️', top: true },
];

// ---------- primitive helpers ----------
const mats = new Map();
function mat(color, extra = {}) {
  const k = color + JSON.stringify(extra);
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true, ...extra }));
  return mats.get(k);
}
function add(g, geo, color, x = 0, y = 0, z = 0, extra) {
  const m = new THREE.Mesh(geo, mat(color, extra));
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
const box = (g, w, h, d, c, x = 0, y = 0, z = 0) => add(g, new THREE.BoxGeometry(w, h, d), c, x, y + h / 2, z);
const cyl = (g, rt, rb, h, c, x = 0, y = 0, z = 0, seg = 12) => add(g, new THREE.CylinderGeometry(rt, rb, h, seg), c, x, y + h / 2, z);
const cone = (g, r, h, c, x = 0, y = 0, z = 0, seg = 12) => add(g, new THREE.ConeGeometry(r, h, seg), c, x, y + h / 2, z);
function dome(g, r, c, x = 0, y = 0, z = 0, squash = 1) {
  const m = add(g, new THREE.SphereGeometry(r, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), c, x, y, z);
  m.scale.y = squash;
  return m;
}
function onionDome(g, r, c, x, y, z) {
  const m = add(g, new THREE.SphereGeometry(r, 12, 10), c, x, y + r * 0.9, z);
  m.scale.y = 1.15;
  cone(g, r * 0.55, r * 1.3, c, x, y + r * 1.7, z, 10);
}
function minaret(g, r, h, c, x, z, cap = c) {
  cyl(g, r * 0.8, r, h, c, x, 0, z, 10);
  cyl(g, r * 1.4, r * 1.4, h * 0.04, c, x, h * 0.7, z, 10);
  dome(g, r * 1.1, cap, x, h, z);
}
function plinth(g, w, d, c = '#d8d2c4', h = 0.01) { box(g, w, h, d, c); return h; }

// ---------- builders ----------
const B = {
  eiffel(g, c = '#8a6f4e') {
    const legs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (const [sx, sz] of legs) {
      const leg = add(g, new THREE.CylinderGeometry(0.012, 0.03, 0.32, 4), c, sx * 0.07, 0.15, sz * 0.07);
      leg.rotation.z = -sx * 0.22; leg.rotation.x = sz * 0.22;
    }
    box(g, 0.2, 0.02, 0.2, c, 0, 0.1);
    box(g, 0.11, 0.015, 0.11, c, 0, 0.27);
    cyl(g, 0.012, 0.045, 0.36, c, 0, 0.27, 0, 4);
    cyl(g, 0.003, 0.012, 0.08, c, 0, 0.63, 0, 4);
  },
  liberty(g) {
    box(g, 0.16, 0.08, 0.16, '#c9b89a');
    box(g, 0.1, 0.07, 0.1, '#bfae90', 0, 0.08);
    cyl(g, 0.03, 0.045, 0.16, '#6fb59a', 0, 0.15);
    add(g, new THREE.SphereGeometry(0.022, 10, 8), '#6fb59a', 0, 0.33, 0);
    const arm = add(g, new THREE.CylinderGeometry(0.008, 0.008, 0.09, 6), '#6fb59a', 0.03, 0.36, 0);
    arm.rotation.z = -0.25;
    cone(g, 0.014, 0.03, '#ffcf4a', 0.045, 0.4, 0, 8);
    cone(g, 0.022, 0.012, '#6fb59a', 0, 0.35, 0, 7);
  },
  taj(g, c = '#f4f1ea') {
    plinth(g, 0.42, 0.42, '#e9e2d3', 0.02);
    box(g, 0.2, 0.12, 0.2, c, 0, 0.02);
    box(g, 0.08, 0.1, 0.205, '#e7e1d6', 0, 0.03);
    cyl(g, 0.06, 0.06, 0.03, c, 0, 0.14, 0, 16);
    onionDome(g, 0.075, c, 0, 0.16, 0);
    for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      dome(g, 0.03, c, x * 0.07, 0.14, z * 0.07);
      minaret(g, 0.012, 0.22, c, x * 0.18, z * 0.18);
    }
    box(g, 0.05, 0.004, 0.3, '#5aa9e6', 0, 0, 0.36);
  },
  wall(g) {
    const pts = [];
    for (let i = 0; i <= 24; i++) pts.push(new THREE.Vector3(-3 + i * 0.25, 0, Math.sin(i * 0.7) * 0.6 + Math.sin(i * 0.23) * 0.4));
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], len = a.distanceTo(b);
      const seg = box(g, len + 0.02, 0.06, 0.05, '#b9a68a', (a.x + b.x) / 2, 0.08 * Math.sin(i * 0.5) + 0.08, (a.z + b.z) / 2);
      seg.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
      if (i % 4 === 0) box(g, 0.09, 0.13, 0.09, '#a8957a', a.x, 0.08 * Math.sin(i * 0.5) + 0.06, a.z);
    }
    for (let i = 0; i < 18; i++) cone(g, 0.5, 0.25, '#7fb36a', -3 + i * 0.35, 0, (i % 2 ? 1 : -1) * 1.2, 6);
  },
  colosseum(g) {
    const outer = add(g, new THREE.CylinderGeometry(0.2, 0.2, 0.13, 28, 1, true), '#c9a77c', 0, 0.065, 0, { side: THREE.DoubleSide });
    outer.scale.z = 0.8;
    const inner = add(g, new THREE.CylinderGeometry(0.12, 0.12, 0.06, 24, 1, true), '#b8946a', 0, 0.03, 0, { side: THREE.DoubleSide });
    inner.scale.z = 0.75;
    const floor = add(g, new THREE.CircleGeometry(0.2, 28), '#d9c29c', 0, 0.002, 0);
    floor.rotation.x = -Math.PI / 2; floor.scale.y = 0.8;
  },
  pyramids(g) {
    const p = (s, x, z) => { const m = cone(g, s, s * 0.95, '#e3c27a', x, 0, z, 4); m.rotation.y = Math.PI / 4; };
    p(0.25, 0, 0); p(0.22, 0.42, 0.3); p(0.12, 0.7, 0.55);
    const sph = box(g, 0.06, 0.04, 0.14, '#d1ae69', -0.35, 0, 0.35);
    sph.rotation.y = 0.3;
    plinth(g, 2, 2, '#ecd49c', 0.004);
  },
  christ(g) {
    cone(g, 0.5, 0.35, '#5f9e55', 0, 0, 0, 8);
    box(g, 0.05, 0.05, 0.05, '#ddd6c8', 0, 0.35);
    box(g, 0.035, 0.16, 0.03, '#eeeae2', 0, 0.4);
    box(g, 0.2, 0.025, 0.025, '#eeeae2', 0, 0.52);
    add(g, new THREE.SphereGeometry(0.017, 8, 6), '#eeeae2', 0, 0.585, 0);
  },
  terraces(g) {
    for (let i = 0; i < 5; i++) box(g, 0.9 - i * 0.14, 0.04, 0.6 - i * 0.08, i % 2 ? '#7fb36a' : '#8fc277', 0, i * 0.04);
    for (let i = 0; i < 8; i++) box(g, 0.05, 0.035, 0.05, '#a39a8a', -0.25 + (i % 4) * 0.15, 0.2, i < 4 ? -0.08 : 0.08);
    cone(g, 0.35, 0.9, '#5e9a52', 0.2, 0, -0.6, 7);
  },
  steppyramid(g) {
    for (let i = 0; i < 6; i++) box(g, 0.36 - i * 0.055, 0.035, 0.36 - i * 0.055, i % 2 ? '#c8b48d' : '#bba67d', 0, i * 0.035);
    box(g, 0.07, 0.05, 0.07, '#a9946b', 0, 0.21);
    box(g, 0.05, 0.21, 0.02, '#b09c74', 0, 0, 0.17);
  },
  rockfacade(g, c = '#d38b67') {
    box(g, 0.6, 0.45, 0.3, c, 0, 0, -0.1);
    box(g, 0.24, 0.22, 0.04, '#e3a27d', 0, 0, 0.06);
    for (let i = 0; i < 4; i++) cyl(g, 0.012, 0.012, 0.14, '#efb38e', -0.09 + i * 0.06, 0, 0.09, 6);
    box(g, 0.14, 0.06, 0.03, '#efb38e', 0, 0.15, 0.08);
  },
  opera(g) {
    box(g, 0.34, 0.03, 0.2, '#d8c9b0');
    const shell = (s, x, rot) => {
      const m = add(g, new THREE.SphereGeometry(s, 10, 8, 0, Math.PI, 0, Math.PI / 2), '#fbfaf5', x, 0.03, 0);
      m.rotation.y = Math.PI / 2; m.rotation.x = rot; m.scale.set(0.6, 1.4, 1);
    };
    shell(0.08, -0.1, -0.3); shell(0.07, -0.02, -0.3); shell(0.06, 0.06, -0.3); shell(0.045, 0.12, -0.3);
  },
  burj(g) {
    const tiers = [[0.07, 0.25], [0.055, 0.25], [0.04, 0.22], [0.028, 0.18], [0.018, 0.14], [0.01, 0.12]];
    let y = 0;
    for (const [r, h] of tiers) { cyl(g, r * 0.9, r, h, '#aebccc', 0, y, 0, 3); y += h; }
    cyl(g, 0.001, 0.006, 0.2, '#c8d3de', 0, y, 0, 6);
  },
  clocktower(g) {
    box(g, 0.06, 0.32, 0.06, '#c9a86b');
    box(g, 0.075, 0.07, 0.075, '#d9bd84', 0, 0.32);
    for (const [x, z, r] of [[0, 0.038, 0], [0.038, 0, Math.PI / 2]]) {
      const f = add(g, new THREE.CircleGeometry(0.022, 16), '#fffbe8', x, 0.355, z, { side: THREE.DoubleSide });
      f.rotation.y = r;
    }
    const roof = cone(g, 0.05, 0.12, '#4d6b5a', 0, 0.39, 0, 4); roof.rotation.y = Math.PI / 4;
    box(g, 0.4, 0.08, 0.08, '#c9a86b', -0.22, 0, 0.0);
  },
  stones(g) {
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      box(g, 0.025, 0.07, 0.015, '#9a9a92', Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12).rotation.y = -a;
      if (i % 2 === 0) box(g, 0.05, 0.015, 0.02, '#8e8e86', Math.cos(a + 0.22) * 0.12, 0.07, Math.sin(a + 0.22) * 0.12).rotation.y = -a - Math.PI / 2;
    }
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 1.4 + 0.8;
      box(g, 0.03, 0.09, 0.02, '#8e8e86', Math.cos(a) * 0.05, 0, Math.sin(a) * 0.05).rotation.y = -a;
    }
  },
  pisa(g) {
    const t = new THREE.Group(); t.rotation.z = 0.09; g.add(t);
    for (let i = 0; i < 7; i++) cyl(t, 0.045, 0.045, 0.035, i % 2 ? '#f1ece0' : '#e3dccb', 0, i * 0.036, 0, 14);
    cyl(t, 0.035, 0.035, 0.03, '#efe8d8', 0, 0.252, 0, 14);
    box(g, 0.3, 0.06, 0.12, '#efe8d8', -0.25, 0, 0.1);
  },
  temple(g, c = '#e8dfcc') {
    box(g, 0.32, 0.025, 0.18, '#d8cfbb');
    for (let i = 0; i < 8; i++) for (const z of [-0.07, 0.07]) cyl(g, 0.009, 0.01, 0.1, c, -0.14 + i * 0.04, 0.025, z, 8);
    box(g, 0.31, 0.02, 0.17, c, 0, 0.125);
    const roof = add(g, new THREE.CylinderGeometry(0.06, 0.06, 0.31, 3), c, 0, 0.16, 0);
    roof.rotation.z = Math.PI / 2; roof.scale.set(1, 1, 0.5);
    cone(g, 0.6, 0.12, '#b6a88f', 0, -0.12, 0, 9);
  },
  angkor(g) {
    plinth(g, 0.8, 0.8, '#6fb2d9', 0.004);
    box(g, 0.6, 0.006, 0.6, '#8fbf72');
    for (let i = 0; i < 3; i++) box(g, 0.34 - i * 0.08, 0.04, 0.34 - i * 0.08, '#9b8f7c', 0, 0.006 + i * 0.04);
    const tower = (x, z, h) => { for (let i = 0; i < 5; i++) cyl(g, 0.03 - i * 0.005, 0.035 - i * 0.005, h / 5, '#8d816e', x, 0.126 + (i * h) / 5, z, 8); };
    tower(0, 0, 0.18);
    for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) tower(x * 0.1, z * 0.1, 0.12);
  },
  volcano(g) {
    cyl(g, 0.35, 5, 3, '#6c8a5a', 0, 0, 0, 14);
    cyl(g, 0.4, 1.6, 1.0, '#f7f9fb', 0, 2.0, 0, 14);
    cyl(g, 0.2, 0.4, 0.05, '#c9d3dc', 0, 3, 0, 14);
  },
  mountain(g, big = true) {
    const s = big ? 1 : 0.4;
    const peak = (r, h, x, z) => { cone(g, r * s, h * s, '#7a7f86', x * s, 0, z * s, 6); cone(g, r * 0.4 * s, h * 0.4 * s, '#f7f9fb', x * s, h * 0.6 * s, z * s, 6); };
    peak(3.5, 4.4, 0, 0); peak(2.5, 3.2, 3, 1.5); peak(2.2, 2.8, -2.6, 2); peak(2, 2.4, 1, -3);
  },
  bridge(g, c = '#d0503a') {
    box(g, 2.2, 0.025, 0.06, c, 0, 0.1);
    for (const x of [-0.6, 0.6]) { box(g, 0.025, 0.4, 0.025, c, x, 0, -0.03); box(g, 0.025, 0.4, 0.025, c, x, 0, 0.03); box(g, 0.03, 0.02, 0.08, c, x, 0.36); }
    const curve = (x0, x1) => {
      const pts = [];
      for (let i = 0; i <= 20; i++) { const t = i / 20, x = x0 + (x1 - x0) * t; pts.push(new THREE.Vector3(x, 0.12 + 0.28 * (2 * t - 1) ** 2, 0)); }
      for (const z of [-0.03, 0.03]) {
        const m = add(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.004, 4), c, 0, 0, z);
        m.position.y = 0;
      }
    };
    curve(-0.6, 0.6);
    box(g, 2.6, 0.002, 0.6, '#5aa9e6', 0, 0);
  },
  spires(g) {
    box(g, 0.24, 0.1, 0.14, '#c9b48a');
    const sp = [[-0.08, 0.32], [-0.03, 0.4], [0.03, 0.4], [0.08, 0.32], [0, 0.5]];
    for (const [x, h] of sp) { cyl(g, 0.014, 0.02, h * 0.7, '#cdb88f', x, 0.1, x === 0 ? 0 : 0.04, 8); cone(g, 0.016, h * 0.3, '#bea777', x, 0.1 + h * 0.7, x === 0 ? 0 : 0.04, 8); }
  },
  onion(g) {
    box(g, 0.2, 0.06, 0.2, '#b5462f');
    cyl(g, 0.035, 0.035, 0.16, '#c9583e', 0, 0.06, 0, 8);
    onionDome(g, 0.04, '#e9c547', 0, 0.22, 0);
    const cols = ['#3b8fd0', '#2fa65a', '#e2533a', '#e9c547'];
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([x, z], i) => {
      cyl(g, 0.022, 0.022, 0.1, '#d06a4c', x * 0.065, 0.06, z * 0.065, 8);
      onionDome(g, 0.03, cols[i], x * 0.065, 0.16, z * 0.065);
    });
  },
  moai(g) {
    for (let i = 0; i < 7; i++) {
      const x = -0.18 + i * 0.06;
      box(g, 0.035, 0.07, 0.03, '#6f665d', x, 0.02);
      box(g, 0.04, 0.03, 0.04, '#7a7067', x, 0.09, 0.005);
    }
    box(g, 0.48, 0.02, 0.07, '#8a8178');
  },
  pagoda(g) {
    plinth(g, 0.5, 0.5, '#d9cba8', 0.02);
    box(g, 0.24, 0.06, 0.14, '#b23a2c', 0, 0.02);
    const r = cone(g, 0.2, 0.06, '#e3b13e', 0, 0.08, 0, 4); r.rotation.y = Math.PI / 4; r.scale.z = 0.6;
    box(g, 0.16, 0.04, 0.09, '#b23a2c', 0, 0.12);
    const r2 = cone(g, 0.14, 0.05, '#e3b13e', 0, 0.16, 0, 4); r2.rotation.y = Math.PI / 4; r2.scale.z = 0.6;
  },
  gate(g, c = '#d8c7a2') {
    box(g, 0.05, 0.18, 0.05, c, -0.07);
    box(g, 0.05, 0.18, 0.05, c, 0.07);
    box(g, 0.2, 0.05, 0.06, c, 0, 0.18);
    box(g, 0.12, 0.03, 0.05, c, 0, 0.23);
  },
  arch(g, c = '#d8c7a2') {
    box(g, 0.06, 0.2, 0.08, c, -0.07);
    box(g, 0.06, 0.2, 0.08, c, 0.07);
    box(g, 0.2, 0.07, 0.08, c, 0, 0.2);
    for (const x of [-0.07, 0.07]) dome(g, 0.025, c, x, 0.27, 0);
  },
  fort(g, c = '#b9573f') {
    for (const [w, d, x, z] of [[0.5, 0.04, 0, 0.2], [0.5, 0.04, 0, -0.2], [0.04, 0.4, 0.25, 0], [0.04, 0.4, -0.25, 0]]) box(g, w, 0.08, d, c, x, 0, z);
    for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { cyl(g, 0.035, 0.04, 0.11, c, x * 0.25, 0, z * 0.2, 10); dome(g, 0.035, '#f1ebdd', x * 0.25, 0.11, z * 0.2); }
    box(g, 0.12, 0.12, 0.06, c, 0, 0, 0.2);
    dome(g, 0.03, '#f1ebdd', 0, 0.12, 0.2);
    box(g, 0.2, 0.05, 0.12, '#efe6d2', 0, 0, -0.03);
  },
  minar(g) {
    for (let i = 0; i < 5; i++) {
      cyl(g, 0.026 - i * 0.003, 0.03 - i * 0.003, 0.08, i % 2 ? '#b8664a' : '#c97a5a', 0, i * 0.084, 0, 12);
      cyl(g, 0.036 - i * 0.003, 0.036 - i * 0.003, 0.004, '#e0d2b8', 0, i * 0.084 + 0.08, 0, 12);
    }
  },
  lotus(g) {
    for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + ring * 0.35;
      const p = add(g, new THREE.SphereGeometry(0.05 - ring * 0.012, 8, 6), '#f3f0ea', Math.cos(a) * (0.07 - ring * 0.03), 0.05 + ring * 0.03, Math.sin(a) * (0.07 - ring * 0.03));
      p.scale.set(0.4, 1.4, 0.7); p.rotation.y = -a; p.rotation.z = 0.35 - ring * 0.2;
    }
    box(g, 0.5, 0.003, 0.5, '#7fc4e8');
  },
  goldtemple(g) {
    box(g, 0.5, 0.004, 0.5, '#6db7e3');
    box(g, 0.11, 0.07, 0.11, '#e8b93a', 0, 0.004);
    dome(g, 0.045, '#f0c84a', 0, 0.075, 0);
    cone(g, 0.01, 0.04, '#f0c84a', 0, 0.115, 0, 8);
    box(g, 0.03, 0.01, 0.2, '#efe6d2', 0, 0.004, 0.15);
    for (const [w, d, x, z] of [[0.62, 0.05, 0, 0.3], [0.62, 0.05, 0, -0.3], [0.05, 0.62, 0.3, 0], [0.05, 0.62, -0.3, 0]]) box(g, w, 0.05, d, '#f3eee3', x, 0, z);
  },
  charminar(g) {
    box(g, 0.14, 0.12, 0.14, '#d9c8a6');
    box(g, 0.12, 0.04, 0.12, '#cdbb97', 0, 0.12);
    for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) minaret(g, 0.012, 0.25, '#e2d3b3', x * 0.07, z * 0.07);
  },
  gopuram(g) {
    const cols = ['#e86a4a', '#f2c14e', '#4aa3d9', '#5bbf72', '#e86a4a', '#f2c14e'];
    for (let i = 0; i < 6; i++) box(g, 0.18 - i * 0.022, 0.05, 0.1 - i * 0.01, cols[i], 0, i * 0.05);
    box(g, 0.05, 0.03, 0.03, '#f2c14e', 0, 0.3);
  },
  palace(g) {
    box(g, 0.36, 0.1, 0.16, '#f0d9a8');
    cyl(g, 0.04, 0.04, 0.06, '#f0d9a8', 0, 0.1, 0, 12);
    onionDome(g, 0.045, '#d24d3e', 0, 0.16, 0);
    for (const x of [-0.16, 0.16]) { cyl(g, 0.02, 0.02, 0.15, '#f0d9a8', x, 0, 0.06, 10); dome(g, 0.022, '#d24d3e', x, 0.15, 0.06); }
  },
  statue(g, c = '#8b8f86') {
    box(g, 0.08, 0.04, 0.08, '#b9b1a1');
    box(g, 0.05, 0.22, 0.04, c, 0, 0.04);
    box(g, 0.08, 0.06, 0.045, c, 0, 0.2);
    add(g, new THREE.SphereGeometry(0.02, 8, 6), c, 0, 0.29, 0);
  },
  mosque(g, c = '#f2efe8') {
    box(g, 0.24, 0.08, 0.24, c);
    cyl(g, 0.08, 0.08, 0.03, c, 0, 0.08, 0, 16);
    dome(g, 0.085, c, 0, 0.11, 0, 0.9);
    for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { dome(g, 0.035, c, x * 0.08, 0.08, z * 0.08); minaret(g, 0.011, 0.24, c, x * 0.15, z * 0.15); }
  },
  sail(g) {
    const s = add(g, new THREE.SphereGeometry(0.12, 12, 10, 0, Math.PI, 0, Math.PI), '#f4f6f8', 0, 0.2, 0);
    s.scale.set(0.3, 1.7, 1);
    box(g, 0.02, 0.4, 0.02, '#c9d3de', 0, 0, -0.11);
    cyl(g, 0.15, 0.15, 0.01, '#e4d4b0', 0, 0, 0, 16);
  },
  needle(g) {
    cyl(g, 0.012, 0.03, 0.45, '#cfd6de', 0, 0, 0, 8);
    cyl(g, 0.05, 0.035, 0.03, '#e6eaef', 0, 0.42, 0, 14);
    cyl(g, 0.002, 0.008, 0.15, '#cfd6de', 0, 0.45, 0, 6);
  },
  skyscraper(g) {
    box(g, 0.1, 0.22, 0.07, '#b8b3a6');
    box(g, 0.07, 0.1, 0.05, '#bdb8ab', 0, 0.22);
    box(g, 0.04, 0.06, 0.035, '#c4bfb2', 0, 0.32);
    cyl(g, 0.002, 0.01, 0.07, '#c4bfb2', 0, 0.38, 0, 6);
    for (let i = 0; i < 6; i++) box(g, 0.07, 0.06 + (i % 3) * 0.04, 0.06, '#9aa2ad', -0.2 + (i % 3) * 0.2, 0, i < 3 ? 0.18 : -0.18);
  },
  waterfall(g) {
    box(g, 1.6, 0.25, 0.5, '#7b8b6a', 0, 0, -0.5);
    box(g, 1.2, 0.24, 0.02, '#bfe6fb', 0, 0, -0.24);
    box(g, 2, 0.004, 1.2, '#4b9fd6', 0, 0, 0.3);
    add(g, new THREE.SphereGeometry(0.12, 8, 6), '#ffffff', 0, 0.03, -0.15, { transparent: true, opacity: 0.6 }).scale.set(4, 0.6, 1);
  },
  canyon(g) {
    for (let i = 0; i < 9; i++) {
      const x = -4 + i * 1;
      box(g, 0.9, 0.6 + (i % 3) * 0.2, 2.2, i % 2 ? '#c86b3c' : '#d8834f', x, 0, -1.8);
      box(g, 0.9, 0.5 + ((i + 1) % 3) * 0.2, 2.2, i % 2 ? '#d8834f' : '#c86b3c', x, 0, 1.8);
    }
    box(g, 9, 0.004, 0.2, '#4b9fd6', 0, 0, 0);
  },
  mesa(g, c = '#8a7b62') {
    const m = cyl(g, 1.2, 1.5, 0.5, c, 0, 0, 0, 9);
    m.scale.z = 0.55;
  },
  glasspyramid(g) {
    const p = cone(g, 0.1, 0.1, '#9fd3f0', 0, 0, 0, 4); p.rotation.y = Math.PI / 4;
    p.material = mat('#9fd3f0', { transparent: true, opacity: 0.75, metalness: 0.2, roughness: 0.2 });
    for (const [w, d, x, z] of [[0.5, 0.08, 0, -0.2], [0.08, 0.4, -0.25, 0], [0.08, 0.4, 0.25, 0]]) box(g, w, 0.08, d, '#d8c7a2', x, 0, z);
  },
  castle(g) {
    cone(g, 0.3, 0.12, '#7fa86a', 0, 0, 0, 8);
    box(g, 0.14, 0.12, 0.08, '#efe9de', 0, 0.12);
    for (const [x, z, h] of [[-0.07, 0.04, 0.2], [0.07, 0.04, 0.16], [0, -0.04, 0.26]]) { cyl(g, 0.02, 0.02, h, '#efe9de', x, 0.12, z, 10); cone(g, 0.026, 0.06, '#4a6fa8', x, 0.12 + h, z, 10); }
  },
  twin(g) {
    for (const x of [-0.05, 0.05]) {
      for (let i = 0; i < 5; i++) cyl(g, 0.03 - i * 0.004, 0.032 - i * 0.004, 0.09, '#c7ced6', x, i * 0.09, 0, 8);
      cyl(g, 0.001, 0.006, 0.1, '#c7ced6', x, 0.45, 0, 6);
    }
    box(g, 0.06, 0.008, 0.01, '#9aa4ae', 0, 0.2);
  },
  mbs(g) {
    for (const x of [-0.1, 0, 0.1]) box(g, 0.045, 0.22, 0.05, '#d6dbe0', x);
    const top = box(g, 0.34, 0.015, 0.06, '#c3cad1', 0.02, 0.22);
    top.position.y = 0.228;
    box(g, 0.6, 0.004, 0.4, '#4b9fd6', 0, 0, 0.3);
  },
  stupa(g, c = '#e8b93a') {
    for (let i = 0; i < 3; i++) box(g, 0.26 - i * 0.06, 0.025, 0.26 - i * 0.06, c, 0, i * 0.025);
    dome(g, 0.07, c, 0, 0.075, 0, 1.1);
    cone(g, 0.03, 0.15, c, 0, 0.14, 0, 10);
  },
  sign(g) {
    cone(g, 0.6, 0.25, '#9a9a6a', 0, 0, -0.1, 7);
    for (let i = 0; i < 9; i++) box(g, 0.035, 0.05, 0.006, '#ffffff', -0.2 + i * 0.05, 0.12, 0.25);
  },
  lighthouse(g) {
    cone(g, 0.12, 0.06, '#8d8a7e', 0, 0, 0, 8);
    for (let i = 0; i < 4; i++) cyl(g, 0.026 - i * 0.003, 0.03 - i * 0.003, 0.05, i % 2 ? '#d64533' : '#ffffff', 0, 0.05 + i * 0.05, 0, 12);
    cyl(g, 0.022, 0.022, 0.03, '#ffe27a', 0, 0.25, 0, 12);
    cone(g, 0.028, 0.035, '#2b2b2b', 0, 0.28, 0, 12);
  },
  lake(g) {
    const m = add(g, new THREE.CircleGeometry(0.9, 24), '#3f9fd6', 0, 0.003, 0);
    m.rotation.x = -Math.PI / 2; m.scale.y = 0.6;
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; cone(g, 0.06, 0.14, '#3f7d3a', Math.cos(a) * 1.0, 0, Math.sin(a) * 0.65, 6); }
  },
  trees(g) {
    for (let i = 0; i < 40; i++) {
      const a = i * 2.39996, r = 0.06 * Math.sqrt(i) * 1.6;
      cyl(g, 0.006, 0.008, 0.03, '#7a5a3a', Math.cos(a) * r, 0, Math.sin(a) * r, 5);
      cone(g, 0.045, 0.11, i % 3 ? '#3f7d3a' : '#4f9447', Math.cos(a) * r, 0.03, Math.sin(a) * r, 6);
    }
  },
  plaza(g) {
    box(g, 0.4, 0.006, 0.4, '#e2d6bf');
    cyl(g, 0.05, 0.06, 0.02, '#cfc2a8', 0, 0.006, 0, 16);
    cyl(g, 0.04, 0.04, 0.005, '#6fc0ea', 0, 0.026, 0, 16);
    box(g, 0.012, 0.2, 0.012, '#cfc2a8', 0.15, 0, 0.15);
  },
  ferris(g) {
    const w = add(g, new THREE.TorusGeometry(0.12, 0.006, 6, 24), '#e2533a', 0, 0.15, 0);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; box(g, 0.02, 0.02, 0.02, ['#f6c445', '#3b8fd0', '#2fa65a'][i % 3], Math.cos(a) * 0.12, 0.14 + Math.sin(a) * 0.12, 0); }
    for (const x of [-0.05, 0.05]) { const l = box(g, 0.008, 0.17, 0.008, '#8a8a8a', x, 0); l.rotation.z = x > 0 ? 0.3 : -0.3; }
    void w;
  },
  obelisk(g, c = '#e3d6bd') {
    box(g, 0.08, 0.02, 0.08, '#cfc2a8');
    cyl(g, 0.012, 0.022, 0.24, c, 0, 0.02, 0, 4);
    cone(g, 0.013, 0.025, c, 0, 0.26, 0, 4);
  },
};

// Model for a Wikidata place category.
const CAT = {
  heritage: 'temple', tower: 'needle', skyscraper: 'skyscraper', bridge: 'bridge', statue: 'statue',
  monument: 'obelisk', arch: 'arch', castle: 'castle', palace: 'palace', fort: 'fort', church: 'spires',
  mosque: 'mosque', temple: 'stupa', pagoda: 'pagoda', shrine: 'pagoda', mausoleum: 'mosque', museum: 'temple',
  stadium: 'colosseum', opera: 'opera', lighthouse: 'lighthouse', archaeological: 'stones', pyramid: 'pyramids',
  mountain: 'mountain', volcano: 'volcano', waterfall: 'waterfall', canyon: 'canyon', lake: 'lake', park: 'trees',
  square: 'plaza', themepark: 'ferris', zoo: 'trees',
};
const SOUTH_ASIA = new Set(['India', 'Nepal', 'Sri Lanka', 'Bangladesh']);
export const CAT_LABEL = {
  heritage: 'World Heritage Site', tower: 'Tower', skyscraper: 'Skyscraper', bridge: 'Bridge', statue: 'Statue',
  monument: 'Monument', arch: 'Arch', castle: 'Castle', palace: 'Palace', fort: 'Fort', church: 'Church',
  mosque: 'Mosque', temple: 'Temple', pagoda: 'Pagoda', shrine: 'Shrine', mausoleum: 'Mausoleum', museum: 'Museum',
  stadium: 'Stadium', opera: 'Opera house', lighthouse: 'Lighthouse', archaeological: 'Ancient site', pyramid: 'Pyramid',
  mountain: 'Mountain', volcano: 'Volcano', waterfall: 'Waterfall', canyon: 'Canyon', lake: 'Lake', park: 'National park',
  square: 'Square', themepark: 'Theme park', zoo: 'Zoo',
};
const NATURE = new Set(['mountain', 'volcano', 'canyon', 'lake', 'park', 'waterfall']);
export function typeForPlace(p) {
  if (p.c === 'temple' && SOUTH_ASIA.has(p.k)) return 'gopuram';
  return CAT[p.c] || 'temple';
}
// Model scale and the altitude (km) to visit at, per category.
export function placeScale(p) {
  if (p.c === 'mountain' || p.c === 'volcano') return 0.45;
  if (p.c === 'canyon') return 0.6;
  if (p.c === 'bridge') return 0.6;
  return 1;
}
export function placeViewKm(p) {
  if (p.c === 'mountain' || p.c === 'volcano') return 18;
  if (NATURE.has(p.c)) return 7;
  return 1.6;
}


// ---------- extra detail on the shapes most places use ----------
const base = { ...B };
const winRow = (g, n, w, y, z, c = '#5b6b7a', ww = 0.012, wh = 0.016) => {
  for (let i = 0; i < n; i++) box(g, ww, wh, 0.003, c, (i - (n - 1) / 2) * (w / n), y, z);
};
const flag = (g, x, y, z, c = '#f7931e') => { cyl(g, 0.0015, 0.0015, 0.05, '#777', x, y, z, 4); box(g, 0.018, 0.011, 0.001, c, x + 0.009, y + 0.038, z); };
const steps = (g, w, z, n = 3, c = '#d8cfbb') => { for (let i = 0; i < n; i++) box(g, w, 0.006, 0.012, c, 0, i * 0.006, z + (n - i) * 0.008); };
Object.assign(B, {
  temple(g, c) {
    base.temple(g, c); steps(g, 0.2, 0.08, 4);
    box(g, 0.03, 0.05, 0.003, '#6b4a2a', 0, 0.025, 0.06);
    for (const x of [-0.11, 0.11]) add(g, new THREE.SphereGeometry(0.012, 6, 5), '#b9a988', x, 0.2, 0);
  },
  palace(g, c) {
    base.palace(g, c);
    winRow(g, 7, 0.32, 0.02, 0.081, '#7a5a3a'); winRow(g, 7, 0.32, 0.06, 0.081, '#7a5a3a');
    box(g, 0.03, 0.045, 0.004, '#8a3a2a', 0, 0, 0.082); flag(g, 0, 0.26, 0);
    steps(g, 0.1, 0.08);
  },
  castle(g, c) {
    base.castle(g, c);
    for (const [x, z] of [[-0.07, 0.04], [0.07, 0.04]]) flag(g, x, 0.38, z, '#d64533');
    winRow(g, 3, 0.12, 0.17, 0.041, '#3b4a5a', 0.01, 0.014);
    box(g, 0.026, 0.04, 0.004, '#5a3a22', 0, 0.12, 0.041);
    for (let i = 0; i < 7; i++) box(g, 0.012, 0.01, 0.01, '#efe9de', -0.06 + i * 0.02, 0.24, 0.04);
  },
  spires(g, c) {
    base.spires(g, c);
    add(g, new THREE.CircleGeometry(0.022, 16), '#5aa0d8', 0, 0.065, 0.0705);
    box(g, 0.03, 0.05, 0.003, '#6b4a2a', 0, 0, 0.0705);
    winRow(g, 4, 0.2, 0.04, 0.0705, '#8fc3e8', 0.01, 0.03);
  },
  mosque(g, c) {
    base.mosque(g, c);
    const arch = add(g, new THREE.CircleGeometry(0.022, 16, 0, Math.PI), '#3a5a7a', 0, 0.045, 0.1205); void arch;
    box(g, 0.044, 0.045, 0.003, '#3a5a7a', 0, 0, 0.1205);
    winRow(g, 4, 0.2, 0.05, 0.1205, '#3a5a7a', 0.012, 0.02);
    cone(g, 0.006, 0.02, '#e9c547', 0, 0.2, 0, 6);
    box(g, 0.3, 0.003, 0.08, '#cfe3ee', 0, 0, 0.19);
  },
  fort(g, c) {
    base.fort(g, c);
    for (let i = 0; i < 12; i++) for (const z of [0.2, -0.2]) box(g, 0.02, 0.014, 0.045, c || '#b9573f', -0.22 + i * 0.04, 0.08, z);
    flag(g, 0, 0.15, 0.2, '#ff9933');
    box(g, 0.04, 0.06, 0.004, '#5a3a22', 0, 0, 0.231);
  },
  skyscraper(g, c) {
    base.skyscraper(g, c);
    for (let y = 0.02; y < 0.21; y += 0.025) winRow(g, 5, 0.09, y, 0.0355, '#7fb2d6', 0.012, 0.012);
    for (let y = 0.235; y < 0.31; y += 0.025) winRow(g, 3, 0.06, y, 0.0255, '#7fb2d6', 0.012, 0.012);
  },
  stupa(g, c) {
    base.stupa(g, c);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; cone(g, 0.008, 0.025, c || '#e8b93a', Math.cos(a) * 0.1, 0.05, Math.sin(a) * 0.1, 6); }
    steps(g, 0.06, 0.13, 4, c || '#e8b93a');
  },
  stones(g, c) {
    base.stones(g, c);
    add(g, new THREE.CircleGeometry(0.17, 24), '#9cc27a', 0, 0.002, 0).rotation.x = -Math.PI / 2;
  },
  colosseum(g, c) {
    base.colosseum(g, c);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      for (const y of [0.025, 0.07]) { const w = box(g, 0.014, 0.022, 0.004, '#8a6a48', Math.cos(a) * 0.201, y, Math.sin(a) * 0.161); w.rotation.y = -a + Math.PI / 2; }
    }
  },
  gopuram(g, c) {
    base.gopuram(g, c);
    for (let i = 0; i < 6; i++) for (let k = -2; k <= 2; k++) box(g, 0.008, 0.01, 0.006, ['#ffffff', '#2b2b2b', '#e9c547'][(i + k + 6) % 3], k * (0.03 - i * 0.004), i * 0.05 + 0.02, 0.05 - i * 0.005);
    box(g, 0.035, 0.04, 0.004, '#3a2a1a', 0, 0, 0.051);
  },
});

// place: the PLACES entry. Hand-picked landmarks get their true-to-life model by name; every other place
// gets a generated model in its region's style (placegen.js). Everything is merged into a few meshes.
export function buildModel(type, color, place, opts = {}) {
  let g = new THREE.Group();
  const real = place && place.cur && (REAL[place.n] || REAL2[place.n] || REAL3[place.n]);
  if (real) { real(g, color); g.userData.noPad = true; }
  else if (place && !place.cur) g = buildPlace(place, opts);
  else (WONDERS[type] || B[type] || B.temple)(g, color);
  return bake(g, opts);
}

// Altitude (km) to fly to when visiting.
export const visitAltKm = (lm) => lm.view || 1.6;
export const buildLandmark = (lm) => buildModel(lm.type, lm.color, { ...lm, n: lm.name, cur: true });
