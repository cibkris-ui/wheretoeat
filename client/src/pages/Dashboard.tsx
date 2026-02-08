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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Bell,
  Grid3X3,
  Clock
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, addDays, subDays, isToday, isSameDay, parseISO, startOfDay, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from "date-fns";
import { fr } from "date-fns/locale";
import type { Restaurant, Booking } from "@shared/schema";
import { apiUrl } from "@/lib/queryClient";

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
  const [billAmountDialog, setBillAmountDialog] = useState<{ bookingId: number; isOpen: boolean } | null>(null);
  const [billAmountInput, setBillAmountInput] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Connexion requise",
        description: "Vous devez être connecté pour accéder au tableau de bord.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
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
        fetch(apiUrl(`/api/bookings/restaurant/${id}`), { credentials: "include" })
          .then(res => res.ok ? res.json() : [])
      );
      const results = await Promise.all(bookingsPromises);
      return results.flat();
    },
    enabled: restaurantIds.length > 0,
  });

  const markArrivalMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      const res = await fetch(apiUrl(`/api/bookings/${bookingId}/arrival`), {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur lors de l'enregistrement");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/all-bookings"] });
      restaurantIds.forEach(id => {
        queryClient.invalidateQueries({ queryKey: [`/api/bookings/restaurant/${id}`] });
      });
      toast({ title: "Arrivée enregistrée", description: "L'heure d'arrivée a été enregistrée." });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible d'enregistrer l'arrivée.", variant: "destructive" });
    },
  });

  const markBillRequestedMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      const res = await fetch(apiUrl(`/api/bookings/${bookingId}/bill-requested`), {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur lors de l'enregistrement");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/all-bookings"] });
      restaurantIds.forEach(id => {
        queryClient.invalidateQueries({ queryKey: [`/api/bookings/restaurant/${id}`] });
      });
      toast({ title: "Note demandée", description: "La demande de note a été enregistrée." });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible d'enregistrer la demande.", variant: "destructive" });
    },
  });

  const markDepartureMutation = useMutation({
    mutationFn: async ({ bookingId, billAmount }: { bookingId: number; billAmount?: number }) => {
      const body = billAmount !== undefined ? JSON.stringify({ billAmount }) : undefined;
      const headers: Record<string, string> = {};
      if (body) headers["Content-Type"] = "application/json";
      const res = await fetch(apiUrl(`/api/bookings/${bookingId}/departure`), {
        method: "PATCH",
        credentials: "include",
        headers,
        body,
      });
      if (!res.ok) throw new Error("Erreur lors de l'enregistrement");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/all-bookings"] });
      restaurantIds.forEach(id => {
        queryClient.invalidateQueries({ queryKey: [`/api/bookings/restaurant/${id}`] });
      });
      setBillAmountDialog(null);
      setBillAmountInput("");
      toast({ title: "Client parti", description: "Le départ du client a été enregistré." });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible d'enregistrer le départ.", variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: number; status: string }) => {
      const res = await fetch(apiUrl(`/api/bookings/${bookingId}/status`), {
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
      queryClient.invalidateQueries({ queryKey: ["/api/all-bookings-notifications"] });
      restaurantIds.forEach(id => {
        queryClient.invalidateQueries({ queryKey: [`/api/bookings/restaurant/${id}`] });
      });
      const statusLabels: Record<string, string> = {
        pending: "En attente de validation",
        cancelled: "Annulée",
        noshow: "No Show",
        confirmed: "Confirmée",
        waiting: "Liste d'attente",
        refused: "Refusée",
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

  const handleDepartureClick = (booking: Booking) => {
    const restaurant = myRestaurants.find(r => r.id === booking.restaurantId);
    if (restaurant?.askBillAmount) {
      setBillAmountDialog({ bookingId: booking.id, isOpen: true });
      setBillAmountInput("");
    } else {
      markDepartureMutation.mutate({ bookingId: booking.id });
    }
  };

  const handleBillAmountSubmit = () => {
    if (!billAmountDialog) return;
    let amount: number | undefined = undefined;
    if (billAmountInput) {
      const parsed = parseFloat(billAmountInput);
      if (!isNaN(parsed) && parsed >= 0 && isFinite(parsed)) {
        amount = parsed;
      }
    }
    markDepartureMutation.mutate({ bookingId: billAmountDialog.bookingId, billAmount: amount });
  };

  const handleSkipBillAmount = () => {
    if (!billAmountDialog) return;
    markDepartureMutation.mutate({ bookingId: billAmountDialog.bookingId });
  };

  const stats = useMemo(() => {
    const selectedDayStart = startOfDay(selectedDate);
    const today = startOfDay(new Date());
    
    // Filter bookings by selectedRestaurant first
    let relevantBookings = allBookings;
    if (selectedRestaurant !== "all") {
      relevantBookings = allBookings.filter(b => b.restaurantId === selectedRestaurant);
    }
    
    const selectedDateBookings = relevantBookings.filter(b => isSameDay(parseISO(b.date), selectedDayStart) && b.status !== "cancelled" && b.status !== "noshow" && b.status !== "refused");
    
    // Réservations confirmées (exclut les en attente)
    const confirmedBookings = selectedDateBookings.filter(b => b.status !== "waiting" && b.status !== "pending");
    const confirmedGuests = confirmedBookings.reduce((sum, b) => sum + b.guests, 0);
    
    // Réservations en attente
    const waitingBookings = selectedDateBookings.filter(b => b.status === "waiting");
    const waitingGuests = waitingBookings.reduce((sum, b) => sum + b.guests, 0);
    
    const upcomingBookings = relevantBookings.filter(b => 
      parseISO(b.date) >= today && 
      !b.arrivalTime && 
      b.status === "confirmed"
    );
    
    // Calcul des places disponibles (exclut les clients partis et les en attente)
    const activeBookings = confirmedBookings.filter(b => !b.departureTime);
    const occupiedPlaces = activeBookings.reduce((sum, b) => sum + b.guests, 0);
    const totalCapacity = selectedRestaurant === "all" 
      ? myRestaurants.reduce((sum, r) => sum + (r.capacity || 40), 0)
      : myRestaurants.find(r => r.id === selectedRestaurant)?.capacity || 40;
    const availablePlaces = Math.max(0, totalCapacity - occupiedPlaces);

    // Count pending bookings from public platform (notifications)
    const pendingNotifications = allBookings.filter(b => 
      b.status === "pending" && 
      !b.clientIp?.startsWith("owner-")
    ).length;
    
    // Update localStorage for cross-page sync
    localStorage.setItem("pendingNotificationsCount", String(pendingNotifications));

    return {
      selectedDateCount: confirmedBookings.length,
      selectedDateGuests: confirmedGuests,
      waitingCount: waitingBookings.length,
      waitingGuests: waitingGuests,
      upcomingCount: upcomingBookings.length,
      availablePlaces: availablePlaces,
      pendingNotifications: pendingNotifications,
    };
  }, [allBookings, myRestaurants, selectedRestaurant, selectedDate]);

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
      // Finished reservations (client departed) go to the bottom
      const aFinished = !!a.departureTime || a.status === "cancelled" || a.status === "noshow";
      const bFinished = !!b.departureTime || b.status === "cancelled" || b.status === "noshow";
      if (aFinished && !bFinished) return 1;
      if (bFinished && !aFinished) return -1;
      
      // Pending bookings come first among active reservations
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (b.status === "pending" && a.status !== "pending") return 1;
      
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
    { id: "attribution" as const, icon: Grid3X3, label: "Attribution", link: "/dashboard/attribution" },
    { id: "calendar" as const, icon: CalendarDays, label: "Calendrier", link: "/dashboard/calendrier" },
    { id: "notifications" as const, icon: Bell, label: "Notifications", link: "/dashboard/notifications" },
    { id: "clients" as const, icon: Users, label: "Clients", link: "/dashboard/clients" },
    { id: "stats" as const, icon: LineChart, label: "Statistiques", link: "/dashboard/statistiques" },
    { id: "settings" as const, icon: Settings, label: "Paramètres", link: "/dashboard/parametres" },
  ];

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="sticky top-0 z-50 w-full border-b bg-white">
          <div className="flex h-16 items-center justify-between px-6">
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
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/inscrire-restaurant" className="cursor-pointer text-primary" data-testid="link-add-restaurant-dashboard">
                        <Plus className="mr-2 h-4 w-4" />
                        Ajouter un restaurant
                      </Link>
                    </DropdownMenuItem>
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
                        <a href={apiUrl("/api/logout")} className="cursor-pointer text-red-600">
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

        <div className="flex">
          <aside className="w-16 bg-white border-r flex flex-col items-center py-4 gap-2 fixed h-[calc(100vh-64px)] top-16 z-40">
            {sidebarItems.map(item => (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  {item.link ? (
                    <Link href={item.link}>
                      <button
                        className="w-12 h-12 rounded-lg flex items-center justify-center transition-colors text-gray-500 hover:bg-gray-100 relative"
                        data-testid={`sidebar-${item.id}`}
                      >
                        <item.icon className="h-5 w-5" />
                        {item.id === "notifications" && stats.pendingNotifications > 0 && (
                          <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
                            {stats.pendingNotifications > 9 ? "9+" : stats.pendingNotifications}
                          </span>
                        )}
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
                    href={apiUrl("/api/logout")}
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

          <main className="flex-1 ml-16 p-6">
            {activeSection === "reservations" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <CalendarDays className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.selectedDateCount}</p>
                  <p className="text-sm text-muted-foreground">Réservations {isToday(selectedDate) ? "aujourd'hui" : format(selectedDate, "d MMM", { locale: fr })}</p>
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
                  <p className="text-2xl font-bold">{stats.selectedDateGuests}</p>
                  <p className="text-sm text-muted-foreground">Couverts {isToday(selectedDate) ? "aujourd'hui" : format(selectedDate, "d MMM", { locale: fr })}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.waitingCount}</p>
                  <p className="text-sm text-muted-foreground">En attente ({stats.waitingGuests} couv.)</p>
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
                  <p className="text-2xl font-bold">{stats.availablePlaces}</p>
                  <p className="text-sm text-muted-foreground">Places disponibles</p>
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
                            {booking.guests} pers.{booking.children > 0 ? ` (${booking.children} enf.)` : ''}
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
                      ) : booking.status === "refused" ? (
                        <Badge variant="destructive">
                          <X className="h-3 w-3 mr-1" />
                          Refusée
                        </Badge>
                      ) : booking.status === "noshow" ? (
                        <Badge variant="secondary" className="bg-orange-500 text-white">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          No Show
                        </Badge>
                      ) : booking.status === "pending" ? (
                        <div className="flex flex-col gap-1">
                          <Badge variant="secondary" className="bg-blue-500 text-white animate-pulse">
                            <Clock className="h-3 w-3 mr-1" />
                            Nouvelle demande
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-green-600 text-green-600 hover:bg-green-50"
                            onClick={() => updateStatusMutation.mutate({ bookingId: booking.id, status: "confirmed" })}
                            disabled={updateStatusMutation.isPending}
                            data-testid={`btn-accept-${booking.id}`}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Accepter
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                            onClick={() => updateStatusMutation.mutate({ bookingId: booking.id, status: "waiting" })}
                            disabled={updateStatusMutation.isPending}
                            data-testid={`btn-waitlist-${booking.id}`}
                          >
                            <Clock className="h-4 w-4 mr-1" />
                            Liste d'attente
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500 text-red-500 hover:bg-red-50"
                            onClick={() => updateStatusMutation.mutate({ bookingId: booking.id, status: "refused" })}
                            disabled={updateStatusMutation.isPending}
                            data-testid={`btn-refuse-${booking.id}`}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Refuser
                          </Button>
                        </div>
                      ) : booking.status === "waiting" ? (
                        <div className="flex flex-col gap-1">
                          <Badge variant="secondary" className="bg-yellow-500 text-white">
                            <Clock className="h-3 w-3 mr-1" />
                            Liste d'attente
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-green-600 text-green-600 hover:bg-green-50"
                            onClick={() => updateStatusMutation.mutate({ bookingId: booking.id, status: "confirmed" })}
                            disabled={updateStatusMutation.isPending}
                            data-testid={`btn-confirm-${booking.id}`}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Confirmer
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
                        </div>
                      ) : booking.arrivalTime ? (
                        <div className="flex flex-col gap-1">
                          <Badge variant="default" className="bg-green-600">
                            <Check className="h-3 w-3 mr-1" />
                            Arrivé à {booking.arrivalTime}
                          </Badge>
                          {booking.departureTime ? (
                            <Badge variant="secondary" className="bg-gray-500 text-white">
                              Parti à {booking.departureTime}
                            </Badge>
                          ) : (
                            <>
                              {booking.billRequested ? (
                                <Badge variant="secondary" className="bg-yellow-500 text-white">
                                  Note demandée
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                                  onClick={() => markBillRequestedMutation.mutate(booking.id)}
                                  disabled={markBillRequestedMutation.isPending}
                                  data-testid={`btn-bill-${booking.id}`}
                                >
                                  Note demandée
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-green-600 text-green-600 hover:bg-green-50"
                                onClick={() => handleDepartureClick(booking)}
                                disabled={markDepartureMutation.isPending}
                                data-testid={`btn-departure-${booking.id}`}
                              >
                                Client parti
                              </Button>
                            </>
                          )}
                        </div>
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
                      <p className="text-4xl font-bold text-primary">{stats.availablePlaces}</p>
                      <p className="text-muted-foreground mt-2">Places disponibles aujourd'hui</p>
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
          </main>
        </div>
      </div>

      <Dialog open={billAmountDialog?.isOpen ?? false} onOpenChange={(open) => !open && setBillAmountDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Montant de la facture</DialogTitle>
            <DialogDescription>
              Saisissez le montant de la facture pour ce client (optionnel).
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center justify-center gap-2 mb-4 p-4 bg-gray-100 rounded-lg">
              <span className="text-xl font-medium text-gray-600">CHF</span>
              <span className="text-3xl font-bold text-gray-900" data-testid="display-bill-amount">
                {billAmountInput || "0.00"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "C"].map((key) => (
                <Button
                  key={key}
                  variant={key === "C" ? "destructive" : "outline"}
                  className="h-14 text-xl font-semibold"
                  onClick={() => {
                    if (key === "C") {
                      setBillAmountInput("");
                    } else if (key === ".") {
                      if (!billAmountInput.includes(".")) {
                        setBillAmountInput(prev => prev + ".");
                      }
                    } else {
                      const parts = billAmountInput.split(".");
                      if (parts[1] && parts[1].length >= 2) return;
                      setBillAmountInput(prev => prev + key);
                    }
                  }}
                  data-testid={`btn-keypad-${key === "." ? "dot" : key === "C" ? "clear" : key}`}
                >
                  {key === "C" ? "⌫" : key}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setBillAmountDialog(null)}
              data-testid="btn-cancel-bill"
            >
              Annuler
            </Button>
            <Button
              variant="outline"
              onClick={handleSkipBillAmount}
              disabled={markDepartureMutation.isPending || !billAmountDialog}
              data-testid="btn-skip-bill"
            >
              Passer
            </Button>
            <Button
              onClick={handleBillAmountSubmit}
              disabled={markDepartureMutation.isPending || !billAmountDialog}
              data-testid="btn-confirm-bill"
            >
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
