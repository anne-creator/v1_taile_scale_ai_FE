'use client';

import { useState } from 'react';
import { Loader2, Mail, SendHorizonal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ScrollAnimation } from '@/components/ui/scroll-animation';
import { useSubscribe } from '@/hooks/use-subscribe';
import { cn } from '@/shared/lib/utils';
import type { Section } from '@/shared/types/blocks/landing';

/**
 * Subscribe Block (Level 4)
 *
 * Following code_principle.md:
 * - Block only CONSUME context (call actions), not MANAGE state for fetch logic
 * - Subscription logic is managed by useSubscribe hook
 * - Only local UI state (email input) is managed here (acceptable for form inputs)
 */

export function Subscribe({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  // Local UI state for controlled input (acceptable per code_principle.md L2.5)
  const [email, setEmail] = useState('');
  const { actions, isLoading } = useSubscribe();

  const handleSubscribe = async () => {
    if (!section.submit?.action) {
      return;
    }

    const success = await actions.subscribe(email, section.submit.action);
    if (success) {
      setEmail(''); // Clear input on success
    }
  };

  return (
    <section
      id={section.id}
      className={cn('py-section-md', section.className, className)}
    >
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center">
          <ScrollAnimation>
            <h2 className="text-h2 text-balance">
              {section.title}
            </h2>
          </ScrollAnimation>
          <ScrollAnimation delay={0.15}>
            <p className="mt-4">{section.description}</p>
          </ScrollAnimation>

          <ScrollAnimation delay={0.3}>
            <div className="mx-auto mt-10 max-w-xl overflow-hidden lg:mt-12">
              <div className="bg-background has-[input:focus]:ring-muted relative grid grid-cols-[1fr_auto] items-center overflow-hidden rounded-[calc(var(--radius)+0.75rem)] border pr-3 shadow shadow-zinc-950/5 has-[input:focus]:ring-2">
                <Mail className="text-caption pointer-events-none absolute inset-y-0 left-5 my-auto size-5" />

                <input
                  placeholder={
                    section.submit?.input?.placeholder || 'Enter your email'
                  }
                  className="h-14 w-full bg-transparent pl-12 focus:outline-none"
                  type="email"
                  required
                  aria-required="true"
                  aria-invalid={!email}
                  aria-describedby="email-error"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                {section.submit?.button && (
                  <div className="md:pr-1.5 lg:pr-0">
                    <Button
                      aria-label="submit"
                      className="rounded-(--radius)"
                      onClick={handleSubscribe}
                      disabled={isLoading}
                      type="submit"
                    >
                      {isLoading ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <span className="hidden md:block">
                          {section.submit.button.title}
                        </span>
                      )}
                      <SendHorizonal
                        className="relative mx-auto size-5 md:hidden"
                        strokeWidth={2}
                      />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </ScrollAnimation>
        </div>
      </div>
    </section>
  );
}
