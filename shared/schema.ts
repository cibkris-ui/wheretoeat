import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, real, timestamp, index, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Cuisine categories
export const cuisineCategories = pgTable("cuisine_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  icon: text("icon"),
});

export const insertCuisineCategorySchema = createInsertSchema(cuisineCategories).omit({ id: true });
export type InsertCuisineCategory = z.infer<typeof insertCuisineCategorySchema>;
export type CuisineCategory = typeof cuisineCategories.$inferSelect;

// Restaurant registration requests (pending validation)
export const restaurantRegistrations = pgTable("restaurant_registrations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  
  // Restaurant info
  restaurantName: text("restaurant_name").notNull(),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  companyName: text("company_name").notNull(),
  registrationNumber: text("registration_number"),
  cuisineType: text("cuisine_type").notNull(),
  priceRange: text("price_range").notNull(),
  description: text("description"),
  
  // Opening hours (JSON format)
  openingHours: jsonb("opening_hours"),
  
  // Files
  logoUrl: text("logo_url"),
  photos: text("photos").array(),
  menuPdfUrl: text("menu_pdf_url"),
  
  // Validation
  status: text("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRegistrationSchema = createInsertSchema(restaurantRegistrations).omit({
  id: true,
  status: true,
  adminNotes: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;
export type RestaurantRegistration = typeof restaurantRegistrations.$inferSelect;

// Existing restaurants table
export const restaurants = pgTable("restaurants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  cuisine: text("cuisine").notNull(),
  location: text("location").notNull(),
  rating: real("rating").notNull(),
  priceRange: text("price_range").notNull(),
  image: text("image").notNull(),
  description: text("description").notNull(),
  features: text("features").array().notNull(),
  ownerId: varchar("owner_id").references(() => users.id),
  phone: text("phone"),
  address: text("address"),
  openingHours: jsonb("opening_hours"),
  menuPdfUrl: text("menu_pdf_url"),
});

export const insertRestaurantSchema = createInsertSchema(restaurants).omit({
  id: true,
});

export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;
export type Restaurant = typeof restaurants.$inferSelect;

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id),
  date: text("date").notNull(),
  time: text("time").notNull(),
  guests: integer("guests").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  specialRequest: text("special_request"),
  newsletter: integer("newsletter").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
});

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;
