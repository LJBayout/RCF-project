import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { FileText, Menu, X, LogOut, User, Compass } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTour } from "@/contexts/TourContext";
import { ROUTES } from "@/routes";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const { openTour } = useTour();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    logout();
    setLocation(ROUTES.login);
  };

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href={ROUTES.home} className="flex items-center gap-2 font-bold text-xl">
            <FileText className="h-6 w-6 text-primary" />
            <span>CFR Data</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Button variant="ghost" size="sm" onClick={openTour} className="text-muted-foreground hover:text-foreground" data-tour="tour-trigger">
              <Compass className="mr-1.5 h-4 w-4" />
              Tour
            </Button>
            <Link href={ROUTES.browse} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-tour="browse">
              Browse CFR
            </Link>
            <Link href={ROUTES.search} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-tour="search">
              Search
            </Link>
            <Link href={ROUTES.askCFR} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Compliance Intelligence
            </Link>
            <Link href={ROUTES.docs} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-tour="docs">
              API Docs
            </Link>
            <Link href={ROUTES.homeHash("pricing")} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{user?.username}</span>
                </div>
                <Link href={ROUTES.dashboard}>
                  <Button variant="ghost" size="sm" data-tour="dashboard">
                    Dashboard
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </>
            ) : (
              <Link href={ROUTES.login}>
                <Button size="sm">
                  Login
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-3 border-t">
            <button
              type="button"
              onClick={() => { openTour(); setMobileMenuOpen(false); }}
              className="flex w-full items-center gap-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <Compass className="h-4 w-4" />
              Tour
            </button>
            <Link href={ROUTES.browse} className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              Browse CFR
            </Link>
            <Link href={ROUTES.search} className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              Search
            </Link>
            <Link href={ROUTES.askCFR} className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              Compliance Intelligence
            </Link>
            <Link href={ROUTES.docs} className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              API Docs
            </Link>
            <Link href={ROUTES.homeHash("pricing")} className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
            <div className="pt-3 space-y-2">
              <Link href={ROUTES.dashboard}>
                <Button variant="outline" className="w-full" size="sm" data-tour="dashboard">
                  Dashboard
                </Button>
              </Link>
              {isAuthenticated ? (
                <>
                  <div className="py-2 text-sm text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {user?.username}
                  </div>
                  <Button 
                    className="w-full" 
                    size="sm" 
                    variant="outline"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </>
              ) : (
                <Link href={ROUTES.login}>
                  <Button className="w-full" size="sm">
                    Login
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
