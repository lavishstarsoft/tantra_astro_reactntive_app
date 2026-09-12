import { OtpInput } from '@/components/auth/otp-input';
import { ThemedAlertPopup } from '@/components/ui/themed-alert-popup';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { apiClient } from '@/lib/api-client';
import { useThemeColor } from '@/hooks/use-theme-color';
import { setTokens } from '@/lib/auth-tokens';
import { getDeviceId } from '@/lib/device-id';
import { usePurchase } from '@/providers/purchase-provider';

export default function OtpScreen() {
  const { mobile } = useLocalSearchParams<{ mobile?: string }>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(30);
  const [resending, setResending] = useState(false);
  const [inputResetKey, setInputResetKey] = useState(0);
  const [popup, setPopup] = useState<{ title: string; message: string } | null>(null);
  const autoVerifyGuard = useRef(false);
  const lastAttemptedCodeRef = useRef('');
  const allowAutoVerifyRef = useRef(false);
  const appBg = useThemeColor({}, 'appBg');
  const { syncPurchases } = usePurchase();
  const cardBg = useThemeColor({}, 'appSurface');
  const border = useThemeColor({}, 'appBorder');
  const textPrimary = useThemeColor({}, 'appTextPrimary');
  const textSecondary = useThemeColor({}, 'appTextSecondary');
  const textMuted = useThemeColor({}, 'appTextMuted');
  const goToLogin = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.push('/login');
  };

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const resendOtp = async () => {
    if (!mobile || resendIn > 0 || resending || loading) return;
    setResending(true);
    try {
      await apiClient.post('/api/public/auth/otp/send', { phone: mobile, purpose: 'login' });
      
      setCode('');
      setInputResetKey((v) => v + 1);
      lastAttemptedCodeRef.current = '';
      setResendIn(30);
      setPopup({ title: 'OTP sent', message: 'A new OTP has been sent to your mobile number.' });
    } catch (err: any) {
      if (err?.requiresRegistration) {
        setPopup({ title: 'Register required', message: 'This number is not registered. Please create an account.' });
        router.replace({ pathname: '/register', params: { mobile } });
        return;
      }
      setPopup({ title: 'Resend failed', message: err?.error ?? 'Could not resend OTP.' });
    } finally {
      setResending(false);
    }
  };

  const verifyOtp = useCallback(async () => {
    if (!mobile || code.length !== 6 || loading || autoVerifyGuard.current) return;
    autoVerifyGuard.current = true;
    lastAttemptedCodeRef.current = code;
    setLoading(true);
    try {
      const json = await apiClient.post<{ 
        error?: string; 
        requiresRegistration?: boolean; 
        accessToken?: string; 
        refreshToken?: string 
      }>('/api/public/auth/otp/verify', { 
        phone: mobile, 
        otp: code, 
        deviceId: await getDeviceId() 
      });

      if (!json.accessToken) {
        throw new Error('Access token missing from response');
      }

      await setTokens({ accessToken: json.accessToken, refreshToken: json.refreshToken });
      await syncPurchases();
      router.replace('/(tabs)');
    } catch (err: any) {
      if (err?.requiresRegistration) {
        setPopup({ title: 'Register required', message: 'This number is not registered. Please create an account.' });
        router.replace({ pathname: '/register', params: { mobile } });
        return;
      }
      const errorMessage = err?.error ?? 'Invalid OTP or network issue.';
      if (errorMessage.toLowerCase().includes('expired')) {
        setResendIn(0);
      }
      setPopup({ title: 'Verification failed', message: errorMessage });
    } finally {
      setLoading(false);
      autoVerifyGuard.current = false;
    }
  }, [mobile, code, loading, syncPurchases]);

  useEffect(() => {
    if (code.length === 6 && !loading && code !== lastAttemptedCodeRef.current && allowAutoVerifyRef.current) {
      allowAutoVerifyRef.current = false;
      void verifyOtp();
    }
  }, [code, loading, verifyOtp]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appBg }]}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: textPrimary }]}>Verify Your Mobile</Text>
        <Text style={[styles.subtitle, { color: textMuted }]}>
          Enter the 6-digit OTP sent to {mobile ? `+91 ${mobile}` : 'your number'}.
        </Text>

        <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          <OtpInput
            onCodeChange={(nextCode, meta) => {
              setCode(nextCode);
              allowAutoVerifyRef.current = meta?.source === 'paste';
            }}
            resetKey={inputResetKey}
          />

          <Pressable
            onPress={() => {
              void verifyOtp();
            }}
            disabled={code.length !== 6 || loading}
            style={[styles.ctaButton, (code.length !== 6 || loading) && styles.ctaDisabled]}>
            <Text style={styles.ctaText}>{loading ? 'Verifying…' : 'Verify & Continue'}</Text>
          </Pressable>

          <Pressable
            style={styles.resendBtn}
            disabled={resendIn > 0 || resending || loading}
            onPress={() => {
              void resendOtp();
            }}>
            <Text style={[styles.resendText, { color: textSecondary }]}>
              {resending
                ? 'Sending OTP...'
                : resendIn > 0
                  ? `Resend OTP in 00:${String(resendIn).padStart(2, '0')}`
                  : 'Resend OTP'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.bottomRow}>
          <Text style={[styles.bottomText, { color: textMuted }]}>Wrong number?</Text>
          <Pressable onPress={goToLogin}>
            <Text style={[styles.bottomLink, { color: textSecondary }]}>Change Mobile</Text>
          </Pressable>
        </View>
      </View>
      <ThemedAlertPopup
        visible={Boolean(popup)}
        title={popup?.title ?? ''}
        message={popup?.message ?? ''}
        onClose={() => setPopup(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 28,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 16,
  },
  ctaButton: {
    marginTop: 8,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#C0C6CF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: {
    opacity: 0.45,
  },
  ctaText: {
    color: '#1F2933',
    fontSize: 16,
    fontWeight: '800',
  },
  resendBtn: {
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bottomRow: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  bottomText: {
  },
  bottomLink: {
    fontWeight: '700',
  },
});
