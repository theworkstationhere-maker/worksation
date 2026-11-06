// Builds public/roads.json: a road network that links every famous place (and the major cities) to the rest,
// country by country. A road only joins two points on the same landmass of the same country and never leaves it,
// so roads don't cross borders or the sea. Run: node scripts/build-roads.js
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const RES = 10; // raster cells per degree (0.1° ≈ 11 km)

// ---------------------------------------------------------------- countries → landmass raster
const topo = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json').then((r) => r.json());
const { scale: [sx, sy], translate: [tx, ty] } = topo.transform;
const arcs = topo.arcs.map((a) => { let x = 0, y = 0; return a.map(([dx, dy]) => [(x += dx) * sx + tx, (y += dy) * sy + ty]); });
const arcPts = (i) => (i >= 0 ? arcs[i] : arcs[~i].slice().reverse());
const ringOf = (idx) => { const pts = []; for (const i of idx) { const a = arcPts(i); pts.push(...(pts.length ? a.slice(1) : a)); } return pts; };
const polys = []; // { country, rings: [outer, ...holes] }
for (const g of topo.objects.countries.geometries) {
  const name = g.properties?.name || '';
  if (name === 'Antarctica') continue;
  const list = g.type === 'Polygon' ? [g.arcs] : g.type === 'MultiPolygon' ? g.arcs : [];
  for (const p of list) polys.push({ country: name, rings: p.map(ringOf) });
}
const W = 360 * RES, H = 180 * RES;
const land = new Uint16Array(W * H); // 0 = sea, else polygon index + 1
polys.forEach((poly, pi) => {
  let minY = 90, maxY = -90;
  for (const [, y] of poly.rings[0]) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  for (let row = Math.floor((90 - maxY) * RES); row <= Math.ceil((90 - minY) * RES); row++) {
    const lat = 90 - (row + 0.5) / RES, xs = [];
    for (const ring of poly.rings) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [x1, y1] = ring[j], [x2, y2] = ring[i];
      if ((y1 > lat) !== (y2 > lat) && Math.abs(x2 - x1) < 180) xs.push(x1 + ((lat - y1) / (y2 - y1)) * (x2 - x1));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let c = Math.ceil((xs[k] + 180) * RES - 0.5); c <= Math.floor((xs[k + 1] + 180) * RES - 0.5); c++) if (row >= 0 && row < H && c >= 0 && c < W) land[row * W + c] = pi + 1;
  }
});
const cellAt = (lon, lat) => { const c = Math.floor((lon + 180) * RES), r = Math.floor((90 - lat) * RES); return c < 0 || c >= W || r < 0 || r >= H ? 0 : land[r * W + c]; };
function landId(lon, lat) { // the landmass a point is on (points just off the coast snap to the nearest land cell)
  let id = cellAt(lon, lat); if (id) return id;
  for (let d = 1; d <= 3; d++) for (let a = 0; a < 8; a++) { id = cellAt(lon + (Math.cos(a * 0.785) * d) / RES, lat + (Math.sin(a * 0.785) * d) / RES); if (id) return id; }
  return 0;
}

// ---------------------------------------------------------------- nodes: every place + big cities
const places = JSON.parse(await readFile(path.join(ROOT, 'public/places.json'), 'utf8'));
const lmSrc = await readFile(path.join(ROOT, 'public/landmarks.js'), 'utf8');
const curated = [...lmSrc.matchAll(/name: '([^']+)', lat: (-?[\d.]+), lon: (-?[\d.]+)/g)].map((m) => ({ n: m[1], lat: +m[2], lon: +m[3] }));
const geo = JSON.parse(await readFile(path.join(ROOT, 'public/geo.json'), 'utf8'));
const nodes = [];
const seen = new Set();
const addNode = (lon, lat, city, pop = 0) => { const k = Math.round(lon * 50) + ',' + Math.round(lat * 50); if (seen.has(k)) return; seen.add(k); const id = landId(lon, lat); if (id) nodes.push({ lon, lat, id, city, pop }); };
for (const [, lon, lat, pop] of geo.cities || []) addNode(lon, lat, true, pop);
for (const p of [...curated, ...places]) addNode(p.lon, p.lat, false);
console.log('nodes', nodes.length, 'on', new Set(nodes.map((n) => n.id)).size, 'landmasses');

