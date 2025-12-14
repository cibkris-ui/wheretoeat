import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Upload, Store, FileText, Image, CheckCircle, User } from "lucide-react";

interface UploadResult {
  successful: Array<{ uploadURL: string }>;
}

interface CuisineCategory {
  id: number;
  name: string;
  icon: string | null;
}

const PRICE_RANGES = [
  { value: "€", label: "€ - Économique" },
  { value: "€€", label: "€€ - Modéré" },
  { value: "€€€", label: "€€€ - Haut de gamme" },
  { value: "€€€€", label: "€€€€ - Gastronomique" },
];

export default function RestaurateurRegister() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    restaurantName: "",
    address: "",
    phone: "",
    companyName: "",
    registrationNumber: "",
    cuisineType: "",
    priceRange: "",
    description: "",
    logoUrl: "",
    photos: [] as string[],
    menuPdfUrl: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const { data: categories = [] } = useQuery<CuisineCategory[]>({
    queryKey: ["cuisine-categories"],
    queryFn: async () => {
      const res = await fetch("/api/cuisine-categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/registrations/with-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          firstName: data.firstName || undefined,
          lastName: data.lastName || undefined,
          restaurantName: data.restaurantName,
          address: data.address,
          phone: data.phone,
          companyName: data.companyName,
          registrationNumber: data.registrationNumber || undefined,
          cuisineType: data.cuisineType,
          priceRange: data.priceRange,
          description: data.description || undefined,
          logoUrl: data.logoUrl || undefined,
          photos: data.photos.length > 0 ? data.photos : undefined,
          menuPdfUrl: data.menuPdfUrl || undefined,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to submit");
      }
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  const handleGetUploadParameters = async () => {
    const res = await fetch("/api/objects/upload", {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to get upload URL");
    const { uploadURL } = await res.json();
    return { method: "PUT" as const, url: uploadURL };
  };

  const handleLogoComplete = async (result: UploadResult) => {
    if (result.successful?.[0]?.uploadURL) {
      const res = await fetch("/api/objects/finalize", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ uploadURL: result.successful[0].uploadURL }),
      });
      if (res.ok) {
        const { objectPath } = await res.json();
        setFormData(prev => ({ ...prev, logoUrl: objectPath }));
      }
    }
  };

  const handlePhotosComplete = async (result: UploadResult) => {
    const newPhotos: string[] = [];
    for (const file of result.successful || []) {
      if (file.uploadURL) {
        const res = await fetch("/api/objects/finalize", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ uploadURL: file.uploadURL }),
        });
        if (res.ok) {
          const { objectPath } = await res.json();
          newPhotos.push(objectPath);
        }
      }
    }
    setFormData(prev => ({ ...prev, photos: [...prev.photos, ...newPhotos] }));
  };

  const handleMenuComplete = async (result: UploadResult) => {
    if (result.successful?.[0]?.uploadURL) {
      const res = await fetch("/api/objects/finalize", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ uploadURL: result.successful[0].uploadURL }),
      });
      if (res.ok) {
        const { objectPath } = await res.json();
        setFormData(prev => ({ ...prev, menuPdfUrl: objectPath }));
      }
    }
  };

  const handleSubmit = () => {
    if (formData.password !== formData.confirmPassword) {
      setPasswordError("Les mots de passe ne correspondent pas");
      return;
    }
    if (formData.password.length < 6) {
      setPasswordError("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    setPasswordError("");
    submitMutation.mutate(formData);
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === "password" || field === "confirmPassword") {
      setPasswordError("");
    }
  };

  const isStep1Valid = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return (
      formData.email &&
      emailRegex.test(formData.email) &&
      formData.password.length >= 6 &&
      formData.password === formData.confirmPassword
    );
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container max-w-md py-16">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Demande envoyée !</CardTitle>
              <CardDescription>
                Votre compte a été créé et votre demande d'inscription a été envoyée avec succès.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-muted-foreground">
                Notre équipe va examiner votre demande et vous serez notifié par email dès qu'elle sera validée.
              </p>
              <Button onClick={() => setLocation("/")} className="w-full" data-testid="button-home">
                Retour à l'accueil
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container max-w-2xl py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Inscrivez votre restaurant</h1>
          <p className="text-muted-foreground">
            Rejoignez les milliers de restaurants présents sur WHERETOEAT.CH
          </p>
        </div>

        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`w-20 h-2 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Créez votre compte</CardTitle>
                  <CardDescription>Vos informations personnelles pour accéder à votre espace</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Adresse email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="votre@email.ch"
                  data-testid="input-email"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
                    placeholder="Jean"
                    data-testid="input-first-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => updateField("lastName", e.target.value)}
                    placeholder="Dupont"
                    data-testid="input-last-name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  placeholder="Minimum 6 caractères"
                  data-testid="input-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => updateField("confirmPassword", e.target.value)}
                  placeholder="Confirmez votre mot de passe"
                  data-testid="input-confirm-password"
                />
              </div>
              {passwordError && (
                <p className="text-sm text-red-600">{passwordError}</p>
              )}
              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => {
                    if (formData.password !== formData.confirmPassword) {
                      setPasswordError("Les mots de passe ne correspondent pas");
                      return;
                    }
                    if (formData.password.length < 6) {
                      setPasswordError("Le mot de passe doit contenir au moins 6 caractères");
                      return;
                    }
                    setPasswordError("");
                    setStep(2);
                  }}
                  disabled={!isStep1Valid()}
                  data-testid="button-next-step-1"
                >
                  Continuer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Store className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Informations de l'établissement</CardTitle>
                  <CardDescription>Les informations de base de votre restaurant</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="restaurantName">Nom du restaurant *</Label>
                <Input
                  id="restaurantName"
                  value={formData.restaurantName}
                  onChange={(e) => updateField("restaurantName", e.target.value)}
                  placeholder="Le Petit Bistro"
                  data-testid="input-restaurant-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Adresse complète *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  placeholder="Rue de Lausanne 15, 1201 Genève"
                  data-testid="input-address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="+41 22 123 45 67"
                  data-testid="input-phone"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Raison sociale *</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => updateField("companyName", e.target.value)}
                    placeholder="Restaurant SA"
                    data-testid="input-company-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registrationNumber">N° IDE</Label>
                  <Input
                    id="registrationNumber"
                    value={formData.registrationNumber}
                    onChange={(e) => updateField("registrationNumber", e.target.value)}
                    placeholder="CHE-123.456.789"
                    data-testid="input-registration-number"
                  />
                </div>
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(1)} data-testid="button-prev-step-2">
                  Retour
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!formData.restaurantName || !formData.address || !formData.phone || !formData.companyName}
                  data-testid="button-next-step-2"
                >
                  Continuer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Type de cuisine et tarifs</CardTitle>
                  <CardDescription>Décrivez votre offre culinaire</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Type de cuisine *</Label>
                <Select value={formData.cuisineType} onValueChange={(v) => updateField("cuisineType", v)}>
                  <SelectTrigger data-testid="select-cuisine-type">
                    <SelectValue placeholder="Sélectionnez un type de cuisine" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Gamme de prix *</Label>
                <Select value={formData.priceRange} onValueChange={(v) => updateField("priceRange", v)}>
                  <SelectTrigger data-testid="select-price-range">
                    <SelectValue placeholder="Sélectionnez une gamme de prix" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICE_RANGES.map((range) => (
                      <SelectItem key={range.value} value={range.value}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description du restaurant</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Décrivez votre restaurant, votre cuisine, votre ambiance..."
                  rows={4}
                  data-testid="textarea-description"
                />
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(2)} data-testid="button-prev-step-3">
                  Retour
                </Button>
                <Button
                  onClick={() => setStep(4)}
                  disabled={!formData.cuisineType || !formData.priceRange}
                  data-testid="button-next-step-3"
                >
                  Continuer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Image className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Photos et documents</CardTitle>
                  <CardDescription>Ajoutez des visuels pour attirer les clients</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Logo du restaurant</Label>
                <div className="flex items-center gap-4">
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={5242880}
                    allowedFileTypes={["image/*"]}
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={handleLogoComplete}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Télécharger le logo
                  </ObjectUploader>
                  {formData.logoUrl && (
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Logo téléchargé
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Photos du restaurant</Label>
                <div className="flex items-center gap-4">
                  <ObjectUploader
                    maxNumberOfFiles={5}
                    maxFileSize={10485760}
                    allowedFileTypes={["image/*"]}
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={handlePhotosComplete}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Télécharger des photos
                  </ObjectUploader>
                  {formData.photos.length > 0 && (
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> {formData.photos.length} photo(s)
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Menu (PDF)</Label>
                <div className="flex items-center gap-4">
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={10485760}
                    allowedFileTypes={[".pdf", "application/pdf"]}
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={handleMenuComplete}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Télécharger le menu
                  </ObjectUploader>
                  {formData.menuPdfUrl && (
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Menu téléchargé
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(3)} data-testid="button-prev-step-4">
                  Retour
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitMutation.isPending}
                  data-testid="button-submit"
                >
                  {submitMutation.isPending ? "Envoi en cours..." : "Créer mon compte et envoyer la demande"}
                </Button>
              </div>
              {submitMutation.error && (
                <p className="text-sm text-red-600 text-center">
                  {submitMutation.error.message}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
