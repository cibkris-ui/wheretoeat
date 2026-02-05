import { Navbar } from "@/components/layout/Navbar";
import { RestaurantCard } from "@/components/RestaurantCard";
import { useQuery } from "@tanstack/react-query";
import { fetchRestaurants } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState } from "react";

export default function Restaurants() {
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: restaurants, isLoading, error } = useQuery({
    queryKey: ["restaurants"],
    queryFn: fetchRestaurants,
  });

  const filteredRestaurants = restaurants?.filter((restaurant) =>
    restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.cuisine.toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Tous les restaurants</h1>
          <p className="text-muted-foreground">Découvrez notre sélection de restaurants en Suisse</p>
        </div>

        <div className="mb-6 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, cuisine ou ville..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-restaurants"
            />
          </div>
        </div>

        {isLoading && (
          <div className="text-center py-12" data-testid="loading-restaurants">
            <p className="text-muted-foreground">Chargement des restaurants...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-12" data-testid="error-restaurants">
            <p className="text-red-600">Erreur lors du chargement des restaurants.</p>
          </div>
        )}

        {filteredRestaurants && filteredRestaurants.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredRestaurants.map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>
        )}

        {filteredRestaurants && filteredRestaurants.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Aucun restaurant trouvé.</p>
          </div>
        )}
      </div>

      <footer className="bg-white border-t py-8 text-gray-600">
        <div className="container px-4 text-center text-sm">
          © {new Date().getFullYear()} WHERETOEAT.CH. Tous droits réservés.
        </div>
      </footer>
    </div>
  );
}
