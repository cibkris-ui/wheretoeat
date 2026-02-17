import { Router } from "express";
import { upload } from "../middleware/upload";
import { uploadLimiter } from "../middleware/rateLimiter";

const router = Router();

router.post("/", uploadLimiter, upload.single("file"), (req: any, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Aucun fichier fourni" });
  }
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

export default router;
