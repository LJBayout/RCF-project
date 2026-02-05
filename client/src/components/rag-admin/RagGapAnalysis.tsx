"use client";

import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    ArrowRight,
    RefreshCcw,
    Zap,
    Filter,
    Search,
    BarChart3,
    Play
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function RagGapAnalysis() {
    const [filter, setFilter] = useState<string>("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [viewMode, setViewMode] = useState<"table" | "summary">("table");

    // Logging System State
    const [showLog, setShowLog] = useState(false);
    const [logs, setLogs] = useState<{ time: string; message: string; type: 'info' | 'success' | 'error' }[]>([]);
    const logEndRef = useRef<HTMLDivElement>(null);

    const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
        setLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message,
            type
        }]);
    };

    useEffect(() => {
        if (logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs]);

    const gapQuery = trpc.rag.getGapAnalysis.useQuery();
    const ingestMutation = trpc.rag.ingest.useMutation();

    const data: any[] = gapQuery.data || [];

    // Calculate Title Summaries
    const titleSummaries = data.reduce((acc: any, curr: any) => {
        if (!acc[curr.title]) {
            acc[curr.title] = { title: curr.title, totalYears: 0, completeYears: 0, totalSections: 0, vectorSections: 0 };
        }
        acc[curr.title].totalYears += 1;
        acc[curr.title].totalSections += curr.mysqlCount;
        acc[curr.title].vectorSections += curr.postgresCount;
        if (curr.status === "complete") acc[curr.title].completeYears += 1;
        return acc;
    }, {} as Record<number, any>);

    const summaryList = Object.values(titleSummaries).sort((a: any, b: any) => a.title - b.title);

    const filteredData = data.filter((item: any) => {
        const matchesTitle = item.title.toString().includes(filter);
        const matchesStatus = statusFilter === "all" || item.status === statusFilter;
        return matchesTitle && matchesStatus;
    });

    const stats = {
        total: data.length,
        complete: data.filter((i: any) => i.status === "complete").length,
        partial: data.filter((i: any) => i.status === "partial").length,
        missing: data.filter((i: any) => i.status === "missing").length,
    };

    const handleIngest = (title: number, year: number) => {
        toast.info(`Starting ingestion for Title ${title} (${year})...`);
        ingestMutation.mutate({ titleFilter: title, year }, {
            onSuccess: (res) => {
                toast.success(`Ingested ${res.success} sections!`);
                gapQuery.refetch();
            },
            onError: (err) => {
                toast.error(err.message);
            }
        });
    };

    const runMassIngestion = async () => {
        const missingRows = filteredData.filter((r: any) => r.status !== "complete");
        if (missingRows.length === 0) return toast.success("This title is already fully synced!");

        setShowLog(true);
        setLogs([]);
        addLog(`Starting mass ingestion for ${missingRows.length} years...`, 'info');

        for (const row of missingRows) {
            addLog(`🚀 Processing Title ${row.title} - Year ${row.year}...`, 'info');
            try {
                // Wait for each job to finish before starting the next to avoid overwhelming the server
                const res = await ingestMutation.mutateAsync({
                    titleFilter: row.title,
                    year: row.year,
                    limit: 50000 // Ensure we use the big batch size
                });

                addLog(`✅ Success: ${row.year} - Added ${res.success} sections.`, 'success');
            } catch (err: any) {
                addLog(`❌ Failed: ${row.year} - ${err.message}`, 'error');
            }
        }

        addLog(`🏁 Mass Ingestion Complete! Syncing results...`, 'success');
        gapQuery.refetch();
    };

    if (gapQuery.isLoading) {
        return (
            <div className="p-8 text-center text-muted-foreground animate-pulse">
                <RefreshCcw className="h-8 w-8 animate-spin mx-auto mb-4" />
                Calculating gap analysis across 50 titles and 30 years...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Dialog open={showLog} onOpenChange={setShowLog}>
                <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800 text-zinc-100">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-indigo-500" />
                            Mass Ingestion Log
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Real-time tracking of CFR data ingestion pipeline.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-[400px] w-full rounded-md border border-zinc-800 bg-black/50 p-4 font-mono text-xs">
                        {logs.length === 0 && <p className="text-zinc-500 italic">Waiting for start...</p>}
                        {logs.map((log, i) => (
                            <div key={i} className="mb-2 last:mb-0 flex gap-3">
                                <span className="text-zinc-600 shrink-0">[{log.time}]</span>
                                <span className={cn(
                                    "break-all",
                                    log.type === 'error' ? "text-rose-400" :
                                        log.type === 'success' ? "text-emerald-400" : "text-zinc-300"
                                )}>
                                    {log.message}
                                </span>
                            </div>
                        ))}
                        {/* Auto-scroll anchor */}
                        <div ref={logEndRef} />
                    </ScrollArea>
                    <div className="flex justify-end">
                        <Button variant="secondary" onClick={() => setShowLog(false)}>
                            Close / Run in Background
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-emerald-50 border-emerald-100">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Synced Tracks</p>
                                <h3 className="text-2xl font-bold text-emerald-900">{stats.complete}</h3>
                            </div>
                            <CheckCircle2 className="h-8 w-8 text-emerald-500 opacity-20" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-rose-50 border-rose-100">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Missing Years</p>
                                <h3 className="text-2xl font-bold text-rose-900">{stats.missing}</h3>
                            </div>
                            <AlertTriangle className="h-8 w-8 text-rose-500 opacity-20" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-indigo-50 border-indigo-100">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Titles Tracked</p>
                                <h3 className="text-2xl font-bold text-indigo-900">{summaryList.length}</h3>
                            </div>
                            <BarChart3 className="h-8 w-8 text-indigo-500 opacity-20" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 text-white border-indigo-500/30">
                    <CardContent className="pt-6">
                        <div className="flex flex-col">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em]">Budget Strategy</p>
                                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">LIMIT: $30</span>
                            </div>
                            <h3 className="text-xl font-bold flex items-baseline gap-1">
                                <span className="text-xs text-slate-400 font-normal">$</span>
                                {((stats.total * 1000 * 0.02) / 1000000).toFixed(2)}
                                <span className="text-[10px] text-slate-500 font-medium ml-2">TOTAL VALUE</span>
                            </h3>
                            <div className="mt-2 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-blue-400 transition-all duration-1000"
                                    style={{ width: `${Math.min(100, (stats.complete / (stats.total || 1)) * 100)}%` }}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-amber-50 border-amber-100">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Remaining to Ingest</p>
                                <h3 className="text-xl font-bold text-amber-900 leading-none mt-1">
                                    {(((stats.total - stats.complete) * 1000 * 0.02) / 1000000).toFixed(2)}
                                    <span className="text-xs font-normal ml-1">USD</span>
                                </h3>
                                <div className="mt-2 flex items-center gap-1.5">
                                    <Badge variant="outline" className="bg-white/50 border-amber-200 text-amber-700 text-[10px] font-bold">
                                        AUTO-SKIP DUPLICATES ENABLED
                                    </Badge>
                                </div>
                            </div>
                            <Zap className="h-8 w-8 text-amber-500 opacity-20" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2">Strategic Energy Ops:</p>
                    {[30, 33, 40, 49, 29, 10, 18, 43, 47, 48].map(t => (
                        <Button
                            key={t}
                            variant={filter === String(t) ? "default" : "outline"}
                            size="sm"
                            className={cn(
                                "h-7 text-xs font-bold",
                                t === 30 ? "border-amber-400 text-amber-700 hover:bg-amber-50" : ""
                            )}
                            onClick={() => setFilter(filter === String(t) ? "" : String(t))}
                        >
                            {t === 30 ? "⭐ Title 30" : `Title ${t}`}
                        </Button>
                    ))}
                </div>
                <Badge variant="outline" className="bg-slate-900 text-slate-300 border-slate-800 text-[10px] hidden lg:flex h-7 px-3">
                    DEEPWATER // CRITICAL 🌊
                </Badge>
            </div>

            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="border-b bg-slate-50/50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Zap className="h-5 w-5 text-indigo-500 fill-indigo-500" />
                                Regulatory Matrix
                            </CardTitle>
                            <CardDescription className="max-w-2xl">
                                Monitor and ingest priority CFR titles (like Title 30) into the Vector Store.
                                <span className="block mt-1 text-emerald-600 font-medium">
                                    💡 Select a Priority Title below and hit the <b>Play</b> button to start ingesting (Batch of 10k).
                                </span>
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold"
                                disabled={!filter || ingestMutation.isPending}
                                onClick={() => {
                                    const titleNum = parseInt(filter, 10);
                                    if (isNaN(titleNum)) return toast.error("Enter a valid Title number in search first.");
                                    toast.info(`Triggering bulk ingestion for Title ${titleNum} (50k Batch)...`);
                                    ingestMutation.mutate({ titleFilter: titleNum, limit: 50000 }, {
                                        onSuccess: (res) => {
                                            toast.success(`Ingested ${res.success} sections!`);
                                            gapQuery.refetch();
                                        },
                                        onError: (err) => toast.error(err.message)
                                    });
                                }}
                            >
                                <Play className="h-3.5 w-3.5 mr-2" />
                                Ingest Title (50k Batch)
                            </Button>
                            <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block" />
                            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                                <Button
                                    variant={viewMode === "table" ? "white" as any : "ghost"}
                                    size="sm"
                                    className="h-7 text-xs font-bold shadow-none"
                                    onClick={() => setViewMode("table")}
                                >
                                    Detailed View
                                </Button>
                                <Button
                                    variant={viewMode === "summary" ? "white" as any : "ghost"}
                                    size="sm"
                                    className="h-7 text-xs font-bold shadow-none"
                                    onClick={() => setViewMode("summary")}
                                >
                                    Title Summary
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="flex items-center gap-3 p-4 border-b border-slate-100 bg-white">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search Title Number..."
                                className="w-full pl-9 pr-4 h-9 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                            />
                        </div>
                        <select
                            className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none font-medium"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">Analyze All</option>
                            <option value="missing">Missing Only</option>
                            <option value="partial">Partial Gaps</option>
                            <option value="complete">Fully Synced</option>
                        </select>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 gap-2 font-bold"
                            onClick={() => gapQuery.refetch()}
                        >
                            <RefreshCcw className={cn("h-4 w-4", gapQuery.isRefetching && "animate-spin")} />
                            Sync Result
                        </Button>
                        {filter && !isNaN(parseInt(filter)) && (
                            <Button
                                variant="default"
                                size="sm"
                                className="h-9 gap-2 font-bold bg-indigo-600 hover:bg-indigo-700 text-white ml-2 shadow-sm"
                                onClick={runMassIngestion}
                                disabled={ingestMutation.isPending}
                            >
                                <Zap className="h-4 w-4 fill-white text-white" />
                                Auto-Fill All Missing Years
                            </Button>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        {viewMode === "table" ? (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Title</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Year</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Progress</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Est. Cost</th>
                                        <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredData.map((row: any, i: number) => {
                                        const missing = Math.max(0, row.mysqlCount - row.postgresCount);
                                        // "Operational Tolerance": If > 99.5% complete, treat as fully synced to verify integrity later.
                                        const isEffectivelyComplete = row.percentage > 99.5 || missing < 5;
                                        const displayStatus = isEffectivelyComplete ? "complete" : row.status;
                                        const cost = (missing * 1000 * 0.02) / 1000000;

                                        return (
                                            <tr key={`${row.title}-${row.year}-${i}`} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-4 py-3 text-sm font-bold text-slate-900">Title {row.title}</td>
                                                <td className="px-4 py-3 text-sm text-slate-500 font-medium">{row.year}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex items-center justify-between text-[10px] font-bold mb-0.5">
                                                            <span className="text-slate-400">{row.postgresCount.toLocaleString()} / {row.mysqlCount.toLocaleString()}</span>
                                                            <span className={cn(
                                                                row.percentage >= 100 ? "text-emerald-600" :
                                                                    isEffectivelyComplete ? "text-emerald-600" :
                                                                        row.percentage > 0 ? "text-amber-600" : "text-slate-400"
                                                            )}>{row.percentage.toFixed(1)}%</span>
                                                        </div>
                                                        <Progress value={row.percentage} className={cn("h-1", isEffectivelyComplete ? "bg-emerald-100" : "")} indicatorClassName={isEffectivelyComplete ? "bg-emerald-500" : ""} />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Badge variant="outline" className={cn(
                                                        "text-[10px] font-bold px-2 py-0.5 border-none shadow-none",
                                                        displayStatus === "complete" ? "bg-emerald-50 text-emerald-700" :
                                                            displayStatus === "partial" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"
                                                    )}>
                                                        {displayStatus.toUpperCase()}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className={cn(
                                                        "text-xs font-mono font-bold",
                                                        cost > 0 && !isEffectivelyComplete ? "text-slate-900" : "text-slate-300"
                                                    )}>
                                                        ${isEffectivelyComplete ? "0.00" : cost.toFixed(2)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {displayStatus !== "complete" && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 w-7 p-0 hover:bg-indigo-50 hover:text-indigo-600"
                                                            onClick={() => handleIngest(row.title, row.year)}
                                                            disabled={ingestMutation.isPending}
                                                        >
                                                            <ArrowRight className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    {displayStatus === "complete" && (
                                                        <div className="h-7 w-7 flex items-center justify-center">
                                                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-6">
                                {summaryList.map((title: any) => {
                                    const overallPercentage = title.totalSections > 0 ? Math.round((title.vectorSections / title.totalSections) * 100) : 100;
                                    const missingSections = Math.max(0, title.totalSections - title.vectorSections);
                                    const estimatedCost = (missingSections * 1000 * 0.02) / 1000000;
                                    return (
                                        <Card key={title.title} className="bg-slate-50/50 border-slate-200">
                                            <CardContent className="p-4">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">
                                                            {title.title}
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-bold text-slate-900 tracking-tight">Title {title.title}</h4>
                                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{title.totalYears} Years Detected</p>
                                                        </div>
                                                    </div>
                                                    <Badge className="bg-white text-slate-600 border-slate-200 shadow-sm text-[10px]">
                                                        {title.completeYears}/{title.totalYears} Sync
                                                    </Badge>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                                                        <span>VECTOR COVERAGE</span>
                                                        <span>{overallPercentage}%</span>
                                                    </div>
                                                    <Progress value={overallPercentage} className="h-1.5 bg-slate-200" />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
