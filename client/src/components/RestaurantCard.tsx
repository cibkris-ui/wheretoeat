import { Link } from "wouter";
import { Star, MapPin } from "lucide-react";
import { Restaurant } from "@/lib/mockData";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export function RestaurantCard({ restaurant }: RestaurantCardProps) {
  return (
    <Link href={`/restaurant/${restaurant.id}`} className="block group h-full cursor-pointer">
      <Card className="h-full overflow-hidden border-0 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        <div className="relative aspect-[4/3] overflow-hidden">
          <img 
            src={restaurant.image} 
            alt={restaurant.name}
            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="font-medium bg-white/90 backdrop-blur-sm text-foreground shadow-sm">
                {restaurant.priceRange}
              </Badge>
          </div>
        </div>
        <CardHeader className="p-4 pb-2">
          <div className="flex justify-between items-start">
            <h3 className="font-serif text-xl font-semibold leading-tight group-hover:text-primary transition-colors">
              {restaurant.name}
            </h3>
            <div className="flex items-center gap-1 text-sm font-medium">
              <Star className="w-4 h-4 fill-primary text-primary" />
              <span>{restaurant.rating}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex items-center gap-1 text-muted-foreground text-sm mb-2">
            <MapPin className="w-3.5 h-3.5" />
            <span>{restaurant.location}</span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {restaurant.description}
          </p>
        </CardContent>
        <CardFooter className="p-4 pt-0 flex gap-2 flex-wrap">
          {restaurant.features.slice(0, 2).map((feature) => (
            <Badge key={feature} variant="outline" className="text-xs font-normal border-muted-foreground/20">
              {feature}
            </Badge>
          ))}
        </CardFooter>
      </Card>
    </Link>
  );
}
