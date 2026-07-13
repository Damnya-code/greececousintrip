(function () {
  "use strict";

  const list = document.querySelector("#checklist");
  const bookings = window.TRIP_CONFIG?.bookings;
  if (!list || !Array.isArray(bookings)) return;

  const storageKey = "aegeanBookings";
  let saved = [];
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (Array.isArray(stored)) saved = stored;
  } catch {
    // Invalid old state should not prevent the checklist from rendering.
  }

  list.innerHTML = bookings.map(([title, detail], index) => `
    <li>
      <label for="booking-${index}"><strong>${title}</strong><small>${detail}</small></label>
      <input id="booking-${index}" aria-label="Mark ${title} booked" type="checkbox" data-booking="${index}"${saved.includes(index) ? " checked" : ""}>
    </li>`).join("");

  list.addEventListener("change", () => {
    const completed = [...list.querySelectorAll("input:checked")].map((input) => Number(input.dataset.booking));
    localStorage.setItem(storageKey, JSON.stringify(completed));
  });
})();
