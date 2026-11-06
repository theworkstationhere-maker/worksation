// Paints the high-resolution close-up map off the main thread, so the 3D view never stutters.
// Receives map data once ("init"), then paint requests; returns ImageBitmaps (colour + roughness).
import { feature } from 'https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/+esm';

let D = null; // prepared map data
const S = 2048;

function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function ringsToPath(rings) {
  const p = new Path2D();
  let minX = 999, maxX = -999, minY = 999, maxY = -999;
  for (const ring of rings) {
    let prev = ring[0][0], off = 0;
    ring.forEach(([lon, lat], i) => {
      let L = lon + off;
      if (L - prev > 180) { off -= 360; L -= 360; } else if (L - prev < -180) { off += 360; L += 360; }
      prev = L;
      if (i) p.lineTo(L, lat); else p.moveTo(L, lat);
      if (L < minX) minX = L; if (L > maxX) maxX = L; if (lat < minY) minY = lat; if (lat > maxY) maxY = lat;
    });
    p.closePath();
  }
  return { p, box: [minX, maxX, minY, maxY] };
}
const polyRings = (g) => (g.type === 'Polygon' ? g.coordinates : g.type === 'MultiPolygon' ? g.coordinates.flat() : []);
const overlaps = (b, x0, x1, y0, y1) => b[1] >= x0 && b[0] <= x1 && b[3] >= y0 && b[2] <= y1;

async function init({ worldUrl, geoUrl, pal, desert }) {
  const [topo, geo, roads] = await Promise.all([fetch(worldUrl).then((r) => r.json()), fetch(geoUrl).then((r) => r.json()).catch(() => null), fetch('/roads.json').then((r) => r.json()).catch(() => [])]);
  const DES = new Set(desert);
  const countries = feature(topo, topo.objects.countries).features.filter((f) => f.geometry).map((f, i) => {
    const name = f.properties.name;
    const ice = name === 'Antarctica' || name === 'Greenland';
    const col = ice ? pal.ice : DES.has(name) ? pal.desert[i % pal.desert.length] : pal.land[hash(name) % pal.land.length];
    return { ...ringsToPath(polyRings(f.geometry)), col, green: !ice && !DES.has(name) };
  });
  D = { pal, countries, roads: roads.map(prepRoad),
    deserts: (geo?.deserts || []).map((p) => ringsToPath(p)),
    ranges: (geo?.ranges || []).map(([, p]) => ringsToPath(p)),
    lakes: (geo?.lakes || []).map((p) => ringsToPath(p)),
    rivers: (geo?.rivers || []).map(([rank, line]) => {
      const p = new Path2D(); line.forEach(([lon, lat], i) => (i ? p.lineTo(lon, lat) : p.moveTo(lon, lat)));
      const xs = line.map((q) => q[0]), ys = line.map((q) => q[1]);
      return { p, rank, box: [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)] };
    }),
  };
}