// ---------------------------------------------------------------- per-landmass network: MST + a few loops
const kmBetween = (a, b) => Math.hypot(a.lat - b.lat, (a.lon - b.lon) * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180))) * 111.2;
function staysOnLand(a, b) {
  const d = kmBetween(a, b), n = Math.max(2, Math.ceil(d / 8));
  let sea = 0, run = 0;
  for (let i = 1; i < n; i++) {
    const t = i / n, id = cellAt(a.lon + (b.lon - a.lon) * t, a.lat + (b.lat - a.lat) * t);
    if (id && id !== a.id) return false;               // another country or another island
    if (!id) { sea++; run++; if (run > 2) return false; } else run = 0;
  }
  return sea <= Math.max(1, n * 0.2);
}
const groups = new Map();
for (const n of nodes) { if (!groups.has(n.id)) groups.set(n.id, []); groups.get(n.id).push(n); }
const roads = [];
for (const [, list] of groups) {
  if (list.length < 2) continue;
  // candidate edges: each node's nearest neighbours (grid bucketed)
  const cell = 1.5, grid = new Map();
  list.forEach((n, i) => { const k = Math.floor(n.lon / cell) + ',' + Math.floor(n.lat / cell); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); });
  const cand = [];
  list.forEach((a, i) => {
    const gx = Math.floor(a.lon / cell), gy = Math.floor(a.lat / cell), near = [];
    for (let rad = 1; rad <= 6 && near.length < 8; rad++) { near.length = 0; for (let x = -rad; x <= rad; x++) for (let y = -rad; y <= rad; y++) for (const j of grid.get(gx + x + ',' + (gy + y)) || []) if (j !== i) near.push(j); }
    near.map((j) => [j, kmBetween(a, list[j])]).sort((p, q) => p[1] - q[1]).slice(0, 7).forEach(([j, d]) => { if (i < j || !near.includes(i)) cand.push([d, Math.min(i, j), Math.max(i, j)]); });
  });
  cand.sort((p, q) => p[0] - q[0]);
  const parent = list.map((_, i) => i), find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const used = new Set(), extra = [];
  for (const [d, i, j] of cand) {
    const k = i + ':' + j; if (used.has(k) || d > 900) continue; used.add(k);
    if (!staysOnLand(list[i], list[j])) continue;
    const ri = find(i), rj = find(j);
    if (ri !== rj) { parent[ri] = rj; roads.push([list[i], list[j], d]); }
    else if (d < 90) extra.push([list[i], list[j], d]);   // short links make loops, like a real network
  }
  extra.slice(0, Math.ceil(list.length * 0.25)).forEach((e) => roads.push(e));
  // join any pieces left apart (dense clusters only linked among themselves) by their nearest valid link
  for (let pass = 0; pass < 40; pass++) {
    const comps = new Map(); list.forEach((_, i) => { const r = find(i); if (!comps.has(r)) comps.set(r, []); comps.get(r).push(i); });
    if (comps.size < 2) break;
    let joined = 0;
    for (const [root, members] of comps) {
      if (find(root) !== root) continue;
      let best = null;
      for (const i of members) for (let j = 0; j < list.length; j++) { if (find(j) === find(i)) continue; const d = kmBetween(list[i], list[j]); if (d < 900 && (!best || d < best[0])) best = [d, i, j]; }
      // try the closest few candidates until one stays on land
      if (!best) continue;
      const tries = [];
      for (const i of members) for (let j = 0; j < list.length; j++) if (find(j) !== find(i)) { const d = kmBetween(list[i], list[j]); if (d < best[0] * 2.5 + 30) tries.push([d, i, j]); }
      tries.sort((x, y) => x[0] - y[0]);
      for (const [d, i, j] of tries.slice(0, 60)) if (staysOnLand(list[i], list[j])) { parent[find(i)] = find(j); roads.push([list[i], list[j], d]); joined++; break; }
    }
    if (!joined) break;
  }
}
const r3 = (v) => Math.round(v * 1000) / 1000;
// class 2 = highway (between big cities or long), 1 = road
const out = roads.map(([a, b, d]) => [r3(a.lon), r3(a.lat), r3(b.lon), r3(b.lat), (a.city && b.city && Math.max(a.pop, b.pop) > 500000) || d > 160 ? 2 : 1]);
await writeFile(path.join(ROOT, 'public/roads.json'), JSON.stringify(out));
console.log('roads', out.length, 'highways', out.filter((r) => r[4] === 2).length, 'km', Math.round(roads.reduce((s, r) => s + r[2], 0)));
