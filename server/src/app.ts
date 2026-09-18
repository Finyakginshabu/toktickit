import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import multer from "multer";
import { getPrisma } from "./prisma.js";
import { generateTicketNumber } from "./utils/ticketNumber.js";
import { uploadAttachments } from "./middleware/upload.js";
import { Priority, TicketStatus } from "@prisma/client";
import { authRouter } from "./routes/auth.js";
import { staffRouter } from "./routes/staff.js";
import { adminRouter } from "./routes/admin.js";
import {
  authenticateToken,
  optionalAuthenticateToken,
  requirePasswordChangeResolved,
  requireRole,
} from "./middleware/auth.js";
import { isValidStatusTransition } from "./utils/statusTransitions.js";

export const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRouter);
app.use("/api/staff", staffRouter);
app.use("/api/admin", adminRouter);

// ---------------------------------------------------------------------------
// Lab 1 — API health check
// GET /api/health
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// ---------------------------------------------------------------------------
// Lab 1 — Category list
// GET /api/categories
// ---------------------------------------------------------------------------
app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const categories = await prisma.category.findMany({
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json(categories);
  } catch (_err) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 — Development Requesters
// GET /api/requesters (returns only active requesters: isActive = true)
// ---------------------------------------------------------------------------
app.get("/api/requesters", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const requesters = await prisma.user.findMany({
      where: {
        role: "REQUESTER",
        isActive: true,
        email: { endsWith: "@kmutt.ac.th" },
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
      },
    });
    res.status(200).json(requesters);
  } catch (_err) {
    res.status(500).json({ error: "Failed to fetch active development requesters" });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 — Related Systems
// GET /api/related-systems (returns only active related systems: isActive = true)
// ---------------------------------------------------------------------------
app.get("/api/related-systems", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const systems = await prisma.relatedSystem.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    });
    res.status(200).json(systems);
  } catch (_err) {
    res.status(500).json({ error: "Failed to fetch active related systems" });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 — Create Ticket
// POST /api/tickets (supports multipart attachments)
// ---------------------------------------------------------------------------
app.post(
  "/api/tickets",
  optionalAuthenticateToken,
  requirePasswordChangeResolved,
  (req: Request, res: Response, next: NextFunction) => {
    if (req.user && req.user.role !== "REQUESTER") {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "IT Staff and Administrators are not permitted to create tickets.",
        },
      });
    }

    uploadAttachments.array("attachments", 5)(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({
              error: {
                code: "PAYLOAD_TOO_LARGE",
                message: "One or more attachments exceed the 5 MB limit.",
              },
            });
          }
          if (err.code === "LIMIT_UNEXPECTED_FILE") {
            return res.status(400).json({
              error: {
                code: "BAD_REQUEST",
                message: "Maximum 5 attachments allowed per ticket.",
              },
            });
          }
        }
        if ((err as any).code === "UNSUPPORTED_MEDIA_TYPE") {
          return res.status(415).json({
            error: {
              code: "UNSUPPORTED_MEDIA_TYPE",
              message: err.message,
            },
          });
        }
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: err.message,
          },
        });
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    const files = (req.files as Express.Multer.File[]) || [];
    const cleanupFiles = () => {
      for (const file of files) {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    };

    try {
      const {
        requesterId,
        categoryId,
        relatedSystemId,
        summary,
        description,
        requestedPriority = "MEDIUM",
      } = req.body;

      // In Lab 3, derived from authenticated session/token (BR-03).
      // Fallback to body.requesterId for backward compatibility with Lab 2 tests if unauthenticated.
      const effectiveRequesterId = req.user ? req.user.id : (requesterId ? parseInt(requesterId, 10) : undefined);

      const errors: { field: string; message: string }[] = [];

      const parsedRequesterId = effectiveRequesterId ? Number(effectiveRequesterId) : NaN;
      const parsedCategoryId = Number(categoryId);
      const parsedRelatedSystemId = Number(relatedSystemId);

      if (!effectiveRequesterId || isNaN(parsedRequesterId)) {
        errors.push({ field: "requesterId", message: "Requester selection is required." });
      }
      if (!categoryId || isNaN(parsedCategoryId)) {
        errors.push({ field: "categoryId", message: "Category selection is required." });
      }
      if (!relatedSystemId || isNaN(parsedRelatedSystemId)) {
        errors.push({ field: "relatedSystemId", message: "Related system selection is required." });
      }

      const trimmedSummary = typeof summary === "string" ? summary.trim() : "";
      if (!trimmedSummary || trimmedSummary.length < 5 || trimmedSummary.length > 100) {
        errors.push({
          field: "summary",
          message: "Summary must be between 5 and 100 characters.",
        });
      }

      const trimmedDescription = typeof description === "string" ? description.trim() : "";
      if (!trimmedDescription || trimmedDescription.length < 10 || trimmedDescription.length > 2000) {
        errors.push({
          field: "description",
          message: "Description must be between 10 and 2000 characters.",
        });
      }

      const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
      const upperPriority = String(requestedPriority).toUpperCase();
      if (!validPriorities.includes(upperPriority)) {
        errors.push({
          field: "requestedPriority",
          message: "Priority must be one of LOW, MEDIUM, HIGH, URGENT.",
        });
      }

      if (errors.length > 0) {
        cleanupFiles();
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid ticket input data.",
            details: errors,
          },
        });
      }

      const prisma = getPrisma();

      // Verify active user
      const requester = await prisma.user.findUnique({
        where: { id: parsedRequesterId },
      });
      if (!requester || !requester.isActive) {
        cleanupFiles();
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Selected requester is invalid or inactive.",
          },
        });
      }

      // Verify category
      const category = await prisma.category.findUnique({
        where: { id: parsedCategoryId },
      });
      if (!category) {
        cleanupFiles();
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Selected category does not exist.",
          },
        });
      }

      // Verify related system
      const relatedSystem = await prisma.relatedSystem.findUnique({
        where: { id: parsedRelatedSystemId },
      });
      if (!relatedSystem || !relatedSystem.isActive) {
        cleanupFiles();
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Selected related system does not exist or is inactive.",
          },
        });
      }

      // Create ticket & attachments in an atomic transaction with concurrency retry
      let newTicket;
      let attempts = 0;
      const MAX_ATTEMPTS = 10;

      while (attempts < MAX_ATTEMPTS) {
        try {
          newTicket = await prisma.$transaction(async (tx) => {
            const ticketNumber = await generateTicketNumber(tx);

            const ticket = await tx.ticket.create({
              data: {
                ticketNumber,
                requesterId: parsedRequesterId,
                categoryId: parsedCategoryId,
                relatedSystemId: parsedRelatedSystemId,
                summary: trimmedSummary,
                description: trimmedDescription,
                requestedPriority: upperPriority as Priority,
                itPriority: upperPriority as Priority,
                currentStatus: TicketStatus.NEW,
              },
            });

            // Insert attachments if any
            if (files.length > 0) {
              await tx.attachment.createMany({
                data: files.map((f) => ({
                  ticketId: ticket.id,
                  fileName: f.filename,
                  originalName: f.originalname,
                  fileSize: f.size,
                  mimeType: f.mimetype,
                  storagePath: path.relative(process.cwd(), f.path),
                  isRemoved: false,
                })),
              });
            }

            return tx.ticket.findUnique({
              where: { id: ticket.id },
              include: {
                category: { select: { id: true, name: true } },
                relatedSystem: { select: { id: true, name: true } },
                requester: { select: { id: true, name: true, email: true, department: true } },
                attachments: {
                  where: { isRemoved: false },
                  select: {
                    id: true,
                    originalName: true,
                    fileSize: true,
                    mimeType: true,
                    isRemoved: true,
                    uploadedAt: true,
                  },
                },
              },
            });
          });
          break;
        } catch (txErr: any) {
          if (txErr.code === "P2002") {
            attempts++;
            await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 25) + 10));
            continue;
          }
          throw txErr;
        }
      }

      if (!newTicket) {
        cleanupFiles();
        return res.status(500).json({
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to generate unique ticket number after multiple attempts.",
          },
        });
      }

      return res.status(201).json(newTicket);
    } catch (_err) {
      cleanupFiles();
      return res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred while creating the ticket.",
        },
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Lab 2 & 3 — My Tickets List
// GET /api/tickets / GET /api/tickets/my-tickets (search, filters, sorting, pagination, ownership isolation)
// ---------------------------------------------------------------------------
const handleMyTickets = async (req: Request, res: Response) => {
  try {
    const { requesterId, search, categoryId, priority, status, page, pageSize, sortBy, sortOrder } = req.query;

    const effectiveRequesterId = req.user ? req.user.id : (requesterId ? parseInt(requesterId as string, 10) : NaN);

    if (isNaN(effectiveRequesterId) || effectiveRequesterId <= 0) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "requesterId query parameter is required.",
        },
      });
    }

    const parsedRequesterId = effectiveRequesterId;

    const prisma = getPrisma();

    // Build query filter with strict ownership
    const where: any = {
      requesterId: parsedRequesterId,
    };

    // Keyword search on summary and ticket number (case-insensitive)
    if (search && typeof search === "string" && search.trim().length > 0) {
      const trimmedSearch = search.trim();
      where.OR = [
        { summary: { contains: trimmedSearch, mode: "insensitive" } },
        { ticketNumber: { contains: trimmedSearch, mode: "insensitive" } },
      ];
    }

    // Category filter
    if (categoryId) {
      const parsedCatId = parseInt(categoryId as string, 10);
      if (!isNaN(parsedCatId)) {
        where.categoryId = parsedCatId;
      }
    }

    // Priority filter
    if (priority && typeof priority === "string") {
      const upperPriority = priority.toUpperCase();
      if (Object.values(Priority).includes(upperPriority as Priority)) {
        where.requestedPriority = upperPriority as Priority;
      }
    }

    // Status filter
    if (status && typeof status === "string") {
      const upperStatus = status.toUpperCase();
      if (Object.values(TicketStatus).includes(upperStatus as TicketStatus)) {
        where.currentStatus = upperStatus as TicketStatus;
      }
    }

    // Pagination clamping (BR-14: 1 <= pageSize <= 50, page >= 1)
    const parsedPage = Math.max(1, parseInt(page as string, 10) || 1);
    const parsedPageSize = Math.min(50, Math.max(1, parseInt(pageSize as string, 10) || 10));
    const skip = (parsedPage - 1) * parsedPageSize;

    // Sorting (default: createdAt desc, secondary: id desc)
    const validSortFields = ["createdAt", "requestedPriority", "ticketNumber", "currentStatus"];
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
          relatedSystem: { select: { id: true, name: true } },
          _count: {
            select: {
              attachments: {
                where: { isRemoved: false },
              },
            },
          },
        },
      }),
    ]);

    const formattedTickets = tickets.map((t) => {
      const { _count, ...rest } = t;
      return {
        ...rest,
        attachmentCount: _count?.attachments ?? 0,
      };
    });

    const totalPages = total === 0 ? 1 : Math.ceil(total / parsedPageSize);

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
        message: "Failed to retrieve tickets.",
      },
    });
  }
};

