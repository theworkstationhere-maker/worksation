// Detailed, true-to-life low-poly models of the New 7 Wonders (+ the Great Pyramids).
// Proportions follow the real buildings; units are km (shown ~2-3x larger than life so they read on the map).
import * as THREE from 'three';

const mats = new Map();
const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true, ...o })); return mats.get(k); };
const mesh = (g, geo, c, x = 0, y = 0, z = 0, o) => { const m = new THREE.Mesh(geo, mat(c, o)); m.position.set(x, y, z); g.add(m); return m; };
const box = (g, w, h, d, c, x = 0, y = 0, z = 0) => mesh(g, new THREE.BoxGeometry(w, h, d), c, x, y + h / 2, z);
const cyl = (g, rt, rb, h, c, x = 0, y = 0, z = 0, seg = 16) => mesh(g, new THREE.CylinderGeometry(rt, rb, h, seg), c, x, y + h / 2, z);
const cone = (g, r, h, c, x = 0, y = 0, z = 0, seg = 12) => mesh(g, new THREE.ConeGeometry(r, h, seg), c, x, y + h / 2, z);
const lathe = (g, pts, c, x, y, z, seg = 20) => mesh(g, new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), seg), c, x, y, z);
// onion dome profile (radius r), like the Taj Mahal's
const onion = (g, r, c, x, y, z, seg = 24) => lathe(g, [[0, 0], [r * 0.92, 0], [r * 1.06, r * 0.32], [r * 1.02, r * 0.68], [r * 0.78, r * 1.0], [r * 0.42, r * 1.26], [r * 0.14, r * 1.46], [0.0001, r * 1.62]], c, x, y, z, seg);
// pointed-arch panel (an iwan / arch recess), facing +z
function archShape(w, h) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(-w / 2, h * 0.62);
  s.quadraticCurveTo(-w / 2, h * 0.9, 0, h); s.quadraticCurveTo(w / 2, h * 0.9, w / 2, h * 0.62);
  s.lineTo(w / 2, 0); s.lineTo(-w / 2, 0);
  return s;
}
const arch = (g, w, h, d, c, x, y, z, ry = 0) => { const m = mesh(g, new THREE.ExtrudeGeometry(archShape(w, h), { depth: d, bevelEnabled: false }), c, x, y, z); m.rotation.y = ry; return m; };
const cypress = (g, x, z, s = 1) => cone(g, 0.006 * s, 0.04 * s, '#2f5d34', x, 0, z, 6);

