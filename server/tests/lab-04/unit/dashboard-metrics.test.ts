import { describe, it, expect } from "vitest";
import {
  getBangkokDateBoundaries,
  calculateDeltas,
  CANONICAL_REQUESTER_DRILL_DOWN_URLS,
  CANONICAL_STAFF_DRILL_DOWN_URLS,
  CANONICAL_ADMIN_DRILL_DOWN_URLS,
} from "../../../src/utils/dashboardMetrics.js";

describe("Dashboard Metrics Utilities (UNIT-03 per BR-12, BR-13, BR-14, BR-15)", () => {
  // ---------------------------------------------------------------------------
  // getBangkokDateBoundaries
  // ---------------------------------------------------------------------------
  describe("getBangkokDateBoundaries", () => {
    it("returns Date objects for all four boundaries", () => {
      const b = getBangkokDateBoundaries();
      expect(b.startOfToday).toBeInstanceOf(Date);
      expect(b.startOfYesterday).toBeInstanceOf(Date);
      expect(b.endOfYesterday).toBeInstanceOf(Date);
      expect(b.thirtyDaysAgo).toBeInstanceOf(Date);
    });

    it("startOfYesterday is exactly 24 hours before startOfToday", () => {
      const b = getBangkokDateBoundaries();
      const diff = b.startOfToday.getTime() - b.startOfYesterday.getTime();
      expect(diff).toBe(24 * 60 * 60 * 1000);
    });

    it("endOfYesterday is 1ms before startOfToday", () => {
      const b = getBangkokDateBoundaries();
      const diff = b.startOfToday.getTime() - b.endOfYesterday.getTime();
      expect(diff).toBe(1);
    });

    it("thirtyDaysAgo is exactly 30 days before startOfToday", () => {
      const b = getBangkokDateBoundaries();
      const diff = b.startOfToday.getTime() - b.thirtyDaysAgo.getTime();
      expect(diff).toBe(30 * 24 * 60 * 60 * 1000);
    });
  });

  // ---------------------------------------------------------------------------
  // calculateDeltas
  // ---------------------------------------------------------------------------
  describe("calculateDeltas", () => {
    it("computes positive deltas correctly", () => {
      const today = {
        newTickets: 10,
        openTickets: 5,
        inProgressTickets: 8,
        waitingForRequesterTickets: 3,
        myAssignedTickets: 6,
      };
      const yesterday = {
        newTickets: 7,
        openTickets: 4,
        inProgressTickets: 6,
        waitingForRequesterTickets: 2,
        myAssignedTickets: 4,
      };
      const deltas = calculateDeltas(today, yesterday);
      expect(deltas.newTickets).toBe(3);
      expect(deltas.openTickets).toBe(1);
      expect(deltas.inProgressTickets).toBe(2);
      expect(deltas.waitingForRequesterTickets).toBe(1);
      expect(deltas.myAssignedTickets).toBe(2);
    });

    it("computes negative deltas correctly", () => {
      const today = {
        newTickets: 2,
        openTickets: 1,
        inProgressTickets: 3,
        waitingForRequesterTickets: 0,
        myAssignedTickets: 1,
      };
      const yesterday = {
        newTickets: 5,
        openTickets: 8,
        inProgressTickets: 7,
        waitingForRequesterTickets: 4,
        myAssignedTickets: 3,
      };
      const deltas = calculateDeltas(today, yesterday);
      expect(deltas.newTickets).toBe(-3);
      expect(deltas.openTickets).toBe(-7);
      expect(deltas.inProgressTickets).toBe(-4);
      expect(deltas.waitingForRequesterTickets).toBe(-4);
      expect(deltas.myAssignedTickets).toBe(-2);
    });

    it("returns zero deltas when counts are equal", () => {
      const snapshot = {
        newTickets: 5,
        openTickets: 5,
        inProgressTickets: 5,
        waitingForRequesterTickets: 5,
        myAssignedTickets: 5,
      };
      const deltas = calculateDeltas(snapshot, snapshot);
      expect(deltas.newTickets).toBe(0);
      expect(deltas.openTickets).toBe(0);
      expect(deltas.inProgressTickets).toBe(0);
      expect(deltas.waitingForRequesterTickets).toBe(0);
      expect(deltas.myAssignedTickets).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Canonical Drill-Down URL Constants (BR-15)
  // ---------------------------------------------------------------------------
  it("CANONICAL_REQUESTER_DRILL_DOWN_URLS includes comma-separated status list for myOpenTickets", () => {
    expect(CANONICAL_REQUESTER_DRILL_DOWN_URLS.myOpenTickets).toBe(
      "/my-tickets?status=NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED"
    );
  });

  it("CANONICAL_STAFF_DRILL_DOWN_URLS includes HIGH,URGENT combined priority URL", () => {
    expect(CANONICAL_STAFF_DRILL_DOWN_URLS.highUrgentTickets).toBe(
      "/staff/queue?itPriority=HIGH,URGENT"
    );
  });

  it("CANONICAL_ADMIN_DRILL_DOWN_URLS extends staff URLs with manageUsers", () => {
    expect(CANONICAL_ADMIN_DRILL_DOWN_URLS.manageUsers).toBe("/admin/users");
    expect(CANONICAL_ADMIN_DRILL_DOWN_URLS.highUrgentTickets).toBe(
      CANONICAL_STAFF_DRILL_DOWN_URLS.highUrgentTickets
    );
  });
});
