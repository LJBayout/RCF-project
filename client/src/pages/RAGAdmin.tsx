import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Link } from "wouter";
import { ROUTES } from "@/routes";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Info, Layers, Map, Activity, Sparkles } from "lucide-react";
import {
  EmbeddingControl,
  DataCoverageCard,
  StatsCards,
  RAGMapCard,
  HealthCard,
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
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto gap-1 p-1">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="embeddings" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Embeddings</span>
            </TabsTrigger>
            <TabsTrigger value="coverage" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Data coverage</span>
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2">
              <Map className="h-4 w-4" />
              <span className="hidden sm:inline">Map</span>
            </TabsTrigger>
            <TabsTrigger value="health" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Health</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-0">
            <Alert className="bg-slate-50 border-slate-200">
              <Info className="h-4 w-4 text-slate-600" />
              <AlertTitle className="text-slate-900">O que alimenta o RAG</AlertTitle>
              <AlertDescription className="text-slate-700 text-sm space-y-2">
                <p>O chat <strong>Ask CFR</strong> usa <strong>duas fontes</strong> ao mesmo tempo:</p>
                <ul className="list-disc list-inside ml-2">
                  <li><strong>Postgres</strong> (<code className="bg-slate-200 px-1 rounded">cfr_chunks</code>) — preenchido pelo Airflow.</li>
                  <li><strong>MySQL</strong> (<code className="bg-slate-200 px-1 rounded">cfr_sections.embedding</code>) — você controla na aba <strong>Embeddings</strong>.</li>
                </ul>
                <p>Na aba <strong>Embeddings</strong> você escolhe limite, lote e título CFR para gerar embeddings no MySQL; assim você controla qual conteúdo entra no RAG.</p>
              </AlertDescription>
            </Alert>
            <StatsCards />
          </TabsContent>

          <TabsContent value="embeddings" className="space-y-6 mt-0">
            <EmbeddingControl />
          </TabsContent>

          <TabsContent value="coverage" className="space-y-6 mt-0">
            <DataCoverageCard />
          </TabsContent>

          <TabsContent value="map" className="space-y-6 mt-0">
            <RAGMapCard />
          </TabsContent>

          <TabsContent value="health" className="space-y-6 mt-0">
            <HealthCard />
            <Alert className="bg-amber-50 border-amber-200">
              <Info className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-900">Architecture note</AlertTitle>
              <AlertDescription className="text-amber-800">
                CFR data and embeddings live in <strong>MySQL</strong> (
                cfr_titles, cfr_parts, cfr_sections). You can run embedding
                ingestion from the <strong>Embeddings</strong> tab. Airflow is
                optional for XML → MySQL ingest.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default RAGAdmin;