app.get("/api/tickets", optionalAuthenticateToken, requirePasswordChangeResolved, handleMyTickets);
app.get("/api/tickets/my-tickets", optionalAuthenticateToken, requirePasswordChangeResolved, handleMyTickets);

// ---------------------------------------------------------------------------
// Lab 2 & 3 — Ticket Detail
// GET /api/tickets/:id (full details, ownership check)
// ---------------------------------------------------------------------------
app.get("/api/tickets/:id", optionalAuthenticateToken, requirePasswordChangeResolved, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const requesterId = req.query.requesterId ? parseInt(req.query.requesterId as string, 10) : undefined;

    if (isNaN(id)) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Valid ticket id is required.",
        },
      });
    }

    if (!req.user && (!requesterId || isNaN(requesterId))) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Valid ticket id and requesterId are required.",
        },
      });
    }

    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        requester: { select: { id: true, name: true, email: true, department: true } },
        ticketOwner: { select: { id: true, name: true, email: true, role: true } },
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        attachments: {
          orderBy: { id: "asc" },
          select: {
            id: true,
            ticketId: true,
            originalName: true,
            fileSize: true,
            mimeType: true,
            isRemoved: true,
            removedReason: true,
            removedAt: true,
            uploadedAt: true,
          },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Ticket No.t found.",
        },
      });
    }

    if (req.user) {
      if (req.user.role === "REQUESTER" && ticket.requesterId !== req.user.id) {
        return res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "Access denied. You do not own this ticket.",
          },
        });
      }
    } else {
      if (ticket.requesterId !== requesterId) {
        return res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "Access denied. You do not own this ticket.",
          },
        });
      }
    }

    return res.status(200).json(ticket);
  } catch (_err) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to retrieve ticket details.",
      },
    });
  }
});

