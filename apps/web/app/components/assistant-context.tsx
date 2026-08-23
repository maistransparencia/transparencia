"use client";

import type React from "react";
import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";
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

function getStorageKey(portalSlug?: string): string {
  const slug = portalSlug || "porciuncula_prefeitura";
  return `transparenciaweb_assistant_conversations_${slug}`;
}

function getLegacyStorageKeys(portalSlug?: string): string[] {
  const slug = portalSlug || "porciuncula_prefeitura";
  return [
    `transparenciaweb_assistant_conversations_${slug}_2026`,
    `transparenciaweb_assistant_conversations_${slug}_2025`,
    `transparenciaweb_assistant_chat_${slug}_2026`,
    `transparenciaweb_assistant_chat_${slug}_2025`,
    `transparenciaweb_assistant_chat_${slug}`,
  ];
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

function generateConversationTitle(userMessageText: string): string {
  const clean = userMessageText.trim().replace(/\s+/g, " ");
  if (!clean) return "Nova conversa";
  return clean.length > 32 ? `${clean.slice(0, 30)}...` : clean;
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

function filterValidConversations(parsedConvs: unknown[]): ChatConversation[] {
  const validConvs: ChatConversation[] = [];
  for (const conv of parsedConvs) {
    if (
      conv &&
      typeof conv === "object" &&
      typeof (conv as Record<string, unknown>).id === "string" &&
      Array.isArray((conv as Record<string, unknown>).messages)
    ) {
      const c = conv as Record<string, unknown>;
      const validMsgs: ChatMessage[] = [];
      for (const msg of c.messages as unknown[]) {
        const s = sanitizeChatMessage(msg);
        if (s) validMsgs.push(s);
      }
      if (validMsgs.length > 0) {
        validConvs.push({
          id: c.id as string,
          title: typeof c.title === "string" ? c.title : "Conversa",
          createdAt:
            typeof c.createdAt === "string"
              ? c.createdAt
              : new Date().toISOString(),
          updatedAt:
            typeof c.updatedAt === "string"
              ? c.updatedAt
              : new Date().toISOString(),
          messages: validMsgs,
        });
      }
    }
  }
  return validConvs;
}

function getInitialState(
  portalSlug?: string,
  welcomeMessage?: ChatMessage,
): AssistantState {
  const welcome = createWelcomeMessage(welcomeMessage);
  const now = new Date().toISOString();
  const defaultConv: ChatConversation = {
    id: "conv-default",
    title: "Nova conversa",
    createdAt: now,
    updatedAt: now,
    messages: [welcome],
  };

  const defaultState: AssistantState = {
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

  if (typeof window === "undefined") return defaultState;

  try {
    const storageKey = getStorageKey(portalSlug);
    const savedNew = localStorage.getItem(storageKey);
    if (savedNew) {
      const parsedConvs = JSON.parse(savedNew) as unknown[];
      if (Array.isArray(parsedConvs) && parsedConvs.length > 0) {
        const validConvs = filterValidConversations(parsedConvs);
        if (validConvs.length > 0) {
          const activeConv = validConvs[0];
          return {
            ...defaultState,
            conversations: validConvs,
            activeConversationId: activeConv.id,
            messages: activeConv.messages,
            hasInteracted: activeConv.messages.some((m) => m.sender === "user"),
            suggestionsExpanded: !activeConv.messages.some(
              (m) => m.sender === "user",
            ),
          };
        }
      }
    }

    // Tentar ler das chaves legadas e migrar
    const legacyKeys = getLegacyStorageKeys(portalSlug);
    for (const legKey of legacyKeys) {
      const savedLegacy = localStorage.getItem(legKey);
      if (!savedLegacy) continue;

      const parsedLegacy = JSON.parse(savedLegacy) as unknown[];
      if (!Array.isArray(parsedLegacy) || parsedLegacy.length === 0) continue;

      // Se for array de ChatConversation
      if (
        typeof parsedLegacy[0] === "object" &&
        parsedLegacy[0] !== null &&
        "messages" in (parsedLegacy[0] as Record<string, unknown>)
      ) {
        const validConvs = filterValidConversations(parsedLegacy);
        if (validConvs.length > 0) {
          localStorage.setItem(storageKey, JSON.stringify(validConvs));
          localStorage.removeItem(legKey);
          const activeConv = validConvs[0];
          return {
            ...defaultState,
            conversations: validConvs,
            activeConversationId: activeConv.id,
            messages: activeConv.messages,
            hasInteracted: activeConv.messages.some((m) => m.sender === "user"),
            suggestionsExpanded: !activeConv.messages.some(
              (m) => m.sender === "user",
            ),
          };
        }
      }

      // Se for array simples de ChatMessage[]
      const validLegacyMsgs: ChatMessage[] = [];
      for (const msg of parsedLegacy) {
        const s = sanitizeChatMessage(msg);
        if (s) validLegacyMsgs.push(s);
      }
      if (validLegacyMsgs.length > 0) {
        const firstUserMsg = validLegacyMsgs.find((m) => m.sender === "user");
        const title = firstUserMsg
          ? generateConversationTitle(firstUserMsg.text)
          : "Conversa anterior";
        const migratedConv: ChatConversation = {
          id: `conv-legacy-${Date.now()}`,
          title,
          createdAt: now,
          updatedAt: now,
          messages: validLegacyMsgs,
        };

        localStorage.setItem(storageKey, JSON.stringify([migratedConv]));
        localStorage.removeItem(legKey);
        return {
          ...defaultState,
          conversations: [migratedConv],
          activeConversationId: migratedConv.id,
          messages: migratedConv.messages,
          hasInteracted: migratedConv.messages.some((m) => m.sender === "user"),
          suggestionsExpanded: !migratedConv.messages.some(
            (m) => m.sender === "user",
          ),
        };
      }
    }
  } catch (_e) {}

  return defaultState;
}

function saveConversationsToStorage(
  portalSlug: string | undefined,
  conversations: ChatConversation[],
) {
  if (typeof window === "undefined") return;
  if (conversations.length === 0) return;

  try {
    const storageKey = getStorageKey(portalSlug);
    const cleanConvs = conversations.map((c) => ({
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
      const targetExists = state.conversations.some((c) => c.id === activeId);

      let conversationsToProcess = state.conversations;
      let effectiveActiveId = activeId;

      if (!targetExists || conversationsToProcess.length === 0) {
        const welcome = createWelcomeMessage();
        const fallbackConv: ChatConversation = {
          id: activeId || `conv-${Date.now()}`,
          title: "Nova conversa",
          createdAt: now,
          updatedAt: now,
          messages: [welcome],
        };
        conversationsToProcess = [fallbackConv, ...state.conversations];
        effectiveActiveId = fallbackConv.id;
      }

      const updatedConversations = conversationsToProcess.map((conv) => {
        if (conv.id !== effectiveActiveId) return conv;

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

      const activeConv = updatedConversations.find(
        (c) => c.id === effectiveActiveId,
      );
      const currentMessages = activeConv
        ? activeConv.messages
        : [...state.messages, action.payload];
      const isFirstUserMessage =
        action.payload.sender === "user" && !state.hasInteracted;

      return {
        ...state,
        conversations: updatedConversations,
        activeConversationId: effectiveActiveId,
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
        const fresh = getInitialState(undefined, undefined);
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
      const fresh = getInitialState(undefined, action.payload?.welcomeMessage);
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

export function AssistantProvider({
  children,
  portalSlug,
}: AssistantProviderProps) {
  const [state, dispatch] = useReducer(assistantReducer, undefined, () =>
    getInitialState(portalSlug),
  );
  const isMountedRef = useRef(false);

  // Persistir conversas ativas no localStorage sempre que houver alteração
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    saveConversationsToStorage(portalSlug, state.conversations);
  }, [state.conversations, portalSlug]);

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
        const storageKey = getStorageKey(portalSlug);
        const legacyKeys = getLegacyStorageKeys(portalSlug);
        localStorage.removeItem(storageKey);
        for (const k of legacyKeys) {
          localStorage.removeItem(k);
        }
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
