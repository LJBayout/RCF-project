import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { FileText, Menu, X } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            <Link href="/#features">
              <a className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
            </Link>
            <Link href="/#pricing">
              <a className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </a>
            </Link>
            <Link href="/docs">
              <a className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                API Docs
              </a>
            </Link>
            <Link href="/search">
              <a className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Search
              </a>
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                Dashboard
              </Button>
            </Link>
            <Link href="/#pricing">
              <Button size="sm">
                Get Started
              </Button>
            </Link>
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
            <Link href="/#features">
              <a className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                Features
              </a>
            </Link>
            <Link href="/#pricing">
              <a className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                Pricing
              </a>
            </Link>
            <Link href="/docs">
              <a className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                API Docs
              </a>
            </Link>
            <Link href="/search">
              <a className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                Search
              </a>
            </Link>
            <div className="pt-3 space-y-2">
              <Link href="/dashboard">
                <Button variant="outline" className="w-full" size="sm">
                  Dashboard
                </Button>
              </Link>
              <Link href="/#pricing">
                <Button className="w-full" size="sm">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
