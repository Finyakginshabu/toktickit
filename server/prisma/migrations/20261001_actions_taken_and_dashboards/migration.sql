-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- AlterTable Ticket: add resolvedAt, version, and create index on updatedAt
ALTER TABLE "Ticket" ADD COLUMN "resolvedAt" TIMESTAMP(3),
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- Backfill resolvedAt for existing RESOLVED and CLOSED tickets
UPDATE "Ticket"
SET "resolvedAt" = "updatedAt"
WHERE "currentStatus" IN ('RESOLVED', 'CLOSED') AND "resolvedAt" IS NULL;

-- CreateIndex
CREATE INDEX "Ticket_updatedAt_idx" ON "Ticket"("updatedAt");

-- CreateTable ActionTaken
CREATE TABLE "ActionTaken" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "performedById" INTEGER NOT NULL,
    "assigneeId" INTEGER,
    "actionDateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actionDescription" VARCHAR(2000) NOT NULL,
    "result" VARCHAR(2000),
    "status" "ActionStatus" NOT NULL DEFAULT 'COMPLETED',
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpNote" VARCHAR(2000),
    "followUpResolvedAt" TIMESTAMP(3),
    "attachmentNotes" VARCHAR(1000),
    "cancellationReason" VARCHAR(2000),
    "clientActionId" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionTaken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActionTaken_clientActionId_key" ON "ActionTaken"("clientActionId");
CREATE INDEX "ActionTaken_ticketId_actionDateTime_idx" ON "ActionTaken"("ticketId", "actionDateTime");
CREATE INDEX "ActionTaken_ticketId_status_idx" ON "ActionTaken"("ticketId", "status");
CREATE INDEX "ActionTaken_performedById_idx" ON "ActionTaken"("performedById");
CREATE INDEX "ActionTaken_assigneeId_idx" ON "ActionTaken"("assigneeId");

-- AddForeignKey
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Install append-only BEFORE DELETE trigger on ActionTaken
CREATE OR REPLACE FUNCTION prevent_action_taken_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'ActionTaken records are append-only and cannot be deleted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_action_taken_delete
BEFORE DELETE ON "ActionTaken"
FOR EACH ROW EXECUTE FUNCTION prevent_action_taken_delete();
