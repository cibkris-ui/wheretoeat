import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, Users, MapPin, Star, Utensils, Edit, Check } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Restaurant, Booking } from "@shared/schema";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";

export default function Dashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Connexion requise",
        description: "Vous devez être connecté pour accéder au tableau de bord.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: myRestaurants = [], isLoading: restaurantsLoading } = useQuery<Restaurant[]>({
    queryKey: ["/api/my-restaurants"],
    enabled: isAuthenticated,
  });

  const { data: allRestaurants = [] } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
    enabled: isAuthenticated && myRestaurants.length === 0,
  });

  const claimMutation = useMutation({
    mutationFn: async (restaurantId: number) => {
      await apiRequest("POST", `/api/restaurants/${restaurantId}/claim`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-restaurants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      toast({ title: "Restaurant revendiqué avec succès!" });
    },
    onError: () => {
      toast({ title: "Erreur lors de la revendication", variant: "destructive" });
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-12 flex justify-center">
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const availableRestaurants = allRestaurants.filter(r => !r.ownerId);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold">Tableau de bord restaurateur</h1>
          <p className="text-muted-foreground mt-2">
            Bienvenue, {user?.firstName || user?.email || "Restaurateur"}
          </p>
        </div>

        <Tabs defaultValue="restaurants" className="space-y-6">
          <TabsList>
            <TabsTrigger value="restaurants" data-testid="tab-restaurants">Mes restaurants</TabsTrigger>
            <TabsTrigger value="bookings" data-testid="tab-bookings">Réservations</TabsTrigger>
            {myRestaurants.length === 0 && (
              <TabsTrigger value="claim" data-testid="tab-claim">Revendiquer un restaurant</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="restaurants" className="space-y-6">
            {myRestaurants.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Utensils className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Aucun restaurant</h3>
                  <p className="text-muted-foreground mb-4">
                    Vous n'avez pas encore de restaurant associé à votre compte.
                  </p>
                  <Button onClick={() => document.querySelector('[value="claim"]')?.dispatchEvent(new MouseEvent('click'))}>
                    Revendiquer un restaurant
                  </Button>
                </CardContent>
              </Card>
            ) : (
              myRestaurants.map(restaurant => (
                <RestaurantManagement key={restaurant.id} restaurant={restaurant} />
              ))
            )}
          </TabsContent>

          <TabsContent value="bookings" className="space-y-6">
            {myRestaurants.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Revendiquez d'abord un restaurant pour voir les réservations.
                  </p>
                </CardContent>
              </Card>
            ) : (
              myRestaurants.map(restaurant => (
                <RestaurantBookings key={restaurant.id} restaurant={restaurant} />
              ))
            )}
          </TabsContent>

          <TabsContent value="claim" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Revendiquer un restaurant</CardTitle>
                <CardDescription>
                  Sélectionnez votre restaurant pour le gérer
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {availableRestaurants.length === 0 ? (
                  <p className="text-muted-foreground">Aucun restaurant disponible.</p>
                ) : (
                  availableRestaurants.map(restaurant => (
                    <div key={restaurant.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <img 
                          src={restaurant.image} 
                          alt={restaurant.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div>
                          <h4 className="font-medium">{restaurant.name}</h4>
                          <p className="text-sm text-muted-foreground">{restaurant.cuisine} • {restaurant.location}</p>
                        </div>
                      </div>
                      <Button 
                        onClick={() => claimMutation.mutate(restaurant.id)}
                        disabled={claimMutation.isPending}
                        data-testid={`claim-restaurant-${restaurant.id}`}
                      >
                        Revendiquer
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function RestaurantManagement({ restaurant }: { restaurant: Restaurant }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: restaurant.name,
    description: restaurant.description,
    cuisine: restaurant.cuisine,
    location: restaurant.location,
    priceRange: restaurant.priceRange,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      await apiRequest("PUT", `/api/restaurants/${restaurant.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-restaurants"] });
      setIsEditing(false);
      toast({ title: "Restaurant mis à jour!" });
    },
    onError: () => {
      toast({ title: "Erreur lors de la mise à jour", variant: "destructive" });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            {restaurant.name}
            <Badge variant="secondary">{restaurant.cuisine}</Badge>
          </CardTitle>
          <CardDescription className="flex items-center gap-2 mt-1">
            <MapPin className="h-4 w-4" />
            {restaurant.location}
            <span className="mx-2">•</span>
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            {restaurant.rating}
          </CardDescription>
        </div>
        <Button 
          variant={isEditing ? "default" : "outline"} 
          size="sm"
          onClick={() => {
            if (isEditing) {
              updateMutation.mutate(formData);
            } else {
              setIsEditing(true);
            }
          }}
          data-testid={`edit-restaurant-${restaurant.id}`}
        >
          {isEditing ? <><Check className="h-4 w-4 mr-2" /> Sauvegarder</> : <><Edit className="h-4 w-4 mr-2" /> Modifier</>}
        </Button>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nom</Label>
              <Input 
                id="name"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                data-testid="input-restaurant-name"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                data-testid="input-restaurant-description"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="cuisine">Cuisine</Label>
                <Input 
                  id="cuisine"
                  value={formData.cuisine}
                  onChange={e => setFormData(prev => ({ ...prev, cuisine: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="location">Lieu</Label>
                <Input 
                  id="location"
                  value={formData.location}
                  onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="priceRange">Gamme de prix</Label>
                <Input 
                  id="priceRange"
                  value={formData.priceRange}
                  onChange={e => setFormData(prev => ({ ...prev, priceRange: e.target.value }))}
                />
              </div>
            </div>
            <Button variant="outline" onClick={() => setIsEditing(false)}>Annuler</Button>
          </div>
        ) : (
          <div className="flex gap-6">
            <img 
              src={restaurant.image} 
              alt={restaurant.name}
              className="w-32 h-32 object-cover rounded-lg"
            />
            <div>
              <p className="text-muted-foreground">{restaurant.description}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                {restaurant.features.map((feature, i) => (
                  <Badge key={i} variant="outline">{feature}</Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RestaurantBookings({ restaurant }: { restaurant: Restaurant }) {
  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: [`/api/restaurants/${restaurant.id}/bookings`],
  });

  const upcomingBookings = bookings.filter(b => new Date(b.date) >= new Date());
  const pastBookings = bookings.filter(b => new Date(b.date) < new Date());

  return (
    <Card>
      <CardHeader>
        <CardTitle>{restaurant.name} - Réservations</CardTitle>
        <CardDescription>
          {bookings.length} réservation{bookings.length !== 1 ? 's' : ''} au total
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Chargement...</p>
        ) : bookings.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Aucune réservation pour le moment.</p>
        ) : (
          <div className="space-y-6">
            {upcomingBookings.length > 0 && (
              <div>
                <h4 className="font-medium mb-3 text-primary">À venir ({upcomingBookings.length})</h4>
                <div className="space-y-3">
                  {upcomingBookings.map(booking => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </div>
              </div>
            )}
            {pastBookings.length > 0 && (
              <div>
                <h4 className="font-medium mb-3 text-muted-foreground">Passées ({pastBookings.length})</h4>
                <div className="space-y-3 opacity-60">
                  {pastBookings.slice(0, 5).map(booking => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BookingCard({ booking }: { booking: Booking }) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg" data-testid={`booking-${booking.id}`}>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {format(new Date(booking.date), "d MMMM yyyy", { locale: fr })}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          {booking.time}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          {booking.guests} personne{booking.guests > 1 ? 's' : ''}
        </div>
      </div>
      <div className="text-right">
        <p className="font-medium">{booking.firstName} {booking.lastName}</p>
        <p className="text-sm text-muted-foreground">{booking.email}</p>
        <p className="text-sm text-muted-foreground">{booking.phone}</p>
      </div>
    </div>
  );
}
