import { StripeProvider } from '@/extensions/payment/stripe';
import { respData, respErr } from '@/shared/lib/resp';
import { getAllConfigs } from '@/shared/models/config';
import { getUserInfo } from '@/shared/models/user';
import { getPaymentService } from '@/shared/services/payment';

/**
 * Check if current user is eligible for promotion codes
 * Returns whether the user is a new Stripe customer (no prior transactions)
 */
export async function GET() {
  try {
    // Get signed in user
    const user = await getUserInfo();
    if (!user || !user.email) {
      // Not logged in users are considered eligible (they'll see the promo)
      return respData({ eligible: true, reason: 'not_logged_in' });
    }

    // Get configs to check if we have promotion codes configured
    const configs = await getAllConfigs();
    const stripePromotionCodes = configs.stripe_promotion_codes;

    // If no promotion codes configured, everyone is "eligible" (no promo to show anyway)
    if (!stripePromotionCodes) {
      return respData({ eligible: false, reason: 'no_promo_configured' });
    }

    // Get payment provider
    const paymentProviderName = configs.default_payment_provider;
    if (paymentProviderName !== 'stripe') {
      // Non-stripe providers don't have this restriction
      return respData({ eligible: true, reason: 'non_stripe_provider' });
    }

    const paymentService = await getPaymentService();
    const paymentProvider = paymentService.getProvider('stripe');

    if (!paymentProvider) {
      return respData({ eligible: true, reason: 'provider_not_found' });
    }

    // Check if user is a new customer
    const stripeProvider = paymentProvider as StripeProvider;
    const isNewCustomer = await stripeProvider.isNewCustomer(user.email);

    return respData({
      eligible: isNewCustomer,
      reason: isNewCustomer ? 'new_customer' : 'has_prior_transactions',
    });
  } catch (e: any) {
    console.log('check promo eligibility failed:', e);
    // On error, default to showing promo (better UX)
    return respData({ eligible: true, reason: 'check_failed' });
  }
}
