import { eq, and, or, ilike, desc, sql } from "drizzle-orm";
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
  type ClosedDay,
  type InsertClosedDay,
  type Client,
  type InsertClient,
  type FloorPlan,
  type FloorPlanData,
  users,
  restaurants,
  bookings,
  restaurantRegistrations,
  cuisineCategories,
  closedDays,
  clients,
  floorPlans
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUserWithPassword(email: string, hashedPassword: string, firstName?: string, lastName?: string): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, data: Partial<UpsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
  
  getAllRestaurants(): Promise<Restaurant[]>;
  getAllRestaurantsAdmin(): Promise<Restaurant[]>;
  getRestaurant(id: number): Promise<Restaurant | undefined>;
  getRestaurantsByOwner(ownerId: string): Promise<Restaurant[]>;
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;
  updateRestaurant(id: number, data: Partial<InsertRestaurant>): Promise<Restaurant | undefined>;
  deleteRestaurant(id: number): Promise<void>;
  getAllClients(): Promise<Client[]>;
  
  createBooking(booking: InsertBooking): Promise<Booking>;
  getBooking(id: number): Promise<Booking | undefined>;
  getBookingsByRestaurant(restaurantId: number): Promise<Booking[]>;
  checkExistingBooking(clientIp: string, date: string, time: string): Promise<Booking | undefined>;
  checkIpEmailMismatch(clientIp: string, email: string): Promise<Booking | undefined>;
  checkClientIdEmailMismatch(clientId: string, email: string): Promise<Booking | undefined>;
  updateBookingArrival(id: number, arrivalTime: string): Promise<Booking | undefined>;
  updateBookingBillRequested(id: number, billRequested: boolean): Promise<Booking | undefined>;
  updateBookingDeparture(id: number, departureTime: string): Promise<Booking | undefined>;
  updateBookingStatus(id: number, status: string): Promise<Booking | undefined>;
  updateBookingTable(id: number, tableId: string | null, zoneId: string | null): Promise<Booking | undefined>;
  
  getCuisineCategories(): Promise<CuisineCategory[]>;
  
  createRegistration(registration: InsertRegistration): Promise<RestaurantRegistration>;
  getRegistrationsByUser(userId: string): Promise<RestaurantRegistration[]>;
  getAllRegistrations(): Promise<RestaurantRegistration[]>;
  getRegistration(id: number): Promise<RestaurantRegistration | undefined>;
  updateRegistrationStatus(id: number, status: string, adminNotes?: string): Promise<RestaurantRegistration | undefined>;
  
  getClosedDays(restaurantId: number): Promise<ClosedDay[]>;
  getClosedDaysByMonth(restaurantId: number, year: number, month: number): Promise<ClosedDay[]>;
  createClosedDay(closedDay: InsertClosedDay): Promise<ClosedDay>;
  deleteClosedDay(id: number): Promise<void>;
  getClosedDay(id: number): Promise<ClosedDay | undefined>;
  isDateClosed(restaurantId: number, date: string): Promise<boolean>;
  
  getClientsByRestaurant(restaurantId: number, search?: string): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  getClientBookings(clientId: number, restaurantId: number): Promise<Booking[]>;
  upsertClientFromBooking(restaurantId: number, firstName: string, lastName: string, email: string, phone: string): Promise<Client>;
  
  getFloorPlan(restaurantId: number): Promise<FloorPlan | undefined>;
  saveFloorPlan(restaurantId: number, plan: FloorPlanData): Promise<FloorPlan>;
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

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(id: string, data: Partial<UpsertUser>): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getAllRestaurants(): Promise<Restaurant[]> {
    return await db.select().from(restaurants).where(
      and(
        eq(restaurants.approvalStatus, 'approved'),
        eq(restaurants.isBlocked, false)
      )
    );
  }

  async getAllRestaurantsAdmin(): Promise<Restaurant[]> {
    return await db.select().from(restaurants);
  }

  async deleteRestaurant(id: number): Promise<void> {
    await db.delete(bookings).where(eq(bookings.restaurantId, id));
    await db.delete(clients).where(eq(clients.restaurantId, id));
    await db.delete(closedDays).where(eq(closedDays.restaurantId, id));
    await db.delete(restaurants).where(eq(restaurants.id, id));
  }

  async getAllClients(): Promise<Client[]> {
    return await db.select().from(clients).orderBy(desc(clients.createdAt));
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

  async getBooking(id: number): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking;
  }

  async getBookingsByRestaurant(restaurantId: number): Promise<Booking[]> {
    return await db.select().from(bookings).where(eq(bookings.restaurantId, restaurantId));
  }

  async updateBookingArrival(id: number, arrivalTime: string): Promise<Booking | undefined> {
    const [updated] = await db
      .update(bookings)
      .set({ arrivalTime })
      .where(eq(bookings.id, id))
      .returning();
    return updated;
  }

  async updateBookingBillRequested(id: number, billRequested: boolean): Promise<Booking | undefined> {
    const [updated] = await db
      .update(bookings)
      .set({ billRequested })
      .where(eq(bookings.id, id))
      .returning();
    return updated;
  }

  async updateBookingDeparture(id: number, departureTime: string): Promise<Booking | undefined> {
    const [updated] = await db
      .update(bookings)
      .set({ departureTime })
      .where(eq(bookings.id, id))
      .returning();
    return updated;
  }

  async updateBookingStatus(id: number, status: string): Promise<Booking | undefined> {
    const [updated] = await db
      .update(bookings)
      .set({ status })
      .where(eq(bookings.id, id))
      .returning();
    return updated;
  }

  async updateBookingTable(id: number, tableId: string | null, zoneId: string | null): Promise<Booking | undefined> {
    const [updated] = await db
      .update(bookings)
      .set({ tableId, zoneId })
      .where(eq(bookings.id, id))
      .returning();
    return updated;
  }

  async checkExistingBooking(clientIp: string, date: string, time: string): Promise<Booking | undefined> {
    const [existing] = await db.select().from(bookings).where(
      and(
        eq(bookings.clientIp, clientIp),
        eq(bookings.date, date),
        eq(bookings.time, time)
      )
    );
    return existing;
  }

  async checkIpEmailMismatch(clientIp: string, email: string): Promise<Booking | undefined> {
    const { ne, gte } = await import("drizzle-orm");
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [existing] = await db.select().from(bookings).where(
      and(
        eq(bookings.clientIp, clientIp),
        ne(bookings.email, email),
        gte(bookings.createdAt, twentyFourHoursAgo)
      )
    );
    return existing;
  }

  async checkClientIdEmailMismatch(clientId: string, email: string): Promise<Booking | undefined> {
    const { ne, gte } = await import("drizzle-orm");
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [existing] = await db.select().from(bookings).where(
      and(
        eq(bookings.clientId, clientId),
        ne(bookings.email, email),
        gte(bookings.createdAt, twentyFourHoursAgo)
      )
    );
    return existing;
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

  async getClosedDays(restaurantId: number): Promise<ClosedDay[]> {
    return await db.select().from(closedDays).where(eq(closedDays.restaurantId, restaurantId));
  }

  async getClosedDaysByMonth(restaurantId: number, year: number, month: number): Promise<ClosedDay[]> {
    const { like } = await import("drizzle-orm");
    const monthStr = month.toString().padStart(2, '0');
    const pattern = `${year}-${monthStr}%`;
    return await db.select().from(closedDays).where(
      and(
        eq(closedDays.restaurantId, restaurantId),
        like(closedDays.date, pattern)
      )
    );
  }

  async createClosedDay(closedDay: InsertClosedDay): Promise<ClosedDay> {
    const [newClosedDay] = await db.insert(closedDays).values(closedDay).returning();
    return newClosedDay;
  }

  async deleteClosedDay(id: number): Promise<void> {
    await db.delete(closedDays).where(eq(closedDays.id, id));
  }

  async getClosedDay(id: number): Promise<ClosedDay | undefined> {
    const [closedDay] = await db.select().from(closedDays).where(eq(closedDays.id, id));
    return closedDay;
  }

  async isDateClosed(restaurantId: number, date: string): Promise<boolean> {
    const [closedDay] = await db.select().from(closedDays).where(
      and(
        eq(closedDays.restaurantId, restaurantId),
        eq(closedDays.date, date)
      )
    );
    return !!closedDay;
  }

  async getClientsByRestaurant(restaurantId: number, search?: string): Promise<Client[]> {
    if (search) {
      const searchPattern = `%${search}%`;
      return await db.select().from(clients).where(
        and(
          eq(clients.restaurantId, restaurantId),
          or(
            ilike(clients.firstName, searchPattern),
            ilike(clients.lastName, searchPattern),
            ilike(clients.email, searchPattern),
            ilike(clients.phone, searchPattern)
          )
        )
      ).orderBy(desc(clients.updatedAt));
    }
    return await db.select().from(clients).where(eq(clients.restaurantId, restaurantId)).orderBy(desc(clients.updatedAt));
  }

  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async getClientBookings(clientId: number, restaurantId: number): Promise<Booking[]> {
    const client = await this.getClient(clientId);
    if (!client) return [];
    
    return await db.select().from(bookings).where(
      and(
        eq(bookings.restaurantId, restaurantId),
        eq(bookings.email, client.email)
      )
    ).orderBy(desc(bookings.date));
  }

  async upsertClientFromBooking(restaurantId: number, firstName: string, lastName: string, email: string, phone: string): Promise<Client> {
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedFirstName = firstName.toLowerCase().trim();
    const normalizedLastName = lastName.toLowerCase().trim();
    
    // Recherche par combinaison nom/prénom/email (une fiche par personne même email)
    const [existing] = await db.select().from(clients).where(
      and(
        eq(clients.restaurantId, restaurantId),
        eq(sql`LOWER(${clients.email})`, normalizedEmail),
        eq(sql`LOWER(${clients.firstName})`, normalizedFirstName),
        eq(sql`LOWER(${clients.lastName})`, normalizedLastName)
      )
    );
    
    if (existing) {
      // Met à jour seulement le téléphone si le client existe
      const [updated] = await db.update(clients)
        .set({ phone, updatedAt: new Date() })
        .where(eq(clients.id, existing.id))
        .returning();
      return updated;
    }
    
    // Crée une nouvelle fiche pour ce nom/prénom
    const [newClient] = await db.insert(clients).values({
      restaurantId,
      firstName,
      lastName,
      email: normalizedEmail,
      phone
    }).returning();
    return newClient;
  }

  async getFloorPlan(restaurantId: number): Promise<FloorPlan | undefined> {
    const [plan] = await db.select().from(floorPlans).where(eq(floorPlans.restaurantId, restaurantId));
    return plan;
  }

  async saveFloorPlan(restaurantId: number, plan: FloorPlanData): Promise<FloorPlan> {
    const existing = await this.getFloorPlan(restaurantId);
    if (existing) {
      const [updated] = await db.update(floorPlans)
        .set({ plan, updatedAt: new Date() })
        .where(eq(floorPlans.restaurantId, restaurantId))
        .returning();
      return updated;
    }
    const [newPlan] = await db.insert(floorPlans).values({
      restaurantId,
      plan,
    }).returning();
    return newPlan;
  }
}

export const storage = new DatabaseStorage();
