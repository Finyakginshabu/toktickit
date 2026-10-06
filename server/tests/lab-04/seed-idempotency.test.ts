import { describe, it, expect, afterAll } from "vitest";
import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 4 Seed Idempotency & Coverage Suite (server/tests/lab-04/seed-idempotency.test.ts - MIG-02)", () => {
  const prisma = getPrisma();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("produces zero duplicate records across all entities upon repeated seed executions", async () => {
    // 1. Initial entity counts for canonical seeded records
    const CANONICAL_CATEGORIES = [
      "Account and Access",
      "Hardware",
      "Software",
      "Network",
    ];
    const CANONICAL_SYSTEMS = [
      "Email",
      "Campus Wi-Fi",
      "VPN",
      "LEB2 App",
      "Grade Submission App",
      "Printer",
      "Corporate Laptop",
    ];
    const CANONICAL_USERS = [
      "jennifer.anderson@kmutt.ac.th",
      "david.lee@kmutt.ac.th",
      "sarah.johnson@kmutt.ac.th",
      "michael.brown@kmutt.ac.th",
      "rachel.empty@toktickit.local",
      "alex.inactive@kmutt.ac.th",
      "staff.alice@toktickit.local",
      "staff.bob@toktickit.local",
      "staff.charlie@toktickit.local",
      "staff.inactive@toktickit.local",
      "admin@toktickit.local",
      "firstlogin@toktickit.local",
    ];
    const CANONICAL_TICKETS = [
      "TKT-2026-000001",
      "TKT-2026-000002",
      "TKT-2026-000003",
      "TKT-2026-000004",
      "TKT-2026-000005",
      "TKT-2026-000006",
      "TKT-2026-000007",
      "TKT-2026-000008",
      "TKT-2026-000009",
      "TKT-2026-000010",
      "TKT-2026-000011",
    ];

    // Date cutoff to isolate seeded records from parallel API test noise
    const SEED_CUTOFF = new Date("2026-10-01T00:00:00.000Z");

    const categoriesBefore = await prisma.category.count({
      where: { name: { in: CANONICAL_CATEGORIES } },
    });
    const systemsBefore = await prisma.relatedSystem.count({
      where: { name: { in: CANONICAL_SYSTEMS } },
    });
    const usersBefore = await prisma.user.count({
      where: { email: { in: CANONICAL_USERS } },
    });
    const ticketsBefore = await prisma.ticket.count({
      where: { ticketNumber: { in: CANONICAL_TICKETS } },
    });
    const attachmentsBefore = await prisma.attachment.count({
      where: {
        ticket: { ticketNumber: { in: CANONICAL_TICKETS } },
        uploadedAt: { lt: SEED_CUTOFF },
      },
    });
    const commentsBefore = await prisma.publicComment.count({
      where: {
        ticket: { ticketNumber: { in: CANONICAL_TICKETS } },
        createdAt: { lt: SEED_CUTOFF },
      },
    });
    const notesBefore = await prisma.internalNote.count({
      where: {
        ticket: { ticketNumber: { in: CANONICAL_TICKETS } },
        createdAt: { lt: SEED_CUTOFF },
      },
    });
    const actionsBefore = await prisma.actionTaken.count({
      where: {
        ticket: { ticketNumber: { in: CANONICAL_TICKETS } },
        actionDateTime: { lt: SEED_CUTOFF },
      },
    });

    // 2. Re-run seed script
    const serverDir = fs.existsSync(path.resolve(process.cwd(), "server"))
      ? path.resolve(process.cwd(), "server")
      : path.resolve(process.cwd());
    execSync("npm run prisma:seed", {
      cwd: serverDir,
      stdio: "pipe",
    });

    // 3. Entity counts after repeated execution
    const categoriesAfter = await prisma.category.count({
      where: { name: { in: CANONICAL_CATEGORIES } },
    });
    const systemsAfter = await prisma.relatedSystem.count({
      where: { name: { in: CANONICAL_SYSTEMS } },
    });
    const usersAfter = await prisma.user.count({
      where: { email: { in: CANONICAL_USERS } },
    });
    const ticketsAfter = await prisma.ticket.count({
      where: { ticketNumber: { in: CANONICAL_TICKETS } },
    });
    const attachmentsAfter = await prisma.attachment.count({
      where: {
        ticket: { ticketNumber: { in: CANONICAL_TICKETS } },
        uploadedAt: { lt: SEED_CUTOFF },
      },
    });
    const commentsAfter = await prisma.publicComment.count({
      where: {
        ticket: { ticketNumber: { in: CANONICAL_TICKETS } },
        createdAt: { lt: SEED_CUTOFF },
      },
    });
    const notesAfter = await prisma.internalNote.count({
      where: {
        ticket: { ticketNumber: { in: CANONICAL_TICKETS } },
        createdAt: { lt: SEED_CUTOFF },
      },
    });
    const actionsAfter = await prisma.actionTaken.count({
      where: {
        ticket: { ticketNumber: { in: CANONICAL_TICKETS } },
        actionDateTime: { lt: SEED_CUTOFF },
      },
    });

    // 4. Assert 100% idempotency
    expect(categoriesAfter).toBe(categoriesBefore);
    expect(categoriesAfter).toBe(4);
    expect(systemsAfter).toBe(systemsBefore);
    expect(systemsAfter).toBe(7);
    expect(usersAfter).toBe(usersBefore);
    expect(usersAfter).toBe(12);
    expect(ticketsAfter).toBe(ticketsBefore);
    expect(ticketsAfter).toBe(11);
    expect(attachmentsAfter).toBe(attachmentsBefore);
    expect(commentsAfter).toBe(commentsBefore);
    expect(notesAfter).toBe(notesBefore);
    expect(actionsAfter).toBe(actionsBefore);
  });

  it("verifies seed fixture coverage for testing resolution gates, dashboards, and role eligibility", async () => {
    // 1. Ticket with 0 actions (proves Resolution Gate blockage: AC-07)
    const tkt1 = await prisma.ticket.findUnique({
      where: { ticketNumber: "TKT-2026-000001" },
      include: { actionsTaken: true },
    });
    expect(tkt1).toBeDefined();
    expect(tkt1!.actionsTaken.length).toBe(0);

    // 2. Ticket with 1 action, non-empty result, no follow-up (proves gate pass: AC-10)
    const tkt5 = await prisma.ticket.findUnique({
      where: { ticketNumber: "TKT-2026-000005" },
      include: { actionsTaken: true },
    });
    expect(tkt5).toBeDefined();
    expect(tkt5!.actionsTaken.length).toBe(1);
    expect(tkt5!.actionsTaken[0].result).toBeTruthy();
    expect(tkt5!.actionsTaken[0].followUpRequired).toBe(false);

    // 3. Ticket with multiple actions across different staff performers
    const tkt4 = await prisma.ticket.findUnique({
      where: { ticketNumber: "TKT-2026-000004" },
      include: { actionsTaken: true },
    });
    expect(tkt4).toBeDefined();
    expect(tkt4!.actionsTaken.length).toBeGreaterThanOrEqual(2);
    const performers = new Set(tkt4!.actionsTaken.map((a) => a.performedById));
    expect(performers.size).toBeGreaterThanOrEqual(2);

    // 4. Ticket with a required follow-up flag and note
    const tkt2 = await prisma.ticket.findUnique({
      where: { ticketNumber: "TKT-2026-000002" },
      include: { actionsTaken: true },
    });
    expect(tkt2).toBeDefined();
    const actionWithFollowUp = tkt2!.actionsTaken.find((action) => action.followUpRequired);
    expect(actionWithFollowUp).toBeDefined();
    expect(actionWithFollowUp!.followUpNote).toBeTruthy();

    // 5. Requester with zero tickets (proves empty dashboard state: AC-13)
    const emptyRequester = await prisma.user.findUnique({
      where: { email: "rachel.empty@toktickit.local" },
      include: { requestedTickets: true },
    });
    expect(emptyRequester).toBeDefined();
    expect(emptyRequester!.role).toBe("REQUESTER");
    expect(emptyRequester!.isActive).toBe(true);
    expect(emptyRequester!.requestedTickets.length).toBe(0);

  });
});
