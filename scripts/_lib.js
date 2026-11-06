import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await readFile(path.join(ROOT, 'config.json'), 'utf8'));
export const BASE = process.env.WA_URL || `http://localhost:${process.env.PORT || config.port || 5180}`;

export async function adminToken() {
  if (process.env.ADMIN_TOKEN) return process.env.ADMIN_TOKEN;
  return (await readFile(path.join(ROOT, process.env.DATA_DIR || 'data', 'admin-token.txt'), 'utf8')).trim();
}
export async function bulk(houses) {
  const r = await fetch(`${BASE}/api/admin/bulk`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-admin-token': await adminToken() },
    body: JSON.stringify({ houses }),
  });
  if (!r.ok) throw new Error(`bulk failed: HTTP ${r.status} ${await r.text()}`);
  return r.json();
}
