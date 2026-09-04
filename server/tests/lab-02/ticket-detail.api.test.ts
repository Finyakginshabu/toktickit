import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("Lab 2 Ticket Detail API Suite (server/tests/lab-02/ticket-detail.api.test.ts)", () => {
  let jenniferTicketId: number;
  let davidTicketId: number;

  beforeAll(async () => {
    // Create ticket for Jennifer (requesterId: 1)
    const jRes = await request(app)
      .post("/api/tickets")
      .field("requesterId", 1)
      .field("categoryId", 2)
      .field("relatedSystemId", 7)
      .field("requestedPriority", "HIGH")
      .field("summary", "Screen flickers on video call")
      .field("description", "Laptop screen displays flickering artifacts during Teams call.");
    jenniferTicketId = jRes.body.id;

    // Create ticket for David (requesterId: 2)
    const dRes = await request(app)
      .post("/api/tickets")
      .field("requesterId", 2)
      .field("categoryId", 4)
      .field("relatedSystemId", 3)
      .field("requestedPriority", "URGENT")
      .field("summary", "VPN disconnection issues")
      .field("description", "Corporate VPN disconnects repeatedly every 15 minutes.");
    davidTicketId = dRes.body.id;
  });

  // API-09: Retrieve owned Ticket Detail
  it("GET /api/tickets/:id returns 200 with full ticket details for owner (API-09, AC-13, FR-11)", async () => {
    const res = await request(app).get(`/api/tickets/${jenniferTicketId}?requesterId=1`);
    expect(res.status).toBe(200);

    const ticket = res.body;
    expect(ticket.id).toBe(jenniferTicketId);
    expect(ticket.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
    expect(ticket.summary).toBe("Screen flickers on video call");
    expect(ticket.description).toBe("Laptop screen displays flickering artifacts during Teams call.");
    expect(ticket.requestedPriority).toBe("HIGH");
    expect(ticket.itPriority).toBe("HIGH");
    expect(ticket.currentStatus).toBe("NEW");

    // Labeled relations
    expect(ticket.requester.id).toBe(1);
    expect(ticket.requester.name).toBe("Jennifer Anderson");
    expect(ticket.category.name).toBe("Hardware");
    expect(ticket.relatedSystem.name).toBe("Corporate Laptop");
    expect(Array.isArray(ticket.attachments)).toBe(true);
  });

  // API-10: Cross-requester ticket access rejected
  it("GET /api/tickets/:id rejects cross-requester access with 403 Forbidden (API-10, AC-14, BR-05)", async () => {
    // Jennifer (1) attempts to access David's ticket (2)
    const res = await request(app).get(`/api/tickets/${davidTicketId}?requesterId=1`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  // Non-existent ticket
  it("GET /api/tickets/:id returns 404 for non-existent ticket", async () => {
    const res = await request(app).get("/api/tickets/999999?requesterId=1");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  // Missing requesterId
  it("GET /api/tickets/:id without requesterId returns 400 Bad Request", async () => {
    const res = await request(app).get(`/api/tickets/${jenniferTicketId}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });
});
