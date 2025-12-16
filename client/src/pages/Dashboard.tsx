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
import { MapPin, Star, Utensils, Edit, Check, Plus } from "lucide-react";
import type { Restaurant } from "@shared/schema";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { ReservationsManager } from "@/components/ReservationsManager";

export default function Dashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold">Tableau de bord restaurateur</h1>
            <p className="text-muted-foreground mt-2">
              Bienvenue, {user?.firstName || user?.email || "Restaurateur"}
            </p>
          </div>
          <Button asChild data-testid="button-add-restaurant">
            <a href="/inscrire-restaurant">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un restaurant
            </a>
          </Button>
        </div>

        <Tabs defaultValue="restaurants" className="space-y-6">
          <TabsList>
            <TabsTrigger value="restaurants" data-testid="tab-restaurants">Mes restaurants ({myRestaurants.length})</TabsTrigger>
            <TabsTrigger value="bookings" data-testid="tab-bookings">Réservations</TabsTrigger>
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
                  <Button asChild>
                    <a href="/inscrire-restaurant">
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter mon restaurant
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {myRestaurants.map(restaurant => (
                  <RestaurantManagement key={restaurant.id} restaurant={restaurant} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bookings" className="space-y-6">
            {myRestaurants.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Utensils className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Ajoutez d'abord un restaurant pour voir les réservations.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ReservationsManager restaurants={myRestaurants} />
            )}
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

