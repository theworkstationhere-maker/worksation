// Builds public/geo.json: rivers, lakes, deserts, mountain ranges, state/province borders and
// state names, from Natural Earth (public domain). Simplified so the site stays fast.
// Run: node scripts/fetch-geo.js
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/';
const get = async (f) => {
  process.stdout.write(`${f}… `);
  const r = await fetch(BASE + f + '.geojson');
  if (!r.ok) throw new Error(`${f}: HTTP ${r.status}`);
  const j = await r.json();
  console.log(j.features.length + ' features');
  return j.features;
};

// Douglas–Peucker line simplification + 2-decimal rounding (~1 km).
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const sq = (p, a, b) => {
    let x = a[0], y = a[1], dx = b[0] - x, dy = b[1] - y;
    if (dx || dy) { const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy); if (t > 1) { x = b[0]; y = b[1]; } else if (t > 0) { x += dx * t; y += dy * t; } }
    dx = p[0] - x; dy = p[1] - y; return dx * dx + dy * dy;
  };
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); let max = 0, idx = 0;
    for (let i = a + 1; i < b; i++) { const d = sq(pts[i], pts[a], pts[b]); if (d > max) { max = d; idx = i; } }
    if (max > tol * tol) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  const out = [];
  for (let i = 0; i < pts.length; i++) if (keep[i]) {
    const p = [Math.round(pts[i][0] * 100) / 100, Math.round(pts[i][1] * 100) / 100];
    const l = out[out.length - 1];
    if (!l || l[0] !== p[0] || l[1] !== p[1]) out.push(p);
  }
  return out;
}
const lines = (g) => (!g ? [] : g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : []);
const polys = (g) => (!g ? [] : g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []);
const simpPolys = (g, tol) => polys(g).map((poly) => poly.map((ring) => simplify(ring, tol)).filter((r) => r.length > 3)).filter((p) => p.length);

const out = { rivers: [], lakes: [], deserts: [], ranges: [], states: [], stateLabels: [] };

for (const f of await get('ne_50m_rivers_lake_centerlines')) {
  const rank = f.properties.scalerank ?? 9;
  for (const l of lines(f.geometry)) { const s = simplify(l, 0.03); if (s.length > 1) out.rivers.push([rank, s]); }
}
for (const f of await get('ne_50m_lakes')) out.lakes.push(...simpPolys(f.geometry, 0.03));
for (const f of await get('ne_50m_geography_regions_polys')) {
  const cla = f.properties.featurecla || f.properties.FEATURECLA;
  const name = f.properties.name || f.properties.NAME || '';
  if (cla === 'Desert') out.deserts.push(...simpPolys(f.geometry, 0.05));
  if (cla === 'Range/mtn') for (const p of simpPolys(f.geometry, 0.05)) out.ranges.push([name, p]);
}
for (const f of await get('ne_10m_admin_1_states_provinces_lines')) {
  for (const l of lines(f.geometry)) { const s = simplify(l, 0.025); if (s.length > 1) out.states.push(s); }
}
for (const f of await get('ne_10m_admin_1_label_points')) {
  const p = f.properties, c = f.geometry && f.geometry.coordinates;
  const name = p.name || p.NAME || p.name_en;
  if (!c || !name) continue;
  out.stateLabels.push([name, Math.round(c[0] * 100) / 100, Math.round(c[1] * 100) / 100, p.admin || p.ADMIN || p.adm0_name || '', p.scalerank ?? p.SCALERANK ?? 5]);
}

for (const f of await get('ne_10m_populated_places_simple')) {
  const p = f.properties, c = f.geometry && f.geometry.coordinates;
  if (c && (p.pop_max || 0) >= 100000) out.cities = (out.cities || []).concat([[p.name, +c[0].toFixed(3), +c[1].toFixed(3), p.pop_max, p.adm0name || '', String(p.featurecla || '').includes('capital') ? 1 : 0]]);
}
out.cities = (out.cities || []).sort((a, b) => b[3] - a[3]);
// one label per state (first point wins)
const seen = new Set();
out.stateLabels = out.stateLabels.filter((l) => { const k = l[0] + '|' + l[3]; if (seen.has(k)) return false; seen.add(k); return true; });
const file = path.join(ROOT, 'public', 'geo.json');
await writeFile(file, JSON.stringify(out));
console.log(`\nrivers ${out.rivers.length}, lakes ${out.lakes.length}, deserts ${out.deserts.length}, ranges ${out.ranges.length}, state lines ${out.states.length}, state names ${out.stateLabels.length}`);
console.log(`Wrote ${file} (${(JSON.stringify(out).length / 1e6).toFixed(1)} MB before compression)`);