// ---------------------------------------------------------------------------
// Lab 3 — Ticket Ownership Assignment / Claiming
// PATCH /api/tickets/:id/assignment (claim or assign to active IT_STAFF / ADMIN)
// Restricted strictly to IT_STAFF and ADMINISTRATOR (FR-10, BR-13, AC-11, AC-12)
// ---------------------------------------------------------------------------
app.patch(
  "/api/tickets/:id/assignment",
  authenticateToken,
  requirePasswordChangeResolved,
  requireRole(["IT_STAFF", "ADMINISTRATOR"]),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { ownerId } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Valid ticket id is required.",
          },
        });
      }

      const parsedOwnerId = parseInt(ownerId, 10);
      if (isNaN(parsedOwnerId)) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Valid ownerId is required.",
          },
        });
      }

      const prisma = getPrisma();

      // Verify owner is an active user with role IT_STAFF or ADMINISTRATOR (BR-13)
      const targetUser = await prisma.user.findUnique({
        where: { id: parsedOwnerId },
      });

      if (!targetUser || !targetUser.isActive || (targetUser.role !== "IT_STAFF" && targetUser.role !== "ADMINISTRATOR")) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Ticket owner must be an active IT Staff or Administrator.",
          },
        });
      }

      const ticket = await prisma.ticket.findUnique({ where: { id } });
      if (!ticket) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Ticket not found.",
          },
        });
      }

      // AC-11: status transitions to OPEN if currently NEW
      const newStatus = ticket.currentStatus === TicketStatus.NEW ? TicketStatus.OPEN : ticket.currentStatus;

      const updated = await prisma.ticket.update({
        where: { id },
        data: {
          ticketOwnerId: parsedOwnerId,
          currentStatus: newStatus,
        },
      });

      return res.status(200).json({
        id: updated.id,
        ticketOwnerId: updated.ticketOwnerId,
        currentStatus: updated.currentStatus,
      });
    } catch (_err) {
      return res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to assign ticket owner.",
        },
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Lab 3 — Update IT Priority Independently
// PATCH /api/tickets/:id/priority (updates itPriority without modifying requestedPriority)
// Restricted strictly to IT_STAFF and ADMINISTRATOR (FR-11, BR-12, AC-13)
// ---------------------------------------------------------------------------
app.patch(
  "/api/tickets/:id/priority",
  authenticateToken,
  requirePasswordChangeResolved,
  requireRole(["IT_STAFF", "ADMINISTRATOR"]),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { itPriority } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Valid ticket id is required.",
          },
        });
      }

      const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
      const upperPriority = typeof itPriority === "string" ? itPriority.toUpperCase() : "";
      if (!validPriorities.includes(upperPriority)) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Priority must be one of LOW, MEDIUM, HIGH, URGENT.",
          },
        });
      }

      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({ where: { id } });
      if (!ticket) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Ticket not found.",
          },
        });
      }

      const updated = await prisma.ticket.update({
        where: { id },
        data: {
          itPriority: upperPriority as Priority,
        },
      });

      return res.status(200).json({
        id: updated.id,
        itPriority: updated.itPriority,
        requestedPriority: updated.requestedPriority,
      });
    } catch (_err) {
      return res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to update IT Priority.",
        },
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Lab 3 — Transition Ticket Status Workflow
// PATCH /api/tickets/:id/status (enforces 8-status transition matrix per BR-14)
// Restricted strictly to IT_STAFF and ADMINISTRATOR (FR-12, BR-14, AC-14, AC-15)
// ---------------------------------------------------------------------------
app.patch(
  "/api/tickets/:id/status",
  authenticateToken,
  requirePasswordChangeResolved,
  requireRole(["IT_STAFF", "ADMINISTRATOR"]),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { status, resolutionSummary } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Valid ticket id is required.",
          },
        });
      }

      const upperStatus = typeof status === "string" ? status.toUpperCase() : "";
      if (!Object.values(TicketStatus).includes(upperStatus as TicketStatus)) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Invalid ticket status.",
          },
        });
      }

      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({ where: { id } });
      if (!ticket) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Ticket not found.",
          },
        });
      }

      // Enforce status transition matrix (BR-14, AC-14, AC-15)
      if (!isValidStatusTransition(ticket.currentStatus, upperStatus as TicketStatus)) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: `Invalid status transition from ${ticket.currentStatus} to ${upperStatus}.`,
          },
        });
      }

      const updateData: any = {
        currentStatus: upperStatus as TicketStatus,
      };

      if (upperStatus === TicketStatus.RESOLVED && resolutionSummary !== undefined) {
        updateData.resolutionSummary = typeof resolutionSummary === "string" ? resolutionSummary.trim() : null;
      }

      const updated = await prisma.ticket.update({
        where: { id },
        data: updateData,
      });

      return res.status(200).json({
        id: updated.id,
        currentStatus: updated.currentStatus,
        resolutionSummary: updated.resolutionSummary,
      });
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

