import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  Phone,
  Mail,
  Users,
  Clock,
  Search,
  User,
  Calendar,
  Hash,
  Grid3X3
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import type { Restaurant, Booking, Client } from "@shared/schema";
import { apiUrl } from "@/lib/queryClient";

interface ClientWithStats extends Client {
  visitCount: number;
  lastVisit: string | null;
  avgGuests: number;
}

interface ClientDetail extends ClientWithStats {
  bookings: Booking[];
}

export default function Clients() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedRestaurant, setSelectedRestaurant] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientDetail | null>(null);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Connexion requise",
        description: "Vous devez être connecté pour accéder à l'annuaire clients.",
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

  const activeRestaurantId = selectedRestaurant || myRestaurants[0]?.id;

  const { data: clients = [], isLoading: clientsLoading } = useQuery<ClientWithStats[]>({
    queryKey: ["/api/restaurants", activeRestaurantId, "clients", searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(apiUrl(`/api/clients/restaurant/${activeRestaurantId}?${params}`), {
        credentials: "include"
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!activeRestaurantId,
  });

  // Count pending notifications for sidebar badge
  const { data: allBookings = [] } = useQuery<Booking[]>({
    queryKey: ["/api/clients-bookings", activeRestaurantId],
    queryFn: async () => {
      if (!activeRestaurantId) return [];
      const res = await fetch(apiUrl(`/api/bookings/restaurant/${activeRestaurantId}`), { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!activeRestaurantId,
  });

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

  const fetchClientDetail = async (clientId: number) => {
    const res = await fetch(apiUrl(`/api/clients/${clientId}`), { credentials: "include" });
    if (!res.ok) return null;
    return res.json() as Promise<ClientDetail>;
  };

  const handleClientClick = async (client: ClientWithStats) => {
    const detail = await fetchClientDetail(client.id);
    if (detail) {
      setSelectedClient(detail);
    }
  };

  const selectedRestaurantData = myRestaurants.find(r => r.id === activeRestaurantId);

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  const filteredClients = useMemo(() => {
    let result = [...clients];
    if (selectedLetter) {
      result = result.filter(c => 
        c.lastName.toUpperCase().startsWith(selectedLetter)
      );
    }
    return result.sort((a, b) => {
      const nameA = `${a.lastName} ${a.firstName}`.toUpperCase();
      const nameB = `${b.lastName} ${b.firstName}`.toUpperCase();
      return nameA.localeCompare(nameB);
    });
  }, [clients, selectedLetter]);

  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    clients.forEach(c => {
      if (c.lastName) letters.add(c.lastName[0].toUpperCase());
    });
    return letters;
  }, [clients]);

  const sidebarItems = [
    { id: "reservations" as const, icon: LayoutDashboard, label: "Réservations", link: "/dashboard" },
    { id: "attribution" as const, icon: Grid3X3, label: "Attribution", link: "/dashboard/attribution" },
    { id: "calendar" as const, icon: CalendarDays, label: "Calendrier", link: "/dashboard/calendrier" },
    { id: "notifications" as const, icon: Bell, label: "Notifications", link: "/dashboard/notifications" },
    { id: "clients" as const, icon: Users, label: "Clients", link: null },
    { id: "stats" as const, icon: LineChart, label: "Statistiques", link: "/dashboard/statistiques" },
    { id: "settings" as const, icon: Settings, label: "Paramètres", link: "/dashboard/parametres" },
  ];

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      const date = parseISO(dateStr);
      return format(date, "d MMM yyyy", { locale: fr });
    } catch {
      return dateStr;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Chargement...</p>
      </div>
    );
  }

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
                      <span className="max-w-[200px] truncate">{selectedRestaurantData?.name || "Sélectionner un restaurant"}</span>
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
                        className={activeRestaurantId === r.id ? "bg-primary/10" : ""}
                      >
                        <Utensils className="mr-2 h-4 w-4" />
                        {r.name}
                        {activeRestaurantId === r.id && <span className="ml-auto text-primary">✓</span>}
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
                        item.id === "clients" 
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
                {/* Header */}
                <div className="flex items-center justify-between border-b px-4 py-4">
                  <div className="flex items-center gap-3">
                    <h1 className="text-lg font-semibold">Annuaire Clients</h1>
                    <span className="text-sm text-gray-500">({clients.length} clients)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Rechercher par nom, email ou téléphone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 w-80"
                        data-testid="client-search"
                      />
                    </div>
                  </div>
                </div>

                {/* Address book style layout */}
                <div className="flex">
                  {/* Clients list */}
                  <div className="flex-1 min-h-[500px] max-h-[calc(100vh-250px)] overflow-y-auto">
                    {clientsLoading ? (
                      <div className="p-8 text-center text-gray-500">
                        Chargement...
                      </div>
                    ) : filteredClients.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        {searchQuery || selectedLetter ? "Aucun client trouvé" : "Aucun client enregistré"}
                      </div>
                    ) : (
                      <div className="divide-y">
                        {filteredClients.map((client, index) => {
                          const currentLetter = client.lastName?.[0]?.toUpperCase() || "";
                          const prevLetter = index > 0 ? filteredClients[index - 1]?.lastName?.[0]?.toUpperCase() : "";
                          const showLetterHeader = currentLetter !== prevLetter;
                          
                          return (
                            <div key={client.id}>
                              {showLetterHeader && (
                                <div className="bg-gray-100 px-4 py-2 sticky top-0 border-b">
                                  <span className="text-lg font-bold text-primary">{currentLetter}</span>
                                </div>
                              )}
                              <div 
                                className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer border-l-4 border-transparent hover:border-primary transition-colors"
                                onClick={() => handleClientClick(client)}
                                data-testid={`client-${client.id}`}
                              >
                                {/* Avatar with initial */}
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center flex-shrink-0 shadow-sm">
                                  <span className="text-lg font-bold text-primary">
                                    {client.lastName?.[0]?.toUpperCase() || client.firstName?.[0]?.toUpperCase() || "?"}
                                  </span>
                                </div>

                                {/* Client info */}
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-gray-900">
                                    <span className="text-primary">{client.lastName?.toUpperCase()}</span>
                                    {" "}
                                    <span className="font-normal">{client.firstName}</span>
                                  </p>
                                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      {client.phone}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Mail className="h-3 w-3" />
                                      {client.email}
                                    </span>
                                  </div>
                                </div>

                                {/* Stats */}
                                <div className="flex items-center gap-4 text-sm">
                                  <div className="text-center px-3 py-1 bg-gray-50 rounded">
                                    <p className="font-bold text-primary">{client.visitCount}</p>
                                    <p className="text-xs text-gray-500">visites</p>
                                  </div>
                                  <div className="text-center min-w-[80px]">
                                    <p className="font-medium text-gray-700">{formatDate(client.lastVisit)}</p>
                                    <p className="text-xs text-gray-500">dernière visite</p>
                                  </div>
                                </div>

                                <ChevronRight className="h-5 w-5 text-gray-400" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Vertical alphabet index - Address book tabs */}
                  <div className="w-10 bg-gradient-to-b from-gray-50 to-gray-100 border-l flex flex-col items-center py-2 sticky top-0 h-fit">
                    <button
                      onClick={() => setSelectedLetter(null)}
                      className={`w-8 h-6 rounded-l-md text-[10px] font-bold transition-all mb-1 ${
                        !selectedLetter 
                          ? "bg-primary text-white shadow-md" 
                          : "text-gray-500 hover:bg-white hover:shadow"
                      }`}
                      data-testid="letter-all"
                    >
                      ALL
                    </button>
                    {alphabet.map(letter => (
                      <button
                        key={letter}
                        onClick={() => setSelectedLetter(letter)}
                        disabled={!availableLetters.has(letter)}
                        className={`w-8 h-5 rounded-l-md text-[11px] font-semibold transition-all relative ${
                          selectedLetter === letter 
                            ? "bg-primary text-white shadow-md z-10 scale-110" 
                            : availableLetters.has(letter)
                              ? "text-gray-700 hover:bg-white hover:shadow hover:scale-105"
                              : "text-gray-300 cursor-not-allowed"
                        }`}
                        data-testid={`letter-${letter}`}
                      >
                        {letter}
                        {availableLetters.has(letter) && selectedLetter !== letter && (
                          <span className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary/40 rounded-full"></span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>

        {/* Client detail dialog */}
        <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            {selectedClient && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xl">{selectedClient.firstName} {selectedClient.lastName}</p>
                      <p className="text-sm font-normal text-gray-500">Client depuis {formatDate(selectedClient.createdAt?.toString() || null)}</p>
                    </div>
                    <Link href={`/dashboard/nouvelle-reservation?firstName=${encodeURIComponent(selectedClient.firstName || '')}&lastName=${encodeURIComponent(selectedClient.lastName || '')}&email=${encodeURIComponent(selectedClient.email || '')}&phone=${encodeURIComponent(selectedClient.phone || '')}`}>
                      <Button size="sm" data-testid="add-reservation-from-client">
                        Ajouter une réservation
                      </Button>
                    </Link>
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6 mt-4">
                  {/* Contact info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-sm text-gray-700 mb-3">Coordonnées</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="h-4 w-4" />
                        <a href={`tel:${selectedClient.phone}`} className="hover:text-primary">
                          {selectedClient.phone}
                        </a>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="h-4 w-4" />
                        <a href={`mailto:${selectedClient.email}`} className="hover:text-primary">
                          {selectedClient.email}
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <Hash className="h-5 w-5 mx-auto mb-2 text-gray-500" />
                      <p className="text-2xl font-bold text-primary">{selectedClient.visitCount}</p>
                      <p className="text-sm text-gray-500">visites</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <Users className="h-5 w-5 mx-auto mb-2 text-gray-500" />
                      <p className="text-2xl font-bold text-primary">{selectedClient.avgGuests || "-"}</p>
                      <p className="text-sm text-gray-500">pers. en moyenne</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <Calendar className="h-5 w-5 mx-auto mb-2 text-gray-500" />
                      <p className="text-lg font-bold text-primary">{formatDate(selectedClient.bookings?.[0]?.date || null)}</p>
                      <p className="text-sm text-gray-500">dernière visite</p>
                    </div>
                  </div>

                  {/* Booking history */}
                  <div>
                    <h3 className="font-medium text-sm text-gray-700 mb-3">Historique des réservations</h3>
                    {selectedClient.bookings && selectedClient.bookings.length > 0 ? (
                      <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                        {selectedClient.bookings.map(booking => (
                          <div key={booking.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 text-sm">
                                <CalendarDays className="h-4 w-4 text-gray-400" />
                                <span className="font-medium">{formatDate(booking.date)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Clock className="h-4 w-4" />
                                <span>{booking.time}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Users className="h-4 w-4" />
                                <span>{booking.guests} pers.{booking.children > 0 ? ` (${booking.children} enf.)` : ''}</span>
                              </div>
                            </div>
                            <Badge variant={
                              booking.status === "cancelled" ? "destructive" :
                              booking.status === "noshow" ? "secondary" :
                              "default"
                            }>
                              {booking.status === "cancelled" ? "Annulée" :
                               booking.status === "noshow" ? "No-show" :
                               "Confirmée"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">Aucune réservation</p>
                    )}
                  </div>

                  {/* Notes */}
                  {selectedClient.notes && (
                    <div className="bg-amber-50 rounded-lg p-4">
                      <h3 className="font-medium text-sm text-amber-700 mb-2">Notes</h3>
                      <p className="text-sm text-amber-900">{selectedClient.notes}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
