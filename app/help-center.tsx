import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackNavButton } from '@/components/navigation/back-nav-button';
import { useThemeColor } from '@/hooks/use-theme-color';
import { apiUrl } from '@/lib/api';

type PagePayload = {
  title: string;
  content: string;
  updatedAt: string | null;
};

export default function HelpCenterPage() {
  const appBg = useThemeColor({}, 'appBg');
  const textPrimary = useThemeColor({}, 'appTextPrimary');
  const textMuted = useThemeColor({}, 'appTextMuted');
  const cardBg = useThemeColor({}, 'appSurface');
  const border = useThemeColor({}, 'appBorder');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<PagePayload | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(apiUrl('/api/public/content-pages/help'));
        const json = (await res.json()) as { ok?: boolean; page?: PagePayload };
        if (res.ok && json.page) {
          setPage(json.page);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appBg }]}>
      <View style={styles.header}>
        <BackNavButton onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))} accessibilityLabel="Back" />
        <Text style={[styles.title, { color: textPrimary }]}>{page?.title ?? 'Help Center'}</Text>
        <View style={styles.side} />
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
            <Text style={[styles.body, { color: textPrimary }]}>{page?.content ?? 'Content not available.'}</Text>
            {page?.updatedAt ? (
              <Text style={[styles.updated, { color: textMuted }]}>
                Last updated: {new Date(page.updatedAt).toLocaleString('en-IN')}
              </Text>
            ) : null}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 4 },
  title: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '800' },
  side: { width: 36, height: 36 },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 12 },
  body: { fontSize: 15, lineHeight: 24 },
  updated: { fontSize: 12, fontWeight: '600' },
});

