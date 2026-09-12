import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

type OtpInputProps = {
  length?: number;
  onCodeChange: (code: string, meta?: { source: 'manual' | 'paste' }) => void;
  resetKey?: number | string;
};

export function OtpInput({ length = 6, onCodeChange, resetKey }: OtpInputProps) {
  const [digits, setDigits] = useState<string[]>(Array.from({ length }, () => ''));
  const refs = useRef<(TextInput | null)[]>([]);
  const backspaceState = useRef({ count: 0, lastAt: 0 });
  const border = useThemeColor({}, 'appBorder');
  const surfaceAlt = useThemeColor({}, 'appSurfaceAlt');
  const textPrimary = useThemeColor({}, 'appTextPrimary');
  const iconActive = useThemeColor({}, 'appTabIconActive');

  const emit = (next: string[], source: 'manual' | 'paste' = 'manual') => {
    setDigits(next);
    onCodeChange(next.join(''), { source });
  };

  const clearAll = () => {
    const blank = Array.from({ length }, () => '');
    emit(blank);
    setTimeout(() => refs.current[0]?.focus(), 0);
  };

  const fillFrom = (startIndex: number, raw: string) => {
    const onlyDigits = raw.replace(/[^0-9]/g, '');
    if (!onlyDigits) return;
    const next = [...digits];
    let pos = startIndex;
    for (const ch of onlyDigits) {
      if (pos >= length) break;
      next[pos] = ch;
      pos += 1;
    }
    emit(next, 'paste');
    const focusIdx = Math.min(pos, length - 1);
    refs.current[focusIdx]?.focus();
  };

  const updateDigit = (index: number, value: string) => {
    const onlyDigits = value.replace(/[^0-9]/g, '');
    if (!onlyDigits) {
      const next = [...digits];
      next[index] = '';
      emit(next, 'manual');
      return;
    }
    if (onlyDigits.length > 1) {
      fillFrom(index, onlyDigits);
      return;
    }
    const next = [...digits];
    next[index] = onlyDigits;
    emit(next, 'manual');
    if (index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key !== 'Backspace') {
      backspaceState.current = { count: 0, lastAt: 0 };
      return;
    }
    const now = Date.now();
    const rapid = now - backspaceState.current.lastAt < 220;
    const nextCount = rapid ? backspaceState.current.count + 1 : 1;
    backspaceState.current = { count: nextCount, lastAt: now };

    // Long backspace press behavior: clear all OTP boxes.
    if (nextCount >= 3) {
      backspaceState.current = { count: 0, lastAt: 0 };
      clearAll();
      return;
    }

    const next = [...digits];
    if (digits[index]) {
      next[index] = '';
      emit(next, 'manual');
      return;
    }
    if (index > 0) {
      next[index - 1] = '';
      emit(next, 'manual');
      refs.current[index - 1]?.focus();
    }
  };

  const prevResetKey = useRef(resetKey);
  useEffect(() => {
    if (resetKey === undefined) return;
    // Only clear when resetKey actually changes, not on every render.
    if (prevResetKey.current !== resetKey) {
      prevResetKey.current = resetKey;
      clearAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  return (
    <View style={styles.container}>
      {Array.from({ length }, (_, index) => (
        <TextInput
          key={`otp-${index}`}
          ref={(ref) => {
            refs.current[index] = ref;
          }}
          value={digits[index]}
          onChangeText={(value) => updateDigit(index, value)}
          onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          importantForAutofill="yes"
          autoFocus={index === 0}
          maxLength={length}
          style={[styles.input, { borderColor: border, backgroundColor: surfaceAlt, color: textPrimary }]}
          selectionColor={iconActive}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10,
  },
  input: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 22,
    textAlign: 'center',
    fontWeight: '700',
  },
});
