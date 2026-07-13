(function () {
  "use strict";

  const fallbackLink = document.querySelector(".day-nav > .nav-link-button");
  const currentDayId = document.body.dataset.tripDay;
  const days = window.TRIP_CONFIG?.days;
  const currentIndex = Array.isArray(days) ? days.findIndex((day) => day.id === currentDayId) : -1;

  if (!fallbackLink || currentIndex < 0) return;

  const switcher = document.createElement("div");
  switcher.className = "day-jump";
  const menuId = `day-jump-menu-${currentDayId}`;
  const previous = days[currentIndex - 1];
  const next = days[currentIndex + 1];
  const step = (day, direction, symbol) => day
    ? `<a class="day-jump-step" href="${day.path}" aria-label="${direction}: ${day.title}">${symbol}</a>`
    : `<span class="day-jump-step" aria-disabled="true" aria-hidden="true">${symbol}</span>`;
  const menuDays = days.map((day) => `
    <a href="${day.path}"${day.id === currentDayId ? ' aria-current="page"' : ""}>
      <span>Day ${String(day.number).padStart(2, "0")}</span>
      <strong>${day.title}</strong>
    </a>`).join("");

  switcher.innerHTML = `
    ${step(previous, "Previous day", "‹")}
    <button class="day-jump-current" type="button" aria-expanded="false" aria-controls="${menuId}"
      aria-label="Choose a day. Currently Day ${days[currentIndex].number}: ${days[currentIndex].title}">
      <span>Days</span>
    </button>
    ${step(next, "Next day", "›")}
    <div class="day-jump-menu" id="${menuId}" role="navigation" aria-label="Choose a day" hidden>
      <a href="../index.html#itinerary">All days</a>
      ${menuDays}
    </div>`;

  fallbackLink.replaceWith(switcher);

  const button = switcher.querySelector(".day-jump-current");
  const menu = switcher.querySelector(".day-jump-menu");
  const closeMenu = ({ restoreFocus = false } = {}) => {
    menu.hidden = true;
    button.setAttribute("aria-expanded", "false");
    if (restoreFocus) button.focus();
  };

  button.addEventListener("click", () => {
    const opening = menu.hidden;
    menu.hidden = !opening;
    button.setAttribute("aria-expanded", String(opening));
    if (opening) menu.querySelector('[aria-current="page"]')?.focus();
  });

  document.addEventListener("click", (event) => {
    if (!switcher.contains(event.target)) closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !menu.hidden) closeMenu({ restoreFocus: true });
  });
})();
