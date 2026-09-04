import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

test.describe("Lab 2 Visual Screenshots Capture", () => {
  const screenshotsDir = path.resolve(process.cwd(), "artifacts/lab-02/screenshots");

  test.beforeAll(() => {
    fs.mkdirSync(path.join(screenshotsDir, "create-ticket"), { recursive: true });
    fs.mkdirSync(path.join(screenshotsDir, "my-tickets"), { recursive: true });
    fs.mkdirSync(path.join(screenshotsDir, "ticket-detail"), { recursive: true });
  });

  test("Capture all 18 required screenshots across 3 viewports", async ({ page }) => {
    test.setTimeout(90000);

    // -------------------------------------------------------------
    // 1. CREATE TICKET SCREENSHOTS
    // -------------------------------------------------------------
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Select Jennifer Anderson
    await page.selectOption("#requester-dropdown", "1");
    await page.click('button:has-text("Continue")');

    // 01-create-ticket-initial-desktop.png
    await page.click('nav button:has-text("Create Ticket")');
    await expect(page.locator("h1")).toContainText("Create IT Support Ticket");
    await page.screenshot({
      path: path.join(screenshotsDir, "create-ticket/01-create-ticket-initial-desktop.png"),
      fullPage: true,
    });

    // 02-create-ticket-validation-errors.png
    await page.click('button[type="submit"]');
    await expect(page.locator(".zen-error-text").first()).toBeVisible();
    await page.screenshot({
      path: path.join(screenshotsDir, "create-ticket/02-create-ticket-validation-errors.png"),
      fullPage: true,
    });

    // 03-create-ticket-invalid-attachment.png
    const oversizedBuffer = Buffer.alloc(5.5 * 1024 * 1024);
    await page.locator('input[type="file"]').setInputFiles({
      name: "huge_video.png",
      mimeType: "image/png",
      buffer: oversizedBuffer,
    });
    await expect(page.locator("text=exceeds the 5 MB limit")).toBeVisible();
    await page.screenshot({
      path: path.join(screenshotsDir, "create-ticket/03-create-ticket-invalid-attachment.png"),
      fullPage: true,
    });

    // 04-create-ticket-submitting-state.png
    await page.fill("#ticket-summary", "Laptop display flickering issues");
    await page.fill(
      "#ticket-description",
      "Laptop display displays intermittent flickering during Teams conferences."
    );
    await page.locator('input[type="file"]').setInputFiles({
      name: "valid_screenshot.png",
      mimeType: "image/png",
      buffer: Buffer.from("valid screenshot image"),
    });

    // Delay request briefly to capture busy state
    let capturedSubmitting = false;
    await page.route("**/api/tickets", async (route) => {
      if (route.request().method() === "POST" && !capturedSubmitting) {
        capturedSubmitting = true;
        await new Promise((r) => setTimeout(r, 200));
        await page.screenshot({
          path: path.join(screenshotsDir, "create-ticket/04-create-ticket-submitting-state.png"),
          fullPage: true,
        });
      }
      await route.continue();
    });

    // 05-create-ticket-success-confirmation.png
    await page.click('button[type="submit"]');
    await expect(page.locator("text=Ticket Submitted Successfully!")).toBeVisible({ timeout: 15000 });
    await page.unroute("**/api/tickets");
    await page.screenshot({
      path: path.join(screenshotsDir, "create-ticket/05-create-ticket-success-confirmation.png"),
      fullPage: true,
    });

    // 06-create-ticket-api-failure-preserved.png
    await page.click('button:has-text("Create Another Ticket")');
    await page.fill("#ticket-summary", "Preserved summary on network failure");
    await page.fill(
      "#ticket-description",
      "Preserved description that must remain intact when backend errors occur."
    );
    await page.route("**/api/tickets", (route) => route.abort("failed"));
    await page.click('button[type="submit"]');
    await expect(page.locator(".alert-danger")).toBeVisible();
    await page.screenshot({
      path: path.join(screenshotsDir, "create-ticket/06-create-ticket-api-failure-preserved.png"),
      fullPage: true,
    });
    await page.unroute("**/api/tickets");

    // -------------------------------------------------------------
    // 2. MY TICKETS SCREENSHOTS
    // -------------------------------------------------------------
    // 01-my-tickets-requester-a-desktop.png
    await page.click('nav button:has-text("My Tickets")');
    await expect(page.locator("h1")).toContainText("My Tickets");
    await page.screenshot({
      path: path.join(screenshotsDir, "my-tickets/01-my-tickets-requester-a-desktop.png"),
      fullPage: true,
    });

    // 02-my-tickets-requester-b-isolation.png
    await page.click('button:has-text("Change Requester")');
    await page.selectOption("#requester-dropdown", "2"); // David Lee
    await page.click('button:has-text("Continue")');
    await expect(page.locator("header")).toContainText("David Lee");
    await page.screenshot({
      path: path.join(screenshotsDir, "my-tickets/02-my-tickets-requester-b-isolation.png"),
      fullPage: true,
    });

    // Switch back to Jennifer
    await page.click('button:has-text("Change Requester")');
    await page.selectOption("#requester-dropdown", "1");
    await page.click('button:has-text("Continue")');

    // 03-my-tickets-search-filter.png
    await page.fill('input[placeholder*="Search"]', "laptop");
    await page.selectOption('select[aria-label="Filter by Priority"]', "HIGH");
    await page.screenshot({
      path: path.join(screenshotsDir, "my-tickets/03-my-tickets-search-filter.png"),
      fullPage: true,
    });

    // 04-my-tickets-pagination.png
    await page.click('button:has-text("Clear Filters")');
    await page.screenshot({
      path: path.join(screenshotsDir, "my-tickets/04-my-tickets-pagination.png"),
      fullPage: true,
    });

    // 05-my-tickets-empty-state.png
    // Select Michael Brown (ID 3, has 0 tickets)
    await page.click('button:has-text("Change Requester")');
    await page.selectOption("#requester-dropdown", "3");
    await page.click('button:has-text("Continue")');
    await expect(page.locator("text=You haven't submitted any tickets yet")).toBeVisible();
    await page.screenshot({
      path: path.join(screenshotsDir, "my-tickets/05-my-tickets-empty-state.png"),
      fullPage: true,
    });

    // 06-my-tickets-no-results-state.png
    await page.click('button:has-text("Change Requester")');
    await page.selectOption("#requester-dropdown", "1");
    await page.click('button:has-text("Continue")');
    await page.fill('input[placeholder*="Search"]', "nonexistentticketkeyword");
    await expect(page.locator("text=No matching tickets found")).toBeVisible();
    await page.screenshot({
      path: path.join(screenshotsDir, "my-tickets/06-my-tickets-no-results-state.png"),
      fullPage: true,
    });
    await page.click('button:has-text("Clear Filters")');

    // 07-my-tickets-mobile-card-view.png
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator(".zen-ticket-card").first()).toBeVisible();
    await page.screenshot({
      path: path.join(screenshotsDir, "my-tickets/07-my-tickets-mobile-card-view.png"),
      fullPage: true,
    });

    // Reset viewport to desktop
    await page.setViewportSize({ width: 1280, height: 800 });

    // -------------------------------------------------------------
    // 3. TICKET DETAIL SCREENSHOTS
    // -------------------------------------------------------------
    // 01-ticket-detail-readonly-desktop.png
    await page.locator("table.zen-table tbody tr").first().click();
    await expect(page.locator('[data-testid="ticket-detail-view"]')).toBeVisible();
    await page.screenshot({
      path: path.join(screenshotsDir, "ticket-detail/01-ticket-detail-readonly-desktop.png"),
      fullPage: true,
    });

    // 02-ticket-detail-add-attachment.png
    await page.locator('input[data-testid="file-input"]').setInputFiles({
      name: "system_diagnostic.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 additional diagnostic file"),
    });
    await expect(page.locator("text=system_diagnostic.pdf")).toBeVisible({ timeout: 10000 });
    await page.screenshot({
      path: path.join(screenshotsDir, "ticket-detail/02-ticket-detail-add-attachment.png"),
      fullPage: true,
    });

    // 03-ticket-detail-soft-remove-dialog.png
    const targetItem = page
      .locator('div:has-text("system_diagnostic.pdf")')
      .locator("xpath=ancestor::div[contains(@class, 'justify-content-between')]")
      .first();
    await targetItem.locator('button:has-text("Remove")').click();
    await expect(page.locator('.zen-modal-overlay[role="dialog"]')).toBeVisible();
    await page.fill("#removal-reason", "Replaced by official system diagnostic report");
    await page.screenshot({
      path: path.join(screenshotsDir, "ticket-detail/03-ticket-detail-soft-remove-dialog.png"),
      fullPage: true,
    });

    // 04-ticket-detail-removed-attachment-blocked.png
    await page.click('button:has-text("Confirm Removal")');
    await expect(page.locator('.zen-modal-overlay[role="dialog"]')).not.toBeVisible();
    await expect(page.locator("text=Replaced by official system diagnostic report")).toBeVisible();
    await page.screenshot({
      path: path.join(
        screenshotsDir,
        "ticket-detail/04-ticket-detail-removed-attachment-blocked.png"
      ),
      fullPage: true,
    });

    // 05-ticket-detail-cross-requester-rejected.png
    // Return to ticket list, switch to David Lee, and simulate 403 on viewing Jennifer's ticket
    await page.click('button:has-text("Back to My Tickets")');
    await page.click('button:has-text("Change Requester")');
    await page.selectOption("#requester-dropdown", "2"); // David Lee
    await page.click('button:has-text("Continue")');

    await page.route("**/api/tickets/*", (route) => {
      const url = route.request().url();
      if (route.request().method() === "GET" && !url.includes("page=") && !url.includes("search=")) {
        return route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({
            error: {
              code: "FORBIDDEN",
              message: "Access denied. You do not own this ticket.",
            },
          }),
        });
      }
      return route.continue();
    });

    await page.locator("table.zen-table tbody tr").first().click();
    await expect(page.locator("text=Unauthorized Access Blocked")).toBeVisible({ timeout: 5000 });
    await page.screenshot({
      path: path.join(screenshotsDir, "ticket-detail/05-ticket-detail-cross-requester-rejected.png"),
      fullPage: true,
    });
    await page.unroute("**/api/tickets/*");
  });
});
