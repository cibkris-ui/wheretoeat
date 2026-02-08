interface GooglePlaceDetails {
  rating?: number;
  userRatingsTotal?: number;
  reviews?: GoogleReview[];
  priceLevel?: number;
}

interface GoogleReview {
  authorName: string;
  rating: number;
  text: string;
  relativeTimeDescription: string;
  profilePhotoUrl?: string;
}

interface PlaceSearchResult {
  placeId: string;
  name: string;
  address: string;
  rating?: number;
  userRatingsTotal?: number;
}

export class GooglePlacesService {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async searchPlaces(query: string, location?: string): Promise<PlaceSearchResult[]> {
    if (!this.apiKey) throw new Error("Google Places API key not configured");

    const searchQuery = location ? `${query} ${location}` : query;
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&type=restaurant&key=${this.apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      throw new Error(`Google Places API error: ${data.status}`);
    }

    return (data.results || []).map((place: any) => ({
      placeId: place.place_id,
      name: place.name,
      address: place.formatted_address,
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
    }));
  }

  async getPlaceDetails(placeId: string): Promise<GooglePlaceDetails | null> {
    if (!this.apiKey) throw new Error("Google Places API key not configured");

    const fields = "rating,user_ratings_total,reviews,price_level";
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&key=${this.apiKey}&language=fr`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK") return null;

    const result = data.result;
    return {
      rating: result.rating,
      userRatingsTotal: result.user_ratings_total,
      priceLevel: result.price_level,
      reviews: (result.reviews || []).slice(0, 5).map((review: any) => ({
        authorName: review.author_name,
        rating: review.rating,
        text: review.text,
        relativeTimeDescription: review.relative_time_description,
        profilePhotoUrl: review.profile_photo_url,
      })),
    };
  }
}

export const googlePlacesService = new GooglePlacesService();
