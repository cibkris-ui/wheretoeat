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
import { 
  Calendar as CalendarIcon, 
  ChevronLeft,
  Users,
  Clock,
  X
} from "lucide-react";
import { format, addDays, subDays, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import type { Restaurant, Booking } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

const TIME_SLOTS = [
  "11:00", "11:15", "11:30", "11:45",
  "12:00", "12:15", "12:30", "12:45",
  "13:00", "13:15", "13:30", "13:45",
  "18:00", "18:15", "18:30", "18:45",
  "19:00", "19:15", "19:30", "19:45",
  "20:00", "20:15", "20:30", "20:45",
  "21:00", "21:15", "21:30", "21:45",
  "22:00"
];

const CAPACITY_PER_SLOT = 40;

export default function NewBooking() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<number | null>(null);
  
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
    const bookingsAtTime = bookingsForDate.filter(b => {
      const bookingTime = b.time.substring(0, 5);
      return bookingTime === time;
    });
    const totalGuests = bookingsAtTime.reduce((sum, b) => sum + b.guests, 0);
    return {
      reserved: totalGuests,
      available: CAPACITY_PER_SLOT - totalGuests,
    };
  };

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

  const lunchSlots = TIME_SLOTS.filter(t => parseInt(t) < 15);
  const dinnerSlots = TIME_SLOTS.filter(t => parseInt(t) >= 15);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
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

      <div className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Time slots grid */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-4">
                <div className="text-center mb-4">
                  <h2 className="text-lg font-semibold capitalize">
                    {format(selectedDate, "EEEE d MMMM", { locale: fr })}
                  </h2>
                  <div className="flex items-center justify-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span>Total réservé : {bookingsForDate.reduce((s, b) => s + b.guests, 0)} p.</span>
                    <span>Capacité : {CAPACITY_PER_SLOT} p.</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Input
                    type="date"
                    value={format(selectedDate, "yyyy-MM-dd")}
                    onChange={e => setSelectedDate(parseISO(e.target.value))}
                    className="w-auto"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                  >
                    <ChevronLeft className="h-4 w-4 rotate-180" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Déjeuner</h3>
                    <div className="grid grid-cols-4 gap-2">
                      {lunchSlots.map(time => {
                        const info = getSlotInfo(time);
                        const isSelected = selectedTime === time;
                        return (
                          <button
                            key={time}
                            onClick={() => setSelectedTime(time)}
                            className={`p-2 text-center rounded-lg border transition-colors ${
                              isSelected 
                                ? "bg-primary text-white border-primary" 
                                : "bg-gray-50 hover:bg-gray-100 border-gray-200"
                            }`}
                            data-testid={`slot-${time}`}
                          >
                            <div className="text-sm font-medium">{time}</div>
                            <div className="text-xs flex items-center justify-center gap-1">
                              <Users className="h-3 w-3" />
                              {info.reserved}/{CAPACITY_PER_SLOT}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Dîner</h3>
                    <div className="grid grid-cols-4 gap-2">
                      {dinnerSlots.map(time => {
                        const info = getSlotInfo(time);
                        const isSelected = selectedTime === time;
                        return (
                          <button
                            key={time}
                            onClick={() => setSelectedTime(time)}
                            className={`p-2 text-center rounded-lg border transition-colors ${
                              isSelected 
                                ? "bg-primary text-white border-primary" 
                                : "bg-gray-50 hover:bg-gray-100 border-gray-200"
                            }`}
                            data-testid={`slot-${time}`}
                          >
                            <div className="text-sm font-medium">{time}</div>
                            <div className="text-xs flex items-center justify-center gap-1">
                              <Users className="h-3 w-3" />
                              {info.reserved}/{CAPACITY_PER_SLOT}
                            </div>
                          </button>
                        );
                      })}
                    </div>
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
                      <Input
                        type="date"
                        value={format(selectedDate, "yyyy-MM-dd")}
                        onChange={e => setSelectedDate(parseISO(e.target.value))}
                        className="mt-1"
                        data-testid="input-date"
                      />
                    </div>

                    <div>
                      <Label className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        Personnes
                      </Label>
                      <div className="flex gap-2 mt-1">
                        {[1, 2, 3, 4, 5].map(n => (
                          <Button
                            key={n}
                            variant={formData.guests === n ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFormData(prev => ({ ...prev, guests: n }))}
                            className={formData.guests === n ? "bg-primary" : ""}
                            data-testid={`guests-${n}`}
                          >
                            {n}
                          </Button>
                        ))}
                        <Select
                          value={formData.guests > 5 ? formData.guests.toString() : ""}
                          onValueChange={v => setFormData(prev => ({ ...prev, guests: parseInt(v) }))}
                        >
                          <SelectTrigger className="w-16">
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
                      <Label className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Heure
                      </Label>
                      <Select
                        value={selectedTime || ""}
                        onValueChange={setSelectedTime}
                      >
                        <SelectTrigger className="mt-1" data-testid="select-time">
                          <SelectValue placeholder="Sélectionner une heure" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_SLOTS.map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Notes</Label>
                      <Textarea
                        placeholder="Aucune information sensible"
                        value={formData.notes}
                        onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        className="mt-1"
                        data-testid="input-notes"
                      />
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
                          <SelectItem value="1h">1 h</SelectItem>
                          <SelectItem value="1h30">1 h 30 min</SelectItem>
                          <SelectItem value="2h">2 h</SelectItem>
                          <SelectItem value="2h30">2 h 30 min</SelectItem>
                          <SelectItem value="3h">3 h</SelectItem>
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
                      <Label className="text-red-500">* Nom de famille</Label>
                      <Input
                        value={formData.lastName}
                        onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                        className="mt-1"
                        data-testid="input-lastname"
                      />
                    </div>

                    <div>
                      <Label className="text-red-500">* Prénom</Label>
                      <Input
                        value={formData.firstName}
                        onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                        className="mt-1"
                        data-testid="input-firstname"
                      />
                    </div>

                    <div>
                      <Label>Téléphone</Label>
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
                          <SelectItem value="regular">Client régulier</SelectItem>
                          <SelectItem value="new">Nouveau client</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button variant="outline" className="w-full mt-4" data-testid="btn-add-info">
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
          <div className="container flex items-center justify-between">
            <p className="text-sm text-red-500">
              * Champs obligatoires manquants
            </p>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setLocation("/dashboard")} data-testid="btn-cancel">
                RETOUR
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={createBookingMutation.isPending}
                className="bg-primary"
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
