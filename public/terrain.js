// Natural mountain terrain: a round patch of ground raised by domain-warped noise into ridges, spurs and valleys,
// smoothly shaded and coloured by height and steepness (meadow → forest → rock → scree → snow).
// Unit size: radius 1, highest point 1, rim at y = 0 so it blends into the ground around it.
// Shared by the mountain ranges on the globe and every mountain / volcano / hill model.
import * as THREE from 'three';

function hash(x, y, s) { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(s, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}
const fbm = (x, y, s, oct = 4) => { let f = 0, a = 0.5, fr = 1; for (let o = 0; o < oct; o++) { f += vnoise(x * fr, y * fr, s + o) * a; a *= 0.5; fr *= 2.03; } return f; };
function ridged(x, y, s) { let f = 0, amp = 0.5, fr = 1, w = 1; for (let o = 0; o < 5; o++) { let n = 1 - Math.abs(vnoise(x * fr, y * fr, s + o)); n *= n * w; w = Math.min(1, n * 1.8); f += n * amp; amp *= 0.5; fr *= 2.07; } return f; }
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const C = {
  meadow: new THREE.Color('#6fae4f'), meadow2: new THREE.Color('#7ab757'), forest: new THREE.Color('#4c8240'), forest2: new THREE.Color('#3f7238'),
  rock: new THREE.Color('#8d8476'), rock2: new THREE.Color('#77706a'), scree: new THREE.Color('#a59c8e'), snow: new THREE.Color('#f4f7fa'),
  lava: new THREE.Color('#5a4c45'), ash: new THREE.Color('#857a72'),
};
const cache = new Map();
// opts: seed, snow (0..1 of the height under snow), volcano, hill (soft rolling green hill), peaks, grid
export function mountainGeometry({ seed = 1, snow = 0, volcano = false, hill = false, grid = 56, peaks = 1 } = {}) {
  const key = `${seed % 16}|${Math.round(snow * 10)}|${volcano}|${hill}|${grid}|${peaks}`;
  if (cache.has(key)) return cache.get(key);
  const geo = new THREE.PlaneGeometry(2, 2, grid, grid).rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, n = pos.count;
  const ox = hash(seed, 1, 9) * 50, oz = hash(seed, 2, 9) * 50;
  // a main summit off-centre plus secondary peaks, joined by ridges, so each massif has its own silhouette
  const main = [(hash(seed, 3, 9) - 0.5) * 0.3, (hash(seed, 4, 9) - 0.5) * 0.3];
  const sub = Array.from({ length: Math.max(0, peaks - 1) }, (_, i) => { const a = hash(seed, i, 3) * Math.PI * 2, d = 0.3 + hash(seed, i, 4) * 0.3; return [Math.cos(a) * d, Math.sin(a) * d, 0.42 + hash(seed, i, 5) * 0.35]; });
  const H = new Float32Array(n);
  let maxH = 0;
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    // domain warp: bends the ridges so nothing looks lined up or repeated
    const wx = x + fbm(x * 1.3 + ox, z * 1.3, seed + 20) * 0.22, wz = z + fbm(x * 1.3, z * 1.3 + oz, seed + 30) * 0.22;
    const r = Math.hypot(x, z), edge = 1 - smooth(0.62, 0.98, r);  // gentle foothills fading into flat ground
    let h;
    if (volcano) {
      const d = Math.hypot(wx, wz), cone = Math.pow(Math.max(0, 1 - d), 1.35);
      h = cone * (0.92 + 0.1 * fbm(wx * 4, wz * 4, seed)) - (d < 0.12 ? (0.12 - d) * 1.8 : 0) + 0.04 * ridged(wx * 3 + ox, wz * 3 + oz, seed);
    } else if (hill) {
      h = Math.pow(Math.max(0, 1 - r * r), 1.4) * (0.75 + 0.25 * fbm(wx * 2 + ox, wz * 2 + oz, seed, 3));
    } else {
      const dm = Math.hypot(wx - main[0], wz - main[1]);
      let base = Math.pow(Math.max(0, 1 - dm / 0.95), 1.5);
      for (const [px, pz, ph] of sub) base = Math.max(base, ph * Math.pow(Math.max(0, 1 - Math.hypot(wx - px, wz - pz) / 0.6), 1.6));
      const rid = ridged(wx * 2.1 + ox, wz * 2.1 + oz, seed);
      h = base * (0.45 + 0.75 * rid) + 0.06 * fbm(wx * 6, wz * 6, seed + 40) * base;
    }
    H[i] = Math.max(0, h * edge); maxH = Math.max(maxH, H[i]);
  }
  for (let i = 0; i < n; i++) pos.setY(i, H[i] / (maxH || 1));
  geo.computeVertexNormals();
  // colour each vertex from its height and steepness, blended softly
  const nrm = geo.attributes.normal, cols = new Float32Array(n * 3), c = new THREE.Color(), t = new THREE.Color();
  const snowLine = 1 - snow;
  for (let i = 0; i < n; i++) {
    const y = pos.getY(i), steep = 1 - nrm.getY(i), x = pos.getX(i), z = pos.getZ(i);
    const v = fbm(x * 5 + ox, z * 5 + oz, seed + 50) * 0.5 + 0.5; // patchy variation
    if (volcano) { c.copy(C.lava).lerp(C.ash, smooth(0.45, 0.9, y)).lerp(C.rock2, v * 0.25); c.lerp(C.meadow, 1 - smooth(0.04, 0.16, y)); }
    else if (hill) { c.copy(C.meadow).lerp(C.meadow2, v).lerp(C.forest, smooth(0.35, 0.65, v) * 0.6); }
    else {
      c.copy(C.meadow).lerp(C.meadow2, v);                                               // valleys
      c.lerp(t.copy(C.forest).lerp(C.forest2, v), smooth(0.08, 0.2, y) * (1 - smooth(0.45, 0.6, y)) * (1 - smooth(0.45, 0.7, steep)));
      c.lerp(t.copy(C.rock).lerp(C.rock2, v), Math.max(smooth(0.42, 0.62, y), smooth(0.4, 0.62, steep)));  // bare rock up high and on cliffs
      c.lerp(C.scree, smooth(0.5, 0.7, y) * (1 - smooth(0.3, 0.6, steep)) * 0.35);
      if (snow > 0) c.lerp(C.snow, smooth(snowLine - 0.06, snowLine + 0.06, y + (v - 0.5) * 0.12) * (1 - smooth(0.5, 0.78, steep)));
    }
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  geo.deleteAttribute('uv');
  cache.set(key, geo);
  return geo;
}
export const terrainMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
