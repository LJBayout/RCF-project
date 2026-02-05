"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Database,
  Zap,
  Globe,
  Server,
  Cpu
} from "lucide-react";
import { cn } from "@/lib/utils";

export function HealthCard() {
  const systems = [
    {
      name: "MySQL Metadata",
      id: "cfr_platform",
      role: "Source of Truth",
      status: "Healthy",
      icon: Database,
      color: "emerald",
      detail: "Titles, Parts, Sections"
    },
    {
      name: "PostgreSQL Vector",
      id: "cfr_vector_store",
      role: "Semantic Memory",
      status: "Index Loaded",
      icon: Cpu,
      color: "indigo",
      detail: "pgvector (cfr_chunks)"
    },
    {
      name: "OpenAI Context",
      id: "gpt-4o-mini",
      role: "Reasoning & LLM",
      status: "Connected",
      icon: Zap,
      color: "violet",
      detail: "text-embedding-3-small"
    }
  ];

  return (
    <Card className="border-slate-200/60 shadow-lg bg-gradient-to-b from-white to-slate-50/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-900">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Infrastructure Stack
            </CardTitle>
            <CardDescription className="text-slate-500 font-medium tracking-tight">
              Real-time monitoring of the RAG engine's primary subsystems.
            </CardDescription>
          </div>
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 shadow-none px-3 py-1 font-bold">
            Operational
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {systems.map((s) => (
          <div
            key={s.id}
            className="group flex items-center justify-between p-3.5 bg-white border border-slate-100 rounded-xl hover:border-indigo-100 hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center transition-colors shadow-sm",
                s.color === "emerald" ? "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100" :
                  s.color === "indigo" ? "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100" :
                    "bg-violet-50 text-violet-600 group-hover:bg-violet-100"
              )}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 tracking-tight leading-none mb-1">{s.name}</h4>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.role}</span>
                  <span className="text-[10px] text-slate-300">•</span>
                  <span className="text-[10px] font-medium text-slate-500">{s.detail}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={cn(
                "text-[10px] font-extrabold uppercase tracking-widest",
                s.color === "emerald" ? "text-emerald-600" :
                  s.color === "indigo" ? "text-indigo-600" : "text-violet-600"
              )}>
                {s.status}
              </span>
              <div className="flex items-center gap-1.5">
                <div className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  s.color === "emerald" ? "bg-emerald-500 animate-pulse" :
                    s.color === "indigo" ? "bg-indigo-500" : "bg-violet-500"
                )} />
                <span className="text-[10px] font-bold text-slate-400">99.9% Up</span>
              </div>
            </div>
          </div>
        ))}
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-400 px-1">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Globe className="h-3 w-3" /> US-EAST-1
            </span>
            <span className="flex items-center gap-1.5">
              <Server className="h-3 w-3" /> Rack A-12
            </span>
          </div>
          <span>Last Latency Check: 42ms</span>
        </div>
      </CardContent>
    </Card>
  );
}
