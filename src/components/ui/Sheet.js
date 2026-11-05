import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Pressable, Animated, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../../theme';
import useKeyboardHeight from '../../hooks/useKeyboardHeight';
import { themed } from '../../themed';
import { DURATION, EASE_IN, SPRING, motionReduced } from '../../motion';
import { t } from '../../i18n';

const OFFSCREEN = 500;

/**
 * Bottom sheet with a translucent backdrop; footer stays pinned at the bottom (and above the keyboard).
 * It slides up on open and back down on close: the Modal stays mounted until the exit has played,
 * with the last content kept, so a sheet whose content clears on close (e.g. selected = null) doesn't
 * collapse while it leaves.
 */
export default function Sheet({ visible, onClose, children, footer, scroll = true, maxHeight = 0.88 }) {
  const insets = useSafeAreaInsets();
  // The sheet lifts above the keyboard so it doesn't cover fields and buttons
  const keyboard = useKeyboardHeight();
  const winHeight = Dimensions.get('window').height;
  const y = useRef(new Animated.Value(OFFSCREEN)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);
  // What was on screen while open, shown during the exit
  const last = useRef({ children, footer });
  if (visible) last.current = { children, footer };

  useEffect(() => {
    if (visible) {
      setMounted(true);
      if (motionReduced()) {
        y.setValue(0);
        backdrop.setValue(1);
        return;
      }
      y.setValue(OFFSCREEN);
      backdrop.setValue(0);
      Animated.parallel([
        Animated.spring(y, { toValue: 0, useNativeDriver: true, ...SPRING.standard }),
        Animated.timing(backdrop, { toValue: 1, duration: DURATION.appear, useNativeDriver: true }),
      ]).start();
    } else if (mounted) {
      if (motionReduced()) {
        setMounted(false);
        return;
      }
      Animated.parallel([
        Animated.timing(y, { toValue: OFFSCREEN, duration: DURATION.exit, easing: EASE_IN, useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 0, duration: DURATION.exit, useNativeDriver: true }),
      ]).start(({ finished }) => finished && setMounted(false));
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted && !visible) return null;
  const content = visible ? { children, footer } : last.current;
  const Body = scroll ? ScrollView : View;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.root} pointerEvents={visible ? 'auto' : 'none'}>
        <Animated.View style={[StyleSheet.absoluteFill, s.backdrop, { opacity: backdrop }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('Затвори')} />
        </Animated.View>
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
            {content.children}
          </Body>
          {content.footer && <View style={s.footer}>{content.footer}</View>}
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = themed((colors) => ({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: colors.backdrop },
  panel: { backgroundColor: colors.bg, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.faint, marginTop: 10 },
  content: { padding: 20 },
  footer: { paddingHorizontal: 20, paddingTop: 4 },
}));
