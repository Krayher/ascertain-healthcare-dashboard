import { expect, test } from "@playwright/test";

// Use a mobile-sized viewport but keep the chromium browser (the only
// one installed in CI). We're testing CSS breakpoints, not browser
// engine differences.
test.use({ viewport: { width: 390, height: 844 }, isMobile: true });

test.describe("responsive: mobile viewport (390x844)", () => {
  test("sidebar is hidden by default; hamburger opens it; nav closes it", async ({
    page,
  }) => {
    await page.goto("/patients");

    // The sidebar nav link "Patients" should not be visible to a user
    // until they open the drawer (the topbar still shows the patients
    // page itself).
    const sidebarPatientsLink = page.getByRole("link", { name: "Patients" });
    await expect(sidebarPatientsLink).toBeHidden();

    // Open the menu via the hamburger.
    await page.getByRole("button", { name: /open menu/i }).click();
    await expect(sidebarPatientsLink).toBeVisible();

    // Tapping a nav link closes the drawer.
    await sidebarPatientsLink.click();
    await expect(sidebarPatientsLink).toBeHidden();
  });

  test("topbar search is usable at mobile widths", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Search patients").fill("marisol");
    await page.waitForURL(/\/patients\?.*search=marisol/);
    // List page renders, no horizontal scroll on body.
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const innerWidth = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth + 1);
  });

  test("patient detail stacks: side rail appears below main content", async ({
    page,
  }) => {
    await page.goto("/patients");
    // Wait for the patient list to render, then click the first row.
    await page.locator("table, [role=list]").first().waitFor();
    // Cards (role=list) come first on default view? Default is table.
    // Click the first patient link via the table row.
    await page.locator("tbody tr").first().click();
    await expect(page.locator("h1")).toBeVisible();

    // Identifiers card (in SideRail) should be below the summary panel
    // when stacked. We assert by comparing y coordinates.
    const summary = page.getByText(/AI-assisted summary/i);
    const identifiers = page.getByText("Identifiers", { exact: true });
    await expect(summary).toBeVisible();
    await expect(identifiers).toBeVisible();

    const summaryBox = await summary.boundingBox();
    const identifiersBox = await identifiers.boundingBox();
    expect(summaryBox).not.toBeNull();
    expect(identifiersBox).not.toBeNull();
    expect(identifiersBox!.y).toBeGreaterThan(summaryBox!.y);
  });

  test("no horizontal scroll on dashboard or list", async ({ page }) => {
    for (const path of ["/", "/patients"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => ({
        body: document.body.scrollWidth,
        win: window.innerWidth,
      }));
      expect(overflow.body, `${path} overflows`).toBeLessThanOrEqual(
        overflow.win + 1,
      );
    }
  });
});
