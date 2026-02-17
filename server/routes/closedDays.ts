import { Router } from "express";
import { storage } from "../services/storage";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Get closed days for a restaurant
router.get("/restaurant/:id", requireAuth, async (req: any, res) => {
  try {
    const restaurantId = parseInt(req.params.id);
    if (isNaN(restaurantId)) return res.status(400).json({ message: "Identifiant de restaurant invalide" });

    const restaurant = await storage.getRestaurant(restaurantId);
    if (!restaurant) return res.status(404).json({ message: "Restaurant introuvable" });
    if (restaurant.ownerId !== req.userId) return res.status(403).json({ message: "Non autorisé pour ce restaurant" });

    const { year, month } = req.query;
    let closedDays;
    if (year && month) {
      const yearNum = parseInt(year as string);
      const monthNum = parseInt(month as string);
      if (isNaN(yearNum) || isNaN(monthNum) || yearNum < 1900 || yearNum > 2100 || monthNum < 1 || monthNum > 12) {
        return res.status(400).json({ message: "Année ou mois invalide" });
      }
      closedDays = await storage.getClosedDaysByMonth(restaurantId, yearNum, monthNum);
    } else {
      closedDays = await storage.getClosedDays(restaurantId);
    }

    res.json(closedDays);
  } catch (error: any) {
    console.error("Closed days error:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Create closed day
router.post("/restaurant/:id", requireAuth, async (req: any, res) => {
  try {
    const restaurantId = parseInt(req.params.id);
    if (isNaN(restaurantId)) return res.status(400).json({ message: "Identifiant de restaurant invalide" });

    const restaurant = await storage.getRestaurant(restaurantId);
    if (!restaurant) return res.status(404).json({ message: "Restaurant introuvable" });
    if (restaurant.ownerId !== req.userId) return res.status(403).json({ message: "Non autorisé pour ce restaurant" });

    const { date, service, reason } = req.body;
    if (!date) return res.status(400).json({ message: "La date est requise" });

    const closedDay = await storage.createClosedDay({
      restaurantId,
      date,
      service: service || "all",
      reason: reason || null,
    });

    res.status(201).json(closedDay);
  } catch (error: any) {
    console.error("Closed days error:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Delete closed day
router.delete("/:id", requireAuth, async (req: any, res) => {
  try {
    const closedDayId = parseInt(req.params.id);
    if (isNaN(closedDayId)) return res.status(400).json({ message: "Identifiant invalide" });

    const closedDay = await storage.getClosedDay(closedDayId);
    if (!closedDay) return res.status(404).json({ message: "Jour de fermeture introuvable" });

    const restaurant = await storage.getRestaurant(closedDay.restaurantId);
    if (!restaurant) return res.status(404).json({ message: "Restaurant introuvable" });
    if (restaurant.ownerId !== req.userId) return res.status(403).json({ message: "Non autorisé pour ce restaurant" });

    await storage.deleteClosedDay(closedDayId);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Closed days error:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

export default router;
