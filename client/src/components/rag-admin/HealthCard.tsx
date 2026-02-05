"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";

export function HealthCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          System health
        </CardTitle>
        <CardDescription>
          MySQL (CFR data + embeddings) and OpenAI usage.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
            <span className="font-medium">MySQL (cfr_platform)</span>
          </div>
          <Badge
            variant="outline"
            className="text-green-600 border-green-200 bg-green-50"
          >
            Primary DB
          </Badge>
        </div>
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 bg-blue-500 rounded-full" />
            <span className="font-medium">OpenAI Embeddings API</span>
          </div>
          <Badge
            variant="outline"
            className="text-blue-600 border-blue-200 bg-blue-50"
          >
            text-embedding-3-small
          </Badge>
        </div>
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 bg-violet-500 rounded-full" />
            <span className="font-medium">GPT (RAG answers)</span>
          </div>
          <Badge
            variant="outline"
            className="text-violet-600 border-violet-200 bg-violet-50"
          >
            gpt-4o-mini
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
