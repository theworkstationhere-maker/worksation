// Realistic models for every one of the ~7,000 Wikidata places.
// Each place gets a model chosen from its name and category, built in the architectural style of its region
// (gothic cathedrals in France, onion domes in Russia, turquoise domes in Iran, gopurams in Tamil Nadu…),
// and varied by a seed from its id so no two look the same. Units are km, y up, front faces +z.
import { THREE, mat } from './lm-kit.js';
import { mountainGeometry } from './terrain.js';

// ---------------------------------------------------------------- shared unit geometry (scaled per mesh)
const GEO = new Map();
const geo = (k, f) => { let v = GEO.get(k); if (!v) { v = f(); GEO.set(k, v); } return v; };
const UB = () => geo('b', () => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0));
const UC = (n, t = 1) => geo(`c${n}_${t}`, () => new THREE.CylinderGeometry(t, 1, 1, n).translate(0, 0.5, 0));
const UK = (n) => geo(`k${n}`, () => new THREE.ConeGeometry(1, 1, n).translate(0, 0.5, 0));
const UD = (n) => geo(`d${n}`, () => new THREE.SphereGeometry(1, n, Math.max(4, n >> 1), 0, Math.PI * 2, 0, Math.PI / 2));
const US = (n) => geo(`s${n}`, () => new THREE.SphereGeometry(1, n, Math.max(4, n - 3)));
const UO = (n) => geo(`o${n}`, () => new THREE.LatheGeometry([[0, 0], [0.9, 0], [1.08, 0.35], [1.0, 0.75], [0.6, 1.15], [0.18, 1.45], [0.0001, 1.7]].map(([a, b]) => new THREE.Vector2(a, b)), n));
const UG = () => geo('g', () => new THREE.CylinderGeometry(0.5, 0.5, 1, 3).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2).scale(1, 1 / 0.75, 1 / 0.866).translate(0, 0.25 / 0.75, 0));
const UH = () => geo('h', () => new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0));
const UT = (arc) => geo(`t${arc}`, () => new THREE.TorusGeometry(1, 0.06, 4, 16, arc));
const UBC = () => geo('bc', () => new THREE.BoxGeometry(1, 1, 1));
const UT2 = (arc) => geo(`T${arc}`, () => new THREE.TorusGeometry(1, 0.28, 6, 16, arc));
const UCIRC = () => geo('ci', () => new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2));

