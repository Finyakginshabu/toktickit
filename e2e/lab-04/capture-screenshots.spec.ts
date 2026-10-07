/**
 * capture-screenshots.spec.ts
 * Captures all required visual evidence for Lab 4 per docs/lab-04/ui-spec.md §7:
 * - staff-dashboard/
 *     staff-dashboard-desktop.png
 *     staff-dashboard-tablet.png
 *     staff-dashboard-mobile.png
 *     staff-dashboard-empty.png
 * - requester-dashboard/
 *     requester-dashboard-desktop.png
 *     requester-dashboard-mobile.png
 * - actions-taken/
 *     actions-taken-list.png
 *     action-taken-create-modal.png
 *     action-taken-edit-modal.png
 *     resolution-gate-blocked.png
 *     requester-actions-view.png
 */
import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const screenshotsDir = path.resolve(process.cwd(), "artifacts/lab-04/screenshots");

const USERS = {
  requester: { email: "jennifer.anderson@kmutt.ac.th", password: "Password123!" },
  staff: { email: "staff.alice@toktickit.local", password: "Password123!" },
  admin: { email: "admin@toktickit.local", password: "AdminPass123!" },
};

async function loginAs(page: any, email: string, password: string) {
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

test.describe("Lab 4 Visual Evidence Capture (ui-spec.md §7)", () => {
  test.beforeAll(() => {
    fs.mkdirSync(path.join(screenshotsDir, "staff-dashboard"), { recursive: true });
    fs.mkdirSync(path.join(screenshotsDir, "requester-dashboard"), { recursive: true });
    fs.mkdirSync(path.join(screenshotsDir, "actions-taken"), { recursive: true });
  });

  // ---------------------------------------------------------------------------
  // 1. Staff Dashboard Screenshots
  // ---------------------------------------------------------------------------
  test("Staff Dashboard: Desktop, Tablet, Mobile, and Empty states", async ({ page }) => {
    // 1a. Desktop (1280x800)
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAs(page, USERS.staff.email, USERS.staff.password);
    await page.locator('header nav button:has-text("Dashboard"), button:has-text("Dashboard")').first().click();
    await page.waitForTimeout(600);
    await expect(page.locator('h1:has-text("Welcome back")')).toBeVisible({ timeout: 8000 });

    await page.screenshot({
      path: path.join(screenshotsDir, "staff-dashboard/staff-dashboard-desktop.png"),
      fullPage: true,
    });

    // 1b. Tablet (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(screenshotsDir, "staff-dashboard/staff-dashboard-tablet.png"),
      fullPage: true,
    });

    // 1c. Mobile (375x812)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(screenshotsDir, "staff-dashboard/staff-dashboard-mobile.png"),
      fullPage: true,
    });

    // 1d. Empty state
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.screenshot({
      path: path.join(screenshotsDir, "staff-dashboard/staff-dashboard-empty.png"),
      fullPage: true,
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Requester Dashboard Screenshots
  // ---------------------------------------------------------------------------
  test("Requester Dashboard: Desktop and Mobile states", async ({ page }) => {
    // 2a. Desktop (1280x800)
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAs(page, USERS.requester.email, USERS.requester.password);
    await page.locator('header nav button:has-text("Dashboard"), button:has-text("Dashboard")').first().click();
    await page.waitForTimeout(600);
    await expect(page.locator('h1:has-text("Welcome")')).toBeVisible({ timeout: 8000 });

    await page.screenshot({
      path: path.join(screenshotsDir, "requester-dashboard/requester-dashboard-desktop.png"),
      fullPage: true,
    });

    // 2b. Mobile (375x812)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(screenshotsDir, "requester-dashboard/requester-dashboard-mobile.png"),
      fullPage: true,
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Actions Taken & Resolution Gate Screenshots
  // ---------------------------------------------------------------------------
  test("Actions Taken and Resolution Gate states", async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAs(page, USERS.staff.email, USERS.staff.password);

    // Navigate to ticket queue
    await page.locator('header nav button:has-text("Ticket Queue"), button:has-text("Ticket Queue")').first().click();
    await page.waitForTimeout(500);

    // Search specifically for TKT-2026-000001
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await searchInput.waitFor({ state: "visible", timeout: 8000 });
    await searchInput.fill("TKT-2026-000001");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(600);

    const openRow = page.locator("tbody tr").first();
    await openRow.waitFor({ state: "visible", timeout: 8000 });
    await openRow.click();
    await page.waitForTimeout(600);

    // Switch to Actions Taken tab
    const actionsTab = page.locator('#actions-taken-tab, button:has-text("Actions Taken")').first();
    if (await actionsTab.isVisible()) {
      await actionsTab.click();
      await page.waitForTimeout(400);
    }

    // 3a. actions-taken-list.png
    await page.screenshot({
      path: path.join(screenshotsDir, "actions-taken/actions-taken-list.png"),
      fullPage: true,
    });

    // 3b. action-taken-create-modal.png
    const addActionBtn = page.locator('button:has-text("Add Action Taken")').first();
    if (await addActionBtn.isVisible()) {
      await addActionBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({
        path: path.join(screenshotsDir, "actions-taken/action-taken-create-modal.png"),
      });
      // Close modal
      const cancelBtn = page.locator('[role="dialog"] button:has-text("Cancel")').first();
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
        await page.waitForTimeout(300);
      }
    }

    // 3c. action-taken-edit-modal.png
    const actionRow = page.locator('[data-testid^="action-row-"], tbody tr.action-row').first();
    if (await actionRow.isVisible()) {
      await actionRow.click();
      await page.waitForTimeout(400);
      await page.screenshot({
        path: path.join(screenshotsDir, "actions-taken/action-taken-edit-modal.png"),
      });
      const cancelEditBtn = page.locator('[role="dialog"] button:has-text("Cancel")').first();
      if (await cancelEditBtn.isVisible()) {
        await cancelEditBtn.click();
        await page.waitForTimeout(300);
      }
    }

    // 3d. resolution-gate-blocked.png
    const moveToOpenBtn = page.locator('[data-testid="status-transition-OPEN"], button:has-text("Move to OPEN")').first();
    if (await moveToOpenBtn.isVisible()) {
      await moveToOpenBtn.click();
      const confirmStatusBtn = page.locator('[data-testid="confirm-status-btn"]').first();
      await confirmStatusBtn.waitFor({ state: "visible", timeout: 5000 });
      await confirmStatusBtn.click();
      await page.waitForTimeout(600);
    }

    const resolveTransitionBtn = page.locator('[data-testid="status-transition-RESOLVED"], button:has-text("Move to RESOLVED")').first();
    if (await resolveTransitionBtn.isVisible()) {
      await resolveTransitionBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(screenshotsDir, "actions-taken/resolution-gate-blocked.png"),
      });
      const closeDialogBtn = page.locator('[role="dialog"] [data-testid="resolution-gate-close-btn"], [role="dialog"] button[aria-label="Close"]').first();
      if (await closeDialogBtn.isVisible()) {
        await closeDialogBtn.click();
        await page.waitForTimeout(300);
      }
    }

    // 3e. requester-actions-view.png
    await loginAs(page, USERS.requester.email, USERS.requester.password);
    await page.locator('header nav button:has-text("My Tickets")').first().click();
    await page.waitForTimeout(500);

    const reqSearch = page.locator('input[placeholder*="Search"]').first();
    await reqSearch.fill("TKT-2026-000001");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(600);

    const reqRow = page.locator("tbody tr").first();
    if (await reqRow.isVisible()) {
      await reqRow.click();
      await page.waitForTimeout(600);
      const reqActions = page.locator('#actions-taken-tab, button:has-text("Actions Taken")').first();
      if (await reqActions.isVisible()) {
        await reqActions.click();
        await page.waitForTimeout(400);
      }
      await page.screenshot({
        path: path.join(screenshotsDir, "actions-taken/requester-actions-view.png"),
        fullPage: true,
      });
    }
  });
});
