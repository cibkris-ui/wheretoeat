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

  app.get("/api/auth/check-email", async (req, res) => {
    try {
      const email = req.query.email as string;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      const existingUser = await storage.getUserByEmail(email);
      res.json({ exists: !!existingUser });
    } catch (error: any) {
      console.error("Check email error:", error);
      res.status(500).json({ message: "Erreur lors de la vérification" });
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

  // Public endpoint for closed days (for booking form calendar)
  app.get("/api/public/restaurants/:id/closed-days", async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.id);
      if (isNaN(restaurantId)) {
        return res.status(400).json({ message: "Invalid restaurant ID" });
      }
      
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      
      const closedDays = await storage.getClosedDays(restaurantId);
      res.json(closedDays);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Public endpoint for opening hours (for booking form time slots)
  app.get("/api/public/restaurants/:id/opening-hours", async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.id);
      if (isNaN(restaurantId)) {
        return res.status(400).json({ message: "Invalid restaurant ID" });
      }
      
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      
      res.json(restaurant.openingHours || null);
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
      const allowedFields = ['name', 'description', 'image', 'photos', 'features', 'cuisine', 'location', 'priceRange', 'openingHours', 'capacity', 'onlineCapacity', 'minGuests', 'maxGuests', 'phone', 'address', 'menuPdfUrl'];
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
      
      // Vérifier si la date est fermée aux réservations
      const isDateClosed = await storage.isDateClosed(result.data.restaurantId, result.data.date);
      if (isDateClosed) {
        return res.status(400).json({ 
          message: "Les réservations ne sont pas disponibles pour cette date." 
        });
      }
      
      // Vérifier si l'heure est dans les horaires d'ouverture
      if (restaurant.openingHours) {
        const openingHours = restaurant.openingHours as Record<string, {
          isOpen: boolean;
          hasSecondService: boolean;
          openTime1: string;
          closeTime1: string;
          openTime2: string;
          closeTime2: string;
        }>;
        
        const bookingDate = new Date(result.data.date);
        const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
        const dayName = dayNames[bookingDate.getDay()];
        const dayHours = openingHours[dayName];
        
        if (!dayHours || !dayHours.isOpen) {
          return res.status(400).json({ 
            message: "Le restaurant est fermé ce jour-là." 
          });
        }
        
        const bookingTime = result.data.time;
        const isTimeInRange = (time: string, start: string, end: string) => {
          return time >= start && time < end;
        };
        
        const isValidTime = isTimeInRange(bookingTime, dayHours.openTime1, dayHours.closeTime1) ||
          (dayHours.hasSecondService && isTimeInRange(bookingTime, dayHours.openTime2, dayHours.closeTime2));
        
        if (!isValidTime) {
          return res.status(400).json({ 
            message: "L'heure de réservation est en dehors des horaires d'ouverture." 
          });
        }
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
      
      // Vérifier la capacité du créneau (utiliser onlineCapacity pour les réservations publiques)
      const currentGuests = await storage.getBookedGuestsForSlot(
        result.data.restaurantId, 
        result.data.date, 
        result.data.time
      );
      const newGuestsTotal = result.data.guests + (result.data.children || 0);
      const capacity = restaurant.capacity || 40;
      const onlineCapacity = restaurant.onlineCapacity ?? capacity; // Par défaut = capacité totale
      
      // Si la capacité en ligne serait dépassée, mettre en liste d'attente
      const bookingStatus = (currentGuests + newGuestsTotal > onlineCapacity) ? "waiting" : "pending";
      
      const bookingData = {
        ...result.data,
        clientIp: ipAddress,
        clientId: clientId,
        status: bookingStatus
      };
      
      const booking = await storage.createBooking(bookingData);
      
      // Ajouter le client à l'annuaire
      if (result.data.email) {
        await storage.upsertClientFromBooking(
          result.data.restaurantId,
          result.data.firstName,
          result.data.lastName,
          result.data.email,
          result.data.phone
        );
      }
      
      res.status(201).json(booking);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/owner/bookings", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const { restaurantId, date, time, guests, children, firstName, lastName, email, phone, specialRequest, tableId, zoneId, status } = req.body;
      
      if (!restaurantId || !date || !time || !guests || !firstName || !lastName) {
        return res.status(400).json({ 
          message: "Champs requis manquants: restaurantId, date, time, guests, firstName, lastName" 
        });
      }
      
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      
      const userId = req.localUserId;
      if (restaurant.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to create bookings for this restaurant" });
      }
      
      // Vérifier si la date est fermée aux réservations
      const isDateClosed = await storage.isDateClosed(restaurantId, date);
      if (isDateClosed) {
        return res.status(400).json({ 
          message: "Les réservations sont fermées pour cette date." 
        });
      }
      
      const clientId = `owner_${userId}_${Date.now()}`;
      
      // Si pas de statut spécifié, vérifier la capacité pour décider du statut
      let finalStatus = status || "confirmed";
      if (!status) {
        const currentGuests = await storage.getBookedGuestsForSlot(restaurantId, date, time);
        const newGuestsTotal = guests + (children || 0);
        const capacity = restaurant.capacity || 40;
        if (currentGuests + newGuestsTotal > capacity) {
          finalStatus = "waiting";
        }
      }
      
      const bookingData = {
        restaurantId,
        date,
        time,
        guests,
        children: children || 0,
        firstName,
        lastName,
        email: email || "",
        phone: phone || "",
        specialRequest: specialRequest || null,
        newsletter: 0,
        clientIp: "owner-created",
        clientId: clientId,
        status: finalStatus,
        tableId: tableId || null,
        zoneId: zoneId || null
      };
      
      const booking = await storage.createBooking(bookingData);
      
      // Ajouter le client à l'annuaire
      if (firstName && lastName) {
        await storage.upsertClientFromBooking(
          restaurantId,
          firstName,
          lastName,
          email || "",
          phone || ""
        );
      }
      
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

  app.patch("/api/bookings/:id/bill-requested", isAuthenticatedCombined, async (req: any, res) => {
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
      
      const updated = await storage.updateBookingBillRequested(bookingId, true);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/bookings/:id/departure", isAuthenticatedCombined, async (req: any, res) => {
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
      const departureTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      const updated = await storage.updateBookingDeparture(bookingId, departureTime);
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
      if (!status || !["pending", "confirmed", "waiting", "refused", "cancelled", "noshow"].includes(status)) {
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

  app.patch("/api/bookings/:id/table", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      if (isNaN(bookingId)) {
        return res.status(400).json({ message: "Invalid booking ID" });
      }
      
      const { tableId, zoneId } = req.body;
      
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
      
      const updated = await storage.updateBookingTable(bookingId, tableId || null, zoneId || null);
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

  app.get("/api/restaurants/:id/clients", isAuthenticatedCombined, async (req: any, res) => {
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
      
      const search = req.query.search as string | undefined;
      const clients = await storage.getClientsByRestaurant(restaurantId, search);
      
      const clientsWithStats = await Promise.all(clients.map(async (client) => {
        const clientBookings = await storage.getClientBookings(client.id, restaurantId);
        const visitCount = clientBookings.length;
        const lastVisit = clientBookings.length > 0 ? clientBookings[0].date : null;
        const avgGuests = visitCount > 0 
          ? Math.round(clientBookings.reduce((sum, b) => sum + b.guests, 0) / visitCount)
          : 0;
        
        return {
          ...client,
          visitCount,
          lastVisit,
          avgGuests
        };
      }));
      
      res.json(clientsWithStats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/clients/:id", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }
      
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      const restaurant = await storage.getRestaurant(client.restaurantId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      
      const userId = req.localUserId;
      if (restaurant.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const clientBookings = await storage.getClientBookings(clientId, client.restaurantId);
      const visitCount = clientBookings.length;
      const avgGuests = visitCount > 0 
        ? Math.round(clientBookings.reduce((sum, b) => sum + b.guests, 0) / visitCount)
        : 0;
      
      res.json({
        ...client,
        visitCount,
        avgGuests,
        bookings: clientBookings
      });
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
    cuisineType: z.union([z.string(), z.array(z.string())]),
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

      const { email, password, firstName, lastName, cuisineType, ...registrationData } = result.data;

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Un compte avec cet email existe déjà" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUserWithPassword(email, hashedPassword, firstName, lastName);

      const cuisineTypeArray = Array.isArray(cuisineType) ? cuisineType : [cuisineType];
      const cuisineString = cuisineTypeArray.join(", ");

      const restaurant = await storage.createRestaurant({
        name: registrationData.restaurantName,
        cuisine: cuisineString,
        location: registrationData.address,
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
        approvalStatus: "pending",
      });

      (req.session as any).userId = user.id;
      res.status(201).json({ user: { id: user.id, email: user.email }, restaurant });
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
      
      const { restaurantName, address, phone, cuisineType, priceRange, description, logoUrl, photos, menuPdfUrl } = req.body;
      
      if (!restaurantName || !address || !phone || !cuisineType || !priceRange) {
        return res.status(400).json({ message: "Informations requises manquantes" });
      }

      const cuisineTypeArray = Array.isArray(cuisineType) ? cuisineType : [cuisineType];
      const cuisineString = cuisineTypeArray.join(", ");

      const restaurant = await storage.createRestaurant({
        name: restaurantName,
        cuisine: cuisineString,
        location: address,
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
        approvalStatus: "pending",
      });

      res.status(201).json(restaurant);
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

  app.get("/api/restaurants/:id/floor-plan", isAuthenticatedCombined, async (req: any, res) => {
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
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const floorPlan = await storage.getFloorPlan(id);
      res.json(floorPlan?.plan || { zones: [] });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/restaurants/:id/floor-plan", isAuthenticatedCombined, async (req: any, res) => {
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
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const plan = req.body;
      const saved = await storage.saveFloorPlan(id, plan);
      res.json(saved);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/restaurants/:id/users", isAuthenticatedCombined, async (req: any, res) => {
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
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const users = await storage.getRestaurantUsers(id);
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/restaurants/:id/users", isAuthenticatedCombined, async (req: any, res) => {
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
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const { email, password, firstName, lastName, role } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      if (!password) {
        return res.status(400).json({ message: "Password is required" });
      }
      
      const existing = await storage.getRestaurantUserByEmail(id, email);
      if (existing) {
        return res.status(400).json({ message: "User already has access to this restaurant" });
      }
      
      let userAccount = await storage.getUserByEmail(email.toLowerCase().trim());
      
      if (!userAccount) {
        const hashedPassword = await bcrypt.hash(password, 10);
        userAccount = await storage.createUserWithPassword(
          email.toLowerCase().trim(), 
          hashedPassword, 
          firstName || undefined, 
          lastName || undefined
        );
      }
      
      const newUser = await storage.addRestaurantUserWithAccess({
        restaurantId: id,
        email: email.toLowerCase().trim(),
        role: role || "staff",
        userId: userAccount.id,
      });
      
      res.status(201).json(newUser);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/restaurants/:id/users/:userId", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const restaurantId = parseInt(req.params.id);
      const teamUserId = parseInt(req.params.userId);
      
      if (isNaN(restaurantId) || isNaN(teamUserId)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      
      const userId = req.localUserId;
      if (restaurant.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      await storage.removeRestaurantUser(teamUserId);
      res.json({ message: "User removed" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const isAdmin: RequestHandler = async (req: any, res, next) => {
    const userId = req.session?.userId || req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const user = await storage.getUser(userId);
    if (!user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    req.localUserId = userId;
    next();
  };

  app.get("/api/admin/restaurants", isAdmin, async (_req, res) => {
    try {
      const allRestaurants = await storage.getAllRestaurantsAdmin();
      res.json(allRestaurants);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/admin/restaurants/:id/approve", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid restaurant ID" });
      }
      const updated = await storage.updateRestaurant(id, { approvalStatus: "approved" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/admin/restaurants/:id/reject", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid restaurant ID" });
      }
      const updated = await storage.updateRestaurant(id, { approvalStatus: "rejected" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/admin/restaurants/:id/block", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid restaurant ID" });
      }
      const { isBlocked } = req.body;
      const updated = await storage.updateRestaurant(id, { isBlocked: isBlocked ?? true });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/restaurants/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid restaurant ID" });
      }
      await storage.deleteRestaurant(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/clients", isAdmin, async (_req, res) => {
    try {
      const allClients = await storage.getAllClients();
      const allBookings = await storage.getAllBookings();
      
      const clientsWithStats = allClients.map(client => {
        const clientBookings = allBookings.filter(b => 
          (b.email && b.email.toLowerCase() === client.email.toLowerCase()) ||
          (b.phone && b.phone === client.phone)
        );
        const uniqueRestaurants = new Set(clientBookings.map(b => b.restaurantId));
        const lastBooking = clientBookings.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
        return {
          ...client,
          totalBookings: clientBookings.length,
          restaurantCount: uniqueRestaurants.size,
          lastBookingDate: lastBooking?.createdAt || null
        };
      });
      
      res.json(clientsWithStats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/users", isAdmin, async (_req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      res.json(allUsers.map(({ password, ...rest }) => rest));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const { email, password, firstName, lastName, isAdmin: makeAdmin } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ message: "User already exists" });
      }
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

  app.put("/api/admin/users/:id", isAdmin, async (req, res) => {
    try {
      const { isAdmin: makeAdmin } = req.body;
      const updated = await storage.updateUser(req.params.id, { isAdmin: makeAdmin });
      if (updated) {
        const { password: _, ...safeUser } = updated;
        res.json(safeUser);
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/users/:id", isAdmin, async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const initDefaultAdmin = async () => {
    const adminEmail = "admin@admin.com";
    const existing = await storage.getUserByEmail(adminEmail);
    if (!existing) {
      const hashedPassword = await bcrypt.hash("adminadmin", 10);
      const admin = await storage.createUserWithPassword(adminEmail, hashedPassword, "Admin", "User");
      await storage.updateUser(admin.id, { isAdmin: true });
      console.log("Default admin created: admin@admin.com / adminadmin");
    }
  };
  initDefaultAdmin();

  return httpServer;
}
