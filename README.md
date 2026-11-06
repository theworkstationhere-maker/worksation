# World Again

Rebuilding Earth from scratch, together. Every follower gets the same free house in their own
town, with their Instagram ID on it. Towns grow a bus stop (50 people), a railway station (200)
and an airport (1,000). The globe also shows 7,000+ famous places: 62 hand-made wonders
(Taj Mahal, Eiffel Tower, Pyramids, Great Wall…) plus every UNESCO World Heritage Site and
thousands of well-known towers, bridges, castles, temples, mosques, churches, mountains,
waterfalls and more from Wikidata.

## What's in it

- **Accounts:** registering a house now needs an email + password (scrypt-hashed, HttpOnly session cookie, rate-limited
  login). Houses imported from comments can be claimed once. Every account gets a code (e.g. WA-1A2B3C) to put in their
  Instagram bio or DM; you confirm it in /admin → **Verify ✓**, and verified houses show ✓. Forgot password: /admin →
  **Reset link** (valid 24 h, single use), DM it to the real owner. No email sending is set up yet.
- **No mayors:** the first resident is just a resident.
- **Downtowns:** towns over 400 houses grow apartment towers in the middle, taller as the town grows.
- **True-to-life models for all 62 hand-picked wonders** (`public/wonders.js`, `public/landmarks-real*.js`): Eiffel Tower,
  Big Ben, St Basil's, Burj Khalifa, Meenakshi Temple, Golden Gate, Sydney Opera House and the rest, each modelled on the
  real place and its surroundings. Every place card shows its Wikipedia photo and summary (credited, linked).
- **Realistic models for every other place** (`public/placegen.js`): all 7,221 Wikidata places get a model chosen from
  their name and category and built in their region's style: gothic cathedrals in France and Germany, onion domes in
  Russia, colonial twin towers in Latin America, Ottoman domes and pencil minarets in Türkiye, turquoise domes in Iran,
  mud-brick mosques in Mali, Mughal mosques and tombs in India, gopurams in Tamil Nadu, wats in Thailand, halls and
  pagodas in China and Japan, Japanese castles, star forts, stave churches, Roman ruins, Maya pyramids, TV towers,
  skyscrapers, bridges, stadiums, mountains, waterfalls, parks and more. A seed from each place's id varies size,
  colours and layout so no two look alike. Each model is merged into ~10 draw calls (120 fps over Rome).
- **Houses in the local style:** every town builds its houses the way its country does: flat roofs, courtyard walls
  and rooftop water tanks in India and the Arab world, terracotta roofs around the Mediterranean and Latin America (in bright
  colours there), steep gables in Germany and Scandinavia, wooden izbas in Russia, upturned eaves and walled courtyards in
  China and Japan, stilt houses in Thailand and Indonesia, round huts (new homes) and tin roofs in Africa (`HOUSE_STYLES` in `public/town.js`).
- **Diorama view** (`public/diorama.js`): every place and town has a 🏝️ Diorama button that shows it as a little floating
  piece of land (grass on top, layers of soil below) under a big poster title. Drag to turn it. **Save image** makes a
  1080×1350 picture for Instagram, with the site name on it.
- **Roads everywhere:** `node scripts/build-roads.js` builds `public/roads.json`, a road network that links every famous place
  and major city. Roads only join points on the same landmass of the same country and are checked to stay on that land, so
  they never cross borders or the sea (9,800 roads; highways in yellow). Drawn as gently curving toy-map roads.
- **Real-looking mountains** (`public/terrain.js`): ridged low-poly terrain with meadows, forest, rock faces and snow above
  the local snow line, sized from real Wikidata elevations, on every mountain, volcano and mountain range.
- **3D nature** (`public/nature.js`): trees, pines, palms, bushes, flower meadows, rocks, cacti and shiny rivers appear as you zoom in.
- **Sharp at every zoom:** two sharp map layers (close-up + a wider ring towards the horizon), repainted early as you zoom.
- **Turn and tilt:** hold ⟲ ⟳ to turn, 2D/3D button to tilt, right-drag / middle-drag / two-finger twist; tilt goes nearly to the horizon.
- **Streets and cafés:** sidewalks with curbs, street trees, benches beside the street lamps, and cozy cafés (terrace, umbrellas,
  planters, string lights that glow at night). Homes vary a little in width and height. Anyone can visit a café; no house needed.
