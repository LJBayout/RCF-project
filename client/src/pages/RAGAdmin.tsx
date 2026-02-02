import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Database, RefreshCw, CheckCircle, AlertCircle, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RAGAdmin() {
    // Get real-time stats from Postgres
    const statsQuery = trpc.rag.getStats.useQuery(undefined, {
        refetchInterval: 3000, // Refresh every 3 seconds for live dashboard feel
    });

    const stats = statsQuery.data;

    return (
        <div className="container max-w-4xl mx-auto py-8 px-4">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Database className="h-8 w-8 text-primary" />
                        RAG Knowledge Base
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Vector Database Status (PostgreSQL + pgvector)
                    </p>
                </div>
                <Button variant="outline" onClick={() => window.open('http://localhost:8080', '_blank')}>
                    Open Airflow Pipeline ↗
                </Button>
            </div>

            {/* Live Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                        <CardDescription>Total Vetores (Chunks)</CardDescription>
                        <CardTitle className="text-4xl text-blue-700">
                            {statsQuery.isLoading ? <RefreshCw className="animate-spin" /> : stats?.totalChunks.toLocaleString()}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">Segmentos de texto pesquisáveis</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-2">
                        <CardDescription>Documentos Indexados</CardDescription>
                        <CardTitle className="text-4xl text-green-700">
                            {statsQuery.isLoading ? "-" : stats?.totalDocuments.toLocaleString()}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">Seções unificadas do CFR</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                    <CardHeader className="pb-2">
                        <CardDescription>Última Ingestão</CardDescription>
                        <CardTitle className="text-xl text-purple-700 truncate">
                            {statsQuery.isLoading ? "-" : stats?.lastIngested ? new Date(stats.lastIngested).toLocaleTimeString() : "N/A"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">
                            {stats?.lastIngested ? new Date(stats.lastIngested).toLocaleDateString() : ""}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Data Coverage Section */}
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-primary" />
                        Available Data Coverage
                    </CardTitle>
                    <CardDescription>
                        CFR Titles and historical years currently indexed in the vector database
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Timeline */}
                        <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-3">Historical Timeline</h3>
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-secondary rounded-lg">
                                    <span className="text-2xl font-bold">
                                        {stats?.yearRange ? `${stats.yearRange.min} — ${stats.yearRange.max}` : "N/A"}
                                    </span>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                    Full historical depth available for retrieval
                                </span>
                            </div>
                        </div>

                        {/* Titles */}
                        <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-3">Title Distribution (Volume)</h3>
                            <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                                {stats?.titleDistribution && stats.titleDistribution.length > 0 ? (
                                    stats.titleDistribution.map((item: { title: number; count: number }) => {
                                        const percentage = stats.totalDocuments > 0
                                            ? Math.round((item.count / stats.totalDocuments) * 100)
                                            : 0;

                                        return (
                                            <div key={item.title} className="space-y-1">
                                                <div className="flex justify-between text-sm">
                                                    <span className="font-medium">Title {item.title}</span>
                                                    <span className="text-muted-foreground">
                                                        {item.count.toLocaleString()} docs ({percentage}%)
                                                    </span>
                                                </div>
                                                <Progress value={percentage} className="h-2" />
                                            </div>
                                        );
                                    })
                                ) : (
                                    <span className="text-sm text-muted-foreground italic">No titles indexed yet</span>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Connection Status */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        System Health
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="font-medium">Postgres Vector Store</span>
                        </div>
                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Operational</Badge>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
                            <span className="font-medium">OpenAI Embeddings API</span>
                        </div>
                        <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Connected (text-embedding-3-small)</Badge>
                    </div>
                </CardContent>
            </Card>

            <Alert className="bg-amber-50 border-amber-200">
                <Info className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-900">Architecture Note</AlertTitle>
                <AlertDescription className="text-amber-800">
                    Data ingestion is now managed by <strong>Apache Airflow</strong>.
                    To import new titles or re-run historical data, please use the Airflow control panel.
                </AlertDescription>
            </Alert>
        </div>
    );
}

export default RAGAdmin;
