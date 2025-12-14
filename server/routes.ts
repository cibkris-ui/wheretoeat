import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRestaurantSchema, insertBookingSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { setupAuth, isAuthenticated } from "./replitAuth";

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
      
      const { name, description, image, features, cuisine, location, priceRange } = req.body;
      const updated = await storage.updateRestaurant(id, { 
        name, description, image, features, cuisine, location, priceRange 
      });
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

  app.get("/api/restaurants/:id/bookings", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid restaurant ID" });
      }
      
      const bookings = await storage.getBookingsByRestaurant(id);
      res.json(bookings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
