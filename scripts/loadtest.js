// Simple load test (no dependencies). Simulates many visitors loading the map, towns and
// walking around. Usage: node scripts/loadtest.js [concurrency=200] [seconds=15]
import http from 'node:http';
import { adminToken, BASE } from './_lib.js';

const C = Number(process.argv[2]) || 200, SECS = Number(process.argv[3]) || 15;
const url = new URL(BASE);
const agent = new http.Agent({ keepAlive: true, maxSockets: C });
const token = await adminToken(); // skips the per-IP API limit, since every request comes from this one machine
const towns = await (await fetch(BASE + '/api/towns', { headers: { 'x-admin-token': token } })).json();
const keys = towns.rows.map((r) => r[0]);

function req(method, path, body) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const r = http.request({ host: url.hostname, port: url.port, path, method, agent,
      headers: { 'x-admin-token': token, 'accept-encoding': 'br, gzip', ...(body ? { 'content-type': 'application/json' } : {}) } }, (res) => {
      res.resume();
      res.on('end', () => resolve({ ms: performance.now() - t0, code: res.statusCode }));
    });
    r.on('error', () => resolve({ ms: performance.now() - t0, code: 0 }));
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}
const pick = () => {
  const x = Math.random();
  if (x < 0.45) return ['GET', '/api/state'];
  if (x < 0.65) return ['GET', '/api/towns'];
  if (x < 0.85) return ['GET', '/api/town?key=' + encodeURIComponent(keys[Math.floor(Math.random() * keys.length)])];
  if (x < 0.92) return ['GET', '/api/find?id=' + (process.env.FIND_PREFIX || 'demo.') + String(1 + Math.floor(Math.random() * (Number(process.env.FIND_MAX) || 2600))).padStart(Number(process.env.FIND_PAD) || 4, '0')];
  return ['POST', '/api/presence', { room: 'p:load', sid: 'load' + Math.floor(Math.random() * 1e8).toString(36).padEnd(6, 'x'), id: 'guest', x: 0, z: 0, h: 0 }];
};

const lat = [], codes = {};
const end = Date.now() + SECS * 1000;
console.log(`Load test: ${C} concurrent visitors for ${SECS}s against ${BASE}`);
await Promise.all(Array.from({ length: C }, async () => {
  while (Date.now() < end) {
    const [m, p, b] = pick();
    const r = await req(m, p, b);
    lat.push(r.ms); codes[r.code] = (codes[r.code] || 0) + 1;
  }
}));
lat.sort((a, b) => a - b);
const q = (p) => lat[Math.min(lat.length - 1, Math.floor(lat.length * p))].toFixed(1);
console.log(`requests: ${lat.length}  →  ${(lat.length / SECS).toFixed(0)} per second`);
console.log(`latency ms: p50 ${q(0.5)}  p95 ${q(0.95)}  p99 ${q(0.99)}`);
console.log('status codes:', codes);
agent.destroy();
