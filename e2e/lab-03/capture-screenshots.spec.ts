import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

test.describe("Lab 3 Visual Screenshots & Responsive Inspection", () => {
  const screenshotsDir = path.resolve(process.cwd(), "artifacts/lab-03/screenshots");

  test.beforeAll(async ({ request }) => {
    // Reset firstlogin user so the forced-password-change screenshot test works
    // even when authentication.spec.ts test 4 already changed their password.
    const loginRes = await request.post("/api/auth/login", {
      data: { email: "admin@toktickit.local", password: "AdminPass123!" },
    });
    if (!loginRes.ok()) throw new Error(`Admin login failed: ${loginRes.status()}`);
    const { token } = await loginRes.json();

    // GET /api/admin/users returns a flat array
    const usersRes = await request.get("/api/admin/users", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!usersRes.ok()) throw new Error(`Get users failed: ${usersRes.status()}`);
    const users: Array<{ id: number; email: string }> = await usersRes.json();
    const firstLoginUser = users.find((u) => u.email === "firstlogin@toktickit.local");

    if (!firstLoginUser) throw new Error("firstlogin@toktickit.local not found in user list");

    // Reset password back to initial + mustChangePassword = true
    const resetRes = await request.post(`/api/admin/users/${firstLoginUser.id}/reset-password`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      data: { initialPassword: "InitialPassword123!" },
    });
    if (!resetRes.ok()) {
      const body = await resetRes.text();
      throw new Error(`Reset password failed (${resetRes.status()}): ${body}`);
    }
  });

  test.beforeAll(() => {
    fs.mkdirSync(path.join(screenshotsDir, "authentication"), { recursive: true });
    fs.mkdirSync(path.join(screenshotsDir, "staff-queue"), { recursive: true });
    fs.mkdirSync(path.join(screenshotsDir, "staff-ticket-detail"), { recursive: true });
    fs.mkdirSync(path.join(screenshotsDir, "user-management"), { recursive: true });
  });

  // ---------------------------------------------------------------------------
  // 1. AUTHENTICATION SCREENSHOTS
  // ---------------------------------------------------------------------------
  test("Capture authentication screenshots across viewports", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/login");

    // 01-login-desktop.png
    await expect(page.locator("h1")).toContainText("Sign in to TokTickIT");
    await page.screenshot({
      path: path.join(screenshotsDir, "authentication/01-login-desktop.png"),
      fullPage: true,
    });

    // 02-login-error-state.png
    await page.fill("#login-email", "invalid.user@toktickit.local");
    await page.fill("#login-password", "WrongPassword123!");
    await page.click('button[type="submit"]');
    await expect(page.locator(".alert-danger")).toBeVisible();
    await page.screenshot({
      path: path.join(screenshotsDir, "authentication/02-login-error-state.png"),
      fullPage: true,
    });

    // 03-forced-password-change-desktop.png
    // Navigate fresh so React form state (error, field values) is fully reset
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText("Sign in to TokTickIT");
    await page.fill("#login-email", "firstlogin@toktickit.local");
    await page.fill("#login-password", "InitialPassword123!");
    await page.click('button[type="submit"]');
    await expect(page.locator("h1")).toContainText("Password Change Required");
    await page.screenshot({
      path: path.join(screenshotsDir, "authentication/03-forced-password-change-desktop.png"),
      fullPage: true,
    });

    // 04-change-password-mobile.png
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({
      path: path.join(screenshotsDir, "authentication/04-change-password-mobile.png"),
      fullPage: true,
    });

    // Complete password change to keep user active
    await page.fill("#current-password", "InitialPassword123!");
    await page.fill("#new-password", "UpdatedPass2026!");
    await page.fill("#confirm-password", "UpdatedPass2026!");
    await page.click('button[type="submit"]');
    await expect(page.locator("h1")).toContainText("My Tickets");
  });

  // ---------------------------------------------------------------------------
  // 2. IT STAFF TICKET QUEUE SCREENSHOTS & RESPONSIVENESS
  // ---------------------------------------------------------------------------
  test("Capture IT staff ticket queue screenshots across viewports", async ({ page }) => {
    // Login as IT Staff
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/login");
    await page.fill("#login-email", "staff.alice@toktickit.local");
    await page.fill("#login-password", "Password123!");
    await page.click('button[type="submit"]');
    await expect(page.locator("h1")).toContainText("IT Staff Ticket Queue");

    // 01-queue-desktop.png
    await page.screenshot({
      path: path.join(screenshotsDir, "staff-queue/01-queue-desktop.png"),
      fullPage: true,
    });

    // 02-queue-filtered.png
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill("VPN");
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(screenshotsDir, "staff-queue/02-queue-filtered.png"),
      fullPage: true,
    });
    await searchInput.fill("");

    // 03-queue-tablet.png (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({
      path: path.join(screenshotsDir, "staff-queue/03-queue-tablet.png"),
      fullPage: true,
    });

    // 04-queue-mobile-cards.png (375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({
      path: path.join(screenshotsDir, "staff-queue/04-queue-mobile-cards.png"),
      fullPage: true,
    });

    // Check zero horizontal scroll across viewports
    for (const vp of [
      { name: "Desktop", width: 1280, height: 800 },
      { name: "Tablet", width: 768, height: 1024 },
      { name: "Mobile", width: 375, height: 667 },
    ]) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll).toBe(false);
    }
  });

  // ---------------------------------------------------------------------------
  // 3. IT STAFF TICKET DETAIL SCREENSHOTS
  // ---------------------------------------------------------------------------
  test("Capture IT staff ticket detail screenshots across viewports", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/login");
    await page.fill("#login-email", "staff.alice@toktickit.local");
    await page.fill("#login-password", "Password123!");
    await page.click('button[type="submit"]');

    // Click first ticket row
    await page.locator("table.zen-table tbody tr").first().click();
    await expect(page.locator("h1")).toContainText(/TKT-\d{4}-\d{6}/);

    // 01-staff-ticket-detail-desktop.png
    await page.screenshot({
      path: path.join(screenshotsDir, "staff-ticket-detail/01-detail-desktop.png"),
      fullPage: true,
    });

    // 02-staff-ticket-detail-public-comments.png
    await page.click('button:has-text("Public Comments")');
    await page.screenshot({
      path: path.join(screenshotsDir, "staff-ticket-detail/02-detail-public-comments.png"),
      fullPage: true,
    });

    // 03-staff-ticket-detail-internal-notes.png
    await page.click('button:has-text("Internal Notes")');
    await page.screenshot({
      path: path.join(screenshotsDir, "staff-ticket-detail/03-detail-internal-notes.png"),
      fullPage: true,
    });

    // 04-staff-ticket-detail-mobile.png (375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({
      path: path.join(screenshotsDir, "staff-ticket-detail/04-detail-mobile.png"),
      fullPage: true,
    });
  });

  // ---------------------------------------------------------------------------
  // 4. USER MANAGEMENT SCREENSHOTS
  // ---------------------------------------------------------------------------
  test("Capture user management screenshots across viewports", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/login");
    await page.fill("#login-email", "admin@toktickit.local");
    await page.fill("#login-password", "AdminPass123!");
    await page.click('button[type="submit"]');
    await expect(page.locator("h1")).toContainText("User Management");

    // 01-user-table-desktop.png
    await page.screenshot({
      path: path.join(screenshotsDir, "user-management/01-user-table-desktop.png"),
      fullPage: true,
    });

    // 02-create-user-modal.png
    await page.click('button:has-text("Create User")');
    await expect(page.locator("h2")).toContainText("Create New User");
    await page.screenshot({
      path: path.join(screenshotsDir, "user-management/02-create-user-modal.png"),
      fullPage: true,
    });
    await page.click('.modal button:has-text("Cancel")');

    // 03-edit-user-safety-guard.png
    const myRow = page.locator('tr:has-text("You")');
    await myRow.locator('button[data-testid^="edit-user-btn-"]').click();
    await expect(page.locator("h2")).toContainText("Edit User Details");
    await page.screenshot({
      path: path.join(screenshotsDir, "user-management/03-edit-user-safety-guard.png"),
      fullPage: true,
    });
    await page.click('.modal button:has-text("Cancel")');

    // 04-reset-password-modal.png
    const resetBtn = page.locator('button[data-testid^="reset-pwd-btn-"]').first();
    await resetBtn.click();
    await expect(page.locator("h2")).toContainText("Reset User Password");
    await page.screenshot({
      path: path.join(screenshotsDir, "user-management/04-reset-password-modal.png"),
      fullPage: true,
    });
    await page.click('.modal button:has-text("Cancel")');

    // 05-user-table-mobile.png (375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({
      path: path.join(screenshotsDir, "user-management/05-user-table-mobile.png"),
      fullPage: true,
    });
  });
});
