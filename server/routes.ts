import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRestaurantSchema, insertBookingSchema, insertRegistrationSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  await setupAuth(app);

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error: any) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get("/api/restaurants", async (_req, res) => {
    try {
      const restaurants = await storage.getAllRestaurants();
      res.json(restaurants);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/restaurants/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid restaurant ID" });
      }
      
      const restaurant = await storage.getRestaurant(id);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      
      res.json(restaurant);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/restaurants", async (req, res) => {
    try {
      const result = insertRestaurantSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: fromZodError(result.error).message 
        });
      }
      
      const restaurant = await storage.createRestaurant(result.data);
      res.status(201).json(restaurant);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/my-restaurants", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const restaurants = await storage.getRestaurantsByOwner(userId);
      res.json(restaurants);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/restaurants/:id/claim", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid restaurant ID" });
      }
      
      const restaurant = await storage.getRestaurant(id);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      
      if (restaurant.ownerId) {
        return res.status(400).json({ message: "Restaurant already claimed" });
      }
      
      const userId = req.user.claims.sub;
      const updated = await storage.updateRestaurant(id, { ownerId: userId });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/restaurants/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid restaurant ID" });
      }
      
      const restaurant = await storage.getRestaurant(id);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      
      const userId = req.user.claims.sub;
      if (restaurant.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to edit this restaurant" });
      }
      
      const updateData: Record<string, any> = {};
      const allowedFields = ['name', 'description', 'image', 'features', 'cuisine', 'location', 'priceRange'];
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }
      
      const updated = await storage.updateRestaurant(id, updateData);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bookings", async (req, res) => {
    try {
      const result = insertBookingSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: fromZodError(result.error).message 
        });
      }
      
      const restaurant = await storage.getRestaurant(result.data.restaurantId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      
      const booking = await storage.createBooking(result.data);
      res.status(201).json(booking);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/restaurants/:id/bookings", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid restaurant ID" });
      }
      
      const restaurant = await storage.getRestaurant(id);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      
      const userId = req.user.claims.sub;
      if (restaurant.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to view bookings" });
      }
      
      const bookings = await storage.getBookingsByRestaurant(id);
      res.json(bookings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/cuisine-categories", async (_req, res) => {
    try {
      const categories = await storage.getCuisineCategories();
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/registrations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = insertRegistrationSchema.safeParse({ ...req.body, userId });
      if (!result.success) {
        return res.status(400).json({ 
          message: fromZodError(result.error).message 
        });
      }
      const registration = await storage.createRegistration(result.data);
      res.status(201).json(registration);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/registrations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (user?.isAdmin) {
        const registrations = await storage.getAllRegistrations();
        res.json(registrations);
      } else {
        const registrations = await storage.getRegistrationsByUser(userId);
        res.json(registrations);
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/registrations/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid registration ID" });
      }
      const { status, adminNotes } = req.body;
      if (!["pending", "approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      const registration = await storage.updateRegistrationStatus(id, status, adminNotes);
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }
      if (status === "approved") {
        const newRestaurant = await storage.createRestaurant({
          name: registration.restaurantName,
          cuisine: registration.cuisineType,
          location: registration.address,
          rating: 0,
          priceRange: registration.priceRange,
          image: registration.logoUrl || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4",
          description: registration.description || "",
          features: [],
          ownerId: registration.userId,
          phone: registration.phone,
          address: registration.address,
          openingHours: registration.openingHours,
          menuPdfUrl: registration.menuPdfUrl,
        });
        return res.json({ registration, restaurant: newRestaurant });
      }
      res.json({ registration });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req: any, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error: any) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  app.put("/api/objects/finalize", isAuthenticated, async (req: any, res) => {
    try {
      if (!req.body.uploadURL) {
        return res.status(400).json({ error: "uploadURL is required" });
      }
      const userId = req.user.claims.sub;
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.uploadURL,
        {
          owner: userId,
          visibility: "public",
        },
      );
      res.status(200).json({ objectPath });
    } catch (error) {
      console.error("Error finalizing upload:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/objects/:objectPath(*)", async (req: any, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  return httpServer;
}