function P(g, gm, c, x, y, z, sx, sy, sz, ry = 0, o) {
  const m = new THREE.Mesh(gm, mat(c, o)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.y = ry; g.add(m); return m;
}
const bx = (g, w, h, d, c, x = 0, y = 0, z = 0, ry = 0, o) => P(g, UB(), c, x, y, z, w, h, d, ry, o);
const cy = (g, r, h, c, x = 0, y = 0, z = 0, n = 12, t = 1, o) => P(g, UC(n, t), c, x, y, z, r, h, r, 0, o);
const cn = (g, r, h, c, x = 0, y = 0, z = 0, n = 12, ry = 0) => P(g, UK(n), c, x, y, z, r, h, r, ry);
const dm = (g, r, c, x = 0, y = 0, z = 0, sq = 1, n = 14) => P(g, UD(n), c, x, y, z, r, r * sq, r);
const sp = (g, r, c, x = 0, y = 0, z = 0, n = 8, o) => P(g, US(n), c, x, y, z, r, r, r, 0, o);
const on = (g, r, c, x = 0, y = 0, z = 0, n = 12) => P(g, UO(n), c, x, y, z, r, r, r);
const gb = (g, len, h, d, c, x = 0, y = 0, z = 0, ry = 0) => P(g, UG(), c, x, y, z, len, h, d, ry);   // gable roof, ridge along x
const hp = (g, w, h, d, c, x = 0, y = 0, z = 0, ry = 0) => P(g, UH(), c, x, y, z, w, h, d, ry);       // hip / pyramid roof
const disc = (g, r, c, x = 0, y = 0, z = 0, sx = 1, sz = 1) => P(g, UCIRC(), c, x, y + 0.001, z, r * sx, 1, r * sz);
const N = (g, x = 0, y = 0, z = 0, ry = 0, s = 1) => { const n = new THREE.Group(); n.position.set(x, y, z); n.rotation.y = ry; n.scale.setScalar(s); g.add(n); return n; };
const glass = { metalness: 0.55, roughness: 0.22 };
const see = { transparent: true, opacity: 0.5 };

// ---------------------------------------------------------------- seeded randomness
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let a = seed; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------------------------------------------------------------- regions and their palettes
const S = (s) => new Set(s.split('|'));
const R = {
  nordic: S('Norway|Sweden|Finland|Denmark|Iceland|Faroe Islands|Greenland|Kingdom of Denmark|Estonia|Latvia|Lithuania'),
  brit: S('United Kingdom|Ireland|Kingdom of England|Roman Britain'),
  med: S('Italy|Spain|Portugal|Malta|Croatia|Vatican City|San Marino|Monaco|Andorra|Ancient Rome|Roman Empire|Slovenia'),
  central: S('Germany|Austria|Switzerland|Czech Republic|Poland|Slovakia|Hungary|Netherlands|Belgium|Luxembourg|Liechtenstein|France|Nazi Germany'),
  orth: S('Russia|Ukraine|Belarus|Serbia|Bulgaria|Romania|Georgia|Armenia|Moldova|Montenegro|North Macedonia|Byzantine Empire|Cyprus|Greece'),
  ottoman: S('Turkey|Türkiye|Northern Cyprus|Bosnia and Herzegovina|Kosovo|Albania'),
  persian: S('Iran|Afghanistan|Uzbekistan|Tajikistan|Turkmenistan|Azerbaijan|Kazakhstan|Kyrgyzstan'),
  arab: S('Saudi Arabia|Egypt|Syria|Iraq|Jordan|Lebanon|Israel|Palestine|West Bank|Israeli-occupied territories|Occupied Palestinian territory|Golan Heights|Morocco|Algeria|Tunisia|Libya|Yemen|Oman|United Arab Emirates|Qatar|Kuwait|Bahrain|Sudan|Mauritania|Seleucid Empire|Canaan|Somalia|Somaliland|Eritrea|Comoros|Djibouti'),
  sahel: S('Mali|Niger|Burkina Faso|Chad|Senegal|Guinea|The Gambia|Guinea-Bissau'),
  india: S('India|Pakistan|Bangladesh'),
  nepal: S('Nepal|Bhutan'),
  lanka: S('Sri Lanka|Maldives'),
  china: S("People's Republic of China|Taiwan|Hong Kong|Qing dynasty|Yuan dynasty|Jin dynasty|Mongolia|Vietnam|North Korea|South Korea"),
  japan: S('Japan'),
  sea: S('Thailand|Laos|Cambodia|Myanmar'),
  isea: S('Indonesia|Malaysia|Philippines|Brunei|Singapore|Dutch East Indies|Timor-Leste'),
  nam: S('United States|Canada'),
  oceania: S('Australia|New Zealand|Fiji|Papua New Guinea|Vanuatu|Solomon Islands|Kiribati|Palau|Marshall Islands|Federated States of Micronesia'),
};
export function regionOf(p) {
  for (const k in R) if (R[k].has(p.k)) return k;
  const { lat, lon } = p;
  if (lon < -30) return lat > 24 ? 'nam' : 'latam';
  if (lat > 35 && lon < 45) return lon > 20 ? 'orth' : 'central';
  if (lat > -35 && lat < 37 && lon < 52) return lat > 15 ? 'arab' : 'africa';
  if (lon > 110 && lat < -10) return 'oceania';
  if (lon > 100) return lat > 20 ? 'china' : 'isea';
  return 'india';
}
// stone, accent, roof, dome colours per region
const PAL = {
  nordic: { st: '#d8d2c4', wall: ['#c0503a', '#e8c25a', '#f2efe8', '#7d9cb8', '#b8312a'], roof: ['#3e4a52', '#5a3a2a', '#2f3a40'], dome: '#5f8f7a', house: 'gable' },
  brit: { st: '#c9bfa8', wall: ['#a8573e', '#d8cdb4', '#b5654a', '#efe9de'], roof: ['#4a4f55', '#5a5f66', '#7a4a3a'], dome: '#7d8a8c', house: 'gable' },
  med: { st: '#e2d6bc', wall: ['#e8c99a', '#f2e4c8', '#d9a679', '#efe2c8', '#e4b98a', '#f4efe4'], roof: ['#c0603a', '#b5573a', '#cf7048'], dome: '#c0603a', house: 'tile' },
  central: { st: '#cbc2b0', wall: ['#efe9de', '#e8d9b5', '#d9c3a0', '#f2efe8', '#cfd6dd', '#e6cfa8'], roof: ['#a6402e', '#4a4f55', '#8a3a2a', '#5f6a72'], dome: '#5f8f7a', house: 'gable' },
  orth: { st: '#efe9de', wall: ['#f2efe8', '#efe2c8', '#e8c99a', '#cfe0ea', '#f0d0c0'], roof: ['#5f8f7a', '#8a3a2a', '#4a6fa8', '#6b7d8c'], dome: '#e0c062', house: 'gable' },
  ottoman: { st: '#e3dccd', wall: ['#f2efe8', '#e8d9c4', '#d9c3a0'], roof: ['#b5573a', '#c0603a'], dome: '#7d8a8c', house: 'tile' },
  persian: { st: '#d9c3a0', wall: ['#d9c3a0', '#cdb58c', '#e2d0ae'], roof: ['#cdb58c'], dome: '#2fa0b8', house: 'flat' },
  arab: { st: '#e2cfa8', wall: ['#efe2c8', '#e2cfa8', '#f4efe4', '#d9bf94'], roof: ['#d9bf94'], dome: '#3f8f5a', house: 'flat' },
  sahel: { st: '#b9824f', wall: ['#b9824f', '#a8703f', '#c4935f'], roof: ['#a8703f'], dome: '#b9824f', house: 'flat' },
  africa: { st: '#c9b89a', wall: ['#d9a679', '#e8d9c4', '#c4935f', '#f2efe8'], roof: ['#9a8a5a', '#b5573a', '#6b7d8c'], dome: '#c9b89a', house: 'hut' },
  india: { st: '#d9b48a', wall: ['#e8c99a', '#f2efe8', '#e9b0a0', '#f6d27a', '#cfe0ea'], roof: ['#d9b48a'], dome: '#f4f1ea', house: 'flat' },
  nepal: { st: '#a85a3a', wall: ['#a85a3a', '#b86a46', '#e8d9c4'], roof: ['#5a3a2a', '#6b4a2a'], dome: '#f4f1ea', house: 'gable' },
  lanka: { st: '#efe9de', wall: ['#f2efe8', '#e8d9c4', '#f6d27a'], roof: ['#b5573a'], dome: '#f4f1ea', house: 'tile' },
  china: { st: '#d9d2c4', wall: ['#b8312a', '#c9c2b0', '#9aa2ad', '#e8e3d6'], roof: ['#e8b93a', '#3f6f5a', '#4a4f55'], dome: '#e8b93a', house: 'eave' },
  japan: { st: '#cfc8b8', wall: ['#f2efe8', '#5a3a2a', '#e8e3d6'], roof: ['#3e4650', '#4a5560', '#5f8f7a'], dome: '#3e4650', house: 'eave' },
  sea: { st: '#efe9de', wall: ['#f2efe8', '#e8d9c4', '#c9a87a'], roof: ['#d6603a', '#2f7a5a', '#c0503a'], dome: '#e8b93a', house: 'eave' },
  isea: { st: '#cfc0a0', wall: ['#f2efe8', '#e8d9c4', '#c9a87a', '#cfe0ea'], roof: ['#7a4a2a', '#b5573a', '#5a3a2a'], dome: '#3f8f5a', house: 'tile' },
  latam: { st: '#e8dcc0', wall: ['#f6d27a', '#f2efe8', '#e9a0a0', '#9fd0e0', '#f4b860', '#cfe8b8'], roof: ['#c0603a', '#b5573a'], dome: '#e8c25a', house: 'tile' },
  nam: { st: '#cfc6b4', wall: ['#efe9de', '#b5654a', '#d8cdb4', '#cfd6dd'], roof: ['#4a4f55', '#6b5a4a', '#3e4a52'], dome: '#7d8a8c', house: 'gable' },
  oceania: { st: '#d8d2c4', wall: ['#efe9de', '#cfd6dd', '#e8d9c4'], roof: ['#6b7d8c', '#b5573a', '#4a4f55'], dome: '#7d8a8c', house: 'gable' },
};

// ---------------------------------------------------------------- what kind of place is this?
const KW = [
  [/national park|nature reserve|national reserve|wildlife|biosphere|marine park|crater\b/, 'park'],
  [/historic cent|old town|old city|historic city|historic town|altstadt|medina of|^ city of|^ town of|old quarter|historic quarter/, 'oldtown'],
  [/henge|stone circle|megalith|dolmen|carnac|avebury|menhir|cairn|barrow|göbekli/, 'ruins'],
  [/auschwitz|dachau|concentration camp|genocide|holocaust|peace memorial|killing fields/, 'monument'],
  [/\b(troy|petra|palmyra|ephesus|pergamon|hierapolis|baalbek|byblos|jerash|gerasa|leptis|sabratha|cyrene|carthage|delphi|olympia|mycenae|knossos|epidaurus|pompeii|herculaneum|ostia|paestum|persepolis|pasargadae|babylon|nineveh|hatra|ctesiphon|aksum|meroë|meroe|thebes|luxor|memphis|saqqara|abu simbel|philae|dendera|edfu|kom ombo|mohenjo-daro|harappa|taxila|hampi|teotihuacan|tikal|palenque|copán|uxmal|tulum|monte albán|chan chan|tiwanaku|caral|great zimbabwe|bagan|ayutthaya|sukhothai|polonnaruwa|sigiriya|anuradhapura|volubilis|timgad|djemila|tipasa|dougga|aphrodisias|çatalhöyük|hattusa|nemrut|ani|masada|caesarea|bosra|apamea|ugarit|dura-europos|samarra|nimrud|ashur|susa|tyre|sidon|salamis|kourion|butrint|split|aquileia|mérida|tarraco|segesta|agrigento|selinunte|xanthos|perge|side|termessos|miletus|priene|didyma|troas|pella|vergina|philippi|stobi|histria|olbia|chersonesos|panticapaeum|merv|nisa|afrasiyab|otrar|bamiyan|angkor|my son|borobudur|prambanan)\b/, 'ruins'],
  [/necropolis|valley of the kings|tombs of|pyramid/, 'pyr'],
  [/cathedral|basilica|duomo|catedral|kathedrale|\bdom\b|notre-dame|minster|church|chapel|kirche|iglesia|igreja|église|abbey|monaster|convent|priory|kloster|chiesa|lavra|sobor/, 'church'],
  [/mosque|masjid|camii|cami\b|jami|jama |külliye|madrasa|medrese/, 'mosque'],
  [/mausoleum|tomb|türbe|maqbara|gumbaz|mazar/, 'mausoleum'],
  [/cemetery|graveyard|cimetière|friedhof/, 'cemetery'],
  [/pagoda|stupa|chedi|dagoba|zedi|chorten|dzong/, 'pagoda'],
  [/shrine|jinja|taisha|-gū|\bgu\b/, 'shrine'],
  [/temple|mandir|\bwat\b|kovil|devasthanam|tempel|templo|tempio|pura |candi|kuil/, 'temple'],
  [/lighthouse|phare|faro|leuchtturm/, 'lighthouse'],
  [/bridge|pont |ponte|puente|brücke|\bmost\b|viaduct|aqueduct/, 'bridge'],
  [/amphitheat|arena of|arènes|colosseum|coliseum|roman theatre/, 'amphi'],
  [/stadium|arena|stadion|estadio|ballpark|velodrome|olympic/, 'stadium'],
  [/castle|château|chateau|schloss|burg\b|castello|castillo|zamek|hrad|kasteel|slott/, 'castle'],
  [/palace|palazzo|palacio|palais|residenz|istana|saray|mahal\b|haveli/, 'palace'],
  [/fort\b|fortress|citadel|kremlin|kasbah|alcazaba|festung|qal'?a|bastion|fortaleza/, 'fort'],
  [/opera|theatre|theater|teatro|concert hall|philharmon/, 'opera'],
  [/museum|musée|museo|gallery|galleria|library|bibliotheca|university/, 'museum'],
  [/tv tower|television tower|fernsehturm|sky tower|space needle|tower\b|torre|turm|minaret/, 'tower'],
  [/statue|buddha|colossus/, 'statue'],
  [/obelisk/, 'obelisk'],
  [/memorial|monument|mémorial|denkmal|cenotaph/, 'monument'],
  [/triumph|arch\b|arco|gate\b|gateway|porta |puerta|\btor\b|darwaza/, 'arch'],
  [/square|plaza|piazza|platz|place |zócalo|maidan/, 'square'],
  [/garden|gardens|jardin|giardino|botanic/, 'garden'],
  [/waterfall|falls|cascad|chute|salto/, 'waterfall'],
  [/volcano|volcán|vulkan/, 'volcano'],
  [/canyon|gorge|cañón/, 'canyon'],
  [/cave|caves|grotto|grotte|cueva/, 'cave'],
  [/lake|lago|loch|lac |\bsee\b/, 'lake'],
  [/reef|lagoon|bay\b|coast|beach|fjord/, 'coast'],
  [/island|islands|isle|archipelago/, 'island'],
  [/mount |mountain|peak|\bmont |monte |massif|\brange\b|alps/, 'mountain'],
  [/national park|nature reserve|park|reserve|forest|wilderness|valley|landscape|desert|delta|wetland/, 'park'],
  [/wall\b|walls|ramparts|limes/, 'walls'],
  [/historic cent|old town|old city|city of|town of|medina|altstadt|historic|ville|centro|citta|ciudad/, 'oldtown'],
  [/ruins|ancient|archaeolog|roman|site of|sites/, 'ruins'],
];
const CAT_KIND = {
  heritage: 'oldtown', archaeological: 'ruins', mountain: 'mountain', volcano: 'volcano', lake: 'lake', waterfall: 'waterfall',
  canyon: 'canyon', park: 'park', zoo: 'zoo', themepark: 'themepark', square: 'square', tower: 'tower', skyscraper: 'skyscraper',
  museum: 'museum', mosque: 'mosque', stadium: 'stadium', temple: 'temple', church: 'church', bridge: 'bridge', palace: 'palace',
  castle: 'castle', lighthouse: 'lighthouse', statue: 'statue', mausoleum: 'mausoleum', fort: 'fort', monument: 'monument',
  opera: 'opera', arch: 'arch', pagoda: 'pagoda', pyramid: 'pyr', shrine: 'shrine',
};
// categories where the category itself is reliable and the name should only refine, not override
const STRONG = new Set(['mountain', 'volcano', 'lake', 'waterfall', 'canyon', 'skyscraper', 'bridge', 'stadium', 'lighthouse', 'themepark', 'zoo', 'mosque', 'church']);
export const NATURE_KINDS = new Set(['mountain', 'volcano', 'lake', 'waterfall', 'canyon', 'park', 'coast', 'island', 'cave']);
export function kindOf(p) {
  if (p._kind) return p._kind;
  const n = ` ${p.n.toLowerCase()} `;
  let k = CAT_KIND[p.c] || 'oldtown';
  if (!STRONG.has(p.c)) for (const [re, kk] of KW) if (re.test(n)) { k = kk; break; }
  if (p.c === 'church' || p.c === 'mosque') k = p.c;
  if (k === 'mountain' && p.c === 'volcano') k = 'volcano';
  return (p._kind = k);
}

// ---------------------------------------------------------------- small building parts
function windowsRow(g, n, w, y, z, c, ww, wh, x0 = 0) { for (let i = 0; i < n; i++) bx(g, ww, wh, 0.002, c, x0 + (i - (n - 1) / 2) * (w / n), y, z); }
function tree(g, x, z, s, c = '#4a8c3f') { cy(g, 0.0025 * s, 0.012 * s, '#6b4a2a', x, 0, z, 5); sp(g, 0.011 * s, c, x, 0.018 * s, z, 6); }
function conifer(g, x, z, s) { cy(g, 0.002 * s, 0.006 * s, '#6b4a2a', x, 0, z, 5); cn(g, 0.009 * s, 0.03 * s, '#2f5d34', x, 0.004 * s, z, 6); }
function palm(g, x, z, s) { cy(g, 0.0015 * s, 0.03 * s, '#8a6a48', x, 0, z, 5); for (let i = 0; i < 5; i++) bx(g, 0.003 * s, 0.002 * s, 0.018 * s, '#4f8f3f', x, 0.03 * s, z, (i / 5) * Math.PI * 2); }
function trees(g, ctx, n, r0, r1, s = 1) {
  const { r, reg } = ctx;
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = r0 + r() * (r1 - r0), x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (reg === 'nordic' || (reg === 'nam' && ctx.p.lat > 45) || ctx.p.lat > 58) conifer(g, x, z, s * (0.8 + r() * 0.6));
    else if (['isea', 'sea', 'latam', 'lanka', 'africa', 'oceania'].includes(reg) && Math.abs(ctx.p.lat) < 25 && r() < 0.6) palm(g, x, z, s * (0.8 + r() * 0.5));
    else tree(g, x, z, s * (0.8 + r() * 0.6), r() < 0.2 ? '#5f9a45' : '#4a8c3f');
  }
}
// a house in the local style
function house(g, ctx, x, z, ry, w, d, h) {
  const { r, pal } = ctx, wall = ctx.pick(pal.wall), roof = ctx.pick(pal.roof), t = pal.house;
  const n = N(g, x, 0, z, ry);
  if (t === 'hut') { cy(n, w * 0.5, h, wall, 0, 0, 0, 8); cn(n, w * 0.65, h * 0.9, '#a08a5a', 0, h, 0, 8); return; }
  bx(n, w, h, d, wall);
  windowsRow(n, Math.max(1, Math.round(w / 0.012)), w, h * 0.45, d / 2 + 0.001, '#4d5866', 0.004, h * 0.25);
  if (t === 'gable') gb(n, w * 1.05, h * (0.5 + r() * 0.5), d * 1.1, roof, 0, h, 0);
  else if (t === 'tile') hp(n, w * 1.08, h * 0.32, d * 1.08, roof, 0, h, 0);
  else if (t === 'eave') { hp(n, w * 1.3, h * 0.45, d * 1.35, roof, 0, h, 0); }
  else { bx(n, w * 1.02, h * 0.08, d * 1.02, ctx.pal.st, 0, h); if (r() < 0.3) bx(n, w * 0.3, h * 0.3, d * 0.3, wall, w * 0.2, h, -d * 0.2); }
}
// streets of houses around the centrepiece, kept clear of the middle
function quarter(g, ctx, n, rIn, rOut, s = 1) {
  if (ctx.quarterOff) return;
  const { r } = ctx;
  const ring = [];
  for (let i = 0; i < n * 3 && ring.length < n; i++) {
    const a = r() * Math.PI * 2, d = rIn + Math.sqrt(r()) * (rOut - rIn), x = Math.cos(a) * d, z = Math.sin(a) * d;
    const w = (0.018 + r() * 0.02) * s, dd = (0.016 + r() * 0.014) * s;
    if (ring.some(([px, pz]) => Math.abs(px - x) < (w + 0.02 * s) * 0.6 && Math.abs(pz - z) < (dd + 0.02 * s) * 0.6)) continue;
    ring.push([x, z]);
    house(g, ctx, x, z, Math.round((a + Math.PI / 2) / (Math.PI / 2)) * (Math.PI / 2) + (r() - 0.5) * 0.2, w, dd, (0.014 + r() * 0.02) * s);
  }
}
function paving(g, ctx, w, d, c) { bx(g, w, 0.002, d, c || ctx.pal.st, 0, 0, 0); }

// ---------------------------------------------------------------- churches
function churchGothic(g, ctx, big) {
  const { r, pal } = ctx, st = ctx.pick(['#cfc6b4', '#bdb4a0', '#d9cfbb', '#a8a090', '#c9b89a']), roof = ctx.pick(['#4a4f55', '#5f8f7a', '#3e4a52', '#7a4a3a']);
  const L = big ? 0.26 + r() * 0.08 : 0.15 + r() * 0.06, W = L * 0.32, H = L * 0.4;
  bx(g, W, H, L, st, 0, 0, 0); gb(g, L, H * 0.5, W, roof, 0, H, 0, Math.PI / 2);
  for (const s of [-1, 1]) {
    bx(g, W * 0.45, H * 0.55, L * 0.85, st, s * W * 0.72, 0, -L * 0.03);
    for (let i = 0; i < 7; i++) { const z = -L * 0.4 + i * L * 0.12; bx(g, W * 0.3, H * 0.8, 0.006, st, s * W * 0.8, 0, z); bx(g, 0.004, H * 0.5, W * 0.01 + 0.004, '#3b4a6a', s * (W / 2 + 0.001), H * 0.3, z + L * 0.06); } // flying buttresses, lancet windows
  }
  bx(g, W * 2.4, H, W * 0.9, st, 0, 0, -L * 0.15); gb(g, W * 2.4, H * 0.5, W * 0.9, roof, 0, H, -L * 0.15);           // transept
  P(g, UC(10), st, 0, 0, -L / 2, W * 0.5, H, W * 0.5); cn(g, W * 0.52, H * 0.5, roof, 0, H, -L / 2, 10);                // apse
  const tall = r(), fz = L / 2 - W * 0.2;
  for (const s of [-1, 1]) {
    const tw = W * 0.42, th = H * (1.7 + r() * 0.3);
    bx(g, tw, th, tw, st, s * W * 0.36, 0, fz);
    if (tall < 0.55) cn(g, tw * 0.75, th * (0.7 + r() * 0.5), st, s * W * 0.36, th, fz, 8);                           // openwork spires (Cologne, Chartres)
    else for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) cn(g, tw * 0.1, tw * 0.5, st, s * W * 0.36 + a * tw * 0.4, th, fz + b * tw * 0.4, 4); // flat tops with pinnacles (Notre-Dame)
  }
  P(g, UC(16), '#5a7ab0', 0, H * 0.72, L / 2 + 0.0005, W * 0.22, 0.002, W * 0.22).rotation.x = Math.PI / 2;
  for (const x of [-W * 0.3, 0, W * 0.3]) bx(g, W * 0.18, H * 0.45, 0.003, '#3d3a33', x, 0, L / 2 + 0.001);           // three portals
  if (r() < 0.6) cn(g, W * 0.12, H * (0.8 + r() * 0.6), roof, 0, H * 1.4, -L * 0.15, 8);                             // crossing flèche
}
function churchSmall(g, ctx) {  // village / parish church: nave + single west tower with spire
  const { r, pal } = ctx, st = ctx.pick([pal.st, ...pal.wall.slice(0, 2)]), roof = ctx.pick(pal.roof);
  const L = 0.1 + r() * 0.05, W = L * 0.4, H = L * 0.35;
  bx(g, W, H, L, st, 0, 0, 0); gb(g, L, H * 0.6, W * 1.05, roof, 0, H, 0, Math.PI / 2);
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) bx(g, 0.002, H * 0.5, 0.006, '#5a6a80', s * (W / 2 + 0.001), H * 0.25, -L * 0.3 + i * L * 0.18);
  const tw = W * 0.6, th = H * (2 + r());
  bx(g, tw, th, tw, st, 0, 0, L / 2); const style = r();
  if (ctx.reg === 'central' && style < 0.45) { on(g, tw * 0.5, roof, 0, th, L / 2, 10); cn(g, tw * 0.15, tw * 1.2, roof, 0, th + tw * 0.8, L / 2, 6); } // Bavarian onion spire
  else if (ctx.reg === 'brit' && style < 0.6) { for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) cn(g, tw * 0.1, tw * 0.45, st, a * tw * 0.4, th, L / 2 + b * tw * 0.4, 4); } // square perpendicular tower
  else cn(g, tw * 0.72, th * (0.8 + r() * 0.6), roof, 0, th, L / 2, ctx.reg === 'nordic' ? 4 : 8, Math.PI / 4);
  P(g, UC(10), st, 0, 0, -L / 2, W * 0.45, H * 0.9, W * 0.45); cn(g, W * 0.47, H * 0.5, roof, 0, H * 0.9, -L / 2, 10);
  bx(g, tw * 0.4, th * 0.12, 0.002, '#3d3a33', 0, 0, L / 2 + tw / 2 + 0.001);
  bx(g, tw * 0.25, tw * 0.25, 0.002, '#f2efe8', 0, th * 0.8, L / 2 + tw / 2 + 0.001);  // clock face
}
function churchRomanesque(g, ctx, big) {  // Italian/Spanish: basilica with dome and separate campanile
  const { r, pal } = ctx, st = ctx.pick(['#e8dcc0', '#f2e4c8', '#d9b48a', '#efe9de', '#e2d0ae']), roof = ctx.pick(pal.roof);
  const L = big ? 0.24 + r() * 0.08 : 0.14 + r() * 0.05, W = L * 0.34, H = L * 0.3;
  bx(g, W, H, L, st); gb(g, L, H * 0.35, W, roof, 0, H, 0, Math.PI / 2);
  for (const s of [-1, 1]) { bx(g, W * 0.45, H * 0.6, L * 0.9, st, s * W * 0.7, 0, 0); gb(g, L * 0.9, H * 0.2, W * 0.45, roof, s * W * 0.7, H * 0.6, 0, Math.PI / 2); }
  bx(g, W * 2.2, H, W, st, 0, 0, -L * 0.2); gb(g, W * 2.2, H * 0.35, W, roof, 0, H, -L * 0.2);
  // façade: pediment, rose, columns
  bx(g, W * 1.9, H * 1.15, 0.01, st, 0, 0, L / 2); gb(g, W * 1.9, H * 0.35, 0.012, st, 0, H * 1.15, L / 2);
  for (let i = 0; i < 6; i++) cy(g, 0.003, H * 0.7, '#f4efe4', -W * 0.8 + i * W * 0.32, 0, L / 2 + 0.008, 6);
  if (big || r() < 0.6) { const dr = W * (0.55 + r() * 0.25); cy(g, dr, H * 0.45, st, 0, H * 1.1, -L * 0.2, 16); dm(g, dr, ctx.pick(['#c0603a', '#7d8a8c', '#5f8f7a', '#e8c25a']), 0, H * 1.55, -L * 0.2, 1.15, 16); cy(g, dr * 0.18, dr * 0.5, st, 0, H * 1.55 + dr * 1.1, -L * 0.2, 8); }
  const cx = W * 1.4 * (r() < 0.5 ? -1 : 1), tw = W * 0.5, th = H * (2.6 + r() * 1.2);
  bx(g, tw, th, tw, ctx.pick(['#e8dcc0', '#c9a87a', '#f2efe8']), cx, 0, L * 0.25);
  for (let k = 0; k < 4; k++) bx(g, tw * 1.02, th * 0.02, tw * 1.02, '#d9cfbb', cx, th * (0.3 + k * 0.18), L * 0.25);
  bx(g, tw * 0.5, th * 0.1, tw * 1.01, '#3d3a33', cx, th * 0.86, L * 0.25);
  if (r() < 0.5) hp(g, tw * 1.1, tw * 0.6, tw * 1.1, roof, cx, th, L * 0.25); else cn(g, tw * 0.6, tw * 1.4, st, cx, th, L * 0.25, 8);
}
function churchOrthodox(g, ctx, big) {  // white walls, onion domes in gold / green / blue, often tented bell tower
  const { r, pal } = ctx, wall = ctx.pick(['#f2efe8', '#efe2c8', '#f0d0c0', '#cfe0ea', '#f4efe4']), roof = ctx.pick(['#5f8f7a', '#4a6fa8', '#8a3a2a', '#6b7d8c']);
  const domeC = ctx.pick(['#e0c062', '#e0c062', '#2f6fb8', '#3f8f5a', '#e0c062']), Wd = big ? 0.15 + r() * 0.05 : 0.09 + r() * 0.03, H = Wd * 0.7;
  const greek = ctx.p.k === 'Greece' || ctx.p.k === 'Cyprus' || ctx.p.k === 'Byzantine Empire' || ctx.p.k === 'Georgia' || ctx.p.k === 'Armenia';
  bx(g, Wd, H, Wd, wall); hp(g, Wd * 1.05, H * 0.25, Wd * 1.05, roof, 0, H, 0);
  for (const [x, z] of [[Wd * 0.62, 0], [-Wd * 0.62, 0], [0, -Wd * 0.62]]) { cy(g, Wd * 0.25, H * 0.75, wall, x, 0, z, 10); dm(g, Wd * 0.25, roof, x, H * 0.75, z, 0.6, 10); } // apses
  if (greek) { cy(g, Wd * 0.22, H * 0.4, wall, 0, H * 1.1, 0, 12); dm(g, Wd * 0.22, ctx.p.k === 'Greece' ? '#3b6fbf' : '#8a8f86', 0, H * 1.5, 0, ctx.p.k === 'Armenia' || ctx.p.k === 'Georgia' ? 1.6 : 0.8, 12); }
  else {
    const drum = (x, z, rr, y) => { cy(g, rr * 0.75, rr * 1.6, wall, x, y, z, 10); on(g, rr, domeC === '#e0c062' && r() < 0.3 ? roof : domeC, x, y + rr * 1.6, z, 12); cy(g, rr * 0.06, rr * 1.2, '#e0c062', x, y + rr * 3.2, z, 4); bx(g, rr * 0.6, rr * 0.06, rr * 0.06, '#e0c062', x, y + rr * 3.9, z); };
    drum(0, 0, Wd * 0.2, H * 1.1);
    if (big || r() < 0.6) for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) drum(a * Wd * 0.32, b * Wd * 0.32, Wd * 0.12, H * 1.1);
  }
  const bt = Wd * 0.32, bh = H * (2 + r());
  bx(g, Wd * 0.5, H * 0.6, Wd * 0.5, wall, 0, 0, Wd * 0.75); gb(g, Wd * 0.5, H * 0.2, Wd * 0.52, roof, 0, H * 0.6, Wd * 0.75, Math.PI / 2);
  bx(g, bt, bh, bt, wall, 0, 0, Wd * 1.05);
  for (let k = 0; k < 3; k++) bx(g, bt * 1.02, bh * 0.08, bt * 1.02, '#3d3a33', 0, bh * (0.45 + k * 0.17), Wd * 1.05);
  if (greek) dm(g, bt * 0.5, roof, 0, bh, Wd * 1.05, 1, 8); else { cn(g, bt * 0.6, bh * 0.5, roof, 0, bh, Wd * 1.05, 8); on(g, bt * 0.18, domeC, 0, bh * 1.5, Wd * 1.05, 8); }
}
function churchColonial(g, ctx, big) {  // Spanish / Portuguese baroque: twin bell towers, dome, bright plaster
  const { r, pal } = ctx, wall = ctx.pick(['#f2efe8', '#f6d27a', '#e8dcc0', '#f4efe4', '#e9c9a0']), trim = ctx.pick(['#c9a87a', '#f2efe8', '#b9a07a']);
  const L = big ? 0.22 + r() * 0.06 : 0.13 + r() * 0.05, W = L * 0.38, H = L * 0.32;
  bx(g, W, H, L, wall); bx(g, W * 1.01, H * 0.04, L, trim, 0, H * 0.96, 0);
  bx(g, W * 2, H, W * 0.9, wall, 0, 0, -L * 0.2);
  cy(g, W * 0.38, H * 0.4, wall, 0, H, -L * 0.2, 12); dm(g, W * 0.38, ctx.pick(['#e8c25a', '#c0603a', '#3f8fb8', '#f2efe8']), 0, H * 1.4, -L * 0.2, 1.1, 14); cy(g, W * 0.06, W * 0.2, wall, 0, H * 1.4 + W * 0.42, -L * 0.2, 6);
  bx(g, W * 1.6, H * 1.2, 0.012, wall, 0, 0, L / 2); bx(g, W * 0.5, H * 0.35, 0.012, wall, 0, H * 1.2, L / 2); bx(g, W * 0.8, H * 0.6, 0.004, trim, 0, 0, L / 2 + 0.006);
  bx(g, W * 0.24, H * 0.42, 0.003, '#5a3a22', 0, 0, L / 2 + 0.009);
  for (const s of [-1, 1]) {
    const tw = W * 0.42, th = H * (1.9 + r() * 0.4), x = s * W * 0.7;
    bx(g, tw, th, tw, wall, x, 0, L / 2 - tw * 0.5);
    bx(g, tw * 0.8, th * 0.22, tw * 0.8, wall, x, th, L / 2 - tw * 0.5); bx(g, tw * 0.5, th * 0.12, tw * 0.81, '#3d3a33', x, th * 1.04, L / 2 - tw * 0.5);
    dm(g, tw * 0.42, ctx.pick(['#e8c25a', '#c0603a', '#f2efe8', '#3f8fb8']), x, th * 1.22, L / 2 - tw * 0.5, 1.2, 10); cy(g, tw * 0.05, tw * 0.6, '#3d3a33', x, th * 1.22 + tw * 0.48, L / 2 - tw * 0.5, 4);
  }
}
function churchNordic(g, ctx) {  // white or red timber church with a steep tall spire, or a stave church
  const { r } = ctx;
  if (ctx.p.k === 'Norway' && r() < 0.35) {   // stave church: stacked steep dark roofs with dragon gables
    const D = '#4a3424';
    for (let i = 0; i < 4; i++) { const w = 0.08 - i * 0.016, h = 0.03; bx(g, w, h, w * 1.3, D, 0, i * 0.03); gb(g, w * 1.3, 0.028, w * 1.05, '#3a2a1a', 0, i * 0.03 + h * 0.7, 0, Math.PI / 2); }
    cn(g, 0.012, 0.06, '#3a2a1a', 0, 0.12, 0, 6);
    return;
  }
  const wall = ctx.pick(['#f4f2ec', '#b8312a', '#f2efe8', '#e8c25a']), roof = ctx.pick(['#3e4a52', '#2f3a40', '#5a3a2a']);
  const L = 0.12 + r() * 0.04, W = L * 0.42, H = L * 0.35;
  bx(g, W, H, L, wall); gb(g, L, H * 0.9, W * 1.08, roof, 0, H, 0, Math.PI / 2);
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) bx(g, 0.002, H * 0.45, 0.008, '#4d5866', s * (W / 2 + 0.001), H * 0.3, -L * 0.3 + i * L * 0.2);
  const tw = W * 0.55, th = H * 1.8; bx(g, tw, th, tw, wall, 0, 0, L / 2); cn(g, tw * 0.72, th * 1.4, roof, 0, th, L / 2, 4, Math.PI / 4);
}
function church(g, ctx) {
  const n = ctx.p.n.toLowerCase(), big = /cathedral|basilica|duomo|catedral|kathedrale|minster|notre-dame|sobor|dom\b/.test(n) || ctx.p.l > 60;
  const reg = ctx.reg;
  if (/monaster|abbey|lavra|kloster|priory|convent/.test(n)) return monastery(g, ctx);
  if (/pantheon|rotunda/.test(n)) { mausoleumClassical(g, ctx); quarter(g, ctx, 18, 0.18, 0.34); return; }
  if (reg === 'orth' || reg === 'persian' && ctx.p.k === 'Armenia') churchOrthodox(g, ctx, big);
  else if (reg === 'latam' || reg === 'isea' && ctx.p.k === 'Philippines' || reg === 'lanka') churchColonial(g, ctx, big);
  else if (['arab', 'ottoman', 'persian', 'africa', 'sahel', 'india', 'nepal'].includes(reg)) (p => /armenia|georgia|ethiopia|eritrea|egypt/i.test(p.k) ? churchOrthodox : churchRomanesque)(ctx.p)(g, ctx, big);
  else if (reg === 'med') (big || ctx.r() < 0.5 ? churchRomanesque : ctx.p.k === 'Spain' || ctx.p.k === 'Portugal' ? churchColonial : churchRomanesque)(g, ctx, big);
  else if (reg === 'nordic') big ? churchGothic(g, ctx, big) : churchNordic(g, ctx);
  else if (big) churchGothic(g, ctx, big);
  else churchSmall(g, ctx);
  quarter(g, ctx, 14, 0.2, 0.33);
  trees(g, ctx, 6, 0.16, 0.3);
}
function monastery(g, ctx) {
  const { r, pal } = ctx, wall = ctx.reg === 'orth' ? '#f2efe8' : ctx.pick([pal.st, '#e8dcc0', '#d9cfbb']), roof = ctx.pick(pal.roof);
  const sz = 0.2 + r() * 0.06;
  for (const [w, d, x, z] of [[sz, 0.03, 0, sz / 2], [sz, 0.03, 0, -sz / 2], [0.03, sz, sz / 2, 0], [0.03, sz, -sz / 2, 0]]) { bx(g, w, 0.035, d, wall, x, 0, z); gb(g, Math.max(w, d), 0.02, Math.min(w, d) * 1.1, roof, x, 0.035, z, w > d ? 0 : Math.PI / 2); }
  bx(g, sz * 0.9, 0.002, sz * 0.9, '#7fbf5a', 0, 0, 0); cy(g, 0.008, 0.008, '#d9cfbb', 0, 0, 0, 8);   // cloister garden and well
  const c = N(g, 0, 0, -sz * 0.05, 0, 0.75); (ctx.reg === 'orth' ? churchOrthodox : ctx.reg === 'med' ? churchRomanesque : churchSmall)(c, ctx, false);
  if (ctx.reg === 'orth') for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { cy(g, 0.016, 0.06, wall, x * sz / 2, 0, z * sz / 2, 8); cn(g, 0.019, 0.04, roof, x * sz / 2, 0.06, z * sz / 2, 8); }
  trees(g, ctx, 10, sz * 0.75, 0.33);
}

