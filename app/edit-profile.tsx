import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { BackNavButton } from '@/components/navigation/back-nav-button';
import { ThemedAlertPopup } from '@/components/ui/themed-alert-popup';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAppColorScheme } from '@/providers/color-scheme-provider';
import { useUser } from '@/providers/user-provider';

const STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Puducherry',
  'Chandigarh',
  'Andaman and Nicobar Islands',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Lakshadweep',
] as const;

function formatDob(isoOrEmpty: string) {
  if (!isoOrEmpty) return '';
  const [yyyy, mm, dd] = isoOrEmpty.split('-');
  if (!yyyy || !mm || !dd) return isoOrEmpty;
  return `${dd}-${mm}-${yyyy}`;
}

function toIsoDate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function genderLabel(g: 'male' | 'female' | 'other' | '') {
  if (g === 'male') return 'Male';
  if (g === 'female') return 'Female';
  if (g === 'other') return 'Other';
  return '';
}

export default function EditProfileScreen() {
  const appBg = useThemeColor({}, 'appBg');
  const cardBg = useThemeColor({}, 'appSurface');
  const border = useThemeColor({}, 'appBorder');
  const textPrimary = useThemeColor({}, 'appTextPrimary');
  const textSecondary = useThemeColor({}, 'appTextSecondary');
  const textMuted = useThemeColor({}, 'appTextMuted');
  const surfaceAlt = useThemeColor({}, 'appSurfaceAlt');

  const { colorScheme } = useAppColorScheme();

  const { user, updateMe } = useUser();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(''); // YYYY-MM-DD
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [stateName, setStateName] = useState('');
  const [saving, setSaving] = useState(false);
  const [showStateModal, setShowStateModal] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [popup, setPopup] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    setName(user?.name ?? '');
    setEmail(user?.email ?? '');
    setDateOfBirth(user?.dateOfBirth ? user.dateOfBirth.slice(0, 10) : '');
    setGender((user?.gender as any) ?? '');
    setStateName(user?.state ?? '');
  }, [user?.id]);

  const onSave = async () => {
    if (!name.trim() || !email.trim()) {
      setPopup({ title: 'Missing details', message: 'Please enter your name and email.' });
      return;
    }
    if (dateOfBirth.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth.trim())) {
      setPopup({ title: 'Invalid DOB', message: 'Please use YYYY-MM-DD format (example: 2000-12-31).' });
      return;
    }
    setSaving(true);
    try {
      const res = await updateMe({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        dateOfBirth: dateOfBirth.trim() ? dateOfBirth.trim() : undefined,
        gender: gender ? (gender as any) : undefined,
        state: stateName.trim() ? stateName.trim() : undefined,
      });
      if (!res.ok) {
        setPopup({ title: 'Update failed', message: res.error ?? 'Could not update profile' });
        return;
      }
      setPopup({ title: 'Saved', message: 'Your profile has been updated.' });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const onBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/profile');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appBg }]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: 'height' })} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <BackNavButton onPress={onBack} accessibilityLabel="Back" />
            <Text style={[styles.headerTitle, { color: textPrimary }]}>Edit Profile</Text>
            <View style={styles.headerSide} />
          </View>

          <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
            <View style={styles.avatarRow}>
              <View style={[styles.avatar, { borderColor: border, backgroundColor: surfaceAlt }]}>
                <MaterialIcons name="person" size={44} color={textSecondary} />
              </View>
              <View style={styles.avatarText}>
                <Text style={[styles.avatarName, { color: textPrimary }]} numberOfLines={1}>
                  {name || 'User'}
                </Text>
                <Text style={[styles.avatarMeta, { color: textMuted }]} numberOfLines={1}>
                  {user?.phone ?? ''}
                </Text>
              </View>
            </View>

            <Text style={[styles.label, { color: textSecondary }]}>Full Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              placeholderTextColor={textMuted}
              style={[styles.input, { borderColor: border, backgroundColor: surfaceAlt, color: textPrimary }]}
              autoCapitalize="words"
            />

            <Text style={[styles.label, { color: textSecondary }]}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor={textMuted}
              style={[styles.input, { borderColor: border, backgroundColor: surfaceAlt, color: textPrimary }]}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={[styles.label, { color: textSecondary }]}>Date of Birth</Text>
            <Pressable
              onPress={() => setShowDobPicker(true)}
              style={[styles.select, { borderColor: border, backgroundColor: surfaceAlt }]}>
              <Text style={{ color: dateOfBirth ? textPrimary : textMuted, fontSize: 16, fontWeight: '600' }}>
                {dateOfBirth ? formatDob(dateOfBirth) : 'Select date'}
              </Text>
              <MaterialIcons name="calendar-today" size={18} color={textMuted} />
            </Pressable>

            <Text style={[styles.label, { color: textSecondary }]}>Gender</Text>
            <Pressable
              onPress={() => setShowGenderModal(true)}
              style={[styles.select, { borderColor: border, backgroundColor: surfaceAlt }]}>
              <Text style={{ color: gender ? textPrimary : textMuted, fontSize: 16, fontWeight: '600' }}>
                {gender ? genderLabel(gender) : 'Select gender'}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={22} color={textMuted} />
            </Pressable>

            <Text style={[styles.label, { color: textSecondary }]}>State</Text>
            <Pressable
              onPress={() => setShowStateModal(true)}
              style={[styles.select, { borderColor: border, backgroundColor: surfaceAlt }]}>
              <Text style={{ color: stateName ? textPrimary : textMuted, fontSize: 16, fontWeight: '600' }}>
                {stateName || 'Select state'}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={22} color={textMuted} />
            </Pressable>

            <Pressable onPress={onSave} disabled={saving} style={[styles.ctaButton, saving && styles.ctaDisabled]}>
              <Text style={styles.ctaText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
            </Pressable>
          </View>

          <Modal visible={showStateModal} transparent animationType="fade" onRequestClose={() => setShowStateModal(false)}>
            <Pressable style={styles.modalBackdrop} onPress={() => setShowStateModal(false)}>
              <Pressable style={[styles.modalCard, { backgroundColor: cardBg, borderColor: border }]} onPress={() => {}}>
                <Text style={[styles.modalTitle, { color: textPrimary }]}>Select State</Text>
                <Text style={[styles.modalHint, { color: textMuted }]}>Scroll to find your state</Text>
                <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator>
                  {STATES.map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => {
                        setStateName(s);
                        setShowStateModal(false);
                      }}
                      style={({ pressed }) => [styles.modalRow, pressed && { opacity: 0.7 }]}>
                      <Text style={[styles.modalRowText, { color: textPrimary }]}>{s}</Text>
                      {stateName === s ? <MaterialIcons name="check" size={18} color={textSecondary} /> : null}
                    </Pressable>
                  ))}
                </ScrollView>
              </Pressable>
            </Pressable>
          </Modal>

          <Modal visible={showGenderModal} transparent animationType="fade" onRequestClose={() => setShowGenderModal(false)}>
            <Pressable style={styles.modalBackdrop} onPress={() => setShowGenderModal(false)}>
              <Pressable style={[styles.modalCard, { backgroundColor: cardBg, borderColor: border }]} onPress={() => {}}>
                <Text style={[styles.modalTitle, { color: textPrimary }]}>Select Gender</Text>
                <Text style={[styles.modalHint, { color: textMuted }]}>Choose one option</Text>
                <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator>
                  {(['male', 'female', 'other'] as const).map((g) => (
                    <Pressable
                      key={g}
                      onPress={() => {
                        setGender(g);
                        setShowGenderModal(false);
                      }}
                      style={({ pressed }) => [styles.modalRow, pressed && { opacity: 0.7 }]}>
                      <Text style={[styles.modalRowText, { color: textPrimary }]}>{genderLabel(g)}</Text>
                      {gender === g ? <MaterialIcons name="check" size={18} color={textSecondary} /> : null}
                    </Pressable>
                  ))}
                </ScrollView>
              </Pressable>
            </Pressable>
          </Modal>

          {Platform.OS === 'ios' ? (
            <Modal visible={showDobPicker} transparent animationType="fade" onRequestClose={() => setShowDobPicker(false)}>
              <Pressable style={styles.modalBackdrop} onPress={() => setShowDobPicker(false)}>
                <Pressable style={[styles.modalCard, { backgroundColor: cardBg, borderColor: border }]} onPress={() => {}}>
                  <Text style={[styles.modalTitle, { color: textPrimary }]}>Date of Birth</Text>
                  <View style={{ alignItems: 'center', marginVertical: 10 }}>
                    <DateTimePicker
                      value={dateOfBirth ? new Date(`${dateOfBirth}T00:00:00`) : new Date()}
                      mode="date"
                      display="spinner"
                      maximumDate={new Date()}
                      onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                        if (selectedDate) setDateOfBirth(toIsoDate(selectedDate));
                      }}
                      textColor={colorScheme === 'dark' ? '#FFFFFF' : undefined}
                    />
                  </View>
                  <Pressable onPress={() => setShowDobPicker(false)} style={[styles.ctaButton, { marginTop: 0, height: 44 }]}>
                    <Text style={styles.ctaText}>Done</Text>
                  </Pressable>
                </Pressable>
              </Pressable>
            </Modal>
          ) : (
            showDobPicker && (
              <DateTimePicker
                value={dateOfBirth ? new Date(`${dateOfBirth}T00:00:00`) : new Date()}
                mode="date"
                display="default"
                maximumDate={new Date()}
                onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                  setShowDobPicker(false);
                  if (event.type === 'dismissed') return;
                  if (!selectedDate) return;
                  setDateOfBirth(toIsoDate(selectedDate));
                }}
              />
            )
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  card: { borderRadius: 22, borderWidth: 1, padding: 16, marginTop: 10, gap: 10 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarText: { flex: 1 },
  avatarName: { fontSize: 18, fontWeight: '800' },
  avatarMeta: { marginTop: 2, fontSize: 13, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '700', marginTop: 6 },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  select: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaButton: {
    marginTop: 10,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#C0C6CF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { color: '#1F2933', fontSize: 16, fontWeight: '800' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: { borderRadius: 18, borderWidth: 1, padding: 14 },
  modalTitle: { fontSize: 16, fontWeight: '900', marginBottom: 10, textAlign: 'center' },
  modalHint: { fontSize: 13, fontWeight: '700', textAlign: 'center', marginBottom: 10 },
  modalRow: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalRowText: { fontSize: 15, fontWeight: '700' },
});

