import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { format, addDays, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  ChevronLeft, 
  ChevronRight, 
  Users,
  Clock,
  X,
  MapPin,
  GripVertical,
  LayoutDashboard,
  Grid3X3,
  CalendarDays,
  Bell,
  LineChart,
  Settings,
  Utensils,
  Store,
  UserCircle,
  LogOut,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Booking, Restaurant, FloorPlanData, FloorPlanTable, FloorPlanDecor } from "@shared/schema";
import { apiUrl } from "@/lib/queryClient";

const CANVAS_WIDTH = 700;
const CANVAS_HEIGHT = 400;

function DraggableBooking({ booking, isSelected, onClick }: { 
  booking: Booking; 
  isSelected: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `booking-${booking.id}`,
    data: { booking },
  });

  const style: React.CSSProperties = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 1000 : undefined,
    opacity: isDragging ? 0.5 : 1,
  } : {};

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={`p-3 rounded-lg border cursor-grab transition-all
        ${isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}
        ${isDragging ? "shadow-lg" : ""}`}
      data-testid={`unassigned-booking-${booking.id}`}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-gray-400" />
          <span className="font-medium">{booking.firstName} {booking.lastName}</span>
        </div>
        <Badge variant="outline" className="text-xs">
          <Users className="h-3 w-3 mr-1" />
          {booking.guests}{booking.children > 0 ? ` (${booking.children} enf.)` : ''}
        </Badge>
      </div>
      <div className="flex items-center text-sm text-gray-500 ml-6">
        <Clock className="h-3 w-3 mr-1" />
        {booking.time}
      </div>
    </div>
  );
}

