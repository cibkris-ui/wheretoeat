import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { storage } from "../services/storage";
import { requireAuth } from "../middleware/auth";

const router = Router();

const restaurantRegistrationWithAccountSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  restaurantName: z.string().min(1),
  address: z.string().min(1),
  phone: z.string().min(1),
  companyName: z.string().min(1),
  registrationNumber: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  cuisineType: z.union([z.string(), z.array(z.string())]),
  priceRange: z.string().min(1),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
  photos: z.array(z.string()).optional(),
  menuPdfUrl: z.string().optional(),
});

// Register with new account + restaurant
router.post("/with-account", async (req, res) => {
  try {
    const result = restaurantRegistrationWithAccountSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: fromZodError(result.error).message });
    }

    const { email, password, firstName, lastName, cuisineType, postalCode, city, ...registrationData } = result.data;

    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: "Un compte avec cet email existe déjà" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await storage.createUserWithPassword(email, hashedPassword, firstName, lastName);

    const cuisineTypeArray = Array.isArray(cuisineType) ? cuisineType : [cuisineType];
    const cuisineString = cuisineTypeArray.join(", ");

    const location = postalCode && city ? `${postalCode} ${city}` : registrationData.address;

    const restaurant = await storage.createRestaurant({
      name: registrationData.restaurantName,
      cuisine: cuisineString,
      location,
      rating: 0,
      priceRange: registrationData.priceRange,
      image: registrationData.logoUrl || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4",
      description: registrationData.description || "",
      features: [],
      photos: registrationData.photos,
      ownerId: user.id,
      phone: registrationData.phone,
      address: registrationData.address,
      menuPdfUrl: registrationData.menuPdfUrl,
      companyName: registrationData.companyName,
      registrationNumber: registrationData.registrationNumber,
      approvalStatus: "pending",
    });

    (req.session as any).userId = user.id;
    res.status(201).json({ user: { id: user.id, email: user.email }, restaurant });
  } catch (error: any) {
    console.error("Registration with account error:", error);
    res.status(500).json({ message: "Erreur lors de l'inscription" });
  }
});

// Register restaurant for existing user
router.post("/", async (req: any, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Vous devez être connecté pour effectuer cette action" });
    }

    const { restaurantName, address, phone, cuisineType, priceRange, description, logoUrl, photos, menuPdfUrl, companyName, registrationNumber, postalCode, city } = req.body;

    if (!restaurantName || !address || !phone || !cuisineType || !priceRange) {
      return res.status(400).json({ message: "Informations requises manquantes" });
    }

    const cuisineTypeArray = Array.isArray(cuisineType) ? cuisineType : [cuisineType];
    const cuisineString = cuisineTypeArray.join(", ");

    const location = postalCode && city ? `${postalCode} ${city}` : address;

    const restaurant = await storage.createRestaurant({
      name: restaurantName,
      cuisine: cuisineString,
      location,
      rating: 0,
      priceRange: priceRange,
      image: logoUrl || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4",
      description: description || "",
      features: [],
      photos: photos,
      ownerId: userId,
      phone: phone,
      address: address,
      menuPdfUrl: menuPdfUrl,
      companyName: companyName,
      registrationNumber: registrationNumber,
      approvalStatus: "pending",
    });

    res.status(201).json(restaurant);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get registrations (admin sees all, user sees own)
router.get("/", requireAuth, async (req: any, res) => {
  try {
    const user = await storage.getUser(req.userId);
    if (user?.isAdmin) {
      const registrations = await storage.getAllRegistrations();
      res.json(registrations);
    } else {
      const registrations = await storage.getRegistrationsByUser(req.userId);
      res.json(registrations);
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
