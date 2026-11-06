// True-to-life models: Middle East, Africa and South Asia.
import { THREE, M, box, cyl, cone, sph, dome, lathe, onion, G, arch, ground, water, tree, windows } from './lm-kit.js';

const glass = { metalness: 0.5, roughness: 0.25 };
const chhatri = (g, r, c, x, y, z, cap = c) => { for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) cyl(g, r * 0.12, r * 0.12, r * 1.2, c, x + a * r * 0.7, y, z + b * r * 0.7, 5); box(g, r * 2.2, r * 0.2, r * 2.2, c, x, y + r * 1.2, z); dome(g, r, cap, x, y + r * 1.4, z, 1, 10); };
const minaret = (g, r, h, c, x, z, cap = c, y = 0) => { cyl(g, r * 0.8, r, h, c, x, y, z, 10); for (const t of [0.45, 0.75]) cyl(g, r * 1.5, r * 1.3, r * 0.5, c, x, y + h * t, z, 10); cyl(g, r * 0.7, r * 0.7, r * 2, c, x, y + h, z, 8); onion(g, r * 0.9, cap, x, y + h + r * 2, z, 10); };

export const REAL2 = {
  // =============================================================== MIDDLE EAST & AFRICA
  'Burj Khalifa'(g) {
    ground(g, 0.6, 0.6, '#d9c9a3'); water(g, 0.3, 0.16, 0.12, 0.2);           // Dubai Fountain lake
    const C = '#b9c6d3';
    // Y-shaped plan: three wings stepping back in a spiral, central core rising to the spire
    const wings = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
    const steps = [[0.07, 0.12], [0.062, 0.1], [0.054, 0.09], [0.046, 0.08], [0.038, 0.07], [0.03, 0.06], [0.022, 0.055], [0.014, 0.05]];
    steps.forEach(([len, h], i) => {
      const y0 = steps.slice(0, i).reduce((s, v) => s + v[1] * 0.75, 0);
      wings.forEach((a, k) => { if (i > 1 && (i + k) % 3 === 0) return; const w = box(G(g, 0, 0, 0, a), 0.018, h, len, C, 0, y0, len / 2); M; void w; });
      for (const a of wings) { const fin = box(G(g, 0, 0, 0, a), 0.022, 0.002, 0.004, '#e6edf3', 0, y0 + h * 0.9, len); void fin; }
    });
    cyl(g, 0.012, 0.016, 0.5, C, 0, 0, 0, 6);
    cyl(g, 0.006, 0.011, 0.12, '#d2dbe4', 0, 0.5, 0, 6); cyl(g, 0.0015, 0.005, 0.12, '#e6edf3', 0, 0.62, 0, 6);
    for (let i = 0; i < 5; i++) box(g, 0.04, 0.02 + i * 0.008, 0.04, '#a7b4c2', -0.2 + i * 0.09, 0, -0.2); // neighbouring towers
  },
  'Burj Al Arab'(g) {
    water(g, 0.7, 0.7);
    M(g, new THREE.CylinderGeometry(0.06, 0.06, 0.01, 20), '#e4d4b0', 0, 0.005, 0);   // its own island
    box(g, 0.012, 0.004, 0.32, '#cfc6b4', 0, 0, 0.18);                        // bridge to shore
    const s = M(g, new THREE.SphereGeometry(0.11, 14, 12, 0, Math.PI, 0, Math.PI), '#f8f9fb', 0, 0.16, 0.005, { transparent: true, opacity: 0.92 });
    s.scale.set(0.35, 1.45, 0.75); s.rotation.y = Math.PI / 2;               // the white sail
    const back = box(g, 0.016, 0.3, 0.016, '#c9d3de', 0, 0, -0.07);           // exoskeleton mast
    const arc = (y) => { const t = M(g, new THREE.TorusGeometry(0.09, 0.004, 4, 16, Math.PI * 0.6), '#c9d3de', 0, y, -0.02); t.rotation.y = Math.PI / 2; t.rotation.z = Math.PI * 0.2; };
    arc(0.1); arc(0.18); void back;
    const helipad = cyl(g, 0.025, 0.025, 0.003, '#7fbf7f', 0.0, 0.25, -0.1, 16); void helipad;
    box(g, 0.004, 0.004, 0.03, '#c9d3de', 0, 0.25, -0.085);
    cyl(g, 0.002, 0.004, 0.07, '#c9d3de', 0, 0.28, -0.07, 6);
  },
  'Sheikh Zayed Mosque'(g) {
    const W = '#f7f6f1', Gd = '#e0c062';
    ground(g, 0.7, 0.7, '#e8e3d6');
    for (const s of [-1, 1]) water(g, 0.04, 0.4, s * 0.25, 0.05);             // reflecting pools
    box(g, 0.4, 0.004, 0.32, '#f2efe8', 0, 0.003, 0.05);                      // marble courtyard
    for (const z of [-0.11, 0.21]) box(g, 0.4, 0.03, 0.03, W, 0, 0, z);
    for (const x of [-0.2, 0.2]) box(g, 0.03, 0.03, 0.32, W, x, 0, 0.05);
    for (let i = 0; i < 14; i++) for (const z of [-0.093, 0.193]) { const a = arch(g, 0.016, 0.026, '#d9d4c6', -0.18 + i * 0.0277, 0, z + 0.016); void a; }
    box(g, 0.2, 0.06, 0.1, W, 0, 0, -0.17);                                   // prayer hall
    cyl(g, 0.05, 0.05, 0.02, W, 0, 0.06, -0.17, 20); onion(g, 0.05, W, 0, 0.08, -0.17, 20); cone(g, 0.004, 0.03, Gd, 0, 0.16, -0.17, 6);
    for (const [x, r] of [[-0.07, 0.03], [0.07, 0.03], [-0.035, 0.022], [0.035, 0.022]]) { onion(g, r, W, x, 0.06, -0.17 + (Math.abs(x) < 0.05 ? 0.04 : 0), 14); cone(g, 0.003, 0.015, Gd, x, 0.06 + r * 1.6, -0.17 + (Math.abs(x) < 0.05 ? 0.04 : 0), 5); }
    for (let i = 0; i < 18; i++) { const x = -0.18 + (i % 9) * 0.045, z = i < 9 ? -0.11 : 0.21; onion(g, 0.012, W, x, 0.03, z, 10); }
    for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) minaret(g, 0.012, 0.2, W, x * 0.2, 0.05 + z * 0.16, Gd);
  },
  Kilimanjaro(g) {
    // Kibo: a broad volcano with a flat, ice-capped summit crater; Mawenzi's jagged peak to the east
    lathe(g, [[0, 0], [5.2, 0], [4.2, 0.4], [2.6, 1.4], [1.4, 2.6], [0.9, 3.0], [0.0001, 3.0]], '#6e8a52', 0, 0, 0, 16);
    lathe(g, [[0, 0], [5.25, 0], [4.6, 0.25], [0.0001, 0.25]], '#3f6f3a', 0, 0, 0, 16);       // rainforest belt
    lathe(g, [[0.0001, 2.3], [1.75, 2.3], [1.4, 2.6], [0.9, 3.0], [0.8, 3.02], [0.0001, 3.02]], '#9a8c7a', 0, 0, 0, 16); // bare alpine desert
    lathe(g, [[0.0001, 2.85], [1.05, 2.85], [0.9, 3.01], [0.7, 3.04], [0.0001, 2.95]], '#f7fafc', 0, 0, 0, 16);           // glaciers
    cyl(g, 0.45, 0.45, 0.02, '#8f8478', 0, 2.96, 0, 16);                     // the crater
    for (const [x, z, r, h] of [[2.4, 1.0, 0.9, 2.1], [2.8, 0.6, 0.5, 2.0], [2.2, 1.4, 0.45, 1.8]]) cone(g, r, h, '#7c7468', x, 0, z, 7); // Mawenzi
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; sph(g, 0.35, '#3f6f3a', Math.cos(a) * 4.3, 0.15, Math.sin(a) * 4.3, 7); }
  },
  'Victoria Falls'(g) {
    // the Zambezi drops into a long, narrow chasm, with a cloud of spray rising above it
    const R = '#5f6b52';
    box(g, 2.2, 0.12, 0.9, '#6f8a4a', 0, 0, -0.65);                            // plateau above
    box(g, 2.0, 0.004, 0.75, '#4b9fd6', 0, 0.12, -0.6);                       // the wide Zambezi
    box(g, 2.2, 0.12, 0.8, '#6f8a4a', 0, 0, 0.55);                             // far side of the gorge
    box(g, 2.0, 0.003, 0.05, '#3b7fb0', 0, 0.01, -0.12);                      // gorge floor
    for (let i = 0; i < 16; i++) { if (i === 5 || i === 11) continue; box(g, 0.11, 0.115, 0.012, i % 2 ? '#e6f4fb' : '#cde9f7', -0.95 + i * 0.125, 0.005, -0.2); } // curtains of water
    for (let i = 0; i < 6; i++) M(g, new THREE.SphereGeometry(0.16, 10, 6), '#f4f8fa', -0.8 + i * 0.32, 0.16 + (i % 2) * 0.05, -0.12, { transparent: true, opacity: 0.3, roughness: 1, depthWrite: false }).scale.set(1.4, 0.45, 0.5); // the "smoke that thunders"
    box(g, 0.05, 0.15, 0.3, R, 1.05, 0, 0.0);                                 // Victoria Falls Bridge pier
    box(g, 0.01, 0.006, 0.4, '#8a8f96', 1.05, 0.14, 0.0);
    for (let i = 0; i < 20; i++) tree(g, -1 + i * 0.1, 0.2 + (i % 3) * 0.08, 3);
  },
  'Table Mountain'(g) {
    // the flat-topped massif over Cape Town, Lion's Head and Devil's Peak either side, the city and bay below
    const S = '#8b8574', F = '#6f7a52';
    const m = lathe(g, [[0, 0], [1.4, 0], [1.25, 0.15], [1.05, 0.55], [0.98, 0.62], [0.0001, 0.62]], S, 0, 0, 0, 10); m.scale.z = 0.38;
    const t = box(g, 1.7, 0.006, 0.38, '#7f8a60', 0, 0.62); void t;
    for (let i = 0; i < 18; i++) box(g, 0.03, 0.3, 0.015, '#9c9483', -0.9 + i * 0.105, 0.3, 0.37); // cliff ribs
    cone(g, 0.55, 0.7, F, 1.35, 0, 0.1, 7);                                   // Devil's Peak
    cone(g, 0.45, 0.66, S, -1.5, 0, 0.4, 7);                                  // Lion's Head
    M(g, new THREE.SphereGeometry(0.5, 10, 6), '#ffffff', 0, 0.68, 0, { transparent: true, opacity: 0.5 }).scale.set(2.2, 0.12, 0.6); // the tablecloth cloud
    box(g, 3.2, 0.002, 0.6, '#4ea3d6', 0, 0, 1.3);                            // Table Bay
    for (let i = 0; i < 40; i++) box(g, 0.05, 0.02 + ((i * 7) % 5) * 0.012, 0.05, ['#e8e3d6', '#d9cfbb', '#c9d3de'][i % 3], -1.4 + (i % 20) * 0.14, 0, 0.62 + Math.floor(i / 20) * 0.14);
  },

  // =============================================================== INDIA & NEPAL
  'India Gate'(g, c = '#d9a679') {
    box(g, 0.06, 0.003, 0.9, '#e2d8c4', 0, 0, 0.1);                           // Kartavya Path
    for (const s of [-1, 1]) { ground(G(g, s * 0.2, 0, 0.1), 0.3, 0.9, '#7fbf5a'); water(g, 0.02, 0.8, s * 0.08, 0.15); }
    box(g, 0.16, 0.012, 0.06, '#c49567', 0, 0);
    for (const s of [-1, 1]) box(g, 0.045, 0.14, 0.05, c, s * 0.0475, 0.012);  // the two great piers
    arch(g, 0.05, 0.11, '#5a4a3a', 0, 0.012, 0.0255, 0, false); arch(g, 0.05, 0.11, '#5a4a3a', 0, 0.012, -0.0275, 0, false);
    box(g, 0.05, 0.03, 0.05, c, 0, 0.122);
    for (let i = 0; i < 4; i++) box(g, 0.15 - i * 0.02, 0.012, 0.055 - i * 0.006, i % 2 ? '#c49567' : c, 0, 0.152 + i * 0.012);
    cyl(g, 0.012, 0.016, 0.012, '#c49567', 0, 0.2, 0, 12); dome(g, 0.013, c, 0, 0.212, 0, 0.6, 12); // shallow dome on top
    box(g, 0.1, 0.006, 0.001, '#4a3a2a', 0, 0.165, 0.0285);                   // INDIA inscription
    for (const s of [-1, 1]) { const f = cyl(g, 0.0015, 0.0015, 0.012, '#f6a540', s * 0.006, 0.012, 0.06, 6); void f; }
    const ch = G(g, 0, 0, 0.18); for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) cyl(ch, 0.002, 0.002, 0.04, '#e2d8c4', a * 0.012, 0, b * 0.012, 6); box(ch, 0.032, 0.004, 0.032, '#e2d8c4', 0, 0.04); dome(ch, 0.012, '#e2d8c4', 0, 0.044, 0, 1.3, 10); // the canopy
  },
  'Red Fort'(g, c = '#b9573f') {
    ground(g, 0.8, 0.8, '#7fae58');
    const wall = (w, d, x, z, ry) => { const n = G(g, x, 0, z, ry); box(n, w, 0.05, d, c); for (let i = 0; i < Math.floor(w / 0.02); i++) box(n, 0.008, 0.008, d + 0.002, '#a84c35', -w / 2 + 0.01 + i * 0.02, 0.05); return n; };
    // irregular octagon of red sandstone walls
    wall(0.5, 0.02, 0, 0.26, 0); wall(0.5, 0.02, 0, -0.26, 0); wall(0.42, 0.02, 0.29, 0, Math.PI / 2); wall(0.42, 0.02, -0.29, 0, Math.PI / 2);
    for (const [x, z] of [[0.25, 0.26], [-0.25, 0.26], [0.29, -0.2], [-0.29, -0.2], [0.29, 0.21], [-0.29, 0.21]]) { cyl(g, 0.022, 0.025, 0.06, c, x, 0, z, 10); chhatri(g, 0.012, '#e8dcc8', x, 0.06, z); }
    const lg = G(g, 0, 0, 0.27); box(lg, 0.1, 0.09, 0.04, c); arch(lg, 0.03, 0.06, '#5a2a1a', 0, 0, 0.0205, 0, true); // Lahori Gate
    for (const s of [-1, 1]) { cyl(lg, 0.012, 0.014, 0.1, c, s * 0.045, 0, 0, 8); chhatri(lg, 0.01, '#f2ede2', s * 0.045, 0.1, 0); }
    for (let i = -2; i <= 2; i++) chhatri(lg, 0.008, '#f2ede2', i * 0.018, 0.09, 0.01);
    box(lg, 0.004, 0.06, 0.03, '#1f7a3a', 0.0, 0.13, 0); box(lg, 0.012, 0.008, 0.001, '#ff9933', 0.007, 0.18, 0); box(lg, 0.012, 0.008, 0.001, '#ffffff', 0.007, 0.172, 0); box(lg, 0.012, 0.008, 0.001, '#138808', 0.007, 0.164, 0); // the national flag
    box(g, 0.1, 0.03, 0.06, '#efe9de', 0, 0, -0.05); for (let i = 0; i < 6; i++) arch(g, 0.012, 0.022, '#c9b89a', -0.04 + i * 0.016, 0, -0.0195, 0, true); // Diwan-i-Aam
    for (const x of [-0.15, 0.15]) { box(g, 0.08, 0.025, 0.05, '#f4f1ea', x, 0, -0.2); for (const s of [-1, 1]) chhatri(g, 0.007, '#e0c062', x + s * 0.03, 0.025, -0.2); }
    for (let i = 0; i < 8; i++) tree(g, -0.2 + i * 0.05, 0.12, 1.6);
  },
  'Qutub Minar'(g) {
    ground(g, 0.4, 0.4, '#82b35c');
    const R = '#b86a46', B = '#d9c8a8';
    // five tapering, fluted storeys with projecting balconies
    const stor = [[0.03, 0.026, 0.09, R], [0.026, 0.022, 0.07, R], [0.022, 0.019, 0.06, R], [0.019, 0.016, 0.04, B], [0.016, 0.013, 0.035, R]];
    let y = 0;
    for (const [rb, rt, h, col] of stor) {
      M(g, new THREE.CylinderGeometry(rt, rb, h, 24), col, 0, y + h / 2, 0);
      for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; cyl(g, 0.003, 0.0035, h, col === R ? '#a95d3c' : '#cdb995', Math.cos(a) * (rt + rb) / 2, y, Math.sin(a) * (rt + rb) / 2, 5); }
      y += h; cyl(g, rt * 1.35, rt * 1.1, 0.006, '#e8d9bd', 0, y, 0, 20);
    }
    cyl(g, 0.008, 0.01, 0.015, '#d9c8a8', 0, y, 0, 10); dome(g, 0.009, '#d9c8a8', 0, y + 0.015, 0, 1, 10);
    // the Quwwat-ul-Islam mosque ruins and Alai Darwaza
    for (let i = 0; i < 7; i++) { arch(g, 0.02, 0.045, '#9f8a6a', -0.15 + i * 0.03, 0, -0.08, 0, true, 0.01); }
    box(g, 0.05, 0.035, 0.05, R, 0.12, 0, 0.08); dome(g, 0.022, '#d9c8a8', 0.12, 0.035, 0.08, 0.8, 12);
    cyl(g, 0.005, 0.006, 0.04, '#5a5a5e', -0.06, 0, 0.06, 8);                  // the Iron Pillar
  },
  'Lotus Temple'(g) {
    ground(g, 0.6, 0.6, '#7fbf5a');
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; const p = M(g, new THREE.CylinderGeometry(0.06, 0.06, 0.003, 3), '#4ea3d6', Math.cos(a) * 0.15, 0.006, Math.sin(a) * 0.15); p.rotation.y = -a; } // nine pools
    cyl(g, 0.11, 0.12, 0.012, '#efece4', 0, 0, 0, 27);
    // 27 marble petals in three rings: open, half-open, and the closed bud in the middle
    const petal = (a, tilt, len, w, r0, y) => { const n = G(g, 0, y, 0, a); const h = G(n, 0, 0, r0); h.rotation.x = tilt; const p = M(h, new THREE.SphereGeometry(1, 8, 8, 0, Math.PI, 0, Math.PI), '#fbfaf6', 0, len * 0.5, 0); p.scale.set(w, len * 0.5, w * 0.5); p.rotation.y = Math.PI; };
    for (let i = 0; i < 9; i++) petal(((i + 0.5) / 9) * Math.PI * 2, 1.15, 0.075, 0.034, 0.085, 0.012);   // outer, curling down over the entrances
    for (let i = 0; i < 9; i++) petal((i / 9) * Math.PI * 2, 0.6, 0.12, 0.03, 0.06, 0.012);             // middle layer
    for (let i = 0; i < 9; i++) petal(((i + 0.5) / 9) * Math.PI * 2, 0.22, 0.15, 0.024, 0.03, 0.012);    // inner bud
    for (let i = 0; i < 4; i++) { box(g, 0.012, 0.002, 0.25, '#e8e3d6', 0, 0.001, 0.2).rotation.y = (i * Math.PI) / 2; }
  },
  'Gateway of India'(g, c = '#e0c39a') {
    water(g, 1.0, 0.5, 0, 0.3); box(g, 0.6, 0.006, 0.3, '#cfc6b4', 0, 0, -0.12);   // Apollo Bunder waterfront
    const n = G(g, 0, 0.006, 0);
    box(n, 0.13, 0.11, 0.05, c);
    arch(n, 0.05, 0.085, '#6b5a44', 0, 0, 0.0255, 0, true); arch(n, 0.05, 0.085, '#6b5a44', 0, 0, -0.0275, 0, true);
    for (const s of [-1, 1]) { arch(n, 0.018, 0.04, '#6b5a44', s * 0.045, 0, 0.0255, 0, true); box(n, 0.006, 0.13, 0.006, c, s * 0.063, 0, 0.026); cone(n, 0.006, 0.02, c, s * 0.063, 0.13, 0.026, 6); }
    for (const s of [-1, 1]) for (const z of [-1, 1]) { cyl(n, 0.012, 0.014, 0.14, c, s * 0.075, 0, z * 0.02, 8); chhatri(n, 0.01, c, s * 0.075, 0.14, z * 0.02); } // four corner turrets
    box(n, 0.14, 0.012, 0.055, '#d4b48a', 0, 0.11); for (let i = 0; i < 9; i++) box(n, 0.006, 0.01, 0.056, c, -0.06 + i * 0.015, 0.122);
    box(n, 0.2, 0.025, 0.04, c, 0, 0, -0.04);                                 // side halls
    const taj = G(g, -0.18, 0.006, -0.2); box(taj, 0.22, 0.07, 0.06, '#e8dcc8'); windows(taj, 10, 0.22, 0.03, 0.031, '#7a5a3a', 0.008, 0.014); dome(taj, 0.03, '#c0503a', 0, 0.07, 0, 1.2, 12); // Taj Mahal Palace hotel
    for (let i = 0; i < 4; i++) { const b = box(g, 0.03, 0.01, 0.012, ['#f6c445', '#e2533a', '#3b8fd0', '#ffffff'][i], -0.2 + i * 0.12, 0, 0.25); void b; } // ferries
  },
  'Golden Temple'(g) {
    ground(g, 0.7, 0.7, '#efe9de');
    box(g, 0.44, 0.002, 0.44, '#e8e3d6', 0, 0, 0);
    water(G(g, 0, 0.004, 0), 0.36, 0.36);                                      // the Amrit Sarovar
    box(g, 0.012, 0.012, 0.16, '#efe9de', 0, 0, 0.1);                          // the causeway
    for (let i = 0; i < 8; i++) for (const s of [-1, 1]) cyl(g, 0.0015, 0.0015, 0.02, '#e0c062', s * 0.008, 0.012, 0.04 + i * 0.02, 5);
    const H = G(g, 0, 0.006, 0);                                               // the Harmandir Sahib
    box(H, 0.06, 0.035, 0.06, '#f2ede2'); box(H, 0.064, 0.004, 0.064, '#e0c062', 0, 0.012);
    box(H, 0.055, 0.035, 0.055, '#e8b93a', 0, 0.035, 0, ); windows(G(H, 0, 0, 0), 4, 0.05, 0.045, 0.028, '#a8781a', 0.006, 0.012);
    box(H, 0.058, 0.006, 0.058, '#d4a020', 0, 0.07);
    onion(H, 0.025, '#f0c43a', 0, 0.076, 0, 18); cone(H, 0.006, 0.03, '#f0c43a', 0, 0.115, 0, 8);
    for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { onion(H, 0.008, '#f0c43a', a * 0.025, 0.076, b * 0.025, 10); }
    for (let i = -2; i <= 2; i++) for (const s of [-1, 1]) onion(H, 0.004, '#f0c43a', i * 0.012, 0.076, s * 0.028, 8);
    // the white parikrama buildings round the pool, the Akal Takht and the darshani deorhi gate
    for (const [w, d, x, z] of [[0.5, 0.04, 0, 0.23], [0.5, 0.04, 0, -0.23], [0.04, 0.5, 0.23, 0], [0.04, 0.5, -0.23, 0]]) { box(g, w, 0.04, d, '#f6f3ec', x, 0, z); }
    for (let i = 0; i < 14; i++) for (const z of [-1, 1]) onion(g, 0.005, '#e8e3d6', -0.21 + i * 0.032, 0.04, z * 0.23, 6);
    const akal = G(g, 0, 0, 0.27); box(akal, 0.08, 0.09, 0.05, '#f2ede2'); onion(akal, 0.022, '#e8b93a', 0, 0.09, 0, 14);
    box(g, 0.05, 0.06, 0.05, '#f2ede2', 0, 0, 0.21); onion(g, 0.012, '#e8b93a', 0, 0.06, 0.21, 10);
  },
  Charminar(g, c = '#e3d2b2') {
    box(g, 0.08, 0.003, 0.9, '#b9b0a0', 0, 0, 0); box(g, 0.9, 0.003, 0.08, '#b9b0a0', 0, 0, 0); // crossing roads of the old city
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, r = 0.2 + (i % 3) * 0.05; box(g, 0.04, 0.02 + (i % 4) * 0.01, 0.04, ['#e8d9c4', '#d9b98a', '#c9d3de', '#e2a46a'][i % 4], Math.cos(a) * r, 0, Math.sin(a) * r); }
    const n = G(g, 0, 0.003, 0), S = 0.1;
    box(n, S, 0.012, S, '#cdb995');
    for (const ry of [0, Math.PI / 2]) for (const s of [-1, 1]) { const f = G(n, 0, 0.012, 0, ry); box(f, S, 0.07, 0.008, c, 0, 0, s * (S / 2 - 0.004)); arch(f, 0.05, 0.065, '#6b5a44', 0, 0, s * (S / 2) + (s > 0 ? 0.0002 : -0.0022), 0, true); }
    box(n, S, 0.012, S, '#d6c2a0', 0, 0.082); for (let i = 0; i < 12; i++) arch(n, 0.006, 0.01, '#8a7656', -0.045 + i * 0.0082, 0.082, S / 2 + 0.0002, 0, true);
    box(n, S * 0.96, 0.02, S * 0.96, c, 0, 0.094); for (let i = 0; i < 9; i++) arch(n, 0.007, 0.014, '#8a7656', -0.04 + i * 0.01, 0.096, S * 0.48 + 0.0002, 0, true);
    dome(n, 0.022, c, 0, 0.114, 0, 0.8, 12);
    // four minarets, each with balconies and a small onion dome, rising from the corners
    for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const x = a * S / 2, z = b * S / 2;
      cyl(n, 0.009, 0.011, 0.19, c, x, 0, z, 10);
      for (const y of [0.08, 0.115, 0.15, 0.18]) cyl(n, 0.014, 0.012, 0.005, '#cdb995', x, y, z, 10);
      onion(n, 0.008, c, x, 0.19, z, 10); cone(n, 0.002, 0.012, '#cdb995', x, 0.203, z, 5);
    }
  },
  'Meenakshi Temple'(g) {
    ground(g, 0.8, 0.8, '#d9cfbb');
    box(g, 0.56, 0.035, 0.6, '#cfc0a0', 0, 0, 0);                              // outer walls
    box(g, 0.5, 0.004, 0.54, '#e2d8c4', 0, 0.035, 0);
    water(G(g, 0.08, 0.04, 0.05), 0.1, 0.08);                                 // Golden Lotus tank
    for (let i = 0; i < 8; i++) cyl(g, 0.0015, 0.0015, 0.015, '#e8dcc8', 0.04 + (i % 4) * 0.027, 0.04, 0.012 + Math.floor(i / 4) * 0.075, 5);
    // gopurams: tall tapering, colourful, crowded with figures; tallest are the four outer gateways
    const PAL = ['#e2533a', '#3b8fd0', '#f6c445', '#2fa65a', '#d05ac9', '#ffffff', '#f08a3a'];
    const gopuram = (x, z, ry, h, w) => {
      const n = G(g, x, 0, z, ry); box(n, w, h * 0.12, w * 0.6, '#d8c8a8');
      const tiers = 9;
      for (let i = 0; i < tiers; i++) {
        const t = i / tiers, ww = w * (1 - t * 0.6), dd = w * 0.6 * (1 - t * 0.55), y = h * 0.12 + t * h * 0.78;
        box(n, ww, h * 0.078, dd, '#d7b98a', 0, y);
        for (let k = 0; k < 7; k++) box(n, ww / 9, h * 0.05, 0.004, PAL[(i * 3 + k) % PAL.length], (k - 3) * (ww / 7.4), y + h * 0.012, dd / 2 + 0.001);
        for (let k = 0; k < 7; k++) box(n, ww / 9, h * 0.05, 0.004, PAL[(i * 2 + k + 1) % PAL.length], (k - 3) * (ww / 7.4), y + h * 0.012, -dd / 2 - 0.001);
      }
      const top = M(n, new THREE.CylinderGeometry(w * 0.12, w * 0.12, w * 0.4, 10, 1, false, 0, Math.PI), '#e2533a', 0, h * 0.92, 0); top.rotation.z = Math.PI / 2;
      for (let k = -2; k <= 2; k++) cone(n, 0.004, 0.012, '#e8b93a', k * w * 0.08, h * 0.97, 0, 5);
      arch(n, w * 0.2, h * 0.11, '#3a2a1a', 0, 0, w * 0.3 + 0.001, 0, false);
    };
    gopuram(0, 0.3, 0, 0.36, 0.1); gopuram(0, -0.3, Math.PI, 0.32, 0.1); gopuram(0.28, 0, Math.PI / 2, 0.34, 0.1); gopuram(-0.28, 0, -Math.PI / 2, 0.33, 0.1);
    gopuram(0.1, 0.18, 0, 0.18, 0.06); gopuram(-0.1, -0.16, Math.PI, 0.17, 0.06); gopuram(-0.16, 0.12, -Math.PI / 2, 0.15, 0.055); gopuram(0.16, -0.14, Math.PI / 2, 0.16, 0.055);
    for (const x of [-0.06, 0.03]) { box(g, 0.03, 0.04, 0.03, '#e8b93a', x, 0.035, -0.05); dome(g, 0.016, '#f0c43a', x, 0.075, -0.05, 1.1, 10); } // golden vimanas
  },
  'Mysore Palace'(g) {
    ground(g, 0.8, 0.7, '#7fbf5a'); box(g, 0.5, 0.004, 0.2, '#d9cfbb', 0, 0, 0.12);
    const W = '#ece2cc', D = '#d64a3a', R = '#c24a3a';
    const P = G(g, 0, 0, -0.05);
    box(P, 0.44, 0.07, 0.12, W);                                                // grey granite three-storey body
    for (let f = 0; f < 3; f++) for (let i = 0; i < 15; i++) arch(P, 0.016, 0.018, '#8a6a48', -0.2 + i * 0.0286, 0.004 + f * 0.022, 0.0605, 0, false);
    box(P, 0.44, 0.006, 0.12, '#d9c8a8', 0, 0.07); for (let i = 0; i < 22; i++) box(P, 0.006, 0.01, 0.006, '#d9c8a8', -0.21 + i * 0.02, 0.076, 0.058);
    box(P, 0.11, 0.06, 0.12, W, 0, 0.07, 0.01);                                  // central bay
    for (let i = 0; i < 5; i++) arch(P, 0.016, 0.04, '#8a6a48', -0.04 + i * 0.02, 0.07, 0.0705, 0, false);
    // the tall five-storey central tower with its gilded dome
    box(P, 0.06, 0.1, 0.06, W, 0, 0.13, 0); for (let f = 0; f < 4; f++) windows(G(P, 0, 0, 0), 3, 0.05, 0.14 + f * 0.022, 0.0305, '#8a6a48', 0.008, 0.012);
    cyl(P, 0.026, 0.026, 0.01, '#d9c8a8', 0, 0.23, 0, 16); onion(P, 0.026, '#e8b93a', 0, 0.24, 0, 18); cone(P, 0.004, 0.02, '#e8b93a', 0, 0.282, 0, 6);
    // pink-red domes on the flanking towers and corner pavilions
    for (const s of [-1, 1]) {
      box(P, 0.05, 0.11, 0.05, W, s * 0.1, 0.0, 0.035); onion(P, 0.018, D, s * 0.1, 0.11, 0.035, 14);
      for (const x of [0.19, 0.22]) { cyl(P, 0.012, 0.012, 0.09, W, s * x, 0, 0.05, 10); onion(P, 0.011, R, s * x, 0.09, 0.05, 10); }
      for (let i = 0; i < 4; i++) onion(P, 0.007, D, s * (0.06 + i * 0.03), 0.076, 0.05, 8);
    }
    for (const s of [-1, 1]) { const gt = G(g, s * 0.32, 0, 0.25); box(gt, 0.05, 0.06, 0.02, W); arch(gt, 0.02, 0.04, '#6b4a2a', 0, 0, 0.0105, 0, false); onion(gt, 0.01, D, 0, 0.06, 0, 10); }
    for (let i = 0; i < 10; i++) tree(g, -0.36 + i * 0.08, 0.3, 1.6);
  },
  'Ellora Caves'(g) {
    // a long basalt escarpment with cave façades, and the Kailasa temple carved down out of the rock
    const S = '#8a7f72', S2 = '#9c8f80';
    box(g, 1.4, 0.004, 0.8, '#8fa86a', 0, 0, 0.1);
    box(g, 1.4, 0.13, 0.25, S, 0, 0, -0.32);                                  // the cliff
    box(g, 1.4, 0.01, 0.25, '#6f8a52', 0, 0.13, -0.32);
    for (let i = 0; i < 16; i++) { if (i === 7 || i === 8) continue; const x = -0.65 + i * 0.085; box(g, 0.06, 0.06, 0.01, '#3e3a35', x, 0.02, -0.195); for (let k = 0; k < 3; k++) cyl(g, 0.004, 0.004, 0.06, S2, x - 0.02 + k * 0.02, 0.02, -0.19, 6); }
    // Kailasa: courtyard cut into the hill, temple standing free inside it
    box(g, 0.3, 0.004, 0.24, '#7d7266', 0, 0.002, -0.08);
    for (const s of [-1, 1]) box(g, 0.03, 0.13, 0.24, S, s * 0.16, 0, -0.08);
    const K = G(g, 0, 0, -0.1);
    box(K, 0.14, 0.04, 0.1, S2); for (let i = 0; i < 9; i++) box(K, 0.01, 0.025, 0.002, '#7d7266', -0.06 + i * 0.015, 0.008, 0.051);
    for (let i = 0; i < 6; i++) box(K, 0.1 - i * 0.014, 0.014, 0.08 - i * 0.011, i % 2 ? S2 : S, 0, 0.04 + i * 0.014);  // stepped shikhara
    sph(K, 0.012, S2, 0, 0.13, 0, 8);
    for (const s of [-1, 1]) { box(K, 0.012, 0.11, 0.012, S2, s * 0.09, 0, 0.06); box(K, 0.025, 0.02, 0.04, S, s * 0.08, 0, 0.03); } // the two dhvaja pillars, stone elephants
    box(K, 0.05, 0.05, 0.03, S2, 0, 0, 0.09); for (let i = 0; i < 3; i++) box(K, 0.04 - i * 0.01, 0.01, 0.024, S, 0, 0.05 + i * 0.01, 0.09); // Nandi shrine & gate
  },
  'Statue of Unity'(g, c = '#8b8f86') {
    // Sardar Patel striding in a dhoti and shawl, 182 m, on Sadhu Bet island in the Narmada
    water(g, 1.0, 1.0); cyl(g, 0.12, 0.15, 0.03, '#7a8a5a', 0, 0, 0, 12);
    box(g, 0.012, 0.004, 0.5, '#cfc6b4', 0, 0.02, 0.3);                       // bridge to the island
    const base = cyl(g, 0.07, 0.08, 0.05, '#cfc6b4', 0, 0.03, 0, 16); void base;  // memorial garden & exhibition podium
    const n = G(g, 0, 0.08, 0), B = '#7d8278', B2 = '#8b9086';
    for (const s of [-1, 1]) { box(n, 0.022, 0.03, 0.03, '#5f6460', s * 0.018, 0, s * 0.008); }        // sandals / feet
    lathe(n, [[0.0001, 0.02], [0.045, 0.02], [0.05, 0.08], [0.042, 0.15], [0.034, 0.2], [0.0001, 0.2]], B2, 0, 0, 0, 12); // dhoti, flaring
    lathe(n, [[0.0001, 0.2], [0.036, 0.2], [0.04, 0.27], [0.044, 0.3], [0.03, 0.32], [0.0001, 0.32]], B, 0, 0, 0, 12);   // shawl-wrapped torso
    for (const s of [-1, 1]) { const a = cyl(n, 0.009, 0.011, 0.13, B, s * 0.046, 0.18, 0, 8); a.rotation.z = s * 0.06; sph(n, 0.01, B2, s * 0.048, 0.18, 0, 6); } // arms by his sides
    cyl(n, 0.012, 0.014, 0.012, B2, 0, 0.32, 0, 10);
    const h = sph(n, 0.022, B2, 0, 0.35, 0, 12); h.scale.set(0.9, 1.15, 0.95);           // head
    for (let i = 0; i < 6; i++) tree(g, Math.cos(i) * 0.1, Math.sin(i) * 0.1, 1.4);
  },
  'Mount Everest'(g) {
    // a three-sided pyramid with the Lhotse wall beside it, Nuptse in front, and the Khumbu Glacier flowing out
    const R = '#6f6a66', R2 = '#5d5955', S = '#f6f8fb';
    const peak = (x, z, r, h, ry, sides = 3) => { const p = cone(g, r, h, R, x, 0, z, sides); p.rotation.y = ry; const s = cone(g, r * 0.5, h * 0.5, S, x, h * 0.5, z, sides); s.rotation.y = ry; return p; };
    peak(0, 0, 3.4, 4.6, 0.3); peak(1.2, -1.0, 2.0, 2.6, 0.9, 4);                   // Everest summit pyramid
    peak(2.4, 0.7, 2.6, 4.2, 0.8, 4);                                         // Lhotse
    box(g, 2.2, 1.2, 0.5, R2, 1.3, 1.6, 0.6).rotation.y = -0.3;               // the Lhotse face ridge
    peak(0.8, 2.4, 2.2, 3.4, 0.1, 5);                                         // Nuptse
    peak(-2.6, -1.2, 2.4, 3.2, 0.5, 5); peak(-1.6, 2.2, 1.8, 2.2, 0.2, 5); peak(3.8, -1.8, 2.2, 2.6, 0.5, 5);
    for (let i = 0; i < 8; i++) { const t = i / 7; box(g, 0.5 - t * 0.1, 0.03, 0.6, '#e4ecf2', -0.4 - t * 1.2, 0.2 - t * 0.15, 2.6 + t * 1.4).rotation.y = 0.6; } // Khumbu Glacier
    box(g, 0.5, 0.02, 0.5, '#d9e3ea', -0.5, 0.3, 1.9).rotation.y = 0.6;     // the icefall
    for (let i = 0; i < 6; i++) box(g, 0.03, 0.02, 0.02, ['#f6c445', '#e2533a', '#3b8fd0'][i % 3], -1.4 + (i % 3) * 0.06, 0.06, 3.7 + Math.floor(i / 3) * 0.06); // Base Camp tents
    M(g, new THREE.SphereGeometry(0.6, 8, 6), '#ffffff', -0.8, 4.4, 0.2, { transparent: true, opacity: 0.55 }).scale.set(1.8, 0.25, 0.6); // the summit's snow plume
  },
};