// ---------------------------------------------------------------- mosques
function minaret(g, rr, h, c, x, z, style, cap) {
  if (style === 'ottoman') { cy(g, rr * 0.8, h, c, x, 0, z, 10, 0.85); for (const t of [0.55, 0.78]) cy(g, rr * 1.4, rr * 0.5, c, x, h * t, z, 10); cn(g, rr * 0.85, h * 0.28, cap || '#7d8a8c', x, h, z, 10); }
  else if (style === 'maghreb') { bx(g, rr * 2.2, h, rr * 2.2, c, x, 0, z); bx(g, rr * 2.3, h * 0.05, rr * 2.3, '#3f8f5a', x, h * 0.78, z); bx(g, rr * 1.2, h * 0.16, rr * 1.2, c, x, h, z); dm(g, rr * 0.6, '#3f8f5a', x, h * 1.16, z, 1.2, 8); }
  else if (style === 'persian') { cy(g, rr, h, c, x, 0, z, 12, 0.85); for (let k = 0; k < 4; k++) cy(g, rr * 1.02, h * 0.03, '#2fa0b8', x, h * (0.3 + k * 0.18), z, 12); cy(g, rr * 1.4, rr * 0.8, c, x, h, z, 12); dm(g, rr * 0.8, cap || '#2fa0b8', x, h + rr * 0.8, z, 1.2, 8); }
  else if (style === 'mughal') { cy(g, rr, h, c, x, 0, z, 12, 0.8); for (const t of [0.4, 0.7]) cy(g, rr * 1.45, rr * 0.4, c, x, h * t, z, 12); for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) cy(g, rr * 0.12, rr * 1.4, c, x + a * rr * 0.7, h, z + b * rr * 0.7, 4); dm(g, rr * 1.0, cap || c, x, h + rr * 1.4, z, 1.1, 10); }
  else { cy(g, rr, h, c, x, 0, z, 8, 0.9); cy(g, rr * 1.4, rr * 0.5, c, x, h * 0.75, z, 8); on(g, rr * 0.9, cap || c, x, h, z, 8); }
}
function mosque(g, ctx) {
  const { r, reg, pal } = ctx;
  const n = ctx.p.n.toLowerCase(), big = /grand|great|jama|jami|national|imperial|sultan|shah|imam|central|king|blue/.test(n) || ctx.p.l > 50;
  const sz = big ? 0.22 + r() * 0.06 : 0.13 + r() * 0.04;
  if (reg === 'sahel') {  // Sudano-Sahelian mud mosque (Djenné): buttressed adobe walls, towers with torons
    const M = ctx.pick(['#b9824f', '#a8703f', '#c4935f']);
    bx(g, sz, sz * 0.25, sz * 0.8, M); bx(g, sz * 1.02, 0.01, sz * 0.82, '#a06a3a', 0, sz * 0.25);
    for (let i = 0; i < 3; i++) { const x = (i - 1) * sz * 0.35; bx(g, sz * 0.12, sz * 0.5, sz * 0.12, M, x, 0, sz * 0.41); cn(g, sz * 0.05, sz * 0.12, M, x, sz * 0.5, sz * 0.41, 4); for (let k = 0; k < 4; k++) bx(g, sz * 0.2, 0.002, 0.002, '#7a5a3a', x, sz * (0.12 + k * 0.1), sz * 0.47); }
    for (let i = 0; i < 9; i++) for (const s of [-1, 1]) cn(g, sz * 0.025, sz * 0.32, M, -sz * 0.45 + i * sz * 0.11, 0, s * sz * 0.4, 4);
    quarter(g, ctx, 18, sz * 0.9, 0.34); return;
  }
  if (reg === 'china' || reg === 'sea') { // Chinese-style mosque: halls with a pagoda-like minaret
    hallCN(g, ctx, sz * 0.9, sz * 0.6, sz * 0.25, 0, -sz * 0.1, '#3f6f5a', true);
    const t = N(g, sz * 0.55, 0, sz * 0.35); for (let i = 0; i < 3; i++) { bx(t, 0.03 - i * 0.006, 0.03, 0.03 - i * 0.006, '#b8312a', 0, i * 0.035); hp(t, 0.05 - i * 0.008, 0.012, 0.05 - i * 0.008, '#3f6f5a', 0, i * 0.035 + 0.026); }
    quarter(g, ctx, 14, 0.2, 0.33); return;
  }
  if (reg === 'isea') { // Javanese tiered-roof mosque with Middle-Eastern dome additions
    const W = '#f2efe8', roof = ctx.pick(['#3f6f5a', '#5a3a2a', '#2f5d8a']);
    bx(g, sz, sz * 0.2, sz, W); for (let i = 0; i < 3; i++) hp(g, sz * (1.2 - i * 0.35), sz * 0.18, sz * (1.2 - i * 0.35), roof, 0, sz * 0.2 + i * sz * 0.14);
    if (r() < 0.6) { dm(g, sz * 0.25, '#e0c062', 0, sz * 0.62, 0, 1.2, 12); minaret(g, sz * 0.05, sz * 1.4, W, sz * 0.7, sz * 0.4, 'generic', '#e0c062'); }
    trees(g, ctx, 10, sz, 0.33); quarter(g, ctx, 10, sz * 1.1, 0.34); return;
  }
  if (reg === 'india') {  // Mughal: red sandstone court, prayer hall with three white bulbous domes, two minarets
    const Rd = ctx.pick(['#b9573f', '#c0603a', '#f2efe8']), Wt = '#f4f1ea';
    bx(g, sz * 1.6, 0.02, sz * 1.2, Rd); bx(g, sz * 1.5, 0.002, sz, '#d9cfbb', 0, 0.02, sz * 0.05);
    bx(g, sz * 1.2, sz * 0.3, sz * 0.3, Rd, 0, 0.02, -sz * 0.4); bx(g, sz * 0.32, sz * 0.42, sz * 0.32, Rd, 0, 0.02, -sz * 0.38);
    for (let i = 0; i < 5; i++) bx(g, sz * 0.12, sz * 0.2, 0.003, '#5a2a1a', -sz * 0.45 + i * sz * 0.22, 0.02, -sz * 0.25);
    for (const [x, rr] of [[0, 0.17], [-0.36, 0.12], [0.36, 0.12]]) { cy(g, sz * rr * 0.8, sz * 0.08, Wt, x * sz, sz * 0.32, -sz * 0.42, 14); on(g, sz * rr, Wt, x * sz, sz * 0.4, -sz * 0.42, 14); }
    for (const s of [-1, 1]) minaret(g, sz * 0.05, sz * 0.9, Rd, s * sz * 0.7, -sz * 0.45, 'mughal', Wt);
    if (big) for (const s of [-1, 1]) minaret(g, sz * 0.04, sz * 0.5, Rd, s * sz * 0.78, sz * 0.55, 'mughal', Wt);
    bx(g, sz * 0.3, sz * 0.3, sz * 0.1, Rd, 0, 0.02, sz * 0.6);
    quarter(g, ctx, 16, sz * 1.1, 0.34); return;
  }
  const style = reg === 'ottoman' || reg === 'orth' || reg === 'central' || reg === 'med' && r() < 0.5 ? 'ottoman' : reg === 'persian' ? 'persian' : ['Morocco', 'Algeria', 'Tunisia', 'Libya', 'Mauritania', 'Spain'].includes(ctx.p.k) ? 'maghreb' : 'arab';
  const W = style === 'persian' ? ctx.pick(['#d9c3a0', '#e2d0ae']) : style === 'ottoman' ? ctx.pick(['#e8e2d6', '#d9d2c4', '#f2efe8']) : ctx.pick(['#f4efe4', '#efe2c8', '#f2efe8', '#e2cfa8']);
  const domeC = style === 'ottoman' ? '#7d8a8c' : style === 'persian' ? ctx.pick(['#2fa0b8', '#2f8fb0', '#3fb0c0']) : ctx.pick(['#3f8f5a', '#f4efe4', '#e0c062', '#3b8fd0', '#f4efe4']);
  if (style === 'ottoman') {  // cascade of domes and semi-domes, slender pencil minarets
    bx(g, sz, sz * 0.32, sz, W); cy(g, sz * 0.42, sz * 0.1, W, 0, sz * 0.32, 0, 20); dm(g, sz * 0.42, domeC, 0, sz * 0.42, 0, 0.7, 20);
    for (const [x, z] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) dm(g, sz * 0.26, domeC, x * sz * 0.34, sz * 0.32, z * sz * 0.34, 0.65, 12);
    for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) dm(g, sz * 0.12, domeC, x * sz * 0.38, sz * 0.32, z * sz * 0.38, 0.7, 10);
    bx(g, sz, sz * 0.18, sz * 0.7, W, 0, 0, sz * 0.85); for (let i = 0; i < 5; i++) for (let k = 0; k < 3; k++) dm(g, sz * 0.07, domeC, -sz * 0.4 + i * sz * 0.2, sz * 0.18, sz * (0.6 + k * 0.22), 0.7, 8); // domed courtyard arcade
    const nm = big ? (r() < 0.3 ? 6 : 4) : r() < 0.5 ? 2 : 1;
    const spots = [[1, 1.22], [-1, 1.22], [1, -0.55], [-1, -0.55], [1, 0.4], [-1, 0.4]];
    for (let i = 0; i < nm; i++) minaret(g, sz * 0.035, sz * (1.15 + r() * 0.2), W, spots[i][0] * sz * 0.55, spots[i][1] * sz, 'ottoman');
  } else if (style === 'persian') {  // four-iwan court, tiled turquoise dome on a tall drum, iwan portal flanked by minarets
    bx(g, sz * 1.5, sz * 0.18, sz * 1.5, W, 0, 0, sz * 0.2); bx(g, sz * 1.2, 0.003, sz * 1.2, '#4ea3d6', 0, 0.002, sz * 0.2); bx(g, sz * 0.3, 0.004, sz * 0.3, '#4ea3d6', 0, sz * 0.18, sz * 0.2);
    bx(g, sz * 1.2, 0.004, sz * 1.2, '#d9cfbb', 0, sz * 0.18, sz * 0.2);
    for (const [x, z, ry] of [[0, -0.55, 0], [0, 0.95, 0], [0.75, 0.2, Math.PI / 2], [-0.75, 0.2, Math.PI / 2]]) { const iw = N(g, x * sz, 0, z * sz, ry); bx(iw, sz * 0.36, sz * 0.4, sz * 0.12, W); bx(iw, sz * 0.2, sz * 0.32, 0.004, '#2f6f9a', 0, 0.002, sz * 0.061); bx(iw, sz * 0.36, sz * 0.03, sz * 0.122, '#2fa0b8', 0, sz * 0.37); }
    cy(g, sz * 0.24, sz * 0.32, ctx.pick(['#2fa0b8', W]), 0, sz * 0.18, -sz * 0.75, 16); on(g, sz * 0.26, domeC, 0, sz * 0.5, -sz * 0.75, 18);
    for (const s of [-1, 1]) minaret(g, sz * 0.04, sz * (0.8 + r() * 0.3), W, s * sz * 0.17, -sz * 0.5, 'persian', domeC);
  } else if (style === 'maghreb') {  // flat hypostyle prayer hall with green-tiled roofs and a square minaret
    bx(g, sz * 1.3, sz * 0.14, sz, W); for (let i = 0; i < 5; i++) gb(g, sz * 1.3, sz * 0.06, sz * 0.2, '#3f8f5a', 0, sz * 0.14, -sz * 0.4 + i * sz * 0.2);
    bx(g, sz * 1.3, 0.003, sz * 0.6, '#efe9de', 0, 0.002, sz * 0.8); cy(g, sz * 0.05, sz * 0.03, '#efe9de', 0, 0, sz * 0.8, 12);
    minaret(g, sz * 0.07, sz * (0.9 + r() * 0.5), ctx.pick([W, '#d9b48a', '#e2cfa8']), sz * 0.55, sz * 0.95, 'maghreb');
  } else {  // Arab: prayer hall, central dome, courtyard, 1–4 minarets
    bx(g, sz, sz * 0.3, sz * 0.8, W); for (let i = 0; i < 6; i++) bx(g, sz * 0.08, sz * 0.15, 0.003, '#4d5866', -sz * 0.4 + i * sz * 0.16, 0.0, sz * 0.401);
    cy(g, sz * 0.25, sz * 0.12, W, 0, sz * 0.3, 0, 16); (r() < 0.5 ? on : dm)(g, sz * 0.27, domeC, 0, sz * 0.42, 0, 1.0, 16);
    bx(g, sz, sz * 0.12, sz * 0.7, W, 0, 0, sz * 0.75); bx(g, sz * 0.8, 0.004, sz * 0.5, '#efe9de', 0, sz * 0.12, sz * 0.75);
    const nm = big ? 4 : 1 + Math.floor(r() * 2);
    const spots = [[0.5, 1.1], [-0.5, 1.1], [0.5, -0.4], [-0.5, -0.4]];
    for (let i = 0; i < nm; i++) minaret(g, sz * 0.045, sz * (0.95 + r() * 0.4), W, spots[i][0] * sz, spots[i][1] * sz, 'generic', domeC);
  }
  quarter(g, ctx, 16, sz * 1.15, 0.34);
  if (reg === 'arab' || reg === 'persian') for (let i = 0; i < 4; i++) palm(g, (ctx.r() - 0.5) * sz * 1.2, sz * 0.75 + (ctx.r() - 0.5) * sz * 0.4, 1.4);
}

