(function () {
  "use strict";

  const storageKey = "aegeanEssentialsChecklist:v1";
  const boxes = [...document.querySelectorAll("[data-item]")];
  const feedback = document.querySelector("#checklist-feedback");
  const clearButton = document.querySelector("#clear-completed");
  if (!boxes.length) return;

  let savedState = {};
  try {
    savedState = JSON.parse(localStorage.getItem(storageKey)) || {};
  } catch {
    // Invalid saved state is treated as an empty checklist.
  }

  const saveChecklist = () => {
    const state = Object.fromEntries(boxes.map((box) => [box.dataset.item, box.checked]));
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      if (feedback) feedback.textContent = "The checklist could not be saved on this device.";
    }
  };

  boxes.forEach((box) => {
    box.checked = savedState[box.dataset.item] === true;
    box.addEventListener("change", saveChecklist);
  });

  clearButton?.addEventListener("click", () => {
    const completed = boxes.filter((box) => box.checked);
    if (!completed.length) {
      if (feedback) feedback.textContent = "Nothing completed to clear yet.";
      return;
    }
    completed.forEach((box) => { box.checked = false; });
    saveChecklist();
    if (feedback) feedback.textContent = "Completed items cleared.";
  });
})();
