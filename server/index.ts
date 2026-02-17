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

// Security headers
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});

// HTML escape helper (prevent XSS in meta injection)
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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
        const msg = capturedJsonResponse?.message || capturedJsonResponse?.error;
        if (msg) logLine += ` :: ${msg}`;
      }
      log(logLine);
    }
  });

  next();
});

// robots.txt
app.get("/robots.txt", (_req, res) => {
  res.type("text/plain").send(
`User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /admin
Disallow: /login
Disallow: /api
Sitemap: https://wheretoeat.ch/sitemap.xml`
  );
});

// sitemap.xml (dynamic)
app.get("/sitemap.xml", async (_req, res) => {
  try {
    const restaurants = await storage.getAllRestaurants();
    const staticPages = [
      { loc: "https://wheretoeat.ch/", priority: "1.0" },
      { loc: "https://wheretoeat.ch/a-propos", priority: "0.5" },
      { loc: "https://wheretoeat.ch/restaurants", priority: "0.8" },
      { loc: "https://wheretoeat.ch/inscrire-restaurant", priority: "0.6" },
    ];
    const restaurantPages = restaurants.map((r) => ({
      loc: `https://wheretoeat.ch/restaurant/${r.id}`,
      priority: "0.7",
    }));
    const allPages = [...staticPages, ...restaurantPages];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map((p) => `  <url>
    <loc>${p.loc}</loc>
    <priority>${p.priority}</priority>
  </url>`).join("\n")}
</urlset>`;
    res.type("application/xml").send(xml);
  } catch (error: any) {
    res.status(500).send("Error generating sitemap");
  }
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
    console.error("Error fetching my restaurants:", error);
    res.status(500).json({ message: "Erreur lors de la récupération des restaurants" });
  }
});

// Also mount public routes at /api/ level for backwards compatibility
app.get("/api/restaurants", async (_req, res) => {
  try {
    const restaurants = await storage.getAllRestaurants();
    res.json(restaurants);
  } catch (error: any) {
    console.error("Error fetching restaurants:", error);
    res.status(500).json({ message: "Erreur lors de la récupération des restaurants" });
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
    console.error("Error fetching restaurant:", error);
    res.status(500).json({ message: "Erreur lors de la récupération du restaurant" });
  }
});

app.get("/api/cuisine-categories", async (_req, res) => {
  try {
    const categories = await storage.getCuisineCategories();
    res.json(categories);
  } catch (error: any) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: "Erreur lors de la récupération des catégories" });
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
    console.error("Unhandled error:", err);
    const message = status < 500 ? (err.message || "Erreur") : "Une erreur est survenue";
    res.status(status).json({ message });
  });

  // Static files / Vite dev
  if (process.env.NODE_ENV === "production") {
    const distPath = path.resolve(__dirname, "public");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      // SPA catch-all - but NOT for /api routes
      app.use("*", async (req, res, next) => {
        if (req.originalUrl.startsWith("/api")) {
          return res.status(404).json({ message: "API endpoint not found" });
        }

        const indexPath = path.resolve(distPath, "index.html");

        // Server-side meta injection for /restaurant/:id (crawlers see correct OG tags)
        const restaurantMatch = req.originalUrl.match(/^\/restaurant\/(\d+)/);
        if (restaurantMatch) {
          try {
            const restaurantId = parseInt(restaurantMatch[1]);
            const restaurant = await storage.getRestaurant(restaurantId);
            if (restaurant) {
              let html = fs.readFileSync(indexPath, "utf-8");
              const city = escapeHtml(restaurant.location?.split(" ").slice(1).join(" ") || "Suisse");
              const safeName = escapeHtml(restaurant.name);
              const pageTitle = `${safeName} - Restaurant à ${city} | WHERETOEAT.CH`;
              const pageDesc = restaurant.description
                ? escapeHtml(restaurant.description.substring(0, 160))
                : `Réservez une table chez ${safeName} à ${city}. Réservation en ligne sur WHERETOEAT.CH.`;
              const pageImage = restaurant.image
                ? escapeHtml(restaurant.image.startsWith("http") ? restaurant.image : `https://wheretoeat.ch${restaurant.image}`)
                : "https://wheretoeat.ch/resto3.jpg";
              const pageUrl = `https://wheretoeat.ch/restaurant/${restaurant.id}`;

              html = html.replace(/<title>[^<]*<\/title>/, `<title>${pageTitle}</title>`);
              html = html.replace(
                /<meta name="description" content="[^"]*"/,
                `<meta name="description" content="${pageDesc}"`
              );
              html = html.replace(
                /<meta property="og:title" content="[^"]*"/,
                `<meta property="og:title" content="${pageTitle}"`
              );
              html = html.replace(
                /<meta property="og:description" content="[^"]*"/,
                `<meta property="og:description" content="${pageDesc}"`
              );
              html = html.replace(
                /<meta property="og:url" content="[^"]*"/,
                `<meta property="og:url" content="${pageUrl}"`
              );
              html = html.replace(
                /<meta property="og:image" content="[^"]*"/,
                `<meta property="og:image" content="${pageImage}"`
              );
              html = html.replace(
                /<meta name="twitter:title" content="[^"]*"/,
                `<meta name="twitter:title" content="${pageTitle}"`
              );
              html = html.replace(
                /<meta name="twitter:description" content="[^"]*"/,
                `<meta name="twitter:description" content="${pageDesc}"`
              );
              html = html.replace(
                /<meta name="twitter:image" content="[^"]*"/,
                `<meta name="twitter:image" content="${pageImage}"`
              );
              html = html.replace(
                /<link rel="canonical" href="[^"]*"/,
                `<link rel="canonical" href="${pageUrl}"`
              );

              return res.send(html);
            }
          } catch (err) {
            // Fall through to default index.html
          }
        }

        res.sendFile(indexPath);
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
