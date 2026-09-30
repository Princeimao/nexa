import {
  ArrowUp,
  Bot,
  CheckCircle2,
  ChevronRight,
  Database,
  FileSearch,
  Lightbulb,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { api } from "../services/api";
import type { PolicyAiResponse } from "../types";

import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Textarea } from "./ui/textarea";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  data?: PolicyAiResponse;
  timestamp: string;
}

interface PolicyAiCopilotProps {
  country?: string;
  initialPrompt?: string;
  onClearInitialPrompt?: () => void;
}

const quickPrompts = [
  {
    title: "Demand hotspots",
    description:
      "Identify districts where citizen demand is high but current investment is insufficient.",
    prompt:
      "Identify districts where citizen demand is high but current public investment is insufficient. Explain the evidence behind each finding.",
  },
  {
    title: "Infrastructure gaps",
    description:
      "Find major infrastructure problems that current plans do not adequately address.",
    prompt:
      "What major infrastructure gaps are emerging that current public investment plans do not adequately address?",
  },
  {
    title: "Investment impact",
    description:
      "Analyse whether completed projects correspond with measurable citizen outcomes.",
    prompt:
      "Analyse the available evidence for projects that have been completed. What changed in citizen demand, grievances, or infrastructure indicators after completion?",
  },
  {
    title: "Planning priorities",
    description:
      "Surface areas where citizen demand and planning priorities are misaligned.",
    prompt:
      "Where is citizen demand most misaligned with current public investment plans? Explain the evidence and the potential planning implications.",
  },
];

