(function () {
  "use strict";

  if (window.parent !== window) {
    document.body.replaceChildren();
    document.body.hidden = true;
    document.documentElement.dataset.travelLogEditorGuarded = "";
    return;
  }

  if (!window.matchMedia("(min-width: 761px)").matches) {
    document.body.dataset.editorDesktopOnly = "";
    return;
  }

  document.body.dataset.editorEnabled = "";
  const preview = document.getElementById("travel-log-editor-preview");
  if (preview?.dataset.src) preview.src = preview.dataset.src;

  [
    "../data/trip-config.js",
    "../data/trip-log-index.js",
    "../assets/vendor/jszip/jszip.min.js",
    "../assets/js/travel-log-package-export.js",
    "../assets/js/travel-log-editor.js"
  ].reduce((ready, source) => ready.then(() => loadScript(source)), Promise.resolve());

  function loadScript(source) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = source;
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", reject, { once: true });
      document.body.append(script);
    });
  }
})();
