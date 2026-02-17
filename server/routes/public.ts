import { Router } from "express";
import { storage } from "../services/storage";

const router = Router();

// Public restaurant list (approved + not blocked)
router.get("/restaurants", async (_req, res) => {
  try {
    const restaurants = await storage.getAllRestaurants();
    res.json(restaurants);
  } catch (error: any) {
    console.error("Public route error:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Public restaurant detail
router.get("/restaurants/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Identifiant de restaurant invalide" });

    const restaurant = await storage.getRestaurant(id);
    if (!restaurant) return res.status(404).json({ message: "Restaurant introuvable" });

    res.json(restaurant);
  } catch (error: any) {
    console.error("Public route error:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Public closed days (for booking form calendar)
router.get("/restaurants/:id/closed-days", async (req, res) => {
  try {
    const restaurantId = parseInt(req.params.id);
    if (isNaN(restaurantId)) return res.status(400).json({ message: "Identifiant de restaurant invalide" });

    const restaurant = await storage.getRestaurant(restaurantId);
    if (!restaurant) return res.status(404).json({ message: "Restaurant introuvable" });

    const closedDays = await storage.getClosedDays(restaurantId);
    res.json(closedDays);
  } catch (error: any) {
    console.error("Public route error:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Public opening hours (for booking form time slots)
router.get("/restaurants/:id/opening-hours", async (req, res) => {
  try {
    const restaurantId = parseInt(req.params.id);
    if (isNaN(restaurantId)) return res.status(400).json({ message: "Identifiant de restaurant invalide" });

    const restaurant = await storage.getRestaurant(restaurantId);
    if (!restaurant) return res.status(404).json({ message: "Restaurant introuvable" });

    res.json(restaurant.openingHours || null);
  } catch (error: any) {
    console.error("Public route error:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Cuisine categories
router.get("/cuisine-categories", async (_req, res) => {
  try {
    const categories = await storage.getCuisineCategories();
    res.json(categories);
  } catch (error: any) {
    console.error("Public route error:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

export default router;
