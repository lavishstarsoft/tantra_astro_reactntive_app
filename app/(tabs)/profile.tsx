import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackNavButton } from '@/components/navigation/back-nav-button';
import { ThemedAlertPopup } from '@/components/ui/themed-alert-popup';
import { useThemeColor } from '@/hooks/use-theme-color';
import { apiUrl } from '@/lib/api';
import { useAppColorScheme } from '@/providers/color-scheme-provider';
import { useUser } from '@/providers/user-provider';
import { isCompAccount } from '@/lib/comp-account';

type MenuItem = {
  key: string;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  trailing?: string;
  danger?: boolean;
};

const MENU: MenuItem[] = [
  { key: 'edit', label: 'Edit Profile', icon: 'person' },
  { key: 'payment', label: 'Payment Option', icon: 'account-balance-wallet' },
  { key: 'security', label: 'Security', icon: 'shield' },
  { key: 'dark', label: 'Dark Mode', icon: 'dark-mode' },
  { key: 'terms', label: 'Terms & Conditions', icon: 'gpp-good' },
  { key: 'help', label: 'Help Center', icon: 'help-outline' },
  { key: 'invite', label: 'Invite Friends', icon: 'mail-outline' },
  { key: 'delete', label: 'Delete Account', icon: 'delete-forever', danger: true },
  { key: 'logout', label: 'Logout', icon: 'logout', danger: true },
];

export default function ProfileScreen() {
  const appBg = useThemeColor({}, 'appBg');
  const cardBg = useThemeColor({}, 'appSurface');
  const border = useThemeColor({}, 'appBorder');
  const textPrimary = useThemeColor({}, 'appTextPrimary');
  const textSecondary = useThemeColor({}, 'appTextSecondary');
  const textMuted = useThemeColor({}, 'appTextMuted');
  const { colorScheme, setPreference } = useAppColorScheme();
  const { user, loading, logout } = useUser();
  const [popup, setPopup] = useState<{
    title: string;
    message: string;
    actions?: Array<{ label: string; onPress: () => void; kind?: 'default' | 'destructive' }>;
  } | null>(null);

  const handleMenuPress = (key: string) => {
    if (key === 'dark') {
      setPreference(colorScheme === 'dark' ? 'light' : 'dark');
      return;
    }
    if (key === 'edit') {
      router.push('/edit-profile');
      return;
    }
    if (key === 'terms') {
      router.push('/terms');
      return;
    }
    if (key === 'help') {
      router.push('/help-center');
      return;
    }
    if (key === 'security') {
      router.push('/security');
      return;
    }
    if (key === 'delete') {
      router.push('/security');
      return;
    }
    if (key === 'invite') {
      void (async () => {
        try {
          const res = await fetch(apiUrl('/api/public/content-pages/invite_playstore_url'));
          const json = (await res.json()) as { page?: { content?: string } };
          const link = json?.page?.content?.trim();
          const fallback = 'https://play.google.com/store/apps/details?id=com.thantra.astrolearn';
          const shareLink = link || fallback;
          await Share.share({
            message: `Thantra Astro app try cheyandi:\n${shareLink}`,
            url: shareLink,
            title: 'Invite Friends',
          });
        } catch {
          setPopup({ title: 'Invite failed', message: 'Share option open cheyalekapoyam. Please try again.' });
        }
      })();
      return;
    }
    if (key === 'logout') {
      setPopup({
        title: 'Logout',
        message: 'Are you sure you want to logout?',
        actions: [
          { label: 'Cancel', onPress: () => {} },
          {
            label: 'Logout',
            kind: 'destructive',
            onPress: () => {
              void (async () => {
                await logout();
                router.replace('/login');
              })();
            },
          },
        ],
      });
    }
  };

  const onBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appBg }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BackNavButton onPress={onBack} accessibilityLabel="Back" />
          <Text style={[styles.headerTitle, { color: textPrimary }]}>Profile</Text>
          <View style={styles.headerSide} />
        </View>

        <View style={styles.profileBlock}>
          <View style={styles.avatarWrap}>
            <View style={[styles.avatar, { borderColor: textSecondary, backgroundColor: cardBg }]} accessibilityLabel="Profile photo">
              <MaterialIcons name="person" size={52} color={textSecondary} />
            </View>
          </View>

          <View style={[styles.mainCard, { backgroundColor: cardBg, borderColor: border }]}>
            <View style={styles.cardSpacer} />
            <Text style={[styles.name, { color: textPrimary }]}>
              {loading ? 'Loading…' : (user?.name ?? 'Guest')}
            </Text>
            <Text style={[styles.email, { color: textMuted }]}>
              {user?.phone ?? 'Not signed in'}
            </Text>

            <View style={styles.menu}>
              {MENU.filter((item) => !(isCompAccount() && item.key === 'payment')).map((item, index, arr) => (
                <Pressable
                  key={item.key}
                  onPress={() => handleMenuPress(item.key)}
                  style={({ pressed }) => [
                    styles.menuRow,
                    index < arr.length - 1 && styles.menuRowBorder,
                    pressed && styles.menuRowPressed,
                  ]}>
                  <MaterialIcons
                    name={item.icon}
                    size={22}
                    color={item.danger ? '#E8A0B3' : textSecondary}
                  />
                  <Text
                    style={[styles.menuLabel, { color: textPrimary }, item.danger && styles.menuLabelDanger]}
                    numberOfLines={1}>
                    {item.label}
                  </Text>
                  {item.key === 'dark' ? (
                    <Text style={[styles.menuTrailing, { color: textMuted }]}>
                      {colorScheme === 'dark' ? 'On' : 'Off'}
                    </Text>
                  ) : item.trailing ? (
                    <Text style={[styles.menuTrailing, { color: textMuted }]}>{item.trailing}</Text>
                  ) : null}
                  <MaterialIcons name="chevron-right" size={22} color={textMuted} />
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
      <ThemedAlertPopup
        visible={Boolean(popup)}
        title={popup?.title ?? ''}
        message={popup?.message ?? ''}
        actions={popup?.actions}
        onClose={() => setPopup(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingTop: 4,
  },
  headerSide: {
    width: 36,
    height: 36,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
  },
  profileBlock: {
    marginTop: 8,
    alignItems: 'center',
  },
  avatarWrap: {
    zIndex: 2,
    marginBottom: -46,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainCard: {
    width: '100%',
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  cardSpacer: {
    height: 52,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  email: {
    marginTop: 6,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  menu: {
    marginTop: 4,
    paddingHorizontal: 12,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 4,
  },
  menuRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(196, 198, 207, 0.12)',
  },
  menuRowPressed: {
    opacity: 0.85,
  },
  menuLabel: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '600',
  },
  menuLabelDanger: {
    color: '#E8A0B3',
  },
  menuTrailing: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
    maxWidth: '42%',
  },
});
