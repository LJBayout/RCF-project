import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search as SearchIcon, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";

export default function Search() {
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [titleFilter, setTitleFilter] = useState<string>("all");

  const { data: titles = [] } = trpc.cfr.listTitles.useQuery();
  const { data: results = [], isFetching } = trpc.cfr.searchFulltext.useQuery(
    { q: searchTerm, titleNumber: titleFilter === "all" ? undefined : Number(titleFilter), limit: 50 },
    { enabled: searchTerm.length >= 2 }
  );

  const handleSearch = () => setSearchTerm(query.trim());
  const displayResults = results.map((r) => ({
    id: r.id,
    title: `Title ${r.titleNumber}`,
    titleName: r.titleName ?? "",
    part: `Part ${r.partNumber}`,
    section: r.sectionNumber,
    subject: r.subject,
    content: r.content?.slice(0, 300) + (r.content && r.content.length > 300 ? "..." : "") ?? "",
  }));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <div className="container py-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Search CFR Database</h1>
          <p className="text-muted-foreground">
            Search across all 50 titles of the Code of Federal Regulations
          </p>
        </div>

        {/* Search Bar */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search regulations, keywords, or section numbers..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={titleFilter} onValueChange={setTitleFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Titles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Titles</SelectItem>
                  {titles.map((t) => (
                    <SelectItem key={t.id} value={String(t.titleNumber)}>
                      Title {t.titleNumber} - {t.name ?? t.subject ?? ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleSearch} disabled={isFetching}>
                <SearchIcon className="h-4 w-4 mr-2" />
                {isFetching ? "Searching..." : "Search"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search Results */}
        {searchTerm.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <SearchIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Start searching</h3>
              <p className="text-muted-foreground">
                Enter a keyword, regulation number, or topic to search the CFR database
              </p>
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                {["vessel", "customs", "import", "duty"].map((term) => (
                  <Badge
                    key={term}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => {
                      setQuery(term);
                      setSearchTerm(term);
                    }}
                  >
                    {term}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Found {displayResults.length} results for "{searchTerm}"
              </p>
            </div>

            {displayResults.length === 0 && !isFetching ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No results. Try different keywords or another title filter.
                </CardContent>
              </Card>
            ) : (
              displayResults.map((result) => (
                <Card key={result.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{result.title}</Badge>
                          <Badge variant="secondary">{result.part}</Badge>
                          <Badge>{result.section}</Badge>
                        </div>
                        <CardTitle className="text-xl mb-1">{result.subject}</CardTitle>
                        <CardDescription>{result.titleName}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {result.content}
                    </p>
                    <Button variant="link" className="mt-2 p-0 h-auto" asChild>
                      <a href={`/docs#section-${result.id}`}>View full regulation →</a>
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
