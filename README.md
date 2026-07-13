# Aegean Odyssey

A static trip microsite for a seven-day Greece itinerary through Athens, Crete and Santorini. The project uses semantic HTML, plain CSS and vanilla JavaScript so it can run directly on GitHub Pages without a build step.

## Local preview

Serve the repository root over HTTP. For example:

```powershell
py -m http.server 5500
```

Then open `http://127.0.0.1:5500/index.html`.

Opening files directly with `file://` is not recommended because browser security rules can affect scripts and future Travel Log loading.

## Main entry points

- `index.html` — homepage, route, daily guide and booking checklist
- `essentials.html` — Trip Toolkit, packing checklist and route overview
- `days/day-1-athens-arrival.html` through `days/day-7-knossos.html` — daily guides
- `data/trip-config.js` — shared trip, day, map, weather and feature configuration
- `docs/ARCHITECTURE.md` — maintenance and extension guide

Additional Travel Log entry points:

- `travel-log.html` - hidden photo-first Travel Log feed
- `docs/TRAVEL_LOG_GUIDE.md` - copyable editing examples

The Travel Log remains publicly disabled. To inspect its temporary draft prototype locally, open `http://127.0.0.1:5500/travel-log.html?preview=travel-log` after starting the preview server.

## Deployment

The site is designed for GitHub Pages. Publish the repository root from the chosen branch in **Settings → Pages**. All internal links are relative, so the site works beneath the repository path as well as on a custom domain.

No API keys, build output or package installation are required to preview or deploy the website. The optional smoke-test workflow below installs development-only test tooling.

## Browser smoke tests

The maintenance suite uses Playwright with headless Chromium. Install its small test dependency and browser once:

```powershell
npm.cmd install
npx.cmd playwright install chromium
```

Run the complete suite with either command:

```powershell
npm.cmd test
npm.cmd run test:smoke
```

Playwright starts and stops the repository's lightweight Node static server automatically on `http://127.0.0.1:4173`; do not start a preview server first. The suite covers core page loading, local assets, homepage persistence and theme switching, daily capsules and navigation, Essentials and Toolkit behavior, mocked weather responses, accessibility-oriented state, and four responsive viewport sizes.

The suite intentionally does not test decorative animation timing, external Google Maps or Translate behavior, speech recognition, OCR accuracy, live weather availability, pixel-perfect screenshots, or the disabled Travel Log interface.
