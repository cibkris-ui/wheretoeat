import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  Calendar as CalendarIcon, 
  Users,
  X,
  ChevronLeft,
  ChevronRight,
  Tag,
  Star,
  AlertTriangle,
  Wallet,
  Heart,
  MapPin,
  Wine
} from "lucide-react";

const CLIENT_TAGS = {
  fidelite: {
    label: "Fidélité client",
    tags: ["VIP", "Occasionnel", "Standard", "Habitué"]
  },
  risque: {
    label: "Niveau de risque",
    tags: ["Attention"]
  },
  budget: {
    label: "Budget",
    tags: ["Budget élevé", "Budget moyen", "Budget serré", "Sensible aux promotions"]
  },
  allergies: {
    label: "Allergies et intolérances",
    tags: ["Alcool", "Arachides", "Noix d'arbres", "Fruits à coque", "Lait", "Œufs", "Blé", "Poisson", "Soja", "Fruits de mer", "Allergie", "Allium", "Amande", "Avocat", "Poivron", "Céleri", "Fromage", "Chocolat", "Coriandre", "Crustacés", "Concombre", "Ail", "Noisette", "Kiwi", "Intolérance au lactose", "Agneau"]
  },
  regime: {
    label: "Régimes alimentaires",
    tags: ["Sans produits laitiers", "Sans gluten", "Casher", "Paléo", "Sans alcool", "Végétalien", "Végétarien", "Halal", "Diabétique", "Pescétarien"]
  },
  relation: {
    label: "Relation avec le client",
    tags: ["Ami/famille", "Influenceur", "Employé", "Célébrité", "Local", "Partenaire commercial", "Guide", "Ami du chef", "Ami du propriétaire", "Touriste"]
  },
  placement: {
    label: "Préférence de placement",
    tags: ["À la fenêtre", "Au bar", "Banquette", "Extérieur", "Espace fumeurs", "Espace non-fumeurs", "Table calme", "Accès en fauteuil roulant"]
  },
  autre: {
    label: "Autre",
    tags: ["Amateur de vin", "Avec animal", "Avec enfants"]
  }
};
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay, isWeekend, isBefore, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import type { Restaurant, Booking, FloorPlanData, FloorPlanTable } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

const LUNCH_SLOTS = ["12:00", "12:15", "12:30", "12:45", "13:00", "13:15"];
const DINNER_SLOTS = [
  "18:00", "18:15", "18:30", "18:45",
  "19:00", "19:15", "19:30", "19:45",
  "20:00", "20:15", "20:30", "20:45",
  "21:00", "21:15", "21:30", "21:45"
];

const DEFAULT_CAPACITY = 40;

