import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import { Search, BookOpen, FileText, ChevronRight, Calendar } from "lucide-react";
import { ScrollArea } from "../components/ui/scroll-area";
import { Separator } from "../components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { Navbar } from "../components/Navbar";

export default function CFRBrowser() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTitle, setSelectedTitle] = useState<number | null>(null);
  const [selectedPart, setSelectedPart] = useState<{ titleNumber: number; partNumber: number } | null>(null);
  const [activeSearch, setActiveSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const { data: years = [] } = trpc.cfr.listYears.useQuery();
  const { data: coverage } = trpc.cfr.getCoverage.useQuery();
  const { data: titles, isLoading: titlesLoading, error: titlesError } = trpc.cfr.listTitles.useQuery(
    { year: selectedYear ?? undefined }
  );
  const { data: searchResults, isLoading: searchLoading } = trpc.cfr.searchFulltext.useQuery(
    { q: activeSearch, limit: 50 },
    { enabled: activeSearch.length > 0 }
  );
  const { data: titleData } = trpc.cfr.getTitle.useQuery(
    { titleNumber: selectedTitle ?? 0, year: selectedYear ?? undefined },
    { enabled: selectedTitle !== null && selectedTitle !== undefined }
  );
  const { data: partData } = trpc.cfr.getPart.useQuery(
    {
      titleNumber: selectedPart?.titleNumber ?? 0,
      partNumber: selectedPart?.partNumber ?? 0,
    },
    { enabled: selectedPart !== null && selectedPart !== undefined }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveSearch(searchQuery.trim());
      setSelectedTitle(null);
      setSelectedPart(null);
    }
  };

  const handleTitleClick = (titleNumber: number, year: number) => {
    if (titleNumber) {
      setSelectedTitle(titleNumber);
      setSelectedPart(null);
      setActiveSearch("");
      if (selectedYear === null || selectedYear !== year) setSelectedYear(year);
    }
  };

  const handlePartClick = (titleNumber: number, partNumber: number) => {
    if (titleNumber && partNumber) setSelectedPart({ titleNumber, partNumber });
  };

  const closeTitleDialog = () => {
    setSelectedTitle(null);
    setSelectedPart(null);
  };

  const closePartDialog = () => {
    setSelectedPart(null);
  };

  const displayTitles = titles ?? [];
  const titleCount = selectedYear != null ? displayTitles.length : (coverage?.titlesCount ?? displayTitles.length);
  const sectionsCount = coverage?.sectionsCount ?? 0;
  const sectionsDisplay = sectionsCount >= 1e6 ? `${(sectionsCount / 1e6).toFixed(2)}M` : sectionsCount.toLocaleString();
  // Full CFR scope (what the platform is built for)
  const TARGET_TITLES = 50;
  const TARGET_SECTIONS = "4.75M";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <Navbar />
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            CFR Browser
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Code of Federal Regulations - Complete Database
          </p>
        </div>

        {/* Search bar */}
        <Card className="mb-6 shadow-lg">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <label htmlFor="cfr-search" className="sr-only">
                  Search CFR
                </label>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  id="cfr-search"
                  name="cfr-search"
                  type="text"
                  placeholder="Search regulations, definitions, requirements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit" disabled={!searchQuery.trim()}>
                Search
              </Button>
            </form>
          </CardContent>
        </Card>

        {!activeSearch && (
          <>
            {/* Hero: Filter + Stats */}
            <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-600 rounded-2xl shadow-2xl mb-8">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
              <div className="relative p-6 md:p-8">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-white/90 block">📅 Filter by Year</label>
                      <Select
                        value={selectedYear != null ? String(selectedYear) : "latest"}
                        onValueChange={(v) => {
                          setSelectedYear(v === "latest" ? null : Number(v));
                          setSelectedTitle(null);
                          setSelectedPart(null);
                        }}
                      >
                        <SelectTrigger className="w-[200px] md:w-[240px] mt-1.5 bg-white hover:bg-white/95 border-0 text-slate-900 shadow-lg h-11 font-medium">
                          <SelectValue placeholder="Latest" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="latest">
                            <span className="font-semibold">Latest Versions</span>
                            <Badge variant="outline" className="ml-2 text-xs">Most Recent</Badge>
                          </SelectItem>
                          {years.sort((a, b) => b - a).map((y) => (
                            <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-center bg-white/15 backdrop-blur-md rounded-xl px-5 py-3 min-w-[120px] border border-white/20">
                      <div className="text-3xl font-black tracking-tight text-white">{TARGET_TITLES}</div>
                      <div className="text-xs text-blue-50 font-semibold uppercase tracking-wide mt-0.5">Titles</div>
                      <div className="text-xs text-white/80 mt-1">{titleCount} in DB</div>
                    </div>
                    <div className="text-center bg-white/15 backdrop-blur-md rounded-xl px-5 py-3 min-w-[120px] border border-white/20">
                      <div className="text-3xl font-black tracking-tight text-white">{TARGET_SECTIONS}</div>
                      <div className="text-xs text-blue-50 font-semibold uppercase tracking-wide mt-0.5">Sections</div>
                      <div className="text-xs text-white/80 mt-1">{sectionsDisplay} in DB</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* All CFR Titles - scrollable grid */}
            <Card className="shadow-lg overflow-hidden flex flex-col min-h-0">
              <CardHeader className="shrink-0">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  All CFR Titles
                </CardTitle>
                <CardDescription>
                  {titlesLoading
                    ? "Loading titles..."
                    : selectedYear
                      ? `${displayTitles.length} titles (latest versions) • Year ${selectedYear}`
                      : `${titleCount} titles (latest versions)`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 p-0 pb-6">
                {titlesLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 px-6">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <Skeleton key={i} className="h-[160px] rounded-xl" />
                    ))}
                  </div>
                ) : titlesError ? (
                  <div className="text-center py-12 text-red-500 px-6">
                    <p className="font-semibold mb-2">Error loading titles</p>
                    <p className="text-sm">{titlesError.message}</p>
                  </div>
                ) : !displayTitles.length ? (
                  <div className="text-center py-12 text-slate-500 px-6">
                    <p>No titles available yet.</p>
                    <p className="text-sm mt-2">Data is still being ingested...</p>
                  </div>
                ) : displayTitles.length > 0 ? (
                  <ScrollArea className="h-[calc(100vh-20rem)] min-h-[400px] w-full">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 px-6 pb-4">
                      {displayTitles.map((title, idx) => {
                        const uniqueKey = title.id != null && title.id > 0 
                          ? `title-${title.id}` 
                          : `title-${title.titleNumber}-${title.year}-${idx}`;
                        return (
                          <button
                            key={uniqueKey}
                            type="button"
                            onClick={() => handleTitleClick(title.titleNumber, title.year)}
                            className="flex flex-col items-stretch gap-2 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-blue-400 hover:shadow-lg hover:scale-[1.02] transition-all text-left min-h-[160px] group"
                          >
                            <div className="flex items-center justify-between gap-2 shrink-0">
                              <span className="font-bold text-lg text-blue-600 group-hover:text-blue-700 truncate">Title {title.titleNumber}</span>
                              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
                            </div>
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm shrink-0">
                              <Calendar className="h-4 w-4 shrink-0" />
                              <span className="font-semibold">{title.year}</span>
                            </div>
                            <span className="text-sm line-clamp-3 leading-snug text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 min-h-[2.5rem] break-words">
                              {title.name ?? "—"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-12 text-slate-500 px-6">
                    <p>No titles found.</p>
                    <p className="text-sm mt-2">Try selecting a different year or check if data is being ingested.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Search results */}
        {activeSearch && (
          <Card className="shadow-lg">
            <CardHeader>
                  <CardTitle>Search Results</CardTitle>
              <CardDescription>
                {searchLoading ? "Searching..." : `Found ${searchResults?.length ?? 0} results for "${activeSearch}"`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {searchLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-32 w-full" />
                    ))}
                  </div>
                ) : searchResults?.length ? (
                  <div className="space-y-4">
                    {searchResults.map((result, idx) => {
                      const resultKey = result.id != null && result.id > 0 
                        ? `result-${result.id}` 
                        : `result-${result.titleNumber}-${result.partNumber}-${result.sectionNumber}-${idx}`;
                      return (
                        <Card key={resultKey} className="hover:shadow-md transition-shadow">
                          <CardContent className="pt-6">
                            <div className="flex items-start gap-3">
                              <FileText className="h-5 w-5 text-blue-600 shrink-0 mt-1" />
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap gap-2 mb-2">
                                  <Badge variant="outline">{result.titleName ?? "Unknown Title"}</Badge>
                                  <Badge variant="secondary">Part {result.partNumber ?? "?"}</Badge>
                                  <Badge variant="secondary">§ {result.sectionNumber ?? "?"}</Badge>
                                </div>
                                <h3 className="font-semibold text-lg mb-2">{result.subject ?? "—"}</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3">{result.content ?? ""}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    No results found for &quot;{activeSearch}&quot;
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Title detail popup */}
        <Dialog open={!!selectedTitle} onOpenChange={(open) => !open && closeTitleDialog()}>
          <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden" aria-describedby="title-dialog-desc">
            <DialogHeader className="px-8 pt-6 pb-4 border-b shrink-0">
              {titleData ? (
                <>
                  <DialogTitle className="text-xl font-bold">Title {titleData.titleNumber}: {titleData.name}</DialogTitle>
                  <DialogDescription id="title-dialog-desc" className="flex items-center gap-3 flex-wrap mt-2 text-sm">
                    <Badge variant="secondary" className="text-sm px-3 py-1">Year {titleData.year}</Badge>
                    <Badge variant="outline" className="text-sm px-3 py-1">{titleData.parts.length} Parts</Badge>
                  </DialogDescription>
                </>
              ) : (
                <>
                  <DialogTitle className="text-xl">Loading…</DialogTitle>
                  <DialogDescription id="title-dialog-desc" className="sr-only">Loading title details and parts list.</DialogDescription>
                </>
              )}
            </DialogHeader>

            <div className="flex-1 min-h-0 overflow-y-auto px-8 pb-8">
              {titleData ? (
                <div className="space-y-3 pt-6">
                  {titleData.parts.map((part, idx) => (
                    <button
                      key={`part-${part.partNumber}-${idx}`}
                      type="button"
                      onClick={() => handlePartClick(titleData.titleNumber, part.partNumber)}
                      className="w-full text-left p-5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-blue-300 hover:bg-blue-50/50 transition-all flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-base">Part {part.partNumber}</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400 truncate mt-0.5">{part.name}</div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-400 shrink-0" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3 pt-6">
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Part detail popup — CFR document */}
        <Dialog open={!!selectedPart} onOpenChange={(open) => !open && closePartDialog()}>
          <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden" aria-describedby="part-dialog-desc">
            <DialogHeader className="px-8 pt-6 pb-4 border-b shrink-0">
              {partData ? (
                <>
                  <DialogTitle className="text-xl font-bold">
                    {partData.title.name} — Part {partData.part.partNumber}
                  </DialogTitle>
                  <DialogDescription id="part-dialog-desc" className="flex items-center gap-3 flex-wrap mt-2 text-sm">
                    <Badge variant="secondary" className="text-sm px-3 py-1">{partData.sections.length} Sections</Badge>
                  </DialogDescription>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{partData.part.name}</p>
                </>
              ) : (
                <>
                  <DialogTitle className="text-xl">Loading…</DialogTitle>
                  <DialogDescription id="part-dialog-desc" className="sr-only">Loading part sections.</DialogDescription>
                </>
              )}
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto px-8 pb-12">
              {partData ? (
                <div className="space-y-6 pt-6 font-sans text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {partData.sections.map((section, idx) => (
                    <div key={section.id}>
                      {idx > 0 && <Separator className="my-6" />}
                      <div className="space-y-2">
                        <div className="flex items-start gap-3">
                          <Badge variant="outline" className="shrink-0 text-xs px-2 py-0.5">§ {section.sectionNumber}</Badge>
                          <h3 className="font-semibold text-sm">{section.subject}</h3>
                        </div>
                        <p className="whitespace-pre-wrap pl-1 text-slate-700 dark:text-slate-300">
                          {section.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4 pt-6">
                  <Skeleton className="h-24 w-full rounded-lg" />
                  <Skeleton className="h-24 w-full rounded-lg" />
                  <Skeleton className="h-24 w-full rounded-lg" />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
