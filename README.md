# ALL SUITE · Sapporo 2026

Compact, static travel PWA for 29 October–4 November 2026. No build step, runtime dependencies, remote fonts, analytics or embedded maps.

- Seven day tabs, Days / Bookings / Places navigation, burgundy / black / gold styling and the original AS emblem.
- `itinerary.json` is the single source for the original arrangements. All 14 arrangements remain locked; the two airport records use owner-supplied scheduled times. Known times sort chronologically; untimed/all-day records are separate. Scheduled arrival at New Chitose Airport (CTS): 29 October, 15:00 JST. Scheduled departure from CTS: 4 November, 16:00 JST. Flight numbers and personal ticket details are not displayed.
- Flexible activities have specific alternatives and Keep / Swap / Skip choices. The original `allsuite-v3-<day>-<item>` keys remain supported; optional food stops use stable IDs. Booking records never read or write choice state. Storage failure falls back to the open page with a visible warning.
- `foods.json` includes six optional stops, verified branch addresses, map queries, source links and conditional day suggestions. These are not reservations or additions to the timed schedule.

## Location verification

Checked against published sources on 28 October 2026 (Hong Kong time):

| Stop | Location source | Suggested fit |
| --- | --- | --- |
| Kitakaro Sapporo Honkan | https://www.kitakaro.com/ext/tenpo/sapporohonkan.html | 2 Nov, central Sapporo after kimono appointment |
| Café & Bar 日晴堂 | https://www.hibarido.jp/ | 2 Nov, near Tanukikoji |
| Donguri Odori | https://www.donguri-bake.co.jp/shop-list | 2 Nov, Le Trois / Odori |
| Sandria main shop | https://www.s-sandwich.com/ | 31 Oct, optional Nakajima Park / Gokoku Shrine detour |
| あべ養鶏場 えっぐぷりん | https://www.hkiosk.co.jp/shop/abe-youkei-eggpudding/ | 4 Nov, only if departure route and timing allow Sapporo Station |
| HOKUDAI MARCHE Café & Labo | https://marche-cafelabo.com/ | 30 Oct, optional north-of-station detour with Suwa Shrine |

日晴堂's French toast was requested but could not be verified; the previous guide said French crêpes. The app explicitly asks to check the current menu. No food visit time, reservation, transit duration or concert venue is invented. Current shop hours can change; the official Hokudai page takes precedence over older tourism listings.

## Offline behavior

`sw.js` atomically caches the shell, original emblem, icons, manifest and both data files. Same-origin core files are served from the release cache, minimizing repeat downloads. External links are fetched only when opened. A cache miss never returns HTML for JSON, scripts or images. Only old ALL SUITE version caches are removed.

Bump `VERSION` in `sw.js` for each core-file release. The readiness button asks the controlling worker to verify every required asset, including the itinerary. A newly installed worker takes control; reload to display a newly available version. Browser storage can be evicted, so check readiness before travel. Saved choices are device-local, not synced or backed up.

On iPhone, use Safari → Share → Add to Home Screen, open the installed app online once, then check readiness and test airplane mode. HTTPS is required outside localhost. Physical iPhone installation still needs a device check; automated tests use Chromium.

## Validation

Install Playwright in your development environment (`npm install --no-save playwright`). Chromium must be installed; set `CHROMIUM_PATH` if it is not `/usr/bin/chromium`.

Serve the repository parent directory:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory ..
```

Then, from this repository:

```sh
node --check app.js
node --check sw.js
node tests/mobile.cjs
node tests/upgrade.cjs
git diff --check
```

`TEST_URL` can override `http://127.0.0.1:8765/allsuite/`. `SCREENSHOT_PATH` optionally saves a mobile screenshot. Tests cover all seven tabs at 320/390/430/768px, 14 locked arrangements with scheduled CTS times, chronology, Keep/Swap/Skip persistence and legacy keys, offline reload and navigation, missing-cache detection and itinerary repair, unavailable local storage, and an actual v3→v5 service-worker upgrade under the GitHub Pages subpath.

The original baseline commit is retained in the tests for booking and upgrade regression checks. Public repository: never add personal reservation codes. This change is intended for pull-request review; merging/deploying requires owner approval.
