"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RefreshCw, Play, Info, Loader2, Database, Server } from "lucide-react";

export function EmbeddingControl() {
  const [limit, setLimit] = useState<string>("");
  const [batchSize, setBatchSize] = useState<number>(50);
  const [titleFilter, setTitleFilter] = useState<string>("all");

  const ingestionStatusQuery = trpc.rag.getIngestStatus.useQuery(undefined, {
    refetchInterval: 3000,
  });
  const statsQuery = trpc.rag.getStats.useQuery(undefined, {
    refetchInterval: 10000,
  });
  const ingestMutation = trpc.rag.ingest.useMutation({
    onSuccess: () => {
      ingestionStatusQuery.refetch();
    },
  });

  const status = ingestionStatusQuery.data;
  const stats = statsQuery.data;
  const total = status?.total ?? 0;
  const completed = status?.completed ?? 0;
  const missing = status?.missing ?? 0;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const postgresChunks = stats?.totalChunks ?? 0;

  const handleStart = () => {
    ingestMutation.mutate({
      limit: limit ? parseInt(limit, 10) : undefined,
      batchSize,
      titleFilter: titleFilter === "all" ? undefined : parseInt(titleFilter, 10),
    });
  };

  const isRunning = ingestMutation.isPending;

  return (
    <div className="space-y-6">
      {/* What feeds the RAG */}
      <Alert className="bg-blue-50/80 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">O que alimenta o RAG</AlertTitle>
        <AlertDescription className="text-blue-800 text-sm space-y-2">
          <p>
            O chat <strong>Ask CFR</strong> usa <strong>duas fontes</strong> ao mesmo tempo:
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>
              <strong>Postgres</strong> (tabela <code className="bg-blue-100 px-1 rounded">cfr_chunks</code>) — preenchido pelo <strong>Airflow</strong>. Você não controla daqui; mostra só a quantidade disponível.
            </li>
            <li>
              <strong>MySQL</strong> (coluna <code className="bg-blue-100 px-1 rounded">cfr_sections.embedding</code>) — você controla aqui. Ao clicar em &quot;Start ingestion&quot;, as seções CFR recebem embeddings e passam a entrar na busca do RAG.
            </li>
          </ul>
          <p className="mt-2 text-xs">
            A busca combina os resultados das duas fontes e ordena por relevância.
          </p>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Controle de embeddings (MySQL)</CardTitle>
          <CardDescription>
            Gere embeddings para seções CFR em MySQL (OpenAI → gravado em <code className="bg-muted px-1 rounded">cfr_sections.embedding</code>). Assim você decide qual conteúdo do MySQL entra no RAG.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Two sources summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <Server className="h-8 w-8 text-slate-600" />
              <div>
                <p className="text-sm font-medium text-slate-900">Postgres (Airflow)</p>
                <p className="text-2xl font-bold text-slate-700">{postgresChunks.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">chunks no RAG · sem controle aqui</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <Database className="h-8 w-8 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-emerald-900">MySQL (você controla)</p>
                <p className="text-2xl font-bold text-emerald-700">
                  {completed.toLocaleString()} / {total.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  seções com embedding · {missing.toLocaleString()} faltando
                </p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Seções MySQL com embedding</span>
              <span className="font-medium">
                {completed.toLocaleString()} / {total.toLocaleString()} ({progressPct}%)
              </span>
            </div>
            <Progress value={progressPct} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {ingestionStatusQuery.isLoading
                ? "Carregando…"
                : `${completed.toLocaleString()} com embedding · ${missing.toLocaleString()} faltando`}
            </p>
          </div>

          {/* Form */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="ingest-limit">Limite de seções (opcional)</Label>
            <Input
              id="ingest-limit"
              type="number"
              min={1}
              max={10000}
              placeholder="All"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              disabled={isRunning}
            />
              <p className="text-xs text-muted-foreground">
                Máx. seções nesta execução (ex.: 100 para testar)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ingest-batch">Tamanho do lote</Label>
            <Input
              id="ingest-batch"
              type="number"
              min={1}
              max={100}
              value={batchSize}
              onChange={(e) => setBatchSize(parseInt(e.target.value, 10) || 50)}
              disabled={isRunning}
            />
              <p className="text-xs text-muted-foreground">Seções por lote (padrão 50)</p>
            </div>
            <div className="space-y-2">
              <Label>Filtrar por título CFR</Label>
            <Select
              value={titleFilter}
              onValueChange={setTitleFilter}
              disabled={isRunning}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os títulos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os títulos</SelectItem>
                {Array.from({ length: 50 }, (_, i) => i + 1).map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    Title {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
              <p className="text-xs text-muted-foreground">Ingerir só seções de um título</p>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleStart}
                disabled={isRunning || missing === 0}
                className="w-full sm:w-auto"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Executando…
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Iniciar ingestão (MySQL)
                  </>
                )}
              </Button>
            </div>
          </div>

          {missing === 0 && total > 0 && (
            <Alert className="bg-green-50 border-green-200">
              <Info className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Todas as seções MySQL já têm embedding. O RAG usa Postgres + MySQL.
              </AlertDescription>
            </Alert>
          )}

          {(ingestMutation.data || ingestMutation.isError) && (
            <Alert
              className={
                ingestMutation.isError
                  ? "bg-rose-50 border-rose-200"
                  : "bg-slate-50 border-slate-200"
              }
            >
              <AlertDescription>
                {ingestMutation.isError
                  ? ingestMutation.error.message
                  : ingestMutation.data
                    ? `${ingestMutation.data.message}: ${ingestMutation.data.success} sucesso, ${ingestMutation.data.failed} falha(s).`
                    : null}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                ingestionStatusQuery.refetch();
                statsQuery.refetch();
              }}
              disabled={ingestionStatusQuery.isFetching}
            >
              <RefreshCw
                className={`h-4 w-4 mr-1 ${ingestionStatusQuery.isFetching ? "animate-spin" : ""}`}
              />
              Atualizar status
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
