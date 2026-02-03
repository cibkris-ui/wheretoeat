import { db } from "./db";
import { restaurants, cuisineCategories } from "@shared/schema";

const seedCuisineCategories = [
  { name: "Italien", icon: "\u{1F35D}" },
  { name: "Fran\u00e7ais", icon: "\u{1F950}" },
  { name: "Suisse", icon: "\u{1F9C0}" },
  { name: "Japonais", icon: "\u{1F371}" },
  { name: "Chinois", icon: "\u{1F961}" },
  { name: "Indien", icon: "\u{1F35B}" },
  { name: "Burgers", icon: "\u{1F354}" },
  { name: "Pizza", icon: "\u{1F355}" },
  { name: "Sushi", icon: "\u{1F363}" },
  { name: "V\u00e9g\u00e9talien", icon: "\u{1F957}" },
  { name: "Brunch", icon: "\u{1F95E}" },
  { name: "Romantique", icon: "\u{1F495}" },
  { name: "Oriental", icon: "\u{1F959}" },
  { name: "Festif", icon: "\u{1F389}" },
  { name: "Du monde", icon: "\u{1F30D}" },
];

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

export async function seedCuisineCategoriesIfEmpty() {
  const existing = await db.select().from(cuisineCategories);
  if (existing.length === 0) {
    for (const cat of seedCuisineCategories) {
      await db.insert(cuisineCategories).values(cat);
    }
    console.log("Cuisine categories seeded.");
  }
}

async function seed() {
  console.log("Seeding database...");

  try {
    // Seed cuisine categories
    await seedCuisineCategoriesIfEmpty();

    // Seed restaurants
    const existing = await db.select().from(restaurants);

    if (existing.length === 0) {
      for (const restaurant of seedRestaurants) {
        await db.insert(restaurants).values(restaurant);
        console.log(`Added restaurant: ${restaurant.name}`);
      }
      console.log("Seeding complete!");
    } else {
      console.log("Database already seeded, skipping restaurants...");
    }
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