// ---------------------------------------------------------------------------
// Lab 3 — Requester Resolution Indication
// POST /api/tickets/:id/indicate-resolved
// Restricted strictly to the authenticated Ticket Owner (Requester) (FR-07, BR-05, AC-09)
// ---------------------------------------------------------------------------
app.post(
  "/api/tickets/:id/indicate-resolved",
  authenticateToken,
  requirePasswordChangeResolved,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Valid ticket id is required.",
          },
        });
      }

      const user = req.user!;
      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({ where: { id } });
      if (!ticket) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Ticket not found.",
          },
        });
      }

      // Strictly restricted to Ticket Owner (Requester) (BR-05, AC-09, Auth Matrix)
      if (user.role !== "REQUESTER" || ticket.requesterId !== user.id) {
        return res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "Only the ticket requester can indicate problem resolution.",
          },
        });
      }

      // Atomic transaction: update flag + timestamp and create audit comment
      const updated = await prisma.$transaction(async (tx) => {
        const t = await tx.ticket.update({
          where: { id },
          data: {
            problemAppearsResolved: true,
            problemAppearsResolvedAt: new Date(),
          },
        });

        await tx.publicComment.create({
          data: {
            ticketId: id,
            authorId: user.id,
            content: "Requester indicated that the problem appears resolved.",
          },
        });

        return t;
      });

      return res.status(200).json({
        id: updated.id,
        problemAppearsResolved: updated.problemAppearsResolved,
        problemAppearsResolvedAt: updated.problemAppearsResolvedAt,
      });
    } catch (_err) {
      return res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to record requester resolution indication.",
        },
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Lab 3 — Public Comments Stream
// GET /api/tickets/:id/comments & POST /api/tickets/:id/comments
// Requesters (owned ticket only), IT_STAFF and ADMINISTRATOR (any ticket) (FR-13, BR-04, BR-15, AC-16)
// ---------------------------------------------------------------------------
app.get(
  "/api/tickets/:id/comments",
  authenticateToken,
  requirePasswordChangeResolved,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Valid ticket id is required.",
          },
        });
      }

      const user = req.user!;
      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({ where: { id } });
      if (!ticket) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Ticket not found.",
          },
        });
      }

      if (user.role === "REQUESTER" && ticket.requesterId !== user.id) {
        return res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "Access denied. You do not own this ticket.",
          },
        });
      }

      const comments = await prisma.publicComment.findMany({
        where: { ticketId: id },
        orderBy: { createdAt: "asc" },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      });

      return res.status(200).json(comments);
    } catch (_err) {
      return res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to retrieve public comments.",
        },
      });
    }
  }
);

