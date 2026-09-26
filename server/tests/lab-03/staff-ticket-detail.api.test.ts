import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 Staff Ticket Operations API Suite (server/tests/lab-03/staff-ticket-detail.api.test.ts)", () => {
  const prisma = getPrisma();
  let jenniferToken: string;
  let davidToken: string;
  let staffAliceToken: string;
  let staffBobToken: string;
  let adminToken: string;

  let aliceUserId: number;
  let bobUserId: number;
  let jenniferUserId: number;
  let inactiveStaffId: number;

  let testTicketId: number;

  beforeAll(async () => {
    // 1. Log in Jennifer (Requester)
    const jRes = await request(app).post("/api/auth/login").send({
      email: "jennifer.anderson@kmutt.ac.th",
      password: "Password123!",
    });
    jenniferToken = jRes.body.token;
    jenniferUserId = jRes.body.user.id;

    // 2. Log in David (Requester)
    const dRes = await request(app).post("/api/auth/login").send({
      email: "david.lee@kmutt.ac.th",
      password: "Password123!",
    });
    davidToken = dRes.body.token;

    // 3. Log in Staff Alice (IT Staff)
    const saRes = await request(app).post("/api/auth/login").send({
      email: "staff.alice@toktickit.local",
      password: "Password123!",
    });
    staffAliceToken = saRes.body.token;
    aliceUserId = saRes.body.user.id;

    // 4. Log in Staff Bob (IT Staff)
    const sbRes = await request(app).post("/api/auth/login").send({
      email: "staff.bob@toktickit.local",
      password: "Password123!",
    });
    staffBobToken = sbRes.body.token;
    bobUserId = sbRes.body.user.id;

    // 5. Log in Admin (Administrator)
    const aRes = await request(app).post("/api/auth/login").send({
      email: "admin@toktickit.local",
      password: "AdminPass123!",
    });
    adminToken = aRes.body.token;

    // 6. Get inactive staff user id
    const inactive = await prisma.user.findFirst({
      where: { email: "staff.inactive@toktickit.local" },
    });
    inactiveStaffId = inactive ? inactive.id : 99999;

    // 7. Create a clean unassigned NEW ticket owned by Jennifer
    const tRes = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${jenniferToken}`)
      .field("categoryId", "1")
      .field("relatedSystemId", "1")
      .field("summary", "Staff Operations Test Ticket")
      .field("description", "Ticket for validating claim, priority, status workflow, and discussions.")
      .field("requestedPriority", "MEDIUM");

    testTicketId = tRes.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // API-09: Claim unassigned ticket by IT Staff (AC-11, FR-10)
  it("claims an unassigned ticket by IT Staff and transitions NEW to OPEN (API-09, AC-11, FR-10)", async () => {
    const res = await request(app)
      .patch(`/api/tickets/${testTicketId}/assignment`)
      .set("Authorization", `Bearer ${staffAliceToken}`)
      .send({ ownerId: aliceUserId });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(testTicketId);
    expect(res.body.ticketOwnerId).toBe(aliceUserId);
    expect(res.body.currentStatus).toBe("OPEN");
  });

  // API-10: Reassign ticket ownership to another active staff (AC-12, FR-10)
  it("reassigns ticket ownership to another active IT Staff member (API-10, AC-12, FR-10)", async () => {
    const res = await request(app)
      .patch(`/api/tickets/${testTicketId}/assignment`)
      .set("Authorization", `Bearer ${staffAliceToken}`)
      .send({ ownerId: bobUserId });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(testTicketId);
    expect(res.body.ticketOwnerId).toBe(bobUserId);
    // Since ticket was already OPEN, status remains OPEN
    expect(res.body.currentStatus).toBe("OPEN");
  });

  // API-30: Assign ticket owner to a requester or inactive user rejected with 400 (AC-12, BR-13)
  it("rejects ticket assignment to a Requester user with 400 Bad Request (API-30, AC-12, BR-13)", async () => {
    const res = await request(app)
      .patch(`/api/tickets/${testTicketId}/assignment`)
      .set("Authorization", `Bearer ${staffAliceToken}`)
      .send({ ownerId: jenniferUserId });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });

  it("rejects ticket assignment to an inactive user with 400 Bad Request (API-30, AC-12, BR-13)", async () => {
    const res = await request(app)
      .patch(`/api/tickets/${testTicketId}/assignment`)
      .set("Authorization", `Bearer ${staffAliceToken}`)
      .send({ ownerId: inactiveStaffId });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });

  it("rejects ticket assignment attempt by a Requester with 403 Forbidden", async () => {
    const res = await request(app)
      .patch(`/api/tickets/${testTicketId}/assignment`)
      .set("Authorization", `Bearer ${jenniferToken}`)
      .send({ ownerId: aliceUserId });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  // API-11: Update IT Priority independently (AC-13, FR-11, BR-12)
  it("updates IT Priority independently from requestedPriority (API-11, AC-13, FR-11, BR-12)", async () => {
    const res = await request(app)
      .patch(`/api/tickets/${testTicketId}/priority`)
      .set("Authorization", `Bearer ${staffAliceToken}`)
      .send({ itPriority: "URGENT" });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(testTicketId);
    expect(res.body.itPriority).toBe("URGENT");
    expect(res.body.requestedPriority).toBe("MEDIUM");
  });

  it("rejects invalid IT Priority values with 400 Bad Request", async () => {
    const res = await request(app)
      .patch(`/api/tickets/${testTicketId}/priority`)
      .set("Authorization", `Bearer ${staffAliceToken}`)
      .send({ itPriority: "SUPER_URGENT" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });

  // API-12: Permitted status transition (OPEN -> IN_PROGRESS) (AC-14, FR-12, BR-14)
  it("advances ticket status through permitted transition OPEN -> IN_PROGRESS (API-12, AC-14, FR-12, BR-14)", async () => {
    const res = await request(app)
      .patch(`/api/tickets/${testTicketId}/status`)
      .set("Authorization", `Bearer ${staffAliceToken}`)
      .send({ status: "IN_PROGRESS" });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(testTicketId);
    expect(res.body.currentStatus).toBe("IN_PROGRESS");
  });

  // API-13: Invalid status transition rejected with 400 (AC-15, FR-12, BR-14)
  it("rejects prohibited status transition IN_PROGRESS -> NEW with 400 Bad Request (API-13, AC-15, FR-12, BR-14)", async () => {
    const res = await request(app)
      .patch(`/api/tickets/${testTicketId}/status`)
      .set("Authorization", `Bearer ${staffAliceToken}`)
      .send({ status: "NEW" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });

  it("rejects status transition attempt by Requester with 403 Forbidden", async () => {
    const res = await request(app)
      .patch(`/api/tickets/${testTicketId}/status`)
      .set("Authorization", `Bearer ${jenniferToken}`)
      .send({ status: "RESOLVED" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  // Further status progression to RESOLVED with resolutionSummary
  it("advances status from IN_PROGRESS to RESOLVED with resolutionSummary", async () => {
    const res = await request(app)
      .patch(`/api/tickets/${testTicketId}/status`)
      .set("Authorization", `Bearer ${staffAliceToken}`)
      .send({
        status: "RESOLVED",
        resolutionSummary: "Replaced faulty hardware adapter and verified stability.",
      });

    expect(res.status).toBe(200);
    expect(res.body.currentStatus).toBe("RESOLVED");
    expect(res.body.resolutionSummary).toBe("Replaced faulty hardware adapter and verified stability.");
  });

  // API-14: Requester indicates problem appears resolved (AC-09, FR-07, BR-05)
  it("allows ticket requester to indicate problem appears resolved without altering formal status (API-14, AC-09, FR-07, BR-05)", async () => {
    // Create another open ticket for Jennifer to test indicate-resolved
    const tRes = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${jenniferToken}`)
      .field("categoryId", "2")
      .field("relatedSystemId", "2")
      .field("summary", "Wi-Fi Problem Resolution Ticket")
      .field("description", "Requester will indicate problem appears resolved on this ticket.")
      .field("requestedPriority", "HIGH");

    const resolveTicketId = tRes.body.id;

    const res = await request(app)
      .post(`/api/tickets/${resolveTicketId}/indicate-resolved`)
      .set("Authorization", `Bearer ${jenniferToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(resolveTicketId);
    expect(res.body.problemAppearsResolved).toBe(true);
    expect(res.body.problemAppearsResolvedAt).toBeTruthy();

    // Verify formal ticket status in database remains NEW
    const updatedTicket = await prisma.ticket.findUnique({ where: { id: resolveTicketId } });
    expect(updatedTicket?.currentStatus).toBe("NEW");

    // Verify automatic audit comment was created
    const auditComment = await prisma.publicComment.findFirst({
      where: {
        ticketId: resolveTicketId,
        content: "Requester indicated that the problem appears resolved.",
      },
    });
    expect(auditComment).toBeTruthy();
    expect(auditComment?.authorId).toBe(jenniferUserId);
  });

  it("rejects indicate-resolved call from non-owner Requester with 403 Forbidden (API-14, BR-05)", async () => {
    // David attempts to indicate problem resolved on Jennifer's ticket
    const res = await request(app)
      .post(`/api/tickets/${testTicketId}/indicate-resolved`)
      .set("Authorization", `Bearer ${davidToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("rejects indicate-resolved call from IT Staff with 403 Forbidden (API-14, BR-05)", async () => {
    const res = await request(app)
      .post(`/api/tickets/${testTicketId}/indicate-resolved`)
      .set("Authorization", `Bearer ${staffAliceToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("GET /api/staff/users retrieves active IT_STAFF and ADMINISTRATOR users", async () => {
    const res = await request(app)
      .get("/api/staff/users")
      .set("Authorization", `Bearer ${staffAliceToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    for (const u of res.body) {
      expect(["IT_STAFF", "ADMINISTRATOR"]).toContain(u.role);
    }
  });
});
