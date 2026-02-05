"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RagFlowMap, type RagFlowView } from "@/components/RagFlowMap";

export function RAGMapCard() {
  const [view, setView] = useState<RagFlowView>("pipeline");

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>RAG map</CardTitle>
          <CardDescription>
            Pipeline, storage, and query flow.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {(["pipeline", "storage", "query"] as const).map((v) => (
            <Button
              key={v}
              variant={view === v ? "default" : "outline"}
              size="sm"
              onClick={() => setView(v)}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <RagFlowMap view={view} />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-secondary/40 p-4">
            <h4 className="text-sm font-semibold">Ingest</h4>
            <p className="mt-2 text-sm text-muted-foreground">
              CFR sections are embedded and stored (MySQL or Postgres). Each
              section becomes a searchable vector.
            </p>
          </div>
          <div className="rounded-lg border bg-secondary/40 p-4">
            <h4 className="text-sm font-semibold">Retrieve</h4>
            <p className="mt-2 text-sm text-muted-foreground">
              The user query is embedded and matched against vectors; the best
              chunks are assembled into context.
            </p>
          </div>
          <div className="rounded-lg border bg-secondary/40 p-4">
            <h4 className="text-sm font-semibold">Answer</h4>
            <p className="mt-2 text-sm text-muted-foreground">
              The model responds using retrieved CFR passages and returns
              citations.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
