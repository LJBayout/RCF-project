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
  const statsQuery = trpc.rag.getStats.useQuery(undefined, {
    refetchInterval: 5000,
  });

  const stats = statsQuery.data;
  const minYear = stats?.yearRange?.min ?? null;
  const maxYear = stats?.yearRange?.max ?? null;
  const totalYears = stats?.totalYears ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-900">
          <Database className="h-5 w-5 text-indigo-500" />
          Available Data Coverage
        </CardTitle>
        <CardDescription className="text-slate-500">
          CFR titles and historical years <strong>embedded in the Vector Store</strong>. This defines the AI's "Ground Truth" for retrieval.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              Retrievable Horizon
            </h3>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-900 text-white rounded-xl shadow-inner">
                <span className="text-2xl font-bold tracking-tight">
                  {minYear != null && maxYear != null
                    ? `${minYear} — ${maxYear}`
                    : "—"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900">
                  {totalYears > 0 ? `${totalYears} historical years` : "No data"}
                </span>
                <span className="text-xs text-slate-400">in Vector Store</span>
              </div>
            </div>
            {stats && (
              <div className="mt-6 flex flex-wrap gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Titles</span>
                  <span className="text-lg font-bold text-slate-900">{(stats as any).coveredTitles?.length || 0}</span>
                </div>
                <div className="h-8 w-px bg-slate-200 mt-2" />
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Parts</span>
                  <span className="text-lg font-bold text-slate-900">{(stats as any).totalParts || 0}</span>
                </div>
                <div className="h-8 w-px bg-slate-200 mt-2" />
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Sections</span>
                  <span className="text-lg font-bold text-slate-900">{stats.totalDocuments?.toLocaleString() || 0}</span>
                </div>
              </div>
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
            Source of Truth (Vector Store)
          </AlertTitle>
          <AlertDescription className="text-slate-700 text-sm">
            The data shown above is queried directly from <strong>PostgreSQL</strong> (table <code className="bg-slate-200 px-1 rounded">cfr_chunks</code>).
            While original law exists in MySQL, the AI <strong>only knows</strong> what has been successfully vectorized and stored here.
          </AlertDescription>
        </Alert>
        <Alert className="mt-3 bg-blue-50/80 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900 text-sm">
            RAG Retrieval Logic
          </AlertTitle>
          <AlertDescription className="text-blue-800 text-sm">
            During a query, the system performs a <strong>Top-K Semantic Search</strong>.
            If a Title or Year is missing above, the RAG cannot cite it. Use the <strong>Embeddings</strong> tab to fill gaps in the Vector Store.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
