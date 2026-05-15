import { expect, test } from "@playwright/test";

const uniqueName = () => `E2E Subject ${Date.now()}`;

test.describe("happy path", () => {
  test("create patient, view it, add a note", async ({ page }) => {
    const name = uniqueName();

    await page.goto("/patients");
    await expect(page.getByRole("heading", { name: /patients/i })).toBeVisible();

    await page.getByRole("link", { name: /\+ new patient/i }).click();
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
    await page.getByLabel("Search patients").fill(name);
    await expect(page.getByText(name).first()).toBeVisible();
  });
});
