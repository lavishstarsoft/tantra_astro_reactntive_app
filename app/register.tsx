import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Keyboard,
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
import { apiUrl } from '@/lib/api';
import { AnimatedLoadingPopup } from '@/components/ui/animated-loading-popup';
import { ThemedAlertPopup } from '@/components/ui/themed-alert-popup';

export default function RegisterScreen() {
  const params = useLocalSearchParams<{ mobile?: string }>();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
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
  const normalizedName = fullName.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const canSubmit = normalizedName.length > 2 && normalizedEmail.includes('@') && mobile.length === 10;
  const goToLogin = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.push('/login');
  };

  useEffect(() => {
    if (!params.mobile) return;
    setMobile(String(params.mobile).replace(/[^0-9]/g, '').slice(0, 10));
  }, [params.mobile]);

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
          <Text style={[styles.title, { color: textPrimary }]}>Join Thantra Astro</Text>
          <Text style={[styles.subtitle, { color: textMuted }]}>
            Access expert video lessons, personalized horoscope modules, and guided astrology learning tracks.
          </Text>

          <View style={[styles.formCard, { backgroundColor: cardBg, borderColor: border }]}>
            <Text style={[styles.label, { color: textSecondary }]}>Full Name</Text>
            <TextInput
              placeholder="Enter your full name"
              placeholderTextColor={textMuted}
              value={fullName}
              onChangeText={setFullName}
              style={[styles.input, { borderColor: border, backgroundColor: surfaceAlt, color: textPrimary }]}
            />

            <Text style={[styles.label, { color: textSecondary }]}>Email</Text>
            <TextInput
              placeholder="Enter your email"
              placeholderTextColor={textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              style={[styles.input, { borderColor: border, backgroundColor: surfaceAlt, color: textPrimary }]}
            />

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
              onPress={async () => {
                if (!canSubmit || loading) return;
                Keyboard.dismiss();
                setLoading(true);
                try {
                  const res = await fetch(apiUrl('/api/public/auth/otp/send'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: mobile, purpose: 'register' }),
                  });
                  let json: { ok?: boolean; requiresLogin?: boolean; error?: string } = {};
                  try {
                    json = (await res.json()) as { ok?: boolean; requiresLogin?: boolean; error?: string };
                  } catch {
                    json = {};
                  }
                  if (!res.ok) {
                    if (json.requiresLogin) {
                      setPopup({ title: 'Account exists', message: 'This number is already registered. Please login.' });
                      router.replace({ pathname: '/login', params: { mobile } });
                      return;
                    }
                    setPopup({ title: 'OTP failed', message: json.error ?? 'Could not send OTP' });
                    return;
                  }
                  if (!json.ok) {
                    setPopup({ title: 'OTP failed', message: 'Unexpected server response. Please try again.' });
                    return;
                  }
                  router.push({ pathname: '/register-otp', params: { fullName: normalizedName, email: normalizedEmail, mobile } });
                } catch {
                  setPopup({ title: 'Network error', message: 'Unable to contact server. Please try again.' });
                } finally {
                  setLoading(false);
                }
              }}
              disabled={!canSubmit || loading}
              style={[styles.ctaButton, (!canSubmit || loading) && styles.ctaDisabled]}>
              <Text style={styles.ctaText}>{loading ? 'Sending…' : 'Register & Send OTP'}</Text>
            </Pressable>
          </View>

          <View style={styles.bottomRow}>
            <Text style={[styles.bottomText, { color: textMuted }]}>Already have an account?</Text>
            <Pressable onPress={goToLogin}>
              <Text style={[styles.bottomLink, { color: textSecondary }]}>Login</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <AnimatedLoadingPopup
        visible={loading}
        title="Sending OTP"
        subtitle="Please wait, creating request and sending OTP."
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
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120,
  },
  logo: {
    width: 98,
    height: 98,
    borderRadius: 49,
    alignSelf: 'center',
    marginBottom: 14,
    borderWidth: 2,
  },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center' },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 24,
  },
  formCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
  },
  label: { fontSize: 14, marginBottom: 8, fontWeight: '600' },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    marginBottom: 14,
  },
  ctaButton: {
    marginTop: 4,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#C0C6CF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { opacity: 0.45 },
  ctaText: { color: '#1F2933', fontSize: 15, fontWeight: '800' },
  bottomRow: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  bottomText: { fontSize: 14 },
  bottomLink: { fontSize: 14, fontWeight: '700' },
});
