"use client";

import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { ROUTES } from "@/routes";
import {
  Database,
  Server,
  Info,
  Sparkles,
  FileText,
  RefreshCw,
} from "lucide-react";

export function DataAndRAGCard() {
  const coverageQuery = trpc.cfr.getCoverage.useQuery(undefined, {
    refetchInterval: 60000,
  });
  const ingestStatusQuery = trpc.rag.getIngestStatus.useQuery(undefined, {
    refetchInterval: 5000,
  });
  const statsQuery = trpc.rag.getStats.useQuery(undefined, {
    refetchInterval: 10000,
  });

  const coverage = coverageQuery.data;
  const ingestion = ingestStatusQuery.data;
  const stats = statsQuery.data;
  const postgresChunks = stats?.totalChunks ?? 0;
  const mysqlTotal = ingestion?.total ?? 0;
  const mysqlWithEmbedding = ingestion?.completed ?? 0;
  const mysqlMissing = ingestion?.missing ?? 0;
  const embedPct =
    mysqlTotal > 0 ? Math.round((mysqlWithEmbedding / mysqlTotal) * 100) : 0;
  const years = coverage?.years ?? [];
  const yearMin = coverage?.yearMin ?? null;
  const yearMax = coverage?.yearMax ?? null;

  return (
    <div className="space-y-6">
      <Alert className="bg-blue-50/80 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">O que alimenta o RAG</AlertTitle>
        <AlertDescription className="text-blue-800 text-sm space-y-2">
          <p>
            O chat <strong>Ask CFR</strong> usa <strong>duas fontes</strong> ao mesmo tempo:
          </p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li>
              <strong>Postgres</strong> (<code className="bg-blue-100 px-1 rounded">cfr_chunks</code>) — preenchido pelo Airflow. Quantidade abaixo.
            </li>
            <li>
              <strong>MySQL</strong> (<code className="bg-blue-100 px-1 rounded">cfr_sections.embedding</code>) — você controla na página <strong>RAG Ingestion</strong> (limite, lote, título).
            </li>
          </ul>
          <p className="mt-2 text-xs">
            A busca combina os resultados das duas fontes. No futuro é possível migrar tudo para Postgres (ver doc de migração).
          </p>
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-slate-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Server className="h-4 w-4 text-slate-600" />
              Postgres (Airflow)
            </CardTitle>
            <CardDescription className="text-xs">
              Vetores em <code className="bg-muted px-1 rounded">cfr_chunks</code> · sem controle aqui
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-700">
              {statsQuery.isLoading ? "—" : postgresChunks.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">chunks no RAG</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4 text-emerald-600" />
              MySQL (você controla)
            </CardTitle>
            <CardDescription className="text-xs">
              Seções com embedding em <code className="bg-muted px-1 rounded">cfr_sections</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">
              {ingestStatusQuery.isLoading
                ? "—"
                : `${mysqlWithEmbedding.toLocaleString()} / ${mysqlTotal.toLocaleString()}`}
            </div>
            <Progress
              value={embedPct}
              className="h-2 mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {mysqlWithEmbedding.toLocaleString()} com embedding · {mysqlMissing.toLocaleString()} faltando
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Cobertura de dados CFR
          </CardTitle>
          <CardDescription className="text-xs">
            Títulos e anos disponíveis no banco principal (MySQL)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {coverage ? (
            <>
              <div className="flex flex-wrap gap-4 text-sm">
                <span>
                  <strong>Anos:</strong>{" "}
                  {yearMin != null && yearMax != null
                    ? `${yearMin} — ${yearMax}`
                    : "—"}{" "}
                  ({years.length} ano(s))
                </span>
                <span>
                  <strong>Títulos:</strong> {coverage.titlesCount}
                </span>
                <span>
                  <strong>Partes:</strong> {coverage.partsCount.toLocaleString()}
                </span>
                <span>
                  <strong>Seções:</strong> {coverage.sectionsCount.toLocaleString()}
                </span>
              </div>
            </>
          ) : coverageQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : (
            <p className="text-sm text-muted-foreground">Sem dados de cobertura.</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-50/80 border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Migração: tudo em Postgres</CardTitle>
          <CardDescription className="text-xs">
            Hoje usamos MySQL + Postgres. É possível unificar em um único banco (Postgres) para menos serviços e RAG com uma só fonte.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            O plano está em <code className="bg-slate-200 px-1 rounded">docs/POSTGRES_ONLY_MIGRATION.md</code> (fases: schema Postgres → app → RAG → Airflow → docker).
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href={ROUTES.ragAdmin}>
              <Button variant="default" size="sm" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Controle RAG / Embeddings
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                coverageQuery.refetch();
                ingestStatusQuery.refetch();
                statsQuery.refetch();
              }}
              disabled={
                coverageQuery.isFetching ||
                ingestStatusQuery.isFetching ||
                statsQuery.isFetching
              }
            >
              <RefreshCw
                className={`h-4 w-4 ${statsQuery.isFetching ? "animate-spin" : ""}`}
              />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
