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
    map: { title: 'Central Athens', points: [['Monastiraki', 120, 150, true], ['Ancient Agora', 275, 205], ['Philopappos', 450, 245], ['Psirri', 610, 125]] }
  },
  'day-02': {
    phases: ['Early<br>morning', 'Morning', 'Late<br>morning', 'Early after-<br>noon', 'Late after-<br>noon', 'With<br>buffer', 'Boarding', 'Overnight'],
    map: { title: 'Athens to Piraeus', points: [['Acropolis', 115, 105, true], ['Museum', 250, 175], ['Central Athens', 410, 125], ['Piraeus', 650, 245]] }
  },
  'day-03': {
    phases: ['Morning', 'After<br>docking', 'Breakfast', 'Late<br>morning', 'Midday', 'Optional', 'Evening'],
    map: { title: 'Chania and the nearby coast', points: [['Souda', 145, 190], ['Old Town', 310, 125, true], ['Harbour', 445, 165], ['Marathi', 650, 245]] }
  },
  'day-04': {
    phases: ['Early<br>morning', 'On the<br>road', 'Optional<br>stop', 'Late<br>morning', 'Before<br>midday', 'Midday', 'Return<br>drive', 'Evening'],
    map: { title: 'Western Crete', points: [['Chania', 125, 85, true], ['Topolia', 310, 155], ['Elafonisi', 490, 260], ['Chania Harbour', 665, 95]] }
  },
  'day-05': {
    phases: ['Morning', 'Eastbound', 'Late<br>morning', 'Before<br>lunch', 'Lunch', 'After-<br>noon', 'On<br>arrival', 'Late after-<br>noon', 'Evening'],
    map: { title: 'Crete west to east', points: [['Chania', 110, 180], ['Rethymno', 375, 140], ['Heraklion', 650, 190, true], ['Koules', 705, 105]] }
  },
  'day-06': {
    map: { title: 'Santorini', points: [['Athinios', 150, 250], ['Oia', 390, 80, true], ['Fira', 570, 165], ['Athinios return', 680, 255]] }
  },
  'day-07': {
    map: { title: 'Heraklion and Knossos', points: [['Heraklion', 135, 105, true], ['Knossos', 330, 245], ['Lions Square', 510, 130], ['HER Airport', 680, 185]] }
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
    const { title, points } = currentEnhancement.map;
    const pointMarkup = points.map(([label, x, y, current], index) => `
      <g class="offline-map-point${current ? ' is-current' : ''}">
        <circle cx="${x}" cy="${y}" r="${current ? 10 : 7}"></circle>
        <text x="${x}" y="${y - 18}" text-anchor="middle">${label}</text>
        <text class="offline-map-index" x="${x}" y="${y + 4}" text-anchor="middle">${index + 1}</text>
      </g>`).join('');
    const routePoints = points.map(([, x, y]) => `${x},${y}`).join(' ');
    const figure = document.createElement('figure');
    figure.className = 'offline-route-map';
    figure.innerHTML = `
      <svg viewBox="0 0 800 330" role="img" aria-labelledby="offline-map-${currentDayId}-title offline-map-${currentDayId}-desc">
        <title id="offline-map-${currentDayId}-title">Offline overview of ${title}</title>
        <desc id="offline-map-${currentDayId}-desc">A schematic route highlighting the day’s main area and attractions. It is not a navigation map and is not to scale.</desc>
        <path class="offline-map-land" d="M30 235 C120 80 250 55 345 105 C450 160 530 35 765 100 L770 285 C610 305 515 260 390 285 C250 315 120 280 30 235 Z"></path>
        <path class="offline-map-coast" d="M25 270 C160 230 245 310 375 265 S610 300 775 245"></path>
        <polyline class="offline-map-route" points="${routePoints}"></polyline>
        ${pointMarkup}
      </svg>
      <figcaption><span>Offline area guide</span><small>Schematic · not to scale</small></figcaption>`;
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
