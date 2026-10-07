import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Dashboard Performance Smoke Suite (PERF-01 per FR-14, FR-15)", () => {
  const prisma = getPrisma();
  let staffToken: string;
  let adminToken: string;
  let requesterToken: string;

  beforeAll(async () => {
    const sRes = await request(app).post("/api/auth/login").send({
      email: "staff.alice@toktickit.local",
      password: "Password123!",
    });
    staffToken = sRes.body.token;

    const aRes = await request(app).post("/api/auth/login").send({
      email: "admin@toktickit.local",
      password: "AdminPass123!",
    });
    adminToken = aRes.body.token;

    const rRes = await request(app).post("/api/auth/login").send({
      email: "jennifer.anderson@kmutt.ac.th",
      password: "Password123!",
    });
    requesterToken = rRes.body.token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("requester dashboard aggregation query responds in < 500ms", async () => {
    const start = performance.now();
    const res = await request(app)
      .get("/api/dashboard/requester")
      .set("Authorization", `Bearer ${requesterToken}`);
    const duration = performance.now() - start;

    expect(res.status).toBe(200);
    expect(duration).toBeLessThan(500);
  });

  it("IT Staff dashboard aggregation query responds in < 500ms", async () => {
    const start = performance.now();
    const res = await request(app)
      .get("/api/dashboard/staff")
      .set("Authorization", `Bearer ${staffToken}`);
    const duration = performance.now() - start;

    expect(res.status).toBe(200);
    expect(duration).toBeLessThan(500);
  });

  it("Administrator dashboard aggregation query responds in < 500ms", async () => {
    const start = performance.now();
    const res = await request(app)
      .get("/api/dashboard/admin")
      .set("Authorization", `Bearer ${adminToken}`);
    const duration = performance.now() - start;

    expect(res.status).toBe(200);
    expect(duration).toBeLessThan(500);
  });
});
