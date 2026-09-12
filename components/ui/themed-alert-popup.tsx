import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type PopupAction = {
  label: string;
  onPress: () => void;
  kind?: 'default' | 'destructive';
};

type Props = {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  actions?: PopupAction[];
};

export function ThemedAlertPopup({ visible, title, message, onClose, actions }: Props) {
  const finalActions =
    actions && actions.length > 0
      ? actions
      : [
          {
            label: 'OK',
            onPress: onClose,
            kind: 'default' as const,
          },
        ];

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actionsRow}>
            {finalActions.map((action, idx) => (
              <Pressable
                key={`${action.label}-${idx}`}
                style={[styles.actionBtn, action.kind === 'destructive' && styles.actionBtnDanger]}
                onPress={() => {
                  action.onPress();
                  onClose();
                }}>
                <Text style={[styles.actionText, action.kind === 'destructive' && styles.actionTextDanger]}>
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#3A2B52',
    backgroundColor: '#191326',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  title: {
    color: '#F1F3F5',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    marginTop: 8,
    color: '#C0C6CF',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  actionBtn: {
    minWidth: 110,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#4A3A64',
    backgroundColor: '#C0C6CF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnDanger: {
    backgroundColor: '#3D2030',
    borderColor: '#6A344E',
  },
  actionText: {
    color: '#1F2933',
    fontSize: 14,
    fontWeight: '800',
  },
  actionTextDanger: {
    color: '#F3C4D2',
  },
});

