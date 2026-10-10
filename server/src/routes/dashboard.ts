import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { authenticateToken, requirePasswordChangeResolved, requireRole } from "../middleware/auth.js";
import { Priority, Role, TicketStatus } from "@prisma/client";
import {
  getBangkokDateBoundaries,
  calculateDeltas,
  CANONICAL_REQUESTER_DRILL_DOWN_URLS,
  CANONICAL_STAFF_DRILL_DOWN_URLS,
  CANONICAL_ADMIN_DRILL_DOWN_URLS,
} from "../utils/dashboardMetrics.js";

export const dashboardRouter = Router();

// ---------------------------------------------------------------------------
// 3.1. GET /api/dashboard/requester
// Strict ownership isolation: aggregate metrics only for requesterId = auth.userId
// Allowed: REQUESTER, IT_STAFF, ADMINISTRATOR (authenticated)
// ---------------------------------------------------------------------------
dashboardRouter.get(
  "/requester",
  authenticateToken,
  requirePasswordChangeResolved,
  async (req: Request, res: Response) => {
    try {
      const prisma = getPrisma();
      const userId = (req as any).user.id;
      const boundaries = getBangkokDateBoundaries();

      const [
        myOpenTickets,
        inProgressTickets,
        resolvedTickets,
        closedTickets,
        waitingForRequesterTickets,
        recentTicketsRaw,
      ] = await Promise.all([
        // myOpenTickets: statuses in {NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, REOPENED}
        prisma.ticket.count({
          where: {
            requesterId: userId,
            currentStatus: {
              in: [
                TicketStatus.NEW,
                TicketStatus.OPEN,
                TicketStatus.IN_PROGRESS,
                TicketStatus.WAITING_FOR_REQUESTER,
                TicketStatus.REOPENED,
              ],
            },
          },
        }),
        // inProgressTickets: status = IN_PROGRESS
        prisma.ticket.count({
          where: {
            requesterId: userId,
            currentStatus: TicketStatus.IN_PROGRESS,
          },
        }),
        // resolvedTickets: status = RESOLVED and resolvedAt >= 30-day Bangkok window
        prisma.ticket.count({
          where: {
            requesterId: userId,
            currentStatus: TicketStatus.RESOLVED,
            resolvedAt: {
              gte: boundaries.thirtyDaysAgo,
            },
          },
        }),
        // closedTickets: status = CLOSED
        prisma.ticket.count({
          where: {
            requesterId: userId,
            currentStatus: TicketStatus.CLOSED,
          },
        }),
        // waitingForRequesterTickets: status = WAITING_FOR_REQUESTER
        prisma.ticket.count({
          where: {
            requesterId: userId,
            currentStatus: TicketStatus.WAITING_FOR_REQUESTER,
          },
        }),
        // recentTickets: top 5 ordered by updatedAt DESC within last 30 calendar days
        prisma.ticket.findMany({
          where: {
            requesterId: userId,
            updatedAt: {
              gte: boundaries.thirtyDaysAgo,
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
          take: 5,
          include: {
            category: true,
          },
        }),
      ]);

      const recentTickets = recentTicketsRaw.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        summary: t.summary,
        currentStatus: t.currentStatus,
        requestedPriority: t.requestedPriority,
        updatedAt: t.updatedAt.toISOString(),
        categoryName: t.category.name,
      }));

      return res.status(200).json({
        metrics: {
          myOpenTickets,
          inProgressTickets,
          resolvedTickets,
          closedTickets,
          waitingForRequesterTickets,
        },
        drillDownUrls: CANONICAL_REQUESTER_DRILL_DOWN_URLS,
        recentTickets,
      });
    } catch (err: any) {
      console.error("Error fetching requester dashboard metrics:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve requester dashboard metrics.",
        },
      });
    }
  }
);

