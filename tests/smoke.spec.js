const { test, expect } = require("@playwright/test");
const fs = require("node:fs/promises");

const DAY_PAGES = [
  "day-1-athens-arrival.html",
  "day-2-acropolis-ferry.html",
  "day-3-chania.html",
  "day-4-elafonisi.html",
  "day-5-rethymno-heraklion.html",
  "day-6-santorini.html",
  "day-7-knossos.html"
];

const VIEWPORTS = [
  { width: 320, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 }
];

const weatherResponse = {
  current: {
    temperature_2m: 24.2,
    weather_code: 1,
    wind_speed_10m: 13.4
  },
  daily: {
    time: ["2026-07-13", "2026-07-14", "2026-07-15", "2026-07-16"],
    weather_code: [1, 2, 3, 61],
    temperature_2m_max: [28, 27, 26, 25],
    temperature_2m_min: [20, 19, 19, 18],
    precipitation_probability_max: [5, 10, 15, 45],
    sunrise: ["2026-07-13T06:12", "2026-07-14T06:13", "2026-07-15T06:14", "2026-07-16T06:15"],
    sunset: ["2026-07-13T20:48", "2026-07-14T20:47", "2026-07-15T20:46", "2026-07-16T20:45"]
  }
};

function monitorPage(page) {
  const failures = [];

  page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().startsWith("Failed to load resource:")) {
      failures.push(`console: ${message.text()}`);
    }
  });
  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    const errorText = request.failure()?.errorText || "unknown error";
    if (url.origin === "http://127.0.0.1:4173" && errorText !== "net::ERR_ABORTED") {
      failures.push(`local request failed: ${url.pathname} (${errorText})`);
    }
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.origin === "http://127.0.0.1:4173" && response.status() >= 400) {
      failures.push(`local response ${response.status()}: ${url.pathname}`);
    }
  });

  return () => expect(failures, failures.join("\n")).toEqual([]);
}

async function blockOptionalExternalResources(page) {
  await page.route(/https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|www\.google\.com\/maps|cdn\.jsdelivr\.net)\//, (route) => route.abort());
}

async function expectValidTabSet(page, tabListName) {
  const tabList = page.getByRole("tablist", { name: tabListName });
  const tabs = tabList.getByRole("tab");
  const count = await tabs.count();

  for (let index = 0; index < count; index += 1) {
    const tab = tabs.nth(index);
    const panelId = await tab.getAttribute("aria-controls");
    const tabId = await tab.getAttribute("id");
    const panel = page.locator(`#${panelId}`);
    await expect(panel).toHaveCount(1);
    await expect(panel).toHaveAttribute("aria-labelledby", tabId);

    if ((await tab.getAttribute("aria-selected")) === "true") {
      await expect(panel).toBeVisible();
    } else {
      await expect(panel).toBeHidden();
    }
  }
}

async function mockThreeChapterPreview(page) {
  await page.route("**/data/trip-log-index.js", async (route) => {
    const response = await route.fetch();
    const source = (await response.text())
      .replace('"day-02": { state: "hidden" }', '"day-02": { state: "draft", file: "trip-log/day-02.js" }')
      .replace('"day-04": { state: "hidden" }', '"day-04": { state: "draft", file: "trip-log/day-04.js" }');
    await route.fulfill({ response, body: source });
  });

  const entrySource = (dayId, date, place, text) => `(function () {
    const entries = window.TRIP_LOG_ENTRIES || (window.TRIP_LOG_ENTRIES = Object.create(null));
    entries["${dayId}"] = {
      version: 2,
      dayId: "${dayId}",
      state: "draft",
      date: "${date}",
      place: "${place}",
      blocks: [{ type: "caption", text: "${text}" }]
    };
  })();`;

  await page.route("**/data/trip-log/day-02.js", (route) => route.fulfill({
    status: 200,
    contentType: "application/javascript",
    body: entrySource("day-02", "2026-10-11", "Athens to Crete", "Temporary Day 2 navigation fixture.")
  }));
  await page.route("**/data/trip-log/day-04.js", (route) => route.fulfill({
    status: 200,
    contentType: "application/javascript",
    body: entrySource("day-04", "2026-10-13", "Elafonisi", "Temporary Day 4 navigation fixture.")
  }));
}

test.beforeEach(async ({ page }) => {
  await blockOptionalExternalResources(page);
});