export default function NewBooking() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<number | null>(null);
  const [serviceType, setServiceType] = useState<"Lunch" | "Dinner">("Dinner");
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isTimeOpen, setIsTimeOpen] = useState(false);
  const [isTagsDialogOpen, setIsTagsDialogOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  
  const [formData, setFormData] = useState({
    lastName: "",
    firstName: "",
    phone: "",
    phoneCode: "+41",
    email: "",
    guests: 2,
    children: 0,
    notes: "",
    tableId: "",
    zoneId: "",
    occasion: "",
    duration: "1h30",
    tags: "",
    status: "confirmed" as "confirmed" | "waiting",
  });

  // Pre-fill form from URL parameters (from client page)
  useEffect(() => {
    if (searchString) {
      const params = new URLSearchParams(searchString);
      const firstName = params.get("firstName");
      const lastName = params.get("lastName");
      const email = params.get("email");
      const phone = params.get("phone");
      
      if (firstName || lastName || email || phone) {
        setFormData(prev => ({
          ...prev,
          firstName: firstName || prev.firstName,
          lastName: lastName || prev.lastName,
          email: email || prev.email,
          phone: phone?.replace(/^\+41/, "") || prev.phone,
          phoneCode: phone?.startsWith("+41") ? "+41" : prev.phoneCode,
        }));
      }
    }
  }, [searchString]);

  const { data: myRestaurants = [] } = useQuery<Restaurant[]>({
    queryKey: ["/api/my-restaurants"],
    enabled: isAuthenticated,
  });

  const activeRestaurantId = selectedRestaurant || myRestaurants[0]?.id;
  const activeRestaurant = myRestaurants.find(r => r.id === activeRestaurantId);
  const restaurantCapacity = activeRestaurant?.capacity || DEFAULT_CAPACITY;

  const { data: existingBookings = [] } = useQuery<Booking[]>({
    queryKey: ["/api/restaurants", activeRestaurantId, "bookings"],
    queryFn: async () => {
      if (!activeRestaurantId) return [];
      const res = await fetch(apiUrl(`/api/bookings/restaurant/${activeRestaurantId}`), { credentials: "include" });
      return res.ok ? res.json() : [];
    },
    enabled: !!activeRestaurantId,
  });

  const { data: floorPlanData } = useQuery<FloorPlanData>({
    queryKey: [`/api/floor-plans/restaurant/${activeRestaurantId}`],
    enabled: !!activeRestaurantId,
  });

  const allTables = useMemo(() => {
    if (!floorPlanData?.zones) return [];
    const tables: { tableId: string; zoneId: string; name: string; zoneName: string; capacity: number }[] = [];
    floorPlanData.zones.forEach(zone => {
      zone.items.forEach(item => {
        if (item.type === "table") {
          const table = item as FloorPlanTable;
          tables.push({
            tableId: table.id,
            zoneId: zone.id,
            name: table.name,
            zoneName: zone.name,
            capacity: table.capacity,
          });
        }
      });
    });
    return tables;
  }, [floorPlanData]);

  const bookingsForDate = useMemo(() => {
    return existingBookings.filter(b => b.date === selectedDate);
  }, [existingBookings, selectedDate]);

  const getSlotInfo = (time: string) => {
    const bookingsAtTime = bookingsForDate.filter(b => {
      const bookingTime = b.time.substring(0, 5);
      return bookingTime === time;
    });
    const totalGuests = bookingsAtTime.reduce((sum, b) => sum + b.guests, 0);
    return {
      reserved: totalGuests,
      available: restaurantCapacity - totalGuests,
    };
  };

  const totalReserved = bookingsForDate.reduce((sum, b) => sum + b.guests, 0);

  const createBookingMutation = useMutation({
    mutationFn: async () => {
      if (!activeRestaurantId || !selectedTime) throw new Error("Données manquantes");
      return apiRequest("POST", "/api/bookings/owner", {
        restaurantId: activeRestaurantId,
        date: selectedDate,
        time: selectedTime,
        guests: formData.guests,
        children: formData.children,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || "",
        phone: formData.phone ? formData.phoneCode + formData.phone : "",
        tableId: formData.tableId || null,
        zoneId: formData.zoneId || null,
        status: formData.status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/all-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", activeRestaurantId, "bookings"] });
      toast({ title: "Réservation créée avec succès!" });
      setLocation("/dashboard");
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!formData.lastName || !formData.firstName) {
      toast({ title: "Veuillez remplir le nom et le prénom", variant: "destructive" });
      return;
    }
    if (!selectedTime) {
      toast({ title: "Veuillez sélectionner une heure", variant: "destructive" });
      return;
    }
    createBookingMutation.mutate();
  };

  const currentSlots = serviceType === "Lunch" ? LUNCH_SLOTS : DINNER_SLOTS;
  const parsedDate = parseISO(selectedDate);
  const dayName = format(parsedDate, "EEEE d MMMM", { locale: fr });

  const getDurationDisplay = () => {
    if (!selectedTime) return "";
    const [h, m] = selectedTime.split(":").map(Number);
    const durationMinutes = formData.duration === "1h" ? 60 : formData.duration === "1h15" ? 75 : formData.duration === "1h30" ? 90 : formData.duration === "2h" ? 120 : formData.duration === "2h30" ? 150 : 180;
    const endMinutes = h * 60 + m + durationMinutes;
    const endH = Math.floor(endMinutes / 60) % 24;
    const endM = endMinutes % 60;
    return `(${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")})`;
  };

  const missingFields = !formData.lastName || !formData.firstName;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="flex items-center justify-between h-14 px-4">
          <div></div>
          <h1 className="text-lg font-semibold text-gray-800">Nouvelle réservation</h1>
          <button 
            onClick={() => setLocation("/dashboard")} 
            className="p-2 hover:bg-gray-100 rounded"
            data-testid="btn-close"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Left panel - Time slots */}
        <div className="w-[380px] bg-white border-r p-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold capitalize text-gray-800">{dayName} - {serviceType}</h2>
            <div className="flex items-center justify-center gap-4 mt-2 text-sm">
              <span className="text-teal-600">Total réservé : {totalReserved} p.</span>
              <span className="text-gray-500">Total réservable : {restaurantCapacity} p.</span>
            </div>
          </div>

          {/* Service type toggle */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={serviceType === "Lunch" ? "default" : "outline"}
              size="sm"
              onClick={() => { setServiceType("Lunch"); setSelectedTime(null); }}
              className={serviceType === "Lunch" ? "bg-teal-600 hover:bg-teal-700" : ""}
            >
              Lunch
            </Button>
            <Button
              variant={serviceType === "Dinner" ? "default" : "outline"}
              size="sm"
              onClick={() => { setServiceType("Dinner"); setSelectedTime(null); }}
              className={serviceType === "Dinner" ? "bg-teal-600 hover:bg-teal-700" : ""}
            >
              Dinner
            </Button>
          </div>

          {/* Time slots grid */}
          <div className="grid grid-cols-4 gap-2">
            {currentSlots.map(time => {
              const info = getSlotInfo(time);
              const isSelected = selectedTime === time;
              return (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className={`p-3 text-center rounded border transition-all ${
                    isSelected 
                      ? "bg-teal-600 text-white border-teal-600" 
                      : "bg-gray-50 hover:bg-teal-50 border-gray-200 hover:border-teal-300"
                  }`}
                  data-testid={`slot-${time}`}
                >
                  <div className="text-sm font-medium">{time}</div>
                  <div className="text-xs flex items-center justify-center gap-1 mt-1">
                    <Users className="h-3 w-3" />
                    <span>{info.reserved}/{restaurantCapacity}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right panel - Two columns */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="grid grid-cols-2 gap-8 max-w-4xl">
            {/* Détails de la réservation */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-4">Détails de la réservation</h3>
              
              <div className="space-y-4">
                <div>
                  <Label className="flex items-center gap-1 text-gray-600 text-sm">
                    <CalendarIcon className="h-4 w-4" />
                    Date
                  </Label>
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <button 
                        className="w-full mt-1 flex items-center justify-between px-3 py-2 border-2 border-teal-600 rounded-md bg-white text-left hover:bg-gray-50"
                        data-testid="select-date"
                      >
                        <span className="font-medium">
                          {format(parseISO(selectedDate), "EEE. d MMMM yyyy", { locale: fr })}
                        </span>
                        <ChevronRight className="h-4 w-4 rotate-90 text-gray-400" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-4" align="start">
                      {/* Calendar header */}
                      <div className="flex items-center justify-between mb-4">
                        <button 
                          onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <ChevronLeft className="h-5 w-5 text-gray-600" />
                        </button>
                        <span className="font-medium text-gray-800">
                          {format(calendarMonth, "MMMM yyyy", { locale: fr })}
                        </span>
                        <button 
                          onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <ChevronRight className="h-5 w-5 text-gray-600" />
                        </button>
                      </div>

                      {/* Weekday headers */}
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {["lu", "ma", "me", "je", "ve", "sa", "di"].map(day => (
                          <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                            {day}
                          </div>
                        ))}
                      </div>

                      {/* Calendar days */}
                      <div className="grid grid-cols-7 gap-1">
                        {(() => {
                          const monthStart = startOfMonth(calendarMonth);
                          const monthEnd = endOfMonth(calendarMonth);
                          const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
                          const startDayOfWeek = getDay(monthStart);
                          const emptyDays = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
                          const today = startOfDay(new Date());

                          return (
                            <>
                              {[...Array(emptyDays)].map((_, i) => (
                                <div key={`empty-${i}`} className="w-9 h-9" />
                              ))}
                              {days.map(day => {
                                const dateStr = format(day, "yyyy-MM-dd");
                                const isSelected = selectedDate === dateStr;
                                const isPast = isBefore(day, today);
                                const isWeekendDay = isWeekend(day);

                                return (
                                  <button
                                    key={dateStr}
                                    onClick={() => {
                                      if (!isPast) {
                                        setSelectedDate(dateStr);
                                        setIsCalendarOpen(false);
                                      }
                                    }}
                                    disabled={isPast}
                                    className={`w-9 h-9 rounded text-sm flex items-center justify-center transition-colors ${
                                      isSelected
                                        ? "bg-teal-600 text-white"
                                        : isPast
                                        ? "text-gray-300 cursor-not-allowed"
                                        : isWeekendDay
                                        ? "text-gray-400 hover:bg-gray-100"
                                        : "text-gray-700 hover:bg-teal-50 border border-teal-200"
                                    }`}
                                    data-testid={`calendar-day-${dateStr}`}
                                  >
                                    {format(day, "d")}
                                  </button>
                                );
                              })}
                            </>
                          );
                        })()}
                      </div>

                      {/* Multiple dates option */}
                      <div className="mt-4 pt-4 border-t">
                        <label className="flex items-center gap-2 text-sm text-gray-600">
                          <input type="checkbox" className="rounded" disabled />
                          Sélectionner plusieurs dates
                        </label>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label className="flex items-center gap-1 text-gray-600 text-sm">
                    <Users className="h-4 w-4" />
                    Personnes
                  </Label>
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        onClick={() => setFormData(prev => ({ ...prev, guests: n }))}
                        className={`w-10 h-10 rounded border text-sm font-medium transition-all ${
                          formData.guests === n 
                            ? "bg-teal-600 text-white border-teal-600" 
                            : "bg-white border-gray-300 hover:border-teal-400"
                        }`}
                        data-testid={`guests-${n}`}
                      >
                        {n}
                      </button>
                    ))}
                    <Select
                      value={formData.guests > 5 ? formData.guests.toString() : ""}
                      onValueChange={v => setFormData(prev => ({ ...prev, guests: parseInt(v) }))}
                    >
                      <SelectTrigger className="w-14 h-10">
                        <SelectValue placeholder="..." />
                      </SelectTrigger>
                      <SelectContent>
                        {[6, 7, 8, 9, 10, 12, 15, 20].map(n => (
                          <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-gray-600 text-sm">Dont enfants</Label>
                  <div className="flex gap-1 mt-1">
                    {[0, 1, 2, 3, 4].map(n => (
                      <button
                        key={n}
                        onClick={() => setFormData(prev => ({ ...prev, children: n }))}
                        className={`w-10 h-10 rounded border text-sm font-medium transition-all ${
                          formData.children === n 
                            ? "bg-teal-600 text-white border-teal-600" 
                            : "bg-white border-gray-300 hover:border-teal-400"
                        }`}
                        data-testid={`children-${n}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="flex items-center gap-1 text-gray-600 text-sm">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12,6 12,12 16,14" />
                    </svg>
                    Heure
                  </Label>
                  <Popover open={isTimeOpen} onOpenChange={setIsTimeOpen}>
                    <PopoverTrigger asChild>
                      <button 
                        className="w-full mt-1 flex items-center justify-between px-3 py-2 border-2 border-teal-600 rounded-md bg-white text-left hover:bg-gray-50"
                        data-testid="select-time"
                      >
                        <span className="font-medium">
                          {selectedTime ? `${selectedTime} - ${serviceType}` : "Sélectionner"}
                        </span>
                        <ChevronRight className="h-4 w-4 rotate-90 text-gray-400" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-4" align="start">
                      {/* Lunch section */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-gray-700">Lunch</span>
                          <span className="text-xs text-gray-400">0/40p</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {LUNCH_SLOTS.map(time => {
                            const info = getSlotInfo(time);
                            const isSelected = selectedTime === time && serviceType === "Lunch";
                            return (
                              <button
                                key={`lunch-${time}`}
                                onClick={() => {
                                  setSelectedTime(time);
                                  setServiceType("Lunch");
                                  setIsTimeOpen(false);
                                }}
                                className={`p-2 text-center rounded border transition-all ${
                                  isSelected 
                                    ? "bg-teal-600 text-white border-teal-600" 
                                    : "bg-white hover:bg-teal-50 border-gray-200 hover:border-teal-300"
                                }`}
                              >
                                <div className="text-sm font-medium">{time}</div>
                                <div className="text-xs flex items-center justify-center gap-0.5 text-gray-500">
                                  <Users className="h-3 w-3" />
                                  <span>{info.reserved}/{restaurantCapacity}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Dinner section */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-gray-700">Dinner</span>
                          <span className="text-xs text-gray-400">0/40p</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {DINNER_SLOTS.map(time => {
                            const info = getSlotInfo(time);
                            const isSelected = selectedTime === time && serviceType === "Dinner";
                            return (
                              <button
                                key={`dinner-${time}`}
                                onClick={() => {
                                  setSelectedTime(time);
                                  setServiceType("Dinner");
                                  setIsTimeOpen(false);
                                }}
                                className={`p-2 text-center rounded border transition-all ${
                                  isSelected 
                                    ? "bg-teal-600 text-white border-teal-600" 
                                    : "bg-white hover:bg-teal-50 border-gray-200 hover:border-teal-300"
                                }`}
                              >
                                <div className="text-sm font-medium">{time}</div>
                                <div className="text-xs flex items-center justify-center gap-0.5 text-gray-500">
                                  <Users className="h-3 w-3" />
                                  <span>{info.reserved}/{restaurantCapacity}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label className="text-gray-600 text-sm">Notes</Label>
                  <Textarea
                    placeholder="Aucune information sensible"
                    value={formData.notes}
                    onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="mt-1 resize-none"
                    rows={2}
                    data-testid="input-notes"
                  />
                </div>

                <div>
                  <Label className="text-gray-600 text-sm">Table</Label>
                  <Select 
                    value={formData.tableId ? `${formData.zoneId}|${formData.tableId}` : ""} 
                    onValueChange={v => {
                      if (!v || v === "none") {
                        setFormData(prev => ({ ...prev, tableId: "", zoneId: "" }));
                      } else {
                        const [zoneId, tableId] = v.split("|");
                        setFormData(prev => ({ ...prev, tableId, zoneId }));
                      }
                    }}
                  >
                    <SelectTrigger className="mt-1" data-testid="select-table">
                      <SelectValue placeholder="Choisir une table" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Pas de table assignée</SelectItem>
                      {allTables.map(table => (
                        <SelectItem 
                          key={`${table.zoneId}|${table.tableId}`} 
                          value={`${table.zoneId}|${table.tableId}`}
                        >
                          {table.name} ({table.zoneName}) - {table.capacity} pers.
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-600 text-sm">Occasions spéciales</Label>
                  <Select value={formData.occasion} onValueChange={v => setFormData(prev => ({ ...prev, occasion: v }))}>
                    <SelectTrigger className="mt-1" data-testid="select-occasion">
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune</SelectItem>
                      <SelectItem value="birthday">Anniversaire</SelectItem>
                      <SelectItem value="romantic">Dîner romantique</SelectItem>
                      <SelectItem value="business">Repas d'affaires</SelectItem>
                      <SelectItem value="celebration">Célébration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-600 text-sm">Durée</Label>
                  <Select value={formData.duration} onValueChange={v => setFormData(prev => ({ ...prev, duration: v }))}>
                    <SelectTrigger className="mt-1" data-testid="select-duration">
                      <SelectValue>
                        {formData.duration === "1h" ? "1 h 00 min" : 
                         formData.duration === "1h15" ? "1 h 15 min" :
                         formData.duration === "1h30" ? "1 h 30 min" :
                         formData.duration === "2h" ? "2 h 00 min" :
                         formData.duration === "2h30" ? "2 h 30 min" : "3 h 00 min"} {getDurationDisplay()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">1 h 00 min</SelectItem>
                      <SelectItem value="1h15">1 h 15 min</SelectItem>
                      <SelectItem value="1h30">1 h 30 min</SelectItem>
                      <SelectItem value="2h">2 h 00 min</SelectItem>
                      <SelectItem value="2h30">2 h 30 min</SelectItem>
                      <SelectItem value="3h">3 h 00 min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              </div>
            </div>

            {/* Informations sur le client */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-4">Informations sur le client</h3>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-red-500 text-sm">* Nom de famille</Label>
                  <Input
                    value={formData.lastName}
                    onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="mt-1"
                    data-testid="input-lastname"
                  />
                </div>

                <div>
                  <Label className="text-red-500 text-sm">* Prénom</Label>
                  <Input
                    value={formData.firstName}
                    onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="mt-1"
                    data-testid="input-firstname"
                  />
                </div>

                <div>
                  <Label className="text-gray-600 text-sm">Téléphone</Label>
                  <div className="flex gap-2 mt-1">
                    <Select 
                      value={formData.phoneCode} 
                      onValueChange={v => setFormData(prev => ({ ...prev, phoneCode: v }))}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="+41">🇨🇭 +41</SelectItem>
                        <SelectItem value="+33">🇫🇷 +33</SelectItem>
                        <SelectItem value="+49">🇩🇪 +49</SelectItem>
                        <SelectItem value="+39">🇮🇹 +39</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={formData.phone}
                      onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder=""
                      className="flex-1"
                      data-testid="input-phone"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-gray-600 text-sm">Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="exemple@email.com"
                    className="mt-1"
                    data-testid="input-email"
                  />
                </div>

                <div>
                  <Label className="text-gray-600 text-sm">Tags de client</Label>
                  <button
                    type="button"
                    onClick={() => setIsTagsDialogOpen(true)}
                    className="w-full mt-1 flex items-center justify-between px-3 py-2 border rounded-md bg-white text-left hover:bg-gray-50"
                    data-testid="select-tags"
                  >
                    <div className="flex flex-wrap gap-1">
                      {selectedTags.length === 0 ? (
                        <span className="text-gray-400">Sélectionner des mots-clés</span>
                      ) : (
                        selectedTags.slice(0, 3).map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs rounded-full">
                            {tag}
                          </span>
                        ))
                      )}
                      {selectedTags.length > 3 && (
                        <span className="text-xs text-gray-500">+{selectedTags.length - 3}</span>
                      )}
                    </div>
                    <Tag className="h-4 w-4 text-gray-400" />
                  </button>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full mt-2 border-teal-600 text-teal-600 hover:bg-teal-50"
                  data-testid="btn-add-info"
                >
                  AJOUTER DES INFORMATIONS
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t p-4 flex items-center justify-between">
        <p className="text-sm text-red-500">
          {missingFields && "* Champs obligatoires manquants"}
        </p>
        <div className="flex gap-4">
          <Button 
            variant="outline" 
            onClick={() => setLocation("/dashboard")} 
            className="px-8"
            data-testid="btn-cancel"
          >
            RETOUR
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={createBookingMutation.isPending || missingFields}
            className="bg-teal-600 hover:bg-teal-700 px-8"
            data-testid="btn-create"
          >
            {createBookingMutation.isPending ? "Création..." : "CRÉER UNE RÉSERVATION"}
          </Button>
        </div>
      </div>

      {/* Tags Dialog */}
      <Dialog open={isTagsDialogOpen} onOpenChange={setIsTagsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Sélectionnez des mots-clés client</DialogTitle>
          </DialogHeader>
          
          <div className="mt-2">
            <Input 
              placeholder="Rechercher ou ajouter un mot-clé" 
              className="mb-4"
            />

            <div className="space-y-6">
              {Object.entries(CLIENT_TAGS).map(([key, category]) => {
                const isExpanded = expandedCategories[key] || false;
                const visibleTags = isExpanded ? category.tags : category.tags.slice(0, 4);
                const hasMore = category.tags.length > 4;
                
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-700">{category.label}</h4>
                      {hasMore && (
                        <button 
                          className="text-sm text-teal-600 hover:underline"
                          onClick={() => setExpandedCategories(prev => ({ ...prev, [key]: !isExpanded }))}
                        >
                          {isExpanded ? "Voir moins" : "Voir plus"}
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {visibleTags.map(tag => {
                        const isSelected = selectedTags.includes(tag);
                        const isAllergy = key === "allergies";
                        const isRisk = key === "risque";
                        return (
                          <button
                            key={tag}
                            onClick={() => {
                              setSelectedTags(prev => 
                                prev.includes(tag) 
                                  ? prev.filter(t => t !== tag)
                                  : [...prev, tag]
                              );
                            }}
                            className={`px-3 py-1.5 rounded-full text-sm border transition-all flex items-center gap-1 ${
                              isSelected
                                ? isAllergy
                                  ? "bg-red-100 text-red-700 border-red-300"
                                  : isRisk
                                  ? "bg-orange-100 text-orange-700 border-orange-300"
                                  : "bg-teal-100 text-teal-700 border-teal-300"
                                : "bg-white text-gray-600 border-gray-200 hover:border-teal-300"
                            }`}
                          >
                            {isAllergy && <span className="text-red-500">🚫</span>}
                            {isRisk && <AlertTriangle className="h-3 w-3" />}
                            {key === "fidelite" && tag === "VIP" && <Star className="h-3 w-3 text-yellow-500" />}
                            {key === "autre" && tag === "Amateur de vin" && <Wine className="h-3 w-3" />}
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="mt-6 flex justify-between">
            <Button 
              variant="ghost" 
              onClick={() => setIsTagsDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button 
              onClick={() => setIsTagsDialogOpen(false)}
              className="bg-teal-600 hover:bg-teal-700"
            >
              Appliquer les mots-clés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
