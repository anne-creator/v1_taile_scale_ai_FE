/**
 * Business Logic Hooks
 *
 * Following code_principle.md:
 * - Independent hooks for single-page/local usage
 * - Each hook returns { actions, isLoading, error } or similar interface
 */

export { useCheckout } from './use-checkout';
export type { UseCheckoutReturn, CheckoutActions, CheckoutResult } from './use-checkout';

export { useSubscribe } from './use-subscribe';
export type { UseSubscribeReturn, SubscribeActions } from './use-subscribe';

export { useChatHistory } from './use-chat-history';
export type {
  UseChatHistoryReturn,
  ChatHistoryActions,
  ChatHistoryData,
  ChatListItem,
} from './use-chat-history';
