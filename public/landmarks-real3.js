// True-to-life models: East & South-East Asia, Oceania and the Americas.
import { THREE, M, box, cyl, cone, sph, dome, lathe, G, arch, ground, water, tree, windows, legs } from './lm-kit.js';

const glass = { metalness: 0.45, roughness: 0.25 };
// Chinese hall: platform, red columns, yellow-tiled hip roof with upturned eaves
function hall(g, w, d, h, x, z, roof = '#e8b93a', double = false) {
  const n = G(g, x, 0, z);
  box(n, w * 1.15, h * 0.25, d * 1.2, '#efe9de');
  box(n, w, h * 0.55, d, '#b8312a', 0, h * 0.25);
  for (let i = 0; i < 7; i++) box(n, 0.003, h * 0.55, 0.003, '#8a2420', -w / 2 + (i + 0.5) * (w / 7), h * 0.25, d / 2 + 0.002);
  const r = (y, s) => { const p = M(n, new THREE.ConeGeometry(1, 1, 4), roof, 0, y, 0); p.rotation.y = Math.PI / 4; p.scale.set(w * 0.78 * s, h * 0.45, d * 0.85 * s); };
  r(h * 0.8 + h * 0.22, 1); if (double) { box(n, w * 0.7, h * 0.18, d * 0.7, '#b8312a', 0, h * 1.0); r(h * 1.18 + h * 0.2, 0.75); }
  return n;
}
// Khmer / Javanese tower: stacked shrinking tiers ending in a lotus bud
function prang(g, x, z, h, r, c) { const n = G(g, x, 0, z); for (let i = 0; i < 6; i++) { const t = i / 6; cyl(n, r * (1 - t * 0.7), r * (1 - t * 0.6), h / 7, c, 0, t * h * 0.85, 0, 8); } cone(n, r * 0.3, h * 0.2, c, 0, h * 0.85, 0, 8); return n; }