// ---------------------------------------------------------------- temples
function hallCN(g, ctx, w, d, h, x, z, roof, dbl, ry = 0) {
  const n = N(g, x, 0, z, ry);
  bx(n, w * 1.18, h * 0.22, d * 1.25, '#efe9de');
  for (let i = 0; i < 3; i++) bx(n, w * 0.4, h * 0.03, 0.02, '#e8e3d6', 0, i * h * 0.07, d * 0.62 + 0.012 + (2 - i) * 0.008);
  bx(n, w, h * 0.55, d, ctx.reg === 'japan' ? '#6b4a32' : '#b8312a', 0, h * 0.22);
  for (let i = 0; i < 7; i++) bx(n, 0.003, h * 0.55, 0.003, ctx.reg === 'japan' ? '#3a2a1a' : '#8a2420', -w / 2 + (i + 0.5) * (w / 7), h * 0.22, d / 2 + 0.002);
  hp(n, w * 1.35, h * 0.48, d * 1.45, roof, 0, h * 0.77);
  if (dbl) { bx(n, w * 0.7, h * 0.2, d * 0.7, ctx.reg === 'japan' ? '#6b4a32' : '#b8312a', 0, h * 0.98); hp(n, w * 1.0, h * 0.4, d * 1.08, roof, 0, h * 1.12); }
  return n;
}
function pagodaTower(g, ctx, x, z, tiers, base, c, roof) {
  const n = N(g, x, 0, z);
  bx(n, base * 1.3, base * 0.2, base * 1.3, '#d9d2c4');
  let y = base * 0.2;
  for (let i = 0; i < tiers; i++) { const w = base * (1 - i * 0.6 / tiers), h = base * 0.55; bx(n, w, h, w, c, 0, y); hp(n, w * 1.6, h * 0.35, w * 1.6, roof, 0, y + h * 0.85); y += h * 1.05; }
  cy(n, base * 0.04, base * 1.2, '#c9a24a', 0, y, 0, 6); for (let k = 0; k < 5; k++) cy(n, base * 0.1, base * 0.02, '#c9a24a', 0, y + base * (0.2 + k * 0.15), 0, 8);
  return n;
}
function templeDravidian(g, ctx, big) {
  const { r } = ctx, st = ctx.pick(['#d7b98a', '#c9a87a', '#b9a07a', '#e2c8a0']), painted = r() < 0.55;
  const COL = ['#e2533a', '#3b8fd0', '#f6c445', '#2fa65a', '#d05ac9', '#ffffff', '#f08a3a'];
  const gop = (x, z, ry, h, w) => {
    const n = N(g, x, 0, z, ry); bx(n, w, h * 0.14, w * 0.6, '#cdbd9f');
    for (let i = 0; i < 8; i++) { const t = i / 8, ww = w * (1 - t * 0.6), dd = w * 0.6 * (1 - t * 0.5), y = h * 0.14 + t * h * 0.74; bx(n, ww, h * 0.09, dd, st, 0, y); if (painted) for (let k = 0; k < 5; k++) bx(n, ww / 7, h * 0.06, 0.003, COL[(i * 3 + k + ctx.seed) % COL.length], (k - 2) * (ww / 5.5), y + h * 0.015, dd / 2 + 0.001); }
    const top = P(n, UC(8), st, 0, h * 0.88, 0, w * 0.12, w * 0.32, w * 0.12); top.rotation.z = Math.PI / 2; top.position.set(-w * 0.16, h * 0.93, 0);
    for (let k = -1; k <= 1; k++) cn(n, w * 0.03, w * 0.1, '#e8b93a', k * w * 0.1, h * 0.98, 0, 5);
    bx(n, w * 0.2, h * 0.12, 0.003, '#3a2a1a', 0, 0, w * 0.3 + 0.001);
  };
  const S = big ? 0.3 : 0.2;
  bx(g, S * 1.6, 0.025, S * 1.6, '#cfc0a0', 0, 0, 0); bx(g, S * 1.5, 0.002, S * 1.5, '#e2d8c4', 0, 0.025, 0);
  gop(0, S * 0.78, 0, S * (big ? 1.25 : 0.9), S * 0.32); if (big) { gop(0, -S * 0.78, Math.PI, S * 1.1, S * 0.3); gop(S * 0.78, 0, Math.PI / 2, S, S * 0.28); gop(-S * 0.78, 0, -Math.PI / 2, S * 1.05, S * 0.28); }
  // the vimana over the sanctum
  const v = N(g, 0, 0.025, -S * 0.1); bx(v, S * 0.3, S * 0.18, S * 0.3, st); for (let i = 0; i < 4; i++) bx(v, S * (0.26 - i * 0.05), S * 0.06, S * (0.26 - i * 0.05), st, 0, S * 0.18 + i * S * 0.06);
  dm(v, S * 0.07, ctx.r() < 0.4 ? '#e8b93a' : st, 0, S * 0.42, 0, 1.2, 10); cn(v, S * 0.015, S * 0.06, '#e8b93a', 0, S * 0.5, 0, 5);
  bx(g, S * 0.6, S * 0.12, S * 0.25, '#cdbd9f', 0, 0.025, S * 0.25);  // mandapa
  if (r() < 0.5) { bx(g, S * 0.4, 0.004, S * 0.3, '#4ea3d6', S * 0.4, 0.025, -S * 0.4); }  // temple tank
  quarter(g, ctx, 12, S * 1.15, 0.34); trees(g, ctx, 6, S, 0.33);
}
function templeNagara(g, ctx, big) {  // North Indian: curvilinear shikhara over the sanctum, mandapas in front, often white/orange
  const { r } = ctx, st = ctx.pick(['#f2efe8', '#e8c99a', '#d7a06a', '#c9a87a', '#f4d8b0', '#e9b0a0']);
  const S = big ? 0.26 : 0.18;
  bx(g, S * 1.2, S * 0.08, S * 0.8, ctx.pick(['#e2d8c4', '#d9cfbb']));
  const shik = (x, z, h, w) => { P(g, UO(10), st, x, S * 0.08, z, w, h / 1.7, w); for (let k = 0; k < 6; k++) cy(g, w * (1.02 - k * 0.12), h * 0.012, '#c9a87a', x, S * 0.08 + h * (0.12 + k * 0.13), z, 10); cy(g, w * 0.28, w * 0.14, st, x, S * 0.08 + h, z, 10); cn(g, w * 0.08, w * 0.4, '#e8b93a', x, S * 0.08 + h + w * 0.14, z, 6); bx(g, 0.001, w * 0.3, w * 0.25, '#f08a3a', x + w * 0.04, S * 0.08 + h + w * 0.5, z); };
  shik(0, -S * 0.15, S * (1.1 + r() * 0.5), S * 0.2);
  for (const s of [-1, 1]) if (r() < 0.6) shik(s * S * 0.18, -S * 0.15, S * 0.6, S * 0.1);
  bx(g, S * 0.32, S * 0.14, S * 0.3, st, 0, S * 0.08, S * 0.12); hp(g, S * 0.36, S * 0.2, S * 0.34, st, 0, S * 0.22, S * 0.12);
  bx(g, S * 0.3, S * 0.12, S * 0.2, st, 0, S * 0.08, S * 0.33); dm(g, S * 0.1, st, 0, S * 0.2, S * 0.33, 1.1, 10);
  for (let i = 0; i < 4; i++) cy(g, 0.003, S * 0.12, '#f2efe8', -S * 0.12 + i * S * 0.08, S * 0.08, S * 0.44, 6);
  quarter(g, ctx, 14, S * 0.9, 0.34); trees(g, ctx, 5, S, 0.33);
}
function templeNepal(g, ctx) {  // Newar multi-roofed pagoda temple on a stepped plinth, brick and carved wood
  const { r } = ctx, br = '#a85a3a', wd = '#4a3424', roof = ctx.pick(['#5a3a2a', '#6b4a2a', '#c9a24a']);
  for (let i = 0; i < 5; i++) bx(g, 0.18 - i * 0.025, 0.012, 0.18 - i * 0.025, '#b9a07a', 0, i * 0.012);
  let y = 0.06; const tiers = 2 + Math.floor(r() * 3);
  for (let i = 0; i < tiers; i++) { const w = 0.07 - i * 0.012; bx(g, w, 0.03, w, i ? wd : br, 0, y); hp(g, w * 1.8, 0.022, w * 1.8, roof, 0, y + 0.03); y += 0.05; }
  cn(g, 0.008, 0.03, '#e0c062', 0, y - 0.01, 0, 6);
  if (r() < 0.5) { dm(g, 0.06, '#f4f1ea', 0.25, 0, 0.1, 0.9, 14); bx(g, 0.03, 0.03, 0.03, '#e0c062', 0.25, 0.054, 0.1); for (let i = 0; i < 5; i++) cy(g, 0.016 - i * 0.003, 0.012, '#e0c062', 0.25, 0.084 + i * 0.012, 0.1, 8); } // Swayambhu-style stupa
  quarter(g, ctx, 18, 0.15, 0.34);
}
function templeThai(g, ctx) {  // wat: ubosot with stacked steep orange & green roofs and chofa finials, gilded chedi
  const { r } = ctx, roof = ctx.pick(['#d6603a', '#c0503a']), edge = ctx.pick(['#2f7a5a', '#2f5d8a']), W = '#f2efe8', Gd = '#e8b93a';
  bx(g, 0.1, 0.05, 0.18, W, 0, 0, 0); for (let i = 0; i < 3; i++) { gb(g, 0.2 - i * 0.03, 0.05, 0.12 - i * 0.015, i % 2 ? edge : roof, 0, 0.05 + i * 0.022, 0, Math.PI / 2); }
  for (const s of [-1, 1]) cn(g, 0.003, 0.02, Gd, 0, 0.12, s * 0.09, 4);
  bx(g, 0.04, 0.03, 0.004, Gd, 0, 0.0, 0.091);
  const cx = 0.17, style = r();
  if (ctx.p.k === 'Cambodia' || style < 0.25) { const n = N(g, cx, 0, -0.05); for (let i = 0; i < 6; i++) cy(n, 0.04 * (1 - i * 0.13), 0.03, '#9c8f78', 0, i * 0.03, 0, 8, 0.85); cn(n, 0.012, 0.04, '#9c8f78', 0, 0.18, 0, 8); } // Khmer prang
  else { for (let i = 0; i < 3; i++) bx(g, 0.1 - i * 0.025, 0.015, 0.1 - i * 0.025, Gd, cx, i * 0.015, -0.05); P(g, UO(14), Gd, cx, 0.045, -0.05, 0.035, 0.03, 0.035); cn(g, 0.012, 0.12, Gd, cx, 0.09, -0.05, 12); } // bell chedi
  for (let i = 0; i < 4; i++) cn(g, 0.01, 0.06, Gd, -0.15, 0, -0.12 + i * 0.07, 8);
  bx(g, 0.34, 0.012, 0.012, W, 0, 0, 0.2); bx(g, 0.34, 0.012, 0.012, W, 0, 0, -0.2);
  trees(g, ctx, 10, 0.24, 0.34); quarter(g, ctx, 8, 0.25, 0.34);
}
function templeChina(g, ctx) {  // axial courtyards of halls, a gate, a drum and bell tower, sometimes a pagoda
  const { r } = ctx, roof = ctx.reg === 'japan' ? ctx.pick(['#3e4650', '#4a5560']) : ctx.pick(['#e8b93a', '#3f6f5a', '#4a4f55', '#3f6f5a']);
  bx(g, 0.34, 0.002, 0.5, '#e2d8c4', 0, 0, 0);
  hallCN(g, ctx, 0.1, 0.05, 0.05, 0, 0.2, roof, false);
  hallCN(g, ctx, 0.16, 0.08, 0.075, 0, 0.02, roof, r() < 0.6);
  hallCN(g, ctx, 0.14, 0.07, 0.07, 0, -0.16, roof, false);
  for (const s of [-1, 1]) { hallCN(g, ctx, 0.04, 0.12, 0.045, s * 0.13, 0.03, roof, false); hallCN(g, ctx, 0.03, 0.03, 0.05, s * 0.07, 0.13, roof, true); }
  if (r() < 0.5) pagodaTower(g, ctx, ctx.reg === 'japan' ? 0.12 : 0.0, ctx.reg === 'japan' ? 0.2 : -0.3, ctx.reg === 'japan' ? 5 : 7, 0.035, ctx.reg === 'japan' ? '#b8312a' : ctx.pick(['#d9cfbb', '#b8312a']), roof);
  if (ctx.reg === 'japan') { torii(g, 0, 0.3, 0.06); }
  trees(g, ctx, 12, 0.25, 0.34, 1.2);
}
function torii(g, x, z, s, c = '#d6453a') { for (const k of [-1, 1]) cy(g, s * 0.05, s, c, x + k * s * 0.4, 0, z, 8); bx(g, s * 1.15, s * 0.07, s * 0.08, '#2a2a2a', x, s * 0.96, z); bx(g, s * 0.95, s * 0.05, s * 0.06, c, x, s * 0.8, z); }
function shrine(g, ctx) {
  if (ctx.reg !== 'japan') return templeChina(g, ctx);
  const { r } = ctx, roof = ctx.pick(['#4a3a2a', '#3e4650', '#5f8f7a']), red = r() < 0.6;
  for (let i = 0; i < (r() < 0.25 ? 9 : 2); i++) torii(g, 0, 0.32 - i * 0.03, 0.05, red ? '#d6453a' : '#8a7a62');  // torii gates (rows like Fushimi Inari)
  bx(g, 0.012, 0.002, 0.25, '#d9cfbb', 0, 0, 0.18);
  const h = N(g, 0, 0, -0.05); bx(h, 0.12, 0.012, 0.09, '#d9cfbb'); bx(h, 0.1, 0.035, 0.07, red ? '#d6453a' : '#e8dcc8', 0, 0.012); gb(h, 0.14, 0.05, 0.1, roof, 0, 0.047);
  for (const k of [-1, 1]) { bx(h, 0.003, 0.012, 0.03, '#d9b24a', k * 0.03, 0.095, 0, 0); }   // chigi crossed finials
  bx(g, 0.08, 0.025, 0.05, red ? '#d6453a' : '#e8dcc8', 0, 0, 0.08); gb(g, 0.1, 0.03, 0.065, roof, 0, 0.025, 0.08);
  for (const k of [-1, 1]) cy(g, 0.006, 0.02, '#a8a090', k * 0.05, 0, 0.16, 6);                 // stone lanterns
  trees(g, ctx, 18, 0.18, 0.34, 1.3);
}
function templeClassical(g, ctx) {  // Greek / Roman temple: stylobate, peristyle of columns, pediments (ruined or whole)
  const { r } = ctx, M = ctx.pick(['#e8dfcc', '#d9cfb9', '#cfc3a8', '#e2d6bc']), ruined = r() < 0.6;
  const L = 0.16 + r() * 0.06, W = L * 0.45, H = L * 0.3;
  for (let i = 0; i < 3; i++) bx(g, L + 0.02 - i * 0.008, 0.005, W + 0.02 - i * 0.008, '#cfc3a8', 0, i * 0.005, 0, Math.PI / 2);
  const nf = 6, ns = 11;
  for (let i = 0; i < ns; i++) for (const s of [-1, 1]) if (!ruined || r() < 0.65) cy(g, 0.0045, H * (ruined && r() < 0.3 ? r() * 0.8 + 0.1 : 1), M, s * W / 2, 0.015, -L / 2 + (i / (ns - 1)) * L, 8);
  for (let i = 1; i < nf - 1; i++) for (const s of [-1, 1]) if (!ruined || r() < 0.7) cy(g, 0.0045, H, M, -W / 2 + (i / (nf - 1)) * W, 0.015, s * L / 2, 8);
  if (!ruined || r() < 0.4) { bx(g, W + 0.008, H * 0.12, L + 0.008, M, 0, 0.015 + H); gb(g, L + 0.01, H * 0.25, W + 0.012, ctx.reg === 'med' ? '#c0603a' : M, 0, 0.015 + H * 1.12, 0, Math.PI / 2); }
  else { bx(g, W + 0.008, H * 0.12, L * 0.4, M, 0, 0.015 + H, L * 0.3); for (let i = 0; i < 6; i++) bx(g, 0.012, 0.006, 0.01, M, (r() - 0.5) * 0.3, 0, (r() - 0.5) * 0.3, r() * 3); }
}
function stupaLanka(g, ctx) {  // whitewashed bell-shaped dagoba with a square harmika and spire
  const { r } = ctx, s = 0.1 + r() * 0.06, W = r() < 0.75 ? '#f4f2ec' : '#c0503a';
  for (let i = 0; i < 3; i++) cy(g, s * (1.15 - i * 0.07), s * 0.06, '#e8e3d6', 0, i * s * 0.06, 0, 20);
  dm(g, s, W, 0, s * 0.18, 0, 1.05, 20); bx(g, s * 0.3, s * 0.18, s * 0.3, W, 0, s * 1.2); cn(g, s * 0.12, s * 0.8, ctx.pick([W, '#e8b93a']), 0, s * 1.38, 0, 10);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; bx(g, s * 0.25, s * 0.12, s * 0.12, '#e8e3d6', Math.cos(a) * s * 1.22, 0, Math.sin(a) * s * 1.22, -a); }
  trees(g, ctx, 10, s * 1.6, 0.34);
}
function templeMeso(g, ctx) {  // Maya / Aztec stepped pyramid with a temple on top
  const { r } = ctx, st = ctx.pick(['#b9b09a', '#a89f88', '#c9bfa8']), tiers = 4 + Math.floor(r() * 5), base = 0.16 + r() * 0.08, steep = 0.6 + r() * 0.5;
  for (let i = 0; i < tiers; i++) { const w = base * (1 - i / (tiers + 2)); bx(g, w, base * 0.06 * steep, w, i % 2 ? '#a89f88' : st, 0, i * base * 0.06 * steep); }
  const top = tiers * base * 0.06 * steep; bx(g, base * 0.12, top, base * 0.2, '#9a917c', 0, 0, base * 0.42 - (base * 0.2) / 2);
  bx(g, base * 0.3, base * 0.12, base * 0.24, st, 0, top); bx(g, base * 0.3, base * 0.07, base * 0.06, '#9a917c', 0, top + base * 0.12, -base * 0.06);
  bx(g, base * 0.08, base * 0.08, 0.003, '#3d3a33', 0, top, base * 0.121);
  for (let i = 0; i < 4; i++) { const ruin = N(g, (r() - 0.5) * 0.5, 0, (r() - 0.5) * 0.5 + (i % 2 ? 0.25 : -0.25)); for (let k = 0; k < 3; k++) bx(ruin, 0.06 - k * 0.015, 0.012, 0.05 - k * 0.012, st, 0, k * 0.012); }
  trees(g, ctx, 22, base * 0.9, 0.34, 1.6);
}
function temple(g, ctx) {
  const { reg, p } = ctx, n = p.n.toLowerCase(), big = p.l > 50 || /great|grand|maha|sri |golden/.test(n);
  if (/greek|roman|apollo|zeus|athena|hera|jupiter|poseidon|artemis|concordia|vesta|hephaest|temple of [a-z]+ \(|valley of the temples/.test(n) || reg === 'med' || reg === 'orth' && p.k === 'Greece' || reg === 'ottoman' || p.k === 'Lebanon' || p.k === 'Libya' || p.k === 'Jordan' || p.k === 'Syria') return templeClassical(g, ctx);
  if (p.k === 'Egypt' || p.k === 'Sudan') return ruinsEgypt(g, ctx);
  if (reg === 'india') return p.lat < 17 || /meenakshi|ranganatha|brihadeeswara|kovil|swami|ramanatha|padmanabha/.test(n) ? templeDravidian(g, ctx, big) : templeNagara(g, ctx, big);
  if (reg === 'nepal') return templeNepal(g, ctx);
  if (reg === 'lanka') return ctx.r() < 0.5 ? stupaLanka(g, ctx) : templeDravidian(g, ctx, big);
  if (reg === 'sea') return templeThai(g, ctx);
  if (reg === 'isea') return p.k === 'Indonesia' && /candi|prambanan|borobudur|sewu|plaosan/.test(n) ? templeKhmerJava(g, ctx) : p.k === 'Indonesia' ? templeBali(g, ctx) : templeChina(g, ctx);
  if (reg === 'china' || reg === 'japan') return templeChina(g, ctx);
  if (reg === 'latam') return templeMeso(g, ctx);
  if (reg === 'arab') return templeClassical(g, ctx);
  // anywhere else (temples of the diaspora, Mormon temples, Masonic…): a white modern temple with spires
  const W = '#f4f2ec'; bx(g, 0.14, 0.06, 0.1, W); gb(g, 0.14, 0.03, 0.1, '#cfd6dd', 0, 0.06); for (const s of [-1, 1]) { bx(g, 0.03, 0.12, 0.03, W, s * 0.05, 0, 0.06); cn(g, 0.012, 0.06, '#e0c062', s * 0.05, 0.12, 0.06, 8); }
  trees(g, ctx, 10, 0.15, 0.32);
}
function templeKhmerJava(g, ctx) { const { r } = ctx, c = ctx.pick(['#8d8579', '#7f7769', '#9c8f78']); for (let i = 0; i < 3; i++) bx(g, 0.28 - i * 0.06, 0.02, 0.28 - i * 0.06, c, 0, i * 0.02); const pr = (x, z, h, s) => { for (let i = 0; i < 6; i++) cy(g, s * (1 - i * 0.12), h / 7, c, x, 0.06 + i * h / 7, z, 8, 0.88); cn(g, s * 0.25, h * 0.25, c, x, 0.06 + h * 0.86, z, 8); }; pr(0, 0, 0.22 + r() * 0.1, 0.04); for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) pr(a * 0.08, b * 0.08, 0.12, 0.024); for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; pr(Math.cos(a) * 0.18, Math.sin(a) * 0.18, 0.05, 0.012); } trees(g, ctx, 14, 0.26, 0.34); }
function templeBali(g, ctx) { const br = '#a85a3a', ps = '#9c9480'; for (const s of [-1, 1]) { const n = N(g, s * 0.025, 0, 0.18); for (let i = 0; i < 6; i++) bx(n, 0.03 - i * 0.004, 0.018, 0.03 - i * 0.004, i % 2 ? ps : br, 0, i * 0.018); } for (let i = 0; i < 3; i++) { const m = N(g, -0.1 + i * 0.1, 0, -0.05); bx(m, 0.03, 0.03, 0.03, ps); for (let k = 0; k < 3 + i * 2; k++) hp(m, 0.06 - k * 0.006, 0.01, 0.06 - k * 0.006, '#2a2a2a', 0, 0.03 + k * 0.014); } for (const [w, d, x, z] of [[0.36, 0.01, 0, 0.18], [0.36, 0.01, 0, -0.18], [0.01, 0.36, 0.18, 0], [0.01, 0.36, -0.18, 0]]) bx(g, w, 0.02, d, br, x, 0, z); trees(g, ctx, 16, 0.22, 0.34); }

function pagoda(g, ctx) {
  const { reg, r, p } = ctx, n = p.n.toLowerCase();
  if (reg === 'lanka' || /stupa|dagoba|chedi|zedi|paya|chorten/.test(n) || reg === 'sea' || reg === 'nepal' || reg === 'india') {
    if (reg === 'lanka' || reg === 'india') return stupaLanka(g, ctx);
    if (reg === 'nepal' || /chorten/.test(n)) return templeNepal(g, ctx);
    // Burmese / Thai golden zedi
    const Gd = ctx.pick(['#e8b93a', '#e8b93a', '#f4f2ec']); for (let i = 0; i < 4; i++) bx(g, 0.2 - i * 0.035, 0.018, 0.2 - i * 0.035, i % 2 ? '#d9a42a' : Gd, 0, i * 0.018);
    P(g, UO(16), Gd, 0, 0.072, 0, 0.06, 0.05, 0.06); cn(g, 0.025, 0.2, Gd, 0, 0.14, 0, 14); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; cn(g, 0.01, 0.05, Gd, Math.cos(a) * 0.11, 0.07, Math.sin(a) * 0.11, 8); }
    trees(g, ctx, 10, 0.2, 0.34); return;
  }
  const roof = reg === 'japan' ? ctx.pick(['#3e4650', '#4a5560']) : ctx.pick(['#3f6f5a', '#e8b93a', '#4a4f55']);
  const tiers = reg === 'japan' ? (r() < 0.7 ? 5 : 3) : 7 + Math.floor(r() * 7), c = reg === 'japan' ? ctx.pick(['#b8312a', '#6b4a32']) : ctx.pick(['#d9cfbb', '#b8312a', '#c9b89a', '#a8a090']);
  if (reg !== 'japan' && r() < 0.5) { const n2 = N(g, 0, 0, 0); for (let i = 0; i < tiers; i++) { const w = 0.07 * (1 - i * 0.045); cy(n2, w, 0.03, c, 0, i * 0.036, 0, 8); cy(n2, w * 1.4, 0.006, roof, 0, i * 0.036 + 0.03, 0, 8, 0.75); } cn(n2, 0.02, 0.05, '#c9a24a', 0, tiers * 0.036, 0, 8); } // octagonal brick pagoda
  else pagodaTower(g, ctx, 0, 0, tiers, 0.06, c, roof);
  hallCN(g, ctx, 0.1, 0.06, 0.05, 0, 0.2, roof, false);
  trees(g, ctx, 12, 0.18, 0.34, 1.2);
}

