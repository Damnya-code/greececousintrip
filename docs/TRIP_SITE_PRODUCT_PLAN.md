# Trip Microsite Product Plan

## Working idea

Turn the existing **Aegean Odyssey** project into a reusable system for creating polished, private trip microsites.

The product should sit between:

- a plain PDF or shared document,
- a generic itinerary application,
- and an expensive fully custom website.

The emphasis is not on replacing booking systems or navigation apps. The emphasis is on presenting a trip clearly, beautifully, and usefully before, during, and after travel.

---

## Core positioning

> A personal trip website with daily plans, maps, practical tools, and an optional travel log — without the cost or complexity of a fully custom web project.

Possible audiences:

- families and friend groups,
- destination weddings,
- retreats and small organised trips,
- boutique travel advisers,
- clubs and associations,
- company off-sites,
- premium personal travel planning.

---

## Immediate objective

Refactor the current Greece project so that it is:

- easier to maintain,
- easier to reuse,
- less dependent on duplicated code,
- visually unchanged,
- ready for a future Travel Log,
- ready to become a template later.

This is a maintenance phase, not a redesign.

---

## Refactoring principles

1. Preserve the current appearance and behaviour.
2. Avoid a framework rewrite.
3. Keep GitHub Pages compatibility.
4. Remove obsolete and overridden CSS.
5. Move inline styling into scoped stylesheets.
6. Separate shared behaviour from page-specific behaviour.
7. Keep content understandable without tracing through many files.
8. Introduce data files only where they genuinely reduce repetition.
9. Do not convert every static page into client-side rendering.
10. Make one safe, reviewable change at a time.

---

## Proposed project structure

```text
/
├── index.html
├── essentials.html
├── days/
│   ├── day-1-athens-arrival.html
│   ├── day-2-acropolis-ferry.html
│   └── ...
├── assets/
│   ├── css/
│   │   ├── tokens.css
│   │   ├── base.css
│   │   ├── navigation.css
│   │   ├── index.css
│   │   ├── day-page.css
│   │   ├── essentials.css
│   │   └── travel-log.css
│   ├── js/
│   │   ├── theme.js
│   │   ├── navigation.js
│   │   ├── index.js
│   │   ├── day-page.js
│   │   ├── essentials.js
│   │   ├── toolkit.js
│   │   └── travel-log.js
│   └── images/
├── data/
│   ├── trip.js
│   ├── days.js
│   ├── toolkit.js
│   ├── phrases.js
│   └── travel-log.js
├── docs/
│   ├── ARCHITECTURE.md
│   └── PRODUCT_PLAN.md
└── README.md
```

The exact final structure may differ after inspecting the repository. The goal is clear responsibility, not creating folders for their own sake.

---

## Refactor phases

### Phase 1 — Baseline and cleanup

- Record the current expected behaviour.
- Identify duplicate and superseded CSS.
- Remove unused selectors and variables carefully.
- Move inline Essentials hero styling into `essentials.css`.
- Fix small content and markup inconsistencies.
- Confirm light mode, dark mode, desktop, and mobile still match.

### Phase 2 — Separate responsibilities

- Split shared styles from index, day-page, and Essentials styles.
- Split shared navigation behaviour from page-specific scripts.
- Keep the Travel Toolkit in its own module.
- Keep checklist state and day navigation independent.
- Avoid global variables where practical.

### Phase 3 — Shared trip data

Create a central trip definition for information reused in several places:

- trip title,
- dates,
- destinations,
- day IDs,
- page paths,
- map links,
- coordinates,
- feature flags.

Do not move long editorial page content into JavaScript unless it creates a clear maintenance benefit.

### Phase 4 — Documentation

Document:

- file responsibilities,
- shared design tokens,
- script load order,
- how to add a new day,
- how to change trip dates,
- how to enable the Travel Log,
- how to deploy to GitHub Pages.

### Phase 5 — Template preparation

After the Greece project is stable:

