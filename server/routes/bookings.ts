import { Router } from "express";
import { insertBookingSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { storage } from "../services/storage";
import { requireAuth } from "../middleware/auth";
import { sendBookingConfirmation, sendBookingNotificationToRestaurant, sendBookingConfirmedEmail, sendBookingWaitingEmail, sendBookingCancelledEmail } from "../services/email";

const router = Router();

function baseHtmlPage(title: string, message: string, success: boolean): string {
  const color = success ? "#16a34a" : "#dc2626";
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title} - WhereToEat</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;">
  <div style="background:#fff;border-radius:8px;padding:48px 32px;max-width:480px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="font-size:48px;margin-bottom:16px;">${success ? "✓" : "✗"}</div>
    <h1 style="margin:0 0 16px;font-size:22px;color:${color};">${title}</h1>
    <p style="color:#71717a;font-size:15px;margin:0 0 24px;">${message}</p>
    <a href="https://wheretoeat.ch" style="display:inline-block;padding:12px 32px;background-color:#18181b;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Retour à WhereToEat</a>
  </div>
</body>
</html>`;
}

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

    // Track client IP
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

    // Send emails (fire-and-forget)
    sendBookingConfirmation(booking, restaurant).catch(err => console.error("Email confirmation error:", err));
    if (restaurant.publicEmail) {
      sendBookingNotificationToRestaurant(booking, restaurant).catch(err => console.error("Email notification error:", err));
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

    // Send status change email to client (fire-and-forget)
    if (status === "confirmed") {
      sendBookingConfirmedEmail(booking, restaurant).catch(err => console.error("Email confirmed error:", err));
    } else if (status === "waiting") {
      sendBookingWaitingEmail(booking, restaurant).catch(err => console.error("Email waiting error:", err));
    } else if (status === "refused" || status === "cancelled") {
      sendBookingCancelledEmail(booking, restaurant).catch(err => console.error("Email cancelled error:", err));
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Public cancel via token (no auth required)
router.get("/cancel/:cancelToken", async (req, res) => {
  try {
    const { cancelToken } = req.params;
    const booking = await storage.getBookingByCancelToken(cancelToken);

    if (!booking) {
      return res.status(404).send(baseHtmlPage(
        "Lien invalide",
        "Ce lien d'annulation n'est pas valide ou a déjà été utilisé.",
        false
      ));
    }

    if (booking.status === "cancelled" || booking.status === "refused") {
      return res.send(baseHtmlPage(
        "Réservation déjà annulée",
        "Cette réservation a déjà été annulée.",
        true
      ));
    }

    await storage.updateBookingStatus(booking.id, "cancelled");

    res.send(baseHtmlPage(
      "Réservation annulée",
      "Votre réservation a bien été annulée. Nous espérons vous revoir bientôt !",
      true
    ));
  } catch (error: any) {
    res.status(500).send(baseHtmlPage(
      "Erreur",
      "Une erreur est survenue lors de l'annulation. Veuillez réessayer plus tard.",
      false
    ));
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
