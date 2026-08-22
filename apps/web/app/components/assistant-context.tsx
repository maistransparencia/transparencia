"use client";

import type React from "react";
import { createContext, useContext, useEffect, useReducer } from "react";
import type { AssistantResponse } from "../api/assistant/chat/route";

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  responseObj?: AssistantResponse;
  timestamp: string;
}

export interface ChatConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface AssistantState {
  isOpen: boolean;
  inputMessage: string;
  isLoading: boolean;
  conversations: ChatConversation[];
  activeConversationId: string;
  messages: ChatMessage[];
  showSqlFor: Record<string, boolean>;
  feedbackFor: Record<string, 1 | -1>;
  hasInteracted: boolean;
  suggestionsExpanded: boolean;
}

export type AssistantAction =
  | { type: "SET_IS_OPEN"; payload: boolean }
  | { type: "SET_INPUT_MESSAGE"; payload: string }
  | { type: "SET_IS_LOADING"; payload: boolean }
  | { type: "ADD_MESSAGE"; payload: ChatMessage }
  | { type: "SET_MESSAGES"; payload: ChatMessage[] }
  | { type: "TOGGLE_SQL_FOR"; payload: string }
  | { type: "SET_FEEDBACK_FOR"; payload: { messageId: string; score: 1 | -1 } }
  | { type: "SET_SUGGESTIONS_EXPANDED"; payload: boolean }
  | { type: "RESET_CONVERSATION"; payload: { welcomeMessage: ChatMessage } }
  | { type: "CREATE_CONVERSATION"; payload?: { welcomeMessage?: ChatMessage } }
  | { type: "SELECT_CONVERSATION"; payload: string }
  | { type: "DELETE_CONVERSATION"; payload: string }
  | { type: "RENAME_CONVERSATION"; payload: { id: string; title: string } }
  | {
      type: "CLEAR_ALL_CONVERSATIONS";
      payload?: { welcomeMessage?: ChatMessage };
    }
  | {
      type: "SET_CONVERSATIONS";
      payload: { conversations: ChatConversation[]; activeId?: string };
    };

function getStorageKey(portalSlug?: string, ano?: string): string {
  const slug = portalSlug || "porciuncula_prefeitura";
  const year = ano || "2025";
  return `transparenciaweb_assistant_conversations_${slug}_${year}`;
}

function getLegacyStorageKey(portalSlug?: string, ano?: string): string {
  const slug = portalSlug || "porciuncula_prefeitura";
  const year = ano || "2025";
  return `transparenciaweb_assistant_chat_${slug}_${year}`;
}

function createWelcomeMessage(custom?: ChatMessage): ChatMessage {
  return (
    custom ?? {
      id: "msg-welcome",
      sender: "assistant",
      text: "Olá! Sou o **Assistente Fiscal AI** do Portal da Transparência. Como posso ajudar nas suas consultas?",
      timestamp: "agora",
    }
  );
}

function createInitialState(welcomeMessage?: ChatMessage): AssistantState {
  const welcome = createWelcomeMessage(welcomeMessage);
  const now = new Date().toISOString();
  const defaultConv: ChatConversation = {
    id: "conv-default",
    title: "Nova conversa",
    createdAt: now,
    updatedAt: now,
    messages: [welcome],
  };

  return {
    isOpen: false,
    inputMessage: "",
    isLoading: false,
    conversations: [defaultConv],
    activeConversationId: defaultConv.id,
    messages: defaultConv.messages,
    showSqlFor: {},
    feedbackFor: {},
    hasInteracted: false,
    suggestionsExpanded: true,
  };
}

function generateConversationTitle(userMessageText: string): string {
  const clean = userMessageText.trim().replace(/\s+/g, " ");
  if (!clean) return "Nova conversa";
  return clean.length > 32 ? `${clean.slice(0, 30)}...` : clean;
}

