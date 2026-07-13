(function () {
  "use strict";

  // Blocks: photo, collage, sequence, caption, note, quote, video, pause, comparison, place.
  // Photo presentations: full, contained, portrait, quiet.
  // Collage layouts: two-up, feature-left, feature-right, film-strip.
  const entries = window.TRIP_LOG_ENTRIES || (window.TRIP_LOG_ENTRIES = Object.create(null));

  const media = (name, width, height, alt, extra = {}) => ({
    src: `assets/log/day-03/${name}.webp`,
    sources: [{
      type: "image/webp",
      srcset: `assets/log/day-03/${name}-960.webp 960w, assets/log/day-03/${name}.webp ${width}w`
    }],
    width,
    height,
    alt,
    ...extra
  });

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
        ...media(
          "01-landscape",
          1920,
          1080,
          "Temporary wide test artwork showing figures overlooking a ruined city filled with blue crystal formations",
          { caption: "Temporary prototype media used to test a wide, detailed opening image." }
        )
      },
      {
        type: "caption",
        text: "Temporary prototype only. These images test layout, loading and visual rhythm; none records the Greece trip."
      },
      {
        type: "collage",
        layout: "two-up",
        label: "Temporary two-image contrast test",
        images: [
          media(
            "02-landscape",
            1920,
            1409,
            "Temporary dark fantasy artwork of a winged skeletal figure suspended above a cavern floor",
            { caption: "A darker, near-four-by-three frame tests shadow detail." }
          ),
          media(
            "09-low-light",
            1920,
            1080,
            "Temporary low-light artwork of a crystal-armoured figure moving through a blue-green cavern",
            { caption: "A wide low-light frame tests tonal separation in both themes." }
          )
        ]
      },
      {
        type: "note",
        text: "Prototype note: the pair above deliberately combines different proportions and brightness levels."
      },
      {
        type: "photo",
        presentation: "portrait",
        ...media(
          "05-portrait",
          1920,
          1500,
          "Temporary warm-toned artwork of a suspended sphere above a reflective surface under several suns",
          {
            caption: "A deliberately cropped portrait presentation tests whether a central subject keeps enough space around it.",
            focalPoint: "50% 48%",
            crop: true
          }
        )
      },
      {
        type: "note",
        heading: "A realistic writing interval",
        paragraphs: [
          "This is temporary prototype writing, not a record of the trip. It checks that a longer journal passage can interrupt the photographs without turning the chapter into a conventional blog article.",
          "The source set is intentionally inconsistent: wide frames, dark scenes, detailed edges and subjects that do not all sit neatly in the centre. The layout should accommodate that variation instead of pretending every phone photograph arrives perfectly composed.",
          "When genuine Greece photographs replace these files, the writing can be shortened, expanded or removed. The photographs remain the structure; text is present only when it adds something worth keeping."
        ]
      },
      {
        type: "collage",
        layout: "feature-left",
        label: "Temporary feature image with two supporting frames",
        images: [
          media(
            "08-food-detail",
            1280,
            960,
            "Temporary detailed artwork of a winged figure holding a set of bronze scales",
            { caption: "The larger frame tests a detailed, imperfectly labelled source without forced cropping." }
          ),
          media(
            "04-portrait",
            1920,
            869,
            "Temporary unusually wide artwork of a mage facing a white dragon beneath a bright moon",
            { caption: "An unusually wide supporting image." }
          ),
          media(
            "07-square",
            1920,
            1080,
            "Temporary dark artwork of an armoured figure framed by floating blades in a forest",
            { caption: "A darker supporting frame with an off-centre subject." }
          )
        ]
      },
      {
        type: "caption",
        text: "Longer prototype caption: this feature layout keeps the main frame readable while the two supporting images retain their natural proportions and remain in the same logical order on small screens."
      },
      {
        type: "collage",
        layout: "film-strip",
        label: "Temporary three-image closing sequence",
        images: [
          media(
            "03-landscape",
            1920,
            1080,
            "Temporary wide artwork of two large creatures confronting one another",
            { caption: "Wide action frame" }
          ),
          media(
            "06-portrait",
            1920,
            1080,
            "Temporary artwork of an armoured figure reaching forward amid floating blades",
            { caption: "Edge-weighted figure" }
          ),
          media(
            "10-unusual-ratio",
            1280,
            960,
            "Temporary warm artwork of a spellcaster surrounded by flowing fabric and orange light",
            { caption: "Near-four-by-three closing frame" }
          )
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
