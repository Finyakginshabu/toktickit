import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 4 Ticket Workflow & Resolution Gate API Suite (server/tests/lab-04/ticket-workflow.api.test.ts)", () => {
  const prisma = getPrisma();
  let staffToken: string;
  let adminToken: string;
  let requesterToken: string;
  let otherRequesterToken: string;

  let staffUser: any;
  let requesterUser: any;
  let otherRequesterUser: any;

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

    // 3. Authenticate Requester Jennifer
    const rRes = await request(app).post("/api/auth/login").send({
      email: "jennifer.anderson@kmutt.ac.th",
      password: "Password123!",
    });
    requesterToken = rRes.body.token;
    requesterUser = rRes.body.user;

    // 4. Authenticate Requester David
    const dRes = await request(app).post("/api/auth/login").send({
      email: "david.lee@kmutt.ac.th",
      password: "Password123!",
    });
    otherRequesterToken = dRes.body.token;
    otherRequesterUser = dRes.body.user;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // -------------------------------------------------------------------------
  // API-08: Resolve ticket with zero Actions Taken (AC-07, FR-11, BR-09)
  // -------------------------------------------------------------------------
  it("rejects transition to RESOLVED when ticket has zero Actions Taken (API-08, AC-07, FR-11, BR-09)", async () => {
    // Create an OPEN ticket with NO actions taken
    const t = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-TEST-GATE-01-${Date.now()}`,
        requesterId: requesterUser.id,
        categoryId: 1,
        relatedSystemId: 1,
        summary: "Zero actions test ticket",
        description: "Testing resolution gate blocking when no actions exist.",
        currentStatus: "OPEN",
        version: 1,
      },
    });

    const res = await request(app)
      .patch(`/api/staff/tickets/${t.id}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        status: "RESOLVED",
        resolutionSummary: "Attempting to resolve without actions taken.",
        expectedVersion: 1,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe("RESOLUTION_GATE_BLOCKED");
    expect(res.body.error.details).toBeInstanceOf(Array);
    const codes = res.body.error.details.map((d: any) => d.code);
    expect(codes).toContain("NO_ACTIONS_TAKEN");

    // Clean up
    await prisma.ticket.delete({ where: { id: t.id } });
  });

  // -------------------------------------------------------------------------
  // API-09: Resolve ticket with an informational follow-up flag (AC-08, FR-11, BR-09)
  // -------------------------------------------------------------------------
  it("allows resolution when an action has an informational followUpRequired=true flag (API-09, AC-08, FR-11, BR-09)", async () => {
    // Create an OPEN ticket with 1 action that has followUpRequired = true
    const t = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-TEST-GATE-02-${Date.now()}`,
        requesterId: requesterUser.id,
        categoryId: 1,
        relatedSystemId: 1,
        summary: "Follow-up informational flag test ticket",
        description: "Testing that follow-up note does not block resolution.",
        currentStatus: "IN_PROGRESS",
        version: 1,
        actionsTaken: {
          create: {
            performedById: staffUser.id,
            actionDateTime: new Date(),
            actionDescription: "Re-calibrated wireless antenna and adjusted power limits.",
            result: "Signal improved.",
            followUpRequired: true,
            followUpNote: "Check signal strength next Monday in room 201.",
            version: 1,
          },
        },
      },
    });

    const res = await request(app)
      .patch(`/api/staff/tickets/${t.id}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        status: "RESOLVED",
        resolutionSummary: "Adjusted antenna power and verified wireless coverage.",
        expectedVersion: 1,
      });

    expect(res.status).toBe(200);
    expect(res.body.currentStatus).toBe("RESOLVED");
    expect(res.body.resolvedAt).toBeDefined();
    expect(res.body.resolutionSummary).toBe("Adjusted antenna power and verified wireless coverage.");
    expect(res.body.version).toBe(2);
  });

  // -------------------------------------------------------------------------
  // API-10: Resolve ticket without resolutionSummary (AC-09, FR-11, BR-09)
  // -------------------------------------------------------------------------
  it("rejects transition to RESOLVED when resolutionSummary is missing or < 5 chars (API-10, AC-09, FR-11, BR-09)", async () => {
    const t = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-TEST-GATE-03-${Date.now()}`,
        requesterId: requesterUser.id,
        categoryId: 1,
        relatedSystemId: 1,
        summary: "Missing summary gate test",
        description: "Testing resolution summary validation.",
        currentStatus: "IN_PROGRESS",
        version: 1,
        actionsTaken: {
          create: {
            performedById: staffUser.id,
            actionDateTime: new Date(),
            actionDescription: "Installed required application patch.",
            version: 1,
          },
        },
      },
    });

    // 1. Missing resolutionSummary
    const resEmpty = await request(app)
      .patch(`/api/staff/tickets/${t.id}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        status: "RESOLVED",
        expectedVersion: 1,
      });

    expect(resEmpty.status).toBe(400);
    expect(resEmpty.body.error.code).toBe("RESOLUTION_GATE_BLOCKED");
    const codes = resEmpty.body.error.details.map((d: any) => d.code);
    expect(codes).toContain("MISSING_RESOLUTION_SUMMARY");

    // 2. Too short (< 5 chars)
    const resShort = await request(app)
      .patch(`/api/staff/tickets/${t.id}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        status: "RESOLVED",
        resolutionSummary: "Done",
        expectedVersion: 1,
      });

    expect(resShort.status).toBe(400);
    expect(resShort.body.error.code).toBe("RESOLUTION_GATE_BLOCKED");
  });

  // -------------------------------------------------------------------------
  // API-11: Resolve ticket meeting all Resolution Gate criteria (AC-10, FR-10, BR-09)
  // -------------------------------------------------------------------------
  it("successfully transitions to RESOLVED with valid action and summary (API-11, AC-10, FR-10, BR-09)", async () => {
    const t = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-TEST-GATE-04-${Date.now()}`,
        requesterId: requesterUser.id,
        categoryId: 1,
        relatedSystemId: 1,
        summary: "Valid resolution gate test",
        description: "Testing successful resolution transition.",
        currentStatus: "OPEN",
        version: 1,
        actionsTaken: {
          create: {
            performedById: staffUser.id,
            actionDateTime: new Date(),
            actionDescription: "Replaced faulty Ethernet patch cable and tested link.",
            result: "1 Gbps connection verified.",
            version: 1,
          },
        },
      },
    });

    const res = await request(app)
      .patch(`/api/staff/tickets/${t.id}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        status: "RESOLVED",
        resolutionSummary: "Replaced faulty Ethernet patch cable; link tested cleanly at 1 Gbps.",
        expectedVersion: 1,
      });

    expect(res.status).toBe(200);
    expect(res.body.currentStatus).toBe("RESOLVED");
    expect(res.body.resolvedAt).toBeDefined();
    expect(res.body.version).toBe(2);

    // Grandfathered check: RESOLVED -> CLOSED does not repeat gate
    const closeRes = await request(app)
      .patch(`/api/staff/tickets/${t.id}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        status: "CLOSED",
        expectedVersion: 2,
      });

    expect(closeRes.status).toBe(200);
    expect(closeRes.body.currentStatus).toBe("CLOSED");


  });

  // -------------------------------------------------------------------------
  // API-12: Requester flags problemAppearsResolved=true (AC-11, FR-12, BR-10)
  // -------------------------------------------------------------------------
  it("sets problemAppearsResolved without advancing formal status (API-12, AC-11, FR-12, BR-10)", async () => {
    const t = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-TEST-ADVISORY-${Date.now()}`,
        requesterId: requesterUser.id,
        categoryId: 2,
        relatedSystemId: 2,
        summary: "Advisory resolution indicator test",
        description: "Requester indicates problem appears resolved.",
        currentStatus: "IN_PROGRESS",
        version: 1,
      },
    });

    const res = await request(app)
      .post(`/api/tickets/${t.id}/indicate-resolved`)
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(res.status).toBe(200);
    expect(res.body.problemAppearsResolved).toBe(true);
    expect(res.body.problemAppearsResolvedAt).toBeDefined();

    // Verify ticket in DB still has currentStatus = IN_PROGRESS (not RESOLVED)
    const dbTicket = await prisma.ticket.findUnique({ where: { id: t.id } });
    expect(dbTicket?.currentStatus).toBe("IN_PROGRESS");
    expect(dbTicket?.problemAppearsResolved).toBe(true);

    // Verify audit comment was appended
    const comment = await prisma.publicComment.findFirst({
      where: { ticketId: t.id },
      orderBy: { createdAt: "desc" },
    });
    expect(comment?.content).toBe("Requester indicated that the problem appears resolved.");

    // Clean up
    await prisma.publicComment.deleteMany({ where: { ticketId: t.id } });
    await prisma.ticket.delete({ where: { id: t.id } });
  });

  // -------------------------------------------------------------------------
  // API-13: Optimistic Concurrency Conflict Feedback (AC-12, FR-13, BR-11)
  // -------------------------------------------------------------------------
  it("rejects stale expectedVersion with 409 Conflict and current ticket data (API-13, AC-12, FR-13, BR-11)", async () => {
    const t = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-TEST-CONFLICT-${Date.now()}`,
        requesterId: requesterUser.id,
        categoryId: 1,
        relatedSystemId: 1,
        summary: "Optimistic concurrency conflict test",
        description: "Simulating collision.",
        currentStatus: "OPEN",
        version: 3, // Current version on server is 3
      },
    });

    // Client sends stale expectedVersion = 2
    const res = await request(app)
      .patch(`/api/staff/tickets/${t.id}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        status: "IN_PROGRESS",
        expectedVersion: 2,
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe("CONFLICT");
    expect(res.body.error.currentTicket).toBeDefined();
    expect(res.body.error.currentTicket.version).toBe(3);
    expect(res.body.error.currentTicket.currentStatus).toBe("OPEN");

    // Clean up
    await prisma.ticket.delete({ where: { id: t.id } });
  });

  // -------------------------------------------------------------------------
  // API-22: Requester & Staff Ticket Cancellation (FR-10, BR-08)
  // -------------------------------------------------------------------------
  describe("Ticket Cancellation API (API-22, FR-10, BR-08)", () => {
    it("allows Requester to cancel an owned NEW ticket", async () => {
      const t = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-CANCEL-REQ-01-${Date.now()}`,
          requesterId: requesterUser.id,
          categoryId: 1,
          relatedSystemId: 1,
          summary: "Requester cancel owned NEW ticket",
          description: "Testing cancellation of NEW ticket.",
          currentStatus: "NEW",
          version: 1,
        },
      });

      const res = await request(app)
        .patch(`/api/tickets/${t.id}/cancel`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({ expectedVersion: 1 });

      expect(res.status).toBe(200);
      expect(res.body.currentStatus).toBe("CANCELLED");
      expect(res.body.version).toBe(2);

      // Clean up
      await prisma.ticket.delete({ where: { id: t.id } });
    });

    it("rejects Requester attempt to cancel an unowned ticket with 403 Forbidden", async () => {
      const t = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-CANCEL-UNOWNED-${Date.now()}`,
          requesterId: otherRequesterUser.id,
          categoryId: 1,
          relatedSystemId: 1,
          summary: "David ticket",
          description: "Unowned by Jennifer.",
          currentStatus: "NEW",
          version: 1,
        },
      });

      const res = await request(app)
        .patch(`/api/tickets/${t.id}/cancel`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({ expectedVersion: 1 });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");

      // Clean up
      await prisma.ticket.delete({ where: { id: t.id } });
    });

    it("rejects Requester attempt to cancel an owned IN_PROGRESS ticket with 400 INVALID_TRANSITION", async () => {
      const t = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-CANCEL-INPROGRESS-${Date.now()}`,
          requesterId: requesterUser.id,
          categoryId: 1,
          relatedSystemId: 1,
          summary: "In progress cancel attempt",
          description: "Requesters cannot cancel tickets once in progress.",
          currentStatus: "IN_PROGRESS",
          version: 1,
        },
      });

      const res = await request(app)
        .patch(`/api/tickets/${t.id}/cancel`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({ expectedVersion: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_TRANSITION");

      // Clean up
      await prisma.ticket.delete({ where: { id: t.id } });
    });

    it("allows IT Staff to cancel an active ticket (OPEN, IN_PROGRESS)", async () => {
      const t = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-CANCEL-STAFF-${Date.now()}`,
          requesterId: requesterUser.id,
          categoryId: 1,
          relatedSystemId: 1,
          summary: "Staff cancelling open ticket",
          description: "Staff cancellation allowed.",
          currentStatus: "OPEN",
          version: 1,
        },
      });

      const res = await request(app)
        .patch(`/api/tickets/${t.id}/cancel`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ expectedVersion: 1 });

      expect(res.status).toBe(200);
      expect(res.body.currentStatus).toBe("CANCELLED");
      expect(res.body.version).toBe(2);

      // Clean up
      await prisma.ticket.delete({ where: { id: t.id } });
    });
  });

  // -------------------------------------------------------------------------
  // API-23: Ticket Reopen Authorization (FR-10, BR-08)
  // -------------------------------------------------------------------------
  describe("Ticket Reopen API (API-23, FR-10, BR-08)", () => {
    it("allows Requester to reopen an owned RESOLVED ticket", async () => {
      const t = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-REOPEN-REQ-01-${Date.now()}`,
          requesterId: requesterUser.id,
          categoryId: 1,
          relatedSystemId: 1,
          summary: "Requester reopen resolved ticket",
          description: "Issue recurred.",
          currentStatus: "RESOLVED",
          version: 2,
        },
      });

      const res = await request(app)
        .patch(`/api/tickets/${t.id}/reopen`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({ expectedVersion: 2 });

      expect(res.status).toBe(200);
      expect(res.body.currentStatus).toBe("REOPENED");
      expect(res.body.version).toBe(3);

      // Clean up
      await prisma.ticket.delete({ where: { id: t.id } });
    });

    it("rejects Requester attempt to reopen a CLOSED ticket with 400 INVALID_TRANSITION", async () => {
      const t = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-REOPEN-REQ-CLOSED-${Date.now()}`,
          requesterId: requesterUser.id,
          categoryId: 1,
          relatedSystemId: 1,
          summary: "Requester reopen closed ticket",
          description: "Requester cannot reopen closed tickets.",
          currentStatus: "CLOSED",
          version: 1,
        },
      });

      const res = await request(app)
        .patch(`/api/tickets/${t.id}/reopen`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({ expectedVersion: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_TRANSITION");

      // Clean up
      await prisma.ticket.delete({ where: { id: t.id } });
    });

    it("allows IT Staff to reopen a CLOSED ticket", async () => {
      const t = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-REOPEN-STAFF-CLOSED-${Date.now()}`,
          requesterId: requesterUser.id,
          categoryId: 1,
          relatedSystemId: 1,
          summary: "Staff reopen closed ticket",
          description: "Exceptional administrative reopen.",
          currentStatus: "CLOSED",
          version: 4,
        },
      });

      const res = await request(app)
        .patch(`/api/tickets/${t.id}/reopen`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ expectedVersion: 4 });

      expect(res.status).toBe(200);
      expect(res.body.currentStatus).toBe("REOPENED");
      expect(res.body.version).toBe(5);

      // Clean up
      await prisma.ticket.delete({ where: { id: t.id } });
    });

    it("rejects reopening a CANCELLED ticket for all roles (terminal state)", async () => {
      const t = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-REOPEN-CANCELLED-${Date.now()}`,
          requesterId: requesterUser.id,
          categoryId: 1,
          relatedSystemId: 1,
          summary: "Reopen cancelled attempt",
          description: "Cancelled is terminal.",
          currentStatus: "CANCELLED",
          version: 1,
        },
      });

      const res = await request(app)
        .patch(`/api/tickets/${t.id}/reopen`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ expectedVersion: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_TRANSITION");

      // Clean up
      await prisma.ticket.delete({ where: { id: t.id } });
    });
  });
});