// ---------------------------------------------------------------------------
// 3.2. GET /api/dashboard/staff
// Operational queues, deltas, system-wide counts
// Role guard: IT_STAFF, ADMINISTRATOR only (403 for Requesters)
// ---------------------------------------------------------------------------
dashboardRouter.get(
  "/staff",
  authenticateToken,
  requirePasswordChangeResolved,
  requireRole(["IT_STAFF", "ADMINISTRATOR"]),
  async (req: Request, res: Response) => {
    try {
      const prisma = getPrisma();
      const userId = (req as any).user.id;
      const boundaries = getBangkokDateBoundaries();

      const activeStatusFilter = {
        notIn: [TicketStatus.RESOLVED, TicketStatus.CLOSED, TicketStatus.CANCELLED],
      };

      const [
        newTickets,
        openTickets,
        inProgressTickets,
        waitingForRequesterTickets,
        myAssignedTickets,
        unassignedTickets,
        highUrgentTickets,
        myOpenActionsCount,
        // Daily delta queries (evaluated at Asia/Bangkok midnight boundaries)
        newToday,
        newYesterday,
        openToday,
        openYesterday,
        inProgToday,
        inProgYesterday,
        waitingToday,
        waitingYesterday,
        assignedToday,
        assignedYesterday,
        // System-wide recent tickets within 30-day window
        recentTicketsRaw,
      ] = await Promise.all([
        prisma.ticket.count({ where: { currentStatus: TicketStatus.NEW } }),
        prisma.ticket.count({ where: { currentStatus: TicketStatus.OPEN } }),
        prisma.ticket.count({ where: { currentStatus: TicketStatus.IN_PROGRESS } }),
        prisma.ticket.count({ where: { currentStatus: TicketStatus.WAITING_FOR_REQUESTER } }),
        prisma.ticket.count({
          where: {
            ticketOwnerId: userId,
            currentStatus: activeStatusFilter,
          },
        }),
        prisma.ticket.count({
          where: {
            ticketOwnerId: null,
            currentStatus: activeStatusFilter,
          },
        }),
        prisma.ticket.count({
          where: {
            itPriority: { in: [Priority.HIGH, Priority.URGENT] },
            currentStatus: activeStatusFilter,
          },
        }),
        // myOpenActionsCount: actions performed by caller on active tickets
        prisma.actionTaken.count({
          where: {
            performedById: userId,
            ticket: {
              currentStatus: activeStatusFilter,
            },
          },
        }),

        // Deltas
        prisma.ticket.count({
          where: { currentStatus: TicketStatus.NEW, createdAt: { gte: boundaries.startOfToday } },
        }),
        prisma.ticket.count({
          where: {
            currentStatus: TicketStatus.NEW,
            createdAt: { gte: boundaries.startOfYesterday, lte: boundaries.endOfYesterday },
          },
        }),

        prisma.ticket.count({
          where: { currentStatus: TicketStatus.OPEN, updatedAt: { gte: boundaries.startOfToday } },
        }),
        prisma.ticket.count({
          where: {
            currentStatus: TicketStatus.OPEN,
            updatedAt: { gte: boundaries.startOfYesterday, lte: boundaries.endOfYesterday },
          },
        }),

        prisma.ticket.count({
          where: { currentStatus: TicketStatus.IN_PROGRESS, updatedAt: { gte: boundaries.startOfToday } },
        }),
        prisma.ticket.count({
          where: {
            currentStatus: TicketStatus.IN_PROGRESS,
            updatedAt: { gte: boundaries.startOfYesterday, lte: boundaries.endOfYesterday },
          },
        }),

        prisma.ticket.count({
          where: { currentStatus: TicketStatus.WAITING_FOR_REQUESTER, updatedAt: { gte: boundaries.startOfToday } },
        }),
        prisma.ticket.count({
          where: {
            currentStatus: TicketStatus.WAITING_FOR_REQUESTER,
            updatedAt: { gte: boundaries.startOfYesterday, lte: boundaries.endOfYesterday },
          },
        }),

        prisma.ticket.count({
          where: {
            ticketOwnerId: userId,
            currentStatus: activeStatusFilter,
            updatedAt: { gte: boundaries.startOfToday },
          },
        }),
        prisma.ticket.count({
          where: {
            ticketOwnerId: userId,
            currentStatus: activeStatusFilter,
            updatedAt: { gte: boundaries.startOfYesterday, lte: boundaries.endOfYesterday },
          },
        }),

        // Top 5 tickets system-wide updated within last 30 calendar days
        prisma.ticket.findMany({
          where: {
            updatedAt: {
              gte: boundaries.thirtyDaysAgo,
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
          take: 5,
          include: {
            requester: true,
            ticketOwner: true,
            category: true,
          },
        }),
      ]);

      const deltas = calculateDeltas(
        {
          newTickets: newToday,
          openTickets: openToday,
          inProgressTickets: inProgToday,
          waitingForRequesterTickets: waitingToday,
          myAssignedTickets: assignedToday,
        },
        {
          newTickets: newYesterday,
          openTickets: openYesterday,
          inProgressTickets: inProgYesterday,
          waitingForRequesterTickets: waitingYesterday,
          myAssignedTickets: assignedYesterday,
        }
      );

      const recentTickets = recentTicketsRaw.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        summary: t.summary,
        currentStatus: t.currentStatus,
        itPriority: t.itPriority,
        requesterName: t.requester?.name ?? "",
        ticketOwnerName: t.ticketOwner?.name ?? null,
        updatedAt: t.updatedAt.toISOString(),
        categoryName: t.category?.name ?? "",
      }));

      return res.status(200).json({
        metrics: {
          newTickets,
          openTickets,
          inProgressTickets,
          waitingForRequesterTickets,
          myAssignedTickets,
          unassignedTickets,
          highUrgentTickets,
          myOpenActionsCount,
        },
        deltas,
        drillDownUrls: CANONICAL_STAFF_DRILL_DOWN_URLS,
        recentTickets,
      });
    } catch (err: any) {
      console.error("Error fetching staff dashboard metrics:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve staff dashboard metrics.",
        },
      });
    }
  }
);

