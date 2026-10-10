/**
 * actions-taken-flow.spec.ts (E2E-01)
 * E2E: IT Staff logs an action taken with follow-up, assigns follow-up flag,
 * updates status, then Requester logs in and verifies read-only visibility.
 * Confirms staff email addresses are absent from Requester view.
 *
 * Seed ticket: TKT-2026-000001 (OPEN, ticketOwner = staff.alice)
 * Requester: jennifer.anderson@kmutt.ac.th (owns TKT-2026-000001)
 * IT Staff:  staff.alice@toktickit.local
 */
import { test, expect } from "@playwright/test";

const STAFF_EMAIL = "staff.alice@toktickit.local";
const STAFF_PASSWORD = "Password123!";
const REQUESTER_EMAIL = "jennifer.anderson@kmutt.ac.th";
const REQUESTER_PASSWORD = "Password123!";

async function login(page: any, email: string, password: string) {
  await page.goto("/");
  const logoutBtn = page.locator('button[aria-label="Logout"], button:has-text("Logout")').first();
  if (await logoutBtn.isVisible()) {
    await logoutBtn.click();
    await page.waitForTimeout(300);
  }
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.goto("/login");
  await page.waitForSelector("#login-email", { timeout: 8000 });
  await page.fill("#login-email", email);
  await page.fill("#login-password", password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(600);
}

test.describe("E2E-01: Actions Taken Logging and Cross-Role Visibility (AC-01, AC-04)", () => {
  test("IT Staff logs action with follow-up; Requester sees read-only view without staff email", async ({ page }) => {
    // -----------------------------------------------------------------------
    // 1. Staff logs in and navigates to ticket queue
    // -----------------------------------------------------------------------
    await login(page, STAFF_EMAIL, STAFF_PASSWORD);

    // Navigate to Ticket Queue
    const queueBtn = page.locator('header nav button:has-text("Ticket Queue"), button:has-text("Ticket Queue")').first();
    await queueBtn.waitFor({ state: "visible", timeout: 8000 });
    await queueBtn.click();
    await page.waitForTimeout(500);

    // Search specifically for TKT-2026-000001 (seeded OPEN ticket owned by Jennifer Anderson)
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await searchInput.waitFor({ state: "visible", timeout: 8000 });
    await searchInput.fill("TKT-2026-000001");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(600);

    // Open first row
    const ticketRow = page.locator("tbody tr").first();
    await ticketRow.waitFor({ state: "visible", timeout: 10000 });
    await ticketRow.click();
    await page.waitForTimeout(600);

    // -----------------------------------------------------------------------
    // 2. Switch to Actions Taken tab
    // -----------------------------------------------------------------------
    const actionsTab = page.locator('#actions-taken-tab, button:has-text("Actions Taken")').first();
    await actionsTab.waitFor({ state: "visible", timeout: 8000 });
    await actionsTab.click();
    await page.waitForTimeout(400);

    // -----------------------------------------------------------------------
    // 3. Add a new Action Taken
    // -----------------------------------------------------------------------
    const addBtn = page.locator('button:has-text("Add Action Taken")').first();
    await addBtn.waitFor({ state: "visible", timeout: 8000 });
    await addBtn.click();

    const modal = page.locator('[role="dialog"]');
    await modal.waitFor({ state: "visible", timeout: 5000 });

    // Fill action description
    await modal.locator("#actionDescriptionInput").fill("Performed hardware diagnostics and ran memory benchmark test.");

    // Toggle follow-up required
    const followUpSwitch = modal.locator("#followUpSwitch");
    if (!(await followUpSwitch.isChecked())) {
      await followUpSwitch.click();
    }

    // Fill follow-up note
    await modal.locator("#followUpNoteInput").fill("Verify results with user after 48 hours.");

    // Submit action
    await modal.locator('button:has-text("Save Action"), button[type="submit"]').click();
    await modal.waitFor({ state: "hidden", timeout: 8000 });

    // Verify action appears in the list
    await expect(page.locator("text=Performed hardware diagnostics").first()).toBeVisible({ timeout: 8000 });

    // -----------------------------------------------------------------------
    // 4. Log in as Requester and verify read-only visibility
    // -----------------------------------------------------------------------
    await login(page, REQUESTER_EMAIL, REQUESTER_PASSWORD);

    // Navigate to My Tickets
    const myTicketsBtn = page.locator('header nav button:has-text("My Tickets"), button:has-text("My Tickets")').first();
    await myTicketsBtn.waitFor({ state: "visible", timeout: 8000 });
    await myTicketsBtn.click();
    await page.waitForTimeout(500);

    // Search for TKT-2026-000001
    const reqSearch = page.locator('input[placeholder*="Search"]').first();
    await reqSearch.fill("TKT-2026-000001");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(600);

    // Open ticket
    const reqTicketRow = page.locator("tbody tr").first();
    await reqTicketRow.waitFor({ state: "visible", timeout: 10000 });
    await reqTicketRow.click();
    await page.waitForTimeout(600);

    // Switch to Actions Taken tab
    const requesterActionsTab = page.locator('#actions-taken-tab, button:has-text("Actions Taken")').first();
    await requesterActionsTab.waitFor({ state: "visible", timeout: 8000 });
    await requesterActionsTab.click();
    await page.waitForTimeout(400);

    // Verify the action description is visible (read-only)
    await expect(page.locator("text=Performed hardware diagnostics").first()).toBeVisible({ timeout: 8000 });

    // Verify "Add Action Taken" button is NOT visible for Requester (AC-05)
    await expect(page.locator('button:has-text("Add Action Taken")')).not.toBeVisible();

    // Verify staff email is absent from the rendered DOM (AC-04 privacy)
    const content = await page.content();
    expect(content).not.toContain(STAFF_EMAIL);
  });
});
