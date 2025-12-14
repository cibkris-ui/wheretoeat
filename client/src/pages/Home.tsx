import { Navbar } from "@/components/layout/Navbar";
import { RestaurantCard } from "@/components/RestaurantCard";
import { restaurants } from "@/lib/mockData";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import heroImage from '@assets/generated_images/elegant_restaurant_dining_atmosphere_hero_background.png';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImage} 
            alt="Dining Atmosphere" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>
        
        <div className="relative z-10 container text-center text-white space-y-8 px-4">
          <h1 className="text-5xl md:text-7xl font-serif font-bold tracking-tight animate-in fade-in slide-in-from-bottom-4 duration-700">
            Taste Switzerland
          </h1>
          <p className="text-xl md:text-2xl font-light opacity-90 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
            Discover and book the finest tables across the country. 
            From rustic chalets to Michelin stars.
          </p>
          
          <div className="max-w-3xl mx-auto bg-white/10 backdrop-blur-md p-2 rounded-lg border border-white/20 flex flex-col md:flex-row gap-2 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/70" />
              <Input 
                className="h-12 pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/70 focus-visible:ring-0 focus-visible:border-white/50" 
                placeholder="Cuisine, Restaurant, or Location..." 
              />
            </div>
            <Button size="lg" className="h-12 px-8 text-base font-semibold bg-primary hover:bg-primary/90 border-0">
              Find a Table
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Restaurants */}
      <section className="py-20 container px-4">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-3xl font-serif font-bold mb-2">Featured Restaurants</h2>
            <p className="text-muted-foreground">Curated selection of top-rated dining experiences.</p>
          </div>
          <Button variant="outline">View All</Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {restaurants.map((restaurant) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </div>
      </section>

      {/* Categories / Banner */}
      <section className="bg-muted py-20">
        <div className="container px-4 text-center">
          <h2 className="text-3xl font-serif font-bold mb-12">Browse by Experience</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Fine Dining', 'Casual', 'Swiss Traditional', 'Romantic', 'Business', 'Outdoor', 'Brunch', 'Late Night'].map((cat) => (
              <div key={cat} className="group cursor-pointer bg-background p-6 rounded-lg border hover:border-primary/50 hover:shadow-md transition-all">
                <h3 className="font-medium group-hover:text-primary transition-colors">{cat}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-foreground text-background py-12">
        <div className="container px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <h4 className="text-xl font-serif font-bold">WHERETOEAT.CH</h4>
            <p className="text-sm opacity-70">The premier restaurant booking platform for Switzerland.</p>
          </div>
          <div>
            <h5 className="font-bold mb-4">Discover</h5>
            <ul className="space-y-2 text-sm opacity-70">
              <li>Zurich</li>
              <li>Geneva</li>
              <li>Basel</li>
              <li>Zermatt</li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold mb-4">Company</h5>
            <ul className="space-y-2 text-sm opacity-70">
              <li>About Us</li>
              <li>For Restaurateurs</li>
              <li>Careers</li>
              <li>Contact</li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold mb-4">Legal</h5>
            <ul className="space-y-2 text-sm opacity-70">
              <li>Terms of Service</li>
              <li>Privacy Policy</li>
              <li>Cookie Policy</li>
            </ul>
          </div>
        </div>
        <div className="container px-4 mt-12 pt-8 border-t border-white/10 text-center text-sm opacity-50">
          © {new Date().getFullYear()} WHERETOEAT.CH. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
