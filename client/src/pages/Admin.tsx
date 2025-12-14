import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { CheckCircle, XCircle, Clock, Store, MapPin, Phone, Building2, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Registration {
  id: number;
  userId: string | null;
  restaurantName: string;
  address: string;
  phone: string;
  companyName: string;
  registrationNumber: string | null;
  cuisineType: string;
  priceRange: string;
  description: string | null;
  logoUrl: string | null;
  photos: string[] | null;
  menuPdfUrl: string | null;
  status: string;
  adminNotes: string | null;
  createdAt: string;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
    case "approved":
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Approuvé</Badge>;
    case "rejected":
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" />Refusé</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function Admin() {
  const { user, isLoading: authLoading, login } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const { data: registrations = [], isLoading } = useQuery<Registration[]>({
    queryKey: ["registrations"],
    queryFn: async () => {
      const res = await fetch("/api/registrations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch registrations");
      return res.json();
    },
    enabled: !!user,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number; status: string; notes?: string }) => {
      const res = await fetch(`/api/registrations/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, adminNotes: notes }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update status");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registrations"] });
      setSelectedRegistration(null);
      setAdminNotes("");
    },
  });

  const handleApprove = (id: number) => {
    updateStatusMutation.mutate({ id, status: "approved", notes: adminNotes });
  };

  const handleReject = (id: number) => {
    updateStatusMutation.mutate({ id, status: "rejected", notes: adminNotes });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-16 text-center">
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container max-w-md py-16">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Administration</CardTitle>
              <CardDescription>
                Connectez-vous pour accéder à l'interface d'administration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={login} className="w-full" size="lg" data-testid="button-login">
                Se connecter
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!user.isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container max-w-md py-16">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Accès refusé</CardTitle>
              <CardDescription>
                Vous n'avez pas les droits d'administration.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  const pendingCount = registrations.filter(r => r.status === "pending").length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Administration</h1>
          <p className="text-muted-foreground">
            Gérez les demandes d'inscription des restaurants
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">En attente</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{registrations.filter(r => r.status === "approved").length}</p>
                <p className="text-sm text-muted-foreground">Approuvés</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{registrations.filter(r => r.status === "rejected").length}</p>
                <p className="text-sm text-muted-foreground">Refusés</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <p className="text-center py-8">Chargement des demandes...</p>
        ) : registrations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Store className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucune demande d'inscription pour le moment</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {registrations.map((reg) => (
              <Card key={reg.id} data-testid={`card-registration-${reg.id}`}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{reg.restaurantName}</h3>
                        {getStatusBadge(reg.status)}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" /> {reg.address}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-4 h-4" /> {reg.phone}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 className="w-4 h-4" /> {reg.companyName}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="secondary">{reg.cuisineType}</Badge>
                        <Badge variant="secondary">{reg.priceRange}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRegistration(reg);
                          setAdminNotes(reg.adminNotes || "");
                        }}
                        data-testid={`button-view-${reg.id}`}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Détails
                      </Button>
                      {reg.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:bg-green-50"
                            onClick={() => handleApprove(reg.id)}
                            disabled={updateStatusMutation.isPending}
                            data-testid={`button-approve-${reg.id}`}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approuver
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => handleReject(reg.id)}
                            disabled={updateStatusMutation.isPending}
                            data-testid={`button-reject-${reg.id}`}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Refuser
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selectedRegistration} onOpenChange={() => setSelectedRegistration(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedRegistration && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedRegistration.restaurantName}</DialogTitle>
                <DialogDescription>
                  Demande soumise le {new Date(selectedRegistration.createdAt).toLocaleDateString("fr-CH")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Adresse</p>
                    <p>{selectedRegistration.address}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Téléphone</p>
                    <p>{selectedRegistration.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Raison sociale</p>
                    <p>{selectedRegistration.companyName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">N° IDE</p>
                    <p>{selectedRegistration.registrationNumber || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Type de cuisine</p>
                    <p>{selectedRegistration.cuisineType}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Gamme de prix</p>
                    <p>{selectedRegistration.priceRange}</p>
                  </div>
                </div>
                {selectedRegistration.description && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Description</p>
                    <p>{selectedRegistration.description}</p>
                  </div>
                )}
                <div className="flex gap-4">
                  {selectedRegistration.logoUrl && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Logo</p>
                      <img src={selectedRegistration.logoUrl} alt="Logo" className="w-24 h-24 object-cover rounded" />
                    </div>
                  )}
                  {selectedRegistration.menuPdfUrl && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Menu</p>
                      <a href={selectedRegistration.menuPdfUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                        Voir le menu PDF
                      </a>
                    </div>
                  )}
                </div>
                {selectedRegistration.photos && selectedRegistration.photos.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Photos</p>
                    <div className="flex gap-2 flex-wrap">
                      {selectedRegistration.photos.map((photo, i) => (
                        <img key={i} src={photo} alt={`Photo ${i + 1}`} className="w-24 h-24 object-cover rounded" />
                      ))}
                    </div>
                  </div>
                )}
                {selectedRegistration.status === "pending" && (
                  <>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Notes admin</p>
                      <Textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Ajouter une note..."
                        rows={3}
                        data-testid="textarea-admin-notes"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        className="text-red-600"
                        onClick={() => handleReject(selectedRegistration.id)}
                        disabled={updateStatusMutation.isPending}
                        data-testid="button-reject-dialog"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Refuser
                      </Button>
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleApprove(selectedRegistration.id)}
                        disabled={updateStatusMutation.isPending}
                        data-testid="button-approve-dialog"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approuver
                      </Button>
                    </div>
                  </>
                )}
                {selectedRegistration.adminNotes && selectedRegistration.status !== "pending" && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Notes admin</p>
                    <p className="bg-muted p-3 rounded">{selectedRegistration.adminNotes}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
