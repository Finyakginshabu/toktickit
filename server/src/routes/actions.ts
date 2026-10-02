import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import {
  authenticateToken,
  requirePasswordChangeResolved,
  requireRole,
} from "../middleware/auth.js";
import { ActionStatus, TicketStatus } from "@prisma/client";
import { isValidActionStatusTransition } from "../utils/actionTransitions.js";

export const actionsRouter = Router({ mergeParams: true });

// ---------------------------------------------------------------------------
// Lab 4 — GET /api/tickets/:ticketId/actions
// Chronological listing (actionDateTime ASC, id ASC)
// Strict Requester ownership isolation (404 for unowned) & email sanitization
// ---------------------------------------------------------------------------
actionsRouter.get(
  "/:ticketId/actions",
  authenticateToken,
  requirePasswordChangeResolved,
  async (req: Request, res: Response) => {
    try {
      const ticketId = parseInt(req.params.ticketId, 10);
      if (isNaN(ticketId)) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Valid ticket ID is required.",
          },
        });
      }

      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { id: true, requesterId: true },
      });

      if (!ticket) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Ticket not found.",
          },
        });
      }

      const isRequester = req.user?.role === "REQUESTER";
      if (isRequester && ticket.requesterId !== req.user?.id) {
        // BR-05 / AC-06: Avoid leaking ticket existence to unauthorized requesters
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Ticket not found.",
          },
        });
      }

      const actions = await prisma.actionTaken.findMany({
        where: { ticketId },
        orderBy: [
          { actionDateTime: "asc" },
          { id: "asc" },
        ],
        include: {
          performedBy: {
            select: {
              id: true,
              name: true,
              role: true,
              email: !isRequester, // Sanitize staff email from Requesters
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              role: true,
              email: !isRequester,
            },
          },
        },
      });

      return res.status(200).json(actions);
    } catch (_err) {
      return res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to retrieve actions taken.",
        },
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Lab 4 — POST /api/tickets/:ticketId/actions
// Create Action Taken line item (IT Staff / Admin only)
// Authoritative performedById attribution, active assignee check, clientActionId idempotency
// ---------------------------------------------------------------------------
actionsRouter.post(
  "/:ticketId/actions",
  authenticateToken,
  requirePasswordChangeResolved,
  (req: Request, res: Response, next) => {
    if (req.user?.role === "REQUESTER") {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Requesters are not permitted to record actions taken.",
        },
      });
    }
    next();
  },
  requireRole(["IT_STAFF", "ADMINISTRATOR"]),
  async (req: Request, res: Response) => {
    try {
      const ticketId = parseInt(req.params.ticketId, 10);
      if (isNaN(ticketId)) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Valid ticket ID is required.",
          },
        });
      }

      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Ticket not found.",
          },
        });
      }

      // BR-16 / FR-09 / AC-17: Block on CLOSED or CANCELLED tickets
      if (
        ticket.currentStatus === TicketStatus.CLOSED ||
        ticket.currentStatus === TicketStatus.CANCELLED
      ) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Cannot add or modify actions on a closed or cancelled ticket.",
          },
        });
      }

      const {
        actionDescription,
        result,
        status = "COMPLETED",
        assigneeId,
        cancellationReason,
        reason,
        followUpRequired = false,
        followUpNote,
        attachmentNotes,
        clientActionId,
        actionDateTime,
      } = req.body;

      // 1. Idempotency Check via clientActionId
      if (clientActionId && typeof clientActionId === "string" && clientActionId.trim().length > 0) {
        const existingAction = await prisma.actionTaken.findUnique({
          where: { clientActionId: clientActionId.trim() },
          include: {
            performedBy: { select: { id: true, name: true, role: true, email: true } },
            assignee: { select: { id: true, name: true, role: true, email: true } },
          },
        });

        if (existingAction) {
          res.setHeader("Idempotent-Replay", "true");
          return res.status(200).json(existingAction);
        }
      }

      // 2. Action Description Validation (5 - 2000 chars)
      const trimmedDesc = typeof actionDescription === "string" ? actionDescription.trim() : "";
      if (trimmedDesc.length < 5 || trimmedDesc.length > 2000) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Action description is required (between 5 and 2000 characters).",
          },
        });
      }

      // 3. Status Validation
      const upperStatus = typeof status === "string" ? status.toUpperCase() : "COMPLETED";
      if (!Object.values(ActionStatus).includes(upperStatus as ActionStatus)) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Invalid action status. Permitted: PENDING, IN_PROGRESS, COMPLETED, CANCELLED.",
          },
        });
      }
      const targetStatus = upperStatus as ActionStatus;

      // 4. Result Validation (Required if COMPLETED, min 3 chars)
      const trimmedResult = typeof result === "string" ? result.trim() : null;
      if (targetStatus === ActionStatus.COMPLETED) {
        if (!trimmedResult || trimmedResult.length < 3 || trimmedResult.length > 2000) {
          return res.status(400).json({
            error: {
              code: "BAD_REQUEST",
              message: "Result is required when status is COMPLETED (minimum 3 characters).",
            },
          });
        }
      }

      // 5. Cancellation Reason Validation
      const effectiveCancelReason = (cancellationReason || reason);
      const trimmedCancelReason = typeof effectiveCancelReason === "string" ? effectiveCancelReason.trim() : null;
      if (targetStatus === ActionStatus.CANCELLED) {
        if (!trimmedCancelReason || trimmedCancelReason.length < 5 || trimmedCancelReason.length > 2000) {
          return res.status(400).json({
            error: {
              code: "BAD_REQUEST",
              message: "Cancellation reason is required when status is CANCELLED (between 5 and 2000 characters).",
            },
          });
        }
      }

      // 6. Follow-Up Validation
      const isFollowUp = Boolean(followUpRequired);
      const trimmedFollowUp = typeof followUpNote === "string" ? followUpNote.trim() : null;
      if (isFollowUp) {
        if (!trimmedFollowUp || trimmedFollowUp.length < 5 || trimmedFollowUp.length > 2000) {
          return res.status(400).json({
            error: {
              code: "BAD_REQUEST",
              message: "Follow-up note is required when follow-up is requested (minimum 5 characters).",
            },
          });
        }
      }

      // 7. Assignee Eligibility Validation (BR-04: Active IT_STAFF or ADMINISTRATOR)
      let parsedAssigneeId: number | null = null;
      if (assigneeId !== undefined && assigneeId !== null && assigneeId !== "") {
        const numAssignee = parseInt(String(assigneeId), 10);
        if (isNaN(numAssignee)) {
          return res.status(400).json({
            error: {
              code: "INVALID_ASSIGNEE",
              message: "Invalid assignee ID.",
            },
          });
        }

        const targetUser = await prisma.user.findUnique({
          where: { id: numAssignee },
        });

        if (!targetUser || !targetUser.isActive || targetUser.role === "REQUESTER") {
          return res.status(400).json({
            error: {
              code: "INVALID_ASSIGNEE",
              message: "Assignee must be an active IT Staff or Administrator account.",
            },
          });
        }
        parsedAssigneeId = numAssignee;
      }

      // 8. Action Date/Time
      let parsedDateTime = new Date();
      if (actionDateTime) {
        const d = new Date(actionDateTime);
        if (!isNaN(d.getTime())) {
          parsedDateTime = d;
        }
      }

      // 9. Atomic Action Creation & Ticket updatedAt Bump
      const [action] = await prisma.$transaction([
        prisma.actionTaken.create({
          data: {
            ticketId,
            performedById: req.user!.id, // BR-03: Authoritative performer attribution
            assigneeId: parsedAssigneeId,
            actionDateTime: parsedDateTime,
            actionDescription: trimmedDesc,
            result: trimmedResult,
            status: targetStatus,
            followUpRequired: isFollowUp,
            followUpNote: isFollowUp ? trimmedFollowUp : null,
            attachmentNotes: attachmentNotes && typeof attachmentNotes === "string" ? attachmentNotes.trim().slice(0, 1000) : null,
            cancellationReason: targetStatus === ActionStatus.CANCELLED ? trimmedCancelReason : null,
            clientActionId: clientActionId && typeof clientActionId === "string" && clientActionId.trim().length > 0 ? clientActionId.trim() : null,
            version: 1,
          },
          include: {
            performedBy: { select: { id: true, name: true, role: true, email: true } },
            assignee: { select: { id: true, name: true, role: true, email: true } },
          },
        }),
        prisma.ticket.update({
          where: { id: ticketId },
          data: { updatedAt: new Date() },
        }),
      ]);

      return res.status(201).json(action);
    } catch (err: any) {
      if (err?.code === "P2002" && err?.meta?.target?.includes("clientActionId")) {
        // Race condition duplicate clientActionId caught by unique constraint
        const prisma = getPrisma();
        const clientActionId = req.body.clientActionId?.trim();
        const existing = await prisma.actionTaken.findUnique({
          where: { clientActionId },
          include: {
            performedBy: { select: { id: true, name: true, role: true, email: true } },
            assignee: { select: { id: true, name: true, role: true, email: true } },
          },
        });
        if (existing) {
          res.setHeader("Idempotent-Replay", "true");
          return res.status(200).json(existing);
        }
      }

      return res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to record action taken.",
        },
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Lab 4 — PATCH /api/tickets/:ticketId/actions/:actionId
// Update Action Taken, transition status, reassign, or resolve follow-up
// Optimistic concurrency locking via expectedVersion (BR-11)
// ---------------------------------------------------------------------------
actionsRouter.patch(
  "/:ticketId/actions/:actionId",
  authenticateToken,
  requirePasswordChangeResolved,
  (req: Request, res: Response, next) => {
    if (req.user?.role === "REQUESTER") {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Requesters are not permitted to modify actions taken.",
        },
      });
    }
    next();
  },
  requireRole(["IT_STAFF", "ADMINISTRATOR"]),
  async (req: Request, res: Response) => {
    try {
      const ticketId = parseInt(req.params.ticketId, 10);
      const actionId = parseInt(req.params.actionId, 10);

      if (isNaN(ticketId) || isNaN(actionId)) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Valid ticket ID and action ID are required.",
          },
        });
      }

      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Ticket not found.",
          },
        });
      }

      if (
        ticket.currentStatus === TicketStatus.CLOSED ||
        ticket.currentStatus === TicketStatus.CANCELLED
      ) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Cannot add or modify actions on a closed or cancelled ticket.",
          },
        });
      }

      const action = await prisma.actionTaken.findFirst({
        where: { id: actionId, ticketId },
        include: {
          performedBy: { select: { id: true, name: true, role: true, email: true } },
          assignee: { select: { id: true, name: true, role: true, email: true } },
        },
      });

      if (!action) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Action taken not found.",
          },
        });
      }

      const {
        expectedVersion,
        actionDescription,
        result,
        status,
        assigneeId,
        cancellationReason,
        reason,
        followUpRequired,
        followUpNote,
        attachmentNotes,
        resolveFollowUp,
      } = req.body;

      // BR-11: Optimistic Concurrency Control
      if (expectedVersion === undefined || expectedVersion === null || typeof expectedVersion !== "number") {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "expectedVersion is required for optimistic concurrency control.",
          },
        });
      }

      if (action.version !== expectedVersion) {
        return res.status(409).json({
          error: {
            code: "CONFLICT",
            message: "The action was modified by another user. Please reload to view latest changes.",
            currentAction: action,
          },
        });
      }

      // Terminal check: CANCELLED actions cannot be modified
      if (action.status === ActionStatus.CANCELLED) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Cancelled actions are terminal and cannot be modified or reopened.",
          },
        });
      }

      const updateData: any = {};

      // Status progression check per BR-07
      if (status !== undefined) {
        const upperStatus = String(status).toUpperCase();
        if (!Object.values(ActionStatus).includes(upperStatus as ActionStatus)) {
          return res.status(400).json({
            error: {
              code: "BAD_REQUEST",
              message: "Invalid action status.",
            },
          });
        }
        const nextStatus = upperStatus as ActionStatus;
        if (!isValidActionStatusTransition(action.status, nextStatus)) {
          return res.status(400).json({
            error: {
              code: "BAD_REQUEST",
              message: `Invalid action status transition from ${action.status} to ${nextStatus}.`,
            },
          });
        }
        updateData.status = nextStatus;

        if (nextStatus === ActionStatus.CANCELLED) {
          const effectiveCancelReason = (cancellationReason || reason);
          const trimmedCancel = typeof effectiveCancelReason === "string" ? effectiveCancelReason.trim() : "";
          if (trimmedCancel.length < 5 || trimmedCancel.length > 2000) {
            return res.status(400).json({
              error: {
                code: "BAD_REQUEST",
                message: "Cancellation reason is required when transitioning to CANCELLED (between 5 and 2000 characters).",
              },
            });
          }
          updateData.cancellationReason = trimmedCancel;
        }
      }

      // Description update
      if (actionDescription !== undefined) {
        const trimmedDesc = typeof actionDescription === "string" ? actionDescription.trim() : "";
        if (trimmedDesc.length < 5 || trimmedDesc.length > 2000) {
          return res.status(400).json({
            error: {
              code: "BAD_REQUEST",
              message: "Action description must be between 5 and 2000 characters.",
            },
          });
        }
        updateData.actionDescription = trimmedDesc;
      }

      // Result update
      const targetStatus = updateData.status || action.status;
      if (result !== undefined) {
        const trimmedResult = typeof result === "string" ? result.trim() : null;
        if (targetStatus === ActionStatus.COMPLETED && (!trimmedResult || trimmedResult.length < 3)) {
          return res.status(400).json({
            error: {
              code: "BAD_REQUEST",
              message: "Result is required when status is COMPLETED (minimum 3 characters).",
            },
          });
        }
        updateData.result = trimmedResult;
      } else if (targetStatus === ActionStatus.COMPLETED && (!action.result || action.result.trim().length < 3)) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Result is required when status is COMPLETED (minimum 3 characters).",
          },
        });
      }

      // Follow-Up updates
      if (followUpRequired !== undefined) {
        const isFollowUp = Boolean(followUpRequired);
        updateData.followUpRequired = isFollowUp;
        if (isFollowUp) {
          const noteToTest = followUpNote !== undefined ? followUpNote : action.followUpNote;
          const trimmedNote = typeof noteToTest === "string" ? noteToTest.trim() : "";
          if (trimmedNote.length < 5 || trimmedNote.length > 2000) {
            return res.status(400).json({
              error: {
                code: "BAD_REQUEST",
                message: "Follow-up note is required when follow-up is requested (minimum 5 characters).",
              },
            });
          }
          updateData.followUpNote = trimmedNote;
        } else {
          updateData.followUpNote = null;
        }
      } else if (followUpNote !== undefined && action.followUpRequired) {
        const trimmedNote = typeof followUpNote === "string" ? followUpNote.trim() : "";
        if (trimmedNote.length < 5 || trimmedNote.length > 2000) {
          return res.status(400).json({
            error: {
              code: "BAD_REQUEST",
              message: "Follow-up note must be between 5 and 2000 characters.",
            },
          });
        }
        updateData.followUpNote = trimmedNote;
      }

      // Follow-Up resolution (BR-06 / AC-03: stamps followUpResolvedAt without erasing note)
      if (resolveFollowUp === true) {
        updateData.followUpResolvedAt = new Date();
      }

      // Attachment Notes update
      if (attachmentNotes !== undefined) {
        updateData.attachmentNotes = attachmentNotes ? String(attachmentNotes).trim().slice(0, 1000) : null;
      }

      // Assignee reassignment
      if (assigneeId !== undefined) {
        if (assigneeId === null || assigneeId === "") {
          updateData.assigneeId = null;
        } else {
          const numAssignee = parseInt(String(assigneeId), 10);
          if (isNaN(numAssignee)) {
            return res.status(400).json({
              error: {
                code: "INVALID_ASSIGNEE",
                message: "Invalid assignee ID.",
              },
            });
          }
          const targetUser = await prisma.user.findUnique({
            where: { id: numAssignee },
          });
          if (!targetUser || !targetUser.isActive || targetUser.role === "REQUESTER") {
            return res.status(400).json({
              error: {
                code: "INVALID_ASSIGNEE",
                message: "Assignee must be an active IT Staff or Administrator account.",
              },
            });
          }
          updateData.assigneeId = numAssignee;
        }
      }

      updateData.version = { increment: 1 };

      const [updatedAction] = await prisma.$transaction([
        prisma.actionTaken.update({
          where: { id: actionId },
          data: updateData,
          include: {
            performedBy: { select: { id: true, name: true, role: true, email: true } },
            assignee: { select: { id: true, name: true, role: true, email: true } },
          },
        }),
        prisma.ticket.update({
          where: { id: ticketId },
          data: { updatedAt: new Date() },
        }),
      ]);

      return res.status(200).json(updatedAction);
    } catch (_err) {
      return res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to update action taken.",
        },
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Lab 4 — POST /api/tickets/:ticketId/actions/:actionId/cancel
// Append-only cancellation endpoint preserving cancellation reason (FR-07, BR-07, AC-17)
// ---------------------------------------------------------------------------
actionsRouter.post(
  "/:ticketId/actions/:actionId/cancel",
  authenticateToken,
  requirePasswordChangeResolved,
  (req: Request, res: Response, next) => {
    if (req.user?.role === "REQUESTER") {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Requesters are not permitted to cancel actions taken.",
        },
      });
    }
    next();
  },
  requireRole(["IT_STAFF", "ADMINISTRATOR"]),
  async (req: Request, res: Response) => {
    try {
      const ticketId = parseInt(req.params.ticketId, 10);
      const actionId = parseInt(req.params.actionId, 10);

      if (isNaN(ticketId) || isNaN(actionId)) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Valid ticket ID and action ID are required.",
          },
        });
      }

      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Ticket not found.",
          },
        });
      }

      if (
        ticket.currentStatus === TicketStatus.CLOSED ||
        ticket.currentStatus === TicketStatus.CANCELLED
      ) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Cannot add or modify actions on a closed or cancelled ticket.",
          },
        });
      }

      const action = await prisma.actionTaken.findFirst({
        where: { id: actionId, ticketId },
        include: {
          performedBy: { select: { id: true, name: true, role: true, email: true } },
          assignee: { select: { id: true, name: true, role: true, email: true } },
        },
      });

      if (!action) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Action taken not found.",
          },
        });
      }

      if (action.status === ActionStatus.CANCELLED) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Action is already cancelled.",
          },
        });
      }

      const { expectedVersion, reason, cancellationReason } = req.body;

      if (expectedVersion === undefined || expectedVersion === null || typeof expectedVersion !== "number") {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "expectedVersion is required for optimistic concurrency control.",
          },
        });
      }

      if (action.version !== expectedVersion) {
        return res.status(409).json({
          error: {
            code: "CONFLICT",
            message: "The action was modified by another user. Please reload to view latest changes.",
            currentAction: action,
          },
        });
      }

      const effectiveReason = reason || cancellationReason;
      const trimmedReason = typeof effectiveReason === "string" ? effectiveReason.trim() : "";
      if (trimmedReason.length < 5 || trimmedReason.length > 2000) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Cancellation reason is required (between 5 and 2000 characters).",
          },
        });
      }

      const [updatedAction] = await prisma.$transaction([
        prisma.actionTaken.update({
          where: { id: actionId },
          data: {
            status: ActionStatus.CANCELLED,
            cancellationReason: trimmedReason,
            version: { increment: 1 },
          },
          include: {
            performedBy: { select: { id: true, name: true, role: true, email: true } },
            assignee: { select: { id: true, name: true, role: true, email: true } },
          },
        }),
        prisma.ticket.update({
          where: { id: ticketId },
          data: { updatedAt: new Date() },
        }),
      ]);

      return res.status(200).json(updatedAction);
    } catch (_err) {
      return res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to cancel action taken.",
        },
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Lab 4 — DELETE /api/tickets/:ticketId/actions/:actionId
// Prohibit hard physical deletes at the API boundary (BR-07, FR-07)
// ---------------------------------------------------------------------------
actionsRouter.delete(
  "/:ticketId/actions/:actionId",
  authenticateToken,
  requirePasswordChangeResolved,
  (req: Request, res: Response) => {
    if (req.user?.role === "REQUESTER") {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Requesters are not permitted to modify actions taken.",
        },
      });
    }
    return res.status(405).json({
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Physical deletion of Actions Taken is prohibited. Please cancel the action instead.",
      },
    });
  }
);
