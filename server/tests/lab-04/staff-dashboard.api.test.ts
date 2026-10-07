import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("IT Staff & Admin Dashboard API Suite (API-16, API-17, API-18, API-19, API-25)", () => {
  const prisma = getPrisma();
  let staffToken: string;
  let staffUser: any;
  let adminToken: string;
  let adminUser: any;
  let requesterToken: string;
  let requesterUser: any;

  beforeAll(async () => {
    // 1. Authenticate Staff Alice
    const sRes = await request(app).post("/api/auth/login").send({
      email: "staff.alice@toktickit.local",
      password: "Password123!",
    });
    staffToken = sRes.body.token;
    staffUser = sRes.body.user;

    // 2. Authenticate Admin
    const aRes = await request(app).post("/api/auth/login").send({
      email: "admin@toktickit.local",
      password: "AdminPass123!",
    });
    adminToken = aRes.body.token;
    adminUser = aRes.body.user;

    // 3. Authenticate Requester Jennifer
    const rRes = await request(app).post("/api/auth/login").send({
      email: "jennifer.anderson@kmutt.ac.th",
      password: "Password123!",
    });
    requesterToken = rRes.body.token;
    requesterUser = rRes.body.user;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ---------------------------------------------------------------------------
  // API-16: IT Staff Dashboard Metrics Retrieval (AC-14, FR-15, BR-13)
  // ---------------------------------------------------------------------------
  it("retrieves IT Staff dashboard operational queue metrics and recent tickets (API-16, AC-14, FR-15, BR-13)", async () => {
    const res = await request(app)
      .get("/api/dashboard/staff")
      .set("Authorization", `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("metrics");
    expect(res.body).toHaveProperty("deltas");
    expect(res.body).toHaveProperty("drillDownUrls");
    expect(res.body).toHaveProperty("recentTickets");

    const { metrics, deltas, drillDownUrls, recentTickets } = res.body;

    // Metrics validation
    expect(typeof metrics.newTickets).toBe("number");
    expect(typeof metrics.openTickets).toBe("number");
    expect(typeof metrics.inProgressTickets).toBe("number");
    expect(typeof metrics.waitingForRequesterTickets).toBe("number");
    expect(typeof metrics.myAssignedTickets).toBe("number");
    expect(typeof metrics.unassignedTickets).toBe("number");
    expect(typeof metrics.highUrgentTickets).toBe("number");
    expect(typeof metrics.myOpenActionsCount).toBe("number");

    // Canonical drill-down URLs
    expect(drillDownUrls).toEqual({
      newTickets: "/staff/queue?status=NEW",
      openTickets: "/staff/queue?status=OPEN",
      inProgressTickets: "/staff/queue?status=IN_PROGRESS",
      waitingForRequesterTickets: "/staff/queue?status=WAITING_FOR_REQUESTER",
      myAssignedTickets: "/staff/queue?ownerId=me",
      unassignedTickets: "/staff/queue?ownerId=unassigned",
      highUrgentTickets: "/staff/queue?itPriority=HIGH,URGENT",
    });

    // Recent tickets validation
    expect(Array.isArray(recentTickets)).toBe(true);
    expect(recentTickets.length).toBeLessThanOrEqual(5);

    if (recentTickets.length > 0) {
      const first = recentTickets[0];
      expect(first).toHaveProperty("id");
      expect(first).toHaveProperty("ticketNumber");
      expect(first).toHaveProperty("summary");
      expect(first).toHaveProperty("currentStatus");
      expect(first).toHaveProperty("itPriority");
      expect(first).toHaveProperty("requesterName");
      expect(first).toHaveProperty("updatedAt");
      expect(first).toHaveProperty("categoryName");
    }
  });

  // ---------------------------------------------------------------------------
  // API-17: Admin Dashboard Metrics Retrieval (AC-15, FR-16, BR-14)
  // ---------------------------------------------------------------------------
  it("retrieves Admin dashboard combining IT Staff operational metrics with user account statistics (API-17, AC-15, FR-16, BR-14)", async () => {
    const res = await request(app)
      .get("/api/dashboard/admin")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("ticketMetrics");
    expect(res.body).toHaveProperty("userMetrics");
    expect(res.body).toHaveProperty("deltas");
    expect(res.body).toHaveProperty("drillDownUrls");
    expect(res.body).toHaveProperty("recentTickets");

    const { userMetrics, drillDownUrls } = res.body;

    // User metrics validation
    expect(typeof userMetrics.totalUsers).toBe("number");
    expect(typeof userMetrics.activeUsers).toBe("number");
    expect(typeof userMetrics.inactiveUsers).toBe("number");
    expect(userMetrics.totalUsers).toBe(userMetrics.activeUsers + userMetrics.inactiveUsers);

    expect(userMetrics.usersByRole).toHaveProperty("REQUESTER");
    expect(userMetrics.usersByRole).toHaveProperty("IT_STAFF");
    expect(userMetrics.usersByRole).toHaveProperty("ADMINISTRATOR");

    const sumRoles =
      userMetrics.usersByRole.REQUESTER +
      userMetrics.usersByRole.IT_STAFF +
      userMetrics.usersByRole.ADMINISTRATOR;
    expect(sumRoles).toBe(userMetrics.totalUsers);

    // Admin drillDownUrls includes manageUsers
    expect(drillDownUrls.manageUsers).toBe("/admin/users");
  });

  // ---------------------------------------------------------------------------
  // API-18: Dashboard Role Authorization Matrix (FR-15, FR-16)
  // ---------------------------------------------------------------------------
  describe("API-18: Dashboard Role Authorization Matrix", () => {
    it("denies Requester access to IT Staff dashboard with 403 Forbidden", async () => {
      const res = await request(app)
        .get("/api/dashboard/staff")
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(403);
    });

    it("denies Requester access to Admin dashboard with 403 Forbidden", async () => {
      const res = await request(app)
        .get("/api/dashboard/admin")
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(403);
    });

    it("denies IT Staff access to Admin dashboard with 403 Forbidden", async () => {
      const res = await request(app)
        .get("/api/dashboard/admin")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(403);
    });

    it("allows IT Staff access to IT Staff dashboard with 200 OK", async () => {
      const res = await request(app)
        .get("/api/dashboard/staff")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
    });

    it("allows Administrator access to IT Staff dashboard with 200 OK", async () => {
      const res = await request(app)
        .get("/api/dashboard/staff")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it("allows Administrator access to Admin dashboard with 200 OK", async () => {
      const res = await request(app)
        .get("/api/dashboard/admin")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });
  });

  // ---------------------------------------------------------------------------
  // API-19: Daily Velocity Deltas Calculations (AC-14, BR-13)
  // ---------------------------------------------------------------------------
  it("returns deltas dictionary for all 5 primary cards (API-19, AC-14, BR-13)", async () => {
    const res = await request(app)
      .get("/api/dashboard/staff")
      .set("Authorization", `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    const { deltas } = res.body;

    expect(typeof deltas.newTickets).toBe("number");
    expect(typeof deltas.openTickets).toBe("number");
    expect(typeof deltas.inProgressTickets).toBe("number");
    expect(typeof deltas.waitingForRequesterTickets).toBe("number");
    expect(typeof deltas.myAssignedTickets).toBe("number");
  });

  // ---------------------------------------------------------------------------
  // API-25: Multi-Value Dashboard Drill-Down Filters (FR-17, BR-15)
  // ---------------------------------------------------------------------------
  describe("API-25: Multi-Value Queue Filters & Validation", () => {
    it("returns union of statuses for comma-separated status query", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?status=NEW,OPEN")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);

      for (const t of res.body.data) {
        expect(["NEW", "OPEN"]).toContain(t.currentStatus);
      }
    });

    it("returns union of priorities for comma-separated itPriority query (HIGH,URGENT)", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?itPriority=HIGH,URGENT")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);

      for (const t of res.body.data) {
        expect(["HIGH", "URGENT"]).toContain(t.itPriority);
      }
    });

    it("rejects invalid status filter with 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?status=INVALID_STATUS")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects invalid itPriority filter with 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?itPriority=INVALID_PRIORITY")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("resolves ownerId=me to caller assigned tickets", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?ownerId=me")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      for (const t of res.body.data) {
        expect(t.ticketOwner?.id).toBe(staffUser.id);
      }
    });

    it("resolves ownerId=unassigned to unassigned tickets", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?ownerId=unassigned")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      for (const t of res.body.data) {
        expect(t.ticketOwner).toBeNull();
      }
    });
  });
});
