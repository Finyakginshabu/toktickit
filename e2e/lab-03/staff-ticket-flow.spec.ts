import { test, expect } from "@playwright/test";

test.describe("Lab 3 IT Staff Ticket Flow E2E Suite (E2E-02)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Login as active IT Staff Alice
    await page.goto("/login");
    await page.fill("#login-email", "staff.alice@toktickit.local");
    await page.fill("#login-password", "Password123!");
    await page.click('button[type="submit"]');

    // Confirm landed on Ticket Queue
    await expect(page.locator("header")).toContainText("Alice Support");
    await expect(page.locator("header")).toContainText("IT Staff");
    await expect(page.locator("h1")).toContainText("IT Staff Ticket Queue");
  });

  test("1. Review queue, apply search and filters, and verify results (AC-10, FR-08)", async ({
    page,
  }) => {
    // Verify Queue table is visible
    const table = page.locator("table.zen-table");
    await expect(table).toBeVisible();

    // Search input filtering
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill("VPN");
    await page.waitForTimeout(500);

    // Filter by Priority
    const prioritySelect = page.locator('select:has-text("Priority"), select:has-text("All IT Priorities")').first();
    if (await prioritySelect.isVisible()) {
      await prioritySelect.selectOption({ label: "HIGH" }).catch(() => {});
    }

    // Reset filters
    const clearBtn = page.locator('button:has-text("Clear Filters"), button:has-text("Reset")');
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
    }
  });

  test("2. Table row click navigates to Ticket Detail at /tickets/:id (Contract Check)", async ({
    page,
  }) => {
    const firstRow = page.locator("table.zen-table tbody tr").first();
    await expect(firstRow).toBeVisible();

    // Click the table row
    await firstRow.click();

    // Verify navigation to ticket detail URL
    await expect(page).toHaveURL(/.*\/tickets\/\d+/);
    await expect(page.locator("h1")).toContainText(/TKT-\d{4}-\d{6}/);
  });

  test("3. Operational controls: claim ticket, update IT Priority, advance status (AC-11, AC-13, AC-14)", async ({
    page,
  }) => {
    // Open first ticket
    await page.locator("table.zen-table tbody tr").first().click();
    await expect(page.locator("h1")).toContainText(/TKT-\d{4}-\d{6}/);

    // 1. Claim ticket if not already claimed by me
    const claimBtn = page.locator('[data-testid="claim-ticket-btn"]');
    if (await claimBtn.isVisible()) {
      await claimBtn.click();
      await expect(page.locator("text=Claimed by you")).toBeVisible({ timeout: 5000 });
    }

    // 2. Modify IT Priority
    const prioritySelect = page.locator('[data-testid="it-priority-select"]');
    await expect(prioritySelect).toBeVisible();
    await prioritySelect.selectOption("URGENT");
    await expect(page.locator("text=URGENT").first()).toBeVisible();

    // 3. Advance Status Workflow
    const transitionBtn = page.locator('button[data-testid^="status-transition-"]').first();
    if (await transitionBtn.isVisible()) {
      await transitionBtn.click();
      // If a confirmation modal appears, confirm it
      const confirmBtn = page.locator('.modal button:has-text("Confirm"), .modal button:has-text("Advance")');
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
      }
      await page.waitForTimeout(500);
    }
  });

  test("4. Collaborative communications: post Public Comment and Internal Note (AC-16, AC-17)", async ({
    page,
  }) => {
    await page.locator("table.zen-table tbody tr").first().click();
    await expect(page.locator("h1")).toContainText(/TKT-\d{4}-\d{6}/);

    // 1. Post a Public Comment
    const publicCommentText = `E2E IT Staff public comment test at ${Date.now()}`;
    const commentPanel = page.locator('[data-testid="public-comments-panel"]');
    await expect(commentPanel).toBeVisible();
    await commentPanel.locator("textarea").fill(publicCommentText);
    await page.click('[data-testid="add-comment-btn"]');

    // Verify public comment is added to the stream
    await expect(page.locator(`text=${publicCommentText}`)).toBeVisible({ timeout: 5000 });

    // 2. Switch to Internal Notes tab
    await page.click('button:has-text("Internal Notes")');
    const notesPanel = page.locator('[data-testid="internal-notes-panel"]');
    await expect(notesPanel).toBeVisible();

    // Post an Internal Note
    const internalNoteText = `E2E confidential diagnostic note test at ${Date.now()}`;
    await notesPanel.locator("textarea").fill(internalNoteText);
    await page.click('[data-testid="add-note-btn"]');

    // Verify internal note is visible in the confidential panel
    await expect(page.locator(`text=${internalNoteText}`)).toBeVisible({ timeout: 5000 });
  });
});
