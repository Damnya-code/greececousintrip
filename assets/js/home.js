(function () {
  "use strict";

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  document.querySelectorAll("[data-scroll]").forEach((control) => {
    control.addEventListener("click", () => {
      const target = document.querySelector(control.dataset.scroll);
      target?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    });
  });

  initRouteMap();
  initJourneyCards();

  function initRouteMap() {
    const card = document.querySelector("[data-route-map]");
    const viewport = document.querySelector("[data-route-viewport]");
    const svg = card?.querySelector(".route-map-svg");
    if (!card || !viewport || !svg) return;

    const daytripVehicle = svg.querySelector("#route-daytrip-vehicle");
    const expandButton = card.querySelector("[data-route-expand]");
    const ferryPath = svg.querySelector("#route-path-ferry");
    const roadPath = svg.querySelector("#route-path-road");
    const santoriniPath = svg.querySelector("#route-path-santorini");
    const ferryReveal = svg.querySelector("#route-reveal-ferry");
    const roadReveal = svg.querySelector("#route-reveal-road");
    const santoriniReveal = svg.querySelector("#route-reveal-santorini");
    const ferryVehicle = svg.querySelector("#route-ferry-vehicle");
    const carVehicle = svg.querySelector("#route-car-vehicle");

    const nodes = {
      athens: svg.querySelector('[data-route-stage="athens"]'),
      chania: svg.querySelector('[data-route-stage="chania"]'),
      rethymno: svg.querySelector('[data-route-stage="rethymno"]'),
      heraklion: svg.querySelector('[data-route-stage="heraklion"]'),
      santorini: svg.querySelector('[data-route-stage="santorini"]'),
    };

    const labels = {
      ferry: svg.querySelector(".route-ferry-label"),
      road: svg.querySelector(".route-road-label"),
      daytrip: svg.querySelector(".route-daytrip-label"),
    };

    const paths = [ferryReveal, roadReveal, santoriniReveal].filter(Boolean);

    if (
      paths.length !== 3 ||
      !ferryPath ||
      !roadPath ||
      !santoriniPath ||
      !ferryVehicle ||
      !carVehicle ||
      !daytripVehicle ||
      Object.values(nodes).some((node) => !node)
    ) {
      return;
    }

    let userControlledViewport = false;
    let animationStarted = false;
    let routeIsAnimating = false;

    function setExpanded(expanded, { restoreFocus = false } = {}) {
      card.classList.toggle("is-route-expanded", expanded);
      document.body.classList.toggle("route-map-expanded", expanded);
      expandButton?.setAttribute("aria-expanded", String(expanded));
      expandButton?.setAttribute(
        "aria-label",
        expanded ? "Close expanded route map" : "Expand route map"
      );

      if (restoreFocus) expandButton?.focus();
    }

    expandButton?.addEventListener("click", (event) => {
      event.stopPropagation();
      setExpanded(!card.classList.contains("is-route-expanded"));
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !card.classList.contains("is-route-expanded")) return;
      setExpanded(false, { restoreFocus: true });
    });

    window.addEventListener("resize", () => {
      if (!isMobileMap() && card.classList.contains("is-route-expanded")) {
        setExpanded(false);
      }
    });

    /*
     * Manual interaction permanently disables guided horizontal following.
     * The user remains in control after touching or scrolling the map.
     */
    ["pointerdown", "touchstart", "wheel"].forEach((eventName) => {
      viewport.addEventListener(
        eventName,
        () => {
          userControlledViewport = true;
        },
        { passive: true }
      );
    });

    if (reduceMotion || !("IntersectionObserver" in window)) {
      card.classList.add("is-route-active");
      paths.forEach(showPathImmediately);
      Object.values(nodes).forEach((node) => {
        node.classList.add("is-route-reached");
      });
      Object.values(labels).forEach((label) => {
        label?.classList.add("is-route-label-visible");
      });
      placeVehicleAt(ferryVehicle, ferryPath, 0.54, 0);
      placeVehicleAt(carVehicle, roadPath, 0.52, 0);
      placeVehicleAt(daytripVehicle, santoriniPath, 0.54, 0);
      [ferryVehicle, carVehicle, daytripVehicle].forEach((vehicle) => {
        vehicle.classList.add("is-route-vehicle-visible", "is-route-settled");
      });
      return;
    }

    document.documentElement.classList.add("route-motion-ready");

    paths.forEach(preparePath);
    placeVehicleAt(ferryVehicle, ferryPath, 0, 0);
    placeVehicleAt(carVehicle, roadPath, 0, 0);
    placeVehicleAt(daytripVehicle, santoriniPath, 0, 0);

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (!entry?.isIntersecting || animationStarted) return;

        animationStarted = true;
        observer.disconnect();
        runRouteSequence();
      },
      {
        threshold: 0.35,
        rootMargin: "0px 0px -8% 0px",
      }
    );

    observer.observe(card);

    card.addEventListener("click", (event) => {
      /*
       * Preserve city links and any future interactive controls.
       */
      if (event.target.closest("a, button")) return;

      if (routeIsAnimating) return;

      replayRouteSequence();
    });

    async function replayRouteSequence() {
      routeIsAnimating = true;
      userControlledViewport = false;

      resetRouteSequence();

      if (isMobileMap()) {
        viewport.scrollTo({
          left: 0,
          behavior: "auto",
        });
      }

      /*
       * Two animation frames ensure the browser paints the reset state before
       * the sequence starts again.
       */
      await nextFrame();
      await nextFrame();

      await runRouteSequence();
    }

    async function runRouteSequence() {

      routeIsAnimating = true;
      card.classList.add("is-route-active");

      await wait(520);
      reachNode(nodes.athens);

      /*
       * Athens → Chania
       */
      await wait(340);

      labels.ferry?.classList.add("is-route-label-visible");
      ferryVehicle.classList.add("is-route-vehicle-visible", "is-route-moving");

      await Promise.all([
        drawPath(ferryReveal, 1450),

        moveVehicle({
          vehicle: ferryVehicle,
          path: ferryPath,
          duration: 1450,
          followViewport: true,
        }),
      ]);

      ferryVehicle.classList.remove("is-route-moving");
      ferryVehicle.classList.add("is-route-settled");
      reachNode(nodes.chania);

      /*
       * Chania → Rethymno → Heraklion
       */
      await wait(320);

      labels.road?.classList.add("is-route-label-visible");
      carVehicle.classList.add("is-route-vehicle-visible", "is-route-moving");

      const roadDuration = 1850;

      await Promise.all([
        drawPath(roadReveal, roadDuration),

        moveVehicle({
          vehicle: carVehicle,
          path: roadPath,
          duration: roadDuration,
          followViewport: true,

          onProgress(progress) {
            if (progress >= 0.45) {
              reachNode(nodes.rethymno);
            }

            if (progress >= 0.96) {
              reachNode(nodes.heraklion);
            }
          },
        }),
      ]);

      carVehicle.classList.remove("is-route-moving");
      carVehicle.classList.add("is-route-settled");

      /*
       * Heraklion → Santorini
       */
      await wait(300);

      labels.daytrip?.classList.add("is-route-label-visible");
      daytripVehicle.classList.add("is-route-vehicle-visible", "is-route-moving");

      await Promise.all([
        drawPath(santoriniReveal, 1200),

        moveVehicle({
          vehicle: daytripVehicle,
          path: santoriniPath,
          duration: 1200,
          followViewport: true,
        }),
      ]);

      daytripVehicle.classList.remove("is-route-moving");
      daytripVehicle.classList.add("is-route-settled");
      reachNode(nodes.santorini);

      /*
       * Leave the mobile viewport at the final part of the route.
       */
      if (isMobileMap() && !userControlledViewport) {
        await wait(360);

        viewport.scrollTo({
          left: Math.max(
            0,
            viewport.scrollWidth - viewport.clientWidth - 18
          ),
          behavior: "smooth",
        });
      }

      routeIsAnimating = false;
    }
    function preparePath(path) {
      const length = path.getTotalLength();

      path.style.strokeDasharray = `${length} ${length}`;
      path.style.strokeDashoffset = `${length}`;
    }

    function showPathImmediately(path) {
      const length = path.getTotalLength();

      path.style.strokeDasharray = `${length}`;
      path.style.strokeDashoffset = "0";
    }

    function drawPath(path, duration, options = {}) {
      return animateProgress(duration, (progress) => {
        const length = path.getTotalLength();
        const eased = easeInOutCubic(progress);

        path.style.strokeDashoffset = `${length * (1 - eased)}`;
        options.onProgress?.(eased);
      });
    }

    function resetRouteSequence() {
      card.classList.remove("is-route-active");

      Object.values(nodes).forEach((node) => {
        node.classList.remove(
          "is-route-reached",
          "is-route-current"
        );
      });

      Object.values(labels).forEach((label) => {
        label?.classList.remove("is-route-label-visible");
      });

      [
        ferryVehicle,
        carVehicle,
        daytripVehicle,
      ].forEach((vehicle) => {
        vehicle.classList.remove(
          "is-route-vehicle-visible",
          "is-route-moving",
          "is-route-settled"
        );
      });

      paths.forEach(preparePath);

      placeVehicleAt(ferryVehicle, ferryPath, 0, 0);
      placeVehicleAt(carVehicle, roadPath, 0, 0);
      placeVehicleAt(daytripVehicle, santoriniPath, 0, 0);
    }

    function moveVehicle({
      vehicle,
      path,
      duration,
      followViewport = false,
      onProgress,
    }) {
      return animateProgress(duration, (progress) => {
        const eased = easeInOutCubic(progress);
        const point = placeVehicleAt(vehicle, path, eased, 0);

        onProgress?.(eased);

        if (
          followViewport &&
          isMobileMap() &&
          !userControlledViewport
        ) {
          guideViewportToPoint(point);
        }
      });
    }

    function placeVehicleAt(vehicle, path, progress, rotationOffset = 0) {
      const length = path.getTotalLength();
      const distance = Math.max(0, Math.min(length, length * progress));
      const point = path.getPointAtLength(distance);
      const nextPoint = path.getPointAtLength(
        Math.min(length, distance + 1.5)
      );

      const angle =
        Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x) *
        (180 / Math.PI) +
        rotationOffset;

      vehicle.setAttribute(
        "transform",
        `translate(${point.x} ${point.y}) rotate(${angle})`
      );

      return point;
    }

    function guideViewportToPoint(svgPoint) {
      const viewBox = svg.viewBox.baseVal;
      const scale = svg.clientWidth / viewBox.width;
      const pointInPixels = svgPoint.x * scale;
      const desiredLeft =
        pointInPixels - viewport.clientWidth * 0.48;

      const maximumLeft =
        viewport.scrollWidth - viewport.clientWidth;

      viewport.scrollLeft = Math.max(
        0,
        Math.min(maximumLeft, desiredLeft)
      );
    }

    function reachNode(node) {
      if (node.classList.contains("is-route-reached")) return;

      Object.values(nodes).forEach((candidate) => {
        candidate.classList.remove("is-route-current");
      });

      node.classList.add("is-route-reached", "is-route-current");

      window.setTimeout(() => {
        node.classList.remove("is-route-current");
      }, 760);
    }

    function isMobileMap() {
      return window.matchMedia("(max-width: 620px)").matches;
    }
  }

  function initJourneyCards() {
    const journeyCards = document.querySelectorAll(".journey-card");

    if (!journeyCards.length) return;

    document.documentElement.classList.add("journey-ready");

    if (!("IntersectionObserver" in window) || reduceMotion) {
      journeyCards.forEach((card) => card.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12 }
    );

    journeyCards.forEach((card) => observer.observe(card));
  }

  function animateProgress(duration, update) {
    return new Promise((resolve) => {
      const start = performance.now();

      function frame(now) {
        const progress = Math.min(1, (now - start) / duration);
        update(progress);

        if (progress < 1) {
          requestAnimationFrame(frame);
          return;
        }

        resolve();
      }

      requestAnimationFrame(frame);
    });
  }

  function easeInOutCubic(value) {
    return value < 0.5
      ? 4 * value * value * value
      : 1 - Math.pow(-2 * value + 2, 3) / 2;
  }

  function wait(duration) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, duration);
    });
  }

  function nextFrame() {
    return new Promise((resolve) => {
      requestAnimationFrame(resolve);
    });
  }
})();
