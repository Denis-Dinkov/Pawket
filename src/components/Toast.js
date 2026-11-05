import React, { useEffect, useRef, useState } from 'react';
import { Animated, View, AccessibilityInfo } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './ui/AppText';
import Touch from './ui/Touch';
import { colors, radius, shadow } from '../theme';
import { themed } from '../themed';
import { DURATION, EASE_IN, SPRING, motionReduced } from '../motion';

const VISIBLE_MS = 5000;

// Message above the tab bar: "Разходът е изтрит · Отмени". Hides itself after 5 seconds.
// It slides in and, when dismissed, slides back out (the last message stays on screen while it leaves)
export default function Toast({ toast: current, onDismiss, bottom = 110 }) {
  const y = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(current);

  useEffect(() => {
    if (current) {
      setShown(current);
      AccessibilityInfo.announceForAccessibility?.(current.text);
      if (motionReduced()) y.setValue(1);
      else {
        y.setValue(0);
        Animated.spring(y, { toValue: 1, useNativeDriver: true, ...SPRING.standard }).start();
      }
      const t = setTimeout(onDismiss, VISIBLE_MS);
      return () => clearTimeout(t);
    }
    if (motionReduced()) {
      setShown(null);
      return undefined;
    }
    Animated.timing(y, { toValue: 0, duration: DURATION.exit, easing: EASE_IN, useNativeDriver: true }).start(
      ({ finished }) => finished && setShown(null)
    );
    return undefined;
  }, [current, y, onDismiss]);

  const toast = current || shown;
  if (!toast) return null;
  return (
    <Animated.View
      pointerEvents={current ? 'box-none' : 'none'}
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
