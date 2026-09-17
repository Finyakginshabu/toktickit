import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { JWT_SECRET } from "../../src/middleware/auth.js";

describe("Lab 3 IT Staff Ticket Queue API Suite (server/tests/lab-03/staff-queue.api.test.ts)", () => {
  const prisma = getPrisma();
  let staffToken: string;
  let adminToken: string;
  let requesterToken: string;
  let mustChangeStaffToken: string;
  let aliceId: number;

  beforeAll(async () => {
    // 1. Log in Staff Alice (IT Staff)
    const staffRes = await request(app).post("/api/auth/login").send({
      email: "staff.alice@toktickit.local",
      password: "Password123!",
    });
    staffToken = staffRes.body.token;
    aliceId = staffRes.body.user.id;

    // 2. Log in Administrator
    const adminRes = await request(app).post("/api/auth/login").send({
      email: "admin@toktickit.local",
      password: "AdminPass123!",
    });
    adminToken = adminRes.body.token;

    // 3. Log in Requester Jennifer
    const reqRes = await request(app).post("/api/auth/login").send({
      email: "jennifer.anderson@kmutt.ac.th",
      password: "Password123!",
    });
    requesterToken = reqRes.body.token;

    // 4. Create isolated token with mustChangePassword = true
    mustChangeStaffToken = jwt.sign(
      {
        id: 9999,
        email: "forced.change@toktickit.local",
        name: "Forced Change Staff",
        role: "IT_STAFF",
        mustChangePassword: true,
      },
      JWT_SECRET
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ---------------------------------------------------------------------------
  // 1. Role Authorization & Non-Leakage Boundary Checks
  // ---------------------------------------------------------------------------
  it("allows IT Staff to retrieve the ticket queue (API-08, AC-10, FR-08)", async () => {
    const res = await request(app)
      .get("/api/staff/tickets")
      .set("Authorization", `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(res.body).toHaveProperty("pagination");
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    const ticket = res.body.data[0];
    expect(ticket).toHaveProperty("id");
    expect(ticket).toHaveProperty("ticketNumber");
    expect(ticket).toHaveProperty("summary");
    expect(ticket).toHaveProperty("requester");
    expect(ticket).toHaveProperty("category");
    expect(ticket).toHaveProperty("requestedPriority");
    expect(ticket).toHaveProperty("itPriority");
    expect(ticket).toHaveProperty("currentStatus");
    expect(ticket).toHaveProperty("ticketOwner");
    expect(ticket).toHaveProperty("createdAt");
  });

  it("allows Administrator to retrieve the ticket queue with supervisory oversight (API-08, AC-10)", async () => {
    const res = await request(app)
      .get("/api/staff/tickets")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("rejects Requester access with 403 Forbidden and non-leakage error (API-08, FR-08, BR-16)", async () => {
    const res = await request(app)
      .get("/api/staff/tickets")
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(res.body.data).toBeUndefined();
  });

  it("rejects unauthenticated requests with 401 Unauthorized", async () => {
    const res = await request(app).get("/api/staff/tickets");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects users with mustChangePassword = true with 403 PASSWORD_CHANGE_REQUIRED (BR-02)", async () => {
    const res = await request(app)
      .get("/api/staff/tickets")
      .set("Authorization", `Bearer ${mustChangeStaffToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
  });

  // ---------------------------------------------------------------------------
  // 2. Query Filtering (Search, Category, Status, IT Priority, Owner)
  // ---------------------------------------------------------------------------
  it("filters tickets by text search on summary and ticketNumber (API-08, FR-08)", async () => {
    const res = await request(app)
      .get("/api/staff/tickets?search=battery")
      .set("Authorization", `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    for (const t of res.body.data) {
      const match =
        t.summary.toLowerCase().includes("battery") ||
        t.ticketNumber.toLowerCase().includes("battery");
      expect(match).toBe(true);
    }
  });

  it("filters tickets by categoryId (API-08, FR-08)", async () => {
    // Look up Category Hardware
    const cat = await prisma.category.findUnique({ where: { name: "Hardware" } });
    expect(cat).toBeDefined();

    const res = await request(app)
      .get(`/api/staff/tickets?categoryId=${cat!.id}`)
      .set("Authorization", `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    for (const t of res.body.data) {
      expect(t.category.id).toBe(cat!.id);
    }
  });

  it("filters tickets by status (API-08, FR-08)", async () => {
    const res = await request(app)
      .get("/api/staff/tickets?status=NEW")
      .set("Authorization", `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    for (const t of res.body.data) {
      expect(t.currentStatus).toBe("NEW");
    }
  });

  it("filters tickets by itPriority (API-08, FR-08)", async () => {
    const res = await request(app)
      .get("/api/staff/tickets?itPriority=URGENT")
      .set("Authorization", `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    for (const t of res.body.data) {
      expect(t.itPriority).toBe("URGENT");
    }
  });

  it("filters tickets by ownership: unassigned (ownerId=unassigned or ownerId=0) (API-08, FR-08)", async () => {
    const res = await request(app)
      .get("/api/staff/tickets?ownerId=unassigned")
      .set("Authorization", `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    for (const t of res.body.data) {
      expect(t.ticketOwner).toBeNull();
    }

    // Also test ownerId=0
    const resZero = await request(app)
      .get("/api/staff/tickets?ownerId=0")
      .set("Authorization", `Bearer ${staffToken}`);

    expect(resZero.status).toBe(200);
    for (const t of resZero.body.data) {
      expect(t.ticketOwner).toBeNull();
    }
  });

  it("filters tickets by ownership: assigned to specific staff (API-08, FR-08)", async () => {
    const res = await request(app)
      .get(`/api/staff/tickets?ownerId=${aliceId}`)
      .set("Authorization", `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    for (const t of res.body.data) {
      expect(t.ticketOwner).not.toBeNull();
      expect(t.ticketOwner.id).toBe(aliceId);
    }
  });

  // ---------------------------------------------------------------------------
  // 3. Sorting & Pagination Clamping
  // ---------------------------------------------------------------------------
  it("sorts tickets by createdAt in ascending and descending order (API-08)", async () => {
    const resDesc = await request(app)
      .get("/api/staff/tickets?sortBy=createdAt&sortOrder=desc")
      .set("Authorization", `Bearer ${staffToken}`);
    expect(resDesc.status).toBe(200);

    const resAsc = await request(app)
      .get("/api/staff/tickets?sortBy=createdAt&sortOrder=asc")
      .set("Authorization", `Bearer ${staffToken}`);
    expect(resAsc.status).toBe(200);

    if (resDesc.body.data.length >= 2 && resAsc.body.data.length >= 2) {
      const firstDesc = new Date(resDesc.body.data[0].createdAt).getTime();
      const lastDesc = new Date(resDesc.body.data[resDesc.body.data.length - 1].createdAt).getTime();
      expect(firstDesc).toBeGreaterThanOrEqual(lastDesc);

      const firstAsc = new Date(resAsc.body.data[0].createdAt).getTime();
      const lastAsc = new Date(resAsc.body.data[resAsc.body.data.length - 1].createdAt).getTime();
      expect(firstAsc).toBeLessThanOrEqual(lastAsc);
    }
  });

  it("clamps pageSize between 1 and 50 (API-08, BR-19)", async () => {
    // Request pageSize=100 (should clamp to 50)
    const resLarge = await request(app)
      .get("/api/staff/tickets?pageSize=100")
      .set("Authorization", `Bearer ${staffToken}`);
    expect(resLarge.status).toBe(200);
    expect(resLarge.body.pagination.pageSize).toBe(50);

    // Request pageSize=0 or negative (should default or clamp to 10)
    const resZero = await request(app)
      .get("/api/staff/tickets?pageSize=0")
      .set("Authorization", `Bearer ${staffToken}`);
    expect(resZero.status).toBe(200);
    expect(resZero.body.pagination.pageSize).toBe(10);
  });

  it("returns data: [] with accurate pagination metadata when page > totalPages (API-08, BR-19)", async () => {
    const res = await request(app)
      .get("/api/staff/tickets?page=999&pageSize=10")
      .set("Authorization", `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(0);
    expect(res.body.pagination.page).toBe(999);
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(0);
  });
});
