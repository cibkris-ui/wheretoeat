import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  LayoutDashboard,
  CalendarDays,
  LineChart,
  Settings,
  LogOut,
  Store,
  UserCircle,
  Utensils,
  ChevronRight,
  Bell,
  Plus,
  X,
  Check,
  Phone,
  Mail,
  Users,
  Clock,
  MessageSquare,
  Grid3X3
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import type { Restaurant, Booking } from "@shared/schema";
import { apiUrl } from "@/lib/queryClient";

type NotificationType = "new_booking" | "cancellation" | "modification";

interface Notification {
  id: number;
  type: NotificationType;
  booking: Booking;
  restaurantName: string;
  createdAt: string;
  read: boolean;
}

export default function Notifications() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"notifications" | "demandes">("notifications");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<number | null>(null);
  const [readNotifications, setReadNotifications] = useState<Set<number>>(() => {
    // Load from localStorage on init
    try {
      const saved = localStorage.getItem("readNotifications");
      if (saved) {
        return new Set(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Error loading read notifications from localStorage:", e);
    }
    return new Set();
  });
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  // Save to localStorage when readNotifications changes
  useEffect(() => {
    try {
      localStorage.setItem("readNotifications", JSON.stringify(Array.from(readNotifications)));
    } catch (e) {
      console.error("Error saving read notifications to localStorage:", e);
    }
  }, [readNotifications]);

  const { data: myRestaurants = [] } = useQuery<Restaurant[]>({
    queryKey: ["/api/my-restaurants"],
    enabled: isAuthenticated,
  });

  const restaurantIds = useMemo(() => myRestaurants.map(r => r.id), [myRestaurants]);
  const activeRestaurantId = selectedRestaurant || restaurantIds[0];

  const { data: allBookings = [] } = useQuery<Booking[]>({
    queryKey: ["/api/all-bookings-notifications", restaurantIds],
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
      queryClient.invalidateQueries({ queryKey: ["/api/all-bookings-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/all-bookings"] });
      const statusLabels: Record<string, string> = {
        confirmed: "Acceptée",
        waiting: "Mise en liste d'attente",
        refused: "Refusée",
      };
      toast({ 
        title: "Réservation mise à jour", 
        description: `La réservation a été ${statusLabels[variables.status]}.`
      });
      setSelectedNotification(null);
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de mettre à jour le statut.", variant: "destructive" });
    },
  });

  const notifications: Notification[] = useMemo(() => {
    return allBookings
      .filter(booking => {
        // Only show bookings from public platform (not owner-created)
        if (booking.clientIp === "owner-created") {
          return false;
        }
        if (selectedRestaurant && booking.restaurantId !== selectedRestaurant) {
          return false;
        }
        return true;
      })
      .map(booking => {
        const restaurant = myRestaurants.find(r => r.id === booking.restaurantId);
        let type: NotificationType = "new_booking";
        if (booking.status === "cancelled") {
          type = "cancellation";
        }
        const createdAtStr = booking.createdAt instanceof Date 
          ? booking.createdAt.toISOString() 
          : (booking.createdAt || new Date().toISOString());
        return {
          id: booking.id,
          type,
          booking,
          restaurantName: restaurant?.name || "Restaurant",
          createdAt: createdAtStr,
          read: readNotifications.has(booking.id),
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allBookings, myRestaurants, selectedRestaurant, readNotifications]);

  const filteredNotifications = useMemo(() => {
    if (showUnreadOnly) {
      return notifications.filter(n => !n.read);
    }
    return notifications;
  }, [notifications, showUnreadOnly]);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Count pending notifications for sidebar badge (same as pending bookings from public platform)
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

  const markAllAsRead = () => {
    const allIds = new Set<number>();
    notifications.forEach(n => allIds.add(n.id));
    setReadNotifications(allIds);
    toast({ title: "Toutes les notifications marquées comme lues" });
  };

  const markAsRead = (id: number) => {
    setReadNotifications(prev => {
      const newSet = new Set<number>();
      prev.forEach(v => newSet.add(v));
      newSet.add(id);
      return newSet;
    });
  };

  const selectedRestaurantData = myRestaurants.find(r => r.id === activeRestaurantId);

  const sidebarItems = [
    { id: "reservations" as const, icon: LayoutDashboard, label: "Réservations", link: "/dashboard" },
    { id: "attribution" as const, icon: Grid3X3, label: "Attribution", link: "/dashboard/attribution" },
    { id: "calendar" as const, icon: CalendarDays, label: "Calendrier", link: "/dashboard/calendrier" },
    { id: "notifications" as const, icon: Bell, label: "Notifications", link: null },
    { id: "clients" as const, icon: Users, label: "Clients", link: "/dashboard/clients" },
    { id: "stats" as const, icon: LineChart, label: "Statistiques", link: "/dashboard/statistiques" },
    { id: "settings" as const, icon: Settings, label: "Paramètres", link: "/dashboard/parametres" },
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Chargement...</p>
      </div>
    );
  }

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "cancellation":
        return (
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <X className="h-5 w-5 text-red-500" />
          </div>
        );
      case "new_booking":
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
            <Plus className="h-5 w-5 text-teal-600" />
          </div>
        );
    }
  };

  const getNotificationText = (notification: Notification) => {
    const { booking, type } = notification;
    const clientName = `${booking.firstName} ${booking.lastName}`.toUpperCase();
    
    switch (type) {
      case "cancellation":
        return `${clientName} a annulé la réservation`;
      case "new_booking":
      default:
        return `${clientName} a effectué une réservation`;
    }
  };

  const formatNotificationDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      return format(date, "EEE. d MMM.", { locale: fr });
    } catch {
      return "";
    }
  };

  const formatBookingDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      return format(date, "EEE. d MMM.", { locale: fr });
    } catch {
      return dateStr;
    }
  };

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
                      <span className="max-w-[200px] truncate">{selectedRestaurantData?.name || "Tous les restaurants"}</span>
                      <ChevronRight className="h-4 w-4 rotate-90" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Mes restaurants</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setSelectedRestaurant(null)}
                      className={!selectedRestaurant ? "bg-primary/10" : ""}
                    >
                      <Utensils className="mr-2 h-4 w-4" />
                      Tous les restaurants
                      {!selectedRestaurant && <span className="ml-auto text-primary">✓</span>}
                    </DropdownMenuItem>
                    {myRestaurants.map(r => (
                      <DropdownMenuItem 
                        key={r.id}
                        onClick={() => setSelectedRestaurant(r.id)}
                        className={selectedRestaurant === r.id ? "bg-primary/10" : ""}
                      >
                        <Utensils className="mr-2 h-4 w-4" />
                        {r.name}
                        {selectedRestaurant === r.id && <span className="ml-auto text-primary">✓</span>}
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

        <div className="flex">
          <aside className="w-16 bg-white border-r flex flex-col items-center py-4 gap-2 fixed h-[calc(100vh-64px)] top-16 z-40">
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
                      className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
                        item.id === "notifications" 
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
            <Card className="bg-white">
              <CardContent className="p-0">
                {/* Tabs header */}
                <div className="flex items-center justify-between border-b px-4">
                  <div className="flex items-center">
                    <button
                      onClick={() => setActiveTab("notifications")}
                      className={`py-4 px-2 border-b-2 font-medium text-sm ${
                        activeTab === "notifications"
                          ? "border-gray-900 text-gray-900"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      Notifications
                      {unreadCount > 0 && (
                        <span className="ml-2 text-xs bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab("demandes")}
                      className={`py-4 px-4 border-b-2 font-medium text-sm ${
                        activeTab === "demandes"
                          ? "border-gray-900 text-gray-900"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      Demandes
                    </button>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>

                {/* Filters */}
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={showUnreadOnly}
                      onCheckedChange={setShowUnreadOnly}
                      id="unread-filter"
                    />
                    <label htmlFor="unread-filter" className="text-sm text-gray-600">
                      Non lues
                    </label>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={markAllAsRead}
                    className="text-xs text-gray-600 hover:text-gray-900"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    TOUT MARQUER COMME LU
                  </Button>
                </div>

                {/* Notifications list */}
                <div className="divide-y">
                  {filteredNotifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      Aucune notification
                    </div>
                  ) : (
                    filteredNotifications.map(notification => (
                      <div 
                        key={notification.id}
                        className="flex items-start gap-4 p-4 hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          markAsRead(notification.id);
                          setSelectedNotification(notification);
                        }}
                        data-testid={`notification-${notification.id}`}
                      >
                        {/* Unread indicator */}
                        <div className="flex items-center pt-3">
                          {!notification.read && (
                            <div className="w-2 h-2 rounded-full bg-teal-500" />
                          )}
                          {notification.read && <div className="w-2" />}
                        </div>

                        {/* Icon */}
                        {getNotificationIcon(notification.type)}

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">
                            {getNotificationText(notification)}
                          </p>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-sm font-semibold text-gray-900">
                              {formatBookingDate(notification.booking.date)}
                            </span>
                            <span className="text-sm font-semibold text-gray-900">
                              {notification.booking.time}
                            </span>
                            <span className="text-sm font-semibold text-gray-900">
                              {notification.booking.guests}p{notification.booking.children > 0 ? ` (${notification.booking.children} enf.)` : ''}
                            </span>
                          </div>
                        </div>

                        {/* Date */}
                        <div className="text-xs text-gray-500 whitespace-nowrap">
                          {formatNotificationDate(notification.createdAt)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </main>
        </div>

        {/* Booking detail dialog */}
        <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
          <DialogContent className="max-w-lg">
            {selectedNotification && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {selectedNotification.type === "cancellation" ? (
                      <Badge variant="destructive">Annulée</Badge>
                    ) : (
                      <Badge className="bg-teal-500">Nouvelle réservation</Badge>
                    )}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  {/* Client info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-lg mb-3">
                      {selectedNotification.booking.firstName} {selectedNotification.booking.lastName}
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="h-4 w-4" />
                        <a href={`tel:${selectedNotification.booking.phone}`} className="hover:text-primary">
                          {selectedNotification.booking.phone}
                        </a>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="h-4 w-4" />
                        <a href={`mailto:${selectedNotification.booking.email}`} className="hover:text-primary">
                          {selectedNotification.booking.email}
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Booking details */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <CalendarDays className="h-5 w-5 mx-auto mb-1 text-gray-500" />
                      <p className="text-sm font-semibold">
                        {formatBookingDate(selectedNotification.booking.date)}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <Clock className="h-5 w-5 mx-auto mb-1 text-gray-500" />
                      <p className="text-sm font-semibold">
                        {selectedNotification.booking.time}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <Users className="h-5 w-5 mx-auto mb-1 text-gray-500" />
                      <p className="text-sm font-semibold">
                        {selectedNotification.booking.guests} pers.{selectedNotification.booking.children > 0 ? ` (${selectedNotification.booking.children} enf.)` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Restaurant */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Utensils className="h-4 w-4" />
                    <span>{selectedNotification.restaurantName}</span>
                  </div>

                  {/* Special request */}
                  {selectedNotification.booking.specialRequest && (
                    <div className="bg-amber-50 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 text-amber-600 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-amber-700 mb-1">Demande spéciale</p>
                          <p className="text-sm text-amber-900">
                            {selectedNotification.booking.specialRequest}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-3 pt-2">
                    {selectedNotification.booking.status === "pending" && (
                      <div className="flex gap-2">
                        <Button 
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => updateStatusMutation.mutate({ 
                            bookingId: selectedNotification.booking.id, 
                            status: "confirmed" 
                          })}
                          disabled={updateStatusMutation.isPending}
                          data-testid="btn-accept-notification"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Accepter
                        </Button>
                        <Button 
                          variant="outline"
                          className="flex-1 border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                          onClick={() => updateStatusMutation.mutate({ 
                            bookingId: selectedNotification.booking.id, 
                            status: "waiting" 
                          })}
                          disabled={updateStatusMutation.isPending}
                          data-testid="btn-waitlist-notification"
                        >
                          <Clock className="h-4 w-4 mr-1" />
                          Liste d'attente
                        </Button>
                        <Button 
                          variant="outline"
                          className="flex-1 border-red-500 text-red-500 hover:bg-red-50"
                          onClick={() => updateStatusMutation.mutate({ 
                            bookingId: selectedNotification.booking.id, 
                            status: "refused" 
                          })}
                          disabled={updateStatusMutation.isPending}
                          data-testid="btn-refuse-notification"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Refuser
                        </Button>
                      </div>
                    )}
                    {selectedNotification.booking.status !== "pending" && (
                      <div className="text-center py-2">
                        <Badge className={
                          selectedNotification.booking.status === "confirmed" ? "bg-green-600" :
                          selectedNotification.booking.status === "waiting" ? "bg-yellow-500" :
                          selectedNotification.booking.status === "refused" ? "bg-red-500" :
                          "bg-gray-500"
                        }>
                          {selectedNotification.booking.status === "confirmed" ? "Acceptée" :
                           selectedNotification.booking.status === "waiting" ? "Liste d'attente" :
                           selectedNotification.booking.status === "refused" ? "Refusée" :
                           selectedNotification.booking.status === "cancelled" ? "Annulée" :
                           "Traité"}
                        </Badge>
                      </div>
                    )}
                    <Link href={`/dashboard?date=${selectedNotification.booking.date}`} className="block">
                      <Button variant="ghost" className="w-full text-muted-foreground">
                        Voir dans le planning
                      </Button>
                    </Link>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
