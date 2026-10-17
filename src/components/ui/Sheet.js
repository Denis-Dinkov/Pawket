import React, { useEffect, useRef } from 'react';
import { Modal, View, Pressable, Animated, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../../theme';
import useKeyboardHeight from '../../hooks/useKeyboardHeight';

// Bottom sheet with a translucent backdrop; footer stays pinned at the bottom (and above the keyboard)
export default function Sheet({ visible, onClose, children, footer, scroll = true, maxHeight = 0.88 }) {
  const insets = useSafeAreaInsets();
  // The sheet lifts above the keyboard so it doesn't cover fields and buttons
  const keyboard = useKeyboardHeight();
  const winHeight = Dimensions.get('window').height;
  const y = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      y.setValue(400);
      Animated.spring(y, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }).start();
    }
  }, [visible, y]);

  const Body = scroll ? ScrollView : View;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Затвори" />
        <Animated.View
          style={[
            s.panel,
            {
              paddingBottom: keyboard ? 16 : insets.bottom + 16,
              marginBottom: keyboard,
              maxHeight: Math.min(winHeight * maxHeight, winHeight - keyboard - insets.top - 12),
            },
            { transform: [{ translateY: y }] },
          ]}
        >
          <View style={s.handle} />
          <Body
            {...(scroll
              ? { contentContainerStyle: s.content, showsVerticalScrollIndicator: false, keyboardShouldPersistTaps: 'handled', keyboardDismissMode: 'interactive' }
              : { style: s.content })}
          >
            {children}
          </Body>
          {footer && <View style={s.footer}>{footer}</View>}
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(17,16,24,0.45)' },
  panel: { backgroundColor: colors.bg, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.faint, marginTop: 10 },
  content: { padding: 20 },
  footer: { paddingHorizontal: 20, paddingTop: 4 },
});
