import { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import { Database, Zap, Search, FileText, Cpu, Layout, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

// Custom Node Component
const WorkflowNode = ({ data }: any) => {
  const Icon = data.icon || Database;
  return (
    <div className={cn(
      "px-4 py-3 rounded-xl border bg-white/80 backdrop-blur-sm shadow-lg min-w-[180px] transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
      data.active ? "border-blue-500 ring-2 ring-blue-500/20" : "border-slate-200"
    )}>
      <Handle type="target" position={Position.Left} className="w-2 h-2 !bg-blue-400 border-none" />
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-lg bg-gradient-to-br",
          data.gradient || "from-blue-500 to-indigo-600"
        )}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">{data.label}</p>
          <p className="text-[10px] text-slate-500 font-medium">{data.sublabel}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="w-2 h-2 !bg-blue-400 border-none" />
    </div>
  );
};

const nodeTypes = {
  workflowNode: WorkflowNode,
};

export type RagFlowView = "pipeline" | "storage" | "query";

const pipelineNodes: Node[] = [
  {
    id: "xml",
    position: { x: 0, y: 0 },
    data: { label: "Source", sublabel: "XML Archives (5k+ files)", icon: FileText, gradient: "from-amber-400 to-orange-500" },
    type: "workflowNode",
  },
  {
    id: "mysql",
    position: { x: 250, y: 0 },
    data: { label: "Storage", sublabel: "MySQL (CFR Core)", icon: Database, gradient: "from-blue-500 to-indigo-600" },
    type: "workflowNode",
  },
  {
    id: "airflow",
    position: { x: 500, y: 0 },
    data: { label: "Parser", sublabel: "Airflow Workers", icon: Cpu, gradient: "from-purple-500 to-pink-600" },
    type: "workflowNode",
  },
  {
    id: "openai",
    position: { x: 750, y: 0 },
    data: { label: "AI Intel", sublabel: "text-embedding-3", icon: Zap, gradient: "from-cyan-400 to-blue-500" },
    type: "workflowNode",
  },
  {
    id: "postgres",
    position: { x: 1000, y: 0 },
    data: { label: "Vector DB", sublabel: "Postgres + pgvector", icon: Layers, gradient: "from-slate-700 to-slate-900" },
    type: "workflowNode",
  },
  {
    id: "ui",
    position: { x: 1250, y: 0 },
    data: { label: "Interface", sublabel: "Next-gen RAG UI", icon: Layout, gradient: "from-emerald-400 to-teal-600" },
    type: "workflowNode"
  },
];

const pipelineEdges: Edge[] = [
  { id: "e-xml-mysql", source: "xml", target: "mysql", animated: true },
  { id: "e-mysql-airflow", source: "mysql", target: "airflow", animated: true },
  { id: "e-airflow-openai", source: "airflow", target: "openai", animated: true },
  { id: "e-openai-postgres", source: "openai", target: "postgres", animated: true },
  { id: "e-postgres-ui", source: "postgres", target: "ui", animated: true },
];

const storageNodes: Node[] = [
  {
    id: "mysql-core",
    position: { x: 0, y: 140 },
    data: { label: "Core Relational", sublabel: "Titles, Parts, Sections", icon: Database, gradient: "from-blue-500 to-indigo-600" },
    type: "workflowNode",
  },
  {
    id: "pg-vector",
    position: { x: 350, y: 140 },
    data: { label: "Vector Hybrid", sublabel: "Docs & 1536-dim Chunks", icon: Layers, gradient: "from-slate-700 to-slate-900" },
    type: "workflowNode",
  },
  {
    id: "search-index",
    position: { x: 700, y: 140 },
    data: { label: "Semantic Search", sublabel: "Cosign Proximity", icon: Search, gradient: "from-emerald-400 to-teal-600" },
    type: "workflowNode",
  },
];

const storageEdges: Edge[] = [
  { id: "e-core-vector", source: "mysql-core", target: "pg-vector", animated: true },
  { id: "e-vector-search", source: "pg-vector", target: "search-index", animated: true },
];

const queryNodes: Node[] = [
  { id: "user", position: { x: 0, y: 0 }, data: { label: "Query", sublabel: "Natural Language", icon: Search, gradient: "from-blue-400 to-indigo-500" }, type: "workflowNode" },
  { id: "embed", position: { x: 280, y: 0 }, data: { label: "Embed", sublabel: "Vectorization", icon: Zap, gradient: "from-cyan-400 to-blue-500" }, type: "workflowNode" },
  { id: "retrieve", position: { x: 560, y: 0 }, data: { label: "Retrieve", sublabel: "Semantic Match", icon: Database, gradient: "from-purple-500 to-pink-600" }, type: "workflowNode" },
  { id: "answer", position: { x: 840, y: 0 }, data: { label: "Logic", sublabel: "LLM synthesis", icon: Sparkles, gradient: "from-emerald-400 to-teal-600" }, type: "workflowNode" },
];

const queryEdges: Edge[] = [
  { id: "e-user-embed", source: "user", target: "embed", animated: true },
  { id: "e-embed-retrieve", source: "embed", target: "retrieve", animated: true },
  { id: "e-retrieve-answer", source: "retrieve", target: "answer", animated: true },
];

const viewMap: Record<RagFlowView, { nodes: Node[]; edges: Edge[] }> = {
  pipeline: { nodes: pipelineNodes, edges: pipelineEdges },
  storage: { nodes: storageNodes, edges: storageEdges },
  query: { nodes: queryNodes, edges: queryEdges },
};

import { Sparkles } from "lucide-react";

export function RagFlowMap({ view }: { view: RagFlowView }) {
  const { nodes, edges } = useMemo(() => viewMap[view], [view]);

  return (
    <div className="h-[420px] w-full rounded-2xl border bg-slate-50/50 backdrop-blur-sm overflow-hidden shadow-inner">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable={true}
        nodesConnectable={false}
      >
        <Background gap={25} size={1} color="#e2e8f0" />
        <MiniMap
          style={{ height: 100, borderRadius: 12, border: '1px solid #e2e8f0' }}
          maskColor="rgba(241, 245, 249, 0.6)"
        />
        <Controls
          className="bg-white border-slate-200 rounded-lg shadow-sm"
          showInteractive={false}
        />
      </ReactFlow>
    </div>
  );
}
