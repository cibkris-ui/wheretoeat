import { Router } from "express";
import { storage } from "../services/storage";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Get floor plan
router.get("/restaurant/:id", requireAuth, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Identifiant de restaurant invalide" });

    const restaurant = await storage.getRestaurant(id);
    if (!restaurant) return res.status(404).json({ message: "Restaurant introuvable" });
    if (restaurant.ownerId !== req.userId) return res.status(403).json({ message: "Non autorisé pour ce restaurant" });

    const floorPlan = await storage.getFloorPlan(id);
    res.json(floorPlan?.plan || { zones: [] });
  } catch (error: any) {
    console.error("Floor plan error:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Save floor plan
router.put("/restaurant/:id", requireAuth, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Identifiant de restaurant invalide" });

    const restaurant = await storage.getRestaurant(id);
    if (!restaurant) return res.status(404).json({ message: "Restaurant introuvable" });
    if (restaurant.ownerId !== req.userId) return res.status(403).json({ message: "Non autorisé pour ce restaurant" });

    const plan = req.body;
    const saved = await storage.saveFloorPlan(id, plan);
    res.json(saved);
  } catch (error: any) {
    console.error("Floor plan error:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

export default router;
