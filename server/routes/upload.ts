import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { upload } from "../middleware/upload";

const router = Router();

router.post("/", requireAuth, upload.single("file"), (req: any, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file provided" });
  }
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

export default router;
