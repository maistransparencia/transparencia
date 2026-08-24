"use client";

import type { User } from "@supabase/supabase-js";
import {
  ArrowLeft,
  BarChart3,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Database,
  Download,
  Edit3,
  History,
  Info,
  Loader2,
  Lock,
  PlusIcon,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  Square,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  UserCheck,
  UserPlus,
  X,
  Zap,
} from "lucide-react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import type { AssistantResponse } from "../api/assistant/chat/route";
import {
  AssistantProvider,
  type ChatConversation,
  type ChatMessage,
  useAssistantContext,
} from "./assistant-context";
import { AssistantFallbackChips } from "./assistant-fallback-chips";
import { AuthModal } from "./auth-modal";
import { TransparenciaLogo } from "./transparencia-logo";

export const ROUTE_SUGGESTED_QUESTIONS: Record<string, string[]> = {
  "/saude": [
    "Qual o total gasto com Saúde no exercício?",
    "Quais as receitas de repasse do SUS/União e Estado?",
    "Quanto foi investido em emendas parlamentares na saúde?",
  ],
  "/caprem": [
    "Qual a arrecadação e despesa previdenciária do CAPREM?",
    "Qual o saldo atuarial e aportes da prefeitura ao CAPREM?",
    "Quanto foi pago em aposentadorias e pensões?",
  ],
  "/licitacoes": [
    "Qual o total de contratos celebrados e vigentes?",
    "Qual o volume em dispensas e inexigibilidades de licitação?",
    "Quais são os maiores fornecedores do município?",
  ],
  "/pessoal": [
    "Qual o total gasto com folha de pagamento e pessoal?",
    "Qual o percentual de cargos em comissão ocupados por efetivos?",
    "Quanto foi despendido com 13º salário e encargos?",
  ],
  "/receitas": [
    "Qual a receita total arrecadada no município?",
    "Qual a proporção entre receita própria e transferências?",
    "Quanto foi arrecadado em receitas extra-orçamentárias?",
  ],
  "/despesas": [
    "Quais os maiores órgãos e unidades orçamentárias em gastos?",
    "Qual o total de restos a pagar pagos no exercício?",
    "Quanto foi empenhado, liquidado e pago no total?",
  ],
  "/orcamento": [
    "Qual o orçamento aprovado e atualizado para o ano?",
    "Quais funções contábeis receberam maior fatia orçamentária?",
    "Qual o percentual de execução do orçamento municipal?",
  ],
  default: [
    "Qual a receita arrecadada este ano?",
    "Quanto foi gasto com a Saúde?",
    "Quais os aportes para o CAPREM?",
    "Qual o total em dispensas de licitação?",
  ],
};

function formatMessageTimestamp(rawTimestamp?: string): string {
  if (!rawTimestamp || rawTimestamp === "agora") return "agora";
  if (rawTimestamp.includes("às")) return rawTimestamp;

  const date = new Date(rawTimestamp);
  if (!Number.isNaN(date.getTime())) {
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const timeStr = date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (isToday) {
      return `Hoje às ${timeStr}`;
    }

    const dateStr = date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
    return `${dateStr} às ${timeStr}`;
  }

  if (/^\d{2}:\d{2}$/.test(rawTimestamp.trim())) {
    return `Hoje às ${rawTimestamp.trim()}`;
  }

  return rawTimestamp;
}