test("core pages load without local failures or JavaScript errors", async ({ page }) => {
  const assertNoFailures = monitorPage(page);
  const pages = ["/index.html", "/essentials.html", ...DAY_PAGES.map((day) => `/days/${day}`)];

  for (const path of pages) {
    await test.step(path, async () => {
      const response = await page.goto(path);
      expect(response?.ok()).toBeTruthy();
      await expect(page).toHaveTitle(/\S+/);
      await expect(page.locator("header.nav")).toBeVisible();
      await expect(page.locator("header.nav nav")).toBeVisible();
    });
  }

  assertNoFailures();
});

test("Travel Log stays public-disabled and local preview renders ordered blocks", async ({ page }) => {
  const assertNoFailures = monitorPage(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/index.html");
  await expect(page.locator("[data-travel-log-link]")).toHaveCount(0);

  await page.goto("/travel-log.html");
  await expect(page).toHaveURL(/\/index\.html#itinerary$/);

  await page.goto("/travel-log.html?preview=travel-log");
  await expect(page.locator("body")).toHaveClass(/travel-log-ready/);
  await expect(page.locator("#travel-log-preview-note")).toBeVisible();
  await expect(page.locator("#day-03")).toBeVisible();

  const blockTypes = await page.locator("#day-03 > [data-block-type]").evaluateAll((blocks) => blocks.map((block) => block.dataset.blockType));
  expect(blockTypes).toEqual([
    "photo", "caption", "collage", "note", "photo", "note",
    "collage", "caption", "collage", "quote", "place", "pause"
  ]);

  await expect(page.locator('[data-block-type="photo"]').first()).toHaveClass(/log-photo--full/);
  await expect(page.locator("#moment-chania-harbour")).toHaveCount(1);
  await expect(page.locator('[data-block-type="photo"] img').first()).toHaveAttribute("loading", "eager");
  await expect(page.locator('[data-block-type="photo"] img').nth(1)).toHaveAttribute("loading", "lazy");
  await expect(page.locator('[data-block-type="photo"] img').first()).toHaveAttribute("width", "1920");
  await expect(page.locator('[data-block-type="photo"] img').first()).toHaveAttribute("height", "1080");
  await expect(page.locator('[data-block-type="collage"]')).toHaveCount(3);
  await expect(page.locator('[data-block-type="caption"]').first()).toContainText("Temporary prototype only");
  await expect(page.locator('[data-block-type="note"]').first()).toContainText("Prototype note");
  await expect(page.locator('[data-block-type="note"]').nth(1).locator("p")).toHaveCount(3);
  await expect(page.locator('[data-block-type="quote"]')).toContainText("Temporary quote placeholder");
  await expect(page.locator('[data-block-type="comparison"], .log-comparison')).toHaveCount(0);
  await expect(page.getByText("Plan versus reality", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Actually", { exact: true })).toHaveCount(0);

  const renderedBlockIds = await page.locator("#day-03 > [data-block-type]").evaluateAll((blocks) => blocks.map((block) => block.id));
  expect(renderedBlockIds.every(Boolean)).toBeTruthy();
  expect(new Set(renderedBlockIds).size).toBe(renderedBlockIds.length);

  const emptyHeadingCount = await page.locator("#day-03 h1, #day-03 h2, #day-03 h3, #day-03 h4").evaluateAll((headings) => headings.filter((heading) => !heading.textContent.trim()).length);
  expect(emptyHeadingCount).toBe(0);
  await expect(page.locator("#day-03")).not.toContainText("undefined");

  const images = page.locator("#day-03 img");
  expect(await images.count()).toBe(10);
  for (let index = 0; index < await images.count(); index += 1) {
    const image = images.nth(index);
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((node) => node.complete && node.naturalWidth > 0)).toBe(true);
    const rendered = await image.boundingBox();
    expect(rendered?.width).toBeGreaterThan(0);
    expect(rendered?.height).toBeGreaterThan(0);
  }

  await expect(page.locator("[data-log-guide]")).toHaveAttribute("href", "days/day-3-chania.html");
  await expect(page.getByRole("button", { name: "Choose Travel Log day. Current: Day 3, Chania" })).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("[data-log-previous]")).toHaveAttribute("aria-disabled", "true");
  await expect(page.locator("[data-log-next]")).toHaveAttribute("aria-disabled", "true");
  await expect(page.locator(".travel-log-chapter-nav")).toContainText("Latest chapter");
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
  await expect(page.locator('[data-block-type="collage"]').first()).toHaveCSS("transition-duration", "0s");

  const initialTheme = await page.locator("html").getAttribute("data-theme");
  const initialBackground = await page.locator("body").evaluate((body) => getComputedStyle(body).backgroundColor);
  await page.locator(".theme-toggle").click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", initialTheme);
  await expect.poll(() => page.locator("body").evaluate((body) => getComputedStyle(body).backgroundColor)).not.toBe(initialBackground);

  await page.locator("#day-03 .travel-log-chapter-nav a").click();
  await expect(page).toHaveURL(/\/days\/day-3-chania\.html$/);
  await page.evaluate(() => localStorage.removeItem("aegeanTheme"));
  assertNoFailures();
});

test("Travel Log day navigation follows the active chapter", async ({ page }) => {
  const assertNoFailures = monitorPage(page);
  await mockThreeChapterPreview(page);
  await page.goto("/travel-log.html?preview=travel-log#day-03");

  const chooser = page.locator("#travel-log-day-button");
  await expect(chooser).toBeVisible();
  await expect(chooser).toHaveAttribute("aria-label", "Choose Travel Log day. Current: Day 3, Chania");
  await expect(chooser).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator('[data-log-day="day-03"]')).toHaveAttribute("aria-current", "page");
  await expect(page.locator("#day-03 .travel-log-chapter-nav")).toContainText("Continue to Day 4");

  await chooser.click();
  await expect(chooser).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(chooser).toHaveAttribute("aria-expanded", "false");
  await expect(chooser).toBeFocused();

  await chooser.click();
  await page.mouse.click(8, 160);
  await expect(chooser).toHaveAttribute("aria-expanded", "false");

  await page.locator("#day-04").scrollIntoViewIfNeeded();
  const dayFourChooser = page.getByRole("button", { name: "Choose Travel Log day. Current: Day 4, Elafonisi" });
  await expect(dayFourChooser).toBeVisible();
  await expect(page.locator("[data-log-guide]")).toHaveAttribute("href", "days/day-4-elafonisi.html");
  await expect(page.locator("[data-log-previous]")).toHaveAttribute("href", "#day-03");

  await page.locator("[data-log-previous]").click();
  await expect(page).toHaveURL(/#day-03$/);
  await expect(page.getByRole("button", { name: "Choose Travel Log day. Current: Day 3, Chania" })).toBeVisible();
  await expect(page.locator("[data-log-next]")).toHaveAttribute("href", "#day-04");

  await page.locator("[data-log-next]").click();
  await expect(page).toHaveURL(/#day-04$/);
  await expect(page.getByRole("button", { name: "Choose Travel Log day. Current: Day 4, Elafonisi" })).toBeVisible();

  await page.getByRole("button", { name: "Choose Travel Log day. Current: Day 4, Elafonisi" }).click();
  await page.locator('[data-log-day="day-02"]').click();
  await expect(page).toHaveURL(/#day-02$/);
  await expect(page.locator('[data-log-day="day-02"]')).toHaveAttribute("aria-current", "page");
  await expect(page.locator("[data-log-guide]")).toHaveAttribute("href", "days/day-2-acropolis-ferry.html");
  assertNoFailures();
});

test("Travel Log skips an unsupported block without breaking the chapter", async ({ page }) => {
  const assertNoFailures = monitorPage(page);
  await page.route("**/data/trip-log/day-03.js", async (route) => {
    const response = await route.fetch();
    const source = (await response.text())
      .replace("blocks: [", 'blocks: [{ type: "unsupported-test-block" },')
      .replace('layout: "feature-left"', 'layout: "feature-right"');
    await route.fulfill({ response, body: source });
  });

  await page.goto("/travel-log.html?preview=travel-log");
  await expect(page.locator("#day-03")).toBeVisible();
  await expect(page.locator('[data-block-type="unsupported-test-block"]')).toHaveCount(0);
  await expect(page.locator('[data-block-type="photo"]')).toHaveCount(2);
  await expect(page.locator(".log-collage--feature-right")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => document.documentElement.clientWidth)
  );
  assertNoFailures();
});

test("published Travel Log configuration exposes navigation and the feed", async ({ page }) => {
  const assertNoFailures = monitorPage(page);
  await page.route("**/data/trip-config.js", async (route) => {
    const response = await route.fetch();
    const source = (await response.text()).replace("travelLog: false", "travelLog: true");
    await route.fulfill({ response, body: source });
  });
  await page.route("**/data/trip-log-index.js", async (route) => {
    const response = await route.fetch();
    const source = (await response.text()).replace('state: "draft"', 'state: "published"');
    await route.fulfill({ response, body: source });
  });
  await page.route("**/data/trip-log/day-03.js", async (route) => {
    const response = await route.fetch();
    const source = (await response.text()).replace('state: "draft"', 'state: "published"');
    await route.fulfill({ response, body: source });
  });

  await page.goto("/index.html");
  expect(await page.evaluate(() => ({
    enabled: window.TRIP_CONFIG.features.travelLog,
    state: window.TRIP_LOG_INDEX.days["day-03"].state
  }))).toEqual({ enabled: true, state: "published" });
  const logLink = page.locator("[data-travel-log-link]");
  await expect(logLink).toBeVisible();
  await expect(logLink).toContainText("Travel Log");
  await expect(page.locator('#journey-day-03 [data-card-travel-log]')).toBeVisible();

  await page.goto("/days/day-3-chania.html");
  await expect(page.locator("[data-travel-log-link]")).toHaveAttribute("href", "../travel-log.html");

  await page.goto("/index.html");
  await logLink.click();
  await expect(page).toHaveURL(/\/travel-log\.html$/);
  await expect(page.locator("#day-03")).toBeVisible();
  await expect(page.locator("#travel-log-preview-note")).toBeHidden();
  assertNoFailures();
});

test("Travel Log preview has no horizontal overflow", async ({ page }) => {
  const assertNoFailures = monitorPage(page);
  for (const viewport of VIEWPORTS) {
    await test.step(`${viewport.width}x${viewport.height}`, async () => {
      await page.setViewportSize(viewport);
      await page.goto("/travel-log.html?preview=travel-log");
      await expect(page.locator("#day-03")).toBeVisible();
      const widths = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth
      }));
      expect(widths.scroll).toBeLessThanOrEqual(widths.client);
      await expect(page.locator("header.nav")).toBeVisible();
      await expect(page.locator(".travel-log-day-nav")).toBeVisible();
      if (viewport.width <= 430) {
        await expect.poll(() => page.locator("#day-03 img").first().evaluate((image) => image.currentSrc)).toMatch(/-960\.webp$/);
        const mobileChooser = page.locator("#travel-log-day-button");
        await mobileChooser.click();
        const menuBounds = await page.locator("#travel-log-day-menu").boundingBox();
        expect(menuBounds?.x).toBeGreaterThanOrEqual(0);
        expect((menuBounds?.x || 0) + (menuBounds?.width || 0)).toBeLessThanOrEqual(viewport.width);
        await mobileChooser.click();
      }
    });
  }
  assertNoFailures();
});

