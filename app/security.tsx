import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackNavButton } from '@/components/navigation/back-nav-button';
import { ThemedAlertPopup } from '@/components/ui/themed-alert-popup';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getAccessToken, getLastLoginAtFallback } from '@/lib/auth-tokens';
import { apiUrl } from '@/lib/api';
import { useUser } from '@/providers/user-provider';

export default function SecurityPage() {
  const appBg = useThemeColor({}, 'appBg');
  const cardBg = useThemeColor({}, 'appSurface');
  const border = useThemeColor({}, 'appBorder');
  const textPrimary = useThemeColor({}, 'appTextPrimary');
  const textSecondary = useThemeColor({}, 'appTextSecondary');
  const textMuted = useThemeColor({}, 'appTextMuted');
  const { logout } = useUser();
  const [lastLoginAt, setLastLoginAt] = useState<string | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deletionStatus, setDeletionStatus] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [popup, setPopup] = useState<{ title: string; message: string } | null>(null);

  const loadDeletionStatus = async () => {
    const token = await getAccessToken();
    if (!token) return;
    try {
      const res = await fetch(apiUrl('/api/public/account/deletion-request'), {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      if (!res.ok) return;
      const json = (await res.json()) as { request?: { status?: string } | null };
      setDeletionStatus(json?.request?.status ?? null);
    } catch {
      // ignore
    }
  };

  const submitDeletion = async () => {
    setDeleteBusy(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setPopup({ title: 'Not signed in', message: 'Please login again to continue.' });
        return;
      }
      const res = await fetch(apiUrl('/api/public/account/deletion-request'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const json = (await res.json().catch(() => ({}))) as { status?: string; error?: string };
      if (res.status === 409) {
        setDeletionStatus('PENDING');
        setPopup({ title: 'Already requested', message: 'A deletion request is already pending review.' });
        return;
      }
      if (!res.ok) {
        setPopup({ title: 'Request failed', message: json?.error ?? 'Please try again.' });
        return;
      }
      setDeletionStatus(json?.status ?? 'PENDING');
      setPopup({
        title: 'Deletion request submitted',
        message: 'Your account is pending deletion review.',
      });
    } catch {
      setPopup({ title: 'Request failed', message: 'Network error. Please try again.' });
    } finally {
      setDeleteBusy(false);
    }
  };

  useEffect(() => {
    void (async () => {
      const value = await getLastLoginAtFallback();
      setLastLoginAt(value);
    })();
    void loadDeletionStatus();
  }, []);

  const onResetSession = () => {
    setConfirmVisible(true);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appBg }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BackNavButton onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))} accessibilityLabel="Back" />
          <Text style={[styles.headerTitle, { color: textPrimary }]}>Security</Text>
          <View style={styles.headerSide} />
        </View>

        <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          <View style={styles.row}>
            <MaterialIcons name="verified-user" size={20} color={textSecondary} />
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: textPrimary }]}>Single Device Protection</Text>
              <Text style={[styles.rowDesc, { color: textMuted }]}>
                Your account supports only one active device session. If you login on another device, the previous
                device session is automatically revoked.
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Last Open Time</Text>
          <Text style={[styles.rowDesc, { color: textMuted }]}>
            {lastLoginAt ? new Date(lastLoginAt).toLocaleString('en-IN') : 'Not available'}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Reset Login Session</Text>
          <Pressable onPress={onResetSession} style={styles.actionBtn}>
            <MaterialIcons name="restart-alt" size={18} color="#1F2933" />
            <Text style={styles.actionText}>Reset Login Session</Text>
          </Pressable>
          <Text style={[styles.hint, { color: textMuted }]}>
            If you face session/auth issues, tap this option to clear the current session and login fresh.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Delete Account</Text>
          {deletionStatus === 'PENDING' ? (
            <Text style={[styles.hint, { color: textMuted }]}>
              Your account is pending deletion review.
            </Text>
          ) : (
            <>
              <Pressable
                onPress={() => setDeleteConfirmVisible(true)}
                disabled={deleteBusy}
                style={[styles.actionBtn, { backgroundColor: '#B3261E' }]}>
                <MaterialIcons name="delete-forever" size={18} color="#FFFFFF" />
                <Text style={[styles.actionText, { color: '#FFFFFF' }]}>Delete Account</Text>
              </Pressable>
              <Text style={[styles.hint, { color: textMuted }]}>
                This submits a permanent account deletion request for admin review.
              </Text>
            </>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Security Tips</Text>
          <Text style={[styles.tip, { color: textMuted }]}>- Never share your OTP with anyone.</Text>
          <Text style={[styles.tip, { color: textMuted }]}>- Avoid logging in from unknown links or devices.</Text>
          <Text style={[styles.tip, { color: textMuted }]}>- If anything looks suspicious, reset your session immediately.</Text>
        </View>
      </ScrollView>
      <ThemedAlertPopup
        visible={confirmVisible}
        title="Reset Login Session"
        message="This will clear your current login session on this device. You will need to login again with OTP. Continue?"
        actions={[
          { label: 'Cancel', onPress: () => {}, kind: 'default' },
          {
            label: 'Continue',
            kind: 'destructive',
            onPress: () => {
              void (async () => {
                await logout();
                router.replace('/login');
              })();
            },
          },
        ]}
        onClose={() => setConfirmVisible(false)}
      />
      <ThemedAlertPopup
        visible={deleteConfirmVisible}
        title="Delete Account"
        message="Request permanent account deletion?"
        actions={[
          { label: 'Cancel', onPress: () => {}, kind: 'default' },
          {
            label: 'Request Deletion',
            kind: 'destructive',
            onPress: () => {
              void submitDeletion();
            },
          },
        ]}
        onClose={() => setDeleteConfirmVisible(false)}
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
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingTop: 4,
  },
  headerSide: { width: 36, height: 36 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '800' },
  card: { borderRadius: 18, borderWidth: 1, padding: 14, marginTop: 10, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '800' },
  rowDesc: { marginTop: 4, fontSize: 14, lineHeight: 21 },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  actionBtn: {
    marginTop: 6,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#C0C6CF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  actionText: { color: '#1F2933', fontSize: 14, fontWeight: '800' },
  hint: { marginTop: 6, fontSize: 13, lineHeight: 19 },
  tip: { fontSize: 14, lineHeight: 21 },
});

