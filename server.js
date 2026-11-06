// World Again — zero-dependency server built for crowds.
//  • SQLite (built into Node 22.13+) in WAL mode: safe concurrent writes, millions of houses.
//  • Every public response is cached in memory, pre-gzipped and tagged with an ETag,
//    so repeat visits cost a 304 and a CDN (Cloudflare) can absorb the burst.
//  • WORKERS=auto runs one process per CPU core.
//  • Per-IP limits on API calls and on registrations.
import http from 'node:http';
import cluster from 'node:cluster';
import os from 'node:os';
import zlib from 'node:zlib';
import { readFile, writeFile, rename, mkdir, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { randomBytes, timingSafeEqual, createHash, scrypt as scryptCb } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.join(ROOT, 'public');
const DATA = process.env.DATA_DIR ? path.resolve(ROOT, process.env.DATA_DIR) : path.join(ROOT, 'data');
const config = JSON.parse(await readFile(path.join(ROOT, 'config.json'), 'utf8'));
const PORT = Number(process.env.PORT) || config.port || 5180;
const WORKERS = process.env.WORKERS === 'auto' ? os.availableParallelism() : Math.max(1, Number(process.env.WORKERS) || 1);

await mkdir(DATA, { recursive: true });
const TOKEN_FILE = path.join(DATA, 'admin-token.txt');
const SALT_FILE = path.join(DATA, 'ip-salt.txt');
// Private preview: with ACCESS_GATE=1 every visitor must type the access code (kept in data/access-code.txt) first.
const GATE_FILE = path.join(DATA, 'access-code.txt');
if (process.env.TRUST_PROXY) config.trustProxy = process.env.TRUST_PROXY === 'true' ? true : process.env.TRUST_PROXY;

// ---------------------------------------------------------------- database
function openDb() {
  const db = new DatabaseSync(path.join(DATA, 'world.db'));
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA busy_timeout = 8000;
    PRAGMA cache_size = -64000;
    CREATE TABLE IF NOT EXISTS towns (
      key TEXT PRIMARY KEY, name TEXT NOT NULL, admin1 TEXT, country TEXT, cc TEXT,
      lat REAL NOT NULL, lon REAL NOT NULL, count INTEGER NOT NULL DEFAULT 0, mayor TEXT, created INTEGER);
    CREATE TABLE IF NOT EXISTS houses (
      id TEXT PRIMARY KEY, town TEXT NOT NULL, i INTEGER NOT NULL, t INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS houses_town ON houses(town, i);
    CREATE INDEX IF NOT EXISTS houses_t ON houses(t);
    CREATE INDEX IF NOT EXISTS towns_count ON towns(count DESC);
    CREATE TABLE IF NOT EXISTS presence (
      room TEXT NOT NULL, sid TEXT NOT NULL, id TEXT, x REAL, z REAL, h REAL, t INTEGER NOT NULL,
      PRIMARY KEY (room, sid)) WITHOUT ROWID;
    CREATE INDEX IF NOT EXISTS presence_t ON presence(t);
  `);
  // columns added later: customisation, ownership, moderation
  const addCol = (table, col, type) => {
    if (!db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
  };
  addCol('houses', 'look', 'TEXT');
  addCol('houses', 'owner', 'TEXT');
  addCol('houses', 'removed', 'INTEGER NOT NULL DEFAULT 0');
  addCol('towns', 'removed', 'INTEGER NOT NULL DEFAULT 0');
  addCol('presence', 'look', 'TEXT');
  addCol('houses', 'ip', 'TEXT');
  addCol('houses', 'user_id', 'INTEGER');
  addCol('houses', 'verified', 'INTEGER NOT NULL DEFAULT 0');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, pass TEXT NOT NULL, ig TEXT UNIQUE,
      code TEXT, verified INTEGER NOT NULL DEFAULT 0, reset_hash TEXT, reset_exp INTEGER, created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires INTEGER NOT NULL) WITHOUT ROWID;
    CREATE INDEX IF NOT EXISTS sessions_exp ON sessions(expires);
    CREATE TABLE IF NOT EXISTS wall (place TEXT NOT NULL, id TEXT NOT NULL, m INTEGER NOT NULL, t INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS wall_place ON wall(place, t);
  `);
  db.exec('CREATE INDEX IF NOT EXISTS houses_ip ON houses(ip) WHERE removed = 0 AND ip IS NOT NULL');
  // live houses per town, in order (fast town loading); hourly tallies (fast "this week" / "today")
  db.exec(`
    CREATE INDEX IF NOT EXISTS houses_town_live ON houses(town, i) WHERE removed = 0;
    CREATE TABLE IF NOT EXISTS town_hours (hour INTEGER NOT NULL, town TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (hour, town)) WITHOUT ROWID;
  `);
  if (!db.prepare('SELECT 1 FROM town_hours LIMIT 1').get() && db.prepare('SELECT 1 FROM houses LIMIT 1').get()) {
    db.exec('INSERT INTO town_hours SELECT t / 3600000, town, COUNT(*) FROM houses WHERE removed = 0 GROUP BY 1, 2');
  }
  return db;
}

// One-time move from the old data/db.json format.
async function migrateJson(db) {
  const old = path.join(DATA, 'db.json');
  if (!existsSync(old) || db.prepare('SELECT COUNT(*) n FROM houses').get().n > 0) return;
  const j = JSON.parse(await readFile(old, 'utf8'));
  const rows = (j.houses || []).map((h) => ({ id: h.id, t: h.t, place: { geoId: h.town, ...j.towns[h.town] } }));
  const { added } = insertMany(db, rows, true);
  await rename(old, old + '.migrated');
  console.log(`Migrated ${added} houses from db.json`);
}

function statements(db) {
  return {
    house: db.prepare('SELECT id, town, i, t, look, owner, removed, user_id, verified FROM houses WHERE id = ?'),
    town: db.prepare('SELECT * FROM towns WHERE key = ?'),
    insTown: db.prepare('INSERT OR IGNORE INTO towns (key, name, admin1, country, cc, lat, lon, count, mayor, created) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)'),
    bump: db.prepare('UPDATE towns SET count = count + 1 WHERE key = ? RETURNING count'),
    insHouse: db.prepare('INSERT INTO houses (id, town, i, t, owner) VALUES (?, ?, ?, ?, ?)'),
    townHouses: db.prepare('SELECT id, i, t, look, verified FROM houses INDEXED BY houses_town_live WHERE town = ? AND removed = 0 ORDER BY i'),
    towns: db.prepare('SELECT key, name, admin1, country, lat, lon, count - removed AS count, mayor FROM towns WHERE count > removed ORDER BY count DESC LIMIT 50000'),
    userByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
    userById: db.prepare('SELECT * FROM users WHERE id = ?'),
    userByIg: db.prepare('SELECT * FROM users WHERE ig = ?'),
    insUser: db.prepare('INSERT INTO users (email, pass, ig, code, created) VALUES (?, ?, ?, ?, ?)'),
    setUserIg: db.prepare('UPDATE users SET ig = ? WHERE id = ?'),
    setPass: db.prepare('UPDATE users SET pass = ?, reset_hash = NULL, reset_exp = NULL WHERE id = ?'),
    setReset: db.prepare('UPDATE users SET reset_hash = ?, reset_exp = ? WHERE id = ?'),
    userByReset: db.prepare('SELECT * FROM users WHERE reset_hash = ? AND reset_exp > ?'),
    verifyUser: db.prepare('UPDATE users SET verified = ? WHERE ig = ?'),
    verifyHouse: db.prepare('UPDATE houses SET verified = ? WHERE id = ?'),
    linkHouse: db.prepare('UPDATE houses SET user_id = ? WHERE id = ? AND user_id IS NULL'),
    insSession: db.prepare('INSERT INTO sessions (token, user_id, expires) VALUES (?, ?, ?)'),
    session: db.prepare('SELECT user_id FROM sessions WHERE token = ? AND expires > ?'),
    delSession: db.prepare('DELETE FROM sessions WHERE token = ?'),
    sweepSessions: db.prepare('DELETE FROM sessions WHERE expires < ?'),
    wallList: db.prepare('SELECT id, m, t FROM wall WHERE place = ? ORDER BY t DESC LIMIT 30'),
    wallAdd: db.prepare('INSERT INTO wall (place, id, m, t) VALUES (?, ?, ?, ?)'),
    setIp: db.prepare('UPDATE houses SET ip = ? WHERE id = ?'),
    ipCount: db.prepare('SELECT COUNT(*) n FROM houses WHERE ip = ? AND removed = 0'),
    population: db.prepare('SELECT COALESCE(SUM(count - removed), 0) n FROM towns'),
    hourUp: db.prepare('INSERT INTO town_hours (hour, town, n) VALUES (?, ?, ?) ON CONFLICT (hour, town) DO UPDATE SET n = n + excluded.n'),
    hourSweep: db.prepare('DELETE FROM town_hours WHERE hour < ?'),
    townCount: db.prepare('SELECT COUNT(*) n FROM towns WHERE count > removed'),
    growth: db.prepare('SELECT town, SUM(n) n FROM town_hours WHERE hour > ? / 3600000 GROUP BY town ORDER BY n DESC LIMIT 8'),
    recent: db.prepare('SELECT h.id, t.name town, t.country FROM houses h JOIN towns t ON t.key = h.town WHERE h.removed = 0 ORDER BY h.t DESC LIMIT 12'),
    raceCountries: db.prepare("SELECT country, MAX(cc) cc, SUM(count - removed) n, COUNT(*) towns FROM towns WHERE country <> '' AND count > removed GROUP BY country ORDER BY n DESC LIMIT 60"),
    raceCountriesSince: db.prepare("SELECT t.country, MAX(t.cc) cc, SUM(h.n) n FROM town_hours h JOIN towns t ON t.key = h.town WHERE h.hour > ? / 3600000 AND t.country <> '' GROUP BY t.country ORDER BY n DESC LIMIT 60"),
    raceTowns: db.prepare('SELECT key, name, admin1, country, cc, count - removed AS n, mayor FROM towns ORDER BY n DESC LIMIT 60'),
    raceTownsSince: db.prepare('SELECT t.key, t.name, t.admin1, t.country, t.cc, SUM(h.n) n, t.mayor FROM town_hours h JOIN towns t ON t.key = h.town WHERE h.hour > ? / 3600000 GROUP BY t.key ORDER BY n DESC LIMIT 60'),
    presUp: db.prepare(`INSERT INTO presence (room, sid, id, x, z, h, t, look) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (room, sid) DO UPDATE SET id = excluded.id, x = excluded.x, z = excluded.z, h = excluded.h, t = excluded.t, look = excluded.look`),
    presOthers: db.prepare('SELECT sid, id, x, z, h, look FROM presence WHERE room = ? AND t > ? AND sid <> ? LIMIT 60'),
    setLook: db.prepare('UPDATE houses SET look = ?, owner = COALESCE(owner, ?) WHERE id = ?'),
    // admin
    remove: db.prepare('UPDATE houses SET removed = 1 WHERE id = ? AND removed = 0'),
    restore: db.prepare('UPDATE houses SET removed = 0 WHERE id = ? AND removed = 1'),
    townRemoved: db.prepare('UPDATE towns SET removed = removed + ? WHERE key = ?'),
    firstLive: db.prepare('SELECT id FROM houses WHERE town = ? AND removed = 0 ORDER BY i LIMIT 1'),
    setMayor: db.prepare('UPDATE towns SET mayor = ? WHERE key = ?'),
    resetKey: db.prepare('UPDATE houses SET owner = NULL WHERE id = ?'),
    hourly: db.prepare('SELECT hour h, SUM(n) n FROM town_hours WHERE hour > ? / 3600000 GROUP BY hour ORDER BY hour'),
    removedCount: db.prepare('SELECT COUNT(*) n FROM houses WHERE removed = 1'),
    claimedCount: db.prepare('SELECT COUNT(*) n FROM houses WHERE owner IS NOT NULL AND removed = 0'),
    adminList: db.prepare('SELECT h.id, h.i, h.t, h.removed, h.owner IS NOT NULL claimed, h.user_id IS NOT NULL account, h.verified, t.name town, t.country FROM houses h JOIN towns t ON t.key = h.town WHERE h.id LIKE ? ORDER BY h.t DESC LIMIT 100'),
    exportAll: db.prepare('SELECT h.id, t.name town, t.admin1, t.country, h.t, h.removed FROM houses h JOIN towns t ON t.key = h.town ORDER BY h.t'),
    presCount: db.prepare('SELECT COUNT(*) n FROM presence WHERE room = ? AND t > ?'),
    presLeave: db.prepare('DELETE FROM presence WHERE room = ? AND sid = ?'),
    presSweep: db.prepare('DELETE FROM presence WHERE t < ?'),
  };
}

// Insert many houses in one transaction. Duplicates are skipped.
function insertMany(db, rows, allowBackdate = false) {
  const S = statements(db);
  let added = 0, skipped = 0, limited = 0;
  const now = Date.now();
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const r of rows) {
      const place = validPlace(r.place);
      const id = cleanHandle(r.id);
      if (!HANDLE.test(id) || !place || S.house.get(id)) { skipped++; continue; }
      if (r.ip && r.ipMax && S.ipCount.get(r.ip).n >= r.ipMax) { skipped++; limited++; continue; }
      const t = allowBackdate && Number.isFinite(r.t) && r.t <= now ? Math.floor(r.t) : now;
      S.insTown.run(place.geoId, place.name, place.admin1, place.country, place.cc, place.lat, place.lon, id, t);
      const { count } = S.bump.get(place.geoId);
      S.insHouse.run(id, place.geoId, count - 1, t, r.key ? hashKey(r.key) : null);
      if (r.ip) S.setIp.run(r.ip, id);
      if (r.userId) { S.linkHouse.run(r.userId, id); S.setUserIg.run(id, r.userId); }
      S.hourUp.run(Math.floor(t / 3600000), place.geoId, 1);
      added++;
    }
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  return { added, skipped, limited };
}

