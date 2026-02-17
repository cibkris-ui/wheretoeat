import { Router } from "express";
import { storage } from "../services/storage";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Get clients for a restaurant
router.get("/restaurant/:id", requireAuth, async (req: any, res) => {
  try {
    const restaurantId = parseInt(req.params.id);
    if (isNaN(restaurantId)) return res.status(400).json({ message: "Identifiant de restaurant invalide" });

    const restaurant = await storage.getRestaurant(restaurantId);
    if (!restaurant) return res.status(404).json({ message: "Restaurant introuvable" });
    if (restaurant.ownerId !== req.userId) return res.status(403).json({ message: "Non autorisé pour ce restaurant" });

    const search = (req.query.search as string | undefined)?.substring(0, 100);
    const clientsWithStats = await storage.getClientsWithStatsByRestaurant(restaurantId, search);
    res.json(clientsWithStats);
  } catch (error: any) {
    console.error("Clients error:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Get single client detail
router.get("/:id", requireAuth, async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.id);
    if (isNaN(clientId)) return res.status(400).json({ message: "Identifiant de client invalide" });

    const client = await storage.getClient(clientId);
    if (!client) return res.status(404).json({ message: "Client introuvable" });
    if (!client.restaurantId) return res.status(400).json({ message: "Client sans restaurant associé" });

    const restaurant = await storage.getRestaurant(client.restaurantId);
    if (!restaurant) return res.status(404).json({ message: "Restaurant introuvable" });
    if (restaurant.ownerId !== req.userId) return res.status(403).json({ message: "Non autorisé pour ce restaurant" });

    const clientBookings = await storage.getClientBookings(clientId, client.restaurantId);
    const validBookings = clientBookings.filter(b => b.status !== "cancelled" && b.status !== "noshow");
    const visitCount = validBookings.length;
    const avgGuests =
      visitCount > 0 ? Math.round(validBookings.reduce((sum, b) => sum + b.guests, 0) / visitCount) : 0;
    const totalSpent = validBookings.reduce((sum, b) => sum + (b.billAmount || 0), 0);

    res.json({ ...client, visitCount, avgGuests, totalSpent, bookings: clientBookings });
  } catch (error: any) {
    console.error("Clients error:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

export default router;
