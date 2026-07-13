(function () {
  "use strict";

  const currentDayId = document.body.dataset.tripDay;
  const day = window.TRIP_CONFIG?.days?.find((item) => item.id === currentDayId);
  if (!day) return;

  if (Array.isArray(day.phases)) {
    document.querySelectorAll(".editorial-timeline time").forEach((time, index) => {
      if (day.phases[index]) time.innerHTML = day.phases[index];
    });
  }

  const routeOverview = document.querySelector(".route-overview");
  const route = day.route;
  if (!routeOverview || !Array.isArray(route?.points)) return;

  const { mapTitle: title, points, minimumExtent = 2.5 } = route;
  const centerLat = points.reduce((sum, [, latitude]) => sum + latitude, 0) / points.length;
  const kmPerLongitude = 111.32 * Math.cos(centerLat * Math.PI / 180);
  const rawPoints = points.map(([label, latitude, longitude, current]) => ({
    label, latitude, longitude, current,
    xKm: longitude * kmPerLongitude,
    yKm: latitude * 111.32
  }));
  const xValues = rawPoints.map((point) => point.xKm);
  const yValues = rawPoints.map((point) => point.yKm);
  const minX = Math.min(...xValues), maxX = Math.max(...xValues);
  const minY = Math.min(...yValues), maxY = Math.max(...yValues);
  const spanX = Math.max(maxX - minX, minimumExtent);
  const spanY = Math.max(maxY - minY, minimumExtent);
  const mapWidth = 650, mapHeight = 210;
  const scale = Math.min(mapWidth / spanX, mapHeight / spanY);
  const usedWidth = (maxX - minX) * scale;
  const usedHeight = (maxY - minY) * scale;
  const offsetX = 75 + (mapWidth - usedWidth) / 2;
  const offsetY = 45 + (mapHeight - usedHeight) / 2;
  const projectedPoints = rawPoints.map((point) => ({
    ...point,
    x: offsetX + (point.xKm - minX) * scale,
    y: offsetY + usedHeight - (point.yKm - minY) * scale
  }));
  const seenCoordinates = new Set();
  const pointMarkup = projectedPoints.map(({ label, latitude, longitude, x, y, current }, index) => {
    const coordinateKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    if (seenCoordinates.has(coordinateKey)) return "";
    seenCoordinates.add(coordinateKey);
    const labelOffset = [-20, 30, -34, 30][index % 4];
    return `
      <g class="offline-map-point${current ? " is-current" : ""}">
        <circle cx="${x}" cy="${y}" r="${current ? 10 : 7}"></circle>
        <text x="${x}" y="${y + labelOffset}" text-anchor="middle">${label}</text>
        <text class="offline-map-index" x="${x}" y="${y + 4}" text-anchor="middle">${index + 1}</text>
      </g>`;
  }).join("");
  const routePoints = projectedPoints.map(({ x, y }) => `${x},${y}`).join(" ");
  const extent = Math.max(spanX, spanY);
  const scaleOptions = [0.5, 1, 2, 5, 10, 20, 25, 50, 100];
  const scaleDistance = scaleOptions.filter((value) => value <= extent / 3).pop() || 0.5;
  const scaleBarWidth = scaleDistance * scale;
  const minLat = Math.min(...points.map(([, latitude]) => latitude)).toFixed(3);
  const maxLat = Math.max(...points.map(([, latitude]) => latitude)).toFixed(3);
  const minLon = Math.min(...points.map(([, , longitude]) => longitude)).toFixed(3);
  const maxLon = Math.max(...points.map(([, , longitude]) => longitude)).toFixed(3);
  const figure = document.createElement("figure");
  figure.className = "offline-route-map";
  figure.innerHTML = `
    <svg viewBox="0 0 800 330" role="img" aria-labelledby="offline-map-${currentDayId}-title offline-map-${currentDayId}-desc">
      <title id="offline-map-${currentDayId}-title">Offline overview of ${title}</title>
      <desc id="offline-map-${currentDayId}-desc">A coordinate-projected map showing the day’s attractions at their correct relative positions and scale. It is a locator map rather than street navigation.</desc>
      <g class="offline-map-grid" aria-hidden="true">
        <path d="M75 45V255 M237.5 45V255 M400 45V255 M562.5 45V255 M725 45V255"></path>
        <path d="M75 45H725 M75 97.5H725 M75 150H725 M75 202.5H725 M75 255H725"></path>
      </g>
      <text class="offline-map-coordinate" x="75" y="28">${maxLat}° N</text>
      <text class="offline-map-coordinate" x="75" y="276">${minLat}° N</text>
      <text class="offline-map-coordinate" x="725" y="28" text-anchor="end">${maxLon}° E</text>
      <text class="offline-map-coordinate" x="725" y="276" text-anchor="end">${minLon}° E</text>
      <polyline class="offline-map-route" points="${routePoints}"></polyline>
      ${pointMarkup}
      <g class="offline-map-north" transform="translate(750 55)" aria-hidden="true"><path d="M0 20 8 0 16 20 8 15Z"></path><text x="8" y="-7" text-anchor="middle">N</text></g>
      <g class="offline-map-scale" transform="translate(75 305)" aria-hidden="true"><path d="M0 0V-8 M0-4H${scaleBarWidth} M${scaleBarWidth} 0V-8"></path><text x="${scaleBarWidth / 2}" y="15" text-anchor="middle">${scaleDistance} km</text></g>
    </svg>
    <figcaption><span>Offline geographic guide</span><small>Coordinate projected</small></figcaption>`;
  routeOverview.append(figure);
})();
