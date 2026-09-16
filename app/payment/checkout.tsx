import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { useFocusEffect } from '@react-navigation/native';

import { usePurchase } from '@/providers/purchase-provider';

const ACCENT = '#8F3D66';

// A real Chrome (not WebView) user agent so Razorpay shows UPI intent apps.
const CHROME_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36';

const readParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

// Non-http schemes that must be launched OUTSIDE the WebView (UPI apps, etc.).
const EXTERNAL_SCHEMES = [
  'upi:',
  'intent:',
  'tez:',
  'phonepe:',
  'paytmmp:',
  'gpay:',
  'credpay:',
  'bhim:',
  'mailto:',
  'tel:',
  'whatsapp:',
];

/**
 * Launch a UPI / app deep link outside the WebView. Android UPI apps are often
 * offered as `intent://…#Intent;scheme=upi;package=…;end` URLs which Linking
 * can't open directly, so we rebuild a plain `upi://…` (or the fallback URL).
 */
function launchExternal(url: string) {
  if (!url.toLowerCase().startsWith('intent:')) {
    Linking.openURL(url).catch(() => {});
    return;
  }
  try {
    const body = url.replace(/^intent:\/\//i, '');
    const [dataPart, intentPart = ''] = body.split('#Intent;');
    const parts: Record<string, string> = {};
    intentPart
      .split(';')
      .filter(Boolean)
      .forEach((kv) => {
        const eq = kv.indexOf('=');
        if (eq > -1) parts[kv.slice(0, eq)] = kv.slice(eq + 1);
      });
    const scheme = parts.scheme || 'upi';
    const rebuilt = `${scheme}://${dataPart}`;
    Linking.openURL(rebuilt).catch(() => {
      const fallback = parts['S.browser_fallback_url'];
      if (fallback) Linking.openURL(decodeURIComponent(fallback)).catch(() => {});
    });
  } catch {
    Linking.openURL(url).catch(() => {});
  }
}

export default function PaymentCheckoutScreen() {
  const params = useLocalSearchParams();
  const { notifyPaymentSuccess, notifyPaymentFailure, verifyPurchaseSoon } = usePurchase();

  const url = readParam(params.url) ?? '';
  const target = readParam(params.target) ?? '';
  const kind = readParam(params.kind) ?? 'video';

  const [loading, setLoading] = useState(true);
  const handledRef = useRef(false);

  const appScheme = (process.env.EXPO_PUBLIC_APP_SCHEME ?? 'astrolearn').replace(/:\/\//, '');
  const webBase = (process.env.EXPO_PUBLIC_CMS_BASE_URL ?? '').replace(/\/$/, '');

  const returnPrefixes = useMemo(
    () =>
      [
        appScheme ? `${appScheme}://payment/success` : '',
        webBase ? `${webBase}/payment/success` : '',
      ].filter(Boolean),
    [appScheme, webBase]
  );

  const finishWith = useCallback(
    (navUrl: string) => {
      if (handledRef.current) return;
      handledRef.current = true;

      const parsed = Linking.parse(navUrl);
      const q = parsed.queryParams || {};
      const status = readParam(q.status as any) ?? 'failed';
      const retTarget = (readParam(q.target as any) as string) || target;
      const retKind = (readParam(q.kind as any) as string) || kind;

      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)' as any);

      setTimeout(() => {
        if (status === 'success') notifyPaymentSuccess(retTarget, retKind);
        else notifyPaymentFailure();
      }, 250);
    },
    [target, kind, notifyPaymentSuccess, notifyPaymentFailure]
  );

  const cancel = useCallback(() => {
    if (handledRef.current) return;
    handledRef.current = true;
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)' as any);
    // The user may have actually paid (e.g. via a UPI app) before the in-page
    // redirect fired. Verify with the backend for a few seconds; if the webhook
    // granted access, the unlock popup appears on the page behind.
    verifyPurchaseSoon(target, kind);
  }, [target, kind, verifyPurchaseSoon]);

  const isReturnUrl = useCallback(
    (u: string) => u.includes('/payment/success') || returnPrefixes.some((p) => u.startsWith(p)),
    [returnPrefixes]
  );

  const onShouldStart = useCallback(
    (req: { url: string }) => {
      const u = req.url || '';

      if (isReturnUrl(u)) {
        finishWith(u);
        return false;
      }

      const lower = u.toLowerCase();
      if (EXTERNAL_SCHEMES.some((s) => lower.startsWith(s))) {
        launchExternal(u);
        return false;
      }

      return true;
    },
    [isReturnUrl, finishWith]
  );

  const onNavChange = useCallback(
    (nav: WebViewNavigation) => {
      const u = nav.url || '';
      if (isReturnUrl(u)) {
        finishWith(u);
      }
    },
    [isReturnUrl, finishWith]
  );

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        cancel();
        return true;
      });
      return () => sub.remove();
    }, [cancel])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Slim header: title + a CLOSE (✕) on the right. No left back arrow, so it
          doesn't duplicate Razorpay's own back arrow inside the page. */}
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <MaterialIcons name="lock" size={15} color="#FFFFFF" />
          <Text style={styles.title}>Secure Payment</Text>
        </View>
        <Pressable onPress={cancel} hitSlop={12} style={styles.closeBtn}>
          <MaterialIcons name="close" size={22} color="#FFFFFF" />
        </Pressable>
      </View>

      {url ? (
        <View style={styles.webWrap}>
          <WebView
            source={{ uri: url }}
            userAgent={CHROME_UA}
            originWhitelist={['*']}
            onShouldStartLoadWithRequest={onShouldStart}
            onNavigationStateChange={onNavChange}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            javaScriptEnabled
            domStorageEnabled
            thirdPartyCookiesEnabled
            startInLoadingState
            setSupportMultipleWindows={false}
            style={styles.web}
          />
          {loading ? (
            <View style={styles.loader} pointerEvents="none">
              <ActivityIndicator size="large" color={ACCENT} />
              <Text style={styles.loaderText}>Loading secure payment…</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.loader}>
          <Text style={styles.loaderText}>Could not open payment.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#120A1C' },
  header: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 16,
    paddingRight: 8,
    backgroundColor: ACCENT,
  },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  webWrap: { flex: 1, backgroundColor: '#FFFFFF' },
  web: { flex: 1, backgroundColor: '#FFFFFF' },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  loaderText: { color: '#64748B', fontSize: 14, fontWeight: '600' },
});
