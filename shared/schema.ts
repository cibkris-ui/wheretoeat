import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, real, timestamp, index, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  password: varchar("password"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").default(false),
  userType: text("user_type").default("client"),
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
  restaurantName: text("restaurant_name").notNull(),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  companyName: text("company_name").notNull(),
  registrationNumber: text("registration_number"),
  cuisineType: text("cuisine_type").array().notNull(),
  priceRange: text("price_range").notNull(),
  description: text("description"),
  openingHours: jsonb("opening_hours"),
  logoUrl: text("logo_url"),
  photos: text("photos").array(),
  menuPdfUrl: text("menu_pdf_url"),
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

// Restaurants
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
  photos: text("photos").array(),
  closedDates: text("closed_dates").array(),
  ownerId: varchar("owner_id").references(() => users.id),
  phone: text("phone"),
  address: text("address"),
  openingHours: jsonb("opening_hours"),
  menuPdfUrl: text("menu_pdf_url"),
  googlePlaceId: text("google_place_id"),
  publicEmail: text("public_email"),
  preferredLanguage: text("preferred_language").default("fr"),
  website: text("website"),
  capacity: integer("capacity").default(40),
  onlineCapacity: integer("online_capacity"),
  minGuests: integer("min_guests").default(1),
  maxGuests: integer("max_guests").default(12),
  approvalStatus: text("approval_status").default("pending"),
  isBlocked: boolean("is_blocked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  executiveChef: text("executive_chef"),
  publicTransport: text("public_transport"),
  nearbyParking: text("nearby_parking"),
  additionalInfo: text("additional_info"),
  paymentMethods: text("payment_methods").array(),
  hasVegetarianOptions: boolean("has_vegetarian_options").default(false),
  spokenLanguages: text("spoken_languages").array(),
  askBillAmount: boolean("ask_bill_amount").default(false),
  companyName: text("company_name"),
  registrationNumber: text("registration_number"),
}, (table) => [
  index("idx_restaurants_owner_id").on(table.ownerId),
  index("idx_restaurants_approval_status").on(table.approvalStatus),
]);

export const insertRestaurantSchema = createInsertSchema(restaurants).omit({
  id: true,
});

export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;
export type Restaurant = typeof restaurants.$inferSelect;

// Bookings
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id),
  date: text("date").notNull(),
  time: text("time").notNull(),
  guests: integer("guests").notNull(),
  children: integer("children").notNull().default(0),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  specialRequest: text("special_request"),
  newsletter: integer("newsletter").notNull().default(0),
  clientIp: text("client_ip"),
  clientId: text("client_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  arrivalTime: text("arrival_time"),
  billRequested: boolean("bill_requested").default(false),
  departureTime: text("departure_time"),
  billAmount: real("bill_amount"),
  status: text("status").notNull().default("confirmed"),
  tableId: text("table_id"),
  zoneId: text("zone_id"),
  cancelToken: text("cancel_token"),
}, (table) => [
  index("idx_bookings_restaurant_date_time").on(table.restaurantId, table.date, table.time),
  index("idx_bookings_client_ip").on(table.clientIp),
  index("idx_bookings_email").on(table.email),
  index("idx_bookings_client_id").on(table.clientId),
  index("idx_bookings_restaurant_id").on(table.restaurantId),
]);

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
});

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

// Clients
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").references(() => restaurants.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  notes: text("notes"),
  tags: text("tags").array(),
  totalSpent: real("total_spent").default(0),
  visitCount: integer("visit_count").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_clients_restaurant_id").on(table.restaurantId),
  index("idx_clients_email").on(table.email),
]);

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

// Closed days
export const closedDays = pgTable("closed_days", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id),
  date: text("date").notNull(),
  service: text("service").notNull().default("all"),
  reason: text("reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertClosedDaySchema = createInsertSchema(closedDays).omit({
  id: true,
  createdAt: true,
});

export type InsertClosedDay = z.infer<typeof insertClosedDaySchema>;
export type ClosedDay = typeof closedDays.$inferSelect;

// Floor plans
export const floorPlans = pgTable("floor_plans", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id).unique(),
  plan: jsonb("plan").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFloorPlanSchema = createInsertSchema(floorPlans).omit({
  id: true,
  updatedAt: true,
});

export type InsertFloorPlan = z.infer<typeof insertFloorPlanSchema>;
export type FloorPlan = typeof floorPlans.$inferSelect;

// Floor plan type definitions
export interface FloorPlanTable {
  id: string;
  type: "table";
  name: string;
  capacity: number;
  maxCapacity: number;
  shape: "square" | "round" | "rectangle";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface FloorPlanDecor {
  id: string;
  type: "decor";
  decorType: "door" | "plant" | "bar" | "wall" | "window";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface FloorPlanZone {
  id: string;
  name: string;
  type: "indoor" | "terrace" | "floor";
  items: (FloorPlanTable | FloorPlanDecor)[];
}

export interface FloorPlanData {
  zones: FloorPlanZone[];
}

// Restaurant team members
export const restaurantUsers = pgTable("restaurant_users", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id),
  userId: varchar("user_id").references(() => users.id),
  email: text("email").notNull(),
  role: text("role").notNull().default("staff"),
  invitedAt: timestamp("invited_at").notNull().defaultNow(),
  acceptedAt: timestamp("accepted_at"),
});

export const insertRestaurantUserSchema = createInsertSchema(restaurantUsers).omit({
  id: true,
  invitedAt: true,
  acceptedAt: true,
});

export type InsertRestaurantUser = z.infer<typeof insertRestaurantUserSchema>;
export type RestaurantUser = typeof restaurantUsers.$inferSelect;
