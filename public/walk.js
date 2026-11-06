// Walk mode: a third-person character you steer around a famous place or a town,
// with other visitors shown live ("2 people here now").
// Works in the same local frame as models: kilometres, x = east, y = up, z = south.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { t } from './i18n.js';

export const SHIRTS = ['#f7931e', '#3b8fd0', '#2fa65a', '#d64533', '#8e5cc4', '#f6c445', '#1c9c9c', '#e85a8a', '#ffffff', '#2b2b2b'];
export const PANTS = ['#34425a', '#2b2b2b', '#6b5a4a', '#3b6ea8', '#c9b48a', '#7a2f2f'];
export const SKINS = ['#e0ac69', '#c68642', '#8d5524', '#f1c27d', '#ffdbac', '#a8714a'];
export const HAIR = ['#2b1d14', '#1a1a1a', '#5a3a22', '#a0522d', '#d9b26f', '#b0b0b0'];
export const STYLES = ['Short hair', 'Long hair', 'Bald', 'Cap'];
function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

const mats = new Map();
const mat = (c) => { if (!mats.has(c)) mats.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, flatShading: true })); return mats.get(c); };

// A simple person, ~21 m tall in this cartoon scale (houses are ~50 m). Legs are ~45% of height, straight.
export function makePerson(seed = 'guest', look) {
  const h = hash(seed), a = (look && look.avatar) || {};
  const pick = (arr, v, fb) => (Number.isInteger(v) && v >= 0 && v < arr.length ? arr[v] : fb);
  const shirt = pick(SHIRTS, a.s, SHIRTS[h % 8]), skin = pick(SKINS, a.k, SKINS[(h >>> 4) % SKINS.length]), hairC = pick(HAIR, a.h, HAIR[(h >>> 8) % 5]);
  const pantsC = pick(PANTS, a.p, PANTS[0]), style = Number.isInteger(a.y) ? a.y : 0;
  const g = new THREE.Group();
  const LEG = 0.0092, BODY = 0.0075, HEAD = 0.0022;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.0056, BODY, 0.0032).translate(0, LEG + BODY / 2, 0), mat(shirt));
  const head = new THREE.Mesh(new THREE.SphereGeometry(HEAD, 12, 10), mat(skin));
  head.position.y = LEG + BODY + HEAD * 1.15;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(HEAD * 1.05, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(hairC));
  hair.position.copy(head.position); hair.rotation.x = -0.35;
  g.add(torso, head);
  if (style === 0) g.add(hair);
  if (style === 1) {
    g.add(hair);
    const back = new THREE.Mesh(new THREE.BoxGeometry(HEAD * 1.9, HEAD * 2.6, HEAD * 0.9), mat(hairC));
    back.position.set(0, head.position.y - HEAD * 0.9, -HEAD * 0.75); g.add(back);
  }
  if (style === 3) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(HEAD * 1.05, HEAD * 1.08, HEAD * 0.8, 12), mat(shirt));
    cap.position.set(0, head.position.y + HEAD * 0.55, 0);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(HEAD * 1.6, HEAD * 0.15, HEAD * 1.3), mat(shirt));
    brim.position.set(0, head.position.y + HEAD * 0.2, HEAD * 1.0);
    g.add(cap, brim);
  }
  const limb = (len, w, c, x, y) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    pivot.add(new THREE.Mesh(new THREE.BoxGeometry(w, len, w).translate(0, -len / 2, 0), mat(c)));
    g.add(pivot);
    return pivot;
  };
  const legs = [-1, 1].map((s) => {
    const l = limb(LEG, 0.0023, pantsC, s * 0.0014, LEG);
    l.add(new THREE.Mesh(new THREE.BoxGeometry(0.0025, 0.0011, 0.0038).translate(0, -LEG + 0.00055, 0.0007), mat('#2b2b2b')));
    return l;
  });
  const arms = [-1, 1].map((s) => {
    const a = limb(0.0074, 0.0017, shirt, s * 0.0037, LEG + BODY * 0.96);
    a.rotation.z = s * 0.07;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.00095, 6, 5), mat(skin));
    hand.position.y = -0.0076; a.add(hand);
    return a;
  });
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.0045, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.22, depthWrite: false }));
  shadow.position.y = 0.0002; g.add(shadow);
  g.traverse((o) => { if (o.isMesh && o !== shadow) o.castShadow = true; });
  g.userData = { legs, arms, phase: 0 };
  return g;
}
export function animatePerson(p, moving, dt) {
  const u = p.userData;
  u.phase += dt * 9 * moving;
  const s = Math.sin(u.phase) * 0.65 * Math.min(1, moving * 1.4);
  u.legs[0].rotation.x = s; u.legs[1].rotation.x = -s;
  u.arms[0].rotation.x = -s * 0.85; u.arms[1].rotation.x = s * 0.85;
}

