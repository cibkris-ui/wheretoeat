import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { storage } from "../services/storage";
import { requireAuth } from "../middleware/auth";
import { authLimiter } from "../middleware/rateLimiter";

const router = Router();

const registerUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Register
router.post("/register", authLimiter, async (req, res) => {
  try {
    const result = registerUserSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: fromZodError(result.error).message });
    }

    const { email, password, firstName, lastName } = result.data;

    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: "Un compte avec cet email existe déjà" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await storage.createUserWithPassword(email, hashedPassword, firstName, lastName);

    (req.session as any).userId = user.id;
    res.status(201).json({
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Erreur lors de l'inscription" });
  }
});

// Check email availability
router.get("/check-email", authLimiter, async (req, res) => {
  try {
    const emailResult = z.string().email().safeParse(req.query.email);
    if (!emailResult.success) {
      return res.status(400).json({ message: "Format email invalide" });
    }
    const existingUser = await storage.getUserByEmail(emailResult.data);
    res.json({ exists: !!existingUser });
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la vérification" });
  }
});

// Login
router.post("/login", authLimiter, async (req, res) => {
  try {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: fromZodError(result.error).message });
    }

    const { email, password } = result.data;

    const user = await storage.getUserByEmail(email);
    if (!user || !user.password) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    (req.session as any).userId = user.id;
    res.json({
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, isAdmin: user.isAdmin },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Erreur lors de la connexion" });
  }
});

// Get current user
router.get("/user", requireAuth, async (req: any, res) => {
  try {
    const user = await storage.getUser(req.userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

// Logout
router.post("/logout", (req: any, res) => {
  req.session.destroy((err: any) => {
    if (err) {
      return res.status(500).json({ message: "Logout failed" });
    }
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out" });
  });
});

export default router;