export const REAL3 = {
  // =============================================================== EAST & SOUTH-EAST ASIA
  'Forbidden City'(g) {
    water(g, 0.86, 0.9); box(g, 0.78, 0.004, 0.82, '#d9cfbb', 0, 0.002, 0);   // the moat
    const W = '#b8312a';
    for (const [w, d, x, z] of [[0.78, 0.02, 0, 0.4], [0.78, 0.02, 0, -0.4], [0.02, 0.8, 0.38, 0], [0.02, 0.8, -0.38, 0]]) box(g, w, 0.04, d, W, x, 0, z);
    for (const [x, z] of [[0.38, 0.4], [-0.38, 0.4], [0.38, -0.4], [-0.38, -0.4]]) hall(g, 0.05, 0.05, 0.05, x, z, '#e8b93a', true); // corner towers
    const mer = G(g, 0, 0, 0.4); box(mer, 0.3, 0.06, 0.05, W); hall(mer, 0.13, 0.04, 0.06, 0, 0, '#e8b93a', true).position.y = 0.06; // Meridian Gate
    for (const s of [-1, 1]) hall(mer, 0.04, 0.035, 0.04, s * 0.12, -0.04).position.y = 0.06;
    hall(g, 0.12, 0.05, 0.05, 0, 0.22);                                         // Gate of Supreme Harmony
    box(g, 0.24, 0.004, 0.2, '#e8e3d6', 0, 0.002, 0.06);                       // great courtyard
    for (const s of [-1, 1]) box(g, 0.02, 0.03, 0.2, W, s * 0.13, 0, 0.06);
    const hs = hall(g, 0.2, 0.09, 0.08, 0, -0.04, '#e8b93a', true);            // Hall of Supreme Harmony on its marble terraces
    for (let i = 0; i < 3; i++) box(hs, 0.27 - i * 0.02, 0.008, 0.15 - i * 0.012, '#f4f1ea', 0, -0.024 + i * 0.008).position.y -= 0.0;
    hall(g, 0.08, 0.06, 0.05, 0, -0.14); hall(g, 0.15, 0.07, 0.06, 0, -0.22);
    for (let i = 0; i < 6; i++) for (const s of [-1, 1]) hall(g, 0.09, 0.06, 0.035, s * 0.25, -0.3 + i * 0.11);
    for (let i = 0; i < 10; i++) tree(g, -0.1 + (i % 5) * 0.05, -0.33 + Math.floor(i / 5) * 0.04, 1.5);
  },
  'Mount Fuji'(g) {
    // a near-perfect concave cone with a snow cap ridged by gullies, and Lake Kawaguchi at its foot
    lathe(g, [[0, 0], [5.2, 0], [3.6, 0.35], [2.2, 1.0], [1.2, 1.9], [0.6, 2.6], [0.38, 2.85], [0.0001, 2.8]], '#5d6f7f', 0, 0, 0, 24);
    lathe(g, [[0, 0], [5.25, 0], [4.4, 0.18], [3.4, 0.4], [0.0001, 0.4]], '#4f7f45', 0, 0, 0, 24);   // forests of Aokigahara
    lathe(g, [[0.0001, 1.8], [1.32, 1.8], [1.2, 1.9], [0.6, 2.6], [0.38, 2.86], [0.0001, 2.82]], '#f7fafc', 0, 0, 0, 24);
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const s = box(g, 0.06, 0.02, 0.5 + (i % 3) * 0.15, '#f7fafc', Math.cos(a) * 1.45, 1.62, Math.sin(a) * 1.45); s.rotation.y = -a + Math.PI / 2; s.rotation.x = 0.0; } // snow streaks
    cyl(g, 0.3, 0.32, 0.03, '#8a8a8f', 0, 2.82, 0, 16);                       // summit crater
    const lake = M(g, new THREE.CircleGeometry(1, 20), '#4ea3d6', 3.2, 0.42, 3.4); lake.rotation.x = -Math.PI / 2; lake.scale.set(1.3, 0.5, 1);
    const pag = G(g, 4.2, 0.42, 4.2); for (let i = 0; i < 5; i++) { box(pag, 0.07 - i * 0.01, 0.03, 0.07 - i * 0.01, '#d6453a', 0, i * 0.045); box(pag, 0.11 - i * 0.012, 0.008, 0.11 - i * 0.012, '#3a3a3a', 0, i * 0.045 + 0.03); } // Chureito Pagoda
    for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2 + 0.2; sph(g, 0.2, i % 4 ? '#3f6f3a' : '#f2a9c0', Math.cos(a) * 4.6, 0.5, Math.sin(a) * 4.6, 6); }
  },
  'Tokyo Tower'(g) {
    ground(g, 0.4, 0.4, '#cfc6b4');
    const O = '#e8553e', Wt = '#f4f6f8';
    box(g, 0.2, 0.05, 0.2, '#e8e3d6');                                          // FootTown base building
    windows(g, 9, 0.2, 0.02, 0.101, '#7fb6d9', 0.012, 0.02);
    // lattice tower in bands of international orange and white
    const bands = [[0.08, 0.06, 0.06, O], [0.06, 0.045, 0.06, Wt], [0.045, 0.033, 0.06, O], [0.033, 0.024, 0.055, Wt], [0.024, 0.016, 0.055, O]];
    let y = 0.05;
    for (const [b, t, h, c] of bands) { legs(g, b, t, h, c, 0.007, y); y += h; }
    box(g, 0.05, 0.022, 0.05, Wt, 0, 0.2); windows(G(g, 0, 0, 0), 4, 0.05, 0.205, 0.0255, '#7fb6d9', 0.008, 0.012); // Main Deck
    const bands2 = [[0.016, 0.01, 0.06, Wt], [0.01, 0.007, 0.06, O], [0.007, 0.004, 0.05, Wt]];
    y = 0.33; for (const [b, t, h, c] of bands2) { legs(g, b, t, h, c, 0.004, y); y += h; }
    box(g, 0.022, 0.012, 0.022, Wt, 0, 0.36);                                   // Top Deck
    cyl(g, 0.0015, 0.003, 0.08, O, 0, y, 0, 6);
  },
  'Angkor Wat'(g) {
    water(g, 1.0, 1.0);                                                          // the vast moat
    box(g, 0.82, 0.006, 0.82, '#8fae62', 0, 0.002, 0);
    box(g, 0.02, 0.008, 0.2, '#a89a80', 0, 0, 0.45);                           // causeway west
    const S = '#9c8f78', S2 = '#8a7d66';
    box(g, 0.5, 0.025, 0.42, S, 0, 0.006); for (let i = 0; i < 24; i++) for (const z of [-1, 1]) box(g, 0.012, 0.016, 0.002, '#6b5f4c', -0.23 + i * 0.02, 0.012, z * 0.211); // third gallery
    box(g, 0.34, 0.03, 0.3, S2, 0, 0.031);                                      // second gallery
    box(g, 0.22, 0.04, 0.2, S, 0, 0.061);                                       // first, highest terrace
    for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) prang(g, x * 0.09, z * 0.08, 0.12, 0.022, S2).position.y = 0.1;
    prang(g, 0, 0, 0.17, 0.03, S).position.y = 0.1;                              // central lotus tower
    for (const s of [-1, 1]) { box(g, 0.05, 0.02, 0.02, S2, s * 0.06, 0.006, 0.36); }  // libraries
    box(g, 0.2, 0.02, 0.02, S2, 0, 0.006, 0.41); prang(g, 0, 0.41, 0.05, 0.012, S2).position.y = 0.026; // entrance gopura
    for (const s of [-1, 1]) water(G(g, s * 0.07, 0.007, 0.3), 0.06, 0.04);
    for (let i = 0; i < 14; i++) tree(g, -0.38 + (i % 7) * 0.12, i < 7 ? 0.32 : -0.34, 2.3);
  },
  'Shwedagon Pagoda'(g) {
    ground(g, 0.7, 0.7, '#7fbf5a');
    box(g, 0.44, 0.04, 0.44, '#e8e3d6');                                       // Singuttara Hill platform
    const Gd = '#e8b93a', Gd2 = '#d9a42a';
    lathe(g, [[0.0001, 0], [0.13, 0], [0.13, 0.018], [0.115, 0.018], [0.115, 0.034], [0.1, 0.034], [0.1, 0.048], [0.085, 0.06], [0.07, 0.1], [0.055, 0.14], [0.04, 0.155], [0.03, 0.17], [0.024, 0.2], [0.016, 0.24], [0.008, 0.27], [0.0001, 0.29]], Gd, 0, 0.04, 0, 24); // terraces, bell, lotus, banana bud
    for (let i = 0; i < 4; i++) cyl(g, 0.03 - i * 0.004, 0.03 - i * 0.004, 0.004, Gd2, 0, 0.18 + i * 0.012, 0, 16);
    cone(g, 0.008, 0.03, '#f6f3ec', 0, 0.33, 0, 8); sph(g, 0.003, '#bfe6ff', 0, 0.36, 0, 6); // the hti umbrella and diamond orb
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const r = 0.15; cone(g, 0.012, 0.05, Gd, Math.cos(a) * r, 0.04, Math.sin(a) * r, 8); } // ring of small stupas
    for (const [x, z] of [[0.2, 0], [-0.2, 0], [0, 0.2], [0, -0.2]]) { const t = G(g, x, 0.04, z); for (let i = 0; i < 5; i++) box(t, 0.04 - i * 0.007, 0.012, 0.04 - i * 0.007, i % 2 ? '#c0503a' : Gd, 0, i * 0.012); } // tiered shrines
    for (const [x, z] of [[0, 0.3], [0.3, 0]]) { const st = box(g, 0.03, 0.03, 0.12, '#f2ede2', x, 0, z); if (x) st.rotation.y = Math.PI / 2; cone(g, 0.014, 0.04, Gd, x, 0.03, z, 4); } // covered stairways
  },
  Borobudur(g, c = '#8d8579') {
    ground(g, 0.8, 0.8, '#6f9a4a'); for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; tree(g, Math.cos(a) * 0.36, Math.sin(a) * 0.36, 3); }
    // six square terraces with relief galleries, three circular terraces of 72 latticed stupas, one great stupa
    for (let i = 0; i < 6; i++) { const w = 0.42 - i * 0.045; box(g, w, 0.02, w, i % 2 ? '#7f7769' : c, 0, i * 0.02); for (const s of [-1, 1]) for (let k = 0; k < 7; k++) { cone(g, 0.004, 0.01, c, -w / 2 + (k + 0.5) * (w / 7), (i + 1) * 0.02, s * w / 2, 5); cone(g, 0.004, 0.01, c, s * w / 2, (i + 1) * 0.02, -w / 2 + (k + 0.5) * (w / 7), 5); } }
    for (const [x, z, ry] of [[0, 0.2, 0], [0, -0.2, 0], [0.2, 0, 1], [-0.2, 0, 1]]) { const st = box(g, 0.02, 0.12, 0.08, '#7a7264', x, 0, z); st.rotation.y = ry * Math.PI / 2; } // stairways up each side
    const y0 = 0.12;
    for (const [r, n] of [[0.095, 32], [0.07, 24], [0.045, 16]]) {
      cyl(g, r + 0.012, r + 0.012, 0.012, c, 0, y0 + (0.095 - r) * 0.5, 0, 32);
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; const x = Math.cos(a) * r, z = Math.sin(a) * r, y = y0 + (0.095 - r) * 0.5 + 0.012; M(g, new THREE.SphereGeometry(0.008, 6, 5, 0, Math.PI * 2, 0, Math.PI / 1.6), '#7f7769', x, y, z, { wireframe: false }).scale.y = 1.3; cyl(g, 0.0012, 0.002, 0.006, c, x, y + 0.008, z, 4); }
    }
    dome(g, 0.03, c, 0, 0.17, 0, 1.1, 14); cyl(g, 0.005, 0.008, 0.02, c, 0, 0.2, 0, 8); cone(g, 0.004, 0.012, c, 0, 0.22, 0, 6);
  },
  'Petronas Towers'(g) {
    ground(g, 0.6, 0.6, '#7fbf5a'); water(g, 0.2, 0.1, 0, 0.2);                // KLCC park lake
    const S = '#d2d9e0';
    const tower = (x) => {
      const n = G(g, x, 0, 0);
      // 8-pointed Islamic star plan, shrinking setbacks, pinnacle
      const tiers = [[0.035, 0.24], [0.031, 0.05], [0.027, 0.04], [0.022, 0.035], [0.017, 0.03], [0.012, 0.025]];
      let y = 0;
      for (const [r, h] of tiers) { for (const a of [0, Math.PI / 4]) { const b = box(n, r * 1.4, h, r * 1.4, S, 0, y); b.rotation.y = a; b.material = b.material.clone(); b.material.metalness = 0.6; b.material.roughness = 0.3; } cyl(n, r * 0.98, r * 0.98, h, '#b9c3cc', 0, y, 0, 16); for (let k = 0; k < Math.floor(h / 0.012); k++) cyl(n, r * 1.02, r * 1.02, 0.002, '#8fa2b4', 0, y + k * 0.012, 0, 16); y += h; }
      cyl(n, 0.006, 0.01, 0.04, S, 0, y, 0, 8); cyl(n, 0.0012, 0.004, 0.07, '#e6edf3', 0, y + 0.04, 0, 6);
      return n;
    };
    tower(-0.055); tower(0.055);
    box(g, 0.06, 0.008, 0.012, '#9fb0c0', 0, 0.17); for (const s of [-1, 1]) { const l = box(g, 0.003, 0.05, 0.003, '#9fb0c0', s * 0.015, 0.125); l.rotation.z = s * 0.5; } // Skybridge
    box(g, 0.28, 0.035, 0.12, '#cfd6dd', 0, 0, 0.08);                          // Suria KLCC mall
  },
  'Marina Bay Sands'(g) {
    water(g, 1.0, 0.6, 0, 0.3); ground(G(g, 0, 0, -0.25), 1.0, 0.5, '#8fbf6a');
    const S = '#dfe5ea';
    for (const x of [-0.12, 0, 0.12]) {
      // each tower is two curving legs that lean together
      for (const s of [-1, 1]) { const l = box(g, 0.05, 0.27, 0.025, S, x, 0, s * 0.02); l.rotation.x = -s * 0.07; l.material = l.material.clone(); l.material.metalness = 0.4; }
      windows(G(g, x, 0, 0.0), 1, 0.05, 0.0, 0.045, '#8fb3cc', 0.046, 0.25);
    }
    // the SkyPark ship across the three towers, cantilevered at the north end, with its infinity pool
    const sp = G(g, 0.02, 0.27, 0); box(sp, 0.38, 0.016, 0.06, '#e8ecef'); box(sp, 0.3, 0.003, 0.02, '#3fb8e8', -0.03, 0.016, 0.015);
    for (let i = 0; i < 12; i++) tree(sp, -0.16 + i * 0.026, -0.015, 0.6);
    box(g, 0.34, 0.03, 0.12, '#cfd6dd', 0, 0, 0.1);                           // podium
    const lotus = G(g, -0.22, 0, 0.2); for (let i = 0; i < 10; i++) { const p = cone(lotus, 0.012, 0.05, '#f4f6f8', Math.cos(i) * 0.02, 0, Math.sin(i) * 0.02, 4); p.rotation.z = Math.cos(i) * 0.4; p.rotation.x = Math.sin(i) * 0.4; } // ArtScience Museum
    for (let i = 0; i < 6; i++) { const t = G(g, 0.3 + (i % 3) * 0.05, 0, -0.2 - Math.floor(i / 3) * 0.06); cyl(t, 0.003, 0.004, 0.06 + i * 0.01, '#8a8f96', 0, 0, 0, 6); cone(t, 0.02, 0.025, '#6f9bc0', 0, 0.06 + i * 0.01, 0, 8); } // Supertrees
  },
  // =============================================================== OCEANIA
  'Sydney Opera House'(g) {
    water(g, 1.0, 1.0);
    box(g, 0.34, 0.035, 0.16, '#c9a77f', 0, 0, 0); box(g, 0.1, 0.035, 0.12, '#c9a77f', -0.2, 0, 0); // red granite podium on Bennelong Point
    for (let i = 0; i < 8; i++) box(g, 0.05, 0.004, 0.16, '#d9c3a0', -0.25 - i * 0.005, i * 0.004, 0);   // monumental stairs
    const W = '#fbfaf5';
    // shell vaults: tall pointed sails facing the harbour in two rows (Concert Hall, Joan Sutherland Theatre) plus the restaurant
    const shell = (x, z, h, w, lean) => { const n = G(g, x, 0.035, z); const s = M(n, new THREE.SphereGeometry(1, 12, 8, 0, Math.PI, 0, Math.PI / 2), W, 0, 0, 0); s.scale.set(w * 0.55, h, w); s.rotation.z = -lean; s.rotation.y = Math.PI / 2; for (let k = 0; k < 6; k++) { const r = M(n, new THREE.TorusGeometry(1, 0.012, 3, 10, Math.PI / 2), '#e6e1d6', 0, 0, 0); r.scale.set(w * (0.55 - k * 0.07), h * (1 - k * 0.13), 1); r.rotation.y = 0; r.rotation.z = -lean; } };
    for (const [z, sc] of [[0.035, 1], [-0.035, 0.85]]) { shell(-0.12, z, 0.13 * sc, 0.05 * sc, 0.25); shell(-0.05, z, 0.11 * sc, 0.045 * sc, 0.25); shell(0.02, z, 0.085 * sc, 0.04 * sc, 0.25); shell(0.08, z, 0.06 * sc, 0.032 * sc, 0.25); }
    shell(0.14, 0.0, 0.05, 0.025, 0.25);
    for (let i = 0; i < 2; i++) { const b = box(g, 0.05, 0.01, 0.015, '#f6c445', 0.3 + i * 0.1, 0, 0.2 + i * 0.06); void b; } // ferries
    const hb = G(g, 0.0, 0, -0.42); box(hb, 1.0, 0.006, 0.02, '#7d8a96', 0, 0.06); const arcPts = []; for (let i = 0; i <= 16; i++) { const t = i / 16; arcPts.push(new THREE.Vector3(-0.35 + t * 0.7, 0.02 + Math.sin(t * Math.PI) * 0.14, 0)); } M(hb, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arcPts), 16, 0.008, 4), '#7d8a96'); for (const s of [-1, 1]) box(hb, 0.04, 0.1, 0.04, '#c9b89a', s * 0.38, 0); // Harbour Bridge behind
  },
  Uluru(g, c = '#c4602f') {
    ground(g, 4, 4, '#d48a4a');
    // a smooth, loaf-shaped sandstone monolith with vertical fluting and caves at its base
    const u = lathe(g, [[0, 0], [1.25, 0], [1.3, 0.05], [1.2, 0.2], [1.0, 0.32], [0.6, 0.38], [0.0001, 0.39]], c, 0, 0, 0, 28); u.scale.z = 0.5;
    for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2; const r = box(g, 0.04, 0.26, 0.04, '#a84f27', Math.cos(a) * 1.18, 0.0, Math.sin(a) * 0.59); r.rotation.y = -a; r.rotation.z = Math.cos(a) * 0.4; }
    for (let i = 0; i < 30; i++) { const a = i * 2.39; const r = 1.6 + (i % 5) * 0.3; sph(g, 0.05, '#7f8a4a', Math.cos(a) * r, 0.02, Math.sin(a) * r, 5); } // spinifex and desert oaks
    for (let i = 0; i < 4; i++) { const k = lathe(g, [[0, 0], [0.25, 0], [0.2, 0.2], [0.0001, 0.24]], '#b85a2c', 2.8 + (i % 2) * 0.4, 0, -1.2 + i * 0.35, 10); k.scale.z = 0.7; } // Kata Tjuta on the horizon
  },
  'Moai of Easter Island'(g) {
    water(g, 1.2, 0.5, 0, 0.35); ground(G(g, 0, 0, -0.15), 1.2, 0.6, '#7fae58');
    // Ahu Tongariki: 15 moai standing in a row on one stone platform, backs to the sea
    box(g, 0.62, 0.02, 0.06, '#7a746c', 0, 0, 0.05);
    for (let i = 0; i < 15; i++) {
      const x = -0.28 + i * 0.04, h = 0.06 + ((i * 7) % 5) * 0.008, n = G(g, x, 0.02, 0.05, Math.PI);
      box(n, 0.022, h * 0.55, 0.016, '#6f685f');
      const head = box(n, 0.02, h * 0.45, 0.018, '#7a7369', 0, h * 0.55); void head;
      box(n, 0.022, 0.006, 0.006, '#5f5850', 0, h * 0.82, 0.01);                  // heavy brow
      box(n, 0.006, h * 0.18, 0.008, '#6f685f', 0, h * 0.6, 0.012);               // long nose
      if (i % 4 === 1) cyl(n, 0.011, 0.012, 0.012, '#a0503a', 0, h, 0, 8);        // red pukao topknot
    }
    for (let i = 0; i < 6; i++) { const r = sph(g, 0.02, '#6f685f', -0.4 + i * 0.16, 0.01, -0.12, 5); r.scale.y = 0.4; }
    lathe(g, [[0, 0], [0.5, 0], [0.4, 0.15], [0.25, 0.18], [0.0001, 0.18]], '#6f9a4a', 0.2, 0, -0.5, 10); // Rano Raraku quarry crater
  },

  // =============================================================== AMERICAS
  'Statue of Liberty'(g) {
    water(g, 1.0, 1.0);
    const st = G(g, 0, 0, 0);
    for (let i = 0; i < 11; i++) { const a = (i / 11) * Math.PI * 2; box(st, 0.07, 0.03, 0.07, '#b9b19e', Math.cos(a) * 0.1, 0, Math.sin(a) * 0.1).rotation.y = -a; } // Fort Wood's star
    box(st, 0.26, 0.002, 0.26, '#7fae58', 0, 0, 0);
    box(st, 0.08, 0.06, 0.08, '#c9b89a', 0, 0.03); box(st, 0.06, 0.06, 0.06, '#bfae90', 0, 0.09); box(st, 0.065, 0.008, 0.065, '#cdbd9f', 0, 0.15);
    const C = '#7fbfa6', C2 = '#6fae96';
    const s = G(st, 0, 0.158, 0, -0.4);
    lathe(s, [[0.0001, 0], [0.034, 0], [0.036, 0.04], [0.03, 0.1], [0.024, 0.14], [0.018, 0.16], [0.0001, 0.165]], C, 0, 0, 0, 12); // draped robe
    const head = sph(s, 0.013, C2, 0, 0.175, 0, 10); head.scale.y = 1.1;
    for (let i = 0; i < 7; i++) { const a = -Math.PI * 0.8 + (i / 6) * Math.PI * 0.9; const r = cone(s, 0.0025, 0.022, C, Math.cos(a) * 0.012, 0.183, Math.sin(a) * 0.012 - 0.0, 4); r.rotation.z = -Math.cos(a) * 1.2; r.rotation.x = Math.sin(a) * 1.2; } // crown rays
    const arm = cyl(s, 0.006, 0.007, 0.07, C, 0.016, 0.16, 0, 8); arm.rotation.z = -0.2;   // raised right arm
    cyl(s, 0.006, 0.004, 0.012, C2, 0.03, 0.225, 0, 8); cone(s, 0.007, 0.014, '#ffcf4a', 0.03, 0.237, 0, 8, ); // torch, gilded flame
    box(s, 0.016, 0.026, 0.006, C2, -0.022, 0.1, 0.018).rotation.z = 0.3;         // tablet in the left arm
    // Ellis Island ferry and Manhattan on the horizon
    box(g, 0.05, 0.012, 0.016, '#ffffff', 0.25, 0, 0.2);
    for (let i = 0; i < 16; i++) box(g, 0.03, 0.05 + ((i * 13) % 7) * 0.03, 0.03, ['#9aa7b4', '#b5bdc6', '#8592a0'][i % 3], -0.45 + i * 0.06, 0, -0.45);
  },
  'Empire State Building'(g) {
    ground(g, 0.6, 0.6, '#9aa0a6');
    const L = '#c9c2b0', L2 = '#b7b09d';
    for (let i = 0; i < 16; i++) { const x = -0.26 + (i % 4) * 0.17, z = -0.26 + Math.floor(i / 4) * 0.17; if (Math.abs(x) < 0.1 && Math.abs(z) < 0.1) continue; box(g, 0.1, 0.04 + ((i * 7) % 5) * 0.025, 0.1, ['#b5aea0', '#9aa7b4', '#c4b9a6'][i % 3], x, 0, z); }
    box(g, 0.12, 0.03, 0.08, L2);                                                  // 5-storey base
    box(g, 0.1, 0.18, 0.065, L, 0, 0.03);                                          // main shaft
    for (const s of [-1, 1]) box(g, 0.02, 0.15, 0.06, L2, s * 0.055, 0.03);         // setback wings
    for (let i = 0; i < 9; i++) box(g, 0.003, 0.18, 0.066, '#9aa6b0', -0.04 + i * 0.01, 0.03);  // vertical window strips
    box(g, 0.075, 0.025, 0.05, L, 0, 0.21); box(g, 0.055, 0.02, 0.038, L, 0, 0.235); box(g, 0.04, 0.015, 0.03, L, 0, 0.255);
    for (let i = 0; i < 3; i++) cyl(g, 0.014 - i * 0.003, 0.016 - i * 0.003, 0.014, '#d9d2bf', 0, 0.27 + i * 0.014, 0, 8); // art-deco crown
    cyl(g, 0.005, 0.008, 0.02, '#c9c2b0', 0, 0.312, 0, 8); cyl(g, 0.0012, 0.003, 0.06, '#d9dde2', 0, 0.332, 0, 6);
  },
  'Golden Gate Bridge'(g) {
    water(g, 3.0, 1.4);
    const O = '#c0362c';
    for (const s of [-1, 1]) box(g, 0.4, 0.12, 0.6, '#6f8a4a', s * 1.4, 0, 0);   // Marin Headlands, San Francisco
    box(g, 2.6, 0.012, 0.05, O, 0, 0.1);                                          // the deck
    for (const x of [-0.6, 0.6]) {
      const t = G(g, x, 0, 0);
      box(t, 0.06, 0.04, 0.09, '#9a9384');
      for (const z of [-0.025, 0.025]) box(t, 0.014, 0.42, 0.014, O, 0, 0.04, z);
      for (const y of [0.16, 0.25, 0.33, 0.41]) box(t, 0.012, 0.018, 0.064, O, 0, y);  // stepped portal struts
    }
    for (const z of [-0.025, 0.025]) {
      const pts = []; for (let i = 0; i <= 40; i++) { const x = -1.3 + (i / 40) * 2.6; let y; if (Math.abs(x) <= 0.6) y = 0.11 + 0.34 * (x / 0.6) ** 2; else y = 0.45 - (0.33) * ((Math.abs(x) - 0.6) / 0.7); pts.push(new THREE.Vector3(x, y, z)); }
      M(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.005, 4), O);
      for (let i = 1; i < 30; i++) { const x = -0.6 + (i / 30) * 1.2; const yc = 0.11 + 0.34 * (x / 0.6) ** 2; box(g, 0.0015, yc - 0.11, 0.0015, O, x, 0.11, z); }
    }
    M(g, new THREE.SphereGeometry(0.3, 12, 8), '#f4f8fa', 0.9, 0.16, 0.1, { transparent: true, opacity: 0.28, roughness: 1, depthWrite: false }).scale.set(1.6, 0.18, 1); // Karl the fog
  },
  'Hollywood Sign'(g) {
    // white block letters on the slope of Mount Lee
    const hill = lathe(g, [[0, 0], [0.9, 0], [0.6, 0.18], [0.3, 0.28], [0.0001, 0.3]], '#a39a6a', 0, 0, -0.3, 10); hill.scale.z = 0.6;
    for (let i = 0; i < 30; i++) { const a = i * 2.39; sph(g, 0.025, '#6f7f4a', Math.cos(a) * (0.3 + (i % 5) * 0.12), 0.02, Math.sin(a) * 0.3 - 0.2, 5); }
    const L = 'HOLLYWOOD';
    for (let i = 0; i < L.length; i++) {
      const n = G(g, (-0.18 + i * 0.045) * 1.7, 0.075, 0.2, 0); n.rotation.x = -0.3; n.scale.setScalar(1.7);
      const W = '#fbfbf8', w = 0.034, h = 0.05, t = 0.008;
      const ch = L[i];
      if (ch === 'H') { box(n, t, h, t, W, -w / 2 + t / 2); box(n, t, h, t, W, w / 2 - t / 2); box(n, w, t, t, W, 0, h / 2 - t / 2); }
      else if (ch === 'O') { const o = M(n, new THREE.TorusGeometry(w * 0.4, t * 0.55, 4, 14), W, 0, h / 2, 0); o.scale.y = 1.3; }
      else if (ch === 'L') { box(n, t, h, t, W, -w / 2 + t / 2); box(n, w, t, t, W, 0, 0); }
      else if (ch === 'Y') { box(n, t, h / 2, t, W, 0, 0); const a = box(n, t, h * 0.6, t, W, -w * 0.22, h * 0.45); a.rotation.z = 0.5; const b = box(n, t, h * 0.6, t, W, w * 0.22, h * 0.45); b.rotation.z = -0.5; }
      else if (ch === 'W') { for (const [x, r] of [[-0.012, 0.25], [-0.004, -0.25], [0.004, 0.25], [0.012, -0.25]]) { const s = box(n, t * 0.8, h, t, W, x, 0); s.rotation.z = r; } }
      else if (ch === 'D') { box(n, t, h, t, W, -w / 2 + t / 2); const d = M(n, new THREE.TorusGeometry(h / 2, t * 0.55, 4, 12, Math.PI), W, -w / 2 + t, h / 2, 0); d.rotation.z = -Math.PI / 2; d.scale.x = 1; d.scale.y = 0.75; }
      for (const s of [-1, 1]) box(n, 0.002, 0.03, 0.002, '#8a8f96', s * 0.01, -0.02, -0.006); // scaffold legs
    }
    cyl(g, 0.004, 0.006, 0.12, '#c9d3de', 0.15, 0.27, -0.3, 6);                   // Mount Lee antenna
  },
  'Space Needle'(g) {
    ground(g, 0.5, 0.5, '#7fbf5a');
    const W = '#f2f3f4';
    // three pairs of hourglass legs pinched at the waist, the flying-saucer top house, the halo and spire
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2, n = G(g, 0, 0, 0, a);
      for (const s of [-1, 1]) {
        const pts = [[0.06, 0], [0.025, 0.12], [0.014, 0.2], [0.03, 0.34]].map(([r, y]) => new THREE.Vector3(r, y, s * 0.008));
        M(n, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.0045, 5), W);
      }
    }
    cyl(g, 0.012, 0.012, 0.36, '#d9dde2', 0, 0, 0, 8);                           // the core
    box(g, 0.03, 0.004, 0.03, W, 0, 0.1);                                         // 100-ft level
    lathe(g, [[0.0001, 0.33], [0.03, 0.33], [0.075, 0.355], [0.07, 0.37], [0.05, 0.38], [0.0001, 0.385]], W, 0, 0, 0, 24); // the saucer
    cyl(g, 0.072, 0.072, 0.012, '#7fb2d6', 0, 0.355, 0, 24, ); M(g, new THREE.TorusGeometry(0.08, 0.0025, 4, 24), '#e8a13a', 0, 0.36, 0).rotation.x = Math.PI / 2; // glass & sunrise-coloured halo
    cyl(g, 0.01, 0.014, 0.02, W, 0, 0.385, 0, 8); cyl(g, 0.0012, 0.004, 0.07, W, 0, 0.405, 0, 6);
    box(g, 0.02, 0.003, 0.4, '#8a8f96', 0.15, 0.05, 0.0);                         // the Monorail
    const mo = G(g, -0.18, 0, 0.12); for (let i = 0; i < 5; i++) { const b = sph(mo, 0.03, ['#c0362c', '#3b8fd0', '#e8b93a', '#9a4ac0', '#c9d3de'][i], i * 0.025, 0.02, (i % 2) * 0.02, 6); b.scale.y = 0.8; } // MoPOP's crumpled colours
  },
  'Grand Canyon'(g) {
    // a deep, branching gorge in bands of red, orange and cream rock, with buttes and the Colorado River at the bottom
    const BANDS = ['#e8d2a8', '#c8783e', '#d88a52', '#b85e34', '#e0a46a', '#9c4e2c'];
    const side = (s) => {
      for (let i = 0; i < 18; i++) {
        const x = -4.2 + i * 0.5, edge = 0.55 + Math.sin(i * 1.3) * 0.3 + (i % 4 === 0 ? 0.4 : 0);
        for (let b = 0; b < 6; b++) box(g, 0.52, 0.12, 2.2, BANDS[b], x, b * 0.12, s * (edge + b * 0.12 + 1.1));
        box(g, 0.52, 0.03, 2.2, '#8a9a5a', x, 0.72, s * (edge + 0.72 + 1.1));     // Kaibab plateau forest
      }
    };
    side(-1); side(1);
    for (const [x, z, h] of [[-2.6, 0.3, 0.5], [-0.8, -0.35, 0.6], [1.4, 0.4, 0.55], [3.0, -0.2, 0.45], [0.3, 0.6, 0.4]]) { for (let b = 0; b < Math.round(h / 0.12); b++) box(g, 0.35 - b * 0.04, 0.12, 0.3 - b * 0.03, BANDS[b + 1], x, b * 0.12, z); } // temples and buttes
    const pts = []; for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push(new THREE.Vector3(-4.5 + t * 9, 0.006, Math.sin(t * 9) * 0.25)); }
    M(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.04, 4), '#4f8f7a');  // the Colorado
    box(g, 9.5, 0.004, 1.2, '#a8603a', 0, 0, 0);
  },
  'Mount Rushmore'(g) {
    // granite cliff with the four presidents' faces carved into it, pine forest below
    const S = '#b8b3aa', S2 = '#a9a49b';
    box(g, 3, 0.004, 2.4, '#4f7f45', 0, 0, 0);
    const cliff = lathe(g, [[0, 0], [1.4, 0], [1.2, 0.5], [0.8, 0.85], [0.4, 0.95], [0.0001, 0.96]], S2, 0, 0, -0.45, 9); cliff.scale.z = 0.5;
    box(g, 1.3, 0.6, 0.2, S, 0, 0.28, -0.12);                                      // the carved face
    const heads = [[-0.38, 0.62, 0.15, 0.95], [-0.12, 0.6, 0.15, 1.0], [0.08, 0.5, 0.16, 0.92], [0.34, 0.56, 0.14, 1.0]]; // Washington, Jefferson, Roosevelt, Lincoln
    for (const [x, y, r, sc] of heads) {
      const h = sph(g, r, S, x, y, -0.0, 10); h.scale.set(0.75 * sc, 1.25 * sc, 0.7);
      box(g, r * 0.3, r * 0.6, r * 0.3, S2, x, y - r * 0.25, r * 0.48);              // nose
      for (const s of [-1, 1]) box(g, r * 0.22, r * 0.12, r * 0.05, '#7f7a72', x + s * r * 0.26, y + r * 0.2, r * 0.45); // eyes
      box(g, r * 0.5, r * 0.2, r * 0.2, S2, x, y - r * 1.1, r * 0.2);                // chin
    }
    box(g, 0.8, 0.12, 0.25, '#9c978e', 0, 0, 0.1);                                 // talus slope
    for (let i = 0; i < 60; i++) { const a = i * 2.39, r = 0.6 + (i % 7) * 0.12; cone(g, 0.05, 0.16, '#2f5d34', Math.cos(a) * r, 0, Math.abs(Math.sin(a)) * r * 0.8 + 0.2, 6); }
    box(g, 0.6, 0.04, 0.1, '#d9cfbb', 0, 0, 1.0);                                  // Avenue of Flags & visitor centre
  },
  'Niagara Falls'(g) {
    // the Horseshoe (Canadian) Falls curve, the straight American and Bridal Veil falls, mist and the Maid of the Mist
    const R = '#6f7461';
    box(g, 2.4, 0.004, 1.6, '#3b7fb0', 0, 0, 0.4);                                 // lower river
    box(g, 2.4, 0.16, 0.8, '#6f8a4a', 0, 0, -0.9);                                 // land above
    box(g, 2.0, 0.004, 0.6, '#4b9fd6', 0.1, 0.16, -0.75);                          // upper Niagara River
    const hs = []; for (let i = 0; i <= 18; i++) { const a = Math.PI * (i / 18); hs.push([0.4 + Math.cos(a) * 0.42, -0.45 + Math.sin(a) * 0.3]); }
    for (let i = 0; i < hs.length - 1; i++) { const [x1, z1] = hs[i], [x2, z2] = hs[i + 1]; const w = Math.hypot(x2 - x1, z2 - z1) + 0.01; const c = box(g, w, 0.16, 0.015, i % 2 ? '#e6f4fb' : '#cfeaf8', (x1 + x2) / 2, 0, (z1 + z2) / 2); c.rotation.y = -Math.atan2(z2 - z1, x2 - x1); }
    box(g, 0.25, 0.16, 0.2, R, -0.25, 0, -0.35);                                   // Goat Island
    box(g, 0.45, 0.16, 0.015, '#e6f4fb', -0.62, 0, -0.45); box(g, 0.04, 0.16, 0.015, '#e6f4fb', -0.33, 0, -0.45); // American & Bridal Veil Falls
    for (let i = 0; i < 4; i++) M(g, new THREE.SphereGeometry(0.15, 10, 6), '#f4f8fa', 0.2 + (i % 2) * 0.22, 0.14 + Math.floor(i / 2) * 0.06, -0.25, { transparent: true, opacity: 0.3, roughness: 1, depthWrite: false }).scale.set(1.3, 0.45, 0.7);
    box(g, 0.05, 0.02, 0.02, '#3b6fbf', 0.4, 0, 0.0);                              // Maid of the Mist
    const rb = G(g, 0, 0, 0.9); box(rb, 2.4, 0.01, 0.03, '#8a8f96', 0, 0.12); for (let i = 0; i < 2; i++) M(rb, new THREE.TorusGeometry(0.3, 0.008, 4, 16, Math.PI), '#8a8f96', -0.3 + i * 0.6, 0.0, 0); // Rainbow Bridge
    for (let i = 0; i < 14; i++) box(g, 0.06, 0.05 + ((i * 7) % 5) * 0.03, 0.06, ['#c9d3de', '#e8e3d6', '#b5bdc6'][i % 3], -1.0 + i * 0.15, 0, 0.75);   // Clifton Hill & Skylon Tower
    cyl(g, 0.008, 0.008, 0.3, '#d9dde2', 0.5, 0, 1.0, 8); cyl(g, 0.03, 0.03, 0.025, '#e8b93a', 0.5, 0.3, 1.0, 12);
  },
  'CN Tower'(g) {
    water(g, 0.6, 0.3, 0, 0.3); ground(G(g, 0, 0, -0.1), 0.6, 0.4, '#9aa0a6');
    const C = '#d6d8d4';
    // a Y-shaped concrete tower: three hexagonal legs fused to a central shaft, the SkyPod and the long antenna
    for (const a of [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]) { const n = G(g, 0, 0, 0, a); const l = M(n, new THREE.CylinderGeometry(0.004, 0.02, 0.33, 4), C, 0, 0.165, 0.018); l.rotation.x = 0.04; }
    cyl(g, 0.009, 0.016, 0.42, C, 0, 0, 0, 6);
    lathe(g, [[0.0001, 0.33], [0.02, 0.33], [0.04, 0.345], [0.042, 0.36], [0.034, 0.375], [0.0001, 0.38]], '#c9cbc6', 0, 0, 0, 16); // main pod
    cyl(g, 0.041, 0.041, 0.01, '#5f7a90', 0, 0.35, 0, 16);
    cyl(g, 0.013, 0.013, 0.012, '#c9cbc6', 0, 0.44, 0, 12);                         // SkyPod
    cyl(g, 0.002, 0.006, 0.14, '#cfd2d6', 0, 0.452, 0, 6);                          // antenna
    box(g, 0.14, 0.04, 0.1, '#b5bdc6', 0.14, 0, -0.05); dome(g, 0.07, '#e0e3e6', -0.16, 0, -0.08, 0.45, 16); // Ripley's & the Rogers Centre dome
  },
};
