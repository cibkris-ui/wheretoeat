import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRestaurantSchema, insertBookingSchema, insertRegistrationSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { googlePlacesService } from "./googlePlaces";
import bcrypt from "bcryptjs";
import { z } from "zod";

const isAuthenticatedCombined: RequestHandler = async (req: any, res, next) => {
  if (req.session?.userId) {
    req.localUserId = req.session.userId;
    return next();
  }
  
  if (req.isAuthenticated?.() && req.user?.claims?.sub) {
    req.localUserId = req.user.claims.sub;
    return next();
  }
  
  return res.status(401).json({ message: "Unauthorized" });
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  await setupAuth(app);

  const registerUserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
  });

  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const result = registerUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }

      const { email, password, firstName, lastName } = result.data;

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Un compte avec cet email existe déjà" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUserWithPassword(email, hashedPassword, firstName, lastName);

      (req.session as any).userId = user.id;
      res.status(201).json({ user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Erreur lors de l'inscription" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }

      const { email, password } = result.data;

      const user = await storage.getUserByEmail(email);
      if (!user || !user.password) {
        return res.status(401).json({ message: "Email ou mot de passe incorrect" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Email ou mot de passe incorrect" });
      }

      (req.session as any).userId = user.id;
      res.json({ user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Erreur lors de la connexion" });
    }
  });

  app.get('/api/auth/user', isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.localUserId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
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

  app.get("/api/my-restaurants", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.localUserId;
      const restaurants = await storage.getRestaurantsByOwner(userId);
      res.json(restaurants);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/restaurants/:id/claim", isAuthenticatedCombined, async (req: any, res) => {
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
      
      const userId = req.localUserId;
      const updated = await storage.updateRestaurant(id, { ownerId: userId });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/restaurants/:id", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid restaurant ID" });
      }
      
      const restaurant = await storage.getRestaurant(id);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      
      const userId = req.localUserId;
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
      
      const clientIp = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
      const ipAddress = clientIp.split(',')[0].trim();
      
      let clientId = req.cookies?.clientId;
      if (!clientId) {
        clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        res.cookie('clientId', clientId, { 
          maxAge: 365 * 24 * 60 * 60 * 1000,
          httpOnly: true,
          sameSite: 'strict'
        });
      }
      
      const emailMismatchByIp = await storage.checkIpEmailMismatch(ipAddress, result.data.email);
      const emailMismatchByCookie = await storage.checkClientIdEmailMismatch(clientId, result.data.email);
      
      if (emailMismatchByIp || emailMismatchByCookie) {
        return res.status(400).json({ 
          message: "Cet appareil est déjà associé à un autre compte email. Veuillez utiliser la même adresse email pour toutes vos réservations." 
        });
      }
      
      const existingBooking = await storage.checkExistingBooking(ipAddress, result.data.date, result.data.time);
      if (existingBooking) {
        return res.status(400).json({ 
          message: "Vous avez déjà une réservation sur ce créneau horaire. Veuillez choisir un autre horaire." 
        });
      }
      
      const bookingData = {
        ...result.data,
        clientIp: ipAddress,
        clientId: clientId
      };
      
      const booking = await storage.createBooking(bookingData);
      res.status(201).json(booking);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/restaurants/:id/bookings", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid restaurant ID" });
      }
      
      const restaurant = await storage.getRestaurant(id);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      
      const userId = req.localUserId;
      if (restaurant.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to view bookings" });
      }
      
      const bookings = await storage.getBookingsByRestaurant(id);
      res.json(bookings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/bookings/:id/arrival", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      if (isNaN(bookingId)) {
        return res.status(400).json({ message: "Invalid booking ID" });
      }
      
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      const restaurant = await storage.getRestaurant(booking.restaurantId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      
      const userId = req.localUserId;
      if (restaurant.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const now = new Date();
      const arrivalTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      const updated = await storage.updateBookingArrival(bookingId, arrivalTime);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/bookings/:id/status", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      if (isNaN(bookingId)) {
        return res.status(400).json({ message: "Invalid booking ID" });
      }
      
      const { status } = req.body;
      if (!status || !["confirmed", "cancelled", "noshow"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      const restaurant = await storage.getRestaurant(booking.restaurantId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      
      const userId = req.localUserId;
      if (restaurant.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const updated = await storage.updateBookingStatus(bookingId, status);
      res.json(updated);
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

  app.get("/api/restaurants/:id/closed-days", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const restaurantId = parseInt(req.params.id);
      if (isNaN(restaurantId)) {
        return res.status(400).json({ message: "Invalid restaurant ID" });
      }
      
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      
      const userId = req.localUserId;
      if (restaurant.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const { year, month } = req.query;
      let closedDays;
      if (year && month) {
        closedDays = await storage.getClosedDaysByMonth(restaurantId, parseInt(year), parseInt(month));
      } else {
        closedDays = await storage.getClosedDays(restaurantId);
      }
      
      res.json(closedDays);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/restaurants/:id/closed-days", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const restaurantId = parseInt(req.params.id);
      if (isNaN(restaurantId)) {
        return res.status(400).json({ message: "Invalid restaurant ID" });
      }
      
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      
      const userId = req.localUserId;
      if (restaurant.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const { date, service, reason } = req.body;
      if (!date) {
        return res.status(400).json({ message: "Date is required" });
      }
      
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

  app.delete("/api/closed-days/:id", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const closedDayId = parseInt(req.params.id);
      if (isNaN(closedDayId)) {
        return res.status(400).json({ message: "Invalid closed day ID" });
      }
      
      const closedDay = await storage.getClosedDay(closedDayId);
      if (!closedDay) {
        return res.status(404).json({ message: "Closed day not found" });
      }
      
      const restaurant = await storage.getRestaurant(closedDay.restaurantId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      
      const userId = req.localUserId;
      if (restaurant.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      await storage.deleteClosedDay(closedDayId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

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
    cuisineType: z.string().min(1),
    priceRange: z.string().min(1),
    description: z.string().optional(),
    logoUrl: z.string().optional(),
    photos: z.array(z.string()).optional(),
    menuPdfUrl: z.string().optional(),
  });

  app.post("/api/registrations/with-account", async (req, res) => {
    try {
      const result = restaurantRegistrationWithAccountSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: fromZodError(result.error).message 
        });
      }

      const { email, password, firstName, lastName, ...registrationData } = result.data;

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Un compte avec cet email existe déjà" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUserWithPassword(email, hashedPassword, firstName, lastName);

      const registration = await storage.createRegistration({
        userId: user.id,
        ...registrationData,
      });

      (req.session as any).userId = user.id;
      res.status(201).json({ user: { id: user.id, email: user.email }, registration });
    } catch (error: any) {
      console.error("Registration with account error:", error);
      res.status(500).json({ message: "Erreur lors de l'inscription" });
    }
  });

  app.post("/api/registrations", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Vous devez être connecté pour effectuer cette action" });
      }
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

  app.get("/api/registrations", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.localUserId;
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

  app.put("/api/registrations/:id/status", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.localUserId;
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
          openingHours: registration.openingHours as Record<string, unknown> | undefined,
          menuPdfUrl: registration.menuPdfUrl,
        });
        return res.json({ registration, restaurant: newRestaurant });
      }
      res.json({ registration });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/objects/upload", async (req: any, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error: any) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  app.put("/api/objects/finalize", async (req: any, res) => {
    try {
      if (!req.body.uploadURL) {
        return res.status(400).json({ error: "uploadURL is required" });
      }
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.uploadURL,
        {
          owner: "registration",
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

  app.get("/api/google-places/configured", async (_req, res) => {
    res.json({ configured: googlePlacesService.isConfigured() });
  });

  app.get("/api/google-places/search", async (req, res) => {
    try {
      if (!googlePlacesService.isConfigured()) {
        return res.status(503).json({ message: "Google Places API not configured" });
      }
      
      const query = req.query.q as string;
      const location = req.query.location as string | undefined;
      
      if (!query) {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }
      
      const results = await googlePlacesService.searchPlaces(query, location);
      res.json(results);
    } catch (error: any) {
      console.error("Error searching Google Places:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/google-places/:placeId", async (req, res) => {
    try {
      if (!googlePlacesService.isConfigured()) {
        return res.status(503).json({ message: "Google Places API not configured" });
      }
      
      const { placeId } = req.params;
      const details = await googlePlacesService.getPlaceDetails(placeId);
      
      if (!details) {
        return res.status(404).json({ message: "Place not found" });
      }
      
      res.json(details);
    } catch (error: any) {
      console.error("Error fetching place details:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/restaurants/:id/google-place", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid restaurant ID" });
      }
      
      const restaurant = await storage.getRestaurant(id);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      
      const userId = req.localUserId;
      if (restaurant.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to edit this restaurant" });
      }
      
      const { googlePlaceId } = req.body;
      const updated = await storage.updateRestaurant(id, { googlePlaceId });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
