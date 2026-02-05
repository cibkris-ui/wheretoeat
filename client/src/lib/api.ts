import type { Restaurant, Booking } from "@shared/schema";

export async function fetchRestaurants(): Promise<Restaurant[]> {
  const response = await fetch("/api/restaurants", {
    credentials: "include",
  });
  if (!response.ok) throw new Error("Failed to fetch restaurants");
  return response.json();
}

export async function fetchRestaurant(id: number): Promise<Restaurant> {
  const response = await fetch(`/api/restaurants/${id}`, {
    credentials: "include",
  });
  if (!response.ok) throw new Error("Failed to fetch restaurant");
  return response.json();
}

export async function createBooking(booking: {
  restaurantId: number;
  date: string;
  time: string;
  guests: number;
  children?: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialRequest?: string;
  newsletter: number;
}): Promise<Booking> {
  const response = await fetch("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(booking),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create booking");
  }

  return response.json();
}
