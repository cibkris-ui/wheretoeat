import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Users, 
  Plus,
  BarChart3,
  LayoutGrid,
  Settings,
  Store,
  LogOut,
  Bell,
  Grid3X3,
  X,
  Clock,
  MoreHorizontal
} from "lucide-react";
import { format, addDays, addMonths, subDays, subMonths, isToday, isSameDay, parseISO, startOfDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, startOfWeek, endOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import type { Restaurant, Booking } from "@shared/schema";

type FilterType = "all" | "upcoming" | "in_service";
type ServiceType = "all" | "lunch" | "dinner";

export default function Dashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [selectedRestaurant, setSelectedRestaurant] = useState<number | "all">("all");
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeSection, setActiveSection] = useState<"reservations" | "calendar" | "search" | "stats" | "settings">("reservations");
  const [serviceFilter, setServiceFilter] = useState<ServiceType>("all");

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

  const { data: myRestaurants = [] } = useQuery<Restaurant[]>({
    queryKey: ["/api/my-restaurants"],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!isInitialized && myRestaurants.length > 0) {
      setSelectedRestaurant(myRestaurants.length === 1 ? myRestaurants[0].id : "all");
      setIsInitialized(true);
    }
  }, [myRestaurants, isInitialized]);

  const restaurantIds = myRestaurants.map(r => r.id);

  const { data: allBookings = [], isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/all-bookings", restaurantIds],
    queryFn: async () => {
      const bookingsPromises = restaurantIds.map(id =>
        fetch(`/api/restaurants/${id}/bookings`, { credentials: "include" })
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

    const selectedDayStart = startOfDay(selectedDate);
    bookings = bookings.filter(b => {
      const bookingDate = startOfDay(parseISO(b.date));
      return isSameDay(bookingDate, selectedDayStart);
    });

    // Filter by service
    if (serviceFilter === "lunch") {
      bookings = bookings.filter(b => {
        const hour = parseInt(b.time.split(":")[0]) || 0;
        return hour < 15;
      });
    } else if (serviceFilter === "dinner") {
      bookings = bookings.filter(b => {
        const hour = parseInt(b.time.split(":")[0]) || 0;
        return hour >= 18;
      });
    }

    if (activeFilter === "upcoming") {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      bookings = bookings.filter(b => {
        if (!isToday(parseISO(b.date))) return true;
        const timeParts = b.time.split(":");
        const hour = parseInt(timeParts[0]) || 0;
        const minute = parseInt(timeParts[1]) || 0;
        return hour > currentHour || (hour === currentHour && minute > currentMinute);
      });
    } else if (activeFilter === "in_service") {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      bookings = bookings.filter(b => {
        if (!isToday(parseISO(b.date))) return false;
        const timeParts = b.time.split(":");
        const hour = parseInt(timeParts[0]) || 0;
        const minute = parseInt(timeParts[1]) || 0;
        const bookingMinutes = hour * 60 + minute;
        const serviceDuration = 120;
        return bookingMinutes <= currentMinutes && bookingMinutes + serviceDuration > currentMinutes;
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      bookings = bookings.filter(b =>
        b.firstName.toLowerCase().includes(query) ||
        b.lastName.toLowerCase().includes(query) ||
        b.phone.includes(query) ||
        b.email.toLowerCase().includes(query)
      );
    }

    return bookings.sort((a, b) => {
      const parseTime = (t: string) => {
        const parts = t.split(":");
        return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
      };
      return parseTime(a.time) - parseTime(b.time);
    });
  }, [allBookings, selectedRestaurant, selectedDate, activeFilter, searchQuery, serviceFilter]);

  const totalGuests = filteredBookings.reduce((sum, b) => sum + b.guests, 0);

  const getRestaurantName = (restaurantId: number) => {
    const restaurant = myRestaurants.find(r => r.id === restaurantId);
    return restaurant?.name || "Restaurant";
  };

  // Calendar data for monthly view
  const calendarData = useMemo(() => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    
    return days.map(day => {
      const dayBookings = allBookings.filter(b => 
        selectedRestaurant === "all" ? true : b.restaurantId === selectedRestaurant
      ).filter(b => isSameDay(parseISO(b.date), day));
      
      const lunchBookings = dayBookings.filter(b => parseInt(b.time.split(":")[0]) < 15);
      const dinnerBookings = dayBookings.filter(b => parseInt(b.time.split(":")[0]) >= 18);
      
      const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
      
      return {
        date: day,
        lunchCount: lunchBookings.reduce((s, b) => s + b.guests, 0),
        dinnerCount: dinnerBookings.reduce((s, b) => s + b.guests, 0),
        isClosed: getDay(day) === 0, // Sunday closed
        isCurrentMonth,
      };
    });
  }, [selectedDate, allBookings, selectedRestaurant]);

  const sidebarItems = [
    { id: "reservations" as const, icon: CalendarIcon, label: "Réservations" },
    { id: "calendar" as const, icon: Grid3X3, label: "Calendrier" },
    { id: "search" as const, icon: Search, label: "Recherche" },
    { id: "stats" as const, icon: BarChart3, label: "Statistiques" },
    { id: "settings" as const, icon: Settings, label: "Paramètres" },
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-100 flex">
        {/* Sidebar */}
        <aside className="w-16 bg-[#00473e] flex flex-col items-center py-4 gap-2 fixed h-full z-40">
          <div className="mb-4">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <LayoutGrid className="h-5 w-5 text-white" />
            </div>
          </div>
          
          {sidebarItems.map(item => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setActiveSection(item.id)}
                  className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
                    activeSection === item.id 
                      ? "bg-white/20 text-white" 
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                  data-testid={`sidebar-${item.id}`}
                >
                  <item.icon className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{item.label}</p>
              </TooltipContent>
            </Tooltip>
          ))}

          <div className="mt-auto flex flex-col gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="w-12 h-12 rounded-lg flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Notifications</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href="/api/logout"
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-white/70 hover:bg-red-500/20 hover:text-white transition-colors"
                  data-testid="sidebar-logout"
                >
                  <LogOut className="h-5 w-5" />
                </a>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Déconnexion</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 ml-16">
          {activeSection === "reservations" && (
            <div className="min-h-screen">
              {/* Top bar */}
              <div className="bg-white border-b sticky top-0 z-30">
                <div className="flex items-center justify-between px-4 h-14">
                  <div className="flex items-center gap-2">
                    {myRestaurants.length === 1 && (
                      <span className="text-sm font-medium text-gray-700">{myRestaurants[0].name}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button variant="outline" className="min-w-[140px]">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {format(selectedDate, "EEE d MMM", { locale: fr })}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                    
                    {!isToday(selectedDate) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedDate(new Date())}
                        className="bg-[#00473e] text-white hover:bg-[#00473e]/90"
                      >
                        Maintenant
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Select value={serviceFilter} onValueChange={(v) => setServiceFilter(v as ServiceType)}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous services</SelectItem>
                        <SelectItem value="lunch">Lunch</SelectItem>
                        <SelectItem value="dinner">Dinner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    {myRestaurants.length > 1 && (
                      <Select 
                        value={selectedRestaurant === "all" ? "all" : selectedRestaurant.toString()} 
                        onValueChange={(v) => setSelectedRestaurant(v === "all" ? "all" : parseInt(v))}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Restaurant" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les restaurants</SelectItem>
                          {myRestaurants.map(r => (
                            <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </div>

              {/* Banner */}
              <div className="bg-[#e8f5f3] border-b px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#00473e]/10 rounded-lg flex items-center justify-center">
                      <CalendarIcon className="h-6 w-6 text-[#00473e]" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-800">Une seule vue pour toutes vos réservations</h2>
                      <p className="text-sm text-gray-600">Que vos réservations aient été faites par téléphone, par e-mail ou en ligne, rassemblez-les toutes dans une même liste gratuitement.</p>
                    </div>
                  </div>
                  <Button 
                    className="bg-[#00473e] hover:bg-[#00473e]/90"
                    onClick={() => window.location.href = "/dashboard/nouvelle-reservation"}
                    data-testid="btn-add-booking"
                  >
                    AJOUTER UNE RÉSERVATION
                  </Button>
                </div>
              </div>

              {/* Search and filters */}
              <div className="px-6 py-4 bg-white border-b">
                <div className="flex items-center gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Rechercher un nom, un numéro de téléphone, une adresse e-mail ou une table dans le service"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <Button
                    variant={activeFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveFilter("all")}
                    className={activeFilter === "all" ? "bg-[#00473e]" : ""}
                  >
                    Actifs (tous)
                  </Button>
                  <Button
                    variant={activeFilter === "in_service" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveFilter("in_service")}
                    className={activeFilter === "in_service" ? "bg-[#00473e]" : ""}
                  >
                    En cours de service
                  </Button>
                  <Button
                    variant={activeFilter === "upcoming" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveFilter("upcoming")}
                    className={activeFilter === "upcoming" ? "bg-[#00473e]" : ""}
                  >
                    À venir
                  </Button>
                  {(activeFilter !== "all" || searchQuery) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setActiveFilter("all"); setSearchQuery(""); }}
                      className="text-[#00473e]"
                    >
                      <X className="h-4 w-4 mr-1" />
                      SUPPRIMER LES FILTRES
                    </Button>
                  )}
                </div>
              </div>

              {/* Results */}
              <div className="p-6">
                <div className="text-sm text-gray-600 mb-4">
                  Résultats : {filteredBookings.length} réservation{filteredBookings.length !== 1 ? "s" : ""} ({totalGuests} personne{totalGuests !== 1 ? "s" : ""})
                </div>

                {bookingsLoading ? (
                  <div className="py-12 text-center text-gray-500">
                    Chargement des réservations...
                  </div>
                ) : filteredBookings.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="w-48 h-32 mx-auto mb-6 bg-gray-200 rounded-lg flex items-center justify-center">
                      <CalendarIcon className="h-12 w-12 text-gray-400" />
                    </div>
                    <p className="text-xl font-medium text-gray-600 mb-4">Aucune réservation trouvée</p>
                    <Button variant="outline" className="text-[#00473e] border-[#00473e]" onClick={() => { setActiveFilter("all"); setSearchQuery(""); }}>
                      SUPPRIMER LES FILTRES
                    </Button>
                    <Button variant="link" className="text-[#00473e] block mx-auto mt-2">
                      MODIFIER LES FILTRES
                    </Button>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Heure</th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Client</th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">État</th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Pers.</th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Réservation prise</th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Table</th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Note</th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-600"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBookings.map(booking => (
                          <tr key={booking.id} className="border-b hover:bg-gray-50" data-testid={`booking-row-${booking.id}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-[#00473e] rounded-full"></span>
                                <span className="font-medium">{booking.time.substring(0, 5)}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium">{booking.firstName} {booking.lastName.toUpperCase()}</p>
                                <p className="text-sm text-gray-500">{booking.phone} • {booking.email}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge className="bg-[#00473e]/10 text-[#00473e] hover:bg-[#00473e]/20">
                                Réservé
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-medium">{booking.guests}p</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {format(parseISO(booking.date), "d MMM yyyy", { locale: fr })}
                            </td>
                            <td className="px-4 py-3 text-gray-500">-</td>
                            <td className="px-4 py-3 text-gray-500">-</td>
                            <td className="px-4 py-3">
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === "calendar" && (
            <div className="p-6">
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => setSelectedDate(subMonths(selectedDate, 1))}>
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <h2 className="text-lg font-semibold capitalize">
                      {format(selectedDate, "MMMM yyyy", { locale: fr })}
                    </h2>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedDate(addMonths(selectedDate, 1))}>
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" /> Couverts : {allBookings.reduce((s, b) => s + b.guests, 0)}p
                    </span>
                    <span>Réservations : {allBookings.length}</span>
                  </div>
                </div>

                <div className="grid grid-cols-7 border-b">
                  {["Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam.", "Dim."].map(day => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-gray-600 border-r last:border-r-0">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7">
                  {calendarData.map((day, i) => (
                    <div
                      key={i}
                      className={`min-h-[100px] p-2 border-r border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                        day.isClosed ? "bg-gray-100" : "bg-white"
                      } ${isToday(day.date) ? "ring-2 ring-[#00473e] ring-inset" : ""} ${
                        !day.isCurrentMonth ? "opacity-40" : ""
                      }`}
                      onClick={() => { setSelectedDate(day.date); setActiveSection("reservations"); }}
                    >
                      <div className={`text-sm font-medium mb-2 ${isToday(day.date) ? "text-[#00473e]" : ""}`}>
                        {format(day.date, "d")}
                      </div>
                      {day.isClosed ? (
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <span>Fermé</span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {(day.lunchCount > 0 || day.isCurrentMonth) && (
                            <div className="flex items-center gap-1 text-xs text-gray-600 bg-[#e8f5f3] rounded px-1 py-0.5">
                              <span>Lunch</span>
                              <span className="ml-auto">{day.lunchCount}p</span>
                            </div>
                          )}
                          {(day.dinnerCount > 0 || day.isCurrentMonth) && (
                            <div className="flex items-center gap-1 text-xs text-gray-600 bg-[#e8f5f3] rounded px-1 py-0.5">
                              <span>Dinner</span>
                              <span className="ml-auto">{day.dinnerCount}p</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === "search" && (
            <div className="p-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recherche clients et réservations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      placeholder="Rechercher par nom du client, numéro de téléphone, e-mail..."
                      className="pl-12 py-6 text-lg"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <p className="text-center text-gray-500">Entrez un terme de recherche pour trouver des clients ou réservations</p>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === "stats" && (
            <div className="p-6">
              <h1 className="text-2xl font-semibold mb-6">Statistiques - Vue d'ensemble</h1>
              <div className="grid grid-cols-3 gap-6 mb-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Couverts</h3>
                    <p className="text-4xl font-bold">{allBookings.reduce((s, b) => s + b.guests, 0)}</p>
                    <p className="text-sm text-gray-500 mt-1">{allBookings.length} réservations</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Annulations tardives</h3>
                    <p className="text-4xl font-bold text-yellow-600">0</p>
                    <p className="text-sm text-gray-500 mt-1">0 % du nombre total</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">No-shows</h3>
                    <p className="text-4xl font-bold text-red-600">0</p>
                    <p className="text-sm text-gray-500 mt-1">0 % du nombre total</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeSection === "settings" && (
            <div className="p-6">
              <h1 className="text-2xl font-semibold mb-6">Paramètres</h1>
              <div className="grid grid-cols-4 gap-6">
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <Store className="h-8 w-8 text-[#00473e] mb-3" />
                    <h3 className="font-semibold">Profil du restaurant</h3>
                    <p className="text-sm text-gray-500 mt-1">Contacts, photos, informations</p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <Clock className="h-8 w-8 text-[#00473e] mb-3" />
                    <h3 className="font-semibold">Services</h3>
                    <p className="text-sm text-gray-500 mt-1">Horaires, capacités, créneaux</p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <Users className="h-8 w-8 text-[#00473e] mb-3" />
                    <h3 className="font-semibold">Utilisateurs</h3>
                    <p className="text-sm text-gray-500 mt-1">Gestion des utilisateurs</p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <CalendarIcon className="h-8 w-8 text-[#00473e] mb-3" />
                    <h3 className="font-semibold">Module de réservation</h3>
                    <p className="text-sm text-gray-500 mt-1">Paramètres, landing page</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
