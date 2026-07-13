# Aegean Odyssey architecture

## Overview

The site is a conventional static multi-page website. HTML remains the source of truth for editorial content. JavaScript enhances navigation, maps, persistence and tools, but the daily guides and their core links remain understandable without JavaScript.

There is no bundler, framework, database or server-side application.

## Project structure

```text
index.html                         Homepage
essentials.html                    Essentials and Trip Toolkit
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
    trip-log.css                   Published Travel Log interface only
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
    trip-log.js                    Conditional Travel Log loader and renderer

data/
  trip-config.js                   Shared trip metadata and feature flags
  trip-log-index.js                Publication manifest
  trip-log/day-03.js               Unpublished Travel Log schema example
```

## CSS responsibilities and loading order

`assets/css/site.css` loads first on every visible page. It owns shared design tokens, the reset, typography, the fixed navigation, theme controls, footer and homepage components. Homepage styles remain in this file for now because their cascade is closely coupled to the shared hero/navigation foundation.

Daily pages then load:

1. `assets/css/site.css`
2. `assets/css/day-page.css`
3. `assets/css/trip-log.css`

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

All behavior scripts use private function scopes. The deliberate public configuration objects are `window.TRIP_CONFIG`, `window.TRIP_LOG_INDEX` and, only while a published entry is loading, `window.TRIP_LOG_DAY`.

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

The Travel Log is disabled in two layers:

1. `data/trip-config.js` has `features.travelLog: false`.
2. Every day in `data/trip-log-index.js` has `published: false`.

While the feature flag is false, `trip-log.js` returns immediately and does not alter visible navigation or day pages. Per-day content is never loaded unless the global feature is enabled and that exact day is published.

To publish a future entry:

1. Add `data/trip-log/day-0X.js` using the Day 3 schema.
2. Add optimized images under `assets/images/trip-log/`.
3. Set that day to `published: true` in `data/trip-log-index.js`.
4. Set `features.travelLog` to `true` in `data/trip-config.js`.
5. Test the day normally and with `#travel-log`.

This is exposure reduction, not access control. Anything committed to the public repository can be requested directly.

## Adding another trip day

1. Copy `day-template.html` into `days/` and adjust all relative paths to begin with `../`.
2. Give the body a unique stable `data-trip-day`, for example `day-08`.
3. Preserve unique tab and panel IDs and their ARIA relationships.
4. Add the day to `data/trip-config.js`, including its page path and route information.
5. Update previous/next links on the neighboring daily pages.
6. Add the homepage journey card and any route-overview link.
7. Add a `published: false` entry to `data/trip-log-index.js`.
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

## GitHub Pages

No build command is required. In the repository’s GitHub settings, configure Pages to deploy the repository root from the intended branch. Relative URLs are used throughout, so the project remains compatible with the `/greececousintrip/` project path.