// Roads gently curve (a deterministic bend per road), like hand-drawn toy-map roads.
function prepRoad([x1, y1, x2, y2, cls]) {
  const h = hash(x1 + ',' + y1 + ',' + x2), bend = ((h & 1023) / 1023 - 0.5) * 0.35;
  const mx = (x1 + x2) / 2 - (y2 - y1) * bend, my = (y1 + y2) / 2 + (x2 - x1) * bend;
  return { x1, y1, x2, y2, mx, my, cls, box: [Math.min(x1, x2, mx), Math.max(x1, x2, mx), Math.min(y1, y2, my), Math.max(y1, y2, my)] };
}
const MAP_ROADS = { road: '#8f949a', highway: '#7b8087', edge: 'rgba(236,232,220,0.6)', centreLines: false, centreColour: 'rgba(255,255,255,0.9)' };
function drawRoads(g, lon0, lon1, lat0, lat1, px) {
  const vis = D.roads.filter((r) => overlaps(r.box, lon0, lon1, lat0, lat1));
  if (!vis.length) return;
  const kmPx = px * 111, zoom = Math.max(0.9, Math.min(2, 0.05 / kmPx));       // fatter roads as you zoom in
  const path = (r) => { const p = new Path2D(); p.moveTo(r.x1, r.y1); p.quadraticCurveTo(r.mx, r.my, r.x2, r.y2); return p; };
  const P = vis.map((r) => [r, path(r)]);
  g.lineCap = g.lineJoin = 'round';
  // clean asphalt with a pale verge, no painted centre lines (MAP_ROADS.centreLines turns them back on)
  for (const [r, p] of P) { g.strokeStyle = MAP_ROADS.edge; g.lineWidth = (r.cls === 2 ? 4.6 : 3.2) * zoom * px; g.stroke(p); }
  for (const [r, p] of P) { g.strokeStyle = r.cls === 2 ? MAP_ROADS.highway : MAP_ROADS.road; g.lineWidth = (r.cls === 2 ? 3.2 : 2.2) * zoom * px; g.stroke(p); }
  if (MAP_ROADS.centreLines && zoom > 1.6) { g.setLineDash([6 * px * zoom, 6 * px * zoom]); g.strokeStyle = MAP_ROADS.centreColour; g.lineWidth = 0.6 * zoom * px; for (const [r, p] of P) if (r.cls === 2) g.stroke(p); g.setLineDash([]); }
}
function paint({ lon0, lon1, lat0, lat1 }) {
  const { pal } = D;
  const c = new OffscreenCanvas(S, S), g = c.getContext('2d');
  const sx = S / (lon1 - lon0), sy = S / (lat1 - lat0), px = 1 / Math.min(sx, sy);
  g.fillStyle = pal.ocean; g.fillRect(0, 0, S, S);
  // row 0 = top (lat1); the main thread flips when uploading
  g.setTransform(sx, 0, 0, -sy, -lon0 * sx, lat1 * sy);
  const vis = D.countries.filter((f) => overlaps(f.box, lon0, lon1, lat0, lat1));
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = 'rgba(95,175,200,0.35)'; g.lineWidth = 22 * px; vis.forEach((f) => g.stroke(f.p));
  g.strokeStyle = 'rgba(120,195,215,0.5)'; g.lineWidth = 8 * px; vis.forEach((f) => g.stroke(f.p));
  vis.forEach((f) => { g.fillStyle = f.col; g.fill(f.p, 'evenodd'); });
  g.save();
  const clip = new Path2D(); vis.filter((f) => f.green).forEach((f) => clip.addPath(f.p));
  g.clip(clip, 'evenodd');
  const cell = (lat1 - lat0) / 110;
  for (let y = Math.floor(lat0 / cell); y * cell < lat1; y++) for (let x = Math.floor(lon0 / cell); x * cell < lon1; x++) {
    const h = hash(x + ':' + y);
    g.fillStyle = h & 0x10000 ? 'rgba(60,120,55,0.10)' : 'rgba(150,200,110,0.12)';
    g.beginPath(); g.arc(x * cell + ((h & 255) / 255) * cell, y * cell + (((h >>> 8) & 255) / 255) * cell, (2 + ((h >>> 20) & 3)) * px, 0, Math.PI * 2); g.fill();
  }
  g.restore();
  const fill = (list, style) => list.filter((f) => overlaps(f.box, lon0, lon1, lat0, lat1)).forEach((f) => { g.fillStyle = style; g.fill(f.p, 'evenodd'); });
  fill(D.deserts, 'rgba(222,196,140,0.85)');
  fill(D.ranges, 'rgba(110,105,80,0.3)');
  fill(D.lakes, pal.shallow);
  g.strokeStyle = '#3f93c4';
  D.rivers.filter((r) => overlaps(r.box, lon0, lon1, lat0, lat1)).forEach((r) => { g.lineWidth = (r.rank <= 3 ? 4 : r.rank <= 6 ? 2.6 : 1.6) * px; g.stroke(r.p); });
  drawRoads(g, lon0, lon1, lat0, lat1, px);
  g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 2.2 * px; vis.forEach((f) => g.stroke(f.p));
  // roughness: glossy water, matte land
  const rc = new OffscreenCanvas(512, 512), rg = rc.getContext('2d');
  rg.fillStyle = '#6e6e6e'; rg.fillRect(0, 0, 512, 512);
  rg.setTransform(sx / 4, 0, 0, -sy / 4, (-lon0 * sx) / 4, (lat1 * sy) / 4);
  rg.fillStyle = '#ffffff'; vis.forEach((f) => rg.fill(f.p, 'evenodd'));
  return { color: c.transferToImageBitmap(), rough: rc.transferToImageBitmap() };
}


