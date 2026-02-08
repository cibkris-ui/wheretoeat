import React from "react";
import { useRoute } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { BookingForm } from "@/components/booking/BookingForm";
import { GoogleRating } from "@/components/GoogleRating";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, ChefHat, Clock, Phone, Globe, FileText, Image, Mail, Train, Car, Info, CreditCard, Leaf, Languages, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { fetchRestaurant } from "@/lib/api";

export default function RestaurantDetail() {
  const [, params] = useRoute("/restaurant/:id");
  const id = params ? parseInt(params.id) : 0;
  const isEmbed = new URLSearchParams(window.location.search).get("embed") === "true";
  
  const { data: restaurant, isLoading, error } = useQuery({
    queryKey: ["restaurant", id],
    queryFn: () => fetchRestaurant(id),
    enabled: id > 0,
  });

  // Embed mode: only show the booking form
  if (isEmbed) {
    if (isLoading) {
      return (
        <div className="p-4 flex items-center justify-center min-h-[300px]">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      );
    }
    if (error || !restaurant) {
      return (
        <div className="p-4 flex items-center justify-center min-h-[300px]">
          <p className="text-muted-foreground">Restaurant introuvable</p>
        </div>
      );
    }
    return (
      <div className="p-4">
        <h3 className="text-xl font-serif font-bold mb-1">Réserver une table</h3>
        <p className="text-sm text-muted-foreground mb-4">Réserver chez {restaurant.name}</p>
        <BookingForm
          restaurantId={restaurant.id}
          minGuests={restaurant.minGuests ?? 1}
          maxGuests={restaurant.maxGuests ?? 12}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center" data-testid="loading-restaurant">
            <p className="text-muted-foreground">Chargement du restaurant...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-serif font-bold mb-4">Restaurant Introuvable</h1>
            <Button onClick={() => window.history.back()} data-testid="button-back">Retour</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Image */}
      <div className="relative h-[50vh] w-full overflow-hidden">
        <img 
          src={restaurant.image} 
          alt={restaurant.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 container px-4 pb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl md:text-6xl font-serif font-bold mb-2">{restaurant.name}</h1>
              <div className="flex items-center gap-4 text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {restaurant.location}
                </div>
                {restaurant.rating > 0 && (
                  <div className="flex items-center gap-1 text-foreground font-medium">
                    <Star className="w-4 h-4 fill-primary text-primary" />
                    {restaurant.rating}
                  </div>
                )}
                <GoogleRating googlePlaceId={restaurant.googlePlaceId} />
                <div>{restaurant.priceRange}</div>
              </div>
              {restaurant.cuisine && (
                <Badge className="mt-3 bg-primary text-primary-foreground hover:bg-primary/90">{restaurant.cuisine}</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container px-4 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Content */}
        <div className="lg:col-span-2 space-y-12">
          <section>
            <h2 className="text-2xl font-serif font-bold mb-4">À propos</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {restaurant.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {restaurant.features.map(feature => (
                <Badge key={feature} variant="secondary" className="px-3 py-1 text-sm">
                  {feature}
                </Badge>
              ))}
            </div>
          </section>

          {/* Photos Gallery */}
          {restaurant.photos && restaurant.photos.length > 0 && (
            <section>
              <h2 className="text-2xl font-serif font-bold mb-4 flex items-center gap-2">
                <Image className="w-6 h-6" />
                Photos
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {restaurant.photos.map((photo, index) => (
                  <div key={index} className="aspect-square overflow-hidden rounded-lg">
                    <img 
                      src={photo} 
                      alt={`${restaurant.name} - Photo ${index + 1}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                      data-testid={`restaurant-photo-${index}`}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Menu PDF */}
          {restaurant.menuPdfUrl && (
            <section>
              <h2 className="text-2xl font-serif font-bold mb-4 flex items-center gap-2">
                <FileText className="w-6 h-6" />
                Carte / Menu
              </h2>
              <Button 
                asChild 
                variant="outline" 
                className="gap-2"
                data-testid="button-download-menu"
              >
                <a href={restaurant.menuPdfUrl} target="_blank" rel="noopener noreferrer">
                  <FileText className="w-4 h-4" />
                  Voir le menu (PDF)
                </a>
              </Button>
            </section>
          )}

          <section>
            <h2 className="text-2xl font-serif font-bold mb-6">Infos & Horaires</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h4 className="font-medium">Adresse</h4>
                    <p className="text-sm text-muted-foreground">
                      {(() => {
                        const address = restaurant.address || "";
                        const location = restaurant.location || "";
                        if (address && location && !location.includes(address)) {
                          return <>{address}<br/>{location}, Suisse</>;
                        } else if (location) {
                          return <>{location}, Suisse</>;
                        } else if (address) {
                          return <>{address}, Suisse</>;
                        }
                        return "Suisse";
                      })()}
                    </p>
                  </div>
                </div>
                {restaurant.cuisine && (
                  <div className="flex items-start gap-3">
                    <UtensilsCrossed className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <h4 className="font-medium">Cuisine</h4>
                      <p className="text-sm text-muted-foreground">{restaurant.cuisine}</p>
                    </div>
                  </div>
                )}
                {restaurant.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <h4 className="font-medium">Téléphone</h4>
                      <a href={`tel:${restaurant.phone}`} className="text-sm text-muted-foreground hover:text-primary">
                        {restaurant.phone}
                      </a>
                    </div>
                  </div>
                )}
                {restaurant.publicEmail && (
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <h4 className="font-medium">Email</h4>
                      <a href={`mailto:${restaurant.publicEmail}`} className="text-sm text-muted-foreground hover:text-primary">
                        {restaurant.publicEmail}
                      </a>
                    </div>
                  </div>
                )}
                {restaurant.website && (
                  <div className="flex items-start gap-3">
                    <Globe className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <h4 className="font-medium">Site Web</h4>
                      <a 
                        href={restaurant.website.startsWith('http') ? restaurant.website : `https://${restaurant.website}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground underline hover:text-primary"
                      >
                        {restaurant.website}
                      </a>
                    </div>
                  </div>
                )}
                {restaurant.executiveChef && (
                  <div className="flex items-start gap-3">
                    <ChefHat className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <h4 className="font-medium">Chef exécutif</h4>
                      <p className="text-sm text-muted-foreground">{restaurant.executiveChef}</p>
                    </div>
                  </div>
                )}
                {restaurant.publicTransport && (
                  <div className="flex items-start gap-3">
                    <Train className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <h4 className="font-medium">Transports en commun</h4>
                      <p className="text-sm text-muted-foreground">{restaurant.publicTransport}</p>
                    </div>
                  </div>
                )}
                {restaurant.nearbyParking && (
                  <div className="flex items-start gap-3">
                    <Car className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <h4 className="font-medium">Parking à proximité</h4>
                      <p className="text-sm text-muted-foreground">{restaurant.nearbyParking}</p>
                    </div>
                  </div>
                )}
                {restaurant.additionalInfo && (
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <h4 className="font-medium">Informations supplémentaires</h4>
                      <p className="text-sm text-muted-foreground">{restaurant.additionalInfo}</p>
                    </div>
                  </div>
                )}
                {restaurant.paymentMethods && restaurant.paymentMethods.length > 0 && (
                  <div className="flex items-start gap-3">
                    <CreditCard className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <h4 className="font-medium">Paiements Acceptés</h4>
                      <p className="text-sm text-muted-foreground">{restaurant.paymentMethods.join(", ")}</p>
                    </div>
                  </div>
                )}
                {restaurant.hasVegetarianOptions && (
                  <div className="flex items-start gap-3">
                    <Leaf className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Régime alimentaire</h4>
                      <p className="text-sm text-muted-foreground">Plats végétariens disponibles</p>
                    </div>
                  </div>
                )}
                {restaurant.spokenLanguages && restaurant.spokenLanguages.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Languages className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <h4 className="font-medium">Langues parlées</h4>
                      <p className="text-sm text-muted-foreground">{restaurant.spokenLanguages.join(", ")}</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-medium mb-2">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  Heures d'ouverture
                </div>
                {restaurant.openingHours ? (
                  <div className="grid grid-cols-2 text-sm gap-y-1">
                    {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((day) => {
                      const hours = (restaurant.openingHours as Record<string, any>)?.[day];
                      return (
                        <React.Fragment key={day}>
                          <span className="text-muted-foreground">{day}</span>
                          <span>
                            {hours?.isOpen 
                              ? `${hours.openTime1} - ${hours.closeTime1}${hours.hasSecondService ? `, ${hours.openTime2} - ${hours.closeTime2}` : ''}`
                              : 'Fermé'}
                          </span>
                        </React.Fragment>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Horaires non renseignés</p>
                )}
              </div>
            </div>
          </section>

          {restaurant.googlePlaceId && (
            <section>
              <GoogleRating 
                googlePlaceId={restaurant.googlePlaceId} 
                showReviews={true} 
              />
            </section>
          )}

        </div>

        {/* Right Sidebar - Booking Form */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <div className="bg-card border rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-serif font-bold mb-1">Réserver une table</h3>
              <p className="text-sm text-muted-foreground mb-6">Réserver chez {restaurant.name}</p>
              <BookingForm 
                restaurantId={restaurant.id} 
                minGuests={restaurant.minGuests ?? 1}
                maxGuests={restaurant.maxGuests ?? 12}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
