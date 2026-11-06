// Diorama view: a place or a whole town shown as a little floating piece of land — grass on top, layers of soil
// underneath — on a soft cream page with a big title, like an illustrated travel poster. Drag to turn it,
// and "Save image" makes a 4:5 picture ready for Instagram.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let open = null;
export const dioramaOpen = () => !!open;

function roundedRect(w, d, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -d / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + d - r);
  s.quadraticCurveTo(x + w, y + d, x + w - r, y + d); s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
function circle(r) { const s = new THREE.Shape(); s.absarc(0, 0, r, 0, Math.PI * 2, false); return s; }
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, flatShading: false, ...o });

// grass top, dark topsoil, brown earth, pale base — each a thin extruded slab
function slab(shape, size, top = '#7cb75a') {
  const g = new THREE.Group();
  const k = size > 1.5 ? 0.45 : 1; // big towns get a thinner slab
  const layers = [[top, 0.022 * k], ['#6b4a2e', 0.03 * k], ['#9a6b45', 0.065 * k], ['#e9dcc3', 0.028 * k]];
  let y = 0;
  for (const [c, t] of layers) {
    const h = t * size;
    const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: true, bevelThickness: h * 0.08, bevelSize: size * 0.004, bevelSegments: 2, curveSegments: 24 });
    geo.rotateX(Math.PI / 2); // extrude downwards
    const m = new THREE.Mesh(geo, M(c)); m.position.y = y; m.receiveShadow = true; m.castShadow = true; g.add(m);
    y -= h;
  }
  return { group: g, depth: -y };
}

