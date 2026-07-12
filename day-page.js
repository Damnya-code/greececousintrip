const revealItems = document.querySelectorAll('.reveal');

if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px' });

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}

document.documentElement.classList.add('day-page-ready');

const dayEnhancements = {
  'day-01': {
    phases: ['After-<br>noon', 'Once<br>settled', 'Late after-<br>noon', 'Before<br>sunset', 'Golden<br>hour', 'Evening'],
    map: { title: 'Central Athens', minimumExtent: 0.75, points: [['Monastiraki', 37.9767, 23.7258, true], ['Ancient Agora', 37.9753, 23.7215], ['Philopappos', 37.9677, 23.7213], ['Psirri', 37.9787, 23.7234]] }
  },
  'day-02': {
    phases: ['Early<br>morning', 'Morning', 'Late<br>morning', 'Early after-<br>noon', 'Late after-<br>noon', 'With<br>buffer', 'Boarding', 'Overnight'],
    map: {
      title: 'Athens to Piraeus',
      points: [['Central Athens', 37.9722, 23.7267, true], ['Piraeus Port', 37.9420, 23.6460]]
    }
  },
  'day-03': {
    phases: ['Morning', 'After<br>docking', 'Breakfast', 'Late<br>morning', 'Midday', 'Optional', 'Evening'],
    map: { title: 'Chania and the nearby coast', points: [['Souda Port', 35.4890, 24.0730], ['Chania Old Town', 35.5150, 24.0180, true], ['Venetian Harbour', 35.5190, 24.0160], ['Marathi Beach', 35.5030, 24.1740]] }
  },
  'day-04': {
    phases: ['Early<br>morning', 'On the<br>road', 'Optional<br>stop', 'Late<br>morning', 'Before<br>midday', 'Midday', 'Return<br>drive', 'Evening'],
    map: { title: 'Western Crete', points: [['Chania', 35.5138, 24.0180, true], ['Topolia Gorge', 35.4130, 23.6820], ['Elafonisi', 35.2710, 23.5410], ['Chania return', 35.5138, 24.0180]] }
  },
  'day-05': {
    phases: ['Morning', 'Eastbound', 'Late<br>morning', 'Before<br>lunch', 'Lunch', 'After-<br>noon', 'On<br>arrival', 'Late after-<br>noon', 'Evening'],
    map: { title: 'Crete west to east', points: [['Chania', 35.5138, 24.0180], ['Rethymno', 35.3690, 24.4750], ['Heraklion', 35.3387, 25.1442, true], ['Koules Fortress', 35.3445, 25.1370]] }
  },
  'day-06': {
    map: { title: 'Santorini', points: [['Athinios Port', 36.3860, 25.4290], ['Oia', 36.4618, 25.3753, true], ['Fira', 36.4167, 25.4320], ['Athinios return', 36.3860, 25.4290]] }
  },
  'day-07': {
    map: { title: 'Heraklion and Knossos', points: [['Heraklion centre', 35.3387, 25.1330, true], ['Palace of Knossos', 35.2980, 25.1630], ['Lions Square', 35.3390, 25.1330], ['HER Airport', 35.3397, 25.1803]] }
  }
};

const currentDayId = document.body.dataset.tripDay;
const currentEnhancement = dayEnhancements[currentDayId];

if (currentEnhancement?.phases) {
  document.querySelectorAll('.editorial-timeline time').forEach((time, index) => {
    const label = currentEnhancement.phases[index];
    if (label) time.innerHTML = label;
  });
}

if (currentEnhancement?.map) {
  const routeOverview = document.querySelector('.route-overview');
  if (routeOverview) {
    const { title, points, minimumExtent = 2.5 } = currentEnhancement.map;
    const centerLat = points.reduce((sum, [, lat]) => sum + lat, 0) / points.length;
    const kmPerLongitude = 111.32 * Math.cos(centerLat * Math.PI / 180);
    const rawPoints = points.map(([label, lat, lon, current]) => ({
      label, lat, lon, current,
      xKm: lon * kmPerLongitude,
      yKm: lat * 111.32
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
    const pointMarkup = projectedPoints.map(({ label, lat, lon, x, y, current }, index) => {
      const coordinateKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
      if (seenCoordinates.has(coordinateKey)) return '';
      seenCoordinates.add(coordinateKey);
      const labelOffset = [-20, 30, -34, 30][index % 4];
      return `
      <g class="offline-map-point${current ? ' is-current' : ''}">
        <circle cx="${x}" cy="${y}" r="${current ? 10 : 7}"></circle>
        <text x="${x}" y="${y + labelOffset}" text-anchor="middle">${label}</text>
        <text class="offline-map-index" x="${x}" y="${y + 4}" text-anchor="middle">${index + 1}</text>
      </g>`;
    }).join('');
    const routePoints = projectedPoints.map(({ x, y }) => `${x},${y}`).join(' ');
    const extent = Math.max(spanX, spanY);
    const scaleOptions = [0.5, 1, 2, 5, 10, 20, 25, 50, 100];
    const scaleDistance = scaleOptions.filter((value) => value <= extent / 3).pop() || 0.5;
    const scaleBarWidth = scaleDistance * scale;
    const minLat = Math.min(...points.map(([, lat]) => lat)).toFixed(3);
    const maxLat = Math.max(...points.map(([, lat]) => lat)).toFixed(3);
    const minLon = Math.min(...points.map(([, , lon]) => lon)).toFixed(3);
    const maxLon = Math.max(...points.map(([, , lon]) => lon)).toFixed(3);
    const figure = document.createElement('figure');
    figure.className = 'offline-route-map';
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
  }
}

const parallaxImage = document.querySelector('[data-parallax]');
if (parallaxImage && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  let ticking = false;
  const updateParallax = () => {
    const shift = Math.min(window.scrollY * 0.08, 42);
    parallaxImage.style.transform = `scale(1.06) translateY(${shift}px)`;
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }, { passive: true });
}
