import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { storage } from "../services/storage";
import { requireAdmin } from "../middleware/auth";

const router = Router();

// All admin routes use requireAdmin middleware
router.use(requireAdmin);

// === Restaurants ===

router.get("/restaurants", async (_req, res) => {
  try {
    const allRestaurants = await storage.getAllRestaurantsAdmin();
    res.json(allRestaurants);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/restaurants/:id/approve", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Identifiant de restaurant invalide" });
    const updated = await storage.updateRestaurant(id, { approvalStatus: "approved" });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/restaurants/:id/reject", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Identifiant de restaurant invalide" });
    const updated = await storage.updateRestaurant(id, { approvalStatus: "rejected" });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/restaurants/:id/block", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Identifiant de restaurant invalide" });
    const { isBlocked } = req.body;
    const updated = await storage.updateRestaurant(id, { isBlocked: isBlocked ?? true });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/restaurants/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Identifiant de restaurant invalide" });
    await storage.deleteRestaurant(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// === Registrations ===

router.get("/registrations", async (_req, res) => {
  try {
    const registrations = await storage.getAllRegistrations();
    res.json(registrations);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/registrations/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid registration ID" });

    const { status, adminNotes } = req.body;
    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Statut invalide" });
    }

    const registration = await storage.updateRegistrationStatus(id, status, adminNotes);
    if (!registration) return res.status(404).json({ message: "Registration not found" });

    if (status === "approved") {
      const cuisineString = Array.isArray(registration.cuisineType)
        ? registration.cuisineType.join(", ")
        : registration.cuisineType;

      const newRestaurant = await storage.createRestaurant({
        name: registration.restaurantName,
        cuisine: cuisineString,
        location: registration.address,
        rating: 0,
        priceRange: registration.priceRange,
        image: registration.logoUrl || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4",
        description: registration.description || "",
        features: [],
        ownerId: registration.userId,
        phone: registration.phone,
        address: registration.address,
        openingHours: registration.openingHours as Record<string, unknown> | undefined,
        menuPdfUrl: registration.menuPdfUrl,
        approvalStatus: "approved",
      });
      return res.json({ registration, restaurant: newRestaurant });
    }

    res.json({ registration });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// === Clients ===

router.get("/clients", async (_req, res) => {
  try {
    const clientsWithStats = await storage.getAllClientsWithStats();
    res.json(clientsWithStats);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// === Users ===

router.get("/users", async (_req, res) => {
  try {
    const allUsers = await storage.getAllUsers();
    res.json(allUsers.map(({ password, ...rest }) => rest));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/users", async (req, res) => {
  try {
    const { email, password, firstName, lastName, isAdmin: makeAdmin } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password required" });

    const existing = await storage.getUserByEmail(email);
    if (existing) return res.status(400).json({ message: "L'utilisateur existe déjà" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await storage.createUserWithPassword(email, hashedPassword, firstName, lastName);
    if (makeAdmin) {
      await storage.updateUser(user.id, { isAdmin: true });
    }
    const { password: _, ...safeUser } = user;
    res.status(201).json(safeUser);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/users/:id", async (req, res) => {
  try {
    const { isAdmin: makeAdmin } = req.body;
    const updated = await storage.updateUser(req.params.id, { isAdmin: makeAdmin });
    if (updated) {
      const { password: _, ...safeUser } = updated;
      res.json(safeUser);
    } else {
      res.status(404).json({ message: "Utilisateur introuvable" });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/users/:id/password", async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Le mot de passe doit contenir au moins 6 caractères" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const updated = await storage.updateUser(req.params.id, { password: hashedPassword });
    if (updated) {
      res.json({ success: true });
    } else {
      res.status(404).json({ message: "Utilisateur introuvable" });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    await storage.deleteUser(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
