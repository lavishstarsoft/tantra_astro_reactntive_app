import { useAppColorScheme } from '@/providers/color-scheme-provider';

export function useColorScheme() {
  return useAppColorScheme().colorScheme;
}
