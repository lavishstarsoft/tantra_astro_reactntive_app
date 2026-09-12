import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = 'app_device_id_v1';

function randomId() {
  const s = `${Date.now()}-${Math.random()}-${Math.random()}`;
  return s.replace(/[^a-zA-Z0-9-_.]/g, '');
}

export async function getDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const created = `dev_${randomId()}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}

