import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { authenticateToken, requirePasswordChangeResolved, requireRole } from "../middleware/auth.js";
import { Priority, TicketStatus } from "@prisma/client";
import { isValidStatusTransition, isResolutionGateRequired } from "../utils/statusTransitions.js";
import { evaluateResolutionGate } from "../utils/resolutionGate.js";

export const staffRouter = Router();

// ---------------------------------------------------------------------------
// Lab 3 — IT Staff Ticket Queue
// GET /api/staff/tickets (search, multi-criteria filters, sorting, clamped pagination)
// Restricted strictly to IT_STAFF and ADMINISTRATOR
// ---------------------------------------------------------------------------
staffRouter.get(
  "/tickets",
  authenticateToken,
  requirePasswordChangeResolved,
  requireRole(["IT_STAFF", "ADMINISTRATOR"]),
  async (req: Request, res: Response) => {
    try {
      const {
        search,
        categoryId,
        status,
        itPriority,
        ownerId,
        page,
        pageSize,
        sortBy,
        sortOrder,
      } = req.query;

      const prisma = getPrisma();
      const where: any = {};

      // 1. Text Search across summary and ticketNumber (case-insensitive)
      if (search && typeof search === "string" && search.trim().length > 0) {
        const trimmedSearch = search.trim();
        where.OR = [
          { summary: { contains: trimmedSearch, mode: "insensitive" } },
          { ticketNumber: { contains: trimmedSearch, mode: "insensitive" } },
        ];
      }

      // 2. Category Filter
      if (categoryId) {
        const parsedCatId = parseInt(categoryId as string, 10);
        if (!isNaN(parsedCatId)) {
          where.categoryId = parsedCatId;
        }
      }

      // 3. Status Filter — supports comma-separated values (OR within status, BR-15)
      if (status && typeof status === "string") {
        const rawStatuses = status.split(",").map((s) => s.trim().toUpperCase());
        const validStatuses = rawStatuses.filter((s) =>
          Object.values(TicketStatus).includes(s as TicketStatus)
        );
        const invalidStatuses = rawStatuses.filter(
          (s) => !Object.values(TicketStatus).includes(s as TicketStatus)
        );
        if (invalidStatuses.length > 0) {
          return res.status(400).json({
            error: {
              code: "VALIDATION_ERROR",
              message: `Invalid status value(s): ${invalidStatuses.join(", ")}. Valid values are: ${Object.values(TicketStatus).join(", ")}.`,
            },
          });
        }
        if (validStatuses.length === 1) {
          where.currentStatus = validStatuses[0];
        } else if (validStatuses.length > 1) {
          where.currentStatus = { in: validStatuses };
        }
      }

      // 4. IT Priority Filter — supports comma-separated values (OR within priority, BR-15)
      if (itPriority && typeof itPriority === "string") {
        const rawPriorities = itPriority.split(",").map((p) => p.trim().toUpperCase());
        const validPriorities = rawPriorities.filter((p) =>
          Object.values(Priority).includes(p as Priority)
        );
        const invalidPriorities = rawPriorities.filter(
          (p) => !Object.values(Priority).includes(p as Priority)
        );
        if (invalidPriorities.length > 0) {
          return res.status(400).json({
            error: {
              code: "VALIDATION_ERROR",
              message: `Invalid itPriority value(s): ${invalidPriorities.join(", ")}. Valid values are: ${Object.values(Priority).join(", ")}.`,
            },
          });
        }
        if (validPriorities.length === 1) {
          where.itPriority = validPriorities[0];
        } else if (validPriorities.length > 1) {
          where.itPriority = { in: validPriorities };
        }
      }

      // 5. Ownership Filter:
      // "0" or "unassigned" -> unassigned tickets (ticketOwnerId is null)
      // "me" -> tickets assigned to authenticated caller (BR-15)
      // Specific integer > 0 -> assigned to that user
      if (ownerId !== undefined && ownerId !== null && ownerId !== "") {
        const ownerStr = String(ownerId).toLowerCase().trim();
        if (ownerStr === "0" || ownerStr === "unassigned") {
          where.ticketOwnerId = null;
        } else if (ownerStr === "me") {
          where.ticketOwnerId = (req as any).user.id;
        } else {
          const parsedOwnerId = parseInt(ownerStr, 10);
          if (!isNaN(parsedOwnerId) && parsedOwnerId > 0) {
            where.ticketOwnerId = parsedOwnerId;
          }
        }
      }

      // 6. Pagination Clamping (BR-19: 1 <= pageSize <= 50, page >= 1)
      const rawPage = parseInt(page as string, 10);
      const rawPageSize = parseInt(pageSize as string, 10);
      const parsedPage = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
      const parsedPageSize = isNaN(rawPageSize) || rawPageSize < 1 ? 10 : Math.min(50, Math.max(1, rawPageSize));
      const skip = (parsedPage - 1) * parsedPageSize;

      // 7. Sorting (default: createdAt desc, secondary: id desc)
      const validSortFields = ["createdAt", "itPriority", "currentStatus", "ticketNumber"];
      const sortField = validSortFields.includes(sortBy as string) ? (sortBy as string) : "createdAt";
      const direction: "asc" | "desc" = (sortOrder as string)?.toLowerCase() === "asc" ? "asc" : "desc";
      const orderBy = [
        { [sortField]: direction },
        { id: "desc" as const },
      ];

      const [total, tickets] = await prisma.$transaction([
        prisma.ticket.count({ where }),
        prisma.ticket.findMany({
          where,
          skip,
          take: parsedPageSize,
          orderBy,
          include: {
            category: { select: { id: true, name: true } },
            requester: { select: { id: true, name: true } },
            ticketOwner: { select: { id: true, name: true, email: true } },
          },
        }),
      ]);

      const totalPages = total === 0 ? 1 : Math.ceil(total / parsedPageSize);

      const formattedTickets = tickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        summary: t.summary,
        requester: { id: t.requester.id, name: t.requester.name },
        category: { id: t.category.id, name: t.category.name },
        requestedPriority: t.requestedPriority,
        itPriority: t.itPriority,
        currentStatus: t.currentStatus,
        ticketOwner: t.ticketOwner ? { id: t.ticketOwner.id, name: t.ticketOwner.name } : null,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      }));

      return res.status(200).json({
        data: formattedTickets,
        pagination: {
          page: parsedPage,
          pageSize: parsedPageSize,
          total,
          totalPages,
        },
      });
    } catch (_err) {
      return res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to retrieve tickets for IT Staff queue.",
        },
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Lab 3 — Active Staff & Administrator Directory
// GET /api/staff/users (returns active IT_STAFF and ADMINISTRATOR users for owner assignment)
// Restricted strictly to IT_STAFF and ADMINISTRATOR
// ---------------------------------------------------------------------------
staffRouter.get(
  "/users",
  authenticateToken,
  requirePasswordChangeResolved,
  requireRole(["IT_STAFF", "ADMINISTRATOR"]),
  async (_req: Request, res: Response) => {
    try {
      const prisma = getPrisma();
      const staffUsers = await prisma.user.findMany({
        where: {
          role: { in: ["IT_STAFF", "ADMINISTRATOR"] },
          isActive: true,
        },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });

      return res.status(200).json(staffUsers);
    } catch (_err) {
      return res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to retrieve active staff users.",
        },
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Lab 4 — Authoritative Ticket Status Workflow & Resolution Gate
// PATCH /api/staff/tickets/:ticketId/status (enforces BR-08, BR-09, BR-11 in atomic transaction)
// Restricted strictly to IT_STAFF and ADMINISTRATOR
// ---------------------------------------------------------------------------
staffRouter.patch(
  "/tickets/:ticketId/status",
  authenticateToken,
  requirePasswordChangeResolved,
  requireRole(["IT_STAFF", "ADMINISTRATOR"]),
  async (req: Request, res: Response) => {
    try {
      const ticketId = parseInt(req.params.ticketId, 10);
      if (isNaN(ticketId)) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Valid ticket id is required.",
          },
        });
      }

      const { status, resolutionSummary, expectedVersion } = req.body;
      const upperStatus = typeof status === "string" ? status.toUpperCase() : "";
      if (!Object.values(TicketStatus).includes(upperStatus as TicketStatus)) {
        return res.status(400).json({
          error: {
            code: "INVALID_TRANSITION",
            message: "Invalid ticket status.",
          },
        });
      }

      const prisma = getPrisma();
      const result = await prisma.$transaction(async (tx) => {
        const ticket = await tx.ticket.findUnique({
          where: { id: ticketId },
        });

        if (!ticket) {
          return {
            errorStatus: 404,
            errorBody: {
              error: {
                code: "NOT_FOUND",
                message: "Ticket not found.",
              },
            },
          };
        }

        // Optimistic Concurrency Check (BR-11)
        if (expectedVersion !== undefined) {
          const parsedExpected = parseInt(expectedVersion, 10);
          if (isNaN(parsedExpected) || ticket.version !== parsedExpected) {
            return {
              errorStatus: 409,
              errorBody: {
                error: {
                  code: "CONFLICT",
                  message:
                    "The ticket was modified by another user. Please reload the ticket to view the latest changes.",
                  currentTicket: {
                    version: ticket.version,
                    currentStatus: ticket.currentStatus,
                    updatedAt: ticket.updatedAt,
                  },
                },
              },
            };
          }
        }

        // Status transition matrix check (BR-08)
        if (!isValidStatusTransition(ticket.currentStatus, upperStatus as TicketStatus)) {
          return {
            errorStatus: 400,
            errorBody: {
              error: {
                code: "INVALID_TRANSITION",
                message: `Invalid status transition from ${ticket.currentStatus} to ${upperStatus}.`,
              },
            },
          };
        }

        // Resolution Gate Check (BR-09)
        if (isResolutionGateRequired(ticket.currentStatus, upperStatus as TicketStatus)) {
          const actionsCount = await tx.actionTaken.count({
            where: { ticketId },
          });

          const gateEvaluation = evaluateResolutionGate({
            actionsCount,
            resolutionSummary,
            currentStatus: ticket.currentStatus,
          });

          if (!gateEvaluation.passed) {
            return {
              errorStatus: 400,
              errorBody: {
                error: {
                  code: "RESOLUTION_GATE_BLOCKED",
                  message: "Ticket does not satisfy resolution gate requirements.",
                  details: gateEvaluation.details,
                },
              },
            };
          }
        }

        const updateData: any = {
          currentStatus: upperStatus as TicketStatus,
          version: { increment: 1 },
        };

        if (upperStatus === TicketStatus.RESOLVED) {
          updateData.resolvedAt = new Date();
          updateData.resolutionSummary =
            typeof resolutionSummary === "string" ? resolutionSummary.trim() : null;
        }

        const updated = await tx.ticket.update({
          where: { id: ticketId },
          data: updateData,
          select: {
            id: true,
            ticketNumber: true,
            currentStatus: true,
            resolutionSummary: true,
            resolvedAt: true,
            version: true,
            updatedAt: true,
          },
        });

        return { data: updated };
      });

      if (result.errorStatus && result.errorBody) {
        return res.status(result.errorStatus).json(result.errorBody);
      }

      return res.status(200).json(result.data);
    } catch (_err) {
      return res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to update ticket status.",
        },
      });
    }
  }
);


