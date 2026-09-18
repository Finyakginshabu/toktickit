import { test, expect } from "@playwright/test";

test.describe("Lab 3 Authentication & Session E2E Suite (E2E-01)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("1. Valid login for active Requester lands on My Tickets dashboard (AC-01, FR-01)", async ({
    page,
  }) => {
    await page.goto("/login");

    // Verify login form is presented
    await expect(page.locator("h1")).toContainText("Sign in to TokTickIT");

    // Fill valid credentials for Jennifer Anderson
    await page.fill("#login-email", "jennifer.anderson@kmutt.ac.th");
    await page.fill("#login-password", "Password123!");
    await page.click('button[type="submit"]');

    // Verify landing on My Tickets
    await expect(page.locator("header")).toContainText("Jennifer Anderson");
    await expect(page.locator("header")).toContainText("Requester");
    await expect(page.locator("h1")).toContainText("My Tickets");

    // Verify navigation links strictly for Requester (FR-05, AC-07)
    await expect(page.locator('header nav button:has-text("My Tickets")')).toBeVisible();
    await expect(page.locator('header nav button:has-text("Create Ticket")')).toBeVisible();
    await expect(page.locator('header nav button:has-text("Ticket Queue")')).not.toBeVisible();
    await expect(page.locator('header nav button:has-text("User Management")')).not.toBeVisible();
  });

  test("2. Invalid credentials displays safe generic error banner (AC-05, BR-01)", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.fill("#login-email", "jennifer.anderson@kmutt.ac.th");
    await page.fill("#login-password", "WrongPassword999!");
    await page.click('button[type="submit"]');

    // Generic error alert
    const errorAlert = page.locator('.alert-danger, [role="alert"]');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText("Invalid credentials");
    // Verify user remains on login page
    await expect(page.locator("h1")).toContainText("Sign in to TokTickIT");
  });

  test("3. Deactivated account authentication rejection with safe generic error (AC-05, FR-02)", async ({
    page,
  }) => {
    await page.goto("/login");

    // alex.inactive@kmutt.ac.th has isActive: false
    await page.fill("#login-email", "alex.inactive@kmutt.ac.th");
    await page.fill("#login-password", "Password123!");
    await page.click('button[type="submit"]');

    const errorAlert = page.locator('.alert-danger, [role="alert"]');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText("Invalid credentials");
    await expect(page.locator("h1")).toContainText("Sign in to TokTickIT");
  });

  test("4. Mandatory first-login password change flow (AC-02, FR-03, BR-02)", async ({
    page,
  }) => {
    await page.goto("/login");

    // firstlogin@toktickit.local has mustChangePassword = true
    await page.fill("#login-email", "firstlogin@toktickit.local");
    await page.fill("#login-password", "InitialPassword123!");
    await page.click('button[type="submit"]');

    // Should redirect to /change-password
    await expect(page).toHaveURL(/.*\/change-password/);
    await expect(page.locator("h1")).toContainText("Password Change Required");

    // Test password complexity rules in checklist
    await page.fill("#current-password", "InitialPassword123!");
    await page.fill("#new-password", "NewPass2026!");
    await page.fill("#confirm-password", "NewPass2026!");

    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // After successful password change, redirected into normal app dashboard
    await expect(page.locator("header")).toContainText("New Employee");
    await expect(page.locator("h1")).toContainText("My Tickets");
  });

  test("5. Session logout invalidates authenticated access (AC-06, FR-04)", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.fill("#login-email", "jennifer.anderson@kmutt.ac.th");
    await page.fill("#login-password", "Password123!");
    await page.click('button[type="submit"]');

    await expect(page.locator("header")).toContainText("Jennifer Anderson");

    // Click Logout button in header
    const logoutBtn = page.locator('header button:has-text("Logout"), header button:has-text("Sign Out")');
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    // Should return to login page
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.locator("h1")).toContainText("Sign in to TokTickIT");

    // Attempt direct navigation back to /my-tickets -> guarded to /login
    await page.goto("/my-tickets");
    await expect(page).toHaveURL(/.*\/login/);
  });
});
