import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import {
  authenticateToken,
  requirePasswordChangeResolved,
  requireRole,
} from "../middleware/auth.js";
import { validatePasswordComplexity } from "../utils/passwordValidator.js";

export const adminRouter = Router();

// Apply RBAC guards strictly to all /api/admin routes:
// 1. Valid authentication token required
// 2. Mandatory first-login password change resolved
// 3. User role must be ADMINISTRATOR
adminRouter.use(authenticateToken);
adminRouter.use(requirePasswordChangeResolved);
adminRouter.use(requireRole(["ADMINISTRATOR"]));

// ---------------------------------------------------------------------------
// Lab 3 — Administrator User Listing
// GET /api/admin/users (keyword search across name/email, optional role filter)
// ---------------------------------------------------------------------------
adminRouter.get("/users", async (req: Request, res: Response) => {
  try {
    const { search, role } = req.query;
    const prisma = getPrisma();
    const where: any = {};

    // 1. Keyword search (Name or Email, case-insensitive)
    if (search && typeof search === "string" && search.trim().length > 0) {
      const trimmedSearch = search.trim();
      where.OR = [
        { name: { contains: trimmedSearch, mode: "insensitive" } },
        { email: { contains: trimmedSearch, mode: "insensitive" } },
      ];
    }

    // 2. Role filter
    if (role && typeof role === "string") {
      const upperRole = role.toUpperCase().trim();
      if (Object.values(Role).includes(upperRole as Role)) {
        where.role = upperRole as Role;
      }
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        department: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json(users);
  } catch (_err) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to retrieve user accounts.",
      },
    });
  }
});

// ---------------------------------------------------------------------------
// Lab 3 — Administrator User Creation
// POST /api/admin/users (create user with single role, initial password, mustChangePassword=true)
// ---------------------------------------------------------------------------
adminRouter.post("/users", async (req: Request, res: Response) => {
  try {
    const { name, email, role, isActive, initialPassword, department } = req.body;

    // 1. Required field validations
    if (
      !name ||
      typeof name !== "string" ||
      name.trim().length === 0 ||
      !email ||
      typeof email !== "string" ||
      email.trim().length === 0 ||
      !role ||
      typeof role !== "string" ||
      !initialPassword ||
      typeof initialPassword !== "string"
    ) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Name, email, role, and initial password are required.",
        },
      });
    }

    // 2. Validate Role enum (BR-07: Single role assignment)
    const upperRole = role.toUpperCase().trim();
    if (!Object.values(Role).includes(upperRole as Role)) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: `Invalid role: ${role}. Must be one of: ${Object.values(Role).join(", ")}.`,
        },
      });
    }

    // 3. Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // 4. Initial password complexity validation (BR-06)
    const passwordValidation = validatePasswordComplexity(initialPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Initial password does not meet security requirements.",
          details: passwordValidation.errors.map((err) => ({
            field: "initialPassword",
            message: err,
          })),
        },
      });
    }

    const prisma = getPrisma();

    // 5. Unique email check (BR-11)
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      return res.status(409).json({
        error: {
          code: "CONFLICT",
          message: "A user with this email address already exists.",
        },
      });
    }

    // 6. Hash password with bcrypt (salt rounds >= 10 per BR-06)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(initialPassword, salt);

    // 7. Create user with mustChangePassword = true (BR-17, AC-19)
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        role: upperRole as Role,
        passwordHash,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        mustChangePassword: true,
        department: department && typeof department === "string" ? department.trim() : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        department: true,
        createdAt: true,
      },
    });

    return res.status(201).json(newUser);
  } catch (_err) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to create user account.",
      },
    });
  }
});

