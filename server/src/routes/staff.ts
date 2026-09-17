import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { authenticateToken, requirePasswordChangeResolved, requireRole } from "../middleware/auth.js";
import { Priority, TicketStatus } from "@prisma/client";

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

      // 3. Status Filter (Valid TicketStatus enum values)
      if (status && typeof status === "string") {
        const upperStatus = status.toUpperCase();
        if (Object.values(TicketStatus).includes(upperStatus as TicketStatus)) {
          where.currentStatus = upperStatus as TicketStatus;
        }
      }

      // 4. IT Priority Filter (Valid Priority enum values)
      if (itPriority && typeof itPriority === "string") {
        const upperPriority = itPriority.toUpperCase();
        if (Object.values(Priority).includes(upperPriority as Priority)) {
          where.itPriority = upperPriority as Priority;
        }
      }

      // 5. Ownership Filter:
      // "0" or "unassigned" -> unassigned tickets (ticketOwnerId is null)
      // Specific integer > 0 -> assigned to that user
      if (ownerId !== undefined && ownerId !== null && ownerId !== "") {
        const ownerStr = String(ownerId).toLowerCase().trim();
        if (ownerStr === "0" || ownerStr === "unassigned") {
          where.ticketOwnerId = null;
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
