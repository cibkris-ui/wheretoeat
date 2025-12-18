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
  HelpCircle
} from "lucide-react";
import type { Restaurant } from "@shared/schema";

type SettingsSection = "overview" | "profile" | "services" | "users" | "reservations" | "appearance" | "legal";
type ProfileSubSection = "contacts" | "profil" | "photos";

export default function Settings() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [activeSection, setActiveSection] = useState<SettingsSection>("overview");
  const [profileSubSection, setProfileSubSection] = useState<ProfileSubSection>("contacts");
  const [selectedRestaurant, setSelectedRestaurant] = useState<number | null>(null);

  const { data: myRestaurants = [] } = useQuery<Restaurant[]>({
    queryKey: ["/api/my-restaurants"],
    enabled: isAuthenticated,
  });

  const activeRestaurantId = selectedRestaurant || myRestaurants[0]?.id;
  const selectedRestaurantData = myRestaurants.find(r => r.id === activeRestaurantId);

  const sidebarItems = [
    { id: "reservations" as const, icon: LayoutDashboard, label: "Réservations", link: "/dashboard" },
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
        { id: "time-slots", label: "Créneaux horaires", icon: CalendarDays },
      ]
    },
    {
      id: "reservations",
      icon: CalendarDays,
      title: "Module de réservation",
      items: [
        { id: "booking-settings", label: "Paramètres de réservation", icon: SettingsIcon },
        { id: "auto-confirm", label: "Confirmation automatique", icon: Bell },
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
      id: "appearance",
      icon: Palette,
      title: "Conception et communication",
      items: [
        { id: "branding", label: "Personnalisation", icon: Palette },
        { id: "website", label: "Page de réservation", icon: Globe },
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
                              onClick={() => setActiveSection(category.id as SettingsSection)}
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
                  <h1 className="text-2xl font-bold">Profil du restaurant</h1>
                </div>

                <div className="flex gap-4 mb-6 border-b">
                  <button
                    onClick={() => setProfileSubSection("contacts")}
                    className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                      profileSubSection === "contacts" 
                        ? "border-primary text-primary" 
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                    data-testid="tab-contacts"
                  >
                    Contacts
                  </button>
                  <button
                    onClick={() => setProfileSubSection("profil")}
                    className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                      profileSubSection === "profil" 
                        ? "border-primary text-primary" 
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                    data-testid="tab-profil"
                  >
                    Profil
                  </button>
                  <button
                    onClick={() => setProfileSubSection("photos")}
                    className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                      profileSubSection === "photos" 
                        ? "border-primary text-primary" 
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                    data-testid="tab-photos"
                  >
                    Photos
                  </button>
                </div>

                {profileSubSection === "contacts" && (
                  <div className="space-y-6 max-w-3xl">
                    <Card className="bg-white">
                      <CardContent className="p-6">
                        <h3 className="font-semibold flex items-center gap-2 mb-6 text-gray-700">
                          <Building2 className="h-5 w-5" />
                          Informations de base
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="restaurant-name" className="flex items-center gap-1">
                              Nom du restaurant
                              <HelpCircle className="h-3.5 w-3.5 text-gray-400" />
                            </Label>
                            <Input 
                              id="restaurant-name" 
                              defaultValue={selectedRestaurantData?.name || ""} 
                              data-testid="input-restaurant-name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="flex items-center gap-1">
                              Langue préférée du restaurant
                              <span className="text-red-500">*</span>
                            </Label>
                            <Select defaultValue="fr">
                              <SelectTrigger data-testid="select-language">
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
                          <div className="space-y-2">
                            <Label htmlFor="email" className="flex items-center gap-1">
                              Adresse e-mail publique du restaurant
                              <span className="text-red-500">*</span>
                            </Label>
                            <Input 
                              id="email" 
                              type="email"
                              defaultValue="" 
                              placeholder="contact@restaurant.ch"
                              data-testid="input-email"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="phone">Téléphone du restaurant (public)</Label>
                            <div className="flex gap-2">
                              <Select defaultValue="+41">
                                <SelectTrigger className="w-24" data-testid="select-country-code">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="+41">🇨🇭 +41</SelectItem>
                                  <SelectItem value="+33">🇫🇷 +33</SelectItem>
                                  <SelectItem value="+49">🇩🇪 +49</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input 
                                id="phone" 
                                defaultValue={selectedRestaurantData?.phone?.replace('+41 ', '') || ""} 
                                placeholder="78 305 31 51"
                                className="flex-1"
                                data-testid="input-phone"
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white">
                      <CardContent className="p-6">
                        <h3 className="font-semibold flex items-center gap-2 mb-6 text-gray-700">
                          <FileText className="h-5 w-5" />
                          Informations légales
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="registre-commerce" className="flex items-center gap-1">
                              Registre du Commerce (RC)
                              <HelpCircle className="h-3.5 w-3.5 text-gray-400" />
                            </Label>
                            <Input 
                              id="registre-commerce" 
                              defaultValue="Registre du commerce du Canton de Genève" 
                              data-testid="input-registre-commerce"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="numero-registre" className="flex items-center gap-1">
                              N° registre commerce
                              <HelpCircle className="h-3.5 w-3.5 text-gray-400" />
                            </Label>
                            <Input 
                              id="numero-registre" 
                              defaultValue="" 
                              placeholder="CHE-XXX.XXX.XXX"
                              data-testid="input-numero-registre"
                            />
                          </div>
                        </div>

                        <div className="mt-4 flex items-start gap-2">
                          <input 
                            type="checkbox" 
                            id="certify-legal" 
                            className="mt-1 h-4 w-4 rounded border-gray-300"
                            defaultChecked
                            data-testid="checkbox-certify"
                          />
                          <Label htmlFor="certify-legal" className="text-sm text-gray-600 font-normal">
                            Je certifie que je ne proposerai que des produits ou services conformes aux règles applicables du droit de l'Union européenne.
                          </Label>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white">
                      <CardContent className="p-6">
                        <h3 className="font-semibold flex items-center gap-2 mb-6 text-gray-700">
                          <Globe className="h-5 w-5" />
                          Site internet
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="website">Site internet du restaurant</Label>
                            <Input 
                              id="website" 
                              defaultValue="" 
                              placeholder="https://www.mon-restaurant.ch"
                              data-testid="input-website"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="privacy-policy" className="flex items-center gap-1">
                              Lien vers la politique de confidentialité
                              <HelpCircle className="h-3.5 w-3.5 text-gray-400" />
                            </Label>
                            <Input 
                              id="privacy-policy" 
                              defaultValue="" 
                              placeholder="https://example.com/privacy-policy"
                              data-testid="input-privacy-policy"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white">
                      <CardContent className="p-6">
                        <h3 className="font-semibold flex items-center gap-2 mb-6 text-gray-700">
                          <MapPin className="h-5 w-5" />
                          Localisation
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
                            <div className="text-center text-gray-500">
                              <MapPin className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                              <p className="text-sm">Carte Google Maps</p>
                              <p className="text-xs">(Intégration requise)</p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label className="flex items-center gap-1">
                                Adresse de votre restaurant
                                <HelpCircle className="h-3.5 w-3.5 text-gray-400" />
                              </Label>
                              <p className="text-lg font-medium">
                                {selectedRestaurantData?.address || "Rue du Grand-Bureau 16"}
                              </p>
                              <p className="text-gray-600">
                                {selectedRestaurantData?.location || "1227 Genève"}
                              </p>
                            </div>
                            <Button variant="outline" size="sm" data-testid="btn-change-address">
                              Modifier l'adresse
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex justify-end gap-3 pb-6">
                      <Button variant="outline" onClick={() => setActiveSection("overview")}>
                        Annuler
                      </Button>
                      <Button 
                        onClick={() => toast({ title: "Modifications enregistrées" })}
                        data-testid="save-contacts"
                      >
                        Enregistrer
                      </Button>
                    </div>
                  </div>
                )}

                {profileSubSection === "profil" && (
                  <div className="space-y-6 max-w-3xl">
                    <Card className="bg-white">
                      <CardContent className="p-6 space-y-6">
                        <h3 className="font-semibold flex items-center gap-2 text-gray-700">
                          <Building2 className="h-5 w-5" />
                          Informations générales
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="cuisine">Type de cuisine</Label>
                            <Input 
                              id="cuisine" 
                              defaultValue={selectedRestaurantData?.cuisine || ""} 
                              data-testid="input-cuisine"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="price-range">Gamme de prix</Label>
                            <Select defaultValue={selectedRestaurantData?.priceRange || "$$"}>
                              <SelectTrigger data-testid="select-price-range">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="$">$ - Économique</SelectItem>
                                <SelectItem value="$$">$$ - Modéré</SelectItem>
                                <SelectItem value="$$$">$$$ - Haut de gamme</SelectItem>
                                <SelectItem value="$$$$">$$$$ - Luxe</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          <textarea 
                            id="description"
                            className="w-full min-h-[120px] px-3 py-2 rounded-md border border-input bg-background text-sm"
                            defaultValue={selectedRestaurantData?.description || ""}
                            placeholder="Décrivez votre restaurant, son ambiance, sa spécialité..."
                            data-testid="input-description"
                          />
                        </div>

                        <div className="pt-4 border-t flex justify-end gap-3">
                          <Button variant="outline" onClick={() => setActiveSection("overview")}>
                            Annuler
                          </Button>
                          <Button 
                            onClick={() => toast({ title: "Profil enregistré" })}
                            data-testid="save-profil"
                          >
                            Enregistrer
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
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
              </>
            )}

            {activeSection === "services" && (
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
                  <h1 className="text-2xl font-bold">Services</h1>
                </div>

                <div className="space-y-6 max-w-3xl">
                  <Card className="bg-white">
                    <CardContent className="p-6">
                      <h3 className="font-semibold flex items-center gap-2 mb-4">
                        <Clock className="h-5 w-5 text-gray-500" />
                        Heures de service
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-gray-400" />
                            À partir de
                          </Label>
                          <Select defaultValue="18:00">
                            <SelectTrigger data-testid="select-start-time">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {["11:00", "11:30", "12:00", "18:00", "18:30", "19:00"].map(time => (
                                <SelectItem key={time} value={time}>{time}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-gray-400" />
                            Jusqu'à
                          </Label>
                          <Select defaultValue="22:00">
                            <SelectTrigger data-testid="select-end-time">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {["14:00", "14:30", "15:00", "21:00", "21:30", "22:00", "22:30", "23:00"].map(time => (
                                <SelectItem key={time} value={time}>{time}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-gray-400" />
                            Dernière réservation
                          </Label>
                          <Select defaultValue="21:45">
                            <SelectTrigger data-testid="select-last-booking">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {["13:30", "14:00", "20:30", "21:00", "21:30", "21:45"].map(time => (
                                <SelectItem key={time} value={time}>{time}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white">
                    <CardContent className="p-6">
                      <h3 className="font-semibold flex items-center gap-2 mb-4">
                        <Users className="h-5 w-5 text-gray-500" />
                        Couverts
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1">
                            Limite de couverts réservables
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-4 w-4 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Nombre maximum de couverts par service</p>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          <Input 
                            type="number" 
                            defaultValue={selectedRestaurantData?.capacity || 40} 
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

                      <div className="mt-6">
                        <h4 className="text-sm font-medium mb-4">Accepter automatiquement les réservations en ligne entre</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                            <Label className="text-sm text-gray-500 flex items-center gap-1">
                              <Globe className="h-4 w-4" />
                              Minimum de personnes
                            </Label>
                            <p className="text-xl font-bold">1</p>
                          </div>
                          <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                            <Label className="text-sm text-gray-500 flex items-center gap-1">
                              <Globe className="h-4 w-4" />
                              Maximum de personnes
                            </Label>
                            <p className="text-xl font-bold">12</p>
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
                    </CardContent>
                  </Card>

                  <Card className="bg-white">
                    <CardContent className="p-6">
                      <h3 className="font-semibold flex items-center gap-2 mb-2">
                        <Clock className="h-5 w-5 text-gray-500" />
                        Cadence par créneau horaire
                      </h3>
                      <p className="text-sm text-gray-500 mb-6">
                        Contrôlez le nombre de clients pour chaque créneau horaire en limitant le nombre de couverts et de réservations.
                      </p>

                      <div className="space-y-3">
                        <div className="grid grid-cols-[80px_1fr_1fr] gap-4 text-sm font-medium text-gray-500 pb-2 border-b">
                          <div></div>
                          <div>Total réservé/maximum total</div>
                          <div>Réservations en ligne/maximum en ligne</div>
                        </div>
                        
                        {["18:00", "18:15", "18:30", "18:45", "19:00", "19:15", "19:30", "19:45", "20:00"].map(time => (
                          <div key={time} className="grid grid-cols-[80px_1fr_1fr] gap-4 items-center py-2">
                            <div className="flex items-center gap-2">
                              <Switch defaultChecked data-testid={`toggle-slot-${time}`} />
                              <span className="text-sm font-medium">{time}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">0 /</span>
                              <Input 
                                type="number" 
                                className="w-16 h-8 text-sm" 
                                defaultValue={10}
                                data-testid={`input-slot-max-${time}`}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">0 /</span>
                              <Input 
                                type="number" 
                                className="w-16 h-8 text-sm" 
                                defaultValue={10}
                                data-testid={`input-slot-online-${time}`}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setActiveSection("overview")}>
                      Annuler
                    </Button>
                    <Button 
                      onClick={() => toast({ title: "Paramètres enregistrés" })}
                      data-testid="save-services"
                    >
                      Appliquer
                    </Button>
                  </div>
                </div>
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

            {activeSection === "reservations" && (
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
                  <h1 className="text-2xl font-bold">Module de réservation</h1>
                </div>

                <Card className="bg-white max-w-2xl">
                  <CardContent className="p-6 space-y-6">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">Confirmation automatique</p>
                        <p className="text-sm text-gray-500">Confirmer automatiquement les réservations en ligne</p>
                      </div>
                      <Switch defaultChecked data-testid="toggle-auto-confirm" />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">Rappels par email</p>
                        <p className="text-sm text-gray-500">Envoyer des rappels aux clients avant leur réservation</p>
                      </div>
                      <Switch defaultChecked data-testid="toggle-email-reminders" />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">Permettre les annulations</p>
                        <p className="text-sm text-gray-500">Les clients peuvent annuler leurs réservations</p>
                      </div>
                      <Switch defaultChecked data-testid="toggle-cancellations" />
                    </div>

                    <div className="pt-4 border-t flex justify-end gap-3">
                      <Button variant="outline" onClick={() => setActiveSection("overview")}>
                        Annuler
                      </Button>
                      <Button onClick={() => toast({ title: "Paramètres enregistrés" })}>
                        Enregistrer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {activeSection === "appearance" && (
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
                  <h1 className="text-2xl font-bold">Conception et communication</h1>
                </div>

                <Card className="bg-white max-w-2xl">
                  <CardContent className="p-6">
                    <div className="text-center py-8">
                      <Palette className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="font-medium text-gray-600 mb-2">Personnalisation</h3>
                      <p className="text-sm text-gray-500">
                        Les options de personnalisation seront bientôt disponibles.
                      </p>
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