function assistantReducer(
  state: AssistantState,
  action: AssistantAction,
): AssistantState {
  switch (action.type) {
    case "SET_IS_OPEN":
      return { ...state, isOpen: action.payload };

    case "SET_INPUT_MESSAGE":
      return { ...state, inputMessage: action.payload };

    case "SET_IS_LOADING":
      return { ...state, isLoading: action.payload };

    case "ADD_MESSAGE": {
      const activeId = state.activeConversationId;
      const now = new Date().toISOString();
      const updatedConversations = state.conversations.map((conv) => {
        if (conv.id !== activeId) return conv;

        const nextMessages = [...conv.messages, action.payload];
        let nextTitle = conv.title;
        if (
          action.payload.sender === "user" &&
          (conv.title === "Nova conversa" || !conv.title)
        ) {
          nextTitle = generateConversationTitle(action.payload.text);
        }

        return {
          ...conv,
          title: nextTitle,
          updatedAt: now,
          messages: nextMessages,
        };
      });

      const activeConv = updatedConversations.find((c) => c.id === activeId);
      const currentMessages = activeConv
        ? activeConv.messages
        : [...state.messages, action.payload];
      const isFirstUserMessage =
        action.payload.sender === "user" && !state.hasInteracted;

      return {
        ...state,
        conversations: updatedConversations,
        messages: currentMessages,
        hasInteracted: state.hasInteracted || action.payload.sender === "user",
        suggestionsExpanded: isFirstUserMessage
          ? false
          : state.suggestionsExpanded,
      };
    }

    case "SET_MESSAGES": {
      const activeId = state.activeConversationId;
      const updatedConversations = state.conversations.map((conv) =>
        conv.id === activeId
          ? {
              ...conv,
              messages: action.payload,
              updatedAt: new Date().toISOString(),
            }
          : conv,
      );
      return {
        ...state,
        conversations: updatedConversations,
        messages: action.payload,
        hasInteracted: action.payload.some((m) => m.sender === "user"),
        suggestionsExpanded: action.payload.some((m) => m.sender === "user")
          ? false
          : state.suggestionsExpanded,
      };
    }

    case "TOGGLE_SQL_FOR": {
      const msgId = action.payload;
      return {
        ...state,
        showSqlFor: {
          ...state.showSqlFor,
          [msgId]: !state.showSqlFor[msgId],
        },
      };
    }

    case "SET_FEEDBACK_FOR":
      return {
        ...state,
        feedbackFor: {
          ...state.feedbackFor,
          [action.payload.messageId]: action.payload.score,
        },
      };

    case "SET_SUGGESTIONS_EXPANDED":
      return { ...state, suggestionsExpanded: action.payload };

    case "CREATE_CONVERSATION": {
      const now = new Date().toISOString();
      const newId = `conv-${Date.now()}`;
      const welcome = createWelcomeMessage(action.payload?.welcomeMessage);
      const newConv: ChatConversation = {
        id: newId,
        title: "Nova conversa",
        createdAt: now,
        updatedAt: now,
        messages: [welcome],
      };

      return {
        ...state,
        conversations: [newConv, ...state.conversations],
        activeConversationId: newId,
        messages: newConv.messages,
        inputMessage: "",
        hasInteracted: false,
        suggestionsExpanded: true,
      };
    }

    case "SELECT_CONVERSATION": {
      const targetId = action.payload;
      const targetConv = state.conversations.find((c) => c.id === targetId);
      if (!targetConv) return state;

      return {
        ...state,
        activeConversationId: targetId,
        messages: targetConv.messages,
        hasInteracted: targetConv.messages.some((m) => m.sender === "user"),
        suggestionsExpanded: !targetConv.messages.some(
          (m) => m.sender === "user",
        ),
      };
    }

    case "DELETE_CONVERSATION": {
      const idToDelete = action.payload;
      const remaining = state.conversations.filter((c) => c.id !== idToDelete);

      if (remaining.length === 0) {
        const fresh = createInitialState();
        return {
          ...fresh,
          isOpen: state.isOpen,
        };
      }

      const nextActiveId =
        state.activeConversationId === idToDelete
          ? remaining[0].id
          : state.activeConversationId;
      const nextActiveConv =
        remaining.find((c) => c.id === nextActiveId) || remaining[0];

      return {
        ...state,
        conversations: remaining,
        activeConversationId: nextActiveConv.id,
        messages: nextActiveConv.messages,
        hasInteracted: nextActiveConv.messages.some((m) => m.sender === "user"),
        suggestionsExpanded: !nextActiveConv.messages.some(
          (m) => m.sender === "user",
        ),
      };
    }

    case "RENAME_CONVERSATION": {
      const { id, title } = action.payload;
      const cleanTitle = title.trim() || "Nova conversa";
      const updated = state.conversations.map((c) =>
        c.id === id
          ? { ...c, title: cleanTitle, updatedAt: new Date().toISOString() }
          : c,
      );
      return {
        ...state,
        conversations: updated,
      };
    }

    case "CLEAR_ALL_CONVERSATIONS": {
      const fresh = createInitialState(action.payload?.welcomeMessage);
      return {
        ...fresh,
        isOpen: state.isOpen,
      };
    }

    case "RESET_CONVERSATION": {
      const activeId = state.activeConversationId;
      const welcome = createWelcomeMessage(action.payload.welcomeMessage);
      const now = new Date().toISOString();
      const updated = state.conversations.map((c) =>
        c.id === activeId
          ? {
              ...c,
              title: "Nova conversa",
              updatedAt: now,
              messages: [welcome],
            }
          : c,
      );
      return {
        ...state,
        conversations: updated,
        messages: [welcome],
        inputMessage: "",
        hasInteracted: false,
        suggestionsExpanded: true,
      };
    }

    case "SET_CONVERSATIONS": {
      const { conversations, activeId } = action.payload;
      if (!conversations || conversations.length === 0) return state;

      const targetActiveId =
        activeId && conversations.some((c) => c.id === activeId)
          ? activeId
          : conversations[0].id;
      const activeConv =
        conversations.find((c) => c.id === targetActiveId) || conversations[0];

      return {
        ...state,
        conversations,
        activeConversationId: activeConv.id,
        messages: activeConv.messages,
        hasInteracted: activeConv.messages.some((m) => m.sender === "user"),
        suggestionsExpanded: !activeConv.messages.some(
          (m) => m.sender === "user",
        ),
      };
    }

    default:
      return state;
  }
}