// ---------------------------------------------------------------------------
// Lab 3 — Administrator User Modification
// PATCH /api/admin/users/:id (edit name, email, role, isActive with safety protections)
// ---------------------------------------------------------------------------
adminRouter.patch("/users/:id", async (req: Request, res: Response) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    if (isNaN(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Invalid user ID.",
        },
      });
    }

    const { name, email, role, isActive, department } = req.body;

    const prisma = getPrisma();
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "User not found.",
        },
      });
    }

    // Safety Rule 1: Admin self-deactivation protection (BR-08, AC-21)
    if (req.user!.id === targetUserId && isActive === false) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Administrators cannot deactivate their own account.",
        },
      });
    }

    // Safety Rule 2: Last active Administrator protection (BR-09, AC-22)
    // If target user is an active Administrator, prevent deactivation or demoting role
    const isTargetActiveAdmin = targetUser.role === "ADMINISTRATOR" && targetUser.isActive;
    const willDeactivate = isActive === false;
    const willChangeRoleAwayFromAdmin =
      role !== undefined && role.toUpperCase().trim() !== "ADMINISTRATOR";

    if (isTargetActiveAdmin && (willDeactivate || willChangeRoleAwayFromAdmin)) {
      const activeAdminCount = await prisma.user.count({
        where: { role: "ADMINISTRATOR", isActive: true },
      });

      if (activeAdminCount <= 1) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Cannot deactivate or change the role of the last active Administrator.",
          },
        });
      }
    }

    // Email Uniqueness & Self-Exclusion (BR-11, AC-20)
    let normalizedEmail: string | undefined;
    if (email !== undefined) {
      if (typeof email !== "string" || email.trim().length === 0) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Email address cannot be empty.",
          },
        });
      }

      normalizedEmail = email.toLowerCase().trim();
      if (normalizedEmail !== targetUser.email.toLowerCase()) {
        const existingWithEmail = await prisma.user.findFirst({
          where: {
            email: normalizedEmail,
            id: { not: targetUserId },
          },
        });

        if (existingWithEmail) {
          return res.status(409).json({
            error: {
              code: "CONFLICT",
              message: "Email address is already taken by another account.",
            },
          });
        }
      }
    }

    // Role validation if provided
    let validatedRole: Role | undefined;
    if (role !== undefined) {
      if (typeof role !== "string") {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Invalid role specified.",
          },
        });
      }
      const upperRole = role.toUpperCase().trim();
      if (!Object.values(Role).includes(upperRole as Role)) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: `Invalid role: ${role}. Must be one of: ${Object.values(Role).join(", ")}.`,
          },
        });
      }
      validatedRole = upperRole as Role;
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        ...(name !== undefined && typeof name === "string" ? { name: name.trim() } : {}),
        ...(normalizedEmail !== undefined ? { email: normalizedEmail } : {}),
        ...(validatedRole !== undefined ? { role: validatedRole } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
        ...(department !== undefined
          ? { department: typeof department === "string" ? department.trim() : null }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        department: true,
        updatedAt: true,
      },
    });

    return res.status(200).json(updatedUser);
  } catch (_err) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to update user details.",
      },
    });
  }
});

// ---------------------------------------------------------------------------
// Lab 3 — Administrator Initial Password Reset
// POST /api/admin/users/:id/reset-password (set initial password, mustChangePassword=true)
// ---------------------------------------------------------------------------
adminRouter.post("/users/:id/reset-password", async (req: Request, res: Response) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    if (isNaN(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Invalid user ID.",
        },
      });
    }

    const { initialPassword } = req.body;
    if (!initialPassword || typeof initialPassword !== "string") {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Initial password is required.",
        },
      });
    }

    // Validate password complexity (BR-06)
    const passwordValidation = validatePasswordComplexity(initialPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "New initial password does not meet security requirements.",
          details: passwordValidation.errors.map((err) => ({
            field: "initialPassword",
            message: err,
          })),
        },
      });
    }

    const prisma = getPrisma();
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "User not found.",
        },
      });
    }

    // Hash password with bcrypt (salt rounds >= 10)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(initialPassword, salt);

    // Update password and enforce mustChangePassword = true (BR-17, AC-23)
    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        passwordHash,
        mustChangePassword: true,
      },
    });

    return res.status(200).json({
      message: "Password reset successfully. User must change password at next login.",
      mustChangePassword: true,
    });
  } catch (_err) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to reset password.",
      },
    });
  }
});
