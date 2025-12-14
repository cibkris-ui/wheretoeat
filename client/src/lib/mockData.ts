import heroImage from '@assets/generated_images/elegant_restaurant_dining_atmosphere_hero_background.png';
import italianImage from '@assets/generated_images/authentic_italian_pasta_dish.png';
import swissImage from '@assets/generated_images/swiss_cheese_fondue_cozy_setting.png';
import modernImage from '@assets/generated_images/modern_fine_dining_plated_dish.png';

export interface Restaurant {
  id: number;
  name: string;
  cuisine: string;
  location: string;
  rating: number;
  priceRange: '$$' | '$$$' | '$$$$';
  image: string;
  description: string;
  features: string[];
}

export const restaurants: Restaurant[] = [
  {
    id: 1,
    name: "La Tavola Rustica",
    cuisine: "Italian",
    location: "Zurich",
    rating: 4.8,
    priceRange: "$$",
    image: italianImage,
    description: "Authentic handmade pasta served in a warm, rustic setting. Famous for our truffle tagliatelle and extensive wine list.",
    features: ["Outdoor Seating", "Vegetarian Friendly", "Wheelchair Accessible"]
  },
  {
    id: 2,
    name: "Chalet de Montagne",
    cuisine: "Swiss",
    location: "Zermatt",
    rating: 4.9,
    priceRange: "$$$",
    image: swissImage,
    description: "Experience the heart of Switzerland with our legendary fondue and raclette, served in a traditional wooden chalet with mountain views.",
    features: ["Mountain View", "Private Rooms", "Cozy Atmosphere"]
  },
  {
    id: 3,
    name: "Lumière",
    cuisine: "Modern European",
    location: "Geneva",
    rating: 4.7,
    priceRange: "$$$$",
    image: modernImage,
    description: "A culinary journey through modern Europe. Chef Jean-Pierre creates art on a plate using only the finest seasonal ingredients.",
    features: ["Michelin Star", "Tasting Menu", "Sommelier Service"]
  },
  {
    id: 4,
    name: "Alpenblick",
    cuisine: "Swiss / French",
    location: "Interlaken",
    rating: 4.6,
    priceRange: "$$$",
    image: heroImage,
    description: "Elegant dining with a panoramic view of the Alps. Blending traditional Swiss flavors with French sophistication.",
    features: ["Scenic View", "Fine Wines", "Romantic"]
  }
];

export const getRestaurant = (id: number) => restaurants.find(r => r.id === id);
