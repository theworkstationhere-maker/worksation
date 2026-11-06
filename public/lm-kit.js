// Shared low-poly building kit for the landmark models. Units are km, y is up.
import * as THREE from 'three';
export { THREE };
export const mats = new Map();
export const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true, ...o })); return mats.get(k); };
export const M = (g, geo, c, x = 0, y = 0, z = 0, o) => { const m = new THREE.Mesh(geo, mat(c, o)); m.position.set(x, y, z); g.add(m); return m; };
export const box = (g, w, h, d, c, x = 0, y = 0, z = 0) => M(g, new THREE.BoxGeometry(w, h, d), c, x, y + h / 2, z);
export const cyl = (g, rt, rb, h, c, x = 0, y = 0, z = 0, s = 14) => M(g, new THREE.CylinderGeometry(rt, rb, h, s), c, x, y + h / 2, z);
export const cone = (g, r, h, c, x = 0, y = 0, z = 0, s = 12) => M(g, new THREE.ConeGeometry(r, h, s), c, x, y + h / 2, z);
export const sph = (g, r, c, x = 0, y = 0, z = 0, s = 12) => M(g, new THREE.SphereGeometry(r, s, Math.max(6, s - 4)), c, x, y, z);
export const dome = (g, r, c, x = 0, y = 0, z = 0, sq = 1, s = 16) => { const m = M(g, new THREE.SphereGeometry(r, s, 8, 0, Math.PI * 2, 0, Math.PI / 2), c, x, y, z); m.scale.y = sq; return m; };
export const lathe = (g, pts, c, x = 0, y = 0, z = 0, s = 18) => M(g, new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), s), c, x, y, z);
export const onion = (g, r, c, x, y, z, s = 16) => lathe(g, [[0, 0], [r * 0.9, 0], [r * 1.08, r * 0.35], [r * 1.0, r * 0.75], [r * 0.6, r * 1.15], [r * 0.18, r * 1.45], [0.0001, r * 1.7]], c, x, y, z, s);
export const G = (g, x = 0, y = 0, z = 0, ry = 0) => { const n = new THREE.Group(); n.position.set(x, y, z); n.rotation.y = ry; g.add(n); return n; };
export function archShape(w, h, pointed = true) {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(-w / 2, h - w / 2);
  if (pointed) { s.quadraticCurveTo(-w / 2, h - w * 0.1, 0, h); s.quadraticCurveTo(w / 2, h - w * 0.1, w / 2, h - w / 2); }
  else s.absarc(0, h - w / 2, w / 2, Math.PI, 0, true);
  s.lineTo(w / 2, 0); s.lineTo(-w / 2, 0); return s;
}
export const arch = (g, w, h, c, x, y, z, ry = 0, pointed = true, d = 0.002) => { const m = M(g, new THREE.ExtrudeGeometry(archShape(w, h, pointed), { depth: d, bevelEnabled: false, curveSegments: 6 }), c, x, y, z); m.rotation.y = ry; return m; };
export const ground = (g, w, d, c = '#6fa84d') => box(g, w, 0.003, d, c);
export const water = (g, w, d, x = 0, z = 0) => box(g, w, 0.002, d, '#4ea3d6', x, 0, z);
export const tree = (g, x, z, s = 1) => { cyl(g, 0.002 * s, 0.003 * s, 0.01 * s, '#6b4a2a', x, 0, z, 5); sph(g, 0.012 * s, '#4a8c3f', x, 0.018 * s, z, 7); };
export const windows = (g, n, w, y, z, c = '#5b6b7a', ww = 0.008, wh = 0.012) => { for (let i = 0; i < n; i++) box(g, ww, wh, 0.002, c, (i - (n - 1) / 2) * (w / n), y, z); };
// a straight beam between two points
export function strut(g, x1, y1, z1, x2, y2, z2, w, c) {
  const d = new THREE.Vector3(x2 - x1, y2 - y1, z2 - z1), len = d.length();
  const m = M(g, new THREE.BoxGeometry(w, len, w), c, (x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return m;
}
// 4-sided lattice tower section: legs from the base square (half-width base) to the top square (half-width top), with cross-bracing
export function legs(g, base, top, h, c, w = 0.006, y0 = 0) {
  const C = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
  for (const [sx, sz] of C) strut(g, sx * base, y0, sz * base, sx * top, y0 + h, sz * top, w, c);
  for (let i = 0; i < 4; i++) {
    const [ax, az] = C[i], [bx, bz] = C[(i + 1) % 4];
    strut(g, ax * base, y0, az * base, bx * top, y0 + h, bz * top, w * 0.35, c);
    strut(g, bx * base, y0, bz * base, ax * top, y0 + h, az * top, w * 0.35, c);
  }
}


// Merge a built model into one mesh per material (a few draw calls instead of hundreds),
// remembering each part's footprint first so walk mode can still bump into walls.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export function bake(root, opts = {}) {
  root.updateMatrixWorld(true);
  const byMat = new Map(), obstacles = [];
  const bb = new THREE.Box3();
  root.traverse((o) => {
    if (!o.isMesh || o.geometry.type === 'EdgesGeometry') return;
    let gm = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(gm.attributes)) if (k !== 'position' && k !== 'normal' && !(k === 'color' && o.material.vertexColors)) gm.deleteAttribute(k);
    if (!gm.attributes.normal) gm.computeVertexNormals();
    gm.applyMatrix4(o.matrixWorld);
    gm.computeBoundingBox(); bb.copy(gm.boundingBox);
    // on the real-world map, big flat ground/water plates would hide the satellite picture: leave them out
    if (opts.dropGround && bb.max.y < 0.0045 && (bb.max.x - bb.min.x) * (bb.max.z - bb.min.z) > 0.03) { gm.dispose(); return; }
    if (!(bb.max.y < 0.012 || bb.min.y > 0.015)) obstacles.push([bb.min.x - 0.004, bb.max.x + 0.004, bb.min.z - 0.004, bb.max.z + 0.004]);
    if (!byMat.has(o.material)) byMat.set(o.material, []);
    byMat.get(o.material).push(gm);
  });
  const out = new THREE.Group();
  for (const [m, list] of byMat) {
    const merged = list.length === 1 ? list[0] : mergeGeometries(list, false);
    list.forEach((x) => x !== merged && x.dispose());
    if (merged) out.add(new THREE.Mesh(merged, m));
  }
  out.userData = { ...root.userData, obstacles };
  return out;
}
