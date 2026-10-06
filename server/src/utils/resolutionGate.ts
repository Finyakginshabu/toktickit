import { TicketStatus } from "@prisma/client";

export interface ResolutionGateErrorDetail {
  code: "NO_ACTIONS_TAKEN" | "MISSING_RESOLUTION_SUMMARY";
  field?: string;
  message: string;
}

export interface GateEvaluationParams {
  actionsCount: number;
  resolutionSummary?: string | null;
  currentStatus?: TicketStatus;
}

export interface GateEvaluationResult {
  passed: boolean;
  details: ResolutionGateErrorDetail[];
}

/**
 * Pure evaluator for Ticket Resolution Gate per BR-09:
 * 1. Ticket has >= 1 associated ActionTaken record.
 * 2. resolutionSummary is non-empty, trimmed, and >= 5 characters.
 *
 * Note: Follow-up flags and notes do NOT block ticket resolution (BR-06, AC-08).
 * Grandfathering rule (BR-09): tickets already in RESOLVED or CLOSED from prior labs
 * are not retroactively blocked.
 */
export function evaluateResolutionGate(params: GateEvaluationParams): GateEvaluationResult {
  const details: ResolutionGateErrorDetail[] = [];

  // 1. Must have at least 1 ActionTaken
  if (params.actionsCount < 1) {
    details.push({
      code: "NO_ACTIONS_TAKEN",
      message: "At least one Action Taken must be recorded before resolving.",
    });
  }

  // 2. resolutionSummary must be non-empty, trimmed, and >= 5 characters
  const trimmedSummary = typeof params.resolutionSummary === "string" ? params.resolutionSummary.trim() : "";
  if (!trimmedSummary || trimmedSummary.length < 5) {
    details.push({
      code: "MISSING_RESOLUTION_SUMMARY",
      field: "resolutionSummary",
      message: "Resolution summary is required (minimum 5 characters).",
    });
  }

  return {
    passed: details.length === 0,
    details,
  };
}