function HeroWelcomeCard({
  ano,
  onOpenAuthModal,
  isLoggedIn,
}: {
  ano: string;
  onOpenAuthModal?: () => void;
  isLoggedIn?: boolean;
}) {
  return (
    <div className="mb-3 rounded-2xl border border-[#5a72a8]/20 bg-gradient-to-b from-[#5a72a8]/10 to-white p-4 text-slate-800 shadow-xs">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-xs">
          <TransparenciaLogo className="h-9 w-9" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-xs">
            Assistente Fiscal Inteligente
          </h3>
          <p className="text-[11px] text-slate-500">
            Exercício Orçamentário de {ano}
          </p>
        </div>
      </div>

      <p className="mt-2.5 text-slate-600 text-xs leading-relaxed">
        Faça consultas em linguagem natural sobre a Lei de Responsabilidade
        Fiscal, Saúde, Pessoal, Licitações e Previdência.
      </p>

      <div className="mt-3 grid grid-cols-1 gap-2 text-[11px]">
        <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white p-2 text-slate-700">
          <Zap className="h-4 w-4 shrink-0 text-amber-500" />
          <span>
            Consultas Fiscais Instantâneas: Respostas diretas baseadas em dados
            oficiais
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white p-2 text-slate-700">
          <BarChart3 className="h-4 w-4 shrink-0 text-emerald-500" />
          <span>
            Gráficos e Exportação: Visualização de indicadores e download em CSV
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white p-2 text-slate-700">
          <Lock className="h-4 w-4 shrink-0 text-[#5a72a8]" />
          <span>
            Histórico Local-First: Suas conversas ficam salvas 100% no seu
            navegador com privacidade total
          </span>
        </div>
        {isLoggedIn ? (
          <div className="flex w-full items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 p-2 text-left font-medium text-emerald-900">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>Conta Ativa: Cota de perguntas expandida liberada</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenAuthModal}
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-[#5a72a8]/30 bg-[#5a72a8]/10 p-2 text-left font-medium text-slate-900 transition-all hover:border-[#5a72a8]/50 hover:bg-[#5a72a8]/20"
          >
            <UserPlus className="h-4 w-4 shrink-0 text-[#5a72a8]" />
            <span>
              Cota Expandida: Crie sua conta para ter mais limites diários de
              consulta
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

interface AssistantChatDrawerProps {
  portalSlug?: string;
  ano?: string;
}

function FormattedMarkdown({ text }: { text?: string }) {
  if (!text) return null;

  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);

  return (
    <span>
      {parts.map((part, i) => {
        const key = `part-${i}-${part.slice(0, 5)}`;
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={key} className="font-semibold text-slate-900">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("*") && part.endsWith("*")) {
          return <em key={key}>{part.slice(1, -1)}</em>;
        }
        return part;
      })}
    </span>
  );
}

function AssistantChatDrawerContent({
  portalSlug = "porciuncula_prefeitura",
  ano = "2025",
}: AssistantChatDrawerProps) {
  const {
    state,
    dispatch,
    createConversation,
    selectConversation,
    deleteConversation,
    renameConversation,
    clearAllConversations,
  } = useAssistantContext();

  const [mounted, setMounted] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 80)}px`;
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const pathname = usePathname();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const activeSuggestedQuestions = (() => {
    if (!pathname) return ROUTE_SUGGESTED_QUESTIONS.default;
    for (const routeKey of Object.keys(ROUTE_SUGGESTED_QUESTIONS)) {
      if (routeKey !== "default" && pathname.includes(routeKey)) {
        return ROUTE_SUGGESTED_QUESTIONS[routeKey];
      }
    }
    return ROUTE_SUGGESTED_QUESTIONS.default;
  })();

  useEffect(() => {
    setMounted(true);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll no update
  useEffect(() => {
    if (state.isOpen && !showHistoryPanel) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [state.messages.length, state.isLoading, state.isOpen, showHistoryPanel]);

  const handleFeedback = (msgId: string, _text: string, score: 1 | -1) => {
    dispatch({
      type: "SET_FEEDBACK_FOR",
      payload: { messageId: msgId, score },
    });
    try {
      posthog.capture("ai_feedback", {
        score,
        message_id: msgId,
        portal_slug: portalSlug,
        ano,
      });
    } catch (_err) {}
  };

  const handleCancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    dispatch({ type: "SET_IS_LOADING", payload: false });
    dispatch({
      type: "ADD_MESSAGE",
      payload: {
        id: `cancel-${Date.now()}`,
        sender: "assistant",
        text: "**Consulta cancelada por você.**",
        timestamp: new Date().toISOString(),
      },
    });
  };

  const handleCreateNewConversation = () => {
    const welcomeMsg: ChatMessage = {
      id: "msg-welcome",
      sender: "assistant",
      text: `Olá! Sou o **Assistente Fiscal AI** do Portal da Transparência. Como posso ajudar nas suas consultas sobre o exercício de **${ano}**?`,
      timestamp: new Date().toISOString(),
    };
    createConversation(welcomeMsg);
    setShowHistoryPanel(false);
  };

  const handleExportCsv = (msg: ChatMessage) => {
    if (!msg.responseObj?.chartData || msg.responseObj.chartData.length === 0)
      return;
    const header = "Categoria/Item,Valor\n";
    const rows = msg.responseObj.chartData
      .map((d) => `"${d.label.replace(/"/g, '""')}",${d.valor}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `dados_assistente_${msg.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleStartRename = (conv: ChatConversation) => {
    setEditingConvId(conv.id);
    setEditingTitle(conv.title);
  };

  const handleSaveRename = (convId: string) => {
    if (editingTitle.trim()) {
      renameConversation(convId, editingTitle.trim());
    }
    setEditingConvId(null);
    setEditingTitle("");
  };

  const handleSendMessage = async (customMessage?: string) => {
    const textToSend = customMessage || state.inputMessage;
    if (!textToSend.trim() || state.isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toISOString(),
    };

    dispatch({ type: "ADD_MESSAGE", payload: userMsg });
    if (!customMessage) dispatch({ type: "SET_INPUT_MESSAGE", payload: "" });
    dispatch({ type: "SET_IS_LOADING", payload: true });

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message: textToSend,
          messagesHistory: state.messages.map((m) => ({
            sender: m.sender,
            text: m.text,
          })),
          portalSlug,
          ano,
          currentRoute: pathname || "/visao-geral",
        }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          const errData = await res.json().catch(() => null);
          const limitMsg =
            errData?.message ||
            "Você atingiu o limite de perguntas gratuitas de hoje.";
          try {
            posthog.capture("ai_rate_limit_reached", {
              user_type: user ? "authenticated" : "anonymous",
              limit_count: errData?.limit || 5,
              reset_at: errData?.resetAt || 0,
              portal_slug: portalSlug,
              current_route: pathname || "/visao-geral",
            });
          } catch (_err) {}

          const assistantMsg: ChatMessage = {
            id: `rate-limit-${Date.now()}`,
            sender: "assistant",
            text: `**Limite de Consultas Atingido**\n\n${limitMsg}\n\nCrie sua conta gratuita para desbloquear cota expandida diariamente!`,
            timestamp: new Date().toISOString(),
          };

          dispatch({ type: "ADD_MESSAGE", payload: assistantMsg });
          return;
        }
        throw new Error("Falha na consulta do assistente.");
      }

      const data: AssistantResponse = await res.json();
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: "assistant",
        text: data.answer,
        responseObj: data,
        timestamp: new Date().toISOString(),
      };

      dispatch({ type: "ADD_MESSAGE", payload: assistantMsg });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      dispatch({
        type: "ADD_MESSAGE",
        payload: {
          id: `err-${Date.now()}`,
          sender: "assistant",
          text: "Desculpe, ocorreu um erro ao consultar os dados fiscais. Por favor, tente novamente em instantes.",
          timestamp: new Date().toISOString(),
        },
      });
    } finally {
      dispatch({ type: "SET_IS_LOADING", payload: false });
      abortControllerRef.current = null;
    }
  };

  const drawerContent = state.isOpen ? (
    <div className="fixed inset-0 z-[9999] flex justify-end">
      <button
        type="button"
        aria-label="Fechar assistente"
        className="fixed inset-0 border-none bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={() => dispatch({ type: "SET_IS_OPEN", payload: false })}
      />

      {/* Painel da Gaveta (Right Drawer) */}
      <div className="relative z-[10000] flex h-full w-full max-w-lg flex-col border-borderLine border-l bg-white shadow-2xl transition-all">
        {/* Cabeçalho do Chat */}
        <div className="flex shrink-0 items-center justify-between border-borderLine border-b bg-slate-900 px-3 py-3 text-white">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg shadow-xs">
              <TransparenciaLogo className="size-8" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-bold text-xs leading-none sm:text-sm">
                Assistente Fiscal AI
              </h2>
              <p className="mt-0.5 xs:block hidden truncate text-[10px] text-slate-300 sm:text-[11px]">
                Consultas inteligentes
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {user ? (
              <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#5a72a8]/40 bg-[#5a72a8]/20 px-2 py-1 text-[11px] text-slate-200 shadow-xs">
                <UserCheck className="size-3.5 shrink-0 text-emerald-400" />
                <span className="max-w-[70px] truncate font-medium sm:max-w-[90px]">
                  {user.email?.split("@")[0]}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    const supabase = createClient();
                    await supabase.auth.signOut();
                    setUser(null);
                  }}
                  className="ml-0.5 cursor-pointer text-[10px] text-slate-300 underline hover:text-white"
                  title="Sair da conta"
                >
                  Sair
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg bg-[#5a72a8] px-2 py-1 font-semibold text-[11px] text-white shadow-xs hover:bg-[#4a5f8c]"
                title="Entrar ou Criar Conta"
                aria-label="Entrar ou Criar Conta"
              >
                <UserPlus className="size-3.5 shrink-0" />
                <span className="hidden sm:inline">Entrar</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowHistoryPanel((prev) => !prev)}
              className={`flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1 text-[11px] transition-colors ${
                showHistoryPanel
                  ? "bg-[#5a72a8] font-medium text-white shadow-xs"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
              title={
                showHistoryPanel
                  ? "Voltar para a conversa ativa"
                  : "Ver histórico de conversas salvas"
              }
              aria-label={
                showHistoryPanel ? "Voltar ao Chat" : "Histórico de Conversas"
              }
            >
              {showHistoryPanel ? (
                <>
                  <ArrowLeft className="size-3.5 shrink-0 text-white" />
                  <span>Voltar ao Chat</span>
                </>
              ) : (
                <>
                  <History className="size-3.5 shrink-0" />
                  <span>Histórico</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCreateNewConversation}
              className="flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700 hover:text-white"
              title="Nova Conversa"
              aria-label="Novo Chat"
            >
              <PlusIcon className="size-3.5 shrink-0" />
              <span className="whitespace-nowrap">Novo Chat</span>
            </button>

            <button
              type="button"
              onClick={() => dispatch({ type: "SET_IS_OPEN", payload: false })}
              className="shrink-0 cursor-pointer rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Painel do Histórico Local (Quando Ativado) */}
        {showHistoryPanel ? (
          <div className="flex flex-1 flex-col bg-slate-50 p-4">
            <div className="flex items-center justify-between border-slate-200 border-b pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowHistoryPanel(false)}
                  className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 text-xs shadow-2xs transition-colors hover:bg-slate-100 hover:text-slate-900"
                  title="Voltar para a conversa ativa"
                >
                  <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-[#5a72a8]" />
                  <span>Voltar ao Chat</span>
                </button>
                <div className="xs:block hidden">
                  <h3 className="font-bold text-slate-900 text-xs">
                    Histórico
                  </h3>
                  <p className="text-[10px] text-slate-500">Local-First</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCreateNewConversation}
                className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg bg-[#5a72a8] px-2.5 py-1.5 font-medium text-[11px] text-white shadow-xs hover:bg-[#4a5f8c]"
              >
                <PlusIcon className="h-3.5 w-3.5 shrink-0" />
                <span>Nova Conversa</span>
              </button>
            </div>

            {/* Micro-copy de Privacidade */}
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#5a72a8]/20 bg-[#5a72a8]/10 p-3 text-[11px] text-slate-700">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[#5a72a8]" />
              <span>
                <strong>Privacidade em Primeiro Lugar:</strong> Suas conversas
                não são armazenadas em servidores nem associadas ao seu e-mail.
                Você tem controle total para renomear, excluir ou limpar dados.
              </span>
            </div>

            {/* Lista de Conversas Salvas */}
            <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
              {state.conversations.length === 0 ? (
                <p className="p-4 text-center text-slate-400 text-xs">
                  Nenhuma conversa salva.
                </p>
              ) : (
                state.conversations.map((conv) => {
                  const isActive = conv.id === state.activeConversationId;
                  const isEditing = editingConvId === conv.id;
                  const dateStr = new Date(conv.updatedAt).toLocaleDateString(
                    "pt-BR",
                    {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  );

                  return (
                    <div
                      key={conv.id}
                      className={`group flex items-center justify-between rounded-xl border p-3 transition-all ${
                        isActive
                          ? "border-[#5a72a8] bg-white shadow-xs ring-1 ring-[#5a72a8]"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {isEditing ? (
                        <div className="flex flex-1 items-center gap-1.5">
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveRename(conv.id);
                              if (e.key === "Escape") setEditingConvId(null);
                            }}
                            className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-900 text-xs focus:border-[#5a72a8] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRename(conv.id)}
                            className="rounded-md p-1 text-emerald-600 hover:bg-emerald-50"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            selectConversation(conv.id);
                            setShowHistoryPanel(false);
                          }}
                          className="mr-2 flex min-w-0 flex-1 flex-col text-left"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span
                              className={`truncate font-semibold text-xs ${isActive ? "text-[#5a72a8]" : "text-slate-800"}`}
                            >
                              {conv.title}
                            </span>
                            {isActive && (
                              <span className="shrink-0 rounded-full border border-[#5a72a8]/30 bg-[#5a72a8]/10 px-1.5 py-0.5 font-medium text-[#5a72a8] text-[9px]">
                                Ativa
                              </span>
                            )}
                          </div>
                          <span className="mt-0.5 text-[10px] text-slate-400">
                            {conv.messages.length} mensagem(ns) • {dateStr}
                          </span>
                        </button>
                      )}

                      {!isEditing && (
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartRename(conv)}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            title="Renomear conversa"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteConversation(conv.id)}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            title="Excluir conversa"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              selectConversation(conv.id);
                              setShowHistoryPanel(false);
                            }}
                            className="rounded-md p-1 text-slate-400 hover:text-[#5a72a8]"
                            title="Abrir esta conversa"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Limpar Todo o Histórico */}
            <div className="mt-4 border-slate-200 border-t pt-3">
              {confirmClearAll ? (
                <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-2.5">
                  <span className="font-medium text-[11px] text-red-800">
                    Tem certeza? Isso apagará todas as conversas salvas no
                    navegador.
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        clearAllConversations();
                        setConfirmClearAll(false);
                        setShowHistoryPanel(false);
                      }}
                      className="whitespace-nowrap rounded-lg bg-red-600 px-2.5 py-1 font-semibold text-[11px] text-white hover:bg-red-700"
                    >
                      Sim, apagar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClearAll(false)}
                      className="whitespace-nowrap rounded-lg bg-slate-200 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-300"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 font-medium text-slate-600 text-xs transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Limpar todo o histórico local</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Mensagens do Chat */
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {!state.hasInteracted && (
              <HeroWelcomeCard
                ano={ano}
                onOpenAuthModal={() => setIsAuthModalOpen(true)}
                isLoggedIn={Boolean(user)}
              />
            )}
            {state.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                    msg.sender === "user"
                      ? "rounded-br-xs bg-[#5a72a8] text-white"
                      : "rounded-bl-xs border border-slate-200 bg-slate-100 text-slate-900"
                  }`}
                >
                  <div className="whitespace-pre-line font-normal">
                    <FormattedMarkdown text={msg.text} />
                  </div>

                  {/* Exibição de Mini-Cards de Métricas */}
                  {Array.isArray(msg.responseObj?.metrics) &&
                    msg.responseObj.metrics.length > 0 && (
                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {msg.responseObj.metrics.map((card, idx) => (
                          <div
                            key={card.title || `card-${idx}`}
                            className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs"
                          >
                            <p className="font-semibold text-[10px] text-slate-500 uppercase tracking-wider">
                              {card.title}
                            </p>
                            <p className="mt-1 font-bold text-slate-900 text-sm">
                              {card.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                  {/* Exibição de Gráfico Inline Simples & Botão Exportar CSV */}
                  {Array.isArray(msg.responseObj?.chartData) &&
                    msg.responseObj.chartData.length > 0 && (
                      <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-[10px] text-slate-500 uppercase tracking-wider">
                            Comparativo Visual
                          </p>
                          <button
                            type="button"
                            onClick={() => handleExportCsv(msg)}
                            className="flex items-center gap-1 font-medium text-[#5a72a8] text-[10px] hover:underline"
                            title="Exportar dados para CSV"
                          >
                            <Download className="h-3 w-3" />
                            <span>Exportar CSV</span>
                          </button>
                        </div>
                        {(() => {
                          const chartItems = msg.responseObj.chartData || [];
                          const values = chartItems.map((d) =>
                            typeof d?.valor === "number" &&
                            !Number.isNaN(d.valor)
                              ? d.valor
                              : 0,
                          );
                          const maxVal = Math.max(...values, 1);

                          return (
                            <div className="space-y-1.5 pt-1">
                              {chartItems.map((item, _i) => {
                                const raw =
                                  typeof item?.valor === "number" &&
                                  !Number.isNaN(item.valor)
                                    ? item.valor
                                    : 0;
                                const pct = Math.min(
                                  100,
                                  Math.max(5, Math.round((raw / maxVal) * 100)),
                                );
                                const formatted =
                                  item?.formattedValue ||
                                  new Intl.NumberFormat("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                    maximumFractionDigits: 0,
                                  }).format(raw);

                                return (
                                  <div
                                    key={`${item.label}-${item.valor}`}
                                    className="space-y-0.5"
                                  >
                                    <div className="flex justify-between text-[10px]">
                                      <span className="truncate font-medium text-slate-700">
                                        {item.label}
                                      </span>
                                      <span className="font-semibold text-slate-900">
                                        {formatted}
                                      </span>
                                    </div>
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                      <div
                                        className="h-full rounded-full bg-[#5a72a8] transition-all duration-500"
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                  {/* Exibição Transparente da Query SQL Executada */}
                  {msg.responseObj?.sqlQuery && (
                    <div className="mt-3 border-slate-200 border-t pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          dispatch({
                            type: "TOGGLE_SQL_FOR",
                            payload: msg.id,
                          })
                        }
                        className="flex items-center gap-1 font-medium text-[#5a72a8] text-[10px] hover:underline"
                      >
                        <Database className="h-3 w-3" />
                        <span>
                          {state.showSqlFor[msg.id]
                            ? "Ocultar Consulta SQL"
                            : "Ver Consulta SQL Executada no Banco"}
                        </span>
                      </button>

                      {state.showSqlFor[msg.id] && (
                        <div className="mt-2 rounded-lg bg-slate-900 p-2 text-slate-200">
                          <p className="break-all font-mono text-[10px] leading-relaxed">
                            {msg.responseObj.sqlQuery}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Chips de Fallback e Navegação */}
                  {Array.isArray(msg.responseObj?.fallbackChips) &&
                    msg.responseObj.fallbackChips.length > 0 && (
                      <AssistantFallbackChips
                        chips={msg.responseObj.fallbackChips}
                        onSelectPrompt={(p) => handleSendMessage(p)}
                        portalSlug={portalSlug}
                      />
                    )}

                  {/* Rodapé da Mensagem do Usuário */}
                  {msg.sender === "user" && (
                    <span className="mt-1 block text-right font-medium text-[#dbe3f0] text-[9px]">
                      {formatMessageTimestamp(msg.timestamp)}
                    </span>
                  )}

                  {/* Rodapé da Mensagem do Assistente com Feedback */}
                  {msg.sender === "assistant" && (
                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{formatMessageTimestamp(msg.timestamp)}</span>
                      {msg.id !== "msg-welcome" &&
                        !msg.id.startsWith("rate-limit") &&
                        !msg.id.startsWith("cancel") &&
                        !msg.id.startsWith("err") && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                handleFeedback(msg.id, msg.text, 1)
                              }
                              className={`rounded-xs p-1 hover:bg-slate-200 ${
                                state.feedbackFor[msg.id] === 1
                                  ? "text-emerald-600"
                                  : "text-slate-400"
                              }`}
                              title="Resposta Útil"
                            >
                              <ThumbsUp className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleFeedback(msg.id, msg.text, -1)
                              }
                              className={`rounded-xs p-1 hover:bg-slate-200 ${
                                state.feedbackFor[msg.id] === -1
                                  ? "text-red-600"
                                  : "text-slate-400"
                              }`}
                              title="Resposta Imprecisa"
                            >
                              <ThumbsDown className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {state.isLoading && (
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <Loader2 className="h-4 w-4 animate-spin text-[#5a72a8]" />
                <span>Consultando dados fiscais oficiais...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Sugestões Rápidas de Consultas (Se não estiver no painel de histórico) */}
        {!showHistoryPanel && state.suggestionsExpanded && (
          <div className="border-borderLine border-t bg-slate-50 p-3">
            <p className="mb-2 font-medium text-[11px] text-slate-500 uppercase tracking-wider">
              Sugestões Rápidas para esta Página
            </p>
            <div className="flex flex-wrap gap-1.5">
              {activeSuggestedQuestions.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleSendMessage(q)}
                  disabled={state.isLoading}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-left text-slate-700 text-xs transition-colors hover:border-[#5a72a8]/40 hover:bg-[#5a72a8]/10 hover:text-slate-900 disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Rodapé com Campo de Entrada e Micro-copy de Privacidade */}
        {!showHistoryPanel && (
          <div className="border-borderLine border-t bg-white p-3">
            <div className="mb-2 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <Lock className="h-3 w-3 text-[#5a72a8]" />
                Histórico salvo localmente no seu dispositivo (100% privado)
              </span>
              <button
                type="button"
                onClick={() =>
                  dispatch({
                    type: "SET_SUGGESTIONS_EXPANDED",
                    payload: !state.suggestionsExpanded,
                  })
                }
                className="flex items-center gap-0.5 text-[#5a72a8] hover:underline"
              >
                {state.suggestionsExpanded ? (
                  <>
                    <span>Ocultar sugestões</span>
                    <ChevronDown className="h-3 w-3" />
                  </>
                ) : (
                  <>
                    <span>Ver sugestões</span>
                    <ChevronUp className="h-3 w-3" />
                  </>
                )}
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex flex-col gap-1.5"
            >
              <div className="relative flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={state.inputMessage}
                  maxLength={300}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_INPUT_MESSAGE",
                      payload: e.target.value,
                    })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ex: Quanto foi gasto com merenda escolar em 2024?"
                  disabled={state.isLoading}
                  className="max-h-20 flex-1 resize-none overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 text-xs leading-relaxed transition-all duration-100 placeholder:text-slate-400 focus:border-[#5a72a8] focus:bg-white focus:outline-none"
                />
                {state.isLoading ? (
                  <button
                    type="button"
                    onClick={handleCancelRequest}
                    className="flex h-9 items-center gap-1 rounded-xl bg-red-600 px-3 font-semibold text-white text-xs shadow-xs hover:bg-red-700"
                    aria-label="Cancelar consulta"
                  >
                    <Square className="h-3.5 w-3.5 fill-white" />
                    <span>Parar</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!state.inputMessage.trim()}
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-[#5a72a8] text-white shadow-xs transition-colors hover:bg-[#4a5f8c] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Enviar"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Micro-interação: Contador de Caracteres a partir de 70% (210) */}
              {state.inputMessage.length >= 210 && (
                <div className="flex justify-end text-[10px]">
                  <span
                    className={
                      state.inputMessage.length >= 270
                        ? "font-semibold text-amber-600"
                        : "text-slate-400"
                    }
                  >
                    {state.inputMessage.length}/300
                    {state.inputMessage.length >= 270 &&
                      " (perguntas diretas ajudam na precisão)"}
                  </span>
                </div>
              )}
            </form>
          </div>
        )}

        {/* Disclaimer Legal Estático */}
        <div className="shrink-0 border-slate-100 border-t bg-slate-50/80 px-3 py-1.5 text-center text-[10px] text-slate-400">
          <p className="flex items-center justify-center gap-1 truncate">
            <Info className="h-3 w-3 shrink-0 text-slate-400" />
            <span className="truncate">
              Uso informativo. Consulte o Portal Oficial para fins jurídicos.
            </span>
          </p>
        </div>
      </div>

      {/* Modal de Autenticação */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  ) : null;

  return (
    <>
      {/* Botão de Acionamento Flutuante / Header na Sidebar */}
      <button
        type="button"
        onClick={() => dispatch({ type: "SET_IS_OPEN", payload: true })}
        className="flex min-h-11 w-full cursor-pointer items-center justify-between rounded-lg border border-[#5a72a8]/30 bg-gradient-to-r from-[#5a72a8]/10 to-slate-50 px-3 py-2.5 font-semibold text-slate-900 text-xs shadow-xs transition-all hover:border-[#5a72a8]/50 hover:bg-[#5a72a8]/20 active:scale-[0.99] sm:min-h-0"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-[#5a72a8]" />
          <span>Perguntar aos Dados</span>
        </div>
      </button>

      {/* Renderização da Gaveta com React Portal */}
      {mounted && drawerContent
        ? createPortal(drawerContent, document.body)
        : null}
    </>
  );
}

export function AssistantChatDrawer(props: AssistantChatDrawerProps) {
  return (
    <AssistantProvider portalSlug={props.portalSlug} ano={props.ano}>
      <AssistantChatDrawerContent {...props} />
    </AssistantProvider>
  );
}
