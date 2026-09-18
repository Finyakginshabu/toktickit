/**
 * Playwright Global Setup — Lab 3
 *
 * Runs once before the entire test suite. Re-seeds the database so every
 * run starts from a clean, deterministic state regardless of what previous
 * test runs modified (e.g. password resets, mustChangePassword flags).
 */
import { execSync } from "child_process";
import path from "path";

export default async function globalSetup() {
  const serverDir = path.resolve(process.cwd(), "server");
  console.log("\n[global-setup] Re-seeding database …");
  try {
    execSync("npm run prisma:seed", {
      cwd: serverDir,
      stdio: "inherit",
    });
    console.log("[global-setup] Database seeded ✓\n");
  } catch (err) {
    console.error("[global-setup] Seed failed:", err);
    throw err;
  }
}
