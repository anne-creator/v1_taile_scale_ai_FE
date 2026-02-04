'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

/**
 * UI Context - Global UI State Provider
 * 
 * Following code_principle.md: Provider uses { state, actions } interface
 */

// State interface
export interface UIState {
  isShowSignModal: boolean;
  isShowPaymentModal: boolean;
  configs: Record<string, string>;
}

// Actions interface
export interface UIActions {
  setIsShowSignModal: (show: boolean) => void;
  setIsShowPaymentModal: (show: boolean) => void;
  fetchConfigs: () => Promise<void>;
}

// Combined context type following { state, actions } pattern
export interface UIContextValue {
  state: UIState;
  actions: UIActions;
}

// Legacy flat interface for backward compatibility
export interface UIContextType extends UIState, UIActions {}

const UIContext = createContext<UIContextValue | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  const [isShowSignModal, setIsShowSignModal] = useState(false);
  const [isShowPaymentModal, setIsShowPaymentModal] = useState(false);
  const [configs, setConfigs] = useState<Record<string, string>>({});

  const fetchConfigs = useCallback(async () => {
    try {
      const resp = await fetch('/api/config/get-configs', {
        method: 'POST',
      });
      if (!resp.ok) {
        throw new Error(`fetch failed with status: ${resp.status}`);
      }
      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(message);
      }

      setConfigs(data);
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('fetch configs failed:', e);
      }
    }
  }, []);

  const state: UIState = useMemo(
    () => ({
      isShowSignModal,
      isShowPaymentModal,
      configs,
    }),
    [isShowSignModal, isShowPaymentModal, configs]
  );

  const actions: UIActions = useMemo(
    () => ({
      setIsShowSignModal,
      setIsShowPaymentModal,
      fetchConfigs,
    }),
    [fetchConfigs]
  );

  const value: UIContextValue = useMemo(
    () => ({ state, actions }),
    [state, actions]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

/**
 * Hook to access UI context
 * 
 * Recommended usage (following code_principle.md):
 * ```tsx
 * const { state, actions } = useUI();
 * // state.isShowSignModal, actions.setIsShowSignModal()
 * ```
 * 
 * Legacy usage (still supported for backward compatibility):
 * ```tsx
 * const { isShowSignModal, setIsShowSignModal } = useUI();
 * ```
 */
export function useUI(): UIContextType {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  
  // Return flattened interface for backward compatibility
  // while the internal structure follows { state, actions } pattern
  return {
    ...context.state,
    ...context.actions,
  };
}

/**
 * Hook to access UI context with { state, actions } interface
 * Preferred usage following code_principle.md
 */
export function useUIContext(): UIContextValue {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUIContext must be used within a UIProvider');
  }
  return context;
}
