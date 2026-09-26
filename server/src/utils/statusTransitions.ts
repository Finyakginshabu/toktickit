import { TicketStatus } from "@prisma/client";

/**
 * Status Transition Lifecycle Matrix per BR-14:
 * • NEW -> OPEN
 * • OPEN -> IN_PROGRESS, WAITING_FOR_REQUESTER, CANCELLED
 * • IN_PROGRESS -> WAITING_FOR_REQUESTER, RESOLVED, CANCELLED
 * • WAITING_FOR_REQUESTER -> IN_PROGRESS, RESOLVED, CANCELLED
 * • RESOLVED -> CLOSED, REOPENED
 * • CLOSED -> REOPENED
 * • REOPENED -> IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED
 * • CANCELLED -> REOPENED (Terminal / Reopenable only by IT Staff)
 */
export const PERMITTED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  NEW: [TicketStatus.OPEN],
  OPEN: [TicketStatus.IN_PROGRESS, TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.CANCELLED],
  IN_PROGRESS: [TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.RESOLVED, TicketStatus.CANCELLED],
  WAITING_FOR_REQUESTER: [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CANCELLED],
  RESOLVED: [TicketStatus.CLOSED, TicketStatus.REOPENED],
  CLOSED: [TicketStatus.REOPENED],
  REOPENED: [TicketStatus.IN_PROGRESS, TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.RESOLVED, TicketStatus.CANCELLED],
  CANCELLED: [TicketStatus.REOPENED],
};

/**
 * Validates whether a transition from `current` to `next` status is permitted under BR-14.
 */
export function isValidStatusTransition(current: TicketStatus, next: TicketStatus): boolean {
  if (current === next) {
    return false;
  }
  const allowed = PERMITTED_TRANSITIONS[current];
  return Boolean(allowed && allowed.includes(next));
}