// ---------------------------------------------------------------- castles, palaces, forts
function castleEuro(g, ctx) {
  const { r, reg, pal } = ctx, st = ctx.pick(['#cfc6b4', '#bdb4a0', '#d9cfbb', '#a8a090', '#e8e3d6', '#c9b89a']), roof = ctx.pick(reg === 'central' || reg === 'nordic' ? ['#4a5a6a', '#3e4a52', '#a6402e', '#4a6fa8'] : ['#4a4f55', '#5a5f66', '#7a4a3a']);
  const fairy = (reg === 'central' || ctx.p.k === 'France') && r() < 0.5, hill = r() < 0.55;
  const y0 = hill ? 0.04 + r() * 0.05 : 0;
  if (hill) P(g, UC(9, 0.7), '#7a8a5a', 0, 0, 0, 0.3, y0, 0.26);
  const n = N(g, 0, y0, 0), W = 0.16 + r() * 0.06, D = W * (0.6 + r() * 0.4), H = 0.03 + r() * 0.02;
  // curtain wall and corner towers
  for (const [w, d, x, z] of [[W, 0.012, 0, D / 2], [W, 0.012, 0, -D / 2], [0.012, D, W / 2, 0], [0.012, D, -W / 2, 0]]) { bx(n, w, H, d, st, x, 0, z); for (let i = 0; i < Math.floor(Math.max(w, d) / 0.014); i++) bx(n, 0.006, 0.007, 0.006, st, w > d ? -w / 2 + i * 0.014 + 0.004 : x, H, w > d ? z : -d / 2 + i * 0.014 + 0.004); }
  for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const th = H * (1.6 + r() * 0.8), tr = 0.014 + r() * 0.006; cy(n, tr, th, st, a * W / 2, 0, b * D / 2, 10); if (fairy || r() < 0.4) cn(n, tr * 1.25, tr * 3.5, roof, a * W / 2, th, b * D / 2, 10); else for (let k = 0; k < 6; k++) { const an = (k / 6) * Math.PI * 2; bx(n, 0.005, 0.006, 0.005, st, a * W / 2 + Math.cos(an) * tr, th, b * D / 2 + Math.sin(an) * tr); } }
  // keep or palace block
  const kw = W * 0.45, kd = D * 0.45, kh = H * (2 + r());
  bx(n, kw, kh, kd, st, -W * 0.1, 0, -D * 0.08); windowsRow(n, 5, kw, kh * 0.5, -D * 0.08 + kd / 2 + 0.001, '#3b4a5a', 0.005, 0.008, -W * 0.1);
  if (fairy) { gb(n, kw, kh * 0.5, kd, roof, -W * 0.1, kh, -D * 0.08); for (let i = 0; i < 3; i++) { const x = -W * 0.25 + i * W * 0.15, tr = 0.008 + r() * 0.004, th = kh * (1.1 + r() * 0.6); cy(n, tr, th, st, x, 0, -D * 0.08 + kd / 2, 8); cn(n, tr * 1.3, tr * 4.5, roof, x, th, -D * 0.08 + kd / 2, 8); } }
  else { for (let i = 0; i < 8; i++) bx(n, 0.006, 0.008, 0.006, st, -W * 0.1 - kw / 2 + i * kw / 7, kh, -D * 0.08 + kd / 2); if (r() < 0.5) hp(n, kw * 0.9, kh * 0.4, kd * 0.9, roof, -W * 0.1, kh, -D * 0.08); }
  const bw = 0.02 + r() * 0.01, bh = kh * (1.3 + r() * 0.7); bx(n, bw, bh, bw, st, W * 0.22, 0, -D * 0.15); (fairy ? cn(n, bw * 0.9, bw * 3, roof, W * 0.22, bh, -D * 0.15, 4, Math.PI / 4) : null);  // bergfried
  bx(n, 0.03, H * 1.4, 0.02, st, 0, 0, D / 2); bx(n, 0.012, H * 0.8, 0.002, '#3d3a33', 0, 0, D / 2 + 0.011);
  bx(n, 0.002, 0.03, 0.002, '#777', W * 0.22, bh, -D * 0.15); bx(n, 0.014, 0.009, 0.001, ctx.pick(['#d64533', '#3b6fbf', '#f6c445', '#2fa65a']), W * 0.22 + 0.007, bh + 0.02, -D * 0.15);
  if (!hill && r() < 0.5) { const m = disc(g, 0.2, '#4ea3d6', 0, 0, 0, 1.15, 0.95); void m; }
  trees(g, ctx, 12, 0.2, 0.34);
  if (r() < 0.5) quarter(g, ctx, 10, 0.22, 0.34);
}
function castleJapan(g, ctx) {  // tenshu keep: stone base, white plaster, stacked grey roofs with gables
  const { r } = ctx, W = r() < 0.8 ? '#f4f2ec' : '#2f2f33', roof = ctx.pick(['#4a5560', '#3e4650', '#5f8f7a']);
  disc(g, 0.26, '#4ea3d6'); disc(g, 0.22, '#7fae58', 0, 0.002, 0);
  P(g, UC(4, 0.82), '#a8a090', 0, 0, 0, 0.09, 0.05, 0.09, 0).rotation.y = Math.PI / 4;
  let y = 0.05; const tiers = 3 + Math.floor(r() * 3);
  for (let i = 0; i < tiers; i++) { const w = 0.08 - i * 0.012; bx(g, w, 0.025, w * 0.8, W, 0, y); hp(g, w * 1.25, 0.015, w * 1.05, roof, 0, y + 0.022); if (i % 2 === 0) gb(g, w * 0.5, 0.012, 0.004, roof, 0, y + 0.024, w * 0.42); y += 0.03; }
  for (const s of [-1, 1]) bx(g, 0.004, 0.006, 0.006, '#e0c062', s * 0.01, y, 0);  // golden shachihoko
  for (const [a, b] of [[1, 0], [-1, 0], [0, 1]]) { bx(g, 0.1, 0.02, 0.01, W, a * 0.16, 0, b * 0.16 + (b ? 0 : 0.02), a ? Math.PI / 2 : 0); }
  trees(g, ctx, 14, 0.22, 0.34);
}
function castle(g, ctx) { if (ctx.reg === 'japan') return castleJapan(g, ctx); if (['arab', 'persian', 'sahel', 'india'].includes(ctx.reg)) return fort(g, ctx); return castleEuro(g, ctx); }
function palaceEuro(g, ctx) {  // baroque / neoclassical palace in one of four layouts, with formal gardens or a parade ground
  const { r, p } = ctx, n = p.n.toLowerCase();
  const wall = /winter/.test(n) ? '#7fbfa6' : ctx.pick(['#efe2c8', '#f2efe8', '#e8d9b5', '#f6e2a0', '#e9c9b0', '#cfe0ea', '#e8c25a', '#d9cfbb', '#f0d0c0']);
  const roof = ctx.pick(['#5f6a72', '#4a5a6a', '#5f8f7a', '#a6402e', '#3e4a52', '#7d8a8c']), trim = '#f4f2ec';
  const H = 0.035 + r() * 0.02, D = 0.045 + r() * 0.015, layout = /doge|ducal|apostolic|buckingham|royal palace|palazzo|stadtschloss|hofburg/.test(n) ? 1 : Math.floor(r() * 4);
  const block = (len, x, z, ry, h = H) => { const b = N(g, x, 0, z, ry); bx(b, len, h, D, wall); P(b, UB(), roof, 0, h, 0, len, h * 0.28, D * 1.02); hp(b, len, h * 0.25, D * 1.02, roof, 0, h * 1.28); for (let f = 0; f < 3; f++) windowsRow(b, Math.round(len / 0.015), len, h * (0.12 + f * 0.3), D / 2 + 0.001, '#5b6b7a', 0.005, h * 0.18); for (let f = 0; f < 3; f++) windowsRow(b, Math.round(len / 0.015), len, h * (0.12 + f * 0.3), -D / 2 - 0.001, '#5b6b7a', 0.005, h * 0.18); return b; };
  const centre = (x, z, ry) => { const c = N(g, x, 0, z, ry); bx(c, 0.07, H * 1.3, D * 1.25, wall); if (r() < 0.45) { cy(c, 0.022, H * 0.3, wall, 0, H * 1.3, 0, 14); dm(c, 0.024, ctx.pick(['#5f8f7a', '#e0c062', '#5f6a72']), 0, H * 1.6, 0, 1.2, 14); } else gb(c, 0.07, H * 0.35, 0.004, trim, 0, H * 1.3, D * 0.63); for (let i = 0; i < 6; i++) cy(c, 0.003, H * 1.1, trim, -0.03 + i * 0.012, 0, D * 0.63 + 0.002, 6); };
  const L = 0.24 + r() * 0.1;
  if (layout === 0) { block(L, 0, -0.06, 0); for (const s2 of [-1, 1]) block(0.13, s2 * (L / 2 - D / 2), 0.03, Math.PI / 2); centre(0, -0.06 + 0.004, 0); }      // U-shaped cour d'honneur
  else if (layout === 1) { for (const [x, z, ry, len] of [[0, 0.07, 0, L], [0, -0.07, 0, L], [L / 2 - D / 2, 0, Math.PI / 2, 0.14 + D], [-L / 2 + D / 2, 0, Math.PI / 2, 0.14 + D]]) block(len, x, z, ry); bx(g, L - D * 2, 0.002, 0.14 - D, '#d9cfbb', 0, 0, 0); centre(0, 0.074, 0); } // closed courtyard block
  else if (layout === 2) { block(L * 1.15, 0, -0.04, 0); centre(0, -0.036, 0); for (const s2 of [-1, 1]) { const pv = N(g, s2 * L * 0.6, 0, -0.04); bx(pv, 0.05, H * 1.15, D * 1.2, wall); hp(pv, 0.05, H * 0.5, D * 1.2, roof, 0, H * 1.15); } } // long garden front with end pavilions
  else { block(L * 0.7, 0, -0.06, 0); for (const s2 of [-1, 1]) { const w = N(g, s2 * L * 0.45, 0, 0.0, s2 * 0.6); bx(w, 0.1, H * 0.6, D * 0.7, wall); hp(w, 0.1, H * 0.3, D * 0.7, roof, 0, H * 0.6); } centre(0, -0.056, 0); } // wings curving out to the forecourt
  if (layout === 1 || r() < 0.3) {  // parade ground / forecourt with railings and gates
    bx(g, L, 0.002, 0.14, '#cfc6b4', 0, 0, 0.19); for (let i = 0; i < 20; i++) bx(g, 0.0015, 0.012, 0.0015, '#2f3a40', -L / 2 + i * (L / 19), 0, 0.26); bx(g, L, 0.002, 0.0015, '#2f3a40', 0, 0.011, 0.26); if (r() < 0.6) { obelisk(N(g, 0, 0, 0.19, 0, 0.35), ctx); }
  } else {  // parterre gardens, fountain, clipped yews, canal
    bx(g, L * 0.9, 0.002, 0.2, '#cfc6b4', 0, 0, 0.18);
    const cols = 2 + Math.floor(r() * 3); for (let i = 0; i < cols * 2; i++) for (let k = 0; k < 2; k++) bx(g, (L * 0.8) / (cols * 2) - 0.01, 0.004, 0.07, '#5f9a45', -L * 0.4 + (i + 0.5) * (L * 0.8) / (cols * 2), 0.002, 0.13 + k * 0.1);
    disc(g, 0.022 + r() * 0.01, '#4ea3d6', 0, 0.003, 0.18); cy(g, 0.004, 0.015, '#e8e3d6', 0, 0, 0.18, 6);
    if (r() < 0.5) bx(g, 0.03, 0.002, 0.18, '#4ea3d6', 0, 0.001, 0.36);
    for (let i = 0; i < 10; i++) for (const s2 of [-1, 1]) cn(g, 0.006, 0.02, '#3f6f3a', s2 * L * 0.47, 0, 0.1 + i * 0.022, 6);
  }
  trees(g, ctx, 12, 0.28, 0.36);
}
function palaceIndia(g, ctx) {  // Rajput / Mughal palace: multi-storey façade, jharokha balconies, chhatris on the roofline
  const { r } = ctx, wall = ctx.pick(['#e8c99a', '#f2d8a8', '#e9b0a0', '#f4efe4', '#d9a679', '#f6d27a']), cap = ctx.pick(['#f4efe4', wall, '#d9a679']);
  const L = 0.25 + r() * 0.08, H = 0.07 + r() * 0.04, D = 0.06;
  if (r() < 0.4) { water(g, L * 1.4, 0.2, 0, 0.12); }
  bx(g, L, H, D, wall); for (let f = 0; f < 4; f++) for (let i = 0; i < 12; i++) bx(g, L / 16, H * 0.12, 0.004, f % 2 ? '#8a6a48' : '#6a4a3a', -L / 2 + (i + 0.5) * L / 12, H * (0.08 + f * 0.22), D / 2 + 0.002);
  for (let i = 0; i < 6; i++) { const x = -L / 2 + (i + 0.5) * L / 6; bx(g, 0.016, 0.012, 0.012, wall, x, H * 0.55, D / 2 + 0.006); dm(g, 0.008, cap, x, H * 0.55 + 0.012, D / 2 + 0.006, 1, 8); }
  for (let i = 0; i < 7; i++) { const x = -L / 2 + (i + 0.5) * L / 7; const rr = i === 3 ? 0.02 : 0.011; for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) cy(g, rr * 0.12, rr * 1.4, wall, x + a * rr * 0.7, H, b * rr * 0.7, 4); dm(g, rr, cap, x, H + rr * 1.4, 0, 1.1, 10); }
  for (const s of [-1, 1]) { bx(g, 0.05, H * 1.3, 0.05, wall, s * (L / 2 + 0.02), 0, 0); dm(g, 0.022, cap, s * (L / 2 + 0.02), H * 1.3, 0, 1.2, 10); }
  quarter(g, ctx, 14, 0.25, 0.34); trees(g, ctx, 6, 0.2, 0.33);
}
function water(g, w, d, x = 0, z = 0) { bx(g, w, 0.002, d, '#4ea3d6', x, 0, z); }
function palaceArab(g, ctx) { const { r } = ctx, W = ctx.pick(['#f4efe4', '#efe2c8', '#e2cfa8']); bx(g, 0.28, 0.05, 0.2, W); bx(g, 0.2, 0.002, 0.12, '#4ea3d6', 0, 0.05, 0); for (let i = 0; i < 10; i++) for (const s of [-1, 1]) bx(g, 0.012, 0.03, 0.003, '#3f6f8a', -0.12 + i * 0.027, 0.01, s * 0.101); cy(g, 0.04, 0.03, W, 0, 0.05, -0.06, 14); dm(g, 0.045, ctx.pick(['#e0c062', '#3f8f5a', '#f4efe4']), 0, 0.08, -0.06, 1.1, 14); for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { cy(g, 0.012, 0.08, W, a * 0.14, 0, b * 0.1, 8); dm(g, 0.013, W, a * 0.14, 0.08, b * 0.1, 1.2, 8); } for (let i = 0; i < 10; i++) palm(g, -0.25 + i * 0.055, 0.2, 1.4); quarter(g, ctx, 8, 0.27, 0.34); }
function palace(g, ctx) {
  const { reg } = ctx;
  if (reg === 'china' || reg === 'japan' || reg === 'sea' || reg === 'isea' && ctx.p.k !== 'Philippines') { hallCN(g, ctx, 0.2, 0.09, 0.08, 0, -0.05, reg === 'japan' ? '#4a5560' : reg === 'sea' ? '#d6603a' : '#e8b93a', true); for (const s of [-1, 1]) hallCN(g, ctx, 0.05, 0.16, 0.05, s * 0.16, 0.08, reg === 'japan' ? '#4a5560' : reg === 'sea' ? '#2f7a5a' : '#e8b93a', false); hallCN(g, ctx, 0.12, 0.05, 0.06, 0, 0.25, reg === 'sea' ? '#d6603a' : '#e8b93a', false); bx(g, 0.3, 0.002, 0.25, '#e2d8c4', 0, 0, 0.1); trees(g, ctx, 10, 0.25, 0.34); return; }
  if (reg === 'india' || reg === 'nepal') return palaceIndia(g, ctx);
  if (reg === 'arab' || reg === 'persian' || reg === 'ottoman' && ctx.r() < 0.5) return palaceArab(g, ctx);
  palaceEuro(g, ctx);
}
function fort(g, ctx) {
  const { r, reg } = ctx;
  if (reg === 'india' || reg === 'nepal') {  // hill fort: massive walls with round bastions climbing a rocky hill, palaces above
    const st = ctx.pick(['#b9573f', '#c9a87a', '#a8806a', '#d9b48a']);
    P(g, UC(9, 0.6), '#8a7a5a', 0, 0, 0, 0.3, 0.07, 0.22);
    const n = N(g, 0, 0.07, 0);
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, x = Math.cos(a) * 0.18, z = Math.sin(a) * 0.13; cy(n, 0.016, 0.04, st, x, -0.02, z, 10); const a2 = ((i + 0.5) / 14) * Math.PI * 2; bx(n, 0.08, 0.03, 0.012, st, Math.cos(a2) * 0.175, -0.02, Math.sin(a2) * 0.125, -a2 + Math.PI / 2); }
    palaceIndia(N(g, 0, 0.07, -0.02, 0, 0.5), ctx);
    return;
  }
  if (reg === 'arab' || reg === 'persian' || reg === 'sahel' || reg === 'africa') {  // mud-brick / stone fort: square walls, round towers, crenellations
    const st = ctx.pick(['#d9b48a', '#c9a87a', '#b9824f', '#e2cfa8']);
    for (const [w, d, x, z] of [[0.24, 0.02, 0, 0.12], [0.24, 0.02, 0, -0.12], [0.02, 0.24, 0.12, 0], [0.02, 0.24, -0.12, 0]]) { bx(g, w, 0.05, d, st, x, 0, z); for (let i = 0; i < 12; i++) bx(g, 0.008, 0.008, 0.008, st, w > d ? -0.11 + i * 0.02 : x, 0.05, w > d ? z : -0.11 + i * 0.02); }
    for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { cy(g, 0.022, 0.075, st, a * 0.12, 0, b * 0.12, 10, 0.85); cy(g, 0.02, 0.008, st, a * 0.12, 0.075, b * 0.12, 10); }
    bx(g, 0.06, 0.09, 0.06, st, -0.04, 0, -0.04); bx(g, 0.03, 0.04, 0.004, '#5a3a22', 0, 0, 0.131);
    if (reg !== 'sahel') for (let i = 0; i < 5; i++) palm(g, 0.18 + (i % 2) * 0.04, -0.15 + i * 0.07, 1.4);
    quarter(g, ctx, 10, 0.2, 0.34); return;
  }
  if (r() < 0.6 && reg !== 'china' && reg !== 'japan') {  // star fort with angled bastions and a moat
    const st = ctx.pick(['#b5ad9a', '#a8a090', '#9aa08a', '#c9b89a']), n = ctx.r() < 0.5 ? 5 : 4, R0 = 0.16;
    disc(g, 0.3, '#4ea3d6'); disc(g, 0.27, '#7fae58', 0, 0.001, 0);
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; const b = N(g, Math.cos(a) * R0, 0, Math.sin(a) * R0, -a); hp(b, 0.09, 0.03, 0.09, st); bx(b, 0.07, 0.03, 0.07, st, 0, 0, 0, Math.PI / 4); const a2 = ((i + 0.5) / n) * Math.PI * 2; bx(g, 0.012, 0.03, R0 * 1.1, st, Math.cos(a2) * R0 * 0.8, 0, Math.sin(a2) * R0 * 0.8, -a2); }
    bx(g, R0 * 1.2, 0.004, R0 * 1.2, '#8fae62', 0, 0.005, 0, Math.PI / 4); bx(g, 0.06, 0.03, 0.03, '#d9cfbb', 0, 0, 0); gb(g, 0.06, 0.02, 0.032, '#a6402e', 0, 0.03, 0);
    return;
  }
  if (reg === 'china') { const st = '#9a9a92'; for (const [w, d, x, z] of [[0.3, 0.025, 0, 0.15], [0.3, 0.025, 0, -0.15], [0.025, 0.3, 0.15, 0], [0.025, 0.3, -0.15, 0]]) bx(g, w, 0.05, d, st, x, 0, z); hallCN(g, ctx, 0.08, 0.04, 0.05, 0, 0.15, '#3f6f5a', true).position.y = 0.05; quarter(g, ctx, 20, 0.02, 0.13); return; }
  castleEuro(g, ctx);
}

// ---------------------------------------------------------------- towers, skyscrapers
function tower(g, ctx) {
  const { r, reg, p } = ctx, n = p.n.toLowerCase();
  const tv = /tv|television|fernseh|telecom|sky|radio|observation|communication|oriental pearl|milad|ostankino|needle|cn |tokyo|seoul|namsan|macau|stratosphere|centrepoint|torre de tv|space/.test(n) || p.c === 'tower' && !/clock|bell|church|leaning|old|gate|watch|defence|torre del|turm\b/.test(n) && r() < 0.65;
  if (!tv) {  // medieval / clock tower
    const st = ctx.pick(['#cfc6b4', '#bdb4a0', '#c9a87a', '#b9573f', '#d9cfbb']), roof = ctx.pick(ctx.pal.roof), w = 0.035 + r() * 0.02, h = 0.15 + r() * 0.15;
    if (r() < 0.4) cy(g, w * 0.6, h, st, 0, 0, 0, 12); else bx(g, w, h, w, st);
    for (let k = 0; k < 4; k++) bx(g, w * 1.04, h * 0.015, w * 1.04, '#d9cfbb', 0, h * (0.25 + k * 0.18), 0);
    bx(g, w * 0.5, w * 0.5, 0.002, '#f2efe8', 0, h * 0.8, w / 2 + 0.002); bx(g, w * 0.3, h * 0.12, 0.002, '#3d3a33', 0, h * 0.55, w / 2 + 0.002);
    const top = r(); if (top < 0.4) cn(g, w * 0.75, w * 1.8, roof, 0, h, 0, 4, Math.PI / 4); else if (top < 0.6) { on(g, w * 0.4, roof, 0, h, 0, 10); } else for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) bx(g, w * 0.2, w * 0.2, w * 0.2, st, a * w * 0.4, h, b * w * 0.4);
    quarter(g, ctx, 16, 0.08, 0.32); return;
  }
  // TV / observation tower: concrete shaft, pod(s), antenna — proportions vary
  const C = ctx.pick(['#d6d8d4', '#cfd2d6', '#e6e8e9', '#c9c2b0', '#d9dde2']), h = p.ht > 60 ? Math.min(0.75, p.ht / 1000 * 0.85) : 0.3 + r() * 0.25, kind = r();
  if (kind < 0.25) { for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; P(g, UC(4, 0.2), C, Math.cos(a) * 0.012, 0, Math.sin(a) * 0.012, 0.025, h * 0.85, 0.025, -a); } }  // tripod
  cy(g, 0.01 + r() * 0.006, h, C, 0, 0, 0, 10, 0.6 + r() * 0.3);
  const podY = h * (0.7 + r() * 0.15), podR = 0.03 + r() * 0.025;
  if (kind < 0.5) { sp(g, podR, ctx.pick(['#e8553e', '#c9d3de', '#d9b24a', C]), 0, podY + podR * 0.6, 0, 14, glass); }  // ball pod (Berlin, Shanghai)
  else { P(g, UC(18, 1.3), C, 0, podY, 0, podR, podR * 0.5, podR); cy(g, podR * 1.25, podR * 0.3, '#5f7a90', 0, podY + podR * 0.5, 0, 18, 1, glass); cy(g, podR * 1.15, podR * 0.25, C, 0, podY + podR * 0.8, 0, 18, 0.8); }
  if (r() < 0.4) sp(g, podR * 0.5, '#c9d3de', 0, h * 0.4, 0, 10, glass);
  cy(g, 0.002, h * (0.25 + r() * 0.2), '#e6edf3', 0, h, 0, 6, 0.4);
  for (let i = 0; i < 10; i++) bx(g, 0.04, 0.03 + r() * 0.06, 0.04, ctx.pick(['#b5bdc6', '#cfd6dd', '#9aa7b4', '#d9cfbb']), (r() - 0.5) * 0.5, 0, (r() < 0.5 ? 1 : -1) * (0.1 + r() * 0.15));
}
function skyscraper(g, ctx) {
  const { r } = ctx, gl = ctx.pick(['#7f9fb8', '#8fb3cc', '#6f8fa8', '#9ab0c0', '#5f7a90', '#b8c4cc']), fr = ctx.pick(['#d2d9e0', '#b9c3cc', '#e6edf3', '#9aa2ad']), h = ctx.p.ht > 60 ? Math.min(0.95, ctx.p.ht / 1000 * 0.85) : 0.3 + r() * 0.35, w = 0.05 + r() * 0.03, kind = Math.floor(r() * 6);
  if (kind === 0) { // setback tower (Art Deco / postmodern)
    let y = 0, ww = w; for (let i = 0; i < 4; i++) { const hh = h * [0.5, 0.2, 0.15, 0.1][i]; bx(g, ww, hh, ww, i % 2 ? fr : gl, 0, y, 0, 0, glass); y += hh; ww *= 0.75; } cy(g, 0.002, h * 0.15, fr, 0, y, 0, 6, 0.3);
  } else if (kind === 1) { // twisting tower
    for (let i = 0; i < 16; i++) bx(g, w, h / 16, w, i % 2 ? gl : fr, 0, (i * h) / 16, 0, i * 0.06, glass);
  } else if (kind === 2) { // tapering spire (Shanghai Tower / Shard)
    P(g, UC(ctx.pick([3, 4, 6, 18]), 0.25), gl, 0, 0, 0, w * 0.8, h, w * 0.8, r(), glass); cy(g, 0.002, h * 0.12, fr, 0, h, 0, 6, 0.3);
  } else if (kind === 3) { // cylinder with crown
    cy(g, w * 0.55, h, gl, 0, 0, 0, 16, 1, glass); for (let i = 0; i < 12; i++) cy(g, w * 0.57, 0.003, fr, 0, (i * h) / 12, 0, 16); cn(g, w * 0.45, h * 0.12, fr, 0, h, 0, 16);
  } else if (kind === 4) { // twin / pair
    for (const s of [-1, 1]) { bx(g, w * 0.7, h * (s > 0 ? 1 : 0.85), w * 0.7, gl, s * w * 0.6, 0, 0, 0, glass); cy(g, 0.002, h * 0.1, fr, s * w * 0.6, h * (s > 0 ? 1 : 0.85), 0, 6); } bx(g, w * 0.5, w * 0.12, w * 0.3, fr, 0, h * 0.5);
  } else { // slab with frame and crown
    bx(g, w * 1.3, h, w * 0.7, gl, 0, 0, 0, 0, glass); for (let i = 0; i < 6; i++) bx(g, 0.003, h, w * 0.72, fr, -w * 0.65 + i * w * 0.26, 0, 0); bx(g, w * 1.32, h * 0.04, w * 0.72, fr, 0, h);
  }
  for (let i = 0; i < 14; i++) { const a = r() * Math.PI * 2, d = 0.12 + r() * 0.2; bx(g, 0.035 + r() * 0.03, 0.03 + r() * h * 0.32, 0.035 + r() * 0.03, ctx.pick(['#9aa7b4', '#b5bdc6', '#8592a0', '#c4b9a6', '#7f9fb8']), Math.cos(a) * d, 0, Math.sin(a) * d, 0, glass); }
  ctx.noPad = true; bx(g, 0.66, 0.002, 0.66, '#9aa0a6');
}