test("homepage core flows and persisted controls work", async ({ page }) => {
  const assertNoFailures = monitorPage(page);
  await page.goto("/index.html");

  await expect(page.locator("#itinerary")).toBeVisible();
  await expect(page.locator("#checklist")).toBeVisible();

  const firstBooking = page.locator("#booking-0");
  await firstBooking.check();
  await page.reload();
  await expect(page.locator("#booking-0")).toBeChecked();

  const themeButton = page.locator(".theme-toggle").first();
  const initialTheme = await page.locator("html").getAttribute("data-theme");
  await themeButton.click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", initialTheme);
  const changedTheme = await page.locator("html").getAttribute("data-theme");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", changedTheme);

  await page.getByRole("link", { name: /Check trip essentials/ }).click();
  await expect(page).toHaveURL(/\/essentials\.html$/);

  await page.evaluate(() => {
    localStorage.removeItem("aegeanBookings");
    localStorage.removeItem("aegeanTheme");
  });
  assertNoFailures();
});

test("Day 1 capsules, history, route map and day chooser work", async ({ page }) => {
  const assertNoFailures = monitorPage(page);
  await page.goto("/days/day-1-athens-arrival.html");

  const itinerary = page.getByRole("tab", { name: "Itinerary" });
  const highlights = page.getByRole("tab", { name: "Highlights" });
  const food = page.getByRole("tab", { name: "Food recommendation" });
  const essentials = page.getByRole("tab", { name: "Essentials" });

  await expect(itinerary).toHaveAttribute("aria-selected", "true");
  await expectValidTabSet(page, "Day guide sections");

  for (const tab of [highlights, food, essentials]) {
    await tab.click();
    await expect(tab).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".day-panel:not([hidden])")).toHaveCount(1);
  }

  await page.goto("/days/day-1-athens-arrival.html#panel-food");
  await expect(food).toHaveAttribute("aria-selected", "true");
  await highlights.click();
  await expect(page).toHaveURL(/#panel-highlights$/);
  await page.goBack();
  await expect(page).toHaveURL(/#panel-food$/);
  await expect(food).toHaveAttribute("aria-selected", "true");

  await itinerary.focus();
  await page.keyboard.press("ArrowRight");
  await expect(highlights).toBeFocused();
  await expect(highlights).toHaveAttribute("aria-selected", "true");

  const daysButton = page.getByRole("button", { name: /Choose a day/ });
  await daysButton.click();
  await expect(daysButton).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(daysButton).toHaveAttribute("aria-expanded", "false");
  await expect(daysButton).toBeFocused();

  await daysButton.click();
  await page.mouse.click(600, 500);
  await expect(daysButton).toHaveAttribute("aria-expanded", "false");

  await expect(page.locator(".route-overview")).toBeVisible();
  await expect(page.locator(".offline-route-map")).toBeVisible();
  await expect(page.getByRole("link", { name: /Memories|Travel Log/i })).toHaveCount(0);

  await page.getByRole("link", { name: /Next day: Acropolis & ferry/ }).click();
  await expect(page).toHaveURL(/\/days\/day-2-acropolis-ferry\.html$/);

  await page.goto("/days/day-1-athens-arrival.html");
  await page.getByRole("button", { name: /Choose a day/ }).click();
  await page.getByRole("link", { name: "All days" }).click();
  await expect(page).toHaveURL(/\/index\.html#itinerary$/);

  assertNoFailures();
});

test("Essentials capsules, toolkit modes and checklist persistence work", async ({ page }) => {
  const assertNoFailures = monitorPage(page);
  await page.goto("/essentials.html");

  const tools = page.getByRole("tab", { name: "Tools", exact: true });
  const checklist = page.getByRole("tab", { name: "Checklist", exact: true });
  const routeOverview = page.getByRole("tab", { name: "Route overview", exact: true });
  await expect(tools).toHaveAttribute("aria-selected", "true");
  await expectValidTabSet(page, "Essentials categories");

  await tools.focus();
  await page.keyboard.press("ArrowRight");
  await expect(checklist).toBeFocused();
  await expect(checklist).toHaveAttribute("aria-selected", "true");

  await routeOverview.click();
  await expect(routeOverview).toHaveAttribute("aria-selected", "true");
  await tools.click();

  for (const name of ["Maps", "Weather", "Translate", "Photo scan"]) {
    await expect(page.getByRole("tab", { name, exact: true })).toBeVisible();
  }
  await page.getByRole("tab", { name: "Translate", exact: true }).click();
  await expect(page.locator("#tool-panel-translate")).toBeVisible();
  await page.getByRole("tab", { name: "Photo scan", exact: true }).click();
  await expect(page.locator("#tool-panel-scanner")).toBeVisible();
  await expect(page.locator("#scanner-file")).toHaveCount(1);

  await checklist.click();
  const passport = page.locator('[data-item="id"]');
  await passport.check();
  await page.reload();
  await expect(page.locator('[data-item="id"]')).toBeChecked();

  await page.goto("/essentials.html#route-overview");
  await expect(routeOverview).toHaveAttribute("aria-selected", "true");
  await page.goto("/essentials.html#checklist");
  await expect(checklist).toHaveAttribute("aria-selected", "true");

  await page.evaluate(() => localStorage.removeItem("aegeanEssentialsChecklist:v1"));
  assertNoFailures();
});

test("weather renders deterministic data", async ({ page }) => {
  const assertNoFailures = monitorPage(page);
  await page.route("https://api.open-meteo.com/**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(weatherResponse)
  }));

  await page.goto("/essentials.html");
  await page.getByRole("tab", { name: "Weather", exact: true }).click();
  await expect(page.locator("#weather-result")).toContainText("Athens now");
  await expect(page.locator("#weather-result")).toContainText("24°");
  await expect(page.locator("#weather-result")).toContainText("Mostly clear");
  assertNoFailures();
});

