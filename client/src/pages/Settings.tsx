import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, apiUrl } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  LayoutDashboard,
  CalendarDays,
  LineChart,
  Settings as SettingsIcon,
  LogOut,
  Store,
  UserCircle,
  Utensils,
  ChevronRight,
  Bell,
  Users,
  Building2,
  Clock,
  CreditCard,
  Image,
  FileText,
  Globe,
  Mail,
  Phone,
  MapPin,
  Palette,
  Link2,
  Shield,
  ChevronLeft,
  Info,
  HelpCircle,
  Grid3X3,
  Code,
  Copy,
  ExternalLink
} from "lucide-react";
import type { Restaurant, Booking, RestaurantUser } from "@shared/schema";
import { FloorPlanBuilder } from "@/components/floor-plan/FloorPlanBuilder";

type SettingsSection = "overview" | "profile" | "services" | "users" | "legal" | "widget" | "parameters" | "plan-de-salle" | "embed";
type ProfileSubSection = "contacts" | "profil" | "photos";
type ServicesSubSection = "service-hours" | "capacity";

// Generate time options from 00:00 to 24:00 in 30-minute increments
const generateTimeOptions = () => {
  const times: string[] = [];
  for (let hour = 0; hour <= 24; hour++) {
    if (hour === 24) {
      times.push("24:00");
    } else {
      times.push(`${hour.toString().padStart(2, "0")}:00`);
      times.push(`${hour.toString().padStart(2, "0")}:30`);
    }
  }
  return times;
};

const ALL_TIMES = generateTimeOptions();

type DayHours = {
  isOpen: boolean;
  hasSecondService: boolean;
  openTime1: string;
  closeTime1: string;
  openTime2: string;
  closeTime2: string;
};

