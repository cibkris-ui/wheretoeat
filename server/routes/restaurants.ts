import { Router } from "express";
import { insertRestaurantSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { storage } from "../services/storage";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Create restaurant
router.post("/", requireAuth, async (req: any, res) => {
  try {
    const result = insertRestaurantSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: fromZodError(result.error).message });
    }
    const restaurant = await storage.createRestaurant(result.data);
    res.status(201).json(restaurant);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get my restaurants
router.get("/my-restaurants", requireAuth, async (req: any, res) => {
  try {
    const restaurants = await storage.getRestaurantsByOwner(req.userId);
    res.json(restaurants);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Claim restaurant
router.post("/:id/claim", requireAuth, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Identifiant de restaurant invalide" });

    const restaurant = await storage.getRestaurant(id);
    if (!restaurant) return res.status(404).json({ message: "Restaurant introuvable" });
    if (restaurant.ownerId) return res.status(400).json({ message: "Restaurant déjà revendiqué" });

    const updated = await storage.updateRestaurant(id, { ownerId: req.userId });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Update restaurant
router.put("/:id", requireAuth, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Identifiant de restaurant invalide" });

    const restaurant = await storage.getRestaurant(id);
    if (!restaurant) return res.status(404).json({ message: "Restaurant introuvable" });
    if (restaurant.ownerId !== req.userId) return res.status(403).json({ message: "Non autorisé pour ce restaurant" });

    const allowedFields = [
      "name", "description", "image", "photos", "features", "cuisine", "location",
      "priceRange", "openingHours", "capacity", "onlineCapacity", "minGuests", "maxGuests",
      "phone", "address", "menuPdfUrl", "publicEmail", "preferredLanguage", "website",
      "executiveChef", "publicTransport", "nearbyParking", "additionalInfo",
      "paymentMethods", "hasVegetarianOptions", "spokenLanguages", "askBillAmount",
      "companyName", "registrationNumber",
    ];
    const updateData: Record<string, any> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "Aucun champ valide à mettre à jour" });
    }

    const updated = await storage.updateRestaurant(id, updateData);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Link Google Place
router.put("/:id/google-place", requireAuth, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Identifiant de restaurant invalide" });

    const restaurant = await storage.getRestaurant(id);
    if (!restaurant) return res.status(404).json({ message: "Restaurant introuvable" });
    if (restaurant.ownerId !== req.userId) return res.status(403).json({ message: "Non autorisé pour ce restaurant" });

    const { googlePlaceId } = req.body;
    const updated = await storage.updateRestaurant(id, { googlePlaceId });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