// opts: { title, subtitle, kicker, model (THREE.Object3D, y-up, centred), round, update(dt), brand }
export function openDiorama(opts) {
  closeDiorama();
  const wrap = document.createElement('div');
  wrap.className = 'diorama';
  wrap.innerHTML = `<div class="dhead"><div class="dkick"></div><h1 class="dtitle"></h1><div class="dsub"></div></div>
    <div class="dbtns"><button type="button" class="pill" data-a="save">⤓ Save image</button><button type="button" class="pill" data-a="spin">⟳ Spin</button><button type="button" class="pill" data-a="close">✕ Close</button></div>
    <div class="dhint">Drag to turn · scroll or pinch to zoom</div>`;
  wrap.querySelector('.dkick').textContent = opts.kicker || '';
  wrap.querySelector('.dtitle').textContent = opts.title || '';
  wrap.querySelector('.dsub').textContent = opts.subtitle || '';
  document.body.append(wrap);

  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  wrap.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const model = opts.model;
  const box = new THREE.Box3().setFromObject(model), size3 = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const S = Math.max(size3.x, size3.z) || 1;
  model.position.x -= c.x; model.position.z -= c.z; model.position.y -= box.min.y;
  model.traverse((o) => { if (o.isMesh || o.isInstancedMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const pad = S * 1.06;
  const { group: base, depth } = slab(opts.round ? circle(pad / 2) : roundedRect(pad, pad * (size3.z / Math.max(size3.x, 1e-6) > 0.7 ? Math.max(0.7, size3.z / size3.x) : 0.7), pad * 0.08), S, opts.top);
  const root = new THREE.Group(); root.add(base, model); scene.add(root);
  model.position.y += 0.0005 * S;

  // soft floor shadow, warm key light, sky fill
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(S * 8, S * 8).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.11 }));
  floor.position.y = -depth - S * 0.06; floor.receiveShadow = true; scene.add(floor);
  scene.add(new THREE.HemisphereLight('#ffffff', '#c9b89a', 1.25));
  const sun = new THREE.DirectionalLight('#fff3df', 2.4);
  sun.position.set(-S * 0.7, S * 2.8, S * 0.9); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = S * 0.002;
  const sc = sun.shadow.camera; sc.left = sc.bottom = -S * 1.4; sc.right = sc.top = S * 1.4; sc.near = S * 0.1; sc.far = S * 8;
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(28, 1, S / 200, S * 40);
  const ht = Math.max(size3.y, S * 0.15);
  camera.position.set(S * 1.75, S * 1.55 + ht * 0.7, S * 2.25);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, ht * 0.2 - depth * 0.6, 0);
  controls.enableDamping = true; controls.autoRotate = true; controls.autoRotateSpeed = 0.6;
  controls.minPolarAngle = 0.25; controls.maxPolarAngle = 1.35; controls.enablePan = false;
  controls.minDistance = S * 0.5; controls.maxDistance = S * 5;

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h); camera.aspect = w / h;
    camera.fov = w < h ? 38 : 28; camera.updateProjectionMatrix();
  }
  resize(); addEventListener('resize', resize);
  let last = performance.now(), raf = 0;
  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    try { opts.update?.(dt); } catch (e) { /* the town's animations are optional here */ }
    controls.update(); renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(loop);

  wrap.addEventListener('click', (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'close') closeDiorama();
    if (a === 'spin') controls.autoRotate = !controls.autoRotate;
    if (a === 'save') saveImage();
  });
  const onKey = (e) => { if (e.key === 'Escape') closeDiorama(); };
  addEventListener('keydown', onKey);

  async function saveImage() {
    const W = 1080, H = 1350, out = document.createElement('canvas'); out.width = W; out.height = H;
    const g = out.getContext('2d');
    g.fillStyle = '#f4efe6'; g.fillRect(0, 0, W, H);
    await document.fonts?.load('700 80px Fredoka').catch(() => {});
    // render the scene square, then place it under the title
    const keep = { w: renderer.domElement.width, h: renderer.domElement.height, a: camera.aspect, f: camera.fov, pr: renderer.getPixelRatio() };
    renderer.setPixelRatio(1); renderer.setSize(W, W, false); camera.aspect = 1; camera.fov = 30; camera.updateProjectionMatrix();
    scene.background = new THREE.Color('#f4efe6'); renderer.render(scene, camera);
    g.drawImage(renderer.domElement, 0, H - W - 40, W, W);
    scene.background = null; renderer.setPixelRatio(keep.pr); camera.fov = keep.f; resize();
    g.textAlign = 'center'; g.fillStyle = '#3d3a35';
    g.font = '500 30px Fredoka, sans-serif'; g.fillText((opts.kicker || '').toUpperCase().split('').join(String.fromCharCode(8202)), W / 2, 120);
    let fs = 132; g.font = `700 ${fs}px Fredoka, sans-serif`;
    const t = (opts.title || '').toUpperCase();
    while (g.measureText(t).width > W - 120 && fs > 48) { fs -= 6; g.font = `700 ${fs}px Fredoka, sans-serif`; }
    g.fillText(t, W / 2, 120 + fs + 10);
    if (opts.subtitle) { g.font = '400 30px Fredoka, sans-serif'; g.fillStyle = '#6b665c'; g.fillText(opts.subtitle, W / 2, 120 + fs + 62); }
    if (opts.brand) { g.font = '500 26px Fredoka, sans-serif'; g.fillStyle = '#8a8478'; g.fillText(opts.brand, W / 2, H - 34); }
    const a = document.createElement('a');
    a.download = `${(opts.title || 'diorama').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'diorama'}.png`;
    a.href = out.toDataURL('image/png'); a.click();
  }

  open = { wrap, renderer, raf, controls, resize, onKey, scene, dispose: opts.dispose };
}

export function closeDiorama() {
  if (!open) return;
  const o = open; open = null;
  cancelAnimationFrame(o.raf);
  removeEventListener('resize', o.resize); removeEventListener('keydown', o.onKey);
  o.controls.dispose();
  o.scene.traverse((x) => { if (x.isMesh && x.geometry && !x.isInstancedMesh) { /* geometries may be shared with the map; leave them */ } });
  try { o.dispose?.(); } catch (e) { /* ignore */ }
  o.renderer.dispose(); o.renderer.forceContextLoss();
  o.wrap.remove();
}
