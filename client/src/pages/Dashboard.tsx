import { Navbar } from "@/components/Navbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Copy,
  Plus,
  Eye,
  EyeOff,
  Database,
  Sparkles,
  TrendingUp,
  Search,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { ROUTES } from "@/routes";
import { DataAndRAGCard, UsageStatsCards } from "@/components/dashboard";

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffMins < 1) return "Agora";
  if (diffMins < 60) return `${diffMins} min atrás`;
  if (diffHours < 24) return `${diffHours} h atrás`;
  return `${diffDays} dia(s) atrás`;
}

export default function Dashboard() {
  const [showApiKey, setShowApiKey] = useState(false);
  const mockApiKey = "cfr_live_1234567890abcdef";

  const copyApiKey = () => {
    navigator.clipboard.writeText(mockApiKey);
    toast.success("API key copiada");
  };

  const { data: stats } = trpc.dashboard.getUsageStats.useQuery();
  const { data: recentRequests = [], isLoading: recentLoading } =
    trpc.dashboard.getRecentUsage.useQuery({ limit: 10 });
  const { data: topEndpoints = [], isLoading: topLoading } =
    trpc.dashboard.getTopEndpoints.useQuery({ limit: 5 });
  const { data: responseTimes = [], isLoading: responseLoading } =
    trpc.dashboard.getResponseTimeAverages.useQuery({ limit: 5 });

  const requestsToday = stats?.requestsToday ?? 0;
  const dailyQuota = 10_000;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="text-[10px] font-semibold uppercase tracking-wide"
              >
                Governança
              </Badge>
              <span className="text-[11px] text-muted-foreground font-medium">
                Uso da API, dados CFR e RAG em um só lugar
              </span>
            </div>
            <h1 className="text-3xl font-semibold">Dashboard</h1>
            <p className="text-muted-foreground max-w-2xl">
              Monitore requisições, cota, desempenho da API e o que alimenta o RAG
              (Postgres + MySQL). Controle embeddings e cobertura de dados CFR.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href={ROUTES.ragAdmin}>
                <Button variant="outline" size="sm" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Controle RAG / Embeddings
                </Button>
              </Link>
              <Link href={ROUTES.askCFR}>
                <Button variant="outline" size="sm" className="gap-2">
                  <Database className="h-4 w-4" />
                  Ask CFR
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <UsageStatsCards />

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6 mt-8">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto gap-2 p-1.5 bg-slate-100/50 rounded-2xl border border-slate-200/50">
            <TabsTrigger value="overview" className="flex flex-col gap-1 py-3 px-4 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md transition-all">
              <Sparkles className="h-4 w-4 text-blue-500" />
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold">Visão Geral</span>
                <span className="text-[10px] text-slate-500 font-medium">Principais Métricas</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="data-rag" className="flex flex-col gap-1 py-3 px-4 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md transition-all">
              <Database className="h-4 w-4 text-amber-500" />
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold">Dados e RAG</span>
                <span className="text-[10px] text-slate-500 font-medium">Cobertura Global</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="api-keys" className="flex flex-col gap-1 py-3 px-4 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md transition-all">
              <Plus className="h-4 w-4 text-indigo-500" />
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold">API Keys</span>
                <span className="text-[10px] text-slate-500 font-medium">Gestão de Acesso</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="usage" className="flex flex-col gap-1 py-3 px-4 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md transition-all">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold">Uso</span>
                <span className="text-[10px] text-slate-500 font-medium">Cotas & Atividade</span>
              </div>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Sua API Key</CardTitle>
                <CardDescription>
                  Use esta chave para autenticar requisições à API
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted p-3 rounded-lg font-mono text-sm flex items-center justify-between">
                    <span>
                      {showApiKey ? mockApiKey : "••••••••••••••••••••••••"}
                    </span>
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <Button variant="outline" size="icon" onClick={copyApiKey}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Mantenha a API key em segredo. Em caso de vazamento, regenere imediatamente.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Dados e RAG (resumo)</CardTitle>
                  <CardDescription>
                    O RAG é alimentado por Postgres (Airflow) + MySQL (você controla). Aba &quot;Dados e RAG&quot; tem detalhes e link para migração Postgres-only.
                  </CardDescription>
                </div>
                <Link href={ROUTES.ragAdmin}>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    Controle RAG
                  </Button>
                </Link>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Atividade recente</CardTitle>
                <CardDescription>
                  Últimas requisições à API (tabela api_usage)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentLoading ? (
                  <p className="text-sm text-muted-foreground py-4">Carregando…</p>
                ) : recentRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    Nenhum uso registrado ainda. Use a REST API com X-API-Key para ver atividade aqui.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentRequests.map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between py-3 border-b last:border-0"
                      >
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className="font-mono text-xs">
                            {request.method}
                          </Badge>
                          <span className="font-mono text-sm">{request.endpoint}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <Badge
                            variant={
                              request.statusCode === 200 ? "secondary" : "destructive"
                            }
                          >
                            {request.statusCode}
                          </Badge>
                          <span className="text-muted-foreground">
                            {request.responseTime != null
                              ? `${request.responseTime}ms`
                              : "—"}
                          </span>
                          <span className="text-muted-foreground">
                            {formatTimeAgo(request.timestamp)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data & RAG Tab */}
          <TabsContent value="data-rag" className="space-y-6 mt-0">
            <DataAndRAGCard />
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="api-keys" className="space-y-6 mt-0">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Gerenciar API Keys</CardTitle>
                    <CardDescription>
                      Crie e gerencie múltiplas chaves para diferentes aplicações
                    </CardDescription>
                  </div>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova chave
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Chave de produção</p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {showApiKey ? mockApiKey : "cfr_live_••••••••••••••••"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Criada em 15 Jan 2026 · Último uso há 2 min
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={copyApiKey}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Usage Tab */}
          <TabsContent value="usage" className="space-y-6 mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Estatísticas de uso da API</CardTitle>
                <CardDescription>
                  Detalhamento de uso (tabela api_usage)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Cota diária</span>
                      <span className="text-sm text-muted-foreground">
                        {requestsToday} / {dailyQuota} requisições
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{
                          width: `${Math.min(100, (requestsToday / dailyQuota) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-4">Endpoints mais usados</h4>
                    {topLoading ? (
                      <p className="text-sm text-muted-foreground">Carregando…</p>
                    ) : topEndpoints.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nenhum uso de endpoint registrado ainda.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {topEndpoints.map((row) => (
                          <div
                            key={row.endpoint}
                            className="flex items-center justify-between"
                          >
                            <span className="text-sm font-mono">{row.endpoint}</span>
                            <Badge variant="secondary">
                              {row.count} requisições
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-semibold mb-4">Tempo médio de resposta</h4>
                    {responseLoading ? (
                      <p className="text-sm text-muted-foreground">Carregando…</p>
                    ) : responseTimes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nenhum dado de tempo de resposta ainda.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {responseTimes.map((row) => (
                          <div
                            key={row.endpoint}
                            className="flex items-center justify-between"
                          >
                            <span className="text-sm font-mono">{row.endpoint}</span>
                            <Badge variant="secondary">{row.avgMs}ms</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
