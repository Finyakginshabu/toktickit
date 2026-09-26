import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 Admin User Management API Suite (server/tests/lab-03/users-admin.api.test.ts)", () => {
  const prisma = getPrisma();
  let adminToken: string;
  let adminId: number;

  beforeAll(async () => {
    // 1. Ensure primary admin exists
    const salt = await bcrypt.genSalt(10);
    const adminHash = await bcrypt.hash("AdminPass123!", salt);
    const adminUser = await prisma.user.upsert({
      where: { email: "admin@toktickit.local" },
      update: {
        passwordHash: adminHash,
        isActive: true,
        role: "ADMINISTRATOR",
      },
      create: {
        email: "admin@toktickit.local",
        name: "System Administrator",
        role: "ADMINISTRATOR",
        passwordHash: adminHash,
        isActive: true,
        mustChangePassword: false,
      },
    });
    adminId = adminUser.id;

    // 2. Obtain admin JWT token
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "admin@toktickit.local",
      password: "AdminPass123!",
    });
    adminToken = loginRes.body.token;
  });

  afterAll(async () => {
    // Cleanup any created test users
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "test.created@toktickit.local",
            "test.edit@toktickit.local",
            "test.duplicate@toktickit.local",
            "test.resetpass@toktickit.local",
            "auxiliary.admin@toktickit.local",
          ],
        },
      },
    });
    await prisma.$disconnect();
  });

  // ---------------------------------------------------------------------------
  // API-17: Admin lists users with search and filter (AC-18, FR-15)
  // ---------------------------------------------------------------------------
  describe("GET /api/admin/users (API-17, AC-18, FR-15)", () => {
    it("returns all users with Name, Email, Role, Status, and without passwordHash", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const first = res.body[0];
      expect(first).toHaveProperty("id");
      expect(first).toHaveProperty("name");
      expect(first).toHaveProperty("email");
      expect(first).toHaveProperty("role");
      expect(first).toHaveProperty("isActive");
      expect(first).toHaveProperty("mustChangePassword");
      expect(first).not.toHaveProperty("passwordHash");
    });

    it("filters users by role correctly", async () => {
      const res = await request(app)
        .get("/api/admin/users?role=IT_STAFF")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      for (const u of res.body) {
        expect(u.role).toBe("IT_STAFF");
      }
    });

    it("filters users by search query matching name or email case-insensitively", async () => {
      const res = await request(app)
        .get("/api/admin/users?search=jennifer")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      for (const u of res.body) {
        const matches =
          u.name.toLowerCase().includes("jennifer") ||
          u.email.toLowerCase().includes("jennifer");
        expect(matches).toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // API-18: Admin creates user with initial password (AC-19, FR-16, BR-07, BR-17)
  // ---------------------------------------------------------------------------
  describe("POST /api/admin/users (API-18, AC-19, FR-16, BR-07, BR-17)", () => {
    it("creates a new user with mustChangePassword = true", async () => {
      // Clean up if leftover
      await prisma.user.deleteMany({
        where: { email: "test.created@toktickit.local" },
      });

      const res = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Test Created User",
          email: "test.created@toktickit.local",
          role: "IT_STAFF",
          isActive: true,
          initialPassword: "InitialSecure123!",
        });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        name: "Test Created User",
        email: "test.created@toktickit.local",
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: true,
      });
      expect(res.body).not.toHaveProperty("passwordHash");
    });

    it("rejects duplicate email with 409 Conflict (BR-11)", async () => {
      const res = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Duplicate Email Attempt",
          email: "test.created@toktickit.local",
          role: "REQUESTER",
          isActive: true,
          initialPassword: "InitialSecure123!",
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("CONFLICT");
    });

    it("rejects invalid password complexity with 400 VALIDATION_ERROR (BR-06)", async () => {
      const res = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Weak Password User",
          email: "weakpass@toktickit.local",
          role: "REQUESTER",
          isActive: true,
          initialPassword: "weak",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(Array.isArray(res.body.error.details)).toBe(true);
    });

    it("rejects invalid role with 400 Bad Request (BR-07)", async () => {
      const res = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Invalid Role User",
          email: "invalidrole@toktickit.local",
          role: "SUPERUSER",
          isActive: true,
          initialPassword: "InitialSecure123!",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("BAD_REQUEST");
    });
  });

  // ---------------------------------------------------------------------------
  // API-19: Admin edits user details (AC-20, FR-17, BR-11)
  // ---------------------------------------------------------------------------
  describe("PATCH /api/admin/users/:id (API-19, AC-20, FR-17, BR-11)", () => {
    let testUserId: number;

    beforeAll(async () => {
      const salt = await bcrypt.genSalt(10);
      const userHash = await bcrypt.hash("Password123!", salt);
      const user = await prisma.user.upsert({
        where: { email: "test.edit@toktickit.local" },
        update: {
          name: "Editable User",
          role: "REQUESTER",
          isActive: true,
        },
        create: {
          email: "test.edit@toktickit.local",
          name: "Editable User",
          role: "REQUESTER",
          passwordHash: userHash,
          isActive: true,
          mustChangePassword: false,
        },
      });
      testUserId = user.id;
    });

    it("updates user details and retaining own email succeeds without 409 conflict (AC-20, BR-11)", async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${testUserId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Edited User Name",
          email: "test.edit@toktickit.local", // retaining existing email
          role: "IT_STAFF",
          isActive: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Edited User Name");
      expect(res.body.email).toBe("test.edit@toktickit.local");
      expect(res.body.role).toBe("IT_STAFF");
      expect(res.body.isActive).toBe(true);
    });

    it("rejects updating to an email already in use by another user with 409 Conflict", async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${testUserId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          email: "admin@toktickit.local", // Taken by admin
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("CONFLICT");
    });
  });

  // ---------------------------------------------------------------------------
  // API-20: Admin attempts self-deactivation (AC-21, FR-19, BR-08)
  // ---------------------------------------------------------------------------
  describe("Admin Self-Deactivation Guard (API-20, AC-21, FR-19, BR-08)", () => {
    let secondAdminId: number;
    let secondAdminToken: string;

    beforeAll(async () => {
      // Create a second active admin to ensure multiple admins exist
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash("AdminPass123!", salt);
      const secondAdmin = await prisma.user.upsert({
        where: { email: "auxiliary.admin@toktickit.local" },
        update: {
          passwordHash: hash,
          isActive: true,
          role: "ADMINISTRATOR",
        },
        create: {
          email: "auxiliary.admin@toktickit.local",
          name: "Auxiliary Administrator",
          role: "ADMINISTRATOR",
          passwordHash: hash,
          isActive: true,
          mustChangePassword: false,
        },
      });
      secondAdminId = secondAdmin.id;

      const loginRes = await request(app).post("/api/auth/login").send({
        email: "auxiliary.admin@toktickit.local",
        password: "AdminPass123!",
      });
      secondAdminToken = loginRes.body.token;
    });

    it("rejects an Administrator attempting to deactivate their own account with 400 Bad Request", async () => {
      // auxiliary admin tries to deactivate auxiliary admin
      const res = await request(app)
        .patch(`/api/admin/users/${secondAdminId}`)
        .set("Authorization", `Bearer ${secondAdminToken}`)
        .send({
          isActive: false,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("BAD_REQUEST");
      expect(res.body.error.message).toContain("cannot deactivate their own account");
    });
  });

  // ---------------------------------------------------------------------------
  // API-21: Admin deactivates last active Admin (AC-22, FR-19, BR-09)
  // ---------------------------------------------------------------------------
  describe("Last Active Admin Protection Guard (API-21, AC-22, FR-19, BR-09)", () => {
    beforeAll(async () => {
      // Ensure only 1 active admin exists for this test
      await prisma.user.deleteMany({
        where: { email: "auxiliary.admin@toktickit.local" },
      });
    });

    it("rejects deactivating the last active Administrator with 400 Bad Request", async () => {
      // adminId is the sole remaining active admin
      const res = await request(app)
        .patch(`/api/admin/users/${adminId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          isActive: false,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("BAD_REQUEST");
    });

    it("rejects demoting the role of the last active Administrator with 400 Bad Request", async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${adminId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          role: "IT_STAFF",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("BAD_REQUEST");
      expect(res.body.error.message).toContain("last active Administrator");
    });
  });

  // ---------------------------------------------------------------------------
  // API-22: Admin resets user initial password (AC-23, FR-18, BR-17)
  // ---------------------------------------------------------------------------
  describe("POST /api/admin/users/:id/reset-password (API-22, AC-23, FR-18, BR-17)", () => {
    let targetUserId: number;

    beforeAll(async () => {
      const salt = await bcrypt.genSalt(10);
      const userHash = await bcrypt.hash("Password123!", salt);
      const user = await prisma.user.upsert({
        where: { email: "test.resetpass@toktickit.local" },
        update: {
          mustChangePassword: false,
          passwordHash: userHash,
        },
        create: {
          email: "test.resetpass@toktickit.local",
          name: "Password Reset Target",
          role: "REQUESTER",
          passwordHash: userHash,
          isActive: true,
          mustChangePassword: false,
        },
      });
      targetUserId = user.id;
    });

    it("sets new password and marks mustChangePassword = true", async () => {
      const res = await request(app)
        .post(`/api/admin/users/${targetUserId}/reset-password`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          initialPassword: "NewTempPassword2026!",
        });

      expect(res.status).toBe(200);
      expect(res.body.mustChangePassword).toBe(true);

      // Verify in database that mustChangePassword was set to true
      const updatedInDb = await prisma.user.findUnique({
        where: { id: targetUserId },
      });
      expect(updatedInDb?.mustChangePassword).toBe(true);

      // Verify that user can log in with new password
      const loginRes = await request(app).post("/api/auth/login").send({
        email: "test.resetpass@toktickit.local",
        password: "NewTempPassword2026!",
      });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.user.mustChangePassword).toBe(true);
    });

    it("rejects password reset with weak password (BR-06)", async () => {
      const res = await request(app)
        .post(`/api/admin/users/${targetUserId}/reset-password`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          initialPassword: "short",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });
});