function ServiceHoursSection({ onBack, onSave, restaurantId, existingHours }: { 
  onBack: () => void; 
  onSave: () => void;
  restaurantId: number | null;
  existingHours: Record<string, DayHours> | null;
}) {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  const getDefaultHours = (): Record<string, DayHours> => {
    const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
    const initial: Record<string, DayHours> = {};
    days.forEach(day => {
      initial[day] = {
        isOpen: day !== "Dimanche",
        hasSecondService: true,
        openTime1: "11:30",
        closeTime1: "14:00",
        openTime2: "18:30",
        closeTime2: "22:00",
      };
    });
    return initial;
  };
  
  const [hours, setHours] = useState<Record<string, DayHours>>(getDefaultHours);
  
  useEffect(() => {
    if (existingHours && !hasInitialized) {
      setHours(existingHours);
      setHasInitialized(true);
    }
  }, [existingHours, hasInitialized]);

  const updateDay = (day: string, field: keyof DayHours, value: string | boolean) => {
    setHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  const handleSave = async () => {
    if (!restaurantId) return;
    setIsSaving(true);
    try {
      const res = await fetch(apiUrl(`/api/restaurants/${restaurantId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ openingHours: hours }),
      });
      if (!res.ok) throw new Error("Erreur lors de la sauvegarde");
      queryClient.invalidateQueries({ queryKey: ["/api/my-restaurants"] });
      onSave();
    } catch (error) {
      console.error("Error saving hours:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <h2 className="text-2xl font-bold">Horaires de service</h2>

      <Card className="bg-white border shadow-sm">
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b bg-gray-50/50">
            <h3 className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Heures d'ouverture
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Si votre restaurant est ouvert en continu, désactivez le second service.
            </p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"].map((day) => {
                const dayHours = hours[day];
                return (
                  <div key={day} className="flex items-center gap-3 py-3 border-b border-gray-100 flex-wrap">
                    <div className="w-24 flex-shrink-0">
                      <span className="font-medium">{day}</span>
                    </div>
                    <Switch 
                      checked={dayHours.isOpen} 
                      onCheckedChange={(checked) => updateDay(day, "isOpen", checked)}
                      data-testid={`toggle-${day.toLowerCase()}`} 
                    />
                    
                    {dayHours.isOpen && (
                      <>
                        <div className="flex items-center gap-2">
                          <Select 
                            value={dayHours.openTime1} 
                            onValueChange={(v) => updateDay(day, "openTime1", v)}
                          >
                            <SelectTrigger className="w-24" data-testid={`select-${day.toLowerCase()}-start`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {ALL_TIMES.map(time => (
                                <SelectItem key={time} value={time}>{time}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="text-gray-400">-</span>
                          <Select 
                            value={dayHours.closeTime1} 
                            onValueChange={(v) => updateDay(day, "closeTime1", v)}
                          >
                            <SelectTrigger className="w-24" data-testid={`select-${day.toLowerCase()}-end-lunch`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {ALL_TIMES.map(time => (
                                <SelectItem key={time} value={time}>{time}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-2">
                          <Switch 
                            checked={dayHours.hasSecondService}
                            onCheckedChange={(checked) => updateDay(day, "hasSecondService", checked)}
                            data-testid={`toggle-${day.toLowerCase()}-second`}
                          />
                          <span className="text-xs text-gray-500">2ème service</span>
                        </div>
                        
                        {dayHours.hasSecondService && (
                          <div className="flex items-center gap-2">
                            <Select 
                              value={dayHours.openTime2} 
                              onValueChange={(v) => updateDay(day, "openTime2", v)}
                            >
                              <SelectTrigger className="w-24" data-testid={`select-${day.toLowerCase()}-start-dinner`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="max-h-60">
                                {ALL_TIMES.map(time => (
                                  <SelectItem key={time} value={time}>{time}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="text-gray-400">-</span>
                            <Select 
                              value={dayHours.closeTime2} 
                              onValueChange={(v) => updateDay(day, "closeTime2", v)}
                            >
                              <SelectTrigger className="w-24" data-testid={`select-${day.toLowerCase()}-end-dinner`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="max-h-60">
                                {ALL_TIMES.map(time => (
                                  <SelectItem key={time} value={time}>{time}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pt-4 pb-6">
        <Button variant="outline" onClick={onBack} className="px-6">
          ANNULER
        </Button>
        <Button onClick={handleSave} disabled={isSaving} className="px-6" data-testid="save-service-hours">
          {isSaving ? "Enregistrement..." : "ENREGISTRER"}
        </Button>
      </div>
    </div>
  );
}

export default function Settings() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeSection, setActiveSection] = useState<SettingsSection>("overview");
  const [profileSubSection, setProfileSubSection] = useState<ProfileSubSection>("contacts");
  const [servicesSubSection, setServicesSubSection] = useState<ServicesSubSection>("service-hours");
  const [selectedRestaurant, setSelectedRestaurant] = useState<number | null>(null);
  const [addressField, setAddressField] = useState("");
  const [postalCodeField, setPostalCodeField] = useState("");
  const [cityField, setCityField] = useState("");
  const [executiveChefField, setExecutiveChefField] = useState("");
  const [publicTransportField, setPublicTransportField] = useState("");
  const [nearbyParkingField, setNearbyParkingField] = useState("");
  const [additionalInfoField, setAdditionalInfoField] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [hasVegetarianOptions, setHasVegetarianOptions] = useState<boolean | null>(null);
  const [spokenLanguages, setSpokenLanguages] = useState<string[]>([]);
  const [customLanguage, setCustomLanguage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [addUserDialog, setAddUserDialog] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserFirstName, setNewUserFirstName] = useState("");
  const [newUserLastName, setNewUserLastName] = useState("");
  const [newUserRole, setNewUserRole] = useState("staff");
  const [capacityValue, setCapacityValue] = useState<number | null>(null);
  const [onlineCapacityValue, setOnlineCapacityValue] = useState<number | null>(null);
  const [minGuestsValue, setMinGuestsValue] = useState<number | null>(null);
  const [maxGuestsValue, setMaxGuestsValue] = useState<number | null>(null);
  const [publicEmailValue, setPublicEmailValue] = useState<string>("");
  const [preferredLanguageValue, setPreferredLanguageValue] = useState<string>("fr");
  const [phoneValue, setPhoneValue] = useState<string>("");
  const [websiteValue, setWebsiteValue] = useState<string>("");
  const [descriptionValue, setDescriptionValue] = useState<string>("");
  const [cuisineTypes, setCuisineTypes] = useState<string[]>([]);
  const [priceRangeValue, setPriceRangeValue] = useState<string>("");
  const [nameValue, setNameValue] = useState<string>("");
  const [locationValue, setLocationValue] = useState<string>("");
  const [askBillAmount, setAskBillAmount] = useState(false);
  const [companyNameValue, setCompanyNameValue] = useState<string>("");
  const [registrationNumberValue, setRegistrationNumberValue] = useState<string>("");

  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const photosInputRef = useRef<HTMLInputElement>(null);
  const menuPdfInputRef = useRef<HTMLInputElement>(null);

  const { data: myRestaurants = [] } = useQuery<Restaurant[]>({
    queryKey: ["/api/my-restaurants"],
    enabled: isAuthenticated,
  });

  interface CuisineCategory {
    id: number;
    name: string;
    icon: string | null;
  }

  const { data: cuisineCategories = [] } = useQuery<CuisineCategory[]>({
    queryKey: ["cuisine-categories"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/cuisine-categories"));
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });

  const activeRestaurantId = selectedRestaurant || myRestaurants[0]?.id;
  const selectedRestaurantData = myRestaurants.find(r => r.id === activeRestaurantId);

  const getCurrentCuisineTypes = (): string[] => {
    if (cuisineTypes.length > 0) return cuisineTypes;
    const cuisine = selectedRestaurantData?.cuisine || "";
    return cuisine.split(", ").filter(c => c.trim() !== "");
  };

  // Fetch bookings for notification badge
  const { data: allBookings = [] } = useQuery<Booking[]>({
    queryKey: ["/api/settings-bookings", activeRestaurantId],
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

  const { data: restaurantUsers = [] } = useQuery<RestaurantUser[]>({
    queryKey: ["/api/restaurant-users", activeRestaurantId],
    queryFn: async () => {
      if (!activeRestaurantId) return [];
      const res = await fetch(apiUrl(`/api/team/restaurant/${activeRestaurantId}`), { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!activeRestaurantId,
  });

  const addUserMutation = useMutation({
    mutationFn: async ({ email, password, firstName, lastName, role }: { email: string; password: string; firstName: string; lastName: string; role: string }) => {
      const res = await apiRequest("POST", `/api/team/restaurant/${activeRestaurantId}`, { email, password, firstName, lastName, role });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant-users", activeRestaurantId] });
      setAddUserDialog(false);
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserFirstName("");
      setNewUserLastName("");
      setNewUserRole("staff");
      toast({ title: "Utilisateur ajouté" });
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("DELETE", `/api/team/restaurant/${activeRestaurantId}/user/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant-users", activeRestaurantId] });
      toast({ title: "Utilisateur supprimé" });
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const saveCapacityMutation = useMutation({
    mutationFn: async ({ capacity, onlineCapacity, minGuests, maxGuests }: { capacity: number; onlineCapacity: number; minGuests: number; maxGuests: number }) => {
      const res = await apiRequest("PUT", `/api/restaurants/${activeRestaurantId}`, { capacity, onlineCapacity, minGuests, maxGuests });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-restaurants"] });
      toast({ title: "Capacité enregistrée" });
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const saveContactsMutation = useMutation({
    mutationFn: async (data: { publicEmail: string; preferredLanguage: string; phone: string; website: string; address: string; location: string; companyName: string; registrationNumber: string }) => {
      const res = await apiRequest("PUT", `/api/restaurants/${activeRestaurantId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-restaurants"] });
      toast({ title: "Informations de contact enregistrées" });
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const handleSaveContacts = () => {
    const finalAddress = addressField || selectedRestaurantData?.address || "";
    const { postalCode: defPostal, city: defCity } = extractPostalCodeAndCity(selectedRestaurantData?.location);
    const finalPostalCode = postalCodeField || defPostal;
    const finalCity = cityField || defCity;
    const fullLocation = finalPostalCode && finalCity ? `${finalPostalCode} ${finalCity}` : (finalCity || finalPostalCode);
    
    saveContactsMutation.mutate({
      publicEmail: publicEmailValue || selectedRestaurantData?.publicEmail || "",
      preferredLanguage: preferredLanguageValue || selectedRestaurantData?.preferredLanguage || "fr",
      phone: phoneValue || selectedRestaurantData?.phone || "",
      website: websiteValue || selectedRestaurantData?.website || "",
      address: finalAddress,
      location: fullLocation,
      companyName: companyNameValue || selectedRestaurantData?.companyName || "",
      registrationNumber: registrationNumberValue || selectedRestaurantData?.registrationNumber || "",
    });
  };

  const saveProfileMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; cuisine: string; priceRange: string; location: string; executiveChef?: string; publicTransport?: string; nearbyParking?: string; additionalInfo?: string; paymentMethods?: string[]; hasVegetarianOptions?: boolean; spokenLanguages?: string[] }) => {
      const res = await apiRequest("PUT", `/api/restaurants/${activeRestaurantId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-restaurants"] });
      toast({ title: "Profil enregistré" });
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const getCurrentPaymentMethods = (): string[] => {
    if (paymentMethods.length > 0) return paymentMethods;
    return selectedRestaurantData?.paymentMethods || [];
  };

  const getCurrentSpokenLanguages = (): string[] => {
    if (spokenLanguages.length > 0) return spokenLanguages;
    return selectedRestaurantData?.spokenLanguages || [];
  };

  const handleSaveProfile = () => {
    const currentCuisines = getCurrentCuisineTypes();
    saveProfileMutation.mutate({
      name: nameValue || selectedRestaurantData?.name || "",
      description: descriptionValue || selectedRestaurantData?.description || "",
      cuisine: currentCuisines.join(", "),
      priceRange: priceRangeValue || selectedRestaurantData?.priceRange || "",
      location: locationValue || selectedRestaurantData?.location || "",
      executiveChef: executiveChefField || selectedRestaurantData?.executiveChef || "",
      publicTransport: publicTransportField || selectedRestaurantData?.publicTransport || "",
      nearbyParking: nearbyParkingField || selectedRestaurantData?.nearbyParking || "",
      additionalInfo: additionalInfoField || selectedRestaurantData?.additionalInfo || "",
      paymentMethods: getCurrentPaymentMethods(),
      hasVegetarianOptions: hasVegetarianOptions ?? selectedRestaurantData?.hasVegetarianOptions ?? false,
      spokenLanguages: getCurrentSpokenLanguages(),
    });
  };

  const handleSaveCapacity = () => {
    const capacity = capacityValue ?? selectedRestaurantData?.capacity ?? 40;
    let onlineCapacity = onlineCapacityValue ?? selectedRestaurantData?.onlineCapacity ?? capacity;
    // S'assurer que onlineCapacity ne dépasse pas capacity
    if (onlineCapacity > capacity) {
      onlineCapacity = capacity;
    }
    const minGuests = minGuestsValue ?? selectedRestaurantData?.minGuests ?? 1;
    const maxGuests = maxGuestsValue ?? selectedRestaurantData?.maxGuests ?? 12;
    saveCapacityMutation.mutate({ capacity, onlineCapacity, minGuests, maxGuests });
  };

  const saveAskBillAmountMutation = useMutation({
    mutationFn: async (askBillAmount: boolean) => {
      const res = await apiRequest("PUT", `/api/restaurants/${activeRestaurantId}`, { askBillAmount });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-restaurants"] });
      toast({ title: "Paramètre enregistré" });
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const handleAskBillAmountChange = (checked: boolean) => {
    setAskBillAmount(checked);
    saveAskBillAmountMutation.mutate(checked);
  };

  const defaultAddress = selectedRestaurantData?.address || "";
  
  const extractPostalCodeAndCity = (location: string | null | undefined): { postalCode: string; city: string } => {
    if (!location) return { postalCode: "", city: "" };
    const match = location.match(/(\d{4})\s+(.+)$/);
    if (match) {
      return { postalCode: match[1], city: match[2] };
    }
    return { postalCode: "", city: location };
  };
  
  const { postalCode: defaultPostalCode, city: defaultCityName } = extractPostalCodeAndCity(selectedRestaurantData?.location);
  
  const currentAddress = addressField || defaultAddress;
  const currentPostalCode = postalCodeField || defaultPostalCode;
  const currentCity = cityField || defaultCityName;
  
  const googleMapsUrl = useMemo(() => {
    const cityPart = currentPostalCode && currentCity ? `${currentPostalCode} ${currentCity}` : (currentCity || currentPostalCode);
    const fullAddress = `${currentAddress}, ${cityPart}, Switzerland`;
    const encodedAddress = encodeURIComponent(fullAddress);
    return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodedAddress}`;
  }, [currentAddress, currentPostalCode, currentCity]);

  const sidebarItems = [
    { id: "reservations" as const, icon: LayoutDashboard, label: "Réservations", link: "/dashboard" },
    { id: "attribution" as const, icon: Grid3X3, label: "Attribution", link: "/dashboard/attribution" },
    { id: "calendar" as const, icon: CalendarDays, label: "Calendrier", link: "/dashboard/calendrier" },
    { id: "notifications" as const, icon: Bell, label: "Notifications", link: "/dashboard/notifications" },
    { id: "clients" as const, icon: Users, label: "Clients", link: "/dashboard/clients" },
    { id: "stats" as const, icon: LineChart, label: "Statistiques", link: "/dashboard/statistiques" },
    { id: "settings" as const, icon: SettingsIcon, label: "Paramètres", link: null },
  ];

  const settingsCategories = [
    {
      id: "profile",
      icon: Building2,
      title: "Profil du restaurant",
      items: [
        { id: "contacts", label: "Contacts", icon: Phone },
        { id: "profil", label: "Profil", icon: FileText },
        { id: "photos", label: "Photos", icon: Image },
      ]
    },
    {
      id: "services",
      icon: Clock,
      title: "Services",
      items: [
        { id: "service-hours", label: "Horaires de service", icon: Clock },
        { id: "capacity", label: "Capacité et couverts", icon: Users },
      ]
    },
    {
      id: "users",
      icon: Users,
      title: "Utilisateurs",
      items: [
        { id: "team", label: "Gestion des utilisateurs", icon: Users },
      ]
    },
    {
      id: "legal",
      icon: Shield,
      title: "Confidentialité et conditions",
      items: [
        { id: "terms", label: "Conditions générales", icon: FileText },
        { id: "privacy", label: "Confidentialité", icon: Shield },
      ]
    },
    {
      id: "widget",
      icon: Code,
      title: "Paramétrage",
      items: [
        { id: "parameters", label: "Paramètres", icon: SettingsIcon },
        { id: "plan-de-salle", label: "Plan de salle", icon: LayoutDashboard },
        { id: "embed", label: "Widget de réservation", icon: Code },
      ]
    },
  ];

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(apiUrl("/api/upload"), {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    if (!res.ok) {
      throw new Error("Upload failed");
    }

    const { url } = await res.json();
    return url;
  };

  const handleProfileImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeRestaurantId) return;
    
    if (!file.type.startsWith('image/')) {
      toast({ title: "Erreur", description: "Veuillez sélectionner une image", variant: "destructive" });
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Erreur", description: "L'image ne doit pas dépasser 5 Mo", variant: "destructive" });
      return;
    }
    
    setIsUploading(true);
    try {
      const objectPath = await uploadFile(file);
      await apiRequest("PUT", `/api/restaurants/${activeRestaurantId}`, { image: objectPath });
      await queryClient.invalidateQueries({ queryKey: ["/api/my-restaurants"] });
      toast({ title: "Photo de profil mise à jour" });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Erreur", description: "Échec du téléchargement", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (profileImageInputRef.current) profileImageInputRef.current.value = "";
    }
  };

  const handlePhotosUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !activeRestaurantId) return;
    
    setIsUploading(true);
    try {
      const currentPhotos = selectedRestaurantData?.photos || [];
      const newPhotos: string[] = [];
      
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        if (file.size > 5 * 1024 * 1024) continue;
        
        const objectPath = await uploadFile(file);
        newPhotos.push(objectPath);
      }
      
      const allPhotos = [...currentPhotos, ...newPhotos];
      await apiRequest("PUT", `/api/restaurants/${activeRestaurantId}`, { photos: allPhotos });
      await queryClient.invalidateQueries({ queryKey: ["/api/my-restaurants"] });
      toast({ title: `${newPhotos.length} photo(s) ajoutée(s)` });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Erreur", description: "Échec du téléchargement", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (photosInputRef.current) photosInputRef.current.value = "";
    }
  };

  const removePhoto = async (photoToRemove: string) => {
    if (!activeRestaurantId || !selectedRestaurantData) return;

    const updatedPhotos = (selectedRestaurantData.photos || []).filter((p: string) => p !== photoToRemove);
    try {
      await apiRequest("PUT", `/api/restaurants/${activeRestaurantId}`, { photos: updatedPhotos });
      await queryClient.invalidateQueries({ queryKey: ["/api/my-restaurants"] });
      toast({ title: "Photo supprimée" });
    } catch (error) {
      toast({ title: "Erreur", description: "Échec de la suppression", variant: "destructive" });
    }
  };

  const handleMenuPdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeRestaurantId) return;

    if (file.type !== 'application/pdf') {
      toast({ title: "Erreur", description: "Veuillez sélectionner un fichier PDF", variant: "destructive" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Erreur", description: "Le fichier ne doit pas dépasser 10 Mo", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const objectPath = await uploadFile(file);
      await apiRequest("PUT", `/api/restaurants/${activeRestaurantId}`, { menuPdfUrl: objectPath });
      await queryClient.invalidateQueries({ queryKey: ["/api/my-restaurants"] });
      toast({ title: "Menu PDF mis à jour" });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Erreur", description: "Échec du téléchargement du menu", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (menuPdfInputRef.current) menuPdfInputRef.current.value = "";
    }
  };

  const removeMenuPdf = async () => {
    if (!activeRestaurantId) return;
    try {
      await apiRequest("PUT", `/api/restaurants/${activeRestaurantId}`, { menuPdfUrl: null });
      await queryClient.invalidateQueries({ queryKey: ["/api/my-restaurants"] });
      toast({ title: "Menu PDF supprimé" });
    } catch (error) {
      toast({ title: "Erreur", description: "Échec de la suppression", variant: "destructive" });
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
                      onClick={() => setActiveSection("overview")}
                      className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
                        item.id === "settings" 
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
            {activeSection === "overview" && (
              <>
                <h1 className="text-2xl font-bold mb-8">Paramètres</h1>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {settingsCategories.map(category => (
                    <Card key={category.id} className="bg-white hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <category.icon className="h-5 w-5 text-gray-700" />
                          </div>
                          <h2 className="font-semibold text-lg">{category.title}</h2>
                        </div>
                        <div className="space-y-2">
                          {category.items.map(item => (
                            <button
                              key={item.id}
                              onClick={() => {
                                if (item.id === "parameters" || item.id === "plan-de-salle" || item.id === "embed") {
                                  setActiveSection(item.id as SettingsSection);
                                } else {
                                  setActiveSection(category.id as SettingsSection);
                                }
                                if (category.id === "profile" && (item.id === "contacts" || item.id === "profil" || item.id === "photos")) {
                                  setProfileSubSection(item.id as ProfileSubSection);
                                }
                                if (category.id === "services" && (item.id === "service-hours" || item.id === "capacity")) {
                                  setServicesSubSection(item.id as ServicesSubSection);
                                }
                              }}
                              className="w-full flex items-center gap-2 py-2 px-3 text-left text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                              data-testid={`settings-${item.id}`}
                            >
                              <item.icon className="h-4 w-4 text-gray-400" />
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}

            {activeSection === "profile" && (
              <>
                {profileSubSection === "contacts" && (
                  <div className="space-y-6 max-w-4xl">
                    <h2 className="text-2xl font-bold">Contacts</h2>

                    <Card className="bg-white border shadow-sm">
                      <CardContent className="p-0">
                        <div className="px-6 py-4 border-b bg-gray-50/50">
                          <h3 className="text-sm font-medium text-gray-600 flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Informations de base
                          </h3>
                        </div>
                        <div className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                            <div className="space-y-1">
                              <Label className="text-sm text-gray-500 flex items-center gap-1">
                                Nom du restaurant
                                <HelpCircle className="h-3 w-3 text-gray-400" />
                              </Label>
                              <p className="text-base font-medium text-gray-900">
                                {selectedRestaurantData?.name || "Le Miranda"}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-sm text-gray-500 flex items-center gap-1">
                                Langue préférée du restaurant
                                <span className="text-red-500">*</span>
                              </Label>
                              <Select 
                                value={preferredLanguageValue || selectedRestaurantData?.preferredLanguage || "fr"}
                                onValueChange={setPreferredLanguageValue}
                              >
                                <SelectTrigger className="w-full border-gray-200" data-testid="select-language">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="fr">Français</SelectItem>
                                  <SelectItem value="en">English - UK</SelectItem>
                                  <SelectItem value="de">Deutsch</SelectItem>
                                  <SelectItem value="it">Italiano</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-sm text-gray-500 flex items-center gap-1">
                                Adresse e-mail publique du restaurant
                                <span className="text-red-500">*</span>
                              </Label>
                              <Input 
                                type="email"
                                value={publicEmailValue || selectedRestaurantData?.publicEmail || ""}
                                onChange={(e) => setPublicEmailValue(e.target.value)}
                                placeholder="email@restaurant.ch"
                                className="border-gray-200"
                                data-testid="input-email"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-sm text-gray-500">Téléphone du restaurant (public)</Label>
                              <Input 
                                value={phoneValue || selectedRestaurantData?.phone || ""}
                                onChange={(e) => setPhoneValue(e.target.value)}
                                placeholder="+41 78 123 45 67"
                                className="border-gray-200"
                                data-testid="input-phone"
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white border shadow-sm">
                      <CardContent className="p-0">
                        <div className="px-6 py-4 border-b bg-gray-50/50">
                          <h3 className="text-sm font-medium text-gray-600 flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Localisation
                          </h3>
                        </div>
                        <div className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center border overflow-hidden">
                              <iframe
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                loading="lazy"
                                allowFullScreen
                                referrerPolicy="no-referrer-when-downgrade"
                                src={googleMapsUrl}
                                title="Localisation du restaurant"
                              />
                            </div>
                            <div className="flex flex-col justify-center space-y-4">
                              <div className="space-y-1">
                                <Label className="text-sm text-gray-500 flex items-center gap-1">
                                  Adresse de votre restaurant
                                  <HelpCircle className="h-3 w-3 text-gray-400" />
                                </Label>
                                <Input 
                                  value={currentAddress}
                                  onChange={(e) => setAddressField(e.target.value)}
                                  className="border-gray-200"
                                  data-testid="input-address"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <Label className="text-sm text-gray-500">Code postal</Label>
                                  <Input 
                                    value={currentPostalCode}
                                    onChange={(e) => setPostalCodeField(e.target.value)}
                                    placeholder="1204"
                                    maxLength={4}
                                    className="border-gray-200"
                                    data-testid="input-postal-code"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-sm text-gray-500">Ville</Label>
                                  <Input 
                                    value={currentCity}
                                    onChange={(e) => setCityField(e.target.value)}
                                    placeholder="Genève"
                                    className="border-gray-200"
                                    data-testid="input-city"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white border shadow-sm">
                      <CardContent className="p-0">
                        <div className="px-6 py-4 border-b bg-gray-50/50">
                          <h3 className="text-sm font-medium text-gray-600 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Informations légales
                          </h3>
                        </div>
                        <div className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                            <div className="space-y-1">
                              <Label className="text-sm text-gray-500 flex items-center gap-1">
                                Nom de la société
                                <HelpCircle className="h-3 w-3 text-gray-400" />
                              </Label>
                              <Input
                                value={companyNameValue || selectedRestaurantData?.companyName || ""}
                                onChange={(e) => setCompanyNameValue(e.target.value)}
                                placeholder="Restaurant SA"
                                className="border-gray-200"
                                data-testid="input-registre-commerce"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-sm text-gray-500 flex items-center gap-1">
                                N° registre commerce
                                <HelpCircle className="h-3 w-3 text-gray-400" />
                              </Label>
                              <Input
                                value={registrationNumberValue || selectedRestaurantData?.registrationNumber || ""}
                                onChange={(e) => setRegistrationNumberValue(e.target.value)}
                                placeholder="CHE-XXX.XXX.XXX"
                                className="border-gray-200"
                                data-testid="input-numero-registre"
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white border shadow-sm">
                      <CardContent className="p-0">
                        <div className="px-6 py-4 border-b bg-gray-50/50">
                          <h3 className="text-sm font-medium text-gray-600 flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            Site internet
                          </h3>
                        </div>
                        <div className="p-6">
                          <div className="space-y-1">
                            <Label className="text-sm text-gray-500">Site internet du restaurant</Label>
                            <Input 
                              value={websiteValue || selectedRestaurantData?.website || ""}
                              onChange={(e) => setWebsiteValue(e.target.value)}
                              placeholder="https://www.mon-restaurant.ch"
                              className="border-gray-200"
                              data-testid="input-website"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex justify-end gap-3 pt-4 pb-6">
                      <Button 
                        variant="outline" 
                        onClick={() => setActiveSection("overview")}
                        className="px-6"
                      >
                        ANNULER
                      </Button>
                      <Button 
                        onClick={handleSaveContacts}
                        disabled={saveContactsMutation.isPending}
                        className="px-6 bg-primary hover:bg-primary/90"
                        data-testid="save-contacts"
                      >
                        {saveContactsMutation.isPending ? "..." : "ENREGISTRER"}
                      </Button>
                    </div>
                  </div>
                )}

                {profileSubSection === "profil" && (
                  <div className="space-y-6 max-w-4xl">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold">Profil de mon restaurant sur WhereToEat</h2>
                    </div>
                    
                    <Button 
                      className="bg-primary hover:bg-primary/90 text-white"
                      data-testid="btn-view-page"
                      onClick={() => window.open(`/restaurant/${activeRestaurantId}`, '_blank')}
                    >
                      VOIR MA PAGE SUR WHERETOEAT
                    </Button>

                    <Card className="bg-white border shadow-sm">
                      <CardContent className="p-0">
                        <div className="px-6 py-4 border-b bg-gray-50/50">
                          <h3 className="text-sm font-medium text-gray-600">Informations principales</h3>
                        </div>
                        <div className="p-6 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <Label className="text-sm text-gray-500">Nom du restaurant</Label>
                              <Input 
                                value={nameValue || selectedRestaurantData?.name || ""}
                                onChange={(e) => setNameValue(e.target.value)}
                                placeholder="Nom de votre restaurant"
                                className="border-gray-200"
                                data-testid="input-name"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-sm text-gray-500">Adresse complète</Label>
                              <Input 
                                value={locationValue || selectedRestaurantData?.location || ""}
                                onChange={(e) => setLocationValue(e.target.value)}
                                placeholder="Rue, code postal, ville"
                                className="border-gray-200"
                                data-testid="input-location"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-sm text-gray-500">Gamme de prix</Label>
                            <Select 
                              value={priceRangeValue || selectedRestaurantData?.priceRange || ""}
                              onValueChange={setPriceRangeValue}
                            >
                              <SelectTrigger className="border-gray-200" data-testid="select-price-range">
                                <SelectValue placeholder="Sélectionner" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="€">€ - Économique</SelectItem>
                                <SelectItem value="€€">€€ - Modéré</SelectItem>
                                <SelectItem value="€€€">€€€ - Haut de gamme</SelectItem>
                                <SelectItem value="€€€€">€€€€ - Gastronomique</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-gray-500">Types de cuisine (plusieurs choix possibles)</Label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                              {cuisineCategories.map((cat) => {
                                const currentTypes = getCurrentCuisineTypes();
                                const isSelected = currentTypes.includes(cat.name);
                                return (
                                  <label
                                    key={cat.id}
                                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                                      isSelected ? "bg-primary/10 border-primary border" : "bg-muted/50 hover:bg-muted border border-transparent"
                                    }`}
                                    data-testid={`checkbox-cuisine-${cat.id}`}
                                  >
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={(checked) => {
                                        const current = getCurrentCuisineTypes();
                                        if (checked) {
                                          setCuisineTypes([...current, cat.name]);
                                        } else {
                                          setCuisineTypes(current.filter(c => c !== cat.name));
                                        }
                                      }}
                                    />
                                    <span className="text-sm">{cat.icon} {cat.name}</span>
                                  </label>
                                );
                              })}
                            </div>
                            {getCurrentCuisineTypes().length > 0 && (
                              <p className="text-xs text-gray-400">
                                Sélectionné: {getCurrentCuisineTypes().join(", ")}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white border shadow-sm">
                      <CardContent className="p-0">
                        <div className="px-6 py-4 border-b bg-gray-50/50">
                          <h3 className="text-sm font-medium text-gray-600">À propos</h3>
                        </div>
                        <div className="p-6">
                          <div className="space-y-1">
                            <Label className="text-sm text-gray-500">Description du restaurant</Label>
                            <Textarea 
                              value={descriptionValue || selectedRestaurantData?.description || ""}
                              onChange={(e) => setDescriptionValue(e.target.value)}
                              placeholder="Décrivez votre restaurant, son ambiance, sa cuisine..."
                              className="border-gray-200 min-h-[120px]"
                              data-testid="input-description"
                            />
                            <p className="text-xs text-gray-400">Cette description apparaît sur votre page publique</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white border shadow-sm">
                      <CardContent className="p-0">
                        <div className="px-6 py-4 border-b bg-gray-50/50">
                          <h3 className="text-sm font-medium text-gray-600">À la Carte</h3>
                        </div>
                        <div className="p-6">
                          <div className="space-y-4">
                            <div className="space-y-1">
                              <Label className="text-sm text-gray-500">Menu PDF</Label>
                              {selectedRestaurantData?.menuPdfUrl ? (
                                <div className="flex items-center gap-2">
                                  <a 
                                    href={selectedRestaurantData.menuPdfUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline text-sm"
                                  >
                                    Voir le menu actuel
                                  </a>
                                </div>
                              ) : (
                                <p className="text-sm text-gray-400">Aucun menu PDF téléchargé</p>
                              )}
                              <p className="text-xs text-gray-400 mt-2">Pour modifier le menu PDF, utilisez la section Photos</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="border-b border-primary pb-2 flex items-center justify-between">
                      <h3 className="text-lg font-medium">Informations sur mon restaurant</h3>
                      <Select defaultValue="fr">
                        <SelectTrigger className="w-32 border-gray-300" data-testid="select-profile-language">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fr">FRANÇAIS</SelectItem>
                          <SelectItem value="en">ENGLISH</SelectItem>
                          <SelectItem value="de">DEUTSCH</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="text-lg">≡</span>
                        <span className="font-medium">Détails</span>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1">
                          <Label className="text-sm text-gray-600">Chef exécutif</Label>
                          <Input 
                            placeholder="Nom du chef"
                            value={executiveChefField || selectedRestaurantData?.executiveChef || ""}
                            onChange={(e) => setExecutiveChefField(e.target.value)}
                            className="border-0 border-b border-gray-200 rounded-none px-0 focus-visible:ring-0 focus-visible:border-gray-400"
                            data-testid="input-chef"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-sm text-gray-600">Transports en commun</Label>
                          <Input 
                            placeholder="Station de métro, gare la plus proche..."
                            value={publicTransportField || selectedRestaurantData?.publicTransport || ""}
                            onChange={(e) => setPublicTransportField(e.target.value)}
                            className="border-0 border-b border-gray-200 rounded-none px-0 focus-visible:ring-0 focus-visible:border-gray-400"
                            data-testid="input-transport"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-sm text-gray-600">Parking à proximité</Label>
                          <Input 
                            placeholder="Parking le plus proche, public ou privé..."
                            value={nearbyParkingField || selectedRestaurantData?.nearbyParking || ""}
                            onChange={(e) => setNearbyParkingField(e.target.value)}
                            className="border-0 border-b border-gray-200 rounded-none px-0 focus-visible:ring-0 focus-visible:border-gray-400"
                            data-testid="input-parking"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-sm text-gray-600">Informations supplémentaires</Label>
                          <Input 
                            placeholder="Comment se rendre au restaurant..."
                            value={additionalInfoField || selectedRestaurantData?.additionalInfo || ""}
                            onChange={(e) => setAdditionalInfoField(e.target.value)}
                            className="border-0 border-b border-gray-200 rounded-none px-0 focus-visible:ring-0 focus-visible:border-gray-400"
                            data-testid="input-infos-supplementaires"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6 pt-6">
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="text-lg">≡</span>
                        <span className="font-medium">Services proposés...</span>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-sm text-gray-600">Paiements Acceptés</Label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pb-2 border-b border-gray-200">
                            {[
                              { value: "Espèces", icon: "💵" },
                              { value: "Visa", icon: "💳" },
                              { value: "Mastercard", icon: "💳" },
                              { value: "American Express", icon: "💳" },
                              { value: "TWINT", icon: "📱" },
                              { value: "PostFinance", icon: "🏦" },
                              { value: "Apple Pay", icon: "🍎" },
                              { value: "Google Pay", icon: "📱" },
                            ].map((method) => {
                              const currentMethods = getCurrentPaymentMethods();
                              const isSelected = currentMethods.includes(method.value);
                              return (
                                <label
                                  key={method.value}
                                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                                    isSelected ? "bg-primary/10 border-primary border" : "bg-muted/50 hover:bg-muted border border-transparent"
                                  }`}
                                >
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={(checked) => {
                                      const current = getCurrentPaymentMethods();
                                      if (checked) {
                                        setPaymentMethods([...current, method.value]);
                                      } else {
                                        setPaymentMethods(current.filter(m => m !== method.value));
                                      }
                                    }}
                                  />
                                  <span className="text-sm">{method.icon} {method.value}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm text-gray-600">Plats végétariens disponibles</Label>
                          <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
                            <label className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                              (hasVegetarianOptions ?? selectedRestaurantData?.hasVegetarianOptions) ? "bg-green-100 border-green-500 border" : "bg-muted/50 hover:bg-muted border border-transparent"
                            }`}>
                              <Checkbox
                                checked={hasVegetarianOptions ?? selectedRestaurantData?.hasVegetarianOptions ?? false}
                                onCheckedChange={(checked) => setHasVegetarianOptions(checked as boolean)}
                              />
                              <span className="text-sm">🥗 Plats végétariens</span>
                            </label>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm text-gray-600">Langues parlées</Label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pb-2">
                            {[
                              { value: "Français", icon: "🇫🇷" },
                              { value: "Allemand", icon: "🇩🇪" },
                              { value: "Italien", icon: "🇮🇹" },
                              { value: "Anglais", icon: "🇬🇧" },
                              { value: "Espagnol", icon: "🇪🇸" },
                              { value: "Portugais", icon: "🇵🇹" },
                            ].map((lang) => {
                              const currentLanguages = getCurrentSpokenLanguages();
                              const isSelected = currentLanguages.includes(lang.value);
                              return (
                                <label
                                  key={lang.value}
                                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                                    isSelected ? "bg-primary/10 border-primary border" : "bg-muted/50 hover:bg-muted border border-transparent"
                                  }`}
                                >
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={(checked) => {
                                      const current = getCurrentSpokenLanguages();
                                      if (checked) {
                                        setSpokenLanguages([...current, lang.value]);
                                      } else {
                                        setSpokenLanguages(current.filter(l => l !== lang.value));
                                      }
                                    }}
                                  />
                                  <span className="text-sm">{lang.icon} {lang.value}</span>
                                </label>
                              );
                            })}
                          </div>
                          <div className="flex gap-2 items-center pb-2 border-b border-gray-200">
                            <Input
                              placeholder="Autre langue..."
                              value={customLanguage}
                              onChange={(e) => setCustomLanguage(e.target.value)}
                              className="flex-1 h-8 text-sm"
                              data-testid="input-custom-language"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (customLanguage.trim()) {
                                  const current = getCurrentSpokenLanguages();
                                  if (!current.includes(customLanguage.trim())) {
                                    setSpokenLanguages([...current, customLanguage.trim()]);
                                  }
                                  setCustomLanguage("");
                                }
                              }}
                              data-testid="button-add-language"
                            >
                              Ajouter
                            </Button>
                          </div>
                          {getCurrentSpokenLanguages().filter(l => !["Français", "Allemand", "Italien", "Anglais", "Espagnol", "Portugais"].includes(l)).length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {getCurrentSpokenLanguages().filter(l => !["Français", "Allemand", "Italien", "Anglais", "Espagnol", "Portugais"].includes(l)).map((lang) => (
                                <span key={lang} className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 border border-primary rounded-full text-sm">
                                  {lang}
                                  <button
                                    type="button"
                                    className="ml-1 text-gray-500 hover:text-gray-700"
                                    onClick={() => {
                                      const current = getCurrentSpokenLanguages();
                                      setSpokenLanguages(current.filter(l => l !== lang));
                                    }}
                                  >×</button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm text-gray-600">Cadre et ambiance</Label>
                          <div className="pb-2 border-b border-gray-200">
                            <Select>
                              <SelectTrigger className="border-0 px-0 h-auto focus:ring-0" data-testid="select-ambiance">
                                <SelectValue placeholder="Sélectionner" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="romantique">Romantique</SelectItem>
                                <SelectItem value="familial">Familial</SelectItem>
                                <SelectItem value="affaires">Repas d'affaires</SelectItem>
                                <SelectItem value="branche">Branché</SelectItem>
                                <SelectItem value="traditionnel">Traditionnel</SelectItem>
                                <SelectItem value="moderne">Moderne</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 pb-6">
                      <Button 
                        variant="outline" 
                        onClick={() => setActiveSection("overview")}
                        className="px-6"
                      >
                        ANNULER
                      </Button>
                      <Button 
                        onClick={handleSaveProfile}
                        disabled={saveProfileMutation.isPending}
                        className="px-6 bg-primary hover:bg-primary/90"
                        data-testid="save-profil"
                      >
                        {saveProfileMutation.isPending ? "..." : "ENREGISTRER"}
                      </Button>
                    </div>
                  </div>
                )}

                {profileSubSection === "photos" && (
                  <div className="space-y-6 max-w-3xl">
                    {/* Hidden file inputs */}
                    <input
                      ref={menuPdfInputRef}
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={handleMenuPdfUpload}
                      data-testid="input-menu-pdf"
                    />
                    <input
                      ref={profileImageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProfileImageUpload}
                      data-testid="input-profile-image"
                    />
                    <input
                      ref={photosInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handlePhotosUpload}
                      data-testid="input-photos"
                    />
                    
                    {/* Photo de profil */}
                    <Card className="bg-white">
                      <CardContent className="p-6">
                        <h3 className="font-semibold flex items-center gap-2 mb-6 text-gray-700">
                          <Image className="h-5 w-5" />
                          Photo de profil du restaurant
                        </h3>
                        
                        <div className="flex items-start gap-6">
                          {selectedRestaurantData?.image && (
                            <div className="w-40 h-28 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                              <img 
                                src={selectedRestaurantData.image} 
                                alt={selectedRestaurantData.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          
                          <div className="flex-1">
                            <p className="text-sm text-gray-600 mb-3">
                              Cette photo sera affichée sur la page publique de votre restaurant.
                            </p>
                            <Button 
                              variant="outline" 
                              onClick={() => profileImageInputRef.current?.click()}
                              disabled={isUploading}
                              data-testid="btn-upload-profile"
                            >
                              {isUploading ? "Téléchargement..." : "Changer la photo de profil"}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Galerie photos */}
                    <Card className="bg-white">
                      <CardContent className="p-6">
                        <h3 className="font-semibold flex items-center gap-2 mb-6 text-gray-700">
                          <Image className="h-5 w-5" />
                          Galerie photos
                        </h3>
                        
                        {/* Photos existantes */}
                        {selectedRestaurantData?.photos && selectedRestaurantData.photos.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            {selectedRestaurantData.photos.map((photo, index) => (
                              <div key={index} className="relative group">
                                <div className="w-full aspect-square rounded-lg overflow-hidden bg-gray-100">
                                  <img 
                                    src={photo} 
                                    alt={`Photo ${index + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <button
                                  onClick={() => removePhoto(photo)}
                                  className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  data-testid={`btn-remove-photo-${index}`}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Zone d'upload */}
                        <div 
                          className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                          onClick={() => photosInputRef.current?.click()}
                        >
                          <Image className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                          <p className="text-gray-600 mb-2">Glissez vos photos ici ou cliquez pour télécharger</p>
                          <p className="text-sm text-gray-400 mb-4">Format JPG, PNG. Max 5 Mo par image.</p>
                          <Button 
                            variant="outline" 
                            disabled={isUploading}
                            data-testid="btn-upload-photos"
                            onClick={(e) => { e.stopPropagation(); photosInputRef.current?.click(); }}
                          >
                            {isUploading ? "Téléchargement..." : "Choisir des fichiers"}
                          </Button>
                        </div>

                        <div className="pt-4 border-t mt-6 flex justify-end gap-3">
                          <Button variant="outline" onClick={() => setActiveSection("overview")}>
                            Retour
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Menu PDF */}
                    <Card className="bg-white">
                      <CardContent className="p-6">
                        <h3 className="font-semibold flex items-center gap-2 mb-6 text-gray-700">
                          <FileText className="h-5 w-5" />
                          Menu / Carte (PDF)
                        </h3>

                        {selectedRestaurantData?.menuPdfUrl ? (
                          <div className="flex items-center gap-4 mb-4">
                            <a
                              href={selectedRestaurantData.menuPdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-sm flex items-center gap-2"
                            >
                              <FileText className="h-4 w-4" />
                              Voir le menu actuel (PDF)
                            </a>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={removeMenuPdf}
                              data-testid="btn-remove-menu-pdf"
                            >
                              Supprimer
                            </Button>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400 mb-4">Aucun menu PDF téléchargé</p>
                        )}

                        <Button
                          variant="outline"
                          onClick={() => menuPdfInputRef.current?.click()}
                          disabled={isUploading}
                          data-testid="btn-upload-menu-pdf"
                        >
                          {isUploading ? "Téléchargement..." : selectedRestaurantData?.menuPdfUrl ? "Remplacer le menu PDF" : "Télécharger un menu PDF"}
                        </Button>
                        <p className="text-sm text-gray-400 mt-2">Format PDF uniquement. Max 10 Mo.</p>
                      </CardContent>
                    </Card>
                  </div>
                )}

              </>
            )}

            {activeSection === "plan-de-salle" && activeRestaurantId && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <Button
                    variant="ghost"
                    onClick={() => setActiveSection("overview")}
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Retour
                  </Button>
                  <h1 className="text-2xl font-bold">Plan de salle</h1>
                </div>
                <FloorPlanBuilder restaurantId={activeRestaurantId} />
              </div>
            )}

            {activeSection === "services" && (
              <>
                {servicesSubSection === "service-hours" && (
                  <ServiceHoursSection 
                    onBack={() => setActiveSection("overview")}
                    onSave={() => toast({ title: "Horaires enregistrés" })}
                    restaurantId={activeRestaurantId || null}
                    existingHours={selectedRestaurantData?.openingHours as Record<string, DayHours> | null || null}
                  />
                )}

                {servicesSubSection === "capacity" && (
                  <div className="space-y-6 max-w-4xl">
                    <h2 className="text-2xl font-bold">Capacité et couverts</h2>

                    <Card className="bg-white border shadow-sm">
                      <CardContent className="p-0">
                        <div className="px-6 py-4 border-b bg-gray-50/50">
                          <h3 className="text-sm font-medium text-gray-600 flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Capacité du restaurant
                          </h3>
                        </div>
                        <div className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label className="flex items-center gap-1">
                                Limite de couverts réservables
                                <HelpCircle className="h-4 w-4 text-gray-400" />
                              </Label>
                              <Input 
                                type="number" 
                                value={capacityValue ?? selectedRestaurantData?.capacity ?? 40}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  setCapacityValue(val);
                                  // Si onlineCapacity dépasse la nouvelle capacity, l'ajuster
                                  const currentOnline = onlineCapacityValue ?? selectedRestaurantData?.onlineCapacity ?? val;
                                  if (currentOnline > val) {
                                    setOnlineCapacityValue(val);
                                  }
                                }}
                                className="border-gray-200"
                                data-testid="input-capacity"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="flex items-center gap-1">
                                <Globe className="h-4 w-4" />
                                Maximum de couverts réservables en ligne
                                <HelpCircle className="h-4 w-4 text-gray-400" />
                              </Label>
                              <Input 
                                type="number" 
                                value={onlineCapacityValue ?? selectedRestaurantData?.onlineCapacity ?? selectedRestaurantData?.capacity ?? 40}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  const maxVal = capacityValue ?? selectedRestaurantData?.capacity ?? 40;
                                  setOnlineCapacityValue(Math.min(val, maxVal));
                                }}
                                max={capacityValue ?? selectedRestaurantData?.capacity ?? 40}
                                className="border-gray-200"
                                data-testid="input-online-capacity"
                              />
                              <p className="text-xs text-gray-500">Maximum: {capacityValue ?? selectedRestaurantData?.capacity ?? 40} (égal à la limite de couverts)</p>
                            </div>
                          </div>

                          <div className="mt-6 pt-6 border-t">
                            <h4 className="text-sm font-medium mb-4">Accepter automatiquement les réservations en ligne entre</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-sm text-gray-500">Minimum de personnes</Label>
                                <Input 
                                  type="number" 
                                  value={minGuestsValue ?? selectedRestaurantData?.minGuests ?? 1}
                                  onChange={(e) => setMinGuestsValue(parseInt(e.target.value) || 1)}
                                  min={1}
                                  className="border-gray-200" 
                                  data-testid="input-min-guests" 
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm text-gray-500">Maximum de personnes</Label>
                                <Input 
                                  type="number" 
                                  value={maxGuestsValue ?? selectedRestaurantData?.maxGuests ?? 12}
                                  onChange={(e) => setMaxGuestsValue(parseInt(e.target.value) || 12)}
                                  min={1}
                                  className="border-gray-200" 
                                  data-testid="input-max-guests" 
                                />
                              </div>
                            </div>
                          </div>

                          <div className="mt-6 flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium">Demandes de réservations de groupe</p>
                              <p className="text-sm text-gray-500">Accepter les demandes pour plus de 12 personnes</p>
                            </div>
                            <Switch data-testid="toggle-group-bookings" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex justify-end gap-3 pt-4 pb-6">
                      <Button variant="outline" onClick={() => setActiveSection("overview")} className="px-6">
                        ANNULER
                      </Button>
                      <Button onClick={handleSaveCapacity} disabled={saveCapacityMutation.isPending} className="px-6" data-testid="save-capacity">
                        ENREGISTRER
                      </Button>
                    </div>
                  </div>
                )}

                              </>
            )}

            {activeSection === "users" && (
              <>
                <div className="flex items-center gap-4 mb-6">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setActiveSection("overview")}
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Retour
                  </Button>
                  <h1 className="text-2xl font-bold">Gestion des utilisateurs</h1>
                </div>

                <Card className="bg-white max-w-2xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-semibold">Équipe</h3>
                      <Button size="sm" data-testid="add-user" onClick={() => setAddUserDialog(true)}>
                        Ajouter un utilisateur
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {user && (
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <UserCircle className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{user.firstName} {user.lastName}</p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                          </div>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                            Propriétaire
                          </span>
                        </div>
                      )}
                      
                      {restaurantUsers.map((teamUser: any) => (
                        <div key={teamUser.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg" data-testid={`team-user-${teamUser.id}`}>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <UserCircle className="h-6 w-6 text-gray-500" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {teamUser.firstName || teamUser.lastName 
                                  ? `${teamUser.firstName || ""} ${teamUser.lastName || ""}`.trim()
                                  : teamUser.email}
                              </p>
                              <p className="text-sm text-gray-500">{teamUser.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full font-medium capitalize">
                              {teamUser.role === "staff" ? "Employé" : teamUser.role === "manager" ? "Manager" : teamUser.role}
                            </span>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => removeUserMutation.mutate(teamUser.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              data-testid={`remove-user-${teamUser.id}`}
                            >
                              Retirer
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {activeSection === "legal" && (
              <>
                <div className="flex items-center gap-4 mb-6">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setActiveSection("overview")}
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Retour
                  </Button>
                  <h1 className="text-2xl font-bold">Confidentialité et conditions</h1>
                </div>

                <Card className="bg-white max-w-2xl">
                  <CardContent className="p-6 space-y-4">
                    <a 
                      href="#" 
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-gray-500" />
                        <span className="font-medium">Conditions générales de vente et d'utilisation</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </a>

                    <a 
                      href="#" 
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-gray-500" />
                        <span className="font-medium">Confidentialité et utilisation des cookies</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </a>

                    <a 
                      href="#" 
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <SettingsIcon className="h-5 w-5 text-gray-500" />
                        <span className="font-medium">Gestion des cookies</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </a>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Parameters Section */}
            {activeSection === "parameters" && (
              <>
                <div className="flex items-center gap-4 mb-6">
                  <Button
                    variant="ghost"
                    onClick={() => setActiveSection("overview")}
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Retour
                  </Button>
                  <h1 className="text-2xl font-bold">Paramètres</h1>
                </div>

                <div className="space-y-6 max-w-3xl">
                  <Card className="bg-white">
                    <CardContent className="p-6 space-y-6">
                      <div>
                        <h3 className="font-bold text-lg mb-2">Paramètres généraux</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Configurez les paramètres généraux de votre établissement.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <span className="font-medium text-gray-900">Demander le montant de la facture au départ client</span>
                          </div>
                          <Switch 
                            checked={askBillAmount || selectedRestaurantData?.askBillAmount || false}
                            onCheckedChange={handleAskBillAmountChange}
                            data-testid="switch-ask-bill-amount"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {/* Widget Section */}
            {activeSection === "embed" && (
              <>
                <div className="flex items-center gap-4 mb-6">
                  <Button
                    variant="ghost"
                    onClick={() => setActiveSection("overview")}
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Retour
                  </Button>
                  <h1 className="text-2xl font-bold">Widget de réservation</h1>
                </div>

                <div className="space-y-6 max-w-3xl">
                  <Card className="bg-white">
                    <CardContent className="p-6 space-y-6">
                      <div>
                        <h3 className="font-bold text-lg mb-2">Intégrez la réservation sur votre site</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Copiez le code ci-dessous et collez-le dans votre site web pour permettre à vos clients de réserver directement.
                        </p>
                      </div>

                      {/* Button Widget */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Code className="h-5 w-5 text-primary" />
                          <h4 className="font-medium">Bouton de réservation</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Un bouton simple qui redirige vers votre page de réservation.
                        </p>
                        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                          <code>{`<a href="${window.location.origin}/restaurant/${activeRestaurantId}" target="_blank" style="display:inline-block;padding:12px 24px;background:#00645A;color:white;text-decoration:none;border-radius:8px;font-family:sans-serif;font-weight:600;">Réserver une table</a>`}</code>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(`<a href="${window.location.origin}/restaurant/${activeRestaurantId}" target="_blank" style="display:inline-block;padding:12px 24px;background:#00645A;color:white;text-decoration:none;border-radius:8px;font-family:sans-serif;font-weight:600;">Réserver une table</a>`);
                            toast({ title: "Copié !", description: "Le code a été copié dans le presse-papiers" });
                          }}
                          className="gap-2"
                          data-testid="button-copy-widget-button"
                        >
                          <Copy className="h-4 w-4" />
                          Copier le code
                        </Button>
                      </div>

                      <div className="border-t pt-6">
                        {/* iFrame Widget */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Code className="h-5 w-5 text-primary" />
                            <h4 className="font-medium">Widget intégré (iframe)</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Intégrez directement le formulaire de réservation dans votre site.
                          </p>
                          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                            <code>{`<iframe src="${window.location.origin}/restaurant/${activeRestaurantId}?embed=true" width="100%" height="600" frameborder="0" style="border-radius:12px;max-width:400px;"></iframe>`}</code>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(`<iframe src="${window.location.origin}/restaurant/${activeRestaurantId}?embed=true" width="100%" height="600" frameborder="0" style="border-radius:12px;max-width:400px;"></iframe>`);
                              toast({ title: "Copié !", description: "Le code a été copié dans le presse-papiers" });
                            }}
                            className="gap-2"
                            data-testid="button-copy-widget-iframe"
                          >
                            <Copy className="h-4 w-4" />
                            Copier le code
                          </Button>
                        </div>
                      </div>

                      <div className="border-t pt-6">
                        {/* Link for Instagram/Social */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <ExternalLink className="h-5 w-5 text-primary" />
                            <h4 className="font-medium">Lien pour Instagram / Réseaux sociaux</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Ajoutez ce lien dans votre bio Instagram ou sur vos réseaux sociaux.
                          </p>
                          <div className="flex items-center gap-2">
                            <Input 
                              readOnly 
                              value={`${window.location.origin}/restaurant/${activeRestaurantId}`}
                              className="font-mono text-sm"
                              data-testid="input-widget-link"
                            />
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/restaurant/${activeRestaurantId}`);
                                toast({ title: "Copié !", description: "Le lien a été copié dans le presse-papiers" });
                              }}
                              data-testid="button-copy-widget-link"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-6">
                        <div className="bg-primary/5 p-4 rounded-lg">
                          <h4 className="font-medium mb-2">Aperçu du bouton</h4>
                          <a 
                            href={`/restaurant/${activeRestaurantId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block px-6 py-3 bg-[#00645A] text-white rounded-lg font-semibold hover:bg-[#005249] transition-colors"
                          >
                            Réserver une table
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </main>
        </div>
      </div>

      <Dialog open={addUserDialog} onOpenChange={setAddUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un utilisateur</DialogTitle>
            <DialogDescription>Créez un compte pour un membre de votre équipe</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (newUserEmail && newUserPassword) {
              addUserMutation.mutate({ 
                email: newUserEmail, 
                password: newUserPassword,
                firstName: newUserFirstName,
                lastName: newUserLastName,
                role: newUserRole 
              });
            }
          }}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="user-firstname">Prénom</Label>
                  <Input
                    id="user-firstname"
                    type="text"
                    placeholder="Jean"
                    value={newUserFirstName}
                    onChange={(e) => setNewUserFirstName(e.target.value)}
                    data-testid="input-user-firstname"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-lastname">Nom</Label>
                  <Input
                    id="user-lastname"
                    type="text"
                    placeholder="Dupont"
                    value={newUserLastName}
                    onChange={(e) => setNewUserLastName(e.target.value)}
                    data-testid="input-user-lastname"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-email">Adresse email</Label>
                <Input
                  id="user-email"
                  type="email"
                  placeholder="email@exemple.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  required
                  data-testid="input-user-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-password">Mot de passe</Label>
                <Input
                  id="user-password"
                  type="password"
                  placeholder="••••••••"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  required
                  minLength={6}
                  data-testid="input-user-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-role">Rôle</Label>
                <Select value={newUserRole} onValueChange={setNewUserRole}>
                  <SelectTrigger data-testid="select-user-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Employé</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddUserDialog(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={addUserMutation.isPending} data-testid="submit-add-user">
                {addUserMutation.isPending ? "Ajout..." : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
