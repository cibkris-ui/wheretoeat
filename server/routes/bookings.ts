import { Router } from "express";
import { insertBookingSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { storage } from "../services/storage";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Public booking creation
router.post("/", async (req, res) => {
  try {
    const result = insertBookingSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: fromZodError(result.error).message });
    }

    const restaurant = await storage.getRestaurant(result.data.restaurantId);
    if (!restaurant) return res.status(404).json({ message: "Restaurant introuvable" });

    // Check closed date
    const isDateClosed = await storage.isDateClosed(result.data.restaurantId, result.data.date);
    if (isDateClosed) {
      return res.status(400).json({ message: "Les réservations ne sont pas disponibles pour cette date." });
    }

    // Check opening hours
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
        return res.status(400).json({ message: "Le restaurant est fermé ce jour-là." });
      }

      const bookingTime = result.data.time;
      const isTimeInRange = (time: string, start: string, end: string) => time >= start && time < end;

      const isValidTime =
        isTimeInRange(bookingTime, dayHours.openTime1, dayHours.closeTime1) ||
        (dayHours.hasSecondService && isTimeInRange(bookingTime, dayHours.openTime2, dayHours.closeTime2));

      if (!isValidTime) {
        return res.status(400).json({ message: "L'heure de réservation est en dehors des horaires d'ouverture." });
      }
    }

    // Anti-fraud: IP + cookie checks
    const clientIp = ((req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown")
      .split(",")[0]
      .trim();

    let clientId = req.cookies?.clientId;
    if (!clientId) {
      clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      res.cookie("clientId", clientId, {
        maxAge: 365 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });
    }

    const emailMismatchByIp = await storage.checkIpEmailMismatch(clientIp, result.data.email);
    const emailMismatchByCookie = await storage.checkClientIdEmailMismatch(clientId, result.data.email);

    if (emailMismatchByIp || emailMismatchByCookie) {
      return res.status(400).json({
        message:
          "Cet appareil est déjà associé à un autre compte email. Veuillez utiliser la même adresse email pour toutes vos réservations.",
      });
    }

    const existingBooking = await storage.checkExistingBooking(clientIp, result.data.date, result.data.time);
    if (existingBooking) {
      return res.status(400).json({
        message: "Vous avez déjà une réservation sur ce créneau horaire. Veuillez choisir un autre horaire.",
      });
    }

    // Capacity check
    const currentGuests = await storage.getBookedGuestsForSlot(
      result.data.restaurantId,
      result.data.date,
      result.data.time
    );
    const newGuestsTotal = result.data.guests + (result.data.children || 0);
    const capacity = restaurant.capacity || 40;
    const onlineCapacity = restaurant.onlineCapacity ?? capacity;

    const bookingStatus = currentGuests + newGuestsTotal > onlineCapacity ? "waiting" : "pending";

    const booking = await storage.createBooking({
      ...result.data,
      clientIp: clientIp,
      clientId: clientId,
      status: bookingStatus,
    });

    // Add client to directory
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

// Owner booking creation
router.post("/owner", requireAuth, async (req: any, res) => {
  try {
    const { restaurantId, date, time, guests, children, firstName, lastName, email, phone, specialRequest, tableId, zoneId, status } = req.body;

    if (!restaurantId || !date || !time || !guests || !firstName || !lastName) {
      return res.status(400).json({ message: "Champs requis manquants: restaurantId, date, time, guests, firstName, lastName" });
    }

    const restaurant = await storage.getRestaurant(restaurantId);
    if (!restaurant) return res.status(404).json({ message: "Restaurant introuvable" });
    if (restaurant.ownerId !== req.userId) return res.status(403).json({ message: "Non autorisé pour ce restaurant" });

    const isDateClosed = await storage.isDateClosed(restaurantId, date);
    if (isDateClosed) {
      return res.status(400).json({ message: "Les réservations sont fermées pour cette date." });
    }

    const clientId = `owner_${req.userId}_${Date.now()}`;

    let finalStatus = status || "confirmed";
    if (!status) {
      const currentGuests = await storage.getBookedGuestsForSlot(restaurantId, date, time);
      const newGuestsTotal = guests + (children || 0);
      const capacity = restaurant.capacity || 40;
      if (currentGuests + newGuestsTotal > capacity) {
        finalStatus = "waiting";
      }
    }

    const booking = await storage.createBooking({
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
      clientId,
      status: finalStatus,
      tableId: tableId || null,
      zoneId: zoneId || null,
    });

    if (firstName && lastName) {
      await storage.upsertClientFromBooking(restaurantId, firstName, lastName, email || "", phone || "");
    }

    res.status(201).json(booking);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get bookings for a restaurant
router.get("/restaurant/:id", requireAuth, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Identifiant de restaurant invalide" });

    const restaurant = await storage.getRestaurant(id);
    if (!restaurant) return res.status(404).json({ message: "Restaurant introuvable" });
    if (restaurant.ownerId !== req.userId) return res.status(403).json({ message: "Non autorisé pour ce restaurant" });

    const bookings = await storage.getBookingsByRestaurant(id);
    res.json(bookings);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Update booking status
router.patch("/:id/status", requireAuth, async (req: any, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    if (isNaN(bookingId)) return res.status(400).json({ message: "Identifiant de réservation invalide" });

    const { status } = req.body;
    if (!status || !["pending", "confirmed", "waiting", "refused", "cancelled", "noshow"].includes(status)) {
      return res.status(400).json({ message: "Statut invalide" });
    }

    const booking = await storage.getBooking(bookingId);
    if (!booking) return res.status(404).json({ message: "Réservation introuvable" });

    const restaurant = await storage.getRestaurant(booking.restaurantId);
    if (!restaurant) return res.status(404).json({ message: "Restaurant introuvable" });
    if (restaurant.ownerId !== req.userId) return res.status(403).json({ message: "Non autorisé pour ce restaurant" });

    const updated = await storage.updateBookingStatus(bookingId, status);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Mark arrival
router.patch("/:id/arrival", requireAuth, async (req: any, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    if (isNaN(bookingId)) return res.status(400).json({ message: "Identifiant de réservation invalide" });

    const booking = await storage.getBooking(bookingId);
    if (!booking) return res.status(404).json({ message: "Réservation introuvable" });

    const restaurant = await storage.getRestaurant(booking.restaurantId);
    if (!restaurant) return res.status(404).json({ message: "Restaurant introuvable" });
    if (restaurant.ownerId !== req.userId) return res.status(403).json({ message: "Non autorisé pour ce restaurant" });

    const now = new Date();
    const arrivalTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    const updated = await storage.updateBookingArrival(bookingId, arrivalTime);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Mark bill requested
router.patch("/:id/bill-requested", requireAuth, async (req: any, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    if (isNaN(bookingId)) return res.status(400).json({ message: "Identifiant de réservation invalide" });

    const booking = await storage.getBooking(bookingId);
    if (!booking) return res.status(404).json({ message: "Réservation introuvable" });

    const restaurant = await storage.getRestaurant(booking.restaurantId);
    if (!restaurant) return res.status(404).json({ message: "Restaurant introuvable" });
    if (restaurant.ownerId !== req.userId) return res.status(403).json({ message: "Non autorisé pour ce restaurant" });

    const updated = await storage.updateBookingBillRequested(bookingId, true);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Mark departure
router.patch("/:id/departure", requireAuth, async (req: any, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    if (isNaN(bookingId)) return res.status(400).json({ message: "Identifiant de réservation invalide" });

    const booking = await storage.getBooking(bookingId);
    if (!booking) return res.status(404).json({ message: "Réservation introuvable" });

    const restaurant = await storage.getRestaurant(booking.restaurantId);
    if (!restaurant) return res.status(404).json({ message: "Restaurant introuvable" });
    if (restaurant.ownerId !== req.userId) return res.status(403).json({ message: "Non autorisé pour ce restaurant" });

    const now = new Date();
    const departureTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    const { billAmount: rawBillAmount } = req.body || {};
    let billAmount: number | undefined = undefined;
    if (rawBillAmount !== undefined && rawBillAmount !== null && rawBillAmount !== "") {
      const parsed = parseFloat(rawBillAmount);
      if (!isNaN(parsed) && isFinite(parsed) && parsed >= 0) {
        billAmount = parsed;
      }
    }

    const updated = await storage.updateBookingDeparture(bookingId, departureTime, billAmount);

    if (billAmount !== undefined && billAmount > 0 && booking.clientId) {
      const numericClientId = parseInt(booking.clientId);
      if (!isNaN(numericClientId)) {
        await storage.updateClientTotalSpent(numericClientId, billAmount);
      }
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Assign table
router.patch("/:id/table", requireAuth, async (req: any, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    if (isNaN(bookingId)) return res.status(400).json({ message: "Identifiant de réservation invalide" });

    const { tableId, zoneId } = req.body;

    const booking = await storage.getBooking(bookingId);
    if (!booking) return res.status(404).json({ message: "Réservation introuvable" });

    const restaurant = await storage.getRestaurant(booking.restaurantId);
    if (!restaurant) return res.status(404).json({ message: "Restaurant introuvable" });
    if (restaurant.ownerId !== req.userId) return res.status(403).json({ message: "Non autorisé pour ce restaurant" });

    const updated = await storage.updateBookingTable(bookingId, tableId || null, zoneId || null);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
