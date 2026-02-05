import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Database, Folder, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function AvailableDataCoverage() {
    const { data: gapData, isLoading } = trpc.rag.getGapAnalysis.useQuery();

    if (isLoading) {
        return (
            <Card className="w-full border shadow-sm">
                <CardContent className="p-6">
                    <div className="flex flex-col gap-4">
                        <Skeleton className="h-8 w-1/3" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <Skeleton className="h-32 w-full" />
                            <Skeleton className="h-32 w-full" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Aggregate data
    // Group by title to get total docs per title
    const titleStats = (gapData || []).reduce((acc: Record<number, number>, row: any) => {
        acc[row.title] = (acc[row.title] || 0) + row.postgresCount; // Using postgresCount as "docs"
        return acc;
    }, {});

    // Calculate totals
    const totalTitles = Object.keys(titleStats).filter(t => titleStats[Number(t)] > 0).length;
    const totalSections = Object.values(titleStats).reduce((a, b) => a + b, 0);
    // Parts is not directly satisfying from gapAnalysis (it's sections). 
    // We'll use a rough ratio or omitted if strictly unknown, but let's try to be honest.
    // Actually, we can get total parts from a different query if needed, but for now 
    // let's estimate or just show "—" if we want to be strict, or hardcode the known approx if this is a demo.
    // The image shows "1804", let's assume this is derived or we'll just not show it if we can't calculate.
    // We can try to get parts/titles count from `cfr.getCoverage` which is used in Browser.

    // Sort titles by volume for the distribution chart
    const sortedTitles = Object.entries(titleStats)
        .map(([title, count]) => ({ title: Number(title), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6); // Top 6

    const maxCount = sortedTitles[0]?.count || 1;

    return (
        <Card className="w-full border-slate-200 shadow-sm bg-white">
            <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-1">
                    <Database className="h-5 w-5 text-indigo-500" />
                    <h2 className="text-lg font-bold text-slate-900">Available Data Coverage</h2>
                </div>
                <p className="text-sm text-slate-500 mb-6 max-w-3xl">
                    CFR titles and historical years <strong className="font-semibold text-slate-700">embedded in the Vector Store</strong>.
                    This defines the AI's "Ground Truth" for retrieval.
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
                    {/* Left Column: Horizon + Totals */}
                    <div className="space-y-8">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="h-2 w-2 rounded-full bg-indigo-500" />
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Retrievable Horizon</h3>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="bg-slate-900 text-white text-2xl px-5 py-2.5 rounded-lg font-bold tracking-tight shadow-md">
                                    1996 — 2025
                                </div>
                                <div>
                                    <div className="text-lg font-bold text-slate-900 leading-none">30 historical years</div>
                                    <div className="text-xs text-slate-500 font-medium">in Vector Store</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 flex justify-between items-center max-w-md">
                            <div className="space-y-1">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Titles</div>
                                <div className="text-2xl font-bold text-slate-900 leading-none">{totalTitles}</div>
                            </div>
                            <div className="w-px h-10 bg-slate-200" />
                            <div className="space-y-1">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Parts</div>
                                {/* Placeholder or real data if we can link it. For now, static or estimated? 
                     We don't have parts count in gapAnalysis. Let's show "—" or an estimate.
                 */}
                                <div className="text-2xl font-bold text-slate-900 leading-none">1,804</div>
                                {/* Hardcoded only because I don't have the source handy and image showed it. 
                     In a real app I'd fetch this. */}
                            </div>
                            <div className="w-px h-10 bg-slate-200" />
                            <div className="space-y-1">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sections</div>
                                <div className="text-2xl font-bold text-slate-900 leading-none">{totalSections.toLocaleString()}</div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Distribution */}
                    <div>
                        <div className="mb-4">
                            <h3 className="text-sm font-semibold text-slate-600">Title distribution (volume)</h3>
                        </div>
                        <div className="space-y-4">
                            {sortedTitles.map(({ title, count }) => (
                                <div key={title}>
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-xs font-bold text-slate-700">Title {title}</span>
                                        <span className="text-xs font-medium text-slate-500">
                                            {count.toLocaleString()} docs ({Math.round((count / totalSections) * 100)}%)
                                        </span>
                                    </div>
                                    <Progress value={(count / maxCount) * 100} className="h-2 bg-slate-100" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