app.post(
  "/api/tickets/:id/comments",
  authenticateToken,
  requirePasswordChangeResolved,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { content } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Valid ticket id is required.",
          },
        });
      }

      const user = req.user!;
      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({ where: { id } });
      if (!ticket) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Ticket not found.",
          },
        });
      }

      if (user.role === "REQUESTER" && ticket.requesterId !== user.id) {
        return res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "Access denied. You do not own this ticket.",
          },
        });
      }

      const trimmedContent = typeof content === "string" ? content.trim() : "";
      if (!trimmedContent || trimmedContent.length < 1 || trimmedContent.length > 2000) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Comment content must be between 1 and 2000 characters.",
          },
        });
      }

      const comment = await prisma.publicComment.create({
        data: {
          ticketId: id,
          authorId: user.id,
          content: trimmedContent,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      });

      return res.status(201).json(comment);
    } catch (_err) {
      return res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create public comment.",
        },
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Lab 3 — Internal Notes Stream
// GET /api/tickets/:id/notes & POST /api/tickets/:id/notes
// Restricted strictly to IT_STAFF and ADMINISTRATOR (Requesters receive 403 Forbidden) (FR-14, BR-04, BR-15, BR-16, AC-17)
// ---------------------------------------------------------------------------
app.get(
  "/api/tickets/:id/notes",
  authenticateToken,
  requirePasswordChangeResolved,
  requireRole(["IT_STAFF", "ADMINISTRATOR"]),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Valid ticket id is required.",
          },
        });
      }

      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({ where: { id } });
      if (!ticket) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Ticket not found.",
          },
        });
      }

      const notes = await prisma.internalNote.findMany({
        where: { ticketId: id },
        orderBy: { createdAt: "asc" },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      });

      return res.status(200).json(notes);
    } catch (_err) {
      return res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to retrieve internal notes.",
        },
      });
    }
  }
);

