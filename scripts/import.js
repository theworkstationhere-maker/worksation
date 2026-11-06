// Turn Instagram comments into houses.
// Input: a CSV with "username,comment" per line (export your comments with any tool,
// or paste them). The comment text is treated as the town, e.g. "Hyderabad, Telangana".
// Usage: node scripts/import.js comments.csv          (server must be running)
//        node scripts/import.js comments.csv --dry    (show what would be added)
import { readFile } from 'node:fs/promises';
import { bulk } from './_lib.js';

const file = process.argv[2];
const dry = process.argv.includes('--dry');
if (!file) { console.error('Usage: node scripts/import.js comments.csv [--dry]'); process.exit(1); }

function parseCSV(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

const cache = new Map();
async function geocode(text) {
  const clean = text.replace(/[#@][\w.]+/g, ' ').replace(/[^\p{L}\p{N}\s,.-]/gu, ' ').replace(/\s+/g, ' ').trim();
  if (clean.length < 2) return null;
  const parts = clean.split(',').map((s) => s.trim()).filter(Boolean);
  const key = clean.toLowerCase();
  if (cache.has(key)) return cache.get(key);
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(parts[0])}&count=10&language=en&format=json`).then((x) => x.json()).catch(() => ({}));
  let res = r.results || [];
  // prefer the result whose state/country matches the rest of the comment
  const hint = parts.slice(1).join(' ').toLowerCase();
  if (hint) res = res.sort((a, b) => (`${b.admin1} ${b.country}`.toLowerCase().includes(hint) ? 1 : 0) - (`${a.admin1} ${a.country}`.toLowerCase().includes(hint) ? 1 : 0));
  const p = res[0];
  const place = p ? { geoId: String(p.id), name: p.name, admin1: p.admin1 || '', country: p.country || '', cc: p.country_code || '', lat: p.latitude, lon: p.longitude } : null;
  cache.set(key, place);
  await new Promise((s) => setTimeout(s, 120)); // be gentle with the free geocoder
  return place;
}

const rows = parseCSV(await readFile(file, 'utf8'));
if (rows[0] && /user/i.test(rows[0][0])) rows.shift();
const houses = [], failed = [];
for (const [user, ...rest] of rows) {
  const place = await geocode(rest.join(','));
  if (place) houses.push({ id: user, place }); else failed.push(`${user}: ${rest.join(',')}`);
}
console.log(`Matched ${houses.length}, could not place ${failed.length}`);
if (failed.length) console.log('Unplaced:\n  ' + failed.slice(0, 30).join('\n  '));
if (dry) houses.slice(0, 20).forEach((h) => console.log(`  @${h.id} → ${h.place.name}, ${h.place.admin1}, ${h.place.country}`));
else if (houses.length) console.log(await bulk(houses));