function DroppableTable({ 
  item,
  booking,
  zoneId,
  isOver,
}: { 
  item: FloorPlanTable;
  booking?: Booking | null;
  zoneId: string;
  isOver: boolean;
}) {
  const { setNodeRef: setDroppableRef } = useDroppable({
    id: `table-${zoneId}-${item.id}`,
    data: { tableId: item.id, zoneId },
  });

  const { attributes, listeners, setNodeRef: setDraggableRef, transform, isDragging } = useDraggable({
    id: booking ? `assigned-booking-${booking.id}` : `empty-table-${item.id}`,
    data: { booking },
    disabled: !booking || !!booking.departureTime,
  });

  const scaleX = CANVAS_WIDTH / 800;
  const scaleY = CANVAS_HEIGHT / 500;
  
  const hasBooking = !!booking;
  
  const getTableColor = () => {
    if (!hasBooking) return "bg-emerald-600";
    if (booking.departureTime) return "bg-emerald-600";
    if (booking.billRequested) return "bg-yellow-500 animate-pulse";
    if (booking.arrivalTime) return "bg-lime-400 animate-pulse";
    return "bg-orange-500";
  };
  
  const baseStyle: React.CSSProperties = {
    position: "absolute",
    left: item.x * scaleX,
    top: item.y * scaleY,
    width: item.width * scaleX,
    height: item.height * scaleY,
    transform: `rotate(${item.rotation}deg)`,
  };

  const dragStyle: React.CSSProperties = transform ? {
    ...baseStyle,
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(${item.rotation}deg)`,
    zIndex: 1000,
    opacity: 0.8,
  } : baseStyle;

  return (
    <div
      ref={(node) => {
        setDroppableRef(node);
        setDraggableRef(node);
      }}
      style={dragStyle}
      className={`flex flex-col items-center justify-center text-white text-xs font-medium shadow-md transition-all
        ${item.shape === "round" ? "rounded-full" : item.shape === "rectangle" ? "rounded-lg" : "rounded-md"}
        ${isOver ? "ring-4 ring-blue-400 ring-offset-2 scale-105" : ""}
        ${isDragging ? "shadow-2xl cursor-grabbing" : hasBooking && !booking?.departureTime ? "cursor-grab" : ""}
        ${getTableColor()}`}
      data-testid={`assignment-table-${item.id}`}
      {...(hasBooking && !booking?.departureTime ? { ...listeners, ...attributes } : {})}
    >
      <span className="font-bold text-[10px]">{item.name}</span>
      {hasBooking && (
        <span className="text-[8px] opacity-90 truncate max-w-full px-1">
          {booking.firstName}
        </span>
      )}
    </div>
  );
}

function DecorItem({ item }: { item: FloorPlanDecor }) {
  const scaleX = CANVAS_WIDTH / 800;
  const scaleY = CANVAS_HEIGHT / 500;
  
  const style: React.CSSProperties = {
    position: "absolute",
    left: item.x * scaleX,
    top: item.y * scaleY,
    width: item.width * scaleX,
    height: item.height * scaleY,
    transform: `rotate(${item.rotation}deg)`,
  };

  const decorStyles: Record<string, string> = {
    door: "bg-amber-700",
    plant: "bg-green-500",
    bar: "bg-purple-600",
    wall: "bg-gray-700",
    window: "bg-sky-400",
  };

  return (
    <div
      style={style}
      className={`${decorStyles[item.decorType] || "bg-gray-400"} 
        ${item.decorType === "plant" ? "rounded-full" : "rounded-sm"} opacity-70`}
    />
  );
}

function BookingDragOverlay({ booking }: { booking: Booking }) {
  return (
    <div className="p-3 rounded-lg border border-blue-500 bg-blue-100 shadow-xl cursor-grabbing w-64">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-gray-400" />
          <span className="font-medium">{booking.firstName} {booking.lastName}</span>
        </div>
        <Badge variant="outline" className="text-xs">
          <Users className="h-3 w-3 mr-1" />
          {booking.guests}{booking.children > 0 ? ` (${booking.children} enf.)` : ''}
        </Badge>
      </div>
      <div className="flex items-center text-sm text-gray-500 ml-6">
        <Clock className="h-3 w-3 mr-1" />
        {booking.time}
      </div>
    </div>
  );
}

// Determine current service based on time
function getCurrentService(): "lunch" | "dinner" {
  const now = new Date();
  const hour = now.getHours();
  // If it's before 15h, show lunch. After 15h, show dinner.
  // If lunch is over (after 15h), automatically switch to dinner
  return hour < 15 ? "lunch" : "dinner";
}

export default function Assignments() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedService, setSelectedService] = useState<"lunch" | "dinner">(getCurrentService());
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [activeDragBooking, setActiveDragBooking] = useState<Booking | null>(null);
  const [overTableId, setOverTableId] = useState<string | null>(null);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const { data: user } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  const { data: restaurants = [] } = useQuery<Restaurant[]>({
    queryKey: ["/api/my-restaurants"],
    enabled: !!user,
  });

  // Set first restaurant as default when restaurants load
  useEffect(() => {
    if (restaurants.length > 0 && selectedRestaurantId === null) {
      setSelectedRestaurantId(restaurants[0].id);
    }
  }, [restaurants, selectedRestaurantId]);

  // Reset zone when restaurant changes
  useEffect(() => {
    setActiveZoneId(null);
  }, [selectedRestaurantId]);

  const restaurant = restaurants.find(r => r.id === selectedRestaurantId) || restaurants[0];

  const { data: bookings = [] } = useQuery<Booking[]>({
    queryKey: [`/api/bookings/restaurant/${restaurant?.id}`],
    enabled: !!restaurant?.id,
  });

  // Count pending notifications for sidebar badge
  const pendingNotifications = useMemo(() => {
    if (bookings.length === 0) {
      const cached = localStorage.getItem("pendingNotificationsCount");
      return cached ? parseInt(cached, 10) : 0;
    }
    const count = bookings.filter(b => 
      b.status === "pending" && 
      !b.clientIp?.startsWith("owner-")
    ).length;
    localStorage.setItem("pendingNotificationsCount", String(count));
    return count;
  }, [bookings]);

  const { data: floorPlanResponse } = useQuery<FloorPlanData>({
    queryKey: [`/api/floor-plans/restaurant/${restaurant?.id}`],
    enabled: !!restaurant?.id,
  });
  
  const floorPlanData = floorPlanResponse as FloorPlanData | undefined;

  const assignTableMutation = useMutation({
    mutationFn: async ({ bookingId, tableId, zoneId }: { bookingId: number; tableId: string | null; zoneId: string | null }) => {
      const res = await fetch(apiUrl(`/api/bookings/${bookingId}/table`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tableId, zoneId }),
      });
      if (!res.ok) throw new Error("Failed to assign table");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookings/restaurant/${restaurant?.id}`] });
      toast.success("Table assignée avec succès");
      setSelectedBookingId(null);
    },
    onError: () => {
      toast.error("Erreur lors de l'assignation");
    },
  });

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  
  const filteredBookings = bookings.filter(b => {
    if (b.date !== dateStr) return false;
    if (b.status === "cancelled" || b.status === "noshow") return false;
    const hour = parseInt(b.time.split(":")[0]);
    if (selectedService === "lunch") {
      return hour < 15;
    }
    // dinner
    return hour >= 15;
  });

  const zones = floorPlanData?.zones || [];
  const currentZone = zones.find(z => z.id === activeZoneId) || zones[0];

  useEffect(() => {
    if (zones.length > 0 && !activeZoneId) {
      setActiveZoneId(zones[0].id);
    }
  }, [zones, activeZoneId]);

  const getBookingForTable = (tableId: string, zoneId: string) => {
    return filteredBookings.find(b => b.tableId === tableId && b.zoneId === zoneId && !b.departureTime);
  };

  const handleUnassign = (bookingId: number) => {
    assignTableMutation.mutate({
      bookingId,
      tableId: null,
      zoneId: null,
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const bookingData = event.active.data.current?.booking as Booking | undefined;
    if (bookingData) {
      setActiveDragBooking(bookingData);
    }
  };

  const handleDragOver = (event: any) => {
    const overId = event.over?.id as string | undefined;
    if (overId && overId.startsWith("table-")) {
      setOverTableId(overId);
    } else {
      setOverTableId(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragBooking(null);
    setOverTableId(null);

    const { active, over } = event;
    
    if (!over) return;
    
    const overId = over.id as string;
    if (!overId.startsWith("table-")) return;
    
    const bookingData = active.data.current?.booking as Booking;
    const tableData = over.data.current as { tableId: string; zoneId: string };
    
    if (!bookingData || !tableData) return;
    
    // Don't do anything if dropping on the same table
    if (bookingData.tableId === tableData.tableId && bookingData.zoneId === tableData.zoneId) {
      return;
    }
    
    const existingBooking = getBookingForTable(tableData.tableId, tableData.zoneId);
    
    if (existingBooking) {
      // Swap the two bookings
      // First, move the existing booking to the dragged booking's original table (or unassign if from sidebar)
      if (bookingData.tableId && bookingData.zoneId) {
        // Swap tables
        assignTableMutation.mutate({
          bookingId: existingBooking.id,
          tableId: bookingData.tableId,
          zoneId: bookingData.zoneId,
        });
      } else {
        // The dragged booking was unassigned, unassign the existing one
        assignTableMutation.mutate({
          bookingId: existingBooking.id,
          tableId: null,
          zoneId: null,
        });
      }
      toast.success("Tables échangées");
    }
    
    // Move the dragged booking to the target table
    assignTableMutation.mutate({
      bookingId: bookingData.id,
      tableId: tableData.tableId,
      zoneId: tableData.zoneId,
    });
  };

  const unassignedBookings = filteredBookings.filter(b => !b.tableId && !b.departureTime);
  const assignedBookings = filteredBookings.filter(b => b.tableId && !b.departureTime);
  const finishedBookings = filteredBookings.filter(b => b.departureTime);

  const sidebarItems = [
    { id: "reservations" as const, icon: LayoutDashboard, label: "Réservations", link: "/dashboard" },
    { id: "attribution" as const, icon: Grid3X3, label: "Attribution", link: null },
    { id: "calendar" as const, icon: CalendarDays, label: "Calendrier", link: "/dashboard/calendrier" },
    { id: "notifications" as const, icon: Bell, label: "Notifications", link: "/dashboard/notifications" },
    { id: "clients" as const, icon: Users, label: "Clients", link: "/dashboard/clients" },
    { id: "stats" as const, icon: LineChart, label: "Statistiques", link: "/dashboard/statistiques" },
    { id: "settings" as const, icon: Settings, label: "Paramètres", link: "/dashboard/parametres" },
  ];

  return (
    <DndContext 
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
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
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" className="font-medium">
                        {format(selectedDate, "EEEE d MMMM", { locale: fr })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="center">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        locale={fr}
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <Select value={selectedService} onValueChange={(v) => setSelectedService(v as "lunch" | "dinner")}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lunch">Midi</SelectItem>
                    <SelectItem value="dinner">Soir</SelectItem>
                  </SelectContent>
                </Select>

                {restaurants.length > 1 && (
                  <Select 
                    value={selectedRestaurantId?.toString() || ""} 
                    onValueChange={v => setSelectedRestaurantId(parseInt(v))}
                  >
                    <SelectTrigger className="w-48" data-testid="select-restaurant">
                      <Store className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Établissement" />
                    </SelectTrigger>
                    <SelectContent>
                      {restaurants.map(r => (
                        <SelectItem key={r.id} value={r.id.toString()}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

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
                        className="w-12 h-12 rounded-lg flex items-center justify-center transition-colors bg-primary/10 text-primary"
                        data-testid={`sidebar-${item.id}`}
                      >
                        <item.icon className="h-5 w-5" />
                      </button>
                    )}
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              ))}
            </aside>

            <div className="flex-1 ml-16 overflow-auto">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-2">
                    {zones.map(zone => (
                      <Button
                        key={zone.id}
                        variant={activeZoneId === zone.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setActiveZoneId(zone.id)}
                      >
                        {zone.name}
                      </Button>
                    ))}
                  </div>
                  <Link href="/dashboard/nouvelle-reservation">
                    <Button size="sm" className="gap-1" data-testid="btn-add-reservation">
                      <Plus className="h-4 w-4" />
                      Ajouter une réservation
                    </Button>
                  </Link>
                </div>

                {currentZone ? (
                  <Card className="mb-6">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span>{currentZone.name}</span>
                        {activeDragBooking && (
                          <Badge className="bg-blue-500">
                            Déposez sur une table verte
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div
                        className="relative border-2 rounded-lg bg-gray-100 mx-auto"
                        style={{
                          width: CANVAS_WIDTH,
                          height: CANVAS_HEIGHT,
                          backgroundImage: `
                            linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                            linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
                          `,
                          backgroundSize: "17.5px 16px",
                        }}
                        data-testid="assignment-floor-plan"
                      >
                        {currentZone.items.map(item => {
                          if (item.type === "table") {
                            const tableItem = item as FloorPlanTable;
                            const isOverThisTable = overTableId === `table-${currentZone.id}-${item.id}`;
                            return (
                              <DroppableTable
                                key={item.id}
                                item={tableItem}
                                booking={getBookingForTable(item.id, currentZone.id)}
                                zoneId={currentZone.id}
                                isOver={isOverThisTable}
                              />
                            );
                          } else {
                            return <DecorItem key={item.id} item={item as FloorPlanDecor} />;
                          }
                        })}
                      </div>
                      
                      <div className="flex items-center justify-center flex-wrap gap-4 mt-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-emerald-600" />
                          <span>Libre</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-orange-500" />
                          <span>Réservée</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-lime-400 animate-pulse" />
                          <span>Client arrivé</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-yellow-500 animate-pulse" />
                          <span>Note demandée</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="flex items-center justify-center h-64 mb-6">
                    <CardContent className="text-center">
                      <p className="text-gray-500 mb-4">Aucun plan de salle configuré</p>
                      <Link href="/dashboard/parametres">
                        <Button>Créer un plan de salle</Button>
                      </Link>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">
                        RÉSERVATIONS À ASSIGNER ({unassignedBookings.length})
                      </CardTitle>
                      <p className="text-xs text-gray-400">Glissez une réservation sur une table</p>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-64">
                        <div className="space-y-2">
                          {unassignedBookings.map(booking => (
                            <DraggableBooking
                              key={booking.id}
                              booking={booking}
                              isSelected={selectedBookingId === booking.id}
                              onClick={() => setSelectedBookingId(selectedBookingId === booking.id ? null : booking.id)}
                            />
                          ))}
                          {unassignedBookings.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-4">
                              Toutes les réservations sont assignées
                            </p>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">
                        TABLES ASSIGNÉES ({assignedBookings.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-64">
                        <div className="space-y-2">
                          {assignedBookings.map(booking => {
                            const zone = zones.find(z => z.id === booking.zoneId);
                            const table = zone?.items.find(i => i.id === booking.tableId) as FloorPlanTable | undefined;
                            
                            return (
                              <div
                                key={booking.id}
                                className="p-3 rounded-lg border border-orange-200 bg-orange-50"
                                data-testid={`assigned-booking-${booking.id}`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium">{booking.firstName} {booking.lastName}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleUnassign(booking.id)}
                                    data-testid={`unassign-${booking.id}`}
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    Libérer
                                  </Button>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                  <span className="flex items-center">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {booking.time}
                                  </span>
                                  <span className="flex items-center">
                                    <Users className="h-3 w-3 mr-1" />
                                    {booking.guests}{booking.children > 0 ? ` (${booking.children} enf.)` : ''}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="secondary" className="text-xs">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    {zone?.name} - {table?.name || "Table"}
                                  </Badge>
                                </div>
                              </div>
                            );
                          })}
                          {assignedBookings.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-4">
                              Aucune table assignée
                            </p>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">
                        RÉSERVATIONS TERMINÉES ({finishedBookings.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-64">
                        <div className="space-y-2">
                          {finishedBookings.map(booking => {
                            const zone = zones.find(z => z.id === booking.zoneId);
                            const table = zone?.items.find(i => i.id === booking.tableId) as FloorPlanTable | undefined;
                            
                            return (
                              <div
                                key={booking.id}
                                className="p-3 rounded-lg border border-gray-200 bg-gray-50"
                                data-testid={`finished-booking-${booking.id}`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-gray-500">{booking.firstName} {booking.lastName}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-400">
                                  <span className="flex items-center">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {booking.time} → {booking.departureTime}
                                  </span>
                                  <span className="flex items-center">
                                    <Users className="h-3 w-3 mr-1" />
                                    {booking.guests}
                                  </span>
                                  {table && (
                                    <Badge variant="outline" className="text-xs text-gray-400">
                                      {table.name}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {finishedBookings.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-4">
                              Aucune réservation terminée
                            </p>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TooltipProvider>

      <DragOverlay>
        {activeDragBooking && <BookingDragOverlay booking={activeDragBooking} />}
      </DragOverlay>
    </DndContext>
  );
}