app.post(
  "/api/tickets/:id/notes",
  authenticateToken,
  requirePasswordChangeResolved,
  requireRole(["IT_STAFF", "ADMINISTRATOR"]),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { content } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Valid ticket id is required.",
          },
        });
      }

      const user = req.user!;
      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({ where: { id } });
      if (!ticket) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Ticket not found.",
          },
        });
      }

      const trimmedContent = typeof content === "string" ? content.trim() : "";
      if (!trimmedContent || trimmedContent.length < 1 || trimmedContent.length > 2000) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Note content must be between 1 and 2000 characters.",
          },
        });
      }

      const note = await prisma.internalNote.create({
        data: {
          ticketId: id,
          authorId: user.id,
          content: trimmedContent,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      });

      return res.status(201).json(note);
    } catch (_err) {
      return res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create internal note.",
        },
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Lab 2 & 3 — Attachment Metadata
// GET /api/attachments/:id
// ---------------------------------------------------------------------------
app.get("/api/attachments/:id", optionalAuthenticateToken, requirePasswordChangeResolved, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const requesterId = req.query.requesterId ? parseInt(req.query.requesterId as string, 10) : undefined;

    if (isNaN(id)) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Valid attachment id is required.",
        },
      });
    }

    if (!req.user && (!requesterId || isNaN(requesterId))) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Valid attachment id and requesterId are required.",
        },
      });
    }

    const prisma = getPrisma();
    const attachment = await prisma.attachment.findUnique({
      where: { id },
      include: {
        ticket: { select: { id: true, requesterId: true } },
      },
    });

    if (!attachment) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Attachment not found.",
        },
      });
    }

    if (req.user) {
      if (req.user.role === "REQUESTER" && attachment.ticket.requesterId !== req.user.id) {
        return res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "Access denied. You do not own the ticket for this attachment.",
          },
        });
      }
    } else {
      if (attachment.ticket.requesterId !== requesterId) {
        return res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "Access denied. You do not own the ticket for this attachment.",
          },
        });
      }
    }

    const { ticket, ...meta } = attachment;
    return res.status(200).json(meta);
  } catch (_err) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to retrieve attachment metadata.",
      },
    });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 & 3 — Add Attachment to Existing Ticket
