import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { DURATION, motionReduced } from '../motion';
import { colors } from '../theme';
import { themed } from '../themed';

// Progress bar with an optional target marker (0..1)
// label: what VoiceOver reads, e.g. "Нужди: 820 от 1100 €"
export default function Bar({ value, color, marker, height = 8, track = colors.faint, label }) {
  const pct = Math.max(0, Math.min(1, value || 0));
  // Fills from 0 when it appears and slides to every new value
  const fill = useRef(new Animated.Value(motionReduced() ? pct : 0)).current;
  useEffect(() => {
    if (motionReduced()) {
      fill.setValue(pct);
      return;
    }
    Animated.spring(fill, { toValue: pct, useNativeDriver: false, damping: 20, stiffness: 140, overshootClamping: true }).start();
  }, [pct, fill]);
  const width = fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View
      style={[s.track, { height, borderRadius: height / 2, backgroundColor: track }]}
      accessible={!!label}
      accessibilityRole={label ? 'progressbar' : undefined}
      accessibilityLabel={label}
      accessibilityValue={label ? { min: 0, max: 100, now: Math.round((value || 0) * 100) } : undefined}
    >
      <Animated.View style={{ width, height, borderRadius: height / 2, backgroundColor: color }} />
      {marker != null && <View style={[s.marker, { left: `${Math.min(1, marker) * 100}%`, height: height + 6 }]} />}
    </View>
  );
}

const s = themed((colors) => ({
  track: { overflow: 'visible', justifyContent: 'center' },
  marker: { position: 'absolute', width: 2, borderRadius: 1, backgroundColor: colors.text, top: -3 },
}));
