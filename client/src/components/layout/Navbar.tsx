import { Link } from "wouter";
import { UtensilsCrossed, LogOut, LayoutDashboard, Store, Shield, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import type { Restaurant } from "@shared/schema";
import { apiUrl } from "@/lib/queryClient";

export function Navbar() {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  const { data: myRestaurants = [] } = useQuery<Restaurant[]>({
    queryKey: ["/api/my-restaurants"],
    enabled: isAuthenticated,
  });

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-serif text-xl font-bold tracking-tight hover:opacity-90 transition-opacity cursor-pointer">
          <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary text-primary-foreground">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <span>WHERE<span className="text-primary mx-0.5">TO</span>EAT.CH</span>
        </Link>
        <div className="flex items-center gap-6 text-sm font-medium">
          {isLoading ? (
            <div className="h-9 w-24 bg-muted animate-pulse rounded-md" />
          ) : isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full" data-testid="user-menu-trigger">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || "User"} />
                    <AvatarFallback>
                      {user.firstName?.[0] || user.email?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center gap-2 p-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.profileImageUrl || undefined} />
                    <AvatarFallback>{user.firstName?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{user.firstName} {user.lastName}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  </div>
                </div>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="cursor-pointer" data-testid="link-dashboard">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Tableau de bord
                  </Link>
                </DropdownMenuItem>
                {myRestaurants.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs text-muted-foreground">Mes restaurants</DropdownMenuLabel>
                    {myRestaurants.slice(0, 5).map(restaurant => (
                      <DropdownMenuItem key={restaurant.id} asChild>
                        <Link href={`/dashboard?restaurant=${restaurant.id}`} className="cursor-pointer" data-testid={`link-restaurant-${restaurant.id}`}>
                          <ChevronRight className="mr-2 h-4 w-4" />
                          {restaurant.name}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuItem asChild>
                      <Link href="/inscrire-restaurant" className="cursor-pointer text-primary" data-testid="link-add-restaurant">
                        <Store className="mr-2 h-4 w-4" />
                        + Ajouter un restaurant
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                {myRestaurants.length === 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/inscrire-restaurant" className="cursor-pointer" data-testid="link-register-restaurant">
                        <Store className="mr-2 h-4 w-4" />
                        Inscrire un restaurant
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                {user?.isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer" data-testid="link-admin">
                        <Shield className="mr-2 h-4 w-4" />
                        Administration
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href={apiUrl("/api/logout")} className="cursor-pointer text-red-600" data-testid="link-logout">
                    <LogOut className="mr-2 h-4 w-4" />
                    Déconnexion
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/inscrire-restaurant">
              <Button className="hidden md:inline-flex h-9" data-testid="button-register">
                Pour les Restaurateurs
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
