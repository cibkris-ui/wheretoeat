import { useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Users, Clock, Mail, Phone, Building2, Edit, Save, X, ChefHat, LogOut } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Restaurant, Booking } from "@shared/schema";
import { useState } from "react";
import { isUnauthorizedError } from "@/lib/authUtils";

async function fetchMyRestaurants(): Promise<Restaurant[]> {
  const res = await fetch("/api/my-restaurants", { credentials: "include" });
  if (!res.ok) {
    if (res.status === 401) throw new Error("401: Unauthorized");
    throw new Error("Erreur lors du chargement");
  }
  return res.json();
}

async function fetchBookings(restaurantId: number): Promise<Booking[]> {
  const res = await fetch(`/api/restaurants/${restaurantId}/bookings`, { credentials: "include" });
  if (!res.ok) throw new Error("Erreur lors du chargement");
  return res.json();
}

async function fetchAllRestaurants(): Promise<Restaurant[]> {
  const res = await fetch("/api/restaurants");
  if (!res.ok) throw new Error("Erreur");
  return res.json();
}

async function claimRestaurant(id: number): Promise<Restaurant> {
  const res = await fetch(`/api/restaurants/${id}/claim`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || "Erreur");
  }
  return res.json();
}

async function updateRestaurant(id: number, data: Partial<Restaurant>): Promise<Restaurant> {
  const res = await fetch(`/api/restaurants/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.message || "Erreur");
  }
  return res.json();
}

function RestaurantEditor({ restaurant, onClose }: { restaurant: Restaurant; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: restaurant.name,
    description: restaurant.description,
    image: restaurant.image,
    cuisine: restaurant.cuisine,
    location: restaurant.location,
    priceRange: restaurant.priceRange,
    features: restaurant.features.join(", "),
  });

  const mutation = useMutation({
    mutationFn: () => updateRestaurant(restaurant.id, {
      ...formData,
      features: formData.features.split(",").map(f => f.trim()).filter(Boolean),
    }),
    onSuccess: () => {
      toast({ title: "Restaurant mis à jour" });
      queryClient.invalidateQueries({ queryKey: ["my-restaurants"] });
      onClose();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expirée", description: "Reconnexion...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Edit className="w-5 h-5" /> Modifier {restaurant.name}
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-editor">
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Nom</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              data-testid="input-restaurant-name"
            />
          </div>
          <div>
            <Label htmlFor="cuisine">Cuisine</Label>
            <Input
              id="cuisine"
              value={formData.cuisine}
              onChange={(e) => setFormData({ ...formData, cuisine: e.target.value })}
              data-testid="input-restaurant-cuisine"
            />
          </div>
          <div>
            <Label htmlFor="location">Emplacement</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              data-testid="input-restaurant-location"
            />
          </div>
          <div>
            <Label htmlFor="priceRange">Gamme de prix</Label>
            <Input
              id="priceRange"
              value={formData.priceRange}
              onChange={(e) => setFormData({ ...formData, priceRange: e.target.value })}
              data-testid="input-restaurant-price"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="image">URL de l'image</Label>
          <Input
            id="image"
            value={formData.image}
            onChange={(e) => setFormData({ ...formData, image: e.target.value })}
            data-testid="input-restaurant-image"
          />
        </div>
        <div>
          <Label htmlFor="features">Caractéristiques (séparées par virgule)</Label>
          <Input
            id="features"
            value={formData.features}
            onChange={(e) => setFormData({ ...formData, features: e.target.value })}
            placeholder="Terrasse, Végétarien, Accessible PMR"
            data-testid="input-restaurant-features"
          />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            data-testid="input-restaurant-description"
          />
        </div>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} data-testid="button-save-restaurant">
          <Save className="w-4 h-4 mr-2" />
          {mutation.isPending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </CardContent>
    </Card>
  );
}

function BookingsList({ restaurantId }: { restaurantId: number }) {
  const { data: bookings, isLoading } = useQuery({
    queryKey: ["bookings", restaurantId],
    queryFn: () => fetchBookings(restaurantId),
  });

  if (isLoading) return <p className="text-muted-foreground">Chargement...</p>;
  if (!bookings || bookings.length === 0) return <p className="text-muted-foreground">Aucune réservation</p>;

  return (
    <div className="space-y-3">
      {bookings.map((booking) => (
        <Card key={booking.id} className="p-4" data-testid={`card-booking-${booking.id}`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{format(new Date(booking.date), "d MMMM yyyy", { locale: fr })}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{booking.time}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span>{booking.guests} pers.</span>
              </div>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{booking.firstName} {booking.lastName}</span>
              <div className="flex items-center gap-1">
                <Mail className="w-3 h-3" /> {booking.email}
              </div>
              <div className="flex items-center gap-1">
                <Phone className="w-3 h-3" /> {booking.phone}
              </div>
            </div>
          </div>
          {booking.specialRequest && (
            <p className="mt-2 text-sm text-muted-foreground italic">"{booking.specialRequest}"</p>
          )}
        </Card>
      ))}
    </div>
  );
}

function ClaimRestaurantSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: allRestaurants } = useQuery({
    queryKey: ["restaurants"],
    queryFn: fetchAllRestaurants,
  });

  const mutation = useMutation({
    mutationFn: claimRestaurant,
    onSuccess: () => {
      toast({ title: "Restaurant revendiqué avec succès!" });
      queryClient.invalidateQueries({ queryKey: ["my-restaurants"] });
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expirée", description: "Reconnexion...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const availableRestaurants = allRestaurants?.filter(r => !r.ownerId) || [];

  if (availableRestaurants.length === 0) {
    return <p className="text-muted-foreground">Tous les restaurants ont déjà été revendiqués.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {availableRestaurants.map((restaurant) => (
        <Card key={restaurant.id} className="overflow-hidden" data-testid={`card-claim-${restaurant.id}`}>
          <div className="aspect-video overflow-hidden">
            <img src={restaurant.image} alt={restaurant.name} className="w-full h-full object-cover" />
          </div>
          <CardContent className="p-4">
            <h3 className="font-bold">{restaurant.name}</h3>
            <p className="text-sm text-muted-foreground">{restaurant.cuisine} • {restaurant.location}</p>
            <Button
              className="mt-3 w-full"
              onClick={() => mutation.mutate(restaurant.id)}
              disabled={mutation.isPending}
              data-testid={`button-claim-${restaurant.id}`}
            >
              <Building2 className="w-4 h-4 mr-2" />
              Revendiquer
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { toast } = useToast();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: myRestaurants, isLoading: restaurantsLoading } = useQuery({
    queryKey: ["my-restaurants"],
    queryFn: fetchMyRestaurants,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({ title: "Connexion requise", description: "Redirection...", variant: "destructive" });
      setTimeout(() => { window.location.href = "/api/login"; }, 500);
    }
  }, [authLoading, isAuthenticated, toast]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-12 text-center">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container py-8 px-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="text-dashboard-title">
              <ChefHat className="w-8 h-8 text-primary" />
              Espace Restaurateur
            </h1>
            <p className="text-muted-foreground mt-1">
              Bienvenue, {user?.firstName || user?.email || "Restaurateur"}
            </p>
          </div>
          <a href="/api/logout">
            <Button variant="outline" data-testid="button-logout">
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </Button>
          </a>
        </div>

        <Tabs defaultValue="my-restaurants" className="space-y-6">
          <TabsList data-testid="tabs-dashboard">
            <TabsTrigger value="my-restaurants" data-testid="tab-my-restaurants">Mes Restaurants</TabsTrigger>
            <TabsTrigger value="claim" data-testid="tab-claim">Revendiquer un restaurant</TabsTrigger>
          </TabsList>

          <TabsContent value="my-restaurants" className="space-y-6">
            {restaurantsLoading && <p className="text-muted-foreground">Chargement...</p>}
            
            {myRestaurants && myRestaurants.length === 0 && (
              <Card className="p-8 text-center">
                <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <CardTitle className="mb-2">Aucun restaurant</CardTitle>
                <CardDescription>
                  Vous n'avez pas encore de restaurant. Cliquez sur "Revendiquer un restaurant" pour commencer.
                </CardDescription>
              </Card>
            )}

            {myRestaurants && myRestaurants.map((restaurant) => (
              <div key={restaurant.id}>
                {editingId === restaurant.id ? (
                  <RestaurantEditor restaurant={restaurant} onClose={() => setEditingId(null)} />
                ) : (
                  <Card data-testid={`card-restaurant-${restaurant.id}`}>
                    <CardHeader className="flex flex-row items-start justify-between">
                      <div className="flex items-start gap-4">
                        <img 
                          src={restaurant.image} 
                          alt={restaurant.name} 
                          className="w-24 h-24 rounded-lg object-cover"
                        />
                        <div>
                          <CardTitle>{restaurant.name}</CardTitle>
                          <CardDescription>{restaurant.cuisine} • {restaurant.location} • {restaurant.priceRange}</CardDescription>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {restaurant.features.map((f) => (
                              <span key={f} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">{f}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setEditingId(restaurant.id)} data-testid={`button-edit-${restaurant.id}`}>
                        <Edit className="w-4 h-4 mr-1" />
                        Modifier
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Réservations
                      </h4>
                      <BookingsList restaurantId={restaurant.id} />
                    </CardContent>
                  </Card>
                )}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="claim">
            <Card>
              <CardHeader>
                <CardTitle>Revendiquer votre restaurant</CardTitle>
                <CardDescription>
                  Sélectionnez un restaurant ci-dessous pour le gérer. Vous pourrez ensuite modifier ses informations et voir les réservations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ClaimRestaurantSection />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
