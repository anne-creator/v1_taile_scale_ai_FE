import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { envConfigs } from '@/config';

export function BuiltWith() {
  return (
    <Button asChild variant="outline" size="sm" className="hover:bg-primary/10">
      <Link href="/" target="_self">
        Built with ❤️ {envConfigs.app_name || 'TaleCraft'}
      </Link>
    </Button>
  );
}
