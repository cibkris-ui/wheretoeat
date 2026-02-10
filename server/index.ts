import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import { createServer } from "http";
import cron from "node-cron";
import { getSession } from "./middleware/session";
import { generalLimiter } from "./middleware/rateLimiter";
import { seedCuisineCategoriesIfEmpty } from "./services/seed";
import { processBookingReminders } from "./services/email";
import { storage } from "./services/storage";
import { requireAuth } from "./middleware/auth";
import bcrypt from "bcryptjs";

// Route imports
import authRoutes from "./routes/auth";
import publicRoutes from "./routes/public";
import restaurantRoutes from "./routes/restaurants";
import bookingRoutes from "./routes/bookings";
import clientRoutes from "./routes/clients";
import closedDayRoutes from "./routes/closedDays";
import floorPlanRoutes from "./routes/floorPlans";
import teamRoutes from "./routes/team";
import uploadRoutes from "./routes/upload";
import googlePlacesRoutes from "./routes/googlePlaces";
import adminRoutes from "./routes/admin";
import registrationRoutes from "./routes/registrations";

const app = express();
const httpServer = createServer(app);

app.set("trust proxy", 1);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Session
app.use(getSession());

// Serve uploaded files
app.use("/uploads", express.static(path.resolve("uploads")));

// Logging middleware
function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });

  next();
});

// Rate limiting on API
app.use("/api/", generalLimiter);

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/closed-days", closedDayRoutes);
app.use("/api/floor-plans", floorPlanRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/google-places", googlePlacesRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/registrations", registrationRoutes);

// Logout route (GET for <a> links compatibility)
app.get("/api/logout", (req: any, res) => {
  req.session.destroy((err: any) => {
    res.clearCookie("connect.sid");
    res.redirect("/");
  });
});

// Shortcut: /api/my-restaurants -> /api/restaurants/my-restaurants
app.get("/api/my-restaurants", requireAuth, async (req: any, res) => {
  try {
    const restaurants = await storage.getRestaurantsByOwner(req.userId);
    res.json(restaurants);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Also mount public routes at /api/ level for backwards compatibility
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
    if (isNaN(id)) return res.status(400).json({ message: "Identifiant de restaurant invalide" });
    const restaurant = await storage.getRestaurant(id);
    if (!restaurant) return res.status(404).json({ message: "Restaurant introuvable" });
    res.json(restaurant);
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

(async () => {
  // Seed cuisine categories
  try {
    await seedCuisineCategoriesIfEmpty();
  } catch (e) {
    console.error("Failed to seed cuisine categories:", e);
  }

  // Create default admin user
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const existing = await storage.getUserByEmail(adminEmail);
    if (!existing) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const admin = await storage.createUserWithPassword(adminEmail, hashedPassword, "Admin", "User");
      await storage.updateUser(admin.id, { isAdmin: true });
      console.log(`Default admin created: ${adminEmail}`);
    }
  }

  // Booking reminders: every day at 10:00
  cron.schedule("0 10 * * *", () => {
    console.log("Running booking reminders...");
    processBookingReminders().catch(err => console.error("Reminder cron error:", err));
  });

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  // Static files / Vite dev
  if (process.env.NODE_ENV === "production") {
    const distPath = path.resolve(__dirname, "public");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      // SPA catch-all - but NOT for /api routes
      app.use("*", (req, res, next) => {
        if (req.originalUrl.startsWith("/api")) {
          return res.status(404).json({ message: "API endpoint not found" });
        }
        res.sendFile(path.resolve(distPath, "index.html"));
      });
    }
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen({ port, host: "0.0.0.0" }, () => {
    log(`serving on port ${port}`);
  });
})();
