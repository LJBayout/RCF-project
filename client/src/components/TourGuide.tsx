import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/routes";
import { Compass, FileText, Search, BookOpen, LayoutDashboard, Calendar, Filter, BarChart3, Lightbulb, Sparkles, Loader2, type LucideIcon } from "lucide-react";

const TOUR_STORAGE_KEY = "cfr_tour_completed";

interface TourStep {
  title: string;
  description: string;
  tip: string | null;
  icon: LucideIcon;
  target: string | null;
  navigate: string | null;
  category: string;
  action: (() => void) | null;
}

export function getTourCompleted(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(TOUR_STORAGE_KEY) === "true";
}

export function setTourCompleted(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOUR_STORAGE_KEY, "true");
}

const STEPS: TourStep[] = [
  {
    title: "Understanding the CFR",
    description:
      "The Code of Federal Regulations (CFR) codifies U.S. federal administrative law—rules published by federal agencies under Congressional authority. While statutes set policy, the CFR defines implementation.",
    tip: "The CFR comprises 50 titles organized by subject matter. Each title contains parts and sections. This structure governs everything from food safety (FDA) to environmental standards (EPA) to customs (CBP).",
    icon: Compass,
    target: "tour-trigger",
    navigate: null,
    category: "Foundation",
    action: null,
  },
  {
    title: "The Power of Historical Data",
    description:
      "We maintain CFR archives spanning three decades (1990-present). Regulations evolve: agencies amend rules, add provisions, or sunset requirements. Historical access is essential for compliance verification and regulatory change analysis.",
    tip: "Consider an FDA audit for 2015 operations. Current CFR text won't suffice—you need the rules as they existed then. Our historical data lets you reconstruct the regulatory environment for any point in time.",
    icon: Calendar,
    target: null,
    navigate: null,
    category: "Strategy",
    action: null,
  },
  {
    title: "Browse: Structured Navigation",
    description:
      "Our Browse interface mirrors the official CFR hierarchy. Select a year, then navigate through titles to parts to sections—each level revealing deeper regulatory detail.",
    tip: "Conducting a gap analysis? Start by identifying which titles govern your operations. Drill into relevant parts to scope applicable requirements. Export section citations for audit documentation.",
    icon: FileText,
    target: "browse",
    navigate: ROUTES.browse,
    category: "Navigation",
    action: null,
  },
  {
    title: "Browse: Drill Into Structure",
    description:
      "Expand any title card to view its parts. Each part contains sections—the actual regulatory text. This structured approach lets you systematically catalog requirements.",
    tip: "When building a compliance matrix, use Browse to enumerate all applicable sections. Each section is a discrete requirement you can map to controls, preventing gaps in your compliance program.",
    icon: FileText,
    target: null,
    navigate: ROUTES.browse,
    category: "Navigation",
    action: null,
  },
  {
    title: "Search: Regulatory Intelligence",
    description:
      "Full-text search across the entire CFR corpus—all 50 titles, all years. Execute targeted queries to surface relevant provisions instantly.",
    tip: "Use precise terminology (e.g., 'recordkeeping AND retention'). Filter by title when you know the domain. This transforms hours of manual review into seconds of precision search.",
    icon: Search,
    target: "search",
    navigate: ROUTES.search,
    category: "Intelligence",
    action: null,
  },
  {
    title: "Search: Building Evidence",
    description:
      "The search interface provides immediate access to section text and metadata. Use filters to narrow results by title or part.",
    tip: "Execute searches for key compliance terms, screenshot results with section citations, then compile into audit workpapers. This creates a defensible audit trail demonstrating 'where the regulation says X.'",
    icon: Filter,
    target: "search-input",
    navigate: ROUTES.search,
    category: "Intelligence",
    action: null,
  },
  {
    title: "API: Programmatic Access",
    description:
      "REST API with comprehensive Swagger documentation. Authenticate via X-API-Key. Key endpoints: list titles, search full-text, retrieve title structure with parts.",
    tip: "Use the API to build automated compliance monitoring, policy engines, or client-facing dashboards. Test with 'Try it out' in Swagger, then implement in your tech stack.",
    icon: BookOpen,
    target: "docs",
    navigate: ROUTES.docs,
    category: "Integration",
    action: null,
  },
  {
    title: "Dashboard: Governance & Control",
    description:
      "Real-time visibility into API consumption: total requests, daily usage, quota status. Use this to manage access and demonstrate usage for governance purposes.",
    tip: "Create separate API keys per environment or client engagement. This enables usage tracking for cost allocation and helps isolate issues.",
    icon: LayoutDashboard,
    target: "dashboard",
    navigate: ROUTES.dashboard,
    category: "Governance",
    action: null,
  },
  {
    title: "Analytics: Performance Insights",
    description:
      "The Usage tab provides granular analytics: top endpoints by volume, average response times, and quota consumption trends.",
    tip: "If an endpoint shows high latency, consider caching results locally. If certain queries dominate usage, pre-fetch them during off-peak hours.",
    icon: BarChart3,
    target: "usage-tab",
    navigate: ROUTES.dashboard,
    category: "Optimization",
    action: () => {
      // Click the Usage tab when this step is shown
      const usageTab = document.querySelector('[data-tour="usage-tab"]') as HTMLElement;
      if (usageTab) {
        usageTab.click();
      }
    },
  },
  {
    title: "You're Equipped",
    description:
      "You now possess the knowledge to leverage this platform for sophisticated compliance work: regulatory research, historical analysis, gap assessment, and API-driven automation.",
    tip: "Next steps: Browse a title relevant to your domain, execute a search for key terms, or generate an API key and test endpoints. Build compliance programs with confidence—backed by 30+ years of authoritative data.",
    icon: Sparkles,
    target: null,
    navigate: null,
    category: "Mastery",
    action: null,
  },
];

