import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { FileText, Menu, X, LogOut, User } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/">
            <a className="flex items-center gap-2 font-bold text-xl">
              <FileText className="h-6 w-6 text-primary" />
              <span>CFR Data</span>
            </a>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/browse">
              <a className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Browse CFR
              </a>
            </Link>
            <Link href="/search">
              <a className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Search
              </a>
            </Link>
            <Link href="/docs">
              <a className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                API Docs
              </a>
            </Link>
            <Link href="/#pricing">
              <a className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </a>
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
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm">
                    Dashboard
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </>
            ) : (
              <Link href="/login">
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
            <Link href="/browse">
              <a className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                Browse CFR
              </a>
            </Link>
            <Link href="/search">
              <a className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                Search
              </a>
            </Link>
            <Link href="/docs">
              <a className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                API Docs
              </a>
            </Link>
            <Link href="/#pricing">
              <a className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                Pricing
              </a>
            </Link>
            <div className="pt-3 space-y-2">
              <Link href="/dashboard">
                <Button variant="outline" className="w-full" size="sm">
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
                <Link href="/login">
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