- **Shared green spaces:** a park with ring paths, fountain, flowerbeds and benches; a town square with a bandstand; a
  community garden with raised beds; pocket parks (playgrounds, quiet gardens, ponds with seats) appearing as towns grow; and a
  walking path all round the homes with benches. All public: no house needed.
- **Façade details per style:** window boxes with flowers (UK, US), red geraniums and wooden balconies (Alpine/Nordic), shutters,
  terracotta pots and iron balconies (Mediterranean, Latin America), sunshades and rooftop plants (India, Middle East), lanterns
  by the door (China, Japan), plants on the veranda (South-East Asia). Added as homes grow; no extra draw calls.
- **Atmosphere:** trees sway gently in the wind (desktop only; off on phones to keep them smooth, `public/wind.js`); at night about
  3 in 4 windows are lit, so streets look lived-in.
- **Sound** in walk mode (`public/sound.js`, synthesised live: footsteps, birdsong and breeze by day, crickets at night).

- **Look and feel:** film-style tone mapping, real sun shadows in towns and walk mode, sky and haze near the ground,
  glossy oceans, gable/hip roofs, porches, palm trees in the tropics, pavements, dashed lanes and a tree-lined
  central boulevard; frosted-glass interface with an icon toolbar, smooth animations, a branded loader, a fly-in
  from space, and automatic label decluttering.

- **3D Earth** with country, state and province borders and names, rivers, lakes, deserts, forests,
  low-poly mountain ranges, drifting clouds, and town names that appear as you zoom in.
- **Houses that grow with time:** construction site (first 5 min), cottage, house with fence and chimney (day 1),
  garden house (day 3), two-storey home with garage (day 7). The first person in a town is Mayor and gets a villa.
- **Towns that grow with people:** a neighbourhood café (10, then more cafés at 60, 130, 220… up to 11 per town), park (25), community garden (40), bus stop (50), school (75), hospital (150),
  railway station (200), town square (300), stadium (600), airport (1,000). Moving cars, street lamps, free plots.
- **Watch it grow** replays any town from its first house to today.
- **Walk mode:** third-person character with your @ID, joystick or WASD keys, drag to turn the camera,
  "N people here now" with other visitors walking live, Photo button. Works in towns and at famous places.
- **Night mode** (lit windows, glowing street lamps), live weather per town, an Ideas panel, My house, a first-visit tour.
- **Camera:** drag to pan; right-drag, Shift-drag or two-finger twist to turn and tilt; ⟲ ⟳ buttons.
- **Real close-up map:** below ~2,000 km the visible area is repainted at high resolution. Zoom in further and it becomes a
  real map in the same minimal, illustrated style: the real main roads, rivers, lakes, forests, parks and towns from
  OpenStreetMap via OpenFreeMap, in flat toy-map colours, faded into the globe at the edges (no satellite photos, no clutter).
  All painted in the background worker (`public/mapworker.js`, includes a small vector-tile decoder). Credits show on screen.
- **Festivals:** on festival days a "See … lights" button appears: string lights on every roof, diyas, lanterns,
  a Christmas-tree roundabout, fireworks, or Holi colour clouds. Dates live in `public/festivals.js`
  (moon-based ones are approximate, check them yearly). Preview any festival with `?festival=diwali`, `christmas`, `newyear`, `lunar`, `eid`, `holi`.
- **The race:** leaderboard of countries and towns (today / this week / all time) with an Invite button.
- **3D cities:** 3,000+ real cities (Natural Earth populated places) appear as city blocks on a street grid,
  taller and denser with population, lit windows at night, city names as you zoom.
- **View pad (compass):** drag left/right to turn, up/down to tilt, tap to face north. Keys Q/E turn, R/F tilt. Works from globe to street level.
- **Customise:** owners pick wall and roof colours and a garden (flowers, trees, vegetables) and their character's shirt, trousers,
  skin, hair and style. No passwords: each device gets a private key when it registers; only that device can restyle the house.
  Houses added from imported comments are claimed by the first device that customises them (admins can reset this).
