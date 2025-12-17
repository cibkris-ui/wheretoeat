import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Users, 
  Phone, 
  Mail, 
  Plus,
  TrendingUp,
  CalendarDays,
  UserCheck,
  BarChart3,
  LayoutGrid,
  Settings,
  Store,
  FileText,
  LogOut,
  LayoutDashboard,
  ClipboardList,
  LineChart,
  UserCircle,
  Utensils,
  Check,
  Sun,
  Moon,
  X,
  AlertCircle,
  Bell
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, addDays, subDays, isToday, isSameDay, parseISO, startOfDay, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from "date-fns";
import { fr } from "date-fns/locale";
import type { Restaurant, Booking } from "@shared/schema";

type FilterType = "all" | "upcoming" | "in_service";

export default function Dashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [selectedRestaurant, setSelectedRestaurant] = useState<number | "all">("all");
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeSection, setActiveSection] = useState<"reservations" | "restaurants" | "stats" | "settings">("reservations");
  const [serviceFilter, setServiceFilter] = useState<"all" | "lunch" | "dinner">("all");

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

  // Sélectionner le premier restaurant par défaut
  useEffect(() => {
    if (!isInitialized && myRestaurants.length > 0) {
      setSelectedRestaurant(myRestaurants[0].id);
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

  const markArrivalMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      const res = await fetch(`/api/bookings/${bookingId}/arrival`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur lors de l'enregistrement");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/all-bookings"] });
      toast({ title: "Arrivée enregistrée", description: "L'heure d'arrivée a été enregistrée." });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible d'enregistrer l'arrivée.", variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: number; status: string }) => {
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Erreur lors de la mise à jour");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/all-bookings"] });
      const statusLabels: Record<string, string> = {
        cancelled: "Annulée",
        noshow: "No Show",
        confirmed: "Confirmée",
      };
      toast({ 
        title: "Statut mis à jour", 
        description: `La réservation a été marquée comme "${statusLabels[variables.status]}".`
      });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de mettre à jour le statut.", variant: "destructive" });
    },
  });

  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    const todayBookings = allBookings.filter(b => isSameDay(parseISO(b.date), today));
    const totalGuests = todayBookings.reduce((sum, b) => sum + b.guests, 0);
    const upcomingBookings = allBookings.filter(b => parseISO(b.date) >= today);
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const monthBookings = allBookings.filter(b => {
      const d = parseISO(b.date);
      return d >= monthStart && d <= monthEnd;
    });

    return {
      todayCount: todayBookings.length,
      todayGuests: totalGuests,
      upcomingCount: upcomingBookings.length,
      monthCount: monthBookings.length,
    };
  }, [allBookings]);

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

    if (activeFilter === "upcoming") {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      bookings = bookings.filter(b => {
        if (b.arrivalTime || b.status === "cancelled" || b.status === "noshow") return true;
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

    if (serviceFilter === "lunch") {
      bookings = bookings.filter(b => {
        const hour = parseInt(b.time.split(":")[0]) || 0;
        return hour >= 11 && hour < 15;
      });
    } else if (serviceFilter === "dinner") {
      bookings = bookings.filter(b => {
        const hour = parseInt(b.time.split(":")[0]) || 0;
        return hour >= 18 && hour <= 23;
      });
    }

    return bookings.sort((a, b) => {
      const parseTime = (t: string) => {
        const parts = t.split(":");
        return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
      };
      return parseTime(a.time) - parseTime(b.time);
    });
  }, [allBookings, selectedRestaurant, selectedDate, activeFilter, searchQuery, serviceFilter]);

  const getRestaurantName = (restaurantId: number) => {
    const restaurant = myRestaurants.find(r => r.id === restaurantId);
    return restaurant?.name || "Restaurant";
  };

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

  const selectedRestaurantName = selectedRestaurant === "all" 
    ? "Tous les restaurants" 
    : myRestaurants.find(r => r.id === selectedRestaurant)?.name || "Restaurant";

  const sidebarItems = [
    { id: "reservations" as const, icon: LayoutDashboard, label: "Réservations", link: null },
    { id: "calendar" as const, icon: CalendarDays, label: "Calendrier", link: "/dashboard/calendrier" },
    { id: "notifications" as const, icon: Bell, label: "Notifications", link: "/dashboard/notifications" },
    { id: "clients" as const, icon: Users, label: "Clients", link: "/dashboard/clients" },
    { id: "stats" as const, icon: LineChart, label: "Statistiques", link: "/dashboard/statistiques" },
    { id: "settings" as const, icon: Settings, label: "Paramètres", link: null },
  ];

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar */}
        <aside className="w-16 bg-white border-r flex flex-col items-center py-4 gap-2 fixed h-full z-40">
          <div className="mb-4">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <LayoutGrid className="h-5 w-5 text-white" />
            </div>
          </div>
          
          {sidebarItems.map(item => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                {item.link ? (
                  <Link href={item.link}>
                    <button
                      className="w-12 h-12 rounded-lg flex items-center justify-center transition-colors text-gray-500 hover:bg-gray-100"
                      data-testid={`sidebar-${item.id}`}
                    >
                      <item.icon className="h-5 w-5" />
                    </button>
                  </Link>
                ) : (
                  <button
                    onClick={() => setActiveSection(item.id as any)}
                    className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
                      activeSection === item.id 
                        ? "bg-primary/10 text-primary" 
                        : "text-gray-500 hover:bg-gray-100"
                    }`}
                    data-testid={`sidebar-${item.id}`}
                  >
                    <item.icon className="h-5 w-5" />
                  </button>
                )}
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{item.label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
          
          <div className="mt-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href="/api/logout"
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
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
          {/* Custom header with restaurant selector */}
          <div className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between">
              <Link href="/" className="flex items-center gap-2 font-serif text-xl font-bold tracking-tight hover:opacity-90 transition-opacity cursor-pointer">
                <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary text-primary-foreground">
                  <Utensils className="h-5 w-5" />
                </div>
                <span>WHERE<span className="text-primary mx-0.5">TO</span>EAT.CH</span>
              </Link>
              
              <div className="flex items-center gap-3">
                {/* Restaurant selector dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2" data-testid="restaurant-selector">
                      <Store className="h-4 w-4" />
                      <span className="max-w-[200px] truncate">{selectedRestaurantName}</span>
                      <ChevronRight className="h-4 w-4 rotate-90" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Mes restaurants</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {myRestaurants.map(r => (
                      <DropdownMenuItem 
                        key={r.id}
                        onClick={() => setSelectedRestaurant(r.id)}
                        className={selectedRestaurant === r.id ? "bg-primary/10" : ""}
                        data-testid={`dropdown-restaurant-${r.id}`}
                      >
                        <Utensils className="mr-2 h-4 w-4" />
                        {r.name}
                        {selectedRestaurant === r.id && (
                          <span className="ml-auto text-primary">✓</span>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* User avatar */}
                {user && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-9 w-9 rounded-full" data-testid="user-menu">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                          <UserCircle className="h-5 w-5 text-primary" />
                        </div>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <div className="flex items-center gap-2 p-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <UserCircle className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{user.firstName} {user.lastName}</span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <a href="/api/logout" className="cursor-pointer text-red-600">
                          <LogOut className="mr-2 h-4 w-4" />
                          Déconnexion
                        </a>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>
          
          <div className="container py-6">

            {activeSection === "reservations" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <CalendarDays className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.todayCount}</p>
                  <p className="text-sm text-muted-foreground">Réservations aujourd'hui</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserCheck className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.todayGuests}</p>
                  <p className="text-sm text-muted-foreground">Couverts aujourd'hui</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.upcomingCount}</p>
                  <p className="text-sm text-muted-foreground">Réservations à venir</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.monthCount}</p>
                  <p className="text-sm text-muted-foreground">Ce mois-ci</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                  data-testid="btn-prev-day"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg min-w-[200px] justify-center">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {isToday(selectedDate) 
                      ? "Aujourd'hui" 
                      : format(selectedDate, "EEEE d MMMM", { locale: fr })}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                  data-testid="btn-next-day"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                {!isToday(selectedDate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDate(new Date())}
                    className="text-primary"
                  >
                    Maintenant
                  </Button>
                )}
                <div className="flex items-center gap-1 ml-4 border-l pl-4">
                  <Button
                    variant={serviceFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setServiceFilter("all")}
                    data-testid="btn-filter-all"
                  >
                    Tous
                  </Button>
                  <Button
                    variant={serviceFilter === "lunch" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setServiceFilter("lunch")}
                    data-testid="btn-filter-lunch"
                  >
                    <Sun className="h-4 w-4 mr-1" />
                    Lunch
                  </Button>
                  <Button
                    variant={serviceFilter === "dinner" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setServiceFilter("dinner")}
                    data-testid="btn-filter-dinner"
                  >
                    <Moon className="h-4 w-4 mr-1" />
                    Dîner
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  className="bg-primary" 
                  onClick={() => window.location.href = "/dashboard/nouvelle-reservation"}
                  data-testid="btn-add-booking"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une réservation
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-2 relative w-full md:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom, téléphone ou email..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 w-full md:w-[350px]"
                  data-testid="input-search-bookings"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={activeFilter === "in_service" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter(activeFilter === "in_service" ? "all" : "in_service")}
                  className={activeFilter === "in_service" ? "bg-green-600 hover:bg-green-700" : ""}
                  data-testid="filter-in-service"
                >
                  En cours de service
                </Button>
                <Button
                  variant={activeFilter === "upcoming" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter(activeFilter === "upcoming" ? "all" : "upcoming")}
                  className={activeFilter === "upcoming" ? "bg-primary" : ""}
                  data-testid="filter-upcoming"
                >
                  À venir
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="text-sm text-muted-foreground mb-4">
              Résultats : {filteredBookings.length} réservation{filteredBookings.length !== 1 ? "s" : ""} ({filteredBookings.reduce((sum, b) => sum + b.guests, 0)} personne{filteredBookings.reduce((sum, b) => sum + b.guests, 0) !== 1 ? "s" : ""})
            </div>

            {bookingsLoading ? (
              <div className="py-12 text-center text-muted-foreground">
                Chargement des réservations...
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="py-12 text-center">
                <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">Aucune réservation trouvée</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchQuery ? "Essayez de modifier votre recherche" : "Aucune réservation pour cette date"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBookings.map(booking => (
                  <div
                    key={booking.id}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    data-testid={`booking-row-${booking.id}`}
                  >
                    <div className="flex items-start md:items-center gap-4">
                      <div className="flex flex-col items-center justify-center bg-primary/10 rounded-lg p-3 min-w-[60px]">
                        <span className="text-lg font-bold text-primary">{booking.time}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-lg">{booking.firstName} {booking.lastName}</p>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {booking.guests} pers.
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            {booking.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            {booking.email}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-stretch gap-1 mt-2 md:mt-0">
                      {booking.status === "cancelled" ? (
                        <Badge variant="destructive">
                          <X className="h-3 w-3 mr-1" />
                          Annulée
                        </Badge>
                      ) : booking.status === "noshow" ? (
                        <Badge variant="secondary" className="bg-orange-500 text-white">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          No Show
                        </Badge>
                      ) : booking.arrivalTime ? (
                        <Badge variant="default" className="bg-green-600">
                          <Check className="h-3 w-3 mr-1" />
                          Arrivé à {booking.arrivalTime}
                        </Badge>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-green-600 text-green-600 hover:bg-green-50"
                            onClick={() => markArrivalMutation.mutate(booking.id)}
                            disabled={markArrivalMutation.isPending || updateStatusMutation.isPending}
                            data-testid={`btn-arrival-${booking.id}`}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Arrivé
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500 text-red-500 hover:bg-red-50"
                            onClick={() => updateStatusMutation.mutate({ bookingId: booking.id, status: "cancelled" })}
                            disabled={updateStatusMutation.isPending}
                            data-testid={`btn-cancel-${booking.id}`}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Annuler
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-orange-500 text-orange-500 hover:bg-orange-50"
                            onClick={() => updateStatusMutation.mutate({ bookingId: booking.id, status: "noshow" })}
                            disabled={updateStatusMutation.isPending}
                            data-testid={`btn-noshow-${booking.id}`}
                          >
                            <AlertCircle className="h-4 w-4 mr-1" />
                            No Show
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
                </Card>
              </>
            )}

            {activeSection === "restaurants" && (
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle>Mes restaurants</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {myRestaurants.map(r => (
                      <div key={r.id} className="flex items-center gap-4 p-4 border rounded-lg">
                        <img src={r.image} alt={r.name} className="w-16 h-16 rounded-lg object-cover" />
                        <div className="flex-1">
                          <h3 className="font-semibold">{r.name}</h3>
                          <p className="text-sm text-muted-foreground">{r.cuisine} - {r.location}</p>
                        </div>
                        <Badge variant="secondary">{r.priceRange}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === "stats" && (
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle>Statistiques</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-gray-50 rounded-lg text-center">
                      <p className="text-4xl font-bold text-primary">{stats.monthCount}</p>
                      <p className="text-muted-foreground mt-2">Réservations ce mois</p>
                    </div>
                    <div className="p-6 bg-gray-50 rounded-lg text-center">
                      <p className="text-4xl font-bold text-green-600">{stats.upcomingCount}</p>
                      <p className="text-muted-foreground mt-2">Réservations à venir</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === "settings" && (
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle>Paramètres</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Les paramètres seront disponibles prochainement.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
