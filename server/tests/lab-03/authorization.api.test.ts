import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 Authorization & Ownership API Suite (server/tests/lab-03/authorization.api.test.ts)", () => {
  const prisma = getPrisma();
  let jenniferToken: string;
  let davidToken: string;
  let staffToken: string;
  let adminToken: string;
  let jenniferTicketId: number;
  let davidTicketId: number;

  beforeAll(async () => {
    // 1. Log in Jennifer (Requester)
    const jRes = await request(app).post("/api/auth/login").send({
      email: "jennifer.anderson@kmutt.ac.th",
      password: "Password123!",
    });
    jenniferToken = jRes.body.token;

    // 2. Log in David (Requester)
    const dRes = await request(app).post("/api/auth/login").send({
      email: "david.lee@kmutt.ac.th",
      password: "Password123!",
    });
    davidToken = dRes.body.token;

    // 3. Log in Staff Alice (IT Staff)
    const sRes = await request(app).post("/api/auth/login").send({
      email: "staff.alice@toktickit.local",
      password: "Password123!",
    });
    staffToken = sRes.body.token;

    // 4. Log in Admin (Administrator)
    const aRes = await request(app).post("/api/auth/login").send({
      email: "admin@toktickit.local",
      password: "AdminPass123!",
    });
    adminToken = aRes.body.token;

    // 5. Create ticket owned by Jennifer
    const t1 = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${jenniferToken}`)
      .field("categoryId", "1")
      .field("relatedSystemId", "1")
      .field("summary", "Jennifer Authorization Test Ticket")
      .field("description", "Ticket owned by Jennifer to test authorization boundary.")
      .field("requestedPriority", "MEDIUM");
    jenniferTicketId = t1.body.id;

    // 6. Create ticket owned by David
    const t2 = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${davidToken}`)
      .field("categoryId", "2")
      .field("relatedSystemId", "2")
      .field("summary", "David Authorization Test Ticket")
      .field("description", "Ticket owned by David to test authorization boundary.")
      .field("requestedPriority", "HIGH");
    davidTicketId = t2.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // API-05: Requester ticket ownership boundary
  it("allows a requester to view their own ticket (API-05, AC-03, FR-06, BR-03)", async () => {
    const res = await request(app)
      .get(`/api/tickets/${jenniferTicketId}`)
      .set("Authorization", `Bearer ${jenniferToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(jenniferTicketId);
    expect(res.body.requesterId).toBe(1);
  });

  it("rejects cross-user ticket access with 403 Forbidden for Requesters (API-05, AC-03, BR-03)", async () => {
    // David tries to access Jennifer's ticket
    const res = await request(app)
      .get(`/api/tickets/${jenniferTicketId}`)
      .set("Authorization", `Bearer ${davidToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("allows IT Staff to view any ticket regardless of owner (API-05, FR-06)", async () => {
    const res = await request(app)
      .get(`/api/tickets/${jenniferTicketId}`)
      .set("Authorization", `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(jenniferTicketId);
  });

  it("allows Administrator to view any ticket (API-05, FR-06)", async () => {
    const res = await request(app)
      .get(`/api/tickets/${davidTicketId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(davidTicketId);
  });

  it("GET /api/tickets/my-tickets retrieves only owned tickets for authenticated requester", async () => {
    const res = await request(app)
      .get("/api/tickets/my-tickets")
      .set("Authorization", `Bearer ${jenniferToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    // All tickets in response must belong to Jennifer (requesterId === 1)
    for (const t of res.body.data) {
      expect(t.requesterId).toBe(1);
    }
  });

  it("rejects requests with malformed or invalid Bearer tokens with 401 Unauthorized", async () => {
    const res = await request(app)
      .get(`/api/tickets/${jenniferTicketId}`)
      .set("Authorization", "Bearer invalid-tampered-token");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});
