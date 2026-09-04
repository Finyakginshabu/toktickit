import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import multer from "multer";
import { getPrisma } from "./prisma.js";
import { generateTicketNumber } from "./utils/ticketNumber.js";
import { uploadAttachments } from "./middleware/upload.js";
import { Priority, TicketStatus } from "@prisma/client";

export const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
    const requesters = await prisma.requesterUser.findMany({
      where: { isActive: true },
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
  (req: Request, res: Response, next: NextFunction) => {
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

      const errors: { field: string; message: string }[] = [];

      const parsedRequesterId = Number(requesterId);
      const parsedCategoryId = Number(categoryId);
      const parsedRelatedSystemId = Number(relatedSystemId);

      if (!requesterId || isNaN(parsedRequesterId)) {
        errors.push({ field: "requesterId", message: "Valid requesterId is required." });
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

      // Verify active requester
      const requester = await prisma.requesterUser.findUnique({
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
// Lab 2 — My Tickets List
// GET /api/tickets (search, filters, sorting, pagination, ownership isolation)
// ---------------------------------------------------------------------------
app.get("/api/tickets", async (req: Request, res: Response) => {
  try {
    const { requesterId, search, categoryId, priority, status, page, pageSize, sortBy, sortOrder } = req.query;

    if (!requesterId) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "requesterId query parameter is required.",
        },
      });
    }

    const parsedRequesterId = parseInt(requesterId as string, 10);
    if (isNaN(parsedRequesterId) || parsedRequesterId <= 0) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "requesterId must be a valid positive integer.",
        },
      });
    }

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
});

// ---------------------------------------------------------------------------
// Lab 2 — Ticket Detail
// GET /api/tickets/:id (full details, ownership check)
// ---------------------------------------------------------------------------
app.get("/api/tickets/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const requesterId = parseInt(req.query.requesterId as string, 10);

    if (isNaN(id) || isNaN(requesterId)) {
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
          message: "Ticket not found.",
        },
      });
    }

    if (ticket.requesterId !== requesterId) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Access denied. You do not own this ticket.",
        },
      });
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
// Lab 2 — Attachment Metadata
// GET /api/attachments/:id
// ---------------------------------------------------------------------------
app.get("/api/attachments/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const requesterId = parseInt(req.query.requesterId as string, 10);

    if (isNaN(id) || isNaN(requesterId)) {
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

    if (attachment.ticket.requesterId !== requesterId) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Access denied. You do not own the ticket for this attachment.",
        },
      });
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
// Lab 2 — Add Attachment to Existing Ticket
// POST /api/tickets/:id/attachments (single file upload, 5 active cap)
// ---------------------------------------------------------------------------
app.post(
  "/api/tickets/:id/attachments",
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
        } catch (_e) {}
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
      const requesterId = parseInt(req.body.requesterId, 10);

      if (isNaN(ticketId) || isNaN(requesterId)) {
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
            message: "Ticket not found.",
          },
        });
      }

      if (ticket.requesterId !== requesterId) {
        cleanupSingleFile();
        return res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "Access denied. You do not own this ticket.",
          },
        });
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
// Lab 2 — Attachment Download
// GET /api/attachments/:id/download (streams active binary; 410 if soft-removed)
// ---------------------------------------------------------------------------
app.get("/api/attachments/:id/download", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const requesterId = parseInt(req.query.requesterId as string, 10);

    if (isNaN(id) || isNaN(requesterId)) {
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

    if (attachment.ticket.requesterId !== requesterId) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Access denied. You do not own this attachment.",
        },
      });
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
// Lab 2 — Attachment Soft Removal
// PATCH /api/attachments/:id/soft-remove
// ---------------------------------------------------------------------------
app.patch("/api/attachments/:id/soft-remove", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { requesterId, reason } = req.body;

    if (isNaN(id) || !requesterId || isNaN(parseInt(requesterId, 10))) {
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

    if (attachment.ticket.requesterId !== parseInt(requesterId, 10)) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Access denied. You do not own this attachment.",
        },
      });
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
