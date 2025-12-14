import { Link } from "wouter";
import { UtensilsCrossed } from "lucide-react";

export function Navbar() {
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
          <Link href="/" className="hover:text-primary transition-colors cursor-pointer">Home</Link>
          <Link href="/" className="hover:text-primary transition-colors cursor-pointer">Restaurants</Link>
          <Link href="/" className="hover:text-primary transition-colors cursor-pointer">About</Link>
          <button className="hidden md:inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            For Restaurateurs
          </button>
        </div>
      </div>
    </nav>
  );
}
