"use client";

import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RefreshCw } from "lucide-react";

export function StatsCards() {
  const statsQuery = trpc.rag.getStats.useQuery(undefined, {
    refetchInterval: 3000,
  });
  const ingestionStatusQuery = trpc.rag.getIngestStatus.useQuery(undefined, {
    refetchInterval: 3000,
  });

  const stats = statsQuery.data;
  const ingestion = ingestionStatusQuery.data;
  const totalCount = ingestion?.total ?? 0;
  const completedCount = ingestion?.completed ?? 0;
  const missingCount = ingestion?.missing ?? 0;
  const completionPct =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const totalChunks = stats?.totalChunks ?? 0;
  const totalDocuments = stats?.totalDocuments ?? 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card className="border-l-4 border-l-emerald-500">
        <CardHeader className="pb-2">
          <CardDescription>MySQL sections</CardDescription>
          <CardTitle className="text-3xl text-emerald-700 flex items-center gap-2">
            <span>{totalCount.toLocaleString()}</span>
            {ingestionStatusQuery.isLoading && (
              <RefreshCw className="animate-spin h-5 w-5" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Total CFR sections in DB
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-amber-500">
        <CardHeader className="pb-2">
          <CardDescription>Embedding coverage</CardDescription>
          <CardTitle className="text-3xl text-amber-700 flex items-center gap-2">
            <span>{completionPct}%</span>
            {ingestionStatusQuery.isLoading && (
              <RefreshCw className="animate-spin h-5 w-5" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={completionPct} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {completedCount.toLocaleString()} with embeddings ·{" "}
            {missingCount.toLocaleString()} missing
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-slate-500">
        <CardHeader className="pb-2">
          <CardDescription>Vector store (Postgres)</CardDescription>
          <CardTitle className="text-3xl text-slate-700 flex items-center gap-2">
            <span>{totalChunks.toLocaleString()}</span>
            {statsQuery.isLoading && (
              <RefreshCw className="animate-spin h-5 w-5" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Chunks / docs in pgvector (if used)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
