import { ReactNode } from 'react';

import { getThemeBlock } from '@/core/theme';
import {
  Header as HeaderType,
} from '@/shared/types/blocks/landing';

export default async function LandingLayout({
  children,
  header,
}: {
  children: ReactNode;
  header: HeaderType;
}) {
  const Header = await getThemeBlock('header');

  return (
    <div className="min-h-screen w-screen">
      <Header header={header} />
      <main className="pt-14 lg:pt-18">
        {children}
      </main>
    </div>
  );
}