// ---------------------------------------------------------------- bridges
function bridge(g, ctx) {
  const { r, reg, p } = ctx, n = p.n.toLowerCase(), old = /pont |ponte|puente|\bold\b|stone|roman|vecchio|charles|karlův|aqueduct|stari|alcántara|devil|khaju|si-o-se|rialto|ponte|pont-/.test(n) || (['med', 'central', 'brit', 'orth', 'ottoman', 'persian'].includes(reg) && !/viaduct|bay|strait|kaikyo|causeway|crossing|cable|suspension/.test(n) && r() < 0.25);
  const L = 1.4 + r() * 0.8; ctx.noPad = true;
  if (/aqueduct/.test(n)) { const st = ctx.pick(['#c9b89a', '#b5ad9a']); bx(g, L, 0.004, 0.6, '#7fae58', 0, 0, 0); for (let tier = 0; tier < 2; tier++) for (let i = 0; i < 16; i++) { const x = -L / 2 + (i + 0.5) * (L / 16); bx(g, L / 16 * 0.3, 0.07, 0.02, st, x - L / 32, tier * 0.07, 0); } for (let t = 0; t < 2; t++) bx(g, L, 0.012, 0.02, st, 0, 0.058 + t * 0.07, 0); return; }
  bx(g, L * 1.1, 0.002, 0.5, '#4ea3d6', 0, 0, 0); for (const s of [-1, 1]) bx(g, L * 0.15, 0.03, 0.6, '#7fae58', s * L * 0.55, 0, 0);
  if (old) {
    const st = ctx.pick(['#c9b89a', '#b5ad9a', '#d9cfbb', '#a89f88']), na = 3 + Math.floor(r() * 6), span = L / na;
    bx(g, L, 0.012, 0.035, st, 0, 0.045, 0);
    for (let i = 0; i <= na; i++) { const x = -L / 2 + i * span; bx(g, span * 0.15, 0.045, 0.04, st, x, 0, 0); cn(g, 0.02, 0.02, st, x, 0, 0.026, 4); }
    for (let i = 0; i < na; i++) { const t = P(g, UT(Math.PI), st, -L / 2 + (i + 0.5) * span, 0.0, 0, span * 0.43, 0.045, 1); t.scale.z = 0.3; }
    if (/vecchio/.test(n) || r() < 0.15) for (let i = 0; i < 10; i++) house(g, ctx, -0.12 + i * 0.026, 0, 0, 0.024, 0.04, 0.025);
    return;
  }
  const C = ctx.pick(['#c0362c', '#d6d8d4', '#9aa7b4', '#e8e3d6', '#3e6f9e', '#5f6a72', '#e8b93a']), kind = r();
  bx(g, L, 0.012, 0.05, C, 0, 0.09);
  if (kind < 0.4) {  // suspension
    for (const s of [-1, 1]) { for (const z of [-0.02, 0.02]) bx(g, 0.014, 0.32, 0.014, C, s * L * 0.28, 0, z); for (const y of [0.15, 0.3]) bx(g, 0.012, 0.014, 0.05, C, s * L * 0.28, y); }
    for (const z of [-0.02, 0.02]) { const pts = []; for (let i = 0; i <= 30; i++) { const x = -L / 2 + (i / 30) * L, a = Math.abs(x); const y = a <= L * 0.28 ? 0.1 + 0.22 * (a / (L * 0.28)) ** 2 : 0.32 - 0.22 * ((a - L * 0.28) / (L * 0.22)); pts.push(new THREE.Vector3(x, y, z)); } const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.003, 4), mat(C)); g.add(m); }
  } else if (kind < 0.75) {  // cable-stayed
    const nt = r() < 0.5 ? 1 : 2;
    for (let t = 0; t < nt; t++) { const x = nt === 1 ? 0 : (t ? 1 : -1) * L * 0.22, h = 0.25 + r() * 0.1; if (r() < 0.5) { for (const s of [-1, 1]) P(g, UB(), C, x + 0, 0, s * 0.025, 0.012, h, 0.012).rotation.x = -s * 0.08; } else bx(g, 0.016, h, 0.016, C, x, 0, 0); for (let i = 1; i <= 8; i++) for (const s of [-1, 1]) { const dx = s * i * L * 0.025, dy = h - 0.1, len = Math.hypot(dx, dy); const c = P(g, UBC(), '#e6edf3', x + dx / 2, 0.1 + dy / 2, 0, 0.0015, len, 0.0015); c.rotation.z = Math.atan2(-dx, dy); } }
  } else {  // steel arch or truss
    if (r() < 0.5) { for (const z of [-0.02, 0.02]) P(g, UT(Math.PI), C, 0, 0.05, z, L * 0.35, L * 0.2, 0.08); }
    else for (let i = 0; i < 12; i++) { const x = -L * 0.4 + i * L * 0.073; for (const z of [-0.022, 0.022]) { const d = P(g, UB(), C, x, 0.1, z, 0.004, 0.08, 0.004); d.rotation.z = i % 2 ? 0.6 : -0.6; } bx(g, L * 0.075, 0.004, 0.048, C, x, 0.17); }
    for (let i = 0; i < 5; i++) bx(g, 0.02, 0.09, 0.04, '#9a9384', -L * 0.4 + i * L * 0.2, 0, 0);
  }
}

// ---------------------------------------------------------------- statues, monuments, arches
function statue(g, ctx) {
  const { r, reg, p } = ctx, n = p.n.toLowerCase();
  const buddha = /buddha|daibutsu|guanyin|kannon|bodhisattva/.test(n) || (['china', 'japan', 'sea', 'lanka', 'nepal'].includes(reg) && r() < 0.6);
  const c = ctx.pick(['#7fbfa6', '#8b8f86', '#e8b93a', '#d9d2c4', '#6f7a72', '#a8946a']);
  if (buddha) {  // seated Buddha on a lotus throne
    const B = ctx.pick(['#e8b93a', '#7f8a86', '#d9d2c4', '#9a8a6a']), s = 0.06 + r() * 0.05;
    bx(g, s * 3, s * 0.8, s * 2.4, '#d9cfbb'); cy(g, s * 1.2, s * 0.3, '#d98aa0', 0, s * 0.8, 0, 16, 1.2);
    const y = s * 1.1; P(g, US(12), B, 0, y + s * 0.3, 0, s * 1.2, s * 0.45, s * 0.9); P(g, US(12), B, 0, y + s * 1.1, 0, s * 0.7, s * 0.9, s * 0.5);
    sp(g, s * 0.38, B, 0, y + s * 2.1, 0, 12); sp(g, s * 0.14, B, 0, y + s * 2.5, 0, 8);
    if (r() < 0.5) { const halo = P(g, UT(Math.PI * 2), '#e8b93a', 0, y + s * 2.0, -s * 0.4, s * 0.7, s * 0.7, 0.05); void halo; }
    trees(g, ctx, 10, s * 3, 0.34); return;
  }
  const s = 0.05 + r() * 0.04, eq = /equestrian|king|emperor|general|monument to|statue of [a-z]+ (i|ii|iii|iv)\b/.test(n) && r() < 0.7;
  bx(g, s * 1.6, s * 0.3, s * 1.6, '#cfc6b4'); bx(g, s, s * 1.4, s, ctx.pick(['#d9d2c4', '#b5ad9a', '#cfc6b4', '#8a8f86']), 0, s * 0.3);
  const y = s * 1.7;
  if (eq) { P(g, UB(), c, 0, y + s * 0.45, 0, s * 0.35, s * 0.4, s * 1.1); for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) bx(g, s * 0.06, s * 0.45, s * 0.06, c, a * s * 0.12, y, b * s * 0.4); const nk = P(g, UB(), c, 0, y + s * 0.7, s * 0.5, s * 0.15, s * 0.45, s * 0.15); nk.rotation.x = 0.5; P(g, UB(), c, 0, y + s * 0.85, 0, s * 0.18, s * 0.5, s * 0.25); sp(g, s * 0.1, c, 0, y + s * 1.42, 0, 8); }
  else { P(g, UC(10, 0.7), c, 0, y, 0, s * 0.28, s * 1.4, s * 0.22); sp(g, s * 0.13, c, 0, y + s * 1.55, 0, 8); const arm = P(g, UB(), c, s * 0.25, y + s * 1.2, 0, s * 0.07, s * (0.5 + r() * 0.3), s * 0.07); arm.rotation.z = -(0.3 + r() * 2.2); }
  bx(g, 0.3, 0.002, 0.3, '#d9cfbb', 0, 0, 0); trees(g, ctx, 8, 0.16, 0.32);
}
function obelisk(g, ctx, h) { const { r } = ctx, c = ctx.pick(['#e3d6bd', '#cfc6b4', '#d9b48a', '#b5ad9a', '#f2efe8']); h = h || 0.15 + r() * 0.12; for (let i = 0; i < 3; i++) bx(g, 0.06 - i * 0.012, 0.01, 0.06 - i * 0.012, '#cfc6b4', 0, i * 0.01); P(g, UC(4, 0.65), c, 0, 0.03, 0, 0.018, h, 0.018, Math.PI / 4); P(g, UK(4), c, 0, 0.03 + h, 0, 0.012, 0.02, 0.012, Math.PI / 4); }
function monument(g, ctx) {
  const { r, p } = ctx, n = p.n.toLowerCase(), k = /obelisk|washington/.test(n) ? 0 : /column|colonne|säule|pillar|stambh/.test(n) ? 1 : /war|memorial|cenotaph|genocide|holocaust|victims|heroes|liberation|independence/.test(n) ? 2 : Math.floor(r() * 4);
  if (k === 0) obelisk(g, ctx, 0.2 + r() * 0.1);
  else if (k === 1) { const c = ctx.pick(['#e3d6bd', '#cfc6b4', '#d9d2c4']); bx(g, 0.05, 0.03, 0.05, c); cy(g, 0.014, 0.22, c, 0, 0.03, 0, 12); bx(g, 0.035, 0.012, 0.035, c, 0, 0.25); P(g, UC(8, 0.6), ctx.pick(['#e0c062', '#7fbfa6', '#5f6460']), 0, 0.262, 0, 0.008, 0.035, 0.008); }
  else if (k === 2) { const c = ctx.pick(['#d9d2c4', '#b5ad9a', '#9aa08a', '#e8e3d6']); const style = r(); if (style < 0.35) { for (const s of [-1, 1]) { const b = P(g, UB(), c, s * 0.02, 0, 0, 0.025, 0.2, 0.02); b.rotation.z = -s * 0.15; } } else if (style < 0.7) { bx(g, 0.18, 0.06, 0.04, c); for (let i = 0; i < 5; i++) bx(g, 0.02, 0.04, 0.002, '#7a7a72', -0.06 + i * 0.03, 0.01, 0.021); bx(g, 0.04, 0.12, 0.04, c, 0, 0, -0.04); } else { P(g, UC(4, 0.4), c, 0, 0, 0, 0.04, 0.24, 0.04, Math.PI / 4); disc(g, 0.012, '#e8553e', 0, 0.002, 0.08); } for (let i = 0; i < 6; i++) bx(g, 0.012, 0.004, 0.25, '#e8e3d6', 0, 0, 0.12 + 0.0, (i / 6) * Math.PI); }
  else { const c = ctx.pick(['#e3d6bd', '#f2efe8']); bx(g, 0.14, 0.03, 0.08, c); for (let i = 0; i < 8; i++) cy(g, 0.004, 0.07, c, -0.06 + i * 0.017, 0.03, 0.03, 6); bx(g, 0.14, 0.015, 0.08, c, 0, 0.1); gb(g, 0.14, 0.03, 0.08, c, 0, 0.115); }
  bx(g, 0.32, 0.002, 0.32, '#d9cfbb'); trees(g, ctx, 10, 0.17, 0.33);
}
function arch(g, ctx) {
  const { r, reg, p } = ctx, n = p.n.toLowerCase();
  if (reg === 'nam' && !/gateway|memorial|washington|triumph/.test(n) || reg === 'oceania' || /natural|rock|arches/.test(n)) {  // natural sandstone arch
    ctx.noPad = true; bx(g, 0.8, 0.003, 0.6, '#d48a4a');
    const c = ctx.pick(['#c86b3c', '#d8834f', '#b85e34']); P(g, UT2(Math.PI), c, 0, 0, 0, 0.1, 0.12, 0.08);
    for (const s of [-1, 1]) P(g, UC(7, 0.7), c, s * 0.1, 0, 0, 0.03, 0.04, 0.03);
    for (let i = 0; i < 6; i++) P(g, UC(7, 0.6), c, (r() - 0.5) * 0.7, 0, (r() - 0.5) * 0.5, 0.04 + r() * 0.06, 0.05 + r() * 0.1, 0.04 + r() * 0.05); return;
  }
  if (reg === 'china' || reg === 'japan' && !/torii/.test(n)) {  // paifang memorial archway
    const roof = ctx.pick(['#3f6f5a', '#e8b93a', '#3e4650']), c = ctx.pick(['#b8312a', '#d9d2c4']);
    for (let i = 0; i < 4; i++) cy(g, 0.005, 0.1, c, -0.06 + i * 0.04, 0, 0, 8);
    bx(g, 0.16, 0.02, 0.012, c, 0, 0.08); for (const [x, w, y] of [[0, 0.06, 0.1], [-0.045, 0.04, 0.09], [0.045, 0.04, 0.09]]) hp(g, w, 0.02, 0.025, roof, x, y + 0.01, 0);
    bx(g, 0.012, 0.002, 0.4, '#d9cfbb'); trees(g, ctx, 8, 0.15, 0.32); return;
  }
  if (reg === 'japan') { torii(g, 0, 0, 0.14); trees(g, ctx, 12, 0.15, 0.33); return; }
  // triumphal arch / city gate
  const c = ctx.pick(['#e3d6bd', '#d8c7a2', '#cfc6b4', '#d9b48a', '#e8dcc0', '#b9573f']), w = 0.1 + r() * 0.06, h = w * (0.8 + r() * 0.3), d = w * 0.35, three = r() < 0.4;
  bx(g, 0.08, 0.003, 0.6, '#cfc6b4');
  for (const s of [-1, 1]) bx(g, w * (three ? 0.2 : 0.32), h, d, c, s * w * (three ? 0.4 : 0.34), 0, 0);
  if (three) for (const s of [-1, 1]) bx(g, w * 0.08, h * 0.62, d, c, s * w * 0.19, 0, 0);
  bx(g, w * 0.36, h * 0.3, d, c, 0, h * 0.7); bx(g, w * 1.04, h * 0.25, d * 1.04, c, 0, h); bx(g, w * 1.06, h * 0.04, d * 1.06, '#cfc3a8', 0, h * 0.98);
  for (const s of [-1, 1]) for (const z of [-1, 1]) cy(g, 0.004, h * 0.9, '#f4efe4', s * w * 0.5, 0, z * d * 0.53, 6);
  if (r() < 0.5) { bx(g, w * 0.3, h * 0.12, d * 0.4, ctx.pick(['#5f8f7a', '#3f3a33', '#7fbfa6']), 0, h * 1.25); }
  else if (reg === 'india') for (const s of [-1, 0, 1]) dm(g, w * 0.08, c, s * w * 0.4, h * 1.25, 0, 1, 8);
  quarter(g, ctx, 14, 0.18, 0.34);
}

