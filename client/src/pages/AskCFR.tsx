import { useState } from "react";
import { AIChatBox, Message } from "@/components/AIChatBox";
import { Navbar } from "@/components/Navbar";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ExternalLink } from "lucide-react";

export default function AskCFR() {
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
    }>
  >([]);

  const askMutation = trpc.rag.ask.useMutation({
    onSuccess: (response) => {
      // Add AI response to messages
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.answer,
        },
      ]);
      // Update sources
      setSources(response.sources);
    },
    onError: (error) => {
      console.error("RAG error:", error);
      const errorMsg = `I apologize, but I encountered an error: ${error.message}. Please try rephrasing your question or contact support if the issue persists.`;
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
    // Add user message immediately
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content },
    ];
    setMessages(newMessages);

    // Call RAG endpoint
    askMutation.mutate({ question: content });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-blue-50/40">
      <Navbar />
      <div className="flex-1 container py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant="secondary"
              className="text-[10px] font-semibold uppercase tracking-wide"
            >
              Compliance Intelligence
            </Badge>
            <span className="text-[11px] text-muted-foreground font-medium">
              Powered by GPT-4 + RAG
            </span>
          </div>
          <h1 className="text-3xl font-semibold">Compliance Intelligence</h1>
          <p className="text-muted-foreground max-w-2xl">
            Ask questions about U.S. federal regulations. Get instant answers with CFR citations. Powered by AI that searches 30+ years of regulatory data.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Interface */}
          <div className="lg:col-span-2" data-tour="ask-cfr-chat">
            <AIChatBox
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={askMutation.isPending}
              placeholder="Ask a question about CFR regulations..."
              height="calc(100vh - 280px)"
              emptyStateMessage="Ask any question about the Code of Federal Regulations"
              suggestedPrompts={[
                "What are the FDA requirements for electronic signatures?",
                "How do I comply with EPA stormwater permits?",
                "What changed in 21 CFR 820 between 2016 and 2023?",
                "What are OSHA lockout/tagout requirements?",
              ]}
            />
          </div>

          {/* Sources Panel */}
          <div className="lg:col-span-1">
            <Card className="p-4 h-full">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">Sources</h3>
              </div>

              {sources.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sources will appear here when you ask a question.
                </p>
              ) : (
                <div className="space-y-3">
                  {sources.map((source, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-border/60 p-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-xs font-bold text-primary">
                          SOURCE {index + 1}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-[9px] px-1.5 py-0.5"
                        >
                          {(source.similarity * 100).toFixed(0)}% match
                        </Badge>
                      </div>
                      <p className="text-xs font-semibold text-foreground mb-1">
                        Title {source.titleNumber}, Part {source.partNumber}, Section {source.sectionNumber}
                      </p>
                      <p className="text-xs text-muted-foreground mb-2">
                        {source.sectionSubject}
                      </p>
                      <a
                        href={`/browse/title/${source.titleNumber}/part/${source.partNumber}`}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View full text
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-border/60">
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  <strong>How it works:</strong> Our RAG system searches vector embeddings of CFR sections, retrieves the most relevant passages, and generates answers using GPT-4. All responses are grounded in actual regulatory text with citations.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
