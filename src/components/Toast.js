import React, { useEffect, useRef } from 'react';
import { Animated, View, AccessibilityInfo } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './ui/AppText';
import Touch from './ui/Touch';
import { colors, radius, shadow } from '../theme';
import { themed } from '../themed';

const DURATION = 5000;

// Message above the tab bar: "Разходът е изтрит · Отмени". Hides itself after 5 seconds.
export default function Toast({ toast, onDismiss, bottom = 110 }) {
  const y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toast) return undefined;
    AccessibilityInfo.announceForAccessibility?.(toast.text);
    y.setValue(0);
    Animated.spring(y, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 220 }).start();
    const t = setTimeout(onDismiss, DURATION);
    return () => clearTimeout(t);
  }, [toast, y, onDismiss]);

  if (!toast) return null;
  return (
    <Animated.View
      pointerEvents="box-none"
      style={[s.wrap, { bottom, opacity: y, transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}
    >
      <View style={s.toast} accessibilityLiveRegion="polite">
        {toast.icon && <Ionicons name={toast.icon} size={18} color={colors.bg} />}
        <Text style={s.text} numberOfLines={2}>{toast.text}</Text>
        {toast.actionLabel && (
          <Touch
            haptic="select"
            hitSlop={10}
            style={s.action}
            onPress={() => {
              toast.onAction?.();
              onDismiss();
            }}
          >
            <Text style={s.actionText}>{toast.actionLabel}</Text>
          </Touch>
        )}
      </View>
    </Animated.View>
  );
}

const s = themed((c) => ({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch',
    backgroundColor: c.text, borderRadius: radius.badge, paddingVertical: 12, paddingLeft: 16, paddingRight: 8, ...shadow,
  },
  text: { flex: 1, color: c.bg, fontSize: 14.5, fontWeight: '600' },
  action: { paddingHorizontal: 12, paddingVertical: 8, minHeight: 44, justifyContent: 'center' },
  actionText: { color: c.inverseAccent, fontSize: 14.5, fontWeight: '800' },
}));
