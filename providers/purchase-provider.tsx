import { router } from 'expo-router';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

import { AnimatedLoadingPopup } from '@/components/ui/animated-loading-popup';
import { PaymentFailedToast } from '@/components/ui/payment-failed-toast';
import { UnlockAnimationOverlay } from '@/components/ui/unlock-animation-overlay';
import { useCatalog } from '@/providers/catalog-provider';
import { apiUrl } from '@/lib/api';
import { useNotifications } from '@/providers/notification-provider';
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '@/lib/auth-tokens';
import { getDeviceId } from '@/lib/device-id';
import { isCompAccount } from '@/lib/comp-account';

export type PurchaseInfo = {
  expiresAt: string | null;
};

type PurchaseContextValue = {
  purchasedCategories: Record<string, PurchaseInfo>;
  purchasedVideos: Record<string, PurchaseInfo>;
  purchaseCategory: (category: string) => void;
  purchaseVideo: (videoTitle: string) => void;
  syncPurchases: () => Promise<void>;
  notifyPaymentSuccess: (target: string, kind: string) => void;
  notifyPaymentFailure: () => void;
  hasCategoryAccess: (category?: string) => boolean;
  hasVideoAccess: (videoTitle: string, options?: { category?: string; isFree?: boolean }) => boolean;
  getExpirationDate: (kind: 'video' | 'category', target: string) => string | null;
};

const PurchaseContext = createContext<PurchaseContextValue | null>(null);

