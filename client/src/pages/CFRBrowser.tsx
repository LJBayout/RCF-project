import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import { Search, BookOpen, FileText, ChevronRight } from "lucide-react";
import { ScrollArea } from "../components/ui/scroll-area";
import { Separator } from "../components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Navbar } from "../components/Navbar";

export default function CFRBrowser() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTitle, setSelectedTitle] = useState<number | null>(null);
  const [selectedPart, setSelectedPart] = useState<{ titleNumber: number; partNumber: number } | null>(null);
  const [activeSearch, setActiveSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // Queries
  const { data: years = [] } = trpc.cfr.listYears.useQuery();
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
      partNumber: selectedPart?.partNumber ?? 0 
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
      // Lock to the specific year of the clicked title
      if (selectedYear === null || selectedYear !== year) {
        setSelectedYear(year);
      }
    }
  };

  const handlePartClick = (titleNumber: number, partNumber: number) => {
    if (titleNumber && partNumber) {
      setSelectedPart({ titleNumber, partNumber });
      setActiveSearch("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <Navbar />
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            CFR Data Platform
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Browse and search the Code of Federal Regulations
          </p>
        </div>

        {/* Search Bar */}
        <Card className="mb-6 shadow-lg">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
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

        <div className="space-y-6">
          {/* Main Content Area - Full Width */}
          <div className="space-y-6">
            {/* Enhanced Header with Stats & Filter - Always visible unless searching */}
            {!activeSearch && (
              <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-600 rounded-2xl shadow-2xl">
                {/* Animated background pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0" style={{
                    backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                    backgroundSize: '32px 32px'
                  }}></div>
                </div>
                
                <div className="relative p-8">
                  <div className="flex items-start justify-between gap-8 flex-wrap">
                    {/* Left: Title & Breadcrumb */}
                    <div className="space-y-3 flex-1 min-w-[300px]">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                          <BookOpen className="h-6 w-6" />
                        </div>
                        <div>
                          <h2 className="text-3xl font-bold tracking-tight">CFR Browser</h2>
                          {selectedTitle && titleData && (
                            <div className="flex items-center gap-2 mt-1">
                              <button 
                                onClick={() => {
                                  setSelectedTitle(null);
                                  setSelectedPart(null);
                                }}
                                className="text-sm text-blue-100 hover:text-white transition-colors underline decoration-dotted"
                              >
                                All Titles
                              </button>
                              <span className="text-blue-100">/</span>
                              <span className="text-sm font-medium">Title {selectedTitle}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {selectedTitle && titleData ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="bg-white/90 text-blue-900 font-semibold">
                              Title {titleData.titleNumber}
                            </Badge>
                            <Badge variant="outline" className="bg-white/10 text-white border-white/30">
                              Year {titleData.year}
                            </Badge>
                            <Badge variant="outline" className="bg-white/10 text-white border-white/30">
                              {titleData.parts.length} Parts
                            </Badge>
                          </div>
                          <p className="text-white text-xl font-medium">
                            {titleData.name}
                          </p>
                        </div>
                      ) : (
                        <p className="text-blue-50 text-lg">
                          Code of Federal Regulations - Complete Database
                        </p>
                      )}
                    </div>
                    
                    {/* Center: Year Filter (only when no title selected) */}
                    {years.length > 0 && !selectedTitle && (
                      <div className="min-w-[280px]">
                        <label className="text-sm font-semibold text-white/90 block mb-2 flex items-center gap-2">
                          <span className="text-xl">📅</span>
                          Filter by Year
                        </label>
                        <Select
                          value={selectedYear != null ? String(selectedYear) : "all"}
                          onValueChange={(v) => {
                            setSelectedYear(v === "all" ? null : Number(v));
                            setSelectedTitle(null);
                            setSelectedPart(null);
                          }}
                        >
                          <SelectTrigger className="w-full bg-white hover:bg-white/95 border-0 text-slate-900 shadow-lg h-12 text-base font-medium">
                            <SelectValue placeholder="Latest versions" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">Latest Versions</span>
                                <Badge variant="outline" className="text-xs">Most Recent</Badge>
                              </div>
                            </SelectItem>
                            <div className="border-t my-1"></div>
                            {years.sort((a, b) => b - a).map((y) => (
                              <SelectItem key={y} value={String(y)}>
                                <div className="flex items-center gap-2">
                                  <span>Year {y}</span>
                                  {y === selectedYear && <Badge variant="default" className="text-xs bg-blue-600">Active</Badge>}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {/* Right: Stats */}
                    <div className="flex gap-3">
                      <div className="relative group">
                        <div className="absolute inset-0 bg-white/20 blur-xl rounded-2xl group-hover:bg-white/30 transition-all"></div>
                        <div className="relative text-center bg-white/15 backdrop-blur-md rounded-xl px-6 py-4 min-w-[110px] border border-white/20 shadow-xl hover:scale-105 transition-transform">
                          <div className="text-4xl font-black tracking-tight">{titles?.length || 0}</div>
                          <div className="text-xs text-blue-50 font-semibold mt-1 uppercase tracking-wide">Titles</div>
                        </div>
                      </div>
                      <div className="relative group">
                        <div className="absolute inset-0 bg-white/20 blur-xl rounded-2xl group-hover:bg-white/30 transition-all"></div>
                        <div className="relative text-center bg-white/15 backdrop-blur-md rounded-xl px-6 py-4 min-w-[110px] border border-white/20 shadow-xl hover:scale-105 transition-transform">
                          <div className="text-4xl font-black tracking-tight">4.75M</div>
                          <div className="text-xs text-blue-50 font-semibold mt-1 uppercase tracking-wide">Sections</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Back button when title selected */}
                  {selectedTitle && (
                    <div className="mt-6 pt-6 border-t border-white/20">
                      <button
                        onClick={() => {
                          setSelectedTitle(null);
                          setSelectedPart(null);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-all text-sm font-medium border border-white/30 hover:scale-105"
                      >
                        <ChevronRight className="h-4 w-4 rotate-180" />
                        Back to All Titles
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Titles Grid - Only show when no title/part selected and not searching */}
            {!activeSearch && !selectedTitle && !selectedPart && (
              <Card className="shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        All CFR Titles
                      </CardTitle>
                      <CardDescription>
                        {titlesLoading 
                          ? "Loading titles..." 
                          : selectedYear 
                            ? `${titles?.length || 0} titles in ${selectedYear}`
                            : `${titles?.length || 0} titles (latest versions)`
                        }
                      </CardDescription>
                    </div>
                    {selectedYear && (
                      <Badge variant="default" className="bg-blue-600 text-lg px-4 py-2">
                        Year {selectedYear}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {titlesLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {[...Array(20)].map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                      ))}
                    </div>
                  ) : titlesError ? (
                    <div className="text-center py-12 text-red-500">
                      <p className="font-semibold mb-2">Error loading titles</p>
                      <p className="text-sm">{titlesError.message}</p>
                    </div>
                  ) : !titles || titles.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <p>No titles available yet.</p>
                      <p className="text-sm mt-2">Data is still being ingested...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[600px] overflow-y-auto pr-2">
                      {titles.map((title) => (
                        <button
                          key={title.id}
                          onClick={() => handleTitleClick(title.titleNumber, title.year)}
                          className="flex flex-col items-start gap-2 p-4 rounded-lg border transition-all hover:shadow-lg hover:scale-105 text-left bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 group"
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-bold text-lg text-blue-600 group-hover:text-blue-700">
                              Title {title.titleNumber}
                            </span>
                            <Badge variant="secondary" className="text-xs font-medium">
                              {title.year}
                            </Badge>
                          </div>
                          <span className="text-sm line-clamp-2 leading-tight text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">
                            {title.name}
                          </span>
                          <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 ml-auto" />
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Search Results */}
            {activeSearch && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Search Results</CardTitle>
                  <CardDescription>
                    {searchLoading ? "Searching..." : `Found ${searchResults?.length || 0} results for "${activeSearch}"`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    {searchLoading ? (
                      <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                          <Skeleton key={i} className="h-32 w-full" />
                        ))}
                      </div>
                    ) : searchResults && searchResults.length > 0 ? (
                      <div className="space-y-4">
                        {searchResults.map((result) => (
                          <Card key={result.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="pt-6">
                              <div className="flex items-start gap-3 mb-3">
                                <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-1" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap gap-2 mb-2">
                                    <Badge variant="outline">{result.titleName}</Badge>
                                    <Badge variant="secondary">Part {result.partNumber}</Badge>
                                    <Badge variant="secondary">§ {result.sectionNumber}</Badge>
                                  </div>
                                  <h3 className="font-semibold text-lg mb-2">{result.subject}</h3>
                                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3">
                                    {result.content}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-slate-500">
                        No results found for "{activeSearch}"
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Title Details with Parts */}
            {selectedTitle && titleData && !activeSearch && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Title {titleData.titleNumber}: {titleData.name}</CardTitle>
                  <CardDescription>
                    {titleData.parts.length} parts • Year {titleData.year}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-2">
                      {titleData.parts.map((part) => (
                        <button
                          key={part.id}
                          onClick={() => handlePartClick(titleData.titleNumber, part.partNumber)}
                          className="w-full text-left p-4 rounded-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold mb-1">
                                Part {part.partNumber}
                              </div>
                              <div className="text-sm text-slate-600 dark:text-slate-400">
                                {part.name}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0 mt-1" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Part Details with Sections */}
            {selectedPart && partData && !activeSearch && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>
                    {partData.title.name} - Part {partData.part.partNumber}
                  </CardTitle>
                  <CardDescription>
                    {partData.part.name} • {partData.sections.length} sections
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-4">
                      {partData.sections.map((section, idx) => (
                        <div key={section.id}>
                          {idx > 0 && <Separator className="my-4" />}
                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <Badge variant="outline" className="flex-shrink-0">
                                § {section.sectionNumber}
                              </Badge>
                              <h3 className="font-semibold text-lg">{section.subject}</h3>
                            </div>
                            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                              {section.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
