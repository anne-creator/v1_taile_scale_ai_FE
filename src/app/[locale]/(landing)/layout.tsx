import { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';

import { envConfigs } from '@/config';
import { getThemeLayout } from '@/core/theme';
import { LocaleDetector, TopBanner } from '@/components/custom';
import {
  Footer as FooterType,
  Header as HeaderType,
} from '@/shared/types/blocks/landing';

export default async function LandingLayout({
  children,
}: {
  children: ReactNode;
}) {
  // load page data
  const t = await getTranslations('landing');

  // load layout component
  const Layout = await getThemeLayout('landing');

  // header and footer from locale; override brand with env so NEXT_PUBLIC_APP_NAME is single source of truth
  const rawHeader = t.raw('header') as HeaderType;
  const rawFooter = t.raw('footer') as FooterType;
  const header: HeaderType = {
    ...rawHeader,
    brand: rawHeader.brand
      ? {
          ...rawHeader.brand,
          title: envConfigs.app_name || rawHeader.brand.title,
          logo: rawHeader.brand.logo
            ? {
                ...rawHeader.brand.logo,
                src: envConfigs.app_logo || rawHeader.brand.logo.src,
                alt: envConfigs.app_name || rawHeader.brand.logo.alt,
              }
            : undefined,
        }
      : undefined,
  };
  const footer: FooterType = {
    ...rawFooter,
    brand: rawFooter.brand
      ? {
          ...rawFooter.brand,
          title: envConfigs.app_name || rawFooter.brand.title,
          logo: rawFooter.brand.logo
            ? {
                ...rawFooter.brand.logo,
                src: envConfigs.app_logo || rawFooter.brand.logo.src,
                alt: envConfigs.app_name || rawFooter.brand.logo.alt,
              }
            : undefined,
        }
      : undefined,
  };

  return (
    <Layout header={header} footer={footer}>
      <LocaleDetector />
      {header.topbanner && header.topbanner.text && (
        <TopBanner
          id="topbanner"
          text={header.topbanner?.text}
          buttonText={header.topbanner?.buttonText}
          href={header.topbanner?.href}
          target={header.topbanner?.target}
          closable
          rememberDismiss
          dismissedExpiryDays={header.topbanner?.dismissedExpiryDays ?? 1}
        />
      )}
      {children}
    </Layout>
  );
}
