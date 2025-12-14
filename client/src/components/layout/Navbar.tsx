import { Link } from "wouter";
import { UtensilsCrossed, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { user, isAuthenticated, isLoading } = useAuth();

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-serif text-xl font-bold tracking-tight hover:opacity-90 transition-opacity cursor-pointer">
          <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary text-primary-foreground">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          WHERETOEAT<span className="text-primary">.CH</span>
        </Link>
        <div className="flex items-center gap-6 text-sm font-medium">
          <Link href="/" className="hover:text-primary transition-colors cursor-pointer">Accueil</Link>
          <Link href="/" className="hover:text-primary transition-colors cursor-pointer">Restaurants</Link>
          <Link href="/" className="hover:text-primary transition-colors cursor-pointer">À propos</Link>
          
          {!isLoading && (
            isAuthenticated ? (
              <Link href="/dashboard">
                <Button variant="default" size="sm" className="gap-2" data-testid="button-dashboard">
                  <User className="h-4 w-4" />
                  <span className="hidden md:inline">{user?.firstName || "Dashboard"}</span>
                </Button>
              </Link>
            ) : (
              <a href="/api/login">
                <Button variant="default" size="sm" data-testid="button-login">
                  Pour les Restaurateurs
                </Button>
              </a>
            )
          )}
        </div>
      </div>
    </nav>
  );
}
