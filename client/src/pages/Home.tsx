import { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { RestaurantCard } from "@/components/RestaurantCard";
import { Search, MapPin, Calendar, Clock, Users, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
const heroImage = "/resto3.jpg";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { fetchRestaurants } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { Restaurant } from "@shared/schema";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const TIME_OPTIONS = [
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"
];

const GUEST_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const generateDateOptions = () => {
  const dates: Date[] = [];
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date);
  }
  return dates;
};

const DATE_OPTIONS = generateDateOptions();

export default function Home() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState("20:00");
  const [selectedGuests, setSelectedGuests] = useState(2);
  const [dateOpen, setDateOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [guestsOpen, setGuestsOpen] = useState(false);
  
  const { data: myRestaurants = [] } = useQuery<Restaurant[]>({
    queryKey: ["/api/my-restaurants"],
    enabled: isAuthenticated,
  });

  const { data: restaurants, isLoading, error } = useQuery({
    queryKey: ["restaurants"],
    queryFn: fetchRestaurants,
  });

  const filteredRestaurants = useMemo(() => {
    if (!restaurants || !hasSearched || searchQuery.trim() === "") {
      return restaurants || [];
    }
    const query = searchQuery.toLowerCase().trim();
    return restaurants.filter((r: Restaurant) => 
      r.name.toLowerCase().includes(query) ||
      r.cuisine.toLowerCase().includes(query) ||
      r.location.toLowerCase().includes(query)
    );
  }, [restaurants, searchQuery, hasSearched]);

  const handleSearch = () => {
    setHasSearched(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated && myRestaurants.length > 0) {
      setLocation("/dashboard");
    }
  }, [authLoading, isAuthenticated, myRestaurants, setLocation]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative h-[500px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImage} 
            alt="Dining Atmosphere" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50" />
        </div>
        
        <div className="relative z-10 container text-center text-white space-y-6 px-4">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight animate-in fade-in slide-in-from-bottom-4 duration-700">
            Réservez les meilleurs tables de Suisse
          </h1>
          
          {/* TheFork Style Search Bar */}
          <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 mt-8">
            <div className="flex flex-col md:flex-row items-center p-2 gap-2 md:gap-0">
              
              {/* Location Input */}
              <div className="flex items-center flex-grow w-full md:w-auto px-4 h-12 md:border-r border-gray-200">
                <Search className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                <Input 
                  className="border-0 shadow-none focus-visible:ring-0 text-gray-800 placeholder:text-gray-500 h-full p-0 text-base" 
                  placeholder="Restaurant, cuisine ou adresse"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyPress}
                  data-testid="input-search-restaurant"
                />
              </div>

              {/* Date/Time/People Selectors */}
              <div className="hidden md:flex items-center gap-2 px-4 h-12 md:border-r border-gray-200 min-w-fit">
                 {/* Date Selector */}
                 <Popover open={dateOpen} onOpenChange={setDateOpen}>
                   <PopoverTrigger asChild>
                     <button 
                       className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
                       data-testid="button-date-selector"
                     >
                       <Calendar className="h-5 w-5 text-gray-400" />
                       <span className="text-gray-700 font-medium">
                         {format(selectedDate, "d MMM", { locale: fr })}
                       </span>
                       <ChevronDown className="h-4 w-4 text-gray-400" />
                     </button>
                   </PopoverTrigger>
                   <PopoverContent className="w-40 p-2" align="start">
                     <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                       {DATE_OPTIONS.map((date, index) => (
                         <button
                           key={index}
                           className={`px-3 py-2 text-sm rounded-md transition-colors text-center ${
                             selectedDate.toDateString() === date.toDateString()
                               ? "bg-primary text-white" 
                               : "hover:bg-gray-100 text-gray-700"
                           }`}
                           onClick={() => {
                             setSelectedDate(date);
                             setDateOpen(false);
                           }}
                         >
                           {format(date, "EEE d MMM", { locale: fr })}
                         </button>
                       ))}
                     </div>
                   </PopoverContent>
                 </Popover>

                 <Separator orientation="vertical" className="h-6" />
                 
                 {/* Time Selector */}
                 <Popover open={timeOpen} onOpenChange={setTimeOpen}>
                   <PopoverTrigger asChild>
                     <button 
                       className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
                       data-testid="button-time-selector"
                     >
                       <Clock className="h-5 w-5 text-gray-400" />
                       <span className="text-gray-700 font-medium">{selectedTime}</span>
                       <ChevronDown className="h-4 w-4 text-gray-400" />
                     </button>
                   </PopoverTrigger>
                   <PopoverContent className="w-32 p-2" align="start">
                     <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                       {TIME_OPTIONS.map((time) => (
                         <button
                           key={time}
                           className={`px-3 py-2 text-sm rounded-md transition-colors text-center ${
                             selectedTime === time 
                               ? "bg-primary text-white" 
                               : "hover:bg-gray-100 text-gray-700"
                           }`}
                           onClick={() => {
                             setSelectedTime(time);
                             setTimeOpen(false);
                           }}
                         >
                           {time}
                         </button>
                       ))}
                     </div>
                   </PopoverContent>
                 </Popover>

                 <Separator orientation="vertical" className="h-6" />
                 
                 {/* Guests Selector */}
                 <Popover open={guestsOpen} onOpenChange={setGuestsOpen}>
                   <PopoverTrigger asChild>
                     <button 
                       className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
                       data-testid="button-guests-selector"
                     >
                       <Users className="h-5 w-5 text-gray-400" />
                       <span className="text-gray-700 font-medium">{selectedGuests} pers.</span>
                       <ChevronDown className="h-4 w-4 text-gray-400" />
                     </button>
                   </PopoverTrigger>
                   <PopoverContent className="w-32 p-2" align="start">
                     <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                       {GUEST_OPTIONS.map((num) => (
                         <button
                           key={num}
                           className={`px-3 py-2 text-sm rounded-md transition-colors text-center ${
                             selectedGuests === num 
                               ? "bg-primary text-white" 
                               : "hover:bg-gray-100 text-gray-700"
                           }`}
                           onClick={() => {
                             setSelectedGuests(num);
                             setGuestsOpen(false);
                           }}
                         >
                           {num} pers.
                         </button>
                       ))}
                     </div>
                   </PopoverContent>
                 </Popover>
              </div>

              <div className="w-full md:w-auto p-1">
                <Button 
                  size="lg" 
                  className="w-full md:w-auto h-12 px-8 text-base font-bold bg-primary hover:bg-primary/90 border-0 rounded-md shadow-sm"
                  onClick={handleSearch}
                  data-testid="button-search-restaurant"
                >
                  Rechercher
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Restaurants */}
      <section className="py-16 container px-4 bg-gray-50/50">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-2xl font-bold mb-2 text-gray-900">Populaire en Suisse</h2>
            <p className="text-muted-foreground">Les restaurants les plus réservés cette semaine</p>
          </div>
          <Button variant="link" className="text-primary font-bold">Voir tout</Button>
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
        
        {restaurants && (
          <>
            {hasSearched && searchQuery.trim() !== "" && (
              <div className="mb-4">
                <p className="text-gray-600">
                  {filteredRestaurants.length} résultat{filteredRestaurants.length !== 1 ? 's' : ''} pour "{searchQuery}"
                  {filteredRestaurants.length === 0 && (
                    <Button 
                      variant="link" 
                      className="text-primary ml-2 p-0 h-auto"
                      onClick={() => { setSearchQuery(""); setHasSearched(false); }}
                    >
                      Voir tous les restaurants
                    </Button>
                  )}
                </p>
              </div>
            )}
            {filteredRestaurants.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredRestaurants.map((restaurant: Restaurant) => (
                  <RestaurantCard key={restaurant.id} restaurant={restaurant} />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* Categories / Banner */}
      <section className="bg-white py-16">
        <div className="container px-4">
          <h2 className="text-2xl font-bold mb-8 text-gray-900">Inspiration pour votre prochain repas</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {['Italien', 'Français', 'Suisse', 'Japonais', 'Chinois', 'Indien', 'Burgers', 'Pizza', 'Sushi', 'Végétalien', 'Brunch', 'Romantique'].map((cat) => (
              <div 
                key={cat} 
                className="group cursor-pointer bg-white p-4 rounded-lg border border-gray-200 hover:border-primary hover:shadow-md transition-all text-center"
                onClick={() => {
                  setSearchQuery(cat);
                  setHasSearched(true);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                data-testid={`category-${cat.toLowerCase()}`}
              >
                <h3 className="font-medium text-sm text-gray-700 group-hover:text-primary transition-colors">{cat}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-white border-t py-12 text-gray-600">
        <div className="container px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <h4 className="text-xl font-bold">WHERE<span className="text-primary mx-0.5">TO</span>EAT.CH</h4>
            <p className="text-sm">Découvrez et réservez les meilleurs restaurants.</p>
          </div>
          <div>
            <h5 className="font-bold mb-4 text-gray-900">Découvrir</h5>
            <ul className="space-y-2 text-sm">
              <li className="hover:text-primary cursor-pointer">Zurich</li>
              <li className="hover:text-primary cursor-pointer">Genève</li>
              <li className="hover:text-primary cursor-pointer">Bâle</li>
              <li className="hover:text-primary cursor-pointer">Crans-Montana</li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold mb-4 text-gray-900">Plus</h5>
            <ul className="space-y-2 text-sm">
              <li className="hover:text-primary cursor-pointer">À propos</li>
              <li className="hover:text-primary cursor-pointer">Restaurateurs</li>
              <li className="hover:text-primary cursor-pointer">Blog</li>
              <li className="hover:text-primary cursor-pointer">Contact</li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold mb-4 text-gray-900">Télécharger l'App</h5>
            <div className="flex gap-2">
               <div className="h-10 w-32 bg-gray-900 rounded-md flex items-center justify-center text-white text-xs font-bold cursor-pointer">App Store</div>
               <div className="h-10 w-32 bg-gray-900 rounded-md flex items-center justify-center text-white text-xs font-bold cursor-pointer">Google Play</div>
            </div>
          </div>
        </div>
        <div className="container px-4 mt-12 pt-8 border-t text-center text-sm text-gray-400">
          © {new Date().getFullYear()} WHERETOEAT.CH. Tous droits réservés.
        </div>
      </footer>
    </div>
  );
}
