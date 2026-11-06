// Game-like 3D nature for the close-up map: trees, bushes, flower patches, rocks (and cacti in deserts,
// pines in the north, palms in the tropics) scattered over the land around the camera, plus shiny 3D rivers.
// Everything is instanced and anchored to a world grid, so it stays put as you fly and costs a few draw calls.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { addWind } from './wind.js';

const R_KM = 6371;
const km = (v) => v / R_KM;

// ---------------------------------------------------------------- little vertex-coloured models (units: km)
const col = new THREE.Color();
function tint(g, hex) { g = g.index ? g.toNonIndexed() : g; col.set(hex); const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); if (g.attributes.uv) g.deleteAttribute('uv'); return g; }
const merge = (l) => mergeGeometries(l, false);
const T = (geo, x, y, z) => geo.translate(x, y, z);
const GEO = {
  tree: merge([tint(T(new THREE.CylinderGeometry(0.0025, 0.0035, 0.014, 5), 0, 0.007, 0), '#7a5a3a'), tint(T(new THREE.IcosahedronGeometry(0.013, 0), 0, 0.022, 0), '#4f9a3f'), tint(T(new THREE.IcosahedronGeometry(0.009, 0), 0.006, 0.03, 0.002), '#5fae48')]),
  pine: merge([tint(T(new THREE.CylinderGeometry(0.002, 0.003, 0.01, 5), 0, 0.005, 0), '#6b4a2a'), tint(T(new THREE.ConeGeometry(0.012, 0.022, 7), 0, 0.019, 0), '#2f6f3a'), tint(T(new THREE.ConeGeometry(0.009, 0.018, 7), 0, 0.03, 0), '#3a7f42')]),
  palm: merge([tint(T(new THREE.CylinderGeometry(0.0018, 0.0028, 0.032, 5), 0.002, 0.016, 0), '#9b7653'),
    ...[0, 1, 2, 3, 4, 5].map((k) => { const a = (k / 6) * Math.PI * 2; return tint(new THREE.ConeGeometry(0.004, 0.024, 4).rotateZ(Math.PI / 2 - 0.4).rotateY(-a).translate(0.004 + Math.cos(a) * 0.01, 0.032, -Math.sin(a) * 0.01), k % 2 ? '#3f8a3a' : '#5aa046'); })]),
  bush: merge([tint(new THREE.IcosahedronGeometry(0.007, 0).scale(1.3, 0.75, 1.1).translate(0, 0.004, 0), '#5a9e44'), tint(new THREE.IcosahedronGeometry(0.005, 0).translate(0.006, 0.004, 0.002), '#6fb050')]),
  flowers: merge([tint(new THREE.CylinderGeometry(0.012, 0.012, 0.0006, 9).translate(0, 0.0003, 0), '#6fb84f'),
    ...Array.from({ length: 11 }, (_, i) => { const a = i * 2.39, r = 0.002 + (i % 4) * 0.0026; return tint(new THREE.IcosahedronGeometry(0.0016, 0).translate(Math.cos(a) * r, 0.0018, Math.sin(a) * r), ['#ff6b8a', '#ffd23f', '#ffffff', '#c86bff', '#ff8c42', '#ff4f6d'][i % 6]); })]),
  rock: merge([tint(new THREE.DodecahedronGeometry(0.006, 0).scale(1.3, 0.7, 1).translate(0, 0.003, 0), '#9a968c'), tint(new THREE.DodecahedronGeometry(0.0035, 0).translate(0.006, 0.0015, 0.003), '#b0aca2')]),
  cactus: merge([tint(new THREE.CylinderGeometry(0.0022, 0.0026, 0.02, 6).translate(0, 0.01, 0), '#5f8f4a'), tint(new THREE.CylinderGeometry(0.0015, 0.0015, 0.007, 6).translate(0.004, 0.012, 0), '#5f8f4a'), tint(new THREE.CylinderGeometry(0.0015, 0.0015, 0.004, 6).rotateZ(Math.PI / 2).translate(0.002, 0.009, 0), '#5f8f4a')]),
  dryshrub: tint(new THREE.IcosahedronGeometry(0.005, 0).scale(1.2, 0.6, 1.2).translate(0, 0.003, 0), '#a89a5a'),
};
const CAP = { tree: 9000, pine: 7000, palm: 3000, bush: 6000, flowers: 6000, rock: 3000, cactus: 2000, dryshrub: 3500 };

