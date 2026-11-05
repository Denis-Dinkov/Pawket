import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import { themed } from '../../themed';

// Chestnut gradient header; the white sheet below overlaps its bottom
// tone="room": the light room gradient used on Home, so every tab speaks the same visual language
export default function GradientHero({ children, bottomSpace = 64, style, tone = 'hero' }) {
  const room = tone === 'room';
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={room ? [colors.roomFrom, colors.roomTo] : [colors.heroFrom, colors.heroTo]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      // overflow: the decorative circles must not widen the screen horizontally
      style={[{ paddingTop: insets.top + 8, paddingBottom: bottomSpace, paddingHorizontal: 20, overflow: 'hidden' }, style]}
    >
      {/* Decorative circles for depth */}
      {!room && <View pointerEvents="none" style={[s.orb, { width: 260, height: 260, top: -90, right: -80 }]} />}
      {!room && <View pointerEvents="none" style={[s.orb, { width: 180, height: 180, bottom: -40, left: -60 }]} />}
      {children}
    </LinearGradient>
  );
}

const s = themed((colors) => ({
  orb: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' },
}));
