import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { apiUrl } from "@/lib/queryClient";

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

async function fetchGooglePlaceDetails(placeId: string): Promise<GooglePlaceDetails | null> {
  const response = await fetch(apiUrl(`/api/google-places/${placeId}`));
  if (!response.ok) {
    if (response.status === 503) {
      return null;
    }
    throw new Error("Failed to fetch Google Place details");
  }
  return response.json();
}

async function checkGooglePlacesConfigured(): Promise<boolean> {
  try {
    const response = await fetch(apiUrl("/api/google-places/configured"));
    const data = await response.json();
    return data.configured;
  } catch {
    return false;
  }
}

interface GoogleRatingProps {
  googlePlaceId?: string | null;
  showReviews?: boolean;
  className?: string;
}

export function GoogleRating({ googlePlaceId, showReviews = false, className = "" }: GoogleRatingProps) {
  const { data: isConfigured } = useQuery({
    queryKey: ["google-places-configured"],
    queryFn: checkGooglePlacesConfigured,
    staleTime: 1000 * 60 * 60,
  });

  const { data: placeDetails, isLoading } = useQuery({
    queryKey: ["google-place", googlePlaceId],
    queryFn: () => fetchGooglePlaceDetails(googlePlaceId!),
    enabled: !!googlePlaceId && !!isConfigured,
    staleTime: 1000 * 60 * 30,
  });

  if (!googlePlaceId || !isConfigured) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 text-muted-foreground ${className}`}>
        <span className="text-sm">Chargement des avis Google...</span>
      </div>
    );
  }

  if (!placeDetails || !placeDetails.rating) {
    return null;
  }

  return (
    <div className={className} data-testid="google-rating">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
          <img 
            src="https://www.google.com/favicon.ico" 
            alt="Google" 
            className="w-4 h-4"
          />
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          <span className="font-semibold text-sm" data-testid="google-rating-value">
            {placeDetails.rating.toFixed(1)}
          </span>
          {placeDetails.userRatingsTotal && (
            <span className="text-xs text-muted-foreground" data-testid="google-rating-count">
              ({placeDetails.userRatingsTotal} avis)
            </span>
          )}
        </div>
      </div>

      {showReviews && placeDetails.reviews && placeDetails.reviews.length > 0 && (
        <div className="mt-6 space-y-4" data-testid="google-reviews">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <img 
              src="https://www.google.com/favicon.ico" 
              alt="Google" 
              className="w-4 h-4"
            />
            Avis Google
          </h3>
          <div className="space-y-4">
            {placeDetails.reviews.map((review, index) => (
              <div 
                key={index} 
                className="bg-muted/30 rounded-lg p-4"
                data-testid={`google-review-${index}`}
              >
                <div className="flex items-start gap-3">
                  {review.profilePhotoUrl ? (
                    <img 
                      src={review.profilePhotoUrl} 
                      alt={review.authorName}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">
                      {review.authorName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{review.authorName}</span>
                      <span className="text-xs text-muted-foreground">{review.relativeTimeDescription}</span>
                    </div>
                    <div className="flex items-center gap-0.5 mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3 h-3 ${
                            star <= review.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                    {review.text && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                        {review.text}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
