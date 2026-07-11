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
      "day-03": emptyDay(),
      "day-04": emptyDay(),
      "day-05": emptyDay(),
      "day-06": emptyDay(),
      "day-07": emptyDay(),
      "day-08": emptyDay()
    }
  };
})();
