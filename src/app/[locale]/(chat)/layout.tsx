'use client';

import { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { ChatLibrary } from '@/components/blocks/chat/library';
import { LocaleDetector } from '@/components/custom';
import { DashboardLayout } from '@/components/blocks/dashboard';
import { ChatContextProvider } from '@/shared/contexts/chat';
import { Sidebar as SidebarType } from '@/shared/types/blocks/dashboard';

export default function ChatLayout({ children }: { children: ReactNode }) {
  const t = useTranslations('ai.chat');

  const sidebar: SidebarType = t.raw('sidebar');

  sidebar.library = <ChatLibrary />;

  return (
    <ChatContextProvider>
      <DashboardLayout sidebar={sidebar}>
        <LocaleDetector />
        {children}
      </DashboardLayout>
    </ChatContextProvider>
  );
}
