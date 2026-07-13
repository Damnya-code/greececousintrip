# Editing the Travel Log

The Travel Log is edited through small data files. You do not need to edit HTML or understand CSS Grid.

## Preview the current draft

Start the normal local server and open:

```text
http://127.0.0.1:5500/travel-log.html?preview=travel-log
```

Draft preview works only on `localhost` or `127.0.0.1`. A normal public visit follows the central feature flag and publication state.

## Add a day

1. Create `assets/log/day-03/` using the matching day number.
2. Add web-sized images with ordered names such as `01-harbour.webp`.
3. Copy `data/trip-log/day-03.js` to the matching day filename.
4. Change `dayId`, `date`, `place` and the ordered `blocks` array.
5. Add the matching file and state to `data/trip-log-index.js`.
6. Preview locally before publishing.

A day needs only minimal metadata and one valid block:

```js
entries["day-03"] = {
  version: 2,
  dayId: "day-03",
  state: "draft",
  date: "2026-10-12",
  place: "Chania",
  blocks: [
    {
      type: "photo",
      presentation: "full",
      src: "assets/log/day-03/01-harbour.webp",
      alt: "Morning light across Chania's Venetian Harbour",
      width: 2200,
      height: 1467
    }
  ]
};
```

Everything beyond that is optional. Remove unused fields and blocks rather than leaving empty strings.

## Photographs

Presentations are `full`, `contained`, `portrait` and `quiet`.

```js
{
  type: "photo",
  presentation: "portrait",
  src: "assets/log/day-03/02-market.webp",
  alt: "A fruit seller arranging oranges at Chania market",
  caption: "The stop that was meant to take five minutes.",
  location: "Chania market",
  width: 1600,
  height: 2400,
  focalPoint: "48% 35%",
  crop: true
}
```

Use `focalPoint` only when `crop: true` is intentional. Values such as `"50% 30%"` keep the important part of the image visible.

Write alt text that explains what can be seen. Do not repeat the caption. For a purely decorative image, set `decorative: true`; otherwise an image without alt text is skipped.

## Collages

Available layouts:

- `two-up`
- `feature-left`
- `feature-right`
- `film-strip`
- `scrapbook`

Use one to five images. Mobile automatically simplifies the composition.

```js
{
  type: "collage",
  layout: "feature-left",
  label: "Harbour walk and breakfast",
  images: [
    {
      src: "assets/log/day-03/03-harbour-walk.webp",
      alt: "The lighthouse seen from Chania's harbour wall",
      width: 2200,
      height: 1467
    },
    {
      src: "assets/log/day-03/04-bougatsa.webp",
      alt: "Warm bougatsa dusted with cinnamon",
      caption: "Breakfast eventually.",
      width: 1600,
      height: 1200
    }
  ]
}
```

For a swipeable chronological group, use `type: "sequence"` with the same `label` and `images` fields.

## Captions and notes

A short standalone caption:

```js
{
  type: "caption",
  text: "We missed the beach and found a better table instead."
}
```

A short note:

```js
{
  type: "note",
  text: "The rental pickup took longer than expected, so the afternoon became coffee and Old Town."
}
```

A longer journal entry:

```js
{
  type: "note",
  heading: "The slower arrival",
  paragraphs: [
    "First paragraph of the journal entry.",
    "Second paragraph placed between the photographs.",
    "A final paragraph, if the day genuinely needs one."
  ]
}
```

The renderer treats all writing as plain text. Do not add HTML tags.

Add an optional ID such as `id: "moment-harbour-sunset"` to any block when it needs a direct URL anchor. IDs must begin with `moment-` and contain only lowercase letters, numbers and hyphens.

## Quotes, comparisons and places

```js
{
  type: "quote",
  text: "This was definitely the correct amount of breakfast.",
  attribution: "Recorded at the table"
}
```

```js
{
  type: "comparison",
  planned: "Marathi Beach before dinner.",
  actual: "Coffee, Old Town and considerably less driving."
}
```

```js
{
  type: "place",
  name: "Chania Old Town",
  note: "First long walk after the ferry.",
  mapUrl: "https://www.google.com/maps/search/?api=1&query=Chania+Old+Town"
}
```

These are optional secondary details. Photographs should remain the main structure.

## Video and pauses

Videos do not autoplay and load only metadata initially:

```js
{
  type: "video",
  src: "assets/log/day-03/05-harbour.webm",
  poster: "assets/log/day-03/05-harbour-poster.webp",
  alt: "Fishing boats moving through Chania Harbour",
  caption: "A quiet minute near the lighthouse.",
  tracks: [
    {
      src: "assets/log/day-03/05-harbour-en.vtt",
      kind: "captions",
      srclang: "en",
      label: "English",
      default: true
    }
  ]
}
```

Add captions or a text description when a real video needs them. A quiet visual break is simpler:

```js
{
  type: "pause",
  text: "Evening"
}
```

## Image preparation

- Prefer WebP or AVIF.
- Use roughly 1600–2400 pixels on the long edge for primary images.
- Keep portrait images genuinely portrait where possible.
- Record real `width` and `height` values to prevent layout shift.
- Use ordered, descriptive filenames.
- Keep full-resolution originals outside the repository.
- Do not commit passport details, booking references, access information, unwanted licence plates or photographs the group has not approved.

For responsive variants, add a `sources` array with normal HTML `srcset` values. The original `src` remains the fallback.

## Publish an entry

1. Replace all temporary prototype content.
2. Change the entry's `state` from `"draft"` to `"published"`.
3. Change the same day to `state: "published"` in `data/trip-log-index.js`.
4. Enable `features.travelLog` in `data/trip-config.js`.
5. Run `npm.cmd test` and review the page on a phone-sized viewport.

`hidden`, `draft` and `published` control normal loading and navigation; they are not authentication. Anything committed to a public repository can be requested directly. Truly private media must stay outside the repository.
