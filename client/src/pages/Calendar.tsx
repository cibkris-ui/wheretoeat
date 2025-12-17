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
  Moon
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getDay, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import type { Restaurant, Booking, ClosedDay } from "@shared/schema";
import { Link } from "wouter";

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
      const res = await fetch("/api/my-restaurants", { credentials: "include" });
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
      const res = await fetch(`/api/restaurants/${activeRestaurantId}/bookings`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch bookings");
      return res.json();
    },
    enabled: !!activeRestaurantId,
  });

  const { data: closedDays = [] } = useQuery<ClosedDay[]>({
    queryKey: ["/api/closed-days", activeRestaurantId, format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      if (!activeRestaurantId) return [];
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const res = await fetch(`/api/restaurants/${activeRestaurantId}/closed-days?year=${year}&month=${month}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch closed days");
      return res.json();
    },
    enabled: !!activeRestaurantId,
  });

  const createClosedDayMutation = useMutation({
    mutationFn: async ({ date, service }: { date: string; service: string }) => {
      const res = await fetch(`/api/restaurants/${activeRestaurantId}/closed-days`, {
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
      const res = await fetch(`/api/closed-days/${id}`, {
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
    createClosedDayMutation.mutate({ 
      date: format(selectedDay, "yyyy-MM-dd"), 
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

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-16 bg-white border-r flex flex-col items-center py-4 gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/dashboard">
                <Button variant="ghost" size="icon" className="rounded-xl">
                  <LayoutDashboard className="h-5 w-5" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Réservations</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="default" size="icon" className="rounded-xl bg-primary">
                <CalendarDays className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Calendrier</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl">
                <LineChart className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Statistiques</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl">
                <Settings className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Paramètres</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </aside>

      <main className="flex-1 p-6">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Store className="h-4 w-4" />
                  {selectedRestaurantData?.name || "Sélectionner"}
                  <ChevronLeft className="h-4 w-4 rotate-[-90deg]" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Mes restaurants</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {myRestaurants.map(r => (
                  <DropdownMenuItem 
                    key={r.id} 
                    onClick={() => setSelectedRestaurant(r.id)}
                    className={r.id === activeRestaurantId ? "bg-primary/10" : ""}
                  >
                    {r.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <UserCircle className="h-6 w-6" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user?.firstName || user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => window.location.href = "/api/logout"}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
      </main>

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
                    Clôturer la journée
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
    </div>
  );
}
