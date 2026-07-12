(function () {
  "use strict";

  const index = window.TRIP_LOG_INDEX;
  if (!index || index.version !== 1 || !index.days || typeof index.days !== "object") return;

  const publishedDays = Object.entries(index.days).filter(([, day]) => day && day.published === true);
  if (!publishedDays.length) return;

  const paths = {
    "day-01": "day-1-athens-arrival.html", "day-02": "day-2-acropolis-ferry.html",
    "day-03": "day-3-chania.html", "day-04": "day-4-elafonisi.html",
    "day-05": "day-5-rethymno-heraklion.html", "day-06": "day-6-santorini.html",
    "day-07": "day-7-knossos.html"
  };

  const dayId = document.body.dataset.tripDay;
  if (!dayId) {
    const nav = document.querySelector(".nav nav");
    if (nav && !nav.querySelector("[data-travel-log-link]")) {
      const link = document.createElement("a");
      link.dataset.travelLogLink = "";
      link.href = `days/${paths[publishedDays[0][0]]}#travel-log`;
      link.textContent = "Travel Log";
      nav.append(link);
    }
    document.querySelectorAll(".journey-card[data-trip-day]").forEach((card) => {
      const cardDayId = card.dataset.tripDay;
      if (!index.days[cardDayId]?.published || card.querySelector("[data-card-travel-log]")) return;
      const exploreLink = card.querySelector(".journey-copy > a");
      if (!exploreLink || !paths[cardDayId]) return;
      const logLink = document.createElement("a");
      logLink.dataset.cardTravelLog = "";
      logLink.className = "journey-log-link";
      logLink.href = `days/${paths[cardDayId]}#travel-log`;
      logLink.innerHTML = "Travel Log <span>→</span>";
      exploreLink.after(logLink);
    });
    return;
  }

  const publication = index.days[dayId];
  if (!publication || publication.published !== true || !/^day-0[1-7]$/.test(dayId)) return;

  const dayScript = document.createElement("script");
  dayScript.src = new URL(`../data/trip-log/${dayId}.js`, document.baseURI).href;
  dayScript.async = true;
  dayScript.addEventListener("load", () => {
    const payload = window.TRIP_LOG_DAY;
    delete window.TRIP_LOG_DAY;
    if (!payload || payload.version !== 1 || payload.dayId !== dayId || !payload.content || typeof payload.content !== "object") return;
    renderDay(payload.content);
  });
  dayScript.addEventListener("error", () => { delete window.TRIP_LOG_DAY; });
  document.head.append(dayScript);

  function renderDay(day) {

  const main = document.querySelector("main");
  const hero = main && main.querySelector(":scope > .day-hero");
  if (!main || !hero) return;

  const hasText = (value) => typeof value === "string" && value.trim().length > 0;
  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  };

  const tabs = make("div", "trip-view-tabs");
  tabs.setAttribute("role", "tablist");
  tabs.setAttribute("aria-label", "Choose day view");
  const planButton = make("button", "trip-view-tab", "The Plan");
  const logButton = make("button", "trip-view-tab", "Travel Log");
  [planButton, logButton].forEach((button, index) => {
    button.type = "button";
    button.id = index ? "travel-log-tab" : "plan-tab";
    button.setAttribute("role", "tab");
    button.setAttribute("aria-controls", index ? "travel-log-view" : "plan-view");
    //button.innerHTML += `<small>${index ? "What actually happened" : "What we expected"}</small>`;
  });
  tabs.append(planButton, logButton);

  const planView = make("div", "trip-view-panel");
  planView.id = "plan-view";
  planView.setAttribute("role", "tabpanel");
  planView.setAttribute("aria-labelledby", "plan-tab");
  [...main.children].filter((child) => child !== hero).forEach((child) => planView.append(child));

  const logView = make("section", "trip-view-panel trip-log-view");
  logView.id = "travel-log-view";
  logView.setAttribute("role", "tabpanel");
  logView.setAttribute("aria-labelledby", "travel-log-tab");
  logView.tabIndex = 0;

  const intro = make("header", "trip-log-intro day-container");
  intro.append(make("p", "eyebrow", "Travel log"));
  if (hasText(day.actualTitle)) intro.append(make("h2", "", day.actualTitle));
  if (hasText(day.actualSubtitle)) intro.append(make("p", "trip-log-subtitle", day.actualSubtitle));
  if (hasText(day.actualSummary)) intro.append(make("p", "trip-log-summary", day.actualSummary));

  if (Array.isArray(day.actualLocations) && day.actualLocations.length) {
    const locations = make("ul", "trip-log-locations");
    day.actualLocations.forEach((location) => {
      if (!location || !hasText(location.name)) return;
      const item = make("li", "");
      const name = location.mapUrl ? make("a", "", location.name) : make("strong", "", location.name);
      if (location.mapUrl) { name.href = location.mapUrl; name.target = "_blank"; name.rel = "noopener"; }
      item.append(name);
      if (hasText(location.note)) item.append(make("span", "", location.note));
      locations.append(item);
    });
    if (locations.children.length) intro.append(locations);
  }
  logView.append(intro);

  const notes = [
    ["Best moment", day.bestMoment], ["Unexpected moment", day.unexpectedMoment],
    ["Food highlight", day.foodHighlight], ["Quote of the day", day.quoteOfTheDay],
    ["Weather note", day.weatherNote], ["Lesson learned", day.lessonLearned]
  ].filter(([, value]) => hasText(value));
  if (notes.length) {
    const section = make("section", "trip-log-section day-container");
    section.append(make("p", "eyebrow", "Day notes"));
    const grid = make("div", "trip-log-note-grid");
    notes.forEach(([label, value]) => { const card = make("article", ""); card.append(make("h3", "", label), make("p", "", value)); grid.append(card); });
    section.append(grid); logView.append(section);
  }

  const publicGallery = Array.isArray(day.gallery) ? day.gallery.filter((photo) => photo && photo.private !== true && hasText(photo.src) && hasText(photo.alt)) : [];
  if (publicGallery.length) {
    const section = make("section", "trip-log-section trip-log-gallery-section day-container");
    section.append(make("p", "eyebrow", "Photographs"), make("h2", "", "The day in pictures."));
    const gallery = make("div", "trip-log-gallery");
    publicGallery.forEach((photo, index) => {
      const button = make("button", "trip-log-photo"); button.type = "button"; button.dataset.photoIndex = String(index); button.setAttribute("aria-label", `Open photograph ${index + 1}: ${photo.alt}`);
      const image = new Image(); image.src = photo.src; image.alt = photo.alt; image.loading = "lazy"; image.decoding = "async"; image.width = photo.width || 1200; image.height = photo.height || 900;
      button.append(image);
      if (hasText(photo.caption) || hasText(photo.location)) { const caption = make("span", ""); caption.textContent = [photo.location, photo.caption].filter(hasText).join(" · "); button.append(caption); }
      gallery.append(button);
    });
    section.append(gallery); logView.append(section);
    setupLightbox(gallery, publicGallery);
  }

  if (day.routeChanged && (hasText(day.routeChanged.planned) || hasText(day.routeChanged.actual))) {
    const section = make("section", "trip-log-section trip-log-comparison day-container");
    section.append(make("p", "eyebrow", "Plan versus reality"), make("h2", "", "Plan versus reality"));
    const columns = make("div", "trip-log-comparison-grid");
    [["Planned", day.routeChanged.planned], ["Actually", day.routeChanged.actual]].forEach(([label, value]) => { if (!hasText(value)) return; const column = make("article", ""); column.append(make("h3", "", label), make("p", "", value)); columns.append(column); });
    section.append(columns); logView.append(section);
  }

  hero.after(tabs, planView, logView);

  const selectView = (view, updateHistory) => {
    const showLog = view === "log";
    planButton.setAttribute("aria-selected", String(!showLog)); logButton.setAttribute("aria-selected", String(showLog));
    planButton.tabIndex = showLog ? -1 : 0; logButton.tabIndex = showLog ? 0 : -1;
    planView.hidden = showLog; logView.hidden = !showLog;
    if (updateHistory) history.pushState({ tripView: view }, "", showLog ? "#travel-log" : location.pathname + location.search);
  };
  planButton.addEventListener("click", () => selectView("plan", true));
  logButton.addEventListener("click", () => selectView("log", true));
  tabs.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault(); const target = event.key === "ArrowLeft" || event.key === "Home" ? planButton : logButton; target.focus(); target.click();
  });
  const syncHash = () => selectView(location.hash === "#travel-log" ? "log" : "plan", false);
  window.addEventListener("popstate", syncHash); window.addEventListener("hashchange", syncHash); syncHash();

  function setupLightbox(gallery, photos) {
    const dialog = make("dialog", "trip-log-lightbox");
    const close = make("button", "trip-log-lightbox-close", "Close"); close.type = "button";
    const image = new Image(); image.alt = "";
    const meta = make("p", "");
    const previous = make("button", "trip-log-lightbox-previous", "Previous"); previous.type = "button";
    const next = make("button", "trip-log-lightbox-next", "Next"); next.type = "button";
    dialog.append(close, image, meta, previous, next); document.body.append(dialog);
    let current = 0, opener = null;
    const show = (index) => { current = (index + photos.length) % photos.length; const photo = photos[current]; image.src = photo.src; image.alt = photo.alt; meta.textContent = [photo.location, photo.caption, photo.dateTaken].filter(hasText).join(" · "); previous.disabled = next.disabled = photos.length < 2; };
    gallery.addEventListener("click", (event) => { const button = event.target.closest("button[data-photo-index]"); if (!button) return; opener = button; show(Number(button.dataset.photoIndex)); dialog.showModal(); close.focus(); });
    close.addEventListener("click", () => dialog.close()); previous.addEventListener("click", () => show(current - 1)); next.addEventListener("click", () => show(current + 1));
    dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener("keydown", (event) => { if (event.key === "ArrowLeft") show(current - 1); if (event.key === "ArrowRight") show(current + 1); });
    dialog.addEventListener("close", () => { if (opener) opener.focus(); });
  }
  }
})();
