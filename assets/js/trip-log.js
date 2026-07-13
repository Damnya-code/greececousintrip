(function () {
  "use strict";

  const config = window.TRIP_CONFIG;
  const manifest = window.TRIP_LOG_INDEX;
  const pageIsLog = document.body.hasAttribute("data-travel-log-page");
  const localHost = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  const preview = localHost && new URLSearchParams(location.search).get("preview") === "travel-log";
  const featureEnabled = config?.features?.travelLog === true;

  if (!validManifest(config, manifest)) {
    if (pageIsLog) returnToItinerary();
    return;
  }

  const configuredDays = new Map(config.days.map((day) => [day.id, day]));
  const entries = Object.entries(manifest.days)
    .map(([dayId, publication]) => ({ dayId, publication, day: configuredDays.get(dayId) }))
    .filter(({ publication, day }) => day && validPublication(publication));
  const visibleEntries = entries.filter(({ publication }) => publication.state === "published" || (preview && publication.state === "draft"));

  if (!pageIsLog) {
    if (!featureEnabled) return;
    enhancePublicNavigation(entries.filter(({ publication }) => publication.state === "published"));
    return;
  }

  if ((!featureEnabled && !preview) || !visibleEntries.length) {
    returnToItinerary();
    return;
  }

  loadAndRender(visibleEntries);

  function validManifest(sharedConfig, index) {
    return Boolean(
      sharedConfig &&
      Array.isArray(sharedConfig.days) &&
      index?.version === 2 &&
      index.days &&
      typeof index.days === "object"
    );
  }

  function validPublication(publication) {
    return Boolean(
      publication &&
      ["hidden", "draft", "published"].includes(publication.state) &&
      (publication.state === "hidden" || /^trip-log\/day-0[1-7]\.js$/.test(publication.file || ""))
    );
  }

  function returnToItinerary() {
    location.replace(new URL("index.html#itinerary", document.baseURI));
  }

  function pagePrefix() {
    return document.body.classList.contains("day-page") ? "../" : "";
  }

  function travelLogUrl(dayId = "") {
    const query = preview ? "?preview=travel-log" : "";
    return `${pagePrefix()}travel-log.html${query}${dayId ? `#${dayId}` : ""}`;
  }

  function enhancePublicNavigation(publications) {
    if (!publications.length) return;

    const nav = document.querySelector(".nav nav");
    if (nav && !nav.querySelector("[data-travel-log-link]")) {
      const link = document.createElement("a");
      link.dataset.travelLogLink = "";
      link.href = travelLogUrl();
      link.textContent = "Travel Log";
      nav.append(link);
    }

    if (document.body.classList.contains("day-page")) return;

    const publishedIds = new Set(publications.map(({ dayId }) => dayId));
    document.querySelectorAll(".journey-card[data-trip-day]").forEach((card) => {
      if (!publishedIds.has(card.dataset.tripDay) || card.querySelector("[data-card-travel-log]")) return;
      const planLink = card.querySelector(".journey-copy > a");
      if (!planLink) return;
      const logLink = document.createElement("a");
      logLink.dataset.cardTravelLog = "";
      logLink.className = "journey-log-link";
      logLink.href = travelLogUrl(card.dataset.tripDay);
      logLink.innerHTML = "View the log <span aria-hidden=\"true\">→</span>";
      planLink.after(logLink);
    });
  }

  async function loadAndRender(publications) {
    window.TRIP_LOG_ENTRIES = Object.create(null);

    const loaded = await Promise.all(publications.map(loadEntry));
    const validEntries = loaded.filter(Boolean);
    delete window.TRIP_LOG_ENTRIES;

    if (!validEntries.length) {
      returnToItinerary();
      return;
    }

    renderPage(validEntries);
  }

  function loadEntry({ dayId, publication, day }) {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = new URL(`data/${publication.file}`, document.baseURI).href;
      script.async = true;
      script.addEventListener("load", () => {
        const entry = window.TRIP_LOG_ENTRIES?.[dayId];
        resolve(validEntry(entry, publication, dayId) ? { ...entry, day } : null);
      });
      script.addEventListener("error", () => resolve(null));
      document.head.append(script);
    });
  }

  function validEntry(entry, publication, dayId) {
    return Boolean(
      entry?.version === 2 &&
      entry.dayId === dayId &&
      entry.state === publication.state &&
      typeof entry.date === "string" &&
      typeof entry.place === "string" &&
      Array.isArray(entry.blocks)
    );
  }

  function renderPage(logEntries) {
    const main = document.getElementById("travel-log-main");
    const feed = document.getElementById("travel-log-feed");
    if (!main || !feed) return;

    if (preview) document.getElementById("travel-log-preview-note").hidden = false;

    const renderedChapters = logEntries.map((entry, entryIndex) => {
      const chapter = create("article", "travel-log-chapter");
      chapter.id = entry.dayId;
      chapter.dataset.tripDay = entry.dayId;

      const marker = create("header", "travel-log-chapter-marker");
      marker.append(
        create("time", "", formatDate(entry.date)),
        create("p", "", entry.place)
      );
      marker.querySelector("time").dateTime = entry.date;
      if (entry.prototype === true) marker.append(create("small", "", "Temporary prototype · replace after the trip"));
      chapter.append(marker);

      const renderedBlocks = [];
      entry.blocks.forEach((block, blockIndex) => {
        const renderer = block && blockRenderers[block.type];
        if (!renderer) return;
        const rendered = renderer(block, {
          priority: entryIndex === 0 && blockIndex === 0,
          blockIndex
        });
        if (!rendered) return;
        rendered.classList.add("log-block");
        rendered.dataset.blockType = block.type;
        rendered.dataset.blockIndex = String(blockIndex);
        const generatedId = `${entry.dayId}-block-${String(blockIndex + 1).padStart(2, "0")}`;
        const requestedId = /^moment-[a-z0-9-]+$/.test(block.id || "") ? block.id : generatedId;
        rendered.id = document.getElementById(requestedId) ? generatedId : requestedId;
        renderedBlocks.push(rendered);
        chapter.append(rendered);
      });

      return renderedBlocks.length ? { chapter, entry } : null;
    }).filter(Boolean);

    if (!renderedChapters.length) {
      returnToItinerary();
      return;
    }

    const renderedEntries = renderedChapters.map(({ entry }) => entry);
    renderedChapters.forEach(({ chapter, entry }, index) => {
      chapter.append(renderChapterNavigation(entry, renderedEntries, index));
      feed.append(chapter);
    });

    main.hidden = false;
    setupDayNavigation(renderedEntries);
    document.body.classList.add("travel-log-ready");
    setupRevealMotion();
    activateHashTarget();
  }

  const blockRenderers = {
    photo: renderPhoto,
    collage: renderCollage,
    sequence: renderSequence,
    caption: renderCaption,
    note: renderNote,
    quote: renderQuote,
    video: renderVideo,
    pause: renderPause,
    place: renderPlace
  };

  function renderPhoto(block, context) {
    const figure = renderFigure(block, context);
    if (!figure) return null;
    const presentation = ["full", "contained", "portrait", "quiet"].includes(block.presentation)
      ? block.presentation
      : "contained";
    figure.classList.add("log-photo", `log-photo--${presentation}`);
    return figure;
  }

  function renderCollage(block) {
    const layouts = ["two-up", "feature-left", "feature-right", "film-strip"];
    const layout = layouts.includes(block.layout) ? block.layout : "two-up";
    const images = Array.isArray(block.images) ? block.images.slice(0, 5) : [];
    const collage = create("section", `log-collage log-collage--${layout}`);
    collage.setAttribute("role", "group");
    collage.setAttribute("aria-label", text(block.label) || `${images.length}-image collage`);
    images.forEach((image) => {
      const figure = renderFigure(image, { priority: false, compact: true });
      if (figure) collage.append(figure);
    });
    collage.dataset.count = collage.children.length;
    return collage.children.length ? collage : null;
  }

  function renderSequence(block) {
    const images = Array.isArray(block.images) ? block.images.slice(0, 5) : [];
    const section = create("section", "log-sequence");
    section.setAttribute("role", "group");
    section.setAttribute("aria-label", text(block.label) || "Photographic sequence");
    images.forEach((image) => {
      const figure = renderFigure(image, { priority: false, compact: true });
      if (figure) section.append(figure);
    });
    return section.children.length ? section : null;
  }

  function renderCaption(block) {
    const value = text(block.text);
    return value ? create("p", "log-caption", value) : null;
  }

  function renderNote(block) {
    const paragraphs = Array.isArray(block.paragraphs)
      ? block.paragraphs.map(text).filter(Boolean)
      : [text(block.text)].filter(Boolean);
    if (!paragraphs.length) return null;
    const section = create("section", `log-note${paragraphs.length > 1 ? " log-note--long" : ""}`);
    const heading = text(block.heading);
    if (heading) section.append(create("h2", "", heading));
    paragraphs.forEach((paragraph) => section.append(create("p", "", paragraph)));
    return section;
  }

  function renderQuote(block) {
    const value = text(block.text);
    if (!value) return null;
    const quote = create("blockquote", "log-quote");
    quote.append(create("p", "", value));
    const attribution = text(block.attribution);
    if (attribution) quote.append(create("cite", "", attribution));
    return quote;
  }

  function renderVideo(block) {
    const src = mediaUrl(block.src);
    if (!src || block.private === true) return null;
    const figure = create("figure", "log-video");
    const video = document.createElement("video");
    video.controls = true;
    video.preload = "metadata";
    video.playsInline = true;
    video.src = src;
    const poster = mediaUrl(block.poster);
    if (poster) video.poster = poster;
    if (Array.isArray(block.tracks)) {
      block.tracks.slice(0, 3).forEach((trackData) => {
        const trackSrc = mediaUrl(trackData?.src);
        if (!trackSrc) return;
        const track = document.createElement("track");
        track.src = trackSrc;
        track.kind = ["captions", "descriptions", "subtitles"].includes(trackData.kind)
          ? trackData.kind
          : "captions";
        if (text(trackData.srclang)) track.srclang = trackData.srclang;
        if (text(trackData.label)) track.label = trackData.label;
        track.default = trackData.default === true;
        video.append(track);
      });
    }
    const label = text(block.alt) || "Travel Log video";
    video.setAttribute("aria-label", label);
    figure.append(video);
    appendCaption(figure, block);
    return figure;
  }

  function renderPause(block) {
    const pause = create("div", "log-pause");
    pause.append(document.createElement("hr"));
    const value = text(block.text);
    if (value) pause.append(create("p", "", value));
    return pause;
  }

  function renderPlace(block) {
    const name = text(block.name);
    if (!name) return null;
    const aside = create("aside", "log-place");
    const map = safeHttpUrl(block.mapUrl);
    if (map) {
      const link = create("a", "", name);
      link.href = map;
      link.target = "_blank";
      link.rel = "noopener";
      aside.append(link);
    } else {
      aside.append(create("strong", "", name));
    }
    const note = text(block.note);
    if (note) aside.append(create("p", "", note));
    return aside;
  }

  function renderFigure(media, { priority = false, compact = false } = {}) {
    const src = mediaUrl(media?.src);
    if (!src || media.private === true) return null;
    const decorative = media.decorative === true;
    const alt = text(media.alt);
    if (!decorative && !alt) return null;

    const figure = create("figure", compact ? "log-media log-media--compact" : "log-media");
    const picture = document.createElement("picture");
    if (Array.isArray(media.sources)) {
      media.sources.forEach((sourceData) => {
        const srcset = text(sourceData?.srcset);
        if (!srcset || /javascript:/i.test(srcset)) return;
        const source = document.createElement("source");
        source.srcset = srcset;
        if (text(sourceData.type)) source.type = sourceData.type;
        if (text(sourceData.media)) source.media = sourceData.media;
        picture.append(source);
      });
    }
    const image = new Image();
    image.src = src;
    image.alt = decorative ? "" : alt;
    if (decorative) image.setAttribute("role", "presentation");
    image.loading = priority ? "eager" : "lazy";
    image.decoding = "async";
    if (priority) image.fetchPriority = "high";
    if (positiveNumber(media.width)) image.width = media.width;
    if (positiveNumber(media.height)) image.height = media.height;
    image.sizes = text(media.sizes) || (compact ? "(max-width: 700px) 100vw, 50vw" : "100vw");
    if (text(media.focalPoint)) image.style.objectPosition = media.focalPoint;
    if (media.crop === true) figure.classList.add("log-media--crop");
    picture.append(image);
    figure.append(picture);
    appendCaption(figure, media);
    return figure;
  }

  function appendCaption(figure, media) {
    const parts = [text(media.location), text(media.caption), text(media.time)].filter(Boolean);
    if (!parts.length) return;
    const caption = create("figcaption", "");
    parts.forEach((part, index) => {
      if (index) caption.append(document.createTextNode(" · "));
      caption.append(document.createTextNode(part));
    });
    figure.append(caption);
  }

  function renderChapterNavigation(entry, allEntries, index) {
    const nav = create("nav", "travel-log-chapter-nav");
    nav.setAttribute("aria-label", `${entry.place} chapter navigation`);
    const planLink = create("a", "", `Open Day ${entry.day.number} Guide`);
    planLink.href = `days/${entry.day.path}`;
    nav.append(planLink);
    const next = allEntries[index + 1];
    if (next) {
      const nextLink = create("a", "", `Continue to Day ${next.day.number}`);
      nextLink.href = `#${next.dayId}`;
      nav.append(nextLink);
    } else {
      const finalConfiguredDay = config.days[config.days.length - 1];
      const tripIsComplete = entry.state === "published" && entry.day.id === finalConfiguredDay?.id;
      nav.append(create("span", "", tripIsComplete ? "End of the Travel Log" : "Latest chapter"));
    }
    return nav;
  }

  function setupDayNavigation(logEntries) {
    const nav = document.getElementById("travel-log-day-nav");
    const fallback = document.querySelector(".travel-log-fallback-nav");
    if (!nav || !logEntries.length) return;

    const previous = create("a", "travel-log-day-step travel-log-day-step--previous");
    previous.dataset.logPrevious = "";
    previous.append(
      create("span", "travel-log-day-arrow", "←"),
      create("span", "travel-log-day-step-label", "Previous")
    );
    previous.querySelector(".travel-log-day-arrow").setAttribute("aria-hidden", "true");

    const chooser = create("div", "travel-log-day-chooser");
    const chooserButton = create("button", "travel-log-day-current");
    chooserButton.type = "button";
    chooserButton.id = "travel-log-day-button";
    chooserButton.setAttribute("aria-expanded", "false");
    chooserButton.setAttribute("aria-controls", "travel-log-day-menu");
    chooserButton.setAttribute("aria-haspopup", "true");
    const currentNumber = create("span", "travel-log-current-number");
    const currentPlace = create("span", "travel-log-current-place");
    const chevron = create("span", "travel-log-day-chevron");
    chevron.setAttribute("aria-hidden", "true");
    chooserButton.append(currentNumber, currentPlace, chevron);

    const menu = create("div", "travel-log-day-menu");
    menu.id = "travel-log-day-menu";
    menu.hidden = true;
    menu.setAttribute("aria-label", "Available Travel Log chapters");
    const menuLinks = new Map();
    logEntries.forEach((entry) => {
      const link = create("a", "", `Day ${entry.day.number} · ${entry.place}`);
      link.href = `#${entry.dayId}`;
      link.dataset.logDay = entry.dayId;
      menu.append(link);
      menuLinks.set(entry.dayId, link);
    });
    chooser.append(chooserButton, menu);

    const next = create("a", "travel-log-day-step travel-log-day-step--next");
    next.dataset.logNext = "";
    next.append(
      create("span", "travel-log-day-step-label", "Next"),
      create("span", "travel-log-day-arrow", "→")
    );
    next.querySelector(".travel-log-day-arrow").setAttribute("aria-hidden", "true");

    const guide = create("a", "travel-log-day-guide", "Day guide");
    guide.dataset.logGuide = "";
    nav.replaceChildren(previous, chooser, next, guide);
    nav.hidden = false;
    if (fallback) fallback.hidden = true;

    const entryIndex = new Map(logEntries.map((entry, index) => [entry.dayId, index]));
    let activeDayId = "";

    function setStep(link, entry, direction) {
      if (!entry) {
        link.removeAttribute("href");
        link.setAttribute("aria-disabled", "true");
        link.setAttribute("tabindex", "-1");
        link.setAttribute("aria-label", `No ${direction} log day`);
        return;
      }
      link.href = `#${entry.dayId}`;
      link.removeAttribute("aria-disabled");
      link.removeAttribute("tabindex");
      link.setAttribute("aria-label", `${direction[0].toUpperCase()}${direction.slice(1)} log day: Day ${entry.day.number}, ${entry.place}`);
    }

    function setActiveChapter(dayId) {
      const index = entryIndex.get(dayId);
      if (index === undefined || activeDayId === dayId) return;
      activeDayId = dayId;
      const entry = logEntries[index];
      currentNumber.textContent = `Day ${entry.day.number}`;
      currentPlace.textContent = entry.place;
      chooserButton.setAttribute("aria-label", `Choose Travel Log day. Current: Day ${entry.day.number}, ${entry.place}`);
      guide.href = `days/${entry.day.path}`;
      guide.setAttribute("aria-label", `Open Day ${entry.day.number} Guide`);
      setStep(previous, logEntries[index - 1], "previous");
      setStep(next, logEntries[index + 1], "next");
      menuLinks.forEach((link, linkDayId) => {
        if (linkDayId === dayId) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      });
    }

    function closeMenu({ restoreFocus = false } = {}) {
      menu.hidden = true;
      chooserButton.setAttribute("aria-expanded", "false");
      if (restoreFocus) chooserButton.focus();
    }

    chooserButton.addEventListener("click", () => {
      const opening = menu.hidden;
      menu.hidden = !opening;
      chooserButton.setAttribute("aria-expanded", String(opening));
    });
    menu.addEventListener("click", (event) => {
      const link = event.target.closest("a[data-log-day]");
      if (!link) return;
      setActiveChapter(link.dataset.logDay);
      closeMenu();
    });
    document.addEventListener("click", (event) => {
      if (!menu.hidden && !chooser.contains(event.target)) closeMenu();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !menu.hidden) closeMenu({ restoreFocus: true });
    });
    window.addEventListener("hashchange", () => {
      const dayId = location.hash.slice(1);
      if (entryIndex.has(dayId)) setActiveChapter(dayId);
    });

    const initialDayId = entryIndex.has(location.hash.slice(1)) ? location.hash.slice(1) : logEntries[0].dayId;
    setActiveChapter(initialDayId);

    if (!("IntersectionObserver" in window)) return;
    const visibleChapters = new Map();
    const chapterObserver = new IntersectionObserver((observations) => {
      observations.forEach((observation) => visibleChapters.set(observation.target, observation.isIntersecting));
      const closest = [...visibleChapters]
        .filter(([, isVisible]) => isVisible)
        .map(([chapter]) => chapter)
        .sort((a, b) => Math.abs(a.getBoundingClientRect().top - 58) - Math.abs(b.getBoundingClientRect().top - 58))[0];
      if (closest?.dataset.tripDay) setActiveChapter(closest.dataset.tripDay);
    }, { rootMargin: "-58px 0px -68% 0px", threshold: 0 });
    logEntries.forEach((entry) => {
      const chapter = document.getElementById(entry.dayId);
      if (chapter) chapterObserver.observe(chapter);
    });
  }

  function setupRevealMotion() {
    const candidates = document.querySelectorAll(".log-photo--full, .log-photo--portrait, .log-collage");
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      candidates.forEach((element) => element.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entriesToReveal) => {
      entriesToReveal.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "80px 0px", threshold: 0.08 });
    candidates.forEach((element) => observer.observe(element));
  }

  function activateHashTarget() {
    if (!location.hash) return;
    const target = document.querySelector(location.hash);
    if (!target) return;
    requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
  }

  function create(tag, className, value) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value) element.textContent = value;
    return element;
  }

  function text(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function positiveNumber(value) {
    return Number.isFinite(value) && value > 0;
  }

  function safeHttpUrl(value) {
    if (!text(value)) return "";
    try {
      const url = new URL(value, document.baseURI);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  function mediaUrl(value) {
    const url = safeHttpUrl(value);
    if (!url) return "";
    return new URL(url).origin === location.origin ? url : "";
  }

  function formatDate(value, { short = false } = {}) {
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("en-GB", short
      ? { day: "numeric", month: "short" }
      : { day: "numeric", month: "long", year: "numeric" }).format(date);
  }
})();
