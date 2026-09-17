import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const JWT_SECRET = process.env.JWT_SECRET || "toktickit-super-secret-jwt-key-2026";

export interface AuthenticatedUserPayload {
  id: number;
  email: string;
  name: string;
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  mustChangePassword: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUserPayload;
    }
  }
}

/**
 * Middleware: verifies JWT Bearer token from Authorization header.
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;

  if (!token) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication token is missing or malformed",
      },
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err || !decoded) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication token is invalid or expired",
        },
      });
    }

    req.user = decoded as AuthenticatedUserPayload;
    next();
  });
}

/**
 * Optional Auth Middleware: attaches user if valid token present, but does not block if absent.
 * Useful for backwards compatibility with unauthenticated Lab 2 tests.
 */
export function optionalAuthenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return next();
  }

  const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;
  if (!token) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication token is missing or malformed",
      },
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err || !decoded) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication token is invalid or expired",
        },
      });
    }

    req.user = decoded as AuthenticatedUserPayload;
    next();
  });
}

/**
 * Middleware: restricts route access to specific roles.
 */
export function requireRole(allowedRoles: Array<"REQUESTER" | "IT_STAFF" | "ADMINISTRATOR">) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: `Access denied. Requires one of roles: ${allowedRoles.join(", ")}`,
        },
      });
    }

    next();
  };
}

/**
 * Middleware: route guard enforcing BR-02. If user must change password,
 * block normal business endpoints with HTTP 403 PASSWORD_CHANGE_REQUIRED.
 */
export function requirePasswordChangeResolved(req: Request, res: Response, next: NextFunction) {
  if (req.user && req.user.mustChangePassword) {
    return res.status(403).json({
      error: {
        code: "PASSWORD_CHANGE_REQUIRED",
        message: "You must change your password before accessing the application.",
      },
    });
  }
  next();
}
