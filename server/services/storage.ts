import { nanoid } from "nanoid";
import { eq, and, or, ilike, desc, sql, inArray, ne, gte, like, getTableColumns } from "drizzle-orm";
import { db } from "../db";
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
  type FloorPlan,
  type FloorPlanData,
  type RestaurantUser,
  type InsertRestaurantUser,
  users,
  restaurants,
  bookings,
  restaurantRegistrations,
  cuisineCategories,
  closedDays,
  clients,
  floorPlans,
  restaurantUsers,
} from "@shared/schema";

class DatabaseStorage {
  // === Users ===

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
        set: { ...userData, updatedAt: new Date() },
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
    await db.delete(restaurantRegistrations).where(eq(restaurantRegistrations.userId, id));
    await db.delete(restaurantUsers).where(eq(restaurantUsers.userId, id));
    await db.delete(users).where(eq(users.id, id));
  }

  // === Restaurants ===

  async getAllRestaurants(): Promise<Restaurant[]> {
    return await db.select().from(restaurants).where(
      and(
        eq(restaurants.approvalStatus, "approved"),
        eq(restaurants.isBlocked, false)
      )
    );
  }

  async getAllRestaurantsAdmin(): Promise<(Restaurant & { ownerEmail?: string | null })[]> {
    return await db
      .select({ ...getTableColumns(restaurants), ownerEmail: users.email })
      .from(restaurants)
      .leftJoin(users, eq(restaurants.ownerId, users.id));
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

  async deleteRestaurant(id: number): Promise<void> {
    await db.delete(bookings).where(eq(bookings.restaurantId, id));
    await db.delete(closedDays).where(eq(closedDays.restaurantId, id));
    await db.delete(floorPlans).where(eq(floorPlans.restaurantId, id));
    await db.delete(restaurantUsers).where(eq(restaurantUsers.restaurantId, id));
    await db.update(clients).set({ restaurantId: null }).where(eq(clients.restaurantId, id));
    await db.delete(restaurants).where(eq(restaurants.id, id));
  }

  // === Bookings ===

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [newBooking] = await db.insert(bookings).values({ ...booking, cancelToken: nanoid(32) }).returning();
    return newBooking;
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking;
  }

  async getBookingByCancelToken(token: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.cancelToken, token));
    return booking;
  }

  async getBookingsByRestaurant(restaurantId: number): Promise<Booking[]> {
    return await db.select().from(bookings).where(eq(bookings.restaurantId, restaurantId));
  }

  async getAllBookings(): Promise<Booking[]> {
    return await db.select().from(bookings);
  }

  async getBookedGuestsForSlot(restaurantId: number, date: string, time: string): Promise<number> {
    const slotBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.restaurantId, restaurantId),
          eq(bookings.date, date),
          eq(bookings.time, time),
          inArray(bookings.status, ["pending", "confirmed"])
        )
      );
    return slotBookings.reduce((total, b) => total + b.guests + (b.children || 0), 0);
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

  async updateBookingDeparture(id: number, departureTime: string, billAmount?: number): Promise<Booking | undefined> {
    const updateData: { departureTime: string; billAmount?: number } = { departureTime };
    if (billAmount !== undefined) {
      updateData.billAmount = billAmount;
    }
    const [updated] = await db
      .update(bookings)
      .set(updateData)
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

  async getBookingsForDate(date: string): Promise<Booking[]> {
    return await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.date, date),
          sql`${bookings.status} NOT IN ('cancelled', 'noshow')`
        )
      );
  }

  async checkExistingBooking(clientIp: string, date: string, time: string): Promise<Booking | undefined> {
    const [existing] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.clientIp, clientIp), eq(bookings.date, date), eq(bookings.time, time)));
    return existing;
  }

  async checkIpEmailMismatch(clientIp: string, email: string): Promise<Booking | undefined> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [existing] = await db
      .select()
      .from(bookings)
      .where(
        and(eq(bookings.clientIp, clientIp), ne(bookings.email, email), gte(bookings.createdAt, twentyFourHoursAgo))
      );
    return existing;
  }

  async checkClientIdEmailMismatch(clientId: string, email: string): Promise<Booking | undefined> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [existing] = await db
      .select()
      .from(bookings)
      .where(
        and(eq(bookings.clientId, clientId), ne(bookings.email, email), gte(bookings.createdAt, twentyFourHoursAgo))
      );
    return existing;
  }

  // === Cuisine Categories ===

  async getCuisineCategories(): Promise<CuisineCategory[]> {
    return await db.select().from(cuisineCategories);
  }

  // === Registrations ===

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

  // === Closed Days ===

  async getClosedDays(restaurantId: number): Promise<ClosedDay[]> {
    return await db.select().from(closedDays).where(eq(closedDays.restaurantId, restaurantId));
  }

  async getClosedDaysByMonth(restaurantId: number, year: number, month: number): Promise<ClosedDay[]> {
    const monthStr = month.toString().padStart(2, "0");
    const pattern = `${year}-${monthStr}%`;
    return await db
      .select()
      .from(closedDays)
      .where(and(eq(closedDays.restaurantId, restaurantId), like(closedDays.date, pattern)));
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
    const [closedDay] = await db
      .select()
      .from(closedDays)
      .where(and(eq(closedDays.restaurantId, restaurantId), eq(closedDays.date, date)));
    return !!closedDay;
  }

  // === Clients ===

  async getAllClients(): Promise<Client[]> {
    return await db.select().from(clients).orderBy(desc(clients.createdAt));
  }

  async getClientsByRestaurant(restaurantId: number, search?: string): Promise<Client[]> {
    if (search) {
      const searchPattern = `%${search}%`;
      return await db
        .select()
        .from(clients)
        .where(
          and(
            eq(clients.restaurantId, restaurantId),
            or(
              ilike(clients.firstName, searchPattern),
              ilike(clients.lastName, searchPattern),
              ilike(clients.email, searchPattern),
              ilike(clients.phone, searchPattern)
            )
          )
        )
        .orderBy(desc(clients.updatedAt));
    }
    return await db
      .select()
      .from(clients)
      .where(eq(clients.restaurantId, restaurantId))
      .orderBy(desc(clients.updatedAt));
  }

  async getClientsWithStatsByRestaurant(restaurantId: number, search?: string): Promise<any[]> {
    const baseClients = await this.getClientsByRestaurant(restaurantId, search);
    if (baseClients.length === 0) return [];

    // Deduplicate clients by email (keep the most recently updated one)
    const uniqueByEmail = new Map<string, typeof baseClients[0]>();
    for (const client of baseClients) {
      const key = client.email.toLowerCase();
      const existing = uniqueByEmail.get(key);
      if (!existing || (client.updatedAt && existing.updatedAt && client.updatedAt > existing.updatedAt)) {
        uniqueByEmail.set(key, client);
      }
    }
    const dedupedClients = Array.from(uniqueByEmail.values());

    const clientEmails = dedupedClients.map((c) => c.email.toLowerCase());
    const restaurantBookings = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.restaurantId, restaurantId), inArray(sql`LOWER(${bookings.email})`, clientEmails)))
      .orderBy(desc(bookings.date));

    const bookingsByEmail = new Map<string, typeof restaurantBookings>();
    for (const b of restaurantBookings) {
      const key = b.email.toLowerCase();
      if (!bookingsByEmail.has(key)) bookingsByEmail.set(key, []);
      bookingsByEmail.get(key)!.push(b);
    }

    return dedupedClients.map((client) => {
      const clientBookings = bookingsByEmail.get(client.email.toLowerCase()) || [];
      const validBookings = clientBookings.filter(b => b.status !== "cancelled" && b.status !== "noshow");
      const visitCount = validBookings.length;
      const lastVisit = visitCount > 0 ? validBookings[0].date : null;
      const avgGuests =
        visitCount > 0 ? Math.round(validBookings.reduce((sum, b) => sum + b.guests, 0) / visitCount) : 0;
      return { ...client, visitCount, lastVisit, avgGuests };
    });
  }

  async getAllClientsWithStats(): Promise<any[]> {
    const allClients = await db.select().from(clients).orderBy(desc(clients.createdAt));
    if (allClients.length === 0) return [];

    const clientEmails = allClients.map((c) => c.email.toLowerCase());
    const matchingBookings = await db
      .select()
      .from(bookings)
      .where(inArray(sql`LOWER(${bookings.email})`, clientEmails));

    const bookingsByEmail = new Map<string, typeof matchingBookings>();
    for (const b of matchingBookings) {
      const key = b.email.toLowerCase();
      if (!bookingsByEmail.has(key)) bookingsByEmail.set(key, []);
      bookingsByEmail.get(key)!.push(b);
    }

    return allClients.map((client) => {
      const clientBookings = bookingsByEmail.get(client.email.toLowerCase()) || [];
      const uniqueRestaurants = new Set(clientBookings.map((b) => b.restaurantId));
      const lastBooking = clientBookings.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
      return {
        ...client,
        totalBookings: clientBookings.length,
        restaurantCount: uniqueRestaurants.size,
        lastBookingDate: lastBooking?.createdAt || null,
      };
    });
  }

  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async getClientBookings(clientId: number, restaurantId: number): Promise<Booking[]> {
    const client = await this.getClient(clientId);
    if (!client) return [];
    return await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.restaurantId, restaurantId), eq(sql`LOWER(${bookings.email})`, client.email.toLowerCase())))
      .orderBy(desc(bookings.date));
  }

  async upsertClientFromBooking(
    restaurantId: number,
    firstName: string,
    lastName: string,
    email: string,
    phone: string
  ): Promise<Client> {
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedFirstName = firstName.toLowerCase().trim();
    const normalizedLastName = lastName.toLowerCase().trim();
    const normalizedPhone = phone.replace(/\s+/g, "").trim();

    let existing: Client | undefined;

    if (normalizedPhone) {
      const [byPhone] = await db
        .select()
        .from(clients)
        .where(
          and(eq(clients.restaurantId, restaurantId), eq(sql`REPLACE(${clients.phone}, ' ', '')`, normalizedPhone))
        );
      existing = byPhone;
    }

    if (!existing && normalizedEmail) {
      const [byEmail] = await db
        .select()
        .from(clients)
        .where(
          and(
            eq(clients.restaurantId, restaurantId),
            eq(sql`LOWER(${clients.email})`, normalizedEmail),
            eq(sql`LOWER(${clients.firstName})`, normalizedFirstName),
            eq(sql`LOWER(${clients.lastName})`, normalizedLastName)
          )
        );
      existing = byEmail;
    }

    if (existing) {
      const [updated] = await db
        .update(clients)
        .set({
          phone: phone || existing.phone,
          email: normalizedEmail || existing.email,
          firstName: firstName || existing.firstName,
          lastName: lastName || existing.lastName,
          updatedAt: new Date(),
        })
        .where(eq(clients.id, existing.id))
        .returning();
      return updated;
    }

    const [newClient] = await db
      .insert(clients)
      .values({ restaurantId, firstName, lastName, email: normalizedEmail, phone })
      .returning();
    return newClient;
  }

  async updateClientTotalSpent(clientId: number, amount: number): Promise<Client | undefined> {
    const client = await this.getClient(clientId);
    if (!client) return undefined;

    const newTotal = (client.totalSpent || 0) + amount;
    const newVisitCount = (client.visitCount || 0) + 1;

    const [updated] = await db
      .update(clients)
      .set({ totalSpent: newTotal, visitCount: newVisitCount, updatedAt: new Date() })
      .where(eq(clients.id, clientId))
      .returning();
    return updated;
  }

  // === Floor Plans ===

  async getFloorPlan(restaurantId: number): Promise<FloorPlan | undefined> {
    const [plan] = await db.select().from(floorPlans).where(eq(floorPlans.restaurantId, restaurantId));
    return plan;
  }

  async saveFloorPlan(restaurantId: number, plan: FloorPlanData): Promise<FloorPlan> {
    const existing = await this.getFloorPlan(restaurantId);
    if (existing) {
      const [updated] = await db
        .update(floorPlans)
        .set({ plan, updatedAt: new Date() })
        .where(eq(floorPlans.restaurantId, restaurantId))
        .returning();
      return updated;
    }
    const [newPlan] = await db.insert(floorPlans).values({ restaurantId, plan }).returning();
    return newPlan;
  }

  // === Restaurant Users (Team) ===

  async getRestaurantUsers(
    restaurantId: number
  ): Promise<(RestaurantUser & { firstName?: string | null; lastName?: string | null })[]> {
    return await db
      .select({
        id: restaurantUsers.id,
        restaurantId: restaurantUsers.restaurantId,
        userId: restaurantUsers.userId,
        email: restaurantUsers.email,
        role: restaurantUsers.role,
        invitedAt: restaurantUsers.invitedAt,
        acceptedAt: restaurantUsers.acceptedAt,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(restaurantUsers)
      .leftJoin(users, eq(restaurantUsers.userId, users.id))
      .where(eq(restaurantUsers.restaurantId, restaurantId));
  }

  async addRestaurantUser(data: InsertRestaurantUser): Promise<RestaurantUser> {
    const [newUser] = await db.insert(restaurantUsers).values(data).returning();
    return newUser;
  }

  async addRestaurantUserWithAccess(data: InsertRestaurantUser): Promise<RestaurantUser> {
    const [newUser] = await db
      .insert(restaurantUsers)
      .values({ ...data, acceptedAt: new Date() })
      .returning();
    return newUser;
  }

  async removeRestaurantUser(id: number): Promise<void> {
    await db.delete(restaurantUsers).where(eq(restaurantUsers.id, id));
  }

  async getRestaurantUserByEmail(restaurantId: number, email: string): Promise<RestaurantUser | undefined> {
    const [user] = await db
      .select()
      .from(restaurantUsers)
      .where(and(eq(restaurantUsers.restaurantId, restaurantId), eq(restaurantUsers.email, email.toLowerCase().trim())));
    return user;
  }
}

export const storage = new DatabaseStorage();
