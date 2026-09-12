import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useThemeColor } from '@/hooks/use-theme-color';
import { useDoubleBackExit } from '@/hooks/use-double-back-exit';
import { apiClient } from '@/lib/api-client';
import { AnimatedLoadingPopup } from '@/components/ui/animated-loading-popup';
import { ThemedAlertPopup } from '@/components/ui/themed-alert-popup';

export default function LoginScreen() {
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState<{ title: string; message: string } | null>(null);
  const appBg = useThemeColor({}, 'appBg');
  const cardBg = useThemeColor({}, 'appSurface');
  const border = useThemeColor({}, 'appBorder');
  const textPrimary = useThemeColor({}, 'appTextPrimary');
  const textSecondary = useThemeColor({}, 'appTextSecondary');
  const textMuted = useThemeColor({}, 'appTextMuted');
  const surfaceAlt = useThemeColor({}, 'appSurfaceAlt');
  useDoubleBackExit({ message: 'Press again, exit now', intervalMs: 2000 });

  const onContinue = async () => {
    if (mobile.length < 10) {
      return;
    }
    setLoading(true);
    try {
      const json = await apiClient.post<{ ok: boolean; requiresRegistration?: boolean; error?: string }>(
        '/api/public/auth/otp/send', 
        { phone: mobile, purpose: 'login' }
      );
      
      router.push({ pathname: '/otp', params: { mobile } });
    } catch (err: any) {
      if (err.requiresRegistration) {
        setPopup({ title: 'Register required', message: 'This mobile number is not registered. Please create an account.' });
        router.replace({ pathname: '/register', params: { mobile } });
        return;
      }
      setPopup({ title: 'OTP failed', message: err.error ?? 'Could not send OTP' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appBg }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: 'padding', android: 'height' })} keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Image
            source={require('@/assets/images/auth-logo-circle.png')}
            style={[styles.logo, { backgroundColor: cardBg, borderColor: border }]}
            contentFit="contain"
            contentPosition="center"
          />

          <Text style={[styles.title, { color: textPrimary }]}>Welcome to Thantra Astro</Text>
          <Text style={[styles.subtitle, { color: textMuted }]}>
            Login with mobile OTP and continue your personalized astrology learning journey.
          </Text>

          <View style={[styles.formCard, { backgroundColor: cardBg, borderColor: border }]}>
            <Text style={[styles.label, { color: textSecondary }]}>Mobile Number</Text>
            <TextInput
              placeholder="Enter 10-digit mobile number"
              placeholderTextColor={textMuted}
              keyboardType="number-pad"
              maxLength={10}
              value={mobile}
              onChangeText={(value) => setMobile(value.replace(/[^0-9]/g, ''))}
              style={[styles.input, { borderColor: border, backgroundColor: surfaceAlt, color: textPrimary }]}
            />

            <Pressable
              onPress={onContinue}
              disabled={mobile.length < 10 || loading}
              style={[styles.ctaButton, mobile.length < 10 && styles.ctaDisabled]}>
              <Text style={styles.ctaText}>{loading ? 'Sending…' : 'Send OTP'}</Text>
            </Pressable>
          </View>

          <View style={styles.registerRow}>
            <Text style={[styles.registerText, { color: textMuted }]}>New to Astro Learn?</Text>
            <Link href="/register" style={[styles.registerLink, { color: textSecondary }]}>
              Register Now
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <AnimatedLoadingPopup
        visible={loading}
        title="Sending OTP"
        subtitle="Please wait, we are sending OTP to your mobile."
      />
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
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120,
    justifyContent: 'center',
  },
  logo: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignSelf: 'center',
    marginBottom: 16,
    borderWidth: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    marginTop: 10,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  formCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
  },
  label: {
    fontSize: 14,
    marginBottom: 10,
    fontWeight: '600',
  },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  ctaButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#C0C6CF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: {
    opacity: 0.4,
  },
  ctaText: {
    color: '#1F2933',
    fontSize: 16,
    fontWeight: '800',
  },
  registerRow: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  registerText: {
    fontSize: 14,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});
