import { test, expect } from "@playwright/test";

test.describe("Lab 3 Administrator User Management E2E Suite (E2E-03)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Login as System Administrator
    await page.goto("/login");
    await page.fill("#login-email", "admin@toktickit.local");
    await page.fill("#login-password", "AdminPass123!");
    await page.click('button[type="submit"]');

    // Confirm landed on User Management
    await expect(page.locator("header")).toContainText("System Administrator");
    await expect(page.locator("header")).toContainText("Administrator");
    await expect(page.locator("h1")).toContainText("User Management");
  });

  test("1. User list retrieval, keyword search, and role filtering (AC-18, FR-15)", async ({
    page,
  }) => {
    const table = page.locator('[data-testid="user-management-table"]');
    await expect(table).toBeVisible();

    // Verify presence of seed users
    await expect(table).toContainText("Jennifer Anderson");
    await expect(table).toContainText("Alice Support");

    // Search by name
    const searchInput = page.locator('input[placeholder*="Search by name"]');
    await searchInput.fill("Alice");
    await page.waitForTimeout(400);
    await expect(table).toContainText("Alice Support");
    await expect(table).not.toContainText("Jennifer Anderson");

    // Clear search
    await searchInput.fill("");
    await page.waitForTimeout(400);

    // Filter by role
    const roleFilterSelect = page.locator('select:has-text("All Roles")');
    if (await roleFilterSelect.isVisible()) {
      await roleFilterSelect.selectOption("IT_STAFF");
      await page.waitForTimeout(400);
      await expect(table).toContainText("Alice Support");
      await expect(table).not.toContainText("Jennifer Anderson");
    }
  });

  test("2. Admin creates new user with initial password and forced reset flag (AC-19, FR-16)", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const newUserName = `E2E Staff ${timestamp}`;
    const newUserEmail = `e2e.staff.${timestamp}@toktickit.local`;

    // Click "+ Create User"
    await page.click('button:has-text("Create User")');

    // Verify Create Modal
    await expect(page.locator("h2")).toContainText("Create New User");

    // Fill form
    await page.fill('[data-testid="create-name-input"]', newUserName);
    await page.fill('[data-testid="create-email-input"]', newUserEmail);
    await page.selectOption('[data-testid="create-role-select"]', "IT_STAFF");
    await page.fill('[data-testid="create-password-input"]', "InitialPassword123!");

    // Submit
    await page.click('.modal button[type="submit"]');

    // Verify modal closes and new user appears in table
    const table = page.locator('[data-testid="user-management-table"]');
    await expect(table).toContainText(newUserName, { timeout: 8000 });
    await expect(table).toContainText(newUserEmail);
  });

  test("3. Admin resets initial password for a user (AC-23, FR-18)", async ({
    page,
  }) => {
    // Click Reset button on a user row (e.g. David Lee)
    const resetBtn = page.locator('button[data-testid^="reset-pwd-btn-"]').first();
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();

    // Verify Reset Password Modal
    await expect(page.locator("h2")).toContainText("Reset User Password");

    // Fill new temporary password
    await page.fill('[data-testid="reset-password-input"]', "NewTempPass2026!");
    await page.click('[data-testid="reset-password-submit"]');

    // Verify success banner appears
    await expect(
      page.locator("text=Initial password reset successfully")
    ).toBeVisible({ timeout: 6000 });
  });

  test("4. Admin self-deactivation safety rule prevents self-lockout (AC-21, FR-19, BR-08)", async ({
    page,
  }) => {
    // Locate the current logged-in admin row (has badge "You")
    const myRow = page.locator('tr:has-text("You")');
    await expect(myRow).toBeVisible();

    // Click Edit on own row
    await myRow.locator('button[data-testid^="edit-user-btn-"]').click();

    // Verify Edit Modal opens
    await expect(page.locator("h2")).toContainText("Edit User Details");

    // Verify active switch is DISABLED
    const activeSwitch = page.locator('[data-testid="edit-active-switch"]');
    await expect(activeSwitch).toBeDisabled();

    // Verify safety warning message is displayed
    await expect(
      page.locator("text=Safety Rule: You cannot deactivate your own currently logged-in Administrator account")
    ).toBeVisible();

    // Close modal
    await page.click('.modal button:has-text("Cancel")');
  });
});
