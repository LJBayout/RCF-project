import { useState } from "react";
import { useLocation } from "wouter";
import { Bot, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/routes";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AIChatBox, Message } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ExternalLink } from "lucide-react";

export function ChatbotIcon() {
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
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
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content },
    ];
    setMessages(newMessages);
    askMutation.mutate({ question: content });
  };

  // Don't show on login page or if not authenticated
  if (!isAuthenticated || location === ROUTES.login) {
    return null;
  }

  return (
    <>
      {/* Floating Chatbot Button */}
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-40 bg-primary hover:bg-primary/90 ring-2 ring-primary/20 hover:ring-primary/40"
        size="icon"
        data-tour="chatbot-icon"
        aria-label="Open Compliance Intelligence"
      >
        <Bot className="h-6 w-6 text-white" />
      </Button>

      {/* Chat Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:w-[540px] p-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <SheetTitle>Compliance Intelligence</SheetTitle>
                  <SheetDescription className="text-xs">
                    Ask questions about U.S. federal regulations
                  </SheetDescription>
                </div>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 flex overflow-hidden">
            {/* Chat Interface */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex-1 overflow-hidden p-4">
                <AIChatBox
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  isLoading={askMutation.isPending}
                  placeholder="Ask a question about CFR regulations..."
                  height="100%"
                  emptyStateMessage="Ask any question about the Code of Federal Regulations"
                  suggestedPrompts={[
                    "What are the FDA requirements for electronic signatures?",
                    "How do I comply with EPA stormwater permits?",
                    "What changed in 21 CFR 820 between 2016 and 2023?",
                    "What are OSHA lockout/tagout requirements?",
                  ]}
                />
              </div>
            </div>

            {/* Sources Panel */}
            {sources.length > 0 && (
              <div className="w-64 border-l bg-muted/30 overflow-y-auto p-4">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">Sources</h3>
                </div>
                <div className="space-y-3">
                  {sources.map((source, index) => (
                    <Card
                      key={index}
                      className="p-3 hover:bg-background transition-colors"
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
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {source.sectionSubject}
                      </p>
                      <a
                        href={`/browse/title/${source.titleNumber}/part/${source.partNumber}`}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setOpen(false)}
                      >
                        View full text
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
