import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Grid3X3
} from "lucide-react";
import type { Restaurant } from "@shared/schema";
import { FloorPlanBuilder } from "@/components/floor-plan/FloorPlanBuilder";

type SettingsSection = "overview" | "profile" | "services" | "users" | "legal";
type ProfileSubSection = "contacts" | "profil" | "photos" | "plan-de-salle";
type ServicesSubSection = "service-hours" | "capacity" | "time-slots";

export default function Settings() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [activeSection, setActiveSection] = useState<SettingsSection>("overview");
  const [profileSubSection, setProfileSubSection] = useState<ProfileSubSection>("contacts");
  const [servicesSubSection, setServicesSubSection] = useState<ServicesSubSection>("service-hours");
  const [selectedRestaurant, setSelectedRestaurant] = useState<number | null>(null);
  const [addressField, setAddressField] = useState("");
  const [cityField, setCityField] = useState("");

  const { data: myRestaurants = [] } = useQuery<Restaurant[]>({
    queryKey: ["/api/my-restaurants"],
    enabled: isAuthenticated,
  });

  const activeRestaurantId = selectedRestaurant || myRestaurants[0]?.id;
  const selectedRestaurantData = myRestaurants.find(r => r.id === activeRestaurantId);

  const defaultAddress = selectedRestaurantData?.address || "Rue du Grand-Bureau 16";
  const defaultCity = selectedRestaurantData?.location || "1227 Genève";
  
  const currentAddress = addressField || defaultAddress;
  const currentCity = cityField || defaultCity;
  
  const googleMapsUrl = useMemo(() => {
    const fullAddress = `${currentAddress}, ${currentCity}, Switzerland`;
    const encodedAddress = encodeURIComponent(fullAddress);
    return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodedAddress}`;
  }, [currentAddress, currentCity]);

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
        { id: "plan-de-salle", label: "Plan de salle", icon: LayoutDashboard },
      ]
    },
    {
      id: "services",
      icon: Clock,
      title: "Services",
      items: [
        { id: "service-hours", label: "Horaires de service", icon: Clock },
        { id: "capacity", label: "Capacité et couverts", icon: Users },
        { id: "time-slots", label: "Créneaux horaires", icon: CalendarDays },
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
  ];

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
                      <a href="/api/logout" className="cursor-pointer text-red-600">
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
                    href="/api/logout"
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
                                setActiveSection(category.id as SettingsSection);
                                if (category.id === "profile" && (item.id === "contacts" || item.id === "profil" || item.id === "photos" || item.id === "plan-de-salle")) {
                                  setProfileSubSection(item.id as ProfileSubSection);
                                }
                                if (category.id === "services" && (item.id === "service-hours" || item.id === "capacity" || item.id === "time-slots")) {
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
                              <Select defaultValue="en">
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
                                defaultValue="infosamyaziza@gmail.com"
                                className="border-gray-200"
                                data-testid="input-email"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-sm text-gray-500">Téléphone du restaurant (public)</Label>
                              <div className="flex items-center gap-2">
                                <Select defaultValue="+41">
                                  <SelectTrigger className="w-24 border-gray-200" data-testid="select-country-code">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="+41">🇨🇭 +41</SelectItem>
                                    <SelectItem value="+33">🇫🇷 +33</SelectItem>
                                    <SelectItem value="+49">🇩🇪 +49</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Input 
                                  defaultValue="78 305 31 51"
                                  className="flex-1 border-gray-200"
                                  data-testid="input-phone"
                                />
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
                              <div className="space-y-1">
                                <Label className="text-sm text-gray-500">Code postal et ville</Label>
                                <Input 
                                  value={currentCity}
                                  onChange={(e) => setCityField(e.target.value)}
                                  className="border-gray-200"
                                  data-testid="input-city"
                                />
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
                                Registre du Commerce (RC)
                                <HelpCircle className="h-3 w-3 text-gray-400" />
                              </Label>
                              <Input 
                                defaultValue="Registre du commerce du Canton de Genève"
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
                                defaultValue="CHE-177.597.349"
                                placeholder="CHE-XXX.XXX.XXX"
                                className="border-gray-200"
                                data-testid="input-numero-registre"
                              />
                            </div>
                          </div>
                          <div className="mt-6 flex items-start gap-3">
                            <input 
                              type="checkbox" 
                              id="certify-legal" 
                              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary"
                              defaultChecked
                              data-testid="checkbox-certify"
                            />
                            <Label htmlFor="certify-legal" className="text-sm text-gray-600 font-normal leading-relaxed">
                              Je certifie que je ne proposerai que des produits ou services conformes aux règles applicables du droit de l'Union européenne.
                            </Label>
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
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                            <div className="space-y-1">
                              <Label className="text-sm text-gray-500">Site internet du restaurant</Label>
                              <Input 
                                placeholder="https://www.mon-restaurant.ch"
                                className="border-gray-200"
                                data-testid="input-website"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-sm text-gray-500 flex items-center gap-1">
                                Lien vers la politique de confidentialité
                                <HelpCircle className="h-3 w-3 text-gray-400" />
                              </Label>
                              <Input 
                                defaultValue="https://example.com/privacy-policy"
                                className="border-gray-200"
                                data-testid="input-privacy-policy"
                              />
                            </div>
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
                        onClick={() => toast({ title: "Modifications enregistrées" })}
                        className="px-6 bg-primary hover:bg-primary/90"
                        data-testid="save-contacts"
                      >
                        ENREGISTRER
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
                    >
                      VOIR MA PAGE SUR WHERETOEAT
                    </Button>

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
                            className="border-0 border-b border-gray-200 rounded-none px-0 focus-visible:ring-0 focus-visible:border-gray-400"
                            data-testid="input-chef"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-sm text-gray-600">Transports en commun</Label>
                          <Input 
                            placeholder="Station de métro, gare la plus proche..."
                            className="border-0 border-b border-gray-200 rounded-none px-0 focus-visible:ring-0 focus-visible:border-gray-400"
                            data-testid="input-transport"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-sm text-gray-600">Parking à proximité</Label>
                          <Input 
                            placeholder="Parking le plus proche, public ou privé..."
                            className="border-0 border-b border-gray-200 rounded-none px-0 focus-visible:ring-0 focus-visible:border-gray-400"
                            data-testid="input-parking"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-sm text-gray-600">Fermetures annuelles</Label>
                          <Input 
                            placeholder="Période de fermeture du restaurant"
                            className="border-0 border-b border-gray-200 rounded-none px-0 focus-visible:ring-0 focus-visible:border-gray-400"
                            data-testid="input-fermetures"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-sm text-gray-600">Informations supplémentaires</Label>
                          <Input 
                            placeholder="Comment se rendre au restaurant..."
                            className="border-0 border-b border-gray-200 rounded-none px-0 focus-visible:ring-0 focus-visible:border-gray-400"
                            data-testid="input-infos-supplementaires"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6 pt-6">
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="text-lg">≡</span>
                        <span className="font-medium">Type de cuisine, services proposés...</span>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-sm text-gray-600">Cartes bancaires acceptées</Label>
                          <div className="flex flex-wrap gap-2 pb-2 border-b border-gray-200">
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm">
                              Carte Mastercard <button className="ml-1 text-gray-500 hover:text-gray-700">×</button>
                            </span>
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm">
                              Carte Visa <button className="ml-1 text-gray-500 hover:text-gray-700">×</button>
                            </span>
                            <Select>
                              <SelectTrigger className="w-8 h-8 border-0 p-0" data-testid="select-add-card">
                                <span className="text-gray-400">▼</span>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="amex">American Express</SelectItem>
                                <SelectItem value="twint">TWINT</SelectItem>
                                <SelectItem value="postfinance">PostFinance</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm text-gray-600">Régime alimentaire</Label>
                          <div className="flex flex-wrap gap-2 pb-2 border-b border-gray-200">
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm">
                              Options végétariennes <button className="ml-1 text-gray-500 hover:text-gray-700">×</button>
                            </span>
                            <Select>
                              <SelectTrigger className="w-8 h-8 border-0 p-0" data-testid="select-add-regime">
                                <span className="text-gray-400">▼</span>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="vegan">Options vegan</SelectItem>
                                <SelectItem value="sans-gluten">Sans gluten</SelectItem>
                                <SelectItem value="halal">Halal</SelectItem>
                                <SelectItem value="casher">Casher</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm text-gray-600">Services proposés</Label>
                          <div className="flex flex-wrap gap-2 pb-2 border-b border-gray-200">
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm">
                              Anglais parlé <button className="ml-1 text-gray-500 hover:text-gray-700">×</button>
                            </span>
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm">
                              Français parlé <button className="ml-1 text-gray-500 hover:text-gray-700">×</button>
                            </span>
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm">
                              Wifi <button className="ml-1 text-gray-500 hover:text-gray-700">×</button>
                            </span>
                            <Select>
                              <SelectTrigger className="w-8 h-8 border-0 p-0" data-testid="select-add-service">
                                <span className="text-gray-400">▼</span>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="terrasse">Terrasse</SelectItem>
                                <SelectItem value="climatisation">Climatisation</SelectItem>
                                <SelectItem value="accessible">Accessible PMR</SelectItem>
                                <SelectItem value="parking">Parking privé</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
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

                        <div className="space-y-2">
                          <Label className="text-sm text-gray-600">Cuisine</Label>
                          <div className="flex flex-wrap gap-2 pb-2 border-b border-gray-200">
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm">
                              Méditerranéen <button className="ml-1 text-gray-500 hover:text-gray-700">×</button>
                            </span>
                            <Select>
                              <SelectTrigger className="w-8 h-8 border-0 p-0" data-testid="select-add-cuisine">
                                <span className="text-gray-400">▼</span>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="francaise">Française</SelectItem>
                                <SelectItem value="italienne">Italienne</SelectItem>
                                <SelectItem value="japonaise">Japonaise</SelectItem>
                                <SelectItem value="suisse">Suisse</SelectItem>
                                <SelectItem value="indienne">Indienne</SelectItem>
                                <SelectItem value="libanaise">Libanaise</SelectItem>
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
                        onClick={() => toast({ title: "Profil enregistré avec succès" })}
                        className="px-6 bg-primary hover:bg-primary/90"
                        data-testid="save-profil"
                      >
                        ENREGISTRER
                      </Button>
                    </div>
                  </div>
                )}

                {profileSubSection === "photos" && (
                  <div className="space-y-6 max-w-3xl">
                    <Card className="bg-white">
                      <CardContent className="p-6">
                        <h3 className="font-semibold flex items-center gap-2 mb-6 text-gray-700">
                          <Image className="h-5 w-5" />
                          Photos du restaurant
                        </h3>
                        
                        <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
                          <Image className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                          <p className="text-gray-600 mb-2">Glissez vos photos ici ou cliquez pour télécharger</p>
                          <p className="text-sm text-gray-400 mb-4">Format JPG, PNG. Max 5 Mo par image.</p>
                          <Button variant="outline" data-testid="btn-upload-photos">
                            Choisir des fichiers
                          </Button>
                        </div>

                        {selectedRestaurantData?.image && (
                          <div className="mt-6">
                            <Label className="mb-2 block">Photo actuelle</Label>
                            <div className="w-40 h-28 rounded-lg overflow-hidden bg-gray-100">
                              <img 
                                src={selectedRestaurantData.image} 
                                alt={selectedRestaurantData.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                        )}

                        <div className="pt-4 border-t mt-6 flex justify-end gap-3">
                          <Button variant="outline" onClick={() => setActiveSection("overview")}>
                            Annuler
                          </Button>
                          <Button 
                            onClick={() => toast({ title: "Photos enregistrées" })}
                            data-testid="save-photos"
                          >
                            Enregistrer
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {profileSubSection === "plan-de-salle" && activeRestaurantId && (
                  <div className="space-y-6">
                    <FloorPlanBuilder restaurantId={activeRestaurantId} />
                  </div>
                )}
              </>
            )}

            {activeSection === "services" && (
              <>
                {servicesSubSection === "service-hours" && (
                  <div className="space-y-6 max-w-4xl">
                    <h2 className="text-2xl font-bold">Horaires de service</h2>

                    <Card className="bg-white border shadow-sm">
                      <CardContent className="p-0">
                        <div className="px-6 py-4 border-b bg-gray-50/50">
                          <h3 className="text-sm font-medium text-gray-600 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Heures d'ouverture
                          </h3>
                        </div>
                        <div className="p-6">
                          <div className="space-y-4">
                            {["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"].map((day) => (
                              <div key={day} className="flex items-center gap-4 py-2 border-b border-gray-100">
                                <div className="w-24">
                                  <span className="font-medium">{day}</span>
                                </div>
                                <Switch defaultChecked={day !== "Dimanche"} data-testid={`toggle-${day.toLowerCase()}`} />
                                <div className="flex items-center gap-2">
                                  <Select defaultValue="12:00">
                                    <SelectTrigger className="w-24" data-testid={`select-${day.toLowerCase()}-start`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {["11:00", "11:30", "12:00", "12:30"].map(time => (
                                        <SelectItem key={time} value={time}>{time}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <span className="text-gray-400">-</span>
                                  <Select defaultValue="14:00">
                                    <SelectTrigger className="w-24" data-testid={`select-${day.toLowerCase()}-end-lunch`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {["13:30", "14:00", "14:30", "15:00"].map(time => (
                                        <SelectItem key={time} value={time}>{time}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Select defaultValue="19:00">
                                    <SelectTrigger className="w-24" data-testid={`select-${day.toLowerCase()}-start-dinner`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {["18:00", "18:30", "19:00", "19:30"].map(time => (
                                        <SelectItem key={time} value={time}>{time}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <span className="text-gray-400">-</span>
                                  <Select defaultValue="22:00">
                                    <SelectTrigger className="w-24" data-testid={`select-${day.toLowerCase()}-end-dinner`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {["21:00", "21:30", "22:00", "22:30", "23:00"].map(time => (
                                        <SelectItem key={time} value={time}>{time}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex justify-end gap-3 pt-4 pb-6">
                      <Button variant="outline" onClick={() => setActiveSection("overview")} className="px-6">
                        ANNULER
                      </Button>
                      <Button onClick={() => toast({ title: "Horaires enregistrés" })} className="px-6" data-testid="save-service-hours">
                        ENREGISTRER
                      </Button>
                    </div>
                  </div>
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
                                defaultValue={selectedRestaurantData?.capacity || 40} 
                                className="border-gray-200"
                                data-testid="input-capacity"
                              />
                            </div>
                            <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                              <Label className="text-sm text-gray-500 flex items-center gap-1">
                                <Globe className="h-4 w-4" />
                                Maximum de couverts réservables en ligne
                              </Label>
                              <p className="text-2xl font-bold">{selectedRestaurantData?.capacity || 40}</p>
                            </div>
                          </div>

                          <div className="mt-6 pt-6 border-t">
                            <h4 className="text-sm font-medium mb-4">Accepter automatiquement les réservations en ligne entre</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-sm text-gray-500">Minimum de personnes</Label>
                                <Input type="number" defaultValue={1} className="border-gray-200" data-testid="input-min-guests" />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm text-gray-500">Maximum de personnes</Label>
                                <Input type="number" defaultValue={12} className="border-gray-200" data-testid="input-max-guests" />
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
                      <Button onClick={() => toast({ title: "Capacité enregistrée" })} className="px-6" data-testid="save-capacity">
                        ENREGISTRER
                      </Button>
                    </div>
                  </div>
                )}

                {servicesSubSection === "time-slots" && (
                  <div className="space-y-6 max-w-4xl">
                    <h2 className="text-2xl font-bold">Créneaux horaires</h2>

                    <Card className="bg-white border shadow-sm">
                      <CardContent className="p-0">
                        <div className="px-6 py-4 border-b bg-gray-50/50">
                          <h3 className="text-sm font-medium text-gray-600 flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            Cadence par créneau horaire
                          </h3>
                        </div>
                        <div className="p-6">
                          <p className="text-sm text-gray-500 mb-6">
                            Contrôlez le nombre de clients pour chaque créneau horaire en limitant le nombre de couverts et de réservations.
                          </p>

                          <div className="space-y-3">
                            <div className="grid grid-cols-[100px_1fr_1fr] gap-4 text-sm font-medium text-gray-500 pb-2 border-b">
                              <div>Créneau</div>
                              <div>Total réservé / maximum</div>
                              <div>En ligne / maximum</div>
                            </div>
                            
                            {["18:00", "18:15", "18:30", "18:45", "19:00", "19:15", "19:30", "19:45", "20:00"].map(time => (
                              <div key={time} className="grid grid-cols-[100px_1fr_1fr] gap-4 items-center py-2 border-b border-gray-100">
                                <div className="flex items-center gap-2">
                                  <Switch defaultChecked data-testid={`toggle-slot-${time}`} />
                                  <span className="text-sm font-medium">{time}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-500">0 /</span>
                                  <Input 
                                    type="number" 
                                    className="w-20 h-8 text-sm border-gray-200" 
                                    defaultValue={10}
                                    data-testid={`input-slot-max-${time}`}
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-500">0 /</span>
                                  <Input 
                                    type="number" 
                                    className="w-20 h-8 text-sm border-gray-200" 
                                    defaultValue={10}
                                    data-testid={`input-slot-online-${time}`}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex justify-end gap-3 pt-4 pb-6">
                      <Button variant="outline" onClick={() => setActiveSection("overview")} className="px-6">
                        ANNULER
                      </Button>
                      <Button onClick={() => toast({ title: "Créneaux enregistrés" })} className="px-6" data-testid="save-time-slots">
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
                      <Button size="sm" data-testid="add-user">
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
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
