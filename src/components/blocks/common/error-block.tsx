'use client';

import Image from 'next/image';
import Link from 'next/link';

import { envConfigs } from '@/config';
import { SmartIcon } from '@/components/custom/smart-icon';
import { Button } from '@/components/ui/button';

interface ErrorBlockProps {
  title: string;
  description?: string;
  showLogo?: boolean;
  showBackButton?: boolean;
  backButtonText?: string;
  backButtonHref?: string;
}

export function ErrorBlock({
  title,
  description,
  showLogo = false,
  showBackButton = false,
  backButtonText = 'Back to Home',
  backButtonHref = '/',
}: ErrorBlockProps) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      {showLogo && (
        <Image
          src={envConfigs.app_logo}
          alt={envConfigs.app_name}
          width={80}
          height={80}
        />
      )}
      <h1 className="text-h1">{title}</h1>
      {description && (
        <p className="text-muted-foreground">{description}</p>
      )}
      {showBackButton && (
        <Button asChild className="mt-4">
          <Link href={backButtonHref}>
            <SmartIcon name="ArrowLeft" />
            <span>{backButtonText}</span>
          </Link>
        </Button>
      )}
    </div>
  );
}
