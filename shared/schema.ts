import { randomUUID } from "node:crypto";
import { mysqlTable, text, varchar, int, float, timestamp, json } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const restaurants = mysqlTable("restaurants", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  cuisine: varchar("cuisine", { length: 100 }).notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  rating: float("rating").notNull(),
  priceRange: varchar("price_range", { length: 20 }).notNull(),
  image: varchar("image", { length: 500 }).notNull(),
  description: text("description").notNull(),
  features: json("features").$type<string[]>().notNull(),
});

export const insertRestaurantSchema = createInsertSchema(restaurants).omit({
  id: true,
});

export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;
export type Restaurant = typeof restaurants.$inferSelect;

export const bookings = mysqlTable("bookings", {
  id: int("id").primaryKey().autoincrement(),
  restaurantId: int("restaurant_id").notNull().references(() => restaurants.id),
  date: varchar("date", { length: 20 }).notNull(),
  time: varchar("time", { length: 10 }).notNull(),
  guests: int("guests").notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  specialRequest: text("special_request"),
  newsletter: int("newsletter").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
});

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;
