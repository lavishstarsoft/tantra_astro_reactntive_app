import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import { getAccessToken } from '@/lib/auth-tokens';

export default function Index() {
  const [dest, setDest] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const token = await getAccessToken();
      setDest(token ? '/(tabs)' : '/login');
    })();
  }, []);

  if (!dest) return null;
  return <Redirect href={dest} />;
}
