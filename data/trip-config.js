(function () {
  "use strict";

  window.TRIP_CONFIG = Object.freeze({
    version: 1,
    trip: Object.freeze({
      name: "Aegean Odyssey",
      startDate: "2026-10-10",
      endDate: "2026-10-16"
    }),
    features: Object.freeze({
      travelLog: false
    }),
    days: Object.freeze([
      {
        id: "day-01", number: 1, title: "Athens", path: "day-1-athens-arrival.html",
        phases: ["After-<br>noon", "Once<br>settled", "Late after-<br>noon", "Before<br>sunset", "Golden<br>hour", "Evening"],
        route: {
          group: "Athens", title: "Athens arrival walk",
          description: "Monastiraki, the Ancient Agora, Philopappos Hill and Psyrri.",
          mapsUrl: "https://www.google.com/maps/dir/?api=1&origin=Monastiraki%2C+Athens&destination=Psyrri%2C+Athens&waypoints=Ancient+Agora+of+Athens%7CPhilopappos+Hill",
          mapTitle: "Central Athens", minimumExtent: 0.75,
          points: [["Monastiraki", 37.9767, 23.7258, true], ["Ancient Agora", 37.9753, 23.7215], ["Philopappos", 37.9677, 23.7213], ["Psirri", 37.9787, 23.7234]]
        }
      },
      {
        id: "day-02", number: 2, title: "Acropolis & ferry", path: "day-2-acropolis-ferry.html",
        phases: ["Early<br>morning", "Morning", "Late<br>morning", "Early after-<br>noon", "Late after-<br>noon", "With<br>buffer", "Boarding", "Overnight"],
        route: {
          group: "Athens", title: "Acropolis to Piraeus",
          description: "Acropolis Museum and Monastiraki before the overnight ferry.",
          mapsUrl: "https://www.google.com/maps/dir/?api=1&origin=Acropolis%2C+Athens%2C+Greece&destination=Port+of+Piraeus%2C+Piraeus%2C+Greece&waypoints=Acropolis+Museum%2C+Athens%2C+Greece%7CMonastiraki%2C+Athens%2C+Greece",
          mapTitle: "Athens to Piraeus",
          points: [["Central Athens", 37.9722, 23.7267, true], ["Piraeus Port", 37.9420, 23.6460]]
        }
      },
      {
        id: "day-03", number: 3, title: "Chania", path: "day-3-chania.html",
        phases: ["Morning", "After<br>docking", "Breakfast", "Late<br>morning", "Midday", "Optional", "Evening"],
        route: {
          group: "Chania", title: "Souda, Chania and Marathi",
          description: "Port arrival, Chania Old Town and the optional beach stop.",
          mapsUrl: "https://www.google.com/maps/dir/?api=1&origin=Souda+Port&destination=Chania+Old+Town&waypoints=Marathi+Beach+Crete",
          mapTitle: "Chania and the nearby coast",
          points: [["Souda Port", 35.4890, 24.0730], ["Chania Old Town", 35.5150, 24.0180, true], ["Venetian Harbour", 35.5190, 24.0160], ["Marathi Beach", 35.5030, 24.1740]]
        }
      },
      {
        id: "day-04", number: 4, title: "Elafonisi", path: "day-4-elafonisi.html",
        phases: ["Early<br>morning", "On the<br>road", "Optional<br>stop", "Late<br>morning", "Before<br>midday", "Midday", "Return<br>drive", "Evening"],
        route: {
          group: "Elafonisi", title: "Chania to Elafonisi",
          description: "The west-coast drive with Topolia Gorge on the way.",
          mapsUrl: "https://www.google.com/maps/dir/?api=1&origin=Chania&destination=Elafonisi+Beach&waypoints=Topolia+Gorge",
          mapTitle: "Western Crete",
          points: [["Chania", 35.5138, 24.0180, true], ["Topolia Gorge", 35.4130, 23.6820], ["Elafonisi", 35.2710, 23.5410], ["Chania return", 35.5138, 24.0180]]
        }
      },
      {
        id: "day-05", number: 5, title: "Across Crete", path: "day-5-rethymno-heraklion.html",
        phases: ["Morning", "East-<br>bound", "Late<br>morning", "Before<br>lunch", "Lunch", "After-<br>noon", "On<br>arrival", "Late after-<br>noon", "Evening"],
        route: {
          group: "Rethymno", title: "Across Crete",
          description: "Chania to Heraklion with Rethymno as the central stop.",
          mapsUrl: "https://www.google.com/maps/dir/?api=1&origin=Chania&destination=Heraklion&waypoints=Rethymno",
          mapTitle: "Crete west to east",
          points: [["Chania", 35.5138, 24.0180], ["Rethymno", 35.3690, 24.4750], ["Heraklion", 35.3387, 25.1442, true], ["Koules Fortress", 35.3445, 25.1370]]
        }
      },
      {
        id: "day-06", number: 6, title: "Santorini", path: "day-6-santorini.html",
        route: {
          group: "Santorini", title: "Santorini island route",
          description: "Athinios Port, Oia and Fira, returning to the ferry.",
          mapsUrl: "https://www.google.com/maps/dir/?api=1&origin=Athinios+Port+Santorini&destination=Athinios+Port+Santorini&waypoints=Oia+Santorini%7CFira+Santorini",
          mapTitle: "Santorini",
          points: [["Athinios Port", 36.3860, 25.4290], ["Oia", 36.4618, 25.3753, true], ["Fira", 36.4167, 25.4320], ["Athinios return", 36.3860, 25.4290]]
        }
      },
      {
        id: "day-07", number: 7, title: "Knossos", path: "day-7-knossos.html",
        route: {
          group: "Knossos", title: "Knossos and departure",
          description: "Heraklion, Knossos, Lions Square and the airport.",
          mapsUrl: "https://www.google.com/maps/dir/?api=1&origin=Heraklion&destination=Heraklion+International+Airport&waypoints=Palace+of+Knossos%7CLions+Square+Heraklion",
          mapTitle: "Heraklion and Knossos",
          points: [["Heraklion centre", 35.3387, 25.1330, true], ["Palace of Knossos", 35.2980, 25.1630], ["Lions Square", 35.3390, 25.1330], ["HER Airport", 35.3397, 25.1803]]
        }
      }
    ]),
    bookings: Object.freeze([
      ["Multi-city flights", "Arrive in Athens 10 Oct · depart Heraklion 16 Oct"],
      ["Overnight ferry cabin", "Piraeus → Souda; overnight cabin"],
      ["Santorini day trip", "Confirm 15 Oct sailings and island transfers"],
      ["Athens apartment", "One night"],
      ["Crete stays", "Chania west, then Heraklion hub"],
      ["Rental car", "Souda pickup; Heraklion Airport return"],
      ["Acropolis entry", "Early timed slot · Sunday, 11 Oct"]
    ]),
    toolkit: Object.freeze({
      weatherLocations: Object.freeze({
        Athens: { latitude: 37.9838, longitude: 23.7275 },
        Chania: { latitude: 35.5138, longitude: 24.0180 },
        Elafonisi: { latitude: 35.2710, longitude: 23.5412 },
        Rethymno: { latitude: 35.3656, longitude: 24.4822 },
        Heraklion: { latitude: 35.3387, longitude: 25.1442 },
        Santorini: { latitude: 36.3932, longitude: 25.4615 }
      }),
      extraMapItems: Object.freeze([
        {
          day: "Place", group: "Heraklion", title: "Heraklion centre",
          description: "Open the practical eastern-Crete base directly.",
          url: "https://www.google.com/maps/search/?api=1&query=Heraklion+City+Centre"
        }
      ])
    })
  });
})();
