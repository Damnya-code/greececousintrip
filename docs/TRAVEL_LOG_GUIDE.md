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

Use one to five images. Mobile automatically simplifies the composition.

Choose the smallest layout that suits the photographs:

- `two-up` pairs two images of similar importance. It tolerates different ratios and is useful for a place/detail or light/dark comparison.
- `feature-left` gives the first image more weight, with up to two supporting images on the right.
- `feature-right` mirrors that emphasis when the dominant photograph reads better from the opposite side.
- `film-strip` creates a compact chronological run of three to five images. Natural ratios are preserved unless an individual image explicitly uses `crop: true`.

On screens up to 760px, every collage becomes one column in its original data order. Desktop overlap and asymmetry are intentionally removed rather than squeezed onto a phone.

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

## Captions, notes and journal writing

Use `caption` for a short, reel-like line that can stand between images without a title:

```js
{
  type: "caption",
  text: "First coffee after leaving the ferry."
}
```

Use `note` for a brief observation. It does not need a heading:

```js
{
  type: "note",
  text: "The road looked shorter on the map."
}
```

For a longer journal or blog passage, keep using `note` with an ordered array of plain-text paragraphs. The heading remains optional:

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

## Quotes and places

```js
{
  type: "quote",
  text: "This was definitely the correct amount of breakfast.",
  attribution: "Recorded at the table"
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

## Travel Log navigation

The sticky Travel Log header is generated from the entries that are eligible for the current public or local-preview mode. It provides:

- the previous available log chapter
- a current-day chooser containing only available chapters
- the next available log chapter
- a Day Guide link that follows the chapter currently in view

The active chapter changes as the reader scrolls, without continuously rewriting browser history. Direct hashes such as `#day-03` still open the matching chapter. At the end of each chapter, `Open Day 3 Guide` returns to the permanent itinerary and `Continue to Day 4` moves to the next available log entry.

Ordinary editing never requires changing this navigation. The local no-code editor at `editor/index.html` exposes the controlled photo presentations and collage layouts documented here; it does not require direct CSS editing or free-position coordinates.

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
- For landscape photographs, aim for about `1920 × 1080` to `2200 × 1467` pixels. A full-width opener benefits from the upper end of that range.
- For portrait photographs, aim for about `1400 × 2100` to `1600 × 2400` pixels. Keep the original portrait orientation rather than creating a tall crop from a wide photograph.
- Keep repository derivatives to roughly 2400 pixels on the long edge at most. Larger camera originals add download weight without a visible benefit on this layout.
- Record real `width` and `height` values to prevent layout shift.
- Use ordered, descriptive filenames.
- Keep full-resolution originals outside the repository.
- Do not commit passport details, booking references, access information, unwanted licence plates or photographs the group has not approved.

For responsive variants, add a 960-pixel derivative for phones and a 1920–2400-pixel fallback for larger screens. Put both in a `sources` array with normal HTML `srcset` values; the original `src` remains the fallback.

```js
sources: [{
  type: "image/webp",
  srcset: "assets/log/day-03/01-harbour-960.webp 960w, assets/log/day-03/01-harbour.webp 1920w"
}]
```

### Cropping and focal points

Natural proportions are the default. Add `crop: true` only when a controlled presentation—usually a portrait moment—needs it. Pair it with a focal point:

- `"50% 30%"` keeps a face or skyline near the upper centre.
- `"35% 50%"` protects a subject standing left of centre.
- `"75% 45%"` protects an edge-weighted subject on the right.

Check the crop at both 320px and desktop width. A focal point cannot rescue an image whose important subjects sit on opposite edges; use the natural ratio instead.

### Common image problems

- Do not trust filenames such as `portrait` or `square`; verify the actual pixel dimensions.
- Avoid placing logos, timestamps or important faces near an edge that a crop may remove.
- Do not combine several very dark images without a lighter pause between them.
- Avoid upscaling small sources. A clean 1280-pixel image is preferable to an artificial 2400-pixel derivative.
- Keep captions concise in dense collages. Longer context works better as a standalone caption or note.
- Do not force wide photographs into the film-strip portrait ratio. Cropping is opt-in per image.

## Publish an entry

1. Replace all temporary prototype content.
2. Change the entry's `state` from `"draft"` to `"published"`.
3. Change the same day to `state: "published"` in `data/trip-log-index.js`.
4. Enable `features.travelLog` in `data/trip-config.js`.
5. Run `npm.cmd test` and review the page on a phone-sized viewport.

`hidden`, `draft` and `published` control normal loading and navigation; they are not authentication. Anything committed to a public repository can be requested directly. Truly private media must stay outside the repository.
