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
    { titleNumber: selectedTitle ?? 0 },
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

  const handleTitleClick = (titleNumber: number) => {
    if (titleNumber) {
      setSelectedTitle(titleNumber);
      setSelectedPart(null);
      setActiveSearch("");
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Titles List */}
          <Card className="lg:col-span-1 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                CFR Titles
              </CardTitle>
              <CardDescription>
                {titlesLoading ? "Loading..." : `${titles?.length || 0} titles available`}
              </CardDescription>
              {years.length > 0 && (
                <div className="pt-2">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1.5">
                    Filter by year
                  </label>
                  <Select
                    value={selectedYear != null ? String(selectedYear) : "all"}
                    onValueChange={(v) => setSelectedYear(v === "all" ? null : Number(v))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All years" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All years</SelectItem>
                      {years.map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                {titlesLoading ? (
                  <div className="space-y-2">
                    {[...Array(10)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
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
                  <div className="space-y-2">
                    {titles.map((title) => (
                      <button
                        key={title.id}
                        onClick={() => handleTitleClick(title.titleNumber)}
                        className={`w-full text-left p-3 rounded-lg border transition-all hover:shadow-md ${
                          selectedTitle === title.titleNumber
                            ? "bg-blue-50 dark:bg-blue-950 border-blue-500"
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm">
                                Title {title.titleNumber}
                              </span>
                              {selectedYear == null && (
                                <Badge variant="secondary" className="text-xs font-normal">
                                  {title.year}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                              {title.name}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0 mt-1" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
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

            {/* Welcome State */}
            {!activeSearch && !selectedTitle && !selectedPart && (
              <Card className="shadow-lg">
                <CardContent className="pt-12 pb-12 text-center">
                  <BookOpen className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-xl font-semibold mb-2">Welcome to CFR Browser</h3>
                  <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                    Select a title from the left sidebar to browse regulations, or use the search bar above to find specific content.
                  </p>
                  <div className="mt-6 flex justify-center gap-4">
                    <Badge variant="secondary">{titles?.length || 0} Titles</Badge>
                    <Badge variant="secondary">120,000+ Sections</Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