// ---------------------------------------------------------------- validation
const HANDLE = /^(?!.*\.\.)(?!\.)(?!.*\.$)[a-z0-9._]{1,30}$/;
const cleanHandle = (s) => String(s || '').trim().replace(/^@+/, '').toLowerCase();
const str = (s, n = 80) => String(s ?? '').trim().slice(0, n);
function validPlace(p) {
  if (!p || typeof p !== 'object') return null;
  const lat = Number(p.lat), lon = Number(p.lon);
  const name = str(p.name), geoId = str(p.geoId, 40);
  if (!name || !geoId || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { geoId, name, admin1: str(p.admin1), country: str(p.country), cc: str(p.cc, 4), lat, lon };
}
// Each device keeps a private key for the houses it registered; only a hash is stored.
const hashKey = (k) => createHash('sha256').update(String(k)).digest('hex');
const validKey = (k) => typeof k === 'string' && k.length >= 16 && k.length <= 80;
const LOOK_MAX = { house: { w: 8, r: 10, g: 4 }, avatar: { s: 10, p: 6, k: 6, h: 6, y: 4 } };
function validLook(o) {
  const out = {};
  for (const part of Object.keys(LOOK_MAX)) {
    if (!o || typeof o[part] !== 'object' || !o[part]) continue;
    out[part] = {};
    for (const [k, max] of Object.entries(LOOK_MAX[part])) {
      const v = Number(o[part][k]);
      if (Number.isInteger(v) && v >= 0 && v < max) out[part][k] = v;
    }
  }
  return out;
}
// passwords: scrypt with a random salt; only the hash is stored
const scryptAsync = (pw, salt) => new Promise((res, rej) => scryptCb(pw, salt, 64, { N: 16384, r: 8, p: 1 }, (e, k) => (e ? rej(e) : res(k))));
async function hashPassword(pw) { const salt = randomBytes(16); return `s1$${salt.toString('base64')}$${(await scryptAsync(pw, salt)).toString('base64')}`; }
async function checkPassword(pw, stored) {
  const [, salt, hash] = String(stored).split('$');
  if (!salt || !hash) return false;
  const got = await scryptAsync(pw, Buffer.from(salt, 'base64')), want = Buffer.from(hash, 'base64');
  return got.length === want.length && timingSafeEqual(got, want);
}
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i;
const validPassword = (pw) => typeof pw === 'string' && pw.length >= 8 && pw.length <= 200;
const newCode = () => 'WA-' + randomBytes(3).toString('hex').toUpperCase();
const parseLook = (s) => { try { return s ? JSON.parse(s) : null; } catch { return null; } };
const dayNumber = () => Math.max(1, Math.floor((Date.now() - Date.parse(config.launchDate)) / 86400000) + 1);

// ---------------------------------------------------------------- live presence (memory, not the database)
// Walk-mode heartbeats are frequent and temporary, so they live in memory in the primary process.
const rooms = new Map(); // room -> Map(sid -> {id, x, z, h, look, t})
function presence({ room, sid, id, x, z, h, look, leave }) {
  const now = Date.now();
  let r = rooms.get(room);
  if (leave) { r?.delete(sid); return { ok: true }; }
  if (!r) { r = new Map(); rooms.set(room, r); }
  r.delete(sid); r.set(sid, { id, x, z, h, look, t: now }); // re-insert = newest last
  // newest 60 visitors (walk the Map from the end is not possible, so keep it short: stop after 60 fresh ones)
  const others = [];
  for (const [k, v] of r) {
    if (k === sid || now - v.t > 8000) continue;
    others.push({ sid: k, id: v.id, x: v.x, z: v.z, h: v.h, look: v.look });
    if (others.length >= 60) break;
  }
  return { count: r.size, others }; // stale entries are swept every 2 s, so size is accurate enough
}
setInterval(() => { const now = Date.now(); for (const [k, r] of rooms) { for (const [s, v] of r) { if (now - v.t > 8000) r.delete(s); else break; } if (!r.size) rooms.delete(k); } }, 2000).unref();

// ---------------------------------------------------------------- primary process
if (cluster.isPrimary) {
  if (!process.env.ADMIN_TOKEN && !existsSync(TOKEN_FILE)) await writeFile(TOKEN_FILE, randomBytes(18).toString('hex') + '\n', { mode: 0o600 });
  if (!existsSync(SALT_FILE)) await writeFile(SALT_FILE, randomBytes(24).toString('hex') + '\n', { mode: 0o600 });
  const db = openDb();
  await migrateJson(db);
  db.close();
  if (WORKERS > 1) {
    console.log(`${config.name}: starting ${WORKERS} workers on http://localhost:${PORT}`);
    for (let i = 0; i < WORKERS; i++) cluster.fork();
    cluster.on('message', (w, msg) => { if (msg && msg.t === 'pres') w.send({ t: 'pres', id: msg.id, r: presence(msg.d) }); });
    cluster.on('exit', (w, code) => { console.warn(`worker ${w.process.pid} exited (${code}), restarting`); cluster.fork(); });
  } else {
    await startWorker();
  }
} else {
  await startWorker();
}

// ---------------------------------------------------------------- worker
const presWait = new Map();
let presSeq = 0;
if (cluster.isWorker) process.on('message', (m) => { if (m && m.t === 'pres') { presWait.get(m.id)?.(m.r); presWait.delete(m.id); } });
function askPresence(d) {
  if (!cluster.isWorker) return Promise.resolve(presence(d));
  return new Promise((resolve) => {
    const id = ++presSeq;
    presWait.set(id, resolve);
    process.send({ t: 'pres', id, d });
    setTimeout(() => { if (presWait.delete(id)) resolve({ count: 1, others: [] }); }, 2000);
  });
}
const geoCache = new Map();
async function verifyPlace(geoId) {
  if (!/^\d{1,12}$/.test(geoId)) return null;
  if (geoCache.has(geoId)) return geoCache.get(geoId);
  try {
    const r = await fetch(`https://geocoding-api.open-meteo.com/v1/get?id=${geoId}&language=en`, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return null;
    const g = await r.json();
    const place = validPlace({ geoId: String(g.id), name: g.name, admin1: g.admin1, country: g.country, cc: g.country_code, lat: g.latitude, lon: g.longitude });
    if (place) { geoCache.set(geoId, place); if (geoCache.size > 20000) geoCache.delete(geoCache.keys().next().value); }
    return place;
  } catch { return null; }
}
async function startWorker() {
  const ADMIN_TOKEN = process.env.ADMIN_TOKEN || (await readFile(TOKEN_FILE, 'utf8')).trim();
  const db = openDb();
  const S = statements(db);

  // ---- cached, pre-compressed responses
  function pack(body, type = 'application/json; charset=utf-8') {
    const buf = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
    // compressed copies are made on first request, for the encodings clients actually ask for
    const e = { buf, type, etag: '"' + createHash('sha1').update(buf).digest('base64url').slice(0, 20) + '"' };
    let gz, br;
    Object.defineProperty(e, 'gz', { get: () => (buf.length > 1024 ? (gz ||= zlib.gzipSync(buf, { level: 6 })) : null) });
    Object.defineProperty(e, 'br', { get: () => (buf.length > 1024 ? (br ||= zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 } })) : null) });
    return e;
  }
  const cache = new Map();
  function cached(key, ttl, build) {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < ttl) return hit.entry;
    const entry = pack(build());
    cache.set(key, { at: Date.now(), entry });
    if (cache.size > 5000) for (const k of [...cache.keys()].slice(0, 1000)) cache.delete(k);
    return entry;
  }
  const invalidate = (...keys) => keys.forEach((k) => cache.delete(k));
  function sendEntry(req, res, e, cacheControl) {
    const headers = { ...SECURITY, ...(e.type.startsWith('text/html') ? { 'content-security-policy': CSP } : {}), 'content-type': e.type, etag: e.etag, 'cache-control': cacheControl, vary: 'accept-encoding' };
    if (req.headers['if-none-match'] === e.etag) { res.writeHead(304, headers); return res.end(); }
    const ae = String(req.headers['accept-encoding'] || '');
    let body = e.buf;
    if (e.br && /\bbr\b/.test(ae)) { body = e.br; headers['content-encoding'] = 'br'; }
    else if (e.gz && /\bgzip\b/.test(ae)) { body = e.gz; headers['content-encoding'] = 'gzip'; }
    headers['content-length'] = body.length;
    res.writeHead(200, headers);
    res.end(req.method === 'HEAD' ? undefined : body);
  }
  const json = (res, code, obj, extra = {}) => {
    res.writeHead(code, { ...SECURITY, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra });
    res.end(JSON.stringify(obj));
  };

  // ---- builders
  const townRow = (t) => t && { key: t.key, name: t.name, admin1: t.admin1, country: t.country, lat: t.lat, lon: t.lon, count: t.count - (t.removed || 0), mayor: t.mayor };
  const buildState = () => {
    const week = Date.now() - 7 * 86400000;
    return {
      day: dayNumber(),
      population: S.population.get().n,
      townCount: S.townCount.get().n,
      news: S.growth.all(week).map((g) => ({ ...townRow(S.town.get(g.town)), newThisWeek: g.n })),
      recent: S.recent.all(),
    };
  };
  // Leaderboards: countries and towns, all time / this week / today.
  const buildRace = () => {
    const week = Date.now() - 7 * 86400000, day = Date.now() - 86400000;
    return {
      countries: { all: S.raceCountries.all(), week: S.raceCountriesSince.all(week), today: S.raceCountriesSince.all(day) },
      towns: { all: S.raceTowns.all(), week: S.raceTownsSince.all(week), today: S.raceTownsSince.all(day) },
    };
  };
  // Compact rows: [key, name, admin1, country, lat, lon, count, mayor]
  const buildTowns = () => ({ rows: S.towns.all().map((t) => [t.key, t.name, t.admin1, t.country, t.lat, t.lon, t.count, t.mayor]) });
  const buildTown = (key) => {
    const t = S.town.get(key);
    if (!t) return null;
    return { town: townRow(t), now: Date.now(), houses: S.townHouses.all(key).map((h) => {
      const l = parseLook(h.look);
      const look = l && l.house ? [l.house.w ?? -1, l.house.r ?? -1, l.house.g ?? 0] : null;
      return h.verified ? [h.id, h.i, h.t, look, 1] : look ? [h.id, h.i, h.t, look] : [h.id, h.i, h.t];
    }) };
  };

  // ---- static files: read once, pre-compressed
  const files = new Map();
  const MIME = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
  };
  async function loadStatic(dir = PUB) {
    for (const name of await readdir(dir)) {
      const full = path.join(dir, name);
      if ((await stat(full)).isDirectory()) { await loadStatic(full); continue; }
      const rel = '/' + path.relative(PUB, full).split(path.sep).join('/');
      files.set(rel, pack(await readFile(full), MIME[path.extname(full)] || 'application/octet-stream'));
    }
  }
  await loadStatic();
  // Content-Security-Policy: only our own code, the 3D library CDN, Google Fonts and the weather/geocoder APIs.
  const inlineHashes = [];
  for (const [name, f] of files) if (name.endsWith('.html')) for (const m of f.buf.toString('utf8').matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) inlineHashes.push(`'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`);
  const CSP = [
    "default-src 'self'", `script-src 'self' https://cdn.jsdelivr.net ${inlineHashes.join(' ')}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", "font-src https://fonts.gstatic.com",
"img-src 'self' data: blob: https://*.wikimedia.org", "connect-src 'self' https://cdn.jsdelivr.net https://tiles.maps.eox.at https://tiles.openfreemap.org https://geocoding-api.open-meteo.com https://api.open-meteo.com https://en.wikipedia.org https://www.wikidata.org",
    "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'", "object-src 'none'",
  ].join('; ');
  const SECURITY = {
    'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin', 'x-frame-options': 'DENY',
    'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()', 'cross-origin-opener-policy': 'same-origin',
    ...(process.env.NODE_ENV === 'production' ? { 'strict-transport-security': 'max-age=31536000; includeSubDomains' } : {}),
  };
  const DEV = process.env.NODE_ENV === 'development' || process.env.WA_DEV === '1';

  // ---- rate limits (per worker; put Cloudflare in front for real DDoS protection)
  const buckets = new Map();
  function allow(ip, kind, limit, windowMs) {
    const k = kind + ip, now = Date.now();
    let b = buckets.get(k);
    if (!b || now - b.start > windowMs) { b = { start: now, n: 0 }; buckets.set(k, b); }
    return ++b.n <= limit;
  }
  setInterval(() => { const now = Date.now(); for (const [k, b] of buckets) if (now - b.start > 3600000) buckets.delete(k); }, 60000).unref();
  // Only trust proxy headers when we really sit behind that proxy; otherwise anyone could fake their IP.
  //   trustProxy: false (direct), "cloudflare" (cf-connecting-ip), true (last hop of x-forwarded-for)
  const clientIp = (req) => {
    if (config.trustProxy === 'cloudflare' && req.headers['cf-connecting-ip']) return String(req.headers['cf-connecting-ip']).trim();
    if (config.trustProxy === true && req.headers['x-forwarded-for']) return String(req.headers['x-forwarded-for']).split(',').pop().trim();
    return String(req.socket.remoteAddress || '');
  };
  const IP_SALT = (await readFile(SALT_FILE, 'utf8')).trim();
  let GATE = null;
  if (process.env.ACCESS_GATE === '1') {
    if (!existsSync(GATE_FILE)) await writeFile(GATE_FILE, randomBytes(4).toString('hex') + '\n', { mode: 0o600 }).catch(() => {});
    const code = (await readFile(GATE_FILE, 'utf8')).trim().toLowerCase();
    GATE = { code, token: createHash('sha256').update('gate:' + code + IP_SALT).digest('hex') };
  }
  const gatePage = (msg = '') => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>World Again · private preview</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b1d3a;color:#fff;font-family:system-ui,sans-serif}form{background:#fffdf7;color:#1c2433;padding:28px;border-radius:20px;width:min(340px,86vw);text-align:center;box-shadow:0 20px 50px #0006}
h1{margin:0 0 6px;font-size:24px}p{margin:0 0 16px;color:#5b6472;font-size:14px}input{width:100%;box-sizing:border-box;font-size:18px;padding:12px;border:2px solid #e2d8c4;border-radius:12px;text-align:center;letter-spacing:.1em}button{margin-top:12px;width:100%;padding:12px;border:0;border-radius:12px;background:#f7931e;color:#fff;font-size:17px;font-weight:700}.e{color:#c0362c;margin:10px 0 0}</style></head>
<body><form method="post" action="/enter"><h1>🌍 World Again</h1><p>Private preview. Enter the access code you were sent.</p><input name="code" autocomplete="off" autocapitalize="none" spellcheck="false" required autofocus><button>Enter</button>${msg ? `<p class="e">${msg}</p>` : ''}</form></body></html>`;
  const sendGate = (res, code, msg) => { res.writeHead(code, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'", 'x-robots-tag': 'noindex' }); res.end(gatePage(msg)); };
  // one "connection" = an IPv4 address, or an IPv6 /64 (phones rotate addresses inside their /64)
  const ipKey = (ip) => {
    ip = ip.replace(/^::ffff:/, '');
    if (ip.includes(':')) ip = ip.split(':').slice(0, 4).join(':') + '::/64';
    return createHash('sha256').update(IP_SALT + ip).digest('hex').slice(0, 32);
  };
  function isAdmin(req) {
    const got = Buffer.from(String(req.headers['x-admin-token'] || '')), want = Buffer.from(ADMIN_TOKEN);
    return got.length === want.length && timingSafeEqual(got, want);
  }
  function readBody(req, limit) {
    return new Promise((resolve, reject) => {
      let size = 0; const chunks = [];
      req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
      req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch { reject(new Error('bad json')); } });
      req.on('error', reject);
    });
  }

  // ---- accounts: session cookie (HttpOnly, SameSite=Lax, Secure in production); only a hash of the token is stored
  const PROD = process.env.NODE_ENV === 'production';
  const SESSION_DAYS = 60;
  const cookieOf = (req, name) => { const m = String(req.headers.cookie || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)')); return m ? m[1] : null; };
  const tokenHash = (t) => createHash('sha256').update(t).digest('hex');
  function currentUser(req) {
    const t = cookieOf(req, 'wa_s');
    if (!t || t.length > 100) return null;
    const row = S.session.get(tokenHash(t), Date.now());
    return row ? S.userById.get(row.user_id) : null;
  }
  function startSession(userId) {
    const t = randomBytes(32).toString('base64url');
    S.insSession.run(tokenHash(t), userId, Date.now() + SESSION_DAYS * 86400000);
    return { 'set-cookie': `wa_s=${t}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${PROD ? '; Secure' : ''}` };
  }
  const endSession = (req) => { const t = cookieOf(req, 'wa_s'); if (t) S.delSession.run(tokenHash(t)); return { 'set-cookie': `wa_s=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${PROD ? '; Secure' : ''}` }; };
  const meOf = (u) => {
    if (!u) return null;
    const h = u.ig ? S.house.get(u.ig) : null;
    return { email: u.email, id: u.ig, verified: !!u.verified, code: u.code, town: h && !h.removed ? townRow(S.town.get(h.town)) : null, house: h && !h.removed ? { id: h.id, i: h.i, t: h.t, look: parseLook(h.look) } : null };
  };
  const jsonOnly = (req) => String(req.headers['content-type'] || '').startsWith('application/json'); // blocks cross-site form posts
  setInterval(() => { try { S.sweepSessions.run(Date.now()); } catch { /* busy */ } }, 3600000).unref();

  // ---- routes
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const p = url.pathname;
    if (GATE) {
      // nothing behind the gate may be cached by a proxy or CDN
      const fix = (h) => { if (h) for (const k of Object.keys(h)) if (k.toLowerCase() === 'cache-control') h[k] = 'private, no-cache'; };
      const ow = res.writeHead; res.writeHead = function (c, a, b) { fix(typeof a === 'object' ? a : b); return ow.apply(this, arguments); };
      const os2 = res.setHeader; res.setHeader = function (k, v) { return os2.call(this, k, String(k).toLowerCase() === 'cache-control' ? 'private, no-cache' : v); };
      if (p === '/enter' && req.method === 'POST') {
        if (!allow(clientIp(req), 'gate', 10, 600000)) return sendGate(res, 429, 'Too many tries. Wait 10 minutes.');
        let body = ''; for await (const c of req) { body += c; if (body.length > 500) break; }
        const got = createHash('sha256').update(String(new URLSearchParams(body).get('code') || '').trim().toLowerCase()).digest();
        const want = createHash('sha256').update(GATE.code).digest();
        if (!timingSafeEqual(got, want)) return sendGate(res, 403, 'That code is not right.');
        res.writeHead(303, { location: '/', 'set-cookie': `wa_gate=${GATE.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 86400}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`, 'cache-control': 'no-store' });
        return res.end();
      }
      const have = Buffer.from(cookieOf(req, 'wa_gate') || ''), need = Buffer.from(GATE.token);
      if (!(have.length === need.length && timingSafeEqual(have, need)) && p !== '/favicon.svg') {
        if (p.startsWith('/api/')) return json(res, 401, { error: 'Private preview' });
        return sendGate(res, 200);
      }
    }
    try {
      if (p.startsWith('/api/')) {
        const ip = clientIp(req);
        if (!isAdmin(req) && !allow(ip, 'api', 240, 60000)) return json(res, 429, { error: 'Slow down a little and try again.' });

        if (p === '/api/config') {
          return sendEntry(req, res, cached('config', 60000, () => ({ name: config.name, tagline: config.tagline, instagram: config.instagram, launchDate: config.launchDate, milestones: config.milestones })), 'public, max-age=60');
        }
        if (p === '/api/state') return sendEntry(req, res, cached('state', 5000, buildState), 'public, max-age=5, s-maxage=5');
        if (p === '/api/race') return sendEntry(req, res, cached('race', 30000, buildRace), 'public, max-age=30, s-maxage=30');
        if (p === '/api/towns') return sendEntry(req, res, cached('towns', 10000, buildTowns), 'public, max-age=10, s-maxage=10');
        if (p === '/api/town') {
          const key = str(url.searchParams.get('key'), 40);
          const tRow = S.town.get(key);
          const ver = tRow ? `${tRow.count}:${tRow.removed}` : 'x';
          const hit = cache.get('town:' + key);
          // small towns refresh as soon as they change; big ones at most every 15 s (rebuilding them is expensive)
          if (hit && hit.ver !== ver && (tRow.count < 5000 || Date.now() - hit.at > 15000)) cache.delete('town:' + key);
          const data = cached('town:' + key, 60000, () => buildTown(key) || { error: 'Town not found' });
          cache.get('town:' + key).ver = ver;
          if (data.buf.length < 40 && data.buf.includes('not found')) return json(res, 404, { error: 'Town not found' });
          return sendEntry(req, res, data, 'public, max-age=5, s-maxage=5');
        }
        if (p === '/api/find') {
          const id = cleanHandle(url.searchParams.get('id'));
          const h = HANDLE.test(id) && S.house.get(id);
          if (!h || h.removed) return json(res, 404, { error: `No house for @${id} yet` });
          return json(res, 200, { house: { id: h.id, i: h.i, t: h.t, look: parseLook(h.look), claimed: !!h.owner }, town: townRow(S.town.get(h.town)) });
        }
        if (p === '/api/register' && req.method === 'POST') {
          const body = await readBody(req, 4096);
          const id = cleanHandle(body.id);
          if (!HANDLE.test(id)) return json(res, 400, { error: 'That does not look like an Instagram ID' });
          const existing = S.house.get(id);
          if (existing && existing.removed) return json(res, 403, { error: 'This ID cannot be registered here.' });
          if (existing) return json(res, 409, { code: 'id-taken', error: existing.user_id ? `@${id} already has a house. Is it yours? Log in.` : `@${id} already has a house (added from a comment). Is it yours? Claim it.` });
          const sent = validPlace(body.place);
          if (!sent) return json(res, 400, { error: 'Pick your town from the list' });
          const email = str(body.email, 254).toLowerCase();
          if (!jsonOnly(req)) return json(res, 415, { error: 'Bad request' });
          if (!EMAIL.test(email)) return json(res, 400, { error: 'Type a valid email address' });
          if (!validPassword(body.password)) return json(res, 400, { error: 'Password must be at least 8 characters' });
          if (S.userByEmail.get(email)) return json(res, 409, { code: 'email-taken', error: 'This email already has a house. Log in instead.' });
          if (!allow(ip, 'reg', config.registerPerHourPerIp, 3600000)) return json(res, 429, { error: 'Too many registrations from here. Try again later.' });
          // existing towns keep their stored data; new towns are confirmed with the geocoder
          const known = S.town.get(sent.geoId);
          const place = known ? { geoId: known.key, name: known.name, admin1: known.admin1, country: known.country, cc: known.cc, lat: known.lat, lon: known.lon } : await verifyPlace(sent.geoId);
          if (!place) return json(res, 400, { error: 'Pick your town from the list' });
          const ipMax = Number(config.maxHousesPerIp) || 0;
          if (ipMax && S.ipCount.get(ipKey(ip)).n >= ipMax) return json(res, 409, { code: 'ip-limit', error: 'This internet connection already has a house. One house per connection. Already registered? Log in.' });
          const passHash = await hashPassword(body.password);
          let userId;
          try { userId = Number(S.insUser.run(email, passHash, null, newCode(), Date.now()).lastInsertRowid); }
          catch { return json(res, 409, { code: 'email-taken', error: 'This email already has a house. Log in instead.' }); }
          const r = insertMany(db, [{ id, place, key: validKey(body.key) ? body.key : null, ip: ipKey(ip), ipMax, userId }]);
          if (!r.added) db.prepare('DELETE FROM users WHERE id = ?').run(userId);
          if (r.limited) return json(res, 409, { code: 'ip-limit', error: ipMax === 1 ? 'This internet connection already has a house. One house per connection. Already registered? Use "Find my house".' : `This internet connection already has ${ipMax} houses.` });
          const added = r.added;
          const h = S.house.get(id);
          if (!added && !h) return json(res, 400, { error: 'Could not register' });
          invalidate('state', 'towns', 'town:' + h.town);
          const u = S.userById.get(userId);
          return json(res, added ? 201 : 200, { existing: !added, house: { id, i: h.i, t: h.t }, town: townRow(S.town.get(h.town)), me: meOf(u) }, added ? startSession(userId) : {});
        }
        // Walk mode: who else is here right now. Heartbeat every ~1.5 s, gone after 8 s of silence.
        if (p === '/api/presence' && req.method === 'POST') {
          if (!isAdmin(req) && !allow(ip, 'pres', 90, 60000)) return json(res, 429, { error: 'slow down' });
          const b = await readBody(req, 1024);
          const room = str(b.room, 80), sid = str(b.sid, 32);
          if (!room || !/^[a-z0-9]{8,32}$/.test(sid)) return json(res, 400, { error: 'bad presence' });
          if (b.leave) return json(res, 200, await askPresence({ room, sid, leave: true }));
          let id = HANDLE.test(cleanHandle(b.id)) ? cleanHandle(b.id) : 'guest';
          if (id !== 'guest') { const own = S.house.get(id), pu = currentUser(req); const okAcc = own && pu && own.user_id === pu.id; const okKey = own && own.owner && validKey(b.key) && own.owner === hashKey(b.key); if (!own || own.removed || !(okAcc || okKey)) id = 'guest'; }
          const num = (v, m) => (Number.isFinite(+v) ? Math.max(-m, Math.min(m, +v)) : 0);
          const now = Date.now();
          const av = validLook({ avatar: b.av }).avatar;
          void now;
          return json(res, 200, await askPresence({ room, sid, id, x: num(b.x, 10), z: num(b.z, 10), h: num(b.h, 100), look: av || null }));
        }
        if (p === '/api/account/me') return json(res, 200, { me: meOf(currentUser(req)) });
        if (p === '/api/account/login' && req.method === 'POST') {
          if (!jsonOnly(req)) return json(res, 415, { error: 'Bad request' });
          const b = await readBody(req, 2048);
          const email = str(b.email, 254).toLowerCase();
          if (!allow(ip, 'login', 20, 900000) || !allow(email, 'loginE', 10, 900000)) return json(res, 429, { error: 'Too many tries. Wait 15 minutes.' });
          const u = EMAIL.test(email) ? S.userByEmail.get(email) : null;
          const ok = u ? await checkPassword(String(b.password || ''), u.pass) : (await hashPassword('x'), false); // same time either way
          if (!ok) return json(res, 401, { error: 'Wrong email or password' });
          return json(res, 200, { me: meOf(u) }, startSession(u.id));
        }
        if (p === '/api/account/logout' && req.method === 'POST') return json(res, 200, { ok: true }, endSession(req));
        // houses added from comments have no account yet: the first person to claim one creates it
        if (p === '/api/account/claim' && req.method === 'POST') {
          if (!jsonOnly(req)) return json(res, 415, { error: 'Bad request' });
          if (!allow(ip, 'claim', 10, 3600000)) return json(res, 429, { error: 'Too many tries. Try later.' });
          const b = await readBody(req, 2048);
          const id = cleanHandle(b.id), email = str(b.email, 254).toLowerCase();
          const h = HANDLE.test(id) && S.house.get(id);
          if (!h || h.removed) return json(res, 404, { error: `No house for @${id} yet` });
          if (h.user_id) return json(res, 409, { error: `@${id} is already linked to an account. Log in.` });
          if (!EMAIL.test(email)) return json(res, 400, { error: 'Type a valid email address' });
          if (!validPassword(b.password)) return json(res, 400, { error: 'Password must be at least 8 characters' });
          if (S.userByEmail.get(email)) return json(res, 409, { error: 'This email already has a house. Log in instead.' });
          const uid = Number(S.insUser.run(email, await hashPassword(b.password), id, newCode(), Date.now()).lastInsertRowid);
          S.linkHouse.run(uid, id);
          return json(res, 200, { me: meOf(S.userById.get(uid)) }, startSession(uid));
        }
        if (p === '/api/account/reset' && req.method === 'POST') {
          if (!jsonOnly(req)) return json(res, 415, { error: 'Bad request' });
          if (!allow(ip, 'reset', 10, 3600000)) return json(res, 429, { error: 'Too many tries. Try later.' });
          const b = await readBody(req, 2048);
          const u = typeof b.token === 'string' && b.token.length < 100 ? S.userByReset.get(tokenHash(b.token), Date.now()) : null;
          if (!u) return json(res, 400, { error: 'This reset link has expired. Ask us for a new one.' });
          if (!validPassword(b.password)) return json(res, 400, { error: 'Password must be at least 8 characters' });
          S.setPass.run(await hashPassword(b.password), u.id);
          return json(res, 200, { me: meOf(u) }, startSession(u.id));
        }
        // Customise your house and avatar. Needs the device key that registered (or first claimed) the house.
        if (p === '/api/look' && req.method === 'POST') {
          if (!allow(ip, 'look', 60, 3600000)) return json(res, 429, { error: 'Too many changes, try later.' });
          const b = await readBody(req, 2048);
          const id = cleanHandle(b.id);
          const h = HANDLE.test(id) && S.house.get(id);
          if (!h || h.removed) return json(res, 404, { error: 'No such house' });
          const lu = currentUser(req);
          const byAccount = lu && h.user_id === lu.id;
          if (!byAccount) {
            if (h.user_id) return json(res, 403, { error: 'Log in to change this house.' });
            if (!validKey(b.key)) return json(res, 400, { error: 'Missing device key' });
            if (h.owner && h.owner !== hashKey(b.key)) return json(res, 403, { error: 'This house was set up on another device.' });
          }
          const look = validLook(b.look);
          S.setLook.run(JSON.stringify(look), validKey(b.key) ? hashKey(b.key) : null, id);
          invalidate('town:' + h.town);
          return json(res, 200, { ok: true, look, claimed: !h.owner });
        }
        // ---- admin (needs x-admin-token)
        if (p.startsWith('/api/admin/') && !isAdmin(req)) return json(res, 401, { error: 'unauthorised' });
        if (p === '/api/admin/stats') {
          const since = Date.now() - 48 * 3600000;
          return json(res, 200, {
            population: S.population.get().n, towns: S.townCount.get().n, removed: S.removedCount.get().n, claimed: S.claimedCount.get().n,
            hourly: S.hourly.all(since), race: buildRace(), recent: S.adminList.all('%'),
          });
        }
        if (p === '/api/admin/search') {
          const q = cleanHandle(url.searchParams.get('q')).replace(/[%_]/g, '');
          return json(res, 200, { rows: S.adminList.all(q + '%') });
        }
        if ((p === '/api/admin/remove' || p === '/api/admin/restore' || p === '/api/admin/reset-key') && req.method === 'POST') {
          const b = await readBody(req, 1024);
          const id = cleanHandle(b.id);
          const h = S.house.get(id);
          if (!h) return json(res, 404, { error: 'No such ID' });
          if (p === '/api/admin/reset-key') { S.resetKey.run(id); return json(res, 200, { ok: true }); }
          const removing = p === '/api/admin/remove';
          const r = (removing ? S.remove : S.restore).run(id);
          if (r.changes) {
            S.townRemoved.run(removing ? 1 : -1, h.town);
            S.hourUp.run(Math.floor(h.t / 3600000), h.town, removing ? -1 : 1);
            const first = S.firstLive.get(h.town);
            if (first) S.setMayor.run(first.id, h.town);
          }
          cache.clear();
          return json(res, 200, { ok: true, changed: r.changes });
        }
        if (p === '/api/admin/verify' && req.method === 'POST') {
          const b = await readBody(req, 1024);
          const id = cleanHandle(b.id), v = b.verified === false ? 0 : 1;
          S.verifyUser.run(v, id); S.verifyHouse.run(v, id);
          cache.clear();
          return json(res, 200, { ok: true, verified: !!v });
        }
        if (p === '/api/admin/reset-link' && req.method === 'POST') {
          const b = await readBody(req, 1024);
          const u = S.userByIg.get(cleanHandle(b.id));
          if (!u) return json(res, 404, { error: 'No account for that ID' });
          const t = randomBytes(24).toString('base64url');
          S.setReset.run(tokenHash(t), Date.now() + 24 * 3600000, u.id);
          return json(res, 200, { url: `/?reset=${t}`, expiresInHours: 24 });
        }
        if (p === '/api/admin/account') {
          const u = S.userByIg.get(cleanHandle(url.searchParams.get('id')));
          return json(res, 200, { account: u ? { email: u.email, code: u.code, verified: !!u.verified, created: u.created } : null });
        }
        if (p === '/api/admin/export.csv') {
          const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
          const lines = ['id,town,state,country,registered,removed', ...S.exportAll.all().map((r) => [r.id, r.town, r.admin1, r.country, new Date(r.t).toISOString(), r.removed].map(q).join(','))];
          res.writeHead(200, { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="world-again-houses.csv"', 'cache-control': 'no-store' });
          return res.end(lines.join('\n'));
        }
        if (p === '/api/admin/bulk' && req.method === 'POST') {
          const body = await readBody(req, 16 * 1024 * 1024);
          const r = insertMany(db, body.houses || [], true);
          cache.clear();
          return json(res, 200, { ...r, population: S.population.get().n });
        }
        return json(res, 404, { error: 'Not found' });
      }

      if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
      let rel = p === '/' ? '/index.html' : p === '/privacy' ? '/privacy.html' : p === '/admin' ? '/admin.html' : decodeURIComponent(p);
      let f = files.get(rel);
      if (DEV) { // pick up new and edited files while developing
        const full = path.normalize(path.join(PUB, rel));
        if (full.startsWith(PUB + path.sep)) {
          try { const disk = await readFile(full); if (!f || !disk.equals(f.buf)) { f = pack(disk, MIME[path.extname(full)] || 'application/octet-stream'); files.set(rel, f); } } catch { /* not on disk */ }
        }
      }
      if (!f) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('Not found'); }
      const long = rel === '/places.json' ? 'public, max-age=86400' : rel.endsWith('.html') ? 'no-cache' : 'public, max-age=300';
      return sendEntry(req, res, f, DEV ? 'no-cache' : long);
    } catch (e) {
      console.error(e);
      if (!res.headersSent) json(res, 400, { error: e.message === 'too large' ? 'Request too large' : 'Bad request' });
    }
  });
  if (!cluster.isWorker || cluster.worker.id === 1) setInterval(() => { try { S.hourSweep.run(Math.floor(Date.now() / 3600000) - 24 * 9); } catch { /* busy */ } }, 600000).unref();
  // graceful shutdown: finish in-flight requests, close the database, exit
  const stop = () => { server.close(() => { try { db.close(); } catch { /* closed */ } process.exit(0); }); setTimeout(() => process.exit(0), 3000).unref(); };
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
  server.requestTimeout = 15000;
  server.listen({ port: PORT, backlog: 4096 }, () => {
    if (cluster.isPrimary) console.log(`${config.name} running on http://localhost:${PORT}  (population ${S.population.get().n})`);
  });
}
