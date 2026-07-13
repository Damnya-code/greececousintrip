# Aegean Odyssey architecture

## Overview

The site is a conventional static multi-page website. HTML remains the source of truth for editorial content. JavaScript enhances navigation, maps, persistence and tools, but the daily guides and their core links remain understandable without JavaScript.

There is no bundler, framework, database or server-side application.

## Project structure

```text
index.html                         Homepage
essentials.html                    Essentials and Trip Toolkit
travel-log.html                    Hidden chronological Travel Log feed
day-template.html                  Reference markup for another day

days/
  day-1-athens-arrival.html        Current daily guides
  ...
  day-7-knossos.html
  day-01-*.html                    Legacy compatibility redirects

assets/
  css/
    site.css                       Shared tokens, base, navigation and homepage
    day-page.css                   Daily-guide layout, capsules and route maps
    essentials.css                 Essentials layout and outer capsules
    trip-toolkit.css               Toolkit-only components
    trip-log.css                   Travel Log feed and block presentations only
  js/
    theme.js                       Theme initialization and toggle
    home.js                        Homepage scrolling and journey reveals
    booking-checklist.js           Homepage booking checklist persistence
    day-navigation.js              Enhanced Days chooser
    day-route-map.js               Timeline labels and generated offline map
    day-page.js                    Day reveals, capsules, hashes and nav visibility
    essentials.js                  Essentials outer capsules and hashes
    essentials-checklist.js        Essentials checklist persistence
    trip-toolkit.js                Maps, weather, translate, speech and OCR
    trip-log.js                    Travel Log visibility, loading and block rendering

  log/
    README.md                      Media naming and preparation guidance
    day-0X/                        Future per-day Travel Log media

data/
  trip-config.js                   Shared trip metadata and feature flags
  trip-log-index.js                Publication manifest
  trip-log/day-03.js               Temporary draft block-model prototype
```

## CSS responsibilities and loading order

`assets/css/site.css` loads first on every visible page. It owns shared design tokens, the reset, typography, the fixed navigation, theme controls, footer and homepage components. Homepage styles remain in this file for now because their cascade is closely coupled to the shared hero/navigation foundation.

Daily pages then load:

1. `assets/css/site.css`
2. `assets/css/day-page.css`

The dedicated Travel Log page loads `site.css` followed by `trip-log.css`. Daily pages do not load Travel Log presentation styles while the feature is disabled.

Essentials loads:

1. `assets/css/site.css`
2. `assets/css/essentials.css`
3. `assets/css/trip-toolkit.css`

Later files may refine shared tokens for their page, but should not redefine unrelated homepage components. Light and dark values stay beside the component that uses them. Reduced-motion rules remain in the relevant component file.

## JavaScript loading order

`assets/js/theme.js` runs in the document head so the stored theme is applied before the page paints. It also creates the theme control when the DOM is ready.

Homepage scripts, loaded at the end of `body`:

1. `data/trip-config.js`
2. `data/trip-log-index.js`
3. `assets/js/trip-log.js`
4. `assets/js/booking-checklist.js`
5. `assets/js/home.js`

Daily-page scripts:

1. `data/trip-config.js`
2. `data/trip-log-index.js`
3. `assets/js/trip-log.js`
4. `assets/js/day-navigation.js`
5. `assets/js/day-route-map.js`
6. `assets/js/day-page.js`

Essentials scripts:

1. `data/trip-config.js`
2. `assets/js/essentials.js`
3. `assets/js/essentials-checklist.js`
4. `assets/js/trip-toolkit.js`

Travel Log scripts:

1. `data/trip-config.js`
2. `data/trip-log-index.js`
3. `assets/js/trip-log.js`

All behavior scripts use private function scopes. The deliberate public configuration objects are `window.TRIP_CONFIG`, `window.TRIP_LOG_INDEX` and the temporary `window.TRIP_LOG_ENTRIES` registry while eligible day files load.

## Shared trip data

`data/trip-config.js` is the single source for:

- trip name and dates
- Travel Log feature state
- stable day IDs, numbers, short titles and page paths
- homepage booking checklist items
- day timeline labels used as progressive enhancement
- day route titles, Google Maps links, coordinates and map points
- Toolkit weather coordinates and extra map destinations

Editorial introductions, schedules, highlights, food and practical guidance stay in the daily HTML files. This keeps each page readable and avoids rendering the main content through JavaScript.

## Day navigation