function hash2(a, b, s) { let h = Math.imul(a, 374761393) ^ Math.imul(b, 668265263) ^ Math.imul(s, 2246822519); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

// opts: { scene, ll2v, v2ll, landAt(lat, lon) -> 'grass'|'desert'|'ice'|null, blocked(lat, lon) -> bool, rivers: Promise<[[rank, [[lon,lat]…]]]> }
export function createNature(opts) {
  const mat = addWind(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true }), { from: 0.012, amp: 0.06, phase: 60000 });
  const group = new THREE.Group(); opts.scene.add(group);
  const mesh = {};
  for (const k in GEO) { const m = new THREE.InstancedMesh(GEO[k], mat, CAP[k]); m.count = 0; m.frustumCulled = false; m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CAP[k] * 3), 3); group.add(m); mesh[k] = m; }
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0), tintC = new THREE.Color();
  let key = null;

  function scatter(lat0, lon0, Rk) {
    const level = Math.max(0, Math.round(Math.log2(Rk / 2)));
    const cellKm = 0.085 * 2 ** level, grow = Math.max(1.6, 2 ** level * 0.8);   // further away: bigger cells, bigger plants
    const dLat = cellKm / 111.2, dLon = dLat / Math.max(0.2, Math.cos((lat0 * Math.PI) / 180));
    const n = Math.ceil(Rk / cellKm);
    const i0 = Math.round(lat0 / dLat), j0 = Math.round(lon0 / dLon);
    const cnt = {}; for (const k in mesh) cnt[k] = 0;
    const put = (k, lat, lon, size, rot, t) => {
      if (cnt[k] >= CAP[k]) return;
      const v = opts.ll2v(lat, lon).normalize();
      _q.setFromUnitVectors(UP, v); _q2.setFromAxisAngle(UP, rot); _q.multiply(_q2);
      _m.compose(_v.copy(v).multiplyScalar(1 + km(0.003)), _q, _s.setScalar(km(size)));
      mesh[k].setMatrixAt(cnt[k], _m);
      tintC.setRGB(0.85 + t * 0.3, 0.85 + t * 0.3, 0.85 + t * 0.2); mesh[k].setColorAt(cnt[k], tintC);
      cnt[k]++;
    };
    for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
      if (i * i + j * j > n * n) continue;
      const ci = i0 + i, cj = j0 + j;
      const r1 = hash2(ci, cj, level), r2 = hash2(ci, cj, level + 7), r3 = hash2(ci, cj, level + 13);
      const lat = (ci + r1 - 0.5) * dLat, lon = (cj + r2 - 0.5) * dLon;
      const land = opts.landAt(lat, lon);
      if (!land || opts.blocked(lat, lon)) continue;
      const s = grow * (0.8 + r3 * 0.6), rot = r1 * 6.28;
      if (land === 'desert') {
        if (r3 < 0.18) put('rock', lat, lon, s * 1.4, rot, r2);
        else if (r3 < 0.32) put('cactus', lat, lon, s, rot, r1);
        else if (r3 < 0.55) put('dryshrub', lat, lon, s, rot, r2);
        continue;
      }
      if (land === 'ice') { if (r3 < 0.25) put('rock', lat, lon, s * 1.6, rot, 0.4); continue; }
      // grassland: little woods, lone trees, bushes, flower meadows and rocks
      const forest = hash2(Math.floor(ci / 5), Math.floor(cj / 5), 99) < 0.55;      // patchy woods several cells wide
      const north = Math.abs(lat) > 52, tropic = Math.abs(lat) < 23;
      const treeKind = north || (Math.abs(lat) > 42 && r2 < 0.5) ? 'pine' : tropic && r2 < 0.45 ? 'palm' : 'tree';
      if (forest) {
        for (let k = 0; k < 3; k++) { const a = hash2(ci, cj, k + 30), b = hash2(ci, cj, k + 40); put(treeKind, lat + (a - 0.5) * dLat * 0.8, lon + (b - 0.5) * dLon * 0.8, s * (0.8 + a * 0.5), a * 6.28, b); }
        if (r3 < 0.3) put('bush', lat + dLat * 0.2, lon, s, rot, r1);
      } else if (level < 3) {  // from far away only the woods show, so the land doesn't look peppered
        if (r3 < 0.3) put(treeKind, lat, lon, s, rot, r2);
        else if (r3 < 0.58) put('flowers', lat, lon, s * 1.5, rot, r1);
        else if (r3 < 0.76) put('bush', lat, lon, s * 1.2, rot, r2);
        else if (r3 < 0.86) put('rock', lat, lon, s * 1.2, rot, r1);
        if (r1 > 0.7) put('flowers', lat + dLat * 0.3, lon - dLon * 0.25, s * 1.2, r3 * 6, r2);
      }
    }
    for (const k in mesh) { mesh[k].count = cnt[k]; mesh[k].instanceMatrix.needsUpdate = true; if (mesh[k].instanceColor) mesh[k].instanceColor.needsUpdate = true; }
    return level;
  }

  // ---------------------------------------------------------------- 3D rivers: glossy water ribbons with grassy banks
  const riverGroup = new THREE.Group(); group.add(riverGroup);
  const waterMat = new THREE.MeshStandardMaterial({ color: '#4fb6ea', roughness: 0.12, metalness: 0.15, emissive: '#1a6fa0', emissiveIntensity: 0.18 });
  const bankMat = new THREE.MeshStandardMaterial({ color: '#c9b98a', roughness: 1, flatShading: true });
  let rivers = null; opts.rivers?.then((r) => (rivers = r || [])).catch(() => (rivers = []));
  let riverKey = null;
  function ribbon(pts, widthKm, lift, material) {
    const pos = [], idx = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      const t = b.clone().sub(a).normalize(), up = p.clone().normalize(), side = t.clone().cross(up).normalize().multiplyScalar(km(widthKm / 2));
      const c = up.clone().multiplyScalar(1 + km(lift));
      pos.push(...c.clone().add(side).toArray(), ...c.clone().sub(side).toArray());
      if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, material); m.frustumCulled = false; return m;
  }
  function buildRivers(lat0, lon0, Rk) {
    riverGroup.children.forEach((m) => m.geometry.dispose()); riverGroup.clear();
    if (!rivers) return;
    const span = (Rk * 2.5) / 111.2;
    for (const [rank, line] of rivers) {
      if (!line.some(([lo, la]) => Math.abs(la - lat0) < span && Math.abs(lo - lon0) < span * 2)) continue;
      // smooth the coarse line, then keep the part near the camera
      const raw = line.map(([lo, la]) => opts.ll2v(la, lo).normalize());
      if (raw.length < 2) continue;
      const curve = new THREE.CatmullRomCurve3(raw);
      const pts = curve.getPoints(Math.min(1500, raw.length * 8)).map((p) => p.normalize());
      const near = []; let run = [];
      for (const p of pts) { const ll = opts.v2ll(p); if (Math.abs(ll.lat - lat0) < span && Math.abs(ll.lon - lon0) < span * 2) run.push(p); else if (run.length) { near.push(run); run = []; } }
      if (run.length) near.push(run);
      const w = (rank <= 3 ? 0.55 : rank <= 6 ? 0.32 : 0.18) * Math.max(1, Rk / 5);
      for (const r of near) if (r.length > 1) { riverGroup.add(ribbon(r, w * 1.8, 0.0025, bankMat)); riverGroup.add(ribbon(r, w, 0.004, waterMat)); }
    }
  }

  return {
    group,
    // call every frame-ish with the point under the camera and the altitude in km
    update(lat, lon, altKm) {
      const on = altKm < 32;
      group.visible = on;
      if (!on) return;
      const Rk = Math.min(28, Math.max(1.6, altKm * 2.2));
      const level = Math.max(0, Math.round(Math.log2(Rk / 2)));
      const moved = key && (Math.abs(lat - key.lat) * 111.2 > key.Rk * 0.25 || Math.abs(lon - key.lon) * 111.2 * Math.cos((lat * Math.PI) / 180) > key.Rk * 0.25);
      if (!key || moved || level !== key.level) { scatter(lat, lon, Rk); key = { lat, lon, Rk, level }; }
      const rMoved = !riverKey || Math.abs(lat - riverKey.lat) * 111.2 > riverKey.Rk * 0.5 || Math.abs(lon - riverKey.lon) * 111.2 * Math.cos((lat * Math.PI) / 180) > riverKey.Rk * 0.5 || Rk / riverKey.Rk > 2.5 || Rk / riverKey.Rk < 0.4;
      if (rivers && rMoved) { buildRivers(lat, lon, Rk); riverKey = { lat, lon, Rk }; }
    },
    reset() { key = null; },
  };
}
