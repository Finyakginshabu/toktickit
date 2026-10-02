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
  let inactiveStaffUser: any;
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

    // 5. Query inactive staff member
    inactiveStaffUser = await prisma.user.findUnique({
      where: { email: "staff.inactive@toktickit.local" },
    });

    // 6. Query tickets for testing
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
        status: "COMPLETED",
        performedById: 9999, // Should be ignored and authoritatively set to staffUser.id
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.ticketId).toBe(openTicket.id);
    expect(res.body.performedById).toBe(staffUser.id);
    expect(res.body.status).toBe("COMPLETED");
    expect(res.body.result).toBe("All 24 ports communicating cleanly without dropped packets.");
    expect(res.body.version).toBe(1);
    expect(res.body.performedBy.id).toBe(staffUser.id);
  });

  // ---------------------------------------------------------------------------
  // API-02: Assignee Eligibility Validation (Rejects Inactive Users & Requesters)
  // ---------------------------------------------------------------------------
  it("rejects assignment to an inactive user or Requester (API-02, AC-02, FR-04, BR-04)", async () => {
    // 1. Assign to inactive staff
    const resInactive = await request(app)
      .post(`/api/tickets/${openTicket.id}/actions`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        actionDescription: "Configured backup DNS routing table.",
        status: "PENDING",
        assigneeId: inactiveStaffUser.id,
      });

    expect(resInactive.status).toBe(400);
    expect(resInactive.body.error.code).toBe("INVALID_ASSIGNEE");

    // 2. Assign to requester
    const resRequester = await request(app)
      .post(`/api/tickets/${openTicket.id}/actions`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        actionDescription: "Configured backup DNS routing table.",
        status: "PENDING",
        assigneeId: requesterUser.id,
      });

    expect(resRequester.status).toBe(400);
    expect(resRequester.body.error.code).toBe("INVALID_ASSIGNEE");
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
        status: "IN_PROGRESS",
        followUpRequired: true,
        followUpNote: "   ", // Invalid empty follow-up note
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
    expect(res.body.error.message).toMatch(/follow-up note/i);
  });

  // ---------------------------------------------------------------------------
  // API-04: Follow-Up Resolution Without Note Erasure
  // ---------------------------------------------------------------------------
  it("resolves follow-up stamping followUpResolvedAt while preserving followUpNote (API-04, AC-03, FR-06, BR-06)", async () => {
    // 1. Create action with follow-up required
    const createRes = await request(app)
      .post(`/api/tickets/${openTicket.id}/actions`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        actionDescription: "Applied thermal paste and replaced cooling fan.",
        status: "IN_PROGRESS",
        followUpRequired: true,
        followUpNote: "Check CPU operating temperature during peak load next Tuesday.",
      });

    expect(createRes.status).toBe(201);
    const actionId = createRes.body.id;
    const version = createRes.body.version;

    // 2. Mark follow-up as resolved via PATCH
    const patchRes = await request(app)
      .patch(`/api/tickets/${openTicket.id}/actions/${actionId}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        expectedVersion: version,
        resolveFollowUp: true,
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.followUpResolvedAt).not.toBeNull();
    expect(patchRes.body.followUpNote).toBe("Check CPU operating temperature during peak load next Tuesday.");
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
      if (action.assignee) {
        expect(action.assignee.email).toBeUndefined();
      }
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
        status: "COMPLETED",
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
        status: "COMPLETED",
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
        status: "COMPLETED",
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
        status: "COMPLETED",
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

  // ---------------------------------------------------------------------------
  // API-21: Append-Only Cancellation via POST .../cancel
  // ---------------------------------------------------------------------------
  it("cancels an action persisting cancellationReason and increments version (API-21, FR-07, BR-07, AC-17)", async () => {
    // 1. Create action
    const createRes = await request(app)
      .post(`/api/tickets/${openTicket.id}/actions`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        actionDescription: "Ordered external replacement PCIe network card.",
        status: "PENDING",
      });

    expect(createRes.status).toBe(201);
    const actionId = createRes.body.id;
    const version = createRes.body.version;

    // 2. Cancel action with reason
    const cancelRes = await request(app)
      .post(`/api/tickets/${openTicket.id}/actions/${actionId}/cancel`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        expectedVersion: version,
        reason: "Hardware vendor confirmed parts obsolescence; alternative card selected.",
      });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.status).toBe("CANCELLED");
    expect(cancelRes.body.cancellationReason).toBe(
      "Hardware vendor confirmed parts obsolescence; alternative card selected."
    );
    expect(cancelRes.body.version).toBe(version + 1);

    // 3. Physical DELETE attempt is blocked
    const delRes = await request(app)
      .delete(`/api/tickets/${openTicket.id}/actions/${actionId}`)
      .set("Authorization", `Bearer ${staffToken}`);

    expect(delRes.status).toBe(405);
  });

  // ---------------------------------------------------------------------------
  // API-24: Action Status Lifecycle Enforcement
  // ---------------------------------------------------------------------------
  it("enforces legal status progressions and rejects modifications on cancelled actions (API-24, FR-05, FR-07, BR-07)", async () => {
    // 1. Create a PENDING action
    const actionRes = await request(app)
      .post(`/api/tickets/${openTicket.id}/actions`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        actionDescription: "Triage initial user issue report.",
        status: "PENDING",
      });
    expect(actionRes.status).toBe(201);
    const actionId = actionRes.body.id;
    let version = actionRes.body.version;

    // 2. PENDING -> IN_PROGRESS is valid
    const toProgress = await request(app)
      .patch(`/api/tickets/${openTicket.id}/actions/${actionId}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        expectedVersion: version,
        status: "IN_PROGRESS",
      });
    expect(toProgress.status).toBe(200);
    expect(toProgress.body.status).toBe("IN_PROGRESS");
    version = toProgress.body.version;

    // 3. IN_PROGRESS -> COMPLETED requires result
    const failComplete = await request(app)
      .patch(`/api/tickets/${openTicket.id}/actions/${actionId}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        expectedVersion: version,
        status: "COMPLETED",
        result: "", // Missing result
      });
    expect(failComplete.status).toBe(400);

    // 4. IN_PROGRESS -> COMPLETED with result is valid
    const toComplete = await request(app)
      .patch(`/api/tickets/${openTicket.id}/actions/${actionId}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        expectedVersion: version,
        status: "COMPLETED",
        result: "Work verified and tested.",
      });
    expect(toComplete.status).toBe(200);
    version = toComplete.body.version;

    // 5. COMPLETED -> IN_PROGRESS is valid (reopen work)
    const toReopen = await request(app)
      .patch(`/api/tickets/${openTicket.id}/actions/${actionId}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        expectedVersion: version,
        status: "IN_PROGRESS",
      });
    expect(toReopen.status).toBe(200);
    version = toReopen.body.version;

    // 6. IN_PROGRESS -> CANCELLED requires cancellationReason
    const failCancel = await request(app)
      .patch(`/api/tickets/${openTicket.id}/actions/${actionId}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        expectedVersion: version,
        status: "CANCELLED",
      });
    expect(failCancel.status).toBe(400);

    const toCancel = await request(app)
      .patch(`/api/tickets/${openTicket.id}/actions/${actionId}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        expectedVersion: version,
        status: "CANCELLED",
        cancellationReason: "Task superseded by network infrastructure overhaul.",
      });
    expect(toCancel.status).toBe(200);
    version = toCancel.body.version;

    // 7. CANCELLED is terminal: any further transition is rejected
    const afterCancel = await request(app)
      .patch(`/api/tickets/${openTicket.id}/actions/${actionId}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        expectedVersion: version,
        status: "IN_PROGRESS",
      });
    expect(afterCancel.status).toBe(400);
    expect(afterCancel.body.error.message).toMatch(/cancelled actions are terminal/i);
  });
});
