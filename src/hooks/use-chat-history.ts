'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

/**
 * Chat History Hook - Fetch Chat List
 *
 * Following code_principle.md:
 * - Hook returns { data, actions, isLoading, error } interface
 * - Self-contained module with API call encapsulated
 * - Can be reused across different components
 */

// ============================================================================
// Types
// ============================================================================

export interface ChatListItem {
  id: string;
  title?: string | null;
  createdAt?: string | Date | null;
  model?: string | null;
  provider?: string | null;
}

export interface ChatListResponse {
  list: ChatListItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ChatHistoryData {
  chats: ChatListItem[];
  total: number;
  hasMore: boolean;
}

export interface ChatHistoryActions {
  fetchChats: (page: number, limit: number) => Promise<void>;
  clearError: () => void;
}

export interface UseChatHistoryReturn {
  data: ChatHistoryData;
  actions: ChatHistoryActions;
  isLoading: boolean;
  error: string | null;
}

// ============================================================================
// Hook
// ============================================================================

export function useChatHistory(): UseChatHistoryReturn {
  const t = useTranslations('ai.chat.history');

  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChats = useCallback(
    async (page: number, limit: number) => {
      setIsLoading(true);
      setError(null);

      try {
        const resp = await fetch('/api/chat/list', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ page, limit }),
        });

        if (!resp.ok) {
          throw new Error(`request failed with status ${resp.status}`);
        }

        const json = (await resp.json()) as {
          code: number;
          message?: string;
          data?: ChatListResponse;
        };

        if (json.code !== 0 || !json.data) {
          throw new Error(json.message || 'unknown error');
        }

        setChats(json.data.list || []);
        setTotal(json.data.total || 0);
        setHasMore(Boolean(json.data.hasMore));
      } catch (err) {
        console.error('fetch chat history failed:', err);
        setError(t('error'));
      } finally {
        setIsLoading(false);
      }
    },
    [t]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const data: ChatHistoryData = useMemo(
    () => ({
      chats,
      total,
      hasMore,
    }),
    [chats, total, hasMore]
  );

  const actions: ChatHistoryActions = useMemo(
    () => ({
      fetchChats,
      clearError,
    }),
    [fetchChats, clearError]
  );

  return {
    data,
    actions,
    isLoading,
    error,
  };
}