function PurchaseProviderInner({ children }: { children: ReactNode }) {
  const { isInCategoryPack } = useCatalog();
  const { refresh: refreshNotifications } = useNotifications();
  const [purchasedCategories, setPurchasedCategories] = useState<Record<string, PurchaseInfo>>({});
  const [purchasedVideos, setPurchasedVideos] = useState<Record<string, PurchaseInfo>>({});
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [pendingUnlock, setPendingUnlock] = useState<{ title: string; kind: string } | null>(null);
  const [paymentFailed, setPaymentFailed] = useState(false);

  const notifyPaymentSuccess = (target: string, kind: string) => {
    if (target) setPendingUnlock({ title: target, kind: kind || 'video' });
    void syncPurchases();
    void refreshNotifications();
  };

  const notifyPaymentFailure = () => {
    setPaymentFailed(true);
  };

  const tryRefreshAccessToken = async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return null;
    const deviceId = await getDeviceId();
    const res = await fetch(apiUrl('/api/public/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken, deviceId }),
    });
    let json: any = {};
    try {
      json = await res.json();
    } catch {
      json = {};
    }
    if (!res.ok || !json?.accessToken) {
      if (res.status === 401) {
        await clearTokens();
        try {
          router.replace('/login');
        } catch {
          // ignore navigation errors during early boot
        }
      }
      return null;
    }
    await setTokens({ accessToken: json.accessToken, refreshToken });
    return json.accessToken as string;
  };

  const syncPurchases = async () => {
    const token = await getAccessToken();
    if (!token) return;
    let res = await fetch(apiUrl('/api/public/purchases/me'), {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (res.status === 401) {
      const next = await tryRefreshAccessToken();
      if (!next) return;
      res = await fetch(apiUrl('/api/public/purchases/me'), {
        headers: { Authorization: `Bearer ${next}`, Accept: 'application/json' },
      });
    }
    if (!res.ok) return;
    const json = (await res.json()) as { 
      purchasedCategories?: { name: string; expiresAt: string | null }[]; 
      purchasedVideos?: { title: string; expiresAt: string | null }[]; 
    };
    
    const catMap: Record<string, PurchaseInfo> = {};
    json.purchasedCategories?.forEach(c => { catMap[c.name] = { expiresAt: c.expiresAt }; });
    
    const vidMap: Record<string, PurchaseInfo> = {};
    json.purchasedVideos?.forEach(v => { vidMap[v.title] = { expiresAt: v.expiresAt }; });

    setPurchasedCategories(catMap);
    setPurchasedVideos(vidMap);
  };

  useEffect(() => {
    void syncPurchases();

    const appScheme = (process.env.EXPO_PUBLIC_APP_SCHEME ?? 'astrolearn').replace(/:\/\//, '');
    const webBase = process.env.EXPO_PUBLIC_CMS_BASE_URL?.replace(/\/$/, '') ?? '';
    const appReturnPrefix = appScheme ? `${appScheme}://payment/success` : '';
    const webReturnPrefix = webBase ? `${webBase}/payment/success` : '';
    const isPaymentReturn = (url: string) =>
      (appReturnPrefix && url.startsWith(appReturnPrefix)) ||
      (webReturnPrefix && url.startsWith(webReturnPrefix));

    const handlePaymentReturn = (url?: string | null) => {
      if (!url) return;
      if (isPaymentReturn(url)) {
        const parsed = Linking.parse(url);
        const params = parsed.queryParams || {};
        const status = params.status;
        const target = (params.target as string) || '';
        const kind = (params.kind as string) || 'video';

        if (status === 'success') {
          notifyPaymentSuccess(target, kind);
        } else {
          notifyPaymentFailure();
        }
      }
    };

    void Linking.getInitialURL().then(handlePaymentReturn);

    const sub = Linking.addEventListener('url', ({ url }) => {
      handlePaymentReturn(url);
    });
    return () => sub.remove();
  }, []);

  const purchaseCategory = (category: string) => {
    // iOS is a reader app: no in-app purchase/webview. Buying happens on the website.
    if (Platform.OS === 'ios') return;
    void (async () => {
      const token = await getAccessToken();
      if (!token) return;
      setLoadingMessage('Opening secure payment...');
      try {
        const res = await fetch(apiUrl('/api/public/payments/razorpay/checkout-url'), {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: 'category', categoryName: category }),
        });
        const json = (await res.json()) as any;
        if (!res.ok || !json?.url) return;
        
        const checkoutUrl = json.url.includes('?')
          ? `${json.url}&target=${encodeURIComponent(category)}&kind=category`
          : `${json.url}?target=${encodeURIComponent(category)}&kind=category`;

        router.push({
          pathname: '/payment/checkout',
          params: { url: checkoutUrl, target: category, kind: 'category' },
        });
      } finally {
        setLoadingMessage(null);
      }
    })();
  };

  const purchaseVideo = (videoTitle: string) => {
    // iOS is a reader app: no in-app purchase/webview. Buying happens on the website.
    if (Platform.OS === 'ios') return;
    if (isInCategoryPack(videoTitle)) {
      return;
    }
    void (async () => {
      const token = await getAccessToken();
      if (!token) return;
      setLoadingMessage('Opening secure payment...');
      try {
        const res = await fetch(apiUrl('/api/public/payments/razorpay/checkout-url'), {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: 'video', videoTitle }),
        });
        const json = (await res.json()) as any;
        if (!res.ok || !json?.url) return;

        const checkoutUrl = json.url.includes('?')
          ? `${json.url}&target=${encodeURIComponent(videoTitle)}&kind=video`
          : `${json.url}?target=${encodeURIComponent(videoTitle)}&kind=video`;

        router.push({
          pathname: '/payment/checkout',
          params: { url: checkoutUrl, target: videoTitle, kind: 'video' },
        });
      } finally {
        setLoadingMessage(null);
      }
    })();
  };

  const hasCategoryAccess = (category?: string) => {
    if (isCompAccount()) return true;
    if (!category || !purchasedCategories) return false;
    return category in purchasedCategories;
  };

  const hasVideoAccess = (videoTitle: string, options?: { category?: string; isFree?: boolean }) => {
    if (isCompAccount()) return true;
    if (options?.isFree) {
      return true;
    }
    if (options?.category && purchasedCategories && options.category in purchasedCategories) {
      return true;
    }
    if (!purchasedVideos) return false;
    return videoTitle in purchasedVideos;
  };

  const getExpirationDate = (kind: 'video' | 'category', target: string) => {
    if (kind === 'video') return purchasedVideos?.[target]?.expiresAt ?? null;
    return purchasedCategories?.[target]?.expiresAt ?? null;
  };

  const value = useMemo<PurchaseContextValue>(
    () => ({
      purchasedCategories,
      purchasedVideos,
      purchaseCategory,
      purchaseVideo,
      syncPurchases,
      notifyPaymentSuccess,
      notifyPaymentFailure,
      hasCategoryAccess,
      hasVideoAccess,
      getExpirationDate,
    }),
    [purchasedCategories, purchasedVideos, isInCategoryPack]
  );

  return (
    <PurchaseContext.Provider value={value}>
      {children}
      <AnimatedLoadingPopup
        visible={Boolean(loadingMessage)}
        title="Please wait"
        subtitle={loadingMessage ?? undefined}
      />
      <UnlockAnimationOverlay
        visible={Boolean(pendingUnlock)}
        title={pendingUnlock?.title ?? ''}
        onFinished={() => setPendingUnlock(null)}
      />
      <PaymentFailedToast
        visible={paymentFailed}
        onHide={() => setPaymentFailed(false)}
      />
    </PurchaseContext.Provider>
  );
}

export function PurchaseProvider({ children }: { children: ReactNode }) {
  return <PurchaseProviderInner>{children}</PurchaseProviderInner>;
}

export function usePurchase() {
  const context = useContext(PurchaseContext);
  if (!context) {
    throw new Error('usePurchase must be used within PurchaseProvider');
  }
  return context;
}
