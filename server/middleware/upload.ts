import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";
import multer from "multer";

const UPLOADS_DIR = path.resolve("uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    cb(null, `${randomUUID()}${ext}`);
  },
});

const ALLOWED_MIMES = [
  "image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf",
];
const ALLOWED_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf"];

export const upload = multer({
  storage: diskStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTS.includes(ext) || !ALLOWED_MIMES.includes(file.mimetype)) {
      return cb(new Error("Type de fichier non autorisé"));
    }
    cb(null, true);
  },
});
