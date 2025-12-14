import type { Restaurant, Booking } from "@shared/schema";

const API_BASE = "/api";

export async function fetchRestaurants(): Promise<Restaurant[]> {
  const response = await fetch(`${API_BASE}/restaurants`);
  if (!response.ok) {
    throw new Error("Failed to fetch restaurants");
  }
  return response.json();
}

export async function fetchRestaurant(id: number): Promise<Restaurant> {
  const response = await fetch(`${API_BASE}/restaurants/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch restaurant");
  }
  return response.json();
}

export async function createBooking(booking: {
  restaurantId: number;
  date: string;
  time: string;
  guests: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialRequest?: string;
  newsletter: number;
}): Promise<Booking> {
  const response = await fetch(`${API_BASE}/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(booking),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create booking");
  }
  
  return response.json();
}