test("weather failure shows a useful retry state", async ({ page }) => {
  const assertNoFailures = monitorPage(page);
  await page.route("https://api.open-meteo.com/**", (route) => route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({ error: true })
  }));

  await page.goto("/essentials.html");
  await page.getByRole("tab", { name: "Weather", exact: true }).click();
  await expect(page.locator("#weather-status")).toContainText("Live weather is unavailable right now");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  assertNoFailures();
});

test("representative pages remain usable at supported viewport sizes", async ({ page }) => {
  const assertNoFailures = monitorPage(page);
  const pages = [
    { path: "/index.html", key: "#itinerary" },
    { path: "/essentials.html", key: '[role="tablist"][aria-label="Essentials categories"]' },
    { path: "/days/day-1-athens-arrival.html", key: '[role="tablist"][aria-label="Day guide sections"]' }
  ];

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    for (const entry of pages) {
      await test.step(`${entry.path} at ${viewport.width}x${viewport.height}`, async () => {
        await page.goto(entry.path);
        const widths = await page.evaluate(() => ({
          client: document.documentElement.clientWidth,
          scroll: document.documentElement.scrollWidth
        }));
        expect(widths.scroll).toBeLessThanOrEqual(widths.client);
        await expect(page.locator("header.nav")).toBeVisible();
        await expect(page.locator(entry.key)).toBeVisible();
      });
    }
  }

  assertNoFailures();
});