// POST /api/tickets/:id/attachments (single file upload, 5 active cap)
// ---------------------------------------------------------------------------
app.post(
  "/api/tickets/:id/attachments",
  optionalAuthenticateToken,
  requirePasswordChangeResolved,
  (req: Request, res: Response, next: NextFunction) => {
    uploadAttachments.single("file")(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({
              error: {
                code: "PAYLOAD_TOO_LARGE",
                message: "Attachment exceeds the 5 MB limit.",
              },
            });
          }
        }
        if ((err as any).code === "UNSUPPORTED_MEDIA_TYPE") {
          return res.status(415).json({
            error: {
              code: "UNSUPPORTED_MEDIA_TYPE",
              message: err.message,
            },
          });
        }
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: err.message,
          },
        });
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    const file = req.file;

    const cleanupSingleFile = () => {
      if (file && fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
        } catch (_e) { }
      }
    };

    try {
      if (!file) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Attachment file is required.",
          },
        });
      }

      const ticketId = parseInt(req.params.id, 10);
      const requesterId = req.body.requesterId ? parseInt(req.body.requesterId, 10) : undefined;

      if (isNaN(ticketId)) {
        cleanupSingleFile();
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Valid ticket id is required.",
          },
        });
      }

      if (!req.user && (!requesterId || isNaN(requesterId))) {
        cleanupSingleFile();
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Valid ticket id and requesterId are required.",
          },
        });
      }

      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        cleanupSingleFile();
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Ticket No.t found.",
          },
        });
      }

      if (req.user) {
        if (req.user.role === "REQUESTER" && ticket.requesterId !== req.user.id) {
          cleanupSingleFile();
          return res.status(403).json({
            error: {
              code: "FORBIDDEN",
              message: "Access denied. You do not own this ticket.",
            },
          });
        }
      } else {
        if (ticket.requesterId !== requesterId) {
          cleanupSingleFile();
          return res.status(403).json({
            error: {
              code: "FORBIDDEN",
              message: "Access denied. You do not own this ticket.",
            },
          });
        }
      }

      // Check active attachment cap (BR-10, AC-16)
      const activeCount = await prisma.attachment.count({
        where: { ticketId, isRemoved: false },
      });

      if (activeCount >= 5) {
        cleanupSingleFile();
        return res.status(400).json({
          error: {
            code: "ATTACHMENT_CAP_REACHED",
            message: "Maximum 5 active attachments allowed per ticket.",
          },
        });
      }

      const newAttachment = await prisma.attachment.create({
        data: {
          ticketId,
          fileName: file.filename,
          originalName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          storagePath: path.relative(process.cwd(), file.path),
          isRemoved: false,
        },
      });

      return res.status(201).json({
        id: newAttachment.id,
        ticketId: newAttachment.ticketId,
        originalName: newAttachment.originalName,
        fileSize: newAttachment.fileSize,
        mimeType: newAttachment.mimeType,
        isRemoved: newAttachment.isRemoved,
        uploadedAt: newAttachment.uploadedAt,
      });
    } catch (_err) {
      cleanupSingleFile();
      return res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to upload attachment.",
        },
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Lab 2 & 3 — Attachment Download
// GET /api/attachments/:id/download (streams active binary; 410 if soft-removed)
// ---------------------------------------------------------------------------
app.get("/api/attachments/:id/download", optionalAuthenticateToken, requirePasswordChangeResolved, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const requesterId = req.query.requesterId ? parseInt(req.query.requesterId as string, 10) : undefined;

    if (isNaN(id)) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Valid attachment id is required.",
        },
      });
    }

    if (!req.user && (!requesterId || isNaN(requesterId))) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Valid attachment id and requesterId are required.",
        },
      });
    }

    const prisma = getPrisma();
    const attachment = await prisma.attachment.findUnique({
      where: { id },
      include: {
        ticket: { select: { requesterId: true } },
      },
    });

    if (!attachment) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Attachment not found.",
        },
      });
    }

    if (req.user) {
      if (req.user.role === "REQUESTER" && attachment.ticket.requesterId !== req.user.id) {
        return res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "Access denied. You do not own this attachment.",
          },
        });
      }
    } else {
      if (attachment.ticket.requesterId !== requesterId) {
        return res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "Access denied. You do not own this attachment.",
          },
        });
      }
    }

    // Block download of soft-removed files (BR-12, AC-18)
    if (attachment.isRemoved) {
      return res.status(410).json({
        error: {
          code: "ATTACHMENT_REMOVED",
          message: "This attachment has been removed and cannot be downloaded.",
        },
      });
    }

    const fullPath = path.resolve(process.cwd(), attachment.storagePath);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        error: {
          code: "FILE_NOT_FOUND",
          message: "Attachment file not found on disk.",
        },
      });
    }

    return res.download(fullPath, attachment.originalName);
  } catch (_err) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to download attachment.",
      },
    });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 & 3 — Attachment Soft Removal
