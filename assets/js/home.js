(function () {
  "use strict";

  document.querySelectorAll("[data-scroll]").forEach((control) => {
    control.addEventListener("click", () => {
      const target = document.querySelector(control.dataset.scroll);
      target?.scrollIntoView({ behavior: "smooth" });
    });
  });

  const journeyCards = document.querySelectorAll(".journey-card");
  if (!journeyCards.length) return;

  document.documentElement.classList.add("journey-ready");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!("IntersectionObserver" in window) || reduceMotion) {
    journeyCards.forEach((card) => card.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12 });

  journeyCards.forEach((card) => observer.observe(card));
})();
