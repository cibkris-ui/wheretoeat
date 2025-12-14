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
    cuisine: "Italien",
    location: "Zurich",
    rating: 4.8,
    priceRange: "$$",
    image: italianImage,
    description: "Pâtes artisanales authentiques servies dans un cadre chaleureux et rustique. Célèbre pour nos tagliatelles aux truffes et notre vaste carte des vins.",
    features: ["Terrasse", "Végétarien", "Accessible PMR"]
  },
  {
    id: 2,
    name: "Chalet de Montagne",
    cuisine: "Suisse",
    location: "Zermatt",
    rating: 4.9,
    priceRange: "$$$",
    image: swissImage,
    description: "Découvrez le cœur de la Suisse avec nos légendaires fondues et raclettes, servies dans un chalet en bois traditionnel avec vue sur la montagne.",
    features: ["Vue Montagne", "Salle Privée", "Ambiance Cosy"]
  },
  {
    id: 3,
    name: "Lumière",
    cuisine: "Européen Moderne",
    location: "Genève",
    rating: 4.7,
    priceRange: "$$$$",
    image: modernImage,
    description: "Un voyage culinaire à travers l'Europe moderne. Le chef Jean-Pierre crée de l'art dans l'assiette en utilisant uniquement les meilleurs ingrédients de saison.",
    features: ["Étoilé Michelin", "Menu Dégustation", "Sommelier"]
  },
  {
    id: 4,
    name: "Alpenblick",
    cuisine: "Suisse / Français",
    location: "Interlaken",
    rating: 4.6,
    priceRange: "$$$",
    image: heroImage,
    description: "Dîner élégant avec vue panoramique sur les Alpes. Mêlant saveurs suisses traditionnelles et sophistication française.",
    features: ["Vue Panoramique", "Vins Fins", "Romantique"]
  }
];

export const getRestaurant = (id: number) => restaurants.find(r => r.id === id);