interface AssistantContextType {
  state: AssistantState;
  dispatch: React.Dispatch<AssistantAction>;
  resetConversation: (welcomeMessage: ChatMessage) => void;
  createConversation: (welcomeMessage?: ChatMessage) => void;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
  clearAllConversations: (welcomeMessage?: ChatMessage) => void;
}

const AssistantContext = createContext<AssistantContextType | null>(null);

export interface AssistantProviderProps {
  children: React.ReactNode;
  portalSlug?: string;
  ano?: string;
}

function sanitizeChatMessage(raw: unknown): ChatMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;

  if (
    typeof m.id === "string" &&
    (m.sender === "user" || m.sender === "assistant") &&
    typeof m.text === "string"
  ) {
    const responseObjRaw = m.responseObj as Record<string, unknown> | undefined;
    return {
      id: m.id,
      sender: m.sender as "user" | "assistant",
      text: m.text,
      timestamp: typeof m.timestamp === "string" ? m.timestamp : "agora",
      responseObj:
        responseObjRaw && typeof responseObjRaw === "object"
          ? {
              answer:
                typeof responseObjRaw.answer === "string"
                  ? responseObjRaw.answer
                  : m.text,
              metrics: Array.isArray(responseObjRaw.metrics)
                ? responseObjRaw.metrics
                : undefined,
              chartData: Array.isArray(responseObjRaw.chartData)
                ? responseObjRaw.chartData
                : undefined,
              chartType: responseObjRaw.chartType as
                | "bar"
                | "donut"
                | "metric"
                | undefined,
              sqlQuery:
                typeof responseObjRaw.sqlQuery === "string"
                  ? responseObjRaw.sqlQuery
                  : undefined,
            }
          : undefined,
    };
  }
  return null;
}

