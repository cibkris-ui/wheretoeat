import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { 
  ChevronLeft, 
  ChevronRight,
  Users,
  CalendarDays,
  Utensils,
  Lock,
  Unlock,
  Plus,
  Eye,
  UserCircle,
  LogOut,
  Store,
  LayoutDashboard,
  LineChart,
  Settings,
  Sun,
  Moon,
  Bell,
  Grid3X3
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getDay, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import type { Restaurant, Booking, ClosedDay } from "@shared/schema";
import { Link } from "wouter";
import { apiUrl } from "@/lib/queryClient";

type ServiceFilter = "all" | "lunch" | "dinner";

export default function Calendar() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedRestaurant, setSelectedRestaurant] = useState<number | null>(null);
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>("all");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showDayDialog, setShowDayDialog] = useState(false);

  const { data: myRestaurants = [] } = useQuery<Restaurant[]>({
    queryKey: ["/api/my-restaurants"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/my-restaurants"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch restaurants");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const restaurantIds = useMemo(() => myRestaurants.map(r => r.id), [myRestaurants]);
  const activeRestaurantId = selectedRestaurant || restaurantIds[0];

  const { data: allBookings = [] } = useQuery<Booking[]>({
    queryKey: ["/api/calendar-bookings", activeRestaurantId, format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      if (!activeRestaurantId) return [];
      const res = await fetch(apiUrl(`/api/bookings/restaurant/${activeRestaurantId}`), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch bookings");
      return res.json();
    },
    enabled: !!activeRestaurantId,
  });

  // Count pending notifications for sidebar badge
  const pendingNotifications = useMemo(() => {
    if (allBookings.length === 0) {
      // Use cached value while loading
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

  const { data: closedDays = [] } = useQuery<ClosedDay[]>({
    queryKey: ["/api/closed-days", activeRestaurantId, format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      if (!activeRestaurantId) return [];
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const res = await fetch(apiUrl(`/api/closed-days/restaurant/${activeRestaurantId}?year=${year}&month=${month}`), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch closed days");
      return res.json();
    },
    enabled: !!activeRestaurantId,
  });

  const createClosedDayMutation = useMutation({
    mutationFn: async ({ date, service }: { date: string; service: string }) => {
      const res = await fetch(apiUrl(`/api/closed-days/restaurant/${activeRestaurantId}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ date, service }),
      });
      if (!res.ok) throw new Error("Failed to create closed day");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/closed-days"] });
      toast({ title: "Jour fermé", description: "La journée a été marquée comme fermée." });
      setShowDayDialog(false);
    },
  });

  const deleteClosedDayMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(apiUrl(`/api/closed-days/${id}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete closed day");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/closed-days"] });
      toast({ title: "Jour ouvert", description: "La journée a été réouverte." });
      setShowDayDialog(false);
    },
  });

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const firstDayOfWeek = useMemo(() => {
    const day = getDay(startOfMonth(currentMonth));
    return day === 0 ? 6 : day - 1;
  }, [currentMonth]);

  const getBookingsForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return allBookings.filter(b => b.date === dateStr && b.status !== "cancelled");
  };

  const getCoversForService = (date: Date, service: "lunch" | "dinner") => {
    const bookings = getBookingsForDay(date);
    return bookings
      .filter(b => {
        const hour = parseInt(b.time.split(":")[0]) || 0;
        if (service === "lunch") return hour >= 11 && hour < 15;
        return hour >= 18 && hour <= 23;
      })
      .reduce((sum, b) => sum + b.guests, 0);
  };

  const getReservationsForService = (date: Date, service: "lunch" | "dinner") => {
    const bookings = getBookingsForDay(date);
    return bookings.filter(b => {
      const hour = parseInt(b.time.split(":")[0]) || 0;
      if (service === "lunch") return hour >= 11 && hour < 15;
      return hour >= 18 && hour <= 23;
    }).length;
  };

  const isClosedDay = (date: Date, service?: string) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return closedDays.some(cd => cd.date === dateStr && (cd.service === "all" || cd.service === service));
  };

  const getClosedDayRecord = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return closedDays.find(cd => cd.date === dateStr);
  };

  const totalCovers = useMemo(() => {
    return allBookings
      .filter(b => {
        const bookingDate = parseISO(b.date);
        return isSameMonth(bookingDate, currentMonth) && b.status !== "cancelled";
      })
      .reduce((sum, b) => sum + b.guests, 0);
  }, [allBookings, currentMonth]);

  const totalReservations = useMemo(() => {
    return allBookings.filter(b => {
      const bookingDate = parseISO(b.date);
      return isSameMonth(bookingDate, currentMonth) && b.status !== "cancelled";
    }).length;
  }, [allBookings, currentMonth]);

  const handleDayClick = (date: Date) => {
    setSelectedDay(date);
    setShowDayDialog(true);
  };

  const handleCloseDay = () => {
    if (!selectedDay) return;
    
    // Vérifier s'il y a des réservations actives pour cette journée
    const dateStr = format(selectedDay, "yyyy-MM-dd");
    const activeReservations = allBookings.filter(b => 
      b.date === dateStr && 
      b.status !== "cancelled" && 
      b.status !== "refused" &&
      b.status !== "noshow"
    );
    
    if (activeReservations.length > 0) {
      toast({ 
        title: "Impossible de fermer les réservations", 
        description: `Il y a ${activeReservations.length} réservation(s) active(s) pour cette journée.`,
        variant: "destructive"
      });
      return;
    }
    
    createClosedDayMutation.mutate({ 
      date: dateStr, 
      service: "all" 
    });
  };

  const handleOpenDay = () => {
    if (!selectedDay) return;
    const closedDayRecord = getClosedDayRecord(selectedDay);
    if (closedDayRecord) {
      deleteClosedDayMutation.mutate(closedDayRecord.id);
    }
  };

  const weekDays = ["Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam.", "Dim."];

  const selectedRestaurantData = myRestaurants.find(r => r.id === activeRestaurantId);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Chargement...</p>
      </div>
    );
  }

  const sidebarItems = [
    { id: "reservations" as const, icon: LayoutDashboard, label: "Réservations", link: "/dashboard" },
    { id: "attribution" as const, icon: Grid3X3, label: "Attribution", link: "/dashboard/attribution" },
    { id: "calendar" as const, icon: CalendarDays, label: "Calendrier", link: null },
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
                      <span className="max-w-[200px] truncate">{selectedRestaurantData?.name || "Sélectionner"}</span>
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
                        item.id === "calendar" 
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
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-xl font-semibold min-w-[180px] text-center">
                  {format(currentMonth, "MMMM yyyy", { locale: fr })}
                </h1>
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setCurrentMonth(new Date())}
                  className="text-primary"
                >
                  Maintenant
                </Button>
                <div className="flex items-center gap-1 ml-4 border-l pl-4">
                  <Button
                    variant={serviceFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setServiceFilter("all")}
                  >
                    Tous les services
                  </Button>
                  <Button
                    variant={serviceFilter === "lunch" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setServiceFilter("lunch")}
                  >
                    <Sun className="h-4 w-4 mr-1" />
                    Lunch
                  </Button>
                  <Button
                    variant={serviceFilter === "dinner" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setServiceFilter("dinner")}
                  >
                    <Moon className="h-4 w-4 mr-1" />
                    Dîner
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-sm">
                  <Utensils className="h-4 w-4 text-muted-foreground" />
                  <span>Couverts : <strong>{totalCovers}p</strong></span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span>Réservations : <strong>{totalReservations}</strong></span>
                </div>
              </div>
            </div>

            <Card className="bg-white">
          <CardContent className="p-0">
            <div className="grid grid-cols-7 border-b">
              {weekDays.map(day => (
                <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[120px] border-r border-b bg-gray-50" />
              ))}
              {calendarDays.map(day => {
                const dayOfWeek = getDay(day);
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const closed = isClosedDay(day);
                const lunchCovers = getCoversForService(day, "lunch");
                const dinnerCovers = getCoversForService(day, "dinner");
                const lunchReservations = getReservationsForService(day, "lunch");
                const dinnerReservations = getReservationsForService(day, "dinner");

                return (
                  <div 
                    key={day.toISOString()}
                    onClick={() => handleDayClick(day)}
                    className={`min-h-[120px] border-r border-b p-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                      closed || isWeekend ? "bg-gray-100" : ""
                    } ${isToday(day) ? "ring-2 ring-primary ring-inset" : ""}`}
                    data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium ${isToday(day) ? "bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center" : ""}`}>
                        {format(day, "d")}
                      </span>
                    </div>
                    {closed ? (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Lock className="h-3 w-3" />
                        Fermé
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {(serviceFilter === "all" || serviceFilter === "lunch") && (
                          <div className={`flex items-center justify-between text-xs p-1 rounded ${lunchCovers > 0 ? "bg-green-50" : ""}`}>
                            <div className="flex items-center gap-1">
                              <Utensils className="h-3 w-3 text-muted-foreground" />
                              <span>Lunch</span>
                            </div>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {lunchCovers}
                            </span>
                          </div>
                        )}
                        {(serviceFilter === "all" || serviceFilter === "dinner") && (
                          <div className={`flex items-center justify-between text-xs p-1 rounded ${dinnerCovers > 0 ? "bg-green-50" : ""}`}>
                            <div className="flex items-center gap-1">
                              <Utensils className="h-3 w-3 text-muted-foreground" />
                              <span>Dinner</span>
                            </div>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {dinnerCovers}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

      <Dialog open={showDayDialog} onOpenChange={setShowDayDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedDay && format(selectedDay, "EEEE d MMMM", { locale: fr })}
            </DialogTitle>
          </DialogHeader>
          {selectedDay && (
            <div className="space-y-4">
              <div className="flex gap-2">
                {isClosedDay(selectedDay) ? (
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={handleOpenDay}
                    disabled={deleteClosedDayMutation.isPending}
                  >
                    <Unlock className="h-4 w-4 mr-2" />
                    Autoriser en ligne
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={handleCloseDay}
                    disabled={createClosedDayMutation.isPending}
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Fermer les réservations
                  </Button>
                )}
              </div>
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Utensils className="h-4 w-4" />
                    <span>Lunch</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {getCoversForService(selectedDay, "lunch")}
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-4 w-4" />
                      {getReservationsForService(selectedDay, "lunch")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Utensils className="h-4 w-4" />
                    <span>Dinner</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {getCoversForService(selectedDay, "dinner")}
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-4 w-4" />
                      {getReservationsForService(selectedDay, "dinner")}
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Link href={`/dashboard/nouvelle-reservation?date=${format(selectedDay, "yyyy-MM-dd")}`}>
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Créer une réservation
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href={`/dashboard?date=${format(selectedDay, "yyyy-MM-dd")}`}>
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Voir les réservations
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