export const WONDERS = {
  // ---------------------------------------------------------------- Taj Mahal, Agra
  taj(root) {
    const g = new THREE.Group(); g.position.z = -0.17; root.add(g); // centre the view between the tomb and the gate
    const W = '#f4f0e8', W2 = '#e9e2d5', SH = '#cdc4b3', RED = '#a8513a', RED2 = '#c06a4c';
    // red sandstone platform, white marble plinth
    box(g, 0.56, 0.012, 0.36, RED, 0, 0, -0.06);
    box(g, 0.25, 0.026, 0.25, W2, 0, 0.012, -0.08);
    // mausoleum: square with chamfered corners
    const half = 0.072, ch = 0.022, H = 0.085, base = 0.038, zc = -0.08;
    const s = new THREE.Shape([[-half + ch, -half], [half - ch, -half], [half, -half + ch], [half, half - ch], [half - ch, half], [-half + ch, half], [-half, half - ch], [-half, -half + ch]].map(([a, b]) => new THREE.Vector2(a, b)));
    const body = mesh(g, new THREE.ExtrudeGeometry(s, { depth: H, bevelEnabled: false }), W, 0, base, zc);
    body.rotation.x = -Math.PI / 2; body.position.y = base;
    // great iwan (pishtaq) on each face, plus two stacked small arches either side and on the chamfers
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2, cx = Math.sin(a), cz = Math.cos(a);
      const f = new THREE.Group(); f.position.set(cx * (half + 0.0005), base, zc + cz * (half + 0.0005)); f.rotation.y = a; g.add(f);
      box(f, 0.07, 0.075, 0.003, W, 0, 0, 0);                 // pishtaq frame
      arch(f, 0.042, 0.062, 0.002, SH, 0, 0.004, 0.0016);     // deep central recess
      arch(f, 0.026, 0.03, 0.002, '#b9b0a0', 0, 0.006, 0.0028); // door
      for (const sx of [-1, 1]) for (const yy of [0.006, 0.044]) arch(f, 0.012, 0.03, 0.002, SH, sx * 0.05, yy, 0.0016);
      for (const sx of [-1, 1]) cyl(f, 0.0016, 0.0016, 0.092, W, sx * 0.035, 0, 0.002, 6); // corner guldastas
    }
    for (let k = 0; k < 4; k++) { // arches on the chamfered corners
      const a = Math.PI / 4 + (k * Math.PI) / 2, r = half - ch / 2 + 0.003;
      const f = new THREE.Group(); f.position.set(Math.sin(a) * r * 1.0, base, zc + Math.cos(a) * r); f.rotation.y = a; g.add(f);
      for (const yy of [0.006, 0.044]) arch(f, 0.014, 0.032, 0.002, SH, 0, yy, 0);
    }
    // drum, onion dome and finial
    const top = base + H;
    cyl(g, 0.036, 0.038, 0.026, W, 0, top, zc, 24);
    onion(g, 0.044, W, 0, top + 0.026, zc);
    cyl(g, 0.0012, 0.002, 0.028, '#d8b24a', 0, top + 0.026 + 0.071, zc, 6);
    mesh(g, new THREE.SphereGeometry(0.0035, 8, 6), '#d8b24a', 0, top + 0.026 + 0.083, zc);
    mesh(g, new THREE.TorusGeometry(0.004, 0.0009, 4, 10, Math.PI), '#d8b24a', 0, top + 0.026 + 0.096, zc);
    // four chhatris (kiosks) around the dome
    for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const px = x * 0.042, pz = zc + z * 0.042;
      for (let i = 0; i < 8; i++) { const t = (i / 8) * Math.PI * 2; cyl(g, 0.0012, 0.0012, 0.016, W, px + Math.cos(t) * 0.011, top, pz + Math.sin(t) * 0.011, 5); }
      cyl(g, 0.014, 0.014, 0.003, W, px, top + 0.016, pz, 12);
      onion(g, 0.012, W, px, top + 0.019, pz, 16);
    }
    // four minarets at the plinth corners, each with three balconies and a chhatri
    for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const px = x * 0.115, pz = zc + z * 0.115, y0 = 0.038;
      cyl(g, 0.0075, 0.0095, 0.05, W, px, y0, pz, 12); cyl(g, 0.012, 0.012, 0.003, W2, px, y0 + 0.05, pz, 12);
      cyl(g, 0.0065, 0.0075, 0.042, W, px, y0 + 0.053, pz, 12); cyl(g, 0.011, 0.011, 0.003, W2, px, y0 + 0.095, pz, 12);
      cyl(g, 0.0055, 0.0065, 0.032, W, px, y0 + 0.098, pz, 12); cyl(g, 0.0095, 0.0095, 0.003, W2, px, y0 + 0.13, pz, 12);
      for (let i = 0; i < 6; i++) { const t = (i / 6) * Math.PI * 2; cyl(g, 0.0008, 0.0008, 0.01, W, px + Math.cos(t) * 0.006, y0 + 0.133, pz + Math.sin(t) * 0.006, 4); }
      onion(g, 0.0075, W, px, y0 + 0.143, pz, 12);
    }
    // the mosque (west) and its mirror (east) in red sandstone with three white domes
    for (const sx of [-1, 1]) {
      box(g, 0.075, 0.032, 0.04, RED, sx * 0.205, 0.012, zc);
      for (const dz of [-0.022, 0, 0.022]) onion(g, dz ? 0.008 : 0.011, W, sx * 0.205, 0.044, zc + dz, 14);
      for (const dz of [-1, 1]) for (const dx of [-1, 1]) { cyl(g, 0.003, 0.003, 0.03, RED2, sx * 0.205 + dx * 0.034, 0.044, zc + dz * 0.018, 8); }
      arch(g, 0.016, 0.022, 0.002, '#6e3426', sx * 0.205 - sx * 0.0376, 0.014, zc, sx > 0 ? -Math.PI / 2 : Math.PI / 2);
    }
    // charbagh garden: long reflecting pool, lawns, cypress rows, central marble tank
    box(g, 0.5, 0.004, 0.36, '#6fa84d', 0, 0, 0.27);
    box(g, 0.018, 0.005, 0.3, '#d9d1c1', 0, 0, 0.25);
    box(g, 0.01, 0.006, 0.29, '#5aa9d6', 0, 0, 0.25);
    box(g, 0.5, 0.005, 0.014, '#d9d1c1', 0, 0, 0.25);
    box(g, 0.036, 0.007, 0.036, W2, 0, 0, 0.25);
    box(g, 0.026, 0.008, 0.026, '#5aa9d6', 0, 0, 0.25);
    for (let z = 0.11; z < 0.4; z += 0.016) for (const sx of [-1, 1]) { if (Math.abs(z - 0.25) < 0.02) continue; cypress(g, sx * 0.018, z, 1); }
    // the great gate (darwaza) in red sandstone, at the far end of the garden
    box(g, 0.1, 0.05, 0.03, RED, 0, 0, 0.44);
    arch(g, 0.03, 0.042, 0.002, '#e8dccb', 0, 0.004, 0.4555);
    arch(g, 0.022, 0.034, 0.002, '#6e3426', 0, 0.004, 0.4565);
    for (let i = 0; i < 11; i++) { mesh(g, new THREE.SphereGeometry(0.003, 6, 4), W, -0.04 + i * 0.008, 0.052, 0.455); }
    for (const sx of [-1, 1]) { cyl(g, 0.006, 0.006, 0.058, RED2, sx * 0.05, 0, 0.455, 8); onion(g, 0.007, W, sx * 0.05, 0.058, 0.455, 10); }
  },

  // ---------------------------------------------------------------- Colosseum, Rome
  colosseum(g) {
    const T = '#d6bd96', T2 = '#c7a982', DARK = '#6a5440', a = 0.19, b = 0.158;
    const N = 80, levels = [0.034, 0.034, 0.034], attic = 0.028;
    const at = (t, s = 1) => [Math.cos(t) * a * s, Math.sin(t) * b * s];
    // outer facade: piers between arches on three arcades, an attic; the southern part has collapsed
    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.PI * 2, ruined = t > 3.6 && t < 5.4;
      const [x, z] = at(t);
      const rot = -t + Math.PI / 2;
      let y = 0;
      const maxL = ruined ? (t < 3.9 || t > 5.1 ? 2 : 1) : 3;
      for (let l = 0; l < maxL; l++) {
        const p = box(g, 0.006, levels[l], 0.012, T, x, y, z); p.rotation.y = rot;
        const cap = box(g, (2 * Math.PI * a) / N + 0.001, 0.004, 0.013, T2, x, y + levels[l] - 0.004, z); cap.rotation.y = rot;
        y += levels[l];
      }
      if (!ruined) { const w = box(g, (2 * Math.PI * a) / N + 0.001, attic, 0.012, T, x, y, z); w.rotation.y = rot; if (i % 2) { const win = box(g, 0.004, 0.008, 0.013, DARK, x, y + 0.01, z); win.rotation.y = rot; } }
    }
    // inner ring wall (visible where the outer wall fell)
    for (let i = 0; i < 64; i++) {
      const t = (i / 64) * Math.PI * 2, [x, z] = at(t, 0.88);
      const p = box(g, (2 * Math.PI * a * 0.88) / 64 + 0.001, 0.08, 0.01, T2, x, 0, z); p.rotation.y = -t + Math.PI / 2;
      if (i % 2 === 0) for (const yy of [0.012, 0.046]) { const o = box(g, 0.006, 0.02, 0.011, DARK, x, yy, z); o.rotation.y = -t + Math.PI / 2; }
    }
    // seating tiers (cavea) stepping down to the arena
    for (let k = 0; k < 5; k++) {
      const s = 0.84 - k * 0.07, h = 0.075 - k * 0.014;
      const ring = mesh(g, new THREE.CylinderGeometry(a * s, a * s, h, 64, 1, true), k % 2 ? '#bfa27c' : '#cbb08a', 0, h / 2, 0, { side: THREE.DoubleSide });
      ring.scale.z = b / a;
      const top = mesh(g, new THREE.RingGeometry(a * (s - 0.07), a * s, 64), '#c2a47e', 0, h, 0, { side: THREE.DoubleSide });
      top.rotation.x = -Math.PI / 2; top.scale.y = b / a;
    }
    // arena: half wooden floor, half the exposed hypogeum (underground passages)
    const floor = mesh(g, new THREE.CircleGeometry(a * 0.5, 48), '#d9c08e', 0, 0.003, 0); floor.rotation.x = -Math.PI / 2; floor.scale.y = b / a;
    for (let i = -6; i <= 6; i++) { const w = box(g, 0.0025, 0.012, b * 0.8, '#a88f6e', i * 0.012, 0, 0); w.scale.z = Math.sqrt(Math.max(0, 1 - (i * 0.012 / (a * 0.5)) ** 2)); }
    box(g, a * 0.5, 0.0035, b * 0.5, '#8a6a46', a * 0.25, 0.012, 0);
  },

  // ---------------------------------------------------------------- Christ the Redeemer, Rio de Janeiro
  christ(g) {
    const S = '#ece7dc', S2 = '#dcd6c9';
    // Corcovado: steep granite peak covered in forest
    cone(g, 0.62, 0.42, '#4d8a43', 0, 0, 0, 9);
    cone(g, 0.2, 0.22, '#7d7a70', 0.02, 0.24, -0.01, 7);
    box(g, 0.09, 0.008, 0.09, '#cfc6b2', 0, 0.43, 0);              // viewing platform
    for (let i = 0; i < 6; i++) box(g, 0.03, 0.003, 0.006, '#bdb39c', 0, 0.43 - i * 0.004, 0.05 + i * 0.006); // steps
    // art-deco pedestal (chapel inside)
    box(g, 0.03, 0.022, 0.03, S2, 0, 0.438, 0);
    box(g, 0.026, 0.006, 0.026, S, 0, 0.46, 0);
    box(g, 0.006, 0.012, 0.0008, '#8a7a60', 0, 0.438, 0.0152);
    // the statue: robe flaring at the hem, arms straight out, head slightly bowed
    const y0 = 0.466;
    lathe(g, [[0, 0], [0.0095, 0], [0.0085, 0.02], [0.0075, 0.045], [0.0078, 0.058], [0.0065, 0.066], [0.0, 0.067]], S, 0, y0, 0, 12);
    box(g, 0.084, 0.007, 0.0065, S, 0, y0 + 0.056, 0);                     // arms (span ≈ height)
    for (const sx of [-1, 1]) { const sl = box(g, 0.012, 0.012, 0.007, S, sx * 0.04, y0 + 0.05, 0); sl.rotation.z = sx * 0.1; } // sleeves
    for (const sx of [-1, 1]) box(g, 0.004, 0.006, 0.004, S2, sx * 0.043, y0 + 0.053, 0); // hands
    mesh(g, new THREE.SphereGeometry(0.0045, 10, 8), S, 0, y0 + 0.072, 0.0008);
    box(g, 0.0035, 0.006, 0.002, S2, 0, y0 + 0.066, 0.004);                 // beard/neck
    for (let i = 0; i < 5; i++) box(g, 0.0008, 0.05, 0.0008, S2, -0.006 + i * 0.003, y0 + 0.004, 0.0082); // robe folds
  },

  // ---------------------------------------------------------------- Machu Picchu, Peru
  terraces(g) {
    const STONE = '#9a9384', GR = '#6fa452';
    // Huayna Picchu rising steeply behind the citadel, and the surrounding mountains
    cone(g, 0.2, 0.5, '#4e8a45', 0.04, 0, -0.55, 8);
    cone(g, 0.06, 0.12, '#7d7a70', 0.04, 0.38, -0.55, 6);
    cone(g, 0.45, 0.42, '#5a9150', -0.55, 0, -0.35, 7); cone(g, 0.4, 0.36, '#548a48', 0.6, 0, -0.25, 7);
    // the saddle ridge
    box(g, 0.75, 0.06, 0.5, '#5c8f4c', 0, 0, -0.05);
    // agricultural terraces stepping down the slope (south)
    for (let i = 0; i < 9; i++) { box(g, 0.62 - i * 0.025, 0.012, 0.03, i % 2 ? GR : '#78ae5a', 0.08, 0.06 - i * 0.012, 0.2 + i * 0.03); box(g, 0.62 - i * 0.025, 0.012, 0.0025, STONE, 0.08, 0.06 - i * 0.012, 0.215 + i * 0.03); }
    // central plaza
    box(g, 0.16, 0.003, 0.09, '#86b86a', 0, 0.06, -0.02);
    // stone buildings with steep thatched gable roofs, in rows around the plaza
    const house = (x, z, ry, roof = true) => {
      const h = new THREE.Group(); h.position.set(x, 0.06, z); h.rotation.y = ry; g.add(h);
      box(h, 0.026, 0.014, 0.016, STONE); box(h, 0.005, 0.009, 0.001, '#3d3a33', 0, 0, 0.0081);
      if (roof) { const r = mesh(h, new THREE.CylinderGeometry(0.012, 0.012, 0.028, 3), '#b59a5a', 0, 0.019, 0); r.rotation.z = Math.PI / 2; r.scale.y = 1; r.rotation.x = Math.PI / 2; r.rotation.set(0, 0, Math.PI / 2); r.scale.set(1, 1, 0.75); }
    };
    for (let i = 0; i < 6; i++) { house(-0.12 + i * 0.03, -0.1, 0, i % 3 !== 1); house(-0.12 + i * 0.03, 0.06, Math.PI, i % 2 === 0); }
    for (let i = 0; i < 4; i++) { house(0.13, -0.08 + i * 0.035, -Math.PI / 2, i % 2 === 0); house(-0.15, -0.06 + i * 0.035, Math.PI / 2); }
    // Temple of the Sun: curved tower
    cyl(g, 0.018, 0.02, 0.022, STONE, 0.06, 0.06, 0.03, 12);
    // Intihuatana hill with its carved stone
    cone(g, 0.04, 0.03, '#6fa452', -0.06, 0.06, -0.12, 8); box(g, 0.006, 0.008, 0.004, STONE, -0.06, 0.09, -0.12);
    // morning clouds drifting in the valley
    for (let i = 0; i < 5; i++) { const c = mesh(g, new THREE.SphereGeometry(0.05, 8, 6), '#ffffff', -0.3 + i * 0.15, 0.02, 0.45, { transparent: true, opacity: 0.55 }); c.scale.set(1.6, 0.4, 0.8); }
  },

  // ---------------------------------------------------------------- Chichén Itzá (El Castillo), Mexico
  steppyramid(g) {
    const L = '#cfc6b0', L2 = '#bdb297', SH = '#9e9378';
    box(g, 0.6, 0.004, 0.6, '#8fbf6c', 0, 0, 0);
    box(g, 0.36, 0.004, 0.36, '#d9cfb9', 0, 0, 0);
    // nine stepped terraces with sloped faces and recessed panels
    let y = 0.004;
    for (let i = 0; i < 9; i++) {
      const w = 0.24 - i * 0.019, h = 0.0155;
      const t = mesh(g, new THREE.CylinderGeometry((w - 0.004) / Math.SQRT2, w / Math.SQRT2, h, 4), i % 2 ? L : L2, 0, y + h / 2, 0); t.rotation.y = Math.PI / 4;
      for (let k = 0; k < 4; k++) { const a = (k * Math.PI) / 2; for (const s of [-1, 1]) { const p = box(g, w * 0.28, h * 0.5, 0.0015, SH, Math.sin(a) * w / 2 + Math.cos(a) * s * w * 0.27, y + h * 0.25, Math.cos(a) * w / 2 - Math.sin(a) * s * w * 0.27); p.rotation.y = a; } }
      y += h;
    }
    // four staircases (91 steps each in reality) with balustrades ending in serpent heads (Kukulcán)
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2, f = new THREE.Group(); f.rotation.y = a; g.add(f);
      for (let s = 0; s < 22; s++) box(f, 0.034, 0.0064, 0.0055, '#d8cfba', 0, 0.004 + s * 0.0064, 0.124 - s * 0.0047);
      for (const sx of [-1, 1]) {
        const bal = box(f, 0.006, 0.006, 0.15, L2, sx * 0.02, 0.004, 0.055); bal.rotation.x = -0.94; bal.position.y = 0.075; bal.position.z = 0.066;
        box(f, 0.01, 0.009, 0.014, '#a99e84', sx * 0.02, 0.004, 0.13);               // serpent head
        box(f, 0.006, 0.003, 0.004, '#8a2f2a', sx * 0.02, 0.006, 0.138);              // open jaw
      }
    }
    // temple of Kukulcán on top, with its doorway and columns
    box(g, 0.064, 0.03, 0.064, L, 0, y, 0);
    box(g, 0.07, 0.006, 0.07, L2, 0, y + 0.03, 0);
    for (let k = 0; k < 4; k++) { const a = (k * Math.PI) / 2; const d = box(g, 0.022, 0.018, 0.002, '#3d362a', Math.sin(a) * 0.0325, y, Math.cos(a) * 0.0325); d.rotation.y = a; }
    for (const sx of [-1, 1]) cyl(g, 0.0025, 0.0025, 0.018, L, sx * 0.007, y, 0.034, 8);
  },

  // ---------------------------------------------------------------- Petra (Al-Khazneh, the Treasury), Jordan
  rockfacade(g, c) {
    const ROCK = c || '#c9764f', ROCK2 = '#b8653f', F = '#e39a72', F2 = '#d2885f', DK = '#5a2f1f';
    // towering rose-red cliffs of the Siq, leaving a narrow gorge in front
    for (let i = 0; i < 9; i++) { const m = box(g, 0.12 + (i % 3) * 0.03, 0.36 + (i % 4) * 0.05, 0.14, i % 2 ? ROCK : ROCK2, -0.42 + i * 0.105, 0, -0.12 - (i % 2) * 0.03); m.rotation.y = (i % 3 - 1) * 0.1; }
    for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) { const m = box(g, 0.1, 0.3 + i * 0.03, 0.12, ROCK2, sx * (0.2 + i * 0.02), 0, 0.1 + i * 0.1); m.rotation.y = sx * 0.4; }
    box(g, 0.36, 0.004, 0.6, '#d8a57f', 0, 0, 0.18); // sandy floor
    // the facade, carved into the cliff: two storeys, ~40 m tall in reality
    const fz = -0.048;
    box(g, 0.2, 0.3, 0.012, F2, 0, 0, fz - 0.004);
    // lower storey: six Corinthian columns and a pediment
    box(g, 0.17, 0.008, 0.03, F, 0, 0, fz + 0.012);
    for (let i = 0; i < 6; i++) { const x = -0.075 + i * 0.03; cyl(g, 0.0055, 0.006, 0.092, F, x, 0.008, fz + 0.016, 10); box(g, 0.012, 0.008, 0.012, F2, x, 0.1, fz + 0.016); }
    box(g, 0.176, 0.012, 0.024, F, 0, 0.108, fz + 0.012);
    const ped = mesh(g, new THREE.CylinderGeometry(0.05, 0.05, 0.176, 3), F, 0, 0.134, fz + 0.012); ped.rotation.z = Math.PI / 2; ped.scale.set(0.35, 1, 1);
    box(g, 0.026, 0.06, 0.002, DK, 0, 0.008, fz + 0.002);  // doorway into the chamber
    // upper storey: central tholos with a conical roof and urn, flanked by broken pediments
    const u = 0.16;
    box(g, 0.17, 0.008, 0.024, F, 0, u, fz + 0.01);
    cyl(g, 0.026, 0.026, 0.078, F, 0, u + 0.008, fz + 0.012, 16);
    for (let i = 0; i < 6; i++) { const t = -1.1 + i * 0.44; cyl(g, 0.0035, 0.0035, 0.078, F2, Math.sin(t) * 0.028, u + 0.008, fz + 0.012 + Math.cos(t) * 0.028, 8); }
    cone(g, 0.03, 0.03, F, 0, u + 0.086, fz + 0.012, 16);
    mesh(g, new THREE.SphereGeometry(0.008, 10, 8), F2, 0, u + 0.124, fz + 0.012);
    for (const sx of [-1, 1]) {
      box(g, 0.04, 0.078, 0.02, F, sx * 0.065, u + 0.008, fz + 0.01);
      for (const dx of [-0.012, 0.012]) cyl(g, 0.004, 0.004, 0.078, F2, sx * 0.065 + dx, u + 0.008, fz + 0.022, 8);
      const half = box(g, 0.04, 0.012, 0.02, F, sx * 0.065, u + 0.086, fz + 0.01); half.rotation.z = -sx * 0.35;
    }
  },

  // ---------------------------------------------------------------- Great Wall (Mutianyu), China
  wall(g) {
    const ST = '#b7a68d', ST2 = '#a3927a', DK = '#4a4036';
    // rolling forested ridges
    for (let i = 0; i < 9; i++) cone(g, 0.9 + (i % 3) * 0.3, 0.32 + (i % 4) * 0.1, i % 2 ? '#5d8f4e' : '#679a56', -3.2 + i * 0.8, 0, (i % 2 ? 1 : -1) * 0.9, 8);
    // the wall snakes along the ridge line: walkway, battlements, watchtowers
    const pts = [];
    for (let i = 0; i <= 40; i++) { const x = -3 + i * 0.15; pts.push([x, Math.sin(i * 0.45) * 0.45 + Math.sin(i * 0.17) * 0.3, 0.05 + Math.max(0, Math.sin(i * 0.33)) * 0.14 + i * 0.002]); }
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, z1, y1] = pts[i], [x2, z2, y2] = pts[i + 1], len = Math.hypot(x2 - x1, z2 - z1);
      const seg = new THREE.Group(); seg.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2); seg.rotation.y = -Math.atan2(z2 - z1, x2 - x1); g.add(seg);
      seg.rotation.z = Math.atan2(y2 - y1, len);
      box(seg, len + 0.004, 0.05, 0.036, ST, 0, -0.05, 0);           // wall body
      box(seg, len + 0.004, 0.002, 0.03, '#c9b99f', 0, 0, 0);         // walkway
      for (let k = 0; k < 6; k++) { box(seg, 0.012, 0.012, 0.004, ST2, -len / 2 + 0.012 + k * (len / 6), 0.002, 0.016); box(seg, 0.012, 0.009, 0.004, ST2, -len / 2 + 0.012 + k * (len / 6), 0.002, -0.016); } // crenellations
      if (i % 5 === 0) { // watchtower
        box(seg, 0.06, 0.06, 0.06, ST2, 0, -0.03, 0);
        for (const s of [-1, 1]) { box(seg, 0.01, 0.014, 0.0015, DK, -0.015, 0.006, s * 0.0305); box(seg, 0.01, 0.014, 0.0015, DK, 0.015, 0.006, s * 0.0305); }
        for (let k = 0; k < 4; k++) box(seg, 0.012, 0.01, 0.006, ST, -0.022 + k * 0.015, 0.03, 0.027);
      }
    }
  },

  // ---------------------------------------------------------------- Pyramids of Giza + Great Sphinx, Egypt
  pyramids(g) {
    const LIME = '#e2c27c', CAP = '#efe3c7';
    box(g, 2.2, 0.004, 2.2, '#e8cf94', 0.3, 0, 0.2);
    const pyr = (s, x, z, cap = false) => {
      const p = mesh(g, new THREE.ConeGeometry(s * Math.SQRT2 / 2, s * 0.64, 4), LIME, x, s * 0.32, z); p.rotation.y = Math.PI / 4;
      if (cap) { const c = mesh(g, new THREE.ConeGeometry(s * 0.2 * Math.SQRT2 / 2, s * 0.128, 4), CAP, x, s * 0.64 - s * 0.064, z); c.rotation.y = Math.PI / 4; } // Khafre's surviving casing
      for (let k = 1; k < 6; k++) { const r = mesh(g, new THREE.ConeGeometry(s * Math.SQRT2 / 2 * (1 - k / 6) + 0.0006, 0.001, 4), '#d1ad62', x, s * 0.64 * (k / 6), z); r.rotation.y = Math.PI / 4; } // course lines
    };
    pyr(0.46, 0, 0);               // Khufu
    pyr(0.43, 0.42, 0.38, true);   // Khafre
    pyr(0.2, 0.72, 0.72);          // Menkaure
    for (let i = 0; i < 3; i++) pyr(0.07, 0.34 + i * 0.07, -0.1);   // queens' pyramids
    for (let i = 0; i < 3; i++) pyr(0.06, 0.62 + i * 0.07, 0.95);
    // the Great Sphinx: lion body lying down, head with nemes headdress, facing east
    const sp = new THREE.Group(); sp.position.set(0.05, 0, 0.62); sp.rotation.y = -Math.PI / 2; g.add(sp);
    box(sp, 0.035, 0.022, 0.1, '#d3ad6a', 0, 0, 0);
    box(sp, 0.012, 0.006, 0.04, '#d3ad6a', -0.012, 0, 0.065); box(sp, 0.012, 0.006, 0.04, '#d3ad6a', 0.012, 0, 0.065); // paws
    box(sp, 0.026, 0.03, 0.024, '#d9b574', 0, 0.018, 0.04);
    box(sp, 0.034, 0.02, 0.012, '#c9a35f', 0, 0.026, 0.032); // nemes lappets
    box(sp, 0.016, 0.018, 0.012, '#dcb978', 0, 0.034, 0.05);  // face
  },
};
