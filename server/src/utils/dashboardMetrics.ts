/**
 * Dashboard Metric Utilities
 *
 * Provides authoritative Asia/Bangkok (UTC+07:00) timezone-aware date boundary
 * calculations, daily velocity delta computation, and canonical drill-down URL
 * constants for all three role dashboards (BR-12, BR-13, BR-14, BR-15).
 */

/** UTC+07:00 offset in milliseconds */
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

export interface BangkokDateBoundaries {
  /** Start of today in Bangkok time, expressed as UTC Date */
  startOfToday: Date;
  /** Start of yesterday in Bangkok time, expressed as UTC Date */
  startOfYesterday: Date;
  /** End of yesterday (= start of today - 1ms) in Bangkok time, expressed as UTC Date */
  endOfYesterday: Date;
  /** 30 calendar days ago from today Bangkok midnight, expressed as UTC Date */
  thirtyDaysAgo: Date;
}

/**
 * Computes all calendar date boundaries needed for dashboard metric queries.
 * All boundaries are based on midnight in Asia/Bangkok (UTC+07:00) and
 * returned as UTC Date objects suitable for Prisma WHERE clauses.
 */
export function getBangkokDateBoundaries(): BangkokDateBoundaries {
  const nowUtc = Date.now();
  const nowBangkok = nowUtc + BANGKOK_OFFSET_MS;
  const bangkokMidnightToday =
    Math.floor(nowBangkok / (24 * 60 * 60 * 1000)) * (24 * 60 * 60 * 1000) - BANGKOK_OFFSET_MS;
  const oneDayMs = 24 * 60 * 60 * 1000;
  return {
    startOfToday: new Date(bangkokMidnightToday),
    startOfYesterday: new Date(bangkokMidnightToday - oneDayMs),
    endOfYesterday: new Date(bangkokMidnightToday - 1),
    thirtyDaysAgo: new Date(bangkokMidnightToday - 30 * oneDayMs),
  };
}

export interface MetricSnapshot {
  newTickets: number;
  openTickets: number;
  inProgressTickets: number;
  waitingForRequesterTickets: number;
  myAssignedTickets: number;
}

export interface MetricDeltas {
  newTickets: number;
  openTickets: number;
  inProgressTickets: number;
  waitingForRequesterTickets: number;
  myAssignedTickets: number;
}

/**
 * Calculates daily velocity deltas for the 5 primary staff metric cards.
 * Delta = countToday - countYesterday
 */
export function calculateDeltas(today: MetricSnapshot, yesterday: MetricSnapshot): MetricDeltas {
  return {
    newTickets: today.newTickets - yesterday.newTickets,
    openTickets: today.openTickets - yesterday.openTickets,
    inProgressTickets: today.inProgressTickets - yesterday.inProgressTickets,
    waitingForRequesterTickets:
      today.waitingForRequesterTickets - yesterday.waitingForRequesterTickets,
    myAssignedTickets: today.myAssignedTickets - yesterday.myAssignedTickets,
  };
}

// ---------------------------------------------------------------------------
// Canonical Drill-Down URL Constants (BR-15)
// ---------------------------------------------------------------------------

export const CANONICAL_REQUESTER_DRILL_DOWN_URLS = {
  myOpenTickets: "/my-tickets?status=NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED",
  inProgressTickets: "/my-tickets?status=IN_PROGRESS",
  resolvedTickets: "/my-tickets?status=RESOLVED",
  closedTickets: "/my-tickets?status=CLOSED",
  waitingForRequesterTickets: "/my-tickets?status=WAITING_FOR_REQUESTER",
} as const;

export const CANONICAL_STAFF_DRILL_DOWN_URLS = {
  newTickets: "/staff/queue?status=NEW",
  openTickets: "/staff/queue?status=OPEN",
  inProgressTickets: "/staff/queue?status=IN_PROGRESS",
  waitingForRequesterTickets: "/staff/queue?status=WAITING_FOR_REQUESTER",
  myAssignedTickets: "/staff/queue?ownerId=me",
  unassignedTickets: "/staff/queue?ownerId=unassigned",
  highUrgentTickets: "/staff/queue?itPriority=HIGH,URGENT",
} as const;

export const CANONICAL_ADMIN_DRILL_DOWN_URLS = {
  ...CANONICAL_STAFF_DRILL_DOWN_URLS,
  manageUsers: "/admin/users",
} as const;
