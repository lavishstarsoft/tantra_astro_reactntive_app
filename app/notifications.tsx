import React from 'react';
import { StyleSheet, Text, View, FlatList, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { useNotifications, Notification } from '@/providers/notification-provider';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function NotificationsScreen() {
  const { notifications, markAsRead, markAllAsRead, clearAll, deleteNotification } = useNotifications();
  const appBg = useThemeColor({}, 'appBg');
  const cardBg = useThemeColor({}, 'appSurface');
  const border = useThemeColor({}, 'appBorder');
  const textPrimary = useThemeColor({}, 'appTextPrimary');
  const textSecondary = useThemeColor({}, 'appTextSecondary');
  const textMuted = useThemeColor({}, 'appTextMuted');
  const accent = useThemeColor({}, 'appAccent');

  const getIcon = (type: string) => {
    switch (type) {
      case 'purchase': return 'auto-awesome';
      case 'new_content': return 'play-circle-filled';
      case 'offer': return 'stars';
      default: return 'notifications';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'purchase': return '#FFD700';
      case 'new_content': return '#818CF8';
      case 'offer': return '#F472B6';
      default: return '#94A3B8';
    }
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <Pressable
      onPress={() => !item.read && markAsRead(item.id)}
      style={[
        styles.item,
        { backgroundColor: cardBg, borderColor: item.read ? border : 'rgba(128, 0, 0, 0.4)' },
        !item.read && styles.unreadShadow
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${getIconColor(item.type)}15` }]}>
        <MaterialIcons name={getIcon(item.type) as any} size={24} color={getIconColor(item.type)} />
      </View>
      
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: textPrimary }]} numberOfLines={1}>
              {item.title}
            </Text>
            {!item.read && <View style={styles.unreadPulse} />}
          </View>
          <Pressable 
            onPress={(e) => {
              e.stopPropagation();
              void deleteNotification(item.id);
            }}
            hitSlop={10}
            style={styles.deleteButton}
          >
            <MaterialIcons name="close" size={18} color={textMuted} />
          </Pressable>
        </View>
        
        <Text style={[styles.body, { color: item.read ? textSecondary : textPrimary }]} numberOfLines={3}>
          {item.body}
        </Text>
        
        <View style={styles.footerRow}>
          <Text style={[styles.time, { color: textMuted }]}>
            {new Date(item.createdAt).toLocaleDateString()} · {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {item.read && (
            <MaterialIcons name="done-all" size={14} color="#10B981" />
          )}
        </View>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appBg }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Inbox</Text>
        <Pressable onPress={() => clearAll()} style={styles.clearHeaderButton}>
          <MaterialIcons name="delete-outline" size={22} color={textMuted} />
        </Pressable>
      </View>

      <View style={styles.topActions}>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{notifications.length} Notifications</Text>
        </View>
        <Pressable onPress={() => markAllAsRead()} style={styles.markAllButton}>
          <Text style={[styles.markAllText, { color: accent }]}>Mark all as read</Text>
        </Pressable>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconWrap, { backgroundColor: 'rgba(255, 255, 255, 0.03)' }]}>
              <MaterialIcons name="notifications-none" size={60} color="rgba(255, 255, 255, 0.1)" />
            </View>
            <Text style={[styles.emptyTitle, { color: textPrimary }]}>Your inbox is empty</Text>
            <Text style={[styles.emptySubtitle, { color: textMuted }]}>
              Check back later for new updates and personalized offers.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    height: 60,
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  clearHeaderButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
    marginTop: 4,
  },
  countBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  countText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '700',
  },
  markAllButton: {
    paddingVertical: 4,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    gap: 12,
  },
  item: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
  },
  unreadShadow: {
    shadowColor: '#800000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    flexShrink: 1,
  },
  unreadPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#800000',
    marginLeft: 8,
  },
  deleteButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    marginTop: 80,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.7,
  },
});
