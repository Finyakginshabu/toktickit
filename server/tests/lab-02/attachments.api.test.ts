import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("Lab 2 Attachments API Suite (server/tests/lab-02/attachments.api.test.ts)", () => {
  let ticketId: number;
  let davidTicketId: number;
  let activeAttachmentId: number;
  let softRemovedAttachmentId: number;

  beforeAll(async () => {
    // Create Jennifer's ticket
    const jRes = await request(app)
      .post("/api/tickets")
      .field("requesterId", 1)
      .field("categoryId", 1)
      .field("relatedSystemId", 1)
      .field("summary", "Attachment test ticket for Jennifer")
      .field("description", "Testing attachment operations on this specific ticket.");
    ticketId = jRes.body.id;

    // Create David's ticket
    const dRes = await request(app)
      .post("/api/tickets")
      .field("requesterId", 2)
      .field("categoryId", 1)
      .field("relatedSystemId", 1)
      .field("summary", "David's ticket for cross-access test")
      .field("description", "David's description for testing cross-access authorization.");
    davidTicketId = dRes.body.id;
  });

  // API-11: Add attachment to existing owned ticket
  it("POST /api/tickets/:id/attachments uploads a file and returns 201 (API-11, AC-15, FR-14)", async () => {
    const fileBuffer = Buffer.from("dummy active diagnostic log content");

    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .field("requesterId", 1)
      .attach("file", fileBuffer, "diagnostic_log.png");

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.originalName).toBe("diagnostic_log.png");
    expect(res.body.mimeType).toBe("image/png");
    expect(res.body.isRemoved).toBe(false);

    activeAttachmentId = res.body.id;
  });

  // Download active attachment binary
  it("GET /api/attachments/:id/download streams active file binary (FR-15)", async () => {
    const res = await request(app).get(`/api/attachments/${activeAttachmentId}/download?requesterId=1`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("image/png");
    expect(res.headers["content-disposition"]).toContain("diagnostic_log.png");
  });

  // API-13: Soft-remove attachment with reason
  it("PATCH /api/attachments/:id/soft-remove marks file removed and saves reason (API-13, AC-17, BR-11, FR-16)", async () => {
    // Upload a file to remove
    const fileBuffer = Buffer.from("to be removed file content");
    const uploadRes = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .field("requesterId", 1)
      .attach("file", fileBuffer, "wrong_upload.pdf");
    softRemovedAttachmentId = uploadRes.body.id;

    // Soft-remove with valid reason
    const res = await request(app)
      .patch(`/api/attachments/${softRemovedAttachmentId}/soft-remove`)
      .send({
        requesterId: 1,
        reason: "Uploaded wrong configuration document by mistake",
      });

    expect(res.status).toBe(200);
    expect(res.body.isRemoved).toBe(true);
    expect(res.body.removedReason).toBe("Uploaded wrong configuration document by mistake");
    expect(res.body).toHaveProperty("removedAt");
  });

  // API-14: Download soft-removed attachment binary blocked
  it("GET /api/attachments/:id/download returns 410 Gone for soft-removed file (API-14, AC-18, BR-12)", async () => {
    const res = await request(app).get(
      `/api/attachments/${softRemovedAttachmentId}/download?requesterId=1`
    );
    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe("ATTACHMENT_REMOVED");
  });

  // API-12: Enforce max 5 active attachments
  it("POST /api/tickets/:id/attachments rejects 6th active attachment with 400 (API-12, AC-16, BR-10)", async () => {
    // Current active count on ticketId is 1 (diagnostic_log.png; wrong_upload.pdf was soft-removed)
    // Upload 4 more active files to reach 5 active files
    for (let i = 2; i <= 5; i++) {
      const buf = Buffer.from(`attachment file number ${i}`);
      const r = await request(app)
        .post(`/api/tickets/${ticketId}/attachments`)
        .field("requesterId", 1)
        .attach("file", buf, `active_file_${i}.png`);
      expect(r.status).toBe(201);
    }

    // Now ticketId has exactly 5 active attachments. The 6th active file must be rejected!
    const overflowBuf = Buffer.from("6th active file attempt");
    const overflowRes = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .field("requesterId", 1)
      .attach("file", overflowBuf, "overflow_file.png");

    expect(overflowRes.status).toBe(400);
    expect(overflowRes.body.error.code).toBe("ATTACHMENT_CAP_REACHED");
  });

  // Cross-requester protection
  it("rejects cross-requester attachment upload with 403 Forbidden (AC-14, BR-05)", async () => {
    const buf = Buffer.from("unauthorized upload");
    const res = await request(app)
      .post(`/api/tickets/${davidTicketId}/attachments`)
      .field("requesterId", 1) // Jennifer attempting on David's ticket
      .attach("file", buf, "hacked.png");

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  // Soft-remove validation: short reason < 3 chars
  it("PATCH /api/attachments/:id/soft-remove rejects short reason with 400 Bad Request", async () => {
    const res = await request(app)
      .patch(`/api/attachments/${activeAttachmentId}/soft-remove`)
      .send({
        requesterId: 1,
        reason: "no", // < 3 chars
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });
});