// ---------------------------------------------------------------------------
// 3.3. GET /api/dashboard/admin
// Extends IT Staff operational metrics with user-account summary counters
// Role guard: ADMINISTRATOR only (403 for Staff and Requesters)
// ---------------------------------------------------------------------------
dashboardRouter.get(
  "/admin",
  authenticateToken,
  requirePasswordChangeResolved,
  requireRole(["ADMINISTRATOR"]),
  async (req: Request, res: Response) => {
    try {
      const prisma = getPrisma();
      const userId = (req as any).user.id;
      const boundaries = getBangkokDateBoundaries();

      const activeStatusFilter = {
        notIn: [TicketStatus.RESOLVED, TicketStatus.CLOSED, TicketStatus.CANCELLED],
      };

      const [
        newTickets,
        openTickets,
        inProgressTickets,
        waitingForRequesterTickets,
        myAssignedTickets,
        unassignedTickets,
        highUrgentTickets,
        myOpenActionsCount,
        // Deltas
        newToday,
        newYesterday,
        openToday,
        openYesterday,
        inProgToday,
        inProgYesterday,
        waitingToday,
        waitingYesterday,
        assignedToday,
        assignedYesterday,
        // System-wide recent tickets
        recentTicketsRaw,
        // User account metrics (BR-14)
        totalUsers,
        activeUsers,
        inactiveUsers,
        requesterCount,
        staffCount,
        adminCount,
      ] = await Promise.all([
        prisma.ticket.count({ where: { currentStatus: TicketStatus.NEW } }),
        prisma.ticket.count({ where: { currentStatus: TicketStatus.OPEN } }),
        prisma.ticket.count({ where: { currentStatus: TicketStatus.IN_PROGRESS } }),
        prisma.ticket.count({ where: { currentStatus: TicketStatus.WAITING_FOR_REQUESTER } }),
        prisma.ticket.count({
          where: {
            ticketOwnerId: userId,
            currentStatus: activeStatusFilter,
          },
        }),
        prisma.ticket.count({
          where: {
            ticketOwnerId: null,
            currentStatus: activeStatusFilter,
          },
        }),
        prisma.ticket.count({
          where: {
            itPriority: { in: [Priority.HIGH, Priority.URGENT] },
            currentStatus: activeStatusFilter,
          },
        }),
        prisma.actionTaken.count({
          where: {
            performedById: userId,
            ticket: {
              currentStatus: activeStatusFilter,
            },
          },
        }),

        // Deltas
        prisma.ticket.count({
          where: { currentStatus: TicketStatus.NEW, createdAt: { gte: boundaries.startOfToday } },
        }),
        prisma.ticket.count({
          where: {
            currentStatus: TicketStatus.NEW,
            createdAt: { gte: boundaries.startOfYesterday, lte: boundaries.endOfYesterday },
          },
        }),

        prisma.ticket.count({
          where: { currentStatus: TicketStatus.OPEN, updatedAt: { gte: boundaries.startOfToday } },
        }),
        prisma.ticket.count({
          where: {
            currentStatus: TicketStatus.OPEN,
            updatedAt: { gte: boundaries.startOfYesterday, lte: boundaries.endOfYesterday },
          },
        }),

        prisma.ticket.count({
          where: { currentStatus: TicketStatus.IN_PROGRESS, updatedAt: { gte: boundaries.startOfToday } },
        }),
        prisma.ticket.count({
          where: {
            currentStatus: TicketStatus.IN_PROGRESS,
            updatedAt: { gte: boundaries.startOfYesterday, lte: boundaries.endOfYesterday },
          },
        }),

        prisma.ticket.count({
          where: { currentStatus: TicketStatus.WAITING_FOR_REQUESTER, updatedAt: { gte: boundaries.startOfToday } },
        }),
        prisma.ticket.count({
          where: {
            currentStatus: TicketStatus.WAITING_FOR_REQUESTER,
            updatedAt: { gte: boundaries.startOfYesterday, lte: boundaries.endOfYesterday },
          },
        }),

        prisma.ticket.count({
          where: {
            ticketOwnerId: userId,
            currentStatus: activeStatusFilter,
            updatedAt: { gte: boundaries.startOfToday },
          },
        }),
        prisma.ticket.count({
          where: {
            ticketOwnerId: userId,
            currentStatus: activeStatusFilter,
            updatedAt: { gte: boundaries.startOfYesterday, lte: boundaries.endOfYesterday },
          },
        }),

        // Recent tickets
        prisma.ticket.findMany({
          where: {
            updatedAt: {
              gte: boundaries.thirtyDaysAgo,
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
          take: 5,
          include: {
            requester: true,
            ticketOwner: true,
            category: true,
          },
        }),

        // User metrics
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.user.count({ where: { isActive: false } }),
        prisma.user.count({ where: { role: Role.REQUESTER } }),
        prisma.user.count({ where: { role: Role.IT_STAFF } }),
        prisma.user.count({ where: { role: Role.ADMINISTRATOR } }),
      ]);

      const deltas = calculateDeltas(
        {
          newTickets: newToday,
          openTickets: openToday,
          inProgressTickets: inProgToday,
          waitingForRequesterTickets: waitingToday,
          myAssignedTickets: assignedToday,
        },
        {
          newTickets: newYesterday,
          openTickets: openYesterday,
          inProgressTickets: inProgYesterday,
          waitingForRequesterTickets: waitingYesterday,
          myAssignedTickets: assignedYesterday,
        }
      );

      const recentTickets = recentTicketsRaw.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        summary: t.summary,
        currentStatus: t.currentStatus,
        itPriority: t.itPriority,
        requesterName: t.requester?.name ?? "",
        ticketOwnerName: t.ticketOwner?.name ?? null,
        updatedAt: t.updatedAt.toISOString(),
        categoryName: t.category?.name ?? "",
      }));

      const operationalMetrics = {
        newTickets,
        openTickets,
        inProgressTickets,
        waitingForRequesterTickets,
        myAssignedTickets,
        unassignedTickets,
        highUrgentTickets,
        myOpenActionsCount,
      };

      return res.status(200).json({
        ticketMetrics: operationalMetrics,
        metrics: operationalMetrics,
        userMetrics: {
          totalUsers,
          activeUsers,
          inactiveUsers,
          usersByRole: {
            REQUESTER: requesterCount,
            IT_STAFF: staffCount,
            ADMINISTRATOR: adminCount,
          },
        },
        deltas,
        drillDownUrls: CANONICAL_ADMIN_DRILL_DOWN_URLS,
        recentTickets,
      });
    } catch (err: any) {
      console.error("Error fetching admin dashboard metrics:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve admin dashboard metrics.",
        },
      });
    }
  }
);
