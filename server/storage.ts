import { eq } from "drizzle-orm";
import { db } from "./db";
import { 
  type User, 
  type UpsertUser,
  type Restaurant, 
  type InsertRestaurant,
  type Booking,
  type InsertBooking,
  type RestaurantRegistration,
  type InsertRegistration,
  type CuisineCategory,
  users,
  restaurants,
  bookings,
  restaurantRegistrations,
  cuisineCategories
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUserWithPassword(email: string, hashedPassword: string, firstName?: string, lastName?: string): Promise<User>;
  
  getAllRestaurants(): Promise<Restaurant[]>;
  getRestaurant(id: number): Promise<Restaurant | undefined>;
  getRestaurantsByOwner(ownerId: string): Promise<Restaurant[]>;
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;
  updateRestaurant(id: number, data: Partial<InsertRestaurant>): Promise<Restaurant | undefined>;
  
  createBooking(booking: InsertBooking): Promise<Booking>;
  getBookingsByRestaurant(restaurantId: number): Promise<Booking[]>;
  
  getCuisineCategories(): Promise<CuisineCategory[]>;
  
  createRegistration(registration: InsertRegistration): Promise<RestaurantRegistration>;
  getRegistrationsByUser(userId: string): Promise<RestaurantRegistration[]>;
  getAllRegistrations(): Promise<RestaurantRegistration[]>;
  getRegistration(id: number): Promise<RestaurantRegistration | undefined>;
  updateRegistrationStatus(id: number, status: string, adminNotes?: string): Promise<RestaurantRegistration | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUserWithPassword(email: string, hashedPassword: string, firstName?: string, lastName?: string): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
      })
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllRestaurants(): Promise<Restaurant[]> {
    return await db.select().from(restaurants);
  }

  async getRestaurant(id: number): Promise<Restaurant | undefined> {
    const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, id));
    return restaurant;
  }

  async getRestaurantsByOwner(ownerId: string): Promise<Restaurant[]> {
    return await db.select().from(restaurants).where(eq(restaurants.ownerId, ownerId));
  }

  async createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant> {
    const [newRestaurant] = await db.insert(restaurants).values(restaurant).returning();
    return newRestaurant;
  }

  async updateRestaurant(id: number, data: Partial<InsertRestaurant>): Promise<Restaurant | undefined> {
    const [updated] = await db
      .update(restaurants)
      .set(data)
      .where(eq(restaurants.id, id))
      .returning();
    return updated;
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [newBooking] = await db.insert(bookings).values(booking).returning();
    return newBooking;
  }

  async getBookingsByRestaurant(restaurantId: number): Promise<Booking[]> {
    return await db.select().from(bookings).where(eq(bookings.restaurantId, restaurantId));
  }

  async getCuisineCategories(): Promise<CuisineCategory[]> {
    return await db.select().from(cuisineCategories);
  }

  async createRegistration(registration: InsertRegistration): Promise<RestaurantRegistration> {
    const [newReg] = await db.insert(restaurantRegistrations).values(registration).returning();
    return newReg;
  }

  async getRegistrationsByUser(userId: string): Promise<RestaurantRegistration[]> {
    return await db.select().from(restaurantRegistrations).where(eq(restaurantRegistrations.userId, userId));
  }

  async getAllRegistrations(): Promise<RestaurantRegistration[]> {
    return await db.select().from(restaurantRegistrations);
  }

  async getRegistration(id: number): Promise<RestaurantRegistration | undefined> {
    const [reg] = await db.select().from(restaurantRegistrations).where(eq(restaurantRegistrations.id, id));
    return reg;
  }

  async updateRegistrationStatus(id: number, status: string, adminNotes?: string): Promise<RestaurantRegistration | undefined> {
    const [updated] = await db
      .update(restaurantRegistrations)
      .set({ status, adminNotes, updatedAt: new Date() })
      .where(eq(restaurantRegistrations.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
