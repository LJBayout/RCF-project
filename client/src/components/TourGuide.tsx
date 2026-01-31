import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/routes";
import {
  Compass,
  FileText,
  Search,
  BookOpen,
  LayoutDashboard,
  Calendar,
  Filter,
  BarChart3,
  Lightbulb,
  Sparkles,
  Building2,
  Leaf,
  Pill,
  Shield,
  Code2,
  Briefcase,
  CheckCircle2,
  Bot,
  type LucideIcon,
} from "lucide-react";

const TOUR_STORAGE_KEY = "cfr_tour_completed";
const TOUR_VERSION = "10";

interface TourStep {
  title: string;
  description: string;
  tip: string;
  icon: LucideIcon;
  target?: string;
  route?: string;
  action?: () => void;
  category: string;
  positionOffset?: { x: number; y: number };
  examples?: string[];
  scenario?: string;
}

const STEPS: TourStep[] = [
  {
    title: "Understanding the CFR",
    description:
      "The Code of Federal Regulations (CFR) codifies U.S. federal administrative law—rules published by federal agencies under Congressional authority. While statutes set policy, the CFR defines implementation.",
    tip: "The CFR comprises 50 titles organized by subject matter. This structure governs everything from food safety to environmental standards to customs enforcement.",
    icon: Compass,
    target: "tour-trigger",
    route: ROUTES.home,
    category: "Foundation",
    examples: [
      "Title 21 - Food and Drugs (FDA)",
      "Title 40 - Environmental Protection (EPA)",
      "Title 8 - Aliens and Nationality (CBP)",
      "Title 29 - Labor (OSHA, DOL)",
    ],
  },
  {
    title: "The Power of Historical Data",
    description:
      "We maintain CFR archives spanning three decades (1990-present). Regulations evolve: agencies amend rules, add provisions, or sunset requirements. Historical access is essential for compliance verification and regulatory change analysis.",
    tip: "When facing an audit for past operations, current CFR text won't suffice—you need the rules as they existed then. Our historical data lets you reconstruct the regulatory environment for any point in time.",
    icon: Calendar,
    target: "home-hero",
    route: ROUTES.home,
    category: "Strategy",
    scenario:
      "SCENARIO: An FDA inspection covers 2015-2018 operations. You need to prove your quality system met 21 CFR Part 820 requirements as they existed in 2016, before the 2017 amendments. Select year 2016, navigate to Title 21, Part 820, and extract the exact regulatory text that applied during your audit period.",
  },
  {
    title: "CFR Title Domains",
    description:
      "Each of the 50 CFR titles governs a specific regulatory domain. Understanding which titles apply to your operations is the foundation of compliance mapping.",
    tip: "Healthcare organizations must monitor Title 21 (FDA drugs/devices), Title 42 (public health), and Title 45 (HHS). Manufacturers track Title 29 (OSHA safety), Title 40 (EPA emissions), and relevant product-specific titles.",
    icon: Building2,
    target: "browse-titles",
    route: ROUTES.browse,
    category: "Foundation",
    examples: [
      "Title 15 - Commerce & Trade (FTC, CPSC)",
      "Title 16 - Commercial Practices (Consumer Protection)",
      "Title 17 - Commodities (SEC, CFTC)",
      "Title 49 - Transportation (DOT, FAA)",
    ],
  },
  {
    title: "Browse: Structured Navigation",
    description:
      "The Browse view mirrors the official CFR hierarchy. Start with a Title card, then drill into Parts and Sections to reach the authoritative regulatory text.",
    tip: "For a gap analysis, identify the Titles that govern your operations first. Open a Title to enumerate Parts, then trace each Section into your control mapping and evidence catalog.",
    icon: FileText,
    target: "browse-titles",
    route: ROUTES.browse,
    category: "Navigation",
    scenario:
      "WORKFLOW: Gap Analysis - List all applicable CFR titles → Identify governing parts → Map each section to internal controls → Document evidence artifacts → Track remediation for gaps.",
  },
  {
    title: "Time Travel: Year Filtering",
    description:
      "Use the year filter to switch between historical and current CFR snapshots. This is how you reconstruct regulatory context for a specific audit period or compliance event.",
    tip: "Start with 'Latest Versions' for current compliance. Then select a prior year to validate what the rule required at the time of an event. The title and section counts confirm the dataset scope.",
    icon: Calendar,
    target: "browse-year-filter",
    route: ROUTES.browse,
    category: "Navigation",
    scenario:
      "EXAMPLE: A 2019 environmental violation is under review. You need to prove your stormwater permit met 40 CFR Part 122 requirements as written in 2019. Filter to year 2019, browse Title 40, Part 122, and extract the specific discharge standards that applied.",
  },
  {
    title: "Search: Regulatory Intelligence",
    description:
      "Full-text search across the entire CFR corpus—all 50 titles, all years. Execute targeted queries to surface relevant provisions instantly.",
    tip: "Use precise compliance terminology (e.g., 'recordkeeping AND retention', 'annual certification', 'qualified person'). Filter by title when you know the domain. This transforms hours of manual review into seconds of precision search.",
    icon: Search,
    target: "search",
    route: ROUTES.search,
    category: "Intelligence",
    positionOffset: { x: 0, y: 80 },
    examples: [
      '"data integrity" + Title 21 (FDA quality systems)',
      '"permit by rule" + Title 40 (EPA exemptions)',
      '"written procedure" + Title 29 (OSHA safety protocols)',
    ],
  },
  {
    title: "Search: Building Evidence",
    description:
      "The search interface provides immediate access to section text and metadata. Use filters to narrow results by title or part, then export citations for audit documentation.",
    tip: "Execute searches for key compliance terms, screenshot results with section citations, then compile into audit workpapers. This creates a defensible audit trail demonstrating 'where the regulation says X.'",
    icon: Filter,
    target: "search-input",
    route: ROUTES.search,
    category: "Intelligence",
    scenario:
      "AUDIT DEFENSE: External auditor questions your training program. Search 'training AND documentation' filtered to your industry titles (e.g., 21, 29, 40). Export section citations proving regulatory requirements, then cross-reference to your training records.",
  },
  {
    title: "Real-World: Pharma Compliance",
    description:
      "Pharmaceutical and medical device companies must comply with 21 CFR Parts 11, 211, 820, and related provisions. These govern everything from electronic records to manufacturing quality systems.",
    tip: "Part 11 (electronic records/signatures), Part 211 (drug GMP), Part 820 (device QMS). Search for 'validation' in Title 21 to see cross-cutting requirements across all three parts.",
    icon: Pill,
    target: "search-input",
    route: ROUTES.search,
    category: "Use Case",
    scenario:
      "SCENARIO: You're implementing a new quality management system. Search '21 CFR 820.30' (design controls), '21 CFR 820.75' (process validation), and '21 CFR 11.10' (electronic signature controls) to build your validation protocol.",
  },
  {
    title: "Real-World: Environmental Permits",
    description:
      "EPA regulations under Title 40 govern air emissions (Parts 60-99), water discharge (Parts 100-149), and hazardous waste (Parts 260-282). Most facilities require multiple permits.",
    tip: "Title 40 CFR is massive—over 1,000 parts. Use search to find 'permit shield', 'upset provision', 'emergency exemption', or 'de minimis' to understand compliance flexibilities written into the regulations.",
    icon: Leaf,
    target: "search-input",
    route: ROUTES.search,
    category: "Use Case",
    examples: [
      "Part 122 - NPDES water permits",
      "Part 70 - Operating permits (air)",
      "Part 262 - Hazardous waste generators",
    ],
  },
  {
    title: "Real-World: Workplace Safety",
    description:
      "OSHA standards in 29 CFR mandate safety protocols for construction (1926), general industry (1910), and maritime (1915-1918). Non-compliance triggers citations with daily penalties.",
    tip: "Search '29 CFR 1910.147' (lockout/tagout), '29 CFR 1910.1200' (hazard communication), '29 CFR 1926.501' (fall protection). These are the most-cited OSHA standards—get them right.",
    icon: Shield,
    target: "search-input",
    route: ROUTES.search,
    category: "Use Case",
    scenario:
      "INSPECTION PREP: OSHA announced a site visit. Search 'written program' in Title 29 to identify which safety programs require documented procedures. Cross-check your safety manual against each cited section.",
  },
  {
    title: "Compliance Intelligence",
    description:
      "Click the chatbot icon to ask questions about U.S. federal regulations. Get instant answers with CFR citations. Powered by GPT-4 and RAG, searching 30+ years of regulatory data.",
    tip: "Try questions like 'What are FDA electronic signature requirements?' or 'How do I comply with EPA stormwater permits?' The AI retrieves relevant CFR sections, synthesizes answers, and provides source citations with similarity scores.",
    icon: Bot,
    target: "chatbot-icon",
    category: "Intelligence",
    examples: [
      '"What are FDA requirements for electronic signatures?"',
      '"How do I comply with EPA stormwater permits?"',
      '"What changed in 21 CFR 820 between 2016 and 2023?"',
    ],
    scenario:
      "USE CASE: You need to understand FDA validation requirements for a new quality system. Instead of manually searching through hundreds of CFR sections, ask the AI: 'What are FDA validation requirements for quality systems?' Get a synthesized answer with citations to 21 CFR 820.75, 820.70, and related sections—all in seconds.",
  },
  {
    title: "API: Programmatic Access",
    description:
      "REST API with comprehensive Swagger documentation. Authenticate via X-API-Key. Key endpoints: list titles, search full-text, retrieve title structure with parts and sections.",
    tip: "Use the API to build automated compliance monitoring, policy engines, or client-facing dashboards. Test with 'Try it out' in Swagger, then implement in your tech stack.",
    icon: Code2,
    target: "docs",
    route: ROUTES.docs,
    category: "Integration",
    examples: [
      "GET /api/search/fulltext?query=validation&title=21",
      "GET /api/titles/40/parts/122 (water permits)",
      "GET /api/titles (list all 50 CFR titles)",
    ],
    scenario:
      "AUTOMATION: Build a nightly job that searches new regulatory keywords in your relevant titles, emails alerts when new sections match, and logs results for compliance dashboards.",
  },
  {
    title: "Dashboard: Governance & Control",
    description:
      "Real-time visibility into API consumption: total requests, daily usage, quota status. Use this to manage access, demonstrate usage for governance, and track team consumption.",
    tip: "Create separate API keys per environment (dev/staging/prod) or client engagement. This enables usage tracking for cost allocation and helps isolate issues to specific systems.",
    icon: LayoutDashboard,
    target: "dashboard",
    route: ROUTES.dashboard,
    category: "Governance",
  },
  {
    title: "Analytics: Performance Insights",
    description:
      "The Usage tab provides granular analytics: top endpoints by volume, average response times, and quota consumption trends. Use this to optimize API calls and predict capacity needs.",
    tip: "If an endpoint shows high latency, consider caching results locally. If certain queries dominate usage, pre-fetch them during off-peak hours to improve response times.",
    icon: BarChart3,
    target: "usage-tab",
    route: ROUTES.dashboard,
    category: "Optimization",
    action: () => {
      const tab = document.querySelector('[data-tour="usage-tab"]') as HTMLElement;
      if (tab) tab.click();
    },
  },
  {
    title: "You're a Compliance Pro",
    description:
      "You now possess the knowledge to leverage this platform for sophisticated compliance work: regulatory research, historical analysis, gap assessment, audit defense, and API-driven automation.",
    tip: "Next steps: Browse a title relevant to your domain (21, 29, 40, etc.), execute a search for key compliance terms, or generate an API key and integrate into your compliance automation. Build programs backed by 30+ years of authoritative CFR data.",
    icon: Sparkles,
    category: "Mastery",
    scenario:
      "YOUR PLAYBOOK: 1) Identify applicable CFR titles → 2) Map parts to operations → 3) Search key terms for evidence → 4) Document historical context → 5) Automate monitoring via API → 6) Track usage in dashboard. Repeat quarterly.",
  },
];

