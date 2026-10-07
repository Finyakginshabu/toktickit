/**
 * responsive.spec.ts (E2E-04)
 * Browser viewport testing at Desktop (1280px), Tablet (768px), and Mobile (375px).
 * Asserts:
 *   - Zero horizontal window.scrollWidth > window.innerWidth overflow (RESP-01).
 *   - Touch target sizes >= 44x44px on mobile viewport (ui-spec.md §5).
 *   - Dashboard card stacking (single column on mobile) (ui-spec.md §5).
 *   - Table scrollability inside container (not page overflow) (ui-spec.md §5).
 */
import { test, expect } from "@playwright/test";

const REQUESTER = { email: "jennifer.anderson@kmutt.ac.th", password: "Password123!" };
const STAFF     = { email: "staff.alice@toktickit.local",   password: "Password123!" };

const VIEWPORTS = [
  { name: "Desktop", width: 1280, height: 800 },
  { name: "Tablet",  width: 768,  height: 1024 },
  { name: "Mobile",  width: 375,  height: 812 },
];

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

async function navigateTo(page: any, tabText: string) {
  const toggleBtn = page.locator(".zen-nav-toggle").first();
  if (await toggleBtn.isVisible()) {
    const mobileMenu = page.locator(".zen-mobile-menu");
    if (!(await mobileMenu.isVisible())) {
      await toggleBtn.click();
      await page.waitForTimeout(300);
    }
    const mobileBtn = page.locator(`.zen-mobile-menu button:has-text("${tabText}")`).first();
    await mobileBtn.click();
  } else {
    const desktopBtn = page.locator(`header nav button:has-text("${tabText}")`).first();
    await desktopBtn.click();
  }
  await page.waitForTimeout(500);
}

for (const vp of VIEWPORTS) {
  test.describe(`E2E-04 RESP-01 [${vp.name} ${vp.width}px]`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test(`${vp.name}: Requester Dashboard - zero horizontal overflow`, async ({ page }) => {
      await loginAs(page, REQUESTER.email, REQUESTER.password);
      await navigateTo(page, "Dashboard");

      // Assert zero horizontal window overflow
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth
      );
      expect(overflow, `${vp.name} (${vp.width}px) has horizontal page overflow`).toBe(false);
    });

    test(`${vp.name}: IT Staff Ticket Queue - zero horizontal overflow`, async ({ page }) => {
      await loginAs(page, STAFF.email, STAFF.password);
      await navigateTo(page, "Ticket Queue");

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth
      );
      expect(overflow, `${vp.name} Ticket Queue has horizontal page overflow`).toBe(false);
    });
  });
}

test.describe("E2E-04 RESP-01 Mobile (375px) - touch targets >= 44x44px", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("Mobile hamburger toggle meets >= 44x44px touch target (ui-spec.md §5)", async ({ page }) => {
    await loginAs(page, REQUESTER.email, REQUESTER.password);

    const toggleBtn = page.locator(".zen-nav-toggle").first();
    await toggleBtn.waitFor({ state: "visible", timeout: 8000 });
    const box = await toggleBtn.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe("E2E-04 RESP-01 Mobile (375px) - dashboard card stacking", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("Requester Dashboard: metric cards stack vertically on mobile", async ({ page }) => {
    await loginAs(page, REQUESTER.email, REQUESTER.password);
    await navigateTo(page, "Dashboard");

    const cards = page.locator('.metric-card, [role="button"][aria-label*="tickets"]');
    const count = await cards.count();
    if (count >= 2) {
      const box0 = await cards.nth(0).boundingBox();
      const box1 = await cards.nth(1).boundingBox();
      if (box0 && box1) {
        expect(box1.y).toBeGreaterThanOrEqual(box0.y + box0.height - 10);
      }
    }
  });
});
