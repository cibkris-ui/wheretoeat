import { useRoute } from "wouter";
import { getRestaurant } from "@/lib/mockData";
import { Navbar } from "@/components/layout/Navbar";
import { BookingForm } from "@/components/BookingForm";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, ChefHat, Clock, Phone, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RestaurantDetail() {
  const [, params] = useRoute("/restaurant/:id");
  const id = params ? parseInt(params.id) : 0;
  const restaurant = getRestaurant(id);

  if (!restaurant) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-serif font-bold mb-4">Restaurant Not Found</h1>
            <Button onClick={() => window.history.back()}>Go Back</Button>
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
              <Badge className="mb-4 bg-primary text-primary-foreground hover:bg-primary/90">{restaurant.cuisine}</Badge>
              <h1 className="text-4xl md:text-6xl font-serif font-bold mb-2">{restaurant.name}</h1>
              <div className="flex items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {restaurant.location}
                </div>
                <div className="flex items-center gap-1 text-foreground font-medium">
                  <Star className="w-4 h-4 fill-primary text-primary" />
                  {restaurant.rating} (120+ reviews)
                </div>
                <div>{restaurant.priceRange}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container px-4 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Content */}
        <div className="lg:col-span-2 space-y-12">
          <section>
            <h2 className="text-2xl font-serif font-bold mb-4">About</h2>
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

          <section>
            <h2 className="text-2xl font-serif font-bold mb-6">Info & Hours</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h4 className="font-medium">Address</h4>
                    <p className="text-sm text-muted-foreground">Example Street 123<br/>{restaurant.location}, Switzerland</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h4 className="font-medium">Phone</h4>
                    <p className="text-sm text-muted-foreground">+41 44 123 45 67</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Globe className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h4 className="font-medium">Website</h4>
                    <p className="text-sm text-muted-foreground underline cursor-pointer">www.example.com</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-medium mb-2">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  Opening Hours
                </div>
                <div className="grid grid-cols-2 text-sm gap-y-1">
                  <span className="text-muted-foreground">Monday - Friday</span>
                  <span>11:30 - 23:00</span>
                  <span className="text-muted-foreground">Saturday</span>
                  <span>17:00 - 24:00</span>
                  <span className="text-muted-foreground">Sunday</span>
                  <span>Closed</span>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold mb-4">From the Menu</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {/* Mock Menu Items */}
               {[1, 2, 3, 4].map((i) => (
                 <div key={i} className="flex justify-between items-start border-b border-dashed pb-2">
                   <div>
                     <h4 className="font-medium">Signature Dish {i}</h4>
                     <p className="text-xs text-muted-foreground">Fresh local ingredients, chef's special sauce</p>
                   </div>
                   <span className="font-medium">CHF {20 + i * 5}.-</span>
                 </div>
               ))}
            </div>
          </section>
        </div>

        {/* Right Sidebar - Booking Form */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <div className="bg-card border rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-serif font-bold mb-1">Make a Reservation</h3>
              <p className="text-sm text-muted-foreground mb-6">Book a table at {restaurant.name}</p>
              <BookingForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