// ---------------------------------------------------------------- tombs, museums, stadiums, theatres, lighthouses
function mausoleum(g, ctx) {
  const { r, reg } = ctx;
  if (reg === 'india' || reg === 'nepal') {  // Mughal tomb: chahar bagh garden, plinth, iwans, bulbous dome
    const c = ctx.pick(['#f4f1ea', '#b9573f', '#d9b48a', '#c9a87a']), dmC = c === '#b9573f' ? '#f4f1ea' : c;
    bx(g, 0.36, 0.003, 0.36, '#6aa84a'); for (const ry of [0, Math.PI / 2]) bx(g, 0.012, 0.004, 0.36, '#4ea3d6', 0, 0, 0, ry);
    bx(g, 0.16, 0.02, 0.16, '#d9b48a'); bx(g, 0.1, 0.07, 0.1, c, 0, 0.02); for (const ry of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) { const f = N(g, 0, 0.02, 0, ry); bx(f, 0.04, 0.055, 0.002, '#7a5a3a', 0, 0.005, 0.0505); }
    cy(g, 0.03, 0.02, c, 0, 0.09, 0, 14); on(g, 0.04, dmC, 0, 0.105, 0, 16); for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { dm(g, 0.012, dmC, a * 0.04, 0.09, b * 0.04, 1.1, 8); if (r() < 0.6) { cy(g, 0.006, 0.12, c, a * 0.075, 0.02, b * 0.075, 8, 0.8); dm(g, 0.007, dmC, a * 0.075, 0.14, b * 0.075, 1.1, 6); } }
    for (let i = 0; i < 12; i++) cn(g, 0.006, 0.025, '#2f5d34', -0.17 + (i % 6) * 0.068, 0, i < 6 ? 0.16 : -0.16, 6); return;
  }
  if (reg === 'persian' || reg === 'arab' || reg === 'ottoman') {  // Timurid tomb: octagonal drum and ribbed turquoise dome
    const c = ctx.pick(['#d9c3a0', '#e2d0ae', '#f2efe8']); cy(g, 0.06, 0.08, c, 0, 0, 0, 8); cy(g, 0.045, 0.04, ctx.pick(['#2fa0b8', c]), 0, 0.08, 0, 16); on(g, 0.048, ctx.pick(['#2fa0b8', '#3fb0c0', '#7d8a8c']), 0, 0.12, 0, 16); bx(g, 0.07, 0.09, 0.02, c, 0, 0, 0.06); bx(g, 0.04, 0.07, 0.002, '#2f6f9a', 0, 0.005, 0.071);
    quarter(g, ctx, 14, 0.15, 0.33); return;
  }
  if (reg === 'china' || reg === 'japan') { cy(g, 0.13, 0.05, '#7fae58', 0, 0, -0.05, 16, 0.6); dm(g, 0.1, '#6f9a4a', 0, 0.05, -0.05, 0.5, 14); hallCN(g, ctx, 0.08, 0.04, 0.05, 0, 0.14, '#e8b93a', true); bx(g, 0.012, 0.002, 0.2, '#d9cfbb', 0, 0, 0.25); for (let i = 0; i < 6; i++) for (const s of [-1, 1]) bx(g, 0.008, 0.012, 0.012, '#a8a090', s * 0.02, 0, 0.2 + i * 0.025); return; } // tumulus, spirit way
  mausoleumClassical(g, ctx);
}
function mausoleumClassical(g, ctx) {
  const c = ctx.pick(['#e8e3d6', '#d9d2c4', '#cfc6b4']); bx(g, 0.12, 0.012, 0.12, '#cfc6b4'); cy(g, 0.045, 0.07, c, 0, 0.012, 0, 16); for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; cy(g, 0.003, 0.06, '#f4efe4', Math.cos(a) * 0.05, 0.012, Math.sin(a) * 0.05, 6); } dm(g, 0.048, ctx.pick(['#5f8f7a', '#7d8a8c', c]), 0, 0.082, 0, 0.9, 16);
  trees(g, ctx, 12, 0.13, 0.32);
}
function cemetery(g, ctx) {
  const { r, reg } = ctx; bx(g, 0.5, 0.003, 0.4, '#7fae58');
  for (let i = 0; i < 90; i++) { const x = -0.22 + (i % 15) * 0.031, z = -0.17 + Math.floor(i / 15) * 0.06; if (reg === 'brit' || reg === 'nam' || r() < 0.5) bx(g, 0.01, 0.012, 0.003, ctx.pick(['#cfcfc8', '#e8e8e2', '#b5b5ae']), x, 0, z); else { bx(g, 0.003, 0.016, 0.003, '#d9d2c4', x, 0, z); bx(g, 0.01, 0.003, 0.003, '#d9d2c4', x, 0.01, z); } }
  for (let i = 0; i < 3; i++) bx(g, 0.03, 0.03, 0.03, '#cfc6b4', -0.15 + i * 0.15, 0, 0.17);
  bx(g, 0.5, 0.012, 0.004, '#a8a090', 0, 0, 0.2); trees(g, ctx, 14, 0.12, 0.3);
}
function museum(g, ctx) {
  const { r, reg, p } = ctx, modern = /modern|contemporary|science|guggenheim|tate|design|technology|national museum of/.test(p.n.toLowerCase()) || r() < 0.35;
  if (modern) {
    const c = ctx.pick(['#e6e8e9', '#cfd6dd', '#c9c2b0', '#8fa2b4']), kind = r();
    if (kind < 0.33) { for (let i = 0; i < 6; i++) { const m = P(g, US(8), ctx.pick(['#cfd6dd', '#e6edf3', '#b9c3cc']), (r() - 0.5) * 0.18, 0.03, (r() - 0.5) * 0.12, 0.04 + r() * 0.04, 0.03 + r() * 0.04, 0.03 + r() * 0.03, r() * 3, glass); void m; } }  // curving metal (Bilbao-like)
    else if (kind < 0.66) { bx(g, 0.2, 0.05, 0.14, c); bx(g, 0.12, 0.05, 0.1, '#7fb6d9', 0.04, 0.05, 0.0, 0.3, glass); P(g, UB(), c, -0.04, 0.05, 0.0, 0.08, 0.06, 0.08, -0.4); }
    else { cy(g, 0.08, 0.04, c, 0, 0, 0, 20, 1.2); cy(g, 0.06, 0.04, c, 0, 0.04, 0, 20, 1.2); cy(g, 0.045, 0.04, '#7fb6d9', 0, 0.08, 0, 20, 1, glass); }
  } else {  // classical museum: colonnade, pediment, dome or flat
    const c = ctx.pick(['#e8e3d6', '#efe2c8', '#d9d2c4', '#e8d9b5']); bx(g, 0.26, 0.06, 0.12, c); windowsRow(g, 11, 0.26, 0.02, 0.061, '#5b6b7a', 0.006, 0.02);
    bx(g, 0.1, 0.07, 0.03, c, 0, 0, 0.07); for (let i = 0; i < 8; i++) cy(g, 0.0035, 0.06, '#f4efe4', -0.045 + i * 0.013, 0.008, 0.087, 6); gb(g, 0.1, 0.025, 0.035, c, 0, 0.07, 0.07);
    for (let i = 0; i < 4; i++) bx(g, 0.1, 0.002, 0.008, '#e8e3d6', 0, i * 0.002, 0.09 + i * 0.006);
    if (r() < 0.4) dm(g, 0.03, ctx.pick(['#5f8f7a', '#7d8a8c', '#cfd6dd']), 0, 0.06, -0.01, 1, 14); else hp(g, 0.26, 0.02, 0.12, ctx.pick(ctx.pal.roof), 0, 0.06, 0);
  }
  bx(g, 0.34, 0.002, 0.15, '#d9cfbb', 0, 0, 0.14); quarter(g, ctx, 14, 0.2, 0.34); trees(g, ctx, 6, 0.18, 0.32);
}
function stadium(g, ctx) {
  const { r } = ctx, c = ctx.pick(['#e6e8e9', '#cfd6dd', '#d9d2c4', '#c0362c', '#3b6fbf', '#e8e3d6']), oval = r() < 0.6, a = 0.16 + r() * 0.05, b = a * (oval ? 0.78 : 0.7), h = 0.04 + r() * 0.025;
  ctx.noPad = true; bx(g, 0.6, 0.002, 0.5, '#9aa0a6');
  const n = 28;
  for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2; const x = Math.cos(t) * a, z = Math.sin(t) * b; const s = P(g, UB(), i % 2 ? c : '#b5bdc6', x, 0, z, 0.012 + a * 0.18, h, 0.05); s.rotation.y = -t + Math.PI / 2; s.rotation.x = 0; }
  disc(g, 1, '#5aa04a', 0, 0.003, 0, a * 0.72, b * 0.62); bx(g, a * 0.7, 0.002, 0.003, '#f2f2f2', 0, 0.004, 0);
  if (r() < 0.6) { const ring = P(g, UT(Math.PI * 2), ctx.pick(['#f2f3f4', '#d9dde2', '#cfd6dd']), 0, h * 1.05, 0, a, b, 1); ring.rotation.x = Math.PI / 2; ring.scale.set(a * 0.95, b * 0.95, 0.12); }
  for (let i = 0; i < 4; i++) { const t = (i / 4) * Math.PI * 2 + Math.PI / 4; cy(g, 0.003, h * 2.2, '#9aa2ad', Math.cos(t) * a * 1.1, 0, Math.sin(t) * b * 1.1, 6); bx(g, 0.02, 0.01, 0.004, '#f6f0c0', Math.cos(t) * a * 1.1, h * 2.2, Math.sin(t) * b * 1.1); }
}
function amphi(g, ctx) {  // Roman amphitheatre / theatre ruins
  const { r } = ctx, c = ctx.pick(['#c9a87a', '#d9b48a', '#cfc3a8', '#b5a080']), a = 0.15 + r() * 0.04, b = a * 0.8, ruined = r() < 0.7;
  for (let i = 0; i < 32; i++) { const t = (i / 32) * Math.PI * 2; if (ruined && i > 20 && r() < 0.6) continue; const h = ruined && i > 16 ? 0.03 + r() * 0.03 : 0.06; const s = P(g, UB(), c, Math.cos(t) * a, 0, Math.sin(t) * b, 0.03, h, 0.03); s.rotation.y = -t + Math.PI / 2; bx(g, 0.012, h * 0.4, 0.002, '#7a6a52', Math.cos(t) * (a + 0.016), h * 0.1, Math.sin(t) * (b + 0.016), -t + Math.PI / 2); }
  disc(g, 1, '#d9c8a8', 0, 0.002, 0, a * 0.82, b * 0.78); for (let k = 0; k < 4; k++) { const ring = P(g, UT(Math.PI * 2), '#bfae8a', 0, 0.01 + k * 0.012, 0, a * (0.82 + k * 0.04), b * (0.78 + k * 0.05), 1); ring.rotation.x = Math.PI / 2; ring.scale.z = 0.12; }
  quarter(g, ctx, 14, 0.22, 0.34);
}
function opera(g, ctx) {
  const { r } = ctx;
  if (r() < 0.6) {  // 19th-century opera house: arcaded façade, dome or green copper roof, statues
    const c = ctx.pick(['#e8dcc0', '#efe2c8', '#d9cfbb', '#f2efe8']); bx(g, 0.18, 0.07, 0.2, c); bx(g, 0.2, 0.05, 0.04, c, 0, 0, 0.1); for (let i = 0; i < 7; i++) bx(g, 0.016, 0.03, 0.002, '#5a4a3a', -0.08 + i * 0.027, 0.004, 0.121);
    for (let i = 0; i < 8; i++) cy(g, 0.003, 0.025, '#f4efe4', -0.085 + i * 0.024, 0.04, 0.122, 6);
    dm(g, 0.07, ctx.pick(['#5f8f7a', '#7fbfa6', '#7d8a8c']), 0, 0.07, -0.02, 0.6, 16); gb(g, 0.16, 0.05, 0.01, ctx.pick(['#5f8f7a', '#7d8a8c']), 0, 0.07, -0.1);
    for (const s of [-1, 1]) sp(g, 0.006, '#e0c062', s * 0.08, 0.06, 0.12, 6);
  } else {  // modern concert hall
    const c = ctx.pick(['#f4f6f8', '#e6e8e9', '#cfd6dd']); bx(g, 0.24, 0.025, 0.18, '#d9cfbb'); const k = r();
    if (k < 0.5) for (let i = 0; i < 4; i++) { const s = P(g, US(10), c, -0.07 + i * 0.05, 0.025, 0, 0.04 - i * 0.006, 0.08 - i * 0.012, 0.05, 0.3); s.rotation.z = -0.3; }
    else { P(g, UC(18, 0.7), '#7fb6d9', 0, 0.025, 0, 0.09, 0.06, 0.07, 0, glass); P(g, UC(18, 0.4), c, 0, 0.085, 0, 0.065, 0.03, 0.05); }
  }
  quarter(g, ctx, 14, 0.2, 0.34); trees(g, ctx, 6, 0.18, 0.32);
}
function lighthouse(g, ctx) {
  const { r } = ctx, stripe = ctx.pick([['#f4f6f8', '#d6453a'], ['#f4f6f8', '#2f2f33'], ['#f4f6f8', '#f4f6f8'], ['#e8e3d6', '#e8e3d6'], ['#f4f6f8', '#3b6fbf']]), h = 0.12 + r() * 0.08;
  ctx.noPad = true; bx(g, 0.8, 0.002, 0.8, '#4ea3d6');
  P(g, UC(9, 0.7), '#8a8478', 0, 0, 0, 0.14, 0.04, 0.11); bx(g, 0.18, 0.002, 0.12, '#7fae58', 0, 0.04, 0);
  for (let i = 0; i < 6; i++) cy(g, 0.018 - i * 0.0014, h / 6, i % 2 ? stripe[1] : stripe[0], 0, 0.04 + (i * h) / 6, 0, 12, 0.93);
  cy(g, 0.02, 0.004, '#2f2f33', 0, 0.04 + h, 0, 12); cy(g, 0.011, 0.016, '#fff2b0', 0, 0.044 + h, 0, 10, 1, { emissive: '#ffd966', emissiveIntensity: 0.6 }); cn(g, 0.013, 0.014, '#c0362c', 0, 0.06 + h, 0, 10);
  bx(g, 0.04, 0.02, 0.03, '#f2efe8', 0.04, 0.04, 0.02); gb(g, 0.04, 0.012, 0.032, '#c0362c', 0.04, 0.06, 0.02);
}

// ---------------------------------------------------------------- ancient sites
function ruinsGeneric(g, ctx) { const { r } = ctx, c = ctx.pick(['#b5ad9a', '#c9b89a', '#a89f88', '#9a917c']); bx(g, 0.5, 0.003, 0.5, '#b9a988'); for (let i = 0; i < 12; i++) { const x = (r() - 0.5) * 0.36, z = (r() - 0.5) * 0.36, w = 0.04 + r() * 0.06, d = 0.03 + r() * 0.05, h = 0.008 + r() * 0.025; for (const [dx, dz, ww, dd] of [[0, d / 2, w, 0.006], [0, -d / 2, w, 0.006], [w / 2, 0, 0.006, d], [-w / 2, 0, 0.006, d]]) if (r() < 0.8) bx(g, ww, h * (0.5 + r() * 0.5), dd, c, x + dx, 0, z + dz); } trees(g, ctx, 6, 0.25, 0.34); }
function ruinsClassical(g, ctx) {
  const { r } = ctx; bx(g, 0.56, 0.003, 0.5, '#c9b998');
  templeClassical(N(g, -0.06, 0, -0.06, r() * 0.4, 0.8), ctx);
  for (let i = 0; i < 6; i++) { const x = (r() - 0.5) * 0.4, z = 0.1 + r() * 0.15; cy(g, 0.004, 0.02 + r() * 0.05, '#e2d6bc', x, 0, z, 8); }
  if (r() < 0.6) { const th = N(g, 0.16, 0, 0.12); for (let k = 0; k < 5; k++) { const t = P(th, UT(Math.PI), '#cfc3a8', 0, k * 0.006, 0, 0.05 + k * 0.012, 0.05 + k * 0.012, 1); t.rotation.x = -Math.PI / 2; t.scale.z = 0.12; } } // theatre
  if (r() < 0.6) for (let i = 0; i < 10; i++) cy(g, 0.004, 0.05, '#e2d6bc', -0.2 + i * 0.02, 0, 0.2, 6);  // colonnaded street
  ruinsGeneric(N(g, 0, 0, 0, 0, 0.6), ctx);
}
function ruinsEgypt(g, ctx) {  // pylon temple: tapering pylons, obelisk, hypostyle hall of thick columns, sphinx avenue
  const { r } = ctx, c = ctx.pick(['#d9b48a', '#cfa878', '#e2c08f']); bx(g, 0.6, 0.003, 0.5, '#e2c896');
  for (const s of [-1, 1]) P(g, UC(4, 0.8), c, s * 0.055, 0, 0.12, 0.07, 0.11, 0.025, Math.PI / 4).scale.set(0.06, 0.11, 0.02);
  bx(g, 0.03, 0.07, 0.022, c, 0, 0, 0.12); bx(g, 0.012, 0.05, 0.002, '#3d3a33', 0, 0, 0.132);
  for (let i = 0; i < 4; i++) for (let k = 0; k < 5; k++) cy(g, 0.009, 0.07, c, -0.05 + i * 0.033, 0, -0.02 - k * 0.03, 10);
  bx(g, 0.14, 0.012, 0.14, c, 0, 0.07, -0.08); obelisk(N(g, 0.03, 0, 0.17, 0, 0.6), ctx);
  for (let i = 0; i < 8; i++) for (const s of [-1, 1]) { bx(g, 0.008, 0.008, 0.02, c, s * 0.03, 0, 0.2 + i * 0.03); sp(g, 0.005, c, s * 0.03, 0.01, 0.205 + i * 0.03, 6); }
  for (let i = 0; i < 6; i++) palm(g, 0.22 + (i % 2) * 0.03, -0.2 + i * 0.07, 1.4);
}
function ziggurat(g, ctx) { const c = '#b98a5a'; bx(g, 0.5, 0.003, 0.5, '#d9c08a'); for (let i = 0; i < 3; i++) bx(g, 0.24 - i * 0.07, 0.035, 0.18 - i * 0.05, i % 2 ? '#a8784a' : c, 0, i * 0.035); for (const x of [-0.03, 0, 0.03]) bx(g, 0.012, 0.07, 0.1, '#a8784a', x, 0, 0.12, x * 6); ruinsGeneric(N(g, 0, 0, 0, 0, 0.7), ctx); }
function stoneCircle(g, ctx) { const { r } = ctx; bx(g, 0.5, 0.003, 0.5, '#8fbf6c'); const n = 12 + Math.floor(r() * 16), R0 = 0.08 + r() * 0.06; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; if (r() < 0.2) continue; bx(g, 0.01, 0.02 + r() * 0.025, 0.007, '#8f8f88', Math.cos(a) * R0, 0, Math.sin(a) * R0, -a); } if (r() < 0.4) for (let i = 0; i < 3; i++) { const x = (i - 1) * 0.03; bx(g, 0.008, 0.04, 0.008, '#85857e', x - 0.008, 0, 0); bx(g, 0.008, 0.04, 0.008, '#85857e', x + 0.008, 0, 0); bx(g, 0.025, 0.008, 0.009, '#85857e', x, 0.04, 0); } }
function andean(g, ctx) { const { r } = ctx; P(g, UC(9, 0.5), '#6f8a4a', 0, 0, 0, 0.3, 0.06, 0.25); for (let i = 0; i < 5; i++) { const t = P(g, UT(Math.PI * 0.9), '#8f8676', 0, 0.01 + i * 0.012, 0, 0.27 - i * 0.04, 0.22 - i * 0.03, 1); t.rotation.x = -Math.PI / 2; t.scale.z = 0.25; } const n = N(g, 0, 0.06, 0); for (let i = 0; i < 14; i++) { const x = (r() - 0.5) * 0.2, z = (r() - 0.5) * 0.14; bx(n, 0.022, 0.016, 0.016, '#9a917c', x, 0, z); if (r() < 0.4) gb(n, 0.024, 0.014, 0.018, '#b5a070', x, 0.016, z); } }
function ruins(g, ctx) {
  const { reg, p } = ctx, n = p.n.toLowerCase();
  if (p.k === 'Egypt' || p.k === 'Sudan') return /pyramid/.test(n) ? pyramidEgypt(g, ctx) : ruinsEgypt(g, ctx);
  if (p.k === 'Iraq' || p.k === 'Iran' && /choga|zigg|susa/.test(n) || /ur |uruk|babylon|nineveh|nimrud|ashur/.test(n)) return ziggurat(g, ctx);
  if (['Mexico', 'Guatemala', 'Honduras', 'Belize', 'El Salvador', 'Peten Itza Kingdom'].includes(p.k)) return templeMeso(g, ctx);
  if (['Peru', 'Bolivia', 'Ecuador', 'Chile', 'Colombia'].includes(p.k)) return andean(g, ctx);
  if ((reg === 'brit' || p.k === 'France' && p.lat > 46 || p.k === 'Ireland' || reg === 'nordic') && /stone|henge|circle|cairn|dolmen|megalith|barrow|menhir|carnac|avebury/.test(n)) return stoneCircle(g, ctx);
  if (['med', 'ottoman', 'arab', 'orth'].includes(reg) || /roman|greek|forum|agora|acropolis|ancient/.test(n)) return ruinsClassical(g, ctx);
  if (reg === 'sea' || reg === 'isea') return /bagan|pagan|ayutthaya|sukhothai/.test(n) ? pagoda(g, ctx) : templeKhmerJava(g, ctx);
  if (reg === 'lanka') return stupaLanka(g, ctx);
  if (reg === 'india') return /hampi|khajuraho|konark|pattadakal|mahabalipuram/.test(n) ? (p.lat < 17 ? templeDravidian(g, ctx, false) : templeNagara(g, ctx, false)) : /mohenjo|harappa|taxila|nalanda/.test(n) ? ruinsGeneric(g, ctx) : stupaLanka(g, ctx);
  if (reg === 'china' || reg === 'japan') return mausoleum(g, ctx);
  ruinsGeneric(g, ctx);
}
function pyramidEgypt(g, ctx) { const { r } = ctx; ctx.noPad = true; bx(g, 0.9, 0.003, 0.9, '#e2c896'); const nubian = ctx.p.k === 'Sudan'; const n = nubian ? 6 + Math.floor(r() * 8) : 1 + Math.floor(r() * 3); for (let i = 0; i < n; i++) { const s = nubian ? 0.03 + r() * 0.02 : 0.2 - i * 0.06, x = nubian ? (r() - 0.5) * 0.6 : -0.15 + i * 0.2, z = nubian ? (r() - 0.5) * 0.4 : -i * 0.06; P(g, UK(4), ctx.pick(['#d9b48a', '#cfa878', '#c9a070']), x, 0, z, s, s * (nubian ? 2.2 : 1.3), s, Math.PI / 4); } }
function glassPyramid(g, ctx) { const { r } = ctx; bx(g, 0.34, 0.003, 0.3, '#d6cfbf'); P(g, UK(4), '#9fd3f0', 0, 0.003, 0, 0.09, 0.09, 0.09, Math.PI / 4, { transparent: true, opacity: 0.75, metalness: 0.4, roughness: 0.15 }); for (let i = 0; i < 3; i++) disc(g, 0.03, '#4ea3d6', -0.11 + i * 0.11, 0.003, 0.1); quarter(g, ctx, 16, 0.18, 0.34); void r; }
function pyr(g, ctx) { const { p } = ctx; if (['Mexico', 'Guatemala', 'Honduras', 'Belize', 'El Salvador', 'Peten Itza Kingdom'].includes(p.k)) return templeMeso(g, ctx); if (ctx.reg === 'china') return mausoleum(g, ctx); if (['Egypt', 'Sudan'].includes(p.k) || /necropolis|tomb/.test(p.n.toLowerCase())) return /pyramid/.test(p.n.toLowerCase()) || p.k === 'Sudan' ? pyramidEgypt(g, ctx) : ruins(g, ctx); if (/pyramid/.test(p.n.toLowerCase()) && !['arab', 'persian'].includes(ctx.reg)) return glassPyramid(g, ctx); ruins(g, ctx); }

