import { useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { CheckCircle, CalendarCheck, Shield, UtensilsCrossed, LayoutDashboard, MapPin, Users, BarChart3, Mail } from "lucide-react";

export default function About() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title = "À propos - WHERETOEAT.CH";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative bg-zinc-900 text-white py-24">
        <div className="container px-4 text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            À propos de <span className="text-primary">WHERE<span className="text-white">TO</span>EAT.CH</span>
          </h1>
          <p className="text-lg text-zinc-300">
            La plateforme suisse de référence pour découvrir et réserver les meilleures tables du pays.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 bg-white">
        <div className="container px-4 max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6 text-zinc-900">Notre Mission</h2>
          <p className="text-zinc-600 text-lg leading-relaxed">
            WHERETOEAT.CH a pour mission de connecter les amateurs de gastronomie avec les meilleurs restaurants de Suisse.
            Nous offrons une expérience de réservation simple et intuitive, tout en fournissant aux restaurateurs des outils
            professionnels pour optimiser leur gestion quotidienne.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-zinc-50">
        <div className="container px-4 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg border border-zinc-200 p-8 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900">Sélection de qualité</h3>
              <p className="text-zinc-600 text-sm leading-relaxed">
                Nous sélectionnons avec soin les meilleurs établissements pour vous garantir des expériences culinaires mémorables.
              </p>
            </div>

            <div className="bg-white rounded-lg border border-zinc-200 p-8 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <CalendarCheck className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900">Réservation instantanée</h3>
              <p className="text-zinc-600 text-sm leading-relaxed">
                Réservez votre table en quelques clics, 24h/24 et 7j/7.
              </p>
            </div>

            <div className="bg-white rounded-lg border border-zinc-200 p-8 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900">Service fiable</h3>
              <p className="text-zinc-600 text-sm leading-relaxed">
                Une plateforme sécurisée et un service client à votre écoute pour une expérience sans souci.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pour les restaurateurs */}
      <section className="py-20 bg-white">
        <div className="container px-4 max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-zinc-900 mb-4">Pour les restaurateurs</h2>
            <p className="text-zinc-600 text-lg max-w-2xl mx-auto">
              WHERETOEAT.CH offre aux restaurateurs un tableau de bord complet pour gérer efficacement leur établissement.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex gap-5 p-6 rounded-lg border border-zinc-200 bg-zinc-50">
              <div className="w-12 h-12 rounded-lg bg-zinc-900 flex items-center justify-center flex-shrink-0">
                <LayoutDashboard className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 mb-2">Gestion des réservations</h3>
                <p className="text-zinc-600 text-sm leading-relaxed">
                  Confirmez, modifiez ou refusez les réservations en temps réel.
                </p>
              </div>
            </div>

            <div className="flex gap-5 p-6 rounded-lg border border-zinc-200 bg-zinc-50">
              <div className="w-12 h-12 rounded-lg bg-zinc-900 flex items-center justify-center flex-shrink-0">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 mb-2">Plan de salle interactif</h3>
                <p className="text-zinc-600 text-sm leading-relaxed">
                  Créez et gérez votre plan de salle avec attribution des tables.
                </p>
              </div>
            </div>

            <div className="flex gap-5 p-6 rounded-lg border border-zinc-200 bg-zinc-50">
              <div className="w-12 h-12 rounded-lg bg-zinc-900 flex items-center justify-center flex-shrink-0">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 mb-2">Suivi des clients</h3>
                <p className="text-zinc-600 text-sm leading-relaxed">
                  Historique des visites et préférences de vos clients fidèles.
                </p>
              </div>
            </div>

            <div className="flex gap-5 p-6 rounded-lg border border-zinc-200 bg-zinc-50">
              <div className="w-12 h-12 rounded-lg bg-zinc-900 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 mb-2">Statistiques détaillées</h3>
                <p className="text-zinc-600 text-sm leading-relaxed">
                  Analysez vos performances et optimisez votre activité.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <Button
              size="lg"
              className="px-8 font-bold"
              onClick={() => setLocation("/inscrire-restaurant")}
            >
              <UtensilsCrossed className="h-5 w-5 mr-2" />
              Inscrire mon restaurant
            </Button>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-20 bg-zinc-50">
        <div className="container px-4 max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">Une question ?</h2>
          <p className="text-zinc-600 text-lg mb-8">
            Notre équipe est à votre disposition pour répondre à toutes vos questions.
          </p>
          <a href="mailto:hello@wheretoeat.ch">
            <Button size="lg" variant="outline" className="px-8 font-bold">
              <Mail className="h-5 w-5 mr-2" />
              Nous contacter
            </Button>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t py-12 text-gray-600">
        <div className="container px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <h4 className="text-xl font-bold">WHERE<span className="text-primary mx-0.5">TO</span>EAT.CH</h4>
            <p className="text-sm">Découvrez et réservez les meilleurs restaurants.</p>
          </div>
          <div>
            <h5 className="font-bold mb-4 text-gray-900">Découvrir</h5>
            <ul className="space-y-2 text-sm">
              <li className="hover:text-primary cursor-pointer" onClick={() => setLocation("/")}>Zurich</li>
              <li className="hover:text-primary cursor-pointer" onClick={() => setLocation("/")}>Genève</li>
              <li className="hover:text-primary cursor-pointer" onClick={() => setLocation("/")}>Bâle</li>
              <li className="hover:text-primary cursor-pointer" onClick={() => setLocation("/")}>Crans-Montana</li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold mb-4 text-gray-900">Plus</h5>
            <ul className="space-y-2 text-sm">
              <li className="hover:text-primary cursor-pointer font-medium text-primary">À propos</li>
              <li className="hover:text-primary cursor-pointer" onClick={() => setLocation("/inscrire-restaurant")}>Restaurateurs</li>
              <li className="hover:text-primary cursor-pointer">Blog</li>
              <li className="hover:text-primary cursor-pointer">Contact</li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold mb-4 text-gray-900">Télécharger l'App</h5>
            <div className="flex gap-2">
              <div className="h-10 w-32 bg-gray-900 rounded-md flex items-center justify-center text-white text-xs font-bold cursor-pointer">App Store</div>
              <div className="h-10 w-32 bg-gray-900 rounded-md flex items-center justify-center text-white text-xs font-bold cursor-pointer">Google Play</div>
            </div>
          </div>
        </div>
        <div className="container px-4 mt-12 pt-8 border-t text-center text-sm text-gray-400">
          © {new Date().getFullYear()} WHERETOEAT.CH. Tous droits réservés.
        </div>
      </footer>
    </div>
  );
}
