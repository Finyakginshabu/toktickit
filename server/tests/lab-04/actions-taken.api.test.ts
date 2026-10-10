import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import crypto from "crypto";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 4 Actions Taken API Suite (server/tests/lab-04/actions-taken.api.test.ts)", () => {
  const prisma = getPrisma();
  let staffToken: string;
  let adminToken: string;
  let requesterToken: string;
  let otherRequesterToken: string;
  let staffUser: any;
  let adminUser: any;
  let requesterUser: any;
  let otherRequesterUser: any;
  let openTicket: any;
  let closedTicket: any;
  let cancelledTicket: any;

  beforeAll(async () => {
    // 1. Authenticate Staff Alice
    const staffLogin = await request(app).post("/api/auth/login").send({
      email: "staff.alice@toktickit.local",
      password: "Password123!",
    });
    staffToken = staffLogin.body.token;
    staffUser = staffLogin.body.user;

    // 2. Authenticate Administrator
    const adminLogin = await request(app).post("/api/auth/login").send({
      email: "admin@toktickit.local",
      password: "AdminPass123!",
    });
    adminToken = adminLogin.body.token;
    adminUser = adminLogin.body.user;

    // 3. Authenticate Requester Jennifer
    const reqLogin = await request(app).post("/api/auth/login").send({
      email: "jennifer.anderson@kmutt.ac.th",
      password: "Password123!",
    });
    requesterToken = reqLogin.body.token;
    requesterUser = reqLogin.body.user;

    // 4. Authenticate other Requester David
    const otherReqLogin = await request(app).post("/api/auth/login").send({
      email: "david.lee@kmutt.ac.th",
      password: "Password123!",
    });
    otherRequesterToken = otherReqLogin.body.token;
    otherRequesterUser = otherReqLogin.body.user;

    // 5. Query tickets for testing
    openTicket = await prisma.ticket.findUnique({
      where: { ticketNumber: "TKT-2026-000004" }, // Owned by Jennifer, IN_PROGRESS
    });

    closedTicket = await prisma.ticket.findUnique({
      where: { ticketNumber: "TKT-2026-000009" }, // CLOSED
    });

    cancelledTicket = await prisma.ticket.findUnique({
      where: { ticketNumber: "TKT-2026-000011" }, // CANCELLED
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ---------------------------------------------------------------------------
  // API-01: Valid Action Taken Creation with Auto Performer Attribution
  // ---------------------------------------------------------------------------
  it("creates an Action Taken with authoritative performedById attribution (API-01, AC-01, FR-02, BR-03)", async () => {
    const res = await request(app)
      .post(`/api/tickets/${openTicket.id}/actions`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        actionDescription: "Performed firmware upgrade on lab switch and verified port status.",
        result: "All 24 ports communicating cleanly without dropped packets.",
        performedById: 9999, // Should be ignored and authoritatively set to staffUser.id
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.ticketId).toBe(openTicket.id);
    expect(res.body.performedById).toBe(staffUser.id);
    expect(res.body.result).toBe("All 24 ports communicating cleanly without dropped packets.");
    expect(res.body.version).toBe(1);
    expect(res.body.performedBy.id).toBe(staffUser.id);
    expect(res.body).not.toHaveProperty("status");
    expect(res.body).not.toHaveProperty("assigneeId");
    expect(res.body).not.toHaveProperty("assignee");
    expect(res.body).not.toHaveProperty("cancellationReason");
  });

  // ---------------------------------------------------------------------------
  // API-02: Result is Optional and Action Fields Stay Removed
  // ---------------------------------------------------------------------------
  it("allows actions without a result and ignores removed action fields", async () => {
    const res = await request(app)
      .post(`/api/tickets/${openTicket.id}/actions`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        actionDescription: "Configured backup DNS routing table.",
        status: "CANCELLED",
        assigneeId: 123,
        cancellationReason: "This legacy field is ignored.",
      });

    expect(res.status).toBe(201);
    expect(res.body.result).toBeNull();
    expect(res.body).not.toHaveProperty("status");
    expect(res.body).not.toHaveProperty("assigneeId");
    expect(res.body).not.toHaveProperty("cancellationReason");
  });

  // ---------------------------------------------------------------------------
  // API-03: Follow-Up Validation (Required Follow-Up Note)
  // ---------------------------------------------------------------------------
  it("requires a non-empty followUpNote when followUpRequired is true (API-03, AC-03, FR-06, BR-06)", async () => {
    const res = await request(app)
      .post(`/api/tickets/${openTicket.id}/actions`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        actionDescription: "Replaced faulty transceiver module.",
        followUpRequired: true,
        followUpNote: "   ", // Invalid empty follow-up note
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
    expect(res.body.error.message).toMatch(/follow-up note/i);
  });

  // ---------------------------------------------------------------------------
  // API-04: Follow-Up Note Editing
  // ---------------------------------------------------------------------------
  it("updates the follow-up note while retaining the required flag", async () => {
    // 1. Create action with follow-up required
    const createRes = await request(app)
      .post(`/api/tickets/${openTicket.id}/actions`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        actionDescription: "Applied thermal paste and replaced cooling fan.",
        followUpRequired: true,
        followUpNote: "Check CPU operating temperature during peak load next Tuesday.",
      });

    expect(createRes.status).toBe(201);
    const actionId = createRes.body.id;
    const version = createRes.body.version;

    // 2. Update the note without a follow-up resolution state
    const patchRes = await request(app)
      .patch(`/api/tickets/${openTicket.id}/actions/${actionId}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        expectedVersion: version,
        followUpNote: "Check CPU temperatures again after the next maintenance window.",
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.followUpRequired).toBe(true);
    expect(patchRes.body.followUpNote).toBe("Check CPU temperatures again after the next maintenance window.");
    expect(patchRes.body).not.toHaveProperty("followUpResolvedAt");
    expect(patchRes.body.version).toBe(version + 1);
  });

  // ---------------------------------------------------------------------------
  // API-05: Requester Actions View (Read-Only & Email Sanitization)
  // ---------------------------------------------------------------------------
  it("allows Requesters to view actions on owned tickets with staff emails sanitized (API-05, AC-04, FR-01, BR-05)", async () => {
    const res = await request(app)
      .get(`/api/tickets/${openTicket.id}/actions`)
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    // Verify staff emails are sanitized / omitted for Requester role
    for (const action of res.body) {
      if (action.performedBy) {
        expect(action.performedBy.email).toBeUndefined();
      }
      expect(action).not.toHaveProperty("assignee");
    }
  });

  // ---------------------------------------------------------------------------
  // API-06: Requester Write Prohibition (403 Forbidden)
  // ---------------------------------------------------------------------------
  it("prohibits Requesters from creating, updating, or deleting actions taken (API-06, AC-05, FR-08, BR-05)", async () => {
    // 1. POST
    const postRes = await request(app)
      .post(`/api/tickets/${openTicket.id}/actions`)
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({
        actionDescription: "Requester attempt to create action",
      });
    expect(postRes.status).toBe(403);

    // 2. PATCH
    const patchRes = await request(app)
      .patch(`/api/tickets/${openTicket.id}/actions/1`)
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({
        expectedVersion: 1,
        actionDescription: "Requester attempt to edit action",
      });
    expect(patchRes.status).toBe(403);

    // 3. DELETE
    const delRes = await request(app)
      .delete(`/api/tickets/${openTicket.id}/actions/1`)
      .set("Authorization", `Bearer ${requesterToken}`);
    expect(delRes.status).toBe(403);
  });

  // ---------------------------------------------------------------------------
  // API-07: Unowned Ticket Privacy Boundary (404 Not Found)
  // ---------------------------------------------------------------------------
  it("returns 404 Not Found when a Requester queries actions on an unowned ticket (API-07, AC-06, BR-05)", async () => {
    // openTicket is owned by Jennifer; otherRequester is David
    const res = await request(app)
      .get(`/api/tickets/${openTicket.id}/actions`)
      .set("Authorization", `Bearer ${otherRequesterToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  // ---------------------------------------------------------------------------
  // API-14: Terminal Ticket Lock on Actions
  // ---------------------------------------------------------------------------
  it("rejects creating or modifying actions on CLOSED or CANCELLED tickets (API-14, AC-17, FR-09)", async () => {
    // 1. POST on CLOSED ticket
    const postClosed = await request(app)
      .post(`/api/tickets/${closedTicket.id}/actions`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        actionDescription: "Attempt to add action on closed ticket.",
        result: "Should fail.",
      });

    expect(postClosed.status).toBe(400);
    expect(postClosed.body.error.message).toMatch(/closed or cancelled/i);

    // 2. POST on CANCELLED ticket
    const postCancelled = await request(app)
      .post(`/api/tickets/${cancelledTicket.id}/actions`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        actionDescription: "Attempt to add action on cancelled ticket.",
        result: "Should fail.",
      });

    expect(postCancelled.status).toBe(400);
    expect(postCancelled.body.error.message).toMatch(/closed or cancelled/i);
  });

  // ---------------------------------------------------------------------------
  // API-20: ClientActionId Retry Idempotency
  // ---------------------------------------------------------------------------
  it("returns existing action with Idempotent-Replay header when reusing clientActionId (API-20, AC-18, FR-02)", async () => {
    const clientActionId = crypto.randomUUID();

    // 1. Initial creation
    const res1 = await request(app)
      .post(`/api/tickets/${openTicket.id}/actions`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        actionDescription: "Network route flush and reload testing.",
        result: "Route cleared cleanly.",
        clientActionId,
      });

    expect(res1.status).toBe(201);
    const initialId = res1.body.id;

    // 2. Immediate replay
    const res2 = await request(app)
      .post(`/api/tickets/${openTicket.id}/actions`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        actionDescription: "Network route flush and reload testing.",
        result: "Route cleared cleanly.",
        clientActionId,
      });

    expect(res2.status).toBe(200);
    expect(res2.headers["idempotent-replay"]).toBe("true");
    expect(res2.body.id).toBe(initialId);

    // Verify only 1 record exists with this UUID
    const count = await prisma.actionTaken.count({
      where: { clientActionId },
    });
    expect(count).toBe(1);
  });

  it("rejects physical deletion and leaves the action intact", async () => {
    const createRes = await request(app)
      .post(`/api/tickets/${openTicket.id}/actions`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ actionDescription: "Record an action that must remain in history." });

    expect(createRes.status).toBe(201);

    const deleteRes = await request(app)
      .delete(`/api/tickets/${openTicket.id}/actions/${createRes.body.id}`)
      .set("Authorization", `Bearer ${staffToken}`);

    expect(deleteRes.status).toBe(405);
    await expect(
      prisma.actionTaken.findUnique({ where: { id: createRes.body.id } })
    ).resolves.not.toBeNull();
  });

});