async function openEditor(page, dayId = "day-03") {
  await page.goto("/editor/index.html");
  await page.getByLabel("Trip day", { exact: true }).selectOption(dayId);
  await expect(page.locator("[data-entry-summary]")).toContainText(`Day ${Number(dayId.slice(-2))}`);
}

test("Travel Log editor loads without exposing itself on the public site", async ({ page }) => {
  const assertNoFailures = monitorPage(page);
  const response = await page.goto("/editor/index.html");
  expect(response?.ok()).toBeTruthy();
  await expect(page).toHaveTitle(/Travel Log Editor/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow, noarchive");
  await expect(page.getByText("Local editor", { exact: false })).toBeVisible();

  await page.goto("/index.html");
  await expect(page.getByRole("link", { name: "Travel Log editor" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Memories|Travel Log/i })).toHaveCount(0);
  assertNoFailures();
});

test("editor templates, block authoring and keyboard reorder controls work", async ({ page }) => {
  const assertNoFailures = monitorPage(page);
  await openEditor(page);
  await page.getByRole("button", { name: /Photo Story A paced visual chapter/ }).click();
  await expect(page.locator("[data-block-id]")).toHaveCount(6);

  await page.getByRole("button", { name: "Caption", exact: true }).click();
  const settings = page.locator("[data-settings-form]");
  await settings.locator('[data-editor-field="caption"]').fill("First coffee after leaving the ferry.");
  await expect(page.locator("[data-block-list]")).toContainText("First coffee after leaving the ferry.");

  await page.getByRole("button", { name: "Note", exact: true }).click();
  await settings.locator('[data-editor-field="note"]').fill("A brief editor test note.");
  await page.getByRole("button", { name: "Journal", exact: true }).click();
  await settings.locator('[data-editor-field="paragraph-1"]').fill("The first journal paragraph.");
  await settings.getByRole("button", { name: "Add paragraph" }).click();
  await settings.locator('[data-editor-field="paragraph-2"]').fill("The second journal paragraph.");

  const items = page.locator("[data-block-id]");
  const beforeDuplicate = await items.count();
  const selected = page.locator('[data-block-id][aria-current="true"]');
  await selected.getByRole("button", { name: "Move up" }).click();
  await selected.getByRole("button", { name: "Duplicate" }).click();
  await expect(items).toHaveCount(beforeDuplicate + 1);
  page.once("dialog", (dialog) => dialog.accept());
  await selected.getByRole("button", { name: "Delete" }).click();
  await expect(items).toHaveCount(beforeDuplicate);
  assertNoFailures();
});

test("editor media, collage, presentation, focal point and preview controls work", async ({ page }) => {
  const assertNoFailures = monitorPage(page);
  await openEditor(page);
  await page.getByRole("button", { name: /Minimal Four deliberate moments/ }).click();

  const settings = page.locator("[data-settings-form]");
  const imageInput = settings.locator('[data-editor-field="choose-image"]');
  await imageInput.setInputFiles({
    name: "phone-test.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFElEQVR42mNkYGD4z8DAwMDAAAAEAQEBAF9SAQAAAABJRU5ErkJggg==", "base64")
  });
  await settings.locator('[data-editor-field="alt-text"]').fill("Small non-private editor test image");
  await settings.locator('[data-editor-field="presentation"]').selectOption("portrait");
  await settings.locator('[data-editor-field="width"]').selectOption("narrow");
  await settings.locator('[data-editor-field="crop"]').selectOption("square");
  await expect(settings.locator(".focal-editor")).toBeVisible();
  await settings.locator(".focal-editor").click({ position: { x: 35, y: 45 } });
  await expect(settings.locator(".focal-marker")).not.toHaveAttribute("style", /--focal-x: 50%/);

  await page.getByRole("button", { name: /Collage Two Up/ }).click();
  await settings.locator('[data-collage-layout="feature-left"]').click();
  await expect(settings.locator('[data-collage-layout="feature-left"]')).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Mobile", exact: true }).click();
  await expect(page.locator("[data-preview-stage]")).toHaveAttribute("data-preview-stage", "mobile");
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(page.frameLocator("#travel-log-editor-preview").locator("html")).toHaveAttribute("data-theme", "dark");
  assertNoFailures();
});

