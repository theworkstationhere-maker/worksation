// Builds public/places.json: famous places of the world from Wikidata (CC0).
// Every UNESCO World Heritage Site, plus well-known places of many kinds.
// "links" = number of Wikipedia languages with an article, used as a fame score.
// Run: node scripts/fetch-places.js
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENDPOINT = 'https://query.wikidata.org/sparql';
const UA = 'WorldAgain/0.1 (famous places dataset builder)';

// [category, Wikidata class ids, minimum sitelinks]
const CLASSES = [
  ['tower', ['Q12518', 'Q1440300', 'Q11166728'], 18],
  ['skyscraper', ['Q11303'], 22],
  ['bridge', ['Q12280', 'Q158218', 'Q537127'], 18],
  ['statue', ['Q179700', 'Q2143825'], 15],
  ['monument', ['Q4989906', 'Q575759', 'Q1081138'], 20],
  ['arch', ['Q641226'], 10],
  ['castle', ['Q23413', 'Q751876'], 18],
  ['palace', ['Q16560', 'Q53536964'], 18],
  ['fort', ['Q57821', 'Q1785071', 'Q57831'], 15],
  ['church', ['Q16970', 'Q2977', 'Q56242215', 'Q163687', 'Q120560'], 25],
  ['mosque', ['Q32815'], 15],
  ['temple', ['Q842402', 'Q5393308', 'Q44539', 'Q845945', 'Q2977'], 12],
  ['pagoda', ['Q199451', 'Q180987'], 10],
  ['shrine', ['Q697295', 'Q845945'], 15],
  ['mausoleum', ['Q162875'], 12],
  ['museum', ['Q33506', 'Q207694', 'Q17431399'], 35],
  ['stadium', ['Q483110', 'Q1076486'], 30],
  ['opera', ['Q153562', 'Q24354'], 25],
  ['lighthouse', ['Q39715'], 12],
  ['archaeological', ['Q839954', 'Q109607', 'Q15661340'], 18],
  ['pyramid', ['Q12516'], 8],
  ['mountain', ['Q8502'], 35],
  ['volcano', ['Q8072', 'Q212057', 'Q190869'], 22],
  ['waterfall', ['Q34038'], 14],
  ['canyon', ['Q150784'], 14],
  ['lake', ['Q23397'], 70],
  ['park', ['Q46169'], 30],
  ['square', ['Q174782'], 40],
  ['themepark', ['Q2416723', 'Q194195'], 18],
  ['zoo', ['Q43501'], 25],
];

async function sparql(q, tries = 3) {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'user-agent': UA, accept: 'application/sparql-results+json', 'content-type': 'application/x-www-form-urlencoded' },
      body: 'query=' + encodeURIComponent(q),
    });
    if (r.ok) return (await r.json()).results.bindings;
    console.warn(`  HTTP ${r.status}, retrying…`);
    await new Promise((s) => setTimeout(s, 4000 * (i + 1)));
  }
  throw new Error('Wikidata query failed');
}

const select = (where) => `
SELECT ?item ?itemLabel ?coord ?countryLabel ?links WHERE {
  ${where}
  ?item wdt:P625 ?coord ; wikibase:sitelinks ?links .
  OPTIONAL { ?item wdt:P17 ?country }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`;

const places = new Map();
function take(rows, cat) {
  let n = 0;
  for (const r of rows) {
    const id = r.item.value.split('/').pop();
    const m = /Point\(([-\d.eE]+) ([-\d.eE]+)\)/.exec(r.coord?.value || '');
    const name = r.itemLabel?.value;
    if (!m || !name || /^Q\d+$/.test(name)) continue;
    const lon = +(+m[1]).toFixed(4), lat = +(+m[2]).toFixed(4);
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
    const links = +r.links.value;
    const prev = places.get(id);
    if (prev) { if (cat === 'heritage' || prev.c === 'heritage') prev.h = 1; continue; }
    places.set(id, { id, n: name, lat, lon, c: cat, k: r.countryLabel?.value || '', l: links, ...(cat === 'heritage' ? { h: 1 } : {}) });
    n++;
  }
  return n;
}

console.log('UNESCO World Heritage Sites…');
console.log('  +' + take(await sparql(select('?item wdt:P1435 wd:Q9259 .')), 'heritage'));

for (const [cat, ids, min] of CLASSES) {
  process.stdout.write(`${cat}… `);
  try {
    const rows = await sparql(select(`VALUES ?cls { ${ids.map((i) => 'wd:' + i).join(' ')} } ?item wdt:P31 ?cls .`).replace(
      'wikibase:sitelinks ?links .', `wikibase:sitelinks ?links . FILTER(?links >= ${min})`));
    console.log('+' + take(rows, cat));
  } catch (e) { console.log('skipped (' + e.message + ')'); }
}

// Mark World Heritage items that also matched a category.
const list = [...places.values()].sort((a, b) => b.l - a.l);
await writeFile(path.join(ROOT, 'public', 'places.json'), JSON.stringify(list));
console.log(`\nWrote ${list.length} places to public/places.json`);
