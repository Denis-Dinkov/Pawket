import React, { useEffect, useRef, useState } from 'react';
import { View, Animated } from 'react-native';
import { motionReduced } from '../motion';
import { colors } from '../theme';
import { themed } from '../themed';

// Progress bar with an optional target marker (0..1)
// label: what VoiceOver reads, e.g. "Нужди: 820 от 1100 €"
export default function Bar({ value, color, marker, height = 8, track = colors.faint, label }) {
  const pct = Math.max(0, Math.min(1, value || 0));
  // Fills from 0 when it appears and slides to every new value
  const fill = useRef(new Animated.Value(motionReduced() ? pct : 0)).current;
  // The fill is a full-width strip slid in from the left (translateX runs on the native driver;
  // animating width would need a JS frame and a layout pass for every step)
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (motionReduced()) {
      fill.setValue(pct);
      return;
    }
    Animated.spring(fill, { toValue: pct, useNativeDriver: true, damping: 20, stiffness: 140, overshootClamping: true }).start();
  }, [pct, fill]);
  const translateX = fill.interpolate({ inputRange: [0, 1], outputRange: [-width, 0] });
  const round = { height, borderRadius: height / 2 };
  return (
    <View
      style={[s.track, round, { backgroundColor: track }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible={!!label}
      accessibilityRole={label ? 'progressbar' : undefined}
      accessibilityLabel={label}
      accessibilityValue={label ? { min: 0, max: 100, now: Math.round((value || 0) * 100) } : undefined}
    >
      {/* Clips the fill to the rounded track; the marker stays outside so it can stick out */}
      <View style={[s.clip, round]}>
        {width > 0 && <Animated.View style={[round, { width, backgroundColor: color, transform: [{ translateX }] }]} />}
      </View>
      {marker != null && <View style={[s.marker, { left: `${Math.min(1, marker) * 100}%`, height: height + 6 }]} />}
    </View>
  );
}

const s = themed((colors) => ({
  track: { overflow: 'visible', justifyContent: 'center' },
  clip: { position: 'absolute', left: 0, right: 0, top: 0, overflow: 'hidden' },
  marker: { position: 'absolute', width: 2, borderRadius: 1, backgroundColor: colors.text, top: -3 },
}));