export function AssistantProvider({
  children,
  portalSlug,
  ano,
}: AssistantProviderProps) {
  const [state, dispatch] = useReducer(assistantReducer, undefined, () =>
    createInitialState(),
  );
  const storageKey = getStorageKey(portalSlug, ano);
  const legacyKey = getLegacyStorageKey(portalSlug, ano);

  // Restaurar do localStorage ao montar (com fallback de migração do formato legado)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedNew = localStorage.getItem(storageKey);
      if (savedNew) {
        const parsedConvs = JSON.parse(savedNew) as ChatConversation[];
        if (Array.isArray(parsedConvs) && parsedConvs.length > 0) {
          const validConvs: ChatConversation[] = [];
          for (const conv of parsedConvs) {
            if (
              conv &&
              typeof conv.id === "string" &&
              Array.isArray(conv.messages)
            ) {
              const validMsgs: ChatMessage[] = [];
              for (const msg of conv.messages) {
                const s = sanitizeChatMessage(msg);
                if (s) validMsgs.push(s);
              }
              if (validMsgs.length > 0) {
                validConvs.push({
                  id: conv.id,
                  title:
                    typeof conv.title === "string" ? conv.title : "Conversa",
                  createdAt:
                    typeof conv.createdAt === "string"
                      ? conv.createdAt
                      : new Date().toISOString(),
                  updatedAt:
                    typeof conv.updatedAt === "string"
                      ? conv.updatedAt
                      : new Date().toISOString(),
                  messages: validMsgs,
                });
              }
            }
          }
          if (validConvs.length > 0) {
            dispatch({
              type: "SET_CONVERSATIONS",
              payload: { conversations: validConvs },
            });
            return;
          }
        }
      }

      // Fallback: Migrar formato legado `transparenciaweb_assistant_chat_${slug}_${year}`
      const savedLegacy = localStorage.getItem(legacyKey);
      if (savedLegacy) {
        const parsedLegacy = JSON.parse(savedLegacy) as unknown[];
        if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
          const validLegacyMsgs: ChatMessage[] = [];
          for (const msg of parsedLegacy) {
            const s = sanitizeChatMessage(msg);
            if (s) validLegacyMsgs.push(s);
          }
          if (validLegacyMsgs.length > 0) {
            const firstUserMsg = validLegacyMsgs.find(
              (m) => m.sender === "user",
            );
            const title = firstUserMsg
              ? generateConversationTitle(firstUserMsg.text)
              : "Conversa anterior";
            const now = new Date().toISOString();
            const migratedConv: ChatConversation = {
              id: `conv-legacy-${Date.now()}`,
              title,
              createdAt: now,
              updatedAt: now,
              messages: validLegacyMsgs,
            };

            dispatch({
              type: "SET_CONVERSATIONS",
              payload: { conversations: [migratedConv] },
            });

            // Persistir imediatamente no novo formato e remover a chave antiga
            localStorage.setItem(storageKey, JSON.stringify([migratedConv]));
            localStorage.removeItem(legacyKey);
          }
        }
      }
    } catch (_e) {}
  }, [storageKey, legacyKey]);

  // Persistir conversas ativas no localStorage a cada atualização
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (state.conversations.length === 0) return;

    try {
      const cleanConvs = state.conversations.map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        messages: c.messages.map((m) => ({
          id: m.id,
          sender: m.sender,
          text: m.text,
          timestamp: m.timestamp,
          responseObj: m.responseObj
            ? {
                answer: m.responseObj.answer,
                metrics: Array.isArray(m.responseObj.metrics)
                  ? m.responseObj.metrics
                  : undefined,
                chartData: Array.isArray(m.responseObj.chartData)
                  ? m.responseObj.chartData
                  : undefined,
                chartType: m.responseObj.chartType,
                sqlQuery:
                  typeof m.responseObj.sqlQuery === "string"
                    ? m.responseObj.sqlQuery
                    : undefined,
              }
            : undefined,
        })),
      }));

      localStorage.setItem(storageKey, JSON.stringify(cleanConvs));
    } catch (_e) {}
  }, [state.conversations, storageKey]);

  const resetConversation = (welcomeMessage: ChatMessage) => {
    dispatch({ type: "RESET_CONVERSATION", payload: { welcomeMessage } });
  };

  const createConversation = (welcomeMessage?: ChatMessage) => {
    dispatch({ type: "CREATE_CONVERSATION", payload: { welcomeMessage } });
  };

  const selectConversation = (id: string) => {
    dispatch({ type: "SELECT_CONVERSATION", payload: id });
  };

  const deleteConversation = (id: string) => {
    dispatch({ type: "DELETE_CONVERSATION", payload: id });
  };

  const renameConversation = (id: string, title: string) => {
    dispatch({ type: "RENAME_CONVERSATION", payload: { id, title } });
  };

  const clearAllConversations = (welcomeMessage?: ChatMessage) => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem(storageKey);
        localStorage.removeItem(legacyKey);
      }
    } catch (_e) {}
    dispatch({ type: "CLEAR_ALL_CONVERSATIONS", payload: { welcomeMessage } });
  };

  return (
    <AssistantContext.Provider
      value={{
        state,
        dispatch,
        resetConversation,
        createConversation,
        selectConversation,
        deleteConversation,
        renameConversation,
        clearAllConversations,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistantContext(): AssistantContextType {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error(
      "useAssistantContext must be used within an AssistantProvider",
    );
  }
  return context;
}
