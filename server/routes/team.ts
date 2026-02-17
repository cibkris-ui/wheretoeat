import { Router } from "express";
import bcrypt from "bcryptjs";
import { storage } from "../services/storage";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Get team members for a restaurant
router.get("/restaurant/:id", requireAuth, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Identifiant de restaurant invalide" });

    const restaurant = await storage.getRestaurant(id);
    if (!restaurant) return res.status(404).json({ message: "Restaurant introuvable" });
    if (restaurant.ownerId !== req.userId) return res.status(403).json({ message: "Non autorisé pour ce restaurant" });

    const users = await storage.getRestaurantUsers(id);
    res.json(users);
  } catch (error: any) {
    console.error("Team error:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Add team member
router.post("/restaurant/:id", requireAuth, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Identifiant de restaurant invalide" });

    const restaurant = await storage.getRestaurant(id);
    if (!restaurant) return res.status(404).json({ message: "Restaurant introuvable" });
    if (restaurant.ownerId !== req.userId) return res.status(403).json({ message: "Non autorisé pour ce restaurant" });

    const { email, password, firstName, lastName, role } = req.body;
    if (!email) return res.status(400).json({ message: "L'email est requis" });
    if (!password) return res.status(400).json({ message: "Le mot de passe est requis" });

    const existing = await storage.getRestaurantUserByEmail(id, email);
    if (existing) return res.status(400).json({ message: "L'utilisateur a déjà accès à ce restaurant" });

    let userAccount = await storage.getUserByEmail(email.toLowerCase().trim());

    if (!userAccount) {
      const hashedPassword = await bcrypt.hash(password, 10);
      userAccount = await storage.createUserWithPassword(
        email.toLowerCase().trim(),
        hashedPassword,
        firstName || undefined,
        lastName || undefined
      );
    }

    const newUser = await storage.addRestaurantUserWithAccess({
      restaurantId: id,
      email: email.toLowerCase().trim(),
      role: role || "staff",
      userId: userAccount.id,
    });

    res.status(201).json(newUser);
  } catch (error: any) {
    console.error("Team error:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Remove team member
router.delete("/restaurant/:restaurantId/user/:userId", requireAuth, async (req: any, res) => {
  try {
    const restaurantId = parseInt(req.params.restaurantId);
    const teamUserId = parseInt(req.params.userId);

    if (isNaN(restaurantId) || isNaN(teamUserId)) return res.status(400).json({ message: "Identifiant invalide" });

    const restaurant = await storage.getRestaurant(restaurantId);
    if (!restaurant) return res.status(404).json({ message: "Restaurant introuvable" });
    if (restaurant.ownerId !== req.userId) return res.status(403).json({ message: "Non autorisé pour ce restaurant" });

    await storage.removeRestaurantUser(teamUserId);
    res.json({ message: "Utilisateur retiré" });
  } catch (error: any) {
    console.error("Team error:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

export default router;
