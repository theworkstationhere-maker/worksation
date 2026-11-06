// True-to-life low-poly models of the hand-picked landmarks, keyed by landmark name.
// Proportions follow the real places; units are km (drawn ~2-3x larger than life so they read on the map).

import { THREE, mat, M, strut, box, cyl, cone, sph, dome, lathe, onion, G, archShape, arch, ground, water, tree, windows, legs } from './lm-kit.js';

export const REAL = {
  // =============================================================== EUROPE
  'Eiffel Tower'(g, c = '#7c6247') {
    ground(g, 0.5, 0.7); water(g, 0.6, 0.06, 0, -0.3);                       // Champ de Mars, the Seine
    for (const s of [-1, 1]) box(g, 0.05, 0.004, 0.35, '#d9cdb4', s * 0.08, 0, 0.17);
    // four great curved legs (two straight-ish segments each), joined at the base by the decorative arches
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { strut(g, sx * 0.11, 0, sz * 0.11, sx * 0.085, 0.06, sz * 0.085, 0.022, c); strut(g, sx * 0.085, 0.06, sz * 0.085, sx * 0.062, 0.12, sz * 0.062, 0.018, c); }
    for (const [x, z, ry] of [[0, 0.088, 0], [0, -0.088, 0], [0.088, 0, Math.PI / 2], [-0.088, 0, Math.PI / 2]]) { const a = M(g, new THREE.TorusGeometry(0.068, 0.004, 4, 16, Math.PI), c, x, 0.0, z); a.rotation.y = ry; a.scale.y = 0.85; }
    legs(g, 0.075, 0.062, 0.12, c, 0.008, 0);
    box(g, 0.15, 0.014, 0.15, c, 0, 0.12); box(g, 0.152, 0.004, 0.152, '#a88c68', 0, 0.134);   // 1st platform
    legs(g, 0.05, 0.036, 0.13, c, 0.012, 0.134);
    box(g, 0.085, 0.01, 0.085, c, 0, 0.262);                                   // 2nd platform
    legs(g, 0.034, 0.008, 0.25, c, 0.009, 0.272);
    box(g, 0.022, 0.016, 0.022, c, 0, 0.52); cyl(g, 0.002, 0.005, 0.07, c, 0, 0.536, 0, 6); // top and antenna
  },
  'Arc de Triomphe'(g, c = '#d9cdb2') {
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const r = box(g, 0.012, 0.002, 0.42, '#a3a49e', 0, 0, 0); r.rotation.y = a; for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const d = 0.14 + k * 0.025; tree(g, Math.sin(a) * d + Math.cos(a) * s * 0.012, Math.cos(a) * d - Math.sin(a) * s * 0.012, 0.8); } } // Place de l'Étoile and its tree-lined avenues
    M(g, new THREE.CircleGeometry(0.12, 24).rotateX(-Math.PI / 2), '#cfc4ae', 0, 0.003, 0);
    box(g, 0.1, 0.1, 0.045, c, 0, 0.003);
    arch(g, 0.04, 0.07, '#3d3a33', 0, 0.003, 0.0228, 0, false);                 // great arch (front and back)
    arch(g, 0.04, 0.07, '#3d3a33', 0, 0.003, -0.0248, 0, false);
    for (const s of [-1, 1]) arch(g, 0.018, 0.04, '#3d3a33', s * 0.0508, 0.003, 0.0, Math.PI / 2 * s, false); // side arches
    box(g, 0.104, 0.012, 0.049, '#cbbf9f', 0, 0.09); box(g, 0.1, 0.006, 0.045, c, 0, 0.102);
    for (const s of [-1, 1]) for (const z of [-1, 1]) box(g, 0.022, 0.03, 0.002, '#bfb291', s * 0.034, 0.03, z * 0.0235); // relief sculptures
  },
  'Louvre Pyramid'(g) {
    const S = '#d8c7a2';
    box(g, 0.5, 0.003, 0.4, '#d6cfbf', 0, 0, 0);
    box(g, 0.44, 0.06, 0.05, S, 0, 0, -0.17); for (const s of [-1, 1]) box(g, 0.05, 0.06, 0.3, S, s * 0.2, 0, -0.03); // Richelieu & Denon wings
    for (const [w, z] of [[0.44, -0.145]]) windows(g, 14, w, 0.025, z, '#4d5866', 0.01, 0.02);
    box(g, 0.44, 0.012, 0.052, '#5b6b7a', 0, 0.06, -0.17);                   // mansard roofs
    for (const s of [-1, 1]) box(g, 0.052, 0.012, 0.3, '#5b6b7a', s * 0.2, 0.06, -0.03);
    for (const [x, z] of [[0, 0.05], [0.09, 0.05], [-0.09, 0.05]]) water(g, 0.05, 0.05, x, z + 0.06); // fountains
    const p = M(g, new THREE.ConeGeometry(0.055, 0.06, 4), '#9fd3f0', 0, 0.033, 0.03, { transparent: true, opacity: 0.7, metalness: 0.3, roughness: 0.15 }); p.rotation.y = Math.PI / 4;
    for (let i = 0; i < 4; i++) { const r = box(g, 0.0015, 0.083, 0.0015, '#5b6b7a', Math.cos(i * Math.PI / 2 + Math.PI / 4) * 0.027, 0.003, 0.03 + Math.sin(i * Math.PI / 2 + Math.PI / 4) * 0.027); r.rotation.set(Math.sin(i * Math.PI / 2 + Math.PI / 4) * 0.72, 0, -Math.cos(i * Math.PI / 2 + Math.PI / 4) * 0.72); } // steel ribs
    for (const x of [-0.08, 0.08]) { const s = M(g, new THREE.ConeGeometry(0.015, 0.016, 4), '#9fd3f0', x, 0.011, 0.03, { transparent: true, opacity: 0.7 }); s.rotation.y = Math.PI / 4; }
  },
  'Mont-Saint-Michel'(g) {
    water(g, 0.9, 0.9); box(g, 0.04, 0.004, 0.4, '#cdbb98', 0, 0, 0.3);        // tidal bay and causeway
    cone(g, 0.17, 0.09, '#8f8676', 0, 0, 0, 10);                              // the granite rock
    for (let i = 0; i < 4; i++) { const r = 0.15 - i * 0.03; for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 1.4 + 0.3; box(g, 0.02, 0.018, 0.014, ['#e2d8c4', '#d6cab2'][k % 2], Math.cos(a) * r, 0.01 + i * 0.022, Math.sin(a) * r * 0.8 + 0.02); box(g, 0.022, 0.008, 0.016, '#6b7d8c', Math.cos(a) * r, 0.028 + i * 0.022, Math.sin(a) * r * 0.8 + 0.02); } } // village houses
    box(g, 0.32, 0.015, 0.012, '#bfb59f', 0, 0, 0.13);                        // ramparts
    box(g, 0.08, 0.05, 0.05, '#d9d0bd', 0, 0.09);                             // abbey
    box(g, 0.03, 0.04, 0.03, '#d9d0bd', 0, 0.14); cone(g, 0.016, 0.07, '#6b7d8c', 0, 0.18, 0, 8); cyl(g, 0.0008, 0.0008, 0.012, '#d8b24a', 0, 0.25, 0, 4); // spire and St Michael
  },
  'Big Ben'(g, c = '#c9a86b') {
    water(g, 0.6, 0.12, 0, 0.12); ground(g, 0.6, 0.2, '#cfc6ae');            // Thames embankment
    box(g, 0.45, 0.06, 0.07, c, -0.17, 0, -0.04);                            // Palace of Westminster
    for (let i = 0; i < 9; i++) { box(g, 0.006, 0.08, 0.006, '#bc9a5e', -0.37 + i * 0.05, 0, -0.004); cone(g, 0.005, 0.016, '#4d5a5a', -0.37 + i * 0.05, 0.08, -0.004, 4); }
    windows(g, 18, 0.45, 0.03, -0.004, '#6a5a3a', 0.006, 0.02);
    box(g, 0.04, 0.2, 0.04, c, 0.08, 0, -0.04);                              // Elizabeth Tower
    for (let y = 0.02; y < 0.2; y += 0.025) box(g, 0.042, 0.003, 0.042, '#b8975a', 0.08, y, -0.04);
    box(g, 0.048, 0.045, 0.048, '#d9bd84', 0.08, 0.2, -0.04);
    for (const [x, z, r] of [[0.08, -0.0155, 0], [0.1045, -0.04, Math.PI / 2]]) { const f = M(g, new THREE.CircleGeometry(0.016, 20), '#fffbe8', x, 0.222, z, { side: THREE.DoubleSide }); f.rotation.y = r; }
    box(g, 0.04, 0.03, 0.04, '#cdb07a', 0.08, 0.245, -0.04);
    const sp = cone(g, 0.03, 0.07, '#3f5a4e', 0.08, 0.275, -0.04, 4); sp.rotation.y = Math.PI / 4;
    box(g, 0.1, 0.1, 0.06, c, -0.42, 0, -0.04); for (const s of [-1, 1]) cone(g, 0.006, 0.02, '#4d5a5a', -0.42 + s * 0.045, 0.1, -0.012, 4); // Victoria Tower
  },
  'Tower Bridge'(g) {
    water(g, 1.6, 0.4);
    const S = '#cfc6b4', B = '#3e6f9e';
    for (const x of [-0.09, 0.09]) {
      box(g, 0.05, 0.02, 0.05, '#9a9384', x, 0); box(g, 0.04, 0.16, 0.04, S, x, 0.02);
      for (const dx of [-1, 1]) for (const dz of [-1, 1]) { cyl(g, 0.006, 0.006, 0.17, S, x + dx * 0.018, 0.02, dz * 0.018, 8); cone(g, 0.007, 0.02, '#6b7d8c', x + dx * 0.018, 0.19, dz * 0.018, 8); }
      const top = cone(g, 0.03, 0.04, '#6b7d8c', x, 0.18, 0, 4); top.rotation.y = Math.PI / 4;
      windows(g, 2, 0.03, 0.1, 0.0205, '#3d3a33', 0.008, 0.02);
    }
    box(g, 0.14, 0.008, 0.03, B, 0, 0.05); box(g, 0.14, 0.01, 0.025, B, 0, 0.15); // bascule road and high walkways
    for (const s of [-1, 1]) {
      const span = box(g, 0.34, 0.008, 0.03, B, s * 0.28, 0.05);
      const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector3(s * (0.11 + t * 0.34), 0.15 - Math.sin(t * Math.PI / 2) * 0.1, 0)); }
      for (const z of [-0.013, 0.013]) M(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.003, 4), B, 0, 0, z); void span;
    }
  },
  'Stonehenge'(g) {
    ground(g, 0.5, 0.5, '#8fbf6c');
    M(g, new THREE.RingGeometry(0.15, 0.17, 32).rotateX(-Math.PI / 2), '#a8c98c', 0, 0.004, 0); // the ditch and bank
    const S = '#8f8f88';
    for (let i = 0; i < 30; i++) { const a = (i / 30) * Math.PI * 2; if (i % 7 === 3) continue; const s = box(g, 0.012, 0.042, 0.007, S, Math.cos(a) * 0.1, 0, Math.sin(a) * 0.1); s.rotation.y = -a; } // sarsen circle
    for (let i = 0; i < 30; i += 2) { const a = ((i + 0.5) / 30) * Math.PI * 2; if (i % 14 === 6) continue; const l = box(g, 0.026, 0.007, 0.008, '#85857e', Math.cos(a) * 0.1, 0.042, Math.sin(a) * 0.1); l.rotation.y = -a + Math.PI / 2; } // lintels
    for (let k = 0; k < 5; k++) { const a = Math.PI * 0.2 + (k / 4) * Math.PI * 0.9; const x = Math.cos(a) * 0.05, z = Math.sin(a) * 0.04; box(g, 0.009, 0.06 + (k === 2 ? 0.012 : 0), 0.006, S, x - 0.01, 0, z); box(g, 0.009, 0.06, 0.006, S, x + 0.01, 0, z); box(g, 0.03, 0.008, 0.008, '#85857e', x, 0.06 + (k === 2 ? 0.012 : 0), z); } // trilithon horseshoe
    for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; box(g, 0.005, 0.02, 0.004, '#6f7a85', Math.cos(a) * 0.075, 0, Math.sin(a) * 0.075); } // bluestones
    box(g, 0.012, 0.03, 0.008, S, 0, 0, 0.2);                                // Heel Stone
  },
  'Leaning Tower of Pisa'(g) {
    ground(g, 0.6, 0.45, '#7fbf5a');
    const W = '#f1ece0', W2 = '#e3dccb';
    const cath = G(g, -0.2, 0, 0.05);                                         // Duomo
    box(cath, 0.2, 0.06, 0.06, W2); box(cath, 0.06, 0.06, 0.16, W2); dome(cath, 0.022, W, 0, 0.06, 0); for (let i = 0; i < 6; i++) box(cath, 0.205, 0.003, 0.062, '#cfc6b4', 0, 0.01 + i * 0.009);
    cyl(g, 0.045, 0.05, 0.05, W2, -0.42, 0, 0.05, 20); dome(g, 0.04, '#d0503a', -0.42, 0.05, 0.05, 0.8); // Baptistery
    const t = G(g, 0.1, 0, 0.05); t.rotation.z = -0.07;                       // the tower, leaning ~4°
    cyl(t, 0.034, 0.034, 0.04, W, 0, 0, 0, 20);
    for (let i = 0; i < 6; i++) { const y = 0.04 + i * 0.03; cyl(t, 0.032, 0.032, 0.028, W2, 0, y, 0, 20); cyl(t, 0.036, 0.036, 0.003, W, 0, y + 0.027, 0, 20); for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; cyl(t, 0.0012, 0.0012, 0.026, W, Math.cos(a) * 0.035, y, Math.sin(a) * 0.035, 4); } }
    cyl(t, 0.022, 0.022, 0.03, W, 0, 0.22, 0, 16); cyl(t, 0.024, 0.024, 0.003, W2, 0, 0.25, 0, 16); // belfry
  },
  'Parthenon'(g) {
    cone(g, 0.32, 0.08, '#b7a88f', 0, 0, 0, 9); box(g, 0.34, 0.004, 0.24, '#cfc3a8', 0, 0.08, 0); // the Acropolis rock
    const P = G(g, 0, 0.084, 0), M1 = '#e8dfcc', M2 = '#d9cfb9';
    for (let i = 0; i < 3; i++) box(P, 0.24 - i * 0.008, 0.005, 0.12 - i * 0.008, M2, 0, i * 0.005);
    for (let i = 0; i < 8; i++) for (const z of [-0.052, 0.052]) cyl(P, 0.0045, 0.0055, 0.07, M1, -0.098 + i * 0.028, 0.015, z, 10); // 8 columns front and back
    for (let i = 1; i < 16; i++) for (const s of [-1, 1]) cyl(P, 0.0045, 0.0055, 0.07, M1, -0.105 + i * 0.0131, 0.015, s * 0.052, 8);
    box(P, 0.215, 0.012, 0.115, M1, 0, 0.085);                                // entablature
    box(P, 0.12, 0.012, 0.115, '#cbbf9f', 0.05, 0.097);                       // partly ruined roof line
    const ped = M(P, new THREE.CylinderGeometry(0.024, 0.024, 0.115, 3), M1, -0.085, 0.108, 0); ped.rotation.x = Math.PI / 2; ped.rotation.z = Math.PI / 2; ped.scale.set(1, 1, 0.5);
    box(g, 0.05, 0.03, 0.03, '#d9cfb9', 0.15, 0.084, 0.08);                   // Erechtheion
    for (let i = 0; i < 3; i++) cyl(g, 0.003, 0.003, 0.025, '#e8dfcc', 0.135 + i * 0.012, 0.084, 0.1, 6);
  },
  'Sagrada Família'(g) {
    ground(g, 0.35, 0.35, '#cfc4ae');
    const S = '#c9b48a', S2 = '#b9a174';
    box(g, 0.2, 0.08, 0.12, S); box(g, 0.08, 0.08, 0.2, S);
    windows(g, 6, 0.2, 0.03, 0.061, '#7fb6d9', 0.012, 0.035);
    const spire = (x, z, h, r, top = S2) => { lathe(g, [[0, 0], [r, 0], [r * 0.9, h * 0.6], [r * 0.6, h * 0.85], [0.0001, h]], top, x, 0, z, 12); for (let k = 1; k < 6; k++) cyl(g, r * (1 - k * 0.12) + 0.001, r * (1 - k * 0.12) + 0.001, 0.002, '#a88f62', x, h * k * 0.13, z, 12); };
    for (const s of [-1, 1]) for (const d of [-0.025, 0.025]) { spire(s * 0.07 + d, 0.07, 0.24, 0.012); spire(s * 0.07 + d, -0.07, 0.22, 0.012); } // Nativity and Passion facades
    for (const d of [-0.025, 0.025]) { spire(-0.09, d, 0.2, 0.011); spire(0.09, d, 0.2, 0.011); }
    spire(0, 0, 0.38, 0.022, '#d9c9a4');                                     // tower of Jesus Christ (with cross)
    box(g, 0.003, 0.025, 0.003, '#f0e6d0', 0, 0.38); box(g, 0.016, 0.003, 0.003, '#f0e6d0', 0, 0.395);
    for (const [x, z] of [[0.035, 0.035], [-0.035, 0.035], [0.035, -0.035], [-0.035, -0.035]]) spire(x, z, 0.3, 0.014, '#d0bf98'); // evangelists
    for (const s of [-1, 1]) for (const d of [-1, 1]) sph(g, 0.004, ['#e2533a', '#f6c445', '#3b8fd0', '#2fa65a'][(s + 1 + d + 1) % 4], s * 0.07 + d * 0.025, 0.245, 0.07, 6); // colourful pinnacles
  },
  'Alhambra'(g) {
    cone(g, 0.45, 0.06, '#7a9a55', 0, 0, 0, 9); box(g, 0.5, 0.004, 0.3, '#c9a37a', 0, 0.06, 0);
    const R = '#c8875f', R2 = '#b9764f';
    for (const [w, d, x, z] of [[0.5, 0.02, 0, 0.15], [0.5, 0.02, 0, -0.15], [0.02, 0.3, 0.25, 0], [0.02, 0.3, -0.25, 0]]) box(g, w, 0.04, d, R2, x, 0.06, z); // walls
    for (const [x, z] of [[0.25, 0.15], [-0.25, 0.15], [0.25, -0.15], [-0.25, -0.15], [0, 0.15], [0.12, -0.15]]) box(g, 0.035, 0.07, 0.035, R, x, 0.06, z); // towers
    box(g, 0.07, 0.11, 0.07, R, -0.2, 0.06, 0);                              // Torre de la Vela (Alcazaba)
    const pal = G(g, 0.05, 0.064, 0);                                        // Nasrid palaces: Court of the Lions
    box(pal, 0.16, 0.035, 0.012, '#ead9bd', 0, 0, -0.05); box(pal, 0.16, 0.035, 0.012, '#ead9bd', 0, 0, 0.05);
    for (let i = 0; i < 12; i++) for (const z of [-0.042, 0.042]) cyl(pal, 0.0015, 0.0015, 0.022, '#f4ead6', -0.07 + i * 0.0127, 0, z, 6);
    water(pal, 0.006, 0.08); cyl(pal, 0.008, 0.01, 0.006, '#f4ead6', 0, 0, 0, 12);
    box(pal, 0.13, 0.004, 0.06, '#5a8a5a', 0, 0.035, 0);
    for (let i = 0; i < 8; i++) M(g, new THREE.ConeGeometry(0.006, 0.05, 6), '#2f5d34', -0.2 + i * 0.05, 0.085, 0.18); // cypress of the Generalife
  },
  'Brandenburg Gate'(g, c = '#d8c9a3') {
    box(g, 0.5, 0.003, 0.3, '#cfc6b4', 0, 0, 0);
    box(g, 0.13, 0.008, 0.035, c, 0, 0);
    for (let i = 0; i < 6; i++) { cyl(g, 0.004, 0.0045, 0.06, c, -0.055 + i * 0.022, 0.008, 0.012, 10); cyl(g, 0.004, 0.0045, 0.06, c, -0.055 + i * 0.022, 0.008, -0.012, 10); }
    for (let i = 0; i < 5; i++) box(g, 0.004, 0.06, 0.03, '#cbbb93', -0.044 + i * 0.022, 0.008, 0);
    box(g, 0.13, 0.012, 0.036, c, 0, 0.068); box(g, 0.08, 0.012, 0.03, '#cbbb93', 0, 0.08);
    const q = G(g, 0, 0.092, 0); box(q, 0.02, 0.006, 0.012, '#5f8f7a'); for (const d of [-0.006, -0.002, 0.002, 0.006]) box(q, 0.003, 0.008, 0.008, '#5f8f7a', d, 0.006, 0.006); // the Quadriga
    for (const s of [-1, 1]) box(g, 0.035, 0.05, 0.03, c, s * 0.09, 0, 0);    // guardhouses
  },
  'Neuschwanstein Castle'(g) {
    cone(g, 0.35, 0.16, '#5f8f4f', 0, 0, 0, 9); cone(g, 0.4, 0.3, '#4f7f45', -0.2, 0, -0.35, 8); // the crag and Alps
    cone(g, 0.12, 0.14, '#e9eef3', -0.2, 0.18, -0.35, 8);
    const W = '#f2efe8', B = '#4a6fa8', y = 0.16;
    box(g, 0.14, 0.07, 0.04, W, 0, y, 0); windows(g, 7, 0.14, y + 0.03, 0.021, '#5b6b7a', 0.006, 0.014);
    box(g, 0.14, 0.012, 0.04, B, 0, y + 0.07);
    const pal = cone(g, 0.04, 0.03, B, 0.05, y + 0.07, 0, 4); pal.rotation.y = Math.PI / 4;
    const tower = (x, z, h, r) => { cyl(g, r, r, h, W, x, y, z, 12); cone(g, r * 1.25, r * 3, B, x, y + h, z, 12); };
    tower(-0.075, 0.015, 0.11, 0.014); tower(-0.05, -0.02, 0.15, 0.01); tower(0.075, 0.015, 0.09, 0.012); tower(0.03, -0.025, 0.12, 0.009); tower(-0.02, 0.025, 0.08, 0.007);
    box(g, 0.05, 0.05, 0.03, '#e8d9c4', 0.11, y - 0.02, 0.05);               // gatehouse (reddish)
  },
  "St Basil's Cathedral"(g) {
    box(g, 0.45, 0.003, 0.4, '#b9b3a7', 0, 0, 0);                           // Red Square cobbles
    box(g, 0.2, 0.035, 0.2, '#b5462f'); for (let i = 0; i < 8; i++) box(g, 0.21, 0.003, 0.21, '#e8d9c4', 0, 0.006 + i * 0.004);
    cyl(g, 0.025, 0.03, 0.11, '#c9583e', 0, 0.035, 0, 8); cone(g, 0.03, 0.06, '#d6b24a', 0, 0.145, 0, 8); onion(g, 0.01, '#e9c547', 0, 0.205, 0, 10); // central tented tower
    const domes = [['#3b8fd0', '#f6c445'], ['#2fa65a', '#e2533a'], ['#e2533a', '#2fa65a'], ['#f6c445', '#3b8fd0'], ['#2fa65a', '#f6c445'], ['#e2533a', '#3b8fd0'], ['#3b8fd0', '#2fa65a'], ['#f6c445', '#e2533a']];
    domes.forEach(([a, b], i) => {
      const ang = (i / 8) * Math.PI * 2, r = i % 2 ? 0.065 : 0.075, h = i % 2 ? 0.07 : 0.085;
      const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
      cyl(g, 0.017, 0.019, h, '#d06a4c', x, 0.035, z, 8);
      const o = onion(g, 0.018, a, x, 0.035 + h, z, 12);
      for (let k = 0; k < 4; k++) { const st = M(g, new THREE.TorusGeometry(0.017, 0.0022, 4, 12), b, x, 0.035 + h + 0.008 + k * 0.006, z); st.rotation.x = Math.PI / 2; st.scale.setScalar(1 - k * 0.15); } void o;
    });
    cyl(g, 0.016, 0.018, 0.09, '#d06a4c', 0.12, 0, 0.08, 8); cone(g, 0.018, 0.04, '#2fa65a', 0.12, 0.09, 0.08, 8); // bell tower
  },
  'Hagia Sophia'(g, c = '#e7b9a0') {
    box(g, 0.45, 0.003, 0.45, '#cfc6b4', 0, 0, 0);
    box(g, 0.16, 0.06, 0.18, c); box(g, 0.2, 0.04, 0.12, c, 0, 0, 0);
    for (const s of [-1, 1]) box(g, 0.03, 0.08, 0.05, '#d9a78c', s * 0.095, 0, s * 0.06); // buttresses
    cyl(g, 0.055, 0.058, 0.02, c, 0, 0.06, 0, 40);
    for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; box(g, 0.004, 0.006, 0.002, '#3b4a5a', Math.cos(a) * 0.057, 0.067, Math.sin(a) * 0.057).rotation.y = -a; } // ring of windows
    dome(g, 0.058, '#7d8a8c', 0, 0.08, 0, 0.55, 24);                           // great dome (lead-grey)
    for (const s of [-1, 1]) dome(g, 0.04, '#7d8a8c', 0, 0.06, s * 0.07, 0.6, 16); // semi-domes
    for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { cyl(g, 0.006, 0.008, 0.16, '#efe9de', x * 0.12, 0, z * 0.12, 10); cyl(g, 0.009, 0.009, 0.004, '#efe9de', x * 0.12, 0.11, z * 0.12, 10); cone(g, 0.007, 0.04, '#6b7d8c', x * 0.12, 0.16, z * 0.12, 10); } // four Ottoman minarets
  },
};
