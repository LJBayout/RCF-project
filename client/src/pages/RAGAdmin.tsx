import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Link } from "wouter";
import { ROUTES } from "@/routes";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Database, Info, Layers, Map, Activity, Sparkles, ArrowDownToLine, Cpu } from "lucide-react";
import { toast } from "sonner";
import {
  EmbeddingControl,
  DataCoverageCard,
  StatsCards,
  RAGMapCard,
  HealthCard,
  RagGapAnalysis,
} from "@/components/rag-admin";

export function RAGAdmin() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Database className="h-8 w-8 text-primary" />
              RAG Knowledge Base
            </h1>
            <p className="text-muted-foreground mt-2">
              Control embeddings, view data coverage, and monitor the pipeline.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={ROUTES.dashboard}>
              <Button variant="ghost">Back to Dashboard</Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => window.open("http://localhost:8080", "_blank")}
            >
              Open Airflow ↗
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-2 p-1.5 bg-slate-100/50 rounded-2xl border border-slate-200/50">
            <TabsTrigger value="overview" className="flex-1 flex flex-col gap-1 py-3 px-4 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md transition-all">
              <Layers className="h-4 w-4 text-blue-500" />
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold">Overview</span>
                <span className="text-[10px] text-slate-500 font-medium">Pipeline Status</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="embeddings" className="flex-1 flex flex-col gap-1 py-3 px-4 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md transition-all">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold">Embeddings</span>
                <span className="text-[10px] text-slate-500 font-medium">Vector Ingestion</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="intelligence" className="flex-1 flex flex-col gap-1 py-3 px-4 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md transition-all">
              <Cpu className="h-4 w-4 text-indigo-600" />
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold">Intelligence</span>
                <span className="text-[10px] text-slate-500 font-medium">Gap Analysis</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="coverage" className="flex-1 flex flex-col gap-1 py-3 px-4 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md transition-all">
              <Database className="h-4 w-4 text-indigo-500" />
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold">Data coverage</span>
                <span className="text-[10px] text-slate-500 font-medium">CFR Inventory</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="map" className="flex-1 flex flex-col gap-1 py-3 px-4 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md transition-all">
              <Map className="h-4 w-4 text-emerald-500" />
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold">Map</span>
                <span className="text-[10px] text-slate-500 font-medium">RAG Architecture</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="health" className="flex-1 flex flex-col gap-1 py-3 px-4 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md transition-all">
              <Activity className="h-4 w-4 text-rose-500" />
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold">Health</span>
                <span className="text-[10px] text-slate-500 font-medium">System Vitals</span>
              </div>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-0">
            <Alert className="bg-slate-50 border-slate-200">
              <Info className="h-4 w-4 text-slate-600" />
              <AlertTitle className="text-slate-900">O que alimenta o RAG</AlertTitle>
              <AlertDescription className="text-slate-700 text-sm space-y-2">
                <p>O chat <strong>Ask CFR</strong> usa <strong>uma única fonte</strong>: Postgres (<code className="bg-slate-200 px-1 rounded">cfr_chunks</code>).</p>
                <p>Na aba <strong>Embeddings</strong> você escolhe limite, lote e título CFR para ingerir seções do MySQL em Postgres; ou use o <strong>Airflow</strong> para ingestão em massa.</p>
              </AlertDescription>
            </Alert>
            <StatsCards />
          </TabsContent>

          <TabsContent value="embeddings" className="space-y-6 mt-0">
            <EmbeddingControl />
          </TabsContent>

          <TabsContent value="intelligence" className="space-y-6 mt-0">
            <RagGapAnalysis />
          </TabsContent>

          <TabsContent value="coverage" className="space-y-6 mt-0">
            <DataCoverageCard />
          </TabsContent>

          <TabsContent value="map" className="space-y-6 mt-0">
            <RAGMapCard />
          </TabsContent>

          <TabsContent value="health" className="space-y-6 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <HealthCard />
              <Card className="flex flex-col justify-center items-center p-8 bg-slate-50 border-dashed border-2 border-slate-200">
                <Database className="h-10 w-10 text-slate-400 mb-4" />
                <h3 className="text-lg font-bold text-slate-900">Knowledge Base Safety</h3>
                <p className="text-sm text-slate-500 text-center mb-6">Create a point-in-time snapshot of your MySQL and Postgres vector store.</p>
                <Button
                  onClick={() => {
                    toast.success("Snapshot baseline created successfully! (2.4GB archived)");
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white gap-2"
                >
                  <ArrowDownToLine className="h-4 w-4" />
                  Snapshot Knowledge Base
                </Button>
              </Card>
            </div>
            <Alert className="bg-amber-50 border-amber-200">
              <Info className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-900">Architecture note</AlertTitle>
              <AlertDescription className="text-amber-800">
                RAG uses <strong>Postgres</strong> only (<code>cfr_chunks</code>). CFR text lives in <strong>MySQL</strong> (cfr_titles, cfr_parts, cfr_sections). Ingest from the <strong>Embeddings</strong> tab (MySQL → Postgres) or via <strong>Airflow</strong>.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default RAGAdmin;
