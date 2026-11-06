// Stress test data: N houses spread over real cities with a realistic long tail
// (a few huge towns, many small ones), move-in times over the last 14 days.
// Usage: DATA_DIR=data-stress PORT=5190 node server.js   (separate copy!)
//        DATA_DIR=data-stress WA_URL=http://localhost:5190 node scripts/stress.js 50000
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { bulk, ROOT } from './_lib.js';

const N = Number(process.argv[2]) || 50000;
const geo = JSON.parse(await readFile(path.join(ROOT, 'public', 'geo.json'), 'utf8'));
const cities = geo.cities.slice(0, Number(process.argv[3]) || 400);
// Zipf-like weights: town #1 gets the most
const w = cities.map((_, i) => 1 / Math.pow(i + 1, 0.9));
const sum = w.reduce((a, b) => a + b, 0);
const counts = w.map((x) => Math.max(1, Math.round((x / sum) * N)));
const now = Date.now();
const rows = [];
let id = 0;
cities.forEach(([name, lon, lat, , country], ci) => {
  for (let k = 0; k < counts[ci] && id < N; k++) {
    rows.push({ id: `stress.${String(++id).padStart(6, '0')}`, t: now - Math.pow(Math.random(), 1.4) * 14 * 86400000,
      place: { geoId: 'stress:' + ci, name, admin1: '', country, lat, lon } });
  }
});
rows.sort((a, b) => a.t - b.t);
console.log(`Adding ${rows.length} houses in ${cities.length} towns (biggest: ${cities[0][0]} ${counts[0]}, ${cities[1][0]} ${counts[1]})`);
const t0 = Date.now();
for (let i = 0; i < rows.length; i += 5000) {
  const r = await bulk(rows.slice(i, i + 5000));
  process.stdout.write(`  ${Math.min(i + 5000, rows.length)} … population ${r.population}\n`);
}
console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
