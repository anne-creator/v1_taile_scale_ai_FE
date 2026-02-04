'use client';

import { useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { useRouter } from '@/core/i18n/navigation';
import { LocaleSelector } from '@/components/custom';
import { PromptInputMessage } from '@/components/custom/ai/prompt-input';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/providers/auth-provider';
import { useUI } from '@/providers/ui-provider';
import { useChatContext } from '@/shared/contexts/chat';

import { ChatInput } from './input';

/**
 * ChatGenerator Block (Level 4)
 *
 * Following code_principle.md:
 * - Block only CONSUME context (call actions), not MANAGE state for fetch logic
 * - All createNewChat logic is managed by ChatContext
 * - This component is purely for UI rendering
 */

export function ChatGenerator() {
  const router = useRouter();
  const locale = useLocale();

  const t = useTranslations('ai.chat.generator');

  const { user } = useAuth();
  const { setIsShowSignModal } = useUI();
  const {
    createChatStatus: status,
    createChatError: error,
    setChat,
    createNewChat,
    clearCreateChatError,
  } = useChatContext();

  const handleSubmit = async (
    message: PromptInputMessage,
    body: Record<string, any>
  ) => {
    // check user sign
    if (!user) {
      setIsShowSignModal(true);
      return;
    }

    // check user input
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);
    if (!(hasText || hasAttachments)) {
      return;
    }

    if (!body.model) {
      toast.error('please select a model');
      return;
    }

    const newChat = await createNewChat(message, body);
    if (newChat?.id) {
      const path = `/chat/${newChat.id}`;
      router.push(path, { locale });
    }
  };

  useEffect(() => {
    setChat(null);
  }, [setChat]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="bg-background sticky top-0 z-10 flex w-full items-center gap-2 px-4 py-3">
        <SidebarTrigger className="size-7" />
        <div className="flex-1"></div>
        <LocaleSelector />
      </header>
      <div className="mx-auto -mt-16 flex h-screen w-full flex-1 flex-col items-center justify-center px-4 pb-6 md:max-w-2xl">
        <h2 className="mb-4 text-center text-3xl font-bold">{t('title')}</h2>
        <ChatInput
          error={error}
          handleSubmit={handleSubmit}
          onInputChange={() => {
            if (status === 'error' || error) {
              clearCreateChatError();
            }
          }}
          status={status}
        />
      </div>
    </div>
  );
}
