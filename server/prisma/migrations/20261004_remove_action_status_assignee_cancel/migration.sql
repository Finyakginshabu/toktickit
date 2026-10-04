DROP INDEX IF EXISTS "ActionTaken_ticketId_status_idx";
DROP INDEX IF EXISTS "ActionTaken_assigneeId_idx";

ALTER TABLE "ActionTaken"
  DROP CONSTRAINT IF EXISTS "ActionTaken_assigneeId_fkey",
  DROP COLUMN IF EXISTS "assigneeId",
  DROP COLUMN IF EXISTS "status",
  DROP COLUMN IF EXISTS "cancellationReason";

DROP TYPE IF EXISTS "ActionStatus";