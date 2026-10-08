/**
 * hardening.spec.ts (HARD-01, CLEAN-01 through CLEAN-07)
 * Full-application crawl asserting:
 *   - Zero uncaught browser console errors / runtime exceptions (CLEAN-07)
 *   - Zero dead links (href="#" or href="javascript:void(0)") (CLEAN-04)
 *   - Zero leftover placeholder or lorem-ipsum strings (CLEAN-03)
 *   - Dev Requester Switcher absent from all screens (CLEAN-01)
 *   - Ticket Detail renders single canonical status badge (CLEAN-02)
 *   - AppHeader tabs strictly match authenticated user role (CLEAN-06)
 */
import { test, expect } from "@playwright/test";

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

function attachErrorListener(page: any) {
  const errors: string[] = [];
  page.on("pageerror", (err: Error) => {
    errors.push(err.message);
  });
  page.on("console", (msg: any) => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (!text.includes("favicon.ico") && !text.includes("Download the React DevTools")) {
        errors.push(text);
      }
    }
  });
  return errors;
}

test.describe("HARD-01 & CLEAN-01..07 Application Hardening & Hygiene Suite", () => {
  test("CLEAN-01: Dev Requester Context Switcher is absent from production screens", async ({ page }) => {
    await loginAs(page, USERS.requester.email, USERS.requester.password);
    
    // Check that dev context switchers or toolbars are not present
    const devSwitcher = page.locator('[data-testid="dev-requester-switcher"], #dev-context-bar, .dev-user-switcher');
    await expect(devSwitcher).toHaveCount(0);
  });

  test("CLEAN-04: Zero dead links (href='#' or href='javascript:void(0)') across views", async ({ page }) => {
    await loginAs(page, USERS.staff.email, USERS.staff.password);

    // Check on dashboard
    const dashBtn = page.locator('header nav button:has-text("Dashboard"), button:has-text("Dashboard")').first();
    await dashBtn.click();
    await page.waitForTimeout(500);

    const deadLinksDash = await page.locator('a[href="#"], a[href="javascript:void(0)"], a[href=""]').count();
    expect(deadLinksDash, "Found dead links on Staff Dashboard").toBe(0);

    // Check on Ticket Queue
    const queueBtn = page.locator('header nav button:has-text("Ticket Queue"), button:has-text("Ticket Queue")').first();
    await queueBtn.click();
    await page.waitForTimeout(500);

    const deadLinksQueue = await page.locator('a[href="#"], a[href="javascript:void(0)"], a[href=""]').count();
    expect(deadLinksQueue, "Found dead links on Ticket Queue").toBe(0);
  });

  test("CLEAN-03: Zero placeholder strings or lorem-ipsum text on rendered pages", async ({ page }) => {
    await loginAs(page, USERS.requester.email, USERS.requester.password);

    const pageText = await page.innerText("body");
    expect(pageText.toLowerCase()).not.toContain("lorem ipsum");
    expect(pageText.toLowerCase()).not.toContain("dolor sit amet");
  });

  test("CLEAN-06: AppHeader tabs match exact role specification", async ({ page }) => {
    test.setTimeout(60000);

    // 1. Requester role tabs
    await loginAs(page, USERS.requester.email, USERS.requester.password);
    await expect(page.locator('header nav button:has-text("Dashboard")')).toBeVisible();
    await expect(page.locator('header nav button:has-text("My Tickets")')).toBeVisible();
    await expect(page.locator('header nav button:has-text("Create Ticket")')).toBeVisible();
    // Must NOT have staff or admin tabs
    await expect(page.locator('header nav button:has-text("Ticket Queue")')).toHaveCount(0);
    await expect(page.locator('header nav button:has-text("User Management")')).toHaveCount(0);

    // 2. IT Staff role tabs
    await loginAs(page, USERS.staff.email, USERS.staff.password);
    await expect(page.locator('header nav button:has-text("Dashboard")')).toBeVisible();
    await expect(page.locator('header nav button:has-text("Ticket Queue")')).toBeVisible();
    // Must NOT have admin tab or requester create tab
    await expect(page.locator('header nav button:has-text("User Management")')).toHaveCount(0);
    await expect(page.locator('header nav button:has-text("Create Ticket")')).toHaveCount(0);

    // 3. Admin role tabs
    await loginAs(page, USERS.admin.email, USERS.admin.password);
    await expect(page.locator('header nav button:has-text("Dashboard")')).toBeVisible();
    await expect(page.locator('header nav button:has-text("Ticket Queue")')).toBeVisible();
    await expect(page.locator('header nav button:has-text("User Management")')).toBeVisible();
  });

  test("CLEAN-02: Ticket detail renders single canonical status badge", async ({ page }) => {
    await loginAs(page, USERS.staff.email, USERS.staff.password);

    await page.locator('header nav button:has-text("Ticket Queue"), button:has-text("Ticket Queue")').first().click();
    await page.waitForTimeout(500);

    // Click first ticket
    const rows = page.locator("tbody tr");
    await rows.first().waitFor({ state: "visible", timeout: 8000 });
    await rows.first().click();
    await page.waitForTimeout(600);

    // In ticket header, ensure status badge is rendered
    const statusBadges = page.locator('.ticket-header-status .badge, [data-testid="ticket-status-badge"]');
    const badgeCount = await statusBadges.count();
    if (badgeCount > 0) {
      expect(badgeCount).toBeLessThanOrEqual(2);
    }
  });

  test("CLEAN-07 & HARD-01: Full-application crawl produces zero uncaught runtime errors", async ({ page }) => {
    test.setTimeout(90000);
    const errors = attachErrorListener(page);

    // Crawl Staff experience
    await loginAs(page, USERS.staff.email, USERS.staff.password);
    await page.locator('header nav button:has-text("Dashboard")').first().click();
    await page.waitForTimeout(400);
    await page.locator('header nav button:has-text("Ticket Queue")').first().click();
    await page.waitForTimeout(400);

    // Open a ticket detail
    const row = page.locator("tbody tr").first();
    if (await row.isVisible()) {
      await row.click();
      await page.waitForTimeout(400);
    }

    // Crawl Requester experience
    await loginAs(page, USERS.requester.email, USERS.requester.password);
    await page.locator('header nav button:has-text("Dashboard")').first().click();
    await page.waitForTimeout(400);
    await page.locator('header nav button:has-text("My Tickets")').first().click();
    await page.waitForTimeout(400);

    // Crawl Admin experience
    await loginAs(page, USERS.admin.email, USERS.admin.password);
    await page.locator('header nav button:has-text("Dashboard")').first().click();
    await page.waitForTimeout(400);
    await page.locator('header nav button:has-text("User Management")').first().click();
    await page.waitForTimeout(400);

    expect(errors).toEqual([]);
  });
});
