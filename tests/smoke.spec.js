const { test, expect } = require("@playwright/test");

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
