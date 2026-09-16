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

const readParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

// Payment-app deep links that must open outside the WebView (UPI apps etc.)
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

export default function PaymentCheckoutScreen() {
  const params = useLocalSearchParams();
  const { notifyPaymentSuccess, notifyPaymentFailure } = usePurchase();

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

      // Close the payment screen, then surface the result on the page behind it.
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
  }, []);

  // Intercept every navigation the WebView attempts.
  const onShouldStart = useCallback(
    (req: { url: string }) => {
      const u = req.url || '';

      if (returnPrefixes.some((p) => u.startsWith(p))) {
        finishWith(u);
        return false; // don't load the return URL inside the WebView
      }

      const lower = u.toLowerCase();
      if (EXTERNAL_SCHEMES.some((s) => lower.startsWith(s))) {
        Linking.openURL(u).catch(() => {
          /* UPI app not installed — stay in WebView */
        });
        return false;
      }

      return true; // normal http(s) checkout navigation
    },
    [returnPrefixes, finishWith]
  );

  const onNavChange = useCallback(
    (nav: WebViewNavigation) => {
      const u = nav.url || '';
      if (returnPrefixes.some((p) => u.startsWith(p))) {
        finishWith(u);
      }
    },
    [returnPrefixes, finishWith]
  );

  // Android hardware back = cancel payment.
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
      <View style={styles.header}>
        <Pressable onPress={cancel} hitSlop={12} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <View style={styles.titleWrap}>
          <MaterialIcons name="lock" size={16} color="#FFFFFF" />
          <Text style={styles.title}>Secure Payment</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      {url ? (
        <View style={styles.webWrap}>
          <WebView
            source={{ uri: url }}
            originWhitelist={['*']}
            onShouldStartLoadWithRequest={onShouldStart}
            onNavigationStateChange={onNavChange}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            javaScriptEnabled
            domStorageEnabled
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
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: ACCENT,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
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
