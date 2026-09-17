import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 Auth API Suite (server/tests/lab-03/auth.api.test.ts)", () => {
  const prisma = getPrisma();

  beforeEach(async () => {
    const salt = await bcrypt.genSalt(10);
    const initialHash = await bcrypt.hash("InitialPassword123!", salt);
    await prisma.user.upsert({
      where: { email: "firstlogin@toktickit.local" },
      update: {
        passwordHash: initialHash,
        mustChangePassword: true,
      },
      create: {
        email: "firstlogin@toktickit.local",
        name: "New Employee",
        role: "REQUESTER",
        passwordHash: initialHash,
        department: "Computer Engineering",
        isActive: true,
        mustChangePassword: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // API-01: Login with valid credentials
  it("POST /api/auth/login returns JWT token and sanitized profile for active user (API-01, FR-01, AC-01)", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "jennifer.anderson@kmutt.ac.th",
      password: "Password123!",
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(typeof res.body.token).toBe("string");
    expect(res.body.user).toMatchObject({
      email: "jennifer.anderson@kmutt.ac.th",
      name: "Jennifer Anderson",
      role: "REQUESTER",
      mustChangePassword: false,
    });
    expect(res.body.user).not.toHaveProperty("passwordHash");
  });

  // API-02: Login with invalid password
  it("POST /api/auth/login rejects wrong password with 401 Unauthorized (API-02, BR-01, AC-02)", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "jennifer.anderson@kmutt.ac.th",
      password: "IncorrectPassword123!",
    });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  // API-03: Login with inactive account
  it("POST /api/auth/login rejects inactive user with 401 Unauthorized (API-03, BR-01, AC-02)", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "alex.inactive@kmutt.ac.th",
      password: "Password123!",
    });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("POST /api/auth/login rejects missing credentials with 400 Bad Request", async () => {
    const res = await request(app).post("/api/auth/login").send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });

  // API-29: GET /api/auth/me
  it("GET /api/auth/me retrieves authenticated user profile (API-29, FR-03, AC-03)", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "staff.alice@toktickit.local",
      password: "Password123!",
    });
    const token = loginRes.body.token;

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      email: "staff.alice@toktickit.local",
      role: "IT_STAFF",
      name: "Alice Support",
    });
  });

  it("POST /api/auth/logout invalidates session (FR-02, AC-04)", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "admin@toktickit.local",
      password: "AdminPass123!",
    });
    const token = loginRes.body.token;

    const res = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Logged out successfully");
  });

  // API-28: Route guard for mustChangePassword
  it("intercepts general endpoints with 403 PASSWORD_CHANGE_REQUIRED when mustChangePassword = true (API-28, BR-02, AC-05)", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "firstlogin@toktickit.local",
      password: "InitialPassword123!",
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.mustChangePassword).toBe(true);
    const token = loginRes.body.token;

    // Accessing ticket queue or my tickets should be blocked
    const blockedRes = await request(app)
      .get("/api/tickets/my-tickets")
      .set("Authorization", `Bearer ${token}`);

    expect(blockedRes.status).toBe(403);
    expect(blockedRes.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");

    // Accessing /api/auth/me is allowed
    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(meRes.status).toBe(200);
  });

  // API-04: Change password and enforce complexity
  it("POST /api/auth/change-password validates complexity and completes password change (API-04, BR-02, BR-06, AC-06)", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "firstlogin@toktickit.local",
      password: "InitialPassword123!",
    });
    const token = loginRes.body.token;

    // Test complexity rejection: too short
    const shortRes = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({
        currentPassword: "InitialPassword123!",
        newPassword: "short",
      });
    expect(shortRes.status).toBe(400);
    expect(shortRes.body.error.code).toBe("VALIDATION_ERROR");

    // Test same password rejection
    const sameRes = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({
        currentPassword: "InitialPassword123!",
        newPassword: "InitialPassword123!",
      });
    expect(sameRes.status).toBe(400);

    // Test valid password change
    const validRes = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({
        currentPassword: "InitialPassword123!",
        newPassword: "UpdatedSecurePassword2026!",
      });
    expect(validRes.status).toBe(200);
    expect(validRes.body.mustChangePassword).toBe(false);

    // Verify subsequent login with new password
    const reLogin = await request(app).post("/api/auth/login").send({
      email: "firstlogin@toktickit.local",
      password: "UpdatedSecurePassword2026!",
    });
    expect(reLogin.status).toBe(200);
    expect(reLogin.body.user.mustChangePassword).toBe(false);

    // Verify protected endpoints are now accessible
    const unblockedRes = await request(app)
      .get("/api/tickets/my-tickets")
      .set("Authorization", `Bearer ${reLogin.body.token}`);
    expect(unblockedRes.status).toBe(200);
  });
});
