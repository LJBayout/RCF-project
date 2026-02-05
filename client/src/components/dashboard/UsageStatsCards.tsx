"use client";

import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Key, TrendingUp, Users } from "lucide-react";
import { Link } from "wouter";
import { ROUTES } from "@/routes";

function formatResetsIn(): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCHours(24, 0, 0, 0);
  const ms = tomorrow.getTime() - now.getTime();
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

const DAILY_QUOTA = 10_000;

export function UsageStatsCards() {
  const { data: stats, isLoading } = trpc.dashboard.getUsageStats.useQuery();

  const totalRequests = stats?.totalRequests ?? 0;
  const requestsToday = stats?.requestsToday ?? 0;
  const remainingQuota = stats?.remainingQuota ?? DAILY_QUOTA;
  const plan = stats?.plan ?? "Pro";

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de requisições</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {isLoading ? "—" : totalRequests.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">Todo o período</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Requisições hoje</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {isLoading ? "—" : requestsToday.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            {isLoading ? "—" : `${requestsToday} de ${DAILY_QUOTA} diários`}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cota restante</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {isLoading ? "—" : remainingQuota.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            Reseta em {formatResetsIn()}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Plano atual</CardTitle>
          <Key className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{plan}</div>
          <Link href={ROUTES.ragAdmin}>
            <Button variant="link" className="p-0 h-auto text-xs">
              RAG / Embeddings →
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
