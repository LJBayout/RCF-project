"use client";

import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Database, Info } from "lucide-react";

export function DataCoverageCard() {
  const coverageQuery = trpc.cfr.getCoverage.useQuery(undefined, {
    refetchInterval: 60000,
  });
  const statsQuery = trpc.rag.getStats.useQuery(undefined, {
    refetchInterval: 3000,
  });

  const coverage = coverageQuery.data;
  const stats = statsQuery.data;
  const coverageYears = coverage?.years ?? [];
  const minYear = coverage?.yearMin ?? null;
  const maxYear = coverage?.yearMax ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Available Data Coverage
        </CardTitle>
        <CardDescription>
          CFR titles and historical years in the primary CFR database. Where it
          is stored and how the RAG system uses it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Years covered
            </h3>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-secondary rounded-lg">
                <span className="text-2xl font-bold">
                  {minYear != null && maxYear != null
                    ? `${minYear} — ${maxYear}`
                    : "—"}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                {coverageYears.length > 0
                  ? `${coverageYears.length} year(s) in DB`
                  : "No years yet"}
              </span>
            </div>
            {coverage && (
              <p className="text-xs text-muted-foreground mt-2">
                Titles: {coverage.titlesCount} · Parts: {coverage.partsCount} ·
                Sections: {coverage.sectionsCount.toLocaleString()}
              </p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Title distribution (volume)
            </h3>
            <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
              {stats?.titleDistribution && stats.titleDistribution.length > 0 ? (
                stats.titleDistribution.map(
                  (item: { title: number; count: number }) => {
                    const pct =
                      (stats.totalDocuments ?? 0) > 0
                        ? Math.round(
                            (item.count / stats.totalDocuments!) * 100
                          )
                        : 0;
                    return (
                      <div key={item.title} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">Title {item.title}</span>
                          <span className="text-muted-foreground">
                            {item.count.toLocaleString()} docs ({pct}%)
                          </span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>
                    );
                  }
                )
              ) : statsQuery.isLoading ? (
                <span className="text-sm text-muted-foreground italic">
                  Loading…
                </span>
              ) : (
                <span className="text-sm text-muted-foreground italic">
                  No title distribution data yet
                </span>
              )}
            </div>
          </div>
        </div>

        <Alert className="mt-6 bg-slate-50/80 border-slate-200">
          <Info className="h-4 w-4 text-slate-600" />
          <AlertTitle className="text-slate-900 text-sm">
            Where this is stored
          </AlertTitle>
          <AlertDescription className="text-slate-700 text-sm">
            Primary CFR data lives in <strong>MySQL</strong> (database{" "}
            <code className="bg-slate-200 px-1 rounded">cfr_platform</code>):
            tables <code className="bg-slate-200 px-1 rounded">cfr_titles</code>,{" "}
            <code className="bg-slate-200 px-1 rounded">cfr_parts</code>,{" "}
            <code className="bg-slate-200 px-1 rounded">cfr_sections</code>.
            Airflow pipelines write here; the API and RAG read from here.
          </AlertDescription>
        </Alert>
        <Alert className="mt-3 bg-blue-50/80 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900 text-sm">
            How the RAG system uses it
          </AlertTitle>
          <AlertDescription className="text-blue-800 text-sm">
            RAG only answers from <strong>sections that have embeddings</strong>.
            It embeds the user question, does{" "}
            <strong>semantic search</strong> over those section embeddings,
            retrieves the top matches, and sends that context to{" "}
            <strong>GPT</strong> for cited answers. Run ingestion in the{" "}
            <strong>Embeddings</strong> tab to index more sections.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