- **Languages:** English, हिन्दी, Español, Português, العربية (right-to-left panels), Bahasa Indonesia. Edit `public/i18n.js`;
  the translations were written by me, so have a native speaker check them before launch.
- **Share links:** `?id=handle` opens someone's house, `?town=<key>` opens a town, `?place=Taj Mahal` visits a place.

- **Smoothness:** the close-up map is painted in a background thread (`public/mapworker.js`); zoom glides,
  panning has momentum, turning eases; towns are built after the camera lands and rise out of the ground;
  landmark models load a few at a time; materials are prepared on the loading screen and the fog/shadow
  settings never change shader variants mid-flight. Worst frame on a first trip dropped from ~730 ms to ~50 ms.

## Run it

```bash
node server.js           # http://localhost:5180
node scripts/seed.js     # optional: adds demo.0001… houses in 24 cities, spread over 12 days
npm run reset            # wipe all houses
npm run loadtest         # crowd test
```

No `npm install` needed: Node 22.13+ (uses the built-in SQLite). The 3D libraries load from a CDN.

## Built for crowds

- SQLite in WAL mode (`data/world.db`), safe for many writes at once and millions of houses.
- Every public response is cached, pre-compressed (Brotli/gzip) and tagged with an ETag, so repeat polls cost a tiny 304.
- `WORKERS=auto node server.js` runs one process per CPU core.
- Per-IP limits on API calls, registrations and walk heartbeats. Put Cloudflare in front: the API sends
  `s-maxage` headers, so the CDN absorbs traffic spikes.
- Live walk-mode presence is kept in memory by the primary process (not the database), so heartbeats never block.
- "This week" / "today" numbers come from hourly per-town tallies, so leaderboards stay fast at millions of houses.

### Tested at 1,000,000 houses (3,089 towns, Tokyo 77,489 houses)

| | result |
| --- | --- |
| Seeding 1,000,000 houses | 2.7 minutes; database 144 MB |
| API, 300 simultaneous visitors, one process | ~27,000–29,500 requests/s, p95 16 ms (0.6% connection resets from the test tool on one laptop) |
| World summary / all 3,089 towns | instant / 73 KB compressed |
| Tokyo (77,489 houses) | 0.8 MB compressed; rebuilt on the server at most every 15 s |
| Globe in the browser | 120 fps, 33 MB |
| Tokyo town view (level of detail: ~4,000 full houses near the camera, simple blocks beyond) | 120 fps, 120 MB (was 32 fps, 312 MB) |

Run it: `DATA_DIR=data-1m PORT=5193 node server.js`, then `DATA_DIR=data-1m WA_URL=http://localhost:5193 node scripts/stress.js 1000000 3089`.

### Tested at 50,000 houses (400 towns, Tokyo 5,696 houses)

Run it yourself on a separate copy, so your real data is untouched:

```bash
DATA_DIR=data-stress PORT=5190 node server.js
DATA_DIR=data-stress WA_URL=http://localhost:5190 node scripts/stress.js 50000
DATA_DIR=data-stress WA_URL=http://localhost:5190 node scripts/loadtest.js 300 15
```

| | result |
| --- | --- |
| Seeding 50,000 houses | 6 s |
| API, 300 simultaneous visitors, one process | ~2,300–8,000 requests/s depending on laptop load, p95 92–285 ms, 0 errors |
| Biggest town download (Tokyo) | 57 KB compressed, opens in 0.37 s |
| Globe in the browser | 105 fps, 35 MB |
| Tokyo town view | 104 fps, 109 MB |
| Walking in Tokyo | 82 fps |

## Admin dashboard

Open `/admin` and paste the admin token (`data/admin-token.txt`, or the `ADMIN_TOKEN` setting in production).
It shows totals, sign-ups per hour (48 h), top countries and towns this week, recent sign-ups, search, **Remove**
(hides the house and blocks the ID), **Restore**, **Reset device** (lets an owner re-link customisation from a new phone)
and **Export CSV**.