- identify Greece-specific assumptions,
- create a neutral sample trip,
- introduce theme and content configuration,
- create a repeatable build or copy workflow,
- test a second project before calling it a template.

---

## Travel Log direction

The Travel Log should be a photo-first chronological record that complements the permanent itinerary without turning each day into a structured report.

Possible content per day:

- photographs and collages,
- short standalone captions,
- brief notes,
- optional multi-paragraph journal writing,
- memorable quotes,
- optional place links.

Example data shape:

```js
{
  dayId: "day-03",
  state: "published",
  date: "2026-10-12",
  place: "Chania",
  blocks: [
    {
      type: "photo",
      presentation: "full",
      src: "assets/log/day-03/01-harbour.webp",
      alt: "Chania harbour shortly after sunrise",
      width: 2200,
      height: 1467
    },
    {
      type: "caption",
      text: "First coffee after leaving the ferry."
    }
  ]
}
```

Feature flag:

```js
const tripFeatures = {
  travelLog: false
};
```

The log remains hidden until it has real content.

---

## Product strategy

### Recommended first model

Start as a **low-cost productised service**, not a full SaaS platform.

The customer provides:

- trip dates,
- itinerary,
- locations,
- photos,
- links,
- optional colour preference.

The service produces:

- landing page,
- daily itinerary pages,
- maps and practical links,
- mobile layout,
- optional checklist,
- optional post-trip log.

This avoids initially building:

- user accounts,
- a visual editor,
- databases,
- payments inside the product,
- complex permissions,
- multi-user collaboration,
- app-store applications.

---

## Affordable pricing hypothesis

The initial prices should be deliberately accessible while the workflow is still being tested.

These are experimental starting points, not permanent prices.

### Option A — Template

- Basic downloadable template: **€19–39**
- Expanded template with documentation and multiple themes: **€49–79**

### Option B — Assisted setup

- Customer supplies completed content form: **€99–199**
- Includes deployment and light customisation.

### Option C — Custom trip microsite

- Standardised custom setup: **€250–500**
- Additional bespoke design or content work quoted separately.

### Option D — Professional or white-label use

- Later, after the system is proven: **€600–1,200+**
- Intended for advisers, retreats, weddings, or repeat commercial use.

The affordable angle should come from standardisation and a controlled scope, not from doing unlimited bespoke work cheaply.

---

## Value proposition for the affordable version

> More personal and attractive than a shared document, easier than building a website, and much cheaper than commissioning a fully bespoke project.

Potential inclusions:

- one visual theme,
- up to seven days,
- standard page components,
- supplied text and images,
- GitHub Pages or simple static hosting,
- one revision round,
- no custom backend.

Potential paid extras:

- additional days,
- copy editing,
- custom theme,
- photo preparation,
- travel log,
- custom domain setup,
- later itinerary updates.

---

## Commercial validation plan

1. Finish the Greece project and Travel Log.
2. Refactor it into a reliable reusable base.
3. Build one second demo with a different visual identity.
4. Create a small landing page explaining the offer.
5. Test an inexpensive introductory package.
6. Ask early users which parts they value and which confuse them.
7. Measure the actual time needed per project.
8. Raise or restructure pricing only after learning the delivery cost.
9. Avoid building a self-service editor before completing several real projects.

---

## Success criteria

The refactor is successful when:

- the current site looks and behaves the same,
- duplicated CSS is substantially reduced,
- each file has a clear responsibility,
- shared data is defined once,
- a new day can be added predictably,
- the Travel Log can be enabled without restructuring the site,
- a second trip can be created without copying the entire codebase blindly,
- another developer can understand the project from the documentation.

---

## Current decision

Proceed with:

1. maintenance refactor,
2. architecture documentation,
3. Travel Log implementation,
4. second demo,
5. low-cost market test.

Do not yet build:

- a full travel-planning SaaS,
- user accounts,
- booking integrations,
- supplier management,
- payment processing,
- a complex visual editor.
