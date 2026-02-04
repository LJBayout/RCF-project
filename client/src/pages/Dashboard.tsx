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
  Activity,
  Key,
  TrendingUp,
  Users,
  Copy,
  Plus,
  Eye,
  EyeOff,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { ROUTES } from "@/routes";

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour ago`;
  return `${diffDays} day ago`;
}

function formatResetsIn(): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCHours(24, 0, 0, 0);
  const ms = tomorrow.getTime() - now.getTime();
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

export default function Dashboard() {
  const [showApiKey, setShowApiKey] = useState(false);
  const mockApiKey = "cfr_live_1234567890abcdef";

  const copyApiKey = () => {
    navigator.clipboard.writeText(mockApiKey);
    toast.success("API key copied to clipboard");
  };

  const { data: stats, isLoading: statsLoading } =
    trpc.dashboard.getUsageStats.useQuery();
  const { data: recentRequests = [], isLoading: recentLoading } =
    trpc.dashboard.getRecentUsage.useQuery({ limit: 10 });
  const { data: topEndpoints = [], isLoading: topLoading } =
    trpc.dashboard.getTopEndpoints.useQuery({ limit: 5 });
  const { data: responseTimes = [], isLoading: responseLoading } =
    trpc.dashboard.getResponseTimeAverages.useQuery({ limit: 5 });

  const loading = statsLoading;
  const totalRequests = stats?.totalRequests ?? 0;
  const requestsToday = stats?.requestsToday ?? 0;
  const remainingQuota = stats?.remainingQuota ?? 10_000;
  const plan = stats?.plan ?? "Pro";
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
                Governance
              </Badge>
              <span className="text-[11px] text-muted-foreground font-medium">
                Real-time usage intelligence
              </span>
            </div>
            <h1 className="text-3xl font-semibold">Dashboard</h1>
            <p className="text-muted-foreground max-w-2xl">
              Monitor request volume, quota health, and endpoint performance to
              keep compliance operations predictable and auditable.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href={ROUTES.ragAdmin}>
                <Button variant="outline" size="sm">
                  RAG Ingestion Monitor
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Requests
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "—" : totalRequests.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Today&apos;s Requests
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "—" : requestsToday}
              </div>
              <p className="text-xs text-muted-foreground">
                {loading ? "—" : `${requestsToday} of ${dailyQuota} daily`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Remaining Quota
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "—" : remainingQuota.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Resets in {formatResetsIn()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Current Plan
              </CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{plan}</div>
              <Button variant="link" className="p-0 h-auto text-xs">
                Upgrade Plan
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList data-tour="dashboard-tabs">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="api-keys">API Keys</TabsTrigger>
            <TabsTrigger value="usage" data-tour="usage-tab">
              Usage
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* API Key Card */}
            <Card>
              <CardHeader>
                <CardTitle>Your API Key</CardTitle>
                <CardDescription>
                  Use this key to authenticate your API requests
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
                  Keep your API key secure and never share it publicly. If
                  compromised, regenerate it immediately.
                </p>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Your latest API requests (from api_usage)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentLoading ? (
                  <p className="text-sm text-muted-foreground py-4">Loading…</p>
                ) : recentRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    No API usage recorded yet. Use the REST API with X-API-Key
                    to see activity here.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentRequests.map(request => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between py-3 border-b last:border-0"
                      >
                        <div className="flex items-center gap-4">
                          <Badge
                            variant="outline"
                            className="font-mono text-xs"
                          >
                            {request.method}
                          </Badge>
                          <span className="font-mono text-sm">
                            {request.endpoint}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <Badge
                            variant={
                              request.statusCode === 200
                                ? "secondary"
                                : "destructive"
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

          {/* API Keys Tab */}
          <TabsContent value="api-keys" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Manage API Keys</CardTitle>
                    <CardDescription>
                      Create and manage multiple API keys for different
                      applications
                    </CardDescription>
                  </div>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Key
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Production Key</p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {showApiKey ? mockApiKey : "cfr_live_••••••••••••••••"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created on Jan 15, 2026 • Last used 2 min ago
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
          <TabsContent value="usage" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>API Usage Statistics</CardTitle>
                <CardDescription>
                  Detailed breakdown of your API usage (from api_usage)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Usage Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Daily Quota</span>
                      <span className="text-sm text-muted-foreground">
                        {requestsToday} / {dailyQuota} requests
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

                  {/* Top Endpoints */}
                  <div>
                    <h4 className="font-semibold mb-4">Top Endpoints</h4>
                    {topLoading ? (
                      <p className="text-sm text-muted-foreground">Loading…</p>
                    ) : topEndpoints.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No endpoint usage recorded yet.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {topEndpoints.map(row => (
                          <div
                            key={row.endpoint}
                            className="flex items-center justify-between"
                          >
                            <span className="text-sm font-mono">
                              {row.endpoint}
                            </span>
                            <Badge variant="secondary">
                              {row.count} requests
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Response Times */}
                  <div>
                    <h4 className="font-semibold mb-4">
                      Average Response Times
                    </h4>
                    {responseLoading ? (
                      <p className="text-sm text-muted-foreground">Loading…</p>
                    ) : responseTimes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No response time data yet.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {responseTimes.map(row => (
                          <div
                            key={row.endpoint}
                            className="flex items-center justify-between"
                          >
                            <span className="text-sm font-mono">
                              {row.endpoint}
                            </span>
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
