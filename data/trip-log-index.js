(function () {
  // Loading manifest only. Repository files remain directly accessible on a public static site.
  window.TRIP_LOG_INDEX = Object.freeze({
    version: 2,
    days: {
      "day-01": { state: "hidden" },
      "day-02": { state: "hidden" },
      "day-03": {
        state: "draft",
        file: "trip-log/day-03.js"
      },
      "day-04": { state: "hidden" },
      "day-05": { state: "hidden" },
      "day-06": { state: "hidden" },
      "day-07": { state: "hidden" }
    }
  });
})();
