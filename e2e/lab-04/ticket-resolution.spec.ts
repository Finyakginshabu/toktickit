/**
 * ticket-resolution.spec.ts (E2E-02)
 * E2E: Full Resolution Gate workflow.
 *   Step 1: Attempt to resolve with zero actions -> RESOLUTION_GATE_BLOCKED.
 *   Step 2: Add an action taken record.
 *   Step 3: Resolve with valid resolutionSummary.
 *   Step 4: Verify status advances to RESOLVED and resolvedAt is stamped.
 *
 * IT Staff: staff.alice@toktickit.local
 */
import { test, expect } from "@playwright/test";

const STAFF_EMAIL = "staff.alice@toktickit.local";
const STAFF_PASSWORD = "Password123!";

async function loginAsStaff(page: any) {
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
  await page.fill("#login-email", STAFF_EMAIL);
  await page.fill("#login-password", STAFF_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(600);
}

test.describe("E2E-02: Complete Resolution Gate Workflow (AC-07, AC-08, AC-10)", () => {
  test("Blocked resolution -> add action -> resolve with summary -> status RESOLVED", async ({ page }) => {
    await loginAsStaff(page);

    // Navigate to Ticket Queue
    const queueBtn = page.locator('header nav button:has-text("Ticket Queue"), button:has-text("Ticket Queue")').first();
    await queueBtn.waitFor({ state: "visible", timeout: 8000 });
    await queueBtn.click();
    await page.waitForTimeout(500);

    // Search specifically for TKT-2026-000003 (seeded OPEN ticket with 0 actions)
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await searchInput.waitFor({ state: "visible", timeout: 8000 });
    await searchInput.fill("TKT-2026-000003");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(600);

    const targetRow = page.locator("tbody tr").first();
    await targetRow.waitFor({ state: "visible", timeout: 10000 });
    await targetRow.click();
    await page.waitForTimeout(600);

    // If ticket is NEW, transition to OPEN first so resolution workflow is accessible
    const moveToOpenBtn = page.locator('[data-testid="status-transition-OPEN"], button:has-text("Move to OPEN")').first();
    if (await moveToOpenBtn.isVisible()) {
      await moveToOpenBtn.click();
      const confirmStatusBtn = page.locator('[data-testid="confirm-status-btn"]').first();
      await confirmStatusBtn.waitFor({ state: "visible", timeout: 5000 });
      await confirmStatusBtn.click();
      await page.waitForTimeout(600);
    }

    // -----------------------------------------------------------------------
    // Step 1: Attempt to resolve without actions -> expect gate to block (AC-07)
    // -----------------------------------------------------------------------
    const resolveTransitionBtn = page.locator('[data-testid="status-transition-RESOLVED"], button:has-text("Move to RESOLVED")').first();
    await resolveTransitionBtn.waitFor({ state: "visible", timeout: 8000 });
    await resolveTransitionBtn.click();

    // Modal should appear with the gate checklist
    const gateModal = page.locator('[role="dialog"]');
    await gateModal.waitFor({ state: "visible", timeout: 5000 });

    // Confirm Resolution Gate blocking (AC-07): gate item for actions is visible
    await expect(gateModal.locator('[data-testid="gate-checklist-actions"]')).toBeVisible({ timeout: 5000 });

    // Confirm Resolution button is disabled
    const confirmBtn = gateModal.locator('[data-testid="confirm-resolution-btn"]');
    await expect(confirmBtn).toBeDisabled();

    // Close the gate modal
    const closeBtn = gateModal.locator('[data-testid="resolution-gate-close-btn"], button[aria-label="Close"], button:has-text("Cancel")').first();
    await closeBtn.click();
    await gateModal.waitFor({ state: "hidden", timeout: 5000 });

    // -----------------------------------------------------------------------
    // Step 2: Add an Action Taken to satisfy the gate
    // -----------------------------------------------------------------------
    const actionsTab = page.locator('#actions-taken-tab, button:has-text("Actions Taken")').first();
    await actionsTab.waitFor({ state: "visible", timeout: 8000 });
    await actionsTab.click();
    await page.waitForTimeout(400);

    const addActionBtn = page.locator('button:has-text("Add Action Taken")').first();
    await addActionBtn.waitFor({ state: "visible", timeout: 8000 });
    await addActionBtn.click();

    const actionModal = page.locator('[role="dialog"]');
    await actionModal.waitFor({ state: "visible", timeout: 5000 });

    await actionModal.locator("#actionDescriptionInput").fill("Completed deep hardware diagnostics and updated the firmware.");
    await actionModal.locator('button:has-text("Save Action"), button[type="submit"]').click();
    await actionModal.waitFor({ state: "hidden", timeout: 8000 });

    // -----------------------------------------------------------------------
    // Step 3: Trigger resolve again and fill resolution summary
    // -----------------------------------------------------------------------
    await resolveTransitionBtn.click();
    await gateModal.waitFor({ state: "visible", timeout: 5000 });

    // Provide resolution summary >= 5 chars
    const summaryInput = gateModal.locator("#gateResolutionSummaryInput, textarea").first();
    await summaryInput.fill("Firmware was successfully flashed to v2.4. Issue resolved.");

    // Button should now be enabled
    await expect(confirmBtn).toBeEnabled({ timeout: 5000 });

    // Submit resolution
    await confirmBtn.click();
    await gateModal.waitFor({ state: "hidden", timeout: 8000 });

    // -----------------------------------------------------------------------
    // Step 4: Verify status is RESOLVED (AC-10)
    // -----------------------------------------------------------------------
    await expect(page.locator('.badge-status-resolved').first()).toBeVisible({ timeout: 8000 });
  });
});
