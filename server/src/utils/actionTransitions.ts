import { ActionStatus } from "@prisma/client";

/**
 * Permitted status transitions for ActionTaken entity under BR-07:
 * - PENDING -> IN_PROGRESS, COMPLETED, CANCELLED
 * - IN_PROGRESS -> COMPLETED, CANCELLED
 * - COMPLETED -> IN_PROGRESS (if work is reopened)
 * - CANCELLED -> Terminal (no transitions permitted)
 */
export const PERMITTED_ACTION_TRANSITIONS: Record<ActionStatus, ActionStatus[]> = {
  PENDING: [ActionStatus.IN_PROGRESS, ActionStatus.COMPLETED, ActionStatus.CANCELLED],
  IN_PROGRESS: [ActionStatus.COMPLETED, ActionStatus.CANCELLED],
  COMPLETED: [ActionStatus.IN_PROGRESS],
  CANCELLED: [],
};

/**
 * Validates whether a transition from `current` to `next` ActionStatus is legal per BR-07.
 */
export function isValidActionStatusTransition(current: ActionStatus, next: ActionStatus): boolean {
  if (current === next) {
    return true; // No change in status is allowed during general edit
  }
  const allowed = PERMITTED_ACTION_TRANSITIONS[current];
  return Boolean(allowed && allowed.includes(next));
}
