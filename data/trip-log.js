(function () {
  const emptyDay = () => ({
    published: false,
    actualTitle: "",
    actualSubtitle: "",
    actualSummary: "",
    bestMoment: "",
    unexpectedMoment: "",
    foodHighlight: "",
    quoteOfTheDay: "",
    weatherNote: "",
    lessonLearned: "",
    dayRating: "",
    routeChanged: null,
    coverImage: "",
    coverImageAlt: "",
    actualLocations: [],
    gallery: []
  });

  window.TRIP_LOG_DATA = {
    version: 1,
    days: {
      "day-01": emptyDay(),
      "day-02": emptyDay(),
      "day-03": {
        ...emptyDay(),

        published: false, //change this

        actualTitle: "Chania, eventually.",
        actualSubtitle: "A slower arrival than planned.",

        actualSummary:
          "The ferry arrived, the rental car took longer than expected, and the first proper coffee solved most of the remaining problems.",

        bestMoment:
          "The first walk around the Venetian Harbour after leaving the luggage.",

        unexpectedMoment:
          "The rental-car delay produced an unplanned café stop that was better than the original plan.",

        foodHighlight:
          "Warm bougatsa and coffee after the overnight crossing.",

        quoteOfTheDay:
          "This was definitely the correct amount of breakfast.",

        actualLocations: [
          {
            name: "Chania Old Town",
            note: "First proper walk of the day",
            mapUrl: "https://www.google.com/maps/search/?api=1&query=Chania+Old+Town"
          }
        ],

        routeChanged: {
          planned: "Collect the car, explore Chania and possibly visit Marathi Beach.",
          actual: "Collect the car rather slowly, find coffee, explore Chania and leave the beach for another day."
        },

        gallery: [
          {
            src: "../assets/images/trip-log/day-03/test-photo.webp",
            alt: "Chania Venetian Harbour during an evening walk",
            caption: "The first harbour walk.",
            location: "Chania",
            width: 1200,
            height: 900
          }
        ]
      },
      "day-04": emptyDay(),
      "day-05": emptyDay(),
      "day-06": emptyDay(),
      "day-07": emptyDay()
    }
  };
})();