interface TourGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resetStep?: boolean;
}

function getTargetRect(target: string): DOMRect | null {
  if (typeof document === "undefined") return null;
  const nodes = document.querySelectorAll(`[data-tour="${target}"]`);
  for (let i = 0; i < nodes.length; i++) {
    const rect = nodes[i].getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return rect;
  }
  return null;
}

function scrollTargetIntoView(target: string): void {
  const nodes = document.querySelectorAll(`[data-tour="${target}"]`);
  for (let i = 0; i < nodes.length; i++) {
    const rect = nodes[i].getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      nodes[i].scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      return;
    }
  }
}

export function TourGuide({ open, onOpenChange, resetStep }: TourGuideProps) {
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [, setLocation] = useLocation();
  const current = STEPS[step];
  const Icon = current?.icon ?? Compass;
  const isLast = step === STEPS.length - 1;
  const target = current?.target ?? null;

  const updateTargetRect = useCallback(() => {
    if (!target) {
      setTargetRect(null);
      return;
    }
    const rect = getTargetRect(target);
    setTargetRect(rect && rect.width > 0 && rect.height > 0 ? rect : null);
  }, [target]);

  useEffect(() => {
    if (open && resetStep) setStep(0);
  }, [open, resetStep]);

  useEffect(() => {
    if (!open) return;

    const navigateAndHighlight = async () => {
      if (current?.navigate) {
        setIsNavigating(true);
        setTargetRect(null);
        setLocation(current.navigate);
        // Wait for page to render
        await new Promise((resolve) => setTimeout(resolve, 600));
        setIsNavigating(false);
      }
      // Wait a bit more for animations, then update target
      await new Promise((resolve) => setTimeout(resolve, 200));
      
      // Execute any UI action (e.g., clicking a tab)
      if (current?.action) {
        current.action();
        // Wait for tab transition to complete
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      
      updateTargetRect();
      if (target) scrollTargetIntoView(target);
    };

    navigateAndHighlight();

    const onResizeOrScroll = () => {
      if (!isNavigating) updateTargetRect();
    };
    window.addEventListener("resize", onResizeOrScroll);
    window.addEventListener("scroll", onResizeOrScroll, true);
    return () => {
      window.removeEventListener("resize", onResizeOrScroll);
      window.removeEventListener("scroll", onResizeOrScroll, true);
    };
  }, [open, step, target, updateTargetRect, current, setLocation, isNavigating]);

  const handleNext = () => {
    if (isLast) {
      setTourCompleted();
      onOpenChange(false);
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleSkip = () => {
    setTourCompleted();
    onOpenChange(false);
  };

  if (!current) return null;

  const hasSpotlight = target && targetRect && !isNavigating;
  const overlayContent =
    open && typeof document !== "undefined" ? (
      <div className="fixed inset-0 z-[49]" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/60 backdrop-blur-[2px] transition-opacity duration-300" />
        {hasSpotlight && (
          <div
            className="absolute rounded-xl border-[3px] border-primary ring-8 ring-primary/20 pointer-events-none transition-all duration-500 ease-out shadow-[0_0_50px_rgba(59,130,246,0.4)] animate-pulse"
            style={{
              left: targetRect.left - 8,
              top: targetRect.top - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
            }}
          />
        )}
      </div>
    ) : null;

  const dialogContent = (
    <DialogContent
      showCloseButton={true}
      skipOverlay={hasSpotlight}
      className="!left-1/2 !top-1/2 !w-[min(30rem,calc(100vw-1.5rem))] !max-w-[30rem] !h-auto !max-h-[90vh] !translate-x-[-50%] !translate-y-[-50%] p-0 gap-0 rounded-2xl border-2 border-primary/20 shadow-2xl bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-300"
    >
      {/* Header with gradient */}
      <div className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-5 pb-4 border-b border-primary/10">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-white shadow-lg shadow-primary/30 ring-2 ring-primary/20">
            {isNavigating ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Icon className="h-6 w-6" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="secondary" className="text-[10px] font-bold px-2.5 py-0.5 tracking-wide">
                {current.category}
              </Badge>
              <span className="text-[10px] text-muted-foreground font-semibold tracking-wide">
                STEP {step + 1}/{STEPS.length}
              </span>
            </div>
            <DialogTitle className="text-lg font-bold leading-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {current.title}
            </DialogTitle>
          </div>
        </div>
      </div>

      {/* Content with scroll - smoother transitions */}
      <div className="px-6 py-5 space-y-3.5 max-h-[60vh] overflow-y-auto custom-scrollbar">
        <DialogDescription className="text-[13px] leading-relaxed text-foreground/90 transition-opacity duration-200">
          {current.description}
        </DialogDescription>
        {current.tip && (
          <div className="rounded-xl bg-gradient-to-br from-primary/8 via-primary/5 to-transparent border-2 border-primary/20 p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-md">
            <div className="flex items-start gap-2.5">
              <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-primary mb-1.5 tracking-wider">PRO INSIGHT</p>
                <p className="text-[12px] leading-relaxed text-foreground/85">
                  {current.tip}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Progress bar with smooth animations */}
      <div className="px-6 py-4 border-t border-border/50 bg-muted/20">
        <div className="flex items-center gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-all duration-500 ease-out ${
                i === step
                  ? "bg-gradient-to-r from-primary via-primary to-primary/80 shadow-lg shadow-primary/50 scale-y-125"
                  : i < step
                  ? "bg-primary/50"
                  : "bg-muted/50"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Footer with gradient */}
      <DialogFooter className="px-6 py-4 bg-gradient-to-t from-muted/40 via-muted/20 to-transparent border-t border-border/30 gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkip}
          className="text-muted-foreground hover:text-foreground transition-colors"
          disabled={isNavigating}
        >
          Skip Tour
        </Button>
        <Button
          size="sm"
          onClick={handleNext}
          disabled={isNavigating}
          className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isNavigating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : isLast ? (
            "Complete Tour"
          ) : (
            "Next"
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  );

  return (
    <>
      {open && overlayContent != null && createPortal(overlayContent, document.body)}
      <Dialog open={open} onOpenChange={onOpenChange}>
        {dialogContent}
      </Dialog>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--primary) / 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--primary) / 0.5);
        }
      `}</style>
    </>
  );
}
