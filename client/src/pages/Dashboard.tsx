import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Key, TrendingUp, Users, Copy, Plus, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Dashboard() {
  const [showApiKey, setShowApiKey] = useState(false);
  const mockApiKey = "cfr_live_1234567890abcdef";

  const copyApiKey = () => {
    navigator.clipboard.writeText(mockApiKey);
    toast.success("API key copied to clipboard");
  };

  // Mock data
  const stats = {
    totalRequests: 1247,
    requestsToday: 89,
    remainingQuota: 9911,
    plan: "Pro"
  };

  const recentRequests = [
    { id: 1, endpoint: "/api/search/fulltext", method: "GET", status: 200, time: "2ms", timestamp: "2 min ago" },
    { id: 2, endpoint: "/api/title/19", method: "GET", status: 200, time: "1ms", timestamp: "5 min ago" },
    { id: 3, endpoint: "/api/section/123", method: "GET", status: 200, time: "3ms", timestamp: "12 min ago" },
    { id: 4, endpoint: "/api/search/fulltext", method: "GET", status: 200, time: "2ms", timestamp: "18 min ago" },
    { id: 5, endpoint: "/api/title/21", method: "GET", status: 200, time: "1ms", timestamp: "25 min ago" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your API usage and manage your account
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRequests.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Requests</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.requestsToday}</div>
              <p className="text-xs text-muted-foreground">+12% from yesterday</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Remaining Quota</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.remainingQuota.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Resets in 23h 15m</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.plan}</div>
              <Button variant="link" className="p-0 h-auto text-xs">
                Upgrade Plan
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="api-keys">API Keys</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
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
                    <span>{showApiKey ? mockApiKey : "••••••••••••••••••••••••"}</span>
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button variant="outline" size="icon" onClick={copyApiKey}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Keep your API key secure and never share it publicly. If compromised, regenerate it immediately.
                </p>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your latest API requests</CardDescription>
              </CardHeader>
              <CardContent>
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
                        <Badge variant={request.status === 200 ? "secondary" : "destructive"}>
                          {request.status}
                        </Badge>
                        <span className="text-muted-foreground">{request.time}</span>
                        <span className="text-muted-foreground">{request.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
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
                      Create and manage multiple API keys for different applications
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
                      <Button variant="outline" size="sm" onClick={() => setShowApiKey(!showApiKey)}>
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                  Detailed breakdown of your API usage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Usage Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Daily Quota</span>
                      <span className="text-sm text-muted-foreground">
                        {stats.requestsToday} / 10,000 requests
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${(stats.requestsToday / 10000) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Top Endpoints */}
                  <div>
                    <h4 className="font-semibold mb-4">Top Endpoints</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-mono">/api/search/fulltext</span>
                        <Badge variant="secondary">542 requests</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-mono">/api/title/:id</span>
                        <Badge variant="secondary">389 requests</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-mono">/api/section/:id</span>
                        <Badge variant="secondary">316 requests</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Response Times */}
                  <div>
                    <h4 className="font-semibold mb-4">Average Response Times</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Search Endpoints</span>
                        <Badge variant="secondary">2.3ms</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Title Endpoints</span>
                        <Badge variant="secondary">1.8ms</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Section Endpoints</span>
                        <Badge variant="secondary">2.1ms</Badge>
                      </div>
                    </div>
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
