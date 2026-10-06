import { describe, it, expect } from "vitest";
import {
  PERMITTED_TRANSITIONS,
  isValidStatusTransition,
  isRoleAuthorizedForTransition,
  isResolutionGateRequired,
} from "../../../src/utils/statusTransitions.js";
import { TicketStatus, Role } from "@prisma/client";

describe("Ticket Status Transition Engine Unit Tests (UNIT-02 per BR-08)", () => {
  describe("Structural Transition Matrix (PERMITTED_TRANSITIONS)", () => {
    it("permits NEW -> OPEN and NEW -> CANCELLED", () => {
      expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.OPEN)).toBe(true);
      expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.CANCELLED)).toBe(true);
    });

    it("rejects illegal jumps from NEW (e.g. NEW -> RESOLVED, NEW -> CLOSED)", () => {
      expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.RESOLVED)).toBe(false);
      expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.CLOSED)).toBe(false);
      expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.IN_PROGRESS)).toBe(false);
    });

    it("permits OPEN transitions to IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED", () => {
      expect(isValidStatusTransition(TicketStatus.OPEN, TicketStatus.IN_PROGRESS)).toBe(true);
      expect(isValidStatusTransition(TicketStatus.OPEN, TicketStatus.WAITING_FOR_REQUESTER)).toBe(true);
      expect(isValidStatusTransition(TicketStatus.OPEN, TicketStatus.RESOLVED)).toBe(true);
      expect(isValidStatusTransition(TicketStatus.OPEN, TicketStatus.CANCELLED)).toBe(true);
    });

    it("rejects direct active-to-CLOSED transitions under BR-08", () => {
      expect(isValidStatusTransition(TicketStatus.OPEN, TicketStatus.CLOSED)).toBe(false);
      expect(isValidStatusTransition(TicketStatus.IN_PROGRESS, TicketStatus.CLOSED)).toBe(false);
      expect(isValidStatusTransition(TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.CLOSED)).toBe(false);
      expect(isValidStatusTransition(TicketStatus.REOPENED, TicketStatus.CLOSED)).toBe(false);
    });

    it("permits WAITING_FOR_REQUESTER -> OPEN and IN_PROGRESS, RESOLVED, CANCELLED", () => {
      expect(isValidStatusTransition(TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.OPEN)).toBe(true);
      expect(isValidStatusTransition(TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.IN_PROGRESS)).toBe(true);
      expect(isValidStatusTransition(TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.RESOLVED)).toBe(true);
      expect(isValidStatusTransition(TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.CANCELLED)).toBe(true);
    });

    it("permits RESOLVED -> CLOSED and RESOLVED -> REOPENED", () => {
      expect(isValidStatusTransition(TicketStatus.RESOLVED, TicketStatus.CLOSED)).toBe(true);
      expect(isValidStatusTransition(TicketStatus.RESOLVED, TicketStatus.REOPENED)).toBe(true);
    });

    it("permits CLOSED -> REOPENED exceptional administrative reopen", () => {
      expect(isValidStatusTransition(TicketStatus.CLOSED, TicketStatus.REOPENED)).toBe(true);
      expect(isValidStatusTransition(TicketStatus.CLOSED, TicketStatus.OPEN)).toBe(false);
    });

    it("permits REOPENED -> OPEN, IN_PROGRESS, RESOLVED, CANCELLED", () => {
      expect(isValidStatusTransition(TicketStatus.REOPENED, TicketStatus.OPEN)).toBe(true);
      expect(isValidStatusTransition(TicketStatus.REOPENED, TicketStatus.IN_PROGRESS)).toBe(true);
      expect(isValidStatusTransition(TicketStatus.REOPENED, TicketStatus.RESOLVED)).toBe(true);
      expect(isValidStatusTransition(TicketStatus.REOPENED, TicketStatus.CANCELLED)).toBe(true);
    });

    it("enforces CANCELLED as a terminal state with zero permitted transitions", () => {
      expect(PERMITTED_TRANSITIONS[TicketStatus.CANCELLED]).toEqual([]);
      expect(isValidStatusTransition(TicketStatus.CANCELLED, TicketStatus.REOPENED)).toBe(false);
      expect(isValidStatusTransition(TicketStatus.CANCELLED, TicketStatus.OPEN)).toBe(false);
      expect(isValidStatusTransition(TicketStatus.CANCELLED, TicketStatus.NEW)).toBe(false);
    });

    it("rejects transition to the exact same status", () => {
      expect(isValidStatusTransition(TicketStatus.OPEN, TicketStatus.OPEN)).toBe(false);
      expect(isValidStatusTransition(TicketStatus.IN_PROGRESS, TicketStatus.IN_PROGRESS)).toBe(false);
      expect(isValidStatusTransition(TicketStatus.RESOLVED, TicketStatus.RESOLVED)).toBe(false);
    });
  });

  describe("Role Authorization Matrix (isRoleAuthorizedForTransition)", () => {
    it("allows Requester to cancel only an owned NEW ticket", () => {
      expect(
        isRoleAuthorizedForTransition(TicketStatus.NEW, TicketStatus.CANCELLED, Role.REQUESTER, true)
      ).toBe(true);
      // Unowned ticket
      expect(
        isRoleAuthorizedForTransition(TicketStatus.NEW, TicketStatus.CANCELLED, Role.REQUESTER, false)
      ).toBe(false);
      // Non-NEW ticket
      expect(
        isRoleAuthorizedForTransition(TicketStatus.OPEN, TicketStatus.CANCELLED, Role.REQUESTER, true)
      ).toBe(false);
    });

    it("allows Requester to reopen only an owned RESOLVED ticket", () => {
      expect(
        isRoleAuthorizedForTransition(TicketStatus.RESOLVED, TicketStatus.REOPENED, Role.REQUESTER, true)
      ).toBe(true);
      // Unowned ticket
      expect(
        isRoleAuthorizedForTransition(TicketStatus.RESOLVED, TicketStatus.REOPENED, Role.REQUESTER, false)
      ).toBe(false);
      // CLOSED ticket (Requester cannot reopen closed tickets)
      expect(
        isRoleAuthorizedForTransition(TicketStatus.CLOSED, TicketStatus.REOPENED, Role.REQUESTER, true)
      ).toBe(false);
    });

    it("allows IT Staff and Admin to reopen RESOLVED or CLOSED tickets", () => {
      expect(
        isRoleAuthorizedForTransition(TicketStatus.RESOLVED, TicketStatus.REOPENED, Role.IT_STAFF, false)
      ).toBe(true);
      expect(
        isRoleAuthorizedForTransition(TicketStatus.CLOSED, TicketStatus.REOPENED, Role.IT_STAFF, false)
      ).toBe(true);
      expect(
        isRoleAuthorizedForTransition(TicketStatus.RESOLVED, TicketStatus.REOPENED, Role.ADMINISTRATOR, false)
      ).toBe(true);
      expect(
        isRoleAuthorizedForTransition(TicketStatus.CLOSED, TicketStatus.REOPENED, Role.ADMINISTRATOR, false)
      ).toBe(true);
    });

    it("allows IT Staff and Admin to cancel active tickets per BR-08", () => {
      for (const status of [
        TicketStatus.NEW,
        TicketStatus.OPEN,
        TicketStatus.IN_PROGRESS,
        TicketStatus.WAITING_FOR_REQUESTER,
        TicketStatus.REOPENED,
      ]) {
        expect(
          isRoleAuthorizedForTransition(status, TicketStatus.CANCELLED, Role.IT_STAFF, false)
        ).toBe(true);
      }
    });

    it("blocks IT Staff and Admin from transitioning terminal CANCELLED tickets", () => {
      expect(
        isRoleAuthorizedForTransition(TicketStatus.CANCELLED, TicketStatus.REOPENED, Role.IT_STAFF, false)
      ).toBe(false);
      expect(
        isRoleAuthorizedForTransition(TicketStatus.CANCELLED, TicketStatus.OPEN, Role.ADMINISTRATOR, false)
      ).toBe(false);
    });
  });

  describe("Resolution Gate Requirement Helper (isResolutionGateRequired)", () => {
    it("requires gate when moving to RESOLVED from active statuses", () => {
      expect(isResolutionGateRequired(TicketStatus.OPEN, TicketStatus.RESOLVED)).toBe(true);
      expect(isResolutionGateRequired(TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED)).toBe(true);
      expect(isResolutionGateRequired(TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.RESOLVED)).toBe(true);
      expect(isResolutionGateRequired(TicketStatus.REOPENED, TicketStatus.RESOLVED)).toBe(true);
    });

    it("does NOT require gate for non-RESOLVED transitions", () => {
      expect(isResolutionGateRequired(TicketStatus.NEW, TicketStatus.OPEN)).toBe(false);
      expect(isResolutionGateRequired(TicketStatus.OPEN, TicketStatus.IN_PROGRESS)).toBe(false);
      expect(isResolutionGateRequired(TicketStatus.RESOLVED, TicketStatus.CLOSED)).toBe(false);
    });

    it("does NOT repeat gate for RESOLVED to RESOLVED or grandfathered tickets", () => {
      expect(isResolutionGateRequired(TicketStatus.RESOLVED, TicketStatus.RESOLVED)).toBe(false);
      expect(isResolutionGateRequired(TicketStatus.CLOSED, TicketStatus.RESOLVED)).toBe(false);
    });
  });
});
