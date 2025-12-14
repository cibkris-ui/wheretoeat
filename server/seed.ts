import { db, pool } from "./db";
import { restaurants } from "@shared/schema";

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
  console.log("🌱 Seeding MySQL database...");
  
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
    await pool.end();
  }
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
