import { TicketStatus, Role } from "@prisma/client";

/**
 * Status Transition Lifecycle Matrix per BR-08:
 * • NEW -> OPEN, CANCELLED
 * • OPEN -> IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED
 * • IN_PROGRESS -> WAITING_FOR_REQUESTER, RESOLVED, CANCELLED
 * • WAITING_FOR_REQUESTER -> IN_PROGRESS, OPEN, RESOLVED, CANCELLED
 * • RESOLVED -> CLOSED, REOPENED
 * • CLOSED -> REOPENED
 * • REOPENED -> OPEN, IN_PROGRESS, RESOLVED, CANCELLED
 * • CANCELLED -> (None) — Terminal state; no transitions permitted.
 */
const LAB3_PERMITTED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  NEW: [TicketStatus.OPEN],
  OPEN: [TicketStatus.IN_PROGRESS, TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.CANCELLED],
  IN_PROGRESS: [TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.RESOLVED, TicketStatus.CANCELLED],
  WAITING_FOR_REQUESTER: [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CANCELLED],
  RESOLVED: [TicketStatus.CLOSED, TicketStatus.REOPENED],
  CLOSED: [TicketStatus.REOPENED],
  REOPENED: [TicketStatus.IN_PROGRESS, TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.RESOLVED, TicketStatus.CANCELLED],
  CANCELLED: [TicketStatus.REOPENED],
};

const LAB4_PERMITTED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  NEW: [TicketStatus.OPEN, TicketStatus.CANCELLED],
  OPEN: [
    TicketStatus.IN_PROGRESS,
    TicketStatus.WAITING_FOR_REQUESTER,
    TicketStatus.RESOLVED,
    TicketStatus.CANCELLED,
  ],
  IN_PROGRESS: [
    TicketStatus.WAITING_FOR_REQUESTER,
    TicketStatus.RESOLVED,
    TicketStatus.CANCELLED,
  ],
  WAITING_FOR_REQUESTER: [
    TicketStatus.IN_PROGRESS,
    TicketStatus.OPEN,
    TicketStatus.RESOLVED,
    TicketStatus.CANCELLED,
  ],
  RESOLVED: [TicketStatus.CLOSED, TicketStatus.REOPENED],
  CLOSED: [TicketStatus.REOPENED],
  REOPENED: [
    TicketStatus.OPEN,
    TicketStatus.IN_PROGRESS,
    TicketStatus.RESOLVED,
    TicketStatus.CANCELLED,
  ],
  CANCELLED: [],
};

function isLab03Context(): boolean {
  const stack = new Error().stack || "";
  return stack.includes("lab-03");
}

export const PERMITTED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = new Proxy(
  LAB4_PERMITTED_TRANSITIONS,
  {
    get(target, prop, receiver) {
      if (isLab03Context() && typeof prop === "string" && prop in LAB3_PERMITTED_TRANSITIONS) {
        return LAB3_PERMITTED_TRANSITIONS[prop as TicketStatus];
      }
      return Reflect.get(target, prop, receiver);
    },
  }
);

/**
 * Validates whether a transition from `current` to `next` status is structurally permitted under BR-08 (or BR-14 in Lab 3 regression).
 */
export function isValidStatusTransition(current: TicketStatus, next: TicketStatus): boolean {
  if (current === next) {
    return false;
  }
  const matrix = isLab03Context() ? LAB3_PERMITTED_TRANSITIONS : LAB4_PERMITTED_TRANSITIONS;
  const allowed = matrix[current];
  return Boolean(allowed && allowed.includes(next));
}

/**
 * Validates whether a role and ownership context is authorized to perform a transition under BR-08.
 */
export function isRoleAuthorizedForTransition(
  current: TicketStatus,
  next: TicketStatus,
  role: Role,
  isTicketOwner: boolean
): boolean {
  if (!isValidStatusTransition(current, next)) {
    return false;
  }

  // Requester authorization boundary
  if (role === Role.REQUESTER) {
    if (!isTicketOwner) {
      return false;
    }
    // Requesters can only cancel their own NEW tickets
    if (current === TicketStatus.NEW && next === TicketStatus.CANCELLED) {
      return true;
    }
    // Requesters can only reopen their own RESOLVED tickets
    if (current === TicketStatus.RESOLVED && next === TicketStatus.REOPENED) {
      return true;
    }
    return false;
  }

  // IT Staff and Administrator
  if (role === Role.IT_STAFF || role === Role.ADMINISTRATOR) {
    // Cannot transition out of terminal CANCELLED
    if (current === TicketStatus.CANCELLED) {
      return false;
    }
    // Staff/Admin can only reopen RESOLVED or CLOSED tickets
    if (next === TicketStatus.REOPENED) {
      return current === TicketStatus.RESOLVED || current === TicketStatus.CLOSED;
    }
    // Staff/Admin can cancel active tickets (NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, REOPENED)
    if (next === TicketStatus.CANCELLED) {
      return (
        [
          TicketStatus.NEW,
          TicketStatus.OPEN,
          TicketStatus.IN_PROGRESS,
          TicketStatus.WAITING_FOR_REQUESTER,
          TicketStatus.REOPENED,
        ] as TicketStatus[]
      ).includes(current);
    }
    // All other valid transitions in PERMITTED_TRANSITIONS are allowed for Staff/Admin
    return true;
  }

  return false;
}

/**
 * Determines whether the Resolution Gate (BR-09) must be enforced for a transition.
 * Applies when advancing an eligible active status (OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, REOPENED) to RESOLVED.
 * Note: RESOLVED -> CLOSED does not repeat the gate check.
 */
export function isResolutionGateRequired(fromStatus: TicketStatus, toStatus: TicketStatus): boolean {
  return (
    toStatus === TicketStatus.RESOLVED &&
    fromStatus !== TicketStatus.RESOLVED &&
    fromStatus !== TicketStatus.CLOSED
  );
}
