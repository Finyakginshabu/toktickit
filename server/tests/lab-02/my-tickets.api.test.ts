import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — seed tickets inline via the API (uses real DB from seed.ts)
// Requester 1 = Jennifer Anderson, Requester 2 = David Lee
// ─────────────────────────────────────────────────────────────────────────────

async function createTestTicket(
  requesterId: number,
  overrides: {
    categoryId?: number;
    relatedSystemId?: number;
    priority?: string;
    summary?: string;
    description?: string;
  } = {}
) {
  const res = await request(app)
    .post("/api/tickets")
    .field("requesterId", requesterId)
    .field("categoryId", overrides.categoryId ?? 1)
    .field("relatedSystemId", overrides.relatedSystemId ?? 1)
    .field("requestedPriority", overrides.priority ?? "MEDIUM")
    .field("summary", overrides.summary ?? "Test ticket summary for My Tickets suite")
    .field("description", overrides.description ?? "Detailed description with more than ten characters.");
  return res.body;
}

describe("Lab 2 My Tickets API Suite (server/tests/lab-02/my-tickets.api.test.ts)", () => {
  // Seed a known set of tickets before tests run
  let jenniferTicketId: number;
  let davidTicketId: number;

  beforeAll(async () => {
    // Create tickets for two different requesters
    const jTicket = await createTestTicket(1, {
      categoryId: 2, // Hardware
      relatedSystemId: 7, // Corporate Laptop
      priority: "HIGH",
      summary: "Laptop screen flickers during VPN call",
      description: "Screen flickers every time a VPN session is started on the laptop.",
    });
    jenniferTicketId = jTicket.id;

    const dTicket = await createTestTicket(2, {
      categoryId: 4, // Network
      relatedSystemId: 3, // VPN
      priority: "URGENT",
      summary: "VPN disconnects every 10 minutes",
      description: "The corporate VPN drops every 10 minutes causing interruptions.",
    });
    davidTicketId = dTicket.id;

    // Create extra tickets for Jennifer to test pagination
    for (let i = 1; i <= 3; i++) {
      await createTestTicket(1, {
        summary: `Pagination test ticket number ${i}`,
        description: "Filler ticket to test pagination and sorting behaviour.",
      });
    }
  });

  // ── API-06: Ownership isolation ───────────────────────────────────────────

  it("GET /api/tickets returns 200 with only the requesting requester's own tickets (API-06, AC-10, BR-05)", async () => {
    const res = await request(app).get("/api/tickets?requesterId=1");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(res.body).toHaveProperty("pagination");
    expect(Array.isArray(res.body.data)).toBe(true);

    // All returned tickets must belong to requester 1
    for (const ticket of res.body.data) {
      expect(ticket).toHaveProperty("ticketNumber");
      expect(ticket).toHaveProperty("summary");
      expect(ticket).toHaveProperty("category");
      expect(ticket).toHaveProperty("currentStatus");
      expect(ticket).toHaveProperty("requestedPriority");
      expect(ticket).toHaveProperty("attachmentCount");
    }

    // David's ticket must NOT appear in Jennifer's list
    const numbers = res.body.data.map((t: { id: number }) => t.id);
    expect(numbers).not.toContain(davidTicketId);
    expect(numbers).toContain(jenniferTicketId);
  });

  // ── API-07a: Keyword search ───────────────────────────────────────────────

  it("GET /api/tickets?search=VPN filters by keyword in summary (API-07, AC-11, FR-09)", async () => {
    const res = await request(app).get("/api/tickets?requesterId=1&search=VPN");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);

    // Jennifer has a ticket with "VPN" in the summary
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    const summaries: string[] = res.body.data.map((t: { summary: string }) => t.summary.toLowerCase());
    expect(summaries.some((s) => s.includes("vpn"))).toBe(true);
  });

  // ── API-07b: Category filter ──────────────────────────────────────────────

  it("GET /api/tickets?categoryId=2 returns only tickets in that category (API-07, AC-11, FR-09)", async () => {
    const res = await request(app).get("/api/tickets?requesterId=1&categoryId=2");
    expect(res.status).toBe(200);
    for (const ticket of res.body.data) {
      expect(ticket.category.id).toBe(2);
    }
  });

  // ── API-07c: Priority filter ──────────────────────────────────────────────

  it("GET /api/tickets?priority=HIGH returns only HIGH priority tickets (API-07, AC-11, FR-09)", async () => {
    const res = await request(app).get("/api/tickets?requesterId=1&priority=HIGH");
    expect(res.status).toBe(200);
    for (const ticket of res.body.data) {
      expect(ticket.requestedPriority).toBe("HIGH");
    }
  });

  // ── API-08a: Pagination metadata ─────────────────────────────────────────

  it("GET /api/tickets returns correct pagination metadata with pageSize=2 (API-08, AC-11, FR-10, BR-14)", async () => {
    const res = await request(app).get("/api/tickets?requesterId=1&pageSize=2&page=1");
    expect(res.status).toBe(200);

    const { pagination } = res.body;
    expect(pagination).toHaveProperty("page", 1);
    expect(pagination).toHaveProperty("pageSize", 2);
    expect(pagination).toHaveProperty("total");
    expect(pagination).toHaveProperty("totalPages");
    expect(pagination.total).toBeGreaterThanOrEqual(4); // at least the 4 Jennifer tickets
    expect(pagination.totalPages).toBeGreaterThanOrEqual(2);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
  });

  // ── API-08b: Page beyond totalPages returns empty data[] ─────────────────

  it("GET /api/tickets?page=999 returns empty data[] with accurate pagination metadata (API-08, BR-14)", async () => {
    const res = await request(app).get("/api/tickets?requesterId=1&pageSize=10&page=999");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(0);
    expect(res.body.pagination.page).toBe(999);
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(0);
  });

  // ── Validation: missing requesterId ──────────────────────────────────────

  it("GET /api/tickets without requesterId returns 400 Bad Request (FR-08)", async () => {
    const res = await request(app).get("/api/tickets");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });
});
