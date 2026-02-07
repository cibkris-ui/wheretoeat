import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  TrendingUp,
  TrendingDown,
  LayoutDashboard,
  LineChart,
  UserCircle,
  Bell,
  LogOut,
  Lightbulb,
  AlertTriangle,
  UserX,
  LayoutGrid,
  CalendarDays,
  Settings,
  Store,
  Utensils,
  Grid3X3
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, startOfMonth, endOfMonth, subMonths, parseISO, eachDayOfInterval, isSameMonth, startOfDay, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import type { Restaurant, Booking } from "@shared/schema";
import { apiUrl } from "@/lib/queryClient";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, ReferenceLine } from "recharts";

type TabType = "overview" | "reservations" | "clients";

export default function Statistics() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedRestaurant, setSelectedRestaurant] = useState<number | "all">("all");
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [serviceFilter, setServiceFilter] = useState<"all" | "lunch" | "dinner">("all");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Connexion requise",
        description: "Vous devez être connecté pour accéder aux statistiques.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = apiUrl("/api/login");
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: myRestaurants = [] } = useQuery<Restaurant[]>({
    queryKey: ["/api/my-restaurants"],
    enabled: isAuthenticated,
  });

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

  // Count pending notifications for sidebar badge
  const pendingNotifications = useMemo(() => {
    if (allBookings.length === 0) {
      const cached = localStorage.getItem("pendingNotificationsCount");
      return cached ? parseInt(cached, 10) : 0;
    }
    const count = allBookings.filter(b => 
      b.status === "pending" && 
      !b.clientIp?.startsWith("owner-")
    ).length;
    localStorage.setItem("pendingNotificationsCount", String(count));
    return count;
  }, [allBookings]);

  const selectedRestaurantData = useMemo(() => {
    if (selectedRestaurant === "all") return null;
    return myRestaurants.find(r => r.id === selectedRestaurant);
  }, [selectedRestaurant, myRestaurants]);

  const capacity = useMemo(() => {
    if (selectedRestaurant === "all") {
      return myRestaurants.reduce((sum, r) => sum + (r.capacity || 40), 0) || 40;
    }
    return selectedRestaurantData?.capacity || 40;
  }, [selectedRestaurant, selectedRestaurantData, myRestaurants]);

  const navigateMonth = (direction: "prev" | "next") => {
    if (direction === "prev") {
      setSelectedMonth(prev => subMonths(prev, 1));
    } else {
      setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    }
  };

  const stats = useMemo(() => {
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);
    const prevMonthStart = startOfMonth(subMonths(selectedMonth, 1));
    const prevMonthEnd = endOfMonth(subMonths(selectedMonth, 1));

    let bookings = [...allBookings];
    if (selectedRestaurant !== "all") {
      bookings = bookings.filter(b => b.restaurantId === selectedRestaurant);
    }

    const currentMonthBookings = bookings.filter(b => {
      const d = parseISO(b.date);
      return d >= monthStart && d <= monthEnd;
    });

    const prevMonthBookings = bookings.filter(b => {
      const d = parseISO(b.date);
      return d >= prevMonthStart && d <= prevMonthEnd;
    });

    const activeStatuses = ["confirmed", "completed"];
    const activeCurrentBookings = currentMonthBookings.filter(b => activeStatuses.includes(b.status));
    const activePrevBookings = prevMonthBookings.filter(b => activeStatuses.includes(b.status));

    const totalCovers = activeCurrentBookings.reduce((sum, b) => sum + b.guests, 0);
    const totalReservations = activeCurrentBookings.length;
    const prevCovers = activePrevBookings.reduce((sum, b) => sum + b.guests, 0);

    const lateCancellations = currentMonthBookings.filter(b => b.status === "cancelled").length;
    const lateCancellationCovers = currentMonthBookings.filter(b => b.status === "cancelled").reduce((sum, b) => sum + b.guests, 0);
    const prevLateCancellations = prevMonthBookings.filter(b => b.status === "cancelled").reduce((sum, b) => sum + b.guests, 0);

    const noShows = currentMonthBookings.filter(b => b.status === "noshow").length;
    const noShowCovers = currentMonthBookings.filter(b => b.status === "noshow").reduce((sum, b) => sum + b.guests, 0);
    const prevNoShows = prevMonthBookings.filter(b => b.status === "noshow").reduce((sum, b) => sum + b.guests, 0);

    const calcChange = (current: number, prev: number) => {
      if (prev === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - prev) / prev) * 100);
    };

    const lunchBookings = activeCurrentBookings.filter(b => {
      const hour = parseInt(b.time.split(":")[0]) || 0;
      return hour >= 11 && hour < 15;
    });
    const dinnerBookings = activeCurrentBookings.filter(b => {
      const hour = parseInt(b.time.split(":")[0]) || 0;
      return hour >= 18 && hour <= 23;
    });

    const lunchCovers = lunchBookings.reduce((sum, b) => sum + b.guests, 0);
    const dinnerCovers = dinnerBookings.reduce((sum, b) => sum + b.guests, 0);

    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const today = startOfDay(new Date());

    const dailyOccupation = daysInMonth.map(day => {
      const dayBookings = activeCurrentBookings.filter(b => isSameDay(parseISO(b.date), day));
      
      let filteredBookings = dayBookings;
      if (serviceFilter === "lunch") {
        filteredBookings = dayBookings.filter(b => {
          const hour = parseInt(b.time.split(":")[0]) || 0;
          return hour >= 11 && hour < 15;
        });
      } else if (serviceFilter === "dinner") {
        filteredBookings = dayBookings.filter(b => {
          const hour = parseInt(b.time.split(":")[0]) || 0;
          return hour >= 18 && hour <= 23;
        });
      }

      const totalGuests = filteredBookings.reduce((sum, b) => sum + b.guests, 0);
      const onlineGuests = filteredBookings.reduce((sum, b) => sum + b.guests, 0);
      const occupationRate = capacity > 0 ? Math.min(100, Math.round((totalGuests / capacity) * 100)) : 0;
      
      const isPast = day < today;
      const isToday = isSameDay(day, today);

      return {
        date: format(day, "d", { locale: fr }),
        fullDate: format(day, "d MMM", { locale: fr }),
        online: onlineGuests,
        offline: 0,
        unoccupied: Math.max(0, capacity - totalGuests),
        occupationRate,
        isPast,
        isToday,
      };
    });

    const maxOccupation = Math.max(...dailyOccupation.map(d => d.occupationRate));
    const bestDay = dailyOccupation.find(d => d.occupationRate === maxOccupation && maxOccupation > 0);

    const clientStats = activeCurrentBookings.reduce((acc, booking) => {
      const key = booking.email.toLowerCase();
      if (!acc[key]) {
        acc[key] = {
          email: booking.email,
          firstName: booking.firstName,
          lastName: booking.lastName,
          phone: booking.phone,
          totalCovers: 0,
          reservationCount: 0,
        };
      }
      acc[key].totalCovers += booking.guests;
      acc[key].reservationCount += 1;
      return acc;
    }, {} as Record<string, { email: string; firstName: string; lastName: string; phone: string; totalCovers: number; reservationCount: number }>);

    const topClients = Object.values(clientStats)
      .sort((a, b) => b.totalCovers - a.totalCovers)
      .slice(0, 10);

    return {
      totalCovers,
      totalReservations,
      coversChange: calcChange(totalCovers, prevCovers),
      lateCancellations,
      lateCancellationCovers,
      lateCancellationsChange: calcChange(lateCancellationCovers, prevLateCancellations),
      noShows,
      noShowCovers,
      noShowsChange: calcChange(noShowCovers, prevNoShows),
      lunchCovers,
      dinnerCovers,
      dailyOccupation,
      bestDay,
      maxOccupation,
      topClients,
    };
  }, [allBookings, selectedMonth, selectedRestaurant, capacity, serviceFilter]);

  const serviceChartData = [
    { name: "Dîner", value: stats.dinnerCovers, color: "#14b8a6" },
    { name: "Déjeuner", value: stats.lunchCovers, color: "#f472b6" },
  ];

  const chartConfig = {
    dinner: { label: "Dîner", color: "#14b8a6" },
    lunch: { label: "Déjeuner", color: "#f472b6" },
    online: { label: "Couverts en ligne", color: "#dc2626" },
    offline: { label: "Couverts hors ligne", color: "#14b8a6" },
    unoccupied: { label: "Non occupés", color: "#e5e7eb" },
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
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
    { id: "reservations" as const, icon: LayoutDashboard, label: "Réservations", link: "/dashboard" },
    { id: "attribution" as const, icon: Grid3X3, label: "Attribution", link: "/dashboard/attribution" },
    { id: "calendar" as const, icon: CalendarDays, label: "Calendrier", link: "/dashboard/calendrier" },
    { id: "notifications" as const, icon: Bell, label: "Notifications", link: "/dashboard/notifications" },
    { id: "clients" as const, icon: Users, label: "Clients", link: "/dashboard/clients" },
    { id: "stats" as const, icon: LineChart, label: "Statistiques", link: null },
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
                    {myRestaurants.length > 1 && (
                      <DropdownMenuItem 
                        onClick={() => setSelectedRestaurant("all")}
                        className={selectedRestaurant === "all" ? "bg-primary/10" : ""}
                      >
                        <Utensils className="mr-2 h-4 w-4" />
                        Tous les restaurants
                        {selectedRestaurant === "all" && (
                          <span className="ml-auto text-primary">✓</span>
                        )}
                      </DropdownMenuItem>
                    )}
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

        <div className="flex pt-0">
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
                        {item.id === "notifications" && pendingNotifications > 0 && (
                          <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
                            {pendingNotifications > 9 ? "9+" : pendingNotifications}
                          </span>
                        )}
                      </button>
                    </Link>
                  ) : (
                    <button
                      className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
                        item.id === "stats" 
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
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "overview" ? "bg-white shadow text-primary" : "text-gray-600 hover:text-gray-900"
                  }`}
                  data-testid="tab-overview"
                >
                  Vue d'ensemble
                </button>
                <button
                  onClick={() => setActiveTab("reservations")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "reservations" ? "bg-white shadow text-primary" : "text-gray-600 hover:text-gray-900"
                  }`}
                  data-testid="tab-reservations"
                >
                  Réservations
                </button>
                <button
                  onClick={() => setActiveTab("clients")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "clients" ? "bg-white shadow text-primary" : "text-gray-600 hover:text-gray-900"
                  }`}
                  data-testid="tab-clients"
                >
                  Clients
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigateMonth("prev")} data-testid="prev-month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[140px] text-center capitalize">
                {format(selectedMonth, "MMMM yyyy", { locale: fr })}
              </span>
              <Button variant="ghost" size="icon" onClick={() => navigateMonth("next")} data-testid="next-month">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {activeTab === "overview" && (
            <>
              <h1 className="text-2xl font-semibold mb-6">Statistiques - Vue d'ensemble</h1>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-gray-600 mb-2">
                          <Users className="h-4 w-4" />
                          <span className="text-sm font-medium">Couverts</span>
                        </div>
                        <p className="text-xs text-gray-500 mb-4">
                          {format(selectedMonth, "MMM yyyy", { locale: fr })}
                        </p>
                        <p className="text-4xl font-bold text-gray-900">{stats.totalCovers}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          <span className="inline-flex items-center">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            {stats.totalReservations} réservations
                          </span>
                        </p>
                        <div className={`flex items-center gap-1 mt-3 text-sm ${stats.coversChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {stats.coversChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                          <span>{stats.coversChange >= 0 ? "+" : ""}{stats.coversChange}%</span>
                          <span className="text-gray-500">vs mois précédent</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-gray-600 mb-2">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm font-medium">Annulations tardives</span>
                          <span className="text-xs text-gray-400">en nombre de couverts</span>
                        </div>
                        <p className="text-4xl font-bold text-gray-900 mt-4">{stats.lateCancellationCovers}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {((stats.lateCancellationCovers / (stats.totalCovers || 1)) * 100).toFixed(0)}% du nombre total de couverts réservés
                        </p>
                        <p className="text-sm text-gray-500">
                          <CalendarIcon className="h-3 w-3 inline mr-1" />
                          {stats.lateCancellations} réservation{stats.lateCancellations > 1 ? "s" : ""}
                        </p>
                        <div className={`flex items-center gap-1 mt-3 text-sm ${stats.lateCancellationsChange <= 0 ? "text-green-600" : "text-red-600"}`}>
                          {stats.lateCancellationsChange <= 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                          <span>{stats.lateCancellationsChange >= 0 ? "+" : ""}{stats.lateCancellationsChange}%</span>
                          <span className="text-gray-500">vs mois précédent</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-gray-600 mb-2">
                          <UserX className="h-4 w-4" />
                          <span className="text-sm font-medium">No-shows</span>
                          <span className="text-xs text-gray-400">en nombre de couverts</span>
                        </div>
                        <p className="text-4xl font-bold text-gray-900 mt-4">{stats.noShowCovers}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {((stats.noShowCovers / (stats.totalCovers || 1)) * 100).toFixed(0)}% du nombre total de couverts réservés
                        </p>
                        <p className="text-sm text-gray-500">
                          <CalendarIcon className="h-3 w-3 inline mr-1" />
                          {stats.noShows} réservation{stats.noShows > 1 ? "s" : ""}
                        </p>
                        <div className={`flex items-center gap-1 mt-3 text-sm ${stats.noShowsChange <= 0 ? "text-green-600" : "text-red-600"}`}>
                          {stats.noShowsChange <= 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                          <span>{stats.noShowsChange >= 0 ? "+" : ""}{stats.noShowsChange}%</span>
                          <span className="text-gray-500">vs mois précédent</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold">Occupation</h2>
                      <p className="text-sm text-gray-500">
                        Occupation quotidienne du{" "}
                        <span className="font-medium">{format(startOfMonth(selectedMonth), "d MMMM yyyy", { locale: fr })}</span>
                        {" "}au{" "}
                        <span className="font-medium">{format(endOfMonth(selectedMonth), "d MMMM yyyy", { locale: fr })}</span>
                      </p>
                    </div>
                    <Select value={serviceFilter} onValueChange={(v) => setServiceFilter(v as typeof serviceFilter)}>
                      <SelectTrigger className="w-[180px]" data-testid="service-filter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les services</SelectItem>
                        <SelectItem value="lunch">Déjeuner</SelectItem>
                        <SelectItem value="dinner">Dîner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.dailyOccupation} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 11, fill: "#6b7280" }}
                          tickLine={false}
                          axisLine={{ stroke: "#e5e7eb" }}
                        />
                        <YAxis 
                          tick={{ fontSize: 11, fill: "#6b7280" }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `${value}%`}
                          domain={[0, 100]}
                        />
                        <ChartTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white p-3 shadow-lg rounded-lg border">
                                  <p className="font-medium">{data.fullDate}</p>
                                  <p className="text-sm text-teal-600">{data.online} couverts en ligne</p>
                                  <p className="text-sm text-gray-500">{data.unoccupied} places disponibles</p>
                                  <p className="text-sm font-medium mt-1">{data.occupationRate}% d'occupation</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        {stats.maxOccupation > 0 && (
                          <ReferenceLine 
                            y={stats.maxOccupation} 
                            stroke="#f97316" 
                            strokeDasharray="5 5" 
                            strokeWidth={2}
                          />
                        )}
                        <Bar 
                          dataKey="occupationRate" 
                          stackId="a"
                          fill="#e5e7eb"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar 
                          dataKey={(d) => d.online > 0 ? d.online / capacity * 100 : 0} 
                          stackId="b"
                          fill="#14b8a6"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-teal-500 rounded" />
                      <span className="text-gray-600">Couverts hors ligne</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-500 rounded" />
                      <span className="text-gray-600">Couverts en ligne</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-200 rounded" />
                      <span className="text-gray-600">Non occupés</span>
                    </div>
                    {stats.bestDay && (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-0.5 bg-orange-500 border-dashed" style={{ borderStyle: 'dashed' }} />
                        <span className="text-gray-600">Meilleur taux d'occupation ({stats.bestDay.fullDate})</span>
                      </div>
                    )}
                  </div>

                  </CardContent>
              </Card>
            </>
          )}

          {activeTab === "reservations" && (
            <>
              <h1 className="text-2xl font-semibold mb-6">Performances des réservations</h1>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 text-gray-600 mb-2">
                      <Users className="h-4 w-4" />
                      <span className="text-sm font-medium">Couverts</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">
                      {format(selectedMonth, "MMM yyyy", { locale: fr })}
                    </p>
                    <p className="text-4xl font-bold text-gray-900">{stats.totalCovers}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      <CalendarIcon className="h-3 w-3 inline mr-1" />
                      {stats.totalReservations} réservations
                    </p>
                    <div className={`flex items-center gap-1 mt-3 text-sm ${stats.coversChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {stats.coversChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      <span>{stats.coversChange >= 0 ? "+" : ""}{stats.coversChange}%</span>
                      <span className="text-gray-500">vs mois précédent</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 text-gray-600 mb-4">
                      <span className="text-sm font-medium">Couverts par canal</span>
                    </div>
                    <div className="flex items-center justify-center">
                      <div className="w-[180px] h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[{ name: "WhereToEat", value: stats.totalCovers, color: "#0ea5e9" }]}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              dataKey="value"
                              stroke="none"
                            >
                              <Cell fill="#0ea5e9" />
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <div className="w-3 h-3 bg-sky-500 rounded-full" />
                      <span className="text-sm text-gray-600">WhereToEat</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 text-gray-600 mb-4">
                      <span className="text-sm font-medium">Couverts par service</span>
                    </div>
                    <div className="flex items-center justify-center">
                      <div className="w-[180px] h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={serviceChartData.filter(d => d.value > 0)}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              dataKey="value"
                              stroke="none"
                            >
                              {serviceChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-teal-500 rounded-full" />
                        <span className="text-sm text-gray-600">Dîner</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-pink-400 rounded-full" />
                        <span className="text-sm text-gray-600">Déjeuner</span>
                      </div>
                    </div>
                    <p className="text-center text-xs text-gray-500 mt-4">
                      Dernière mise à jour: {format(new Date(), "d MMM yyyy", { locale: fr })}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {activeTab === "clients" && (
            <>
              <h1 className="text-2xl font-semibold mb-6">Statistiques Clients</h1>

              <Card className="bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      <h2 className="text-lg font-semibold">Top 10 clients du mois</h2>
                    </div>
                    <span className="text-sm text-gray-500 capitalize">
                      {format(selectedMonth, "MMMM yyyy", { locale: fr })}
                    </span>
                  </div>

                  {stats.topClients.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Aucune réservation ce mois-ci
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b text-left text-sm text-gray-500">
                            <th className="pb-3 font-medium w-12">#</th>
                            <th className="pb-3 font-medium">Client</th>
                            <th className="pb-3 font-medium">Contact</th>
                            <th className="pb-3 font-medium text-center">Réservations</th>
                            <th className="pb-3 font-medium text-right">Couverts</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {stats.topClients.map((client, index) => (
                            <tr key={client.email} className="hover:bg-gray-50" data-testid={`top-client-${index}`}>
                              <td className="py-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                  index === 0 ? "bg-yellow-100 text-yellow-700" :
                                  index === 1 ? "bg-gray-200 text-gray-700" :
                                  index === 2 ? "bg-orange-100 text-orange-700" :
                                  "bg-gray-100 text-gray-600"
                                }`}>
                                  {index + 1}
                                </div>
                              </td>
                              <td className="py-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="text-sm font-bold text-primary">
                                      {client.lastName?.[0]?.toUpperCase() || client.firstName?.[0]?.toUpperCase() || "?"}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      <span className="text-primary">{client.lastName?.toUpperCase()}</span>
                                      {" "}
                                      {client.firstName}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 text-sm text-gray-600">
                                <div>{client.email}</div>
                                <div className="text-gray-400">{client.phone}</div>
                              </td>
                              <td className="py-3 text-center">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100">
                                  {client.reservationCount} visite{client.reservationCount > 1 ? "s" : ""}
                                </span>
                              </td>
                              <td className="py-3 text-right">
                                <span className="text-xl font-bold text-primary">{client.totalCovers}</span>
                                <span className="text-sm text-gray-500 ml-1">couverts</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
