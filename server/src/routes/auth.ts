import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getPrisma } from "../prisma.js";
import { JWT_SECRET, authenticateToken } from "../middleware/auth.js";
import { validatePasswordComplexity } from "../utils/passwordValidator.js";

export const authRouter = Router();

// POST /api/auth/login
authRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Email and password are required.",
        },
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const prisma = getPrisma();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid credentials or inactive account.",
        },
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid credentials or inactive account.",
        },
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (_err) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to authenticate.",
      },
    });
  }
});

// POST /api/auth/logout
authRouter.post("/logout", authenticateToken, (_req: Request, res: Response) => {
  return res.status(200).json({ message: "Logged out successfully" });
});

// GET /api/auth/me
authRouter.get("/me", authenticateToken, async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "User not found or inactive account.",
        },
      });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (_err) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to retrieve user profile.",
      },
    });
  }
});

// POST /api/auth/change-password
authRouter.post("/change-password", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword || typeof currentPassword !== "string" || typeof newPassword !== "string") {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Current password and new password are required.",
        },
      });
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "User not found or inactive account.",
        },
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Current password is incorrect.",
        },
      });
    }

    const validation = validatePasswordComplexity(newPassword, currentPassword);
    if (!validation.isValid) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "New password does not meet security requirements.",
          details: validation.errors.map((err) => ({ field: "newPassword", message: err })),
        },
      });
    }

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false,
      },
    });

    return res.status(200).json({
      message: "Password changed successfully",
      mustChangePassword: false,
    });
  } catch (_err) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to change password.",
      },
    });
  }
});