Every daily page contains a normal **All days** link. `day-navigation.js` replaces that link with the enhanced Days chooser only when both `data-trip-day` and matching shared configuration are available. If JavaScript or configuration fails, the original link remains usable.

The enhanced control provides previous and next shortcuts, a dropdown of all days, current-page indication, outside-click closing and Escape-to-close with focus restoration.

Bottom previous/all/next pagination remains normal HTML.

## Capsule panels

Daily capsules are managed by `day-page.js`; Essentials capsules are managed by `essentials.js`. Both systems:

- use `role="tablist"`, `role="tab"` and `role="tabpanel"`
- keep only the selected panel visible
- support arrow, Home and End keys
- activate matching URL hashes
- update history without reloading
- restore the correct panel during browser back/forward navigation

Daily route overviews sit outside the capsule panels and therefore remain visible regardless of the selected topic.

## Checklist persistence

The homepage checklist uses the key `aegeanBookings` and stores the indexes of checked booking items.

The Essentials checklist uses `aegeanEssentialsChecklist:v1` and stores a boolean value for each `data-item` ID. The version suffix allows a future schema change without misreading older data.

Both checklists are device-local. They do not transmit or synchronize data.

## Trip Toolkit

`trip-toolkit.js` owns four progressively enhanced modes:

- Maps: route filtering, embedded preview and Google Maps launch
- Weather: Open-Meteo requests using shared coordinates
- Translate: local phrasebook, browser speech synthesis/recognition and Google Translate fallback
- Photo scan: user-initiated client-side OCR using Tesseract.js loaded on demand

Route and weather data come from `data/trip-config.js`. Phrase data stays in the Toolkit script because it is feature-specific and not general trip metadata. OCR is not loaded until requested.

## Travel Log

The Travel Log is a dedicated chronological feed at `travel-log.html`. It is intentionally separate from the itinerary capsule system: itinerary pages remain the permanent plan, while the log renders photo-first chapters from ordered blocks.

### Visibility and entry states

The central switch remains `features.travelLog` in `data/trip-config.js`. Each manifest entry in `data/trip-log-index.js` also has one state:

- `hidden`: never loaded or rendered, including local preview.
- `draft`: loaded only through the documented local preview.
- `published`: eligible for the public feed when the central feature is enabled.

With the central flag false, normal homepage and daily-page navigation remains unchanged and `travel-log.html` returns to the itinerary. Day content files are loaded only when their state is eligible for the current mode.

For local draft review, serve the repository and open:

```text
http://127.0.0.1:5500/travel-log.html?preview=travel-log
```

The preview query is accepted only on `localhost` and `127.0.0.1`. It is a workflow guard, not authentication. Static files committed to a public repository remain directly requestable.

Do not commit a sensitive draft merely because its manifest state is `draft`. Keep genuinely private writing and media outside the public repository until it is ready for publication.

### Content model

Each `data/trip-log/day-0X.js` file registers one versioned entry containing minimal metadata and an ordered `blocks` array. The renderer validates the entry and block type, skips malformed or unsupported blocks and creates content with DOM APIs rather than injecting uncontrolled HTML.

Supported blocks:

- `photo`: one photograph using `full`, `contained`, `portrait` or `quiet` presentation.
- `collage`: one to five images using a named editorial preset.
- `sequence`: a contained touch-scrollable photographic sequence.
- `caption`: a short standalone line.
- `note`: a short note or optional heading plus an array of journal paragraphs.
- `quote`: quoted text and optional attribution.
- `video`: user-controlled video with optional poster and caption; no autoplay.
- `pause`: a restrained divider and optional label.
- `place`: optional place name, note and external map link.

Collage presets are `two-up`, `feature-left`, `feature-right` and `film-strip`. Mobile reduces these to logical single-column reading order rather than preserving fragile desktop geometry.

All fields beyond `dayId`, `state`, `date`, `place` and at least one valid block are optional. Empty fields do not create headings or containers. Ordered array position remains the source of reading order. Each rendered block receives a stable ID derived from its day and array position unless it supplies a valid explicit `moment-*` ID.

### Loading and navigation

`trip-log.js` has two responsibilities within one feature boundary:

1. On normal pages, add Travel Log navigation only when the central flag is enabled and at least one manifest entry is published.
2. On `travel-log.html`, load only eligible per-day files and render their blocks in shared trip-day order.

The sticky header provides previous and next chapter controls, a current-day chooser and a contextual Day Guide link. It lists only entries eligible under the active publication or local-preview rules. An `IntersectionObserver` updates the active chapter as the feed scrolls without continuously changing browser history; anchors such as `#day-03` remain directly linkable.

