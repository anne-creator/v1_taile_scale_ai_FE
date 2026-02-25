import { StripeProvider } from '@/extensions/payment/stripe';
import { respData, respErr } from '@/shared/lib/resp';
import { getAllConfigs } from '@/shared/models/config';
import {
  getCurrentSubscription,
  getSubscriptions,
} from '@/shared/models/subscription';
import { getUserInfo } from '@/shared/models/user';
import { getPaymentService } from '@/shared/services/payment';

/**
 * Check if current user is eligible for promotion codes
 * Also returns whether the user has an active subscription
 */
export async function GET() {
  try {
    const user = await getUserInfo();
    if (!user || !user.email) {
      return respData({ eligible: true, reason: 'not_logged_in', hasActiveSubscription: false });
    }

    const currentSubscription = await getCurrentSubscription(user.id);
    const hasActiveSubscription = !!currentSubscription;
    const subscriptionNo = currentSubscription?.subscriptionNo || null;

    // Check local DB for any historical subscription (including canceled/expired)
    const allSubscriptions = await getSubscriptions({ userId: user.id, limit: 1 });
    if (allSubscriptions.length > 0) {
      return respData({
        eligible: false,
        reason: 'has_prior_subscription',
        hasActiveSubscription,
        subscriptionNo,
      });
    }

    const configs = await getAllConfigs();
    const stripePromotionCodes = configs.stripe_promotion_codes;

    if (!stripePromotionCodes) {
      return respData({ eligible: false, reason: 'no_promo_configured', hasActiveSubscription, subscriptionNo });
    }

    const paymentProviderName = configs.default_payment_provider;
    if (paymentProviderName !== 'stripe') {
      return respData({ eligible: true, reason: 'non_stripe_provider', hasActiveSubscription, subscriptionNo });
    }

    const paymentService = await getPaymentService();
    const paymentProvider = paymentService.getProvider('stripe');

    if (!paymentProvider) {
      return respData({ eligible: true, reason: 'provider_not_found', hasActiveSubscription, subscriptionNo });
    }

    const stripeProvider = paymentProvider as StripeProvider;
    const isNewCustomer = await stripeProvider.isNewCustomer(user.email);

    return respData({
      eligible: isNewCustomer,
      reason: isNewCustomer ? 'new_customer' : 'has_prior_transactions',
      hasActiveSubscription,
      subscriptionNo,
    });
  } catch (e: any) {
    console.log('check promo eligibility failed:', e);
    return respData({ eligible: true, reason: 'check_failed', hasActiveSubscription: false, subscriptionNo: null });
  }
}