// ================================================================ real-world layer for close-ups
// Satellite: Sentinel-2 cloudless 2016 by EOX IT Services GmbH (CC BY 4.0, contains modified Copernicus Sentinel data).
// Roads, rivers, water, parks and buildings: © OpenStreetMap contributors, via OpenFreeMap (OpenMapTiles schema).
const SAT = (z, x, y) => `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/${z}/${y}/${x}.jpg`;
let VEC = null; // tile URL template from OpenFreeMap's TileJSON
const satCache = new Map(), vecCache = new Map();
function lru(map, key, val, max) { map.delete(key); map.set(key, val); if (map.size > max) map.delete(map.keys().next().value); return val; }
const lon2x = (lon, z) => ((lon + 180) / 360) * 2 ** z;
const lat2y = (lat, z) => { const r = (lat * Math.PI) / 180; return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z; };
const x2lon = (x, z) => (x / 2 ** z) * 360 - 180;
const y2lat = (y, z) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** z))) * 180) / Math.PI;
const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(() => r(null), ms))]);

function satTile(z, x, y) {
  const k = `${z}/${x}/${y}`;
  if (satCache.has(k)) return lru(satCache, k, satCache.get(k), 400);
  const job = fetch(SAT(z, x, y)).then((r) => (r.ok ? r.blob() : null)).then((b) => (b ? createImageBitmap(b) : null)).catch(() => null);
  return lru(satCache, k, job, 400);
}

