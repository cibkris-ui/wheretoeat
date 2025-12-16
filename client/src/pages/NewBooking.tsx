import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft,
  ChevronRight,
  Users,
  Clock,
  X
} from "lucide-react";
import { format, addDays, subDays, addMonths, subMonths, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay, isToday, getDay } from "date-fns";
import { fr } from "date-fns/locale";
import type { Restaurant, Booking } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

const LUNCH_SLOTS = ["11:00", "11:15", "11:30", "11:45", "12:00", "12:15", "12:30", "12:45", "13:00", "13:15", "13:30", "13:45", "14:00", "14:15", "14:30"];
const DINNER_SLOTS = ["18:00", "18:15", "18:30", "18:45", "19:00", "19:15", "19:30", "19:45", "20:00", "20:15", "20:30", "20:45", "21:00", "21:15", "21:30", "21:45"];

const CAPACITY_PER_SLOT = 40;

export default function NewBooking() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<number | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectMultipleDates, setSelectMultipleDates] = useState(false);
  
  const [formData, setFormData] = useState({
    lastName: "",
    firstName: "",
    phone: "",
    guests: 2,
    notes: "",
    table: "",
    occasion: "",
    duration: "1h30",
    tags: "",
  });

  const { data: myRestaurants = [] } = useQuery<Restaurant[]>({
    queryKey: ["/api/my-restaurants"],
    enabled: isAuthenticated,
  });

  const activeRestaurantId = selectedRestaurant || myRestaurants[0]?.id;

  const { data: existingBookings = [] } = useQuery<Booking[]>({
    queryKey: ["/api/restaurants", activeRestaurantId, "bookings"],
    queryFn: async () => {
      if (!activeRestaurantId) return [];
      const res = await fetch(`/api/restaurants/${activeRestaurantId}/bookings`, { credentials: "include" });
      return res.ok ? res.json() : [];
    },
    enabled: !!activeRestaurantId,
  });

  const bookingsForDate = useMemo(() => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return existingBookings.filter(b => b.date === dateStr);
  }, [existingBookings, selectedDate]);

  const getSlotInfo = (time: string) => {
    const bookingsAtTime = bookingsForDate.filter(b => b.time.substring(0, 5) === time);
    const totalGuests = bookingsAtTime.reduce((sum, b) => sum + b.guests, 0);
    return { reserved: totalGuests, available: CAPACITY_PER_SLOT - totalGuests };
  };

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [calendarMonth]);

  const createBookingMutation = useMutation({
    mutationFn: async () => {
      if (!activeRestaurantId || !selectedTime) throw new Error("Données manquantes");
      return apiRequest("POST", "/api/bookings", {
        restaurantId: activeRestaurantId,
        date: format(selectedDate, "yyyy-MM-dd"),
        time: selectedTime,
        guests: formData.guests,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: `${formData.firstName.toLowerCase()}.${formData.lastName.toLowerCase()}@email.com`,
        phone: formData.phone,
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
    if (!formData.lastName || !formData.firstName || !formData.phone || !selectedTime) {
      toast({ title: "Veuillez remplir tous les champs obligatoires", variant: "destructive" });
      return;
    }
    createBookingMutation.mutate();
  };

  const getDurationMinutes = (duration: string) => {
    switch(duration) {
      case "1h": return 60;
      case "1h15": return 75;
      case "1h30": return 90;
      case "2h": return 120;
      case "2h30": return 150;
      default: return 90;
    }
  };

  const getEndTime = (startTime: string, duration: string) => {
    if (!startTime) return "";
    const [h, m] = startTime.split(":").map(Number);
    const durationMinutes = getDurationMinutes(duration);
    const endMinutes = h * 60 + m + durationMinutes;
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="flex items-center justify-between h-14 px-4">
          <Button variant="ghost" onClick={() => setLocation("/dashboard")} data-testid="btn-back">
            <ChevronLeft className="h-5 w-5 mr-1" />
            Retour
          </Button>
          <h1 className="text-lg font-semibold">Nouvelle réservation</h1>
          <Button variant="ghost" onClick={() => setLocation("/dashboard")}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Calendar & Time slots */}
          <div className="lg:col-span-1 space-y-4">
            {/* Date selector */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <Button variant="ghost" size="icon" onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}>
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <h3 className="font-semibold capitalize">
                    {format(calendarMonth, "MMMM yyyy", { locale: fr })}
                  </h3>
                  <Button variant="ghost" size="icon" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}>
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2">
                  {["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"].map(d => (
                    <div key={d} className="text-center text-xs font-medium text-gray-500 py-1">{d}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, i) => {
                    const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();
                    const isSelected = isSameDay(day, selectedDate);
                    const isSunday = getDay(day) === 0;
                    
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedDate(day)}
                        disabled={isSunday}
                        className={`aspect-square flex items-center justify-center text-sm rounded-lg transition-colors ${
                          isSelected ? "bg-[#00473e] text-white" : 
                          isToday(day) ? "bg-[#e8f5f3] text-[#00473e] font-semibold" :
                          isSunday ? "text-gray-300 cursor-not-allowed" :
                          isCurrentMonth ? "hover:bg-gray-100" : "text-gray-300"
                        }`}
                        data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
                      >
                        {format(day, "d")}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                  <Checkbox id="multiple" checked={selectMultipleDates} onCheckedChange={(c) => setSelectMultipleDates(!!c)} />
                  <label htmlFor="multiple" className="text-sm text-gray-600">Sélectionner plusieurs dates</label>
                </div>
              </CardContent>
            </Card>

            {/* Time slots */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 capitalize">
                  {format(selectedDate, "EEEE d MMMM", { locale: fr })}
                </h3>
                
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                    <span>Lunch</span>
                    <span className="text-xs">{bookingsForDate.filter(b => parseInt(b.time) < 15).reduce((s, b) => s + b.guests, 0)}p</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {LUNCH_SLOTS.map(time => {
                      const info = getSlotInfo(time);
                      const isSelected = selectedTime === time;
                      const isFull = info.available <= 0;
                      return (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          disabled={isFull}
                          className={`py-1.5 px-1 text-xs rounded border transition-colors ${
                            isSelected ? "bg-[#00473e] text-white border-[#00473e]" : 
                            isFull ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" :
                            "bg-white hover:bg-gray-50 border-gray-200"
                          }`}
                          data-testid={`slot-${time}`}
                        >
                          <div>{time}</div>
                          <div className={`text-[10px] ${isSelected ? "text-white/80" : "text-gray-400"}`}>
                            {info.reserved}/{CAPACITY_PER_SLOT}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                    <span>Dinner</span>
                    <span className="text-xs">{bookingsForDate.filter(b => parseInt(b.time) >= 18).reduce((s, b) => s + b.guests, 0)}p</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {DINNER_SLOTS.map(time => {
                      const info = getSlotInfo(time);
                      const isSelected = selectedTime === time;
                      const isFull = info.available <= 0;
                      return (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          disabled={isFull}
                          className={`py-1.5 px-1 text-xs rounded border transition-colors ${
                            isSelected ? "bg-[#00473e] text-white border-[#00473e]" : 
                            isFull ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" :
                            "bg-white hover:bg-gray-50 border-gray-200"
                          }`}
                          data-testid={`slot-${time}`}
                        >
                          <div>{time}</div>
                          <div className={`text-[10px] ${isSelected ? "text-white/80" : "text-gray-400"}`}>
                            {info.reserved}/{CAPACITY_PER_SLOT}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Booking details form */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Détails de la réservation */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Détails de la réservation</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Label className="flex items-center gap-1">
                        <CalendarIcon className="h-4 w-4" />
                        Date
                      </Label>
                      <div className="mt-1 p-2 border rounded-md bg-gray-50">
                        {format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })}
                      </div>
                    </div>

                    <div>
                      <Label className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        Personnes
                      </Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                          <Button
                            key={n}
                            variant={formData.guests === n ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFormData(prev => ({ ...prev, guests: n }))}
                            className={`w-10 h-10 ${formData.guests === n ? "bg-[#00473e]" : ""}`}
                            data-testid={`guests-${n}`}
                          >
                            {n}
                          </Button>
                        ))}
                        <Select
                          value={formData.guests > 8 ? formData.guests.toString() : ""}
                          onValueChange={v => setFormData(prev => ({ ...prev, guests: parseInt(v) }))}
                        >
                          <SelectTrigger className="w-16 h-10">
                            <SelectValue placeholder="+" />
                          </SelectTrigger>
                          <SelectContent>
                            {[9, 10, 12, 15, 20].map(n => (
                              <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Heure
                      </Label>
                      <div className="mt-1 p-2 border rounded-md bg-gray-50">
                        {selectedTime ? selectedTime : <span className="text-gray-400">Sélectionner une heure</span>}
                      </div>
                    </div>

                    <div>
                      <Label>Durée</Label>
                      <Select
                        value={formData.duration}
                        onValueChange={v => setFormData(prev => ({ ...prev, duration: v }))}
                      >
                        <SelectTrigger className="mt-1" data-testid="select-duration">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1h">1h 00 min {selectedTime && `→ ${getEndTime(selectedTime, "1h")}`}</SelectItem>
                          <SelectItem value="1h15">1h 15 min {selectedTime && `→ ${getEndTime(selectedTime, "1h15")}`}</SelectItem>
                          <SelectItem value="1h30">1h 30 min {selectedTime && `→ ${getEndTime(selectedTime, "1h30")}`}</SelectItem>
                          <SelectItem value="2h">2h 00 min {selectedTime && `→ ${getEndTime(selectedTime, "2h")}`}</SelectItem>
                          <SelectItem value="2h30">2h 30 min {selectedTime && `→ ${getEndTime(selectedTime, "2h30")}`}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Table</Label>
                      <Input
                        placeholder="Numéro de table"
                        value={formData.table}
                        onChange={e => setFormData(prev => ({ ...prev, table: e.target.value }))}
                        className="mt-1"
                        data-testid="input-table"
                      />
                    </div>

                    <div>
                      <Label>Notes</Label>
                      <Textarea
                        placeholder="Aucune information sensible"
                        value={formData.notes}
                        onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        className="mt-1"
                        rows={3}
                        data-testid="input-notes"
                      />
                    </div>

                    <div>
                      <Label>Occasions spéciales</Label>
                      <Select
                        value={formData.occasion}
                        onValueChange={v => setFormData(prev => ({ ...prev, occasion: v }))}
                      >
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
                  </div>
                </CardContent>
              </Card>

              {/* Informations sur le client */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Informations sur le client</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Label><span className="text-red-500">*</span> Nom de famille</Label>
                      <Input
                        value={formData.lastName}
                        onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                        className="mt-1"
                        data-testid="input-lastname"
                      />
                    </div>

                    <div>
                      <Label><span className="text-red-500">*</span> Prénom</Label>
                      <Input
                        value={formData.firstName}
                        onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                        className="mt-1"
                        data-testid="input-firstname"
                      />
                    </div>

                    <div>
                      <Label><span className="text-red-500">*</span> Téléphone</Label>
                      <div className="flex gap-2 mt-1">
                        <Select defaultValue="+41">
                          <SelectTrigger className="w-24">
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
                          placeholder="79 123 45 67"
                          className="flex-1"
                          data-testid="input-phone"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Tags de client</Label>
                      <Select
                        value={formData.tags}
                        onValueChange={v => setFormData(prev => ({ ...prev, tags: v }))}
                      >
                        <SelectTrigger className="mt-1" data-testid="select-tags">
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vip">VIP</SelectItem>
                          <SelectItem value="regular">Habitué</SelectItem>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="occasionnel">Occasionnel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button variant="outline" className="w-full mt-4 text-[#00473e] border-[#00473e]" data-testid="btn-add-info">
                      AJOUTER DES INFORMATIONS
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="text-sm">
              {(!formData.lastName || !formData.firstName || !formData.phone || !selectedTime) && (
                <span className="text-red-500">* Champs obligatoires manquants</span>
              )}
            </div>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setLocation("/dashboard")} data-testid="btn-cancel">
                ANNULER
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={createBookingMutation.isPending || !formData.lastName || !formData.firstName || !formData.phone || !selectedTime}
                className="bg-[#00473e] hover:bg-[#00473e]/90"
                data-testid="btn-create"
              >
                {createBookingMutation.isPending ? "Création..." : "CRÉER UNE RÉSERVATION"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
