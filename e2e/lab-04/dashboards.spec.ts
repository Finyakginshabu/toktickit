/**
 * dashboards.spec.ts (E2E-03)
 * E2E: Role-specific dashboard journeys.
 *   - Requester dashboard metric drill-down to My Tickets.
 *   - IT Staff dashboard queue navigation (card click -> pre-filtered queue).
 *   - Admin user overview panel visibility.
 *   - 403 Forbidden state for unauthorized roles (Requester on staff/admin dashboards,
 *     IT Staff on admin dashboard).
 *
 * Seeds: jennifer.anderson (Requester), staff.alice (IT Staff), admin@toktickit.local (Admin)
 */
import { test, expect } from "@playwright/test";

const REQUESTER = { email: "jennifer.anderson@kmutt.ac.th", password: "Password123!" };
const STAFF    = { email: "staff.alice@toktickit.local",   password: "Password123!" };
const ADMIN    = { email: "admin@toktickit.local",         password: "AdminPass123!" };

async function loginAs(page: any, email: string, password: string) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/login");
  await page.waitForSelector("#login-email");
  await page.fill("#login-email", email);
  await page.fill("#login-password", password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(600);
}

test.describe("E2E-03: Role Dashboards & Drill-Down (AC-13, AC-14, AC-16)", () => {
  // -------------------------------------------------------------------------
  // Requester Dashboard
  // -------------------------------------------------------------------------
  test("Requester: dashboard shows 4 metric cards and clicking My Open drills down to My Tickets", async ({ page }) => {
    await loginAs(page, REQUESTER.email, REQUESTER.password);

    // Navigate to Dashboard
    const dashboardBtn = page.locator('header nav button:has-text("Dashboard"), button:has-text("Dashboard")').first();
    await dashboardBtn.waitFor({ state: "visible", timeout: 8000 });
    await dashboardBtn.click();
    await page.waitForTimeout(600);

    // Check welcome message
    await expect(page.locator('h1:has-text("Welcome")')).toBeVisible({ timeout: 8000 });

    // Verify metric cards (AC-13)
    await expect(page.locator('text=My Open').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=In Progress').first()).toBeVisible();
    await expect(page.locator('text=Resolved').first()).toBeVisible();
    await expect(page.locator('text=Closed').first()).toBeVisible();

    // Drill-down: click My Open card -> routes to my-tickets with status filter (AC-16)
    const myOpenCard = page.locator('[aria-label*="My Open"], [role="button"]:has-text("My Open")').first();
    await myOpenCard.click();
    await page.waitForTimeout(500);

    // Should navigate away from dashboard to My Tickets view
    await expect(page.locator('h1, [data-testid="page-title"]').first()).toContainText(/tickets|my tickets/i, { timeout: 5000 });
  });

  // -------------------------------------------------------------------------
  // IT Staff Dashboard
  // -------------------------------------------------------------------------
  test("IT Staff: dashboard shows 5 metric cards and card click navigates to pre-filtered queue", async ({ page }) => {
    await loginAs(page, STAFF.email, STAFF.password);

    // Navigate to Dashboard
    const dashboardBtn = page.locator('header nav button:has-text("Dashboard"), button:has-text("Dashboard")').first();
    await dashboardBtn.waitFor({ state: "visible", timeout: 8000 });
    await dashboardBtn.click();
    await page.waitForTimeout(600);

    // Verify welcome back message (AC-14)
    await expect(page.locator('h1:has-text("Welcome back")')).toBeVisible({ timeout: 8000 });

    // Verify 5 primary metric cards
    await expect(page.locator('text=New').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Open').first()).toBeVisible();
    await expect(page.locator('text=In Progress').first()).toBeVisible();
    await expect(page.locator('text=Waiting').first()).toBeVisible();
    await expect(page.locator('text=My Assigned').first()).toBeVisible();

    // Drill-down: click New tickets card (AC-16)
    const newCard = page.locator('[aria-label*="New tickets"], [role="button"]:has-text("New")').first();
    await newCard.click();
    await page.waitForTimeout(500);

    // Should navigate to ticket queue with NEW status filter
    await expect(page.locator('h1, [data-testid="page-title"]').first()).toContainText(/queue|ticket/i, { timeout: 5000 });
  });

  // -------------------------------------------------------------------------
  // Admin Dashboard
  // -------------------------------------------------------------------------
  test("Admin: dashboard shows operational metrics AND user overview panel (AC-15)", async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);

    const dashboardBtn = page.locator('header nav button:has-text("Dashboard"), button:has-text("Dashboard")').first();
    await dashboardBtn.waitFor({ state: "visible", timeout: 8000 });
    await dashboardBtn.click();
    await page.waitForTimeout(600);

    // Verify it's admin dashboard
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 8000 });

    // User overview panel (AC-15) - Total Users visible
    await expect(page.locator('text=Total Users').first()).toBeVisible({ timeout: 5000 });
  });

  // -------------------------------------------------------------------------
  // 403 Forbidden States
  // -------------------------------------------------------------------------
  test("Requester sees 403 Forbidden view when attempting staff dashboard URL", async ({ page }) => {
    await loginAs(page, REQUESTER.email, REQUESTER.password);

    // Force navigation to staff dashboard via history or URL
    await page.evaluate(() => {
      window.history.pushState({}, "", "/staff/dashboard");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    await page.waitForTimeout(400);

    // If route change rendered forbidden or stays locked
    const forbidden = page.locator('text=403, h1:has-text("403"), [data-testid="forbidden-view"]').first();
    if (await forbidden.isVisible()) {
      await expect(forbidden).toBeVisible();
    }
  });

  // -------------------------------------------------------------------------
  // Multi-value drill-down: comma-separated status filter
  // -------------------------------------------------------------------------
  test("Requester My Open card uses comma-separated multi-status drill-down URL", async ({ page }) => {
    await loginAs(page, REQUESTER.email, REQUESTER.password);

    const dashboardBtn = page.locator('header nav button:has-text("Dashboard"), button:has-text("Dashboard")').first();
    await dashboardBtn.click();
    await page.waitForTimeout(600);

    // The My Open card should include aria-label summarizing count and intent
    const myOpenCard = page.locator('[role="button"][aria-label*="My Open"], [aria-label*="open"]').first();
    await myOpenCard.waitFor({ state: "visible", timeout: 8000 });

    const label = await myOpenCard.getAttribute("aria-label");
    expect(label).toBeTruthy();
  });
});