export const PolicyAiCopilot: React.FC<PolicyAiCopilotProps> = ({
  country,
  initialPrompt,
  onClearInitialPrompt,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "I analyse the platform's verified citizen requests, demographic indicators, infrastructure data, and public investment records for the selected country. Ask a policy question in any BRICS language.",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);

  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  useEffect(() => {
    if (!initialPrompt) return;

    handleSend(initialPrompt);

    onClearInitialPrompt?.();
  }, [initialPrompt]);

  const handleSend = async (queryText?: string) => {
    const query = (queryText ?? inputQuery).trim();

    if (!query || loading) return;

    setError(null);

    const userMessage: Message = {
      id: `usr_${Date.now()}`,
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery("");
    setLoading(true);

    try {
      /*
       * IMPORTANT:
       * This is the real backend AI call, scoped to the selected country.
       *
       * No demo response is generated on the frontend.
       */
      const response = await api.askPolicyAi(query, { country });

      const assistantMessage: Message = {
        id: `ast_${Date.now()}`,
        role: "assistant",
        content: response.answer,
        data: response,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Policy AI request failed:", err);

      const detail =
        err instanceof Error && err.message ? `: ${err.message}` : "";

      setError(
        `The Policy AI service could not process this request${detail}. Please verify that the backend AI service is running.`,
      );
    } finally {
      setLoading(false);

      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    handleSend();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      if (!loading && inputQuery.trim()) {
        handleSend();
      }
    }
  };

  const handleNewAnalysis = () => {
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        role: "assistant",
        content:
          "New analysis started. Ask me about citizen demand, infrastructure gaps, investment alignment, project impact, or emerging development priorities.",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);

    setInputQuery("");
    setError(null);

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  return (
    <div className="h-[calc(100vh-8.5rem)] max-h-[650px]">
      <div className="grid h-full grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="flex min-h-0 flex-col overflow-hidden border-slate-200 shadow-sm">
          {/* Header */}
          <CardHeader className="border-b bg-white px-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
                  <Bot className="h-5 w-5 text-blue-300" />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-sm font-bold tracking-tight text-slate-950">
                      Policy Intelligence Copilot
                    </CardTitle>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNewAnalysis}
                  className="h-8"
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  New analysis
                </Button>
              </div>
            </div>
          </CardHeader>

          {/* Chat */}
          <CardContent className="min-h-0 flex-1 overflow-y-auto bg-slate-50/50 p-0">
            <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
              {messages.map((message) => {
                const isUser = message.role === "user";

                return (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      isUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    {!isUser && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white shadow-sm">
                        <Bot className="h-4 w-4 text-blue-300" />
                      </div>
                    )}

                    <div
                      className={`max-w-[88%] sm:max-w-[78%] ${
                        isUser ? "items-end" : "items-start"
                      }`}
                    >
                      <div
                        className={
                          isUser
                            ? "rounded-2xl rounded-tr-md bg-slate-950 px-4 py-3 text-sm leading-6 text-white shadow-sm"
                            : "rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-800 shadow-sm"
                        }
                      >
                        {isUser ? (
                          <div className="whitespace-pre-wrap">
                            {message.content}
                          </div>
                        ) : (
                          <div className="policy-markdown">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={markdownComponents}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>

                      <div
                        className={`mt-1.5 px-1 text-[10px] text-muted-foreground ${
                          isUser ? "text-right" : "text-left"
                        }`}
                      >
                        {isUser ? "You" : "Policy AI"} · {message.timestamp}
                      </div>

                      {/* Evidence */}
                      {!isUser &&
                        message.data?.evidenceCards &&
                        message.data.evidenceCards.length > 0 && (
                          <div className="mt-3 w-full">
                            <div className="mb-2 flex items-center gap-2">
                              <FileSearch className="h-3.5 w-3.5 text-blue-600" />

                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Evidence used
                              </span>

                              <Separator className="flex-1" />
                            </div>

                            <div className="grid gap-2 sm:grid-cols-2">
                              {message.data.evidenceCards.map((card, index) => (
                                <div
                                  key={`${message.id}-evidence-${index}`}
                                  className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-xs font-semibold text-slate-900">
                                      {card.title}
                                    </p>

                                    <Badge
                                      variant="secondary"
                                      className="shrink-0 text-[9px]"
                                    >
                                      {card.type}
                                    </Badge>
                                  </div>

                                  <p className="mt-2 text-sm font-bold text-blue-700">
                                    {card.keyMetric}
                                  </p>

                                  <p className="mt-1 text-[11px] leading-5 text-slate-600">
                                    {card.context}
                                  </p>

                                  <p className="mt-2 text-[9px] text-slate-400">
                                    Source: {card.source}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Follow-up questions */}
                      {!isUser &&
                        message.data?.suggestedFollowUps &&
                        message.data.suggestedFollowUps.length > 0 && (
                          <div className="mt-3">
                            <div className="mb-2 flex items-center gap-2">
                              <Lightbulb className="h-3.5 w-3.5 text-amber-500" />

                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Continue analysis
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {message.data.suggestedFollowUps.map(
                                (followUp, index) => (
                                  <Button
                                    key={`${message.id}-followup-${index}`}
                                    variant="outline"
                                    size="sm"
                                    disabled={loading}
                                    onClick={() => handleSend(followUp)}
                                    className="h-auto min-h-8 justify-between whitespace-normal rounded-lg px-3 py-2 text-left text-[11px]"
                                  >
                                    <span>{followUp}</span>
                                    <ChevronRight className="ml-2 h-3 w-3 shrink-0" />
                                  </Button>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                    </div>

                    {isUser && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Loading */}
              {loading && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white">
                    <Bot className="h-4 w-4 text-blue-300" />
                  </div>

                  <div className="rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />

                      <span className="text-xs font-medium text-slate-600">
                        Analysing verified platform data…
                      </span>
                    </div>

                    <p className="mt-1 text-[10px] text-slate-400">
                      Querying the connected policy intelligence service
                    </p>
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>
          </CardContent>

          {/* Input */}
          <div className="border-t bg-white p-4">
            <div className="mx-auto max-w-4xl">
              {error && (
                <Alert
                  variant="destructive"
                  className="mb-3 border-rose-200 bg-rose-50"
                >
                  <AlertTriangleIcon />
                  <AlertTitle>Policy AI request failed</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit}>
                <div className="relative rounded-2xl border border-slate-300 bg-white shadow-sm transition focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                  <Textarea
                    ref={textareaRef}
                    value={inputQuery}
                    onChange={(event) => setInputQuery(event.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                    rows={2}
                    placeholder="Ask about citizen demand, infrastructure gaps, investment alignment, or project impact…"
                    className="min-h-[76px] resize-none border-0 bg-transparent px-4 pb-12 pt-3 text-sm shadow-none focus-visible:ring-0 max-h-50"
                  />

                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <MessageSquareText className="h-3.5 w-3.5" />
                      <span>Enter to send</span>
                      <span>•</span>
                      <span>Shift + Enter for new line</span>
                    </div>

                    <Button
                      type="submit"
                      size="sm"
                      disabled={!inputQuery.trim() || loading}
                      className="h-8 rounded-lg px-3"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <span className="mr-1.5 hidden sm:inline">
                            Analyse
                          </span>
                          <ArrowUp className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </Card>

        {/* =========================================================
            RIGHT INTELLIGENCE PANEL
        ========================================================== */}
        <div className="flex min-h-0 flex-col gap-4">
          {/* Context */}
          <Card className="shrink-0 border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div>
                  <CardTitle className="text-sm">
                    Ask the Policy Analyst
                  </CardTitle>

                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Start with an evidence-based question
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-2">
              {quickPrompts.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  disabled={loading}
                  onClick={() => handleSend(item.prompt)}
                  className="group w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/50 disabled:pointer-events-none disabled:opacity-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-900 group-hover:text-blue-700">
                        {item.title}
                      </p>

                      <p className="mt-1 text-[11px] leading-5 text-slate-500">
                        {item.description}
                      </p>
                    </div>

                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

/**
 * Styled markdown elements for assistant answers.
 * Backend returns markdown (headings, bold, bullets, tables) —
 * these map it onto the dashboard's typography so no raw #, * is visible.
 */
const markdownComponents = {
  h1: ({ children }: any) => (
    <h1 className="mb-2 mt-1 text-base font-bold tracking-tight text-slate-950">
      {children}
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="mb-2 mt-3 text-sm font-bold tracking-tight text-slate-950">
      {children}
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="mb-1.5 mt-3 text-[13px] font-bold text-slate-900">
      {children}
    </h3>
  ),
  h4: ({ children }: any) => (
    <h4 className="mb-1 mt-2 text-xs font-bold uppercase tracking-wide text-slate-600">
      {children}
    </h4>
  ),
  p: ({ children }: any) => (
    <p className="mb-2 text-sm leading-6 text-slate-700 last:mb-0">{children}</p>
  ),
  strong: ({ children }: any) => (
    <strong className="font-semibold text-slate-950">{children}</strong>
  ),
  em: ({ children }: any) => (
    <em className="text-slate-700">{children}</em>
  ),
  ul: ({ children }: any) => (
    <ul className="mb-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">
      {children}
    </ul>
  ),
  ol: ({ children }: any) => (
    <ol className="mb-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-slate-700">
      {children}
    </ol>
  ),
  li: ({ children }: any) => <li className="pl-0.5">{children}</li>,
  a: ({ children, href }: any) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-blue-700 underline decoration-blue-200 underline-offset-2 hover:text-blue-800"
    >
      {children}
    </a>
  ),
  code: ({ children }: any) => (
    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-800">
      {children}
    </code>
  ),
  pre: ({ children }: any) => (
    <pre className="mb-2 overflow-x-auto rounded-lg border border-slate-200 bg-slate-950 p-3 text-xs leading-5 text-slate-100">
      {children}
    </pre>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="mb-2 border-l-2 border-blue-300 bg-blue-50/50 py-1 pl-3 text-sm leading-6 text-slate-700">
      {children}
    </blockquote>
  ),
  table: ({ children }: any) => (
    <div className="mb-2 overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }: any) => (
    <thead className="bg-slate-50">{children}</thead>
  ),
  th: ({ children }: any) => (
    <th className="border-b border-slate-200 px-2.5 py-1.5 text-left font-semibold text-slate-700">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="border-b border-slate-100 px-2.5 py-1.5 text-slate-700 last:border-0">
      {children}
    </td>
  ),
  hr: () => <hr className="my-3 border-slate-200" />,
};

/**
 * Small local icon component so the Alert doesn't require another
 * lucide import in the main import list.
 */
const AlertTriangleIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="h-4 w-4"
  >
    <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);

export default PolicyAiCopilot;
