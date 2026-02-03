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
    <div className="h-screen w-screen">
      <Header header={header} />
      {children}
    </div>
  );
}
