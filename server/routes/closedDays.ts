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
      closedDays = await storage.getClosedDaysByMonth(restaurantId, parseInt(year as string), parseInt(month as string));
    } else {
      closedDays = await storage.getClosedDays(restaurantId);
    }

    res.json(closedDays);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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
    if (!date) return res.status(400).json({ message: "Date is required" });

    const closedDay = await storage.createClosedDay({
      restaurantId,
      date,
      service: service || "all",
      reason: reason || null,
    });

    res.status(201).json(closedDay);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Delete closed day
router.delete("/:id", requireAuth, async (req: any, res) => {
  try {
    const closedDayId = parseInt(req.params.id);
    if (isNaN(closedDayId)) return res.status(400).json({ message: "Invalid closed day ID" });

    const closedDay = await storage.getClosedDay(closedDayId);
    if (!closedDay) return res.status(404).json({ message: "Closed day not found" });

    const restaurant = await storage.getRestaurant(closedDay.restaurantId);
    if (!restaurant) return res.status(404).json({ message: "Restaurant introuvable" });
    if (restaurant.ownerId !== req.userId) return res.status(403).json({ message: "Non autorisé pour ce restaurant" });

    await storage.deleteClosedDay(closedDayId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