export function getTourCompleted(): boolean {
  if (typeof window === "undefined") return false;
  const version = localStorage.getItem("tour_version");
  if (version !== TOUR_VERSION) {
    localStorage.removeItem(TOUR_STORAGE_KEY);
    localStorage.setItem("tour_version", TOUR_VERSION);
    return false;
  }
  return localStorage.getItem(TOUR_STORAGE_KEY) === "true";
}

export function setTourCompleted(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOUR_STORAGE_KEY, "true");
}

interface TourGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resetStep?: boolean;
}

function findVisibleElement(selector: string): HTMLElement | null {
  const elements = document.querySelectorAll<HTMLElement>(selector);
  for (const el of elements) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return el;
  }
  return null;
}

export function TourGuide({ open, onOpenChange, resetStep }: TourGuideProps) {
  const [step, setStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [location, setLocation] = useLocation();
  const runIdRef = useRef(0);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  // Reset to step 0 when opening
  useEffect(() => {
    if (open && resetStep) setStep(0);
    if (!open) setIsBusy(false);
  }, [open, resetStep]);

  // Handle navigation and highlighting
  useEffect(() => {
    if (!open) return;

    const runId = ++runIdRef.current;
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const setup = async () => {
      setIsBusy(true);
      try {
        // Navigate if needed
        if (current.route && location !== current.route) {
          setLocation(current.route);
          await wait(450);
          if (runIdRef.current !== runId) return;
        }

        // Execute action if any
        if (current.action) {
          current.action();
          await wait(250);
          if (runIdRef.current !== runId) return;
        }

        // Find and highlight target (retry for async UI rendering)
        if (current.target) {
          let found = false;
          for (let i = 0; i < 6; i += 1) {
            if (runIdRef.current !== runId) return;
            const el = findVisibleElement(`[data-tour="${current.target}"]`);
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              setSpotlightRect(el.getBoundingClientRect());
              found = true;
              break;
            }
            await wait(150);
          }
          if (!found) setSpotlightRect(null);
        } else {
          setSpotlightRect(null);
        }
      } finally {
        if (runIdRef.current === runId) setIsBusy(false);
      }
    };

    setup();

    // Update spotlight on resize/scroll
    const updateSpotlight = () => {
      if (current.target) {
        const el = findVisibleElement(`[data-tour="${current.target}"]`);
        if (el) {
          setSpotlightRect(el.getBoundingClientRect());
        } else {
          setSpotlightRect(null);
        }
      } else {
        setSpotlightRect(null);
      }
    };

    window.addEventListener("resize", updateSpotlight);
    window.addEventListener("scroll", updateSpotlight, true);

    return () => {
      runIdRef.current += 1;
      window.removeEventListener("resize", updateSpotlight);
      window.removeEventListener("scroll", updateSpotlight, true);
    };
  }, [open, step, current, location, setLocation]);

  const handleNext = () => {
    if (isLast) {
      setTourCompleted();
      onOpenChange(false);
    } else {
      setStep((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    setTourCompleted();
    onOpenChange(false);
  };

  if (!current) return null;

  const Icon = current.icon;
  const hasSpotlight = Boolean(spotlightRect);
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;
  const dialogWidth = Math.min(520, viewportWidth - 24);
  const dialogHeight = 480;
  const pad = 12;

  const dialogPosition = (() => {
    if (!spotlightRect) {
      return { left: "50%", top: "50%", transform: "translate(-50%, -50%)" } as const;
    }
    const rightSpace = viewportWidth - spotlightRect.right - pad;
    const leftSpace = spotlightRect.left - pad;
    const belowSpace = viewportHeight - spotlightRect.bottom - pad;
    const aboveSpace = spotlightRect.top - pad;

    let left = spotlightRect.right + pad;
    let top = spotlightRect.top;
    let useRight = rightSpace >= dialogWidth || rightSpace >= leftSpace;

    if (!useRight) {
      left = spotlightRect.left - pad - dialogWidth;
    }

    if (belowSpace < dialogHeight && aboveSpace > belowSpace) {
      top = Math.max(pad, spotlightRect.top - dialogHeight);
    }

    left = Math.min(Math.max(pad, left), viewportWidth - dialogWidth - pad);
    top = Math.min(Math.max(pad, top), viewportHeight - dialogHeight - pad);

    const offset = current.positionOffset ?? { x: 0, y: 0 };
    return { left: left + offset.x, top: top + offset.y, transform: "translate(0, 0)" } as const;
  })();

  return (
    <>
      {/* Overlay with spotlight */}
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[49] pointer-events-none">
            {hasSpotlight && spotlightRect && (
              <div
                className="absolute rounded-2xl border-[2px] border-primary ring-4 ring-primary/20 transition-all duration-500 shadow-[0_0_24px_rgba(59,130,246,0.25)] animate-pulse"
                style={{
                  left: spotlightRect.left - 8,
                  top: spotlightRect.top - 8,
                  width: spotlightRect.width + 16,
                  height: spotlightRect.height + 16,
                }}
              />
            )}
          </div>,
          document.body
        )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton
          skipOverlay={true}
          style={dialogPosition}
          className="!w-[min(32.5rem,calc(100vw-1.5rem))] !max-w-[32.5rem] !h-auto !max-h-[90vh] !translate-x-0 !translate-y-0 p-0 gap-0 rounded-2xl border border-border/60 shadow-[0_20px_60px_rgba(15,23,42,0.16)] bg-white overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-br from-white to-primary/5 px-6 py-5 pb-4 border-b border-border/60">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 shadow-sm">
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge variant="secondary" className="text-[10px] font-bold px-2.5 py-0.5 bg-primary/10 text-primary shadow-sm">
                    {current.category}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    STEP {step + 1}/{STEPS.length}
                  </span>
                </div>
                <DialogTitle className="text-[17px] font-semibold leading-tight text-foreground">
                  {current.title}
                </DialogTitle>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
            <DialogDescription className="text-[13.5px] leading-relaxed text-foreground/80">
              {current.description}
            </DialogDescription>

            {/* PRO INSIGHT */}
            <div className="rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 p-4 shadow-sm">
              <div className="flex items-start gap-2.5">
                <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-primary mb-1.5 tracking-wider">
                    PRO INSIGHT
                  </p>
                  <p className="text-[12.5px] leading-relaxed text-foreground/80">{current.tip}</p>
                </div>
              </div>
            </div>

            {/* EXAMPLES */}
            {current.examples && current.examples.length > 0 && (
              <div className="rounded-xl bg-muted/30 border border-border/60 p-4">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-foreground mb-2 tracking-wider">
                      KEY EXAMPLES
                    </p>
                    <ul className="space-y-1.5">
                      {current.examples.map((example, i) => (
                        <li key={i} className="text-[12px] leading-relaxed text-foreground/75 flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{example}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* SCENARIO */}
            {current.scenario && (
              <div className="rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200/60 p-4 shadow-sm">
                <div className="flex items-start gap-2.5">
                  <Briefcase className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-amber-700 mb-1.5 tracking-wider">
                      REAL-WORLD SCENARIO
                    </p>
                    <p className="text-[12.5px] leading-relaxed text-amber-900/80">
                      {current.scenario}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Progress */}
          <div className="px-6 py-4 border-t border-border/50 bg-gradient-to-br from-white to-muted/20">
            <div className="flex gap-2">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 flex-1 rounded-full transition-all duration-500 ${
                    i === step
                      ? "bg-primary shadow-[0_2px_10px_rgba(59,130,246,0.35)] scale-y-125"
                      : i < step
                      ? "bg-primary/30"
                      : "bg-muted/40"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-4 bg-white border-t border-border/60 gap-3">
            <Button variant="ghost" size="sm" onClick={handleSkip} disabled={isBusy} className="text-muted-foreground hover:text-foreground">
              Skip Tour
            </Button>
            <Button
              size="sm"
              onClick={handleNext}
              disabled={isBusy}
              className="bg-primary hover:bg-primary/90 shadow-sm"
            >
              {isLast ? "Complete Tour" : "Next"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
