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

(() => {
  const fallbackLink = document.querySelector('.day-nav > .nav-link-button');
  const currentDayId = document.body.dataset.tripDay;
  const days = [
    ['day-01', 'day-1-athens-arrival.html', 'Athens'],
    ['day-02', 'day-2-acropolis-ferry.html', 'Acropolis & ferry'],
    ['day-03', 'day-3-chania.html', 'Chania'],
    ['day-04', 'day-4-elafonisi.html', 'Elafonisi'],
    ['day-05', 'day-5-rethymno-heraklion.html', 'Across Crete'],
    ['day-06', 'day-6-santorini.html', 'Santorini'],
    ['day-07', 'day-7-knossos.html', 'Knossos']
  ];
  const currentIndex = days.findIndex(([id]) => id === currentDayId);

  if (!fallbackLink || currentIndex < 0) return;

  const switcher = document.createElement('div');
  switcher.className = 'day-jump';
  const menuId = `day-jump-menu-${currentDayId}`;
  const previous = days[currentIndex - 1];
  const next = days[currentIndex + 1];
  const step = (day, direction, symbol) => day
    ? `<a class="day-jump-step" href="${day[1]}" aria-label="${direction}: ${day[2]}">${symbol}</a>`
    : `<span class="day-jump-step" aria-disabled="true" aria-hidden="true">${symbol}</span>`;
  const menuDays = days.map(([id, href, title], index) => `
    <a href="${href}"${id === currentDayId ? ' aria-current="page"' : ''}>
      <span>Day ${String(index + 1).padStart(2, '0')}</span>
      <strong>${title}</strong>
    </a>`).join('');

  switcher.innerHTML = `
    ${step(previous, 'Previous day', '‹')}
    <button class="day-jump-current" type="button" aria-expanded="false" aria-controls="${menuId}"
      aria-label="Choose a day. Currently Day ${currentIndex + 1}: ${days[currentIndex][2]}">
      <span>Days</span>
    </button>
    ${step(next, 'Next day', '›')}
    <div class="day-jump-menu" id="${menuId}" role="navigation" aria-label="Choose a day" hidden>
      <a href="../index.html#itinerary">All days</a>
      ${menuDays}
    </div>`;

  fallbackLink.replaceWith(switcher);

  const button = switcher.querySelector('.day-jump-current');
  const menu = switcher.querySelector('.day-jump-menu');
  const closeMenu = ({ restoreFocus = false } = {}) => {
    menu.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    if (restoreFocus) button.focus();
  };

  button.addEventListener('click', () => {
    const opening = menu.hidden;
    menu.hidden = !opening;
    button.setAttribute('aria-expanded', String(opening));
    if (opening) menu.querySelector('[aria-current="page"]')?.focus();
  });

  document.addEventListener('click', (event) => {
    if (!switcher.contains(event.target)) closeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !menu.hidden) {
      closeMenu({ restoreFocus: true });
    }
  });
})();

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
    phases: ['Morning', 'East-<br>bound', 'Late<br>morning', 'Before<br>lunch', 'Lunch', 'After-<br>noon', 'On<br>arrival', 'Late after-<br>noon', 'Evening'],
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

(() => {
  const switcher = document.querySelector(".day-switcher");

  if (!switcher) {
    return;
  }

  const tabs = Array.from(
    switcher.querySelectorAll('[role="tab"]')
  );

  const panels = Array.from(
    switcher.querySelectorAll('[role="tabpanel"]')
  );

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const panelForTab = (tab) => {
    return document.getElementById(
      tab.getAttribute("aria-controls")
    );
  };

  const tabForPanel = (panel) => {
    if (!panel) {
      return null;
    }

    return tabs.find((tab) => {
      return tab.getAttribute("aria-controls") === panel.id;
    });
  };

  const panelContainingTarget = (target) => {
    if (!target) {
      return null;
    }

    if (target.matches('[role="tabpanel"]')) {
      return target;
    }

    return target.closest('[role="tabpanel"]');
  };

  const activateTab = (
    activeTab,
    {
      focus = false,
      updateHash = false,
      scroll = false,
      target = null
    } = {}
  ) => {
    const activePanel = panelForTab(activeTab);

    if (!activePanel) {
      return;
    }

    tabs.forEach((tab) => {
      const selected = tab === activeTab;

      tab.setAttribute(
        "aria-selected",
        String(selected)
      );

      tab.tabIndex = selected ? 0 : -1;
    });

    panels.forEach((panel) => {
      panel.hidden = panel !== activePanel;
    });

    const tabList = activeTab.closest(".day-tabs");

    if (
      tabList &&
      tabList.scrollWidth > tabList.clientWidth
    ) {
      activeTab.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "nearest",
        inline: "center"
      });
    }

    if (focus) {
      activeTab.focus();
    }

    const scrollTarget = target || activePanel;

    if (updateHash) {
      history.pushState(
        null,
        "",
        `#${scrollTarget.id}`
      );
    }

    if (scroll) {
      requestAnimationFrame(() => {
        scrollTarget.scrollIntoView({
          behavior: prefersReducedMotion
            ? "auto"
            : "smooth",
          block: "start"
        });
      });
    }
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      activateTab(tab, {
        updateHash: true,
        scroll: true
      });
    });

    tab.addEventListener("keydown", (event) => {
      let nextIndex = index;

      switch (event.key) {
        case "ArrowRight":
          nextIndex = (index + 1) % tabs.length;
          break;

        case "ArrowLeft":
          nextIndex =
            (index - 1 + tabs.length) % tabs.length;
          break;

        case "Home":
          nextIndex = 0;
          break;

        case "End":
          nextIndex = tabs.length - 1;
          break;

        default:
          return;
      }

      event.preventDefault();

      activateTab(tabs[nextIndex], {
        focus: true,
        updateHash: true,
        scroll: true
      });
    });
  });

  /*
   * Existing anchor links such as #schedule or #practical
   * automatically open their containing panel.
   */
  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');

    if (!link) {
      return;
    }

    const hash = link.getAttribute("href");

    if (!hash || hash === "#") {
      return;
    }

    const target = document.querySelector(hash);
    const panel = panelContainingTarget(target);
    const tab = tabForPanel(panel);

    if (!tab) {
      return;
    }

    event.preventDefault();

    activateTab(tab, {
      updateHash: true,
      scroll: true,
      target
    });
  });

  const activateFromHash = () => {
    const hash = window.location.hash;

    if (!hash) {
      activateTab(tabs[0]);
      return;
    }

    const target = document.querySelector(hash);
    const panel = panelContainingTarget(target);
    const tab = tabForPanel(panel);

    if (!tab) {
      return;
    }

    activateTab(tab);

    requestAnimationFrame(() => {
      target.scrollIntoView({
        behavior: "auto",
        block: "start"
      });
    });
  };

  window.addEventListener("hashchange", activateFromHash);
  window.addEventListener("popstate", activateFromHash);

  activateFromHash();
})();

(() => {
    const dayNav = document.querySelector(".day-nav");
    const tabBar = document.querySelector(".day-tabbar-wrap");

    if (!dayNav || !tabBar || !("IntersectionObserver" in window)) {
        return;
    }

    const observer = new IntersectionObserver(
        ([entry]) => {
            dayNav.classList.toggle(
                "day-tabs-in-view",
                entry.isIntersecting
            );
        },
        {
            /*
             * The fixed navbar occupies roughly the first 58px.
             * This makes the state change when the capsule bar
             * reaches the visible area beneath it.
             */
            rootMargin: "-58px 0px 0px 0px",
            threshold: 0.05
        }
    );

    observer.observe(tabBar);
})();
