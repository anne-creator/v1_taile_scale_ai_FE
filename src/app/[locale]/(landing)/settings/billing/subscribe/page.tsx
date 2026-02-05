import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

import { envConfigs } from '@/config';
import { Empty } from '@/components/custom';
import { getUserInfo } from '@/shared/models/user';

/**
 * Server-side checkout page.
 * Creates a Stripe checkout session and redirects the user directly to Stripe.
 * This allows the billing page's "Subscribe" button to trigger checkout
 * without going through the pricing page first.
 */
export default async function SubscribePage() {
  const user = await getUserInfo();
  if (!user) {
    return <Empty message="no auth, please sign in" />;
  }

  // Forward cookies so the checkout API can authenticate the user
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  try {
    const resp = await fetch(`${envConfigs.app_url}/api/payment/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      body: JSON.stringify({ product_id: 'pro-monthly' }),
    });

    const result = await resp.json();

    if (result.code !== 0 || !result.data?.checkoutUrl) {
      // If user already has an active subscription, redirect to billing
      if (
        result.message?.includes('subscription') ||
        result.message?.includes('active')
      ) {
        redirect('/settings/billing');
      }
      return (
        <Empty
          message={result.message || 'Failed to create checkout session'}
        />
      );
    }

    redirect(result.data.checkoutUrl);
  } catch (error: any) {
    // redirect() throws a NEXT_REDIRECT error internally, re-throw it
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    return <Empty message={error.message || 'checkout failed'} />;
  }
}
