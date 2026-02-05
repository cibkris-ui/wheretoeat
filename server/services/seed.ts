import { db } from "../db";
import { cuisineCategories } from "@shared/schema";

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

export async function seedCuisineCategoriesIfEmpty() {
  const existing = await db.select().from(cuisineCategories);
  if (existing.length === 0) {
    for (const cat of seedCuisineCategories) {
      await db.insert(cuisineCategories).values(cat);
    }
    console.log("Cuisine categories seeded.");
  }
}
