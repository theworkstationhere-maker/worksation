// Adds real heights to public/places.json from Wikidata (CC0), so mountains, hills, volcanoes, towers and
// skyscrapers are drawn at their true size: "e" = elevation above sea level (m), "ht" = structure height (m).
// Run after fetch-places.js: node scripts/fetch-elevations.js
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'public', 'places.json');
const ENDPOINT = 'https://query.wikidata.org/sparql';
const UA = 'WorldAgain/0.1 (famous places dataset builder)';

const places = JSON.parse(await readFile(FILE, 'utf8'));
const want = places.filter((p) => /^Q\d+$/.test(p.id || '') && ['mountain', 'volcano', 'tower', 'skyscraper', 'lighthouse', 'statue'].includes(p.c));
const byId = new Map(want.map((p) => [p.id, p]));
console.log('asking Wikidata about', want.length, 'places');

async function sparql(q) {
  for (let tries = 0; tries < 4; tries++) {
    const r = await fetch(ENDPOINT + '?format=json&query=' + encodeURIComponent(q), { headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json' } });
    if (r.ok) return (await r.json()).results.bindings;
    await new Promise((res) => setTimeout(res, 3000 * (tries + 1)));
  }
  throw new Error('Wikidata query failed');
}
const ids = [...byId.keys()];
let got = 0;
for (let i = 0; i < ids.length; i += 200) {
  const chunk = ids.slice(i, i + 200).map((id) => 'wd:' + id).join(' ');
  // P2044 elevation above sea level; P2048 height (both normalised to metres)
  const rows = await sparql(`SELECT ?item ?e ?h WHERE { VALUES ?item { ${chunk} }
    OPTIONAL { ?item p:P2044/psn:P2044/wikibase:quantityAmount ?e. }
    OPTIONAL { ?item p:P2048/psn:P2048/wikibase:quantityAmount ?h. } }`);
  for (const r of rows) {
    const p = byId.get(r.item.value.split('/').pop());
    if (!p) continue;
    if (r.e && p.e === undefined) { p.e = Math.round(+r.e.value); got++; }
    if (r.h && p.ht === undefined) p.ht = Math.round(+r.h.value);
  }
  process.stdout.write('.');
}
await writeFile(FILE, JSON.stringify(places));
console.log('\nelevations found for', got, 'places; heights for', want.filter((p) => p.ht).length);