// --- minimal Mapbox Vector Tile (protobuf) decoder
function pbf(buf) {
  let pos = 0;
  const varint = () => { let r = 0, s = 0, b; do { b = buf[pos++]; r += (b & 0x7f) * 2 ** s; s += 7; } while (b & 0x80); return r; };
  const skip = (t) => { if (t === 0) varint(); else if (t === 1) pos += 8; else if (t === 2) pos += varint(); else if (t === 5) pos += 4; else throw new Error('bad tile'); };
  return { buf, get pos() { return pos; }, set pos(v) { pos = v; }, varint, skip };
}
const td = new TextDecoder();
function readValue(p, end) { let v = null; while (p.pos < end) { const tag = p.varint(), f = tag >> 3, t = tag & 7; if (f === 1) { const l = p.varint(); v = td.decode(p.buf.subarray(p.pos, p.pos + l)); p.pos += l; } else if (f === 4 || f === 5) v = p.varint(); else if (f === 6) { const n = p.varint(); v = (n >>> 1) ^ -(n & 1); } else if (f === 7) v = !!p.varint(); else if (f === 2) { v = new DataView(p.buf.buffer, p.buf.byteOffset + p.pos, 4).getFloat32(0, true); p.pos += 4; } else if (f === 3) { v = new DataView(p.buf.buffer, p.buf.byteOffset + p.pos, 8).getFloat64(0, true); p.pos += 8; } else p.skip(t); } return v; }
const WANT = new Set(['transportation', 'water', 'waterway', 'building', 'park', 'landcover', 'landuse']);
function decodeTile(buf) {
  const p = pbf(buf), layers = {};
  while (p.pos < buf.length) {
    const tag = p.varint();
    if (tag >> 3 !== 3) { p.skip(tag & 7); continue; }
    const end = p.varint() + p.pos;
    let name = '', extent = 4096; const keys = [], vals = [], feats = [];
    while (p.pos < end) {
      const t = p.varint(), f = t >> 3;
      if (f === 1) { const l = p.varint(); name = td.decode(buf.subarray(p.pos, p.pos + l)); p.pos += l; }
      else if (f === 3) { const l = p.varint(); keys.push(td.decode(buf.subarray(p.pos, p.pos + l))); p.pos += l; }
      else if (f === 4) { const l = p.varint(); vals.push(readValue(p, p.pos + l)); }
      else if (f === 5) extent = p.varint();
      else if (f === 2) { const l = p.varint(); feats.push([p.pos, p.pos + l]); p.pos += l; }
      else p.skip(t & 7);
    }
    if (!WANT.has(name)) continue;
    layers[name] = feats.map(([s0, e0]) => {
      p.pos = s0; let type = 0, tags = [], geom = [];
      while (p.pos < e0) {
        const t = p.varint(), f = t >> 3;
        if (f === 2 || f === 4) { const l = p.varint() + p.pos; const arr = []; while (p.pos < l) arr.push(p.varint()); if (f === 2) tags = arr; else geom = arr; }
        else if (f === 3) type = p.varint(); else p.skip(t & 7);
      }
      const props = {}; for (let i = 0; i < tags.length; i += 2) props[keys[tags[i]]] = vals[tags[i + 1]];
      // geometry → rings/lines in tile units
      const rings = []; let ring = null, x = 0, y = 0;
      for (let i = 0; i < geom.length;) {
        const cmd = geom[i] & 7, cnt = geom[i] >> 3; i++;
        if (cmd === 7) { if (ring) ring.closed = true; continue; }
        for (let k = 0; k < cnt; k++) {
          const dx = geom[i++], dy = geom[i++]; x += (dx >>> 1) ^ -(dx & 1); y += (dy >>> 1) ^ -(dy & 1);
          if (cmd === 1) { ring = [[x, y]]; rings.push(ring); } else ring.push([x, y]);
        }
      }
      return { type, props, rings, extent };
    });
    p.pos = end; // continue after this layer
  }
  return layers;
}
async function vecTile(z, x, y) {
  if (!VEC) VEC = await fetch('https://tiles.openfreemap.org/planet').then((r) => r.json()).then((j) => j.tiles[0]).catch(() => null);
  if (!VEC) return null;
  const k = `${z}/${x}/${y}`;
  if (vecCache.has(k)) return lru(vecCache, k, vecCache.get(k), 80);
  const job = fetch(VEC.replace('{z}', z).replace('{x}', x).replace('{y}', y)).then((r) => (r.ok ? r.arrayBuffer() : null)).then((b) => (b ? decodeTile(new Uint8Array(b)) : null)).catch(() => null);
  return lru(vecCache, k, job, 80);
}

