import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { restaurants } from "@shared/schema";
import * as schema from "@shared/schema";

const seedRestaurants = [
  {
    name: "La Tavola Rustica",
    cuisine: "Italien",
    location: "Zurich",
    rating: 4.8,
    priceRange: "$$",
    image: "/assets/generated_images/authentic_italian_pasta_dish.png",
    description: "Pâtes artisanales authentiques servies dans un cadre chaleureux et rustique. Célèbre pour nos tagliatelles aux truffes et notre vaste carte des vins.",
    features: ["Terrasse", "Végétarien", "Accessible PMR"]
  },
  {
    name: "Chalet de Montagne",
    cuisine: "Suisse",
    location: "Zermatt",
    rating: 4.9,
    priceRange: "$$$",
    image: "/assets/generated_images/swiss_cheese_fondue_cozy_setting.png",
    description: "Découvrez le cœur de la Suisse avec nos légendaires fondues et raclettes, servies dans un chalet en bois traditionnel avec vue sur la montagne.",
    features: ["Vue Montagne", "Salle Privée", "Ambiance Cosy"]
  },
  {
    name: "Lumière",
    cuisine: "Européen Moderne",
    location: "Genève",
    rating: 4.7,
    priceRange: "$$$$",
    image: "/assets/generated_images/modern_fine_dining_plated_dish.png",
    description: "Un voyage culinaire à travers l'Europe moderne. Le chef Jean-Pierre crée de l'art dans l'assiette en utilisant uniquement les meilleurs ingrédients de saison.",
    features: ["Étoilé Michelin", "Menu Dégustation", "Sommelier"]
  },
  {
    name: "Alpenblick",
    cuisine: "Suisse / Français",
    location: "Interlaken",
    rating: 4.6,
    priceRange: "$$$",
    image: "/assets/generated_images/elegant_restaurant_dining_atmosphere_hero_background.png",
    description: "Dîner élégant avec vue panoramique sur les Alpes. Mêlant saveurs suisses traditionnelles et sophistication française.",
    features: ["Vue Panoramique", "Vins Fins", "Romantique"]
  }
];

async function seed() {
  console.log("🌱 Seeding database...");
  
  // Create a dedicated connection for seeding
  const connection = await mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 2,
  });
  
  const db = drizzle(connection, { schema, mode: "default" });
  
  try {
    const existing = await db.select().from(restaurants);
    
    if (existing.length === 0) {
      for (const restaurant of seedRestaurants) {
        await db.insert(restaurants).values(restaurant);
        console.log(`✅ Added restaurant: ${restaurant.name}`);
      }
      console.log("✅ Seeding complete!");
    } else {
      console.log("ℹ️  Database already seeded, skipping...");
    }
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  } finally {
    await connection.end();
  }
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