// ---------------------------------------------------------------- towns, squares, gardens, walls
function oldtown(g, ctx) {
  const { r, reg } = ctx;
  // pick a centrepiece by region, then fill the streets
  const c = N(g, 0, 0, 0, r() * 0.6 - 0.3, 0.75);
  const pickC = r();
  ctx.quarterOff = true;
  if (['central', 'brit', 'nordic', 'nam', 'oceania'].includes(reg)) (pickC < 0.5 ? (q, x) => churchGothic(q, x, true) : pickC < 0.75 ? castleEuro : churchSmall)(c, ctx);
  else if (reg === 'med') (pickC < 0.55 ? churchRomanesque : pickC < 0.75 ? castleEuro : ruinsClassical)(c, ctx);
  else if (reg === 'orth') (pickC < 0.7 ? churchOrthodox : castleEuro)(c, ctx, pickC < 0.3);
  else if (reg === 'latam') (pickC < 0.7 ? churchColonial : templeMeso)(c, ctx, true);
  else if (['ottoman', 'persian', 'arab'].includes(reg)) (pickC < 0.7 ? (q, x) => mosqueBody(q, x) : fort)(c, ctx);
  else if (reg === 'sahel' || reg === 'africa') (pickC < 0.5 ? (q, x) => mosqueBody(q, x) : fort)(c, ctx);
  else if (reg === 'india') (pickC < 0.4 ? templeNagara : pickC < 0.7 ? palaceIndia : fort)(c, ctx);
  else if (reg === 'nepal') templeNepal(c, ctx);
  else if (reg === 'china' || reg === 'japan') templeChina(c, ctx);
  else if (reg === 'sea') templeThai(c, ctx);
  else if (reg === 'isea') (pickC < 0.5 ? churchColonial : templeBali)(c, ctx);
  else if (reg === 'lanka') stupaLanka(c, ctx);
  else churchSmall(c, ctx);
  ctx.quarterOff = false;
  quarter(g, ctx, 34, 0.17, 0.36);
  if (r() < 0.4) { const W = ctx.pick(['#b5ad9a', '#c9a87a', '#a8a090']); for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; const s = bx(g, 0.1, 0.03, 0.012, W, Math.cos(a) * 0.37, 0, Math.sin(a) * 0.37, -a + Math.PI / 2); void s; if (i % 4 === 0) cy(g, 0.018, 0.045, W, Math.cos(a) * 0.37, 0, Math.sin(a) * 0.37, 8); } } // town walls
  ctx.noPad = false;
}
function mosqueBody(g, ctx) { mosque(g, ctx); }
function square(g, ctx) {
  const { r } = ctx, pave = ctx.pick(['#cfc6b4', '#d9cfbb', '#b9b3a7', '#e2d8c4']); bx(g, 0.3, 0.003, 0.24, pave);
  if (r() < 0.5) { cy(g, 0.03, 0.008, '#cfc6b4', 0, 0.003, 0, 16); disc(g, 0.026, '#4ea3d6', 0, 0.011, 0); cy(g, 0.004, 0.03, '#e8e3d6', 0, 0.011, 0, 8); } else obelisk(N(g, 0, 0, 0, 0, 0.6), ctx);
  // buildings framing all four sides
  for (const [x, z, ry, len] of [[0, 0.16, 0, 0.32], [0, -0.16, Math.PI, 0.32], [0.18, 0, Math.PI / 2, 0.26], [-0.18, 0, -Math.PI / 2, 0.26]]) { const n = N(g, x, 0, z, ry); for (let i = 0; i < 6; i++) house(n, ctx, -len / 2 + (i + 0.5) * (len / 6), 0.02, 0, len / 6.2, 0.04, 0.03 + r() * 0.02); }
  if (r() < 0.5) { const t = N(g, 0, 0, -0.17, 0, 0.6); (ctx.reg === 'orth' ? churchOrthodox : ctx.reg === 'latam' ? churchColonial : churchSmall)(t, ctx); }
  quarter(g, ctx, 20, 0.24, 0.36);
}
function garden(g, ctx) {
  const { r, reg } = ctx; bx(g, 0.6, 0.003, 0.5, '#6aa84a');
  if (reg === 'japan' || reg === 'china') { disc(g, 0.12, '#4ea3d6', 0.04, 0.003, 0.02, 1.4, 0.9); const b = P(g, UT(Math.PI), '#d6453a', 0.04, 0.003, 0.02, 0.04, 0.02, 0.15); void b; hallCN(g, ctx, 0.06, 0.04, 0.035, -0.15, -0.12, '#3e4650', false); for (let i = 0; i < 6; i++) sp(g, 0.012, '#9a9a92', (r() - 0.5) * 0.3, 0.004, (r() - 0.5) * 0.3, 5); trees(g, ctx, 22, 0.05, 0.3); return; }
  if (reg === 'india' || reg === 'persian' || reg === 'arab') { for (const ry of [0, Math.PI / 2]) bx(g, 0.012, 0.004, 0.5, '#4ea3d6', 0, 0, 0, ry); for (let i = 0; i < 16; i++) cn(g, 0.007, 0.03, '#2f5d34', -0.22 + (i % 8) * 0.063, 0, i < 8 ? 0.2 : -0.2, 6); bx(g, 0.04, 0.03, 0.04, '#f2efe8', 0, 0, 0); dm(g, 0.018, '#f2efe8', 0, 0.03, 0, 1, 8); return; }
  for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) { bx(g, 0.1, 0.004, 0.08, '#4f8f3f', -0.17 + i * 0.115, 0.002, -0.12 + k * 0.11); for (let f = 0; f < 4; f++) sp(g, 0.005, ctx.pick(['#e2533a', '#f6c445', '#d05ac9', '#f2efe8']), -0.17 + i * 0.115 + (f - 1.5) * 0.02, 0.006, -0.12 + k * 0.11, 5); }
  const gh = N(g, 0.18, 0, -0.18); P(gh, UC(16, 1), '#cfe6f0', 0, 0, 0, 0.05, 0.03, 0.03, 0, see); P(gh, UD(14), '#cfe6f0', 0, 0.03, 0, 0.05, 0.035, 0.03, 0, see); // glasshouse
  trees(g, ctx, 16, 0.15, 0.3);
}
function walls(g, ctx) {
  const { r, reg } = ctx, st = ctx.pick(['#b5ad9a', '#a8a090', '#c9a87a', '#9a9a92']); ctx.noPad = true; bx(g, 1, 0.003, 0.6, '#7fae58');
  const pts = []; for (let i = 0; i <= 14; i++) pts.push([-0.5 + i * 0.072, Math.sin(i * 0.8 + r()) * 0.1]);
  for (let i = 0; i < pts.length - 1; i++) { const [x1, z1] = pts[i], [x2, z2] = pts[i + 1], len = Math.hypot(x2 - x1, z2 - z1); bx(g, len + 0.004, 0.035, 0.014, st, (x1 + x2) / 2, 0, (z1 + z2) / 2, -Math.atan2(z2 - z1, x2 - x1)); if (i % 3 === 0) { bx(g, 0.03, 0.055, 0.03, st, x1, 0, z1); if (reg === 'china') hp(g, 0.04, 0.02, 0.04, '#4a4f55', x1, 0.055, z1); } }
  quarter(g, ctx, 18, 0.12, 0.3);
}

// ---------------------------------------------------------------- nature
// Real size from Wikidata elevation (metres): drawn height ≈ prominence (about 55% of elevation), snow above the
// local snow line. Places that are only "mountains" by name (e.g. Monte Testaccio, a Roman hill) become small hills.
export function mountainSize(p) {
  if (p.e > 0) return Math.min(3.2, Math.max(0.04, (p.e / 1000) * 0.55));
  if (p.c !== 'mountain' && p.c !== 'volcano') return 0.05;
  return kindOf(p) === 'volcano' ? 1.1 : 1.0;
}
function mountain(g, ctx, volcano) {
  const { r, p } = ctx, H = mountainSize(p), R = H * (volcano ? 2.6 : 2.1);
  const snowLine = 5000 - 60 * Math.max(0, Math.abs(p.lat) - 20);
  const e = p.e || 0, snow = e > snowLine ? Math.min(0.6, Math.max(0.14, 1 - snowLine / e)) : 0;
  ctx.noPad = true;
  if (H < 0.2) {  // a hill: soft grassy rise with a few trees
    if (ctx.forMap) return;
    P(g, mountainGeometry({ seed: ctx.seed, hill: true, grid: 24 }), '#ffffff', 0, 0, 0, H * 3.2, H, H * 2.6, r() * 6, { vertexColors: true, flatShading: false });
    trees(g, ctx, 10, H * 0.6, H * 2.8, 1.4);
    return;
  }
  // real terrain: ridges and valleys, meadow → forest → rock → snow by height
  P(g, mountainGeometry({ seed: ctx.seed, snow, volcano, peaks: volcano ? 1 : 2 + (ctx.seed % 3) }), '#ffffff', 0, 0, 0, R * (0.9 + r() * 0.4), H, R * (0.8 + r() * 0.4), r() * 6, { vertexColors: true, flatShading: false });
  if (!volcano) for (let i = 0; i < 3; i++) { const a = r() * 6.28, d = R * (0.75 + r() * 0.3); P(g, mountainGeometry({ seed: ctx.seed + 7 + i, hill: true, grid: 24 }), '#ffffff', Math.cos(a) * d, 0, Math.sin(a) * d, R * 0.45, H * (0.12 + r() * 0.1), R * 0.4, r() * 6, { vertexColors: true, flatShading: false }); } // foothills
  if (volcano && r() < 0.5) for (let i = 0; i < 4; i++) sp(g, R * (0.06 + i * 0.025), '#e8e8ea', i * R * 0.05, H * 0.95 + R * (0.05 + i * 0.07), i * R * 0.02, 7, { transparent: true, opacity: 0.55, depthWrite: false });
  if (ctx.forMap) return;
  for (let i = 0; i < 18; i++) { const a = r() * Math.PI * 2, d = R * (0.85 + r() * 0.25); P(g, UK(6), '#2f5d34', Math.cos(a) * d, 0, Math.sin(a) * d, H * 0.035, H * 0.1, H * 0.035); }
}
function waterfall(g, ctx) {
  const { r } = ctx, H = 0.15 + r() * 0.35, W = 0.15 + r() * 0.6, rock = ctx.pick(['#6f7461', '#7b8b6a', '#5f6b52', '#8a8478']); ctx.noPad = true;
  bx(g, 2.2, H, 0.7, '#6f8a4a', 0, 0, -0.55); bx(g, 2.2, H * 0.98, 0.04, rock, 0, 0, -0.2);
  bx(g, W * 0.9, 0.004, 0.6, '#4b9fd6', 0, H, -0.5);
  const n = 3 + Math.floor(W / 0.12); for (let i = 0; i < n; i++) bx(g, (W / n) * (0.6 + r() * 0.4), H * (0.95 + r() * 0.05), 0.014, ctx.pick(['#e6f4fb', '#cfeaf8', '#f2fafe']), -W / 2 + (i + 0.5) * (W / n), 0.002, -0.17);
  if (r() < 0.4) { bx(g, W * 0.9, H * 0.5, 0.2, rock, 0, 0, -0.08); for (let i = 0; i < n; i++) bx(g, W / n * 0.8, H * 0.5, 0.01, '#e6f4fb', -W / 2 + (i + 0.5) * (W / n), 0, 0.03); } // second tier
  bx(g, 2.2, 0.002, 1.4, '#4b9fd6', 0, 0, 0.5); for (let i = 0; i < 3; i++) P(g, US(10), '#f4f8fa', (i - 1) * W * 0.35, H * 0.25, -0.08, W * 0.25, H * 0.25, 0.08, 0, { transparent: true, opacity: 0.3, roughness: 1, depthWrite: false });
  for (let i = 0; i < 26; i++) tree(g, (r() - 0.5) * 2, -0.35 - r() * 0.5, 3);
}
function canyon(g, ctx) {
  const { r } = ctx, B = ctx.pick([['#c86b3c', '#d8834f', '#e8b48a'], ['#a88a6a', '#c9a87a', '#8a7a5a'], ['#9a8a7a', '#b5a593', '#7a6a5a']]); ctx.noPad = true;
  for (const s of [-1, 1]) for (let i = 0; i < 12; i++) { const x = -3 + i * 0.5, e = 0.4 + Math.sin(i * 1.4 + r()) * 0.25; for (let b = 0; b < 3; b++) bx(g, 0.52, 0.18, 1.8, B[b], x, b * 0.18, s * (e + b * 0.12 + 0.9)); }
  const pts = []; for (let i = 0; i <= 16; i++) pts.push(new THREE.Vector3(-3.2 + i * 0.4, 0.006, Math.sin(i * 0.9) * 0.2));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.05, 4), mat('#4f8f7a')));
  bx(g, 6.5, 0.003, 1.0, B[0], 0, 0, 0);
}
function lake(g, ctx) { const { r } = ctx; ctx.noPad = true; disc(g, 1, '#5f9a45', 0, 0, 0, 2.4, 2); disc(g, 1, '#3f8fc8', 0, 0.002, 0, 1.8 + r() * 0.3, 1.2 + r() * 0.4); for (let i = 0; i < 3; i++) disc(g, 1, '#5f9a45', (r() - 0.5) * 1.6, 0.004, (r() - 0.5) * 1, 0.1 + r() * 0.15, 0.08 + r() * 0.1); for (let i = 0; i < 40; i++) { const a = r() * Math.PI * 2; tree(g, Math.cos(a) * (1.9 + r() * 0.4), Math.sin(a) * (1.4 + r() * 0.5), 5); } if (r() < 0.5) for (let i = 0; i < 4; i++) P(g, UK(5), '#7a7f86', -2 + i * 1.2, 0, -2.2 - r() * 0.4, 0.8, 1.2 + r(), 0.8); for (let i = 0; i < 3; i++) bx(g, 0.04, 0.012, 0.015, '#f2efe8', (r() - 0.5), 0.004, (r() - 0.5)); }
function park(g, ctx) {
  const { r, reg, p } = ctx, n = p.n.toLowerCase(); ctx.noPad = true;
  if (/desert|dune|sahara|namib|gobi/.test(n) || (['arab', 'sahel'].includes(reg) && r() < 0.6)) { disc(g, 1, '#e2c08a', 0, 0, 0, 2.2, 2.2); for (let i = 0; i < 10; i++) { const d = P(g, UD(8), '#d9b07a', (r() - 0.5) * 3, 0, (r() - 0.5) * 3, 0.5 + r() * 0.5, 0.1 + r() * 0.12, 0.25, r() * 3); void d; } return; }
  if (/delta|wetland|marsh|everglades|pantanal|sundarbans/.test(n)) { disc(g, 1, '#5f9a45', 0, 0, 0, 2.2, 2.2); for (let i = 0; i < 9; i++) { const pts = []; for (let k = 0; k < 6; k++) pts.push(new THREE.Vector3(-2 + k * 0.8, 0.004, (i - 4) * 0.4 + Math.sin(k + i) * 0.2)); g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.04, 3), mat('#4ea3d6'))); } trees(g, ctx, 40, 0.2, 2, 4); return; }
  // forested hills, a river, a lake, a ranger station
  disc(g, 1, '#5f9a45', 0, 0, 0, 2.4, 2.4);
  for (let i = 0; i < 6; i++) { const a = r() * Math.PI * 2, d = 0.6 + r() * 1.4; P(g, UD(10), ctx.pick(['#4f8a3f', '#5f9a45', '#6f8a4a']), Math.cos(a) * d, 0, Math.sin(a) * d, 0.5 + r() * 0.4, 0.15 + r() * 0.25, 0.5 + r() * 0.3); }
  if (Math.abs(p.lat) > 35 && r() < 0.6) for (let i = 0; i < 3; i++) { P(g, UK(5), '#7a7f86', -1.5 + i * 1.2, 0, -1.6, 0.7, 1.4 + r(), 0.7); P(g, UK(5), '#f6f8fb', -1.5 + i * 1.2, 0.85, -1.6, 0.3, 0.6, 0.3); }
  disc(g, 1, '#4ea3d6', 0.6, 0.003, 0.5, 0.4, 0.25);
  trees(g, ctx, 70, 0.1, 2.2, 5);
  bx(g, 0.05, 0.03, 0.04, '#8a6a48', -0.2, 0, 0.2); gb(g, 0.06, 0.03, 0.05, '#4a3424', -0.2, 0.03, 0.2);
}
function coast(g, ctx) { const { r } = ctx; ctx.noPad = true; disc(g, 1, '#3f8fc8', 0, 0, 0, 2.4, 2.4); disc(g, 1, '#6fd0d8', 0, 0.002, 0.3, 1.8, 0.8); for (let i = 0; i < 26; i++) disc(g, 1, ctx.pick(['#e8b0a0', '#f2d07a', '#d06a8a', '#8fd8c0']), (r() - 0.5) * 3, 0.004, 0.3 + (r() - 0.5) * 1.2, 0.05 + r() * 0.08, 0.04 + r() * 0.06); disc(g, 1, '#f2e2b0', 0, 0.003, -1.1, 2.2, 0.35); trees(g, ctx, 20, 1.2, 1.5, 4); }
function island(g, ctx) { const { r } = ctx; ctx.noPad = true; disc(g, 1, '#3f8fc8', 0, 0, 0, 2.6, 2.6); const n = /islands|archipelago/.test(ctx.p.n.toLowerCase()) ? 4 + Math.floor(r() * 4) : 1; for (let i = 0; i < n; i++) { const x = n > 1 ? (r() - 0.5) * 3 : 0, z = n > 1 ? (r() - 0.5) * 3 : 0, s = n > 1 ? 0.3 + r() * 0.4 : 1; disc(g, 1, '#f2e2b0', x, 0.002, z, 1.1 * s, 0.8 * s); P(g, UD(10), '#5f9a45', x, 0, z, 0.95 * s, 0.2 + r() * 0.3 * s, 0.7 * s); for (let k = 0; k < 6 * s + 2; k++) { const a = r() * Math.PI * 2; (Math.abs(ctx.p.lat) < 28 ? palm : tree)(g, x + Math.cos(a) * 0.6 * s, z + Math.sin(a) * 0.45 * s, 4); } } }
function cave(g, ctx) { const { r } = ctx; ctx.noPad = true; disc(g, 1, '#6f9a4a', 0, 0, 0, 1.2, 1); P(g, UD(10), ctx.pick(['#8a8478', '#9a9483', '#7a7468']), 0, 0, -0.1, 0.5, 0.25 + r() * 0.15, 0.35); const m = P(g, UD(10), '#2a2622', 0, 0, 0.2, 0.09, 0.12, 0.04); m.rotation.x = 0; for (let i = 0; i < 4; i++) cn(g, 0.01, 0.04, '#cfc6b4', -0.05 + i * 0.03, 0, 0.26, 5); trees(g, ctx, 20, 0.5, 1.1, 3); }
function zoo(g, ctx) { const { r } = ctx; bx(g, 0.6, 0.003, 0.5, '#6aa84a'); for (let i = 0; i < 6; i++) { const x = -0.2 + (i % 3) * 0.2, z = i < 3 ? -0.1 : 0.1; bx(g, 0.16, 0.003, 0.14, ctx.pick(['#c9a87a', '#7fae58', '#9fc87a']), x, 0.001, z); for (const [w, d, dx, dz] of [[0.16, 0.003, 0, 0.07], [0.16, 0.003, 0, -0.07], [0.003, 0.14, 0.08, 0], [0.003, 0.14, -0.08, 0]]) bx(g, w, 0.01, d, '#8a6a48', x + dx, 0, z + dz); for (let k = 0; k < 3; k++) { const c = ctx.pick(['#c9a24a', '#8a8f96', '#4a3a2a', '#e8e3d6', '#d08a4a']); bx(g, 0.012, 0.008, 0.006, c, x + (r() - 0.5) * 0.1, 0.005, z + (r() - 0.5) * 0.08); if (c === '#c9a24a') cy(g, 0.001, 0.02, c, x, 0.01, z, 4); } } disc(g, 0.05, '#4ea3d6', 0.2, 0.003, 0.2); trees(g, ctx, 20, 0.15, 0.3); }
function themepark(g, ctx) {
  const { r } = ctx; bx(g, 0.6, 0.003, 0.5, '#8fbf6a');
  const fw = N(g, 0.14, 0, -0.08); cy(fw, 0.004, 0.11, '#e6e8e9', -0.03, 0, 0, 6); cy(fw, 0.004, 0.11, '#e6e8e9', 0.03, 0, 0, 6); const wh = P(fw, UT(Math.PI * 2), '#e6e8e9', 0, 0.11, 0, 0.1, 0.1, 0.05); void wh; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; bx(fw, 0.012, 0.012, 0.012, ctx.pick(['#e2533a', '#3b8fd0', '#f6c445', '#2fa65a']), Math.cos(a) * 0.1, 0.11 + Math.sin(a) * 0.1 - 0.006, 0); }
  const pts = []; for (let i = 0; i <= 24; i++) { const t = (i / 24) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(t) * 0.16 - 0.08, 0.02 + Math.abs(Math.sin(t * 2)) * 0.07 + (i < 4 ? i * 0.02 : 0), Math.sin(t) * 0.1 + 0.08)); }
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 60, 0.004, 4), mat(ctx.pick(['#e2533a', '#3b8fd0', '#f6c445'])))); for (let i = 0; i < 12; i++) { const q = pts[i * 2]; cy(g, 0.0015, q.y, '#9aa2ad', q.x, 0, q.z, 4); }
  const cs = N(g, -0.15, 0, -0.12, 0, 0.5); for (const [x, h] of [[0, 0.16], [-0.04, 0.1], [0.04, 0.1], [-0.07, 0.07], [0.07, 0.07]]) { cy(cs, 0.012, h, '#f2d8e8', x, 0, 0, 10); cn(cs, 0.015, 0.05, '#4a6fa8', x, h, 0, 10); } // fairy-tale castle
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; cy(g, 0.006, 0.01, ctx.pick(['#e2533a', '#f6c445', '#3b8fd0']), Math.cos(a) * 0.04 + 0.05, 0, Math.sin(a) * 0.04 + 0.18, 6); } cn(g, 0.06, 0.02, '#f2efe8', 0.05, 0.03, 0.18, 12);
  trees(g, ctx, 14, 0.2, 0.3);
}

// ---------------------------------------------------------------- dispatch
const BUILD = {
  church, mosque, temple, pagoda, shrine, castle, palace, fort, tower, skyscraper, bridge, statue, monument, arch, mausoleum, cemetery,
  museum, stadium, amphi, opera, lighthouse, ruins, pyr, oldtown, square, garden, walls, waterfall, canyon, lake, park, coast, island, cave,
  zoo, themepark, obelisk: (g, c) => { obelisk(g, c); trees(g, c, 8, 0.12, 0.3); },
  mountain: (g, c) => mountain(g, c, false), volcano: (g, c) => mountain(g, c, true),
};
export function buildPlace(p, opts = {}) {
  const kind = kindOf(p), reg = regionOf(p), seed = hash(String(p.id || p.n));
  const r = rng(seed);
  const ctx = { p, reg, pal: PAL[reg] || PAL.central, r, seed, noPad: NATURE_KINDS.has(kind), pick: (a) => a[Math.floor(r() * a.length)] };
  const g = new THREE.Group();
  ctx.forMap = !!opts.dropGround;
  // on the real-world map the satellite picture already shows these landscapes: no model needed
  if (ctx.forMap && ['lake', 'park', 'coast', 'island', 'cave', 'canyon', 'waterfall'].includes(kind)) { g.userData.noPad = true; return g; }
  try { (BUILD[kind] || oldtown)(g, ctx); }
  catch (e) { console.warn('placegen', p.n, kind, e); }
  g.userData.noPad = ctx.noPad;
  return g;
}
// km scale and viewing altitude for the nature kinds (built at landscape size)
export function genScale(p) { const k = kindOf(p); return k === 'canyon' ? 0.6 : k === 'bridge' ? 0.6 : 1; }
export function genViewKm(p) { const k = kindOf(p); return k === 'mountain' || k === 'volcano' ? Math.max(1.6, mountainSize(p) * 6) : NATURE_KINDS.has(k) ? 7 : k === 'bridge' ? 2.2 : 1.6; }
