import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { FileText, Menu, X, LogOut, User, Compass, Layers, Search, Sparkles, Database, ArrowLeft, GraduationCap } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTour } from "@/contexts/TourContext";
import { ROUTES } from "@/routes";

function NavLink({ href, icon: Icon, label, active }: { href: string; icon: any; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 px-3 h-8 text-xs font-semibold rounded-lg transition-all duration-200",
        active
          ? "bg-white text-blue-600 shadow-sm border border-slate-200"
          : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", active ? "text-blue-500" : "text-slate-400")} />
      {label}
    </Link>
  );
}

export function Navbar() {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const { openTour } = useTour();

  const handleLogout = () => {
    logout();
    setLocation(ROUTES.login);
  };

  const isHome = location === "/" || location === ROUTES.home;

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container">
        <div className="flex h-16 items-center justify-between">
          {/* Logo & Back */}
          <div className="flex items-center gap-4">
            {!isHome && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.history.back()}
                className="h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center shrink-0"
                title="Go Back"
              >
                <ArrowLeft className="h-4 w-4 text-slate-500" />
              </Button>
            )}
            <Link
              href={ROUTES.home}
              className="flex items-center gap-2 font-bold text-xl group"
            >
              <FileText className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500">CFR Data</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl border border-slate-200/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={openTour}
              className="px-3 h-8 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-all"
              data-tour="tour-trigger"
            >
              <Compass className="mr-1.5 h-3.5 w-3.5" />
              Tour
            </Button>

            <NavLink href={ROUTES.browse} icon={Layers} label="Browse CFR" active={useLocation()[0] === ROUTES.browse} />
            <NavLink href={ROUTES.search} icon={Search} label="Search" active={useLocation()[0] === ROUTES.search} />
            <NavLink href={ROUTES.askCFR} icon={Sparkles} label="AI Intelligence" active={useLocation()[0] === ROUTES.askCFR} />
            <NavLink href={ROUTES.ragAdmin} icon={Database} label="RAG Ops" active={useLocation()[0] === ROUTES.ragAdmin} />
            <NavLink href={ROUTES.masterclass} icon={GraduationCap} label="Masterclass" active={useLocation()[0] === ROUTES.masterclass} />
            <NavLink href={ROUTES.docs} icon={FileText} label="API Docs" active={useLocation()[0] === ROUTES.docs} />
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
                <Button size="sm">Login</Button>
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
              onClick={() => {
                openTour();
                setMobileMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <Compass className="h-4 w-4" />
              Tour
            </button>
            <Link
              href={ROUTES.browse}
              className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Browse CFR
            </Link>
            <Link
              href={ROUTES.search}
              className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Search
            </Link>
            <Link
              href={ROUTES.askCFR}
              className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Compliance Intelligence
            </Link>
            <Link
              href={ROUTES.docs}
              className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              API Docs
            </Link>
            <Link
              href={ROUTES.ragAdmin}
              className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              RAG Ingestion
            </Link>
            <Link
              href={ROUTES.homeHash("pricing")}
              className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Pricing
            </Link>
            <div className="pt-3 space-y-2">
              <Link href={ROUTES.dashboard}>
                <Button
                  variant="outline"
                  className="w-full"
                  size="sm"
                  data-tour="dashboard"
                >
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
