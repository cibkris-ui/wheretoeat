import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiUrl } from "@/lib/queryClient";
import { useState } from "react";
import { 
  CheckCircle, XCircle, Clock, Store, MapPin, Users, Shield,
  Ban, Trash2, Eye, EyeOff, UserPlus, Search, Mail, Phone, LogOut,
  ArrowUpDown, ChevronUp, ChevronDown, KeyRound
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface Restaurant {
  id: number;
  name: string;
  cuisine: string;
  location: string;
  rating: number;
  priceRange: string;
  image: string;
  description: string;
  features: string[];
  ownerId: string | null;
  ownerEmail: string | null;
  phone: string | null;
  address: string | null;
  capacity: number | null;
  approvalStatus: string | null;
  isBlocked: boolean | null;
  createdAt: string | null;
}

interface Client {
  id: number;
  restaurantId: number | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  createdAt: string;
  totalBookings?: number;
  restaurantCount?: number;
  lastBookingDate?: string | null;
}

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  isAdmin: boolean | null;
  createdAt: string | null;
}

interface Registration {
  id: number;
  userId: string | null;
  restaurantName: string;
  address: string;
  phone: string;
  companyName: string;
  registrationNumber: string | null;
  cuisineType: string[];
  priceRange: string;
  description: string | null;
  logoUrl: string | null;
  photos: string[] | null;
  menuPdfUrl: string | null;
  status: string;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string | null;
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Erreur de connexion");
      }
      queryClient.invalidateQueries({ queryKey: ["user"] });
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Administration WHERETOEAT.CH</CardTitle>
          <CardDescription>Connectez-vous pour accéder au panneau d'administration</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@admin.com"
                required
                data-testid="input-admin-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="input-admin-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading} data-testid="button-admin-login">
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Admin() {
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("users");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "restaurant" | "user"; id: number | string } | null>(null);
  const [clientSort, setClientSort] = useState<{ column: string; direction: "asc" | "desc" }>({ column: "lastName", direction: "asc" });
  const [newUserDialog, setNewUserDialog] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", password: "", firstName: "", lastName: "", isAdmin: true });
  const [passwordDialog, setPasswordDialog] = useState<{ id: string; email: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [newRestaurantDialog, setNewRestaurantDialog] = useState(false);
  const [newRestaurant, setNewRestaurant] = useState({
    name: "",
    cuisine: "",
    location: "",
    priceRange: "$$",
    description: "",
    phone: "",
    address: "",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4",
  });

  const { data: restaurants = [] } = useQuery<Restaurant[]>({
    queryKey: ["admin-restaurants"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/admin/restaurants"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch restaurants");
      return res.json();
    },
    enabled: !!user?.isAdmin,
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["admin-clients"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/admin/clients"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch clients");
      return res.json();
    },
    enabled: !!user?.isAdmin,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/admin/users"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    enabled: !!user?.isAdmin,
  });

  const { data: registrations = [] } = useQuery<Registration[]>({
    queryKey: ["admin-registrations"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/registrations"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch registrations");
      return res.json();
    },
    enabled: !!user?.isAdmin,
  });

  const approveRegistrationMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(apiUrl(`/api/registrations/${id}/status`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "approved" }),
      });
      if (!res.ok) throw new Error("Failed to approve registration");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-registrations"] });
      queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] });
    },
  });

  const rejectRegistrationMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(apiUrl(`/api/registrations/${id}/status`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "rejected" }),
      });
      if (!res.ok) throw new Error("Failed to reject registration");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-registrations"] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(apiUrl(`/api/admin/restaurants/${id}/approve`), {
        method: "PUT",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to approve");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] }),
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(apiUrl(`/api/admin/restaurants/${id}/reject`), {
        method: "PUT",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to reject");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] }),
  });

  const blockMutation = useMutation({
    mutationFn: async ({ id, isBlocked }: { id: number; isBlocked: boolean }) => {
      const res = await fetch(apiUrl(`/api/admin/restaurants/${id}/block`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isBlocked }),
      });
      if (!res.ok) throw new Error("Failed to block/unblock");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] }),
  });

  const deleteRestaurantMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(apiUrl(`/api/admin/restaurants/${id}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] });
      setDeleteConfirm(null);
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      const res = await fetch(apiUrl("/api/admin/users"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(userData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to create user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setNewUserDialog(false);
      setNewUser({ email: "", password: "", firstName: "", lastName: "", isAdmin: true });
    },
  });

  const toggleAdminMutation = useMutation({
    mutationFn: async ({ id, isAdmin }: { id: string; isAdmin: boolean }) => {
      const res = await fetch(apiUrl(`/api/admin/users/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isAdmin }),
      });
      if (!res.ok) throw new Error("Failed to update user");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(apiUrl(`/api/admin/users/${id}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setDeleteConfirm(null);
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const res = await fetch(apiUrl(`/api/admin/users/${id}/password`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to change password");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Mot de passe modifie" });
      setPasswordDialog(null);
      setNewPassword("");
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const createRestaurantMutation = useMutation({
    mutationFn: async (data: typeof newRestaurant) => {
      const res = await fetch(apiUrl("/api/restaurants"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...data,
          rating: 0,
          features: [],
          approvalStatus: "approved",
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create restaurant");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] });
      setNewRestaurantDialog(false);
      setNewRestaurant({
        name: "",
        cuisine: "",
        location: "",
        priceRange: "$$",
        description: "",
        phone: "",
        address: "",
        image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4",
      });
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p>Chargement...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  if (!user.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-red-600">Accès refusé</CardTitle>
            <CardDescription>
              Vous n'avez pas les droits d'administration.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const pendingRestaurants = restaurants.filter(r => r.approvalStatus === "pending");
  const approvedRestaurants = restaurants.filter(r => r.approvalStatus === "approved");

  const filteredClients = clients
    .filter(c => 
      searchQuery === "" ||
      c.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const dir = clientSort.direction === "asc" ? 1 : -1;
      switch (clientSort.column) {
        case "name":
          return dir * (`${a.lastName} ${a.firstName}`).localeCompare(`${b.lastName} ${b.firstName}`);
        case "email":
          return dir * a.email.localeCompare(b.email);
        case "phone":
          return dir * a.phone.localeCompare(b.phone);
        case "totalBookings":
          return dir * ((a.totalBookings || 0) - (b.totalBookings || 0));
        case "restaurantCount":
          return dir * ((a.restaurantCount || 0) - (b.restaurantCount || 0));
        case "lastBookingDate":
          const dateA = a.lastBookingDate ? new Date(a.lastBookingDate).getTime() : 0;
          const dateB = b.lastBookingDate ? new Date(b.lastBookingDate).getTime() : 0;
          return dir * (dateA - dateB);
        default:
          return 0;
      }
    });

  const toggleClientSort = (column: string) => {
    setClientSort(prev => ({
      column,
      direction: prev.column === column && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  const filteredUsers = users
    .filter(u =>
      searchQuery === "" ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.firstName && u.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.lastName && u.lastName.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => (b.isAdmin ? 1 : 0) - (a.isAdmin ? 1 : 0));

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-[#004d40] text-white p-4">
        <div className="container flex items-center justify-between">
          <h1 className="text-xl font-bold">WHERETOEAT.CH - Administration</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm opacity-80">{user.email}</span>
            <Badge variant="secondary" className="bg-white/20">Admin</Badge>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={async () => {
                await fetch(apiUrl("/api/auth/logout"), { method: "POST", credentials: "include" });
                queryClient.invalidateQueries({ queryKey: ["auth-user"] });
                window.location.href = "/";
              }}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingRestaurants.length}</p>
                <p className="text-sm text-muted-foreground">En attente</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Store className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{approvedRestaurants.length}</p>
                <p className="text-sm text-muted-foreground">Restaurants</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{clients.length}</p>
                <p className="text-sm text-muted-foreground">Clients</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-sm text-muted-foreground">Utilisateurs</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <CardHeader className="border-b pb-0">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="users" className="gap-2" data-testid="tab-users">
                  <Shield className="w-4 h-4" />
                  Utilisateurs
                </TabsTrigger>
                <TabsTrigger value="pending" className="gap-2" data-testid="tab-pending">
                  <Clock className="w-4 h-4" />
                  En attente ({pendingRestaurants.length})
                </TabsTrigger>
                <TabsTrigger value="restaurants" className="gap-2" data-testid="tab-restaurants">
                  <Store className="w-4 h-4" />
                  Restaurants
                </TabsTrigger>
                <TabsTrigger value="clients" className="gap-2" data-testid="tab-clients">
                  <Users className="w-4 h-4" />
                  Clients
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <TabsContent value="pending" className="m-0">
              <CardContent className="p-6">
                {pendingRestaurants.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                    <p className="text-muted-foreground">Aucune demande en attente</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingRestaurants.map((restaurant) => (
                      <div key={restaurant.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg" data-testid={`pending-restaurant-${restaurant.id}`}>
                        <div className="flex items-center gap-4">
                          <img src={restaurant.image} alt={restaurant.name} className="w-16 h-16 object-cover rounded" />
                          <div>
                            <h3 className="font-semibold">{restaurant.name}</h3>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {restaurant.location}
                            </p>
                            <Badge variant="secondary" className="mt-1">{restaurant.cuisine}</Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:bg-green-50"
                            onClick={() => approveMutation.mutate(restaurant.id)}
                            disabled={approveMutation.isPending}
                            data-testid={`approve-${restaurant.id}`}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approuver
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => rejectMutation.mutate(restaurant.id)}
                            disabled={rejectMutation.isPending}
                            data-testid={`reject-${restaurant.id}`}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Refuser
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </TabsContent>

            <TabsContent value="restaurants" className="m-0">
              <CardContent className="p-6">
                <div className="mb-4">
                  <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher un restaurant..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      data-testid="search-restaurants"
                    />
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Restaurant</TableHead>
                      <TableHead>Email admin</TableHead>
                      <TableHead>Localisation</TableHead>
                      <TableHead>Cuisine</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedRestaurants
                      .filter(r => 
                        searchQuery === "" ||
                        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        r.location.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((restaurant) => (
                      <TableRow key={restaurant.id} data-testid={`restaurant-row-${restaurant.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <img src={restaurant.image} alt={restaurant.name} className="w-10 h-10 object-cover rounded" />
                            <span className="font-medium">{restaurant.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{restaurant.ownerEmail || "-"}</TableCell>
                        <TableCell>{restaurant.location}</TableCell>
                        <TableCell><Badge variant="secondary">{restaurant.cuisine}</Badge></TableCell>
                        <TableCell>
                          {restaurant.isBlocked ? (
                            <Badge variant="destructive" className="gap-1">
                              <EyeOff className="w-3 h-3" /> Bloqué
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 gap-1">
                              <Eye className="w-3 h-3" /> Visible
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedRestaurant(restaurant)}
                              data-testid={`view-${restaurant.id}`}
                            >
                              <Eye className="w-4 h-4 mr-1" /> Voir
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => blockMutation.mutate({ id: restaurant.id, isBlocked: !restaurant.isBlocked })}
                              disabled={blockMutation.isPending}
                              data-testid={`block-${restaurant.id}`}
                            >
                              {restaurant.isBlocked ? (
                                <><Eye className="w-4 h-4 mr-1" /> Débloquer</>
                              ) : (
                                <><Ban className="w-4 h-4 mr-1" /> Bloquer</>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeleteConfirm({ type: "restaurant", id: restaurant.id })}
                              data-testid={`delete-${restaurant.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </TabsContent>

            <TabsContent value="clients" className="m-0">
              <CardContent className="p-6">
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher un client..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      data-testid="search-clients"
                    />
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleClientSort("name")}>
                        <div className="flex items-center gap-1">
                          Nom
                          {clientSort.column === "name" ? (
                            clientSort.direction === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          ) : <ArrowUpDown className="w-4 h-4 opacity-50" />}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleClientSort("email")}>
                        <div className="flex items-center gap-1">
                          Email
                          {clientSort.column === "email" ? (
                            clientSort.direction === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          ) : <ArrowUpDown className="w-4 h-4 opacity-50" />}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleClientSort("phone")}>
                        <div className="flex items-center gap-1">
                          Téléphone
                          {clientSort.column === "phone" ? (
                            clientSort.direction === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          ) : <ArrowUpDown className="w-4 h-4 opacity-50" />}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleClientSort("totalBookings")}>
                        <div className="flex items-center gap-1">
                          Réservations
                          {clientSort.column === "totalBookings" ? (
                            clientSort.direction === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          ) : <ArrowUpDown className="w-4 h-4 opacity-50" />}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleClientSort("restaurantCount")}>
                        <div className="flex items-center gap-1">
                          Restaurants
                          {clientSort.column === "restaurantCount" ? (
                            clientSort.direction === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          ) : <ArrowUpDown className="w-4 h-4 opacity-50" />}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleClientSort("lastBookingDate")}>
                        <div className="flex items-center gap-1">
                          Dernière réservation
                          {clientSort.column === "lastBookingDate" ? (
                            clientSort.direction === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          ) : <ArrowUpDown className="w-4 h-4 opacity-50" />}
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => (
                      <TableRow key={client.id} data-testid={`client-row-${client.id}`}>
                        <TableCell className="font-medium">{client.firstName} {client.lastName}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-muted-foreground" />
                            {client.email}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            {client.phone}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{client.totalBookings || 0}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{client.restaurantCount || 0}</Badge>
                        </TableCell>
                        <TableCell>
                          {client.lastBookingDate 
                            ? new Date(client.lastBookingDate).toLocaleDateString("fr-CH")
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredClients.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    Aucun client trouvé
                  </div>
                )}
              </CardContent>
            </TabsContent>

            <TabsContent value="users" className="m-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher un utilisateur..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoComplete="off"
                      data-testid="search-users"
                    />
                  </div>
                  <Button onClick={() => setNewUserDialog(true)} data-testid="button-add-user">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Ajouter un utilisateur
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead>Date de création</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => (
                      <TableRow key={u.id} data-testid={`user-row-${u.id}`}>
                        <TableCell className="font-medium">{u.email}</TableCell>
                        <TableCell>{u.firstName} {u.lastName}</TableCell>
                        <TableCell>
                          {u.isAdmin ? (
                            <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">Admin</Badge>
                          ) : (
                            <Badge variant="secondary">Utilisateur</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString("fr-CH") : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setPasswordDialog({ id: u.id, email: u.email || "" }); setNewPassword(""); setConfirmPassword(""); setShowPassword(false); }}
                            >
                              <KeyRound className="w-4 h-4" />
                            </Button>
                            {u.id !== user.id && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setDeleteConfirm({ type: "user", id: u.id })}
                                disabled={!!u.isAdmin && users.filter(usr => usr.isAdmin).length <= 1}
                                data-testid={`delete-user-${u.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      <Dialog open={newUserDialog} onOpenChange={setNewUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un administrateur</DialogTitle>
            <DialogDescription>Créer un nouveau compte administrateur</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createUserMutation.mutate(newUser); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom</Label>
                <Input
                  id="firstName"
                  value={newUser.firstName}
                  onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                  data-testid="input-new-firstname"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  value={newUser.lastName}
                  onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                  data-testid="input-new-lastname"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newEmail">Email</Label>
              <Input
                id="newEmail"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                required
                data-testid="input-new-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Mot de passe</Label>
              <Input
                id="newPassword"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                required
                minLength={6}
                data-testid="input-new-password"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewUserDialog(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={createUserMutation.isPending} data-testid="button-create-user">
                {createUserMutation.isPending ? "Création..." : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.type === "restaurant" 
                ? "Cette action supprimera définitivement le restaurant et toutes ses données associées (réservations, clients, etc.)."
                : "Cette action supprimera définitivement le compte utilisateur."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteConfirm?.type === "restaurant") {
                  deleteRestaurantMutation.mutate(deleteConfirm.id as number);
                } else if (deleteConfirm?.type === "user") {
                  deleteUserMutation.mutate(deleteConfirm.id as string);
                }
              }}
              data-testid="confirm-delete"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!passwordDialog} onOpenChange={() => setPasswordDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le mot de passe</DialogTitle>
            <DialogDescription>{passwordDialog?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 caractères"
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Retapez le mot de passe"
                autoComplete="new-password"
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-red-500">Les mots de passe ne correspondent pas</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialog(null)}>Annuler</Button>
            <Button
              onClick={() => passwordDialog && changePasswordMutation.mutate({ id: passwordDialog.id, password: newPassword })}
              disabled={newPassword.length < 6 || newPassword !== confirmPassword || changePasswordMutation.isPending}
            >
              {changePasswordMutation.isPending ? "Modification..." : "Modifier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedRestaurant} onOpenChange={() => setSelectedRestaurant(null)}>
        <DialogContent className="max-w-2xl">
          {selectedRestaurant && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <img 
                    src={selectedRestaurant.image} 
                    alt={selectedRestaurant.name} 
                    className="w-12 h-12 object-cover rounded"
                  />
                  {selectedRestaurant.name}
                </DialogTitle>
                <DialogDescription>
                  Détails du restaurant
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Localisation</p>
                    <p className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      {selectedRestaurant.location}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Adresse</p>
                    <p>{selectedRestaurant.address || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Téléphone</p>
                    <p className="flex items-center gap-1">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      {selectedRestaurant.phone || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Type de cuisine</p>
                    <Badge variant="secondary">{selectedRestaurant.cuisine}</Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Gamme de prix</p>
                    <p>{selectedRestaurant.priceRange}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Note</p>
                    <p>{selectedRestaurant.rating > 0 ? `${selectedRestaurant.rating}/5` : "Pas encore noté"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Capacité</p>
                    <p>{selectedRestaurant.capacity || 40} couverts</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Statut</p>
                    {selectedRestaurant.isBlocked ? (
                      <Badge variant="destructive">Bloqué</Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-700">Visible</Badge>
                    )}
                  </div>
                </div>
                {selectedRestaurant.description && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{selectedRestaurant.description}</p>
                  </div>
                )}
                {selectedRestaurant.features && selectedRestaurant.features.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Caractéristiques</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedRestaurant.features.map((feature, i) => (
                        <Badge key={i} variant="outline">{feature}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {selectedRestaurant.createdAt && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date de création</p>
                    <p className="text-sm">{new Date(selectedRestaurant.createdAt).toLocaleDateString("fr-CH")}</p>
                  </div>
                )}
              </div>
              <DialogFooter className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    blockMutation.mutate({ id: selectedRestaurant.id, isBlocked: !selectedRestaurant.isBlocked });
                    setSelectedRestaurant(null);
                  }}
                >
                  {selectedRestaurant.isBlocked ? "Débloquer" : "Bloquer"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setDeleteConfirm({ type: "restaurant", id: selectedRestaurant.id });
                    setSelectedRestaurant(null);
                  }}
                >
                  Supprimer
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={newRestaurantDialog} onOpenChange={setNewRestaurantDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ajouter un restaurant</DialogTitle>
            <DialogDescription>Créer un nouveau restaurant dans la plateforme</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createRestaurantMutation.mutate(newRestaurant); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="restaurantName">Nom du restaurant *</Label>
                <Input
                  id="restaurantName"
                  value={newRestaurant.name}
                  onChange={(e) => setNewRestaurant({ ...newRestaurant, name: e.target.value })}
                  required
                  data-testid="input-restaurant-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="restaurantCuisine">Type de cuisine *</Label>
                <Input
                  id="restaurantCuisine"
                  value={newRestaurant.cuisine}
                  onChange={(e) => setNewRestaurant({ ...newRestaurant, cuisine: e.target.value })}
                  placeholder="Italien, Français, Suisse..."
                  required
                  data-testid="input-restaurant-cuisine"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="restaurantLocation">Ville *</Label>
                <Input
                  id="restaurantLocation"
                  value={newRestaurant.location}
                  onChange={(e) => setNewRestaurant({ ...newRestaurant, location: e.target.value })}
                  placeholder="Genève, Zurich, Lausanne..."
                  required
                  data-testid="input-restaurant-location"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="restaurantAddress">Adresse</Label>
                <Input
                  id="restaurantAddress"
                  value={newRestaurant.address}
                  onChange={(e) => setNewRestaurant({ ...newRestaurant, address: e.target.value })}
                  placeholder="Rue et numéro"
                  data-testid="input-restaurant-address"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="restaurantPhone">Téléphone</Label>
                <Input
                  id="restaurantPhone"
                  value={newRestaurant.phone}
                  onChange={(e) => setNewRestaurant({ ...newRestaurant, phone: e.target.value })}
                  placeholder="+41 22 123 45 67"
                  data-testid="input-restaurant-phone"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="restaurantPriceRange">Gamme de prix *</Label>
                <select
                  id="restaurantPriceRange"
                  value={newRestaurant.priceRange}
                  onChange={(e) => setNewRestaurant({ ...newRestaurant, priceRange: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  data-testid="select-restaurant-price"
                >
                  <option value="$">$ - Économique</option>
                  <option value="$$">$$ - Modéré</option>
                  <option value="$$$">$$$ - Haut de gamme</option>
                  <option value="$$$$">$$$$ - Luxe</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="restaurantImage">URL de l'image</Label>
              <Input
                id="restaurantImage"
                value={newRestaurant.image}
                onChange={(e) => setNewRestaurant({ ...newRestaurant, image: e.target.value })}
                placeholder="https://..."
                data-testid="input-restaurant-image"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="restaurantDescription">Description</Label>
              <textarea
                id="restaurantDescription"
                value={newRestaurant.description}
                onChange={(e) => setNewRestaurant({ ...newRestaurant, description: e.target.value })}
                className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background resize-none"
                placeholder="Description du restaurant..."
                data-testid="textarea-restaurant-description"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewRestaurantDialog(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={createRestaurantMutation.isPending} data-testid="button-create-restaurant">
                {createRestaurantMutation.isPending ? "Création..." : "Créer le restaurant"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
