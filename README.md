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

## Deployment

The site is designed for GitHub Pages. Publish the repository root from the chosen branch in **Settings → Pages**. All internal links are relative, so the site works beneath the repository path as well as on a custom domain.

No API keys, build output or package installation are required.
