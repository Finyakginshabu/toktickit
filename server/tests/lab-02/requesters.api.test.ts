import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("Lab 2 Reference Data & Requester APIs", () => {
  it("GET /api/requesters returns 200 with only active requesters (API-05, AC-08)", async () => {
    const res = await request(app).get("/api/requesters");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(4);

    // Verify all returned requesters are active
    const emails = res.body.map((r: { email: string }) => r.email);
    expect(emails).toContain("jennifer.anderson@kmutt.ac.th");
    expect(emails).toContain("david.lee@kmutt.ac.th");
    expect(emails).toContain("sarah.johnson@kmutt.ac.th");
    expect(emails).toContain("michael.brown@kmutt.ac.th");

    // Inactive requester must be excluded
    expect(emails).not.toContain("alex.inactive@kmutt.ac.th");
  });

  it("GET /api/related-systems returns 200 with active related systems", async () => {
    const res = await request(app).get("/api/related-systems");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(7);

    const names = res.body.map((s: { name: string }) => s.name);
    expect(names).toContain("Email");
    expect(names).toContain("Campus Wi-Fi");
    expect(names).toContain("VPN");
    expect(names).toContain("Corporate Laptop");
  });
});
