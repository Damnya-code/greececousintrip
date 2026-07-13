(function () {
  "use strict";

  const config = window.TRIP_CONFIG;
  const manifest = window.TRIP_LOG_INDEX;
  if (!config || !Array.isArray(config.days)) return;

  const ENTRY_VERSION = 2;
  const EDITOR_VERSION = 1;
  const STORAGE_PREFIX = "aegeanTravelLogEditor:v1:";
  const LAST_DAY_KEY = "aegeanTravelLogEditor:lastDay";
  const DATABASE_NAME = "aegeanTravelLogEditor";
  const MEDIA_STORE = "media";
  const HISTORY_LIMIT = 40;
  const BLOCK_TYPES = ["photo", "collage", "sequence", "caption", "note", "quote", "video", "pause", "place"];
  const COLLAGE_LAYOUTS = ["two-up", "feature-left", "feature-right", "film-strip"];
  const PHOTO_PRESENTATIONS = ["full", "contained", "portrait", "quiet"];
  const WIDTHS = ["full", "wide", "normal", "narrow"];
  const SPACING = ["tight", "normal", "spacious"];
  const CROPS = ["natural", "landscape", "square", "portrait"];
  const ENTRY_STATES = ["hidden", "draft", "published"];
  const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
  const VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg"];

  const daysById = new Map(config.days.map((day) => [day.id, day]));
  const elements = {
    body: document.body,
    day: document.getElementById("editor-day"),
    entryState: document.getElementById("editor-entry-state"),
    summary: document.querySelector("[data-entry-summary]"),
    templates: document.querySelector("[data-template-grid]"),
    addBlocks: document.querySelector("[data-add-blocks]"),
    blockList: document.querySelector("[data-block-list]"),
    blockEmpty: document.querySelector("[data-block-empty]"),
    blockCount: document.querySelector("[data-block-count]"),
    settingsForm: document.querySelector("[data-settings-form]"),
    settingsEmpty: document.querySelector("[data-settings-empty]"),
    selectedAnnouncement: document.querySelector("[data-selected-announcement]"),
    saveState: document.querySelector("[data-save-state]"),
    status: document.querySelector("[data-editor-status]"),
    preview: document.getElementById("travel-log-editor-preview"),
    previewStage: document.querySelector("[data-preview-stage]"),
    importFile: document.getElementById("editor-import-file")
  };

  const runtimeUrls = new Map();
  let current = emptyEditorState();
  let undoStack = [];
  let redoStack = [];
  let autosaveTimer = 0;
  let previewTimer = 0;
  let toastTimer = 0;
  let previewReady = false;
  let draggedBlockId = "";

  const templates = {
    "photo-story": {
      name: "Photo Story",
      description: "A paced visual chapter with a journal close.",
      diagram: [100, 18, 62, 82, 48, 30],
      blocks: () => [
        photo("full", "Add opening photograph"),
        caption("Add a short caption"),
        collage("feature-left", 3, "Add a feature collage"),
        photo("portrait", "Add portrait photograph"),
        sequence(3, "Add a photo sequence"),
        note("Add closing note")
      ]
    },
    "photo-dump": {
      name: "Photo Dump",
      description: "A looser run of photographs with varied scale.",
      diagram: [100, 50, 38, 68, 32],
      blocks: () => [
        photo("full", "Add opening photograph"),
        collage("two-up", 2, "Add two photographs"),
        sequence(4, "Add a film-strip sequence"),
        collage("feature-right", 3, "Add a feature collage"),
        photo("quiet", "Add quiet closing photograph")
      ]
    },
    journal: {
      name: "Journal",
      description: "Photographs spaced with longer writing.",
      diagram: [88, 24, 50, 32, 76, 20, 58],
      blocks: () => [
        photo("full", "Add opening photograph"),
        note("Add a short note"),
        collage("two-up", 2, "Add two photographs"),
        journal("Add journal text"),
        photo("portrait", "Add portrait photograph"),
        quote("Add a memorable quote"),
        photo("contained", "Add final photograph")
      ]
    },
    minimal: {
      name: "Minimal",
      description: "Four deliberate moments with little framing.",
      diagram: [100, 18, 54, 72],
      blocks: () => [
        photo("full", "Add opening photograph"),
        caption("Add a short caption"),
        collage("two-up", 2, "Add a collage"),
        photo("quiet", "Add final photograph")
      ]
    },
    "food-places": {
      name: "Food and Places",
      description: "Details, locations and a chronological sequence.",
      diagram: [92, 58, 22, 30, 64, 18],
      blocks: () => [
        photo("full", "Add opening photograph"),
        collage("two-up", 2, "Add food or detail photographs"),
        note("Add a short note"),
        place("Add a place"),
        sequence(3, "Add a photo sequence"),
        quote("Add a closing quote")
      ]
    },
    blank: {
      name: "Blank",
      description: "Start with an empty entry.",
      diagram: [8],
      blocks: () => []
    }
  };

  const addBlockChoices = [
    ["Photo", () => photo("contained", "Add photograph")],
    ["Collage", () => collage("two-up", 2, "Add a collage")],
    ["Photo sequence", () => sequence(3, "Add a photo sequence")],
    ["Caption", () => caption("Add a short caption")],
    ["Note", () => note("Add a note")],
    ["Journal", () => journal("Add journal text")],
    ["Quote", () => quote("Add a quote")],
    ["Video", () => video("Add a video")],
    ["Place", () => place("Add a place")],
    ["Pause", () => pause("Add a quiet pause")]
  ];

  initialise();

  function initialise() {
    populateDays();
    renderTemplates();
    renderAddButtons();
    bindStaticEvents();
    elements.body.dataset.editorArea = "content";
    const lastDay = localStorage.getItem(LAST_DAY_KEY);
    if (daysById.has(lastDay)) selectDay(lastDay);
    else renderAll();
  }

  function emptyEditorState(dayId = "") {
    const day = daysById.get(dayId);
    return {
      dayId,
      entry: day ? newEntry(day) : null,
      media: {},
      selectedBlockId: "",
      previewWidth: "desktop",
      previewTheme: "light"
    };
  }

  function newEntry(day) {
    return {
      version: ENTRY_VERSION,
      dayId: day.id,
      state: "draft",
      date: dayDate(day),
      place: day.title,
      blocks: []
    };
  }

  function dayDate(day) {
    const start = new Date(`${config.trip.startDate}T12:00:00`);
    start.setDate(start.getDate() + Number(day.number) - 1);
    return start.toISOString().slice(0, 10);
  }

  function populateDays() {
    elements.day.append(option("", "Choose a trip day"));
    config.days.forEach((day) => elements.day.append(option(day.id, `Day ${day.number} · ${day.title}`)));
  }

  function renderTemplates() {
    Object.entries(templates).forEach(([id, template]) => {
      const button = create("button", "template-card");
      button.type = "button";
      button.dataset.template = id;
      button.append(create("strong", "", template.name), create("small", "", template.description));
      const diagram = create("span", "template-diagram");
      diagram.setAttribute("aria-hidden", "true");
      template.diagram.forEach((height) => {
        const part = document.createElement("i");
        part.style.setProperty("--diagram-height", `${height}%`);
        diagram.append(part);
      });
      button.prepend(diagram);
      elements.templates.append(button);
    });
  }

  function renderAddButtons() {
    addBlockChoices.forEach(([label], index) => {
      const button = create("button", "", label);
      button.type = "button";
      button.dataset.addBlock = String(index);
      elements.addBlocks.append(button);
    });
  }

  function bindStaticEvents() {
    elements.day.addEventListener("change", () => selectDay(elements.day.value));
    elements.entryState.addEventListener("change", () => {
      if (!current.entry) return;
      mutate(() => { current.entry.state = elements.entryState.value; });
    });
    elements.templates.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-template]");
      if (button) applyTemplate(button.dataset.template);
    });
    elements.addBlocks.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-add-block]");
      if (!button) return;
      const choice = addBlockChoices[Number(button.dataset.addBlock)];
      if (choice) addBlock(choice[1]());
    });
    elements.blockList.addEventListener("click", handleBlockListClick);
    elements.blockList.addEventListener("dragstart", handleDragStart);
    elements.blockList.addEventListener("dragover", (event) => event.preventDefault());
    elements.blockList.addEventListener("drop", handleDrop);
    document.addEventListener("click", handleAction);
    elements.importFile.addEventListener("change", importSelectedFile);
    document.querySelectorAll("[data-preview-width]").forEach((button) => button.addEventListener("click", () => setPreviewWidth(button.dataset.previewWidth)));
    document.querySelectorAll("[data-preview-theme]").forEach((button) => button.addEventListener("click", () => setPreviewTheme(button.dataset.previewTheme)));
    setupMobileTabs();
    elements.preview.addEventListener("load", () => {
      previewReady = true;
      window.setTimeout(() => renderPreview(), 80);
    });
    window.addEventListener("message", (event) => {
      if (event.origin !== location.origin || event.source !== elements.preview.contentWindow) return;
      if (event.data?.type === "travel-log-editor:ready") {
        previewReady = true;
        renderPreview();
      }
    });
    window.addEventListener("beforeunload", revokeAllRuntimeUrls);
  }

  function setupMobileTabs() {
    const tabs = [...document.querySelectorAll("[data-editor-area]")];
    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => activateEditorArea(tab.dataset.editorArea));
      tab.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
        tabs[next].focus();
        activateEditorArea(tabs[next].dataset.editorArea);
      });
    });
  }

  function activateEditorArea(area) {
    elements.body.dataset.editorArea = area;
    document.querySelectorAll("[data-editor-area]").forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.editorArea === area)));
  }

  async function selectDay(dayId, { preferDraft = true } = {}) {
    if (current.dayId) await saveDraftNow();
    revokeAllRuntimeUrls();
    undoStack = [];
    redoStack = [];
    current = emptyEditorState(dayId);
    elements.day.value = dayId;
    if (dayId) localStorage.setItem(LAST_DAY_KEY, dayId);

    let restoredDraft = null;
    if (dayId && preferDraft) {
      restoredDraft = restoreDraft(dayId);
      if (restoredDraft) current = restoredDraft;
    }
    await restoreRuntimeUrls();
    renderAll();
    updateHistoryButtons();
    if (dayId) notify(restoredDraft ? "Local draft restored." : "No local draft found. New draft ready.");
  }

  function applyTemplate(templateId) {
    if (!ensureDay()) return;
    const template = templates[templateId];
    if (!template) return;
    if (current.entry.blocks.length && !window.confirm("Replace the current blocks with this template? Your local draft can still be recovered with Undo.")) return;
    mutate(() => {
      current.entry.blocks = template.blocks();
      current.selectedBlockId = current.entry.blocks[0]?.id || "";
    }, { settings: true });
    notify(`${template.name} template applied.`);
  }

  function addBlock(block) {
    if (!ensureDay()) return;
    mutate(() => {
      current.entry.blocks.push(block);
      current.selectedBlockId = block.id;
    }, { settings: true });
    if (matchMedia("(max-width: 760px)").matches) activateEditorArea("settings");
  }

  function handleBlockListClick(event) {
    const item = event.target.closest("[data-block-id]");
    if (!item) return;
    const blockId = item.dataset.blockId;
    const action = event.target.closest("button[data-block-action]")?.dataset.blockAction;
    if (!action) {
      selectBlock(blockId);
      return;
    }
    if (action === "select") return selectBlock(blockId);
    const index = blockIndex(blockId);
    if (index < 0) return;
    if (action === "up") return moveBlock(index, index - 1);
    if (action === "down") return moveBlock(index, index + 1);
    if (action === "duplicate") return duplicateBlock(index);
    if (action === "delete") return deleteBlock(index);
  }

  function selectBlock(blockId) {
    current.selectedBlockId = blockId;
    renderBlockList();
    renderSettings();
    if (matchMedia("(max-width: 760px)").matches) activateEditorArea("settings");
  }

  function moveBlock(from, to) {
    if (!current.entry || to < 0 || to >= current.entry.blocks.length || from === to) return;
    mutate(() => {
      const [block] = current.entry.blocks.splice(from, 1);
      current.entry.blocks.splice(to, 0, block);
    });
  }

  function duplicateBlock(index) {
    const original = current.entry?.blocks[index];
    if (!original) return;
    mutate(() => {
      const duplicate = deepClone(original);
      duplicate.id = blockId();
      current.entry.blocks.splice(index + 1, 0, duplicate);
      current.selectedBlockId = duplicate.id;
    }, { settings: true });
  }

  function deleteBlock(index) {
    const block = current.entry?.blocks[index];
    if (!block) return;
    if (blockHasSubstantialContent(block) && !window.confirm("Delete this block and its current content?")) return;
    mutate(() => {
      current.entry.blocks.splice(index, 1);
      if (current.selectedBlockId === block.id) {
        current.selectedBlockId = current.entry.blocks[index]?.id || current.entry.blocks[index - 1]?.id || "";
      }
      cleanUnreferencedMedia();
    }, { settings: true });
  }

  function handleDragStart(event) {
    const item = event.target.closest("[data-block-id]");
    if (!item) return;
    draggedBlockId = item.dataset.blockId;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", draggedBlockId);
  }

  function handleDrop(event) {
    event.preventDefault();
    const target = event.target.closest("[data-block-id]");
    const sourceId = event.dataTransfer.getData("text/plain") || draggedBlockId;
    if (!target || !sourceId || sourceId === target.dataset.blockId) return;
    moveBlock(blockIndex(sourceId), blockIndex(target.dataset.blockId));
    draggedBlockId = "";
  }

  async function handleAction(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "undo") undo();
    if (action === "redo") redo();
    if (action === "import") elements.importFile.click();
    if (action === "copy") copyData();
    if (action === "export-json") exportJson();
    if (action === "export-renderer") exportRenderer();
    if (action === "load-existing") loadExistingEntry();
    if (action === "duplicate-entry") duplicateEntry();
    if (action === "clear-draft") clearDraft();
  }

  function renderAll() {
    const day = daysById.get(current.dayId);
    elements.day.value = current.dayId;
    elements.entryState.disabled = !current.entry;
    elements.entryState.value = current.entry?.state || "draft";
    if (day) {
      elements.summary.replaceChildren(
        create("strong", "", `Day ${day.number} · ${day.title}`),
        create("span", "", formatDate(current.entry.date))
      );
    } else {
      elements.summary.textContent = "No day selected. Choose a trip day to begin.";
    }
    document.querySelectorAll("[data-template], [data-add-block]").forEach((button) => { button.disabled = !current.entry; });
    renderBlockList();
    renderSettings();
    renderPreviewControls();
    schedulePreview();
  }

  function renderBlockList() {
    elements.blockList.replaceChildren();
    const blocks = current.entry?.blocks || [];
    elements.blockEmpty.hidden = blocks.length > 0;
    elements.blockCount.textContent = blocks.length ? `${blocks.length} block${blocks.length === 1 ? "" : "s"}` : "No blocks yet";

    blocks.forEach((block, index) => {
      const item = create("li", "editor-block-item");
      item.dataset.blockId = block.id;
      item.draggable = true;
      item.setAttribute("aria-current", String(block.id === current.selectedBlockId));
      item.dataset.invalid = String(validateBlock(block).length > 0);
      const handle = create("span", "block-drag-handle", "⋮⋮");
      handle.setAttribute("aria-hidden", "true");
      const summary = create("div", "block-summary");
      const select = create("button", "block-summary-button");
      select.type = "button";
      select.dataset.blockAction = "select";
      select.append(create("strong", "", displayBlockType(block)), create("span", "", blockSummary(block)));
      const actions = create("div", "block-actions");
      actions.append(
        actionButton("up", "Move up", index === 0),
        actionButton("down", "Move down", index === blocks.length - 1),
        actionButton("duplicate", "Duplicate"),
        actionButton("delete", "Delete")
      );
      summary.append(select, actions);
      item.append(handle, summary);
      elements.blockList.append(item);
    });
  }

  function actionButton(action, label, disabled = false) {
    const button = create("button", "", label);
    button.type = "button";
    button.dataset.blockAction = action;
    button.disabled = disabled;
    return button;
  }

  function renderPreviewControls() {
    elements.previewStage.dataset.previewStage = current.previewWidth;
    document.querySelectorAll("[data-preview-width]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.previewWidth === current.previewWidth)));
    document.querySelectorAll("[data-preview-theme]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.previewTheme === current.previewTheme)));
  }

  function setPreviewWidth(width) {
    if (!["desktop", "tablet", "mobile"].includes(width)) return;
    current.previewWidth = width;
    renderPreviewControls();
  }

  function setPreviewTheme(theme) {
    current.previewTheme = theme === "dark" ? "dark" : "light";
    const previewRoot = elements.preview.contentDocument?.documentElement;
    if (previewRoot) {
      previewRoot.dataset.theme = current.previewTheme;
      previewRoot.style.colorScheme = current.previewTheme;
    }
    renderPreviewControls();
    schedulePreview();
  }

  function mutate(change, { settings = false } = {}) {
    if (!current.entry) return;
    undoStack.push(snapshot());
    if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
    redoStack = [];
    change();
    markUnsaved();
    renderBlockList();
    if (settings) renderSettings();
    schedulePreview();
    updateHistoryButtons();
  }

  function snapshot() {
    return deepClone({
      dayId: current.dayId,
      entry: current.entry,
      media: current.media,
      selectedBlockId: current.selectedBlockId,
      previewWidth: current.previewWidth,
      previewTheme: current.previewTheme
    });
  }

  async function applySnapshot(value) {
    revokeAllRuntimeUrls();
    current = value;
    await restoreRuntimeUrls();
    renderAll();
    scheduleAutosave();
  }

  function undo() {
    if (!undoStack.length) return;
    redoStack.push(snapshot());
    const value = undoStack.pop();
    applySnapshot(value);
    updateHistoryButtons();
  }

  function redo() {
    if (!redoStack.length) return;
    undoStack.push(snapshot());
    const value = redoStack.pop();
    applySnapshot(value);
    updateHistoryButtons();
  }

  function updateHistoryButtons() {
    const undoButton = document.querySelector('[data-action="undo"]');
    const redoButton = document.querySelector('[data-action="redo"]');
    undoButton.disabled = !undoStack.length;
    redoButton.disabled = !redoStack.length;
  }

  function markUnsaved() {
    elements.saveState.textContent = "Unsaved";
    elements.saveState.dataset.state = "unsaved";
    scheduleAutosave();
  }

  function scheduleAutosave() {
    window.clearTimeout(autosaveTimer);
    autosaveTimer = window.setTimeout(saveDraftNow, 450);
  }

  async function saveDraftNow() {
    window.clearTimeout(autosaveTimer);
    if (!current.dayId || !current.entry) return;
    elements.saveState.textContent = "Saving…";
    elements.saveState.dataset.state = "saving";
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${current.dayId}`, JSON.stringify(snapshot()));
      pruneStoredBlobs(current.dayId);
      elements.saveState.textContent = "Saved locally";
      elements.saveState.dataset.state = "saved";
    } catch {
      elements.saveState.textContent = "Local save failed";
      elements.saveState.dataset.state = "error";
      notify("This browser could not save the draft. Export JSON before leaving.");
    }
  }

  function restoreDraft(dayId) {
    try {
      const value = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}${dayId}`) || "null");
      if (!value || value.dayId !== dayId || value.entry?.version !== ENTRY_VERSION) return null;
      return {
        ...emptyEditorState(dayId),
        entry: sanitiseEntry(value.entry, { allowPartial: true }).entry,
        media: sanitiseMediaManifest(value.media),
        selectedBlockId: text(value.selectedBlockId),
        previewWidth: ["desktop", "tablet", "mobile"].includes(value.previewWidth) ? value.previewWidth : "desktop",
        previewTheme: value.previewTheme === "dark" ? "dark" : "light"
      };
    } catch {
      return null;
    }
  }

  function renderSettings() {
    elements.settingsForm.replaceChildren();
    const block = selectedBlock();
    elements.settingsEmpty.hidden = Boolean(block);
    elements.settingsForm.hidden = !block;
    elements.selectedAnnouncement.textContent = block ? `${displayBlockType(block)} block selected.` : "No block selected.";
    if (!block) return;

    elements.settingsForm.append(
      create("h3", "settings-block-title", displayBlockType(block)),
      create("p", "settings-block-id", block.id)
    );

    if (block.type === "photo") renderPhotoSettings(block);
    if (block.type === "collage") renderCollageSettings(block);
    if (block.type === "sequence") renderSequenceSettings(block);
    if (block.type === "caption") renderCaptionSettings(block);
    if (block.type === "note") renderNoteSettings(block);
    if (block.type === "quote") renderQuoteSettings(block);
    if (block.type === "video") renderVideoSettings(block);
    if (block.type === "pause") renderPauseSettings(block);
    if (block.type === "place") renderPlaceSettings(block);

    const issues = validateBlock(block);
    if (issues.length) {
      const validation = create("div", "validation-message");
      validation.id = "editor-block-validation";
      validation.setAttribute("role", "status");
      validation.textContent = issues.join(" ");
      elements.settingsForm.append(validation);
      validationFieldKeys(block).forEach((key) => elements.settingsForm.querySelectorAll(`[data-editor-field="${key}"]`).forEach((control) => {
        control.setAttribute("aria-invalid", "true");
        control.setAttribute("aria-describedby", validation.id);
      }));
    }
  }

  function renderPhotoSettings(block) {
    renderMediaEditor(elements.settingsForm, block, "Photograph", { image: true, includeCrop: false });
    const group = create("section", "settings-group");
    group.append(create("h4", "field-label", "Presentation"));
    const grid = create("div", "settings-grid");
    grid.append(
      selectField("Presentation", PHOTO_PRESENTATIONS, block.presentation || "contained", (value) => update(block, "presentation", value)),
      selectField("Width", WIDTHS, block.width || defaultWidth(block.presentation), (value) => update(block, "width", value)),
      selectField("Spacing", SPACING, block.spacing || "normal", (value) => update(block, "spacing", value)),
      selectField("Crop", CROPS, block.cropMode || (block.crop ? "portrait" : "natural"), (value) => updateCrop(block, value))
    );
    group.append(grid);
    elements.settingsForm.append(group);
    if ((block.cropMode || (block.crop ? "portrait" : "natural")) !== "natural") renderFocalEditor(elements.settingsForm, block);
  }

  function renderCollageSettings(block) {
    const group = create("section", "settings-group");
    group.append(create("h4", "field-label", "Collage layout"));
    const choices = create("div", "editor-segmented collage-layout-choices");
    choices.setAttribute("role", "group");
    choices.setAttribute("aria-label", "Collage layout");
    COLLAGE_LAYOUTS.forEach((layout) => {
      const button = create("button", "", titleCase(layout));
      button.type = "button";
      button.className = "collage-layout-button";
      button.dataset.collageLayout = layout;
      button.setAttribute("aria-pressed", String(block.layout === layout));
      button.addEventListener("click", () => update(block, "layout", layout, { settings: true }));
      button.prepend(layoutDiagram(layout));
      choices.append(button);
    });
    group.append(choices, textField("Collage description", block.label || "", (value) => update(block, "label", value), { placeholder: "Optional screen-reader label" }));
    elements.settingsForm.append(group);
    renderImageCollection(block, "Collage photographs", 1, 5);
  }

  function renderSequenceSettings(block) {
    elements.settingsForm.append(textField("Sequence description", block.label || "", (value) => update(block, "label", value), { placeholder: "Optional screen-reader label" }));
    renderImageCollection(block, "Sequence photographs", 3, 5);
  }

  function layoutDiagram(layout) {
    const diagram = create("span", `layout-diagram layout-diagram--${layout}`);
    diagram.setAttribute("aria-hidden", "true");
    diagram.append(document.createElement("i"), document.createElement("i"), document.createElement("i"));
    return diagram;
  }

  function renderCaptionSettings(block) {
    elements.settingsForm.append(textField("Caption", block.text || "", (value) => update(block, "text", value), {
      multiline: true,
      placeholder: "A short line between photographs",
      help: "Shorter usually reads better; this is guidance, not a limit."
    }));
  }

  function renderNoteSettings(block) {
    elements.settingsForm.append(textField("Heading", block.heading || "", (value) => update(block, "heading", value), { placeholder: "Optional" }));
    if (Array.isArray(block.paragraphs) || block.editorMode === "journal") {
      if (!Array.isArray(block.paragraphs)) block.paragraphs = [""];
      const section = create("section", "settings-group");
      section.append(create("h4", "field-label", "Journal paragraphs"));
      block.paragraphs.forEach((paragraph, index) => {
        const row = create("div", "paragraph-row");
        row.append(textField(`Paragraph ${index + 1}`, paragraph, (value) => {
          mutate(() => { block.paragraphs[index] = value; });
        }, { multiline: true, placeholder: "Write a paragraph" }));
        const actions = create("div", "media-actions");
        const up = create("button", "", "Move up");
        up.type = "button";
        up.disabled = index === 0;
        up.addEventListener("click", () => moveArrayItem(block.paragraphs, index, index - 1, true));
        const down = create("button", "", "Move down");
        down.type = "button";
        down.disabled = index === block.paragraphs.length - 1;
        down.addEventListener("click", () => moveArrayItem(block.paragraphs, index, index + 1, true));
        const remove = create("button", "", "Remove");
        remove.type = "button";
        remove.addEventListener("click", () => mutate(() => block.paragraphs.splice(index, 1), { settings: true }));
        actions.append(up, down, remove);
        row.append(actions);
        section.append(row);
      });
      const add = create("button", "", "Add paragraph");
      add.type = "button";
      add.addEventListener("click", () => mutate(() => block.paragraphs.push(""), { settings: true }));
      section.append(add);
      elements.settingsForm.append(section);
    } else {
      elements.settingsForm.append(textField("Note", block.text || "", (value) => update(block, "text", value), { multiline: true, placeholder: "A brief observation" }));
      const convert = create("button", "", "Use journal paragraphs");
      convert.type = "button";
      convert.addEventListener("click", () => mutate(() => {
        block.editorMode = "journal";
        block.paragraphs = block.text ? [block.text] : [""];
        delete block.text;
      }, { settings: true }));
      elements.settingsForm.append(convert);
    }
  }

  function renderQuoteSettings(block) {
    elements.settingsForm.append(
      textField("Quote", block.text || "", (value) => update(block, "text", value), { multiline: true, placeholder: "What was said" }),
      textField("Attribution", block.attribution || "", (value) => update(block, "attribution", value), { placeholder: "Optional" })
    );
  }

  function renderVideoSettings(block) {
    const fieldset = create("fieldset", "media-fieldset");
    fieldset.append(create("legend", "", "Video"));
    fieldset.append(fileField("Choose local video", VIDEO_TYPES.join(","), (file) => attachFile(block, file, { video: true })));
    fieldset.append(
      textField("Source path", mediaPath(block), (value) => updateMediaPath(block, value), { placeholder: "assets/log/day-03/video.webm" }),
      textField("Poster path", block.poster || "", (value) => update(block, "poster", value), { placeholder: "Optional poster image" }),
      textField("Description", block.alt || "", (value) => update(block, "alt", value), { placeholder: "Describe the video" }),
      textField("Caption", block.caption || "", (value) => update(block, "caption", value), { placeholder: "Optional" })
    );
    const info = mediaInfo(block);
    if (info) fieldset.append(create("p", "media-meta", mediaMetaText(info)));
    elements.settingsForm.append(fieldset);
  }

  function renderPauseSettings(block) {
    elements.settingsForm.append(textField("Small label", block.text || "", (value) => update(block, "text", value), { placeholder: "Morning, Afternoon or Evening" }));
  }

  function renderPlaceSettings(block) {
    elements.settingsForm.append(
      textField("Place name", block.name || "", (value) => update(block, "name", value), { placeholder: "Chania Old Town" }),
      textField("Note", block.note || "", (value) => update(block, "note", value), { multiline: true, placeholder: "Optional context" }),
      textField("Map URL", block.mapUrl || "", (value) => update(block, "mapUrl", value), { placeholder: "https://…", inputType: "url" })
    );
  }

  function renderImageCollection(block, title, minimum, maximum) {
    if (!Array.isArray(block.images)) block.images = [];
    const section = create("section", "settings-group");
    section.append(create("h4", "field-label", title));
    block.images.forEach((image, index) => {
      const fieldset = create("fieldset", "media-fieldset");
      fieldset.append(create("legend", "", `Photograph ${index + 1}`));
      renderMediaEditor(fieldset, image, `Photograph ${index + 1}`, { image: true, compact: true });
      const actions = create("div", "media-actions");
      const up = create("button", "", "Move up");
      up.type = "button";
      up.disabled = index === 0;
      up.addEventListener("click", () => moveArrayItem(block.images, index, index - 1, true));
      const down = create("button", "", "Move down");
      down.type = "button";
      down.disabled = index === block.images.length - 1;
      down.addEventListener("click", () => moveArrayItem(block.images, index, index + 1, true));
      const remove = create("button", "", "Remove photograph");
      remove.type = "button";
      remove.dataset.mediaAction = "remove";
      remove.disabled = block.images.length <= minimum;
      remove.addEventListener("click", () => mutate(() => {
        block.images.splice(index, 1);
        cleanUnreferencedMedia();
      }, { settings: true }));
      actions.append(up, down, remove);
      fieldset.append(actions);
      section.append(fieldset);
    });
    const add = create("button", "", "Add photograph");
    add.type = "button";
    add.disabled = block.images.length >= maximum;
    add.addEventListener("click", () => mutate(() => block.images.push(mediaSlot()), { settings: true }));
    section.append(add, create("p", "field-help", `${minimum}–${maximum} photographs supported.`));
    elements.settingsForm.append(section);
  }

  function renderMediaEditor(container, target, label, { image = false, compact = false, includeCrop = true } = {}) {
    const source = previewMediaPath(target);
    if (source) {
      const preview = create("div", "media-preview");
      const img = new Image();
      img.src = source;
      img.alt = "";
      preview.append(img);
      container.append(preview);
    }
    container.append(fileField(source ? "Replace image" : "Choose image", IMAGE_TYPES.join(","), (file) => attachFile(target, file, { image: true })));
    const info = mediaInfo(target);
    if (info) container.append(create("p", "media-meta", mediaMetaText(info)));
    container.append(
      textField("Repository path", mediaPath(target), (value) => updateMediaPath(target, value), { placeholder: suggestedPathPlaceholder() }),
      textField("Alt text", target.alt || "", (value) => update(target, "alt", value), { multiline: true, placeholder: "Describe what can be seen" }),
      checkboxField("Decorative image (no alt text)", target.decorative === true, (checked) => update(target, "decorative", checked)),
      textField("Caption", target.caption || "", (value) => update(target, "caption", value), { multiline: true, placeholder: "Optional caption" })
    );
    if (includeCrop) {
      container.append(selectField("Crop", CROPS, target.cropMode || (target.crop ? "portrait" : "natural"), (value) => updateCrop(target, value, true)));
      if ((target.cropMode || (target.crop ? "portrait" : "natural")) !== "natural") renderFocalEditor(container, target);
    }
    if (target.mediaId || target.src) {
      const remove = create("button", "", "Remove selected image");
      remove.type = "button";
      remove.dataset.mediaAction = "remove";
      remove.addEventListener("click", () => mutate(() => {
        delete target.mediaId;
        delete target.src;
        delete target.sources;
        cleanUnreferencedMedia();
      }, { settings: true }));
      container.append(remove);
    }
    if (!compact) container.append(create("p", "field-help", "Local files stay in this browser. Exported data uses the repository path, not the temporary preview URL."));
  }

  function renderFocalEditor(container, target) {
    const source = previewMediaPath(target);
    if (!source) return;
    const [x, y] = parseFocalPoint(target.focalPoint);
    const group = create("section", "settings-group");
    group.append(create("h4", "field-label", "Focal point"));
    const editor = create("div", "focal-editor");
    editor.tabIndex = 0;
    editor.setAttribute("role", "application");
    editor.setAttribute("aria-label", "Image focal point. Use arrow keys to adjust.");
    const image = new Image();
    image.src = source;
    image.alt = "";
    image.style.objectPosition = `${x}% ${y}%`;
    const marker = create("span", "focal-marker");
    marker.style.setProperty("--focal-x", `${x}%`);
    marker.style.setProperty("--focal-y", `${y}%`);
    editor.append(image, marker);
    const setFromPointer = (event) => {
      const rect = editor.getBoundingClientRect();
      const nextX = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
      const nextY = clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100);
      updateFocal(target, nextX, nextY, marker, image);
    };
    editor.addEventListener("pointerdown", (event) => {
      editor.setPointerCapture(event.pointerId);
      setFromPointer(event);
    });
    editor.addEventListener("pointermove", (event) => {
      if (editor.hasPointerCapture(event.pointerId)) setFromPointer(event);
    });
    editor.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
      event.preventDefault();
      const [currentX, currentY] = parseFocalPoint(target.focalPoint);
      updateFocal(target, currentX + (event.key === "ArrowRight" ? 2 : event.key === "ArrowLeft" ? -2 : 0), currentY + (event.key === "ArrowDown" ? 2 : event.key === "ArrowUp" ? -2 : 0), marker, image);
    });
    const reset = create("button", "", "Reset to centre");
    reset.type = "button";
    reset.addEventListener("click", () => updateFocal(target, 50, 50, marker, image));
    group.append(editor, reset);
    container.append(group);
  }

  function textField(labelText, value, onInput, { multiline = false, placeholder = "", help = "", inputType = "text" } = {}) {
    const wrapper = create("label", "settings-field");
    wrapper.append(create("span", "field-label", labelText));
    const control = multiline ? document.createElement("textarea") : document.createElement("input");
    if (!multiline) control.type = inputType;
    control.value = value;
    control.placeholder = placeholder;
    control.dataset.editorField = fieldKey(labelText);
    control.addEventListener("input", () => onInput(control.value));
    wrapper.append(control);
    if (help) wrapper.append(create("small", "field-help", help));
    return wrapper;
  }

  function selectField(labelText, values, value, onChange) {
    const wrapper = create("label", "settings-field");
    wrapper.append(create("span", "field-label", labelText));
    const select = document.createElement("select");
    select.dataset.editorField = fieldKey(labelText);
    values.forEach((entry) => select.append(option(entry, titleCase(entry))));
    select.value = values.includes(value) ? value : values[0];
    select.addEventListener("change", () => onChange(select.value));
    wrapper.append(select);
    return wrapper;
  }

  function checkboxField(labelText, checked, onChange) {
    const wrapper = create("label", "settings-checkbox");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.dataset.editorField = fieldKey(labelText);
    input.checked = checked;
    input.addEventListener("change", () => onChange(input.checked));
    wrapper.append(input, create("span", "", labelText));
    return wrapper;
  }

  function fileField(labelText, accept, onSelect) {
    const wrapper = create("label", "settings-field");
    wrapper.append(create("span", "field-label", labelText));
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.dataset.editorField = fieldKey(labelText);
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (file) onSelect(file);
    });
    wrapper.append(input);
    return wrapper;
  }

  function update(target, property, value, { settings = false } = {}) {
    mutate(() => { target[property] = value; }, { settings });
  }

  function updateCrop(target, value, rerender = true) {
    mutate(() => {
      target.cropMode = CROPS.includes(value) ? value : "natural";
      if (target.cropMode === "natural") {
        delete target.crop;
        delete target.focalPoint;
      } else {
        target.crop = true;
        if (!target.focalPoint) target.focalPoint = "50% 50%";
      }
    }, { settings: rerender });
  }

  function updateFocal(target, x, y, marker, image) {
    const nextX = Math.round(clamp(x, 0, 100));
    const nextY = Math.round(clamp(y, 0, 100));
    mutate(() => { target.focalPoint = `${nextX}% ${nextY}%`; });
    marker.style.setProperty("--focal-x", `${nextX}%`);
    marker.style.setProperty("--focal-y", `${nextY}%`);
    image.style.objectPosition = `${nextX}% ${nextY}%`;
  }

  function moveArrayItem(array, from, to, settings = false) {
    if (to < 0 || to >= array.length) return;
    mutate(() => {
      const [item] = array.splice(from, 1);
      array.splice(to, 0, item);
    }, { settings });
  }

  async function attachFile(target, file, { image = false, video = false } = {}) {
    const allowed = image ? IMAGE_TYPES : VIDEO_TYPES;
    if (!file.size || !allowed.includes(file.type)) {
      notify(`Choose a supported ${image ? "JPEG, PNG, WebP or AVIF image" : "MP4, WebM or Ogg video"}.`);
      return;
    }
    const large = file.size > (image ? 15 : 100) * 1024 * 1024;
    let dimensions = { width: 0, height: 0 };
    try {
      if (image) dimensions = await readImageDimensions(file);
    } catch {
      notify("The selected image could not be read.");
      return;
    }
    const id = mediaId();
    const outputName = suggestedFilename(file.name);
    const item = {
      id,
      originalName: file.name,
      outputName,
      repositoryPath: `assets/log/${current.dayId}/${outputName}`,
      mimeType: file.type,
      width: dimensions.width,
      height: dimensions.height,
      fileSize: file.size,
      kind: video ? "video" : "image"
    };
    await storeBlob(current.dayId, id, file);
    const objectUrl = URL.createObjectURL(file);
    mutate(() => {
      const oldId = target.mediaId;
      target.mediaId = id;
      delete target.src;
      delete target.sources;
      if (dimensions.width) target.width = dimensions.width;
      if (dimensions.height) target.height = dimensions.height;
      current.media[id] = item;
      runtimeUrls.set(id, objectUrl);
      if (oldId) cleanUnreferencedMedia();
    }, { settings: true });
    if (large) notify("Large file selected. The original is untouched; create a web-sized derivative before publishing.");
  }

  function updateMediaPath(target, value) {
    mutate(() => {
      const info = mediaInfo(target);
      if (info) info.repositoryPath = value;
      else target.src = value;
    });
  }

  function readImageDimensions(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.addEventListener("load", () => {
        resolve({ width: image.naturalWidth, height: image.naturalHeight });
        URL.revokeObjectURL(url);
      });
      image.addEventListener("error", () => {
        reject(new Error("Unreadable image"));
        URL.revokeObjectURL(url);
      });
      image.src = url;
    });
  }

  function mediaPath(target) {
    return mediaInfo(target)?.repositoryPath || text(target.src);
  }

  function mediaInfo(target) {
    return target?.mediaId ? current.media[target.mediaId] : null;
  }

  function previewMediaPath(target) {
    if (target?.mediaId) {
      const runtime = runtimeUrls.get(target.mediaId);
      if (runtime) return runtime;
      const path = current.media[target.mediaId]?.repositoryPath;
      return path ? rootAssetUrl(path) : "";
    }
    return target?.src ? rootAssetUrl(target.src) : "";
  }

  function mediaMetaText(info) {
    const dimensions = info.width && info.height ? `${info.width} × ${info.height} · ${(info.width / info.height).toFixed(2)} ratio · ` : "";
    return `${info.originalName || info.repositoryPath} · ${dimensions}${formatBytes(info.fileSize)}`;
  }

  function suggestedPathPlaceholder() {
    return current.dayId ? `assets/log/${current.dayId}/01-photo.webp` : "assets/log/day-01/01-photo.webp";
  }

  function parseFocalPoint(value) {
    const match = /^(\d{1,3})%\s+(\d{1,3})%$/.exec(text(value));
    return match ? [clamp(Number(match[1]), 0, 100), clamp(Number(match[2]), 0, 100)] : [50, 50];
  }

  function schedulePreview() {
    window.clearTimeout(previewTimer);
    previewTimer = window.setTimeout(renderPreview, 100);
  }

  function renderPreview() {
    window.clearTimeout(previewTimer);
    if (!previewReady || !elements.preview.contentWindow) return;
    const entry = current.entry ? rendererEntry({ preview: true, includeInvalid: true }) : null;
    elements.preview.contentWindow.postMessage({
      type: "travel-log-editor:render",
      entry,
      theme: current.previewTheme
    }, location.origin);
  }

  function rendererEntry({ preview = false, includeInvalid = false } = {}) {
    if (!current.entry) return null;
    const blocks = current.entry.blocks
      .filter((block) => includeInvalid || validateBlock(block).length === 0)
      .map((block) => rendererBlock(block, { preview }))
      .filter(Boolean);
    return {
      version: ENTRY_VERSION,
      dayId: current.entry.dayId,
      state: ENTRY_STATES.includes(current.entry.state) ? current.entry.state : "draft",
      date: current.entry.date,
      place: current.entry.place,
      blocks
    };
  }

  function rendererBlock(block, { preview = false } = {}) {
    if (!BLOCK_TYPES.includes(block.type)) return null;
    const common = {
      type: block.type,
      id: validBlockId(block.id) ? block.id : undefined,
      spacing: SPACING.includes(block.spacing) ? block.spacing : undefined
    };
    if (block.type === "photo") return compactObject({
      ...common,
      presentation: PHOTO_PRESENTATIONS.includes(block.presentation) ? block.presentation : "contained",
      width: WIDTHS.includes(block.width) ? block.width : undefined,
      ...rendererMedia(block, { preview })
    });
    if (block.type === "collage" || block.type === "sequence") return compactObject({
      ...common,
      layout: block.type === "collage" && COLLAGE_LAYOUTS.includes(block.layout) ? block.layout : undefined,
      label: text(block.label),
      images: (Array.isArray(block.images) ? block.images : []).slice(0, 5).map((image) => rendererMedia(image, { preview })).filter((image) => image.src)
    });
    if (block.type === "caption") return compactObject({ ...common, text: text(block.text) });
    if (block.type === "note") return compactObject({
      ...common,
      heading: text(block.heading),
      text: Array.isArray(block.paragraphs) ? undefined : text(block.text),
      paragraphs: Array.isArray(block.paragraphs) ? block.paragraphs.map(text).filter(Boolean) : undefined
    });
    if (block.type === "quote") return compactObject({ ...common, text: text(block.text), attribution: text(block.attribution) });
    if (block.type === "pause") return compactObject({ ...common, text: text(block.text) });
    if (block.type === "place") return compactObject({ ...common, name: text(block.name), note: text(block.note), mapUrl: safeHttpUrl(block.mapUrl) });
    if (block.type === "video") return compactObject({
      ...common,
      src: resolvedMediaSource(block, preview),
      poster: preview ? previewRootPath(block.poster) : safeMediaPath(block.poster),
      alt: text(block.alt),
      caption: text(block.caption)
    });
    return null;
  }

  function rendererMedia(media, { preview = false } = {}) {
    const info = mediaInfo(media);
    const cropMode = CROPS.includes(media.cropMode) ? media.cropMode : (media.crop ? "portrait" : "natural");
    return compactObject({
      src: resolvedMediaSource(media, preview),
      sources: preview ? undefined : sanitiseSources(info?.sources || media.sources),
      alt: text(media.alt),
      caption: text(media.caption),
      location: text(media.location),
      time: text(media.time),
      decorative: media.decorative === true || undefined,
      width: positiveNumber(media.width) ? media.width : positiveNumber(info?.width) ? info.width : undefined,
      height: positiveNumber(media.height) ? media.height : positiveNumber(info?.height) ? info.height : undefined,
      cropMode: cropMode !== "natural" ? cropMode : undefined,
      crop: cropMode !== "natural" || undefined,
      focalPoint: cropMode !== "natural" ? normaliseFocalPoint(media.focalPoint) : undefined
    });
  }

  function resolvedMediaSource(target, preview) {
    if (target?.mediaId) {
      if (preview && runtimeUrls.has(target.mediaId)) return runtimeUrls.get(target.mediaId);
      const path = current.media[target.mediaId]?.repositoryPath;
      return preview ? previewRootPath(path) : safeMediaPath(path);
    }
    return preview ? previewRootPath(target?.src) : safeMediaPath(target?.src);
  }

  async function loadExistingEntry() {
    if (!ensureDay()) return;
    const publication = manifest?.days?.[current.dayId];
    if (!publication?.file) {
      notify("No repository entry exists for this day yet.");
      return;
    }
    if (current.entry.blocks.length && !window.confirm("Replace the current editor blocks with the repository entry?")) return;
    try {
      window.TRIP_LOG_ENTRIES = Object.create(null);
      await loadScript(`../data/${publication.file}`);
      const source = window.TRIP_LOG_ENTRIES[current.dayId];
      delete window.TRIP_LOG_ENTRIES;
      const result = sanitiseEntry(source, { allowPartial: true });
      if (!result.entry) throw new Error("Invalid entry");
      mutate(() => {
        current.entry = result.entry;
        current.entry.state = publication.state;
        current.media = {};
        registerEntryMedia(current.entry);
        current.selectedBlockId = current.entry.blocks[0]?.id || "";
      }, { settings: true });
      await restoreRuntimeUrls();
      notify(result.issues.length ? `Entry loaded with ${result.issues.length} issue${result.issues.length === 1 ? "" : "s"}.` : "Repository entry loaded.");
    } catch {
      notify("The repository entry could not be loaded.");
    }
  }

  function duplicateEntry() {
    if (!ensureDay()) return;
    if (!current.entry.blocks.length) {
      notify("Add or load content before duplicating the entry.");
      return;
    }
    mutate(() => {
      current.entry.blocks = current.entry.blocks.map((block) => ({ ...deepClone(block), id: blockId() }));
      current.entry.state = "draft";
      current.selectedBlockId = current.entry.blocks[0]?.id || "";
    }, { settings: true });
    notify("Entry duplicated as a new editable draft.");
  }

  async function clearDraft() {
    if (!current.dayId) return;
    if (!window.confirm("Clear this day’s local draft? Export first if you need a backup.")) return;
    const dayId = current.dayId;
    localStorage.removeItem(`${STORAGE_PREFIX}${dayId}`);
    revokeAllRuntimeUrls();
    await deleteDayBlobs(dayId);
    current = emptyEditorState(dayId);
    undoStack = [];
    redoStack = [];
    renderAll();
    updateHistoryButtons();
    notify("Local draft cleared.");
  }

  async function importSelectedFile() {
    const file = elements.importFile.files?.[0];
    elements.importFile.value = "";
    if (!file) return;
    try {
      const raw = JSON.parse(await file.text());
      const envelope = raw?.editorVersion === EDITOR_VERSION ? raw : null;
      const source = envelope ? raw.entry : raw;
      if (envelope && raw.schemaVersion !== ENTRY_VERSION) throw new Error(`Unsupported schema version ${raw.schemaVersion}.`);
      if (!envelope && source?.version !== ENTRY_VERSION) throw new Error(`Unsupported entry version ${source?.version ?? "unknown"}.`);
      const result = sanitiseEntry(source, { allowPartial: true });
      if (!result.entry || !daysById.has(result.entry.dayId)) throw new Error("The imported day is not part of this trip.");
      if (current.entry?.blocks.length && !window.confirm("Replace the current editor entry with the imported file?")) return;
      revokeAllRuntimeUrls();
      current = {
        ...emptyEditorState(result.entry.dayId),
        entry: result.entry,
        media: envelope ? sanitiseMediaManifest(raw.mediaManifest) : {},
        selectedBlockId: result.entry.blocks[0]?.id || ""
      };
      if (!envelope) registerEntryMedia(current.entry);
      elements.day.value = current.dayId;
      await restoreRuntimeUrls();
      undoStack = [];
      redoStack = [];
      markUnsaved();
      renderAll();
      updateHistoryButtons();
      notify(result.issues.length ? `Imported with ${result.issues.length} issue${result.issues.length === 1 ? "" : "s"}. Unsupported content was ignored.` : "JSON imported successfully.");
    } catch (error) {
      notify(`Import failed: ${error.message || "invalid JSON"}`);
    }
  }

  function exportJson() {
    const project = projectExport();
    if (!project) return;
    download(`${current.dayId}-travel-log-editor.json`, JSON.stringify(project, null, 2), "application/json");
    notify("Editor JSON exported. Keep the image files with it; browser storage is not a backup.");
  }

  async function copyData() {
    const project = projectExport();
    if (!project) return;
    const value = JSON.stringify(project, null, 2);
    try {
      await navigator.clipboard.writeText(value);
      notify("Clean JSON copied.");
    } catch {
      const area = document.createElement("textarea");
      area.value = value;
      document.body.append(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      notify("Clean JSON copied.");
    }
  }

  function exportRenderer() {
    if (!ensureDay()) return;
    const invalid = current.entry.blocks.filter((block) => validateBlock(block).length);
    if (invalid.length && !window.confirm(`${invalid.length} incomplete block${invalid.length === 1 ? "" : "s"} will be omitted from renderer data. Continue?`)) return;
    const entry = rendererEntry({ preview: false, includeInvalid: false });
    const serialised = JSON.stringify(entry, null, 2);
    const output = `(function () {\n  "use strict";\n\n  const entries = window.TRIP_LOG_ENTRIES || (window.TRIP_LOG_ENTRIES = Object.create(null));\n  entries[${JSON.stringify(current.dayId)}] = Object.freeze(${serialised});\n})();\n`;
    download(`${current.dayId}.js`, output, "text/javascript");
    notify("Renderer data exported. Add the listed media files to the matching repository folder.");
  }

  function projectExport() {
    if (!ensureDay()) return null;
    const referenced = referencedMediaIds();
    const mediaManifest = Object.values(current.media)
      .filter((item) => referenced.has(item.id))
      .map((item) => compactObject({
        id: item.id,
        originalName: item.originalName,
        outputName: item.outputName,
        repositoryPath: safeMediaPath(item.repositoryPath),
        mimeType: item.mimeType,
        width: positiveNumber(item.width) ? item.width : undefined,
        height: positiveNumber(item.height) ? item.height : undefined,
        fileSize: positiveNumber(item.fileSize) ? item.fileSize : undefined,
        kind: item.kind
      }));
    return {
      editorVersion: EDITOR_VERSION,
      schemaVersion: ENTRY_VERSION,
      exportedAt: new Date().toISOString(),
      trip: { name: config.trip.name, dayId: current.dayId },
      entry: deepClone(current.entry),
      mediaManifest
    };
  }

  function sanitiseEntry(raw, { allowPartial = false } = {}) {
    const issues = [];
    if (!raw || raw.version !== ENTRY_VERSION || !daysById.has(raw.dayId)) return { entry: null, issues: ["Unsupported or unknown entry."] };
    const day = daysById.get(raw.dayId);
    const blocks = [];
    (Array.isArray(raw.blocks) ? raw.blocks : []).forEach((block, index) => {
      const normalised = sanitiseBlock(block, issues, index);
      if (normalised) blocks.push(normalised);
    });
    const entry = {
      version: ENTRY_VERSION,
      dayId: raw.dayId,
      state: ENTRY_STATES.includes(raw.state) ? raw.state : "draft",
      date: /^\d{4}-\d{2}-\d{2}$/.test(raw.date || "") ? raw.date : dayDate(day),
      place: text(raw.place) || day.title,
      blocks
    };
    if (!allowPartial && !blocks.length) issues.push("The entry has no supported blocks.");
    return { entry, issues };
  }

  function sanitiseBlock(raw, issues, index) {
    if (!raw || !BLOCK_TYPES.includes(raw.type)) {
      issues.push(`Block ${index + 1} uses an unsupported type.`);
      return null;
    }
    const id = validBlockId(raw.id) ? raw.id : blockId();
    const common = {
      type: raw.type,
      id,
      spacing: SPACING.includes(raw.spacing) ? raw.spacing : "normal",
      editorLabel: text(raw.editorLabel)
    };
    if (raw.type === "photo") return {
      ...common,
      presentation: PHOTO_PRESENTATIONS.includes(raw.presentation) ? raw.presentation : "contained",
      width: WIDTHS.includes(raw.width) ? raw.width : defaultWidth(raw.presentation),
      ...sanitiseMedia(raw)
    };
    if (raw.type === "collage" || raw.type === "sequence") return {
      ...common,
      layout: raw.type === "collage" && COLLAGE_LAYOUTS.includes(raw.layout) ? raw.layout : raw.type === "collage" ? "two-up" : undefined,
      label: text(raw.label),
      images: (Array.isArray(raw.images) ? raw.images : []).slice(0, 5).map(sanitiseMedia),
    };
    if (raw.type === "caption") return { ...common, text: text(raw.text) };
    if (raw.type === "note") return {
      ...common,
      heading: text(raw.heading),
      text: Array.isArray(raw.paragraphs) ? "" : text(raw.text),
      paragraphs: Array.isArray(raw.paragraphs) ? raw.paragraphs.slice(0, 30).map(text) : undefined,
      editorMode: Array.isArray(raw.paragraphs) || raw.editorMode === "journal" ? "journal" : undefined
    };
    if (raw.type === "quote") return { ...common, text: text(raw.text), attribution: text(raw.attribution) };
    if (raw.type === "pause") return { ...common, text: text(raw.text) };
    if (raw.type === "place") return { ...common, name: text(raw.name), note: text(raw.note), mapUrl: safeHttpUrl(raw.mapUrl) };
    if (raw.type === "video") return {
      ...common,
      mediaId: validMediaId(raw.mediaId) ? raw.mediaId : undefined,
      src: safeMediaPath(raw.src),
      poster: safeMediaPath(raw.poster),
      alt: text(raw.alt),
      caption: text(raw.caption)
    };
    return null;
  }

  function sanitiseMedia(raw = {}) {
    const cropMode = CROPS.includes(raw.cropMode) ? raw.cropMode : raw.crop === true ? "portrait" : "natural";
    return compactObject({
      mediaId: validMediaId(raw.mediaId) ? raw.mediaId : undefined,
      src: safeMediaPath(raw.src),
      sources: sanitiseSources(raw.sources),
      alt: text(raw.alt),
      caption: text(raw.caption),
      location: text(raw.location),
      time: text(raw.time),
      decorative: raw.decorative === true || undefined,
      width: positiveNumber(raw.width) ? raw.width : undefined,
      height: positiveNumber(raw.height) ? raw.height : undefined,
      cropMode,
      crop: cropMode !== "natural" || undefined,
      focalPoint: cropMode !== "natural" ? normaliseFocalPoint(raw.focalPoint) : undefined
    });
  }

  function sanitiseSources(raw) {
    if (!Array.isArray(raw)) return undefined;
    const sources = raw.slice(0, 4).map((source) => compactObject({
      type: /^image\/[a-z0-9.+-]+$/i.test(source?.type || "") ? source.type : undefined,
      srcset: safeSrcset(source?.srcset),
      media: text(source?.media)
    })).filter((source) => source.srcset);
    return sources.length ? sources : undefined;
  }

  function sanitiseMediaManifest(raw) {
    const values = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? Object.values(raw) : [];
    const result = {};
    values.forEach((item) => {
      if (!validMediaId(item?.id)) return;
      result[item.id] = compactObject({
        id: item.id,
        originalName: cleanFilename(item.originalName),
        outputName: cleanFilename(item.outputName),
        repositoryPath: safeMediaPath(item.repositoryPath),
        mimeType: [...IMAGE_TYPES, ...VIDEO_TYPES].includes(item.mimeType) ? item.mimeType : "",
        width: positiveNumber(item.width) ? item.width : undefined,
        height: positiveNumber(item.height) ? item.height : undefined,
        fileSize: positiveNumber(item.fileSize) ? item.fileSize : undefined,
        kind: item.kind === "video" ? "video" : "image",
        sources: sanitiseSources(item.sources)
      });
    });
    return result;
  }

  function registerEntryMedia(entry) {
    mediaTargets(entry.blocks).forEach((target) => {
      if (!target.src || target.mediaId) return;
      const id = mediaId();
      const path = safeMediaPath(target.src);
      current.media[id] = compactObject({
        id,
        originalName: path.split("/").pop(),
        outputName: path.split("/").pop(),
        repositoryPath: path,
        mimeType: mimeFromPath(path),
        width: target.width,
        height: target.height,
        fileSize: 0,
        kind: target.type === "video" ? "video" : "image",
        sources: target.sources
      });
      target.mediaId = id;
      delete target.src;
      delete target.sources;
    });
  }

  function validateBlock(block) {
    const issues = [];
    if (!block) return ["Block is missing."];
    if (block.type === "photo") {
      if (!hasMedia(block)) issues.push("Choose an image.");
      if (!block.decorative && !text(block.alt)) issues.push("Add alt text or mark the image decorative.");
    }
    if (block.type === "collage") {
      const validImages = (block.images || []).filter(hasMedia);
      if (!validImages.length) issues.push("Add at least one photograph.");
      if (!COLLAGE_LAYOUTS.includes(block.layout)) issues.push("Choose a supported collage layout.");
      validImages.forEach((image) => { if (!image.decorative && !text(image.alt)) issues.push("Add alt text to each photograph."); });
    }
    if (block.type === "sequence") {
      const validImages = (block.images || []).filter(hasMedia);
      if (validImages.length < 3) issues.push("Add at least three photographs.");
      validImages.forEach((image) => { if (!image.decorative && !text(image.alt)) issues.push("Add alt text to each photograph."); });
    }
    if (block.type === "caption" && !text(block.text)) issues.push("Add caption text.");
    if (block.type === "note") {
      const paragraphs = Array.isArray(block.paragraphs) ? block.paragraphs.map(text).filter(Boolean) : [];
      if (!text(block.text) && !paragraphs.length) issues.push("Add note or journal text.");
    }
    if (block.type === "quote" && !text(block.text)) issues.push("Add quote text.");
    if (block.type === "place") {
      if (!text(block.name)) issues.push("Add a place name.");
      if (text(block.mapUrl) && !safeHttpUrl(block.mapUrl)) issues.push("Use an HTTP or HTTPS map URL.");
    }
    if (block.type === "video") {
      if (!hasMedia(block)) issues.push("Add a video source.");
      if (!text(block.alt)) issues.push("A video description is recommended.");
    }
    return [...new Set(issues)];
  }

  function validationFieldKeys(block) {
    if (block.type === "photo") return ["choose-image", "replace-image", "repository-path", "alt-text"];
    if (block.type === "collage" || block.type === "sequence") return ["choose-image", "replace-image", "repository-path", "alt-text"];
    if (block.type === "caption") return ["caption"];
    if (block.type === "note") return Array.isArray(block.paragraphs) ? block.paragraphs.map((_, index) => `paragraph-${index + 1}`) : ["note"];
    if (block.type === "quote") return ["quote"];
    if (block.type === "place") return ["place-name", "map-url"];
    if (block.type === "video") return ["choose-local-video", "source-path", "description"];
    return [];
  }

  function hasMedia(target) {
    return Boolean(target?.mediaId && current.media[target.mediaId]?.repositoryPath) || Boolean(safeMediaPath(target?.src));
  }

  function cleanUnreferencedMedia() {
    const references = referencedMediaIds();
    Object.keys(current.media).forEach((id) => {
      if (references.has(id)) return;
      const url = runtimeUrls.get(id);
      if (url) URL.revokeObjectURL(url);
      runtimeUrls.delete(id);
      delete current.media[id];
    });
  }

  function referencedMediaIds() {
    const result = new Set();
    mediaTargets(current.entry?.blocks || []).forEach((target) => {
      if (validMediaId(target.mediaId)) result.add(target.mediaId);
    });
    return result;
  }

  function mediaTargets(blocks) {
    const targets = [];
    blocks.forEach((block) => {
      if (block.type === "photo" || block.type === "video") targets.push(block);
      if (block.type === "collage" || block.type === "sequence") targets.push(...(Array.isArray(block.images) ? block.images : []));
    });
    return targets;
  }

  async function restoreRuntimeUrls() {
    for (const id of Object.keys(current.media)) {
      if (runtimeUrls.has(id)) continue;
      try {
        const blob = await readBlob(current.dayId, id);
        if (blob) runtimeUrls.set(id, URL.createObjectURL(blob));
      } catch {
        // Repository-backed media does not need a browser blob.
      }
    }
    schedulePreview();
  }

  function revokeAllRuntimeUrls() {
    runtimeUrls.forEach((url) => URL.revokeObjectURL(url));
    runtimeUrls.clear();
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) return reject(new Error("IndexedDB unavailable"));
      const request = indexedDB.open(DATABASE_NAME, 1);
      request.addEventListener("upgradeneeded", () => {
        if (!request.result.objectStoreNames.contains(MEDIA_STORE)) request.result.createObjectStore(MEDIA_STORE);
      });
      request.addEventListener("success", () => resolve(request.result));
      request.addEventListener("error", () => reject(request.error));
    });
  }

  async function storeBlob(dayId, id, blob) {
    try {
      const database = await openDatabase();
      await databaseRequest(database, "readwrite", (store) => store.put(blob, `${dayId}:${id}`));
      database.close();
    } catch {
      notify("The file can be previewed now, but this browser could not persist it for reload.");
    }
  }

  async function readBlob(dayId, id) {
    const database = await openDatabase();
    const blob = await databaseRequest(database, "readonly", (store) => store.get(`${dayId}:${id}`));
    database.close();
    return blob;
  }

  async function deleteDayBlobs(dayId) {
    try {
      const database = await openDatabase();
      const keys = await databaseRequest(database, "readonly", (store) => store.getAllKeys());
      await Promise.all(keys.filter((key) => String(key).startsWith(`${dayId}:`)).map((key) => databaseRequest(database, "readwrite", (store) => store.delete(key))));
      database.close();
    } catch {
      // Clearing metadata still prevents stale blobs from being referenced.
    }
  }

  async function pruneStoredBlobs(dayId) {
    try {
      const retained = new Set(Object.keys(current.media));
      [...undoStack, ...redoStack].forEach((historyState) => Object.keys(historyState.media || {}).forEach((id) => retained.add(id)));
      const database = await openDatabase();
      const keys = await databaseRequest(database, "readonly", (store) => store.getAllKeys());
      const stale = keys.filter((key) => String(key).startsWith(`${dayId}:`) && !retained.has(String(key).slice(dayId.length + 1)));
      for (const key of stale) await databaseRequest(database, "readwrite", (store) => store.delete(key));
      database.close();
    } catch {
      // Storage cleanup is best-effort; authoring remains available.
    }
  }

  function databaseRequest(database, mode, operation) {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(MEDIA_STORE, mode);
      const request = operation(transaction.objectStore(MEDIA_STORE));
      request.addEventListener("success", () => resolve(request.result));
      request.addEventListener("error", () => reject(request.error));
    });
  }

  function photo(presentation = "contained", label = "Add photograph") {
    return {
      type: "photo",
      id: blockId(),
      editorLabel: label,
      presentation,
      width: defaultWidth(presentation),
      spacing: "normal",
      cropMode: "natural",
      alt: "",
      caption: ""
    };
  }

  function collage(layout = "two-up", count = 2, label = "Add a collage") {
    return {
      type: "collage",
      id: blockId(),
      editorLabel: label,
      layout,
      spacing: "normal",
      label: "",
      images: Array.from({ length: count }, mediaSlot)
    };
  }

  function sequence(count = 3, label = "Add a photo sequence") {
    return {
      type: "sequence",
      id: blockId(),
      editorLabel: label,
      spacing: "normal",
      label: "",
      images: Array.from({ length: count }, mediaSlot)
    };
  }

  function caption(label = "Add a short caption") {
    return { type: "caption", id: blockId(), editorLabel: label, spacing: "normal", text: "" };
  }

  function note(label = "Add a note") {
    return { type: "note", id: blockId(), editorLabel: label, spacing: "normal", heading: "", text: "" };
  }

  function journal(label = "Add journal text") {
    return { type: "note", id: blockId(), editorMode: "journal", editorLabel: label, spacing: "normal", heading: "", paragraphs: [""] };
  }

  function quote(label = "Add a quote") {
    return { type: "quote", id: blockId(), editorLabel: label, spacing: "normal", text: "", attribution: "" };
  }

  function video(label = "Add a video") {
    return { type: "video", id: blockId(), editorLabel: label, spacing: "normal", src: "", poster: "", alt: "", caption: "" };
  }

  function place(label = "Add a place") {
    return { type: "place", id: blockId(), editorLabel: label, spacing: "normal", name: "", note: "", mapUrl: "" };
  }

  function pause(label = "Add a quiet pause") {
    return { type: "pause", id: blockId(), editorLabel: label, spacing: "normal", text: "" };
  }

  function mediaSlot() {
    return { alt: "", caption: "", cropMode: "natural" };
  }

  function selectedBlock() {
    return current.entry?.blocks.find((block) => block.id === current.selectedBlockId) || null;
  }

  function blockIndex(id) {
    return current.entry?.blocks.findIndex((block) => block.id === id) ?? -1;
  }

  function displayBlockType(block) {
    if (block.type === "note" && (block.editorMode === "journal" || Array.isArray(block.paragraphs))) return "Journal";
    if (block.type === "sequence") return "Photo sequence";
    return titleCase(block.type);
  }

  function blockSummary(block) {
    if (block.type === "photo" || block.type === "video") return mediaInfo(block)?.originalName || mediaPath(block) || block.editorLabel || "Empty media block";
    if (block.type === "collage" || block.type === "sequence") return `${block.layout ? titleCase(block.layout) + " · " : ""}${(block.images || []).filter(hasMedia).length}/${(block.images || []).length} photographs`;
    if (block.type === "note") return text(block.heading) || text(block.text) || text(block.paragraphs?.find(text)) || block.editorLabel;
    return text(block.text) || text(block.name) || block.editorLabel || "Empty block";
  }

  function blockHasSubstantialContent(block) {
    if (mediaTargets([block]).some(hasMedia)) return true;
    return [block.text, block.heading, block.name, block.note, ...(block.paragraphs || [])].some((value) => text(value).length > 20);
  }

  function defaultWidth(presentation) {
    if (presentation === "full") return "full";
    if (presentation === "portrait" || presentation === "quiet") return "narrow";
    return "normal";
  }

  function ensureDay() {
    if (current.entry) return true;
    notify("Choose a trip day first.");
    elements.day.focus();
    return false;
  }

  function formatDate(value) {
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", reject, { once: true });
      document.head.append(script);
    });
  }

  function download(filename, value, type) {
    const url = URL.createObjectURL(new Blob([value], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function notify(message) {
    window.clearTimeout(toastTimer);
    elements.status.textContent = message;
    elements.status.dataset.visible = "true";
    toastTimer = window.setTimeout(() => { elements.status.dataset.visible = "false"; }, 4200);
  }

  function create(tag, className = "", value = "") {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value) element.textContent = value;
    return element;
  }

  function option(value, label) {
    const item = document.createElement("option");
    item.value = value;
    item.textContent = label;
    return item;
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
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  function safeMediaPath(value) {
    const path = text(value).replace(/\\/g, "/");
    if (!path || /^(?:blob|data|javascript|file):/i.test(path) || path.includes("..")) return "";
    if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return "";
    return path.replace(/^\/+/, "");
  }

  function safeSrcset(value) {
    const source = text(value);
    if (!source || /(?:javascript|data|blob|file):/i.test(source) || source.includes("..")) return "";
    return source;
  }

  function previewRootPath(value) {
    const path = safeMediaPath(value);
    return path ? new URL(`../${path}`, document.baseURI).href : "";
  }

  function rootAssetUrl(value) {
    if (text(value).startsWith("blob:")) return value;
    return previewRootPath(value);
  }

  function normaliseFocalPoint(value) {
    const [x, y] = parseFocalPoint(value);
    return `${x}% ${y}%`;
  }

  function validBlockId(value) {
    return /^moment-[a-z0-9-]+$/.test(value || "");
  }

  function validMediaId(value) {
    return /^media-[a-z0-9-]+$/.test(value || "");
  }

  function blockId() {
    return `moment-editor-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function mediaId() {
    return `media-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function suggestedFilename(filename) {
    const clean = cleanFilename(filename).toLowerCase();
    const lastDot = clean.lastIndexOf(".");
    const extension = lastDot > -1 ? clean.slice(lastDot) : "";
    const base = (lastDot > -1 ? clean.slice(0, lastDot) : clean)
      .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "photo";
    const order = String(Object.keys(current.media).length + 1).padStart(2, "0");
    return `${order}-${base}${extension}`;
  }

  function cleanFilename(value) {
    return text(value).split(/[\\/]/).pop().replace(/[\u0000-\u001f<>:"|?*]/g, "").slice(0, 180);
  }

  function mimeFromPath(path) {
    const extension = path.split(".").pop()?.toLowerCase();
    return ({ jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif", mp4: "video/mp4", webm: "video/webm", ogg: "video/ogg" })[extension] || "";
  }

  function formatBytes(value) {
    if (!positiveNumber(value)) return "size unavailable";
    if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  function titleCase(value) {
    return text(value).replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function fieldKey(value) {
    return text(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function compactObject(object) {
    return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined && value !== ""));
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }
})();
