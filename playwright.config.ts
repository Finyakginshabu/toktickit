import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  webServer: [
    {
      command: "npm run dev --prefix server",
      port: 3000,
      reuseExistingServer: true,
      timeout: 120 * 1000,
    },
    {
      command: "npm run dev --prefix client",
      port: 5173,
      reuseExistingServer: true,
      timeout: 120 * 1000,
    },
  ],
});

