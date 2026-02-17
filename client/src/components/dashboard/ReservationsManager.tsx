import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiUrl } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Search, Users, Clock, Phone, Mail, Plus, X, Filter, MessageSquare } from "lucide-react";
import { format, addDays, subDays, isToday, isSameDay, parseISO, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import type { Restaurant, Booking } from "@shared/schema";

interface ReservationsManagerProps {
  restaurants: Restaurant[];
  defaultRestaurantId?: number;
}

type FilterType = "all" | "upcoming" | "in_service";

export function ReservationsManager({ restaurants, defaultRestaurantId }: ReservationsManagerProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("upcoming");
  const [selectedRestaurant, setSelectedRestaurant] = useState<number | "all">(
    defaultRestaurantId && restaurants.some(r => r.id === defaultRestaurantId) 
      ? defaultRestaurantId 
      : "all"
  );

  const restaurantIds = restaurants.map(r => r.id);

  const { data: allBookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/all-bookings", restaurantIds],
    queryFn: async () => {
      const bookingsPromises = restaurantIds.map(id =>
        fetch(apiUrl(`/api/bookings/restaurant/${id}`), { credentials: "include" })
          .then(res => res.ok ? res.json() : [])
      );
      const results = await Promise.all(bookingsPromises);
      return results.flat();
    },
    enabled: restaurantIds.length > 0,
  });

  const filteredBookings = useMemo(() => {
    let bookings = [...allBookings];

    if (selectedRestaurant !== "all") {
      bookings = bookings.filter(b => b.restaurantId === selectedRestaurant);
    }

    const today = startOfDay(new Date());
    const selectedDayStart = startOfDay(selectedDate);

    bookings = bookings.filter(b => {
      const bookingDate = startOfDay(parseISO(b.date));
      return isSameDay(bookingDate, selectedDayStart);
    });

    if (activeFilter === "upcoming") {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      bookings = bookings.filter(b => {
        if (!isToday(parseISO(b.date))) return true;
        const [hour, minute] = b.time.split(":").map(Number);
        return hour > currentHour || (hour === currentHour && minute > currentMinute);
      });
    } else if (activeFilter === "in_service") {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      bookings = bookings.filter(b => {
        if (!isToday(parseISO(b.date))) return false;
        const [hour, minute] = b.time.split(":").map(Number);
        const bookingMinutes = hour * 60 + (minute || 0);
        const serviceDuration = 120;
        return bookingMinutes <= currentMinutes && bookingMinutes + serviceDuration > currentMinutes;
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      bookings = bookings.filter(b =>
        b.firstName.toLowerCase().includes(query) ||
        b.lastName.toLowerCase().includes(query) ||
        b.email.toLowerCase().includes(query) ||
        b.phone.includes(query)
      );
    }

    bookings.sort((a, b) => {
      const timeA = a.time.replace(":", "");
      const timeB = b.time.replace(":", "");
      return timeA.localeCompare(timeB);
    });

    return bookings;
  }, [allBookings, selectedDate, activeFilter, searchQuery, selectedRestaurant]);

  const totalGuests = filteredBookings.reduce((sum, b) => sum + b.guests, 0);

  const getRestaurantName = (restaurantId: number) => {
    const restaurant = restaurants.find(r => r.id === restaurantId);
    return restaurant?.name || "Restaurant";
  };

  return (
    <div className="space-y-6">
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarIcon className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-semibold">Une seule vue pour toutes vos réservations</h3>
                <p className="text-sm text-muted-foreground">
                  Que vos réservations aient été faites par téléphone, par e-mail ou en ligne, rassemblez-les toutes dans une même liste.
                </p>
              </div>
            </div>
            <Button className="bg-primary hover:bg-primary/90" data-testid="button-add-booking">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une réservation
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedDate(d => subDays(d, 1))}
            data-testid="button-prev-day"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="min-w-[180px] justify-center gap-2"
            onClick={() => setSelectedDate(new Date())}
            data-testid="button-current-date"
          >
            <CalendarIcon className="h-4 w-4" />
            {isToday(selectedDate) ? "Aujourd'hui" : format(selectedDate, "EEEE d MMMM", { locale: fr })}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedDate(d => addDays(d, 1))}
            data-testid="button-next-day"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setSelectedDate(new Date())}
          >
            Maintenant
          </Button>
        </div>

        {restaurants.length > 1 && (
          <select
            value={selectedRestaurant}
            onChange={(e) => setSelectedRestaurant(e.target.value === "all" ? "all" : parseInt(e.target.value))}
            className="border rounded-md px-3 py-2 text-sm bg-background"
            data-testid="select-restaurant"
          >
            <option value="all">Tous les restaurants</option>
            {restaurants.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un nom, un numéro de téléphone, une adresse e-mail..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-search"
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={activeFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveFilter("all")}
          data-testid="filter-all"
        >
          Actifs (tous)
        </Button>
        <Button
          variant={activeFilter === "in_service" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveFilter("in_service")}
          data-testid="filter-in-service"
        >
          En cours de service
        </Button>
        <Button
          variant={activeFilter === "upcoming" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveFilter("upcoming")}
          data-testid="filter-upcoming"
        >
          À venir
        </Button>
        {(searchQuery || activeFilter !== "upcoming") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setActiveFilter("upcoming");
            }}
            className="text-primary"
            data-testid="button-clear-filters"
          >
            <X className="h-4 w-4 mr-1" />
            Supprimer les filtres
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground border-b pb-2">
        <span>
          Résultats : <strong className="text-foreground">{filteredBookings.length} réservation{filteredBookings.length !== 1 ? "s" : ""}</strong> ({totalGuests} personne{totalGuests !== 1 ? "s" : ""})
        </span>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Heure
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">Chargement des réservations...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="py-12 text-center">
          <div className="w-32 h-32 mx-auto mb-4 bg-muted/30 rounded-lg flex items-center justify-center">
            <CalendarIcon className="h-16 w-16 text-muted-foreground/50" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Aucune réservation trouvée</h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery ? "Aucune réservation ne correspond à votre recherche." : `Aucune réservation pour le ${format(selectedDate, "d MMMM yyyy", { locale: fr })}.`}
          </p>
          <div className="flex justify-center gap-3">
            {searchQuery && (
              <Button variant="outline" onClick={() => setSearchQuery("")}>
                Supprimer les filtres
              </Button>
            )}
            <Button variant="outline" onClick={() => setActiveFilter("all")}>
              Modifier les filtres
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((booking) => (
            <Card key={booking.id} className="hover:shadow-md transition-shadow" data-testid={`booking-card-${booking.id}`}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 min-w-[80px]">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-lg">{booking.time}</span>
                    </div>
                    <div className="flex items-center gap-2 min-w-[80px]">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{booking.guests} pers.</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">{booking.firstName} {booking.lastName}</span>
                      {restaurants.length > 1 && (
                        <Badge variant="secondary" className="w-fit text-xs mt-1">
                          {getRestaurantName(booking.restaurantId)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {booking.phone}
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {booking.email}
                      </div>
                    </div>
                    {booking.specialRequest && (
                      <div className="flex items-center gap-1 text-xs">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>{booking.specialRequest}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
