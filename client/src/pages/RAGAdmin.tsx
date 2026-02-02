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
    const [limit, setLimit] = useState<number>(100);
    const [batchSize, setBatchSize] = useState<number>(50);

    // Get current status
    const statusQuery = trpc.rag.getIngestStatus.useQuery(undefined, {
        refetchInterval: 5000, // Refresh every 5 seconds during ingestion
    });

    // Ingest mutation
    const ingestMutation = trpc.rag.ingest.useMutation({
        onSuccess: () => {
            statusQuery.refetch();
        },
    });

    const handleStartIngest = () => {
        ingestMutation.mutate({ limit, batchSize });
    };

    const status = statusQuery.data;
    const isIngesting = ingestMutation.isPending;

    return (
        <div className="container max-w-4xl mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Database className="h-8 w-8 text-primary" />
                    RAG System Administration
                </h1>
                <p className="text-muted-foreground mt-2">
                    Manage embedding generation for the Compliance Intelligence chatbot
                </p>
            </div>

            {/* Status Card */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Info className="h-5 w-5" />
                        Embedding Status
                    </CardTitle>
                    <CardDescription>
                        Current progress of CFR section embeddings
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {statusQuery.isLoading ? (
                        <div className="text-center py-8">
                            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
                            <p className="text-sm text-muted-foreground mt-2">Loading status...</p>
                        </div>
                    ) : status ? (
                        <>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Progress</span>
                                    <span className="text-sm text-muted-foreground">
                                        {status.completed.toLocaleString()} / {status.total.toLocaleString()} sections
                                    </span>
                                </div>
                                <Progress value={status.progress} className="h-2" />
                                <p className="text-xs text-muted-foreground text-right">
                                    {status.progress.toFixed(1)}% complete
                                </p>
                            </div>

                            <div className="grid grid-cols-3 gap-4 pt-2">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-green-600">{status.completed.toLocaleString()}</p>
                                    <p className="text-xs text-muted-foreground">Completed</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-orange-600">{status.missing.toLocaleString()}</p>
                                    <p className="text-xs text-muted-foreground">Remaining</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-blue-600">{status.total.toLocaleString()}</p>
                                    <p className="text-xs text-muted-foreground">Total</p>
                                </div>
                            </div>

                            {status.progress === 100 && (
                                <Alert className="bg-green-50 border-green-200">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    <AlertTitle className="text-green-900">All embeddings generated!</AlertTitle>
                                    <AlertDescription className="text-green-700">
                                        The RAG system is ready to answer questions about all CFR sections.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </>
                    ) : null}
                </CardContent>
            </Card>

            {/* Ingestion Controls */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <RefreshCw className="h-5 w-5" />
                        Start Embedding Generation
                    </CardTitle>
                    <CardDescription>
                        Generate embeddings for CFR sections that don't have them yet
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Important Information</AlertTitle>
                        <AlertDescription className="text-sm space-y-2">
                            <p>
                                • This process uses the OpenAI API and will incur costs (~$0.02 per 1000 sections)
                            </p>
                            <p>
                                • Processing is rate-limited to avoid API throttling (~600 sections/min)
                            </p>
                            <p>
                                • You can start with a small batch to test before processing all sections
                            </p>
                        </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="limit">Section Limit</Label>
                            <Input
                                id="limit"
                                type="number"
                                min={1}
                                max={10000}
                                value={limit}
                                onChange={(e) => setLimit(Number(e.target.value))}
                                disabled={isIngesting}
                            />
                            <p className="text-xs text-muted-foreground">
                                Maximum sections to process (leave blank for all)
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="batchSize">Batch Size</Label>
                            <Input
                                id="batchSize"
                                type="number"
                                min={1}
                                max={100}
                                value={batchSize}
                                onChange={(e) => setBatchSize(Number(e.target.value))}
                                disabled={isIngesting}
                            />
                            <p className="text-xs text-muted-foreground">
                                Sections per batch (recommended: 50)
                            </p>
                        </div>
                    </div>

                    <Button
                        onClick={handleStartIngest}
                        disabled={isIngesting || (status?.missing === 0)}
                        className="w-full"
                        size="lg"
                    >
                        {isIngesting ? (
                            <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Generating Embeddings...
                            </>
                        ) : (
                            <>
                                <Database className="h-4 w-4 mr-2" />
                                Start Ingestion
                            </>
                        )}
                    </Button>

                    {ingestMutation.data && (
                        <Alert className="bg-blue-50 border-blue-200">
                            <CheckCircle className="h-4 w-4 text-blue-600" />
                            <AlertTitle className="text-blue-900">Ingestion Complete</AlertTitle>
                            <AlertDescription className="text-blue-700 space-y-1">
                                <p><strong>Total:</strong> {ingestMutation.data.total} sections</p>
                                <p><strong>Success:</strong> {ingestMutation.data.success}</p>
                                <p><strong>Failed:</strong> {ingestMutation.data.failed}</p>
                            </AlertDescription>
                        </Alert>
                    )}

                    {ingestMutation.error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{ingestMutation.error.message}</AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>How It Works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                    <div>
                        <h4 className="font-semibold mb-1">1. Embedding Generation</h4>
                        <p className="text-muted-foreground">
                            Each CFR section is converted into a 1536-dimensional vector using OpenAI's
                            text-embedding-3-small model.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-1">2. Semantic Search</h4>
                        <p className="text-muted-foreground">
                            When users ask questions, their query is embedded and matched against stored
                            embeddings using cosine similarity.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-1">3. Answer Generation</h4>
                        <p className="text-muted-foreground">
                            The most relevant sections are sent to GPT-4 to generate accurate, cited
                            answers about CFR compliance.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
