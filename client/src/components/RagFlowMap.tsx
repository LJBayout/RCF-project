import { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";

export type RagFlowView = "pipeline" | "storage" | "query";

const pipelineNodes: Node[] = [
  {
    id: "xml",
    position: { x: 0, y: 0 },
    data: { label: "XML Archives" },
    type: "default",
  },
  {
    id: "mysql",
    position: { x: 220, y: 0 },
    data: { label: "MySQL (CFR Core)" },
  },
  {
    id: "airflow",
    position: { x: 440, y: 0 },
    data: { label: "Airflow Ingestion" },
  },
  {
    id: "openai",
    position: { x: 660, y: 0 },
    data: { label: "OpenAI Embeddings" },
  },
  {
    id: "postgres",
    position: { x: 880, y: 0 },
    data: { label: "Postgres + pgvector" },
  },
  { id: "rag", position: { x: 1100, y: 0 }, data: { label: "RAG Runtime" } },
  { id: "ui", position: { x: 1320, y: 0 }, data: { label: "UI / API" } },
];

const pipelineEdges: Edge[] = [
  { id: "e-xml-mysql", source: "xml", target: "mysql" },
  { id: "e-mysql-airflow", source: "mysql", target: "airflow" },
  { id: "e-airflow-openai", source: "airflow", target: "openai" },
  { id: "e-openai-postgres", source: "openai", target: "postgres" },
  { id: "e-postgres-rag", source: "postgres", target: "rag" },
  { id: "e-rag-ui", source: "rag", target: "ui" },
];

const storageNodes: Node[] = [
  {
    id: "mysql-titles",
    position: { x: 0, y: 0 },
    data: { label: "cfr_titles" },
  },
  {
    id: "mysql-parts",
    position: { x: 0, y: 140 },
    data: { label: "cfr_parts" },
  },
  {
    id: "mysql-sections",
    position: { x: 0, y: 280 },
    data: { label: "cfr_sections" },
  },
  {
    id: "pg-docs",
    position: { x: 320, y: 70 },
    data: { label: "cfr_documents" },
  },
  {
    id: "pg-chunks",
    position: { x: 320, y: 250 },
    data: { label: "cfr_chunks" },
  },
  {
    id: "vector",
    position: { x: 640, y: 160 },
    data: { label: "pgvector index" },
  },
];

const storageEdges: Edge[] = [
  { id: "e-titles-docs", source: "mysql-titles", target: "pg-docs" },
  { id: "e-parts-docs", source: "mysql-parts", target: "pg-docs" },
  { id: "e-sections-docs", source: "mysql-sections", target: "pg-docs" },
  { id: "e-docs-chunks", source: "pg-docs", target: "pg-chunks" },
  { id: "e-chunks-vector", source: "pg-chunks", target: "vector" },
];

const queryNodes: Node[] = [
  { id: "user", position: { x: 0, y: 160 }, data: { label: "User Query" } },
  { id: "embed", position: { x: 220, y: 160 }, data: { label: "Embed Query" } },
  {
    id: "retrieve",
    position: { x: 440, y: 160 },
    data: { label: "Vector Search" },
  },
  {
    id: "context",
    position: { x: 660, y: 160 },
    data: { label: "Assemble Context" },
  },
  { id: "answer", position: { x: 880, y: 160 }, data: { label: "LLM Answer" } },
  {
    id: "citations",
    position: { x: 1100, y: 160 },
    data: { label: "Citations" },
  },
];

const queryEdges: Edge[] = [
  { id: "e-user-embed", source: "user", target: "embed" },
  { id: "e-embed-retrieve", source: "embed", target: "retrieve" },
  { id: "e-retrieve-context", source: "retrieve", target: "context" },
  { id: "e-context-answer", source: "context", target: "answer" },
  { id: "e-answer-citations", source: "answer", target: "citations" },
];

const viewMap: Record<RagFlowView, { nodes: Node[]; edges: Edge[] }> = {
  pipeline: { nodes: pipelineNodes, edges: pipelineEdges },
  storage: { nodes: storageNodes, edges: storageEdges },
  query: { nodes: queryNodes, edges: queryEdges },
};

export function RagFlowMap({ view }: { view: RagFlowView }) {
  const { nodes, edges } = useMemo(() => viewMap[view], [view]);

  return (
    <div className="h-[380px] w-full rounded-lg border bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
      >
        <Background gap={20} size={1} />
        <MiniMap zoomable pannable />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
