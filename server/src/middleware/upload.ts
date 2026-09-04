import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

// Ensure upload directory exists
const UPLOAD_DIR = path.resolve(process.cwd(), "uploads", "attachments");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".pdf",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});

export const uploadAttachments = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max per file
    files: 5,                  // max 5 files
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(ext)) {
      const err = new Error("Unsupported file format. Allowed: JPG, PNG, WEBP, PDF.");
      (err as any).code = "UNSUPPORTED_MEDIA_TYPE";
      return cb(err);
    }
    cb(null, true);
  },
});