test("editor autosaves, restores and exports clean data without object URLs", async ({ page }) => {
  const assertNoFailures = monitorPage(page);
  await openEditor(page, "day-04");
  await page.getByRole("button", { name: /Blank Start with an empty entry/ }).click();
  await page.getByRole("button", { name: "Caption", exact: true }).click();
  await page.locator('[data-settings-form] [data-editor-field="caption"]').fill("Autosaved editor caption.");
  await expect(page.locator("[data-save-state]")).toHaveText("Saved locally");

  await page.reload();
  await expect(page.getByLabel("Trip day", { exact: true })).toHaveValue("day-04");
  await expect(page.locator("[data-block-list]")).toContainText("Autosaved editor caption.");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON", exact: true }).click();
  const download = await downloadPromise;
  const exported = JSON.parse(await fs.readFile(await download.path(), "utf8"));
  expect(exported.editorVersion).toBe(1);
  expect(exported.entry.dayId).toBe("day-04");
  expect(JSON.stringify(exported)).not.toContain("blob:");
  assertNoFailures();
});

test("editor imports safe JSON and reports invalid or unsupported content", async ({ page }) => {
  const assertNoFailures = monitorPage(page);
  await page.goto("/editor/index.html");
  const importInput = page.locator("#editor-import-file");
  const validProject = {
    editorVersion: 1,
    schemaVersion: 2,
    entry: {
      version: 2,
      dayId: "day-05",
      state: "draft",
      date: "2026-10-14",
      place: "Across Crete",
      blocks: [
        { type: "caption", text: "Imported safe caption." },
        { type: "comparison", planned: "Unsupported", actual: "Ignored" }
      ]
    },
    mediaManifest: []
  };
  await importInput.setInputFiles({ name: "valid-editor.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(validProject)) });
  await expect(page.getByLabel("Trip day", { exact: true })).toHaveValue("day-05");
  await expect(page.locator("[data-block-list]")).toContainText("Imported safe caption.");
  await expect(page.locator("[data-editor-status]")).toContainText("Unsupported content was ignored");
  await expect(page.locator("[data-block-list]")).not.toContainText("Comparison");

  await importInput.setInputFiles({ name: "invalid.json", mimeType: "application/json", buffer: Buffer.from("{not-json") });
  await expect(page.locator("[data-editor-status]")).toContainText("Import failed");
  assertNoFailures();
});

test("Travel Log editor remains usable without horizontal overflow", async ({ page }) => {
  const assertNoFailures = monitorPage(page);
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    await page.goto("/editor/index.html");
    const widths = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth
    }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client);
    await expect(page.getByLabel("Trip day", { exact: true })).toBeVisible();
    if (viewport.width <= 760) {
      await page.getByRole("tab", { name: "Preview", exact: true }).click();
      await expect(page.locator('[data-editor-panel="preview"]')).toBeVisible();
    } else {
      await expect(page.locator("#travel-log-editor-preview")).toBeVisible();
    }
  }
  assertNoFailures();
});