## Change the name / rules

Everything lives in `config.json`: `name` (e.g. "World Again" or "world.rebuild"), `tagline`,
`instagram`, `launchDate` (Day 1), the `milestones`, and:

- `maxHousesPerIp` (default 1): houses allowed per internet connection (IPv4 address, or IPv6 /64). 0 = no limit.
  Raw IPs are never stored, only a salted hash. Removing a house in /admin frees its connection.
- `trustProxy`: `false` when visitors connect directly; `"cloudflare"` behind Cloudflare; `true` behind another
  reverse proxy. **Set this correctly in production**, or every visitor looks like the proxy's IP (and with
  `false` behind a proxy, one house would be allowed for the whole world).

## Security

- New towns are confirmed server-side with the geocoder (the browser can't invent names or positions).
- Strict Content-Security-Policy, no framing, nosniff, HSTS in production.
- Walk mode shows an @ID only to the device that owns that house; everyone else appears as "guest".
- Per-IP rate limits, request size and time limits, timing-safe admin token, salted IP hashes.

## Turn Instagram comments into houses

The growth loop is "follow and comment your town". Export your post's comments to a CSV
with `username,comment` per line, then:

```bash
node scripts/import.js comments.csv --dry   # preview who goes where
node scripts/import.js comments.csv         # add them (server must be running)
```

The comment text is looked up as a town (Open-Meteo geocoder). Unmatched comments are listed.

## Famous places

`public/places.json` is built from Wikidata (CC0) by `node scripts/fetch-places.js`. Then `node scripts/fetch-elevations.js` adds real
elevations (mountains, volcanoes) and heights (towers, skyscrapers) so they are drawn at true size. Edit the
class list at the top of that script to add more kinds of places or lower the fame threshold.
Hand-made models: `public/landmarks-real*.js` (by name). Everything else: `public/placegen.js` (`kindOf()` picks the
building type from the name, `regionOf()` the architectural style).

## Files

| file | what |
| --- | --- |
| `server.js` | zero-dependency API + static server, SQLite in `data/world.db` |
| `public/main.js` | globe, towns, houses, labels, camera, panels |
| `public/landmarks.js` | the 62 wonders list, model dispatch |
| `public/landmarks-real*.js`, `public/wonders.js` | true-to-life models of the 62 wonders |
| `public/placegen.js` | regional-style models for all 7,221 other places |
| `public/lm-kit.js` | shared building kit + mesh merging |
| `public/town.js` | houses by growth stage, civic buildings, cars, lamps, free plots |
| `public/walk.js` | walk mode, character, joystick, live visitors |
| `public/festivals.js` | festival calendar and colours |
| `public/i18n.js` | interface translations |
| `public/admin.html` | admin dashboard (served at `/admin`) |
| `public/geo.json` | states, rivers, lakes, deserts, ranges (Natural Earth, built by `scripts/fetch-geo.js`) |
| `public/places.json` | 7,221 famous places from Wikidata |
| `scripts/` | seed, comment import, places fetch |

## Going live

**Render (recommended, ~$7/month):** push this folder to a GitHub repository, then on render.com choose
New → Blueprint and pick the repository. `render.yaml` sets everything up: Node 22, production mode, a 1 GB
persistent disk for the database, the right proxy setting and a generated admin token (copy it from the
Render dashboard to open `/admin`). Add your own domain under Settings → Custom Domains.

Private preview: set `ACCESS_GATE=1` and visitors must type the code in `data/access-code.txt` first.

Any other Node host works too (Railway, Fly.io, a VPS): set `NODE_ENV=production`, `ADMIN_TOKEN`, `PORT`,
`DATA_DIR` on a persistent disk and `TRUST_PROXY` (`true` behind a normal proxy, `cloudflare` behind Cloudflare).

Map credits: roads and map data © OpenStreetMap contributors via OpenFreeMap; Natural Earth (countries via world-atlas, states, rivers, regions), town search Open-Meteo (CC BY 4.0),
places Wikidata (CC0), Three.js (MIT).
