import { Link } from "wouter";
import { Star, MapPin } from "lucide-react";
import type { Restaurant } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export function RestaurantCard({ restaurant }: RestaurantCardProps) {
  return (
    <Link href={`/restaurant/${restaurant.id}`} className="block group h-full cursor-pointer">
      <Card className="h-full overflow-hidden border-0 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 rounded-lg">
        <div className="relative aspect-[4/3] overflow-hidden">
          <img 
            src={restaurant.image} 
            alt={restaurant.name}
            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
          />
          {/* Prominent Rating Badge */}
          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-md px-2 py-1 flex flex-col items-center shadow-sm">
             <span className="text-lg font-bold text-primary leading-none">{restaurant.rating}</span>
             <span className="text-[10px] text-muted-foreground uppercase font-medium">/ 5</span>
          </div>
          
        </div>
        
        <CardHeader className="p-4 pb-1">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold leading-tight group-hover:text-primary transition-colors">
                {restaurant.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {restaurant.cuisine} • {restaurant.priceRange}
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 pt-2 pb-2">
          <div className="flex items-center gap-1 text-muted-foreground text-xs mb-2">
            <MapPin className="w-3 h-3" />
            <span>{restaurant.location}</span>
          </div>
        </CardContent>
        
      </Card>
    </Link>
  );
}
