import { ErrorBlock } from '@/components/blocks/common';

export default function NotFoundPage() {
  return (
    <ErrorBlock
      title="Page not found"
      showLogo
      showBackButton
    />
  );
}
