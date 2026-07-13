(function () {
  "use strict";

  // Blocks: photo, collage, sequence, caption, note, quote, video, pause, comparison, place.
  // Photo presentations: full, contained, portrait, quiet.
  // Collage layouts: two-up, feature-left, feature-right, film-strip, scrapbook.
  const entries = window.TRIP_LOG_ENTRIES || (window.TRIP_LOG_ENTRIES = Object.create(null));

  entries["day-03"] = Object.freeze({
    version: 2,
    dayId: "day-03",
    state: "draft",
    date: "2026-10-12",
    place: "Chania",
    prototype: true,
    blocks: [
      {
        type: "photo",
        id: "moment-chania-harbour",
        presentation: "full",
        src: "assets/days/day-03-chania.webp",
        alt: "Chania Venetian Harbour, its lighthouse and ochre waterfront reflected in calm water",
        caption: "Temporary prototype image from the existing itinerary artwork.",
        location: "Chania",
        width: 1536,
        height: 1024
      },
      {
        type: "caption",
        text: "Temporary prototype: this chapter demonstrates visual rhythm only. Replace every image and memory after the trip."
      },
      {
        type: "photo",
        presentation: "portrait",
        src: "assets/days/day-03-chania.webp",
        alt: "A portrait crop of Chania Harbour used to demonstrate a tall photographic moment",
        caption: "The Chania image is intentionally reused to test a portrait crop.",
        focalPoint: "52% 48%",
        crop: true,
        width: 1536,
        height: 1024
      },
      {
        type: "collage",
        layout: "feature-left",
        label: "Temporary three-image feature collage",
        images: [
          {
            src: "assets/days/day-03-chania.webp",
            alt: "Chania Venetian Harbour in calm morning light",
            caption: "Temporary Chania artwork",
            width: 1536,
            height: 1024,
            crop: true,
            focalPoint: "50% 50%"
          },
          {
            src: "assets/days/day-04-elafonisi.webp",
            alt: "Turquoise shallows and pale sand at Elafonisi",
            caption: "Temporary coastal artwork",
            width: 1536,
            height: 1024
          },
          {
            src: "assets/days/day-05-rethymno.webp",
            alt: "Warm Venetian stone buildings beside the sea in Rethymno",
            caption: "Temporary road-trip artwork",
            width: 1536,
            height: 1024
          }
        ]
      },
      {
        type: "note",
        heading: "Where a longer entry can breathe",
        paragraphs: [
          "This is temporary prototype writing, not a record of the trip. It demonstrates how a longer journal passage can sit between photographs without turning the chapter into a conventional blog post.",
          "A real entry could describe the ferry arrival, the first walk around the harbour or the café that replaced an over-ambitious beach plan. Paragraphs remain plain text so editing stays safe and uncomplicated.",
          "Nothing here is mandatory. If the photographs tell the day properly, this entire block can be removed."
        ]
      },
      {
        type: "collage",
        layout: "film-strip",
        label: "Temporary three-image film strip",
        images: [
          {
            src: "assets/hero-aegean.webp",
            alt: "Golden-hour view across the sea with white architecture and a hilltop temple",
            caption: "Temporary atmosphere",
            width: 1536,
            height: 1024
          },
          {
            src: "assets/days/santorini-athinios.webp",
            alt: "A ferry approaching Santorini beneath dark volcanic cliffs",
            caption: "Temporary ferry detail",
            width: 1536,
            height: 1024
          },
          {
            src: "assets/essentials-hero.webp",
            alt: "Travel notebook, map, sunglasses, coffee, camera and car keys on a table",
            caption: "Temporary travel detail",
            width: 1536,
            height: 1024
          }
        ]
      },
      {
        type: "quote",
        text: "Temporary quote placeholder—not a recorded cousin verdict.",
        attribution: "Prototype only"
      },
      {
        type: "comparison",
        planned: "Example plan: collect the car, explore Chania and keep a beach stop available.",
        actual: "Temporary example only: the beach becomes coffee when the practical parts take longer."
      },
      {
        type: "place",
        name: "Chania Old Town",
        note: "Example location link for a future real entry.",
        mapUrl: "https://www.google.com/maps/search/?api=1&query=Chania+Old+Town"
      },
      {
        type: "pause",
        text: "End of the temporary Day 3 prototype"
      }
    ]
  });
})();
