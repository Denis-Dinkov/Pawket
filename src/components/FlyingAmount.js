import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { Text } from './ui/AppText';
import { colors, radius, shadow } from '../theme';
import { motionReduced } from '../motion';
import { themed } from '../themed';

/**
 * After saving: the amount rises from the "+" button towards the money card and fades out.
 * item = { id, text, income } — a new id plays it again.
 */
export default function FlyingAmount({ item, onDone }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!item) return;
    if (motionReduced()) {
      onDone();
      return;
    }
    t.setValue(0);
    // Waits for the page sheet to slide away
    Animated.timing(t, { toValue: 1, duration: 950, delay: 380, useNativeDriver: true }).start(() => onDone());
  }, [item, t, onDone]);
  if (!item) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        s.wrap,
        {
          opacity: t.interpolate({ inputRange: [0, 0.1, 0.75, 1], outputRange: [0, 1, 1, 0] }),
          transform: [
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -360] }) },
            { scale: t.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.6, 1.1, 0.9] }) },
          ],
        },
      ]}
    >
      <Text style={[s.chip, { backgroundColor: item.income ? colors.savings : colors.ink }]} maxFontSizeMultiplier={1.3}>
        {item.text}
      </Text>
    </Animated.View>
  );
}

const s = themed((c) => ({
  wrap: { position: 'absolute', bottom: 110, left: 0, right: 0, alignItems: 'center' },
  chip: {
    color: c.onAccent, fontSize: 17, fontWeight: '800', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: radius.pill, overflow: 'hidden', fontVariant: ['tabular-nums'], ...shadow,
  },
}));
