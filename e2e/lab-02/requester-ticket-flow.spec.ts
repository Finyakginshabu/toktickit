import { test, expect } from "@playwright/test";

test.describe("Lab 2 Requester Ticket Flow E2E Suite", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start with a fresh testing session
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  // E2E-01: Full Requester journey: Select user -> Create ticket -> View in My Tickets
  test("E2E-01: complete requester ticket creation and dashboard journey (AC-01, AC-10)", async ({
    page,
  }) => {
    await page.goto("/");

    // 1. Requester context selection
    const modal = page.locator(".zen-modal-overlay");
    await expect(modal).toBeVisible();
    await page.selectOption("#requester-dropdown", "1"); // Jennifer Anderson
    await page.click('button:has-text("Continue")');
    await expect(modal).not.toBeVisible();

    // Verify Shell Header shows active user
    await expect(page.locator("header")).toContainText("Jennifer Anderson");

    // 2. Navigate to Create Ticket
    await page.click('nav button:has-text("Create Ticket")');
    await expect(page.locator("h1")).toContainText("Create IT Support Ticket");

    // 3. Fill form fields
    await page.selectOption("#ticket-category", "1"); // Hardware
    await page.selectOption("#ticket-system", "1"); // Corporate Laptop
    await page.click('button:has-text("HIGH")');

    const uniqueSummary = `E2E Test Ticket - Screen Glitch ${Date.now()}`;
    await page.fill("#ticket-summary", uniqueSummary);
    await page.fill(
      "#ticket-description",
      "E2E automated test description: Display shows graphical glitches during video conferencing."
    );

    // 4. Attach valid file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "e2e_screenshot.png",
      mimeType: "image/png",
      buffer: Buffer.from("dummy e2e test image file content"),
    });

    // 5. Submit Form
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // 6. Verify Ticket Creation Confirmation with official TKT number
    await expect(page.locator("text=Ticket Submitted Successfully!")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("text=/TKT-\\d{4}-\\d{6}/")).toBeVisible();

    // 7. Click "View in My Tickets"
    await page.click('button:has-text("View in My Tickets")');

    // 8. Verify ticket is listed in My Tickets
    await expect(page.locator("h1")).toContainText("My Tickets");
    await expect(page.locator("table.zen-table")).toContainText(uniqueSummary);
    await expect(page.locator("table.zen-table")).toContainText("HIGH");
    await expect(page.locator("table.zen-table")).toContainText("NEW");
  });

  // E2E-02: Multi-user isolation journey: Switch Requester A to B
  test("E2E-02: multi-user isolation journey when switching requester (AC-09, AC-10)", async ({
    page,
  }) => {
    await page.goto("/");

    // 1. Select Jennifer Anderson (ID 1)
    await page.selectOption("#requester-dropdown", "1");
    await page.click('button:has-text("Continue")');
    await expect(page.locator("header")).toContainText("Jennifer Anderson");

    // Verify Jennifer's tickets are visible and get her top ticket number
    const jenniferTicketCell = page.locator("table.zen-table tbody tr td button").first();
    await expect(jenniferTicketCell).toBeVisible();
    const jenniferTicketNumber = (await jenniferTicketCell.innerText()).trim();
    expect(jenniferTicketNumber).toMatch(/TKT-\d{4}-\d{6}/);

    // 2. Switch Requester to David Lee (ID 2)
    await page.click('button:has-text("Change Requester")');
    const modal = page.locator(".zen-modal-overlay");
    await expect(modal).toBeVisible();

    await page.selectOption("#requester-dropdown", "2"); // David Lee
    await page.click('button:has-text("Continue")');
    await expect(modal).not.toBeVisible();

    // 3. Verify Shell Header updates to David Lee
    await expect(page.locator("header")).toContainText("David Lee");

    // 4. Verify Jennifer's ticket disappears and only David's tickets appear
    await expect(page.locator("table.zen-table")).not.toContainText(jenniferTicketNumber);

    // Switch back to Jennifer and verify Jennifer's tickets reappear
    await page.click('button:has-text("Change Requester")');
    await page.selectOption("#requester-dropdown", "1");
    await page.click('button:has-text("Continue")');
    await expect(page.locator("table.zen-table")).toContainText(jenniferTicketNumber);
  });

  // E2E-03: Attachment lifecycle journey: Add, download, soft-remove
  test("E2E-03: attachment upload, download, and soft-removal lifecycle (AC-15, AC-17, AC-18)", async ({
    page,
  }) => {
    await page.goto("/");

    // 1. Select Jennifer Anderson
    await page.selectOption("#requester-dropdown", "1");
    await page.click('button:has-text("Continue")');

    // 2. Open first ticket detail
    const firstTicketRow = page.locator("table.zen-table tbody tr").first();
    await firstTicketRow.click();

    // Verify Ticket Detail view rendered
    await expect(page.locator('[data-testid="ticket-detail-view"]')).toBeVisible();

    // 3. Check Attachment Section exists
    const attachmentSection = page.locator('[data-testid="attachment-section"]');
    await expect(attachmentSection).toBeVisible();

    // 4. Upload an additional attachment
    const detailFileInput = page.locator('input[data-testid="file-input"]');
    const uniqueFileName = `diagnostic_e2e_${Date.now()}.pdf`;
    await detailFileInput.setInputFiles({
      name: uniqueFileName,
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 e2e test diagnostic content"),
    });

    // Verify newly uploaded attachment is listed in the active attachments
    await expect(attachmentSection).toContainText(uniqueFileName, { timeout: 10000 });

    // 5. Test Soft Removal Modal
    const itemContainer = page.locator(`div:has-text("${uniqueFileName}")`).locator("xpath=ancestor::div[contains(@class, 'justify-content-between')]").first();
    const removeBtn = itemContainer.locator('button:has-text("Remove")');
    await removeBtn.click();

    // Confirmation modal appears
    const removalModal = page.locator('.zen-modal-overlay[role="dialog"]');
    await expect(removalModal).toBeVisible();

    const confirmBtn = removalModal.locator('button:has-text("Confirm Removal")');
    // Disabled initially (reason empty)
    await expect(confirmBtn).toBeDisabled();

    // Type valid reason (>= 3 chars)
    await page.fill("#removal-reason", "Diagnostic file uploaded by mistake during test run");
    await expect(confirmBtn).toBeEnabled();

    // Confirm removal
    await confirmBtn.click();
    await expect(removalModal).not.toBeVisible();

    // 6. Verify file is soft-removed
    await expect(attachmentSection).toContainText("Removed");
    await expect(attachmentSection).toContainText("Reason: Diagnostic file uploaded by mistake during test run");

    // Verify download is blocked for removed file
    const blockedBtn = page.locator(`button[aria-label="Download disabled for ${uniqueFileName}"]`);
    await expect(blockedBtn).toBeDisabled();
    await expect(blockedBtn).toContainText("Download Blocked");
  });
});