const ROAD = { // class: [width px, fill, soft edge] — simple, toy-map roads
  motorway: [5, '#7b8087', 'rgba(236,232,220,0.6)'], trunk: [4.2, '#858a90', 'rgba(236,232,220,0.5)'], primary: [3.6, '#ffffff', 'rgba(90,100,80,0.28)'],
  secondary: [3, '#ffffff', 'rgba(90,100,80,0.22)'], tertiary: [2.4, '#fbfaf5', null], minor: [1.5, 'rgba(255,255,255,0.85)', null], rail: [1.3, '#9a9aa2', null],
};
async function paintReal(req, base) {
  if (req.id !== latest) return null;
  const { lon0, lon1, lat0, lat1 } = req;
  const lonSpan = lon1 - lon0, latSpan = lat1 - lat0;
  const c = new OffscreenCanvas(S, S), g = c.getContext('2d');
  g.drawImage(base, 0, 0);
  const L = new OffscreenCanvas(S, S), lg = L.getContext('2d');
  const sx = S / lonSpan, sy = S / latSpan, px = 1 / Math.min(sx, sy);
  const toPx = (lon, lat) => [(lon - lon0) * sx, (lat1 - lat) * sy];
  let any = false;
  const stale = () => req.id !== latest;
  let vz = 0, vx0 = 0, vx1 = -1, vy0 = 0, vy1 = -1, vecJob = Promise.resolve([]);
  if (latSpan <= 40) {
    vz = Math.max(4, Math.min(14, Math.floor(Math.log2((360 * 2.2) / lonSpan))));
    vx0 = Math.floor(lon2x(lon0, vz)); vx1 = Math.floor(lon2x(lon1, vz)); vy0 = Math.floor(lat2y(Math.min(lat1, 85), vz)); vy1 = Math.floor(lat2y(Math.max(lat0, -85), vz));
    const jobs = [];
    if ((vx1 - vx0 + 1) * (vy1 - vy0 + 1) <= 30) for (let ty = vy0; ty <= vy1; ty++) for (let tx = vx0; tx <= vx1; tx++) jobs.push(vecTile(vz, tx, ty).then((t) => [tx, ty, t]));
    vecJob = withTimeout(Promise.all(jobs), 9000);
  }
  // 1) satellite, tile zoom matched to the patch's resolution
  if (false) { // satellite layer switched off: the user wants the clean illustrated style
    const z = Math.max(3, Math.min(15, Math.round(Math.log2((360 * S) / 256 / lonSpan))));
    const x0 = Math.floor(lon2x(lon0, z)), x1 = Math.floor(lon2x(lon1, z)), y0 = Math.floor(lat2y(Math.min(lat1, 85), z)), y1 = Math.floor(lat2y(Math.max(lat0, -85), z));
    const jobs = [];
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) jobs.push(satTile(z, ((tx % 2 ** z) + 2 ** z) % 2 ** z, ty).then((img) => [tx, ty, img]));
    const tiles = (await withTimeout(Promise.all(jobs), 9000)) || [];
    if (stale()) return null;
    for (const [tx, ty, img] of tiles) {
      if (!img) continue;
      // each tile is drawn in a few horizontal strips so the Mercator → lat/lon stretch stays accurate
      const strips = z < 8 ? 8 : 2;
      for (let s = 0; s < strips; s++) {
        const ya = ty + s / strips, yb = ty + (s + 1) / strips;
        const [ax, ay] = toPx(x2lon(tx, z), y2lat(ya, z)), [bx, by] = toPx(x2lon(tx + 1, z), y2lat(yb, z));
        lg.drawImage(img, 0, (s * 256) / strips, 256, 256 / strips, ax, ay, bx - ax + 0.6, by - ay + 0.6);
      }
      any = true;
    }
    if (any) { // one colour-grading pass for the whole photo layer (brighter, a little more saturated)
      const T = new OffscreenCanvas(S, S), tg = T.getContext('2d'); tg.filter = 'saturate(1.18) brightness(1.1) contrast(1.05)'; tg.drawImage(L, 0, 0);
      lg.clearRect(0, 0, S, S); lg.drawImage(T, 0, 0);
    }
  }
  // 2) OpenStreetMap: water, parks, buildings, rivers, roads
  if (latSpan <= 40) {
    const tiles = ((await vecJob) || []).filter((t) => t && t[2]);
    if (stale()) return null;
    const path = (f, tx, ty, close) => {
      const p = new Path2D();
      for (const r of f.rings) r.forEach(([x, y], i) => { const [X, Y] = toPx(x2lon(tx + x / f.extent, vz), y2lat(ty + y / f.extent, vz)); if (i) p.lineTo(X, Y); else p.moveTo(X, Y); if (close && i === r.length - 1) p.closePath(); });
      return p;
    };
    const each = (layer, fn) => { for (const [tx, ty, t] of tiles) for (const f of t[layer] || []) fn(f, tx, ty); };
    const W = Math.max(0.6, Math.min(2.4, 0.02 / (px * 111)));  // widen roads as you zoom in (px = degrees per pixel)
    lg.lineJoin = lg.lineCap = 'round';
    // flat, illustrated colours: forests and parks in soft greens, towns in a warm beige, water in the globe's blue
    each('landcover', (f, tx, ty) => { if (f.type !== 3) return; const cl = f.props.class; const c = cl === 'wood' || cl === 'forest' ? '#5f9e4a' : cl === 'sand' ? '#e8d6a6' : cl === 'ice' ? '#f4f8fb' : cl === 'rock' ? '#b9b3a3' : cl === 'wetland' ? '#7fb38a' : null; if (c) { lg.fillStyle = c; lg.fill(path(f, tx, ty, true), 'evenodd'); } });
    each('landuse', (f, tx, ty) => { if (f.type !== 3) return; const cl = f.props.class; const c = cl === 'residential' || cl === 'suburb' || cl === 'neighbourhood' || cl === 'quarter' ? '#e9e1cf' : cl === 'industrial' || cl === 'commercial' || cl === 'retail' || cl === 'railway' ? '#e2dbd6' : cl === 'farmland' ? '#b9d38a' : cl === 'cemetery' ? '#a9c99a' : null; if (c) { lg.fillStyle = c; lg.fill(path(f, tx, ty, true), 'evenodd'); } });
    each('park', (f, tx, ty) => { if (f.type === 3) { lg.fillStyle = '#7cc062'; lg.fill(path(f, tx, ty, true), 'evenodd'); } });
    each('water', (f, tx, ty) => { if (f.type === 3) { lg.fillStyle = '#5bb2df'; lg.fill(path(f, tx, ty, true), 'evenodd'); } });
    lg.strokeStyle = '#5bb2df';
    each('waterway', (f, tx, ty) => { if (f.type === 2 && (f.props.class === 'river' || f.props.class === 'canal' || vz >= 12)) { lg.lineWidth = (f.props.class === 'river' ? 3.2 : 1.4) * W; lg.stroke(path(f, tx, ty)); } });
    // roads: casings first, then fills, biggest last so junctions read cleanly
    const roads = [];
    const keep = new Set(['motorway', 'trunk', 'primary', 'secondary', 'rail', ...(vz >= 12 ? ['tertiary'] : []), ...(vz >= 13 ? ['minor'] : [])]);
    each('transportation', (f, tx, ty) => { if (f.type !== 2) return; const cl = f.props.class; const st = ROAD[cl]; if (!st || !keep.has(cl) || f.props.brunnel === 'tunnel') return; roads.push([st, path(f, tx, ty), cl]); });
    const order = ['minor', 'rail', 'tertiary', 'secondary', 'primary', 'trunk', 'motorway'];
    roads.sort((a, b) => order.indexOf(a[2]) - order.indexOf(b[2]));
    for (const [st, p] of roads) if (st[2]) { lg.strokeStyle = st[2]; lg.lineWidth = (st[0] + 1.4) * W; lg.stroke(p); }
    for (const [st, p, cl] of roads) { lg.strokeStyle = st[1]; lg.lineWidth = st[0] * W; if (cl === 'rail') lg.setLineDash([4 * W, 3 * W]); lg.stroke(p); lg.setLineDash([]); }
    if (tiles.length) any = true;
  }
  if (!any) return null;
  // fade the real-world layer out towards the patch edges so it melts into the illustrated globe
  lg.globalCompositeOperation = 'destination-in';
  const grd = lg.createRadialGradient(S / 2, S / 2, S * 0.36, S / 2, S / 2, S * 0.72);
  grd.addColorStop(0, 'rgba(0,0,0,1)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  lg.fillStyle = grd; lg.fillRect(0, 0, S, S);
  g.drawImage(L, 0, 0);
  return c.transferToImageBitmap();
}
let latest = 0;
self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'init') { await init(data); self.postMessage({ type: 'ready' }); }
    if (data.type === 'paint') {
      latest = data.id;
      const out = paint(data);
      const keep = await createImageBitmap(out.color);            // copy for the real-world pass
      const rough2 = await createImageBitmap(out.rough);
      self.postMessage({ type: 'painted', id: data.id, box: data, ...out }, [out.color, out.rough]);
      const real = null; // street-map layer is off: the illustrated map is the look (paintReal kept for later use)
      keep.close();
      if (real && data.id === latest) self.postMessage({ type: 'painted', id: data.id, real: true, box: data, color: real, rough: rough2 }, [real, rough2]);
      else rough2.close();
    }
  } catch (e) { self.postMessage({ type: 'error', message: String(e) }); }
};
