import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import path from "path";
import fs from "fs";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 Attachments Regression API Suite (server/tests/lab-03/attachments-regression.api.test.ts)", () => {
  const prisma = getPrisma();
  let requesterToken: string;
  let davidToken: string;
  let staffToken: string;
  let ticketId: number;
  let davidTicketId: number;
  let activeAttachmentId: number;
  let softRemovedAttachmentId: number;

  beforeAll(async () => {
    // 1. Log in Jennifer (requester ID 1)
    const jenniferRes = await request(app).post("/api/auth/login").send({
      email: "jennifer.anderson@kmutt.ac.th",
      password: "Password123!",
    });
    requesterToken = jenniferRes.body.token;

    // 2. Log in David (requester ID 2)
    const davidRes = await request(app).post("/api/auth/login").send({
      email: "david.lee@kmutt.ac.th",
      password: "Password123!",
    });
    davidToken = davidRes.body.token;

    // 3. Log in Staff Alice
    const staffRes = await request(app).post("/api/auth/login").send({
      email: "staff.alice@toktickit.local",
      password: "Password123!",
    });
    staffToken = staffRes.body.token;

    // 4. Create ticket for Jennifer
    const t1 = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${requesterToken}`)
      .field("categoryId", "1")
      .field("relatedSystemId", "1")
      .field("summary", "Attachment Regression Ticket Jennifer")
      .field("description", "Testing authenticated attachment lifecycle under Lab 3.")
      .field("requestedPriority", "MEDIUM");
    ticketId = t1.body.id;

    // 5. Create ticket for David
    const t2 = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${davidToken}`)
      .field("categoryId", "2")
      .field("relatedSystemId", "2")
      .field("summary", "Attachment Regression Ticket David")
      .field("description", "Testing cross-ownership access control under Lab 3.")
      .field("requestedPriority", "LOW");
    davidTicketId = t2.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // API-23: Authenticated file upload
  it("POST /api/tickets/:id/attachments with Bearer token uploads file and returns 201 (API-23, AC-15, FR-14)", async () => {
    const fakeBuffer = Buffer.from("Authenticated PDF content sample");
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("Authorization", `Bearer ${requesterToken}`)
      .attach("file", fakeBuffer, {
        filename: "test_auth_doc.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(201);
    expect(res.body.originalName).toBe("test_auth_doc.pdf");
    expect(res.body.mimeType).toBe("application/pdf");
    expect(res.body.isRemoved).toBe(false);
    activeAttachmentId = res.body.id;
  });

  // API-25: Authenticated download
  it("GET /api/attachments/:id/download with Bearer token streams binary (API-25, FR-15)", async () => {
    const res = await request(app)
      .get(`/api/attachments/${activeAttachmentId}/download`)
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(res.status).toBe(200);
    expect(res.header["content-disposition"]).toContain("test_auth_doc.pdf");
  });

  // Ownership enforcement: David cannot download Jennifer's attachment
  it("GET /api/attachments/:id/download denies access to another requester with 403 Forbidden", async () => {
    const res = await request(app)
      .get(`/api/attachments/${activeAttachmentId}/download`)
      .set("Authorization", `Bearer ${davidToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  // IT Staff can download Jennifer's attachment
  it("GET /api/attachments/:id/download allows IT Staff access to any ticket attachment", async () => {
    const res = await request(app)
      .get(`/api/attachments/${activeAttachmentId}/download`)
      .set("Authorization", `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
  });

  // API-26: Soft removal
  it("PATCH /api/attachments/:id/soft-remove marks file removed and saves reason (API-26, AC-17, BR-11, FR-16)", async () => {
    const fakeBuffer = Buffer.from("File to be removed");
    const upRes = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("Authorization", `Bearer ${requesterToken}`)
      .attach("file", fakeBuffer, {
        filename: "file_to_remove.png",
        contentType: "image/png",
      });
    softRemovedAttachmentId = upRes.body.id;

    const res = await request(app)
      .patch(`/api/attachments/${softRemovedAttachmentId}/soft-remove`)
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({ reason: "Uploaded sensitive file by mistake" });

    expect(res.status).toBe(200);
    expect(res.body.isRemoved).toBe(true);
    expect(res.body.removedReason).toBe("Uploaded sensitive file by mistake");
  });

  // API-27: 410 Gone for soft-removed file
  it("GET /api/attachments/:id/download returns 410 Gone for soft-removed file (API-27, AC-18, BR-12)", async () => {
    const res = await request(app)
      .get(`/api/attachments/${softRemovedAttachmentId}/download`)
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe("ATTACHMENT_REMOVED");
  });

  // API-24: 5 active attachment cap
  it("POST /api/tickets/:id/attachments enforces 5 active attachment limit (API-24, AC-16, BR-10)", async () => {
    // Current active count on ticketId is 1 (activeAttachmentId).
    // Upload 4 more to reach 5
    for (let i = 2; i <= 5; i++) {
      const buf = Buffer.from(`Test file payload ${i}`);
      const r = await request(app)
        .post(`/api/tickets/${ticketId}/attachments`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .attach("file", buf, {
          filename: `batch_doc_${i}.pdf`,
          contentType: "application/pdf",
        });
      expect(r.status).toBe(201);
    }

    // 6th upload must be rejected
    const sixthBuf = Buffer.from("Sixth file should fail");
    const failRes = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("Authorization", `Bearer ${requesterToken}`)
      .attach("file", sixthBuf, {
        filename: "overflow.pdf",
        contentType: "application/pdf",
      });

    expect(failRes.status).toBe(400);
    expect(failRes.body.error.code).toBe("ATTACHMENT_CAP_REACHED");
  });
});
