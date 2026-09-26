import { describe, it, expect } from "vitest";
import { TicketStatus } from "@prisma/client";
import { isValidStatusTransition, PERMITTED_TRANSITIONS } from "../../../src/utils/statusTransitions.js";

describe("UNIT-02: Ticket Status Transition Matrix Evaluator (BR-14)", () => {
  it("allows permitted transitions from NEW to OPEN", () => {
    expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.OPEN)).toBe(true);
  });

  it("rejects prohibited transitions directly from NEW", () => {
    expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.IN_PROGRESS)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.RESOLVED)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.CLOSED)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.CANCELLED)).toBe(false);
  });

  it("allows permitted transitions from OPEN", () => {
    expect(isValidStatusTransition(TicketStatus.OPEN, TicketStatus.IN_PROGRESS)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.OPEN, TicketStatus.WAITING_FOR_REQUESTER)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.OPEN, TicketStatus.CANCELLED)).toBe(true);
  });

  it("rejects invalid transitions from OPEN", () => {
    expect(isValidStatusTransition(TicketStatus.OPEN, TicketStatus.NEW)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.OPEN, TicketStatus.RESOLVED)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.OPEN, TicketStatus.CLOSED)).toBe(false);
  });

  it("allows permitted transitions from IN_PROGRESS", () => {
    expect(isValidStatusTransition(TicketStatus.IN_PROGRESS, TicketStatus.WAITING_FOR_REQUESTER)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.IN_PROGRESS, TicketStatus.CANCELLED)).toBe(true);
  });

  it("rejects invalid transitions from IN_PROGRESS", () => {
    expect(isValidStatusTransition(TicketStatus.IN_PROGRESS, TicketStatus.NEW)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.IN_PROGRESS, TicketStatus.OPEN)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.IN_PROGRESS, TicketStatus.CLOSED)).toBe(false);
  });

  it("allows permitted transitions from WAITING_FOR_REQUESTER", () => {
    expect(isValidStatusTransition(TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.IN_PROGRESS)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.RESOLVED)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.CANCELLED)).toBe(true);
  });

  it("allows permitted transitions from RESOLVED", () => {
    expect(isValidStatusTransition(TicketStatus.RESOLVED, TicketStatus.CLOSED)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.RESOLVED, TicketStatus.REOPENED)).toBe(true);
  });

  it("rejects invalid transitions from RESOLVED", () => {
    expect(isValidStatusTransition(TicketStatus.RESOLVED, TicketStatus.OPEN)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.RESOLVED, TicketStatus.IN_PROGRESS)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.RESOLVED, TicketStatus.CANCELLED)).toBe(false);
  });

  it("allows permitted transition from CLOSED to REOPENED", () => {
    expect(isValidStatusTransition(TicketStatus.CLOSED, TicketStatus.REOPENED)).toBe(true);
  });

  it("rejects invalid transitions from CLOSED", () => {
    expect(isValidStatusTransition(TicketStatus.CLOSED, TicketStatus.OPEN)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.CLOSED, TicketStatus.IN_PROGRESS)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.CLOSED, TicketStatus.RESOLVED)).toBe(false);
  });

  it("allows permitted transitions from REOPENED", () => {
    expect(isValidStatusTransition(TicketStatus.REOPENED, TicketStatus.IN_PROGRESS)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.REOPENED, TicketStatus.WAITING_FOR_REQUESTER)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.REOPENED, TicketStatus.RESOLVED)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.REOPENED, TicketStatus.CANCELLED)).toBe(true);
  });

  it("allows CANCELLED to transition only to REOPENED by staff", () => {
    expect(isValidStatusTransition(TicketStatus.CANCELLED, TicketStatus.REOPENED)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.CANCELLED, TicketStatus.IN_PROGRESS)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.CANCELLED, TicketStatus.RESOLVED)).toBe(false);
  });

  it("rejects self-transitions for all statuses", () => {
    const allStatuses = Object.values(TicketStatus);
    for (const status of allStatuses) {
      expect(isValidStatusTransition(status, status)).toBe(false);
    }
  });

  it("PERMITTED_TRANSITIONS table has defined array for every TicketStatus", () => {
    const allStatuses = Object.values(TicketStatus);
    for (const status of allStatuses) {
      expect(Array.isArray(PERMITTED_TRANSITIONS[status])).toBe(true);
      expect(PERMITTED_TRANSITIONS[status].length).toBeGreaterThan(0);
    }
  });
});
