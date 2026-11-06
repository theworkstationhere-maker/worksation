// Low-poly 3D mountain terrain: ridged noise on a round patch, coloured by height and slope
// (meadow → forest → bare rock → snow). Unit size: radius 1, peak height 1, base at y = 0.
// Shared by the mountain ranges on the globe and every mountain / volcano model.
import * as THREE from 'three';

function hash(x, y, s) { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(s, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}
function ridged(x, y, s) { let f = 0, amp = 0.5, fr = 1, w = 1; for (let o = 0; o < 4; o++) { let n = 1 - Math.abs(vnoise(x * fr, y * fr, s + o)); n *= n * w; w = Math.min(1, n * 2); f += n * amp; amp *= 0.5; fr *= 2.1; } return f; }

const C = {
  meadow: new THREE.Color('#7fb35a'), forest: new THREE.Color('#4f8a3f'), rock: new THREE.Color('#8a8070'),
  rockDark: new THREE.Color('#6e675c'), snow: new THREE.Color('#f5f8fb'), lava: new THREE.Color('#5a4a42'), ash: new THREE.Color('#7a6e66'),
};
const cache = new Map();
// opts: seed, snow (0..1 share of the height under snow), volcano, grid
export function mountainGeometry({ seed = 1, snow = 0, volcano = false, grid = 44, peaks = 1 } = {}) {
  const key = `${seed % 12}|${Math.round(snow * 10)}|${volcano}|${grid}|${peaks}`;
  if (cache.has(key)) return cache.get(key);
  const geo = new THREE.PlaneGeometry(2, 2, grid, grid).rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, n = pos.count;
  const ox = hash(seed, 1, 9) * 50, oz = hash(seed, 2, 9) * 50;
  // secondary peaks so it reads as a massif, not a single cone
  const sub = Array.from({ length: peaks - 1 }, (_, i) => { const a = hash(seed, i, 3) * Math.PI * 2, d = 0.35 + hash(seed, i, 4) * 0.25; return [Math.cos(a) * d, Math.sin(a) * d, 0.45 + hash(seed, i, 5) * 0.3]; });
  let maxH = 0;
  const H = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z);
    let h;
    if (volcano) {
      const cone = Math.max(0, 1 - r) ** 1.25, crater = r < 0.13 ? (0.13 - r) * 2.2 : 0;
      h = cone * (0.9 + 0.12 * ridged(x * 3 + ox, z * 3 + oz, seed)) - crater;
    } else {
      const fall = Math.max(0, 1 - r * r) ** 1.6;
      let base = fall * (0.55 + 0.75 * ridged(x * 1.8 + ox, z * 1.8 + oz, seed));
      for (const [px, pz, ph] of sub) { const d = Math.hypot(x - px, z - pz); base = Math.max(base, ph * Math.max(0, 1 - d / 0.55) ** 1.8 * (0.8 + 0.4 * ridged(x * 2.5 + ox, z * 2.5 + oz, seed + 5))); }
      h = base;
    }
    if (r >= 0.98) h = 0; // flush with the ground at the rim
    H[i] = Math.max(0, h); maxH = Math.max(maxH, H[i]);
  }
  for (let i = 0; i < n; i++) pos.setY(i, H[i] / (maxH || 1));
  // flat-shaded low poly: one colour per triangle, from its height and steepness
  const g = geo.toNonIndexed(); geo.dispose();
  const p = g.attributes.position, cols = new Float32Array(p.count * 3), c = new THREE.Color();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3(), nrm = new THREE.Vector3();
  const snowLine = 1 - snow;
  for (let t = 0; t < p.count; t += 3) {
    a.fromBufferAttribute(p, t); b.fromBufferAttribute(p, t + 1); d.fromBufferAttribute(p, t + 2);
    const y = (a.y + b.y + d.y) / 3;
    nrm.subVectors(b, a).cross(d.clone().sub(a)).normalize();
    const steep = 1 - Math.abs(nrm.y), jit = hash(t, seed, 7) * 0.08;
    if (volcano) c.copy(y > 0.75 ? C.ash : C.lava).lerp(C.rockDark, jit * 3);
    else if (snow > 0 && y > snowLine - jit * 0.6 && steep < 0.75) c.copy(C.snow);
    else if (y < 0.18 + jit) c.copy(C.meadow).lerp(C.forest, jit * 6);
    else if (y < 0.42 + jit && steep < 0.55) c.copy(C.forest).lerp(C.meadow, jit * 4);
    else c.copy(steep > 0.6 ? C.rockDark : C.rock).lerp(C.rockDark, jit * 3);
    for (let k = 0; k < 3; k++) cols.set([c.r, c.g, c.b], (t + k) * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  g.deleteAttribute('uv');
  g.computeVertexNormals();
  cache.set(key, g);
  return g;
}
export const terrainMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true });
