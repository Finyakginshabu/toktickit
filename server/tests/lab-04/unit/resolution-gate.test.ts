import { describe, it, expect } from "vitest";
import { evaluateResolutionGate } from "../../../src/utils/resolutionGate.js";
import { TicketStatus } from "@prisma/client";

describe("Resolution Gate Evaluator Unit Tests (UNIT-01 per BR-09)", () => {
  it("blocks resolution when ticket has 0 actions taken", () => {
    const result = evaluateResolutionGate({
      actionsCount: 0,
      resolutionSummary: "Replaced faulty hardware adapter and tested cleanly.",
      currentStatus: TicketStatus.IN_PROGRESS,
    });

    expect(result.passed).toBe(false);
    expect(result.details).toHaveLength(1);
    expect(result.details[0]).toEqual({
      code: "NO_ACTIONS_TAKEN",
      message: "At least one Action Taken must be recorded before resolving.",
    });
  });

  it("blocks resolution when resolutionSummary is missing or empty", () => {
    const result = evaluateResolutionGate({
      actionsCount: 1,
      resolutionSummary: "",
      currentStatus: TicketStatus.IN_PROGRESS,
    });

    expect(result.passed).toBe(false);
    expect(result.details).toHaveLength(1);
    expect(result.details[0]).toEqual({
      code: "MISSING_RESOLUTION_SUMMARY",
      field: "resolutionSummary",
      message: "Resolution summary is required (minimum 5 characters).",
    });
  });

  it("blocks resolution when resolutionSummary is whitespace-only", () => {
    const result = evaluateResolutionGate({
      actionsCount: 2,
      resolutionSummary: "    ",
      currentStatus: TicketStatus.IN_PROGRESS,
    });

    expect(result.passed).toBe(false);
    expect(result.details[0].code).toBe("MISSING_RESOLUTION_SUMMARY");
  });

  it("blocks resolution when resolutionSummary is under 5 characters", () => {
    const result = evaluateResolutionGate({
      actionsCount: 1,
      resolutionSummary: "Done",
      currentStatus: TicketStatus.OPEN,
    });

    expect(result.passed).toBe(false);
    expect(result.details).toHaveLength(1);
    expect(result.details[0].code).toBe("MISSING_RESOLUTION_SUMMARY");
  });

  it("returns both errors when ticket has 0 actions AND missing summary", () => {
    const result = evaluateResolutionGate({
      actionsCount: 0,
      resolutionSummary: null,
      currentStatus: TicketStatus.OPEN,
    });

    expect(result.passed).toBe(false);
    expect(result.details).toHaveLength(2);
    expect(result.details.map((d) => d.code)).toEqual([
      "NO_ACTIONS_TAKEN",
      "MISSING_RESOLUTION_SUMMARY",
    ]);
  });

  it("passes resolution when ticket has >= 1 action and valid summary (>= 5 chars)", () => {
    const result = evaluateResolutionGate({
      actionsCount: 1,
      resolutionSummary: "Replaced RAM module and verified stability.",
      currentStatus: TicketStatus.IN_PROGRESS,
    });

    expect(result.passed).toBe(true);
    expect(result.details).toHaveLength(0);
  });

  it("passes resolution when ticket has multiple actions and valid summary", () => {
    const result = evaluateResolutionGate({
      actionsCount: 4,
      resolutionSummary: "Configured VPN routing table and confirmed tunnel stability.",
      currentStatus: TicketStatus.WAITING_FOR_REQUESTER,
    });

    expect(result.passed).toBe(true);
    expect(result.details).toHaveLength(0);
  });
});