/**
 * createWalk({ scene, camera, placeOnSurface, ui }) → { start(opts), stop(), update(dt), active }
 */
export function createWalk({ scene, camera, placeOnSurface, dom }) {
  const W = { active: false };
  const frame = new THREE.Group();
  const sid = Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 8);
  let me, meLabel, room, obstacles = [], bound = 1.2, onExit;
  const pos = new THREE.Vector2(), camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  let heading = 0, speedNow = 0, beatAt = 0, beating = false, saved = null;
  const keys = new Set(), joy = { x: 0, y: 0 };
  const others = new Map();
  // free camera: drag to swing around the character, wheel / pinch to zoom
  let camYaw = 0, camPitch = 0.38, camDist = 0.1, lastDrag = -1e9;
  const touches = new Map();
  let drag = null, pinchD = 0, pinchDist = 0;
  const wrap = (a) => ((a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  if (dom) {
    dom.addEventListener('pointerdown', (e) => {
      if (!W.active) return;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 1) drag = { x: e.clientX, y: e.clientY };
      if (touches.size === 2) { const [a, b] = [...touches.values()]; pinchD = Math.hypot(a.x - b.x, a.y - b.y); pinchDist = camDist; drag = null; }
    });
    dom.addEventListener('pointermove', (e) => {
      if (!W.active || !touches.has(e.pointerId)) return;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2 && pinchD) {
        const [a, b] = [...touches.values()];
        camDist = THREE.MathUtils.clamp(pinchDist * (pinchD / (Math.hypot(a.x - b.x, a.y - b.y) || 1)), 0.022, 0.45);
      } else if (drag) {
        camYaw -= (e.clientX - drag.x) * 0.008;
        camPitch = THREE.MathUtils.clamp(camPitch + (e.clientY - drag.y) * 0.005, 0.05, 1.35);
        drag = { x: e.clientX, y: e.clientY };
        lastDrag = performance.now();
      }
    });
    const up = (e) => { touches.delete(e.pointerId); if (touches.size < 2) pinchD = 0; if (!touches.size) drag = null; };
    dom.addEventListener('pointerup', up);
    dom.addEventListener('pointercancel', up);
    dom.addEventListener('wheel', (e) => { if (W.active) camDist = THREE.MathUtils.clamp(camDist * Math.exp(e.deltaY * 0.0012), 0.022, 0.45); }, { passive: true });
  }

  // forward unit vector in (x, z) for heading θ (θ = 0 faces north = -z)
  const fwd = (t) => new THREE.Vector2(Math.sin(t), -Math.cos(t));
  const blocked = (x, z) => obstacles.some((b) => x > b[0] && x < b[1] && z > b[2] && z < b[3]);
  // fraction (0..1) along segment a->b where it first enters box, or 1 if it misses
  function segBox(ax, az, bx, bz, [x0, x1, z0, z1]) {
    let t0 = 0, t1 = 1;
    const dx = bx - ax, dz = bz - az;
    for (const [p, q] of [[-dx, ax - x0], [dx, x1 - ax], [-dz, az - z0], [dz, z1 - az]]) {
      if (p === 0) { if (q < 0) return 1; continue; }
      const r = q / p;
      if (p < 0) { if (r > t1) return 1; if (r > t0) t0 = r; } else { if (r < t0) return 1; if (r < t1) t1 = r; }
    }
    return t0 > 0.02 ? t0 : 1;
  }

  // ---------- input
  addEventListener('keydown', (e) => {
    if (!W.active || /input|textarea/i.test(e.target.tagName)) return;
    keys.add(e.key.toLowerCase());
    if (e.key.startsWith('Arrow') || e.key === ' ') e.preventDefault();
  });
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  const stick = document.querySelector('#joy'), knob = document.querySelector('#joy i');
  let joyId = null;
  const joyMove = (e) => {
    const r = stick.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, max = r.width / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const len = Math.hypot(dx, dy);
    if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
    joy.x = dx / max; joy.y = dy / max;
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  };
  stick.addEventListener('pointerdown', (e) => { joyId = e.pointerId; stick.setPointerCapture(e.pointerId); joyMove(e); });
  stick.addEventListener('pointermove', (e) => { if (e.pointerId === joyId) joyMove(e); });
  const joyEnd = (e) => { if (e.pointerId !== joyId) return; joyId = null; joy.x = joy.y = 0; knob.style.transform = ''; };
  stick.addEventListener('pointerup', joyEnd);
  stick.addEventListener('pointercancel', joyEnd);

  // ---------- presence ("N people here now")
  async function beat(leave = false) {
    if (beating && !leave) return;
    beating = true;
    try {
      const r = await fetch('/api/presence', {
        method: 'POST', headers: { 'content-type': 'application/json' }, keepalive: leave,
        body: JSON.stringify({ room, sid, id: W.handle, x: +pos.x.toFixed(5), z: +pos.y.toFixed(5), h: +heading.toFixed(3), leave, av: W.look && W.look.avatar, key: W.key }),
      });
      if (leave || !W.active) return;
      const j = await r.json();
      document.querySelector('#walkPeople').textContent = `${j.count} ${j.count === 1 ? t('person') : t('people')}`;
      const seen = new Set();
      for (const o of j.others || []) {
        seen.add(o.sid);
        let v = others.get(o.sid);
        if (!v) {
          const body = makePerson(o.id, o.look ? { avatar: o.look } : null);
          const lab = new CSS2DObject(Object.assign(document.createElement('div'), { className: 'wl', textContent: '@' + o.id }));
          lab.position.y = 0.0245; body.add(lab);
          body.position.set(o.x, 0, o.z);
          frame.add(body);
          v = { body, lab, tx: o.x, tz: o.z, th: o.h };
          others.set(o.sid, v);
        }
        v.tx = o.x; v.tz = o.z; v.th = o.h;
      }
      for (const [k, v] of others) if (!seen.has(k)) { v.lab.element.remove(); v.body.removeFromParent(); others.delete(k); }
    } catch { /* offline: walk alone */ } finally { beating = false; }
  }

  // ---------- lifecycle
  W.start = (o) => {
    if (W.active) W.stop();
    W.key = o.key || null;
    room = o.room; obstacles = o.obstacles || []; bound = o.bound || 1.2; onExit = o.onExit; W.handle = o.handle || 'guest';
    placeOnSurface(frame, o.lat, o.lon);
    scene.add(frame);
    if (o.interior) frame.add(o.interior.group); // a walk-in wonder brings its own floor and walls
    if (!o.interior || o.interior.outdoor) {
      const ground = new THREE.Mesh(new THREE.CircleGeometry(4, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: o.groundColor || '#6aa84a', roughness: 1 }));
      ground.position.y = o.interior ? -0.0006 : 0.0004; ground.name = 'walkGround'; ground.receiveShadow = true;
      frame.add(ground);
    }
    W.onStep = o.onStep || null; W.interior = o.interior || null;
    W.look = o.look || null;
    me = makePerson(W.handle, W.look);
    meLabel = new CSS2DObject(Object.assign(document.createElement('div'), { className: 'wl me', textContent: '@' + W.handle }));
    meLabel.position.y = 0.0245; me.add(meLabel);
    frame.add(me);
    pos.set(o.spawn[0], o.spawn[1]); heading = o.spawn[2] || 0;
    speedNow = 0; camPos.set(0, 0, 0); camYaw = heading; camPitch = 0.38; camDist = 0.1;
    saved = { bg: scene.background, fog: scene.fog, near: camera.near };
    const sky = o.interior && !o.interior.outdoor ? o.interior.sky : document.body.classList.contains('night') ? '#0b1630' : (o.interior?.sky || '#a9dcf5');
    scene.background = new THREE.Color(sky);
    scene.fog = new THREE.Fog(sky, (o.interior && !o.interior.outdoor ? 0.35 : 0.9) / 6371, (o.interior && !o.interior.outdoor ? 1.2 : 3.6) / 6371); // same fog type, so no materials need rebuilding
    W.active = true;
    document.body.classList.add('walking');
    document.querySelector('#walkTitle').textContent = o.title || '';
    beat();
  };
  W.stop = () => {
    if (!W.active) return;
    W.active = false;
    beat(true);
    for (const v of others.values()) { v.lab.element.remove(); }
    others.clear();
    meLabel.element.remove();
    frame.traverse((c) => { if (c.isCSS2DObject) c.element.remove(); });
    frame.clear(); frame.removeFromParent();
    scene.background = saved.bg; scene.fog = saved.fog;
    camera.up.set(0, 1, 0);
    document.body.classList.remove('walking');
    keys.clear(); joy.x = joy.y = 0;
    onExit && onExit();
  };
  addEventListener('pagehide', () => { if (W.active) beat(true); });

  W.update = (dt, now) => {
    if (!W.active) return;
    dt = Math.min(dt, 0.05);
    // steering
    let turn = 0, go = 0;
    if (keys.has('arrowleft') || keys.has('a')) turn -= 1;
    if (keys.has('arrowright') || keys.has('d')) turn += 1;
    if (keys.has('arrowup') || keys.has('w')) go += 1;
    if (keys.has('arrowdown') || keys.has('s')) go -= 0.6;
    if (Math.abs(joy.x) > 0.08 || Math.abs(joy.y) > 0.08) {
      // joystick points where you want to go, relative to where the camera looks
      const want = camYaw + Math.atan2(joy.x, -joy.y);
      const mag = Math.min(1, Math.hypot(joy.x, joy.y));
      const d = wrap(want - heading);
      go = mag * (Math.abs(d) > 2.2 ? 0.3 : 1);
      turn = THREE.MathUtils.clamp(d * 3, -2, 2);
    }
    const run = keys.has('shift') ? 1.9 : 1;
    heading += turn * 2.2 * dt;
    const target = go * 0.045 * run; // km per second
    speedNow += (target - speedNow) * Math.min(1, dt * 8);
    const f = fwd(heading);
    const nx = pos.x + f.x * speedNow * dt, nz = pos.y + f.y * speedNow * dt;
    if (!blocked(nx, nz)) pos.set(nx, nz);
    else if (!blocked(nx, pos.y)) pos.x = nx;
    else if (!blocked(pos.x, nz)) pos.y = nz;
    const r = pos.length();
    if (r > bound) pos.multiplyScalar(bound / r);
    me.position.set(pos.x, 0.0005, pos.y);
    me.rotation.y = Math.PI - heading;
    const before = Math.floor(me.userData.phase / Math.PI);
    animatePerson(me, Math.abs(speedNow) / 0.045, dt);
    if (Math.abs(speedNow) > 0.008 && Math.floor(me.userData.phase / Math.PI) !== before && W.onStep) W.onStep(keys.has('shift'));

    // others glide towards their last reported spot
    for (const v of others.values()) {
      const dx = v.tx - v.body.position.x, dz = v.tz - v.body.position.z;
      const dist = Math.hypot(dx, dz);
      v.body.position.x += dx * Math.min(1, dt * 3); v.body.position.z += dz * Math.min(1, dt * 3);
      v.body.rotation.y = Math.PI - v.th;
      animatePerson(v.body, Math.min(1, dist / 0.01), dt);
    }

    // camera swings back behind the character while walking, unless you dragged it recently
    if (Math.abs(speedNow) > 0.004 && now - lastDrag > 1500 && !(Math.abs(joy.x) > 0.08 || Math.abs(joy.y) > 0.08)) camYaw += wrap(heading - camYaw) * Math.min(1, dt * 2);
    const cf = fwd(camYaw);
    const horiz = Math.cos(camPitch) * camDist;
    // pull the camera in if a building stands between it and the character
    let dist = camDist;
    const cx = pos.x - cf.x * horiz, cz = pos.y - cf.y * horiz;
    for (const b of obstacles) {
      const f = segBox(pos.x, pos.y, cx, cz, b);
      if (f < 1) dist = Math.min(dist, Math.max(0.018, camDist * f * 0.85));
    }
    const h2 = Math.cos(camPitch) * dist;
    const wantCam = new THREE.Vector3(pos.x - cf.x * h2, 0.012 + Math.sin(camPitch) * dist, pos.y - cf.y * h2);
    const wantLook = new THREE.Vector3(pos.x + cf.x * 0.01, 0.012, pos.y + cf.y * 0.01);
    if (camPos.lengthSq() === 0) { camPos.copy(wantCam); camLook.copy(wantLook); }
    camPos.lerp(wantCam, Math.min(1, dt * 9)); camLook.lerp(wantLook, Math.min(1, dt * 9));
    frame.updateMatrixWorld();
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(frame.quaternion);
    camera.position.copy(frame.localToWorld(camPos.clone()));
    camera.up.copy(up);
    camera.lookAt(frame.localToWorld(camLook.clone()));

    if (now - beatAt > 1500) { beatAt = now; beat(); }
  };
  return W;
}
