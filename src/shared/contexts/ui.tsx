'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

export interface UIContextType {
  isShowSignModal: boolean;
  setIsShowSignModal: (show: boolean) => void;
  isShowPaymentModal: boolean;
  setIsShowPaymentModal: (show: boolean) => void;
  configs: Record<string, string>;
  fetchConfigs: () => Promise<void>;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

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

  const value = useMemo(
    () => ({
      isShowSignModal,
      setIsShowSignModal,
      isShowPaymentModal,
      setIsShowPaymentModal,
      configs,
      fetchConfigs,
    }),
    [
      isShowSignModal,
      isShowPaymentModal,
      configs,
      fetchConfigs,
    ]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
