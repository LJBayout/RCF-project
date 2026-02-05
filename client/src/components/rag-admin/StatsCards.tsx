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
import { RefreshCw, Database, Layers, Zap, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatsCards() {
  const statsQuery = trpc.rag.getStats.useQuery(undefined, {
    refetchInterval: 5000,
  });
  const ingestionStatusQuery = trpc.rag.getIngestStatus.useQuery(undefined, {
    refetchInterval: 5000,
  });

  const stats = statsQuery.data;
  const ingestion = ingestionStatusQuery.data;
  const totalMySQL = ingestion?.totalMySQL ?? 0;
  const totalChunks = ingestion?.total ?? 0;
  const progress = ingestion?.progress ?? 0;
  const completionPct = progress;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        title="MySQL Ground Truth"
        value={totalMySQL.toLocaleString()}
        subvalue="Total CFR Sections"
        icon={Database}
        gradient="from-blue-500 to-indigo-600"
        loading={ingestionStatusQuery.isLoading}
      />

      <StatCard
        title="RAG Coverage"
        value={`${completionPct}%`}
        subvalue={`${totalChunks.toLocaleString()} sections ingested`}
        icon={Zap}
        gradient="from-amber-400 to-orange-500"
        loading={ingestionStatusQuery.isLoading}
        progress={completionPct}
      />

      <StatCard
        title="Vector Store"
        value={stats?.totalChunks?.toLocaleString() ?? "0"}
        subvalue="Embedded fragments"
        icon={Layers}
        gradient="from-slate-700 to-slate-900"
        loading={statsQuery.isLoading}
      />
    </div>
  );
}

function StatCard({ title, value, subvalue, icon: Icon, gradient, loading, progress }: any) {
  return (
    <Card className="relative overflow-hidden border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300">
      <div className={cn("absolute top-0 left-0 w-1 h-full bg-gradient-to-b", gradient)} />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{title}</CardDescription>
          <div className={cn("p-1.5 rounded-lg bg-gradient-to-br opacity-80", gradient)}>
            <Icon className="h-3.5 w-3.5 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          {loading ? <RefreshCw className="animate-spin h-5 w-5 text-slate-300" /> : value}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {progress !== undefined && (
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={cn("h-full transition-all duration-500 bg-gradient-to-r", gradient)}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        <p className="text-[11px] font-medium text-slate-500">
          {subvalue}
        </p>
      </CardContent>
    </Card>
  );
}
