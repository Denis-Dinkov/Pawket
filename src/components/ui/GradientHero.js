import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme';

// Chestnut gradient header; the white sheet below overlaps its bottom
export default function GradientHero({ children, bottomSpace = 64, style }) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={[colors.heroFrom, colors.heroTo]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      // overflow: the decorative circles must not widen the screen horizontally
      style={[{ paddingTop: insets.top + 8, paddingBottom: bottomSpace, paddingHorizontal: 20, overflow: 'hidden' }, style]}
    >
      {/* Decorative circles for depth */}
      <View pointerEvents="none" style={[s.orb, { width: 260, height: 260, top: -90, right: -80 }]} />
      <View pointerEvents="none" style={[s.orb, { width: 180, height: 180, bottom: -40, left: -60 }]} />
      {children}
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  orb: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' },
});
