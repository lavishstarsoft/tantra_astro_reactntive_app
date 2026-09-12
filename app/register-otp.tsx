import { OtpInput } from '@/components/auth/otp-input';
import { RegistrationSuccessModal } from '@/components/auth/registration-success-modal';
import { ThemedAlertPopup } from '@/components/ui/themed-alert-popup';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useThemeColor } from '@/hooks/use-theme-color';
import { apiUrl } from '@/lib/api';
import { setTokens } from '@/lib/auth-tokens';
import { getDeviceId } from '@/lib/device-id';
import { usePurchase } from '@/providers/purchase-provider';

const REDIRECT_MS = 3500;

export default function RegisterOtpScreen() {
  const { fullName, email, mobile } = useLocalSearchParams<{ fullName?: string; email?: string; mobile?: string }>();
  const [code, setCode] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(30);
  const [resending, setResending] = useState(false);
  const [inputResetKey, setInputResetKey] = useState(0);
  const [popup, setPopup] = useState<{ title: string; message: string } | null>(null);
  const autoVerifyGuard = useRef(false);
  const lastAttemptedCodeRef = useRef('');
  const allowAutoVerifyRef = useRef(false);
  const appBg = useThemeColor({}, 'appBg');
  const cardBg = useThemeColor({}, 'appSurface');
  const border = useThemeColor({}, 'appBorder');
  const textPrimary = useThemeColor({}, 'appTextPrimary');
  const textSecondary = useThemeColor({}, 'appTextSecondary');
  const textMuted = useThemeColor({}, 'appTextMuted');
  const { syncPurchases } = usePurchase();

  useEffect(() => {
    if (!showSuccess) return;
    const t = setTimeout(() => {
      router.replace('/(tabs)');
    }, REDIRECT_MS);
    return () => clearTimeout(t);
  }, [showSuccess]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const goHome = () => {
    router.replace('/(tabs)');
  };

  const resendOtp = async () => {
    if (!mobile || resendIn > 0 || resending || loading) return;
    setResending(true);
    try {
      const res = await fetch(apiUrl('/api/public/auth/otp/send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: mobile, purpose: 'register' }),
      });
      const json = (await res.json()) as { error?: string; requiresLogin?: boolean };
      if (!res.ok) {
        if (json?.requiresLogin) {
          setPopup({ title: 'Account exists', message: 'This number is already registered. Please login.' });
          router.replace({ pathname: '/login', params: { mobile } });
          return;
        }
        setPopup({ title: 'Resend failed', message: json?.error ?? 'Could not resend OTP.' });
        return;
      }
      setCode('');
      setInputResetKey((v) => v + 1);
      lastAttemptedCodeRef.current = '';
      setResendIn(30);
      setPopup({ title: 'OTP sent', message: 'A new OTP has been sent to your mobile number.' });
    } catch {
      setPopup({ title: 'Network error', message: 'Unable to resend OTP. Please try again.' });
    } finally {
      setResending(false);
    }
  };

  const verifyOtp = useCallback(async () => {
    if (!mobile || !fullName || !email || code.length !== 6 || loading || autoVerifyGuard.current) return;
    autoVerifyGuard.current = true;
    lastAttemptedCodeRef.current = code;
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/public/auth/otp/verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: mobile, otp: code, name: fullName, email, deviceId: await getDeviceId() }),
      });
      let json: { error?: string; requiresRegistration?: boolean; accessToken?: string; refreshToken?: string } = {};
      try {
        json = (await res.json()) as {
          error?: string;
          requiresRegistration?: boolean;
          accessToken?: string;
          refreshToken?: string;
        };
      } catch {
        json = {};
      }
      if (!res.ok) {
        if (json.requiresRegistration) {
          setPopup({ title: 'Registration required', message: 'Please fill your details again and request a fresh OTP.' });
          router.replace({ pathname: '/register', params: { mobile } });
          return;
        }
        const errorMessage = json.error ?? 'Invalid OTP or OTP expired.';
        if (errorMessage.toLowerCase().includes('expired')) {
          setResendIn(0);
        }
        setPopup({ title: 'Verification failed', message: errorMessage });
        return;
      }
      await setTokens({ accessToken: json.accessToken, refreshToken: json.refreshToken });
      await syncPurchases();
      setShowSuccess(true);
    } catch {
      setPopup({ title: 'Network error', message: 'Unable to verify OTP. Please try again.' });
    } finally {
      setLoading(false);
      autoVerifyGuard.current = false;
    }
  }, [mobile, fullName, email, code, loading, syncPurchases]);

  useEffect(() => {
    if (code.length === 6 && !loading && code !== lastAttemptedCodeRef.current && allowAutoVerifyRef.current) {
      allowAutoVerifyRef.current = false;
      void verifyOtp();
    }
  }, [code, loading, verifyOtp]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appBg }]}>
      <RegistrationSuccessModal visible={showSuccess} onRequestClose={goHome} />
      <View style={styles.container}>
        <Text style={[styles.title, { color: textPrimary }]}>Complete Registration</Text>
        <Text style={[styles.subtitle, { color: textMuted }]}>
          {fullName ? `${fullName}, ` : ''}please verify OTP sent to {mobile ? `+91 ${mobile}` : 'your number'}.
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
              Keyboard.dismiss();
              void verifyOtp();
            }}
            disabled={code.length !== 6 || loading}
            style={[styles.ctaButton, (code.length !== 6 || loading) && styles.ctaDisabled]}>
            <Text style={styles.ctaText}>{loading ? 'Creating…' : 'Create Account'}</Text>
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
          <Text style={[styles.bottomText, { color: textMuted }]}>Need to edit details?</Text>
          <Link href="/register" style={[styles.bottomLink, { color: textSecondary }]}>
            Go Back
          </Link>
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
  safeArea: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  title: { fontSize: 30, fontWeight: '800', textAlign: 'center' },
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
  ctaDisabled: { opacity: 0.45 },
  ctaText: { color: '#1F2933', fontSize: 16, fontWeight: '800' },
  resendBtn: { alignItems: 'center' },
  resendText: { fontSize: 14, fontWeight: '600' },
  bottomRow: { marginTop: 20, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  bottomText: {},
  bottomLink: { fontWeight: '700' },
});
