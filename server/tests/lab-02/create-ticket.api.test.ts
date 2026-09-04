import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("Lab 2 Create Ticket API Suite (server/tests/lab-02/create-ticket.api.test.ts)", () => {
  // API-05: Retrieve Requesters endpoint
  it("GET /api/requesters returns 200 with only active requesters (API-05, AC-08)", async () => {
    const res = await request(app).get("/api/requesters");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(4);

    const emails = res.body.map((r: { email: string }) => r.email);
    expect(emails).toContain("jennifer.anderson@kmutt.ac.th");
    expect(emails).toContain("david.lee@kmutt.ac.th");
    expect(emails).not.toContain("alex.inactive@kmutt.ac.th");
  });

  // API-01: Create valid ticket
  it("POST /api/tickets creates a valid ticket and returns 201 with unique ticketNumber and status NEW (API-01, AC-01, BR-01, BR-02)", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .field("requesterId", 1)
      .field("categoryId", 1)
      .field("relatedSystemId", 1)
      .field("requestedPriority", "HIGH")
      .field("summary", "Cannot log in to campus email portal")
      .field("description", "Password reset link is not arriving in alternate inbox after multiple attempts.");

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
    expect(res.body.currentStatus).toBe("NEW");
    expect(res.body.requestedPriority).toBe("HIGH");
    expect(res.body.summary).toBe("Cannot log in to campus email portal");
    expect(res.body.requester.name).toBe("Jennifer Anderson");
    expect(res.body.category.name).toBe("Account and Access");
    expect(res.body.relatedSystem.name).toBe("Email");
  });

  // API-02: Form validation on invalid input
  it("POST /api/tickets rejects short summary (<5 chars) or short description (<10 chars) with 400 (API-02, AC-02, BR-06)", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .field("requesterId", 1)
      .field("categoryId", 1)
      .field("relatedSystemId", 1)
      .field("summary", "Help") // too short (<5)
      .field("description", "Short"); // too short (<10)

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty("details");
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toContain("summary");
    expect(fields).toContain("description");
  });

  // API-03: Create ticket with valid attachments
  it("POST /api/tickets saves valid file attachments (API-03, AC-03, BR-09)", async () => {
    const fakeBuffer = Buffer.from("fake-image-content-for-testing");

    const res = await request(app)
      .post("/api/tickets")
      .field("requesterId", 1)
      .field("categoryId", 2)
      .field("relatedSystemId", 7)
      .field("requestedPriority", "MEDIUM")
      .field("summary", "Laptop screen flickering after update")
      .field("description", "The display flickers intermittently every few minutes during video calls.")
      .attach("attachments", fakeBuffer, {
        filename: "screenshot.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(201);
    expect(res.body.attachments.length).toBe(1);
    expect(res.body.attachments[0].originalName).toBe("screenshot.png");
    expect(res.body.attachments[0].mimeType).toBe("image/png");
    expect(res.body.attachments[0].isRemoved).toBe(false);
  });

  // API-04: Reject attachment exceeding 5 MB limit
  it("POST /api/tickets rejects file exceeding 5 MB with 413 Payload Too Large (API-04, AC-04, BR-09)", async () => {
    // 5.5 MB buffer (5.5 * 1024 * 1024)
    const oversizedBuffer = Buffer.alloc(5.5 * 1024 * 1024);

    const res = await request(app)
      .post("/api/tickets")
      .field("requesterId", 1)
      .field("categoryId", 2)
      .field("relatedSystemId", 7)
      .field("summary", "Oversized upload test ticket")
      .field("description", "Testing that files exceeding 5 megabytes are rejected cleanly.")
      .attach("attachments", oversizedBuffer, {
        filename: "giant_log.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });
});
