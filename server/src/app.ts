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

      // Create ticket & attachments in an atomic transaction
      const newTicket = await prisma.$transaction(async (tx) => {
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

export default app;