Each chapter ends with a clearer guide link and a next-chapter or intentional end state. A draft or still-growing feed uses `Latest chapter`; a published entry matching the final configured trip day uses `End of the Travel Log`. Ordinary log editing never requires editing HTML.

### Media and performance

Future media belongs in `assets/log/day-0X/`. Recommended names start with their sequence number, for example `01-arrival.webp`. Prefer WebP or AVIF, use 1600–2400 pixels on the long edge for major images, provide actual width and height, and add responsive `sources` for image-heavy chapters.

Only the first opening image receives eager loading and high fetch priority. Later photographs use lazy loading and asynchronous decoding. Videos use `preload="metadata"`; optional heavy media is not initialized globally. The renderer skips media marked `private: true`, but genuinely private files must never be committed.

### Accessibility

Non-decorative photographs require alt text or are skipped. Captions use `figure` and `figcaption`, collages retain source reading order and expose a group label, and visual overlap never changes DOM order. Focus styles use the shared coral accent, video controls remain native, text over imagery is avoided for long copy, and reveal motion is disabled under `prefers-reduced-motion`.

The content-focused editing workflow and copyable examples are in `docs/TRAVEL_LOG_GUIDE.md`.

Deferred work includes real trip media, an image-optimization command, video caption tracks, the controlled no-code editor and any authenticated/private distribution approach. The future editor will select from the renderer's controlled block, presentation and layout values rather than writing HTML, CSS coordinates or arbitrary layout dimensions. No upload system, database or social interaction is planned in this static phase.

## Adding another trip day

1. Copy `day-template.html` into `days/` and adjust all relative paths to begin with `../`.
2. Give the body a unique stable `data-trip-day`, for example `day-08`.
3. Preserve unique tab and panel IDs and their ARIA relationships.
4. Add the day to `data/trip-config.js`, including its page path and route information.
5. Update previous/next links on the neighboring daily pages.
6. Add the homepage journey card and any route-overview link.
7. Add a `state: "hidden"` entry to `data/trip-log-index.js`.
8. Test the fallback All Days link with JavaScript disabled, then test the enhanced chooser.

## Updating destination and route data

Edit the matching day in `data/trip-config.js`:

- `route.mapsUrl` controls the Toolkit’s external Maps action.
- `route.points` controls the coordinate-projected daily map.
- `route.minimumExtent` prevents tightly grouped city stops from collapsing into an unreadable cluster.
- `toolkit.weatherLocations` controls live weather destinations.

The visible route descriptions and daily stop links remain in HTML and should be updated when their editorial wording changes.

## Local testing

From the repository root:

```powershell
py -m http.server 5500
```

Open `http://127.0.0.1:5500/index.html`. Test at least:

- homepage actions, cards and both checklists
- all seven daily pages and every capsule
- direct panel hashes and browser back/forward
- Days menu, outside click and Escape
- generated route maps
- Essentials Maps, Weather, Translate and Photo scan fallbacks
- light and dark modes
- reduced motion
- narrow mobile widths without horizontal scrolling

### Automated smoke tests

The repository has a small Playwright suite under `tests/`. It runs against Chromium and starts `tests/static-server.js` automatically, so no development server or build step is required.

Install the dependency and Chromium once:

```powershell
npm.cmd install
npx.cmd playwright install chromium
```

Run the suite:

```powershell
npm.cmd test
```

`npm.cmd run test:smoke` runs the same suite explicitly. Tests cover the homepage, Essentials, all seven daily pages, the representative Day 1 capsule and Days-menu flows, persistence, deterministic mocked weather, ARIA state, and responsive overflow at 320, 390, 768 and 1440 pixels wide.

External map embeds, Google Translate, live internet availability, decorative animation timing, OCR accuracy, speech recognition and pixel-level appearance are intentionally outside this smoke suite. Travel Log tests use the local-only draft preview and do not publish the feature. Manual visual review remains appropriate after CSS changes.

When adding a trip day, add its current page filename to `DAY_PAGES` in `tests/smoke.spec.js`. Keep the deeper interaction scenario on one representative page unless the new day introduces unique behavior that warrants its own test.

## GitHub Pages

No build command is required. In the repository’s GitHub settings, configure Pages to deploy the repository root from the intended branch. Relative URLs are used throughout, so the project remains compatible with the `/greececousintrip/` project path.
