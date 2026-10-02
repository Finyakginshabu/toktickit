import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 4 Migration & Schema Evolution Suite (server/tests/lab-04/migration.test.ts - MIG-01)", () => {
  const prisma = getPrisma();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ---------------------------------------------------------------------------
  // 1. Schema Additions & Data Preservation
  // ---------------------------------------------------------------------------
  it("preserves legacy tickets, users, and categories while adding ActionTaken", async () => {
    const userCount = await prisma.user.count();
    const categoryCount = await prisma.category.count();
    const ticketCount = await prisma.ticket.count();

    expect(userCount).toBeGreaterThanOrEqual(10);
    expect(categoryCount).toBeGreaterThanOrEqual(4);
    expect(ticketCount).toBeGreaterThanOrEqual(8);
  });

  it("verifies Ticket schema has resolvedAt, version (default 1), and updatedAt index", async () => {
    // Check columns and defaults
    const columns: Array<{ column_name: string; column_default: string | null; is_nullable: string }> =
      await prisma.$queryRawUnsafe(`
        SELECT column_name, column_default, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'Ticket' AND column_name IN ('resolvedAt', 'version')
      `);

    const colMap = new Map(columns.map((c) => [c.column_name, c]));
    expect(colMap.has("resolvedAt")).toBe(true);
    expect(colMap.has("version")).toBe(true);
    expect(colMap.get("version")?.column_default).toMatch(/1/);

    // Check index on updatedAt
    const indexes: Array<{ indexname: string }> = await prisma.$queryRawUnsafe(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'Ticket' AND indexname = 'Ticket_updatedAt_idx'
    `);
    expect(indexes.length).toBe(1);
  });

  it("verifies resolvedAt is backfilled on legacy RESOLVED and CLOSED tickets", async () => {
    const legacyTickets = await prisma.ticket.findMany({
      where: {
        ticketNumber: { in: ["TKT-2026-000005", "TKT-2026-000009"] },
      },
      select: {
        id: true,
        ticketNumber: true,
        currentStatus: true,
        resolvedAt: true,
        updatedAt: true,
      },
    });

    expect(legacyTickets.length).toBe(2);
    for (const ticket of legacyTickets) {
      expect(ticket.resolvedAt).not.toBeNull();
      expect(ticket.resolvedAt).toBeInstanceOf(Date);
    }
  });

  it("verifies ActionTaken table structure, unique constraint on clientActionId, and indexes", async () => {
    const columns: Array<{ column_name: string }> = await prisma.$queryRawUnsafe(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'ActionTaken'
    `);
    const colNames = columns.map((c) => c.column_name);

    const requiredColumns = [
      "id",
      "ticketId",
      "performedById",
      "assigneeId",
      "actionDateTime",
      "actionDescription",
      "result",
      "status",
      "followUpRequired",
      "followUpNote",
      "followUpResolvedAt",
      "attachmentNotes",
      "cancellationReason",
      "clientActionId",
      "version",
      "createdAt",
      "updatedAt",
    ];

    for (const col of requiredColumns) {
      expect(colNames).toContain(col);
    }

    // Verify composite and performance indexes
    const indexes: Array<{ indexname: string }> = await prisma.$queryRawUnsafe(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'ActionTaken'
    `);
    const idxNames = indexes.map((i) => i.indexname);

    expect(idxNames).toContain("ActionTaken_clientActionId_key");
    expect(idxNames).toContain("ActionTaken_ticketId_actionDateTime_idx");
    expect(idxNames).toContain("ActionTaken_ticketId_status_idx");
    expect(idxNames).toContain("ActionTaken_performedById_idx");
    expect(idxNames).toContain("ActionTaken_assigneeId_idx");
  });

  // ---------------------------------------------------------------------------
  // 2. Append-Only Integrity & Direct Delete Trigger
  // ---------------------------------------------------------------------------
  it("rejects direct physical deletion on ActionTaken via PostgreSQL BEFORE DELETE trigger", async () => {
    const staffUser = await prisma.user.findFirst({ where: { role: "IT_STAFF", isActive: true } });
    const requester = await prisma.user.findFirst({ where: { role: "REQUESTER", isActive: true } });
    const category = await prisma.category.findFirst();
    const system = await prisma.relatedSystem.findFirst();

    expect(staffUser).toBeDefined();
    expect(requester).toBeDefined();
    expect(category).toBeDefined();
    expect(system).toBeDefined();

    // Create a dedicated isolated test ticket
    const tempTicket = await prisma.ticket.upsert({
      where: { ticketNumber: "TKT-TEST-MIG01" },
      update: {},
      create: {
        ticketNumber: "TKT-TEST-MIG01",
        requesterId: requester!.id,
        categoryId: category!.id,
        relatedSystemId: system!.id,
        summary: "Dedicated ticket for migration trigger test",
        description: "Temporary ticket to verify append-only delete rejection",
        currentStatus: "NEW",
      },
    });

    const testAction = await prisma.actionTaken.create({
      data: {
        ticketId: tempTicket.id,
        performedById: staffUser!.id,
        actionDescription: "Temporary diagnostic action to verify delete rejection",
        status: "COMPLETED",
        result: "Verified trigger blocking",
      },
    });

    // 2. Attempt direct SQL DELETE; assert trigger raises exception
    await expect(
      prisma.$executeRawUnsafe(`DELETE FROM "ActionTaken" WHERE id = ${testAction.id}`)
    ).rejects.toThrow(/ActionTaken records are append-only and cannot be deleted/i);

    // 3. Verify record is still intact
    const remaining = await prisma.actionTaken.findUnique({ where: { id: testAction.id } });
    expect(remaining).not.toBeNull();
  });

  it("enforces onDelete: Restrict preventing cascade deletion of Ticket with actions", async () => {
    // 1. Find the test ticket with associated ActionTaken
    const tempTicket = await prisma.ticket.findUnique({
      where: { ticketNumber: "TKT-TEST-MIG01" },
    });
    expect(tempTicket).toBeDefined();

    // 2. Attempt to delete the parent Ticket; assert foreign key restrict violation
    await expect(
      prisma.$executeRawUnsafe(`DELETE FROM "Ticket" WHERE id = ${tempTicket!.id}`)
    ).rejects.toThrow();
  });

  it("verifies trigger rollback removes trigger cleanly and re-creation restores protection", async () => {
    // 1. Drop trigger temporarily to simulate rollback
    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS trg_prevent_action_taken_delete ON "ActionTaken"`);

    // Verify trigger is gone
    const triggerCheckAfterDrop: Array<{ trigger_name: string }> = await prisma.$queryRawUnsafe(`
      SELECT trigger_name
      FROM information_schema.triggers
      WHERE event_object_table = 'ActionTaken' AND trigger_name = 'trg_prevent_action_taken_delete'
    `);
    expect(triggerCheckAfterDrop.length).toBe(0);

    // Clean up temporary test ticket actions while trigger is dropped
    await prisma.$executeRawUnsafe(`DELETE FROM "ActionTaken" WHERE "actionDescription" LIKE '%Temporary diagnostic%'`);

    const tempTicket = await prisma.ticket.findUnique({
      where: { ticketNumber: "TKT-TEST-MIG01" },
    });
    if (tempTicket) {
      await prisma.$executeRawUnsafe(`DELETE FROM "ActionTaken" WHERE "ticketId" = ${tempTicket.id}`);
      await prisma.$executeRawUnsafe(`DELETE FROM "Ticket" WHERE id = ${tempTicket.id}`);
    }

    // Also clean up any accidental actions on TKT-2026-000001 (which must have 0 actions)
    const tkt1 = await prisma.ticket.findUnique({ where: { ticketNumber: "TKT-2026-000001" } });
    if (tkt1) {
      await prisma.$executeRawUnsafe(`DELETE FROM "ActionTaken" WHERE "ticketId" = ${tkt1.id}`);
    }

    // 2. Re-install trigger to restore full protection
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER trg_prevent_action_taken_delete
      BEFORE DELETE ON "ActionTaken"
      FOR EACH ROW EXECUTE FUNCTION prevent_action_taken_delete();
    `);

    const triggerCheckAfterRestore: Array<{ trigger_name: string }> = await prisma.$queryRawUnsafe(`
      SELECT trigger_name
      FROM information_schema.triggers
      WHERE event_object_table = 'ActionTaken' AND trigger_name = 'trg_prevent_action_taken_delete'
    `);
    expect(triggerCheckAfterRestore.length).toBe(1);
  });
});
