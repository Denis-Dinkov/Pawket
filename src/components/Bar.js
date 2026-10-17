import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../theme';

// Progress bar with an optional target marker (0..1)
export default function Bar({ value, color, marker, height = 8, track = colors.faint }) {
  const pct = Math.max(0, Math.min(1, value || 0));
  return (
    <View style={[s.track, { height, borderRadius: height / 2, backgroundColor: track }]}>
      <View style={{ width: `${pct * 100}%`, height, borderRadius: height / 2, backgroundColor: color }} />
      {marker != null && <View style={[s.marker, { left: `${Math.min(1, marker) * 100}%`, height: height + 6 }]} />}
    </View>
  );
}

const s = StyleSheet.create({
  track: { overflow: 'visible', justifyContent: 'center' },
  marker: { position: 'absolute', width: 2, borderRadius: 1, backgroundColor: colors.text, top: -3 },
});