// PATCH /api/attachments/:id/soft-remove
// ---------------------------------------------------------------------------
app.patch("/api/attachments/:id/soft-remove", optionalAuthenticateToken, requirePasswordChangeResolved, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { requesterId, reason } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Valid attachment id is required.",
        },
      });
    }

    if (!req.user && (!requesterId || isNaN(parseInt(requesterId, 10)))) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Valid attachment id and requesterId are required.",
        },
      });
    }

    const trimmedReason = typeof reason === "string" ? reason.trim() : "";
    if (!trimmedReason || trimmedReason.length < 3) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "A removal reason of at least 3 characters is required.",
        },
      });
    }

    const prisma = getPrisma();
    const attachment = await prisma.attachment.findUnique({
      where: { id },
      include: {
        ticket: { select: { requesterId: true } },
      },
    });

    if (!attachment) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Attachment not found.",
        },
      });
    }

    if (req.user) {
      if (req.user.role === "REQUESTER" && attachment.ticket.requesterId !== req.user.id) {
        return res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "Access denied. You do not own this attachment.",
          },
        });
      }
    } else {
      if (attachment.ticket.requesterId !== parseInt(requesterId, 10)) {
        return res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "Access denied. You do not own this attachment.",
          },
        });
      }
    }

    if (attachment.isRemoved) {
      return res.status(409).json({
        error: {
          code: "ALREADY_REMOVED",
          message: "Attachment is already removed.",
        },
      });
    }

    const updated = await prisma.attachment.update({
      where: { id },
      data: {
        isRemoved: true,
        removedReason: trimmedReason,
        removedAt: new Date(),
      },
    });

    return res.status(200).json({
      id: updated.id,
      ticketId: updated.ticketId,
      isRemoved: updated.isRemoved,
      removedReason: updated.removedReason,
      removedAt: updated.removedAt,
    });
  } catch (_err) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to soft-remove attachment.",
      },
    });
  }
});

export default app;
