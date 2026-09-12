import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  title: string;
  children: ReactNode;
  /** When true, section starts expanded. */
  defaultOpen?: boolean;
  borderColor: string;
  titleColor: string;
  chevronColor: string;
};

export function AccordionSection({
  title,
  children,
  defaultOpen = false,
  borderColor,
  titleColor,
  chevronColor,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View style={[styles.wrap, { borderBottomColor: borderColor }]}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => [styles.header, pressed && styles.headerPressed]}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}>
        <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
        <MaterialIcons name={open ? 'expand-less' : 'expand-more'} size={24} color={chevronColor} />
      </Pressable>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingRight: 2,
  },
  headerPressed: {
    opacity: 0.85,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    paddingRight: 8,
  },
  body: {
    paddingBottom: 12,
  },
});
