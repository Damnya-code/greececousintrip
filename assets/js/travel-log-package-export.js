(function () {
  "use strict";

  const STORAGE_PREFIX = "aegeanTravelLogEditor:v1:";
  const DATABASE_NAME = "aegeanTravelLogEditor";
  const MEDIA_STORE = "media";
  const ENTRY_VERSION = 2;
  const ROOT = "aegean-odyssey-travel-log";
  const BLOCK_TYPES = new Set(["photo", "collage", "sequence", "caption", "note", "quote", "video", "pause", "place"]);
  const COLLAGE_LAYOUTS = new Set(["two-up", "feature-left", "feature-right", "film-strip"]);
  const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
  const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/ogg"]);

  const dialog = document.getElementById("travel-log-package-export");
  if (!dialog) return;

  const ui = {
    days: dialog.querySelector("[data-package-days]"),
    summary: dialog.querySelector("[data-package-summary]"),
    issues: dialog.querySelector("[data-package-issues]"),
    includeDrafts: dialog.querySelector("[data-package-include-drafts]"),
    featureFlag: dialog.querySelector("[data-package-feature-flag]"),
    refresh: dialog.querySelector("[data-package-refresh]"),
    create: dialog.querySelector("[data-package-create]"),
    cancel: dialog.querySelector("[data-package-cancel]"),
    progress: dialog.querySelector("[data-package-progress]"),
    progressLabel: dialog.querySelector("[data-package-progress-label]"),
    progressBar: dialog.querySelector("[data-package-progress-bar]"),
    feedback: dialog.querySelector("[data-package-feedback]")
  };
  ui.close = dialog.querySelector(".package-export-close");

  const config = window.TRIP_CONFIG;
  const days = Array.isArray(config?.days) ? config.days : [];
  let records = [];
  let running = false;
  let cancelled = false;
  let requestedMode = "trip";
  let requestedDayId = "";

  ui.refresh.addEventListener("click", () => refresh());
  ui.includeDrafts.addEventListener("change", render);
  ui.days.addEventListener("change", renderSummary);
  ui.create.addEventListener("click", createPackage);
  ui.cancel.addEventListener("click", () => {
    cancelled = true;
    setFeedback("Cancelling after the current file finishes…");
  });
  dialog.addEventListener("cancel", (event) => {
    if (!running) return;
    event.preventDefault();
    cancelled = true;
  });
  ui.close.addEventListener("click", (event) => {
    if (!running) return;
    event.preventDefault();
    cancelled = true;
    setFeedback("Cancelling after the current file finishes…");
  });

  window.TravelLogPackageExporter = Object.freeze({
    open(mode = "trip", dayId = "") {
      if (running) return;
      requestedMode = mode === "day" ? "day" : "trip";
      requestedDayId = dayId;
      dialog.showModal();
      refresh();
    }
  });

  async function refresh() {
    setBusy(true, "Reading saved drafts…", 4);
    try {
      records = await discoverDrafts();
      render();
      setFeedback(records.length ? "Review the selected days before creating the package." : "No saved Travel Log drafts were found in this browser.");
    } catch (error) {
      records = [];
      render();
      setFeedback(`Draft discovery failed: ${error.message || "unknown error"}`);
    } finally {
      setBusy(false);
    }
  }

  async function discoverDrafts() {
    const found = [];
    for (const day of days) {
      const snapshot = readSnapshot(day.id);
      if (!snapshot?.entry) continue;
      const media = normaliseManifest(snapshot.media);
      const analysis = await analyseDay(day, snapshot.entry, media);
      found.push({ day, entry: snapshot.entry, media, analysis });
    }
    return found;
  }

  function readSnapshot(dayId) {
    try {
      const value = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}${dayId}`) || "null");
      if (!value || value.dayId !== dayId || value.entry?.version !== ENTRY_VERSION) return null;
      return value;
    } catch {
      return null;
    }
  }

  async function analyseDay(day, entry, media) {
    const warnings = [];
    const blocked = [];
    const blocks = Array.isArray(entry.blocks) ? entry.blocks : [];
    const renderable = blocks.filter(isPotentiallyRenderable);
    if (!renderable.length) blocked.push("No renderable content blocks.");
    if (entry.state !== "published") warnings.push(`Entry state is ${entry.state || "draft"}.`);
    const incomplete = blocks.length - renderable.length;
    if (incomplete) warnings.push(`${incomplete} incomplete placeholder block${incomplete === 1 ? "" : "s"} will be removed.`);

    const references = uniqueMediaReferences(blocks);
    let localCount = 0;
    let repositoryCount = 0;
    let originalBytes = 0;
    for (const reference of references) {
      const item = media[reference.mediaId];
      if (!item) {
        blocked.push(`${reference.label}: media metadata is missing.`);
        continue;
      }
      const blob = await readBlob(day.id, item.id).catch(() => null);
      if (blob) {
        localCount += 1;
        originalBytes += blob.size;
        continue;
      }
      const path = safePath(item.repositoryPath || reference.src);
      if (path && await repositoryFileExists(path)) repositoryCount += 1;
      else blocked.push(`${reference.label}: local file is unavailable and repository path could not be verified (${path || "no safe path"}).`);
    }

    const level = blocked.length ? "blocked" : warnings.length ? "warning" : "ready";
    return { level, warnings, blocked, localCount, repositoryCount, originalBytes, mediaCount: references.length };
  }

  function render() {
    ui.days.replaceChildren();
    const includeDrafts = ui.includeDrafts.checked;
    records.forEach((record) => {
      const row = element("div", "package-day-row");
      const label = element("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.dataset.packageDay = record.day.id;
      const allowed = includeDrafts || record.entry.state === "published";
      input.disabled = !allowed;
      input.checked = allowed && (requestedMode === "trip" || record.day.id === requestedDayId);
      const copy = element("span");
      copy.append(element("strong", "", `Day ${record.day.number} · ${record.day.title}`), element("small", "", `${record.entry.state} · ${record.analysis.mediaCount} media reference${record.analysis.mediaCount === 1 ? "" : "s"}`));
      label.append(input, copy);
      const status = element("span", "package-day-status", titleCase(record.analysis.level));
      status.dataset.level = record.analysis.level;
      row.append(label, status);
      ui.days.append(row);
    });
    renderIssues();
    renderSummary();
  }

  function renderIssues() {
    ui.issues.replaceChildren();
    const selected = selectedRecords();
    const messages = selected.flatMap((record) => [
      ...record.analysis.blocked.map((message) => `Day ${record.day.number} — Blocked: ${message}`),
      ...record.analysis.warnings.map((message) => `Day ${record.day.number} — Warning: ${message}`)
    ]);
    if (!messages.length) {
      ui.issues.append(element("p", "", selected.length ? "No unresolved package issues." : "Select at least one saved day."));
      return;
    }
    const list = document.createElement("ul");
    messages.forEach((message) => list.append(element("li", "", message)));
    ui.issues.append(list);
  }

  function renderSummary() {
    const selected = selectedRecords();
    const blocked = selected.filter((record) => record.analysis.level === "blocked").length;
    const warning = selected.filter((record) => record.analysis.level === "warning").length;
    ui.summary.textContent = `${selected.length} day${selected.length === 1 ? "" : "s"} selected · ${blocked} blocked · ${warning} with warnings`;
    ui.create.disabled = running || !selected.length || blocked > 0 || !window.JSZip;
    renderIssues();
  }

  function selectedRecords() {
    const selectedIds = new Set([...ui.days.querySelectorAll("[data-package-day]:checked")].map((input) => input.dataset.packageDay));
    return records.filter((record) => selectedIds.has(record.day.id));
  }

  async function createPackage() {
    if (running) return;
    const selected = selectedRecords();
    if (!selected.length) return setFeedback("Select at least one saved day.");
    if (selected.some((record) => record.analysis.level === "blocked")) return setFeedback("Resolve blocked media references before exporting.");
    if (!window.JSZip) return setFeedback("The local ZIP library did not load.");

    cancelled = false;
    setBusy(true, "Validating selected entries…", 8);
    const zip = new window.JSZip();
    const root = zip.folder(ROOT);
    const packaged = [];
    let originalBytes = 0;
    let packagedBytes = 0;
    let generatedFiles = [];

    try {
      for (let index = 0; index < selected.length; index += 1) {
        assertNotCancelled();
        const record = selected[index];
        setProgress(`Processing Day ${record.day.number}: ${record.day.title}…`, 12 + Math.round((index / selected.length) * 58));
        const result = await packageDay(root, record, () => cancelled);
        packaged.push(result);
        originalBytes += result.originalBytes;
        packagedBytes += result.packagedBytes;
        generatedFiles.push(...result.files);
      }

      assertNotCancelled();
      const indexText = createIndex(packaged);
      root.file("data/trip-log-index.js", indexText);
      generatedFiles.push("data/trip-log-index.js");

      const backup = createBackup(selected, packaged);
      root.file("backup/travel-log-editor-project.json", JSON.stringify(backup, null, 2));
      generatedFiles.push("backup/travel-log-editor-project.json");

      generatedFiles.push("PACKAGE_REPORT.md", "PUBLISHING_GUIDE.md");
      if (ui.featureFlag.checked) generatedFiles.push("FEATURE_FLAG_UPDATE.md");
      const report = createReport(records, selected, packaged, originalBytes, packagedBytes, generatedFiles);
      root.file("PACKAGE_REPORT.md", report);
      root.file("PUBLISHING_GUIDE.md", createPublishingGuide(ui.featureFlag.checked));
      if (ui.featureFlag.checked) {
        root.file("FEATURE_FLAG_UPDATE.md", featureFlagGuide());
      }

      setProgress("Creating ZIP archive…", 82);
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } }, (metadata) => {
        setProgress("Creating ZIP archive…", 82 + Math.round(metadata.percent * .17));
      });
      assertNotCancelled();
      downloadBlob(`${ROOT}.zip`, blob);
      setProgress("Package ready.", 100);
      setFeedback(`Exported ${selected.length} day${selected.length === 1 ? "" : "s"} in ${formatBytes(blob.size)}.`);
    } catch (error) {
      setFeedback(error.name === "AbortError" ? "Export cancelled. Existing drafts were not changed." : `Export failed: ${error.message || "unknown error"}`);
    } finally {
      setBusy(false);
    }
  }

  async function packageDay(root, record, isCancelled) {
    const mediaCache = new Map();
    let mediaOrdinal = 0;
    let originalBytes = 0;
    let packagedBytes = 0;
    const files = [];
    const warnings = [...record.analysis.warnings];

    const blocks = [];
    for (const sourceBlock of record.entry.blocks || []) {
      if (!isPotentiallyRenderable(sourceBlock)) continue;
      const block = await packageBlock(sourceBlock);
      if (block) blocks.push(block);
    }
    if (!blocks.length) throw new Error(`Day ${record.day.number} has no renderable blocks.`);

    const entry = compact({
      version: ENTRY_VERSION,
      dayId: record.day.id,
      state: ["hidden", "draft", "published"].includes(record.entry.state) ? record.entry.state : "draft",
      date: safeDate(record.entry.date) || record.day.date,
      place: cleanText(record.entry.place) || record.day.title,
      blocks
    });
    const rendererPath = `data/trip-log/${record.day.id}.js`;
    root.file(rendererPath, rendererFile(record.day.id, entry));
    files.push(rendererPath);

    return { record, entry, media: [...mediaCache.values()].map((value) => value.backup), originalBytes, packagedBytes, files, warnings };

    async function packageBlock(raw) {
      const common = compact({ type: raw.type, id: safeBlockId(raw.id), spacing: allowed(raw.spacing, ["tight", "normal", "spacious"]) });
      if (raw.type === "photo") {
        const media = await packageMedia(raw, "image");
        return media ? compact({ ...common, presentation: allowed(raw.presentation, ["full", "contained", "portrait", "quiet"]) || "contained", width: allowed(raw.width, ["full", "wide", "normal", "narrow"]), ...media }) : null;
      }
      if (raw.type === "collage" || raw.type === "sequence") {
        const images = [];
        for (const image of raw.images || []) {
          const packagedImage = await packageMedia(image, "image");
          if (packagedImage) images.push(packagedImage);
        }
        if (raw.type === "sequence" && images.length < 3) return null;
        if (!images.length) return null;
        return compact({ ...common, layout: raw.type === "collage" && COLLAGE_LAYOUTS.has(raw.layout) ? raw.layout : undefined, label: cleanText(raw.label), images });
      }
      if (raw.type === "caption") return cleanText(raw.text) ? { ...common, text: cleanText(raw.text) } : null;
      if (raw.type === "note") {
        const paragraphs = Array.isArray(raw.paragraphs) ? raw.paragraphs.map(cleanText).filter(Boolean) : undefined;
        if (!cleanText(raw.text) && !paragraphs?.length) return null;
        return compact({ ...common, heading: cleanText(raw.heading), text: paragraphs ? undefined : cleanText(raw.text), paragraphs });
      }
      if (raw.type === "quote") return cleanText(raw.text) ? compact({ ...common, text: cleanText(raw.text), attribution: cleanText(raw.attribution) }) : null;
      if (raw.type === "pause") return compact({ ...common, text: cleanText(raw.text) });
      if (raw.type === "place") return cleanText(raw.name) ? compact({ ...common, name: cleanText(raw.name), note: cleanText(raw.note), mapUrl: safeHttpUrl(raw.mapUrl) }) : null;
      if (raw.type === "video") {
        const media = await packageMedia(raw, "video");
        return media ? compact({ ...common, ...media, poster: safePath(raw.poster) }) : null;
      }
      return null;
    }

    async function packageMedia(target, expectedKind) {
      if (isCancelled()) throw abortError();
      const mediaId = safeMediaId(target.mediaId);
      if (!mediaId) return repositoryMedia(target, expectedKind);
      if (mediaCache.has(mediaId)) return mediaCache.get(mediaId).renderer;
      const item = record.media[mediaId];
      if (!item) throw new Error(`${record.day.id}: missing metadata for ${mediaId}.`);
      const blob = await readBlob(record.day.id, mediaId).catch(() => null);
      if (!blob) {
        const repository = repositoryMedia({ ...target, src: item.repositoryPath, sources: item.sources, width: item.width, height: item.height }, expectedKind);
        if (!repository || !await repositoryFileExists(repository.src)) throw new Error(`${record.day.id}: unresolved media ${item.originalName || mediaId}.`);
        mediaCache.set(mediaId, { renderer: repository, backup: backupMedia(item, "repository") });
        return repository;
      }

      mediaOrdinal += 1;
      originalBytes += blob.size;
      if (expectedKind === "video" || item.kind === "video") {
        if (!VIDEO_TYPES.has(blob.type)) throw new Error(`${item.originalName || mediaId} is not a supported video.`);
        const extension = videoExtension(blob.type);
        const filename = `${orderedPrefix(mediaOrdinal)}-${slug(item.outputName || item.originalName || "video")}.${extension}`;
        const path = `assets/log/${record.day.id}/${filename}`;
        root.file(path, blob);
        packagedBytes += blob.size;
        files.push(path);
        const renderer = compact({ src: path, alt: cleanText(target.alt), caption: cleanText(target.caption) });
        mediaCache.set(mediaId, { renderer, backup: backupMedia(item, "packaged", { repositoryPath: path, fileSize: blob.size }) });
        return renderer;
      }

      if (!IMAGE_TYPES.has(blob.type)) throw new Error(`${item.originalName || mediaId} is not a supported image.`);
      const converted = await convertImage(blob, isCancelled);
      const base = `${orderedPrefix(mediaOrdinal)}-${slug(item.outputName || item.originalName || "photo")}`;
      const directory = `assets/log/${record.day.id}`;
      const largePath = `${directory}/${base}.webp`;
      root.file(largePath, converted.large.blob);
      packagedBytes += converted.large.blob.size;
      files.push(largePath);
      const srcset = [];
      if (converted.mobile) {
        const mobilePath = `${directory}/${base}-960.webp`;
        root.file(mobilePath, converted.mobile.blob);
        packagedBytes += converted.mobile.blob.size;
        files.push(mobilePath);
        srcset.push(`${mobilePath} ${converted.mobile.width}w`);
      }
      srcset.push(`${largePath} ${converted.large.width}w`);
      const renderer = compact({
        src: largePath,
        sources: [{ type: "image/webp", srcset: srcset.join(", ") }],
        width: converted.large.width,
        height: converted.large.height,
        alt: target.decorative === true ? "" : cleanText(target.alt),
        decorative: target.decorative === true || undefined,
        caption: cleanText(target.caption),
        location: cleanText(target.location),
        time: cleanText(target.time),
        crop: target.cropMode && target.cropMode !== "natural" ? true : undefined,
        cropMode: allowed(target.cropMode, ["landscape", "square", "portrait"]),
        focalPoint: safeFocalPoint(target.focalPoint)
      });
      mediaCache.set(mediaId, { renderer, backup: backupMedia(item, "packaged", { repositoryPath: largePath, width: converted.large.width, height: converted.large.height, fileSize: converted.large.blob.size, sources: renderer.sources }) });
      return renderer;
    }
  }

  function repositoryMedia(target, kind) {
    const src = safePath(target.src);
    if (!src) return null;
    if (kind === "video") return compact({ src, alt: cleanText(target.alt), caption: cleanText(target.caption), poster: safePath(target.poster) });
    return compact({
      src,
      sources: safeSources(target.sources),
      width: positive(target.width),
      height: positive(target.height),
      alt: target.decorative === true ? "" : cleanText(target.alt),
      decorative: target.decorative === true || undefined,
      caption: cleanText(target.caption),
      location: cleanText(target.location),
      time: cleanText(target.time),
      crop: target.cropMode && target.cropMode !== "natural" ? true : undefined,
      cropMode: allowed(target.cropMode, ["landscape", "square", "portrait"]),
      focalPoint: safeFocalPoint(target.focalPoint)
    });
  }

  async function convertImage(blob, isCancelled) {
    const bitmap = await decodeImage(blob);
    try {
      if (isCancelled()) throw abortError();
      const longEdge = Math.max(bitmap.width, bitmap.height);
      const largeScale = Math.min(1, 2200 / longEdge);
      const large = await renderWebp(bitmap, largeScale, .84);
      const mobile = longEdge > 960 ? await renderWebp(bitmap, 960 / longEdge, .8) : null;
      return { large, mobile };
    } finally {
      if (typeof bitmap.close === "function") bitmap.close();
    }
  }

  async function decodeImage(blob) {
    if ("createImageBitmap" in window) return createImageBitmap(blob, { imageOrientation: "from-image" });
    const url = URL.createObjectURL(blob);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      return image;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function renderWebp(image, scale, quality) {
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("This browser cannot process images.");
    context.drawImage(image, 0, 0, width, height);
    const output = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    canvas.width = 1;
    canvas.height = 1;
    if (!output || output.type !== "image/webp") throw new Error("This browser could not create WebP images.");
    return { blob: output, width, height };
  }

  function createIndex(packaged) {
    const dayLines = packaged.map(({ entry }) => `      ${JSON.stringify(entry.dayId)}: { state: ${JSON.stringify(entry.state)}, file: ${JSON.stringify(`trip-log/${entry.dayId}.js`)} }`).join(",\n");
    return `(function () {\n  // Generated publication manifest. Copy into data/trip-log-index.js after review.\n  window.TRIP_LOG_INDEX = Object.freeze({\n    version: 2,\n    days: {\n${dayLines}\n    }\n  });\n})();\n`;
  }

  function rendererFile(dayId, entry) {
    return `(function () {\n  "use strict";\n\n  const entries = window.TRIP_LOG_ENTRIES || (window.TRIP_LOG_ENTRIES = Object.create(null));\n  entries[${JSON.stringify(dayId)}] = Object.freeze(${JSON.stringify(entry, null, 2)});\n})();\n`;
  }

  function createBackup(selected, packaged) {
    return {
      editorVersion: 1,
      schemaVersion: ENTRY_VERSION,
      packageVersion: 1,
      exportedAt: new Date().toISOString(),
      trip: { name: config?.trip?.name || "Aegean Odyssey", dayIds: selected.map(({ day }) => day.id) },
      entries: selected.map(({ entry }) => scrubObjectUrls(entry)),
      mediaManifest: selected.flatMap(({ media }) => Object.values(media).map((item) => scrubObjectUrls(item))),
      packagedEntries: packaged.map(({ entry }) => entry)
    };
  }

  function createReport(all, selected, packaged, originalBytes, packagedBytes, files) {
    const selectedIds = new Set(selected.map(({ day }) => day.id));
    const excluded = all.filter(({ day }) => !selectedIds.has(day.id));
    const unresolved = selected.flatMap(({ day, analysis }) => analysis.blocked.map((issue) => `- Day ${day.number}: ${issue}`));
    const warnings = packaged.flatMap(({ record, warnings: values }) => values.map((warning) => `- Day ${record.day.number}: ${warning}`));
    return `# Travel Log package report\n\nGenerated: ${new Date().toISOString()}\n\n## Included days\n\n${packaged.map(({ record, entry, media }) => `- Day ${record.day.number} — ${record.day.title}: **${entry.state}**, ${media.length} media item(s)`).join("\n") || "- None"}\n\n## Excluded saved days\n\n${excluded.map(({ day, entry }) => `- Day ${day.number} — ${day.title}: ${entry.state}`).join("\n") || "- None"}\n\n## Media\n\n- Original local media: ${formatBytes(originalBytes)}\n- Packaged media: ${formatBytes(packagedBytes)}\n- Existing repository media remain referenced and are not duplicated.\n\n## Unresolved references\n\n${unresolved.join("\n") || "- None"}\n\n## Warnings\n\n${warnings.join("\n") || "- None"}\n\n## Generated files\n\n${files.sort().map((file) => `- \`${file}\``).join("\n")}\n`;
  }

  function createPublishingGuide(includeFlag) {
    return `# Publishing the Travel Log package\n\n1. Extract this ZIP outside the repository.\n2. Review \`PACKAGE_REPORT.md\` and resolve every warning you consider important.\n3. Copy the package's \`assets/log/\` and \`data/\` folders into the repository root, preserving their paths.\n4. Keep \`backup/travel-log-editor-project.json\` somewhere safe; it contains metadata, not image or video binaries.\n5. Start the local site and open \`travel-log.html?preview=travel-log\` on localhost or 127.0.0.1.\n6. Check every included chapter, image, caption and navigation link.\n7. The public feature remains disabled. Only after review, change \`features.travelLog\` in \`data/trip-config.js\` from \`false\` to \`true\`.\n${includeFlag ? "8. See `FEATURE_FLAG_UPDATE.md` for the optional manual feature-flag change.\n" : ""}\nDo not commit private photographs, access details or sensitive travel documents to a public repository.\n`;
  }

  function featureFlagGuide() {
    return `# Optional feature-flag update\n\nThe package does not edit the configuration automatically. After local review, change this line in \`data/trip-config.js\`:\n\n\`travelLog: false\`\n\nto:\n\n\`travelLog: true\`\n\nLeave it false until every published entry and public photograph has been reviewed.\n`;
  }

  function normaliseManifest(raw) {
    const values = raw && typeof raw === "object" ? Object.values(raw) : [];
    return Object.fromEntries(values.filter((item) => safeMediaId(item?.id)).map((item) => [item.id, {
      id: item.id,
      originalName: safeFilename(item.originalName),
      outputName: safeFilename(item.outputName),
      repositoryPath: safePath(item.repositoryPath),
      mimeType: cleanText(item.mimeType),
      width: positive(item.width),
      height: positive(item.height),
      fileSize: positive(item.fileSize),
      kind: item.kind === "video" ? "video" : "image",
      sources: safeSources(item.sources)
    }]));
  }

  function uniqueMediaReferences(blocks) {
    const seen = new Set();
    const result = [];
    blocks.forEach((block, blockIndex) => mediaTargets(block).forEach((target, mediaIndex) => {
      const mediaId = safeMediaId(target.mediaId);
      if (!mediaId || seen.has(mediaId)) return;
      seen.add(mediaId);
      result.push({ mediaId, src: target.src, label: `block ${blockIndex + 1}, media ${mediaIndex + 1}` });
    }));
    return result;
  }

  function mediaTargets(block) {
    if (block?.type === "photo" || block?.type === "video") return [block];
    if (block?.type === "collage" || block?.type === "sequence") return Array.isArray(block.images) ? block.images : [];
    return [];
  }

  function isPotentiallyRenderable(block) {
    if (!block || !BLOCK_TYPES.has(block.type)) return false;
    if (block.type === "photo" || block.type === "video") return Boolean(safeMediaId(block.mediaId) || safePath(block.src));
    if (block.type === "collage") return Array.isArray(block.images) && block.images.some((image) => safeMediaId(image.mediaId) || safePath(image.src));
    if (block.type === "sequence") return Array.isArray(block.images) && block.images.filter((image) => safeMediaId(image.mediaId) || safePath(image.src)).length >= 3;
    if (["caption", "quote"].includes(block.type)) return Boolean(cleanText(block.text));
    if (block.type === "note") return Boolean(cleanText(block.text) || block.paragraphs?.some(cleanText));
    if (block.type === "place") return Boolean(cleanText(block.name));
    return true;
  }

  async function repositoryFileExists(path) {
    try {
      const response = await fetch(new URL(`../${safePath(path)}`, document.baseURI), { method: "HEAD", cache: "no-store" });
      return response.ok;
    } catch {
      return false;
    }
  }

  async function readBlob(dayId, mediaId) {
    if (!("indexedDB" in window)) return null;
    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, 1);
      request.addEventListener("upgradeneeded", () => {
        if (!request.result.objectStoreNames.contains(MEDIA_STORE)) request.result.createObjectStore(MEDIA_STORE);
      }, { once: true });
      request.addEventListener("success", () => resolve(request.result), { once: true });
      request.addEventListener("error", () => reject(request.error), { once: true });
    });
    try {
      return await new Promise((resolve, reject) => {
        if (!database.objectStoreNames.contains(MEDIA_STORE)) return resolve(null);
        const transaction = database.transaction(MEDIA_STORE, "readonly");
        const request = transaction.objectStore(MEDIA_STORE).get(`${dayId}:${mediaId}`);
        request.addEventListener("success", () => resolve(request.result || null), { once: true });
        request.addEventListener("error", () => reject(request.error), { once: true });
      });
    } finally {
      database.close();
    }
  }

  function backupMedia(item, source, overrides = {}) {
    return compact({
      id: item.id,
      originalName: item.originalName,
      outputName: item.outputName,
      repositoryPath: item.repositoryPath,
      mimeType: item.mimeType,
      width: item.width,
      height: item.height,
      fileSize: item.fileSize,
      kind: item.kind,
      packageSource: source,
      ...overrides
    });
  }

  function safeSources(value) {
    if (!Array.isArray(value)) return undefined;
    const result = value.slice(0, 4).map((source) => compact({
      type: /^image\/[a-z0-9.+-]+$/i.test(source?.type || "") ? source.type : undefined,
      srcset: safeSrcset(source?.srcset),
      media: cleanText(source?.media)
    })).filter((source) => source.srcset);
    return result.length ? result : undefined;
  }

  function safePath(value) {
    const path = cleanText(value).replace(/\\/g, "/").replace(/^\/+/, "");
    if (!path || path.includes("..") || /^(?:blob|data|javascript|file):/i.test(path) || /^[a-z][a-z0-9+.-]*:/i.test(path)) return "";
    return path.split("/").map(safeFilename).filter(Boolean).join("/");
  }

  function safeSrcset(value) {
    const source = cleanText(value);
    if (!source || source.includes("..") || /(?:blob|data|javascript|file):/i.test(source)) return "";
    return source;
  }

  function safeFilename(value) {
    return cleanText(value).replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 100);
  }

  function slug(value) {
    const base = safeFilename(value).replace(/\.[a-z0-9]+$/i, "").toLowerCase();
    return base || "media";
  }

  function orderedPrefix(index) {
    return String(index).padStart(2, "0");
  }

  function safeBlockId(value) {
    return /^moment-[a-z0-9-]+$/.test(value || "") ? value : undefined;
  }

  function safeMediaId(value) {
    return /^media-[a-z0-9-]+$/.test(value || "") ? value : "";
  }

  function safeDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value || "") ? value : "";
  }

  function safeHttpUrl(value) {
    try {
      const url = new URL(cleanText(value));
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  function safeFocalPoint(value) {
    const match = /^(\d{1,3})%\s+(\d{1,3})%$/.exec(cleanText(value));
    if (!match) return undefined;
    return `${Math.min(100, Number(match[1]))}% ${Math.min(100, Number(match[2]))}%`;
  }

  function allowed(value, values) {
    return values.includes(value) ? value : undefined;
  }

  function positive(value) {
    return Number.isFinite(value) && value > 0 ? value : undefined;
  }

  function cleanText(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function compact(value) {
    return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== ""));
  }

  function scrubObjectUrls(value) {
    if (Array.isArray(value)) return value.map(scrubObjectUrls);
    if (!value || typeof value !== "object") return typeof value === "string" && /^(?:blob|data):/i.test(value) ? "" : value;
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, scrubObjectUrls(item)]));
  }

  function videoExtension(type) {
    return type === "video/webm" ? "webm" : type === "video/ogg" ? "ogv" : "mp4";
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / (1024 ** index)).toFixed(index ? 1 : 0)} ${units[index]}`;
  }

  function titleCase(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function element(tag, className = "", text = "") {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function setBusy(value, label = "", progress = 0) {
    running = value;
    ui.progress.hidden = !value;
    ui.cancel.hidden = !value;
    ui.refresh.hidden = value;
    ui.refresh.disabled = value;
    ui.create.disabled = value;
    ui.close.disabled = value;
    [...ui.days.querySelectorAll("input"), ui.includeDrafts, ui.featureFlag].forEach((control) => { control.disabled = value; });
    if (value) setProgress(label, progress);
    else {
      ui.includeDrafts.disabled = false;
      ui.featureFlag.disabled = false;
      ui.days.querySelectorAll("[data-package-day]").forEach((input) => {
        const record = records.find(({ day }) => day.id === input.dataset.packageDay);
        input.disabled = !ui.includeDrafts.checked && record?.entry.state !== "published";
      });
      renderSummary();
    }
  }

  function setProgress(label, value) {
    ui.progressLabel.textContent = label;
    ui.progressBar.value = Math.max(0, Math.min(100, value));
  }

  function setFeedback(message) {
    ui.feedback.textContent = message;
  }

  function assertNotCancelled() {
    if (cancelled) throw abortError();
  }

  function abortError() {
    return new DOMException("Export cancelled", "AbortError");
  }

  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = safeFilename(filename);
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
})();
