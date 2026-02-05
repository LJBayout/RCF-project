import { useState } from "react";
import { AIChatBox, Message } from "@/components/AIChatBox";
import { AvailableDataCoverage } from "@/components/AvailableDataCoverage";
import { Navbar } from "@/components/Navbar";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ExternalLink, Activity, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Elite Squad Titles Hardcoded for Quick Access
const TARGET_TITLES = [
  { value: "0", label: "All Titles (Global Search)" },
  { value: "3", label: "Title 3: The President" },
  { value: "10", label: "Title 10: Energy" },
  { value: "18", label: "Title 18: Conservation of Power" },
  { value: "21", label: "Title 21: Food and Drugs" },
  { value: "29", label: "Title 29: Labor" },
  { value: "30", label: "Title 30: Mineral Resources" },
  { value: "33", label: "Title 33: Navigation and Navigable Waters" },
  { value: "40", label: "Title 40: Protection of Environment" },
  { value: "48", label: "Title 48: Federal Acquisition Regulations" },
  { value: "49", label: "Title 49: Transportation" },
];

export default function AskCFR() {
  const [selectedTitle, setSelectedTitle] = useState<string>("0");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "system",
      content:
        "You are a compliance expert assistant specializing in the Code of Federal Regulations (CFR).",
    },
  ]);
  const [sources, setSources] = useState<
    Array<{
      titleNumber: number;
      titleName: string;
      partNumber: number;
      partName: string;
      sectionNumber: string;
      sectionSubject: string;
      similarity: number;
      year?: number;
    }>
  >([]);

  const { data: ingestStatus } = trpc.rag.getIngestStatus.useQuery(undefined, {
    refetchInterval: 30000, // Sync every 30s
  });

  const askMutation = trpc.rag.ask.useMutation({
    onSuccess: (response) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.answer,
        },
      ]);
      setSources(response.sources);
    },
    onError: (error) => {
      console.error("RAG error:", error);
      const errorMsg = `I apologize, but I encountered an error: ${error.message}. Please try rephrasing your question or contact support.`;
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: errorMsg,
        },
      ]);
    },
  });

  const handleSendMessage = (content: string) => {
    const newMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(newMessages);

    // Call RAG endpoint with title filter if specific title selected
    const titleFilter = selectedTitle !== "0" ? parseInt(selectedTitle, 10) : undefined;

    askMutation.mutate({
      question: content,
      titleFilter: titleFilter
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <div className="flex-1 container py-8 px-4 max-w-[90rem] mx-auto">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="bg-white border-blue-200 text-blue-700 gap-1.5 shadow-sm">
                <Activity className="h-3 w-3 animate-pulse text-green-500" />
                RAG System Online
              </Badge>
              {ingestStatus && (
                <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600 border-slate-200">
                  {ingestStatus.progress}% Global Coverage ({ingestStatus.total.toLocaleString()} / {ingestStatus.totalMySQL.toLocaleString()} sections)
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs">
                GPT-4o + Vector Search
              </Badge>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Regulatory Intelligence</h1>
            <div className="flex flex-col gap-1 mt-1">
              <p className="text-slate-500 max-w-2xl text-sm">
                Deep semantic search across 30 years of federal regulations.
              </p>
              {ingestStatus && ingestStatus.progress < 100 && (
                <div className="w-full max-w-md h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${ingestStatus.progress}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Title Filter */}
          <div className="flex items-center gap-3 bg-white p-1.5 rounded-lg border shadow-sm">
            <Filter className="h-4 w-4 text-slate-400 ml-2" />
            <Select value={selectedTitle} onValueChange={setSelectedTitle}>
              <SelectTrigger className="w-[280px] border-0 focus:ring-0 h-9 font-medium">
                <SelectValue placeholder="Select Scope" />
              </SelectTrigger>
              <SelectContent align="end">
                {TARGET_TITLES.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="font-medium">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Data Coverage Overview */}
        <div className="mb-8">
          <AvailableDataCoverage />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-220px)] min-h-[600px]">
          {/* Chat Interface */}
          <div className="lg:col-span-8 h-full flex flex-col" data-tour="ask-cfr-chat">
            <Card className="flex-1 overflow-hidden shadow-sm border-slate-200">
              <AIChatBox
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={askMutation.isPending}
                placeholder={`Ask a question about ${selectedTitle === "0" ? "federal regulations" : `Title ${selectedTitle}`}...`}
                height="100%"
                emptyStateMessage="Search specifically within extensive historical data (1996-2025)."
                suggestedPrompts={[
                  "What changed in Title 21 regarding electronic records?",
                  "How have EPA emission standards evolved since 2010?",
                  "Summarize the conflict of interest rules in Title 48.",
                  "What are the safety requirements for underground mining?"
                ]}
              />
            </Card>
          </div>

          {/* Sources Panel */}
          <div className="lg:col-span-4 h-full overflow-hidden flex flex-col">
            <Card className="h-full flex flex-col shadow-sm border-slate-200 bg-white">
              <div className="p-4 border-b bg-slate-50/50 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">Citations & Evidence</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Sources used to generate the answer.
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {sources.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-center p-4 border-2 border-dashed rounded-lg border-slate-100 bg-slate-50/50">
                    <BookOpen className="h-8 w-8 text-slate-200 mb-2" />
                    <p className="text-sm text-slate-400 font-medium">
                      No sources cited yet.
                    </p>
                    <p className="text-xs text-slate-400">
                      Ask a question to retrieve relevant sections.
                    </p>
                  </div>
                ) : (
                  sources.map((source, index) => (
                    <div
                      key={index}
                      className="group rounded-lg border border-slate-200 bg-white p-3 hover:border-blue-400 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Badge variant="outline" className="text-[10px] font-bold text-slate-500 bg-slate-50 border-slate-200">
                          SOURCE {index + 1}
                        </Badge>
                        <div className="flex gap-1.5">
                          {/* Similarity Badge */}
                          <Badge
                            className="text-[10px] bg-green-100 text-green-700 hover:bg-green-100 border-0"
                          >
                            {(source.similarity * 100).toFixed(0)}% match
                          </Badge>

                          {/* Year Badge (New!) */}
                          {source.year && (
                            <Badge className="text-[10px] bg-blue-100 text-blue-700 hover:bg-blue-100 border-0">
                              {source.year}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="mb-2">
                        <h4 className="text-xs font-bold text-slate-900 leading-tight">
                          Title {source.titleNumber}, Part {source.partNumber}
                        </h4>
                        <div className="text-xs font-mono text-slate-500 mt-0.5">
                          Section {source.sectionNumber}
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 mb-3 line-clamp-3 leading-relaxed">
                        {source.sectionSubject}
                      </p>

                      {source.partNumber > 0 ? (
                        <a
                          href={`/browse/title/${source.titleNumber}/part/${source.partNumber}#section-${String(source.sectionNumber).replace(/[^a-zA-Z0-9.]/g, "")}`}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 group-hover:text-blue-600"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View Context (Section {source.sectionNumber})
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <div className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-400 cursor-not-allowed">
                          Context Unavailable
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="p-3 bg-slate-50 border-t text-[10px] text-slate-400 text-center">
                Access restricted to Elite Squad Titles (1996-2025).
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
