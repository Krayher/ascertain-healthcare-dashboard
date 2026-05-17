import { expect, test } from "@playwright/test";

const uniqueName = () => `E2E Subject ${Date.now()}`;

test.describe("happy path", () => {
  test("create patient, view it, add a note", async ({ page }) => {
    const name = uniqueName();

    // Patient CRUD requires the Administrator role. Seed it into
    // localStorage before the app boots so the New patient affordances render.
    await page.addInitScript(() => {
      localStorage.setItem(
        "ascertain-role",
        JSON.stringify({ state: { role: "admin" }, version: 0 }),
      );
    });

    await page.goto("/patients");
    await expect(page.getByRole("heading", { name: /patients/i })).toBeVisible();

    await page.getByRole("link", { name: /register new patient/i }).click();
    await expect(page).toHaveURL(/\/patients\/new/);

    await page.locator('input[name="name"]').fill(name);
    await page.locator('input[name="date_of_birth"]').fill("1990-01-01");
    await page.locator('input[name="contact"]').fill("+14155550199");

    await page.getByRole("button", { name: /create patient/i }).click();

    // Lands on the detail page for the new patient.
    await expect(page).toHaveURL(/\/patients\/[0-9a-f-]{36}/);
    await expect(page.getByRole("heading", { name })).toBeVisible();

    // Add a note.
    const noteContent = `Initial visit recorded at ${Date.now()}`;
    await page.getByPlaceholder(/add a clinical note/i).fill(noteContent);
    await page.getByRole("button", { name: /^save$/i }).click();

    await expect(page.getByText(noteContent)).toBeVisible();

    // Navigate back to the list and confirm the patient appears.
    await page.getByRole("link", { name: "Patients" }).first().click();
    await expect(page).toHaveURL(/\/patients(\?|$)/);
    // The list page has its own search filter; the topbar also has one.
    // Use the FilterRow's textbox (placeholder differs) to disambiguate.
    await page.getByPlaceholder(/filter by name, mrn/i).fill(name);
    await expect(page.getByText(name).first()).toBeVisible();
  });
});
