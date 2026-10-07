import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Requester Dashboard API Suite (API-15 per AC-13, FR-14, BR-12)", () => {
  const prisma = getPrisma();
  let jenniferToken: string;
  let jenniferUser: any;
  let emptyRequesterToken: string;
  let emptyRequesterUser: any;
  let davidToken: string;
  let davidUser: any;

  beforeAll(async () => {
    // 1. Authenticate Jennifer (Requester with multiple tickets)
    const jRes = await request(app).post("/api/auth/login").send({
      email: "jennifer.anderson@kmutt.ac.th",
      password: "Password123!",
    });
    jenniferToken = jRes.body.token;
    jenniferUser = jRes.body.user;

    // 2. Authenticate Rachel Empty (Requester with 0 tickets)
    const eRes = await request(app).post("/api/auth/login").send({
      email: "rachel.empty@toktickit.local",
      password: "Password123!",
    });
    emptyRequesterToken = eRes.body.token;
    emptyRequesterUser = eRes.body.user;

    // 3. Authenticate David Lee
    const dRes = await request(app).post("/api/auth/login").send({
      email: "david.lee@kmutt.ac.th",
      password: "Password123!",
    });
    davidToken = dRes.body.token;
    davidUser = dRes.body.user;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("retrieves requester dashboard metrics strictly isolated to authenticated user (API-15, AC-13, FR-14, BR-12)", async () => {
    const res = await request(app)
      .get("/api/dashboard/requester")
      .set("Authorization", `Bearer ${jenniferToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("metrics");
    expect(res.body).toHaveProperty("drillDownUrls");
    expect(res.body).toHaveProperty("recentTickets");

    const { metrics, drillDownUrls, recentTickets } = res.body;

    // Check metric counters exist
    expect(typeof metrics.myOpenTickets).toBe("number");
    expect(typeof metrics.inProgressTickets).toBe("number");
    expect(typeof metrics.resolvedTickets).toBe("number");
    expect(typeof metrics.closedTickets).toBe("number");
    expect(typeof metrics.waitingForRequesterTickets).toBe("number");

    // All counts must be non-negative
    expect(metrics.myOpenTickets).toBeGreaterThanOrEqual(0);
    expect(metrics.inProgressTickets).toBeGreaterThanOrEqual(0);
    expect(metrics.resolvedTickets).toBeGreaterThanOrEqual(0);
    expect(metrics.closedTickets).toBeGreaterThanOrEqual(0);
    expect(metrics.waitingForRequesterTickets).toBeGreaterThanOrEqual(0);

    // Verify canonical drill-down URLs
    expect(drillDownUrls).toEqual({
      myOpenTickets: "/my-tickets?status=NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED",
      inProgressTickets: "/my-tickets?status=IN_PROGRESS",
      resolvedTickets: "/my-tickets?status=RESOLVED",
      closedTickets: "/my-tickets?status=CLOSED",
      waitingForRequesterTickets: "/my-tickets?status=WAITING_FOR_REQUESTER",
    });

    // Recent tickets array checks
    expect(Array.isArray(recentTickets)).toBe(true);
    expect(recentTickets.length).toBeLessThanOrEqual(5);

    if (recentTickets.length > 0) {
      const first = recentTickets[0];
      expect(first).toHaveProperty("id");
      expect(first).toHaveProperty("ticketNumber");
      expect(first).toHaveProperty("summary");
      expect(first).toHaveProperty("currentStatus");
      expect(first).toHaveProperty("requestedPriority");
      expect(first).toHaveProperty("updatedAt");
      expect(first).toHaveProperty("categoryName");

      // Verify that every recent ticket belongs to Jennifer
      for (const t of recentTickets) {
        const dbTicket = await prisma.ticket.findUnique({ where: { id: t.id } });
        expect(dbTicket?.requesterId).toBe(jenniferUser.id);
      }
    }
  });

  it("returns zero counts and empty recentTickets for a requester with zero tickets (API-15, AC-13)", async () => {
    const res = await request(app)
      .get("/api/dashboard/requester")
      .set("Authorization", `Bearer ${emptyRequesterToken}`);

    expect(res.status).toBe(200);
    expect(res.body.metrics).toEqual({
      myOpenTickets: 0,
      inProgressTickets: 0,
      resolvedTickets: 0,
      closedTickets: 0,
      waitingForRequesterTickets: 0,
    });
    expect(res.body.recentTickets).toEqual([]);
  });

  it("verifies isolation between two different requesters (API-15, BR-12)", async () => {
    const resJennifer = await request(app)
      .get("/api/dashboard/requester")
      .set("Authorization", `Bearer ${jenniferToken}`);

    const resDavid = await request(app)
      .get("/api/dashboard/requester")
      .set("Authorization", `Bearer ${davidToken}`);

    expect(resJennifer.status).toBe(200);
    expect(resDavid.status).toBe(200);

    // Verify recent ticket IDs are disjoint
    const jenniferTicketIds = resJennifer.body.recentTickets.map((t: any) => t.id);
    const davidTicketIds = resDavid.body.recentTickets.map((t: any) => t.id);

    for (const id of jenniferTicketIds) {
      expect(davidTicketIds).not.toContain(id);
    }
  });

  it("retrieves union of all 5 open statuses via comma-separated query filter (API-15, BR-15)", async () => {
    const res = await request(app)
      .get("/api/tickets/my-tickets?status=NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED")
      .set("Authorization", `Bearer ${jenniferToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");

    // All returned tickets must belong to Jennifer and have one of the 5 statuses
    for (const t of res.body.data) {
      expect(t.requesterId).toBe(jenniferUser.id);
      expect(["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"]).toContain(t.currentStatus);
    }
  });

  it("rejects unauthenticated requests to requester dashboard with 401 Unauthorized", async () => {
    const res = await request(app).get("/api/dashboard/requester");
    expect(res.status).toBe(401);
  });
});
