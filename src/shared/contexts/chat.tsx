'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { UIMessage, UseChatHelpers } from '@ai-sdk/react';
import { toast } from 'sonner';

import { PromptInputMessage } from '@/components/custom/ai/prompt-input';
import { Chat } from '@/shared/types/chat';

/**
 * Chat Context - Global Chat State Provider
 *
 * Following code_principle.md: Provider uses { state, actions } interface
 */

// ============================================================================
// Types
// ============================================================================

export interface ChatState {
  chat: Chat | null;
  chats: Chat[];
  createChatStatus: UseChatHelpers<UIMessage>['status'] | undefined;
  createChatError: string | null;
}

export interface ChatActions {
  setChat: (chat: Chat | null) => void;
  setChats: (chats: Chat[]) => void;
  createNewChat: (
    message: PromptInputMessage,
    body: Record<string, any>
  ) => Promise<Chat | null>;
  clearCreateChatError: () => void;
}

export interface ChatContextValue {
  state: ChatState;
  actions: ChatActions;
}

// Legacy flat interface for backward compatibility
export interface ContextValue extends ChatState, ChatActions {}

// ============================================================================
// Context
// ============================================================================

const ChatContext = createContext<ChatContextValue | null>(null);

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access Chat context
 *
 * Recommended usage (following code_principle.md):
 * ```tsx
 * const { state, actions } = useChatContext();
 * // state.chat, actions.createNewChat()
 * ```
 *
 * Legacy usage (still supported):
 * ```tsx
 * const { chat, setChat, chats, setChats } = useChatContext();
 * ```
 */
export const useChatContext = (): ContextValue => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatContextProvider');
  }

  // Return flattened interface for backward compatibility
  return {
    ...context.state,
    ...context.actions,
  };
};

/**
 * Hook to access Chat context with { state, actions } interface
 * Preferred usage following code_principle.md
 */
export const useChatContextValue = (): ChatContextValue => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContextValue must be used within a ChatContextProvider');
  }
  return context;
};

// ============================================================================
// Provider
// ============================================================================

export const ChatContextProvider = ({ children }: { children: ReactNode }) => {
  // Current chat
  const [chat, setChat] = useState<Chat | null>(null);

  // User chats list
  const [chats, setChatsState] = useState<Chat[]>([]);

  // Create chat state
  const [createChatStatus, setCreateChatStatus] = useState<
    UseChatHelpers<UIMessage>['status'] | undefined
  >();
  const [createChatError, setCreateChatError] = useState<string | null>(null);

  // Actions
  const setChats = useCallback((newChats: Chat[]) => {
    setChatsState(newChats);
  }, []);

  const createNewChat = useCallback(
    async (
      message: PromptInputMessage,
      body: Record<string, any>
    ): Promise<Chat | null> => {
      setCreateChatStatus('submitted');
      setCreateChatError(null);

      try {
        const resp: Response = await fetch('/api/chat/new', {
          method: 'POST',
          body: JSON.stringify({ message, body }),
        });

        if (!resp.ok) {
          throw new Error(`request failed with status: ${resp.status}`);
        }

        const { code, message: errorMessage, data } = await resp.json();
        if (code !== 0) {
          throw new Error(errorMessage);
        }

        const { id } = data;
        if (!id) {
          throw new Error('failed to create chat');
        }

        // Add new chat to the list
        setChatsState((prevChats) => [data, ...prevChats]);

        setCreateChatStatus(undefined);
        return data as Chat;
      } catch (e: any) {
        const errorMsg =
          e instanceof Error ? e.message : 'request failed, please try again';
        setCreateChatStatus('error');
        setCreateChatError(errorMsg);
        toast.error(errorMsg);
        return null;
      }
    },
    []
  );

  const clearCreateChatError = useCallback(() => {
    setCreateChatStatus(undefined);
    setCreateChatError(null);
  }, []);

  // Build context value
  const state: ChatState = useMemo(
    () => ({
      chat,
      chats,
      createChatStatus,
      createChatError,
    }),
    [chat, chats, createChatStatus, createChatError]
  );

  const actions: ChatActions = useMemo(
    () => ({
      setChat,
      setChats,
      createNewChat,
      clearCreateChatError,
    }),
    [setChat, setChats, createNewChat, clearCreateChatError]
  );

  const value: ChatContextValue = useMemo(
    () => ({ state, actions }),
    [state, actions]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
