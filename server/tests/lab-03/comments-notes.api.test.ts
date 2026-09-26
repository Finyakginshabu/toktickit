import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 Discussions Stream API Suite (server/tests/lab-03/comments-notes.api.test.ts)", () => {
  const prisma = getPrisma();
  let jenniferToken: string;
  let davidToken: string;
  let staffAliceToken: string;
  let staffBobToken: string;

  let testTicketId: number;

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
    const saRes = await request(app).post("/api/auth/login").send({
      email: "staff.alice@toktickit.local",
      password: "Password123!",
    });
    staffAliceToken = saRes.body.token;

    // 4. Log in Staff Bob (IT Staff)
    const sbRes = await request(app).post("/api/auth/login").send({
      email: "staff.bob@toktickit.local",
      password: "Password123!",
    });
    staffBobToken = sbRes.body.token;

    // 5. Create a ticket owned by Jennifer
    const tRes = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${jenniferToken}`)
      .field("categoryId", "1")
      .field("relatedSystemId", "1")
      .field("summary", "Comments & Notes Test Ticket")
      .field("description", "Ticket to test Public Comments and Internal Notes streams.")
      .field("requestedPriority", "MEDIUM");

    testTicketId = tRes.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // =========================================================================
  // API-15: Public Comments (AC-16, FR-13, BR-15)
  // =========================================================================
  it("allows ticket requester to post a public comment (API-15, AC-16, FR-13, BR-15)", async () => {
    const res = await request(app)
      .post(`/api/tickets/${testTicketId}/comments`)
      .set("Authorization", `Bearer ${jenniferToken}`)
      .send({ content: "Requester follow-up comment." });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.ticketId).toBe(testTicketId);
    expect(res.body.content).toBe("Requester follow-up comment.");
    expect(res.body.author.name).toBe("Jennifer Anderson");
    expect(res.body.author.role).toBe("REQUESTER");
  });

  it("allows IT Staff to post a public comment on any ticket (API-15, AC-16, FR-13)", async () => {
    const res = await request(app)
      .post(`/api/tickets/${testTicketId}/comments`)
      .set("Authorization", `Bearer ${staffAliceToken}`)
      .send({ content: "Staff response to requester." });

    expect(res.status).toBe(201);
    expect(res.body.content).toBe("Staff response to requester.");
    expect(res.body.author.name).toBe("Alice Support");
    expect(res.body.author.role).toBe("IT_STAFF");
  });

  it("allows both Requester and IT Staff to retrieve public comments (API-15, AC-16, BR-04)", async () => {
    const reqRes = await request(app)
      .get(`/api/tickets/${testTicketId}/comments`)
      .set("Authorization", `Bearer ${jenniferToken}`);

    expect(reqRes.status).toBe(200);
    expect(Array.isArray(reqRes.body)).toBe(true);
    expect(reqRes.body.length).toBeGreaterThanOrEqual(2);

    const staffRes = await request(app)
      .get(`/api/tickets/${testTicketId}/comments`)
      .set("Authorization", `Bearer ${staffBobToken}`);

    expect(staffRes.status).toBe(200);
    expect(staffRes.body.length).toBe(reqRes.body.length);
  });

  it("rejects empty or whitespace-only public comments with 400 Bad Request (API-15, BR-15)", async () => {
    const res = await request(app)
      .post(`/api/tickets/${testTicketId}/comments`)
      .set("Authorization", `Bearer ${jenniferToken}`)
      .send({ content: "    " });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });

  it("rejects public comment exceeding 2000 characters with 400 Bad Request (API-15, BR-15)", async () => {
    const longContent = "A".repeat(2001);
    const res = await request(app)
      .post(`/api/tickets/${testTicketId}/comments`)
      .set("Authorization", `Bearer ${jenniferToken}`)
      .send({ content: longContent });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });

  it("rejects cross-requester public comment submission with 403 Forbidden", async () => {
    const res = await request(app)
      .post(`/api/tickets/${testTicketId}/comments`)
      .set("Authorization", `Bearer ${davidToken}`)
      .send({ content: "Unauthorized comment from David" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("rejects cross-requester public comments retrieval with 403 Forbidden", async () => {
    const res = await request(app)
      .get(`/api/tickets/${testTicketId}/comments`)
      .set("Authorization", `Bearer ${davidToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  // =========================================================================
  // API-16: Internal Notes (AC-17, FR-14, BR-15, BR-16)
  // =========================================================================
  it("allows IT Staff to post an internal note (API-16, AC-17, FR-14, BR-15)", async () => {
    const res = await request(app)
      .post(`/api/tickets/${testTicketId}/notes`)
      .set("Authorization", `Bearer ${staffAliceToken}`)
      .send({ content: "Internal diagnostic finding on firewall port." });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.ticketId).toBe(testTicketId);
    expect(res.body.content).toBe("Internal diagnostic finding on firewall port.");
    expect(res.body.author.name).toBe("Alice Support");
    expect(res.body.author.role).toBe("IT_STAFF");
  });

  it("allows other IT Staff to retrieve internal notes (API-16, AC-17, BR-04)", async () => {
    const res = await request(app)
      .get(`/api/tickets/${testTicketId}/notes`)
      .set("Authorization", `Bearer ${staffBobToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].content).toContain("Internal diagnostic finding");
  });

  it("strictly rejects Requester access to internal notes with 403 Forbidden without disclosing data (API-16, AC-04, BR-16)", async () => {
    // Attempt GET
    const getRes = await request(app)
      .get(`/api/tickets/${testTicketId}/notes`)
      .set("Authorization", `Bearer ${jenniferToken}`);

    expect(getRes.status).toBe(403);
    expect(getRes.body.error.code).toBe("FORBIDDEN");
    expect(getRes.body.notes).toBeUndefined();

    // Attempt POST
    const postRes = await request(app)
      .post(`/api/tickets/${testTicketId}/notes`)
      .set("Authorization", `Bearer ${jenniferToken}`)
      .send({ content: "Requester attempt to post note" });

    expect(postRes.status).toBe(403);
    expect(postRes.body.error.code).toBe("FORBIDDEN");
  });

  it("rejects empty or whitespace-only internal note with 400 Bad Request (API-16, BR-15)", async () => {
    const res = await request(app)
      .post(`/api/tickets/${testTicketId}/notes`)
      .set("Authorization", `Bearer ${staffAliceToken}`)
      .send({ content: "     " });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });

  it("rejects internal note exceeding 2000 characters with 400 Bad Request (API-16, BR-15)", async () => {
    const longContent = "B".repeat(2001);
    const res = await request(app)
      .post(`/api/tickets/${testTicketId}/notes`)
      .set("Authorization", `Bearer ${staffAliceToken}`)
      .send({ content: longContent });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });
});
